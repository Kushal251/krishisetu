# KrishiSetu ML service

This service predicts soybean demand and price in KrishiSetu's native units: quintal and INR/quintal.

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe train.py --data "C:\path\to\soybean_madhya_pradesh_10000_enhanced.csv"
.\start.ps1
```

Keep it running on port 8000, then run Next.js. The first model supports Soybean in Madhya Pradesh. Static district/month weather profiles come from the website; live bookings, listings and orders provide demand and supply signals.

## MVP simulation and automatic retraining

The simulation creates 50 accounts for each seller type, 50 accounts for each buyer type, 10 centers, all three seasons for the current year plus three years on each side, and trade/declaration events. Historical events are loaded immediately; future events stay in `temp/ml-training/scenario.json` until the hourly clock releases them.

```powershell
npm run ml:train:once
npm run ml:train:hourly
```

The hourly command must remain running (or be configured as a Windows scheduled/background service). Every completed interval advances the simulation by one hour, inserts due future events, exports only released database records, and atomically replaces the model artifact. The FastAPI service reloads a changed artifact without a restart.

Simulation IDs start with `sim_`. These are synthetic records. The trainer gives genuine KrishiSetu records a higher sample weight and never reads unreleased future events, preventing future-data leakage.
