import os
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials

SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/calendar.readonly",
]

CLIENT_SECRET_FILE = "client_secret.json"
REDIRECT_URI = "http://localhost:8000/auth/callback"


def create_flow():

    flow = Flow.from_client_secrets_file(
        CLIENT_SECRET_FILE,
        scopes=SCOPES,
        redirect_uri=REDIRECT_URI
    )

    return flow


def credentials_from_session(session):

    creds = Credentials(
        token=session["token"],
        refresh_token=session["refresh_token"],
        token_uri=session["token_uri"],
        client_id=session["client_id"],
        client_secret=session["client_secret"],
        scopes=session["scopes"]
    )

    return creds