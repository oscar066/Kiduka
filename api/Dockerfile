# syntax=docker/dockerfile:1

# ── Stage 1: compile R packages
FROM python:3.11-slim AS r-builder

RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && \
    apt-get install -y --no-install-recommends \
        r-base r-base-dev build-essential gfortran && \
    rm -rf /var/lib/apt/lists/*

RUN Rscript -e 'install.packages("Rquefts", repos = "https://cloud.r-project.org")'

# ── Stage 2: final runtime image
FROM python:3.11-slim

# Install only the R runtime (no compilers / dev headers)
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && \
    apt-get install -y --no-install-recommends \
        r-base ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Copy compiled Rquefts (and its dependencies meteor, Rcpp) from builder
COPY --from=r-builder /usr/local/lib/R/site-library /usr/local/lib/R/site-library

WORKDIR /app

# Install Python dependencies (cached between builds when requirements.txt unchanged)
COPY api/requirements.txt /tmp/requirements.txt
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r /tmp/requirements.txt && \
    pip uninstall -y pinecone-plugin-inference && \
    rm /tmp/requirements.txt

# Copy application code last (most frequently changed layer)
COPY api /app/api
COPY chatbot /app/chatbot

EXPOSE 8000
ENV PORT=8000 \
    PYTHONPATH=/app

CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
