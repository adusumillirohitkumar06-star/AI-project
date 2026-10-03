@echo off
title AI Airport Operations & Gate Allocation Simulator - Launcher
color 0A
cls

echo ===============================================================================
echo        AI AIRPORT OPERATIONS & GATE ALLOCATION SIMULATOR
echo ===============================================================================
echo.
echo  [*] Starting Backend (FastAPI + Python CSP Engine on port 8000)...
start "AI Airport - Backend (FastAPI)" cmd /k "cd /d ""%~dp0backend"" && .venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

echo  [*] Starting Frontend (Next.js Turbopack on port 3000)...
start "AI Airport - Frontend (Next.js)" cmd /k "cd /d ""%~dp0frontend"" && npm run dev"

echo.
echo  [*] Waiting for servers to initialize...
timeout /t 5 /nobreak >nul

echo  [*] Opening web browser at http://localhost:3000 ...
start http://localhost:3000

cls
color 0B
echo ===============================================================================
echo        AI AIRPORT OPERATIONS & GATE ALLOCATION SIMULATOR - RUNNING
echo ===============================================================================
echo.
echo  Frontend URL:     http://localhost:3000
echo  Backend API:      http://127.0.0.1:8000
echo  API Documentation: http://127.0.0.1:8000/docs
echo.
echo -------------------------------------------------------------------------------
echo  DEMO CREDENTIALS:
echo -------------------------------------------------------------------------------
echo  [ADMIN]    admin@airport.local    /  AdminPass123!     (Full system control)
echo  [OPERATOR] operator@airport.local /  OperatorPass123!  (Simulations & delays)
echo  [VIEWER]   viewer@airport.local   /  ViewerPass123!    (Read-only inspection)
echo.
echo -------------------------------------------------------------------------------
echo  Both the backend and frontend are running in separate terminal windows.
echo  To STOP the system, simply close those terminal windows or press CTRL+C.
echo ===============================================================================
echo.
pause
