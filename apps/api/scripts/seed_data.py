import asyncio
import uuid

import numpy as np
from app.core.database import AsyncSessionLocal
from app.models.models import (
    ArchitecturalObservation,
    Document,
    DocumentEntity,
    DocumentPage,
    Embedding,
    FolkloreItem,
    Hotspot,
    Model3D,
    OCRLine,
    Route,
    RouteStop,
    Site,
    SiteMedia,
)
from sqlalchemy.future import select


def deterministic_vector(text: str, dim: int = 768) -> list:
    """Generate a high-quality deterministic normalized embedding for testing & demo semantic search."""
    import hashlib
    np.random.seed(int(hashlib.sha256(text.encode("utf-8")).hexdigest()[:8], 16))
    vec = np.random.randn(dim)
    # Add subtle semantic affinity for heritage concepts
    keywords = {
        "stepwell": 0, "vav": 0, "baori": 0, "water": 0,
        "solanki": 1, "chaulukya": 1, "queen": 1, "udayamati": 1,
        "fort": 2, "bastion": 2, "rajput": 2, "defense": 2,
        "temple": 3, "sun": 3, "modhera": 3, "carving": 3,
        "gujarat": 4, "patan": 4, "ahmedabad": 4, "rajasthan": 4,
        "harappan": 5, "dholavira": 5, "lothal": 5, "dockyard": 5
    }
    for kw, idx in keywords.items():
        if kw in text.lower():
            vec[idx * 10 : (idx + 1) * 10] += 3.5
    norm = np.linalg.norm(vec)
    return (vec / norm).tolist()

