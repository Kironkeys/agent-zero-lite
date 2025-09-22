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

# Create persistent directories structure
RUN mkdir -p /a0/persistent/memory /a0/persistent/logs /a0/persistent/tmp /a0/persistent/outputs

# Create symlinks from standard paths to persistent volume
RUN rm -rf /a0/memory /a0/logs /a0/outputs && \
    ln -sf /a0/persistent/memory /a0/memory && \
    ln -sf /a0/persistent/logs /a0/logs && \
    ln -sf /a0/persistent/outputs /a0/outputs && \
    mkdir -p /a0/tmp

# Set environment variables for Railway
ENV WEB_UI_PORT=80
ENV WEB_UI_HOST=0.0.0.0
ENV USE_FALKORDB=false
ENV NEO4J_DISABLED=true
ENV PYTHONPATH=/a0

# Keep as root user for Railway
# USER agent

# Expose the port Railway will use  
EXPOSE 80

# Use the default entrypoint from base image