"""
Download all missing IMD 0.25° gridded daily rainfall datasets (2007–2017)
into data/raw/imd_gridded/
"""

import os
import sys
import shutil
from pathlib import Path
import imdlib

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
IMD_DIR = DATA_DIR / "raw" / "imd_gridded"
IMD_DIR.mkdir(parents=True, exist_ok=True)

years = list(range(2007, 2018))

def download_missing_years():
    # Switch working directory to IMD_DIR so imdlib saves .grd files directly here
    orig_cwd = os.getcwd()
    os.chdir(str(IMD_DIR))
    
    try:
        for yr in years:
            expected_file = IMD_DIR / f"Rainfall_ind{yr}_rfp25.grd"
            if expected_file.exists() and expected_file.stat().st_size > 20000000:
                print(f"[IMD] Year {yr} already downloaded: {expected_file.name} ({expected_file.stat().st_size / (1024*1024):.1f} MB)")
                continue
                
            print(f"[IMD] Downloading gridded rainfall for year {yr} from IMD...")
            try:
                # get_data calls open_data which might raise FileNotFoundError if path resolution differs,
                # but download succeeds first.
                imdlib.get_data("rain", yr, yr)
            except Exception as e:
                # Check if file was downloaded despite open_data exception
                if expected_file.exists() and expected_file.stat().st_size > 20000000:
                    print(f"  --> File saved successfully: {expected_file.name}")
                else:
                    print(f"  --> Download warning for {yr}: {e}")
                    
            if expected_file.exists():
                print(f"  Verified {expected_file.name} ({expected_file.stat().st_size / (1024*1024):.1f} MB)")
            else:
                print(f"  ERROR: {expected_file.name} not found after download attempt.")
                
    finally:
        os.chdir(orig_cwd)
        
    print("\nAll required IMD years checked:")
    for yr in years:
        f = IMD_DIR / f"Rainfall_ind{yr}_rfp25.grd"
        status = "PRESENT" if f.exists() else "MISSING"
        print(f"  {yr}: {status}")

if __name__ == "__main__":
    download_missing_years()
