@echo off
REM Start all services: Frontend + Backend + Connectivity Check
REM This batch file opens three terminals to start everything

echo.
echo ╔════════════════════════════════════════════════════════╗
echo ║        AI Powered School - Complete Setup              ║
echo ║                                                        ║
echo ║ This will start:                                       ║
echo ║  1. Backend (Express on port 5000)                    ║
echo ║  2. Frontend (Vite on port 5175)                      ║
echo ║  3. Connectivity Verification                         ║
echo ╚════════════════════════════════════════════════════════╝
echo.

REM Start Backend
echo Starting Backend Server...
start "School Management Backend" cmd /k "cd backend && npm run dev"

REM Wait a moment for backend to start
timeout /t 3 /nobreak

REM Start Frontend
echo Starting Frontend Server...
start "School Management Frontend" cmd /k "npm run dev"

REM Wait another moment
timeout /t 3 /nobreak

REM Run connectivity check
echo Running Connectivity Check...
start "Connectivity Check" cmd /k "node verify-full-connection.js"

echo.
echo ✓ All services started!
echo.
echo Open your browser to: http://localhost:5173
echo.
echo To stop services, close each terminal window.
echo.

pause
