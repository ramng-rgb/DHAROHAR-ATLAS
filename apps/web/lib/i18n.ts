export type SupportedLocale = "en" | "hi" | "gu";

export interface Translations {
  appName: string;
  tagline: string;
  subpitch: string;
  exploreAtlas: string;
  demoRoute: string;
  filterTitle: string;
  clearFilters: string;
  siteType: string;
  state: string;
  dynasty: string;
  tags: string;
  dataConfidence: string;
  timeline: string;
  timelineSubtitle: string;
  bce: string;
  ce: string;
  allTypes: string;
  verifiedOnly: string;
  searchPlaceholder: string;
  sitesFound: string;
  noSitesFound: string;
  clearFiltersSuggestion: string;
  listView: string;
  mapView: string;
  previewDrawer: {
    period: string;
    dynasty: string;
    location: string;
    confidence: string;
    confidenceVerified: string;
    confidenceLikely: string;
    confidenceUnverified: string;
    source: string;
    openSitePage: string;
    flyTo: string;
    copyLink: string;
    linkCopied: string;
    imageAttribution: string;
  };
  journey: {
    modeTitle: string;
    play: string;
    pause: string;
    nextStop: string;
    prevStop: string;
    textVersion: string;
    mapVersion: string;
    exit: string;
    share: string;
    speed: string;
    complete: string;
    stopsVisited: string;
    totalDistance: string;
    illustrative: string;
    openSite: string;
    open3D: string;
    relatedDocs: string;
  };
  eras: {
    indus: string;
    maurya: string;
    classical: string;
    solanki: string;
    sultanate: string;
    mughal: string;
    colonial: string;
  };
  types: {
    stepwell: string;
    fort: string;
    temple: string;
    mosque: string;
    palace: string;
    tomb: string;
    archaeological_site: string;
    haveli: string;
    other: string;
  };
  stats: {
    monuments: string;
    regions: string;
    millennia: string;
  };
}

