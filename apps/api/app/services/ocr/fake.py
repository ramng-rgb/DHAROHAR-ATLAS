from typing import List, Optional
from app.services.ocr.base import OCRProvider, OCRDocumentData, OCRPageData, OCRLineData, BoundingBox

class FakeOCRProvider(OCRProvider):
    @property
    def name(self) -> str:
        return "fake_ocr"

    async def recognise(
        self,
        image_bytes: bytes,
        lang_hints: Optional[List[str]] = None,
        mime: str = "image/jpeg"
    ) -> OCRDocumentData:
        hints = [h.lower() for h in (lang_hints or ["devanagari"])]

        if any("gu" in h for h in hints):
            script = "Gujarati"
            lines = [
                OCRLineData(
                    line_no=1,
                    text="સંવત ૧૫૫૫ વર્ષે મહા વદિ ૫ બુધે વાવ પ્રતિષ્ઠા સંપૂર્ણા",
                    bbox=BoundingBox(x=0.08, y=0.10, w=0.84, h=0.07),
                    confidence=0.96,
                    lang="gu",
                    engine=self.name
                ),
                OCRLineData(
                    line_no=2,
                    text="શ્રી વાઘેલા વંશરાણી રૂડાબાઈએ અડાલજ મહાનગરે નિર્માણ કરાવ્યું",
                    bbox=BoundingBox(x=0.08, y=0.19, w=0.84, h=0.07),
                    confidence=0.94,
                    lang="gu",
                    engine=self.name
                ),
                OCRLineData(
                    line_no=3,
                    text="પંચભૂમિકા યુક્ત વાવ સ્થાપત્ય જળ સંરક્ષણાર્થે સમર્પિત",
                    bbox=BoundingBox(x=0.08, y=0.28, w=0.84, h=0.07),
                    confidence=0.95,
                    lang="gu",
                    engine=self.name
                ),
                OCRLineData(
                    line_no=4,
                    text="શિલ્પકાર ગજધર માલા તથા સહયોગીઓએ આ શિલાલેખ કોતરેલ છે",
                    bbox=BoundingBox(x=0.08, y=0.37, w=0.84, h=0.07),
                    confidence=0.92,
                    lang="gu",
                    engine=self.name
                )
            ]
        elif any("en" in h or "eng" in h for h in hints):
            script = "Latin"
            lines = [
                OCRLineData(
                    line_no=1,
                    text="ARCHAEOLOGICAL SURVEY OF WESTERN INDIA — VOLUME IV",
                    bbox=BoundingBox(x=0.10, y=0.09, w=0.80, h=0.06),
                    confidence=0.99,
                    lang="en",
                    engine=self.name
                ),
                OCRLineData(
                    line_no=2,
                    text="Monograph on Subterranean Architecture of Gujarat: Rani ki Vav at Patan",
                    bbox=BoundingBox(x=0.10, y=0.17, w=0.80, h=0.06),
                    confidence=0.97,
                    lang="en",
                    engine=self.name
                ),
                OCRLineData(
                    line_no=3,
                    text="Constructed by Queen Udayamati during the Solanki (Chaulukya) period in 1063 CE.",
                    bbox=BoundingBox(x=0.10, y=0.25, w=0.80, h=0.06),
                    confidence=0.98,
                    lang="en",
                    engine=self.name
                ),
                OCRLineData(
                    line_no=4,
                    text="Features seven pillared pavilions descending to the Saraswati aquifer level.",
                    bbox=BoundingBox(x=0.10, y=0.33, w=0.80, h=0.06),
                    confidence=0.95,
                    lang="en",
                    engine=self.name
                )
            ]
        else:
            # Default Devanagari / Sanskrit / Hindi
            script = "Devanagari"
            lines = [
                OCRLineData(
                    line_no=1,
                    text="ॐ स्वस्ति श्री चालुक्य राज्ञी उदयमती पाटन वापी निर्माणाय",
                    bbox=BoundingBox(x=0.08, y=0.10, w=0.84, h=0.07),
                    confidence=0.98,
                    lang="hi",
                    engine=self.name
                ),
                OCRLineData(
                    line_no=2,
                    text="संवत् १०६३ वर्षे सरस्वती नद्याः तीरे सप्तभूमियुता वापी प्रतिष्ठिता",
                    bbox=BoundingBox(x=0.08, y=0.19, w=0.84, h=0.07),
                    confidence=0.96,
                    lang="hi",
                    engine=self.name
                ),
                OCRLineData(
                    line_no=3,
                    text="दशावतार विष्णुपूजनार्थं स्थापत्यकला निपुणैः शिल्पिभिः निर्मिता",
                    bbox=BoundingBox(x=0.08, y=0.28, w=0.84, h=0.07),
                    confidence=0.94,
                    lang="hi",
                    engine=self.name
                ),
                OCRLineData(
                    line_no=4,
                    text="सप्ततलेषु अष्टशतं विष्णोः मूर्तीनां संकीर्तनं शिलासु उत्कीर्णम्",
                    bbox=BoundingBox(x=0.08, y=0.37, w=0.84, h=0.07),
                    confidence=0.93,
                    lang="hi",
                    engine=self.name
                )
            ]

        page = OCRPageData.create(page_no=1, width=1200, height=1600, lines=lines)
        return OCRDocumentData.from_pages(pages=[page], detected_script=script, engine_name=self.name)
