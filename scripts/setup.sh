#!/bin/bash

# StakeDrop Setup Script
# This script sets up the development environment

set -e

echo "======================================"
echo "StakeDrop - Development Setup"
echo "======================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js
echo -e "\n${YELLOW}Checking Node.js...${NC}"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓ Node.js $NODE_VERSION installed${NC}"
else
    echo -e "${RED}✗ Node.js not found. Please install Node.js 20+${NC}"
    exit 1
fi

# Check npm
echo -e "\n${YELLOW}Checking npm...${NC}"
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✓ npm $NPM_VERSION installed${NC}"
else
    echo -e "${RED}✗ npm not found${NC}"
    exit 1
fi

# Install Aiken if not present
echo -e "\n${YELLOW}Checking Aiken...${NC}"
if command -v aiken &> /dev/null; then
    AIKEN_VERSION=$(aiken --version)
    echo -e "${GREEN}✓ Aiken $AIKEN_VERSION installed${NC}"
else
    echo -e "${YELLOW}Installing Aiken...${NC}"
    if command -v cargo &> /dev/null; then
        cargo install aiken --version 1.1.5
        echo -e "${GREEN}✓ Aiken installed${NC}"
    else
        echo -e "${RED}Cargo not found. Install Rust first: https://rustup.rs${NC}"
        echo -e "${YELLOW}Or install Aiken manually: https://aiken-lang.org/installation${NC}"
    fi
fi

# Install root dependencies
echo -e "\n${YELLOW}Installing root dependencies...${NC}"
npm install
echo -e "${GREEN}✓ Root dependencies installed${NC}"

# Install frontend dependencies
echo -e "\n${YELLOW}Installing frontend dependencies...${NC}"
cd frontend
npm install
cd ..
echo -e "${GREEN}✓ Frontend dependencies installed${NC}"

# Install bridge dependencies
echo -e "\n${YELLOW}Installing bridge dependencies...${NC}"
cd bridge
npm install
cd ..
echo -e "${GREEN}✓ Bridge dependencies installed${NC}"

# Install midnight dependencies
echo -e "\n${YELLOW}Installing midnight dependencies...${NC}"
cd midnight
npm install
cd ..
echo -e "${GREEN}✓ Midnight dependencies installed${NC}"

# Build Aiken contracts if aiken is available
echo -e "\n${YELLOW}Building Aiken contracts...${NC}"
if command -v aiken &> /dev/null; then
    cd contracts/cardano
    aiken build
    cd ../..
    echo -e "${GREEN}✓ Aiken contracts built${NC}"
else
    echo -e "${YELLOW}⚠ Skipping Aiken build (aiken not installed)${NC}"
fi

# Setup environment files
echo -e "\n${YELLOW}Setting up environment files...${NC}"
if [ ! -f "bridge/.env" ]; then
    cp bridge/.env.example bridge/.env
    echo -e "${YELLOW}⚠ Created bridge/.env - please update with your keys${NC}"
fi

if [ ! -f "frontend/.env.local" ]; then
    cp frontend/.env.example frontend/.env.local
    echo -e "${YELLOW}⚠ Created frontend/.env.local - please update with your keys${NC}"
fi

echo -e "\n======================================"
echo -e "${GREEN}Setup Complete!${NC}"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Update bridge/.env with your Blockfrost API key and mnemonic"
echo "2. Update frontend/.env.local with your Blockfrost API key"
echo "3. Run 'npm run dev' in frontend/ to start the app"
echo ""
echo "To get testnet ADA:"
echo "  https://faucet.preview.world.dev.cardano.org/"
echo ""