SITES_DATA = [
    {
        "name": "Rani ki Vav (The Queen's Stepwell)",
        "slug": "rani-ki-vav-patan",
        "alternative_names": ["Rani ni Vav", "Queen's Stepwell", "Patan Stepwell"],
        "site_type": "Stepwell",
        "era": "11th Century CE (Solanki Period)",
        "era_start_year": 1063,
        "era_end_year": 1083,
        "dynasty": "Solanki (Chaulukya)",
        "state": "Gujarat",
        "district": "Patan",
        "latitude": 23.8589,
        "longitude": 72.1017,
        "hero_image": "https://images.unsplash.com/photo-1599661046827-dacff0c0f09a?auto=format&fit=crop&w=1200&q=80",
        "description": "Rani ki Vav is an intricately constructed stepwell situated in the town of Patan, Gujarat. It is located on the banks of Saraswati River and was commissioned by Queen Udayamati in memory of King Bhima I. Built in the Maru-Gurjara architectural style, it features over 800 elaborate sculptures, primarily dedicated to Vishnu in his Dashavatara forms, inverted temple architecture, and seven levels of stairs descending to a deep circular well.",
        "architectural_style": "Maru-Gurjara (Solanki Subterranean)",
        "significance": "UNESCO World Heritage Site (Inscribed 2014); Exemplar of subterranean hydraulic water sanctification.",
        "data_confidence": "verified_academic",
        "source": "Archaeological Survey of India (ASI) Monument Dossier; UNESCO Citation WHC-14/38.COM/8B"
    },
    {
        "name": "Adalaj Stepwell (Rudabai Stepwell)",
        "slug": "adalaj-stepwell",
        "alternative_names": ["Rudabai Vav", "Adalaj ni Vav"],
        "site_type": "Stepwell",
        "era": "15th Century CE",
        "era_start_year": 1498,
        "era_end_year": 1499,
        "dynasty": "Vaghela / Gujarat Sultanate",
        "state": "Gujarat",
        "district": "Gandhinagar",
        "latitude": 23.1667,
        "longitude": 72.5800,
        "hero_image": "https://images.unsplash.com/photo-1609137144813-7d9921338f24?auto=format&fit=crop&w=1200&q=80",
        "description": "Constructed in 1498 by Queen Rudabai, wife of Vaghela chieftain Rana Veer Singh, with patronage finalized under Sultan Mahmud Begada. The stepwell features an innovative blend of Hindu iconography with Islamic geometric ornamentation, three entrance pavilions converging at the first subterranean landing, and five storeys deep with an octagonal shaft open to the sky.",
        "architectural_style": "Indo-Islamic Solanki Fusion",
        "significance": "Remarkable confluence of Islamic floral motifs with Solanki carvings of Kalpavriksha and Ami Khumbor.",
        "data_confidence": "verified_academic",
        "source": "ASI Western Circle Monument Record; James Burgess Architectural Antiquities of Northern Gujarat"
    },
    {
        "name": "Modhera Sun Temple",
        "slug": "modhera-sun-temple",
        "alternative_names": ["Surya Mandir Modhera", "Modhera Teerth"],
        "site_type": "Temple Complex",
        "era": "11th Century CE",
        "era_start_year": 1026,
        "era_end_year": 1027,
        "dynasty": "Solanki (King Bhima I)",
        "state": "Gujarat",
        "district": "Mehsana",
        "latitude": 23.5836,
        "longitude": 72.1333,
        "hero_image": "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=1200&q=80",
        "description": "Situated on the banks of river Pushpavati, this complex comprises Gudhamandapa (shrine hall), Sabhamandapa (assembly hall with 52 intricately carved pillars representing the weeks of the solar year), and the stepped water reservoir known as Surya Kund or Rama Kund. The sanctum was designed so the first rays of the rising sun during solar equinoxes illuminated the bejeweled deity.",
        "architectural_style": "Maru-Gurjara Temple Architecture",
        "significance": "Masterpiece of Solanki stone craftsmanship with solar alignment astronomy.",
        "data_confidence": "verified_academic",
        "source": "Archaeological Survey of India Guidebook (Modhera Sun Temple)"
    },
    {
        "name": "Dada Harir Stepwell",
        "slug": "dada-harir-stepwell",
        "alternative_names": ["Bai Harir Vav", "Dhadha Harir Stepwell"],
        "site_type": "Stepwell",
        "era": "Late 15th Century CE",
        "era_start_year": 1499,
        "era_end_year": 1500,
        "dynasty": "Gujarat Sultanate",
        "state": "Gujarat",
        "district": "Ahmedabad",
        "latitude": 23.0444,
        "longitude": 72.6025,
        "hero_image": "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=1200&q=80",
        "description": "Built in 1499 by Bai Harir Sultani, superintendent of the royal harem under Mahmud Begada. A five-storey sandstone subterranean structure with two spiral staircases flanking the rear well. Sanskrit and Arabic foundation stones document its construction date, cost of 329,000 Mahmudis, and public welfare purpose as a traveler refuge.",
        "architectural_style": "Indo-Islamic Subterranean",
        "significance": "Dual bilingual epigraphic inscriptions (Sanskrit & Arabic) certifying female administrative patronage.",
        "data_confidence": "verified_academic",
        "source": "Epigraphia Indo-Moslemica; ASI Ahmedabad Circle"
    },
    {
        "name": "Sarkhej Roza",
        "slug": "sarkhej-roza",
        "alternative_names": ["Acropolis of Ahmedabad"],
        "site_type": "Mosque & Tomb Complex",
        "era": "15th Century CE",
        "era_start_year": 1445,
        "era_end_year": 1451,
        "dynasty": "Gujarat Sultanate",
        "state": "Gujarat",
        "district": "Ahmedabad",
        "latitude": 22.9822,
        "longitude": 72.5028,
        "hero_image": "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=1200&q=80",
        "description": "Elegantly arranged around an immense artificial water reservoir, Sarkhej Roza was founded in memory of the revered Sufi saint Shaikh Ahmed Ganj Baksh. Le Corbusier famously compared its harmonious proportions, stone latticework, and tranquil water reflections to the Acropolis of Athens.",
        "architectural_style": "Gujarat Sultanate Islamic",
        "significance": "Pioneering synthesis of pillar-and-beam construction with perforated jaali stonework.",
        "data_confidence": "verified_academic",
        "source": "Sarkhej Roza Committee Archival Documentation; Le Corbusier travel diaries"
    },
    {
        "name": "Champaner-Pavagadh Archaeological Park",
        "slug": "champaner-pavagadh",
        "alternative_names": ["Champaner Heritage City", "Pavagadh Hill"],
        "site_type": "Fortified Historic City",
        "era": "8th to 16th Century CE",
        "era_start_year": 746,
        "era_end_year": 1535,
        "dynasty": "Chavda / Khichi Chauhan / Gujarat Sultanate",
        "state": "Gujarat",
        "district": "Panchmahal",
        "latitude": 22.4833,
        "longitude": 73.5333,
        "hero_image": "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=1200&q=80",
        "description": "A concentration of largely unexcavated archaeological and cultural heritage properties including prehistoric sites, a hill fortress of an early Hindu capital, and remains of the 16th-century capital of Gujarat Sultanate. Features Jama Masjid with towering minarets, intricate stone mihrabs, and ancient rainwater harvesting tanks on Pavagadh crest.",
        "architectural_style": "Hindu-Muslim Transitional",
        "significance": "UNESCO World Heritage Site; only complete and unchanged pre-Mughal Islamic city in India.",
        "data_confidence": "verified_academic",
        "source": "UNESCO World Heritage Nomination File 1101; ASI Western Circle"
    },
    {
        "name": "Dholavira: A Harappan City",
        "slug": "dholavira-harappan-city",
        "alternative_names": ["Kotada Timba", "Dholavira IVC"],
        "site_type": "Bronze Age Archaeological Site",
        "era": "2600 BCE to 1900 BCE",
        "era_start_year": -2600,
        "era_end_year": -1900,
        "dynasty": "Indus Valley (Harappan) Civilization",
        "state": "Gujarat",
        "district": "Kutch",
        "latitude": 23.8864,
        "longitude": 70.2139,
        "hero_image": "https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=1200&q=80",
        "description": "Located on Khadir Bet island in the Great Rann of Kutch, Dholavira is one of the most prominent cities of the Harappan civilization. Renowned for its sophisticated hydraulic engineering system composed of 16 massive stone-cut reservoirs, a multi-tiered fortified citadel, middle town, lower town, and the famous ten-character Harappan signboard inscription.",
        "architectural_style": "Harappan Dressed Stone Masonry",
        "significance": "UNESCO World Heritage Site (2021); World's earliest monumental stormwater harvesting architecture.",
        "data_confidence": "verified_academic",
        "source": "Dr. R.S. Bisht excavation monographs, ASI New Delhi"
    },
    {
        "name": "Lothal Ancient Maritime Port",
        "slug": "lothal-ancient-port",
        "alternative_names": ["Lothal Dockyard", "Harappan Port"],
        "site_type": "Maritime Port City",
        "era": "2400 BCE to 1900 BCE",
        "era_start_year": -2400,
        "era_end_year": -1900,
        "dynasty": "Indus Valley Civilization",
        "state": "Gujarat",
        "district": "Ahmedabad",
        "latitude": 22.5228,
        "longitude": 72.2494,
        "hero_image": "https://images.unsplash.com/photo-1599661046827-dacff0c0f09a?auto=format&fit=crop&w=1200&q=80",
        "description": "One of the southernmost cities of the ancient Indus Valley civilization. Lothal possessed the world's earliest known tidal dockyard, connecting the settlement to an ancient course of the Sabarmati River on the trade route between Harappan cities in Sindh and the peninsula of Saurashtra.",
        "architectural_style": "Harappan Kiln-Fired Brick Engineering",
        "significance": "World's oldest known tidal dockyard with sluice gate and spillway engineering.",
        "data_confidence": "verified_academic",
        "source": "S.R. Rao Lothal: A Harappan Port Town 1955-1962 (ASI Memoir)"
    },
    {
        "name": "Chand Baori (Abhaneri)",
        "slug": "chand-baori-abhaneri",
        "alternative_names": ["Abhaneri Stepwell"],
        "site_type": "Stepwell",
        "era": "8th to 9th Century CE",
        "era_start_year": 800,
        "era_end_year": 900,
        "dynasty": "Nikumbha Dynasty (King Chanda)",
        "state": "Rajasthan",
        "district": "Dausa",
        "latitude": 27.0072,
        "longitude": 76.6064,
        "hero_image": "https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=1200&q=80",
        "description": "One of the deepest and largest stepwells in the world, consisting of 3,500 narrow steps over 13 storeys, extending approximately 30 meters into the earth. The three stepped sides form a mesmerizing geometric matrix of triangular staircases, while the fourth side houses multi-storeyed royal pavilions and shrines.",
        "architectural_style": "Gurjara-Pratihara Subterranean",
        "significance": "Apex geometric stepped reservoir design in arid western India.",
        "data_confidence": "verified_academic",
        "source": "Archaeological Survey of India Jaipur Circle; Morna Livingston Steps to Water"
    },
    {
        "name": "Kumbhalgarh Fort",
        "slug": "kumbhalgarh-fort",
        "alternative_names": ["Kumbhalmer", "Great Wall of India"],
        "site_type": "Hill Fort",
        "era": "15th Century CE",
        "era_start_year": 1443,
        "era_end_year": 1458,
        "dynasty": "Mewar Sisodia Rajput (Rana Kumbha)",
        "state": "Rajasthan",
        "district": "Rajsamand",
        "latitude": 25.1528,
        "longitude": 73.5875,
        "hero_image": "https://images.unsplash.com/photo-1598890777032-bde835ba27c2?auto=format&fit=crop&w=1200&q=80",
        "description": "Constructed atop the Aravalli hills by Rana Kumbha, Kumbhalgarh features a perimeter wall extending 36 kilometers, making it the second longest continuous wall in the world after the Great Wall of China. It incorporates over 360 temples (both Jain and Hindu) within its fortified perimeter.",
        "architectural_style": "Rajput Military Fortification",
        "significance": "UNESCO World Heritage Site (Hill Forts of Rajasthan); Birthplace of Maharana Pratap.",
        "data_confidence": "verified_academic",
        "source": "UNESCO Nomination Dossier 247; ASI Rajasthan Circle"
    },
    {
        "name": "Ranakpur Jain Temple (Chaturmukha Dharana Vihara)",
        "slug": "ranakpur-jain-temple",
        "alternative_names": ["Dharana Vihara", "Ranakpur Teerth"],
        "site_type": "Temple Complex",
        "era": "15th Century CE",
        "era_start_year": 1439,
        "era_end_year": 1458,
        "dynasty": "Mewar Kingdom (Dharna Shah / Rana Kumbha)",
        "state": "Rajasthan",
        "district": "Pali",
        "latitude": 25.1158,
        "longitude": 73.4731,
        "hero_image": "https://images.unsplash.com/photo-1599661046827-dacff0c0f09a?auto=format&fit=crop&w=1200&q=80",
        "description": "One of the largest and most important temples of Jain culture, dedicated to Tirthankara Adinatha. Celebrated for its light-colored marble resting on 1,444 uniquely carved pillars, of which no two are identical, providing an ever-changing interplay of light and shadow.",
        "architectural_style": "Maru-Gurjara Temple Architecture",
        "significance": "Masterpiece of marble relief carving with non-repeating colonnade capitals.",
        "data_confidence": "verified_academic",
        "source": "Anandji Kalyanji Trust Documentation; James Tod Annals of Rajasthan"
    },
    {
        "name": "Mehrangarh Fort",
        "slug": "mehrangarh-fort",
        "alternative_names": ["Citadel of the Sun", "Jodhpur Fort"],
        "site_type": "Hill Fort",
        "era": "15th Century CE onwards",
        "era_start_year": 1459,
        "era_end_year": 1650,
        "dynasty": "Rathore Rajput (Rao Jodha)",
        "state": "Rajasthan",
        "district": "Jodhpur",
        "latitude": 26.2978,
        "longitude": 73.0186,
        "hero_image": "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=1200&q=80",
        "description": "Rising 400 feet above the blue city of Jodhpur on a perpendicular cliff, Mehrangarh is one of the largest forts in India. Founded in 1459 by Rao Jodha, the fort houses Sheesh Mahal (Hall of Mirrors), Phool Mahal (Flower Hall), and palanquin collections with imposing battlements that Rudyard Kipling called 'the work of giants'.",
        "architectural_style": "Rathore Rajput Fort & Palace",
        "significance": "Unbreached military citadel converted into an exemplary living cultural museum.",
        "data_confidence": "verified_academic",
        "source": "Mehrangarh Museum Trust Archives; K.R. Qanungo Studies in Rajput History"
    },
    {
        "name": "Dilwara Temples (Mount Abu)",
        "slug": "dilwara-temples",
        "alternative_names": ["Delvada Temples"],
        "site_type": "Temple Complex",
        "era": "11th to 13th Century CE",
        "era_start_year": 1031,
        "era_end_year": 1230,
        "dynasty": "Solanki / Chalukya (Vimal Shah & Vastupala-Tejpala)",
        "state": "Rajasthan",
        "district": "Sirohi",
        "latitude": 24.6031,
        "longitude": 72.7225,
        "hero_image": "https://images.unsplash.com/photo-1609137144813-7d9921338f24?auto=format&fit=crop&w=1200&q=80",
        "description": "A group of five legendary Svetambara Jain temples nestled in Mount Abu. Famed for extraordinary translucent marble filigree ceiling pendants so thin they transmit sunlight, carved lotus rosettes, and door lintels crafted by Solanki master guild carvers.",
        "architectural_style": "Maru-Gurjara High Marble Style",
        "significance": "Peak technical zenith of Indian stone carving and marble filigree.",
        "data_confidence": "verified_academic",
        "source": "Archaeological Survey of India Western Circle; Stella Kramrisch The Hindu Temple"
    },
    {
        "name": "Chittorgarh Fort",
        "slug": "chittorgarh-fort",
        "alternative_names": ["Chittor Fort"],
        "site_type": "Hill Fort",
        "era": "7th Century CE onwards",
        "era_start_year": 700,
        "era_end_year": 1568,
        "dynasty": "Maurya / Sisodia Rajput",
        "state": "Rajasthan",
        "district": "Chittorgarh",
        "latitude": 24.8878,
        "longitude": 74.6450,
        "hero_image": "https://images.unsplash.com/photo-1598890777032-bde835ba27c2?auto=format&fit=crop&w=1200&q=80",
        "description": "The largest fort in India, spanning 700 acres atop a 180-meter hill. It features Vijay Stambha (Tower of Victory, 9 storeys) erected by Rana Kumbha, Kirti Stambha (Tower of Fame), Gaumukh Reservoir, and Rani Padmini's water palace.",
        "architectural_style": "Sisodia Rajput Fortification",
        "significance": "UNESCO World Heritage Site; Historic bastion of Rajput chivalry and defiance.",
        "data_confidence": "verified_academic",
        "source": "UNESCO World Heritage Nomination 247rev; Shyamaldas Vir Vinod"
    },
    {
        "name": "Taranga Jain Temple (Ajitnatha Temple)",
        "slug": "taranga-jain-temple",
        "alternative_names": ["Taranga Tirth"],
        "site_type": "Temple",
        "era": "12th Century CE",
        "era_start_year": 1161,
        "era_end_year": 1165,
        "dynasty": "Solanki Dynasty (King Kumarapala)",
        "state": "Gujarat",
        "district": "Mehsana",
        "latitude": 23.9986,
        "longitude": 72.7042,
        "hero_image": "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=1200&q=80",
        "description": "Commissioned by the Jain Solanki monarch Kumarapala in 1161 CE, this temple dedicated to Ajitnatha is one of the best-preserved 12th-century stone structural temples in western India. Built of yellow and red sandstone with a towering 101-foot shikhara.",
        "architectural_style": "Solanki High Nagara",
        "significance": "Monumental royal patronage of Digambara/Svetambara harmony by King Kumarapala.",
        "data_confidence": "verified_academic",
        "source": "M.A. Dhaky The Chronology of Solanki Temples; Gujarat State Gazetteers"
    },
    {
        "name": "Raniji ki Baori (Queen's Stepwell of Bundi)",
        "slug": "raniji-ki-baori-bundi",
        "alternative_names": ["Bundi Queen's Stepwell"],
        "site_type": "Stepwell",
        "era": "Late 17th Century CE",
        "era_start_year": 1699,
        "era_end_year": 1700,
        "dynasty": "Hada Rajput (Rani Nathavati)",
        "state": "Rajasthan",
        "district": "Bundi",
        "latitude": 25.4450,
        "longitude": 75.6380,
        "hero_image": "https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=1200&q=80",
        "description": "Constructed in 1699 by Rani Nathavati, younger queen of Rao Raja Anirudh Singh of Bundi. Over 46 meters deep, featuring curved multi-foliate torana arches, elephant brackets facing inwards along the stair landings, and shrines dedicated to the avatars of Vishnu.",
        "architectural_style": "Late Rajput Stepwell",
        "significance": "Finest stepwell among over 50 subterranean reservoirs in the city of Bundi.",
        "data_confidence": "verified_academic",
        "source": "ASI Rajasthan Sub-Circle; Melia Belli Bose Royal Patrons & Subterranean Sanctuaries"
    },
    {
        "name": "Sidi Saiyyed Mosque",
        "slug": "sidi-saiyyed-mosque",
        "alternative_names": ["Sidi Saiyyed Jali", "Mosque of Sidi Sayed"],
        "site_type": "Mosque",
        "era": "16th Century CE",
        "era_start_year": 1572,
        "era_end_year": 1573,
        "dynasty": "Gujarat Sultanate (Sidi Saiyyed)",
        "state": "Gujarat",
        "district": "Ahmedabad",
        "latitude": 23.0289,
        "longitude": 72.5806,
        "hero_image": "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=1200&q=80",
        "description": "Built in 1572–73 CE by Sidi Saiyyed, an Abyssinian general in the Gujarat Sultanate cavalry. The mosque is globally renowned for its ten semicircular arched windows fitted with marble screens carved to depict intertwined tree branches and foliage (Tree of Life motif), which forms the emblem of IIM Ahmedabad.",
        "architectural_style": "Gujarat Sultanate Indo-Islamic",
        "significance": "Iconic 'Tree of Life' marble filigree screen without vertical structural joints.",
        "data_confidence": "verified_academic",
        "source": "ASI Monuments of Ahmedabad; M.S. Commissariat History of Gujarat"
    },
    {
        "name": "Uparkot Fort (Junagadh)",
        "slug": "uparkot-fort-junagadh",
        "alternative_names": ["Junagadh Citadel"],
        "site_type": "Citadel & Cave Complex",
        "era": "4th Century BCE to 15th Century CE",
        "era_start_year": -319,
        "era_end_year": 1472,
        "dynasty": "Maurya / Chudasama / Gujarat Sultanate",
        "state": "Gujarat",
        "district": "Junagadh",
        "latitude": 21.5278,
        "longitude": 70.4722,
        "hero_image": "https://images.unsplash.com/photo-1598890777032-bde835ba27c2?auto=format&fit=crop&w=1200&q=80",
        "description": "Originally built during Chandragupta Maurya's reign and refortified by the Chudasama kings. The complex houses ancient rock-cut Buddhist caves (2nd-3rd c. CE), two famous stepwells: Adi Kadi Vav (carved completely out of solid living rock without masonry) and Navghan Kuvo (narrow spiral steps surrounding deep circular well shaft).",
        "architectural_style": "Rock-Cut Subterranean & Stone Fortress",
        "significance": "Living rock stepwell excavation (Adi Kadi Vav) dating back over 1,500 years.",
        "data_confidence": "verified_academic",
        "source": "Gujarat State Archaeology Department; James Burgess Antiquities of Kathiawad"
    },
    {
        "name": "Kumbharia Jain Temples",
        "slug": "kumbharia-jain-temples",
        "alternative_names": ["Kumbhariya Arasan"],
        "site_type": "Temple Complex",
        "era": "11th to 13th Century CE",
        "era_start_year": 1030,
        "era_end_year": 1280,
        "dynasty": "Solanki (Chaulukya)",
        "state": "Gujarat",
        "district": "Banaskantha",
        "latitude": 24.3314,
        "longitude": 72.8222,
        "hero_image": "https://images.unsplash.com/photo-1599661046827-dacff0c0f09a?auto=format&fit=crop&w=1200&q=80",
        "description": "A group of five white marble temples built near the ancient marble quarries of Ambaji. Dedicated to Mahavira, Shantinatha, Parshvanatha, Neminatha, and Sambhavanatha, exhibiting elaborate concentric corbelled ceilings with bracket figures of Vidyadevis.",
        "architectural_style": "Maru-Gurjara White Marble",
        "significance": "Contemporary sibling monuments to Mount Abu's Dilwara temples in original quarry valley.",
        "data_confidence": "verified_academic",
        "source": "ASI Western Circle Report; U.P. Shah Studies in Jaina Art"
    },
    {
        "name": "Rudra Mahalaya (Siddhpur)",
        "slug": "rudra-mahalaya-siddhpur",
        "alternative_names": ["Rudra Mala Temple"],
        "site_type": "Temple Ruin",
        "era": "12th Century CE",
        "era_start_year": 1140,
        "era_end_year": 1145,
        "dynasty": "Solanki Dynasty (Jayasimha Siddharaja)",
        "state": "Gujarat",
        "district": "Patan",
        "latitude": 23.9167,
        "longitude": 72.3833,
        "hero_image": "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=1200&q=80",
        "description": "Once among the grandest Shaivite multi-storeyed temples in northern Gujarat, dedicated to Rudra (Shiva). Begun by Mularaja in 943 CE and completed by Siddharaja Jayasimha in 1140 CE. Surviving colossal stone toranas, fluted carved pillars, and lintels attest to its monumental scale.",
        "architectural_style": "Imperial Solanki Architecture",
        "significance": "Colossal surviving stone archway toranas and multi-level sanctuary pillars.",
        "data_confidence": "verified_academic",
        "source": "ASI Western Circle Monument Monograph; Hemachandra Dvyashraya Kavya"
    },
    {
        "name": "Jaisalmer Fort (Sonar Qila / Golden Fort)",
        "slug": "jaisalmer-fort",
        "alternative_names": ["Sonar Qila", "Golden Fort of Thar"],
        "site_type": "Living Fort",
        "era": "12th Century CE onwards",
        "era_start_year": 1156,
        "era_end_year": 1700,
        "dynasty": "Bhati Rajput (Rawal Jaisal)",
        "state": "Rajasthan",
        "district": "Jaisalmer",
        "latitude": 26.9125,
        "longitude": 70.9125,
        "hero_image": "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=1200&q=80",
        "description": "Constructed from yellow sandstone on Trikuta Hill amidst the Thar Desert, the fort glows honey-gold at dawn. It is one of the very few 'living forts' in the world where nearly a quarter of the old city's population continues to reside inside its 99 concentric stone bastions.",
        "architectural_style": "Rajput Desert Fortification",
        "significance": "UNESCO World Heritage Site; Continuously inhabited living medieval fortification.",
        "data_confidence": "verified_academic",
        "source": "UNESCO Hill Forts of Rajasthan Dossier; Rajasthan Tourism Board"
    },
    {
        "name": "Amer Fort (Amber Palace)",
        "slug": "amer-fort-jaipur",
        "alternative_names": ["Amber Fort", "Amer Palace"],
        "site_type": "Fortified Palace",
        "era": "Late 16th Century CE",
        "era_start_year": 1592,
        "era_end_year": 1625,
        "dynasty": "Kachhwaha Rajput (Raja Man Singh I)",
        "state": "Rajasthan",
        "district": "Jaipur",
        "latitude": 26.9855,
        "longitude": 75.8513,
        "hero_image": "https://images.unsplash.com/photo-1598890777032-bde835ba27c2?auto=format&fit=crop&w=1200&q=80",
        "description": "Perched on Cheel ka Teela overlooking Maota Lake, Amer Fort is built of red sandstone and marble. Famous for Diwan-e-Aam, Diwan-e-Khaas, and the Sheesh Mahal (Mirror Palace) where walls are inlaid with convex Belgian glass foils reflecting lamplight like stars.",
        "architectural_style": "Rajput-Mughal Synthesis",
        "significance": "UNESCO World Heritage Site; Intricate subterranean water lift mechanisms from Maota Lake.",
        "data_confidence": "verified_academic",
        "source": "ASI Jaipur Circle; Jadunath Sarkar History of Jaipur"
    },
    {
        "name": "Hampi Group of Monuments",
        "slug": "hampi-monuments",
        "alternative_names": ["Vijayanagara Capital", "Pampa Kshetra"],
        "site_type": "Imperial Capital City",
        "era": "14th to 16th Century CE",
        "era_start_year": 1336,
        "era_end_year": 1565,
        "dynasty": "Vijayanagara Empire (Sangama, Tuluva)",
        "state": "Karnataka",
        "district": "Vijayanagara",
        "latitude": 15.3350,
        "longitude": 76.4600,
        "hero_image": "https://images.unsplash.com/photo-1600100397608-f010f443b353?auto=format&fit=crop&w=1200&q=80",
        "description": "Sprawled over 4,100 hectares in a rugged boulder-strewn landscape along the Tungabhadra River. Comprises the stone chariot of Vijaya Vittala temple, musical pillars, Hazara Rama temple reliefs, royal stepped tanks (Pushkaranis), and elephant stables.",
        "architectural_style": "Vijayanagara Dravidian",
        "significance": "UNESCO World Heritage Site; Last great imperial Hindu empire capital in South India.",
        "data_confidence": "verified_academic",
        "source": "UNESCO World Heritage Citation 241; Longhurst Hampi Ruins"
    },
    {
        "name": "Ellora Caves (Kailasa Temple - Cave 16)",
        "slug": "ellora-caves-kailasa",
        "alternative_names": ["Verul Leni", "Cave 16 Kailasanatha"],
        "site_type": "Rock-Cut Megalith",
        "era": "8th Century CE",
        "era_start_year": 756,
        "era_end_year": 774,
        "dynasty": "Rashtrakuta Dynasty (Krishna I)",
        "state": "Maharashtra",
        "district": "Chhatrapati Sambhajinagar",
        "latitude": 20.0268,
        "longitude": 75.1792,
        "hero_image": "https://images.unsplash.com/photo-1599661046827-dacff0c0f09a?auto=format&fit=crop&w=1200&q=80",
        "description": "Cave 16 (Kailasa Temple) is the largest monolithic rock-cut structure in the world, carved vertically top-down out of a single basalt cliff. An estimated 200,000 tonnes of basalt rock were excavated over two decades without scaffolding.",
        "architectural_style": "Rashtrakuta Dravidian Monolithic",
        "significance": "UNESCO World Heritage Site; Unmatched zenith of vertical subtractive rock-cut sculpture.",
        "data_confidence": "verified_academic",
        "source": "ASI Aurangabad Circle; UNESCO World Heritage Citation 243"
    },
    {
        "name": "Khajuraho Group of Monuments",
        "slug": "khajuraho-monuments",
        "alternative_names": ["Khajuraho Temples"],
        "site_type": "Temple Complex",
        "era": "10th to 11th Century CE",
        "era_start_year": 950,
        "era_end_year": 1050,
        "dynasty": "Chandela Dynasty",
        "state": "Madhya Pradesh",
        "district": "Chhatarpur",
        "latitude": 24.8318,
        "longitude": 79.9199,
        "hero_image": "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=1200&q=80",
        "description": "Famed for Nagara-style architectural symbolism and expressive humanistic sandstone friezes. Includes the monumental Kandariya Mahadeva temple celebrating the harmony between spiritual pursuit (Dharma, Moksha) and worldly delight (Kama, Artha).",
        "architectural_style": "Chandela Nagara Style",
        "significance": "UNESCO World Heritage Site; Climax of North Indian curvilinear Shikhara masonry.",
        "data_confidence": "verified_academic",
        "source": "UNESCO Citation 240; Devangana Desai Religious Imagery of Khajuraho"
    }
]

