"""
Tool Registry & Schemas
File: EnterpriseIQ/backend/app/tools/registry.py

Consolidates all tools, provides OpenAI/Groq function calling JSON schemas,
and implements the safe dispatch executor.
"""

import json
from typing import Dict, Any, Callable
from .db_tools import inspect_database_schema_tool, execute_read_only_sql_tool
from .workflow_tools import create_support_ticket_tool, dispatch_escalation_alert_tool


# Python function registry mapping
TOOL_REGISTRY: Dict[str, Callable] = {
    "inspect_database_schema": inspect_database_schema_tool,
    "execute_read_only_sql": execute_read_only_sql_tool,
    "create_support_ticket": create_support_ticket_tool,
    "dispatch_escalation_alert": dispatch_escalation_alert_tool
}

# OpenAI / Groq JSON Schemas for tool calling
TOOL_SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "inspect_database_schema",
            "description": (
                "Inspects the live enterprise database structure. "
                "Returns tables, column names, column data types, foreign keys, and row counts. "
                "Call this BEFORE writing any SQL to ensure you use the exact table and column names."
            ),
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "execute_read_only_sql",
            "description": (
                "Executes a safe, read-only SELECT SQL query against the enterprise database. "
                "Destructive operations (DROP, DELETE, UPDATE, INSERT) are strictly rejected."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The exact valid SQLite SELECT query to execute."
                    }
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_support_ticket",
            "description": (
                "Creates an official support incident or request ticket in the enterprise database. "
                "NOTE: This modifies data and requires Human-in-the-Loop approval before execution."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "customer_id": {
                        "type": "integer",
                        "description": "The ID of the customer account (integer 1-20)."
                    },
                    "category": {
                        "type": "string",
                        "enum": ["BILLING", "TECHNICAL", "API_INTEGRATION", "SECURITY_ACCESS", "FEATURE_REQUEST"],
                        "description": "The incident category."
                    },
                    "title": {
                        "type": "string",
                        "description": "Short, clear summary of the ticket."
                    },
                    "priority": {
                        "type": "string",
                        "enum": ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
                        "description": "Urgency priority level."
                    },
                    "assigned_to_employee_id": {
                        "type": "integer",
                        "description": "Optional employee ID to assign the ticket to."
                    }
                },
                "required": ["customer_id", "category", "title", "priority"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "dispatch_escalation_alert",
            "description": (
                "Sends an urgent broadcast alert to an internal enterprise communication channel (Slack/Teams). "
                "NOTE: Requires Human-in-the-Loop approval before dispatch."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "channel": {
                        "type": "string",
                        "description": "The target channel, e.g. '#incident-commander', '#billing-escalations', or '#support-leads'."
                    },
                    "message": {
                        "type": "string",
                        "description": "The message body describing the escalation."
                    },
                    "urgency": {
                        "type": "string",
                        "enum": ["MEDIUM", "HIGH", "CRITICAL"],
                        "description": "Priority level of the broadcast."
                    }
                },
                "required": ["channel", "message"]
            }
        }
    }
]


def dispatch_tool(tool_name: str, arguments: Dict[str, Any]) -> str:
    """Safe dispatcher that executes registered tools."""
    if tool_name not in TOOL_REGISTRY:
        return json.dumps({"status": "ERROR", "message": f"Unknown tool '{tool_name}'"})
    
    try:
        func = TOOL_REGISTRY[tool_name]
        return func(**arguments)
    except Exception as e:
        return json.dumps({"status": "ERROR", "message": f"Tool execution failed: {str(e)}"})
