import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import (
    Column, String, Text, Float, Integer, Boolean, DateTime, ForeignKey, Index, JSON
)
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
from app.core.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class Site(Base):
    __tablename__ = "sites"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False, index=True)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    alternative_names = Column(JSON, default=list)  # e.g. ["Rani ni Vav", "Queen's Stepwell"]
    site_type = Column(String(100), nullable=False, index=True)  # Stepwell, Fort, Temple, City, Cave
    era = Column(String(100), nullable=False, index=True)  # e.g. "11th Century CE", "Solanki Period"
    era_start_year = Column(Integer, nullable=True, index=True)  # e.g. 1063
    era_end_year = Column(Integer, nullable=True, index=True)    # e.g. 1083
    dynasty = Column(String(100), nullable=True, index=True)  # Solanki, Vaghela, Mughal, Rajput, Harappan
    state = Column(String(100), nullable=False, index=True)  # Gujarat, Rajasthan, etc.
    district = Column(String(100), nullable=True)
    latitude = Column(Float, nullable=False, index=True)
    longitude = Column(Float, nullable=False, index=True)
    hero_image = Column(String(500), nullable=True)
    description = Column(Text, nullable=False)
    architectural_style = Column(String(200), nullable=True)  # Maru-Gurjara, Solanki, Indo-Islamic
    significance = Column(Text, nullable=True)
    data_confidence = Column(String(50), default="verified_academic")  # verified_academic, field_surveyed, unverified
    source = Column(String(500), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    media = relationship("SiteMedia", back_populates="site", cascade="all, delete-orphan")
    models_3d = relationship("Model3D", back_populates="site", cascade="all, delete-orphan")
    folklore = relationship("FolkloreItem", back_populates="site", cascade="all, delete-orphan")
    observations = relationship("ArchitecturalObservation", back_populates="site", cascade="all, delete-orphan")
    route_stops = relationship("RouteStop", back_populates="site")

class SiteMedia(Base):
    __tablename__ = "site_media"

    id = Column(String, primary_key=True, default=generate_uuid)
    site_id = Column(String, ForeignKey("sites.id", ondelete="CASCADE"), nullable=False, index=True)
    media_type = Column(String(50), default="image")  # image, panorama, video, scan
    url = Column(String(500), nullable=False)
    thumbnail_url = Column(String(500), nullable=True)
    caption = Column(Text, nullable=True)
    license = Column(String(100), default="CC-BY-4.0")
    provenance = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    site = relationship("Site", back_populates="media")

class Model3D(Base):
    __tablename__ = "models_3d"

    id = Column(String, primary_key=True, default=generate_uuid)
    site_id = Column(String, ForeignKey("sites.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    model_url = Column(String(500), nullable=False)
    format = Column(String(50), default="glb")  # glb, splat, ply
    poly_count = Column(Integer, nullable=True)
    scale_factor = Column(Float, default=1.0)
    license = Column(String(100), default="CC-BY-4.0")
    attribution = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    site = relationship("Site", back_populates="models_3d")
    hotspots = relationship("Hotspot", back_populates="model", cascade="all, delete-orphan")

class Hotspot(Base):
    __tablename__ = "hotspots"

    id = Column(String, primary_key=True, default=generate_uuid)
    model_id = Column(String, ForeignKey("models_3d.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    position_x = Column(Float, nullable=False)
    position_y = Column(Float, nullable=False)
    position_z = Column(Float, nullable=False)
    normal_x = Column(Float, default=0.0)
    normal_y = Column(Float, default=1.0)
    normal_z = Column(Float, default=0.0)
    media_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    model = relationship("Model3D", back_populates="hotspots")

class Document(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True, default=generate_uuid)
    title = Column(String(255), nullable=False)
    language = Column(String(50), nullable=False)  # Sanskrit, Hindi, Gujarati, Rajasthani, Persian
    document_type = Column(String(100), default="manuscript_folio")  # inscription, folio, field_note, gazetteer
    source_archive = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=True)
    site_id = Column(String, ForeignKey("sites.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    pages = relationship("DocumentPage", back_populates="document", cascade="all, delete-orphan")

class DocumentPage(Base):
    __tablename__ = "document_pages"

    id = Column(String, primary_key=True, default=generate_uuid)
    document_id = Column(String, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    page_number = Column(Integer, default=1)
    image_url = Column(String(500), nullable=False)
    width = Column(Integer, default=1200)
    height = Column(Integer, default=1600)
    status = Column(String(50), default="processed")  # pending, processing, processed, error

    document = relationship("Document", back_populates="pages")
    ocr_lines = relationship("OCRLine", back_populates="page", cascade="all, delete-orphan")
    entities = relationship("DocumentEntity", back_populates="page", cascade="all, delete-orphan")

class OCRLine(Base):
    __tablename__ = "ocr_lines"

    id = Column(String, primary_key=True, default=generate_uuid)
    page_id = Column(String, ForeignKey("document_pages.id", ondelete="CASCADE"), nullable=False, index=True)
    line_index = Column(Integer, nullable=False)
    bbox_x = Column(Float, nullable=False)  # Normalized 0.0 to 1.0 or pixel coordinates
    bbox_y = Column(Float, nullable=False)
    bbox_w = Column(Float, nullable=False)
    bbox_h = Column(Float, nullable=False)
    original_text = Column(Text, nullable=False)
    translated_text = Column(Text, nullable=True)
    confidence = Column(Float, default=0.95)
    language = Column(String(50), default="Devanagari")
    is_corrected = Column(Boolean, default=False)
    version = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)

    page = relationship("DocumentPage", back_populates="ocr_lines")

class DocumentEntity(Base):
    __tablename__ = "document_entities"

    id = Column(String, primary_key=True, default=generate_uuid)
    page_id = Column(String, ForeignKey("document_pages.id", ondelete="CASCADE"), nullable=False, index=True)
    entity_type = Column(String(50), nullable=False)  # PLACE, DYNASTY, DATE, PERSON, CRAFT, DEITY
    text = Column(String(255), nullable=False)
    label = Column(String(255), nullable=True)
    confidence = Column(Float, default=0.90)

    page = relationship("DocumentPage", back_populates="entities")

class FolkloreItem(Base):
    __tablename__ = "folklore_items"

    id = Column(String, primary_key=True, default=generate_uuid)
    site_id = Column(String, ForeignKey("sites.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    narrative = Column(Text, nullable=False)
    language = Column(String(50), default="English")
    source_tradition = Column(String(255), nullable=False)
    authenticity_status = Column(String(100), default="verified_oral_history")  # verified_oral_history, local_legend, illustrative_sample
    created_at = Column(DateTime, default=datetime.utcnow)

    site = relationship("Site", back_populates="folklore")

class ArchitecturalObservation(Base):
    __tablename__ = "architectural_observations"

    id = Column(String, primary_key=True, default=generate_uuid)
    site_id = Column(String, ForeignKey("sites.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    element_type = Column(String(100), nullable=False)  # Torana, Pavilions, Water Shaft, Masonry, Frieze
    description = Column(Text, nullable=False)
    masonry_detail = Column(String(255), nullable=True)
    preservation_status = Column(String(100), default="Stable")
    recorded_by = Column(String(255), default="Dharohar Archaeological Survey")
    created_at = Column(DateTime, default=datetime.utcnow)

    site = relationship("Site", back_populates="observations")

class Route(Base):
    __tablename__ = "routes"

    id = Column(String, primary_key=True, default=generate_uuid)
    title = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, nullable=False)
    description = Column(Text, nullable=False)
    total_distance_km = Column(Float, default=150.0)
    estimated_duration_days = Column(Integer, default=3)
    era_theme = Column(String(100), default="Stepwells of the Solanki Realm")
    created_at = Column(DateTime, default=datetime.utcnow)

    stops = relationship("RouteStop", back_populates="route", order_by="RouteStop.stop_order")

class RouteStop(Base):
    __tablename__ = "route_stops"

    id = Column(String, primary_key=True, default=generate_uuid)
    route_id = Column(String, ForeignKey("routes.id", ondelete="CASCADE"), nullable=False, index=True)
    site_id = Column(String, ForeignKey("sites.id", ondelete="CASCADE"), nullable=False, index=True)
    stop_order = Column(Integer, nullable=False)
    narrative = Column(Text, nullable=False)
    transit_mode = Column(String(50), default="caravan_trail")
    travel_note = Column(String(500), nullable=True)

    route = relationship("Route", back_populates="stops")
    site = relationship("Site", back_populates="route_stops")

class Embedding(Base):
    __tablename__ = "embeddings"

    id = Column(String, primary_key=True, default=generate_uuid)
    content_type = Column(String(50), nullable=False, index=True)  # site, ocr_line, folklore, observation
    content_id = Column(String, nullable=False, index=True)
    title = Column(String(255), nullable=False)
    text_snippet = Column(Text, nullable=False)
    embedding = Column(Vector(768), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Job(Base):
    __tablename__ = "jobs"

    id = Column(String, primary_key=True, default=generate_uuid)
    job_type = Column(String(50), nullable=False)  # ocr, translation, 3d_reconstruction, ingest
    status = Column(String(50), default="queued")  # queued, processing, completed, failed
    progress = Column(Integer, default=0)  # 0 to 100
    payload = Column(JSON, default=dict)
    result = Column(JSON, default=dict)
    error = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
