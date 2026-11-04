from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator


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
    media_url: str | None = None

    class Config:
        from_attributes = True

class Model3DResponse(BaseModel):
    id: str
    title: str
    model_url: str
    format: str
    poly_count: int | None = None
    scale_factor: float
    license: str
    attribution: str | None = None
    hotspots: list[HotspotResponse] = []

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
    era_label: str | None = None
    slug: str

    class Config:
        from_attributes = True

# Media
class SiteMediaResponse(BaseModel):
    id: str
    media_type: str = "image"
    kind: str = "gallery" # hero | gallery | panorama
    url: str
    thumbnail_url: str | None = None
    storage_key: str | None = None
    remote_url: str | None = None
    width: int | None = None
    height: int | None = None
    dominant_colour: str | None = None
    blurhash: str | None = None
    caption: str | None = None
    license: str = "CC-BY-SA-4.0"
    licence_short: str = "CC-BY-SA-4.0"
    licence_url: str | None = None
    author: str | None = None
    credit: str | None = None
    attribution: str | None = None
    source_url: str | None = None
    original_filename: str | None = None
    is_placeholder: bool = False
    verified: bool = True
    sort_order: int = 0
    provenance: str | None = None

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
    title: str | None = None
    element_type: str
    description: str
    masonry_detail: str | None = None
    preservation_status: str
    recorded_by: str

    class Config:
        from_attributes = True

# Site schemas
class SiteLight(BaseModel):
    id: str
    name: str
    slug: str
    name_hi: str | None = None
    name_gu: str | None = None
    site_type: str
    state: str
    district: str | None = None
    latitude: float
    longitude: float
    period_start_year: int | None = None
    period_end_year: int | None = None
    era_label: str | None = None
    data_confidence: str
    hero_image: str | None = None
    has_3d_model: bool = False

    class Config:
        from_attributes = True

class SiteBrief(BaseModel):
    id: str
    name: str
    slug: str
    name_hi: str | None = None
    name_gu: str | None = None
    summary: str | None = None
    site_type: str
    era: str | None = None
    era_label: str | None = None
    era_start_year: int | None = None
    era_end_year: int | None = None
    period_start_year: int | None = None
    period_end_year: int | None = None
    dynasty: str | None = None
    state: str
    district: str | None = None
    latitude: float
    longitude: float
    hero_image: str | None = None
    hero_image_attribution: str | None = None
    hero_image_license: str | None = "CC-BY-4.0"
    architectural_style: str | None = None
    data_confidence: str
    source_text: str | None = None
    source_url: str | None = None
    source: str | None = None
    tags: list[str] = []
    dynasties: list[str] = []
    has_3d_model: bool = False

    class Config:
        from_attributes = True

class SiteDetail(SiteBrief):
    description: str | None = None
    significance: str | None = None
    alternative_names: list[str] = []
    media: list[SiteMediaResponse] = []
    models_3d: list[Model3DResponse] = []
    folklore: list[FolkloreResponse] = []
    observations: list[ObservationResponse] = []

    class Config:
        from_attributes = True

# M2 3D Model, Hotspot & Digital Twin Schemas
class HotspotDetail(BaseModel):
    id: str
    model_id: str
    label: str
    label_hi: str | None = None
    label_gu: str | None = None
    body_md: str | None = None
    position: list[float] = [0.0, 0.0, 0.0]
    camera_position: list[float] = [0.0, 2.0, 4.0]
    camera_target: list[float] = [0.0, 0.0, 0.0]
    media_ids: list[str] = []
    sort_order: int = 0
    media_url: str | None = None

    class Config:
        from_attributes = True

