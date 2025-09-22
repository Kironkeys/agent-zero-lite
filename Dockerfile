# Railway Dockerfile for Ghost Agent Zero v9.5
FROM agent0ai/agent-zero:v0.9.5

# Switch to root for package installation
USER root

# Install additional packages for Legacy Compass integration
COPY requirements-custom.txt /tmp/requirements-custom.txt
RUN /opt/venv/bin/pip install --no-cache-dir -r /tmp/requirements-custom.txt

# Copy application files
COPY . /a0
WORKDIR /a0

# Create directory structure
RUN mkdir -p /a0/memory /a0/logs /a0/tmp /a0/outputs

# Set environment variables for Railway
ENV WEB_UI_PORT=80
ENV WEB_UI_HOST=0.0.0.0
ENV USE_FALKORDB=true
ENV NEO4J_DISABLED=true
ENV PYTHONPATH=/a0
ENV DISABLE_LOCAL_FALKORDB=true

# Keep as root user for Railway
# USER agent

# Copy entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Expose the port Railway will use  
EXPOSE 80

# Use custom entrypoint for persistent volume handling
ENTRYPOINT ["/entrypoint.sh"]