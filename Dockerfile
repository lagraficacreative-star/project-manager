FROM node:18-slim

# 1. Install Python3 (required for fetch_mails.py)
RUN apt-get update && apt-get install -y python3 python3-pip && rm -rf /var/lib/apt/lists/*

# 2. Set working directory
WORKDIR /app

# 3. Copy Project Files
COPY . .

# 4. Install & Build Client (Frontend)
WORKDIR /app/client
RUN NODE_OPTIONS="--max-old-space-size=400" npm install
RUN NODE_OPTIONS="--max-old-space-size=400" npm run build

# 5. Install Server Dependencies
WORKDIR /app/server
RUN NODE_OPTIONS="--max-old-space-size=400" npm install

# 6. Expose Port (will be overridden by hosting, but good for doc)
EXPOSE 3000

# 7. Start the Server
CMD ["node", "server.js"]
