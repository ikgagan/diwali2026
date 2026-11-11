"""Entry point: `uvicorn main:app --reload --port 8000`."""

from app.server import create_app

app = create_app()
