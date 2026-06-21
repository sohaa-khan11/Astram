# ASTraM Parking Intelligence — GridLock 2.0

## What this is
The ASTraM Parking Intelligence System is a specialized AI-driven operations command console designed for the Bengaluru Traffic Police. By processing raw violation records, it identifies illegal parking hotspots, generates an explainable proxy for congestion impact, and flags high-confidence valid records for manual triage—ultimately enabling prioritized and targeted enforcement.

## What's real and what's not
- ✅ **Real:** Hotspot locations, violation counts, cluster rankings — all strictly derived from the 298,450 raw BTP enforcement records.
- ✅ **Real:** ImpactScore formula mathematically applied to real density and severity metrics.
- ✅ **Real:** ~29% rejection rate accurately measured from the existing validation workflow logs.
- ✅ **Real:** Enforcement activity time patterns per hotspot accurately mapped directly from the timestamps.
- ⚠️ **Proxy:** The ImpactScore serves as a defensible proxy for congestion impact, *not* measured traffic flow.
- 🔄 **Replay:** The simulation mode steps through real historical data (Nov 2023–Apr 2024), it is not a live feed.
- 🔌 **Ready to connect:** MapMyIndia Mappls Traffic API. Integration is architected as a simple one-function swap in `impactScore.py` once API tokens are available.

## Setup

### Quick Start (Automated Scripts)

The easiest way to set up and run the application is to use the provided setup and start scripts:

#### macOS & Linux
1. **Setup**: Run `./setup.sh` from the `astram-parking-intelligence` directory to create a Python virtual environment (`.venv`), upgrade pip, and install all backend and frontend dependencies.
2. **Start**: Run `./start.sh` to start both the FastAPI backend server and the React/Vite frontend server concurrently.

#### Windows
1. **Setup**: Run `setup.bat` to set up the virtual environment and install all dependencies.
2. **Start**: Run `start.bat` to launch both servers in separate windows.

---

### Manual Setup

If you prefer to set up the project manually:

#### 1. Data Pipeline
The analysis is driven by Jupyter notebooks. Run the pipeline in order to clean the data and generate the exports:
```bash
cd notebook
# Ensure the CSV dataset is in the project root as jan_to_may_police_violation_anonymized.csv
# Run notebooks 01 through 04
```

#### 2. Backend (FastAPI)
Set up a Python virtual environment, install requirements, and run uvicorn. Note that the uvicorn start command must be run from the root `astram-parking-intelligence` directory so that relative imports resolve correctly:
```bash
# From astram-parking-intelligence/
python3 -m venv .venv
source .venv/bin/activate
pip install -r api/requirements.txt
pip install fastapi uvicorn pandas pyarrow numpy

# Start the server (MUST run from root)
python -m uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

#### 3. Frontend (React / Vite)
Install node modules and start the Vite dev server:
```bash
cd frontend
npm install
npm run dev
```

## Architecture
- **Data Engine:** Python 3.11, pandas, scikit-learn, pyproj, xgboost
- **Backend:** FastAPI (Python) serving highly-optimized precomputed in-memory models.
- **Frontend:** React + Vite, customized vanilla CSS, `maplibre-gl`, `@deck.gl/react`.

## Methodology note
The system employs a strict, data-first approach:
1. **Filtering:** We aggressively filter non-parking offenses to ensure purity of the parking congestion model.
2. **DBSCAN Clustering:** Instead of K-Means, we use DBSCAN with a 80m `eps` (after converting to UTM Zone 43N) to correctly map the organic, blob-like nature of street-side parking clusters.
3. **Congestion Impact Proxy:** As the data lacks ground-truth velocity, we construct an explainable ImpactScore composed of violation density, repeat plate rate, weighted vehicle footprints, violation severity, and junction proximity.
4. **Triage Classifier:** An XGBoost model trained on historic manual review patterns acts as a triage assistant, scoring incoming violations to isolate high-confidence infractions from likely rejections, reducing manual overhead.
