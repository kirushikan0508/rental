"""
ML Routes — Pricing
====================
Endpoints for dynamic pricing recommendations.
"""

from fastapi import APIRouter

router = APIRouter()


@router.post("/predict")
async def predict_price():
    """Predict optimal pricing for a vehicle based on demand, location, and season."""
    # TODO: Load trained model and predict
    return {"predicted_daily_rate": 0, "confidence": 0}


@router.post("/surge")
async def surge_pricing():
    """Calculate surge multiplier based on current demand."""
    return {"surge_multiplier": 1.0, "reason": "normal_demand"}
