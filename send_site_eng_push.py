import os
import firebase_admin
from firebase_admin import credentials, messaging

cred_path = r"C:\Users\HP\Downloads\booshnam-construction-firebase-adminsdk-fbsvc-0a7df65f28.json"

if not firebase_admin._apps:
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)

# Send to topic - all site engineers subscribed to 'role_site_engineer'
message = messaging.Message(
    notification=messaging.Notification(
        title="🏗️ Booshnam: Site Engineer Alert!",
        body="New task assigned to you. Open the app to view details.",
    ),
    android=messaging.AndroidConfig(
        priority="high",
        notification=messaging.AndroidNotification(
            channel_id="siteops_default",
            sound="default",
            priority="max",
            default_sound=True,
            default_vibrate_timings=True,
        ),
    ),
    data={
        "category": "TASK_ASSIGNED",
        "sender": "Admin",
    },
    topic="role_site_engineer",  # Sends to ALL site engineers!
)

try:
    response = messaging.send(message)
    print("SUCCESS! Notification sent to all Site Engineers!")
    print("FCM Message ID:", response)
except Exception as e:
    print("FAILED:", e)