class Model3DDetail(BaseModel):
    id: str
    site_id: str
    title: str
    format: str = "glb"
    storage_key: str | None = None
    file_size_bytes: int = 0
    poly_count: int = 0
    draco_compressed: bool = False
    lod_levels: dict[str, Any] = {}
    source: str = "artist_made"
    licence: str = "CC-BY-4.0"
    attribution: str | None = None
    source_url: str | None = None
    scale_calibrated: bool = False
    scale_factor: float = 1.0
    status: str = "ready"
    model_url: str
    hotspots: list[HotspotDetail] = []

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
    attribution: str | None = None
    source_url: str | None = None
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
    source: str | None = None
    source_url: str | None = None
    data_confidence: str = "likely"
    is_illustrative: bool = False
    created_at: datetime | None = None

    class Config:
        from_attributes = True

class ObservationDetail(BaseModel):
    id: str
    site_id: str
    title: str | None = None
    body_md: str
    language: str = "en"
    kind: str = "architectural_feature"
    source: str | None = None
    source_url: str | None = None
    data_confidence: str = "likely"
    is_illustrative: bool = False
    created_at: datetime | None = None

    class Config:
        from_attributes = True

class NearbySiteItem(BaseModel):
    id: str
    name: str
    slug: str
    name_hi: str | None = None
    name_gu: str | None = None
    site_type: str
    state: str
    district: str | None = None
    era_label: str | None = None
    hero_image: str | None = None
    distance_km: float
    has_3d_model: bool = False

    class Config:
        from_attributes = True

class RelatedRouteItem(BaseModel):
    id: str
    slug: str
    title: str
    summary: str | None = None
    total_distance_km: float = 0.0
    estimated_duration_days: int = 1
    stop_order: int
    arrival_note: str | None = None

    class Config:
        from_attributes = True

class SiteFullDetail(SiteDetail):
    has_3d_model: bool = False
    model_summary: ModelSummary | None = None
    folklore_items: list[FolkloreDetail] = []
    observation_items: list[ObservationDetail] = []
    nearby_sites: list[NearbySiteItem] = []
    related_routes: list[RelatedRouteItem] = []

    class Config:
        from_attributes = True

class SiteOGMetadata(BaseModel):
    title: str
    description: str
    image: str | None = None
    url: str
    site_name: str = "Dharohar Atlas"
    type: str = "article"
    locale: str = "en_IN"
    era: str | None = None
    state: str | None = None
    has_3d_model: bool = False

class PaginatedSites(BaseModel):
    items: list[SiteBrief]
    total: int
    limit: int
    offset: int
    next_cursor: str | None = None

class GeoJSONFeature(BaseModel):
    type: str = "Feature"
    geometry: dict[str, Any]
    properties: dict[str, Any]

class GeoJSONFeatureCollection(BaseModel):
    type: str = "FeatureCollection"
    features: list[GeoJSONFeature]
    total: int
    clustered: bool = False

class HistogramBucket(BaseModel):
    year_start: int
    year_end: int
    count: int
    era_label: str | None = None

class FacetResponse(BaseModel):
    site_type: dict[str, int]
    state: dict[str, int]
    dynasty: dict[str, int]
    era: dict[str, int]
    tag: dict[str, int]
    data_confidence: dict[str, int]
    has_3d_model: dict[str, int] = {}
    timeline_histogram: list[HistogramBucket]
    total_sites: int

# Document & OCR schemas (M3)
class TranslationResponse(BaseModel):
    id: str
    line_id: str | None = None
    page_id: str | None = None
    target_lang: str = "en"
    text: str
    engine: str | None = "gemini"
    version: int = 1
    created_at: datetime | None = None

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
    wikidata_id: str | None = None
    site_id: str | None = None
    mentions: list[EntityMentionResponse] = []

    class Config:
        from_attributes = True

class TextVersionResponse(BaseModel):
    id: str
    entity_type: str
    entity_id: str
    version_no: int
    text: str
    edited_by: str | None = "curator"
    edited_at: datetime
    reason: str | None = None

    class Config:
        from_attributes = True

