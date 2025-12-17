#!/bin/bash
# Run MEPs scraper test

# Set working directory to script location
cd "$(dirname "$0")"

# Load environment variables
source setup_env.sh

# Run test as module
python -m scripts.test_meps_scraper
