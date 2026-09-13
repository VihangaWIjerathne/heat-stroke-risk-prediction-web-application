"""Transform human-friendly form inputs into the model's feature frame."""

import calendar

import pandas as pd

from schemas import PredictRequest

# Must match feature_pool / FINAL_15 from training metadata exactly (names + order).
FEATURE_ORDER = [
    "Diastolic BP",
    "Heat Index (HI)",
    "Environmental temperature (C)",
    "Age",
    "Nationality",
    "Relative Humidity",
    "Hot/dry skin",
    "Sweating",
    "Time of year (month)",
    "Cardiovascular disease history",
    "BMI",
    "Daily Ingested Water (L)",
    "Heart / Pulse rate (b/min)",
    "Sex",
    "Time of day",
]

YES_NO = {"yes": 1, "no": 0}
SEX = {"male": 1, "female": 0}

RISK_MESSAGES = {
    "Low": "Proceed with caution",
    "Moderate": "Additional monitoring",
    "High": "Do not deploy worker",
}


def _celsius_to_fahrenheit(c: float) -> float:
    """Heat Index (HI) in training data is Fahrenheit (~95–110)."""
    return c * 9.0 / 5.0 + 32.0


def _date_to_month_fraction(iso_date: str) -> float:
    """Convert YYYY-MM-DD to month + day/days_in_month (e.g. Apr 10 → 4.33)."""
    year, month, day = (int(p) for p in iso_date.split("-"))
    days_in_month = calendar.monthrange(year, month)[1]
    return month + day / days_in_month


def _time_to_decimal_hour(hhmm: str) -> float:
    """Convert HH:MM to decimal hour (e.g. 9:30 → 9.5)."""
    hour, minute = (int(p) for p in hhmm.split(":"))
    return hour + minute / 60.0


def transform_request(req: PredictRequest) -> pd.DataFrame:
    """Build a 1×15 DataFrame with training column names (pipeline selects top-9)."""
    values = {
        "Diastolic BP": req.diastolic_bp,
        "Heat Index (HI)": _celsius_to_fahrenheit(req.heat_index_c),
        "Environmental temperature (C)": req.environmental_temperature,
        "Age": req.age,
        "Nationality": YES_NO[req.nationality],
        "Relative Humidity": req.relative_humidity / 100.0,
        "Hot/dry skin": YES_NO[req.hot_dry_skin],
        "Sweating": YES_NO[req.sweating],
        "Time of year (month)": _date_to_month_fraction(req.date),
        "Cardiovascular disease history": YES_NO[req.cardiovascular_disease_history],
        "BMI": req.bmi,
        "Daily Ingested Water (L)": req.daily_ingested_water_l,
        "Heart / Pulse rate (b/min)": req.heart_pulse_rate,
        "Sex": SEX[req.sex],
        "Time of day": _time_to_decimal_hour(req.time_of_day),
    }
    return pd.DataFrame([[values[name] for name in FEATURE_ORDER]], columns=FEATURE_ORDER)


def risk_from_proba(proba: float) -> tuple[str, str, int]:
    """
    Map probability to risk_level, message, and binary prediction.
    Bands: 0–30% Low, 30–60% Moderate, 60–100% High.
    """
    pct = proba * 100.0
    if pct < 30:
        level = "Low"
    elif pct < 60:
        level = "Moderate"
    else:
        level = "High"
    prediction = 1 if proba >= 0.5 else 0
    return level, RISK_MESSAGES[level], prediction