class OCRLineResponse(BaseModel):
    id: str
    page_id: str
    line_no: int
    line_index: int | None = None
    text: str
    original_text: str | None = None
    translated_text: str | None = None
    bbox_x: float
    bbox_y: float
    bbox_w: float
    bbox_h: float
    polygon: Any | None = None
    confidence: float
    lang: str = "hi"
    language: str | None = "Devanagari"
    engine: str = "gemini_vision"
    is_corrected: bool = False
    version: int = 1
    translations: list[TranslationResponse] = []

    class Config:
        from_attributes = True

class OCRLineUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    original_text: str | None = Field(None, min_length=1, max_length=5000, description="Corrected original language text")
    translated_text: str | None = Field(None, min_length=1, max_length=5000, description="Corrected translated text")
    text: str | None = Field(None, min_length=1, max_length=5000, description="Alternative text field")
    reason: str | None = Field(None, min_length=1, max_length=500, description="Audit reason for edit")
    edited_by: str | None = Field("curator", min_length=1, max_length=100, description="Identifier of editor")

    @model_validator(mode="after")
    def validate_content(self) -> "OCRLineUpdate":
        if not any([self.original_text, self.translated_text, self.text]):
            raise ValueError("At least one text field (original_text, translated_text, or text) must be provided.")
        return self

class TranslationUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    text: str = Field(..., min_length=1, max_length=5000, description="Updated translation text")
    reason: str | None = Field(None, min_length=1, max_length=500, description="Audit reason for edit")
    edited_by: str | None = Field("curator", min_length=1, max_length=100, description="Identifier of editor")

class RevertRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    entity_type: str = Field(..., pattern=r"^(line|translation)$", description="'line' or 'translation'")
    entity_id: str = Field(..., pattern=r"^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$", max_length=36, description="UUID of entity to revert")
    version_no: int = Field(..., ge=1, le=100000, description="Target version number to restore")
    reason: str | None = Field("Reverted via human-in-the-loop interface", min_length=1, max_length=500, description="Audit reason for reversion")

class DocumentEntityResponse(BaseModel):
    id: str
    entity_type: str
    text: str
    label: str | None = None
    confidence: float

    class Config:
        from_attributes = True

class DocumentPageResponse(BaseModel):
    id: str
    document_id: str
    page_no: int = 1
    page_number: int | None = 1
    image_key: str | None = None
    image_url: str | None = None
    width: int
    height: int
    rotation_deg: int = 0
    status: str = "ready"
    ocr_lines: list[OCRLineResponse] = []
    translations: list[TranslationResponse] = []
    entities: list[DocumentEntityResponse] = []

    class Config:
        from_attributes = True

class DocumentResponse(BaseModel):
    id: str
    title: str
    language_hint: str = "auto"
    language: str | None = "Devanagari"
    doc_type: str = "printed"
    document_type: str | None = "manuscript_folio"
    status: str = "ready"
    site_id: str | None = None
    uploaded_by: str | None = None
    source: str | None = None
    source_archive: str | None = None
    licence: str | None = "CC-BY-4.0"
    license: str | None = "CC-BY-4.0"
    attribution: str | None = None
    storage_key: str | None = None
    original_filename: str | None = None
    mime: str | None = None
    page_count: int = 1
    created_at: datetime
    updated_at: datetime | None = None
    pages: list[DocumentPageResponse] = []
    entities: list[EntityResponse] = []
    site: SiteBrief | None = None

    class Config:
        from_attributes = True

class DocumentCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    title: str = Field(..., min_length=1, max_length=255, description="Document archival title")
    language_hint: str = Field("auto", pattern=r"^(auto|en|hi|gu|sa|mr|Devanagari|Gujarati|Sanskrit|Marathi|Hindi|English)$", max_length=32)
    doc_type: str = Field("printed", pattern=r"^(printed|manuscript_folio|inscription|field_note|copper_plate|lithograph)$", max_length=32)
    site_id: str | None = Field(None, pattern=r"^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$", max_length=36)
    source: str | None = Field("Archival Field Scan", min_length=1, max_length=255)
    licence: str = Field("CC-BY-4.0", min_length=1, max_length=64)
    attribution: str | None = Field(None, min_length=1, max_length=255)
    uploaded_by: str | None = Field("anonymous", min_length=1, max_length=100)
    storage_key: str | None = Field(None, min_length=1, max_length=512, pattern=r"^/?[a-zA-Z0-9_\-\./]+$")
    mime: str | None = Field("image/jpeg", pattern=r"^(image/(jpeg|png|webp)|application/pdf)$", max_length=64)
    original_filename: str | None = Field(None, min_length=1, max_length=255)
    ocr_engine: str | None = Field(None, pattern=r"^(gemini|tesseract|mock|fake|gemini_fallback)$", max_length=32)
    translation_engine: str | None = Field(None, pattern=r"^(neural|mock|fake)$", max_length=32)

class JobResponse(BaseModel):
    id: str
    kind: str = "ocr_pipeline"
    status: str = "queued"
    progress: int = 0
    stage: str | None = "validate"
    attempts: int = 0
    error: str | None = None
    payload: dict[str, Any] = {}
    result: dict[str, Any] = {}
    idempotency_key: str | None = None
    created_at: datetime
    started_at: datetime | None = None
    finished_at: datetime | None = None

    class Config:
        from_attributes = True

# Route schemas
class RouteStopResponse(BaseModel):
    id: str
    stop_order: int
    arrival_note: str | None = None
    narrative: str | None = None
    transit_mode: str = "caravan_trail"
    travel_note: str | None = None
    site: SiteBrief

    class Config:
        from_attributes = True

class RouteResponse(BaseModel):
    id: str
    title: str
    slug: str
    summary: str | None = None
    description: str | None = None
    total_distance_km: float
    estimated_duration_days: int
    era_theme: str
    geometry: dict[str, Any] | None = None
    stops: list[RouteStopResponse] = []

    class Config:
        from_attributes = True

# Journey Mode Schemas (M5)
class JourneyStopResponse(BaseModel):
    id: str
    site_id: str
    site_slug: str
    site_name: str
    site_name_hi: str | None = None
    site_name_gu: str | None = None
    site_type: str
    state: str
    district: str | None = None
    latitude: float
    longitude: float
    period_start_year: int | None = None
    period_end_year: int | None = None
    era_label: str | None = None
    stop_order: int
    arrival_note: str | None = None
    arrival_note_source: str | None = None
    is_illustrative: bool = False
    dwell_seconds: int = 12
    hero_media: dict[str, Any] | None = None
    has_3d_model: bool = False
    model_3d_id: str | None = None
    linked_folklore: list[dict[str, Any]] = []
    linked_observations: list[dict[str, Any]] = []
    linked_documents: list[dict[str, Any]] = []
    leg_distance_km: float = 0.0
    cumulative_distance_km: float = 0.0
    leg_geometry: dict[str, Any] | None = None
    bearing_deg: float | None = None

class JourneyResponse(BaseModel):
    id: str
    slug: str
    title: str
    title_hi: str | None = None
    title_gu: str | None = None
    summary: str | None = None
    summary_hi: str | None = None
    summary_gu: str | None = None
    description: str | None = None
    cover_media_url: str | None = None
    difficulty: str = "Moderate"
    era_theme: str
    total_distance_km: float
    estimated_duration_days: int
    full_geometry: dict[str, Any]
    stops: list[JourneyStopResponse] = []
    total_stops: int

# Demo Script Schemas (M5)
class DemoStep(BaseModel):
    id: str
    step_number: int
    title: str
    title_hi: str | None = None
    title_gu: str | None = None
    caption: str
    caption_hi: str | None = None
    caption_gu: str | None = None
    route: str
    target_selector: str
    action_type: str = "navigate"
    sample_query: str | None = None
    sample_question: str | None = None
    site_slug: str | None = None
    document_id: str | None = None

