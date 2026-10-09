"""
Pydantic Schemas for API Contracts
File: EnterpriseIQ/backend/app/models/schemas.py
"""

from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    query: str = Field(..., description="The employee's natural language inquiry or action request")
    thread_id: Optional[str] = Field(None, description="Optional existing session ID; auto-generated if omitted")


class ApprovalRequest(BaseModel):
    thread_id: str = Field(..., description="The unique session thread ID awaiting approval")
    approved: bool = Field(..., description="True to execute the action; False to reject/cancel")
    modified_payload: Optional[Dict[str, Any]] = Field(
        None, 
        description="Optional edited payload parameters (e.g. edited ticket title, priority, or alert text)"
    )


class SwarmResponse(BaseModel):
    thread_id: str
    status: str = Field(..., description="'COMPLETED' | 'AWAITING_APPROVAL' | 'ERROR'")
    response_text: Optional[str] = None
    intent_category: Optional[str] = None
    
    # Text-to-SQL Analytics Metadata
    sql_query: Optional[str] = None
    raw_query_data: Optional[Any] = None
    
    # Workflow Action & HITL Metadata
    action_type: Optional[str] = None
    action_payload: Optional[Dict[str, Any]] = None
    action_execution_result: Optional[str] = None
    
    # Diagnostics
    current_agent: Optional[str] = None
    iteration_count: Optional[int] = 0


class HistorySnapshot(BaseModel):
    step_id: str
    next_node: Optional[str]
    current_agent: Optional[str]
    intent_category: Optional[str]
    response_text: Optional[str]
