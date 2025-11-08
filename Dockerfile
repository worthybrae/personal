FROM python:3.11-slim

# Install Node.js
RUN apt-get update && apt-get install -y \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy backend requirements and install Python dependencies
COPY backend/requirements.txt /app/backend/
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy package.json and install Node dependencies
COPY package*.json ./
RUN npm install

# Copy all application code
COPY . .

# Expose ports
EXPOSE 5173 8000

# Copy startup script
COPY start.sh /start.sh
RUN chmod +x /start.sh

# Railway uses PORT env var, so we'll expose that too
ENV PORT=5173

CMD ["/start.sh"]