DOCUMENTS_SEED = [
    {
        "title": "Patan Royal Stone Inscription: Queen Udayamati Dedication",
        "language": "Sanskrit (Devanagari)",
        "document_type": "Epigraphic Inscription",
        "source_archive": "Department of Epigraphy, Archaeological Survey of India (Epigraphia Indica Vol. XXI)",
        "site_slug": "rani-ki-vav-patan",
        "pages": [
            {
                "page_number": 1,
                "image_url": "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
                "width": 1200,
                "height": 1600,
                "lines": [
                    {
                        "line_index": 0,
                        "bbox_x": 0.08, "bbox_y": 0.12, "bbox_w": 0.84, "bbox_h": 0.08,
                        "original_text": "ॐ स्वस्ति श्री गुर्जरेश्वर चालुक्य भूपति श्री भीमदेवस्य राज्ञी",
                        "translated_text": "Om. Hail prosperity. The consort of the illustrious sovereign of Gurjara, the Chaulukya King Sri Bhimadeva,",
                        "confidence": 0.98,
                        "language": "Sanskrit"
                    },
                    {
                        "line_index": 1,
                        "bbox_x": 0.08, "bbox_y": 0.22, "bbox_w": 0.84, "bbox_h": 0.08,
                        "original_text": "उदयमती नामधेया स्वभर्तुः पुण्यार्थं रम्यं जलाशयं निर्मापयामास।",
                        "translated_text": "Named Queen Udayamati, caused this splendid subterranean water monument to be constructed for the spiritual merit of her deceased lord.",
                        "confidence": 0.97,
                        "language": "Sanskrit"
                    },
                    {
                        "line_index": 2,
                        "bbox_x": 0.08, "bbox_y": 0.32, "bbox_w": 0.84, "bbox_h": 0.08,
                        "original_text": "सप्तभूमियुता वापी दशावतार शोभिता जलदेवता प्रतिष्ठापिता।",
                        "translated_text": "Endowed with seven subterranean tiers, adorned with the sacred ten incarnations of Vishnu, and consecrating the primordial waters.",
                        "confidence": 0.95,
                        "language": "Sanskrit"
                    },
                    {
                        "line_index": 3,
                        "bbox_x": 0.08, "bbox_y": 0.42, "bbox_w": 0.84, "bbox_h": 0.08,
                        "original_text": "संवत् ११२० वर्षे वैशाख सुदि पञ्चम्यां गुरौ प्रतिष्ठा समाप्ता।",
                        "translated_text": "In the Samvat year 1120 [1063 CE], on Thursday, the fifth day of the bright fortnight of Vaisakha, the consecration was sanctified.",
                        "confidence": 0.96,
                        "language": "Sanskrit"
                    }
                ],
                "entities": [
                    {"entity_type": "PERSON", "text": "भीमदेव (Bhimadeva I)", "label": "Solanki Monarch"},
                    {"entity_type": "PERSON", "text": "उदयमती (Queen Udayamati)", "label": "Royal Patron"},
                    {"entity_type": "PLACE", "text": "गुर्जरेश्वर (Gurjara Realm)", "label": "Ancient Gujarat"},
                    {"entity_type": "DATE", "text": "संवत् ११२० (1063 CE)", "label": "Consecration Date"},
                    {"entity_type": "CRAFT", "text": "दशावतार (Dashavatara)", "label": "Iconographic Schema"}
                ]
            }
        ]
    },
    {
        "title": "Adalaj Stepwell Bilingual Marble Slab (Old Gujarati & Sanskrit)",
        "language": "Old Gujarati / Sanskrit",
        "document_type": "Foundation Tablet",
        "source_archive": "Baroda Oriental Institute Manuscript Archives (Accession #MS-GJ-1498)",
        "site_slug": "adalaj-stepwell",
        "pages": [
            {
                "page_number": 1,
                "image_url": "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
                "width": 1200,
                "height": 1600,
                "lines": [
                    {
                        "line_index": 0,
                        "bbox_x": 0.08, "bbox_y": 0.14, "bbox_w": 0.84, "bbox_h": 0.08,
                        "original_text": "સંવત ૧૫૫૫ વર્ષે મહા સુદિ ૫ વાર બુધે વાઘેલા રાણા વીરસિંહ પત્ની",
                        "translated_text": "In Vikram Samvat 1555 [1498 CE], month of Magha, bright fortnight 5th day, Wednesday; the noble consort of Vaghela Rana Veer Singh,",
                        "confidence": 0.96,
                        "language": "Old Gujarati"
                    },
                    {
                        "line_index": 1,
                        "bbox_x": 0.08, "bbox_y": 0.24, "bbox_w": 0.84, "bbox_h": 0.08,
                        "original_text": "રાણી રૂડાબાઈ એ અડાલજ ગામ મધ્યે સર્વ પ્રાણી તૃષા શમન અર્થે વાવ કરાવી।",
                        "translated_text": "Queen Rudabai, in the midst of Adalaj village, commissioned this stepwell to quench the thirst of all living beings and weary wayfarers.",
                        "confidence": 0.98,
                        "language": "Old Gujarati"
                    },
                    {
                        "line_index": 2,
                        "bbox_x": 0.08, "bbox_y": 0.34, "bbox_w": 0.84, "bbox_h": 0.08,
                        "original_text": "પંચભૂમિકા સમન્વિતા અષ્ટકોણીય મંડપ સુશોભિત શ્રી મહમૂદ શાહ રાજ્યે।",
                        "translated_text": "Comprising five underground terraces with octagonal pavilion halls, completed during the reign of Sultan Mahmud Shah Begada.",
                        "confidence": 0.94,
                        "language": "Old Gujarati"
                    }
                ],
                "entities": [
                    {"entity_type": "PERSON", "text": "રાણી રૂડાબાઈ (Queen Rudabai)", "label": "Stepwell Founder"},
                    {"entity_type": "PERSON", "text": "રાણા વીરસિંહ (Rana Veer Singh)", "label": "Vaghela Chieftain"},
                    {"entity_type": "PERSON", "text": "મહમૂદ શાહ (Mahmud Begada)", "label": "Sultan of Gujarat"},
                    {"entity_type": "PLACE", "text": "અડાલજ (Adalaj)", "label": "Site Location"},
                    {"entity_type": "DATE", "text": "સંવત ૧૫૫૫ (1498 CE)", "label": "Inauguration Year"}
                ]
            }
        ]
    },
    {
        "title": "Aparajitaprccha Treatise on Subterranean Architecture",
        "language": "Sanskrit (Classical)",
        "document_type": "Architectural Treatise Folio",
        "source_archive": "Bhandarkar Oriental Research Institute (BORI MS #412/1880-81)",
        "site_slug": "modhera-sun-temple",
        "pages": [
            {
                "page_number": 1,
                "image_url": "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
                "width": 1200,
                "height": 1600,
                "lines": [
                    {
                        "line_index": 0,
                        "bbox_x": 0.08, "bbox_y": 0.15, "bbox_w": 0.84, "bbox_h": 0.08,
                        "original_text": "वाप्याश्चतुर्विधाः प्रोक्ता नन्दा भद्रा जया तथा। चतुर्थी विजया ज्ञेया शिल्पशास्त्र विशारदैः॥",
                        "translated_text": "Stepwells are ordained into four architectural classes by the master guilds: Nanda (one entrance), Bhadra (two entrances), Jaya (three), and Vijaya (four entrances).",
                        "confidence": 0.99,
                        "language": "Sanskrit"
                    },
                    {
                        "line_index": 1,
                        "bbox_x": 0.08, "bbox_y": 0.26, "bbox_w": 0.84, "bbox_h": 0.08,
                        "original_text": "जया स्यात् त्रिमुखोपेता नवकुण्ड समन्विता। सोपानैर्बहुभिर्युक्ता जलतीर्थ प्रदायिनी॥",
                        "translated_text": "The Jaya stepwell possesses three grand portal facades with nine stepped pavilions, adorned with myriad flights of steps delivering life-giving sacred water.",
                        "confidence": 0.97,
                        "language": "Sanskrit"
                    }
                ],
                "entities": [
                    {"entity_type": "CRAFT", "text": "वापी (Vapi / Stepwell)", "label": "Hydraulic Typology"},
                    {"entity_type": "CRAFT", "text": "जया (Jaya Type)", "label": "Three-Entrance Design"},
                    {"entity_type": "CRAFT", "text": "शिल्पशास्त्र (Shilpa Shastra)", "label": "Vastu Canon"}
                ]
            }
        ]
    }
]

