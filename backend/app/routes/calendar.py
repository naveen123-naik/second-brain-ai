from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.services.calendar import get_events, add_event
from app.utils.auth import get_verified_user

router = APIRouter()

class EventRequest(BaseModel):
    summary: str
    start: str
    end: str


@router.get("/")
def read_calendar(current_user = Depends(get_verified_user)):
    events = get_events()
    return {"events": events}


@router.post("/add")
def create_event(event: EventRequest, current_user = Depends(get_verified_user)):
    created = add_event(
        event.summary,
        event.start,
        event.end
    )

    return {
        "message": "Event created successfully",
        "link": created.get("htmlLink")
    }


@router.delete("/{event_id}")
def remove_event(event_id: str, current_user = Depends(get_verified_user)):
    from app.services.calendar import delete_event
    success = delete_event(event_id)
    if success:
        return {"message": "Event deleted successfully"}
    return {"message": "Failed to delete event"}