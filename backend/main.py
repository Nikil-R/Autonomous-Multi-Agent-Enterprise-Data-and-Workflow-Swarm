"""
FastAPI Application Entrypoint
File: EnterpriseIQ/backend/main.py

Initializes the production FastAPI server with CORS, health checks,
and mounts the /api routes.
"""

import os
import sys

# Windows Application Control fallback
os.environ["UUID_UTILS_NO_EXTENSIONS"] = "1"

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from app.api.routes import router as swarm_router

app = FastAPI(
    title="EnterpriseIQ Swarm API",
    description="Autonomous Multi-Agent Enterprise Data & Workflow Swarm Service",
    version="1.0.0"
)

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Swarm routes
app.include_router(swarm_router)


@app.get("/health")
def health_check():
    return {
        "status": "HEALTHY",
        "service": "EnterpriseIQ Autonomous Swarm",
        "engine": "LangGraph + Groq + SQLite Checkpointer"
    }


if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting EnterpriseIQ FastAPI Server on http://127.0.0.1:8000...")
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
