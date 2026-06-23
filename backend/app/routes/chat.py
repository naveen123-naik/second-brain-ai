from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.chat import Chat
from app.models.user import User
from app.rag.pipeline import ask_ai, clear_memory
from app.utils.auth import get_verified_user

# ✅ THIS LINE IS VERY IMPORTANT
router = APIRouter()


class ChatRequest(BaseModel):
    question: str
    model: str = None
    response_length: str = None
    creativity: float = None
    language: str = None


@router.post("/")
def chat_ai(request: ChatRequest, current_user: User = Depends(get_verified_user)):
    user_input = request.question.strip()

    answer = ask_ai(
        current_user.id,
        user_input,
        model=request.model,
        response_length=request.response_length,
        creativity=request.creativity,
        language=request.language
    )

    return {
        "answer": answer
    }

@router.post("/new")
def new_chat(current_user: User = Depends(get_verified_user)):
    clear_memory(current_user.id)
    return {"message": "Chat memory cleared successfully"}

@router.get("/history")
def get_chat_history(db: Session = Depends(get_db), current_user: User = Depends(get_verified_user)):
    chats = db.query(Chat).filter(Chat.user_id == current_user.id).order_by(Chat.created_at.asc()).all()
    return [
        {"question": chat.question, "answer": chat.answer}
        for chat in chats
    ]