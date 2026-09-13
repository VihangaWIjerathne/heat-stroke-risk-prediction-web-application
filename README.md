# Heat Stroke Risk Predictor

Predict heat stroke risk from physiological and environmental inputs.

**Docker is required.** Anyone with Docker can build and run the app — no need to install Python, Node, or ML libraries on the host.

One container serves the React UI and the Flask API (with the trained model and SQLite history).

## Requirements

- [Docker](https://docs.docker.com/get-docker/) only

## Build and run

```bash
docker build -t heat-stroke-app .
docker run --rm -p 8000:8000 -v heat-stroke-data:/app/data heat-stroke-app
```

Then open **http://localhost:8000**

| | |
|---|---|
| App | http://localhost:8000 |
| Health | http://localhost:8000/api/health |

The `-v heat-stroke-data:/app/data` volume keeps SQLite prediction history across container restarts.

### Rebuild after code or model changes

```bash
docker build -t heat-stroke-app .
docker run --rm -p 8000:8000 -v heat-stroke-data:/app/data heat-stroke-app
```

## Admin login

Hardcoded in the backend (`backend/main.py`):

- **Username:** `admin`
- **Password:** `admin123`

Sign in → use Predict → view History.

## API

`POST /api/predict` — form fields (Heat Index in °C, humidity 0–100, yes/no toggles, etc.). Auth required. Returns:

```json
{
  "id": 1,
  "risk_score": 0.72,
  "risk_percentage": "72%",
  "risk_level": "High",
  "prediction": 1,
  "message": "Do not deploy worker"
}
```

`GET /api/history` — saved predictions (auth required), newest first.

`POST /api/login` — `{"username":"admin","password":"admin123"}`

Risk bands: 0–30% Low · 30–60% Moderate · 60–100% High

Data path inside the container: `/app/data/predictions.db`
