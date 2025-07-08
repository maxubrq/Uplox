# Use Alpine Linux for smaller, more secure container
FROM alpine:3.22

# Install ClamAV and dependencies
RUN apk add --no-cache \
    clamav \
    clamav-daemon \
    freshclam \
    wget \
    curl \
    bash \
    netcat-openbsd \
    && mkdir -p /var/run/clamav \
    && mkdir -p /var/log/clamav \
    && mkdir -p /var/lib/clamav

# Copy ClamAV configuration
COPY apps/scanner/config/clamav_conf.conf /etc/clamav/clamd.conf

# Copy sample file
COPY apps/scanner/sample/sample.txt /var/lib/clamav/sample.txt

# Set proper permissions for ClamAV
# Note: clamd.ctl will be created as a socket by the daemon itself
RUN chown -R clamav:clamav /var/run/clamav \
    && chown -R clamav:clamav /var/log/clamav \
    && chown -R clamav:clamav /var/lib/clamav \
    && chown -R clamav:clamav /etc/clamav \
    && chmod 755 /var/run/clamav

# Update ClamAV virus definitions
RUN freshclam || true

# Check if database is updated and download if not
RUN if [ ! -f /var/lib/clamav/daily.cvd ]; then \
        freshclam; \
    fi || true

# Copy startup script
COPY apps/scanner/scripts/scanner-monitor.sh /usr/local/bin/start-clamav.sh
RUN chmod +x /usr/local/bin/start-clamav.sh

# Expose ClamAV daemon port
EXPOSE 3310

# Add health check to ensure daemon is running
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD nc -z localhost 3310 || exit 1

# Start ClamAV daemon using the startup script
CMD ["/usr/local/bin/start-clamav.sh"]
