@echo off
echo ==============================================
echo Initializing Demand Intelligence System...
echo ==============================================

echo.
echo [1/3] Setting up Python Virtual Environment...
python -m venv venv
call venv\Scripts\activate.bat

echo.
echo [2/3] Installing Python Dependencies...
pip install -r requirements.txt
if exist backend\requirements.txt (
    pip install -r backend\requirements.txt
)

echo.
echo [3/3] Setting up Frontend Next.js app...
cd frontend
call npm install
cd ..

echo.
echo ==============================================
echo Setup Complete!
echo ==============================================
echo To run the backend:
echo   venv\Scripts\activate
echo   cd backend
echo   uvicorn main:app --reload
echo.
echo To run the frontend:
echo   cd frontend
echo   npm run dev
echo ==============================================
pause