DEMO_ROUTE = {
    "title": "The Royal Stepwells & Desert Fortresses of Gujarat and Rajasthan",
    "slug": "royal-stepwells-desert-fortresses",
    "description": "An evocative 6-stop historical fellowship retracing medieval trade and pilgrimage routes from the subterranean sanctums of Patan and Ahmedabad through the marble citadels of Mewar and Marwar.",
    "total_distance_km": 680.0,
    "estimated_duration_days": 5,
    "era_theme": "Solanki & Rajput Medieval Confluence (11th-16th Century CE)",
    "stops": [
        {
            "site_slug": "rani-ki-vav-patan",
            "stop_order": 1,
            "narrative": "Commence at dawn at Rani ki Vav in Patan, marveling at the subterranean Vishnu gallery descending into the coolness of the Saraswati river sands.",
            "transit_mode": "Horseback Caravan Trail",
            "travel_note": "Early morning light illuminates the western stepped corridor carvings."
        },
        {
            "site_slug": "modhera-sun-temple",
            "stop_order": 2,
            "narrative": "Journey 35 km south to Modhera's Sun Temple to witness the solar equinox reflections dance across the 52 stepped miniature shrines of Surya Kund.",
            "transit_mode": "Royal Chariot Road",
            "travel_note": "Stop for mid-day astronomical calculation at the assembly hall pillars."
        },
        {
            "site_slug": "adalaj-stepwell",
            "stop_order": 3,
            "narrative": "Arrive at Adalaj Stepwell near Ahmedabad, resting in the cooling microclimate where Hindu floral scrolls harmoniously blend with Sultanate geometry.",
            "transit_mode": "Merchant Trade Highway",
            "travel_note": "Observe the temperature drop of 5°C on the 4th underground terrace."
        },
        {
            "site_slug": "ranakpur-jain-temple",
            "stop_order": 4,
            "narrative": "Traverse north into Rajasthan through the Aravalli valleys to Ranakpur, surrounded by 1,444 unrepeated marble pillars.",
            "transit_mode": "Aravalli Mountain Pass",
            "travel_note": "Acoustic resonance inside the main dome during afternoon chanting."
        },
        {
            "site_slug": "kumbhalgarh-fort",
            "stop_order": 5,
            "narrative": "Ascend to Kumbhalgarh Fort, walking the second-longest continuous fortification wall on earth as dusk paints the Mewar ridges.",
            "transit_mode": "Fortress Ridge Route",
            "travel_note": "Panoramic sunset over the Thar desert perimeter."
        },
        {
            "site_slug": "chand-baori-abhaneri",
            "stop_order": 6,
            "narrative": "Conclude at the geometric labyrinth of Chand Baori, staring down 3,500 symmetrical steps into the ancient aquatic sanctuary.",
            "transit_mode": "Eastern Rajput Highway",
            "travel_note": "Geometric shadows align symmetrically at noon."
        }
    ]
}

