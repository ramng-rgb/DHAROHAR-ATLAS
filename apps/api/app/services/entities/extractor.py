import re
import unicodedata
import logging
from typing import List, Dict, Optional, Tuple, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.models import Site, Dynasty
from app.services.entities.base import ExtractedEntity, ExtractedMention, EntityExtractionResult

logger = logging.getLogger(__name__)

def normalize_text_for_matching(text: str) -> str:
    nfkc = unicodedata.normalize("NFKC", text.lower())
    # remove punctuation
    cleaned = re.sub(r"[^\w\s]", " ", nfkc)
    return " ".join(cleaned.split())

def string_similarity(s1: str, s2: str) -> float:
    n1 = normalize_text_for_matching(s1)
    n2 = normalize_text_for_matching(s2)
    if n1 == n2:
        return 1.0
    if not n1 or not n2:
        return 0.0
    if n1 in n2 or n2 in n1:
        return 0.85
    # Token overlap (Jaccard)
    t1 = set(n1.split())
    t2 = set(n2.split())
    intersection = len(t1 & t2)
    union = len(t1 | t2)
    if union == 0:
        return 0.0
    return intersection / union

class EntityExtractionProvider:
    def __init__(self, db: Optional[AsyncSession] = None):
        self.db = db

    async def extract_and_link(
        self,
        lines: List[Dict[str, Any]]  # [{"id": str, "line_no": int, "text": str}]
    ) -> EntityExtractionResult:
        """
        Runs rule-based gazetteer pass and fuzzy site linking.
        Maps character spans back to lines.
        """
        # Load sites and dynasties from DB if session provided
        known_sites: List[Dict[str, str]] = []
        known_dynasties: List[str] = []

        if self.db:
            try:
                site_res = await self.db.execute(select(Site.id, Site.name, Site.name_hi, Site.name_gu, Site.slug))
                for s_id, s_name, s_hi, s_gu, s_slug in site_res.all():
                    known_sites.append({"id": s_id, "name": s_name, "hi": s_hi or "", "gu": s_gu or "", "slug": s_slug})

                dyn_res = await self.db.execute(select(Dynasty.name))
                known_dynasties = [d[0] for d in dyn_res.all()]
            except Exception as exc:
                logger.warning("Could not query DB for entity gazetteer: %s", exc)

        # Built-in fallback gazetteer
        gazetteer: List[Tuple[str, str, List[str]]] = [
            # (canonical_name, kind, search_patterns)
            ("Rani ki Vav", "place", ["rani ki vav", "पाटन वापी", "પાટણ વાવ", "queen's stepwell", "patna vapi", "पाटन", "પાટણ"]),
            ("Adalaj Stepwell", "place", ["adalaj", "અડાલજ", "अडालज", "adalaj stepwell", "અડાલજ વાવ", "rudabai stepwell"]),
            ("Modhera Sun Temple", "place", ["modhera", "મોઢેરા", "मोढेरा", "sun temple modhera"]),
            ("Saraswati River", "place", ["सरस्वती", "સરસ્વતી", "saraswati river", "saraswati"]),
            ("Chaulukya Dynasty", "dynasty", ["chaulukya", "solanki", "चालुक्य", "સોલંકી", "सोलंकी"]),
            ("Vaghela Dynasty", "dynasty", ["vaghela", "વાઘેલા", "वाघेला"]),
            ("Queen Udayamati", "person", ["udayamati", "उदयमती", "ઉદયમતી"]),
            ("Queen Rudabai", "person", ["rudabai", "રૂડાબાઈ", "रूड़ाबाई", "રૂડા"]),
            ("Gajadhar Mala", "person", ["gajadhar mala", "શિલ્પકાર ગજધર", "गजधर", "गजधराः", "mala"]),
            ("Lord Vishnu", "deity", ["vishnu", "विष्णु", "વિષ્ણુ", "दशावतार"]),
            ("Surya", "deity", ["surya", "सूर्य", "સૂર્ય"]),
            ("Stepwell Vapi", "artifact", ["वापी", "વાવ", "vav", "stepwell", "vapi"]),
            ("Vikram Samvat 1063", "date", ["संवत् १०६३", "१०६३", "1063 ce", "1063"]),
            ("Vikram Samvat 1555", "date", ["સંવત ૧૫૫૫", "૧૫૫૫", "1498 ce", "1555"])
        ]

        # Add DB sites to gazetteer if not present
        existing_names = {g[0].lower() for g in gazetteer}
        for s in known_sites:
            if s["name"].lower() not in existing_names:
                patterns = [s["name"].lower()]
                if s["hi"]:
                    patterns.append(s["hi"].lower())
                if s["gu"]:
                    patterns.append(s["gu"].lower())
                gazetteer.append((s["name"], "place", patterns))

        for dyn in known_dynasties:
            if dyn.lower() not in existing_names:
                gazetteer.append((dyn, "dynasty", [dyn.lower()]))

        entities_map: Dict[str, ExtractedEntity] = {}
        mentions: List[ExtractedMention] = []

        for line_obj in lines:
            line_id = line_obj.get("id", "")
            line_no = line_obj.get("line_no", 1)
            line_text = line_obj.get("text", "")
            if not line_text:
                continue

            for canon_name, kind, patterns in gazetteer:
                for pat in patterns:
                    # Find exact substring match in line_text (case-insensitive)
                    pattern_re = re.compile(re.escape(pat), re.IGNORECASE)
                    for match in pattern_re.finditer(line_text):
                        char_start, char_end = match.span()
                        norm_name = normalize_text_for_matching(canon_name)

                        if canon_name not in entities_map:
                            # Attempt site linking
                            linked_site_id = None
                            link_conf = None
                            if kind == "place" and known_sites:
                                best_sim = 0.0
                                best_id = None
                                for s in known_sites:
                                    sim = max(
                                        string_similarity(canon_name, s["name"]),
                                        string_similarity(pat, s["name"]),
                                        string_similarity(pat, s["hi"]),
                                        string_similarity(pat, s["gu"])
                                    )
                                    if sim > best_sim:
                                        best_sim = sim
                                        best_id = s["id"]
                                if best_sim >= 0.70:
                                    linked_site_id = best_id
                                    link_conf = round(best_sim, 2)

                            entities_map[canon_name] = ExtractedEntity(
                                kind=kind,
                                name=canon_name,
                                normalised_name=norm_name,
                                linked_site_id=linked_site_id,
                                link_confidence=link_conf
                            )

                        mentions.append(
                            ExtractedMention(
                                line_id=line_id,
                                line_no=line_no,
                                char_start=char_start,
                                char_end=char_end,
                                confidence=0.95,
                                entity_name=canon_name,
                                entity_kind=kind
                            )
                        )
                        break  # Match first valid pattern for this entity on this line

        return EntityExtractionResult(
            entities=list(entities_map.values()),
            mentions=mentions
        )
