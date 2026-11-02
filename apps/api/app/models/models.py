import uuid
import enum
from datetime import datetime
from typing import List, Optional
from sqlalchemy import (
    Column, String, Text, Float, Integer, Boolean, DateTime, ForeignKey, Index, JSON, Enum, CheckConstraint, BigInteger
)
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import TSVECTOR
from pgvector.sqlalchemy import Vector
from geoalchemy2 import Geography
from app.core.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class SiteType(str, enum.Enum):
    stepwell = "stepwell"
    fort = "fort"
    temple = "temple"
    mosque = "mosque"
    palace = "palace"
    tomb = "tomb"
    archaeological_site = "archaeological_site"
    haveli = "haveli"
    other = "other"

class DataConfidence(str, enum.Enum):
    verified = "verified"
    likely = "likely"
    unverified = "unverified"

class Tag(Base):
    __tablename__ = "tags"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String(100), unique=True, nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)

    sites = relationship("SiteTag", back_populates="tag", cascade="all, delete-orphan")

class SiteTag(Base):
    __tablename__ = "site_tags"

    site_id = Column(String, ForeignKey("sites.id", ondelete="CASCADE"), primary_key=True)
    tag_id = Column(String, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True)

    site = relationship("Site", back_populates="site_tags")
    tag = relationship("Tag", back_populates="sites")

class Dynasty(Base):
    __tablename__ = "dynasties"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String(150), unique=True, nullable=False)
    era_label = Column(String(150), nullable=True)
    slug = Column(String(150), unique=True, nullable=False, index=True)

    sites = relationship("SiteDynasty", back_populates="dynasty", cascade="all, delete-orphan")

class SiteDynasty(Base):
    __tablename__ = "site_dynasties"

    site_id = Column(String, ForeignKey("sites.id", ondelete="CASCADE"), primary_key=True)
    dynasty_id = Column(String, ForeignKey("dynasties.id", ondelete="CASCADE"), primary_key=True)

    site = relationship("Site", back_populates="site_dynasties")
    dynasty = relationship("Dynasty", back_populates="sites")

class Site(Base):
    __tablename__ = "sites"

    id = Column(String, primary_key=True, default=generate_uuid)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False, index=True)
    name_hi = Column(String(255), nullable=True)
    name_gu = Column(String(255), nullable=True)
    summary = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    site_type = Column(String(50), nullable=False, default="other", index=True)
    state = Column(String(100), nullable=False, index=True)
    district = Column(String(100), nullable=True, index=True)
    latitude = Column(Float, nullable=False, index=True)
    longitude = Column(Float, nullable=False, index=True)
    location = Column(Geography(geometry_type="POINT", srid=4326, spatial_index=True), nullable=True)
    period_start_year = Column(Integer, nullable=True, index=True)
    period_end_year = Column(Integer, nullable=True, index=True)
    era_label = Column(String(150), nullable=True, index=True)
    data_confidence = Column(String(50), nullable=False, default="verified", index=True)
    source_text = Column(Text, nullable=True)
    source_url = Column(String(500), nullable=True)
    source = Column(String(500), nullable=True)  # legacy compatibility
    era = Column(String(150), nullable=True)     # legacy compatibility
    dynasty = Column(String(150), nullable=True) # legacy compatibility
    era_start_year = Column(Integer, nullable=True) # legacy compatibility
    era_end_year = Column(Integer, nullable=True)   # legacy compatibility
    architectural_style = Column(String(200), nullable=True)
    significance = Column(Text, nullable=True)
    alternative_names = Column(JSON, default=list)
    hero_image = Column(String(500), nullable=True)
    hero_image_attribution = Column(String(255), nullable=True)
    hero_image_license = Column(String(100), default="CC-BY-4.0")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True, index=True)
    search_vector = Column(TSVECTOR, nullable=True)

    __table_args__ = (
        CheckConstraint("latitude >= -90.0 AND latitude <= 90.0", name="chk_valid_latitude"),
        CheckConstraint("longitude >= -180.0 AND longitude <= 180.0", name="chk_valid_longitude"),
        CheckConstraint(
            "(period_start_year IS NULL OR period_end_year IS NULL) OR (period_start_year <= period_end_year)",
            name="chk_period_chronology"
        ),
        Index("idx_sites_name_trgm", "name", postgresql_using="gin", postgresql_ops={"name": "gin_trgm_ops"}),
    )

    # Relationships
    media = relationship("SiteMedia", back_populates="site", cascade="all, delete-orphan")
    models_3d = relationship("Model3D", back_populates="site", cascade="all, delete-orphan")
    folklore = relationship("FolkloreItem", back_populates="site", cascade="all, delete-orphan")
    observations = relationship("Observation", back_populates="site", cascade="all, delete-orphan")
    route_stops = relationship("RouteStop", back_populates="site")
    site_tags = relationship("SiteTag", back_populates="site", cascade="all, delete-orphan")
    site_dynasties = relationship("SiteDynasty", back_populates="site", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="site")

