"""
Enterprise Swarm Agent Nodes
File: EnterpriseIQ/backend/app/swarm/agents.py

Defines the specialized agent nodes collaborating over EnterpriseSwarmState:
1. supervisor_node: Triage & intent classification (Data Analytics vs. Workflow Action)
2. sql_generator_node: Inspects live schema and writes safe SQL queries
3. sql_dba_critic_node: Senior DBA reflection loop (evaluates safety, read-only rules, and syntax)
4. sql_execution_node: Executes approved SQL using execute_read_only_sql_tool
5. data_synthesizer_node: Converts raw SQL rows into clean, executive business insights
6. workflow_planner_node: Analyzes action intent, extracts ticket/alert parameters
7. execute_action_tool_node: GATED BY HITL! Executes action ONLY after human sign-off
"""

import os
import sys
import json
from dotenv import load_dotenv
from groq import Groq

# Ensure windows utf-8 encoding support
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

# Ensure environment variables are loaded
load_dotenv()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

from .state import EnterpriseSwarmState
from ..tools.db_tools import inspect_database_schema_tool, execute_read_only_sql_tool
from ..tools.workflow_tools import create_support_ticket_tool, dispatch_escalation_alert_tool


MODEL_NAME = "qwen/qwen3.8-27b"


# =====================================================================
# AGENT 1: SUPERVISOR & INTENT TRIAGE
# =====================================================================

def supervisor_node(state: EnterpriseSwarmState) -> dict:
    """
    Supervisor Agent: Analyzes the user's natural language inquiry and determines
    whether it requires Data Analytics (Text-to-SQL) or an Enterprise Workflow Action.
    """
    iterations = state.get("iteration_count", 0) + 1
    query = state["user_query"]
    print(f"\n👑 [SUPERVISOR AGENT] Triaging request (Cycle #{iterations}): '{query[:70]}...'")

    prompt = (
        f"You are the Enterprise Triage Supervisor for an internal operations platform.\n"
        f"Analyze this employee's inquiry: \"{query}\"\n\n"
        "Classify the inquiry into EXACTLY ONE of the following categories:\n"
        "1. 'DATA_ANALYTICS': If the user is asking about numbers, metrics, employees, salaries, departments, "
        "customers, spend, transactions, tickets, counts, averages, or database facts.\n"
        "2. 'WORKFLOW_ACTION': If the user wants to take an action: create a support ticket, log an incident, "
        "file an escalation, or dispatch an urgent alert to Slack/Teams.\n"
        "3. 'GENERAL': If it's a generic greeting or conversational inquiry.\n\n"
        "Reply with ONLY one of these exact tokens: 'DATA_ANALYTICS', 'WORKFLOW_ACTION', or 'GENERAL'."
    )

    response = client.chat.completions.create(
        model=MODEL_NAME,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.0,
        max_tokens=30
    )

    raw_intent = response.choices[0].message.content.strip().upper()

    if "WORKFLOW" in raw_intent or "ACTION" in raw_intent:
        intent = "WORKFLOW_ACTION"
    elif "DATA" in raw_intent or "ANALYTICS" in raw_intent:
        intent = "DATA_ANALYTICS"
    else:
        intent = "GENERAL"

    print(f"   🎯 Triage Classification -> [{intent}]")

    return {
        "intent_category": intent,
        "iteration_count": iterations,
        "current_agent": "supervisor"
    }


# =====================================================================
# AGENT 2: SQL DATA INTELLIGENCE (TEXT-TO-SQL GENERATOR)
# =====================================================================

def sql_generator_node(state: EnterpriseSwarmState) -> dict:
    """
    SQL Generator Agent: Dynamically reads the database schema and writes
    a targeted, valid SQLite SELECT query.
    """
    print("\n📊 [SQL DATA INTELLIGENCE AGENT] Generating SQL query...")
    
    # Dynamically extract live database schema if not already in state
    schema_info = state.get("database_schema")
    if not schema_info:
        schema_info = inspect_database_schema_tool()

    query = state["user_query"]
    prior_critique = state.get("dba_critique")

    if prior_critique:
        print(f"   🔄 Incorporating DBA critique into query revision...")
        prompt = (
            f"You previously generated this SQL query:\n```sql\n{state.get('sql_query')}\n```\n"
            f"The Senior DBA Auditor rejected it with this feedback:\n{prior_critique}\n\n"
            f"Database Schema:\n{schema_info}\n\n"
            f"Original Question: \"{query}\"\n\n"
            "Generate a corrected SQLite SELECT query that resolves the DBA's feedback completely. "
            "Output ONLY the raw SQLite query. Do not wrap in markdown or add explanations."
        )
    else:
        prompt = (
            f"You are a Principal Database Architect.\n"
            f"Live Database Schema:\n{schema_info}\n\n"
            f"User Question: \"{query}\"\n\n"
            "Write a clean, optimized SQLite SELECT query to accurately answer this question.\n"
            "Rules:\n"
            "1. ONLY use valid tables and columns present in the schema above.\n"
            "2. Read-only queries only (SELECT or CTE). Never use DROP, DELETE, INSERT, or UPDATE.\n"
            "3. If joining tables, use proper foreign keys shown in the schema.\n"
            "4. Output ONLY the raw SQL query. No markdown formatting, no conversational text."
        )

    response = client.chat.completions.create(
        model=MODEL_NAME,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1,
        max_tokens=250
    )

    sql_draft = response.choices[0].message.content.strip()
    
    # Clean any accidental markdown code fences
    if sql_draft.startswith("```"):
        sql_draft = sql_draft.replace("```sql", "").replace("```", "").strip()
    sql_draft = sql_draft.rstrip(";")

    print(f"   📝 Generated SQL Draft:\n   >>> {sql_draft}")

    return {
        "database_schema": schema_info,
        "sql_query": sql_draft,
        "current_agent": "sql_generator"
    }


