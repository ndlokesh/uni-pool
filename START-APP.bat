@echo off
TITLE Uni-Pool Launcher
echo ========================================================
echo           STARTING UNI-POOL RIDE SHARING APP
echo ========================================================
echo.

echo 1. Starting Backend Server...
cd backend
start "Uni-Pool Backend API" cmd /k "npm run dev"

echo 2. Starting Frontend Application...
cd ../frontend
start "Uni-Pool Frontend App" cmd /k "npm start"

echo.
echo ========================================================
echo               SUCCESSFULLY LAUNCHED!
echo ========================================================
echo.
echo Both servers are now running in separate windows.
echo Please wait approx 10-15 seconds for them to load.
echo.
echo Opening App in your default browser...
timeout /t 10
start http://localhost:3000

echo.
echo MINIMIZE the other windows, but DO NOT CLOSE them.
echo If you close them, the app will stop working.
echo.
pause
