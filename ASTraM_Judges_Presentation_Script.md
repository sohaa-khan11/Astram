# ASTraM Parking Intelligence Console - Pitch & Video Presentation Script

**Project Title:** ASTraM: Parking-Induced Congestion Triage & Tactical Dispatch Command Center  
**Target Audience:** Bengaluru Traffic Police (BTP) & Flipkart Judging Panel  
**Theme:** "Poor Visibility on Parking-Induced Congestion"  

---

## 1. Video Presentation Flow Overview

This table outlines the visual storyboard and verbal pacing for a **6-minute pitch and demo video**.

| Scene | Timestamp | Visual Context (What to show on screen) | Key Verbal Hook |
| :--- | :--- | :--- | :--- |
| **1. Intro & Problem** | 0:00 - 0:45 | • ASTraM Landing Page & Live 3D Map<br>• Focus on Bengaluru's bumper-to-bumper traffic | "Parking-induced congestion is the silent killer of Bengaluru's mobility. ASTraM gives the BTP 360-degree visibility." |
| **2. Command Center Map**| 0:45 - 1:45 | • Tactical Dark Basemap<br>• Glowing radial heatmaps (DBSCAN)<br>• Hotspot severity ranking list | "Instead of individual tickets, we cluster violations into hotspots using DBSCAN, ranking them from most severe to least." |
| **3. Priority & AI Forecast**| 1:45 - 2:45 | • Hotspot detail popup panel<br>• Parking Priority Score formula<br>• AI Clearance Time forecast card | "ASTraM uses a regression model to estimate clearance time. It tells us exactly when a road segment will return to Green." |
| **4. Tactical Dispatch** | 2:45 - 3:45 | • Dispatching `BTP-TOW-03`<br>• Real-time block-aligned routing<br>• Automated redirect to `Traffic Dispatch` | "We allocate limited police resources efficiently. We dispatch tow trucks in one click and watch their transit routes." |
| **5. Live CCTV & Motion** | 3:45 - 4:45 | • Live Canvas stream & radar sweep<br>• Moving violator bus (8 km/h)<br>• Tow truck arriving and coupling | "Before the tow truck arrives, the violator vehicle is moving. Watch it creep. Once BTP arrives, it stops and couples." |
| **6. Citizen WhatsApp** | 4:45 - 5:30 | • Mobile WhatsApp Mockup widget<br>• Transit updates, ₹1,500 challan payment<br>• HQ Depot yard collection release | "Citizens get real-time towing progress on WhatsApp, clear their ₹1,500 challan via UPI, and get yard release receipts." |
| **7. Sandbox & RTO** | 5:30 - 6:00 | • Photo Uploader & OCR scanner<br>• RTO Owner lookup registry query<br>• Surveillance Camera diagnostics logs | "Surveillance feeds undergo OCR plate scans matching RTO records instantly. BTP diagnostics monitor camera reliability." |

---

## 2. Complete Narration Script (Scene-by-Scene)

### Scene 1: The Problem (0:00 - 0:45)
**[Visual: PresentMapPage in dark mode, showing the glowing red/amber heatmaps over Richmond Road and Brigade Road.]**
> **"Namaskara Judges,**
> 
> Bengaluru's roads are choked, and a primary trigger is parking-induced congestion. Illegal parking on high-density arterial roads blocks entire lanes, causing catastrophic traffic spillover. Currently, the Bengaluru Traffic Police receives thousands of public reports and camera violations daily. But they have **zero visibility** into which violations actually impact traffic, leading to delayed enforcement and wasted police resources.
> 
> Welcome to **ASTraM Parking Intelligence Console**—a city-scale operational command center custom-built for the Bengaluru Traffic Police to triage parking violations, predict congestion clearance times, and optimize tow truck deployments in real-time."

---

### Scene 2: High-Level Command Center & Clustering (0:45 - 1:45)
**[Visual: Hovering over the map. Point out the glowing radial gradient heatmaps.]**
> "At first glance, BTP operators are presented with a tactical dark map of Bengaluru. Instead of cluttering the console with individual pins for thousands of parking violations, ASTraM runs **DBSCAN spatial clustering** in the background. It dynamically aggregates violations into active hotspots.
> 
> On the right side, the console ranks these hotspots from most severe to least. You can instantly see which traffic division—whether Richmond Road, Indiranagar, or Koramangala—is experiencing the worst parking blockages. This solves the core visibility gap."

---

