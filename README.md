# KrishiSetu

KrishiSetu is a Next.js and PostgreSQL marketplace for farmers, buyers and agricultural centers. It includes seasonal crop declarations, soybean procurement, quality grading, center inventory, buyer orders, center-to-center trading and ML-assisted market forecasting.

## Web application

```powershell
npm install
npx prisma migrate deploy
npm run dev
```

Copy `.env.example` to `.env` and configure `DATABASE_URL` and `JWT_SECRET`. The ML service URL defaults to `http://127.0.0.1:8000`.

## ML forecasting service

The first model supports Soybean in Madhya Pradesh and predicts demand in quintal and price in INR/quintal.

```powershell
cd ml-service
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe train.py --data "C:\path\to\soybean_madhya_pradesh_10000_enhanced.csv"
cd ..
npm run ml:start
```

Open `/market-forecast` after signing in. The website sends registered center stock, incoming bookings, recent buyer demand, price history and static district/month weather to the Python service. If the service is unavailable, the page clearly reports a deterministic fallback estimate instead of returning random values.

The recommendation layer also combines verified seasonal farmer declarations, previous-season arrivals and demand, buyer orders, center-to-center trades, route cost and transaction reliability. Buyers see ranked listings, sellers see ranked procurement centers, and center operators see an expected supply-versus-demand decision with a suggested inter-center purchase quantity. Admins can override the static district weather assumptions from `/admin/seasons`.

## Verification

```powershell
npm run lint
npm run build
Invoke-RestMethod http://127.0.0.1:8000/health
```
