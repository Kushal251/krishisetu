FEATURE_COLUMNS = [
    "crop_name", "district", "month", "Season", "Weather", "quality_grade",
    "current_supply_quintal", "incoming_supply_quintal", "recent_demand_quintal",
    "previous_price_per_quintal", "stock_quintal", "rainfall_mm", "temperature_c",
]

CATEGORICAL_COLUMNS = ["crop_name", "district", "Season", "Weather", "quality_grade"]
NUMERICAL_COLUMNS = [column for column in FEATURE_COLUMNS if column not in CATEGORICAL_COLUMNS]


def training_frame(data):
    frame = data.copy()
    return frame.assign(
        current_supply_quintal=frame["supply_kg"] / 100.0,
        incoming_supply_quintal=frame["quantity_kg"] / 100.0,
        recent_demand_quintal=frame["Previous Demand"] / 100.0,
        previous_price_per_quintal=frame["Previous Price"] * 100.0,
        stock_quintal=frame["Stock"] / 100.0,
        rainfall_mm=frame["rainfall_mm"],
        temperature_c=frame["temperature_c"],
    )[FEATURE_COLUMNS]


def request_frame(records, pandas):
    return pandas.DataFrame([{
        "crop_name": item.crop,
        "district": item.district,
        "month": item.month,
        "Season": item.season,
        "Weather": item.weather,
        "quality_grade": item.qualityGrade,
        "current_supply_quintal": item.currentSupplyQuintal,
        "incoming_supply_quintal": item.incomingSupplyQuintal,
        "recent_demand_quintal": item.recentDemandQuintal,
        "previous_price_per_quintal": item.previousPricePerQuintal,
        "stock_quintal": item.stockQuintal,
        "rainfall_mm": item.rainfallMm,
        "temperature_c": item.temperatureC,
    } for item in records], columns=FEATURE_COLUMNS)