### Scene 3: Parking Priority Score & AI Clearance Time (1:45 - 2:45)
**[Visual: Click on the Richmond Road Junction hotspot. The details panel slides out.]**
> "Let's inspect a hotspot. ASTraM calculates a mathematical **Parking Priority Score** for each cluster. This score combines the volume of violations, the average confidence of the detections, and critically, its proximity to major intersections. 
> 
> Below the priority score, our **AI Clearance Time Model** estimates how long it will take to clear this gridlock under three scenarios: monitoring only, deploying a patrol officer, or dispatching a heavy tow truck. Powered by a regression model trained on historical congestion data, it forecasts that dispatching a tow truck will reduce clearing time from 64 minutes down to just 12 minutes."

---

### Scene 4: Enforcement & Tactical Dispatch (2:45 - 3:45)
**[Visual: Select 'Send Tow Truck' recommendation, choose BTP-TOW-03 from the Fleet dropdown, and click 'Dispatch Tow to Bottleneck'.]**
> "Now, watch the resource allocation in action. The console shows our live BTP Tow Fleet Bay. We select `BTP-TOW-03` and dispatch it. 
> 
> The command center immediately redirects the dispatcher to a dedicated **Traffic Dispatch Workspace**, and a real-time, block-aligned routing route is drawn on the map. The tow truck marker moves dynamically along the streets, updating its transit progress telemetry. By isolating this operational tracking screen, we keep dispatchers focused on clearance without the noise of public dispute queues."

---

### Scene 5: Live CCTV Simulator & Interception (3:45 - 4:45)
**[Visual: Hover over the Canvas Surveillance feed in the Dispatch Workspace. Show the BMTC Bus moving slowly.]**
> "Here is our live CCTV surveillance stream. Before the BTP tow truck reaches the site, notice that the vehicle causing the blockage—in this case, a BMTC Bus—is not static; it is slowly creeping along the lane. The CCTV overlays real-time speed tracking, indicating `BMTC BUS (MOVING @ 8 km/h)`.
> 
> As soon as the BTP tow truck progress hits 100%, the status changes to `ON_SITE`. On the radar canvas, the tow truck arrives, the bus immediately stops, and the BTP crew couples it with a secure tow line. The status banner updates to `COUPLING ACTIVE`. The physical blockage is cleared, restoring traffic flow."

---

### Scene 6: Citizen WhatsApp & UPI Challan System (4:45 - 5:30)
**[Visual: Show the mobile phone mockup on the PresentMapPage dashboard, demonstrating the WhatsApp thread.]**
> "While police manage the dispatch, what happens to the vehicle owner? The moment a tow is ordered, ASTraM integrates with the BTP's automated WhatsApp dispatch system. 
> 
> The violator receives a message containing the live transit status of the incoming tow truck. Once their vehicle is impounded, the citizen is notified and can pay the **₹1,500 challan fine** directly inside WhatsApp using our simulated UPI payment gateway. Once paid, they receive an automated custody release receipt containing directions to the BTP HQ Queen's Road Yard to collect their vehicle."

---

### Scene 7: Ingestion Sandbox, RTO Registry, & Diagnostics (5:30 - 6:00)
**[Visual: Go to the 'Detection Sandbox' tab, show OCR scanning plate, then click on RTO Lookup card, and show the Diagnostics Logs.]**
> "Finally, let's look at the data ingestion. In the Detection Sandbox, operators can review live camera feeds or upload static photos of parking violations. 
> 
> Our OCR engine scans license plates letter-by-letter, matching them against the BTP's regional **RTO registry database** to pull owner name, vehicle make, and registration details instantly. To maintain the system, a **Surveillance Diagnostics tab** monitors the reliability score of every camera node, logging automated alerts for node failures or offline telemetry.
> 
> ASTraM is the complete, closed-loop solution that turns chaotic parking reports into surgical, automated traffic enforcement. Thank you!"

---

## 3. Operational Compliance & Features Matrix

This table lists the exact frontend and backend source code locations implementing each of the hackathon's scoring metrics.