export const translations: Record<SupportedLocale, Translations> = {
  en: {
    appName: "DHAROHAR ATLAS",
    tagline: "Digital Revitalisation of Unstructured Cultural & Architectural Heritage Archives",
    subpitch: "Explore over five millennia of subterranean stepwells, monolithic rock temples, and living desert citadels through verified geospatial intelligence.",
    exploreAtlas: "Explore the Atlas",
    demoRoute: "Watch Fellowship Demo",
    filterTitle: "Archive Filters",
    clearFilters: "Clear All",
    siteType: "Monument Type",
    state: "State / Region",
    dynasty: "Dynasty",
    tags: "Curatorial Tags",
    dataConfidence: "Academic Confidence",
    timeline: "Chronological Timeline",
    timelineSubtitle: "Scrub across 3000 BCE to 1900 CE",
    bce: "BCE",
    ce: "CE",
    allTypes: "All Monument Types",
    verifiedOnly: "Verified Only",
    searchPlaceholder: "Search by site name, city or architecture...",
    sitesFound: "sites found in archive",
    noSitesFound: "No heritage monuments match your current filter criteria.",
    clearFiltersSuggestion: "Try resetting some filters or broadening your chronological timeline range.",
    listView: "List View",
    mapView: "Map View",
    previewDrawer: {
      period: "Chronological Period",
      dynasty: "Dynasty / Patron",
      location: "Location Coordinates",
      confidence: "Confidence Level",
      confidenceVerified: "ASI / UNESCO Verified",
      confidenceLikely: "Scholarly Consensus",
      confidenceUnverified: "Oral Archive / Unverified",
      source: "Citations & Dossier",
      openSitePage: "Open site page",
      flyTo: "Center on Map",
      copyLink: "Copy Deep Link",
      linkCopied: "Deep link copied to clipboard!",
      imageAttribution: "Image License & Attribution",
    },
    journey: {
      modeTitle: "Overland Journey Mode",
      play: "Animate Route",
      pause: "Pause Route",
      nextStop: "Next Stop",
      prevStop: "Previous Stop",
      textVersion: "Text Version",
      mapVersion: "Interactive Map",
      exit: "Exit Journey",
      share: "Share Journey",
      speed: "Speed",
      complete: "Journey Route Completed",
      stopsVisited: "Stops Visited",
      totalDistance: "Total Distance",
      illustrative: "Illustrative sample",
      openSite: "Explore Site Page",
      open3D: "Inspect 3D Twin",
      relatedDocs: "Related Folios & Docs",
    },
    eras: {
      indus: "Indus Valley (3000–1500 BCE)",
      maurya: "Maurya & Early (600–200 BCE)",
      classical: "Classical / Gupta (200 BCE–750 CE)",
      solanki: "Solanki & Medieval (750–1200 CE)",
      sultanate: "Sultanate Era (1200–1526 CE)",
      mughal: "Mughal & Maratha (1526–1750 CE)",
      colonial: "Colonial & Princely (1750–1900 CE)",
    },
    types: {
      stepwell: "Stepwell (Vav / Baori)",
      fort: "Fort & Citadel",
      temple: "Temple & Shrine",
      mosque: "Mosque & Tomb Complex",
      palace: "Palace & Haveli",
      tomb: "Tomb / Mausoleum",
      archaeological_site: "Harappan / Archaeological",
      haveli: "Haveli / Mansion",
      other: "Cultural Landmark",
    },
    stats: {
      monuments: "Verified Monuments",
      regions: "Historic Regions",
      millennia: "Millennia Documented",
    },
  },
  hi: {
    appName: "धरोहर एटलस",
    tagline: "असंरचित सांस्कृतिक और स्थापत्य विरासत अभिलेखागार का डिजिटल पुनरुद्धार",
    subpitch: "सत्यापित भू-स्थानिक मानचित्र पर पांच सहस्राब्दियों की भूमिगत बावड़ियों, अखंड पाषाण मंदिरों और जीवंत किलों का अन्वेषण करें।",
    exploreAtlas: "मानचित्र देखें",
    demoRoute: "यात्रा मार्ग डेमो",
    filterTitle: "अभिलेखागार फिल्टर",
    clearFilters: "सभी हटाएं",
    siteType: "स्मारक प्रकार",
    state: "राज्य / क्षेत्र",
    dynasty: "राजवंश",
    tags: "संयोजक टैग",
    dataConfidence: "डेटा प्रामाणिकता",
    timeline: "कालक्रम समयरेखा",
    timelineSubtitle: "३००० ई.पू. से १९०० ईस्वी तक कालक्रम स्क्रोल करें",
    bce: "ई.पू.",
    ce: "ईस्वी",
    allTypes: "सभी स्मारक",
    verifiedOnly: "केवल सत्यापित",
    searchPlaceholder: "स्मारक नाम, शहर या स्थापत्य शैली खोजें...",
    sitesFound: "स्मारक अभिलेख में उपलब्ध",
    noSitesFound: "आपके चुने हुए फिल्टर के अनुसार कोई स्मारक नहीं मिला।",
    clearFiltersSuggestion: "कृपया कुछ फिल्टर हटाएं या कालक्रम समयरेखा का दायरा बढ़ाएं।",
    listView: "सूची दृश्य",
    mapView: "मानचित्र दृश्य",
    previewDrawer: {
      period: "ऐतिहासिक कालक्रम",
      dynasty: "राजवंश / संरक्षक",
      location: "स्थान निर्देशांक",
      confidence: "प्रामाणिकता स्तर",
      confidenceVerified: "एएसआई / यूनेस्को सत्यापित",
      confidenceLikely: "विद्वत सहमति",
      confidenceUnverified: "मौखिक परंपरा / असत्यापित",
      source: "स्रोत एवं संदर्भ",
      openSitePage: "स्मारक पृष्ठ खोलें",
      flyTo: "मानचित्र पर ले जाएं",
      copyLink: "लिंक कॉपी करें",
      linkCopied: "लिंक कॉपी हो गया!",
      imageAttribution: "चित्र अधिकार एवं आभार",
    },
    journey: {
      modeTitle: "ऐतिहासिक यात्रा मोड",
      play: "यात्रा आरंभ करें",
      pause: "यात्रा विराम",
      nextStop: "अगला पड़ाव",
      prevStop: "पिछला पड़ाव",
      textVersion: "पाठ्य विवरण",
      mapVersion: "संवादात्मक मानचित्र",
      exit: "यात्रा समाप्त करें",
      share: "यात्रा साझा करें",
      speed: "गति",
      complete: "यात्रा मार्ग संपन्न",
      stopsVisited: "पड़ाव देखे गए",
      totalDistance: "कुल दूरी",
      illustrative: "चित्रात्मक नमूना",
      openSite: "स्मारक पृष्ठ देखें",
      open3D: "3D मॉडल देखें",
      relatedDocs: "संबंधित ऐतिहासिक दस्तावेज",
    },
    eras: {
      indus: "सिंधु घाटी (३०००-१५०० ई.पू.)",
      maurya: "मौर्य एवं प्रारंभिक (६००-२०० ई.पू.)",
      classical: "गुप्त एवं शास्त्रीय (२०० ई.पू.-७५० ई.)",
      solanki: "सोलंकी एवं मध्यकाल (७५०-१२०० ई.)",
      sultanate: "सल्तनत काल (१२००-१५२६ ई.)",
      mughal: "मुगल एवं मराठा (१५२६-१७५० ई.)",
      colonial: "औपनिवेशिक काल (१७५०-१९०० ई.)",
    },
    types: {
      stepwell: "बावड़ी (वाव / बावली)",
      fort: "किला एवं दुर्ग",
      temple: "मंदिर एवं देवालय",
      mosque: "मस्जिद एवं रोजा",
      palace: "राजमहल एवं हवेली",
      tomb: "मकबरा",
      archaeological_site: "पुरातात्विक स्थल",
      haveli: "हवेली",
      other: "सांस्कृतिक स्थल",
    },
    stats: {
      monuments: "सत्यापित स्मारक",
      regions: "ऐतिहासिक क्षेत्र",
      millennia: "दस्तावेजी सहस्राब्दियां",
    },
  },
  gu: {
    appName: "ધરોહર એટલસ",
    tagline: "અસંગઠિત સાંસ્કૃતિક અને સ્થાપત્ય વારસા દસ્તાવેજોનું ડિજિટલ પુનરુત્થાન",
    subpitch: "સત્યાપિત ભૌગોલિક નકશા દ્વારા પાંચ સહસ્ત્રાબ્દીની ભવ્ય વાવો, પથ્થરના મંદિરો અને ઐતિહાસિક કિલ્લાઓનું અન્વેષણ કરો.",
    exploreAtlas: "એટલસ જુઓ",
    demoRoute: "યાત્રા માર્ગ ડેમો",
    filterTitle: "સંગ્રહ ફિલ્ટર્સ",
    clearFilters: "બધા સાફ કરો",
    siteType: "સ્મારક પ્રકાર",
    state: "રાજ્ય / પ્રદેશ",
    dynasty: "રાજવંશ",
    tags: "ટેગ્સ",
    dataConfidence: "માહિતી સત્યતા",
    timeline: "સમયરેખા સ્લાઇડર",
    timelineSubtitle: "૩૦૦૦ ઈ.પૂ. થી ૧૯૦૦ ઈ.સ. સુધી અન્વેષણ કરો",
    bce: "ઈ.પૂ.",
    ce: "ઈ.સ.",
    allTypes: "બધા સ્મારકો",
    verifiedOnly: "માત્ર પ્રમાણિત",
    searchPlaceholder: "વાવ, મંદિર કે કિલ્લાનું નામ શોધો...",
    sitesFound: "સ્મારકો સંગ્રહમાં મળ્યા",
    noSitesFound: "તમારા ફિલ્ટર મુજબ કોઈ સ્મારક મળ્યું નથી.",
    clearFiltersSuggestion: "કૃપા કરીને ફિલ્ટર્સ ઓછા કરો અથવા સમયરેખા વધારો.",
    listView: "યાદી દૃશ્ય",
    mapView: "નકશો દૃશ્ય",
    previewDrawer: {
      period: "ઐતિહાસિક સમયગાળો",
      dynasty: "રાજવંશ / નિર્માતા",
      location: "સ્થળ નિર્દેશાંક",
      confidence: "પ્રમાણિકતા સ્તર",
      confidenceVerified: "ASI / યુનેસ્કો પ્રમાણિત",
      confidenceLikely: "વિદ્વાન સંમતિ",
      confidenceUnverified: "લોકવાયકા / અપ્રમાણિત",
      source: "સંદર્ભ અને સ્ત્રોત",
      openSitePage: "સ્મારક પૃષ્ઠ ખોલો",
      flyTo: "નકશા પર જુઓ",
      copyLink: "લિંક કૉપિ કરો",
      linkCopied: "લિંક સફળતાપૂર્વક કૉપિ થઈ!",
      imageAttribution: "છબી પરવાનો અને શ્રેય",
    },
    journey: {
      modeTitle: "ઐતિહાસિક યાત્રા મોડ",
      play: "યાત્રા શરૂ કરો",
      pause: "યાત્રા વિરામ",
      nextStop: "આગળનો પડાવ",
      prevStop: "પાછળનો પડાવ",
      textVersion: "વાંચન આવૃત્તિ",
      mapVersion: "નકશો દૃશ્ય",
      exit: "યાત્રા બહાર નીકળો",
      share: "યાત્રા શેર કરો",
      speed: "ઝડપ",
      complete: "યાત્રા માર્ગ પૂર્ણ થયો",
      stopsVisited: "પડાવો પૂર્ણ થયા",
      totalDistance: "કુલ અંતર",
      illustrative: "કાલ્પનિક ઉદાહરણ",
      openSite: "સ્મારક પૃષ્ઠ ખોલો",
      open3D: "3D મોડેલ જુઓ",
      relatedDocs: "સંબંધિત ઐતિહાસિક દસ્તાવેજો",
    },
    eras: {
      indus: "સિંધુ સંસ્કૃતિ (૩૦૦૦-૧૫૦૦ ઈ.પૂ.)",
      maurya: "મૌર્ય કાળ (૬૦૦-૨૦૦ ઈ.પૂ.)",
      classical: "શાસ્ત્રીય / ગુપ્ત (૨૦૦ ઈ.પૂ.-૭૫૦ ઈ.સ.)",
      solanki: "સોલંકી સુવર્ણકાળ (૭૫૦-૧૨૦૦ ઈ.સ.)",
      sultanate: "સલ્તનત સમયગાળો (૧૨૦૦-૧૫૨૬ ઈ.સ.)",
      mughal: "મુઘલ અને મરાઠા (૧૫૨૬-૧૭૫૦ ઈ.સ.)",
      colonial: "રજવાડા કાળ (૧૭૫૦-૧૯૦૦ ઈ.સ.)",
    },
    types: {
      stepwell: "વાવ (પગથિયાંવાળો કૂવો)",
      fort: "કિલ્લો અને ગઢ",
      temple: "મંદિર અને દેરાસર",
      mosque: "મસ્જિદ અને રોઝા",
      palace: "મહેલ અને હવેલી",
      tomb: "મકબરો",
      archaeological_site: "પુરાતત્વીય સ્થળ",
      haveli: "હવેલી",
      other: "સાંસ્કૃતિક સ્થળ",
    },
    stats: {
      monuments: "પ્રમાણિત સ્મારકો",
      regions: "ઐતિહાસિક પ્રદેશો",
      millennia: "સહસ્ત્રાબ્દીનો ઇતિહાસ",
    },
  },
};
