# Dharohar Atlas: 2:30 Official Video Demo Script & Timed Shot List
*Project: Digital Revitalisation of Unstructured Cultural & Architectural Heritage Archives (HC26-CULT01)*  
*Event: Blithchron '27, IIT Gandhinagar*  
*Submission: 4 Nov 2026*  

---

## Quick Reference Summary
- **Target Duration:** Exactly 2 minutes 30 seconds (150 seconds).
- **Core Narrative:** Transform scattered, unstructured cultural archives (photos, field notes, inscriptions, folios) into an interactive geospatial atlas, photogrammetric 3D digital twins, multilingual OCR, and citation-grounded semantic intelligence.
- **Key Real Queries Used:**
  - Semantic Search (Hindi): `रानी की वाव का निर्माण` (Detected Script: `HI`, Hybrid RRF)
  - Semantic Search (Gujarati): `અડાલજ ની વાવ` (Detected Script: `GU`, Hybrid RRF)
  - Ask the Archive: `Who commissioned Rani ki Vav and in which century was it constructed?` (Grounded citations to `[1]` Rani ki Vav dossier, `[2]` Patan Inscription Tablet, `[3]` Queen Udayamati Oral Tradition)

---

## Timed Shot List & Voiceover

### 0:00 – 0:20 | Act I: The Problem & Live Landing Page
- **Screen URL:** `http://localhost:3000/`
- **Visual Action:**
  1. Open the landing page. Point to the slow parallax stepwell illustration and headline: *"Digital Revitalisation of Unstructured Cultural & Architectural Heritage Archives"*.
  2. Hover over the **three live API stat counters**: **25 Verified Sites**, **87 Digitised Folios**, **190 Vector Embeddings**.
  3. Show the **"What is Real vs Sample Data"** transparency panel at the bottom.
- **Spoken Voiceover (20 sec):**
  > "Across India, thousands of priceless architectural surveys, stepwell photos, and regional manuscripts rot inside forgotten cloud folders and static decks. This is Dharohar Atlas—built for IIT Gandhinagar's Blithchron '27. In seconds, unstructured archives become an interactive geospatial atlas, photogrammetric 3D digital twins, and cited semantic intelligence—powered by live data from our API."

---

### 0:20 – 0:45 | Act II: Geospatial & Temporal Explorer
- **Screen URL:** `http://localhost:3000/explore`
- **Visual Action:**
  1. Click **"Explore Atlas"** in the navigation bar.
  2. Select state filter: **"Gujarat"**.
  3. Scrub the **Chronological Slider** from 700 CE to **1050 CE** (Solanki period). Notice contemporaneous monuments filter down in real time.
  4. Click the golden pin for **Rani ki Vav** in Patan. The site summary card slides in with coordinates, era badge, and links.
- **Spoken Voiceover (25 sec):**
  > "Our Geospatial Explorer runs on MapLibre GL with hardware acceleration. As we filter by Gujarat and drag the chronological timeline back to the 11th century Solanki era, the map dynamically isolates contemporaneous monuments. Clicking Rani ki Vav reveals its architectural dossier, GPS coordinates, and direct links to its 3D digital twin."

---

### 0:45 – 1:15 | Act III: Journey Mode (Progressive Route Animation)
- **Screen URL:** `http://localhost:3000/journeys/gujarat-stepwell-trail`
- **Visual Action:**
  1. Click **"Play a Journey"** or navigate to `/journeys/gujarat-stepwell-trail`.
  2. Click **"Animate Route"**.
  3. Observe the camera swooping smoothly with pitch and bearing along the 485 km overland route between Ahmedabad, Gandhinagar, Patan, and Modhera.
  4. Note the progressive gold trail line drawing itself across the terrain.
  5. Pause at **Stop 3: Rani ki Vav**. Highlight the arrival note (*"UNESCO World Heritage stepwell constructed by Queen Udayamati"*), historical source citation, linked folklore card, and click **"Inspect 3D Twin"**.
  6. Briefly toggle the accessible **"Text Version"** ordered list to demonstrate WCAG compliance.
