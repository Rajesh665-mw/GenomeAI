"""
Auth dependencies used by any endpoint that needs to know who's calling —
or, for doctor/admin-only endpoints, needs to reject anyone who isn't.

Two current-user dependencies exist on purpose:

- `get_current_user`   — required. Raises if there's no valid token.
- `get_current_user_optional` — best-effort. Returns None instead of
  raising, so public endpoints (like the chat planner) can attach a
  `user_id` to analysis history when the caller happens to be logged in,
  without suddenly requiring login for the existing anonymous demo flow.
"""
from fastapi import Depends, Header, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenError, NotAuthenticatedError
from app.core.security import decode_token
from app.db.session import get_db
from app.models.user import User


def _extract_bearer_token(authorization: str | None) -> str | None:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    return authorization.split(" ", 1)[1].strip() or None


async def get_current_user_optional(
    authorization: str | None = Header(default=None),
    token_param: str | None = Query(default=None, alias="token"),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    token = _extract_bearer_token(authorization) or token_param
    if not token:
        return None
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def get_current_user(
    user: User | None = Depends(get_current_user_optional),
) -> User:
    if user is None:
        raise NotAuthenticatedError("Missing or invalid access token.")
    return user


def require_roles(*roles: str):
    """Dependency factory: `Depends(require_roles("doctor", "admin"))`."""

    async def _check(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise ForbiddenError(f"This action requires one of these roles: {', '.join(roles)}.")
        return user

    return _check
