# Use the official Node.js 20 image
FROM node:20

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json (if exists)
COPY package*.json ./

# Install dependencies with legacy peer deps
RUN npm install --legacy-peer-deps

# Copy the rest of the application code
COPY . .

# Build TypeScript project
RUN npm run build

# Expose the port your app runs on (change if needed)
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
