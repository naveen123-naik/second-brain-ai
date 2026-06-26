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
def chat_ai(request: ChatRequest, current_user: User = Depends(get_verified_user), db: Session = Depends(get_db)):
    user_input = request.question.strip()

    answer = ask_ai(
        current_user.id,
        user_input,
        model=request.model,
        response_length=request.response_length,
        creativity=request.creativity,
        language=request.language
    )

    # Fetch the ID of the chat we just created
    last_chat = db.query(Chat).filter(Chat.user_id == current_user.id).order_by(Chat.created_at.desc()).first()
    chat_id = last_chat.id if last_chat else None

    return {
        "id": chat_id,
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
        {"id": chat.id, "question": chat.question, "answer": chat.answer}
        for chat in chats
    ]

@router.delete("/{chat_id}")
def delete_chat(chat_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_verified_user)):
    chat = db.query(Chat).filter(Chat.id == chat_id, Chat.user_id == current_user.id).first()
    if not chat:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Chat message not found")
    
    db.delete(chat)
    db.commit()
    return {"message": "Chat message deleted successfully"}