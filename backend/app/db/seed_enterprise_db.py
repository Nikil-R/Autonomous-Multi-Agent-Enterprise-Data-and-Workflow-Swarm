"""
Enterprise Database Seeder
File: EnterpriseIQ/backend/app/db/seed_enterprise_db.py

Generates a realistic, generic modern enterprise database:
1. employees: Internal workforce data across departments (Engineering, Sales, HR, Finance)
2. customers: Client base with subscription tiers, account balances, and spend
3. transactions: Platform transaction records (payments, subscriptions, usage charges)
4. support_tickets: Customer issue tickets, categories, priorities, and resolution status
5. company_policies: Internal SOPs, refund limits, and approval policies for RAG/Agent lookup
"""

import os
import sys
import sqlite3
from datetime import datetime, timedelta
import random

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

DB_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(DB_DIR, "enterprise.db")


def seed_database():
    print(f"📦 Initializing enterprise database at: {DB_PATH}")
    
    # Remove existing DB if any to ensure clean seed
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Enable foreign keys
    cursor.execute("PRAGMA foreign_keys = ON;")

    # =================================================================
    # 1. EMPLOYEES TABLE (Internal Org Structure)
    # =================================================================
    cursor.execute("""
    CREATE TABLE employees (
        employee_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        department TEXT NOT NULL,
        role TEXT NOT NULL,
        salary REAL NOT NULL,
        join_date TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('ACTIVE', 'ON_LEAVE', 'TERMINATED'))
    );
    """)

    departments = ["Engineering", "Product", "Sales", "Human Resources", "Finance", "Customer Success"]
    roles = {
        "Engineering": ["Senior Backend Engineer", "Frontend Architect", "DevOps Engineer", "AI/ML Engineer"],
        "Product": ["Group Product Manager", "Technical Product Manager", "UI/UX Designer"],
        "Sales": ["Enterprise Account Executive", "Sales Development Rep", "VP of Sales"],
        "Human Resources": ["HR Business Partner", "Technical Recruiter", "People Ops Manager"],
        "Finance": ["Financial Analyst", "Billing Specialist", "Head of Accounting"],
        "Customer Success": ["Support Tier 1", "Escalations Specialist", "Customer Success Manager"]
    }

    first_names = ["Arjun", "Neha", "Vikram", "Priya", "Rahul", "Ananya", "Rohan", "Sneha", "Karan", "Pooja", 
                   "Marcus", "Elena", "David", "Sophia", "Alex", "Chloe", "Tariq", "Zainab", "Hiroshi", "Yuki"]
    last_names = ["Sharma", "Verma", "Patel", "Reddy", "Nair", "Iyer", "Mehta", "Deshmukh", "Chopra", "Kaur",
                  "Vance", "Miller", "Dubois", "Smith", "Zhang", "Tanaka", "Al-Mansoor", "Kowalski", "Santos", "Kim"]

    employees_data = []
    for i in range(1, 41):
        dept = random.choice(departments)
        role = random.choice(roles[dept])
        fn = random.choice(first_names)
        ln = random.choice(last_names)
        name = f"{fn} {ln}"
        email = f"{fn.lower()}.{ln.lower()}{i}@enterprise.corp"
        salary = round(random.uniform(50000, 180000), 2)
        days_ago = random.randint(30, 1200)
        join_date = (datetime.now() - timedelta(days=days_ago)).strftime("%Y-%m-%d")
        status = random.choices(["ACTIVE", "ON_LEAVE", "TERMINATED"], weights=[0.88, 0.08, 0.04])[0]
        employees_data.append((name, email, dept, role, salary, join_date, status))

    cursor.executemany("""
    INSERT INTO employees (name, email, department, role, salary, join_date, status)
    VALUES (?, ?, ?, ?, ?, ?, ?);
    """, employees_data)

    # =================================================================
    # 2. CUSTOMERS TABLE (Client Base)
    # =================================================================
    cursor.execute("""
    CREATE TABLE customers (
        customer_id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_name TEXT NOT NULL,
        contact_name TEXT NOT NULL,
        contact_email TEXT UNIQUE NOT NULL,
        plan_tier TEXT NOT NULL CHECK(plan_tier IN ('FREE_TRIAL', 'GROWTH', 'ENTERPRISE', 'CUSTOM')),
        monthly_spend REAL NOT NULL,
        signup_date TEXT NOT NULL,
        is_active INTEGER NOT NULL CHECK(is_active IN (0, 1))
    );
    """)

    company_names = [
        "NovaTech Labs", "Apex Cloud Systems", "Starlight Logistics", "BlueWave Energy", "Quantum Edge",
        "Aura Payments", "Vanguard Health", "Helix Media", "OmniGlobal Freight", "Zenith Retail",
        "Falcon Cyber", "Hyperion Dynamics", "Catalyst SaaS", "Breeze FinTech", "Orbit Network",
        "Terraform RealEstate", "Nexus Robotics", "Pinnacle Advisory", "Pulse Analytics", "Beacon Digital"
    ]

    customers_data = []
    for idx, cname in enumerate(company_names, start=1):
        c_contact = f"{random.choice(first_names)} {random.choice(last_names)}"
        email = f"lead@{cname.lower().replace(' ', '')}.io"
        tier = random.choice(["GROWTH", "ENTERPRISE", "CUSTOM", "FREE_TRIAL"])
        spend_map = {"FREE_TRIAL": 0.0, "GROWTH": 1200.0, "ENTERPRISE": 8500.0, "CUSTOM": 22000.0}
        monthly_spend = spend_map[tier]
        signup = (datetime.now() - timedelta(days=random.randint(10, 600))).strftime("%Y-%m-%d")
        is_active = 1 if tier != "FREE_TRIAL" or random.random() > 0.3 else 0
        customers_data.append((cname, c_contact, email, tier, monthly_spend, signup, is_active))

    cursor.executemany("""
    INSERT INTO customers (company_name, contact_name, contact_email, plan_tier, monthly_spend, signup_date, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?);
    """, customers_data)

    # =================================================================
    # 3. TRANSACTIONS TABLE (Platform Invoices & Payments)
    # =================================================================
    cursor.execute("""
    CREATE TABLE transactions (
        transaction_id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        payment_method TEXT NOT NULL CHECK(payment_method IN ('CREDIT_CARD', 'ACH_TRANSFER', 'WIRE', 'INVOICE_NET30')),
        status TEXT NOT NULL CHECK(status IN ('SUCCESS', 'PENDING', 'FAILED', 'REFUNDED')),
        created_at TEXT NOT NULL,
        FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
    );
    """)

    transactions_data = []
    for i in range(1, 100):
        cust_id = random.randint(1, len(company_names))
        amt = round(random.choice([299.0, 1200.0, 3500.0, 8500.0, 15000.0, 22000.0]), 2)
        method = random.choice(["CREDIT_CARD", "ACH_TRANSFER", "WIRE", "INVOICE_NET30"])
        status = random.choices(["SUCCESS", "PENDING", "FAILED", "REFUNDED"], weights=[0.82, 0.08, 0.06, 0.04])[0]
        t_time = (datetime.now() - timedelta(days=random.randint(1, 90), hours=random.randint(1, 23))).strftime("%Y-%m-%d %H:%M:%S")
        transactions_data.append((cust_id, amt, method, status, t_time))

    cursor.executemany("""
    INSERT INTO transactions (customer_id, amount, payment_method, status, created_at)
    VALUES (?, ?, ?, ?, ?);
    """, transactions_data)

    # =================================================================
    # 4. SUPPORT_TICKETS TABLE (Helpdesk & Escalations)
    # =================================================================
    cursor.execute("""
    CREATE TABLE support_tickets (
        ticket_id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL,
        category TEXT NOT NULL CHECK(category IN ('BILLING', 'TECHNICAL', 'API_INTEGRATION', 'SECURITY_ACCESS', 'FEATURE_REQUEST')),
        title TEXT NOT NULL,
        priority TEXT NOT NULL CHECK(priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
        status TEXT NOT NULL CHECK(status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
        created_at TEXT NOT NULL,
        assigned_to_employee_id INTEGER,
        FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
        FOREIGN KEY (assigned_to_employee_id) REFERENCES employees(employee_id)
    );
    """)

    ticket_templates = [
        ("BILLING", "Invoice charge discrepancy on monthly renewal", "HIGH"),
        ("TECHNICAL", "504 Gateway Timeout on bulk export endpoint", "CRITICAL"),
        ("API_INTEGRATION", "Webhook signatures failing SHA256 validation", "MEDIUM"),
        ("SECURITY_ACCESS", "Request SSO integration via Okta SAML", "MEDIUM"),
        ("BILLING", "Refund requested for accidental seat upgrade", "MEDIUM"),
        ("TECHNICAL", "Database connection pool exhaustion during peak load", "CRITICAL"),
        ("FEATURE_REQUEST", "Custom CSV export column filter support", "LOW"),
        ("API_INTEGRATION", "Rate limit 429 errors despite Enterprise tier quota", "HIGH")
    ]

    tickets_data = []
    for i in range(1, 45):
        cat, title, prio = random.choice(ticket_templates)
        cust_id = random.randint(1, len(company_names))
        status = random.choices(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"], weights=[0.30, 0.35, 0.25, 0.10])[0]
        created = (datetime.now() - timedelta(days=random.randint(1, 30))).strftime("%Y-%m-%d %H:%M:%S")
        assigned = random.randint(1, 40) if status != "OPEN" else None
        tickets_data.append((cust_id, cat, f"{title} #{i}", prio, status, created, assigned))

    cursor.executemany("""
    INSERT INTO support_tickets (customer_id, category, title, priority, status, created_at, assigned_to_employee_id)
    VALUES (?, ?, ?, ?, ?, ?, ?);
    """, tickets_data)

    # =================================================================
    # 5. COMPANY_POLICIES TABLE (Knowledge Base & Escalation SOPs)
    # =================================================================
    cursor.execute("""
    CREATE TABLE company_policies (
        policy_id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL
    );
    """)

    policies = [
        (
            "REFUNDS",
            "Customer Refund Authorization Limit",
            "Support agents can issue instant refunds up to $500 without managerial approval. "
            "Refunds between $500 and $5,000 require written approval from a Support Lead or Finance Manager. "
            "Any refund exceeding $5,000 requires VP of Finance sign-off and an audited incident review."
        ),
        (
            "INCIDENTS",
            "Severity 1 (Critical) Outage Escalation Policy",
            "Any ticket categorized as CRITICAL affecting more than 2 enterprise clients must automatically "
            "trigger an urgent Slack notification to the #incident-commander channel and assign an on-call "
            "Senior Backend Engineer within 15 minutes."
        ),
        (
            "BILLING",
            "Subscription Grace Period and Cancellation Policy",
            "Enterprise customers have a 14-day grace period following a failed payment attempt before API access "
            "is throttled. Cancellations must be submitted at least 30 days prior to annual contract renewal."
        ),
        (
            "DATA_SECURITY",
            "Production Database Query and Audit Guidelines",
            "All autonomous agents and analytical tools must operate in read-only mode (SELECT queries only). "
            "Any destructive operation (UPDATE, DELETE, DROP, ALTER) requires mandatory Human-in-the-Loop "
            "multi-factor approval with cryptographic logging."
        )
    ]

    cursor.executemany("""
    INSERT INTO company_policies (category, title, content)
    VALUES (?, ?, ?);
    """, policies)

    conn.commit()

    # Print summary of seeded tables
    print("\n✅ Enterprise Relational Database successfully seeded!")
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [row[0] for row in cursor.fetchall()]
    print(f"📊 Tables Created ({len(tables)}): {', '.join(tables)}")

    for t in tables:
        cursor.execute(f"SELECT COUNT(*) FROM {t};")
        count = cursor.fetchone()[0]
        print(f"   - {t}: {count} records")

    conn.close()


if __name__ == "__main__":
    seed_database()
