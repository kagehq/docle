# Cloudflare Sandbox Container
# Supports both Python and Node.js execution

FROM python:3.11-slim

# Install Node.js
RUN apt-get update && apt-get install -y \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Create workspace directory
RUN mkdir -p /workspace
WORKDIR /workspace

# Install common Python packages
RUN pip install --no-cache-dir \
    requests \
    numpy \
    pandas

# Install common npm packages globally
RUN npm install -g \
    axios \
    lodash

# Set up environment
ENV PYTHONUNBUFFERED=1
ENV NODE_ENV=production

# Default command (will be overridden by sandbox)
CMD ["/bin/sh"]

