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

# Media
class SiteMediaResponse(BaseModel):
    id: str
    media_type: str
    url: str
    thumbnail_url: Optional[str] = None
    caption: Optional[str] = None
    license: str
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
    title: str
    element_type: str
    description: str
    masonry_detail: Optional[str] = None
    preservation_status: str
    recorded_by: str

    class Config:
        from_attributes = True

# Site schemas
class SiteBrief(BaseModel):
    id: str
    name: str
    slug: str
    site_type: str
    era: str
    era_start_year: Optional[int] = None
    era_end_year: Optional[int] = None
    dynasty: Optional[str] = None
    state: str
    district: Optional[str] = None
    latitude: float
    longitude: float
    hero_image: Optional[str] = None
    architectural_style: Optional[str] = None
    data_confidence: str
    source: str

    class Config:
        from_attributes = True

class SiteDetail(SiteBrief):
    description: str
    significance: Optional[str] = None
    alternative_names: List[str] = []
    media: List[SiteMediaResponse] = []
    models_3d: List[Model3DResponse] = []
    folklore: List[FolkloreResponse] = []
    observations: List[ObservationResponse] = []

    class Config:
        from_attributes = True

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
    narrative: str
    transit_mode: str
    travel_note: Optional[str] = None
    site: SiteBrief

    class Config:
        from_attributes = True

class RouteResponse(BaseModel):
    id: str
    title: str
    slug: str
    description: str
    total_distance_km: float
    estimated_duration_days: int
    era_theme: str
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
