import imaplib
import email
import smtplib
from email.mime.text import MIMEText
from dotenv import load_dotenv
import os

load_dotenv()

EMAIL_USER = os.getenv("EMAIL_USER")
EMAIL_PASS = os.getenv("EMAIL_PASS")


# ----------------------------
# Fetch Emails
# ----------------------------

def fetch_emails():

    mail = imaplib.IMAP4_SSL("imap.gmail.com")
    mail.login(EMAIL_USER, EMAIL_PASS)

    mail.select("inbox")

    status, messages = mail.search(None, "ALL")
    email_ids = messages[0].split()

    latest_emails = []

    for eid in email_ids[-5:]:

        status, msg_data = mail.fetch(eid, "(RFC822)")
        raw_email = msg_data[0][1]

        msg = email.message_from_bytes(raw_email)

        subject = msg["subject"]
        sender = msg["from"]

        body = ""

        if msg.is_multipart():
            for part in msg.walk():
                if part.get_content_type() == "text/plain":
                    body = part.get_payload(decode=True).decode(errors="ignore")
        else:
            body = msg.get_payload(decode=True).decode(errors="ignore")

        latest_emails.append({
            "subject": subject,
            "from": sender,
            "body": body[:200]
        })

    mail.logout()

    return latest_emails


# ----------------------------
# Send Email
# ----------------------------

def send_email(to, subject, body):

    msg = MIMEText(body)

    msg["Subject"] = subject
    msg["From"] = EMAIL_USER
    msg["To"] = to

    server = smtplib.SMTP_SSL("smtp.gmail.com", 465)

    server.login(EMAIL_USER, EMAIL_PASS)
    server.sendmail(EMAIL_USER, to, msg.as_string())

    server.quit()

    return "Email sent successfully"