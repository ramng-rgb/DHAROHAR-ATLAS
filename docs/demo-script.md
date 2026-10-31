# Dharohar Atlas: 3-Minute Video Presentation Script & Timed Shot List
*Blithchron '27, IIT Gandhinagar (HC26-CULT01)*

---

## Shot List & Narrator Timing

### 0:00 – 0:25 | The Problem & Landing Reveal
- **Visual Action:** Open `http://localhost:3000/`. Slow scroll through cinematic landing page, highlighting the stepwell parallax and the IITGN problem statement header.
- **Narrator:** 
  > "Across India, thousands of priceless architectural surveys, stepwell photos, and regional manuscripts rot inside forgotten cloud folders and PowerPoint decks. This is Dharohar Atlas—a living knowledge layer built for IIT Gandhinagar's Blithchron '27 hackathon. In seconds, unstructured archives become interactive GIS maps, 3D digital twins, and cited semantic intelligence."

### 0:25 – 0:55 | Geospatial & Temporal Explorer
- **Visual Action:** Click **"Explorer Map"**. Filter by `Type: Stepwell` and drag the Chronological Era Slider back to `1100 CE`. Click on **Rani ki Vav** marker.
- **Narrator:**
  > "Our Geospatial Explorer runs on MapLibre GL with hardware acceleration. As we slide back across time to the 11th-century Solanki period, only contemporaneous monuments appear. Notice Rani ki Vav in Patan—clicking opens an instant summary card with direct links to its 3D twin and academic provenance."

### 0:55 – 1:25 | 3D Digital Twin & Subterranean Hotspots
- **Visual Action:** Click **"Full Dossier & 3D"** to navigate to `/sites/rani-ki-vav-patan`. In the 3D viewer, rotate the octagonal pavilion, toggle to **Night Mode** (lamp-lit glow), and click the gold **"Octagonal Well Shaft"** hotspot to open the architectural drawer.
- **Narrator:**
  > "Every monument can host a photogrammetric 3D digital twin rendered via React Three Fiber. Here, we can inspect Rani ki Vav's subterranean tiers in full 3D space, toggle between daylight and torchlit night illumination, and interact with spatial hotspots detailing Hindu water sanctification."

### 1:25 – 1:55 | Archive OCR, Translation & Human-in-the-Loop Review
- **Visual Action:** Click **"Archive OCR"** in the top navigation. Hover over the bounding boxes on the 1063 CE Patan stone inscription scan. Click **"Correct"** on Line 1, edit a word, and click **"Save Peer-Reviewed Revision"**.
- **Narrator:**
  > "Next, our multilingual OCR and translation pipeline. We take raw high-resolution scans of Devanagari and Old Gujarati inscriptions and extract bounding boxes with per-line confidence scores. Most importantly, we provide a human-in-the-loop review workflow where archivists can correct text and translations in real-time, instantly versioning the record."

### 1:55 – 2:30 | Multilingual Semantic Search & "Ask the Archive" RAG
- **Visual Action:** Click **"Ask Archive"**. In the search bar, type `वाव निर्माण` (Hindi/Gujarati for Stepwell construction) and switch between Hybrid RRF and Ask Archive mode. Show the grounded answer with inline `[1]`, `[2]` citations.
- **Narrator:**
  > "Under the hood, Dharohar Atlas uses pgvector HNSW embeddings fused with PostgreSQL trigram matching using Reciprocal Rank Fusion. Our benchmark evaluation achieves a 100% Recall@5. With 'Ask the Archive', users can ask complex questions in natural language, receiving responses backed strictly by peer-cited archival sources without hallucination."

### 2:30 – 3:00 | Journey Mode & Closing Impact
- **Visual Action:** Click **"Journey Mode"**. Click **"Animate Journey"** to watch the caravan line trace between Patan, Modhera, Adalaj, and Kumbhalgarh with stopping observation cards.
- **Narrator:**
  > "Finally, Journey Mode animates historical fellowship trails across Gujarat and Rajasthan, bringing oral folklore and architectural surveys to life along ancient trade corridors. Dharohar Atlas revitalises our cultural heritage from static decks into an enduring living archive. Thank you."