- **Spoken Voiceover (30 sec):**
  > "Journey Mode brings ancient trade routes to life. As we hit play, the map animates an overland expedition along the Gujarat Stepwell Trail. The camera swoops with realistic pitch and bearing, drawing the travel path progressively. At each stop, rich story cards display verified historical arrival notes, oral folklore narratives, and linked archival records—with a full accessible text version for screen readers."

---

### 1:15 – 1:40 | Act IV: 3D Digital Twin & Subterranean Hotspots
- **Screen URL:** `http://localhost:3000/sites/rani-ki-vav`
- **Visual Action:**
  1. Land on the site dossier for **Rani ki Vav**.
  2. In the WebGL 3D viewer (React Three Fiber), orbit the subterranean stepwell model.
  3. Toggle **"Night Mode"** (switch to torchlit lamp-gold ambient illumination).
  4. Click the hotspot pill: **"Octagonal Well Shaft"**. Watch the camera smoothly focus on the hotspot while the architectural detail drawer slides out.
- **Spoken Voiceover (25 sec):**
  > "Every flagship site hosts an interactive 3D digital twin. Here, we explore Rani ki Vav's seven subterranean tiers in 3D space, toggle between daylight and evocative lamp-lit illumination, and click spatial hotspots to inspect the engineering of the deep water shaft and its intricate Maru-Gurjara carvings."

---

### 1:40 – 2:05 | Act V: Archival OCR & Human-in-the-Loop Verification
- **Screen URL:** `http://localhost:3000/archive`
- **Visual Action:**
  1. Click **"Archive"** in the navigation bar.
  2. Open the 1063 CE **Patan Inscription Tablet** folio.
  3. Show the three synchronized panes: original scanned manuscript, Devanagari OCR transcript, and English translation.
  4. Click Line 1 in the transcript: watch the high-resolution scan pan and draw an amber highlight box around the exact stone carving coordinate.
  5. Click **"Edit Line"**, change a word, and save a peer-reviewed correction with instant optimistic rollback resilience.
- **Spoken Voiceover (25 sec):**
  > "Next, our archival document pipeline. Raw scans of Devanagari and Gujarati epigraphs are parsed into bounding boxes with per-line confidence scoring. Hovering or clicking any transcript line highlights the exact coordinates on the manuscript. Archivists can submit peer-reviewed corrections in real time with an immutable audit trail."

---

### 2:05 – 2:30 | Act VI: Multilingual Semantic Search & Cited RAG Ask
- **Screen URL:** `http://localhost:3000/search` and `http://localhost:3000/ask`
- **Visual Action:**
  1. Click **"Search"** in nav.
  2. Type in Devanagari: `रानी की वाव का निर्माण` (Hit Enter).
  3. Point out the badge: `Detected script: HI` and the Reciprocal Rank Fusion of pgvector HNSW embeddings + full-text search.
  4. Click the **"Ask the Archive"** tab.
  5. Submit the question: *"Who commissioned Rani ki Vav and in which century was it constructed?"*
  6. Watch the streaming answer appear, citing `[1] Rani ki Vav (Patan, Gujarat)` and `[2] Patan Inscription Tablet (1063 CE)` with clickable pill links leading directly back to the archival folios.
- **Spoken Voiceover (25 sec):**
  > "Finally, our multilingual knowledge engine. A single search bar understands English, Hindi, and Gujarati using hybrid ranking with pgvector and PostgreSQL full-text search. In 'Ask the Archive', natural-language questions receive factual answers strictly grounded in our corpus, with inline clickable citations to the exact archival source. Zero hallucinations, verified provenance. Dharohar Atlas transforms static archives into living heritage. Thank you."

---

## Fallback & Recovery Contingencies During Video Recording
1. **Network Lag:** Both the FastAPI backend and Next.js frontend are hosted locally on `localhost:8000` and `localhost:3000`. Offline fallback fixtures are embedded into the client so that no network glitch can stall the recording.
2. **WebGL Context Loss:** The 3D viewer includes an automatic WebGL canvas fallback card with interactive thumbnail images and architectural specs.
3. **Demo Tour Shortcut:** Pressing the **"Demo Mode"** button on the navbar at any time activates the automated 9-step guided tour spotlight if you prefer a self-navigating walkthrough.
