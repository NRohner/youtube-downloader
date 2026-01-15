#!/bin/bash

# YouTube Audio Extractor - Setup Script
# This script sets up both the backend (Python/FastAPI) and frontend (React/Vite)

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          YouTube Audio Extractor - Setup Script            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to print status messages
print_status() {
    echo -e "${BLUE}[*]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"
echo ""

# Check Python
if command_exists python3; then
    PYTHON_VERSION=$(python3 --version 2>&1 | cut -d' ' -f2)
    print_success "Python 3 found: $PYTHON_VERSION"
else
    print_error "Python 3 is not installed. Please install Python 3.11 or higher."
    exit 1
fi

# Check Node.js
if command_exists node; then
    NODE_VERSION=$(node --version)
    print_success "Node.js found: $NODE_VERSION"
else
    print_error "Node.js is not installed. Please install Node.js 18 or higher."
    exit 1
fi

# Check npm
if command_exists npm; then
    NPM_VERSION=$(npm --version)
    print_success "npm found: $NPM_VERSION"
else
    print_error "npm is not installed. Please install npm."
    exit 1
fi

# Check FFmpeg
if command_exists ffmpeg; then
    FFMPEG_VERSION=$(ffmpeg -version 2>&1 | head -n1 | cut -d' ' -f3)
    print_success "FFmpeg found: $FFMPEG_VERSION"
else
    print_warning "FFmpeg is not installed. Audio conversion will not work without it."
    print_warning "Install FFmpeg:"
    print_warning "  - macOS: brew install ffmpeg"
    print_warning "  - Ubuntu: sudo apt install ffmpeg"
    print_warning "  - Windows: Download from https://ffmpeg.org/download.html"
    echo ""
    read -p "Continue without FFmpeg? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""
echo -e "${YELLOW}Setting up backend...${NC}"
echo ""

# Setup backend
cd "$SCRIPT_DIR/backend"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    print_status "Creating Python virtual environment..."
    python3 -m venv venv
    print_success "Virtual environment created"
else
    print_success "Virtual environment already exists"
fi

# Activate virtual environment and install dependencies
print_status "Installing Python dependencies..."
source venv/bin/activate
pip install --upgrade pip -q
pip install -r requirements.txt -q
print_success "Python dependencies installed"

# Create downloads directory if it doesn't exist
if [ ! -d "downloads" ]; then
    mkdir -p downloads
    print_success "Downloads directory created"
fi

# Deactivate virtual environment
deactivate

echo ""
echo -e "${YELLOW}Setting up frontend...${NC}"
echo ""

# Setup frontend
cd "$SCRIPT_DIR/frontend"

# Install npm dependencies
print_status "Installing npm dependencies..."
npm install --silent
print_success "npm dependencies installed"

# Initialize shadcn/ui
print_status "Initializing shadcn/ui..."
npx --yes shadcn@latest init -d -y
print_success "shadcn/ui initialized"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    Setup Complete!                         ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "To start the application, run:"
echo ""
echo -e "  ${BLUE}./start.sh${NC}"
echo ""
echo -e "Or start each service manually:"
echo ""
echo -e "  ${YELLOW}Backend:${NC}"
echo -e "    cd backend"
echo -e "    source venv/bin/activate"
echo -e "    uvicorn app.main:app --reload"
echo ""
echo -e "  ${YELLOW}Frontend:${NC}"
echo -e "    cd frontend"
echo -e "    npm run dev"
echo ""
echo -e "The application will be available at:"
echo -e "  ${BLUE}Frontend:${NC} http://localhost:5173"
echo -e "  ${BLUE}Backend API:${NC} http://localhost:8000"
echo -e "  ${BLUE}API Docs:${NC} http://localhost:8000/docs"
echo ""