class DemoScriptResponse(BaseModel):
    version: str = "1.0"
    total_steps: int
    estimated_duration_seconds: int
    steps: list[DemoStep] = []

# Search & RAG (M4)
class SearchHit(BaseModel):
    id: str
    source_type: str
    source_id: str
    site_id: str | None = None
    document_id: str | None = None
    page_id: str | None = None
    chunk_index: int = 0
    title: str | None = None
    text: str
    lang: str = "en"
    rrf_score: float = 0.0
    matched_by: list[str] = []
    highlighted_snippet: str | None = None
    is_illustrative: bool = False
    line_ids: list[str] = []
    start_line_no: int | None = None
    end_line_no: int | None = None
    metadata: dict[str, Any] = {}
    site: dict[str, Any] | None = None

class SearchGroupedResults(BaseModel):
    sites: list[SearchHit] = []
    documents: list[SearchHit] = []
    folklore: list[SearchHit] = []
    observations: list[SearchHit] = []

class SearchResponse(BaseModel):
    query: str
    detected_lang: str = "en"
    total: int = 0
    latency_ms: float = 0.0
    results: list[SearchHit] = []
    grouped: SearchGroupedResults = SearchGroupedResults()

class SearchSuggestion(BaseModel):
    id: str
    title: str
    name_hi: str | None = None
    name_gu: str | None = None
    kind: str = "site"
    slug: str | None = None

class AskArchiveRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    question: str | None = Field(None, min_length=2, max_length=1000, description="Natural language question")
    query: str | None = Field(None, min_length=2, max_length=1000, description="Alternative query alias")
    filters: dict[str, Any] | None = Field(None, description="Structured query filters")
    lang: str | None = Field(None, pattern=r"^(en|hi|gu|sa|mr)$", max_length=10, description="Preferred language code")
    stream: bool = Field(False, description="Whether to request SSE stream")

    @model_validator(mode="after")
    def validate_question_or_query(self) -> "AskArchiveRequest":
        q = self.question or self.query
        if not q or len(q.strip()) < 2:
            raise ValueError("A question or query of at least 2 characters must be provided.")
        return self

class SourceCitation(BaseModel):
    citation_index: int
    chunk_id: str
    source_type: str
    source_id: str
    site_id: str | None = None
    document_id: str | None = None
    page_id: str | None = None
    line_ids: list[str] = []
    title: str
    snippet: str
    lang: str = "en"
    is_illustrative: bool = False
    data_confidence: str = "verified"
    site: dict[str, Any] | None = None

class AskArchiveResponse(BaseModel):
    answered: bool = True
    question: str
    answer: str | None = None
    reason: str | None = None
    message: str | None = None
    lang: str = "en"
    has_illustrative_source: bool = False
    citations: list[SourceCitation] = []
    sources: list[SourceCitation] = []
    related_records: list[dict[str, Any]] = []
    latency_ms: float | None = None

# Job
class JobResponse(BaseModel):
    id: str
    job_type: str
    status: str
    progress: int
    payload: dict[str, Any] = {}
    result: dict[str, Any] = {}
    error: str | None = None

    class Config:
        from_attributes = True

# Authentication Schemas
class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    email: EmailStr = Field(..., max_length=254, description="Contributor/Curator registered email address")
    password: str = Field(..., min_length=8, max_length=128, description="Account password (8-128 characters)")

class SignupRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    email: EmailStr = Field(..., max_length=254, description="Contributor email address")
    username: str = Field(..., min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_\-]+$", description="Username (3-50 alphanumeric characters)")
    password: str = Field(..., min_length=8, max_length=128, description="Account password (8-128 characters)")

class PasswordResetRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    email: EmailStr = Field(..., max_length=254, description="Registered email address for reset link")

class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    email: str
    message: str | None = None
