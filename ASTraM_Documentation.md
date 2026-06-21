# ASTraM Parking Intelligence Console - Project Documentation

## 1. Introduction
**ASTraM Parking Intelligence** is an advanced, city-scale command console designed for the Bengaluru Traffic Police (BTP) as part of the GridLock 2.0 initiative. It solves the critical problem of triaging and managing thousands of illegal parking violations generated daily by AI traffic cameras and public submissions. Instead of overwhelming human operators with individual tickets, ASTraM clusters them into actionable "hotspots," ranks them by severity, automatically filters out false positives using Machine Learning, and provides tools to deploy real-world interventions (like towing vehicles).

## 2. Technical Architecture & Tech Stack

The project is built using a modern, decoupled architecture with a focus on performance, scalability, and an immersive user experience.

### Frontend (Client Tier)
- **Framework:** React 18 with TypeScript, bundled via Vite.
- **Map Engine:** `react-map-gl` running on top of `maplibre-gl` for high-performance 3D rendering of the city.
- **Styling:** Custom CSS based on a premium Flipkart-inspired design system (`tokens.css`). No heavy component libraries; everything including 3D effects is custom-built.
- **Charts:** Custom HTML5 `<canvas>` rendering for 3D isometric bar and line charts (no external charting libraries used).

### Backend (API Tier)
- **Framework:** FastAPI (Python), served by Uvicorn.
- **Data Handling:** Pandas and NumPy for high-performance data manipulation in memory.
- **Models:** Pydantic for strong typing and validation of API requests and responses.
- **Simulation Engine:** Custom ticketing simulation (`simulate.py`) that plays back historical violations across a timeline.

### Data Pipeline & Machine Learning (Data Tier)
- **Environment:** Jupyter Notebooks (`notebook/` directory).
- **Clustering:** DBSCAN (Density-Based Spatial Clustering of Applications with Noise) to group individual parking violations into "hotspots" based on spatial proximity.
- **Triage Classification:** XGBoost classifier trained to identify and filter out false-positive violations (invalid claims) with high confidence.
- **Storage:** Precomputed data stored in JSON and Parquet formats for blazing-fast API responses.

## 3. Data Flow & Working Mechanism

1. **Ingestion & Processing (Offline):**
   Raw violation data (e.g., from Jamshedpur POS datasets mapped to Bengaluru) is processed in Jupyter notebooks. Violations are clustered spatially (DBSCAN). An impact score is calculated for each cluster based on violation count, proximity to junctions, and temporal entropy.
2. **API Serving (Online):**
   The FastAPI backend loads these precomputed Parquet and JSON files into memory (`data_loader.py`). It exposes endpoints for hotspots, stations, summary metrics, triage queues, and image analysis.
3. **Frontend Rendering:**
   The React application fetches data from the API and renders the 3D Map, Triage Queue, and Analytics dashboards.
4. **Action Loop:**
   Operators view hotspots on the map, review the intelligence (dominant vehicle, junction proximity), and trigger interventions. The frontend updates state locally to reflect the action (e.g., drawing a tow route), demonstrating real-time situational awareness.

## 4. Key Features & Tools Explained

### A. 3D Enforcement Map & Tow Bay Fleet Control
- **Feature:** An interactive 3D map of Bengaluru displaying all illegal parking hotspots with extrusion stems, integrated with a live 8-truck fleet management dashboard ("Tow Bay").
- **How it works:** 
  - **BTP HQ Depot:** A permanent operations depot (`🏢`) is anchored on the map.
  - **Fleet Bay Dashboard:** Operators see a live status list of BTP tow trucks (`BTP-TOW-01` to `BTP-TOW-08`) with color-coded status tags (Available, Transit %, On Site, Returning) and license registration details.
  - **Manual Dispatch & Recall:** Operators select an available truck from a dropdown in the hotspot panel and allocate it manually. Trucks can be recalled at any stage, making them return to BTP HQ.
  - **Block-Aligned Routing & Transit Animation:** Draws a multi-segment zig-zag route representing city streets. Pulsing tow truck markers (`🚛`) move along these paths in real-time. The 80% hotspot impact score reduction applies ONLY when the truck reaches `ON_SITE` status, clearing the congestion. Returning trucks trace a gray path back to the depot and reset to `AVAILABLE`.

