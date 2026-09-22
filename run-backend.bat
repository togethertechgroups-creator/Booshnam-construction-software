@echo off
echo Starting SiteOps Django REST API...
cd backend
.venv\Scripts\python.exe manage.py runserver 8000
pause
