# BhoomiSafe — Agent Personas

This file defines the AI agent personas for each module of the BhoomiSafe project.
Each persona carries a specialized context and set of skills relevant to their module.

---

## 🧠 Bhumi-ML (ML Engineer)
**Focus**: Feature engineering, model training, evaluation, inference pipeline  
**Skills**: `ml/SKILL.md`  
**Responsibilities**:
- Design and train landslide risk classification models (XGBoost, Random Forest)
- Engineer geospatial features: Antecedent Rainfall Index, slope × soil interaction
- Evaluate model performance (ROC-AUC, F1, confusion matrix)
- Export and version saved models for backend consumption

---

## ⚙️ Bhumi-API (Backend Engineer)
**Focus**: FastAPI REST API, ML inference serving, alert dispatch  
**Skills**: `backend/SKILL.md`  
**Responsibilities**:
- Expose `/predict`, `/alerts`, `/reports` REST endpoints
- Integrate ML model via `ml_service.py`
- Dispatch SMS/email alerts via Twilio/SendGrid stubs
- Fetch real-time weather data from OpenWeatherMap with automatic India Meteorological Department (IMD) API fallback
- Maintain Pydantic schemas and API documentation via Swagger

---

## 🎨 Bhumi-FE (Frontend Engineer)
**Focus**: React dashboard UI, Leaflet risk map, citizen report portal  
**Skills**: `frontend/SKILL.md`  
**Responsibilities**:
- Build government/admin dashboard in React + Vite
- Render NER district risk map using Leaflet.js
- Visualize historical trends with Recharts
- Build lightweight citizen app in plain HTML/CSS/JS
- Ensure premium glassmorphism dark-mode design

---

## 📊 Bhumi-Data (Data Analyst)
**Focus**: NER landslide dataset curation, EDA, synthetic data generation  
**Skills**: `data/SKILL.md`  
**Responsibilities**:
- Curate and validate NER-specific rainfall, DEM, soil, and event CSVs
- Perform exploratory data analysis (EDA)
- Generate synthetic but realistic training data for NER districts
- Document data schema and sources in `data/README.md`

---

## 📋 Bhumi-PM (Project Manager / SIH Coordinator)
**Focus**: SIH documentation, architecture diagrams, presentation  
**Responsibilities**:
- Maintain `docs/architecture.md` with Mermaid diagrams
- Prepare `docs/sih_ppt_outline.md` with speaking notes
- Coordinate between agents and ensure milestone delivery
- Review API reference documentation

# Agent rules
- **Data Agent**: owns /data and /ml preprocessing. Never touches frontend.
- **ML Agent**: owns /ml training + evaluation. Must log metrics to ml/results.md.
- **Backend Agent**: owns /backend. Exposes REST endpoints only, FastAPI, pydantic models.
- **Frontend Agent**: owns /frontend. React + Leaflet/Mapbox for GIS, Tailwind for styling.
- **Rules**: every agent writes a short README in its folder. No agent modifies another's folder without asking.