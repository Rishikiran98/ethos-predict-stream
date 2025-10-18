@echo off
REM Automated Backend Setup Script for Windows
REM No manual configuration required!

echo.
echo ==========================================
echo   🚀 Automated Backend Setup
echo ==========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python 3 is required but not installed.
    echo    Please install Python 3.10+ and try again.
    exit /b 1
)

echo ✓ Python found
python --version

REM Create virtual environment if it doesn't exist
if not exist "venv\" (
    echo.
    echo 📦 Creating virtual environment...
    python -m venv venv
    echo ✓ Virtual environment created
)

REM Activate virtual environment
echo.
echo 🔧 Activating virtual environment...
call venv\Scripts\activate.bat

REM Install dependencies
echo.
echo 📥 Installing dependencies...
pip install --upgrade pip -q
pip install -r requirements.txt -q
echo ✓ Dependencies installed

REM Run automated setup
echo.
python auto_setup.py

if %errorlevel% equ 0 (
    echo.
    echo 🎉 Backend is ready to use!
    echo.
    echo To start the server, run:
    echo   venv\Scripts\activate.bat
    echo   uvicorn main:app --reload --host 0.0.0.0 --port 8000
    echo.
) else (
    echo.
    echo ⚠️  Setup completed with warnings. Check logs above.
    echo.
)

pause
