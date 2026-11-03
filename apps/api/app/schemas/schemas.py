from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

# Hotspot & 3D Model
class HotspotResponse(BaseModel):
    id: str
    title: str
    description: str
    position_x: float
    position_y: float
    position_z: float
    normal_x: float
    normal_y: float
    normal_z: float
    media_url: Optional[str] = None

    class Config:
        from_attributes = True

class Model3DResponse(BaseModel):
    id: str
    title: str
    model_url: str
    format: str
    poly_count: Optional[int] = None
    scale_factor: float
    license: str
    attribution: Optional[str] = None
    hotspots: List[HotspotResponse] = []

    class Config:
        from_attributes = True

# Tag & Dynasty
class TagBrief(BaseModel):
    id: str
    name: str
    slug: str

    class Config:
        from_attributes = True

class DynastyBrief(BaseModel):
    id: str
    name: str
    era_label: Optional[str] = None
    slug: str

    class Config:
        from_attributes = True

# Media
class SiteMediaResponse(BaseModel):
    id: str
    media_type: str = "image"
    url: str
    thumbnail_url: Optional[str] = None
    caption: Optional[str] = None
    license: str = "CC-BY-4.0"
    attribution: Optional[str] = None
    source_url: Optional[str] = None
    provenance: Optional[str] = None

    class Config:
        from_attributes = True

# Folklore & Observation
class FolkloreResponse(BaseModel):
    id: str
    title: str
    narrative: str
    language: str
    source_tradition: str
    authenticity_status: str

    class Config:
        from_attributes = True

class ObservationResponse(BaseModel):
    id: str
    title: Optional[str] = None
    element_type: str
    description: str
    masonry_detail: Optional[str] = None
    preservation_status: str
    recorded_by: str

    class Config:
        from_attributes = True

# Site schemas
class SiteLight(BaseModel):
    id: str
    name: str
    slug: str
    name_hi: Optional[str] = None
    name_gu: Optional[str] = None
    site_type: str
    state: str
    district: Optional[str] = None
    latitude: float
    longitude: float
    period_start_year: Optional[int] = None
    period_end_year: Optional[int] = None
    era_label: Optional[str] = None
    data_confidence: str
    hero_image: Optional[str] = None
    has_3d_model: bool = False

    class Config:
        from_attributes = True

class SiteBrief(BaseModel):
    id: str
    name: str
    slug: str
    name_hi: Optional[str] = None
    name_gu: Optional[str] = None
    summary: Optional[str] = None
    site_type: str
    era: Optional[str] = None
    era_label: Optional[str] = None
    era_start_year: Optional[int] = None
    era_end_year: Optional[int] = None
    period_start_year: Optional[int] = None
    period_end_year: Optional[int] = None
    dynasty: Optional[str] = None
    state: str
    district: Optional[str] = None
    latitude: float
    longitude: float
    hero_image: Optional[str] = None
    hero_image_attribution: Optional[str] = None
    hero_image_license: Optional[str] = "CC-BY-4.0"
    architectural_style: Optional[str] = None
    data_confidence: str
    source_text: Optional[str] = None
    source_url: Optional[str] = None
    source: Optional[str] = None
    tags: List[str] = []
    dynasties: List[str] = []
    has_3d_model: bool = False

    class Config:
        from_attributes = True

class SiteDetail(SiteBrief):
    description: Optional[str] = None
    significance: Optional[str] = None
    alternative_names: List[str] = []
    media: List[SiteMediaResponse] = []
    models_3d: List[Model3DResponse] = []
    folklore: List[FolkloreResponse] = []
    observations: List[ObservationResponse] = []

    class Config:
        from_attributes = True

# M2 3D Model, Hotspot & Digital Twin Schemas
class HotspotDetail(BaseModel):
    id: str
    model_id: str
    label: str
    label_hi: Optional[str] = None
    label_gu: Optional[str] = None
    body_md: Optional[str] = None
    position: List[float] = [0.0, 0.0, 0.0]
    camera_position: List[float] = [0.0, 2.0, 4.0]
    camera_target: List[float] = [0.0, 0.0, 0.0]
    media_ids: List[str] = []
    sort_order: int = 0
    media_url: Optional[str] = None

    class Config:
        from_attributes = True

class Model3DDetail(BaseModel):
    id: str
    site_id: str
    title: str
    format: str = "glb"
    storage_key: Optional[str] = None
    file_size_bytes: int = 0
    poly_count: int = 0
    draco_compressed: bool = False
    lod_levels: Dict[str, Any] = {}
    source: str = "artist_made"
    licence: str = "CC-BY-4.0"
    attribution: Optional[str] = None
    source_url: Optional[str] = None
    scale_calibrated: bool = False
    scale_factor: float = 1.0
    status: str = "ready"
    model_url: str
    hotspots: List[HotspotDetail] = []

    class Config:
        from_attributes = True

