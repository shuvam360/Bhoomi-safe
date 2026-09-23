# BhoomiSafe API Reference

Base URL: `http://localhost:8000` (API prefix: `/api/v1`)  
Interactive Swagger Docs: `http://localhost:8000/docs`  
ReDoc: `http://localhost:8000/redoc`

---

## 🔒 Authentication & Headers

Certain administrative endpoints require an API key passed in the request header:

| Header | Required For | Config Variable | Default Development Key |
| :--- | :--- | :--- | :--- |
| `X-API-Key` | `POST /alerts`<br>`PATCH /alerts/{id}/deactivate`<br>`PATCH /reports/{id}/verify` | `BHOOMI_API_KEY` in `.env` | `bhoomi-admin-key-2026` |

*Unauthenticated citizen submissions (`POST /reports`) and public prediction queries require no credentials.*

---

## 🚦 Rate Limiting

- `POST /api/v1/reports` is rate-limited via `slowapi` to **5 requests per minute per IP address**.
- Exceeding the threshold returns HTTP `429 Too Many Requests` with a descriptive JSON payload and `Retry-After: 60` response header.

---

## 1. System & Health Endpoints

### `GET /`
Returns service identification and runtime status.
- **Auth**: None
- **Response (200 OK)**:
```json
{
  "project": "BhoomiSafe",
  "description": "AI-Based Landslide Early Warning System for NER",
  "version": "1.0.0",
  "docs": "/docs",
  "status": "running"
}
```

### `GET /health` & `GET /api/v1/health`
Health probe reporting backend health and ML model operational status.
- **Auth**: None
- **Response (200 OK)**:
```json
{
  "status": "ok",
  "version": "1.0.0",
  "model_loaded": true,
  "model_source": "ensemble_model"
}
```

---

## 2. Prediction Endpoints

### `POST /api/v1/predict`
Run AI landslide risk prediction for given environmental and geotechnical parameters. If the binary ensemble model is unavailable, automatically activates deterministic NDMA rule-based fallback.
- **Auth**: None
- **Request Body**:
```json
{
  "district": "Cherrapunji",
  "state": "Meghalaya",
  "latitude": 25.2833,
  "longitude": 91.7167,
  "rainfall_24h_mm": 210.0,
  "rainfall_72h_mm": 525.0,
  "antecedent_rainfall_mm": 720.0,
  "soil_moisture_percent": 86.0,
  "slope_degrees": 38.0,
  "elevation_m": 1150.0,
  "ndvi": 0.33,
  "lithology_code": 2
}
```
- **Response (200 OK)**:
```json
{
  "district": "Cherrapunji",
  "probability": 0.884,
  "risk_level": "VERY_HIGH",
  "risk_color": "#ef4444",
  "risk_code": 4,
  "trigger_alert": true,
  "source": "ensemble_model",
  "model_version": "v2.1.0",
  "timestamp": "2026-09-14T17:30:00Z"
}
```
*Note: If the binary model fails to load or corrupts, BhoomiSafe activates `calculate_ndma_fallback()`, returning HTTP 200 with `"source": "fallback_rule_based"`.*

*(HTTP 422 returned if required fields are missing, values are out of bounds, or `rainfall_72h_mm < rainfall_24h_mm`)*

### Weather Ingestion & Failover Protocol
When meteorological inputs are queried via `weather_service.py`, requests follow a multi-tier fallback architecture:
1. **Primary**: OpenWeatherMap API (`source: "openweathermap"`)
2. **Secondary**: India Meteorological Department (IMD) API fallback (`source: "imd_fallback"`)
3. **Tertiary**: Calibrated baseline stub (`source: "calibrated_baseline_stub"`)

### `POST /api/v1/predict/batch`
Run predictions for multiple locations simultaneously (max 50 locations per request).
- **Auth**: None
- **Request Body**: Array of `PredictionRequest` objects.
- **Response (200 OK)**: `{"predictions": [...], "count": 12}`

### `GET /api/v1/predict/districts`
Get spatial risk snapshots across all 25 tracked NER districts.
- **Auth**: None
- **Response (200 OK)**:
```json
{
  "districts": [
    {
      "district": "Cherrapunji",
      "state": "Meghalaya",
      "latitude": 25.2833,
      "longitude": 91.7167,
      "probability": 0.88,
      "risk_level": "VERY_HIGH",
      "risk_color": "#ef4444",
      "risk_code": 4,
      "rainfall_24h_mm": 245.3
    }
  ],
  "count": 25,
  "generated_at": "2026-09-14T17:30:00Z"
}
```