# =====================================================================
# AGENT 3: SENIOR DBA SECURITY AUDITOR (REFLECTION CRITIC)
# =====================================================================

def sql_dba_critic_node(state: EnterpriseSwarmState) -> dict:
    """
    Senior DBA Critic Agent: Evaluates generated SQL against strict security,
    read-only constraints, and schema correctness.
    """
    print("\n🧐 [SENIOR DBA CRITIC] Auditing SQL query for security and correctness...")
    
    sql_to_audit = state.get("sql_query", "")
    query = state["user_query"]
    schema_info = state.get("database_schema", "")

    prompt = (
        f"You are a Senior Enterprise Database Administrator (DBA).\n"
        f"Audit this proposed SQL query for production safety and logic:\n"
        f"SQL Query: \"{sql_to_audit}\"\n\n"
        f"User Question: \"{query}\"\n"
        f"Schema Metadata:\n{schema_info}\n\n"
        "Security & Correctness Rubric:\n"
        "1. MUST be strictly read-only (SELECT). Reject any query with DROP, DELETE, UPDATE, INSERT, ALTER.\n"
        "2. MUST only reference existing tables and columns from the schema.\n"
        "3. MUST answer the user's specific question without syntax errors.\n\n"
        "Decision Format:\n"
        "- If the query is 100% safe and correct, reply with exactly: 'APPROVED'\n"
        "- If flawed or unsafe, reply starting with 'REJECTED: <exact explanation of flaws>'"
    )

    response = client.chat.completions.create(
        model=MODEL_NAME,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.0,
        max_tokens=150
    )

    audit_decision = response.choices[0].message.content.strip()

    if audit_decision.startswith("APPROVED"):
        print("   ✅ Verdict: APPROVED by Senior DBA!")
        return {
            "sql_approval_status": "APPROVED",
            "dba_critique": None,
            "current_agent": "sql_dba_critic"
        }
    else:
        print(f"   ❌ Verdict: REJECTED! Feedback: {audit_decision[:90]}...")
        return {
            "sql_approval_status": "REJECTED",
            "dba_critique": audit_decision,
            "current_agent": "sql_dba_critic"
        }


# =====================================================================
# NODE 4: SQL EXECUTION NODE (RUNS APPROVED QUERY)
# =====================================================================

def sql_execution_node(state: EnterpriseSwarmState) -> dict:
    """Executes the approved SQL query against the real SQLite database."""
    print("\n⚡ [SQL EXECUTOR] Running approved query against enterprise database...")
    
    query = state["sql_query"]
    execution_result = execute_read_only_sql_tool(query)
    
    # Preview rows
    try:
        parsed = json.loads(execution_result)
        row_count = parsed.get("row_count", 0)
        print(f"   📥 Returned {row_count} rows from database.")
    except Exception:
        pass

    return {
        "raw_query_results": execution_result,
        "current_agent": "sql_execution"
    }


# =====================================================================
# AGENT 5: DATA INSIGHTS SYNTHESIZER
# =====================================================================

def data_synthesizer_node(state: EnterpriseSwarmState) -> dict:
    """Converts raw JSON database rows into clear business insights."""
    print("\n📈 [DATA SYNTHESIZER AGENT] Generating executive business briefing...")
    
    prompt = (
        f"You are an Executive Business Intelligence Analyst.\n"
        f"User Question: \"{state['user_query']}\"\n\n"
        f"Executed SQL: \"{state.get('sql_query')}\"\n\n"
        f"Raw Database Results:\n{state.get('raw_query_results')}\n\n"
        "Write a concise, professional answer for the employee.\n"
        "Structure:\n"
        "1. Direct Answer (State the numbers/facts clearly).\n"
        "2. Key Takeaways or Business Observations (2-3 bullets).\n"
        "Make it easy for non-technical leadership to digest."
    )

    response = client.chat.completions.create(
        model=MODEL_NAME,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
        max_tokens=350
    )

    insights = response.choices[0].message.content.strip()
    return {
        "data_insights_summary": insights,
        "final_response": insights,
        "current_agent": "data_synthesizer"
    }


# =====================================================================
# AGENT 6: WORKFLOW ACTION PLANNER (DRAFTS ACTION PAYLOAD)
# =====================================================================

