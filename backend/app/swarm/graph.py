"""
Enterprise Swarm StateGraph Definition & Compilation
File: EnterpriseIQ/backend/app/swarm/graph.py

Wires the LangGraph state machine:
- Supervisor triage routing (Analytics vs. Workflow vs. General)
- SQL Reflection Loop (Generator <-> Senior DBA Critic until APPROVED)
- Safe Read-Only SQL execution & Synthesis
- Action Planning with Human-in-the-Loop breakpoint (interrupt_before=['execute_action'])
- Persistence using SqliteSaver checkpointer
"""

import os
import sys
import sqlite3

# Windows Application Control fallback
os.environ["UUID_UTILS_NO_EXTENSIONS"] = "1"

from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.sqlite import SqliteSaver

from .state import EnterpriseSwarmState
from .agents import (
    supervisor_node,
    sql_generator_node,
    sql_dba_critic_node,
    sql_execution_node,
    data_synthesizer_node,
    workflow_planner_node,
    execute_action_tool_node,
    general_chat_node
)

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
CHECKPOINT_DB_PATH = os.path.abspath(os.path.join(CURRENT_DIR, "..", "db", "checkpoints.sqlite"))


# =====================================================================
# CONDITIONAL ROUTERS
# =====================================================================

def supervisor_router(state: EnterpriseSwarmState) -> str:
    """Routes based on the Supervisor's triage decision."""
    intent = state.get("intent_category", "GENERAL")
    if intent == "DATA_ANALYTICS":
        return "route_to_sql_generator"
    elif intent == "WORKFLOW_ACTION":
        return "route_to_workflow_planner"
    else:
        return "route_to_general"


def dba_critic_router(state: EnterpriseSwarmState) -> str:
    """
    Reflection Router: If the DBA approved the query, proceed to execution.
    If rejected, loop back to the SQL Generator (up to 3 iterations).
    """
    status = state.get("sql_approval_status", "REJECTED")
    iteration = state.get("iteration_count", 1)

    if status == "APPROVED" or iteration >= 4:
        return "route_to_execution"
    else:
        return "route_to_retry_sql"


# =====================================================================
# GRAPH BUILDER & COMPILER
# =====================================================================

def build_enterprise_swarm(checkpointer=None):
    """
    Constructs and compiles the complete multi-agent LangGraph workflow.
    Configures interrupt_before on the dangerous 'execute_action' node!
    """
    workflow = StateGraph(EnterpriseSwarmState)

    # 1. Register all 8 specialized nodes
    workflow.add_node("supervisor", supervisor_node)
    workflow.add_node("sql_generator", sql_generator_node)
    workflow.add_node("sql_dba_critic", sql_dba_critic_node)
    workflow.add_node("sql_execution", sql_execution_node)
    workflow.add_node("data_synthesizer", data_synthesizer_node)
    workflow.add_node("workflow_planner", workflow_planner_node)
    workflow.add_node("execute_action", execute_action_tool_node)
    workflow.add_node("general_chat", general_chat_node)

    # 2. START always enters the Supervisor
    workflow.add_edge(START, "supervisor")

    # 3. Supervisor conditional branch
    workflow.add_conditional_edges(
        "supervisor",
        supervisor_router,
        {
            "route_to_sql_generator": "sql_generator",
            "route_to_workflow_planner": "workflow_planner",
            "route_to_general": "general_chat"
        }
    )

    # 4. Data Analytics Path (Reflection Loop)
    workflow.add_edge("sql_generator", "sql_dba_critic")
    workflow.add_conditional_edges(
        "sql_dba_critic",
        dba_critic_router,
        {
            "route_to_execution": "sql_execution",
            "route_to_retry_sql": "sql_generator"
        }
    )
    workflow.add_edge("sql_execution", "data_synthesizer")
    workflow.add_edge("data_synthesizer", END)

    # 5. Workflow Action Path (Gated by Human Approval)
    # workflow_planner prepares the action, then transitions to execute_action.
    # CRITICAL: 'execute_action' is declared in interrupt_before below!
    workflow.add_edge("workflow_planner", "execute_action")
    workflow.add_edge("execute_action", END)

    # 6. General chat path
    workflow.add_edge("general_chat", END)

    # 7. Compile with Checkpointer and Breakpoint
    if checkpointer is None:
        # Connect to SQLite disk checkpointer
        conn = sqlite3.connect(CHECKPOINT_DB_PATH, check_same_thread=False)
        checkpointer = SqliteSaver(conn)

    app = workflow.compile(
        checkpointer=checkpointer,
        interrupt_before=["execute_action"]  # 🛑 HUMAN-IN-THE-LOOP SAFETY GATE
    )

    return app


if __name__ == "__main__":
    if sys.platform == "win32":
        sys.stdout.reconfigure(encoding="utf-8")

    print("=" * 70)
    print("🐝 TESTING ENTERPRISE SWARM LANGGRAPH COMPILATION")
    print("=" * 70)
    
    app = build_enterprise_swarm()
    print("✅ LangGraph State Machine successfully constructed and compiled!")
    print(f"📁 SQLite Checkpointer writing to: {CHECKPOINT_DB_PATH}")
    print("🛑 Breakpoint Active: Execution pauses before ['execute_action'] node.")
    print("=" * 70)
