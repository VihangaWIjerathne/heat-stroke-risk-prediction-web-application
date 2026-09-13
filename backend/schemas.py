"""Request/response models and range validation for the heat stroke API."""

from typing import Literal

from pydantic import BaseModel, Field, field_validator


class PredictRequest(BaseModel):
    """Human-friendly input from the React form."""

    diastolic_bp: float = Field(..., ge=40, le=130, description="Diastolic BP in mmHg")
    heat_index_c: float = Field(..., ge=0, le=100, description="Heat Index in °C")
    environmental_temperature: float = Field(
        ..., ge=0, le=60, description="Environmental temperature in °C"
    )
    age: float = Field(..., ge=12, le=80, description="Age in years")
    nationality: Literal["yes", "no"] = Field(..., description="Nationality yes/no")
    relative_humidity: float = Field(..., ge=0, le=100, description="Relative humidity %")
    hot_dry_skin: Literal["yes", "no"]
    sweating: Literal["yes", "no"]
    date: str = Field(..., description="ISO date YYYY-MM-DD for time of year")
    cardiovascular_disease_history: Literal["yes", "no"]
    bmi: float = Field(..., ge=15, le=45, description="BMI")
    daily_ingested_water_l: float = Field(
        ..., ge=0, le=15, description="Daily ingested water in litres"
    )
    heart_pulse_rate: float = Field(..., ge=40, le=220, description="Heart/pulse rate bpm")
    sex: Literal["male", "female"]
    time_of_day: str = Field(..., description="HH:MM between 09:00 and 17:00")

    @field_validator("date")
    @classmethod
    def validate_date(cls, v: str) -> str:
        parts = v.split("-")
        if len(parts) != 3:
            raise ValueError("date must be YYYY-MM-DD")
        year, month, day = int(parts[0]), int(parts[1]), int(parts[2])
        if not (1 <= month <= 12):
            raise ValueError("month must be 1–12")
        if not (1 <= day <= 31):
            raise ValueError("day must be 1–31")
        return v

    @field_validator("time_of_day")
    @classmethod
    def validate_time(cls, v: str) -> str:
        parts = v.split(":")
        if len(parts) != 2:
            raise ValueError("time_of_day must be HH:MM")
        hour, minute = int(parts[0]), int(parts[1])
        if not (0 <= minute <= 59):
            raise ValueError("minutes must be 0–59")
        decimal = hour + minute / 60.0
        if decimal < 9.0 or decimal > 17.0:
            raise ValueError("time_of_day must be between 09:00 and 17:00")
        return v


class PredictResponse(BaseModel):
    id: int | None = None
    risk_score: float
    risk_percentage: str
    risk_level: Literal["Low", "Moderate", "High"]
    prediction: int
    message: str


class HistoryItem(BaseModel):
    id: int
    created_at: str
    inputs: PredictRequest
    risk_score: float
    risk_percentage: str
    risk_level: Literal["Low", "Moderate", "High"]
    prediction: int
    message: str


class HistoryResponse(BaseModel):
    items: list[HistoryItem]
    count: int


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    model_name: str | None = None


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    token: str
    username: str