| Judging Requirement | Feature Description | Code File Location |
| :--- | :--- | :--- |
| **Parking Hotspot Detection** | Aggregates individual spatial violations into active hotspots using DBSCAN. | Backend: `api/main.py` (DBSCAN logic)<br>Jupyter: [notebook/DBSCAN_Clustering.ipynb](file:///Users/sainath/Desktop/gridlock/astram-parking-intelligence/notebook/DBSCAN_Clustering.ipynb) |
| **Hotspot Ranking** | Ranks hotspots from most severe to least severe in a reactive list. | Frontend: [PresentMapPage.tsx](file:///Users/sainath/Desktop/gridlock/astram-parking-intelligence/frontend/src/pages/PresentMapPage.tsx) (severity-sorted hotspot list) |
| **Parking Priority Score** | Calculates score based on cluster density, detection confidence, and junction proximity. | Backend: `api/main.py` (Hotspot API model compute)<br>Frontend: [HotspotDetail.tsx](file:///Users/sainath/Desktop/gridlock/astram-parking-intelligence/frontend/src/components/HotspotDetail.tsx) |
| **Enforcement Recommendations**| Automatically recommends "Send Tow Truck", "Send Patrol Officer", or "Monitor Only" based on score. | Backend: `api/main.py` (AI recommendation engine)<br>Frontend: [HotspotDetail.tsx](file:///Users/sainath/Desktop/gridlock/astram-parking-intelligence/frontend/src/components/HotspotDetail.tsx) |
| **Resource Allocation** | A live 8-truck fleet dashboard allowing manual allocation of available trucks. | Frontend: [TowFleetPage.tsx](file:///Users/sainath/Desktop/gridlock/astram-parking-intelligence/frontend/src/pages/TowFleetPage.tsx) & [App.tsx](file:///Users/sainath/Desktop/gridlock/astram-parking-intelligence/frontend/src/App.tsx) |
| **Map-Based Visualization** | 3D visual map showing hotspots, BTP HQ Depot, and tow fleet positions. | Frontend: [Map3D.tsx](file:///Users/sainath/Desktop/gridlock/astram-parking-intelligence/frontend/src/components/Map3D.tsx) (dark style, glowing heat blobs) |
| **Real-Time Routing** | Interactive block-aligned path drawing and real-time truck transit animations. | Frontend: [Map3D.tsx](file:///Users/sainath/Desktop/gridlock/astram-parking-intelligence/frontend/src/components/Map3D.tsx) (Transit interpolation along segment route coords) |
| **Operational Dispatch View** | Dedicated screen for tracking clearance progress, containing signal controls and telemetry. | Frontend: [TrafficDispatchPage.tsx](file:///Users/sainath/Desktop/gridlock/astram-parking-intelligence/frontend/src/pages/TrafficDispatchPage.tsx) |
| **Live CCTV feeds & Motion** | HTML5 Canvas radar sweep feed representing target vehicles drifting prior to tow arrival. | Frontend: [SandboxPanel.tsx](file:///Users/sainath/Desktop/gridlock/astram-parking-intelligence/frontend/src/components/SandboxPanel.tsx) & [TrafficDispatchPage.tsx](file:///Users/sainath/Desktop/gridlock/astram-parking-intelligence/frontend/src/pages/TrafficDispatchPage.tsx) |
| **RTO Integration** | Automatically fetches registration and owner cards from plate OCR. | Backend: `api/main.py` (`/api/rto/lookup` endpoint)<br>Frontend: [SandboxPanel.tsx](file:///Users/sainath/Desktop/gridlock/astram-parking-intelligence/frontend/src/components/SandboxPanel.tsx) |
| **AI Clearance Forecast** | Real-time prediction models estimating clearing hour under different intervention profiles. | Backend: `api/main.py` (`/api/traffic/clearance_time` and `/api/analytics/forecast`) |
| **Diagnostics & Health** | Logging panel and health scoreboard monitoring camera uptime. | Backend: `api/main.py` (`/api/devices/reliability` endpoint)<br>Frontend: [TriagePanel.tsx](file:///Users/sainath/Desktop/gridlock/astram-parking-intelligence/frontend/src/components/TriagePanel.tsx) (Surveillance Logs) |

---

## 4. Technical Architecture Details

### Clustering Algorithm (DBSCAN)
- **Epsilon (eps):** `0.003` (~300 meters)
- **Min Samples:** `3` violations
- **Metric:** Haversine distance formula to account for geographical latitude/longitude coordinate curvatures.
- **Output:** Combines isolated reports into a localized, named hotspot cluster representing a single bottleneck source.

### Machine Learning Classification (XGBoost)
- **Objective:** False-positive filtration.
- **Features:** confidence score, reporting user history rating, proximity to junctions, camera type.
- **Result:** Triage panel displays a "Mean Rejection Rate", automatically queuing high-confidence invalid reports for instant rejection, preventing BTP officers from wasting time on mock or malicious claims.

### Real-Time Routing Simulation
- Routes are generated as multiple street segment nodes starting from **BTP HQ Queen's Road Yard Depot** (`🏢`) to the target coordinate.
- The React component runs a high-precision `requestAnimationFrame` loop that interpolates the position of the tow truck (`🚛`) along the path coordinate segments.
- Hotspot impact reduction (representing cleared congestion) does not apply immediately; it triggers only when `truck.progress === 1.0` (i.e. `status === 'ON_SITE'`), providing a realistic simulation of police operational schedules.
