#!/bin/bash
set -e

echo "=== Starting ClamAV initialization ==="
echo "Container PID: $$"
echo "User: $(whoami)"

# Ensure directories exist with proper permissions
mkdir -p /var/run/clamav /var/log/clamav /var/lib/clamav
chown -R clamav:clamav /var/run/clamav /var/log/clamav /var/lib/clamav

# Clean up any stale socket files
rm -f /var/run/clamav/clamd.ctl
echo "Cleaned up stale socket files"

# Check if virus database exists
if [ ! -f /var/lib/clamav/daily.cvd ] && [ ! -f /var/lib/clamav/daily.cld ]; then
    echo "Updating virus database..."
    freshclam || echo "Warning: Could not update virus database"
else
    echo "Virus database found"
fi

# List database files for debugging
echo "Database files:"
ls -la /var/lib/clamav/

# Test configuration
echo "Testing ClamAV configuration..."
clamd -c /etc/clamav/clamd.conf --config-check || {
    echo "Configuration check failed. Continuing anyway..."
}

# Start ClamAV daemon with monitoring
echo "Starting ClamAV daemon..."
echo "Command: clamd -c /etc/clamav/clamd.conf"

# Function to monitor daemon
monitor_daemon() {
    while true; do
        if ! pgrep clamd > /dev/null; then
            echo "ClamAV daemon died. Restarting..."
            clamd -c /etc/clamav/clamd.conf &
        fi
        sleep 10
    done
}

# Start daemon and monitor
clamd -c /etc/clamav/clamd.conf &
DAEMON_PID=$!
echo "ClamAV daemon started with PID: $DAEMON_PID"

# Wait for daemon to start
sleep 5

# Check if daemon is running
if pgrep clamd > /dev/null; then
    echo "ClamAV daemon is running successfully"
    echo "Starting monitor..."
    monitor_daemon
else
    echo "Failed to start ClamAV daemon"
    echo "Keeping container alive for debugging..."
    tail -f /dev/null
fi