### B. Triage Queue (AI Presort)
- **Feature:** An inbox for incoming violations that need manual validation.
- **How it works:** 
  - Integrates the XGBoost model's confidence scores. Violations with high confidence of being invalid are flagged for rejection ("Mean Rejection Rate"), saving human operators hours of manual review.
  - **Explanatory Info Panel:** A detailed onboarding block explains the purpose of triage (BTP review desk to weed out false positives) and how the machine learning model assists officers.

### C. 3D Isometric Analytics Dashboard
- **Feature:** A high-end analytics panel showing City Analytics, Violation Categories, Peak Congestion Hours, Top Divisions, and Vehicle Type Distributions.
- **How it works:** Instead of flat 2D charts, it uses raw HTML5 `<canvas>` API to draw 3D isometric bar charts with depth faces, glow effects, grid floors, and animations. The Peak Congestion chart uses a 3D line graph with area gradient fills.

### D. Photo Upload Scanner (Detection Sandbox)
- **Feature:** A tool to upload and analyze static photos of traffic scenes.
- **How it works:** The backend runs a signature-matching algorithm (aHash + RGB signatures) against demo images or generates deterministic mock outputs for new uploads. It returns absolute bounding box coordinates for vehicles, highlighting violators in red. Operators can click on bounding boxes to view the owner registration card and inject the violation.

### E. Live Camera Feed (3D Canvas)
- **Feature:** A 3D perspective simulation of a CCTV camera view.
- **How it works:** Uses the `<canvas>` API to render a 3D wireframe world with moving vehicles (represented as 3D cubes with headlight beams) on a dark asphalt background.

### F. Live Video OCR Surveillance Scanner (Detection Sandbox)
- **Feature:** A live surveillance CCTV monitor running an actual traffic video feed overlaid with real-time computer vision bounding boxes and plate OCR scanning, integrated with BTP Tow Truck arrivals.
- **How it works:** 
  - Plays a looping video (or high-tech animated fallback) of urban traffic.
  - Green bounding boxes slide across the video screen, tracking moving cars and motorcycles along with their estimated speeds (`CAR | 45 km/h`).
  - When a vehicle parks illegally in the designated "No Parking Zone", the system locks on with a flashing red bounding box and types its plate characters letter-by-letter.
  - **Tow Truck Visualization:** When a tow truck is dispatched to the corresponding hotspot (e.g. Richmond Road) from the Map, or when a local demo tow is triggered in the Sandbox, a BTP Tow Truck (`🚛`) glides into the CCTV monitor screen, locks onto the violating vehicle with a tow line, hoists the vehicle onto the flatbed, and drives away. The violation bounding box and the parked vehicle then disappear, showing a resolved and clear street!

### G. BTP Tow Impoundment & Citizen WhatsApp System
- **Feature:** An interactive smartphone mockup representing a citizen's WhatsApp chat, notifying them of a dispatched BTP tow truck, tracking its route, and facilitating impoundment fine payment and yard collection.
- **How it works:**
  - **En Route Tracking:** When an operator dispatches a BTP tow truck from the Tow Bay, the smartphone mockup slides into view on the Enforcement Map. The citizen receives real-time notifications about the dispatched truck and can watch its progress (progress % and seconds ETA) in WhatsApp. No cancellation or vehicle removal options are allowed during en route status (punishment is guaranteed).
  - **On Site Towing:** Once the truck arrives on-site, the phone updates to indicate that the BTP crew is loading and securing the vehicle.
  - **Impoundment Transport:** Once the vehicle is towed and the truck is returning (`RETURNING` status), the citizen receives a formal impoundment notification. The citizen can track the tow truck carrying their vehicle back to the depot.
  - **Challan Fine Payment (₹1,500):** A button is exposed on the phone screen allowing the citizen to pay the ₹1,500 impoundment challan online via UPI. This opens a simulated UPI checkout spinner.
  - **HQ Yard Collection Receipt:** Once paid, the WhatsApp chat issues a custody release receipt (Transaction ID generated) and displays detailed collection instructions, directing the citizen to visit the BTP HQ Depot at Queen's Road Yard to retrieve their released vehicle. If the truck reaches the depot before payment, it unloads, and the phone stays open in an `AT_DEPOT` unpaid state until the challan is cleared.

## 5. Conclusion
ASTraM is a comprehensive proof-of-concept that demonstrates how modern web technologies (React, Canvas, MapLibre), high-performance backends (FastAPI), and Machine Learning (DBSCAN, XGBoost) can be combined to solve massive logistical challenges in urban traffic enforcement. It shifts the paradigm from "viewing data" to "taking actionable interventions" with a highly polished, 3D visual experience.
