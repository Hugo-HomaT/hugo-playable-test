#!/bin/bash
echo "Starting Homa Playables..."

# Navigate to the directory where the script is located
cd "$(dirname "$0")" || exit

# Navigate to the project directory
cd homa-playables || exit

# Load nvm if it exists
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
    \. "$NVM_DIR/nvm.sh"
fi

# Check if npm is installed (after trying to load nvm)
if ! command -v npm &> /dev/null; then
    echo "Error: Node.js (npm) is not installed or not found."
    echo "Attempting to install via nvm..."
    
    if [ -s "$NVM_DIR/nvm.sh" ]; then
        nvm install --lts
    else
        echo "nvm not found. Please install Node.js manually from https://nodejs.org/"
        open "https://nodejs.org/"
        read -p "Press any key to exit..."
        exit 1
    fi
fi

# Check if node_modules exists, install if not
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

echo "Starting development server..."
# Open the default browser to the local server
open "http://localhost:5173"

# Start the vite dev server
npm run dev
