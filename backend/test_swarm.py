"""
Test Swarm Scenarios: Data Analytics & HITL Breakpoint Verification
File: EnterpriseIQ/backend/test_swarm.py
"""

import os
import sys
import uuid

# Windows Application Control fallback
os.environ["UUID_UTILS_NO_EXTENSIONS"] = "1"

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

from app.swarm.graph import build_enterprise_swarm


def test_data_analytics_path():
    print("\n" + "=" * 70)
    print("TEST 1: DATA ANALYTICS & TEXT-TO-SQL REFLECTION LOOP")
    print("=" * 70)

    app = build_enterprise_swarm()
    session_id = f"test_analytics_{uuid.uuid4().hex[:6]}"
    config = {"configurable": {"thread_id": session_id}}

    query = "What is the average salary of employees in each department, and which department pays the highest?"
    print(f"User Question: '{query}'")

    initial_state = {
        "user_query": query,
        "thread_id": session_id,
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

    result = app.invoke(initial_state, config=config)

    print("\n" + "=" * 70)
    print("🏆 FINAL ANALYTICS ANSWER:")
    print("=" * 70)
    print(result.get("final_response"))
    print("\nExecuted SQL Query:")
    print(result.get("sql_query"))
    print("=" * 70)


def test_hitl_workflow_path():
    print("\n" + "=" * 70)
    print("TEST 2: WORKFLOW ACTION & HUMAN-IN-THE-LOOP BREAKPOINT")
    print("=" * 70)

    app = build_enterprise_swarm()
    session_id = f"test_hitl_{uuid.uuid4().hex[:6]}"
    config = {"configurable": {"thread_id": session_id}}

    action_query = "Create a CRITICAL priority support ticket for customer #2: Production database timeout during peak hours."
    print(f"User Request: '{action_query}'")

    initial_state = {
        "user_query": action_query,
        "thread_id": session_id,
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

    # Step A: Run until breakpoint
    print("\n▶️ [STEP A] Initiating swarm workflow...")
    app.invoke(initial_state, config=config)

    # Step B: Verify the graph halted at the breakpoint
    snapshot = app.get_state(config)
    print("\n" + "=" * 70)
    print("🛑 VERIFYING BREAKPOINT PAUSE:")
    print("=" * 70)
    print(f"Next Node Scheduled: {snapshot.next}")
    print(f"Drafted Action Payload:\n{snapshot.values.get('action_payload')}")

    assert snapshot.next == ("execute_action",), "Error: Swarm did not pause before execute_action!"
    print("✅ SUCCESS: Swarm paused cleanly before executing destructive action!")

    # Step C: Simulate Human Reviewer approving
    print("\n👤 [HUMAN INTERVENTION] Human manager reviews and approves ticket creation...")
    app.update_state(config, {"human_approved": True})

    # Step D: Resume execution
    print("\n▶️ [STEP D] Resuming workflow with approval...")
    resumed = app.invoke(None, config=config)

    print("\n" + "=" * 70)
    print("🏁 FINAL HITL EXECUTION RESULT:")
    print("=" * 70)
    print(resumed.get("final_response"))
    print("=" * 70)


if __name__ == "__main__":
    test_data_analytics_path()
    test_hitl_workflow_path()
