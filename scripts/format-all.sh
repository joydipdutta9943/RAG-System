#!/bin/bash

# Enhanced RAG System - Format All Script
# Formats backend with Biome

set -e

echo "🎨 Starting code formatting..."
echo ""

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Format backend with Biome
echo "📦 Backend - Formatting with Biome..."
cd "$PROJECT_DIR"
bun run format
echo "✅ Backend formatted successfully"
echo ""

echo "🎉 All formatting complete!"