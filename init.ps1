Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "Initializing Demand Intelligence System..." -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

Write-Host "`n[1/3] Setting up Python Virtual Environment..." -ForegroundColor Yellow
python -m venv venv
.\venv\Scripts\Activate.ps1

Write-Host "`n[2/3] Installing Python Dependencies..." -ForegroundColor Yellow
pip install -r requirements.txt
if (Test-Path "backend\requirements.txt") {
    pip install -r backend\requirements.txt
}

Write-Host "`n[3/3] Setting up Frontend Next.js app..." -ForegroundColor Yellow
Set-Location frontend
npm install
Set-Location ..

Write-Host "`n==============================================" -ForegroundColor Green
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green
Write-Host "To run the backend:"
Write-Host "  .\venv\Scripts\Activate.ps1"
Write-Host "  cd backend"
Write-Host "  uvicorn main:app --reload"
Write-Host ""
Write-Host "To run the frontend:"
Write-Host "  cd frontend"
Write-Host "  npm run dev"
Write-Host "==============================================" -ForegroundColor Green
