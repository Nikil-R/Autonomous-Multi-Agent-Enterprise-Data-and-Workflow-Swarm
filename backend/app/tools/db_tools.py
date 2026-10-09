"""
Database Domain Tools
File: EnterpriseIQ/backend/app/tools/db_tools.py

These tools enable the Swarm to interact safely with the enterprise relational database:
1. inspect_database_schema_tool: Dynamically discovers tables, columns, data types, and foreign keys.
2. execute_read_only_sql_tool: Executes read-only SQL queries with strict safety guardrails.
"""

import os
import sqlite3
import json
from typing import Dict, Any, List

# Locate the enterprise database seeded in app/db/enterprise.db
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.abspath(os.path.join(CURRENT_DIR, "..", "db", "enterprise.db"))


def inspect_database_schema_tool() -> str:
    """
    Tool: Inspects the enterprise database structure dynamically.
    Returns:
        JSON string containing all table names, column names, column types,
        primary/foreign keys, and sample row counts.
    Why:
        Prevents LLM hallucination of table or column names by grounding
        the SQL generator in ground-truth database metadata.
    """
    if not os.path.exists(DB_PATH):
        return json.dumps({"error": f"Database file not found at {DB_PATH}"})

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # Get all non-internal tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
        tables = [row[0] for row in cursor.fetchall()]

        schema_info: Dict[str, Any] = {}

        for table in tables:
            # Table column definitions: cid, name, type, notnull, dflt_value, pk
            cursor.execute(f"PRAGMA table_info({table});")
            columns = [
                {
                    "column_name": col[1],
                    "data_type": col[2],
                    "is_primary_key": bool(col[5]),
                    "not_null": bool(col[3])
                }
                for col in cursor.fetchall()
            ]

            # Foreign key relationships
            cursor.execute(f"PRAGMA foreign_key_list({table});")
            foreign_keys = [
                {
                    "from_column": fk[3],
                    "references_table": fk[2],
                    "references_column": fk[4]
                }
                for fk in cursor.fetchall()
            ]

            # Row count
            cursor.execute(f"SELECT COUNT(*) FROM {table};")
            row_count = cursor.fetchone()[0]

            schema_info[table] = {
                "columns": columns,
                "foreign_keys": foreign_keys,
                "total_rows": row_count
            }

        return json.dumps(schema_info, indent=2)

    except Exception as e:
        return json.dumps({"error": f"Failed to inspect schema: {str(e)}"})
    finally:
        conn.close()


def execute_read_only_sql_tool(query: str) -> str:
    """
    Tool: Executes an approved SQL query against the enterprise database.
    Safety Rules:
        - Only SELECT or EXPLAIN statements are permitted.
        - Destructive keywords (DROP, DELETE, UPDATE, INSERT, ALTER, TRUNCATE, REPLACE)
          are rejected with a security error.
    Returns:
        JSON string containing the column names and list of result rows (up to 50 rows).
    """
    cleaned_query = query.strip().rstrip(";")
    query_upper = cleaned_query.upper()

    # Defense-in-depth safety check
    forbidden_keywords = ["DROP", "DELETE", "UPDATE", "INSERT", "ALTER", "TRUNCATE", "REPLACE", "CREATE", "GRANT", "REVOKE"]
    for keyword in forbidden_keywords:
        # Check for word boundary
        tokens = query_upper.split()
        if keyword in tokens:
            return json.dumps({
                "status": "ERROR",
                "message": f"Security Violation: Destructive command '{keyword}' is blocked in read-only mode."
            })

    if not query_upper.startswith("SELECT") and not query_upper.startswith("WITH"):
        return json.dumps({
            "status": "ERROR",
            "message": "Security Violation: Only SELECT / CTE queries are permitted."
        })

    if not os.path.exists(DB_PATH):
        return json.dumps({"status": "ERROR", "message": f"Database not found at {DB_PATH}"})

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # Enforce maximum return rows limit to prevent memory exhaustion
        limited_query = f"{cleaned_query} LIMIT 50" if "LIMIT" not in query_upper else cleaned_query
        cursor.execute(limited_query)
        
        # Get column names
        columns = [description[0] for description in cursor.description] if cursor.description else []
        rows = cursor.fetchall()

        # Convert rows into dictionary mappings
        results = [dict(zip(columns, row)) for row in rows]

        return json.dumps({
            "status": "SUCCESS",
            "row_count": len(results),
            "columns": columns,
            "data": results
        }, indent=2)

    except sqlite3.Error as e:
        return json.dumps({
            "status": "ERROR",
            "message": f"SQLite Execution Error: {str(e)}"
        })
    finally:
        conn.close()


if __name__ == "__main__":
    import sys
    if sys.platform == "win32":
        sys.stdout.reconfigure(encoding="utf-8")
    
    print("🧪 Testing Database Tools...")
    print("\n1. Testing Schema Inspection Tool:")
    schema = inspect_database_schema_tool()
    print(f"Schema preview (first 250 chars):\n{schema[:250]}...\n")

    print("2. Testing Safe Read-Only Query Tool:")
    test_query = "SELECT department, COUNT(*) as count, ROUND(AVG(salary), 2) as avg_sal FROM employees GROUP BY department;"
    result = execute_read_only_sql_tool(test_query)
    print(f"Query Result:\n{result}\n")

    print("3. Testing Security Rejection Guardrail:")
    blocked = execute_read_only_sql_tool("DROP TABLE employees;")
    print(f"Security Rejection Output:\n{blocked}")
