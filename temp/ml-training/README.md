# KrishiSetu MVP ML simulation data

This directory is created and maintained by `scripts/mvp-ml-data.mjs`.

- `scenario.json` contains deterministic synthetic entities, three historical years, and a three-year future event queue.
- `state.json` stores the hourly simulation clock and future queue position.
- `training/krishisetu_training.csv` is rebuilt from records that have already been released into the KrishiSetu database.
- Future events remain outside the database until the hourly worker reaches their scheduled time.
- IDs beginning with `sim_` and sources beginning with `SYNTHETIC_` are simulation data, not observed real-world facts.

Never show synthetic future outcomes to users as actual market data. Genuine KrishiSetu transactions receive a higher training weight than synthetic MVP rows.