class ModelSummary(BaseModel):
    id: str
    title: str
    format: str = "glb"
    file_size_bytes: int = 0
    poly_count: int = 0
    draco_compressed: bool = False
    source: str = "artist_made"
    licence: str = "CC-BY-4.0"
    attribution: Optional[str] = None
    source_url: Optional[str] = None
    scale_calibrated: bool = False
    status: str = "ready"
    model_url: str
    hotspots_count: int = 0

    class Config:
        from_attributes = True

class FolkloreDetail(BaseModel):
    id: str
    site_id: str
    title: str
    body_md: str
    language: str = "en"
    kind: str = "oral_history"
    source: Optional[str] = None
    source_url: Optional[str] = None
    data_confidence: str = "likely"
    is_illustrative: bool = False
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ObservationDetail(BaseModel):
    id: str
    site_id: str
    title: Optional[str] = None
    body_md: str
    language: str = "en"
    kind: str = "architectural_feature"
    source: Optional[str] = None
    source_url: Optional[str] = None
    data_confidence: str = "likely"
    is_illustrative: bool = False
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class NearbySiteItem(BaseModel):
    id: str
    name: str
    slug: str
    name_hi: Optional[str] = None
    name_gu: Optional[str] = None
    site_type: str
    state: str
    district: Optional[str] = None
    era_label: Optional[str] = None
    hero_image: Optional[str] = None
    distance_km: float
    has_3d_model: bool = False

    class Config:
        from_attributes = True

class RelatedRouteItem(BaseModel):
    id: str
    slug: str
    title: str
    summary: Optional[str] = None
    total_distance_km: float = 0.0
    estimated_duration_days: int = 1
    stop_order: int
    arrival_note: Optional[str] = None

    class Config:
        from_attributes = True

class SiteFullDetail(SiteDetail):
    has_3d_model: bool = False
    model_summary: Optional[ModelSummary] = None
    folklore_items: List[FolkloreDetail] = []
    observation_items: List[ObservationDetail] = []
    nearby_sites: List[NearbySiteItem] = []
    related_routes: List[RelatedRouteItem] = []

    class Config:
        from_attributes = True

class SiteOGMetadata(BaseModel):
    title: str
    description: str
    image: Optional[str] = None
    url: str
    site_name: str = "Dharohar Atlas"
    type: str = "article"
    locale: str = "en_IN"
    era: Optional[str] = None
    state: Optional[str] = None
    has_3d_model: bool = False

class PaginatedSites(BaseModel):
    items: List[SiteBrief]
    total: int
    limit: int
    offset: int
    next_cursor: Optional[str] = None

class GeoJSONFeature(BaseModel):
    type: str = "Feature"
    geometry: Dict[str, Any]
    properties: Dict[str, Any]

class GeoJSONFeatureCollection(BaseModel):
    type: str = "FeatureCollection"
    features: List[GeoJSONFeature]
    total: int
    clustered: bool = False

class HistogramBucket(BaseModel):
    year_start: int
    year_end: int
    count: int
    era_label: Optional[str] = None

class FacetResponse(BaseModel):
    site_type: Dict[str, int]
    state: Dict[str, int]
    dynasty: Dict[str, int]
    era: Dict[str, int]
    tag: Dict[str, int]
    data_confidence: Dict[str, int]
    has_3d_model: Dict[str, int] = {}
    timeline_histogram: List[HistogramBucket]
    total_sites: int

# Document & OCR schemas (M3)
class TranslationResponse(BaseModel):
    id: str
    line_id: Optional[str] = None
    page_id: Optional[str] = None
    target_lang: str = "en"
    text: str
    engine: Optional[str] = "gemini"
    version: int = 1
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class EntityMentionResponse(BaseModel):
    id: str
    entity_id: str
    line_id: str
    char_start: int
    char_end: int
    confidence: float

    class Config:
        from_attributes = True

class EntityResponse(BaseModel):
    id: str
    kind: str
    name: str
    normalised_name: str
    wikidata_id: Optional[str] = None
    site_id: Optional[str] = None
    mentions: List[EntityMentionResponse] = []

    class Config:
        from_attributes = True

class TextVersionResponse(BaseModel):
    id: str
    entity_type: str
    entity_id: str
    version_no: int
    text: str
    edited_by: Optional[str] = "curator"
    edited_at: datetime
    reason: Optional[str] = None

    class Config:
        from_attributes = True

