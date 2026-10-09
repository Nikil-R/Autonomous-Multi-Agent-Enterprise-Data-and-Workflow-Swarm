"""
Enterprise Swarm REST API Routes
File: EnterpriseIQ/backend/app/api/routes.py

Endpoints:
1. POST /api/chat: Initiates or continues a multi-agent workflow for a thread_id.
   - If analytics or general chat -> Runs to completion and returns answer + SQL data.
   - If workflow action -> Pauses at HITL breakpoint and returns AWAITING_APPROVAL status.
2. POST /api/approve: Human operator reviews, edits, and approves the action -> Resumes graph!
3. GET /api/session/{thread_id}: Fetches current state snapshot.
4. GET /api/history/{thread_id}: Time-travel audit history of all steps in the session.
5. GET /api/schema: Returns the live enterprise database schema for the frontend.
"""

import uuid
import json
import sqlite3
import os
from typing import Dict, Any, List
from fastapi import APIRouter, HTTPException

from ..models.schemas import ChatRequest, ApprovalRequest, SwarmResponse, HistorySnapshot
from ..swarm.graph import build_enterprise_swarm, CHECKPOINT_DB_PATH
from ..tools.db_tools import inspect_database_schema_tool

router = APIRouter(prefix="/api", tags=["Enterprise Swarm"])

# Shared SQLite checkpointer connection
_conn = sqlite3.connect(CHECKPOINT_DB_PATH, check_same_thread=False)
swarm_app = build_enterprise_swarm(checkpointer=None)


