# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set working directory to /app
WORKDIR /app

# Copy the requirements file from the api folder
COPY api/requirements.txt /tmp/requirements.txt

# Install dependencies
RUN pip install --no-cache-dir -r /tmp/requirements.txt && \
    pip uninstall -y pinecone-plugin-inference && \
    rm /tmp/requirements.txt

# Copy both api and chatbot directories
COPY api /app/api
COPY chatbot /app/chatbot

# Expose port 8000
EXPOSE 8000

# Define environment variable
ENV PORT=8000
ENV PYTHONPATH=/app

# Run the application using the module path
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
