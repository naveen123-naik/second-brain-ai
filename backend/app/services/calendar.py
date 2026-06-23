import os
import datetime
from typing import List

# Try importing Google libs — they may not be configured
try:
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build
    from google_auth_oauthlib.flow import InstalledAppFlow
    from google.auth.transport.requests import Request
    GOOGLE_AVAILABLE = True
except ImportError:
    GOOGLE_AVAILABLE = False

SCOPES = ['https://www.googleapis.com/auth/calendar']

# In-memory store for manually added events (fallback mode)
_local_events: List[dict] = []
_deleted_demo_ids = set()


def _demo_events():
    """Return sample timeline events when Google Calendar is not connected."""
    now = datetime.datetime.utcnow()
    return [
        {
            "summary": "Project Architecture Review",
            "start": (now + datetime.timedelta(hours=2)).isoformat() + "Z",
            "end":   (now + datetime.timedelta(hours=3)).isoformat() + "Z",
            "source": "demo"
        },
        {
            "summary": "Neural Context Sync",
            "start": (now + datetime.timedelta(days=1)).isoformat() + "Z",
            "end":   (now + datetime.timedelta(days=1, hours=1)).isoformat() + "Z",
            "source": "demo"
        },
        {
            "summary": "Weekly Knowledge Digest",
            "start": (now + datetime.timedelta(days=2)).isoformat() + "Z",
            "end":   (now + datetime.timedelta(days=2, hours=2)).isoformat() + "Z",
            "source": "demo"
        },
        {
            "summary": "Document Assimilation Session",
            "start": (now + datetime.timedelta(days=3)).isoformat() + "Z",
            "end":   (now + datetime.timedelta(days=3, hours=1)).isoformat() + "Z",
            "source": "demo"
        },
        {
            "summary": "AI Research Deep Dive",
            "start": (now + datetime.timedelta(days=5)).isoformat() + "Z",
            "end":   (now + datetime.timedelta(days=5, hours=3)).isoformat() + "Z",
            "source": "demo"
        },
    ]


def get_calendar_service():
    if not GOOGLE_AVAILABLE:
        raise RuntimeError("Google Calendar libraries not installed.")

    creds = None
    if os.path.exists("token.json"):
        creds = Credentials.from_authorized_user_file("token.json", SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not os.path.exists("credentials.json"):
                raise RuntimeError("credentials.json not found.")
            flow = InstalledAppFlow.from_client_secrets_file("credentials.json", SCOPES)
            creds = flow.run_local_server(port=0)
        with open("token.json", "w") as token:
            token.write(creds.to_json())

    service = build("calendar", "v3", credentials=creds)
    return service


def get_events():
    # Try Google Calendar first
    try:
        service = get_calendar_service()
        now = datetime.datetime.utcnow().isoformat() + "Z"
        events_result = service.events().list(
            calendarId="primary",
            timeMin=now,
            maxResults=10,
            singleEvents=True,
            orderBy="startTime"
        ).execute()
        events = events_result.get("items", [])
        event_list = []
        for event in events:
            event_list.append({
                "id": event.get("id"),
                "summary": event.get("summary", "Untitled"),
                "start": event["start"].get("dateTime") or event["start"].get("date"),
                "end": event["end"].get("dateTime") or event["end"].get("date"),
                "source": "google"
            })
        # Merge with any locally added events
        combined = event_list + _local_events
        return [e for e in combined if e.get("id") not in _deleted_demo_ids]
    except Exception:
        # Fall back: return local + demo events
        demo_list = _demo_events()
        for i, item in enumerate(demo_list):
            item["id"] = f"demo_{i}"
        
        all_events = _local_events + demo_list
        return [e for e in all_events if e.get("id") not in _deleted_demo_ids]


def add_event(summary, start, end):
    # Try Google Calendar
    try:
        service = get_calendar_service()
        event = {
            "summary": summary,
            "start": {"dateTime": start, "timeZone": "Asia/Kolkata"},
            "end":   {"dateTime": end,   "timeZone": "Asia/Kolkata"},
        }
        created_event = service.events().insert(
            calendarId="primary", body=event
        ).execute()
        return created_event
    except Exception:
        # Fall back: store locally
        new_event = {
            "id": f"local_{len(_local_events) + 1}_{datetime.datetime.now().timestamp()}",
            "summary": summary,
            "start": start,
            "end": end,
            "source": "local"
        }
        _local_events.append(new_event)
        return {"htmlLink": None, "summary": summary}


def delete_event(event_id: str) -> bool:
    global _local_events
    if not event_id:
        return False
    
    if event_id.startswith("local_"):
        original_len = len(_local_events)
        _local_events = [e for e in _local_events if e.get("id") != event_id]
        return len(_local_events) < original_len
    elif event_id.startswith("demo_"):
        _deleted_demo_ids.add(event_id)
        return True
    else:
        # Google calendar delete
        try:
            service = get_calendar_service()
            service.events().delete(calendarId="primary", eventId=event_id).execute()
            return True
        except Exception as e:
            print("Google calendar delete failed:", e)
            # If Google API call fails (e.g. offline), track in deleted_demo_ids so it doesn't render
            _deleted_demo_ids.add(event_id)
            return True
