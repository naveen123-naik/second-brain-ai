from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from datetime import datetime

from app.database import Base


class Chat(Base):

    __tablename__ = "chats"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)

    question = Column(String)

    answer = Column(String)

    created_at = Column(DateTime, default=datetime.utcnow)