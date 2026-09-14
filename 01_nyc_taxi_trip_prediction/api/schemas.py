"""Pydantic request and response schemas for NYC Taxi Prediction API (CRISP-DM Phase 6)."""

from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


class LatLonPoint(BaseModel):
    lat: float
    lon: float
    name: Optional[str] = None


class TripEstimateRequest(BaseModel):
    pickup_latitude: float = Field(..., ge=40.40, le=41.10, description="Pickup latitude in NYC")
    pickup_longitude: float = Field(..., ge=-74.35, le=-73.60, description="Pickup longitude in NYC")
    dropoff_latitude: float = Field(..., ge=40.40, le=41.10, description="Dropoff latitude in NYC")
    dropoff_longitude: float = Field(..., ge=-74.35, le=-73.60, description="Dropoff longitude in NYC")
    pickup_datetime: Optional[str] = Field(None, description="ISO format or YYYY-MM-DD HH:MM:SS string")
    passenger_count: int = Field(1, ge=1, le=6, description="Number of passengers (1-6)")


class BaselineEstimate(BaseModel):
    fare_amount: float
    trip_duration_minutes: float
    trip_duration_seconds: float


class FareBreakdown(BaseModel):
    base_charge: float
    distance_fare: float
    surcharges: float
    estimated_total: float
    suggested_tip_15: float
    suggested_tip_20: float


class TripEstimateResponse(BaseModel):
    status: str
    fare_amount: float
    trip_duration_minutes: float
    trip_duration_seconds: float
    distance_miles: float
    distance_km: float
    average_speed_mph: float
    traffic_congestion_level: str
    is_rush_hour: bool
    is_overnight: bool
    is_weekend: bool
    fare_breakdown: FareBreakdown
    baseline: BaselineEstimate
    timestamp: str


class RoutePreset(BaseModel):
    id: str
    name: str
    pickup: LatLonPoint
    dropoff: LatLonPoint


class ModelInfoResponse(BaseModel):
    model_name: str
    framework: str
    dataset: str
    crisp_dm_status: str
    metrics: Dict[str, Any]
