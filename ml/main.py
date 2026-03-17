"""
Vehicle Rental Marketplace — ML Service
========================================
FastAPI-based service providing:
- Dynamic pricing recommendations
- Fraud detection scoring
- Vehicle demand forecasting
- Image quality analysis for vehicle listings
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI(
    title="Rental ML Service",
    description="AI/ML microservice for the vehicle rental marketplace",
    version="1.0.0",
)

# ─── CORS ────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Health Check ────────────────────────────────────────────
@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "ml-service"}


# ─── Route Imports ───────────────────────────────────────────
# from routes.pricing import router as pricing_router
# from routes.fraud import router as fraud_router
# from routes.forecast import router as forecast_router

# app.include_router(pricing_router, prefix="/api/ml/pricing", tags=["Pricing"])
# app.include_router(fraud_router, prefix="/api/ml/fraud", tags=["Fraud"])
# app.include_router(forecast_router, prefix="/api/ml/forecast", tags=["Forecast"])


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
