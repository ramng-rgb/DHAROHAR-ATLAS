from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import get_db
from app.models.models import Site, Document, Route, OCRLine
from app.schemas.schemas import DemoScriptResponse, DemoStep

router = APIRouter(prefix="/demo", tags=["Demo Mode"])

@router.get("/script", response_model=DemoScriptResponse)
async def get_demo_script(db: AsyncSession = Depends(get_db)):
    # Verify Rani ki Vav site
    site = (await db.execute(select(Site).where(Site.slug == "rani-ki-vav"))).scalar_one_or_none()
    site_slug = site.slug if site else "rani-ki-vav"

    # Verify Flagship Journey Route
    journey_route = (await db.execute(select(Route).where(Route.slug == "gujarat-stepwell-trail"))).scalar_one_or_none()
    journey_slug = journey_route.slug if journey_route else "gujarat-stepwell-trail"

    # Verify Archival Document
    doc = (await db.execute(
        select(Document).where(Document.title.ilike("%Subterranean Architecture Monograph%"))
    )).scalar_one_or_none()
    if not doc:
        doc = (await db.execute(select(Document).limit(1))).scalar_one_or_none()

    doc_id = doc.id if doc else "4eb5197a-c0ee-4932-9f3a-09a06614a12d"

    # Look up line ID for line 1 of first page
    first_line_id = "line_01"
    if doc and doc.pages and len(doc.pages) > 0 and len(doc.pages[0].ocr_lines) > 0:
        first_line_id = doc.pages[0].ocr_lines[0].id

    steps = [
        DemoStep(
            id="step_01_landing",
            step_number=1,
            title="Welcome to Dharohar Atlas",
            title_hi="धरोहर एटलस में आपका स्वागत है",
            title_gu="ધરોહર એટલસમાં આપનું સ્વાગત છે",
            caption="The living knowledge layer for India's unstructured cultural & architectural heritage archives.",
            caption_hi="भारत की स्थापत्य और सांस्कृतिक विरासत अभिलेखागार के लिए एक सजीव ज्ञान सेतु।",
            caption_gu="ભારતના સ્થાપત્ય અને સાંસ્કૃતિક વારસા માટે એક જીવંત જ્ઞાન સ્તર.",
            route="/",
            target_selector="#hero-cta-section",
            action_type="navigate"
        ),
        DemoStep(
            id="step_02_explore",
            step_number=2,
            title="Interactive Heritage GIS Explorer",
            title_hi="संवादमूलक ऐतिहासिक जीआईएस मानचित्र",
            title_gu="ઇન્ટરેક્ટિવ હેરિટેજ જીઆઈએસ નકશો",
            caption="Explore 25 verified monuments across Gujarat and Rajasthan with real-time chronological timeline filtering.",
            caption_hi="समय-सीमा और राज्य फिल्टर के साथ 25 सत्यापित स्मारकों का अन्वेषण करें।",
            caption_gu="સમયરેખા અને રાજ્ય ફિલ્ટર સાથે 25 ચકાસાયેલ સ્મારકો શોધો.",
            route="/explore?state=Gujarat",
            target_selector="#map-container",
            action_type="filter"
        ),
        DemoStep(
            id="step_03_journey",
            step_number=3,
            title="Journey Mode: Animated Travel Trails",
            title_hi="यात्रा मोड: सजीव यात्रा पथ",
            title_gu="યાત્રા મોડ: એનિમેટેડ ઐતિહાસિક પ્રવાસ",
            caption="Follow the 8-stop Gujarat Stepwell Trail with progressive line drawing, 3D camera sweeps, and linked folklore.",
            caption_hi="प्रगतिशील रेखा रेखांकन और लोककथाओं के साथ गुजरात वाव यात्रा का अनुभव करें।",
            caption_gu="પ્રગતિશીલ લાઇન ડ્રોઇંગ અને લોકવાયકાઓ સાથે ગુજરાત વાવ યાત્રા જુઓ.",
            route=f"/journeys/{journey_slug}",
            target_selector="#journey-player-card",
            action_type="play_journey"
        ),
        DemoStep(
            id="step_04_site",
            step_number=4,
            title="Monograph: Rani ki Vav (Patan)",
            title_hi="स्मारक विवरण: रानी की वाव (पाटण)",
            title_gu="સ્મારક વિગત: રાણી ની વાવ (પાટણ)",
            caption="Deep scholarly monograph featuring architectural taxonomy, verified dynastic history, and nearby trails.",
            caption_hi="स्थापत्य वर्गीकरण और ऐतिहासिक विवरणों से सुसज्जित विस्तृत शोध मोनोग्राफ।",
            caption_gu="સ્થાપત્ય વર્ગીકરણ અને ઐતિહાસિક વિગતો સાથેનું વિસ્તૃત મોનોગ્રાફ.",
            route=f"/sites/{site_slug}",
            target_selector="#site-monograph-header",
            site_slug=site_slug,
            action_type="navigate"
        ),
        DemoStep(
            id="step_05_3d",
            step_number=5,
            title="3D Photogrammetric Digital Twin",
            title_hi="3D फोटोग्रामेट्रिक डिजिटल ट्विन",
            title_gu="3D ફોટોગ્રામેટ્રિક ડિજિટલ ટ્વીન",
            caption="Inspect subterranean pillared pavilions with interactive spatial hotspots, solar lighting angles, and measurements.",
            caption_hi="हॉटस्पॉट, प्रकाश व्यवस्था और मापन के साथ 3D मॉडल का अन्वेषण करें।",
            caption_gu="હોટસ્પોટ્સ, લાઇટિંગ અને માપન સાથે 3D મોડલનું અન્વેષણ કરો.",
            route=f"/sites/{site_slug}#3d-twin",
            target_selector="#digital-twin-canvas-container",
            site_slug=site_slug,
            action_type="inspect_hotspot"
        ),
        DemoStep(
            id="step_06_archive",
            step_number=6,
            title="Side-by-Side Document Viewer",
            title_hi="अभिलेख दर्शक: मूल प्रति और प्रतिलेख",
            title_gu="દસ્તાવેજ દર્શક: મૂળ સ્કેન અને લખાણ",
            caption="Side-by-side original epigraphic scan, normalized transcript, and English architectural translation.",
            caption_hi="मूल शिलालेख, देवनागरी प्रतिलेख और अनुवाद को समानांतर देखें।",
            caption_gu="મૂળ શિલાલેખ સ્કેન, લિપ્યંતર અને અનુવાદ સાથે જુઓ.",
            route=f"/archive/{doc_id}",
            target_selector="#document-three-pane-viewer",
            document_id=doc_id,
            action_type="navigate"
        ),
        DemoStep(
            id="step_07_highlight",
            step_number=7,
            title="Bidirectional Linking & Human Review",
            title_hi="द्विदिश जुड़ाव और मानव संपादन",
            title_gu="દ્વિ-માર્ગીય જોડાણ અને માનવ સમીક્ષા",
            caption="Clicking any transcript line illuminates the exact bounding box on the original scan with versioned audit rollback.",
            caption_hi="प्रतिलेख पर क्लिक करने से मूल पृष्ठ पर संबंधित रेखा प्रकाशित होती है।",
            caption_gu="કોઈપણ લાઇન પર ક્લિક કરવાથી મૂળ સ્કેન પર બોક્સ હાઇલાઇટ થાય છે.",
            route=f"/archive/{doc_id}?line={first_line_id}",
            target_selector=f"[data-line-id='{first_line_id}']",
            document_id=doc_id,
            action_type="navigate"
        ),
        DemoStep(
            id="step_08_search",
            step_number=8,
            title="Multilingual Hybrid Search",
            title_hi="बहुभाषी संकर खोज",
            title_gu="બહુભાષી હાઇબ્રિડ સર્ચ",
            caption="Reciprocal Rank Fusion fuses pgvector HNSW, PostgreSQL FTS unaccent, and trigram fuzzy matching across EN, HI, and GU.",
            caption_hi="अंग्रेजी, हिंदी और गुजराती में सटीक और अवधारणात्मक खोज परिणाम।",
            caption_gu="અંગ્રેજી, હિન્દી અને ગુજરાતીમાં ચોક્કસ હાઇબ્રિડ પરિણામો.",
            route="/search?q=%E0%A4%B0%E0%A4%BE%E0%A4%A8%E0%A4%80+%E0%A4%95%E0%A5%80+%E0%A4%B5%E0%A4%BE%E0%A4%B5",
            target_selector="#search-results-container",
            sample_query="रानी की वाव",
            action_type="search_query"
        ),
        DemoStep(
            id="step_09_ask",
            step_number=9,
            title="Ask the Archive: Grounded RAG",
            title_hi="अभिलेखागार से पूछें: प्रामाणिक आरएजी",
            title_gu="સંદર્ભ સાથે પૂછો: પ્રમાણિત આરએજી",
            caption="Generates streamed answers strictly grounded in retrieved primary records with validated inline citations [1], [2].",
            caption_hi="सत्यापित संदर्भों [1] के साथ अभिलेख-आधारित उत्तर प्राप्त करें।",
            caption_gu="ચકાસાયેલ સ્ત્રોતો [1] સાથે સચોટ ઐતિહાસિક જવાબો મેળવો.",
            route="/ask",
            target_selector="#ask-archive-panel",
            sample_question="Who commissioned Rani ki Vav and in which century was it constructed?",
            action_type="ask_question"
        )
    ]

    return DemoScriptResponse(
        version="1.0",
        total_steps=len(steps),
        estimated_duration_seconds=150,
        steps=steps
    )