class OCRLineResponse(BaseModel):
    id: str
    page_id: str
    line_no: int
    line_index: Optional[int] = None
    text: str
    original_text: Optional[str] = None
    translated_text: Optional[str] = None
    bbox_x: float
    bbox_y: float
    bbox_w: float
    bbox_h: float
    polygon: Optional[Any] = None
    confidence: float
    lang: str = "hi"
    language: Optional[str] = "Devanagari"
    engine: str = "gemini_vision"
    is_corrected: bool = False
    version: int = 1
    translations: List[TranslationResponse] = []

    class Config:
        from_attributes = True

class OCRLineUpdate(BaseModel):
    original_text: Optional[str] = None
    translated_text: Optional[str] = None
    text: Optional[str] = None
    reason: Optional[str] = None
    edited_by: Optional[str] = "curator"

class TranslationUpdate(BaseModel):
    text: str
    reason: Optional[str] = None
    edited_by: Optional[str] = "curator"

class RevertRequest(BaseModel):
    entity_type: str = Field(..., description="'line' or 'translation'")
    entity_id: str
    version_no: int
    reason: Optional[str] = "Reverted via human-in-the-loop interface"

class DocumentEntityResponse(BaseModel):
    id: str
    entity_type: str
    text: str
    label: Optional[str] = None
    confidence: float

    class Config:
        from_attributes = True

class DocumentPageResponse(BaseModel):
    id: str
    document_id: str
    page_no: int = 1
    page_number: Optional[int] = 1
    image_key: Optional[str] = None
    image_url: Optional[str] = None
    width: int
    height: int
    rotation_deg: int = 0
    status: str = "ready"
    ocr_lines: List[OCRLineResponse] = []
    translations: List[TranslationResponse] = []
    entities: List[DocumentEntityResponse] = []

    class Config:
        from_attributes = True

class DocumentResponse(BaseModel):
    id: str
    title: str
    language_hint: str = "auto"
    language: Optional[str] = "Devanagari"
    doc_type: str = "printed"
    document_type: Optional[str] = "manuscript_folio"
    status: str = "ready"
    site_id: Optional[str] = None
    uploaded_by: Optional[str] = None
    source: Optional[str] = None
    source_archive: Optional[str] = None
    licence: Optional[str] = "CC-BY-4.0"
    license: Optional[str] = "CC-BY-4.0"
    attribution: Optional[str] = None
    storage_key: Optional[str] = None
    original_filename: Optional[str] = None
    mime: Optional[str] = None
    page_count: int = 1
    created_at: datetime
    updated_at: Optional[datetime] = None
    pages: List[DocumentPageResponse] = []
    entities: List[EntityResponse] = []
    site: Optional[SiteBrief] = None

    class Config:
        from_attributes = True

class DocumentCreate(BaseModel):
    title: str
    language_hint: str = "auto"
    doc_type: str = "printed"
    site_id: Optional[str] = None
    source: Optional[str] = "Archival Field Scan"
    licence: str = "CC-BY-4.0"
    attribution: Optional[str] = None
    uploaded_by: Optional[str] = "anonymous"
    storage_key: Optional[str] = None
    mime: Optional[str] = "image/jpeg"
    original_filename: Optional[str] = None
    ocr_engine: Optional[str] = None
    translation_engine: Optional[str] = None

class JobResponse(BaseModel):
    id: str
    kind: str = "ocr_pipeline"
    status: str = "queued"
    progress: int = 0
    stage: Optional[str] = "validate"
    attempts: int = 0
    error: Optional[str] = None
    payload: Dict[str, Any] = {}
    result: Dict[str, Any] = {}
    idempotency_key: Optional[str] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Route schemas
class RouteStopResponse(BaseModel):
    id: str
    stop_order: int
    arrival_note: Optional[str] = None
    narrative: Optional[str] = None
    transit_mode: str = "caravan_trail"
    travel_note: Optional[str] = None
    site: SiteBrief

    class Config:
        from_attributes = True

class RouteResponse(BaseModel):
    id: str
    title: str
    slug: str
    summary: Optional[str] = None
    description: Optional[str] = None
    total_distance_km: float
    estimated_duration_days: int
    era_theme: str
    geometry: Optional[Dict[str, Any]] = None
    stops: List[RouteStopResponse] = []

    class Config:
        from_attributes = True

