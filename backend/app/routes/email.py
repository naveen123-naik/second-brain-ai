from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.utils.auth import get_verified_user
from app.services.email_service import send_email as sys_send_email

router = APIRouter()


class EmailSchema(BaseModel):
    to: str
    subject: str
    body: str


@router.post("/send")
def send_email(data: EmailSchema, current_user = Depends(get_verified_user)):
    try:
        sys_send_email(data.to, data.subject, data.body)
        return {
            "message": "Email sent successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")