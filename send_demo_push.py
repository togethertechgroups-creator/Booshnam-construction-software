import os
import sys
import firebase_admin
from firebase_admin import credentials, messaging

cred_path = r"C:\Users\HP\Downloads\booshnam-construction-firebase-adminsdk-fbsvc-0a7df65f28.json"
fcm_token = "fgcrQ_WfRFWC6aWT697ITk:APA91bFH50zgEWdRv786o7fJNhCyJg6HIpkfTAr9c2Eij9IyxTPEmj-cNNLlWzJzr9Fy-1hulPt4kDwAwM2xpYXnjC09SG6UGkPX44woeg0MDV0M1Cz_NDY"

if not os.path.exists(cred_path):
    print("Credentials file not found at", cred_path)
    sys.exit(1)

cred = credentials.Certificate(cred_path)
app = firebase_admin.initialize_app(cred)

message = messaging.Message(
    notification=messaging.Notification(
        title="🏗️ SiteOps: Project Assigned!",
        body="Residential Tower A has been assigned to you. Click to open site workspace.",
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
        "category": "PROJECT_ASSIGNED",
        "projectId": "proj-tower-a",
        "projectName": "Residential Tower A",
        "sender": "Admin",
    },
    token=fcm_token,
)

try:
    response = messaging.send(message)
    print("SUCCESS: Delivered to mobile device! FCM Message ID:", response)
except Exception as e:
    print("FAILED to send message:", e)
