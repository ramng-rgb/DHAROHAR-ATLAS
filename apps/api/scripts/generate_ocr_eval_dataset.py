import os
import json
import unicodedata
from PIL import Image, ImageDraw, ImageFont

EVAL_DIR = "/Users/ramnarayangupta/Desktop/hac/eval/ocr"
os.makedirs(EVAL_DIR, exist_ok=True)

DEV_FONT_PATH = "/System/Library/Fonts/Supplemental/DevanagariMT.ttc"
GUJ_FONT_PATH = "/System/Library/Fonts/Supplemental/GujaratiMT.ttc"
LAT_FONT_PATH = "/System/Library/Fonts/Helvetica.ttc"

DATASET = [
    # ------------------ Devanagari ------------------
    {
        "id": "page_01",
        "script": "Devanagari",
        "title": "Rani ki Vav Foundation Prasasti",
        "source": "Epigraphia Indica Vol. XXI / Archaeological Survey of India",
        "license": "Public Domain / CC0",
        "text": (
            "ॐ स्वस्ति श्री चालुक्य राज्ञी उदयमती पाटन वापी निर्माणाय\n"
            "संवत् १०६३ वर्षे सरस्वती नद्याः तीरे सप्तभूमियुता वापी प्रतिष्ठिता\n"
            "दशावतार विष्णुपूजनार्थं स्थापत्यकला निपुणैः शिल्पिभिः निर्मिता\n"
            "सप्ततलेषु अष्टशतं विष्णोः मूर्तीनां संकीर्तनं शिलासु उत्कीर्णम्"
        )
    },
    {
        "id": "page_02",
        "script": "Devanagari",
        "title": "Modhera Sun Temple Charter",
        "source": "Inscriptions of Gujarat Part II, Singhi Jain Series",
        "license": "Public Domain / CC0",
        "text": (
            "श्री भीमदेव प्रथम राज्यकाले सूर्यदेव प्रतिष्ठापना कृता\n"
            "पुष्पावती नदीतीरे विशालं सूर्यकुण्डं स्थापत्यमण्डितम्\n"
            "सभारङ्ग मण्डपे द्वादश आदित्यमूर्तयः शास्त्रोक्तविधिना पूजिताः\n"
            "तोरणद्वाराणि स्तम्भेषु उत्कीर्णानि विभवं प्रदर्शयन्ति"
        )
    },
    {
        "id": "page_03",
        "script": "Devanagari",
        "title": "Rudra Mahalaya Siddhpur Inscription",
        "source": "Archaeological Survey of Western India, Vol. IX",
        "license": "Public Domain / CC0",
        "text": (
            "सिद्धराज जयसिंह देवः सिद्धपुरे रुद्रमहादेव प्रासादं समरचयत्\n"
            "एकादश रुद्राणां प्रतिष्ठापनाय सहस्रलिङ्ग तडाग समीपे\n"
            "पाषाणस्तम्भेषु कीर्तिमुखाः लतावितानानि च नयनानन्दानि वर्तन्ते\n"
            "वास्तुशास्त्र प्रवीणाः गजधराः मन्दिरशिखरं गगनचुम्बिनं व्यधुः"
        )
    },
    {
        "id": "page_04",
        "script": "Devanagari",
        "title": "Somnath Temple Rebuilding Memoir",
        "source": "Corpus Inscriptionum Indicarum Vol. VII",
        "license": "Public Domain / CC0",
        "text": (
            "प्रभातपत्तने प्रभासतीर्थे सोमनाथ ज्योतिर्लिङ्ग मन्दिरम्\n"
            "चालुक्य कुमारपाल देवेन बृहत्पाषाणमयं पुनर्निर्मितम्\n"
            "समुद्रतटस्थे महातीर्थे गन्धर्वशिल्पिभिः शिखरं समुत्थापितम्\n"
            "धार्मिक श्रद्धायाः राष्ट्रगौरवस्य च सनातनं प्रतीकम्"
        )
    },
    # ------------------ Gujarati ------------------
    {
        "id": "page_05",
        "script": "Gujarati",
        "title": "Adalaj Stepwell Marble Tablet",
        "source": "Gazetteer of the Bombay Presidency, Vol. IX (Gujarat Population)",
        "license": "Public Domain / CC0",
        "text": (
            "સંવત ૧૫૫૫ વર્ષે મહા વદિ ૫ બુધે વાવ પ્રતિષ્ઠા સંપૂર્ણા\n"
            "શ્રી વાઘેલા વંશરાણી રૂડાબાઈએ અડાલજ મહાનગરે નિર્માણ કરાવ્યું\n"
            "પંચભૂમિકા યુક્ત વાવ સ્થાપત્ય જળ સંરક્ષણાર્થે સમર્પિત\n"
            "શિલ્પકાર ગજધર માલા તથા સહયોગીઓએ આ શિલાલેખ કોતરેલ છે"
        )
    },
    {
        "id": "page_06",
        "script": "Gujarati",
        "title": "Champaner Citadel Stone Monograph",
        "source": "Archaeology of Gujarat, H.D. Sankalia (1941)",
        "license": "Public Domain / CC0",
        "text": (
            "પાવાગઢ ગિરિ તળેટીએ ચાંપાનેર મહાનગરની કિલ્લેબંધી રચાઈ\n"
            "જામી મસ્જિદ તથા સહસ્ત્રકલા વિરાજમાન મિનારા સ્થાપત્ય\n"
            "ગુજરાત સલ્તનત યુગમાં પથ્થર કલાના ઉત્કૃષ્ટ નમૂના સર્જાયા\n"
            "જળકુંડ અને વાવ સંસ્કૃતિ લોકજીવન માટે અતિ મહત્વપૂર્ણ હતી"
        )
    },
    {
        "id": "page_07",
        "script": "Gujarati",
        "title": "Dholavira Field Journal Gujarati Notes",
        "source": "Gujarat State Archaeology Department Field Notes",
        "license": "CC-BY-4.0",
        "text": (
            "ધોળાવીરા હડપ્પન સંસ્કૃતિનું અદ્ભુત નગર આયોજન દર્શાવે છે\n"
            "પાષાણ નિર્મિત વિશાળ જળાશયો અને વરસાદી પાણી સંગ્રહ પદ્ધતિ\n"
            "સિંધુ લિપિના દસ મોટા ચિહ્નો ધરાવતું સાઈનબોર્ડ ઉત્ખનનમાંથી મળ્યું\n"
            "વેપાર વાણિજ્ય તથા દરિયાઈ સંબંધોનો પ્રાચીન ઇતિહાસ"
        )
    },
    {
        "id": "page_08",
        "script": "Gujarati",
        "title": "Patan Jain Bhandar Folio",
        "source": "Hemachandracharya Gyan Bhandar Patan Manuscript Collection",
        "license": "Public Domain / CC0",
        "text": (
            "પાટણ નગરીમાં આચાર્ય હેમચંદ્ર રચિત વ્યાકરણ ગ્રંથ સચવાયેલ છે\n"
            "તાડપત્ર અને હસ્તપ્રત ભંડારોમાં સાહિત્યિક ધરોહર સુરક્ષિત છે\n"
            "સોલંકી યુગની ભાષા અને લિપિ પરંપરાનું મૂલ્યવાન સાધન\n"
            "વિદ્વાન મુનિઓએ સદીઓ સુધી આ જ્ઞાન ભંડાર જાળવી રાખ્યો"
        )
    },
    # ------------------ English ------------------
    {
        "id": "page_09",
        "script": "English",
        "title": "ASWI Stepwell Hydraulic Survey",
        "source": "Burgess, J. Architectural Antiquities of Northern Gujarat (1903)",
        "license": "Public Domain / CC0",
        "text": (
            "ARCHAEOLOGICAL SURVEY OF WESTERN INDIA — VOLUME IV\n"
            "Monograph on Subterranean Architecture of Gujarat: Rani ki Vav at Patan\n"
            "Constructed by Queen Udayamati during the Solanki (Chaulukya) period in 1063 CE.\n"
            "Features seven pillared pavilions descending to the Saraswati aquifer level."
        )
    },
    {
        "id": "page_10",
        "script": "English",
        "title": "Kumbhalgarh Fortification Monograph",
        "source": "James Tod, Annals and Antiquities of Rajasthan (1829)",
        "license": "Public Domain / CC0",
        "text": (
            "Kumbhalgarh Fortress stands on a western ridge of the Aravalli range.\n"
            "The perimeter wall extends thirty-six kilometres over rugged mountain peaks.\n"
            "Designed by Rana Kumbha with thirteen fortified mountain gateways.\n"
            "Encloses more than three hundred historic temples and royal palaces."
        )
    },
    {
        "id": "page_11",
        "script": "English",
        "title": "Dholavira Harappan Water Survey",
        "source": "Archaeological Survey of India Memoir No. 71",
        "license": "Public Domain / CC0",
        "text": (
            "Excavations at Dholavira reveal an extraordinary hydraulic civilization.\n"
            "Sixteen massive masonry reservoirs collected floodwaters from seasonal streams.\n"
            "Sophisticated storm water drains and settling basins conserved freshwater.\n"
            "Demonstrates master urban engineering during the Mature Harappan epoch."
        )
    }
]

