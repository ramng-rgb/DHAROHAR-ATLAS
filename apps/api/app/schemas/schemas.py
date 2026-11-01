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

# Document schemas
class OCRLineResponse(BaseModel):
    id: str
    line_index: int
    bbox_x: float
    bbox_y: float
    bbox_w: float
    bbox_h: float
    original_text: str
    translated_text: Optional[str] = None
    confidence: float
    language: str
    is_corrected: bool
    version: int

    class Config:
        from_attributes = True

class OCRLineUpdate(BaseModel):
    original_text: Optional[str] = None
    translated_text: Optional[str] = None

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
    page_number: int
    image_url: str
    width: int
    height: int
    status: str
    ocr_lines: List[OCRLineResponse] = []
    entities: List[DocumentEntityResponse] = []

    class Config:
        from_attributes = True

class DocumentResponse(BaseModel):
    id: str
    title: str
    language: str
    document_type: str
    source_archive: str
    site_id: Optional[str] = None
    pages: List[DocumentPageResponse] = []

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

# Search & RAG
class SearchResultItem(BaseModel):
    id: str
    content_type: str
    content_id: str
    title: str
    text_snippet: str
    rrf_score: float
    slug: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    era: Optional[str] = None
    dynasty: Optional[str] = None
    has_3d: Optional[bool] = False

class SearchResponse(BaseModel):
    query: str
    total: int
    results: List[SearchResultItem]
    grouped: Dict[str, List[Dict[str, Any]]]

class AskArchiveRequest(BaseModel):
    query: str

class CitationItem(BaseModel):
    index: int
    title: str
    content_type: str
    id: str
    snippet: str

class AskArchiveResponse(BaseModel):
    query: str
    answer: str
    citations: List[CitationItem] = []
    confidence: float

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
