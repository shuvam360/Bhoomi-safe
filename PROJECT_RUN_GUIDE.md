# 🚀 BhoomiSafe — Complete Project Run Guide

This guide contains the exact, copy-paste commands to run the **Backend API**, **Frontend Dashboard**, and **Automated Tests** on your Windows system.

---

## 📌 Why Did the Previous Commands Fail?

1. **Virtual Environment Not Activated:**
   - In Windows PowerShell, typing `uvicorn` or `pytest` directly will show `The term 'uvicorn' is not recognized` unless the virtual environment is activated, or called through the virtual environment's Python executable.
2. **Folder Location:**
   - The backend code (`backend/main.py`) and requirements are located inside the **`bhoomi-safe`** folder, not the root folder.
3. **Global `pip` Broken Launcher:**
   - Your system's global `pip` has a broken launcher path. You should always use the project's virtual environment python (`.venv\Scripts\python.exe`).

---

## ⚡ Option 1: Quick 1-Line Commands (No Activation Needed)

You can run each service directly from PowerShell without worrying about activation policies:

### 1️⃣ Run Backend Server (FastAPI + ML Model)
Open a PowerShell terminal and run:
```powershell
cd "c:\Users\SHUVAM DIKSHIT\OneDrive\Desktop\AI-Based Early Warning and Landslide Risk Monitoring System in NER\bhoomi-safe"
..\.venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```
* **URL:** [http://127.0.0.1:8000](http://127.0.0.1:8000)
* **Interactive API Docs:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

### 2️⃣ Run Frontend Dashboard (Vite + React)
Open a **second** PowerShell terminal and run:
```powershell
cd "c:\Users\SHUVAM DIKSHIT\OneDrive\Desktop\AI-Based Early Warning and Landslide Risk Monitoring System in NER\bhoomi-safe\frontend\dashboard"
npm run dev
```
* **URL:** [http://localhost:5173/](http://localhost:5173/)
* **Admin Verification Desk:** [http://localhost:5173/admin](http://localhost:5173/admin)
* **Citizen Reporting Portal:** [http://localhost:5173/citizen-app/index.html](http://localhost:5173/citizen-app/index.html)

---

### 3️⃣ Run All Automated Tests (Pytest)
Open a PowerShell terminal and run:
```powershell
cd "c:\Users\SHUVAM DIKSHIT\OneDrive\Desktop\AI-Based Early Warning and Landslide Risk Monitoring System in NER\bhoomi-safe"
..\.venv\Scripts\python.exe -m pytest tests/ -v
```
*(All 27 test suites will run and pass in ~1 second).*

---

## 🛠️ Option 2: Activate the Virtual Environment (Standard Way)

If you prefer activating the `.venv` so that you can type `uvicorn` and `pytest` directly:

### Step 1: Open PowerShell and Activate
```powershell
cd "c:\Users\SHUVAM DIKSHIT\OneDrive\Desktop\AI-Based Early Warning and Landslide Risk Monitoring System in NER"
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```
*You will see `(.venv)` appear in green on the left of your terminal prompt.*

### Step 2: Navigate to `bhoomi-safe` and Run
```powershell
cd bhoomi-safe
uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

To run tests while activated:
```powershell
pytest tests/ -v
```

---

## 🔑 Key Credentials & Configuration

| Service | Setting | Value |
|---|---|---|
| **Admin API Key** | `BHOOMI_API_KEY` | `bhoomi-admin-key-2026` |
| **CARTO Basemap Key** | `CARTO_API_KEY` | `cb1_3v9f_1_db37a53db18da3d4cf8ebd00` |
| **Backend Host & Port** | Localhost | `127.0.0.1:8000` |
| **Frontend Dashboard** | Vite Dev Server | `localhost:5173` |

---

## 🧪 Quick Test / Health Check

To verify that your backend server is responding correctly, run this in PowerShell:
```powershell
curl http://127.0.0.1:8000/api/v1/health
```
**Expected response:**
```json
{"status":"ok","version":"1.0.0","model_loaded":true,"model_source":"ensemble_model"}
```
