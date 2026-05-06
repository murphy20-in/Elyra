"""FastAPI routers for the Elyra API."""
from app.backend.routes import (  # noqa: F401
    auth,
    chat,
    health,
    match,
    notification,
    payment,
    profile,
    safety,
)
