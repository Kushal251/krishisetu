import os
from pathlib import Path
from threading import Lock

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from features import request_frame


class ForecastRecord(BaseModel):
    centerId: str
    crop: str = "Soybean"
    district: str
    month: int = Field(ge=1, le=12)
    season: str
    weather: str
    rainfallMm: float = Field(ge=0)
    temperatureC: float
    qualityGrade: str = "B"
    currentSupplyQuintal: float = Field(ge=0)
    incomingSupplyQuintal: float = Field(ge=0)
    recentDemandQuintal: float = Field(ge=0)
    previousPricePerQuintal: float = Field(gt=0)
    stockQuintal: float = Field(ge=0)


class BatchRequest(BaseModel):
    records: list[ForecastRecord]


ARTIFACT_PATH = Path(os.environ.get("ML_ARTIFACT_PATH", Path(__file__).parent / "artifacts" / "forecast_bundle.joblib"))
bundle, load_error, loaded_mtime = None, None, None
bundle_lock = Lock()


def current_bundle():
    global bundle, load_error, loaded_mtime
    try:
        artifact_mtime = ARTIFACT_PATH.stat().st_mtime
        if bundle is None or artifact_mtime != loaded_mtime:
            with bundle_lock:
                artifact_mtime = ARTIFACT_PATH.stat().st_mtime
                if bundle is None or artifact_mtime != loaded_mtime:
                    bundle = joblib.load(ARTIFACT_PATH)
                    loaded_mtime = artifact_mtime
                    load_error = None
    except Exception as error:
        load_error = str(error)
    return bundle

app = FastAPI(title="KrishiSetu Market Forecast Service", version="1.0.0")


@app.get("/health")
def health():
    active_bundle = current_bundle()
    return {
        "status": "ready" if active_bundle else "not_ready",
        "modelVersion": active_bundle.get("version") if active_bundle else None,
        "artifact": str(ARTIFACT_PATH),
        "error": load_error,
    }


@app.post("/predict/batch")
def predict_batch(payload: BatchRequest):
    active_bundle = current_bundle()
    if not active_bundle:
        raise HTTPException(status_code=503, detail=load_error or "Model is not loaded")
    if not payload.records:
        return {"mode": "xgboost", "modelVersion": active_bundle["version"], "predictions": []}
    unsupported = sorted({item.crop.upper() for item in payload.records if item.crop.upper() != "SOYBEAN"})
    if unsupported:
        raise HTTPException(status_code=422, detail=f"Model supports Soybean only, not {', '.join(unsupported)}")

    frame = request_frame(payload.records, pd)
    demand = active_bundle["demandPipeline"].predict(frame)
    price = active_bundle["pricePipeline"].predict(frame)
    predictions = [{
        "centerId": item.centerId,
        "predictedDemandQuintal": round(max(0.0, float(demand[index])), 2),
        "predictedPricePerQuintal": round(max(0.0, float(price[index])), 2),
    } for index, item in enumerate(payload.records)]
    return {"mode": "xgboost", "modelVersion": active_bundle["version"], "predictions": predictions}
