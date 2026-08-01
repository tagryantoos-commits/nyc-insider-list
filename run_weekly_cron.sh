#!/bin/bash
# NYC Insider List — Weekly Cron Runner
# Schedule: Every Sunday at 11 PM ET via Windows Task Scheduler ("NYC Weekly Cron")
# The task MUST invoke this script by ABSOLUTE path:
#   "C:\Program Files\Git\bin\bash.exe" -c "/c/Users/ryant/nyc-insider-list/run_weekly_cron.sh"
# (Relative invocation broke silently from May–July 2026: the task had no working
#  directory, bash exited 127 before any logging, and the DB starved. Keep it absolute.)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR" || exit 1

mkdir -p data
LOG="$SCRIPT_DIR/data/weekly_cron.log"

echo "==================================================" >> "$LOG"
echo "$(date): Weekly cron STARTING (pid $$)" >> "$LOG"

# Load env vars
if [ -f .env.local ]; then
    set -a
    # shellcheck disable=SC1091
    source <(grep -v '^#' .env.local | grep '=')
    set +a
fi

python scrapers/weekly_cron.py >> "$LOG" 2>&1
EXIT_CODE=$?

echo "$(date): Weekly cron COMPLETED (exit code: $EXIT_CODE)" >> "$LOG"

# Machine-readable status marker for monitoring
echo "{\"last_run\": \"$(date -Iseconds)\", \"exit_code\": $EXIT_CODE}" > "$SCRIPT_DIR/data/last_cron_status.json"

exit $EXIT_CODE