@router.post("/chat", response_model=SwarmResponse)
async def chat_with_swarm(request: ChatRequest):
    """
    Submits a query to the autonomous multi-agent swarm.
    Handles automatic pause if an action requires Human-in-the-Loop sign-off.
    """
    thread_id = request.thread_id or f"session_{uuid.uuid4().hex[:8]}"
    config = {
        "configurable": {"thread_id": thread_id},
        "recursion_limit": 15
    }

    initial_state = {
        "user_query": request.query,
        "thread_id": thread_id,
        "intent_category": None,
        "database_schema": None,
        "sql_query": None,
        "dba_critique": None,
        "sql_approval_status": None,
        "raw_query_results": None,
        "data_insights_summary": None,
        "action_type": None,
        "action_payload": None,
        "human_approved": False,
        "action_execution_result": None,
        "final_response": None,
        "iteration_count": 0,
        "current_agent": None
    }

    try:
        # Run graph until completion OR until HITL breakpoint
        swarm_app.invoke(initial_state, config=config)

        # Inspect current state after run
        snapshot = swarm_app.get_state(config)
        next_nodes = snapshot.next

        # Case A: Swarm paused at HITL breakpoint!
        if next_nodes and "execute_action" in next_nodes:
            values = snapshot.values
            return SwarmResponse(
                thread_id=thread_id,
                status="AWAITING_APPROVAL",
                response_text=(
                    f"⚠️ **Action Proposed:** The swarm drafted an operational `{values.get('action_type')}` action. "
                    "In accordance with enterprise compliance policy, human supervisor authorization is required before execution."
                ),
                intent_category=values.get("intent_category"),
                action_type=values.get("action_type"),
                action_payload=values.get("action_payload"),
                current_agent=values.get("current_agent"),
                iteration_count=values.get("iteration_count", 1)
            )

        # Case B: Workflow ran to completion (Data Analytics / General Chat)
        values = snapshot.values
        
        # Parse query data if available
        parsed_data = None
        if values.get("raw_query_results"):
            try:
                raw_json = json.loads(values["raw_query_results"])
                parsed_data = raw_json.get("data")
            except Exception:
                pass

        return SwarmResponse(
            thread_id=thread_id,
            status="COMPLETED",
            response_text=values.get("final_response"),
            intent_category=values.get("intent_category"),
            sql_query=values.get("sql_query"),
            raw_query_data=parsed_data,
            action_type=values.get("action_type"),
            action_payload=values.get("action_payload"),
            action_execution_result=values.get("action_execution_result"),
            current_agent=values.get("current_agent"),
            iteration_count=values.get("iteration_count", 1)
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Swarm execution failed: {str(e)}")


@router.post("/approve", response_model=SwarmResponse)
async def approve_workflow_action(request: ApprovalRequest):
    """
    Human-in-the-Loop decision endpoint:
    - If approved=True: Updates state with optional modified payload and resumes execution via invoke(None).
    - If approved=False: Cancels execution and updates final response.
    """
    config = {"configurable": {"thread_id": request.thread_id}}

    try:
        snapshot = swarm_app.get_state(config)
        if not snapshot.values:
            raise HTTPException(status_code=404, detail="Session thread not found.")

        # Check if the graph is indeed paused waiting for execute_action
        if not snapshot.next or "execute_action" not in snapshot.next:
            return SwarmResponse(
                thread_id=request.thread_id,
                status="COMPLETED",
                response_text="Action has already been processed or is not awaiting approval.",
                current_agent=snapshot.values.get("current_agent")
            )

        if not request.approved:
            # Human rejected the action!
            rejection_message = "❌ **Action Cancelled by Human Operator:** The proposed operational workflow was rejected."
            swarm_app.update_state(config, {
                "human_approved": False,
                "final_response": rejection_message,
                "action_execution_result": json.dumps({"status": "REJECTED_BY_HUMAN"})
            })
            return SwarmResponse(
                thread_id=request.thread_id,
                status="COMPLETED",
                response_text=rejection_message,
                action_type=snapshot.values.get("action_type"),
                current_agent="human_supervisor"
            )

        # Human approved! Optionally update payload if modified
        update_dict: Dict[str, Any] = {"human_approved": True}
        if request.modified_payload:
            update_dict["action_payload"] = request.modified_payload

        swarm_app.update_state(config, update_dict)

        # RESUME GRAPH from breakpoint!
        swarm_app.invoke(None, config=config)

        resumed_snapshot = swarm_app.get_state(config)
        values = resumed_snapshot.values

        return SwarmResponse(
            thread_id=request.thread_id,
            status="COMPLETED",
            response_text=values.get("final_response"),
            intent_category=values.get("intent_category"),
            action_type=values.get("action_type"),
            action_payload=values.get("action_payload"),
            action_execution_result=values.get("action_execution_result"),
            current_agent=values.get("current_agent"),
            iteration_count=values.get("iteration_count", 1)
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Approval resolution failed: {str(e)}")


@router.get("/session/{thread_id}", response_model=SwarmResponse)
async def get_session_state(thread_id: str):
    """Retrieves the current state snapshot for a given thread_id."""
    config = {"configurable": {"thread_id": thread_id}}
    snapshot = swarm_app.get_state(config)

    if not snapshot.values:
        raise HTTPException(status_code=404, detail="Session thread not found.")

    values = snapshot.values
    is_paused = snapshot.next and "execute_action" in snapshot.next

    parsed_data = None
    if values.get("raw_query_results"):
        try:
            raw_json = json.loads(values["raw_query_results"])
            parsed_data = raw_json.get("data")
        except Exception:
            pass

    return SwarmResponse(
        thread_id=thread_id,
        status="AWAITING_APPROVAL" if is_paused else "COMPLETED",
        response_text=values.get("final_response"),
        intent_category=values.get("intent_category"),
        sql_query=values.get("sql_query"),
        raw_query_data=parsed_data,
        action_type=values.get("action_type"),
        action_payload=values.get("action_payload"),
        action_execution_result=values.get("action_execution_result"),
        current_agent=values.get("current_agent"),
        iteration_count=values.get("iteration_count", 0)
    )


@router.get("/history/{thread_id}", response_model=List[HistorySnapshot])
async def get_session_history(thread_id: str):
    """Time-travel audit log: returns all historical snapshots for this session."""
    config = {"configurable": {"thread_id": thread_id}}
    history_list = []

    try:
        snapshots = list(swarm_app.get_state_history(config))
        for snap in snapshots:
            vals = snap.values
            step_id = snap.config.get("configurable", {}).get("checkpoint_id", "")[:8]
            next_step = snap.next[0] if snap.next else "END"

            history_list.append(HistorySnapshot(
                step_id=step_id,
                next_node=next_step,
                current_agent=vals.get("current_agent"),
                intent_category=vals.get("intent_category"),
                response_text=vals.get("final_response") or vals.get("data_insights_summary")
            ))

        return history_list
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch history: {str(e)}")


@router.get("/schema")
async def get_database_schema():
    """Returns the live enterprise database schema metadata."""
    schema_json = inspect_database_schema_tool()
    return json.loads(schema_json)