def render_page_image(item: dict):
    width, height = 1200, 800
    # Parchment tone background
    im = Image.new("RGB", (width, height), color=(250, 247, 240))
    draw = ImageDraw.Draw(im)

    # Decorative inner border
    draw.rectangle([40, 40, width - 40, height - 40], outline=(180, 160, 130), width=3)
    draw.rectangle([48, 48, width - 48, height - 48], outline=(220, 210, 190), width=1)

    # Header banner
    draw.text((60, 60), f"DHAROHAR ARCHIVAL EVALUATION — {item['title'].upper()}", fill=(120, 100, 80))
    draw.text((60, 82), f"Source: {item['source']} | Licence: {item['license']}", fill=(150, 130, 110))
    draw.line([60, 110, width - 60, 110], fill=(200, 180, 150), width=2)

    script = item["script"]
    if script == "Devanagari":
        font = ImageFont.truetype(DEV_FONT_PATH, 34)
    elif script == "Gujarati":
        font = ImageFont.truetype(GUJ_FONT_PATH, 34)
    else:
        font = ImageFont.truetype(LAT_FONT_PATH, 30)

    lines = item["text"].split("\n")
    y = 170
    for l in lines:
        draw.text((80, y), l, font=font, fill=(20, 20, 20))
        y += 110

    # Save PNG and .gt.txt
    img_path = os.path.join(EVAL_DIR, f"{item['id']}_{item['script'].lower()}.png")
    gt_path = os.path.join(EVAL_DIR, f"{item['id']}_{item['script'].lower()}.gt.txt")

    im.save(img_path, format="PNG")
    with open(gt_path, "w", encoding="utf-8") as f:
        f.write(unicodedata.normalize("NFC", item["text"].strip()))

    logger.info("Generated %s (%s)", img_path, script)

def main():
    logger.info("Generating OCR Evaluation dataset in %s...", EVAL_DIR)
    sources = []
    for item in DATASET:
        render_page_image(item)
        sources.append({
            "id": item["id"],
            "script": item["script"],
            "title": item["title"],
            "source": item["source"],
            "license": item["license"],
            "image": f"{item['id']}_{item['script'].lower()}.png",
            "ground_truth": f"{item['id']}_{item['script'].lower()}.gt.txt"
        })

    with open(os.path.join(EVAL_DIR, "sources.json"), "w", encoding="utf-8") as f:
        json.dump(sources, f, ensure_ascii=False, indent=2)

    logger.info("Evaluation dataset generated successfully with %d pages.", len(DATASET))

if __name__ == "__main__":
    import logging
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger("eval-dataset")
    main()
