# BhoomiSafe Data Directory

This directory contains all datasets used by the BhoomiSafe landslide risk prediction system,
curated specifically for the **North East Region (NER) of India**.

---

## Files

### `rainfall_ner.csv`
Daily rainfall and environmental measurements for NER districts.

| Column | Unit | Description |
|--------|------|-------------|
| `district` | - | District name |
| `state` | - | State name |
| `date` | YYYY-MM-DD | Observation date |
| `rainfall_24h_mm` | mm | 24-hour cumulative rainfall |
| `rainfall_72h_mm` | mm | 72-hour cumulative rainfall |
| `antecedent_rainfall_mm` | mm | 7-day antecedent rainfall index |
| `soil_moisture_percent` | % | Volumetric soil moisture |
| `slope_degrees` | ° | Average slope of district centroid |
| `elevation_m` | m | Mean elevation |
| `ndvi` | 0–1 | Normalized Difference Vegetation Index |
| `lithology_code` | 1–3 | Rock type code (see `soil_types.csv`) |
| `landslide_occurred` | 0/1 | Binary label (target variable) |

**Source**: Synthetic data modeled on IMD (India Meteorological Department) NER records.

---

### `dem_metadata.csv`
Digital Elevation Model (DEM) geospatial attributes per district.

| Column | Unit | Description |
|--------|------|-------------|
| `latitude` / `longitude` | decimal degrees | District centroid coordinates |
| `elevation_m` | m | Mean elevation above sea level |
| `slope_degrees` | ° | Mean slope angle |
| `aspect_degrees` | ° | Slope aspect (0=N, 90=E, 180=S, 270=W) |
| `curvature` | - | Profile curvature (concave/convex) |
| `drainage_density` | km/km² | Stream channel density |
| `fault_distance_km` | km | Distance to nearest geological fault |
| `lithology_code` | 1–3 | Dominant rock type code |
| `lithology_name` | - | Human-readable rock type |

**Source**: Synthetic data modeled on SRTM DEM and GSI (Geological Survey of India) maps.

---

### `soil_types.csv`
Geotechnical properties for NER soil classifications.

| Column | Unit | Description |
|--------|------|-------------|
| `soil_code` | 1–5 | Soil classification ID |
| `soil_name` | - | Soil type name |
| `permeability_class` | - | Hydraulic conductivity class |
| `cohesion_kpa` | kPa | Shear strength cohesion |
| `friction_angle_deg` | ° | Internal friction angle |
| `clay/silt/sand_percent` | % | Particle size distribution |
| `organic_matter_percent` | % | Organic content |
| `plasticity_index` | - | Atterberg plasticity index |

---

### `landslide_events.csv`
Historical verified landslide events in NER.

| Column | Description |
|--------|-------------|
| `event_id` | Unique event identifier |
| `event_type` | Debris_Flow / Rotational_Slide / Translational_Slide / Rock_Fall |
| `volume_m3` | Estimated mass movement volume |
| `casualties` | Number of casualties |
| `trigger` | Primary trigger (Rainfall / Earthquake / Anthropogenic) |
| `verified` | Whether field-verified by GSI/NDMA |

---

## Data Sources (References)
- India Meteorological Department (IMD): https://mausam.imd.gov.in
- National Disaster Management Authority (NDMA): https://ndma.gov.in
- Geological Survey of India (GSI): https://www.gsi.gov.in
- Bhukosh Portal (GSI): https://bhukosh.gsi.gov.in
- SRTM DEM: https://srtm.csi.cgiar.org
- BHUVAN ISRO: https://bhuvan.nrsc.gov.in

> **Note**: All data in this directory is **synthetic but statistically representative** of real NER 
> conditions. For production deployment, replace with actual IMD/GSI/NDMA datasets.
