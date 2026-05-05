#!/bin/bash
# NYC Insider List — Weekly Cron Runner
# Schedule: Every Sunday at 11 PM ET
# Windows: schtasks /create /tn "NYC Weekly Cron" /tr "bash C:\Users\ryant\nyc-insider-list\run_weekly_cron.sh" /sc weekly /d SUN /st 23:00

cd "$(dirname "$0")"

# Load env vars
if [ -f .env.local ]; then
    export $(grep -v '^#' .env.local | xargs)
fi

# Ensure data dir exists
mkdir -p data

echo "$(date): Weekly cron starting" >> data/weekly_cron.log

# Run the cron
python scrapers/weekly_cron.py >> data/weekly_cron.log 2>&1

echo "$(date): Weekly cron completed (exit code: $?)" >> data/weekly_cron.log
