# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set working directory to root
WORKDIR /

# Copy the requirements file
COPY requirements.txt /tmp/requirements.txt

# Install dependencies
RUN pip install --no-cache-dir -r /tmp/requirements.txt && rm /tmp/requirements.txt

# Copy application code to /api directory (matches import structure)
COPY . /api

# Set working directory to /api for uvicorn
WORKDIR /api

# Expose port 8000
EXPOSE 8000

# Define environment variable
ENV PORT=8000

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
