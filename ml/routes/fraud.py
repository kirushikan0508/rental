"""
ML Routes — Fraud Detection
=============================
Endpoints for fraud risk scoring and flag detection.
"""

from fastapi import APIRouter

router = APIRouter()


@router.post("/score")
async def fraud_score():
    """Calculate fraud risk score (0-100) for a user or booking."""
    return {"risk_score": 0, "flags": []}


@router.post("/analyze-booking")
async def analyze_booking():
    """Analyze a booking pattern for potential fraud indicators."""
    return {"is_suspicious": False, "indicators": []}