# Journey Mode Schemas (M5)
class JourneyStopResponse(BaseModel):
    id: str
    site_id: str
    site_slug: str
    site_name: str
    site_name_hi: Optional[str] = None
    site_name_gu: Optional[str] = None
    site_type: str
    state: str
    district: Optional[str] = None
    latitude: float
    longitude: float
    period_start_year: Optional[int] = None
    period_end_year: Optional[int] = None
    era_label: Optional[str] = None
    stop_order: int
    arrival_note: Optional[str] = None
    arrival_note_source: Optional[str] = None
    is_illustrative: bool = False
    dwell_seconds: int = 12
    hero_media: Optional[Dict[str, Any]] = None
    has_3d_model: bool = False
    model_3d_id: Optional[str] = None
    linked_folklore: List[Dict[str, Any]] = []
    linked_observations: List[Dict[str, Any]] = []
    linked_documents: List[Dict[str, Any]] = []
    leg_distance_km: float = 0.0
    cumulative_distance_km: float = 0.0
    leg_geometry: Optional[Dict[str, Any]] = None
    bearing_deg: Optional[float] = None

class JourneyResponse(BaseModel):
    id: str
    slug: str
    title: str
    title_hi: Optional[str] = None
    title_gu: Optional[str] = None
    summary: Optional[str] = None
    summary_hi: Optional[str] = None
    summary_gu: Optional[str] = None
    description: Optional[str] = None
    cover_media_url: Optional[str] = None
    difficulty: str = "Moderate"
    era_theme: str
    total_distance_km: float
    estimated_duration_days: int
    full_geometry: Dict[str, Any]
    stops: List[JourneyStopResponse] = []
    total_stops: int

# Demo Script Schemas (M5)
class DemoStep(BaseModel):
    id: str
    step_number: int
    title: str
    title_hi: Optional[str] = None
    title_gu: Optional[str] = None
    caption: str
    caption_hi: Optional[str] = None
    caption_gu: Optional[str] = None
    route: str
    target_selector: str
    action_type: str = "navigate"
    sample_query: Optional[str] = None
    sample_question: Optional[str] = None
    site_slug: Optional[str] = None
    document_id: Optional[str] = None

class DemoScriptResponse(BaseModel):
    version: str = "1.0"
    total_steps: int
    estimated_duration_seconds: int
    steps: List[DemoStep] = []

# Search & RAG (M4)
class SearchHit(BaseModel):
    id: str
    source_type: str
    source_id: str
    site_id: Optional[str] = None
    document_id: Optional[str] = None
    page_id: Optional[str] = None
    chunk_index: int = 0
    title: Optional[str] = None
    text: str
    lang: str = "en"
    rrf_score: float = 0.0
    matched_by: List[str] = []
    highlighted_snippet: Optional[str] = None
    is_illustrative: bool = False
    line_ids: List[str] = []
    start_line_no: Optional[int] = None
    end_line_no: Optional[int] = None
    metadata: Dict[str, Any] = {}
    site: Optional[Dict[str, Any]] = None

class SearchGroupedResults(BaseModel):
    sites: List[SearchHit] = []
    documents: List[SearchHit] = []
    folklore: List[SearchHit] = []
    observations: List[SearchHit] = []

class SearchResponse(BaseModel):
    query: str
    detected_lang: str = "en"
    total: int = 0
    latency_ms: float = 0.0
    results: List[SearchHit] = []
    grouped: SearchGroupedResults = SearchGroupedResults()

class SearchSuggestion(BaseModel):
    id: str
    title: str
    name_hi: Optional[str] = None
    name_gu: Optional[str] = None
    kind: str = "site"
    slug: Optional[str] = None

class AskArchiveRequest(BaseModel):
    question: Optional[str] = None
    query: Optional[str] = None  # backward compatibility with M0
    filters: Optional[Dict[str, Any]] = None
    lang: Optional[str] = None
    stream: bool = False

class SourceCitation(BaseModel):
    citation_index: int
    chunk_id: str
    source_type: str
    source_id: str
    site_id: Optional[str] = None
    document_id: Optional[str] = None
    page_id: Optional[str] = None
    line_ids: List[str] = []
    title: str
    snippet: str
    lang: str = "en"
    is_illustrative: bool = False
    data_confidence: str = "verified"
    site: Optional[Dict[str, Any]] = None

class AskArchiveResponse(BaseModel):
    answered: bool = True
    question: str
    answer: Optional[str] = None
    reason: Optional[str] = None
    message: Optional[str] = None
    lang: str = "en"
    has_illustrative_source: bool = False
    citations: List[SourceCitation] = []
    sources: List[SourceCitation] = []
    related_records: List[Dict[str, Any]] = []
    latency_ms: Optional[float] = None

# Job
class JobResponse(BaseModel):
    id: str
    job_type: str
    status: str
    progress: int
    payload: Dict[str, Any] = {}
    result: Dict[str, Any] = {}
    error: Optional[str] = None

    class Config:
        from_attributes = True
