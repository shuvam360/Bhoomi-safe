"""
Download and parse NASA Global Landslide Catalog (GLC) data,
filtered to the North East Region (NER) bounding box:
Latitude: [22.0, 29.5]
Longitude: [88.0, 97.5]
"""

import os
import sys
from pathlib import Path
import httpx
import pandas as pd

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
RAW_DIR = DATA_DIR / "raw"
RAW_DIR.mkdir(parents=True, exist_ok=True)

GLC_CSV_PATH = RAW_DIR / "Global_Landslide_Catalog_Export_rows.csv"
GLC_URL = "https://data.nasa.gov/docs/legacy/Global_Landslide_Catalog_Export/Global_Landslide_Catalog_Export_rows.csv"

def download_nasa_glc():
    if GLC_CSV_PATH.exists() and GLC_CSV_PATH.stat().st_size > 1000000:
        print(f"NASA GLC already downloaded at {GLC_CSV_PATH} ({GLC_CSV_PATH.stat().st_size / (1024*1024):.2f} MB)")
        return
    
    print(f"Downloading NASA GLC from {GLC_URL}...")
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    with httpx.stream("GET", GLC_URL, headers=headers, follow_redirects=True, timeout=60.0) as r:
        r.raise_for_status()
        with open(GLC_CSV_PATH, "wb") as f:
            for chunk in r.iter_bytes(chunk_size=1024*1024):
                f.write(chunk)
    print(f"Download complete: {GLC_CSV_PATH.stat().st_size / (1024*1024):.2f} MB")

def parse_and_filter_ner():
    download_nasa_glc()
    
    print("Parsing NASA GLC catalog...")
    df = pd.read_csv(GLC_CSV_PATH, low_memory=False)
    print(f"Total global records in catalog: {len(df)}")
    print(f"Columns available: {list(df.columns[:15])} ...")
    
    # Identify latitude/longitude column names
    lat_col = [c for c in df.columns if c.lower() in ('latitude', 'lat')][0]
    lon_col = [c for c in df.columns if c.lower() in ('longitude', 'lon', 'long')][0]
    date_col = [c for c in df.columns if 'date' in c.lower()][0]
    
    print(f"Using coordinates: lat={lat_col}, lon={lon_col}, date={date_col}")
    
    # Filter to valid coordinates
    df[lat_col] = pd.to_numeric(df[lat_col], errors='coerce')
    df[lon_col] = pd.to_numeric(df[lon_col], errors='coerce')
    
    # NER bounding box: lat 22–29.5, lon 88–97.5
    ner_mask = (
        (df[lat_col] >= 22.0) & (df[lat_col] <= 29.5) &
        (df[lon_col] >= 88.0) & (df[lon_col] <= 97.5)
    )
    
    ner_events = df[ner_mask].copy()
    
    # Parse dates
    ner_events["parsed_date"] = pd.to_datetime(ner_events[date_col], errors='coerce')
    
    print("\n" + "="*70)
    print("NASA GLC / COOLR NER REGION FILTERING RESULTS")
    print("="*70)
    print(f"Bounding box: Latitude [22.0, 29.5], Longitude [88.0, 97.5]")
    print(f"Total events falling in NER bounding box: {len(ner_events)}")
    print(f"Events with valid parsed dates: {ner_events['parsed_date'].notna().sum()}")
    
    valid_dates = ner_events['parsed_date'].dropna()
    if len(valid_dates) > 0:
        print(f"Date range: {valid_dates.min().strftime('%Y-%m-%d')} to {valid_dates.max().strftime('%Y-%m-%d')}")
        print(f"Year breakdown:\n{valid_dates.dt.year.value_counts().sort_index()}")
    
    country_col = [c for c in df.columns if 'country' in c.lower()]
    if country_col:
        print(f"\nCountry distribution in bounding box:\n{ner_events[country_col[0]].value_counts()}")
        
    trigger_col = [c for c in df.columns if 'trigger' in c.lower()]
    if trigger_col:
        print(f"\nTrigger breakdown in bounding box:\n{ner_events[trigger_col[0]].value_counts().head(5)}")
        
    # Save filtered NER events
    ner_filtered_path = DATA_DIR / "raw" / "nasa_glc_ner_filtered.csv"
    ner_events.to_csv(ner_filtered_path, index=False)
    print(f"\nSaved filtered NER events to {ner_filtered_path}")

if __name__ == "__main__":
    parse_and_filter_ner()
