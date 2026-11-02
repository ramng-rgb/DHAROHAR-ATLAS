from typing import Dict

HERITAGE_GLOSSARY: Dict[str, str] = {
    "vav": "stepwell (subterranean tiered water structure)",
    "baoli": "stepwell (stepped masonry reservoir)",
    "baori": "stepwell (subterranean stepped water monument)",
    "jharokha": "jharokha (ornate cantilevered stone balcony)",
    "kund": "stepped tank or sacred water reservoir",
    "kunda": "stepped water tank with geometric staircases",
    "toran": "torana (ceremonial sculpted gateway/arch)",
    "torana": "ceremonial sculpted gateway arch",
    "shikhara": "shikhara (curvilinear superstructure / temple spire)",
    "mandapa": "mandapa (pillared hall preceding the sanctum)",
    "chhatri": "chhatri (elevated dome-shaped pavilion / cenotaph)",
    "gajadhara": "gajadhara (master architect and chief sculptor)",
    "pata": "pata (painted narrative scroll or charter)",
    "pradakshina": "pradakshina (circumambulatory pathway)",
    "garbhagriha": "garbhagriha (inner sanctum sanctorum)",
    "vapi": "subterranean stepwell (vapi)",
    "vapi shilpa": "subterranean stepwell architecture and engineering",
    "jal mandir": "water pavilion",
    "sarovar": "sacred lake or masonry tank",
    "talav": "water reservoir or masonry tank",
    "samvat": "Vikram Samvat calendar era",
    "pratishtha": "sacred consecration ceremony",
    "shilpashastra": "classical treatises on architecture and sculpture"
}

GLOSSARY_PROMPT_INSTRUCTION = (
    "When translating historical, epigraphic, and architectural documents of India, "
    "preserve specialized heritage architectural terminology with contextual explanatory glosses in parentheses. "
    "Examples of terms to preserve and gloss:\n"
    + "\n".join([f"- {k}: {v}" for k, v in list(HERITAGE_GLOSSARY.items())[:16]])
)