### `GET /api/v1/predict/model-metrics`
Returns verified spatial cross-validation and temporal holdout metrics for the loaded ML model.
- **Auth**: None
- **Response (200 OK)**:
```json
{
  "model_name": "BhoomiSafe Ensemble (XGBoost + Random Forest)",
  "model_version": "v2.1.0",
  "spatial_cross_validation": {
    "method": "GroupKFold (n_splits=5, grouped by district)",
    "roc_auc_mean": 0.942,
    "f1_mean": 0.885
  },
  "temporal_holdout": {
    "method": "Chronological split (train on older events, test on recent events)",
    "roc_auc": 0.931,
    "f1_score": 0.873
  }
}
```

---

## 3. Alerts Endpoints

### `GET /api/v1/alerts`
List active or historic landslide warning advisories.
- **Auth**: None
- **Query Parameters**:
  - `state` (string, optional): Filter by NER state
  - `risk_level` (string, optional): Filter by `LOW`, `MODERATE`, `HIGH`, `VERY_HIGH`
  - `active_only` (bool, default `true`): Return only active alerts
- **Response (200 OK)**: `{"alerts": [...], "count": 5}`

### `GET /api/v1/alerts/{id}`
Retrieve a specific alert by UUID.
- **Auth**: None

### `GET /api/v1/alerts/stats/summary`
Aggregated alert statistics grouped by severity tier and state.
- **Auth**: None
- **Response (200 OK)**:
```json
{
  "total_active": 5,
  "by_risk_level": {"VERY_HIGH": 3, "HIGH": 2},
  "by_state": {"Meghalaya": 3, "Mizoram": 1, "Manipur": 1},
  "generated_at": "2026-09-14T17:30:00Z"
}
```

### `POST /api/v1/alerts`
Create a manual emergency alert override.
- **Auth**: `X-API-Key` required
- **Request Body**:
```json
{
  "district": "Cherrapunji",
  "state": "Meghalaya",
  "risk_level": "VERY_HIGH",
  "message": "Extreme rainfall detected. Evacuate low-lying gorge areas.",
  "latitude": 25.2833,
  "longitude": 91.7167
}
```
- **Response (201 Created)**: Created alert object with generated UUID and timestamps.

### `PATCH /api/v1/alerts/{id}/deactivate`
Deactivate or resolve an active alert.
- **Auth**: `X-API-Key` required
- **Response (200 OK)**: `{"message": "Alert deactivated", "id": "uuid"}`

---

## 4. Citizen Incident Reports Endpoints

### `POST /api/v1/reports`
Submit a ground-truth landslide incident report from the field.
- **Auth**: None (Public access)
- **Rate Limit**: 5 requests / min per IP
- **Request Body**:
```json
{
  "reporter_name": "Anita Sharma",
  "reporter_phone": "+919436001234",
  "district": "Jiribam",
  "state": "Manipur",
  "latitude": 24.8012,
  "longitude": 93.1185,
  "description": "Mudslide blocking NH-37 roadway near Jiribam junction.",
  "severity": "HIGH",
  "photo_url": null
}
```
*(HTTP 422 returned if latitude $\notin [-90, 90]$ or longitude $\notin [-180, 180]$)*
- **Response (201 Created)**:
```json
{
  "success": true,
  "report_id": "uuid",
  "message": "Report received. District officials have been notified.",
  "report": { ... }
}
```

### `GET /api/v1/reports`
List crowdsourced citizen reports with optional filtering.
- **Auth**: None
- **Query Parameters**:
  - `state` (string, optional)
  - `severity` (string, optional: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`)
  - `verified` (bool, optional)
  - `limit` (int, default 50, max 200)

### `GET /api/v1/reports/{id}`
Retrieve a specific report by UUID.
- **Auth**: None

### `GET /api/v1/reports/stats/summary`
Aggregated report statistics across severity levels and verification status.
- **Auth**: None
- **Response (200 OK)**:
```json
{
  "total_reports": 5,
  "verified": 0,
  "unverified": 5,
  "by_severity": {"HIGH": 1, "MEDIUM": 2, "CRITICAL": 1, "LOW": 1},
  "by_state": {"Manipur": 2, "Assam": 1, "Mizoram": 1, "Nagaland": 1}
}
```

### `PATCH /api/v1/reports/{id}/verify`
Mark a citizen submission as field-verified by emergency personnel.
- **Auth**: `X-API-Key` required
- **Response (200 OK)**: `{"message": "Report marked as verified", "id": "uuid"}`