class SiteMedia(Base):
    __tablename__ = "site_media"

    id = Column(String, primary_key=True, default=generate_uuid)
    site_id = Column(String, ForeignKey("sites.id", ondelete="CASCADE"), nullable=False, index=True)
    media_type = Column(String(50), default="image")
    url = Column(String(500), nullable=False)
    thumbnail_url = Column(String(500), nullable=True)
    caption = Column(Text, nullable=True)
    license = Column(String(100), default="CC-BY-4.0")
    attribution = Column(String(255), nullable=True)
    source_url = Column(String(500), nullable=True)
    provenance = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    site = relationship("Site", back_populates="media")

class Model3D(Base):
    __tablename__ = "models_3d"

    id = Column(String, primary_key=True, default=generate_uuid)
    site_id = Column(String, ForeignKey("sites.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=True)
    model_url = Column(String(500), nullable=True)
    storage_key = Column(String(500), nullable=True)
    format = Column(String(50), default="glb") # glb | splat | ply
    file_size_bytes = Column(BigInteger, default=0)
    poly_count = Column(Integer, default=0)
    draco_compressed = Column(Boolean, default=False)
    lod_levels = Column(JSON, default=dict)
    source = Column(String(50), default="artist_made") # photogrammetry | scan | artist_made | stock
    licence = Column(String(100), default="CC-BY-4.0")
    license = Column(String(100), default="CC-BY-4.0") # synonym
    attribution = Column(String(255), nullable=True)
    source_url = Column(String(500), nullable=True)
    scale_calibrated = Column(Boolean, default=False)
    status = Column(String(50), default="ready") # pending | ready | failed
    scale_factor = Column(Float, default=1.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    site = relationship("Site", back_populates="models_3d")
    hotspots = relationship("Hotspot", back_populates="model", cascade="all, delete-orphan", order_by="Hotspot.sort_order")

class Hotspot(Base):
    __tablename__ = "hotspots"

    id = Column(String, primary_key=True, default=generate_uuid)
    model_id = Column(String, ForeignKey("models_3d.id", ondelete="CASCADE"), nullable=False, index=True)
    label = Column(String(255), nullable=True)
    title = Column(String(255), nullable=True) # synonym
    label_hi = Column(String(255), nullable=True)
    label_gu = Column(String(255), nullable=True)
    body_md = Column(Text, nullable=True)
    description = Column(Text, nullable=True) # synonym
    position = Column(JSON, default=list) # [x, y, z]
    camera_position = Column(JSON, default=list) # [x, y, z]
    camera_target = Column(JSON, default=list) # [x, y, z]
    media_ids = Column(JSON, default=list)
    sort_order = Column(Integer, default=0)
    position_x = Column(Float, default=0.0)
    position_y = Column(Float, default=0.0)
    position_z = Column(Float, default=0.0)
    normal_x = Column(Float, default=0.0)
    normal_y = Column(Float, default=1.0)
    normal_z = Column(Float, default=0.0)
    media_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    model = relationship("Model3D", back_populates="hotspots")

class DocType(str, enum.Enum):
    printed = "printed"
    handwritten = "handwritten"
    inscription = "inscription"
    journal = "journal"
    slide = "slide"
    other = "other"

class DocStatus(str, enum.Enum):
    uploaded = "uploaded"
    processing = "processing"
    ready = "ready"
    failed = "failed"
    needs_review = "needs_review"

class JobStatus(str, enum.Enum):
    queued = "queued"
    running = "running"
    succeeded = "succeeded"
    failed = "failed"
    retrying = "retrying"
    dead = "dead"

class EntityKind(str, enum.Enum):
    place = "place"
    dynasty = "dynasty"
    person = "person"
    date = "date"
    deity = "deity"
    artifact = "artifact"
    other = "other"

class Document(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True, default=generate_uuid)
    title = Column(String(255), nullable=False)
    language_hint = Column(String(50), nullable=False, default="auto")
    language = Column(String(50), nullable=True) # legacy compatibility
    doc_type = Column(String(50), nullable=False, default="printed")
    document_type = Column(String(100), nullable=True) # legacy compatibility
    status = Column(String(50), nullable=False, default="uploaded", index=True)
    site_id = Column(String, ForeignKey("sites.id", ondelete="SET NULL"), nullable=True, index=True)
    uploaded_by = Column(String(100), nullable=True)
    source = Column(String(255), nullable=True)
    source_archive = Column(String(255), nullable=True) # legacy compatibility
    licence = Column(String(100), default="CC-BY-4.0")
    license = Column(String(100), default="CC-BY-4.0") # synonym
    attribution = Column(String(255), nullable=True)
    storage_key = Column(String(500), nullable=True)
    original_filename = Column(String(255), nullable=True)
    mime = Column(String(100), nullable=True)
    page_count = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True, index=True)

    site = relationship("Site", back_populates="documents", lazy="selectin")
    pages = relationship("DocumentPage", back_populates="document", cascade="all, delete-orphan", order_by="DocumentPage.page_no", lazy="selectin")

class DocumentPage(Base):
    __tablename__ = "document_pages"

    id = Column(String, primary_key=True, default=generate_uuid)
    document_id = Column(String, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    page_no = Column(Integer, default=1, index=True)
    page_number = Column(Integer, default=1) # legacy synonym
    image_key = Column(String(500), nullable=True)
    image_url = Column(String(500), nullable=True) # legacy synonym
    width = Column(Integer, default=1200)
    height = Column(Integer, default=1600)
    rotation_deg = Column(Integer, default=0)
    status = Column(String(50), default="ready", index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    document = relationship("Document", back_populates="pages")
    ocr_lines = relationship("OCRLine", back_populates="page", cascade="all, delete-orphan", order_by="OCRLine.line_no", lazy="selectin")
    translations = relationship("Translation", back_populates="page", cascade="all, delete-orphan", lazy="selectin")
    entities = relationship("DocumentEntity", back_populates="page", cascade="all, delete-orphan", lazy="selectin")

class OCRLine(Base):
    __tablename__ = "ocr_lines"

    id = Column(String, primary_key=True, default=generate_uuid)
    page_id = Column(String, ForeignKey("document_pages.id", ondelete="CASCADE"), nullable=False, index=True)
    line_no = Column(Integer, nullable=False, index=True)
    line_index = Column(Integer, nullable=True) # legacy synonym
    text = Column(Text, nullable=False)
    original_text = Column(Text, nullable=True) # legacy synonym
    translated_text = Column(Text, nullable=True) # legacy convenience
    bbox_x = Column(Float, nullable=False)
    bbox_y = Column(Float, nullable=False)
    bbox_w = Column(Float, nullable=False)
    bbox_h = Column(Float, nullable=False)
    polygon = Column(JSON, nullable=True)
    confidence = Column(Float, default=0.95, index=True)
    lang = Column(String(50), default="hi")
    language = Column(String(50), default="Devanagari") # legacy synonym
    engine = Column(String(50), default="gemini_vision")
    version = Column(Integer, default=1)
    is_corrected = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    page = relationship("DocumentPage", back_populates="ocr_lines")
    translations = relationship("Translation", back_populates="line", cascade="all, delete-orphan", lazy="selectin")
    mentions = relationship("EntityMention", back_populates="line", cascade="all, delete-orphan", lazy="selectin")

class Translation(Base):
    __tablename__ = "translations"

    id = Column(String, primary_key=True, default=generate_uuid)
    line_id = Column(String, ForeignKey("ocr_lines.id", ondelete="CASCADE"), nullable=True, index=True)
    page_id = Column(String, ForeignKey("document_pages.id", ondelete="CASCADE"), nullable=True, index=True)
    target_lang = Column(String(50), default="en", index=True)
    text = Column(Text, nullable=False)
    engine = Column(String(50), default="gemini")
    version = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)

    line = relationship("OCRLine", back_populates="translations")
    page = relationship("DocumentPage", back_populates="translations")

class TextVersion(Base):
    __tablename__ = "text_versions"

    id = Column(String, primary_key=True, default=generate_uuid)
    entity_type = Column(String(50), nullable=False, index=True) # 'line' | 'translation'
    entity_id = Column(String, nullable=False, index=True)
    version_no = Column(Integer, nullable=False)
    text = Column(Text, nullable=False)
    edited_by = Column(String(100), default="curator")
    edited_at = Column(DateTime, default=datetime.utcnow)
    reason = Column(String(255), nullable=True)

class Entity(Base):
    __tablename__ = "entities"

    id = Column(String, primary_key=True, default=generate_uuid)
    kind = Column(String(50), nullable=False, index=True) # place | dynasty | person | date | deity | artifact | other
    name = Column(String(255), nullable=False)
    normalised_name = Column(String(255), nullable=False, index=True)
    wikidata_id = Column(String(100), nullable=True)
    site_id = Column(String, ForeignKey("sites.id", ondelete="SET NULL"), nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    site = relationship("Site")
    mentions = relationship("EntityMention", back_populates="entity", cascade="all, delete-orphan")

class EntityMention(Base):
    __tablename__ = "entity_mentions"

    id = Column(String, primary_key=True, default=generate_uuid)
    entity_id = Column(String, ForeignKey("entities.id", ondelete="CASCADE"), nullable=False, index=True)
    line_id = Column(String, ForeignKey("ocr_lines.id", ondelete="CASCADE"), nullable=False, index=True)
    char_start = Column(Integer, nullable=False)
    char_end = Column(Integer, nullable=False)
    confidence = Column(Float, default=0.9)

    entity = relationship("Entity", back_populates="mentions")
    line = relationship("OCRLine", back_populates="mentions")

class DocumentEntity(Base):
    __tablename__ = "document_entities"

    id = Column(String, primary_key=True, default=generate_uuid)
    page_id = Column(String, ForeignKey("document_pages.id", ondelete="CASCADE"), nullable=False, index=True)
    entity_type = Column(String(50), nullable=False)
    text = Column(String(255), nullable=False)
    label = Column(String(255), nullable=True)
    confidence = Column(Float, default=0.90)

    page = relationship("DocumentPage", back_populates="entities")

class FolkloreItem(Base):
    __tablename__ = "folklore_items"

    id = Column(String, primary_key=True, default=generate_uuid)
    site_id = Column(String, ForeignKey("sites.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    body_md = Column(Text, nullable=True)
    narrative = Column(Text, nullable=True) # synonym
    language = Column(String(50), default="en")
    kind = Column(String(100), default="legend")
    source = Column(String(500), nullable=True)
    source_url = Column(String(500), nullable=True)
    source_tradition = Column(String(255), nullable=True) # legacy
    data_confidence = Column(String(50), default="likely")
    authenticity_status = Column(String(100), default="verified_oral_history") # legacy
    is_illustrative = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    site = relationship("Site", back_populates="folklore")

class Observation(Base):
    __tablename__ = "observations"

    id = Column(String, primary_key=True, default=generate_uuid)
    site_id = Column(String, ForeignKey("sites.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=True)
    body_md = Column(Text, nullable=False)
    language = Column(String(50), default="en")
    kind = Column(String(100), default="architectural_feature")
    source = Column(String(500), nullable=True)
    source_url = Column(String(500), nullable=True)
    data_confidence = Column(String(50), default="likely")
    is_illustrative = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    site = relationship("Site", back_populates="observations")

class ArchitecturalObservation(Base):
    __tablename__ = "architectural_observations"

    id = Column(String, primary_key=True, default=generate_uuid)
    site_id = Column(String, ForeignKey("sites.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=True)
    element_type = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    masonry_detail = Column(String(255), nullable=True)
    preservation_status = Column(String(100), default="Stable")
    recorded_by = Column(String(255), default="Dharohar Field Expedition")
    created_at = Column(DateTime, default=datetime.utcnow)

class Route(Base):
    __tablename__ = "routes"

    id = Column(String, primary_key=True, default=generate_uuid)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    title = Column(String(255), nullable=False)
    summary = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    total_distance_km = Column(Float, default=150.0)
    estimated_duration_days = Column(Integer, default=3)
    era_theme = Column(String(100), default="Stepwells of Gujarat")
    created_at = Column(DateTime, default=datetime.utcnow)

    stops = relationship("RouteStop", back_populates="route", order_by="RouteStop.stop_order")

class RouteStop(Base):
    __tablename__ = "route_stops"

    id = Column(String, primary_key=True, default=generate_uuid)
    route_id = Column(String, ForeignKey("routes.id", ondelete="CASCADE"), nullable=False, index=True)
    site_id = Column(String, ForeignKey("sites.id", ondelete="CASCADE"), nullable=False, index=True)
    stop_order = Column(Integer, nullable=False)
    arrival_note = Column(Text, nullable=True)
    narrative = Column(Text, nullable=True)
    transit_mode = Column(String(50), default="caravan_trail")
    travel_note = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    route = relationship("Route", back_populates="stops")
    site = relationship("Site", back_populates="route_stops")

class Embedding(Base):
    __tablename__ = "embeddings"

    id = Column(String, primary_key=True, default=generate_uuid)
    content_type = Column(String(50), nullable=False, index=True)
    content_id = Column(String, nullable=False, index=True)
    title = Column(String(255), nullable=False)
    text_snippet = Column(Text, nullable=False)
    embedding = Column(Vector(768), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Job(Base):
    __tablename__ = "jobs"

    id = Column(String, primary_key=True, default=generate_uuid)
    kind = Column(String(50), nullable=False, default="ocr_pipeline", index=True)
    job_type = Column(String(50), nullable=True) # legacy compatibility
    status = Column(String(50), default="queued", index=True) # queued | running | succeeded | failed | retrying | dead
    progress = Column(Integer, default=0)
    stage = Column(String(100), nullable=True)
    attempts = Column(Integer, default=0)
    error = Column(Text, nullable=True)
    payload = Column(JSON, default=dict)
    result = Column(JSON, default=dict)
    idempotency_key = Column(String(255), unique=True, nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    finished_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
