
from pydantic import BaseModel, Field


class ExtractedEntity(BaseModel):
    kind: str = Field(..., description="place | dynasty | person | date | deity | artifact | other")
    name: str
    normalised_name: str
    wikidata_id: str | None = None
    linked_site_id: str | None = None
    link_confidence: float | None = None

class ExtractedMention(BaseModel):
    line_id: str
    line_no: int
    char_start: int = Field(..., ge=0)
    char_end: int = Field(..., ge=0)
    confidence: float = Field(default=0.9, ge=0.0, le=1.0)
    entity_name: str
    entity_kind: str

class EntityExtractionResult(BaseModel):
    entities: list[ExtractedEntity] = Field(default_factory=list)
    mentions: list[ExtractedMention] = Field(default_factory=list)
