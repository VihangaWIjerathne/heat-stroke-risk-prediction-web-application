"""Flask app: heat stroke risk prediction + React static hosting."""

from __future__ import annotations

import json
import logging
import os
from functools import wraps
from pathlib import Path

import joblib
import numpy as np
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from pydantic import ValidationError

import database
from model_compat import register_notebook_classes
from schemas import LoginRequest, PredictRequest
from transforms import risk_from_proba, transform_request

logger = logging.getLogger("heat_stroke")
logging.basicConfig(level=logging.INFO)

# Hardcoded single admin account (demo)
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin123"
ADMIN_TOKEN = "heat-stroke-admin-token"

APP_DIR = Path(__file__).resolve().parent
REPO_ROOT = APP_DIR.parent
MODEL_PATH = Path(os.environ.get("MODEL_PATH", str(REPO_ROOT / "heat_stroke_final_model.joblib")))
METADATA_PATH = Path(
    os.environ.get("METADATA_PATH", str(REPO_ROOT / "heat_stroke_final_model_metadata.json"))
)
STATIC_DIR = Path(os.environ.get("STATIC_DIR", str(APP_DIR / "static")))
DATABASE_PATH = Path(os.environ.get("DATABASE_PATH", str(APP_DIR / "data" / "predictions.db")))

state: dict = {
    "model": None,
    "metadata": None,
}


def create_app() -> Flask:
    app = Flask(__name__)
    CORS(app)

    _load_model_and_db()

    @app.get("/api/health")
    def health():
        loaded = state["model"] is not None
        name = None
        if state["metadata"]:
            meta = state["metadata"]
            name = meta.get("model_name") or (
                ",".join(meta["member_models"]) if meta.get("member_models") else None
            )
        return jsonify(
            {
                "status": "ok" if loaded else "degraded",
                "model_loaded": loaded,
                "model_name": name,
            }
        )

    @app.post("/api/login")
    def login():
        try:
            body = LoginRequest.model_validate(request.get_json(silent=True) or {})
        except ValidationError as exc:
            return jsonify({"detail": _validation_detail(exc)}), 422

        if body.username != ADMIN_USERNAME or body.password != ADMIN_PASSWORD:
            return jsonify({"detail": "Invalid username or password"}), 401
        return jsonify({"token": ADMIN_TOKEN, "username": ADMIN_USERNAME})

    @app.post("/api/predict")
    @require_admin
    def predict():
        model = state["model"]
        if model is None:
            return jsonify({"detail": "Model not loaded"}), 503

        try:
            body = PredictRequest.model_validate(request.get_json(silent=True) or {})
        except ValidationError as exc:
            return jsonify({"detail": _validation_detail(exc)}), 422

        X = transform_request(body)
        try:
            proba_arr = model.predict_proba(X)
            if proba_arr.shape[1] >= 2:
                risk_score = float(proba_arr[0, 1])
            else:
                risk_score = float(proba_arr[0, 0])
        except Exception as exc:
            logger.exception("Prediction failed")
            return jsonify({"detail": f"Prediction failed: {exc}"}), 500

        risk_score = float(np.clip(risk_score, 0.0, 1.0))
        level, message, prediction = risk_from_proba(risk_score)
        pct = int(round(risk_score * 100))
        risk_percentage = f"{pct}%"
        rounded_score = round(risk_score, 4)

        record_id = database.save_prediction(
            body.model_dump(),
            risk_score=rounded_score,
            risk_percentage=risk_percentage,
            risk_level=level,
            prediction=prediction,
            message=message,
        )

        return jsonify(
            {
                "id": record_id,
                "risk_score": rounded_score,
                "risk_percentage": risk_percentage,
                "risk_level": level,
                "prediction": prediction,
                "message": message,
            }
        )

    @app.get("/api/history")
    @require_admin
    def history():
        try:
            limit = int(request.args.get("limit", 50))
        except ValueError:
            limit = 50
        limit = max(1, min(limit, 200))
        items = database.list_predictions(limit=limit)
        return jsonify({"items": items, "count": len(items)})

    # SPA fallback — serve built React app for non-API routes
    if STATIC_DIR.is_dir() and (STATIC_DIR / "index.html").exists():

        @app.get("/", defaults={"path": ""})
        @app.get("/<path:path>")
        def spa(path: str):
            if path.startswith("api/"):
                return jsonify({"detail": "Not found"}), 404
            candidate = STATIC_DIR / path
            if path and candidate.is_file():
                return send_from_directory(STATIC_DIR, path)
            return send_from_directory(STATIC_DIR, "index.html")

    return app


def require_admin(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer ") or auth.removeprefix("Bearer ").strip() != ADMIN_TOKEN:
            return jsonify({"detail": "Unauthorized — please log in"}), 401
        return view(*args, **kwargs)

    return wrapped


def _validation_detail(exc: ValidationError):
    return [{"msg": err["msg"], "loc": err["loc"]} for err in exc.errors()]


def _load_model_and_db() -> None:
    if not MODEL_PATH.exists():
        raise RuntimeError(f"Model file not found: {MODEL_PATH}")
    if not METADATA_PATH.exists():
        raise RuntimeError(f"Metadata file not found: {METADATA_PATH}")

    logger.info("Loading model from %s", MODEL_PATH)
    register_notebook_classes()
    state["model"] = joblib.load(MODEL_PATH)
    with METADATA_PATH.open(encoding="utf-8") as f:
        state["metadata"] = json.load(f)
    meta = state["metadata"]
    model_label = (
        meta.get("model_name")
        or (meta.get("member_models") or ["model"])[0]
        or meta.get("selected_family")
    )
    n_features = len(meta.get("feature_order") or meta.get("feature_pool") or [])
    logger.info("Model loaded: %s (%s features in pool)", model_label, n_features)
    database.configure(DATABASE_PATH)
    logger.info("SQLite database ready at %s", DATABASE_PATH)


app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", "8000")), debug=False)
