@echo off
echo Starting Homa Playables...
cd homa-playables
if not exist node_modules (
    echo Installing dependencies...
    call npm install
)
echo Starting development server...
start "" "http://localhost:5173"
call npm run dev
pause
