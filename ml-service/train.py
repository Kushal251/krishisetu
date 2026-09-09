import argparse
import json
import os
import tempfile
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from xgboost import XGBRegressor

from features import CATEGORICAL_COLUMNS, NUMERICAL_COLUMNS, training_frame


def model_pipeline():
    preprocessor = ColumnTransformer([
        ("categorical", OneHotEncoder(handle_unknown="ignore"), CATEGORICAL_COLUMNS),
        ("numerical", "passthrough", NUMERICAL_COLUMNS),
    ])
    model = XGBRegressor(
        n_estimators=350, max_depth=5, learning_rate=0.04, subsample=0.85,
        colsample_bytree=0.85, objective="reg:squarederror", random_state=42, n_jobs=4,
    )
    return Pipeline([("preprocessor", preprocessor), ("model", model)])


def metrics(actual, predicted):
    return {
        "mae": round(float(mean_absolute_error(actual, predicted)), 4),
        "rmse": round(float(np.sqrt(mean_squared_error(actual, predicted))), 4),
        "r2": round(float(r2_score(actual, predicted)), 4),
    }


def main():
    parser = argparse.ArgumentParser(description="Train KrishiSetu soybean demand and price models.")
    parser.add_argument("--data", required=True, help="Path to the enhanced soybean CSV.")
    parser.add_argument("--output", default=str(Path(__file__).parent / "artifacts" / "forecast_bundle.joblib"))
    args = parser.parse_args()

    data = pd.read_csv(args.data)
    required = {"demand_kg", "mandi_price_per_kg", "supply_kg", "Previous Demand", "Previous Price"}
    missing = sorted(required.difference(data.columns))
    if missing:
        raise ValueError(f"Dataset is missing columns: {', '.join(missing)}")

    features = training_frame(data)
    demand_target = data["demand_kg"] / 100.0
    price_target = data["mandi_price_per_kg"] * 100.0
    if "event_date" in data.columns:
        order = pd.to_datetime(data["event_date"], errors="raise", utc=True).sort_values(kind="stable").index
    else:
        period_order = {9: 0, 10: 1, 11: 2, 12: 3, 1: 4, 2: 5}
        order = data["month"].map(period_order).fillna(6).sort_values(kind="stable").index
    split = int(len(order) * 0.8)
    if split < 10 or len(order) - split < 2:
        raise ValueError("At least 12 chronological rows are required for a safe train/test split.")
    train_index, test_index = order[:split], order[split:]

    if "real_ratio" in data.columns:
        sample_weights = 0.35 + 2.65 * pd.to_numeric(data["real_ratio"], errors="coerce").fillna(0).clip(0, 1)
    else:
        sample_weights = pd.Series(1.0, index=data.index)

    demand_pipeline, price_pipeline = model_pipeline(), model_pipeline()
    demand_pipeline.fit(features.loc[train_index], demand_target.loc[train_index], model__sample_weight=sample_weights.loc[train_index])
    price_pipeline.fit(features.loc[train_index], price_target.loc[train_index], model__sample_weight=sample_weights.loc[train_index])
    report = {
        "demand": metrics(demand_target.loc[test_index], demand_pipeline.predict(features.loc[test_index])),
        "price": metrics(price_target.loc[test_index], price_pipeline.predict(features.loc[test_index])),
    }

    demand_pipeline.fit(features, demand_target, model__sample_weight=sample_weights)
    price_pipeline.fit(features, price_target, model__sample_weight=sample_weights)
    version = datetime.now(timezone.utc).strftime("soybean-mp-%Y%m%d%H%M%S")
    bundle = {
        "version": version,
        "trainedAt": datetime.now(timezone.utc).isoformat(),
        "crop": "SOYBEAN",
        "units": {"demand": "quintal", "price": "INR/quintal"},
        "features": list(features.columns),
        "metrics": report,
        "trainingRows": len(data),
        "realWeightedRows": round(float(sample_weights.sum()), 2),
        "dataOrigins": ({str(key): int(value) for key, value in data["data_origin"].value_counts().items()}
                        if "data_origin" in data.columns else {"UNSPECIFIED": len(data)}),
        "demandPipeline": demand_pipeline,
        "pricePipeline": price_pipeline,
    }
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(delete=False, dir=output.parent, suffix=".joblib") as temporary:
        temporary_path = Path(temporary.name)
    try:
        joblib.dump(bundle, temporary_path)
        os.replace(temporary_path, output)
    finally:
        temporary_path.unlink(missing_ok=True)
    output.with_suffix(".json").write_text(
        json.dumps({key: value for key, value in bundle.items() if not key.endswith("Pipeline")}, indent=2),
        encoding="utf-8",
    )
    print(json.dumps({"artifact": str(output), "version": version, "metrics": report}, indent=2))


if __name__ == "__main__":
    main()
