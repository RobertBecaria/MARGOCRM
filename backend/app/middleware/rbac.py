from typing import List

from fastapi import Depends, HTTPException, status

from app.models.user import RoleEnum, User
from app.services.auth import get_current_user


def require_role(*roles: RoleEnum):
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return current_user
    return role_checker
