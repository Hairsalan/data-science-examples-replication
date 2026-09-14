# NYC Taxi Trip & Fare Intelligence

End-to-end machine learning application, built around the Kaggle NYC Taxi challenge dataset, that predicts trip **duration** and **fare** from pickup/dropoff coordinates and trip time. Built following the **CRISP-DM** methodology, served via a **FastAPI** backend, and fronted by an interactive **Leaflet.js** map + estimator dashboard.

## Quick start

```bash
pip install -r requirements.txt
python run.py
```

Then open **http://localhost:8000** in a browser.

- Interactive map + live fare/duration estimator: `http://localhost:8000`
- API docs (Swagger): `http://localhost:8000/docs`
- Health check: `http://localhost:8000/api/health`

If model artifacts under `artifacts/` are missing, `run.py` automatically triggers the training pipeline (`src/train.py`) before starting the server.

## Project layout

```
data/
  raw/                 Kaggle-format raw trip records (auto-downloaded, with synthetic fallback)
  processed/           Cleaned/filtered training data
  eda_plots/           Exploratory data analysis charts + summary JSON
src/
  config.py            Paths, NYC geo-bounds, landmark distances, feature list
  data_ingestion.py     Phase 2: acquire Kaggle dataset (network fetch + synthetic fallback)
  data_cleaning.py      Phase 3: filter invalid coordinates/fares/outliers
  feature_engineering.py Phase 3: Haversine/Manhattan distance, bearing, time & landmark features
  eda.py                Phase 2/3: exploratory plots and summary stats
  models/
    baseline.py          Ridge regression baseline
    lightgbm_model.py     LightGBM regressor (log1p target) for duration & fare
    evaluator.py          RMSE/RMSLE/MAE/R2 + tolerance-based business metrics
  train.py              Phase 4/5: trains, evaluates, and saves both models + metrics
api/
  main.py               FastAPI app: endpoints + static file/frontend serving
  schemas.py            Pydantic request/response models
  service.py            Loads trained models and runs inference
frontend/
  index.html            Interactive Leaflet map + trip estimator + CRISP-DM analytics dashboard
  js/map.js             Draggable pickup/dropoff markers, OSRM route tracing
  js/app.js             API calls, live estimate updates, CRISP-DM tab rendering
  css/styles.css        Styling
tests/                  Pytest suite for cleaning, features, model, and API
```

## CRISP-DM phases

1. **Business Understanding** — estimate trip duration/fare accurately enough to reduce fare disputes and support reliable ETAs (target RMSLE < 0.25).
2. **Data Understanding** — ~75k Kaggle NYC taxi trip records; explored via `src/eda.py` (distributions, hourly pickup volume, correlations).
3. **Data Preparation** — `src/data_cleaning.py` filters to NYC bounds and sane fare/passenger ranges; `src/feature_engineering.py` derives 23 features (Haversine/Manhattan distance, bearing, rush-hour/overnight/weekend flags, distances to JFK/LGA/Times Square/Wall Street).
4. **Modeling** — `src/models/lightgbm_model.py` trains LightGBM regressors with log1p-transformed targets for both fare and duration, benchmarked against a Ridge regression baseline (`src/models/baseline.py`).
5. **Evaluation** — `src/models/evaluator.py` computes RMSE, RMSLE, MAE, R², and tolerance accuracy (e.g. % within $5 / 5 minutes); results persisted to `artifacts/metrics.json` and shown live in the frontend's "CRISP-DM & Analytics" tab.
6. **Deployment** — `api/main.py` (FastAPI + Uvicorn) serves predictions and static assets; `frontend/index.html` provides the interactive map-based estimator.

## Using real Kaggle data

By default, `src/data_ingestion.py` streams a sample from a public mirror of the Kaggle NYC Taxi Fare/Trip Duration dataset, falling back to a realistic synthetic generator if the network is unavailable. To use the official dataset directly:

1. Download `train.csv` from the [Kaggle NYC Taxi Fare Prediction](https://www.kaggle.com/c/new-york-city-taxi-fare-prediction) (or Trip Duration) competition.
2. Save it to `data/raw/kaggle_train_sample.csv` in the same column format (`key,fare_amount,pickup_datetime,pickup_longitude,pickup_latitude,dropoff_longitude,dropoff_latitude,passenger_count`).
3. Re-run `python src/train.py` to retrain on the real data.

## Tests

```bash
pytest
```
