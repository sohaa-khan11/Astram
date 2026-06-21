@echo off
echo === Starting ASTraM Parking Intelligence ===

if not exist .venv (
    echo Error: Virtual environment not found. Please run setup.bat first.
    pause
    exit /b 1
)

echo Starting Backend API on http://localhost:8000 ...
start "ASTraM Backend API" cmd /c "call .venv\Scripts\activate.bat && python -m uvicorn api.main:app --reload --host 0.0.0.0 --port 8000"

echo Starting Frontend UI on http://localhost:5173 ...
start "ASTraM Frontend UI" cmd /c "cd frontend && npm run dev"

echo Both servers are starting up in separate windows.
echo - Frontend: http://localhost:5173
echo - Backend: http://localhost:8000
echo Close those windows or press any key to exit this launcher.
pause
