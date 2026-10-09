"""
Workflow & Action Domain Tools
File: EnterpriseIQ/backend/app/tools/workflow_tools.py

These tools enable the Swarm to execute operational enterprise actions.
CRITICAL ARCHITECTURAL RULE:
These tools modify state or trigger external side-effects!
In our LangGraph swarm, these are gated behind the Human-in-the-Loop (HITL) breakpoint!
"""

import os
import sqlite3
import json
from datetime import datetime
from typing import Dict, Any

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.abspath(os.path.join(CURRENT_DIR, "..", "db", "enterprise.db"))


def create_support_ticket_tool(
    customer_id: int,
    category: str,
    title: str,
    priority: str,
    assigned_to_employee_id: int = None
) -> str:
    """
    Tool: Inserts a newly prioritized support ticket into the live enterprise database.
    Inputs:
        - customer_id: ID of the client company (1 to 20)
        - category: One of ('BILLING', 'TECHNICAL', 'API_INTEGRATION', 'SECURITY_ACCESS', 'FEATURE_REQUEST')
        - title: Concise descriptive summary of the incident or request
        - priority: One of ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')
        - assigned_to_employee_id: Optional ID of the employee assigned to solve it
    Returns:
        JSON string confirming ticket ID, status, and creation timestamp.
    """
    valid_categories = ['BILLING', 'TECHNICAL', 'API_INTEGRATION', 'SECURITY_ACCESS', 'FEATURE_REQUEST']
    valid_priorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

    cat_clean = category.upper().strip()
    prio_clean = priority.upper().strip()

    if cat_clean not in valid_categories:
        return json.dumps({
            "status": "ERROR",
            "message": f"Invalid category '{category}'. Must be one of {valid_categories}"
        })

    if prio_clean not in valid_priorities:
        return json.dumps({
            "status": "ERROR",
            "message": f"Invalid priority '{priority}'. Must be one of {valid_priorities}"
        })

    if not os.path.exists(DB_PATH):
        return json.dumps({"status": "ERROR", "message": f"Database not found at {DB_PATH}"})

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        cursor.execute("""
        INSERT INTO support_tickets (customer_id, category, title, priority, status, created_at, assigned_to_employee_id)
        VALUES (?, ?, ?, ?, 'OPEN', ?, ?);
        """, (customer_id, cat_clean, title.strip(), prio_clean, now_str, assigned_to_employee_id))
        
        ticket_id = cursor.lastrowid
        conn.commit()

        return json.dumps({
            "status": "SUCCESS",
            "ticket_id": ticket_id,
            "customer_id": customer_id,
            "category": cat_clean,
            "title": title.strip(),
            "priority": prio_clean,
            "ticket_status": "OPEN",
            "created_at": now_str,
            "message": f"Ticket #{ticket_id} successfully created in Enterprise ServiceDesk."
        }, indent=2)

    except sqlite3.Error as e:
        return json.dumps({"status": "ERROR", "message": f"Database insertion failed: {str(e)}"})
    finally:
        conn.close()


def dispatch_escalation_alert_tool(channel: str, message: str, urgency: str = "HIGH") -> str:
    """
    Tool: Simulates dispatching an urgent notification to enterprise communication channels
          (e.g., Slack, Microsoft Teams, PagerDuty, or Email).
    Inputs:
        - channel: Target channel name (e.g., '#incident-commander', '#billing-escalations', '#vip-support')
        - message: The exact notification message body
        - urgency: 'MEDIUM', 'HIGH', or 'CRITICAL'
    Returns:
        JSON string confirming message delivery with broadcast audit ID.
    """
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    broadcast_id = f"ALERT-{int(datetime.now().timestamp())}"

    # In production, this calls a Slack Webhook or PagerDuty Events API v2
    # Here, we log and simulate delivery with full audit metadata
    return json.dumps({
        "status": "DISPATCHED",
        "broadcast_id": broadcast_id,
        "channel": channel if channel.startswith("#") else f"#{channel}",
        "urgency": urgency.upper(),
        "delivered_at": now_str,
        "payload": message,
        "message": f"Escalation broadcast successfully dispatched to {channel}."
    }, indent=2)


if __name__ == "__main__":
    import sys
    if sys.platform == "win32":
        sys.stdout.reconfigure(encoding="utf-8")

    print("🧪 Testing Workflow Tools...")
    
    print("\n1. Testing Support Ticket Creation Tool:")
    ticket_res = create_support_ticket_tool(
        customer_id=1,
        category="TECHNICAL",
        title="Automated Test: API latency alert detected by AI Agent",
        priority="HIGH"
    )
    print(f"Ticket Result:\n{ticket_res}\n")

    print("2. Testing Escalation Alert Dispatch Tool:")
    alert_res = dispatch_escalation_alert_tool(
        channel="#incident-commander",
        message="URGENT: High latency detected on Payment Gateway for Enterprise customer #1",
        urgency="CRITICAL"
    )
    print(f"Alert Result:\n{alert_res}")
