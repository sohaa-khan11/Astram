@echo off
echo === ASTraM Parking Intelligence Setup ===

where python >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Python is not installed or not in PATH. Please install Python and try again.
    pause
    exit /b 1
)

where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Node.js/NPM is not installed or not in PATH. Please install Node.js and try again.
    pause
    exit /b 1
)

echo --- Setting up Python Virtual Environment ---
if not exist .venv (
    python -m venv .venv
    echo Created virtual environment in .venv
) else (
    echo Virtual environment already exists in .venv
)

echo --- Installing Backend Dependencies ---
call .venv\Scripts\activate.bat
python -m pip install --upgrade pip
pip install -r api\requirements.txt
pip install fastapi uvicorn pandas pyarrow numpy
call deactivate

echo --- Installing Frontend Dependencies ---
cd frontend
call npm install
cd ..

echo ===========================================
echo Setup complete! To run the application, run:
echo   start.bat
echo ===========================================
pause