def workflow_planner_node(state: EnterpriseSwarmState) -> dict:
    """
    Workflow Agent: Analyzes the action request and drafts a structured JSON payload
    for ticket creation or escalation broadcast.
    DOES NOT EXECUTE! Routes directly to the Human Breakpoint.
    """
    print("\n⚡ [WORKFLOW ACTION AGENT] Drafting enterprise action payload...")
    query = state["user_query"]

    prompt = (
        f"You are an Enterprise Workflow Automation Specialist.\n"
        f"The employee requested an operational action: \"{query}\"\n\n"
        "Determine the action type and extract structured parameters in valid JSON.\n"
        "Supported Action Types:\n"
        "1. 'CREATE_TICKET':\n"
        "   Payload keys: {\"action_type\": \"CREATE_TICKET\", \"customer_id\": <int 1-20>, \"category\": \"TECHNICAL\"|\"BILLING\"|\"API_INTEGRATION\"|\"SECURITY_ACCESS\", \"title\": \"...\", \"priority\": \"LOW\"|\"MEDIUM\"|\"HIGH\"|\"CRITICAL\"}\n"
        "2. 'DISPATCH_ALERT':\n"
        "   Payload keys: {\"action_type\": \"DISPATCH_ALERT\", \"channel\": \"#incident-commander\"|\"#billing-escalations\", \"message\": \"...\", \"urgency\": \"MEDIUM\"|\"HIGH\"|\"CRITICAL\"}\n\n"
        "Output ONLY valid JSON. No conversational text or markdown code fences."
    )

    response = client.chat.completions.create(
        model=MODEL_NAME,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.0,
        max_tokens=250
    )

    raw_json = response.choices[0].message.content.strip()
    if raw_json.startswith("```"):
        raw_json = raw_json.replace("```json", "").replace("```", "").strip()

    try:
        payload = json.loads(raw_json)
        action_type = payload.get("action_type", "CREATE_TICKET")
    except Exception:
        # Fallback payload
        action_type = "CREATE_TICKET"
        payload = {
            "action_type": "CREATE_TICKET",
            "customer_id": 1,
            "category": "TECHNICAL",
            "title": query,
            "priority": "HIGH"
        }

    print(f"   📋 Drafted Action Payload for [{action_type}]:")
    print(f"   >>> {json.dumps(payload, indent=2)}")

    return {
        "action_type": action_type,
        "action_payload": payload,
        "human_approved": False,
        "current_agent": "workflow_planner"
    }


# =====================================================================
# NODE 7: LIVE ACTION DISPATCHER (GATED BY HITL BREAKPOINT)
# =====================================================================

def execute_action_tool_node(state: EnterpriseSwarmState) -> dict:
    """
    CRITICAL: This node executes ONLY AFTER the Human-in-the-Loop breakpoint!
    It reads the human-approved payload and executes the real tool.
    """
    print("\n🚀 [LIVE ACTION EXECUTOR] Resuming post-human approval! Executing verified action...")
    
    payload = state.get("action_payload", {})
    action_type = state.get("action_type", "CREATE_TICKET")

    if action_type == "CREATE_TICKET":
        tool_output = create_support_ticket_tool(
            customer_id=payload.get("customer_id", 1),
            category=payload.get("category", "TECHNICAL"),
            title=payload.get("title", "Automated Ticket"),
            priority=payload.get("priority", "HIGH")
        )
    elif action_type == "DISPATCH_ALERT":
        tool_output = dispatch_escalation_alert_tool(
            channel=payload.get("channel", "#incident-commander"),
            message=payload.get("message", "Priority Notification"),
            urgency=payload.get("urgency", "HIGH")
        )
    else:
        tool_output = json.dumps({"status": "ERROR", "message": f"Unsupported action type '{action_type}'"})

    print(f"   📥 Tool Execution Result:\n   >>> {tool_output}")

    summary = (
        f"✅ **Action Successfully Executed with Human Sign-Off**\n\n"
        f"**Action Type:** `{action_type}`\n\n"
        f"**Audit Record:**\n```json\n{tool_output}\n```"
    )

    return {
        "action_execution_result": tool_output,
        "final_response": summary,
        "current_agent": "execute_action_tool"
    }


# =====================================================================
# NODE 8: GENERAL CHAT FALLBACK NODE
# =====================================================================

def general_chat_node(state: EnterpriseSwarmState) -> dict:
    """Handles conversational greetings or queries."""
    query = state["user_query"]
    prompt = (
        f"You are EnterpriseIQ, an intelligent enterprise colleague.\n"
        f"The employee said: \"{query}\"\n"
        "Reply warmly, explaining that you can query enterprise databases in natural language "
        "(employees, transactions, customers, support tickets) or file operational workflows and tickets."
    )
    response = client.chat.completions.create(
        model=MODEL_NAME,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
        max_tokens=150
    )
    ans = response.choices[0].message.content.strip()
    return {"final_response": ans, "current_agent": "general_chat"}
