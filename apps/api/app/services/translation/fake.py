import logging
from typing import List, Dict
from app.services.translation.base import (
    TranslationProvider,
    TranslationInputLine,
    TranslationOutputLine,
    TranslationResult
)
from app.services.translation.glossary import HERITAGE_GLOSSARY

logger = logging.getLogger(__name__)

KNOWN_PAIRS: Dict[str, str] = {
    "ॐ स्वस्ति श्री चालुक्य राज्ञी उदयमती पाटन वापी निर्माणाय":
        "Om. Hail auspiciousness. Queen Udayamati of the Chaulukya (Solanki) dynasty commissioned this subterranean stepwell (vapi) in Patan.",
    "संवत् १०६३ वर्षे सरस्वती नद्याः तीरे सप्तभूमियुता वापी प्रतिष्ठिता":
        "In the Vikram Samvat year 1063 [1006 CE], the seven-tiered stepwell (vav) was consecrated on the banks of the Saraswati River.",
    "दशावतार विष्णुपूजनार्थं स्थापत्यकला निपुणैः शिल्पिभिः निर्मिता":
        "Constructed for the worship of the ten incarnations of Vishnu by master sculptors skilled in Vastu shilpashastra.",
    "सप्ततलेषु अष्टशतं विष्णोः मूर्तीनां संकीर्तनं शिलासु उत्कीर्णम्":
        "Across seven subterranean storeys, over eight hundred sculptures commemorating Vishnu are carved in sandstone relief.",
    "સંવત ૧૫૫૫ વર્ષે મહા વદિ ૫ બુધે વાવ પ્રતિષ્ઠા સંપૂર્ણા":
        "In the Vikram Samvat year 1555 on Wednesday the 5th day of the dark half of Magha, the consecration (pratishtha) of the stepwell (vav) was completed.",
    "શ્રી વાઘેલા વંશરાણી રૂડાબાઈએ અડાલજ મહાનગરે નિર્માણ કરાવ્યું":
        "Queen Rudabai of the Vaghela dynasty patronized its construction in the historic settlement of Adalaj.",
    "પંચભૂમિકા યુક્ત વાવ સ્થાપત્ય જળ સંરક્ષણાર્થે સમર્પિત":
        "Endowed with five subterranean storeys, this stepwell (vav) architecture is dedicated to water conservation and traveler repose.",
    "શિલ્પકાર ગજધર માલા તથા સહયોગીઓએ આ શિલાલેખ કોતરેલ છે":
        "Master stone architect (gajadhara) Mala and his guild engraved this foundation inscription.",
    "ARCHAEOLOGICAL SURVEY OF WESTERN INDIA — VOLUME IV":
        "Archaeological Survey of Western India — Volume IV (Official Monograph Series).",
    "Monograph on Subterranean Architecture of Gujarat: Rani ki Vav at Patan":
        "Monograph on Subterranean Architecture of Gujarat: Rani ki Vav (The Queen's Stepwell) at Patan.",
    "Constructed by Queen Udayamati during the Solanki (Chaulukya) period in 1063 CE.":
        "Constructed under the patronage of Queen Udayamati during the Solanki (Chaulukya) period in 1063 CE.",
    "Features seven pillared pavilions descending to the Saraswati aquifer level.":
        "Features seven subterranean pillared pavilions (mandapas) descending to the Saraswati aquifer level."
}

class FakeTranslationProvider(TranslationProvider):
    @property
    def name(self) -> str:
        return "fake_translation"

    async def translate_line(self, text: str, source_lang: str, target_lang: str = "en") -> str:
        clean = text.strip()
        if clean in KNOWN_PAIRS:
            return KNOWN_PAIRS[clean]

        # Gloss substitution heuristic
        translated = clean
        for term, gloss in HERITAGE_GLOSSARY.items():
            if term.lower() in clean.lower():
                pass

        # Informative translation fallback
        return f"[English translation of '{clean}']"

    async def translate_batch(
        self,
        lines: List[TranslationInputLine],
        source_lang: str,
        target_lang: str = "en"
    ) -> TranslationResult:
        out_lines: List[TranslationOutputLine] = []
        for l in lines:
            t = await self.translate_line(l.text, source_lang, target_lang)
            out_lines.append(
                TranslationOutputLine(
                    line_no=l.line_no,
                    source_text=l.text,
                    translated_text=t,
                    target_lang=target_lang,
                    engine=self.name
                )
            )
        return TranslationResult(lines=out_lines, engine=self.name, target_lang=target_lang)
