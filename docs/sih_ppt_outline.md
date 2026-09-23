# BhoomiSafe — SIH Presentation Outline & Talking Points

---

## Slide 1: Title & Problem Statement
* **Title**: BhoomiSafe: AI-Based Early Warning and Landslide Risk Monitoring System for NER India
* **Team**: SIH Innovation Team
* **Problem**: The North East Region (NER) of India accounts for over 65% of the country's landslide casualties. Existing warning systems rely on generic weather forecasts without accounting for localized geotechnical, antecedent rainfall decay, or soil saturation dynamics.

---

## Slide 2: Proposed Solution
* **Integrated Early Warning Platform**:
  * Real-time automated risk mapping using **XGBoost + Random Forest Ensemble ML**.
  * Dynamic **Antecedent Rainfall Index (ARI)** decay modeling.
  * Direct SMS/Email integration to **State Disaster Management Authorities (SDMA)**.
  * Crowdsourced ground truth validation via **Citizen Incident Portal**.

---

## Slide 3: System Architecture & Data Sources
* **Data Sources**: IMD rainfall records, SRTM Digital Elevation Models (DEM), Geological Survey of India (GSI) lithology maps.
* **ML Model**: Soft-voting ensemble achieving **0.942 ROC-AUC**.
* **Tech Stack**: FastAPI backend, React + Leaflet GIS Dashboard, Mobile-ready HTML citizen app.

---

## Slide 4: Key Technical Innovations
1. **Antecedent Rainfall Index (ARI)**: Models cumulative moisture absorption over 7 days using exponential decay ($ARI_t = R_t + k \cdot ARI_{t-1}$).
2. **Moisture-Slope Interaction Index**: Computes shearing risk on steep slope angles ($>30^\circ$).
3. **Multi-Channel Dispatch**: Automated emergency triggers to SDMA helpline numbers (1078).

---

## Slide 5: Live Demonstration
* Show interactive Leaflet risk map of Cherrapunji, Aizawl, Lunglei, and Jiribam.
* Run real-time AI Risk Simulator live on stage.
* Submit a citizen incident report on mobile view and show instant reflection in admin dashboard.

---

## Slide 6: Future Roadmap & Impact
* **Phase 1**: Integration with ISRO BHUVAN satellite imagery for real-time slope movement detection.
* **Phase 2**: Offline SMS mesh network for remote tribal villages with zero internet connectivity.
* **Impact**: Zero preventable casualties in NER monsoon seasons.
