"""Request/response contracts for the AI-planner chat endpoint."""
from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    session_id: str = Field(..., min_length=1, max_length=128, examples=["a1b2c3"])
    message: str = Field(..., min_length=1, max_length=2000, examples=["Analyze BRCA1"])


class ChatSessionResetResponse(BaseModel):
    session_id: str
    status: str = "reset"
