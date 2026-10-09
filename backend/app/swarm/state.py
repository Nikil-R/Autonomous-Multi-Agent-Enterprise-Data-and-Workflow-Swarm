"""
Enterprise Swarm Shared State Schema
File: EnterpriseIQ/backend/app/swarm/state.py

The central blackboard state passed across all agents in the LangGraph swarm.
"""

from typing import TypedDict, Optional, List, Dict, Any


class EnterpriseSwarmState(TypedDict):
    # Core Session & Request metadata
    user_query: str                          # Raw natural language prompt from user
    thread_id: str                           # Unique session identifier for checkpointer isolation
    intent_category: Optional[str]           # Triage output: "DATA_ANALYTICS" | "WORKFLOW_ACTION" | "GENERAL"
    
    # Path 1: Data Analytics & Text-to-SQL Reflection Loop
    database_schema: Optional[str]           # Extracted live schema from inspect_schema_tool
    sql_query: Optional[str]                 # Generated SQL query draft
    dba_critique: Optional[str]              # Auditor feedback if rejected
    sql_approval_status: Optional[str]       # "PENDING" | "APPROVED" | "REJECTED"
    raw_query_results: Optional[str]         # JSON data returned by execute_read_only_sql
    data_insights_summary: Optional[str]     # Final business summary written for non-technical users
    
    # Path 2: Enterprise Workflow Action (Gated by HITL)
    action_type: Optional[str]               # "CREATE_TICKET" | "DISPATCH_ALERT"
    action_payload: Optional[Dict[str, Any]] # Structured parameters (title, category, priority, etc.)
    human_approved: bool                     # HITL Approval flag (default: False)
    action_execution_result: Optional[str]   # Result string returned after tool execution
    
    # Final Unified Output & Diagnostics
    final_response: Optional[str]            # What gets shown to the user
    iteration_count: int                     # Circuit breaker counter to prevent infinite loops
    current_agent: Optional[str]             # Last executing agent node name
