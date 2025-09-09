# Use official nginx image
FROM nginx:alpine

# Copy built files to nginx html folder
COPY dist /usr/share/nginx/html

# Expose port 80 to the Fly platform
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
