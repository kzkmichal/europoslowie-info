#!/bin/bash
# Source this file to load environment variables
# Usage: source setup_env.sh

export DATABASE_URL="postgresql://postgres:dev@localhost:5433/europoslowie"

echo "✓ Environment variables loaded"
echo "DATABASE_URL: $DATABASE_URL"
