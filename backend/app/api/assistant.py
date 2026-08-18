from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from pydantic import BaseModel, Field
from typing import Optional, List
from app.database.session import get_db
from app.services.assistant_service import AssistantService

router = APIRouter(prefix="/api/assistant", tags=["assistant"])

MAX_MESSAGE_LEN = 2000


class ChatMessage(BaseModel):
    role: str
    content: str


class AssistantChatRequest(BaseModel):
    message: str = Field(..., max_length=MAX_MESSAGE_LEN)
    alert_id: Optional[int] = None
    run_id: Optional[int] = None
    history: Optional[List[ChatMessage]] = None


@router.post("/chat")
def chat(req: AssistantChatRequest, client: Client = Depends(get_db)):
    if not req.message.strip():
        raise HTTPException(400, "Message cannot be empty")
    service = AssistantService(client)
    history = [h.dict() for h in req.history] if req.history else []
    return service.chat(req.message, alert_id=req.alert_id, run_id=req.run_id, history=history)