"""Request/response contracts for registration, login, and the current user."""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field

Role = Literal["patient", "doctor", "admin"]


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    full_name: str = Field(..., min_length=1, max_length=255)
    # Self-registration is limited to patient/doctor. Admin accounts are
    # provisioned separately (seed script / direct DB grant) — never through
    # a public endpoint.
    role: Literal["patient", "doctor"] = "patient"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserPublic(BaseModel):
    id: str
    email: str
    full_name: str | None
    role: Role
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic
