#!/bin/bash

# Enhanced RAG System - Lint All Script
# Lints backend with Biome

set -e

echo "🔍 Starting code linting..."
echo ""

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Lint backend with Biome
echo "📦 Backend - Linting with Biome..."
cd "$PROJECT_DIR"
bun run lint
echo "✅ Backend linting complete"
echo ""

echo "🎉 All linting complete!"