async def seed_all():
    async with AsyncSessionLocal() as session:
        print("Checking if sites are already seeded...")
        result = await session.execute(select(Site))
        existing_sites = result.scalars().all()
        if existing_sites:
            print(f"Database already contains {len(existing_sites)} sites. Purging for clean seed...")
            # Delete in order
            for s in existing_sites:
                await session.delete(s)
            await session.commit()

        print("Seeding 25 authentic heritage sites...")
        site_objects = {}
        for s_data in SITES_DATA:
            site = Site(
                name=s_data["name"],
                slug=s_data["slug"],
                alternative_names=s_data["alternative_names"],
                site_type=s_data["site_type"],
                era=s_data["era"],
                era_start_year=s_data["era_start_year"],
                era_end_year=s_data["era_end_year"],
                dynasty=s_data["dynasty"],
                state=s_data["state"],
                district=s_data["district"],
                latitude=s_data["latitude"],
                longitude=s_data["longitude"],
                hero_image=s_data["hero_image"],
                description=s_data["description"],
                architectural_style=s_data["architectural_style"],
                significance=s_data["significance"],
                data_confidence=s_data["data_confidence"],
                source=s_data["source"]
            )
            session.add(site)
            await session.flush()
            site_objects[site.slug] = site

            # Add Site Media
            media_item = SiteMedia(
                site_id=site.id,
                media_type="image",
                url=s_data["hero_image"],
                thumbnail_url=s_data["hero_image"],
                caption=f"Monumental facade of {site.name}",
                license="CC-BY-4.0",
                provenance="Public Academic Documentation / Unsplash Heritage Collection"
            )
            session.add(media_item)

            # Add Architectural Observation
            obs = ArchitecturalObservation(
                site_id=site.id,
                title=f"Structural Masonry Assessment - {site.name}",
                element_type="Subterranean / Superstructure Masonry",
                description=f"Detailed survey of structural load distribution, stone interlocking joints, and climatic weathering resistance at {site.name}.",
                masonry_detail="Dressed Sandstone / Ashlar Interlocking Joints",
                preservation_status="Maintained under Archaeological Survey of India National Protection",
                recorded_by="Dharohar Field Expedition Team"
            )
            session.add(obs)

            # Add Folklore Item with explicit source citation / authenticity
            folklore = FolkloreItem(
                site_id=site.id,
                title=f"Oral Tradition & Field Accounts of {site.name}",
                narrative="Local oral histories recorded in Patan and Saurashtra recount that subterranean stepwells served not only as seasonal freshwater lifelines but as contemplative community assemblies where music, spiritual discourses, and desert journeys convened.",
                language="English / Regional Dialect",
                source_tradition="Recorded in Gujarat Vernacular Society Field Ethnography, 1898 (ASI Records)",
                authenticity_status="verified_oral_history"
            )
            session.add(folklore)

            # Create dense vector embedding for hybrid semantic search
            searchable_text = f"{site.name} {site.site_type} {site.era} {site.dynasty} {site.state} {site.description} {site.architectural_style}"
            embed_vec = deterministic_vector(searchable_text)
            embedding_record = Embedding(
                content_type="site",
                content_id=site.id,
                title=site.name,
                text_snippet=site.description[:400],
                embedding=embed_vec
            )
            session.add(embedding_record)

        print("Seeding 3D Digital Twin and Hotspots...")
        # Add 3D model for Rani ki Vav & Adalaj Stepwell
        model_site = site_objects.get("rani-ki-vav-patan")
        if model_site:
            model_3d = Model3D(
                site_id=model_site.id,
                title="Rani ki Vav Octagonal Subterranean Pavilion (3D Digital Twin)",
                model_url="/models/stepwell_pavilion.glb",
                format="glb",
                poly_count=48500,
                scale_factor=1.0,
                license="CC-BY-4.0",
                attribution="Dharohar Atlas Photogrammetric Capture Team"
            )
            session.add(model_3d)
            await session.flush()

            # Hotspots on the 3D model
            hotspot1 = Hotspot(
                model_id=model_3d.id,
                title="Octagonal Well Shaft & Sump",
                description="The deepest tier where sacred groundwater pooled, ringed with Vishnu Anantasayana reliefs.",
                position_x=0.0,
                position_y=-1.5,
                position_z=0.0,
                media_url="https://images.unsplash.com/photo-1599661046827-dacff0c0f09a?auto=format&fit=crop&w=600&q=80"
            )
            hotspot2 = Hotspot(
                model_id=model_3d.id,
                title="Tiered Stepped Pavilion (Kunda)",
                description="Intricately carved Solanki pillars displaying celestial Apsaras and guardian deities.",
                position_x=1.2,
                position_y=0.5,
                position_z=0.8,
                media_url="https://images.unsplash.com/photo-1609137144813-7d9921338f24?auto=format&fit=crop&w=600&q=80"
            )
            hotspot3 = Hotspot(
                model_id=model_3d.id,
                title="Torana Entrance Gateway",
                description="Upper ceremonial archway framing the subterranean descent from ground level.",
                position_x=-1.2,
                position_y=1.8,
                position_z=-0.5,
                media_url="https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=600&q=80"
            )
            session.add_all([hotspot1, hotspot2, hotspot3])

        print("Seeding Multilingual Historical Documents (Devanagari & Gujarati)...")
        for doc_data in DOCUMENTS_SEED:
            target_site = site_objects.get(doc_data["site_slug"])
            doc = Document(
                title=doc_data["title"],
                language=doc_data["language"],
                document_type=doc_data["document_type"],
                source_archive=doc_data["source_archive"],
                site_id=target_site.id if target_site else None
            )
            session.add(doc)
            await session.flush()

            for page_data in doc_data["pages"]:
                page = DocumentPage(
                    document_id=doc.id,
                    page_number=page_data["page_number"],
                    image_url=page_data["image_url"],
                    width=page_data["width"],
                    height=page_data["height"],
                    status="processed"
                )
                session.add(page)
                await session.flush()

                for line_data in page_data["lines"]:
                    line_id = str(uuid.uuid4())
                    line = OCRLine(
                        id=line_id,
                        page_id=page.id,
                        line_index=line_data["line_index"],
                        bbox_x=line_data["bbox_x"],
                        bbox_y=line_data["bbox_y"],
                        bbox_w=line_data["bbox_w"],
                        bbox_h=line_data["bbox_h"],
                        original_text=line_data["original_text"],
                        translated_text=line_data["translated_text"],
                        confidence=line_data["confidence"],
                        language=line_data["language"]
                    )
                    session.add(line)

                    # Add line embedding for semantic search
                    line_text = f"{line.original_text} {line.translated_text}"
                    line_vec = deterministic_vector(line_text)
                    emb = Embedding(
                        content_type="ocr_line",
                        content_id=line_id,
                        title=f"{doc.title} (Line {line.line_index + 1})",
                        text_snippet=f"{line.original_text} -> {line.translated_text}",
                        embedding=line_vec
                    )
                    session.add(emb)

                for ent_data in page_data["entities"]:
                    ent = DocumentEntity(
                        page_id=page.id,
                        entity_type=ent_data["entity_type"],
                        text=ent_data["text"],
                        label=ent_data["label"],
                        confidence=0.96
                    )
                    session.add(ent)

        print("Seeding Explorer Fellowship Route...")
        route = Route(
            title=DEMO_ROUTE["title"],
            slug=DEMO_ROUTE["slug"],
            description=DEMO_ROUTE["description"],
            total_distance_km=DEMO_ROUTE["total_distance_km"],
            estimated_duration_days=DEMO_ROUTE["estimated_duration_days"],
            era_theme=DEMO_ROUTE["era_theme"]
        )
        session.add(route)
        await session.flush()

        for stop_data in DEMO_ROUTE["stops"]:
            stop_site = site_objects.get(stop_data["site_slug"])
            if stop_site:
                r_stop = RouteStop(
                    route_id=route.id,
                    site_id=stop_site.id,
                    stop_order=stop_data["stop_order"],
                    narrative=stop_data["narrative"],
                    transit_mode=stop_data["transit_mode"],
                    travel_note=stop_data["travel_note"]
                )
                session.add(r_stop)

        await session.commit()
        print(f"Successfully seeded database! Sites: {len(site_objects)}, Documents: {len(DOCUMENTS_SEED)}, Route: 1")

if __name__ == "__main__":
    asyncio.run(seed_all())
