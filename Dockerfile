# Stage 1: build React frontend
FROM node:20-alpine AS frontend-build
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Python API + static SPA
FROM python:3.12-slim AS runtime
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    MODEL_PATH=/app/heat_stroke_final_model.joblib \
    METADATA_PATH=/app/heat_stroke_final_model_metadata.json \
    STATIC_DIR=/app/backend/static \
    DATABASE_PATH=/app/data/predictions.db

COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt \
    && mkdir -p /app/data

COPY backend/ /app/backend/
COPY heat_stroke_final_model.joblib /app/heat_stroke_final_model.joblib
COPY heat_stroke_final_model_metadata.json /app/heat_stroke_final_model_metadata.json
COPY --from=frontend-build /frontend/dist /app/backend/static

EXPOSE 8000

WORKDIR /app/backend
CMD ["gunicorn", "-b", "0.0.0.0:8000", "-w", "1", "--timeout", "120", "main:app"]
