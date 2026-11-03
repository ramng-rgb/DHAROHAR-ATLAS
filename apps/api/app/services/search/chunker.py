import hashlib
from typing import Any

from pydantic import BaseModel


class ChunkData(BaseModel):
    source_type: str  # site | document_line_group | folklore | observation | translation
    source_id: str
    site_id: str | None = None
    document_id: str | None = None
    page_id: str | None = None
    chunk_index: int = 0
    text: str
    lang: str = "en"
    metadata_json: dict[str, Any] = {}
    is_illustrative: bool = False

    @property
    def content_hash(self) -> str:
        payload = f"{self.source_type}:{self.source_id}:{self.chunk_index}:{self.lang}:{self.text}"
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()


class DocumentChunker:
    """
    Chunks document pages and OCR lines into cohesive ~200-300 token textual units
    while strictly preserving line_id lists and line number ranges for deep linking.
    """
    @staticmethod
    def chunk_document_lines(
        document_id: str,
        page_id: str,
        lines: list[dict[str, Any]],
        site_id: str | None = None,
        doc_title: str = "",
        max_words: int = 60
    ) -> list[ChunkData]:
        if not lines:
            return []

        # Sort lines by line_no
        sorted_lines = sorted(lines, key=lambda l: l.get("line_no", 0))
        chunks: list[ChunkData] = []
        current_words: list[str] = []
        current_line_ids: list[str] = []
        start_line_no = sorted_lines[0].get("line_no", 1)
        end_line_no = start_line_no
        detected_lang = sorted_lines[0].get("lang", "sa")
        chunk_idx = 0

        for line in sorted_lines:
            text = (line.get("text") or "").strip()
            if not text:
                continue

            words = text.split()
            line_id = str(line.get("id"))
            line_no = line.get("line_no", 1)

            if len(current_words) + len(words) > max_words and current_words:
                # Flush current chunk
                chunk_text = " ".join(current_words)
                chunks.append(ChunkData(
                    source_type="document_line_group",
                    source_id=f"{document_id}_{chunk_idx}",
                    site_id=site_id,
                    document_id=document_id,
                    page_id=page_id,
                    chunk_index=chunk_idx,
                    text=chunk_text,
                    lang=detected_lang,
                    metadata_json={
                        "title": doc_title or "Archival Inscription Folio",
                        "line_ids": current_line_ids,
                        "start_line_no": start_line_no,
                        "end_line_no": end_line_no,
                        "page_id": page_id,
                    },
                    is_illustrative=False
                ))
                chunk_idx += 1
                current_words = []
                current_line_ids = []
                start_line_no = line_no

            current_words.extend(words)
            current_line_ids.append(line_id)
            end_line_no = line_no

        if current_words:
            chunk_text = " ".join(current_words)
            chunks.append(ChunkData(
                source_type="document_line_group",
                source_id=f"{document_id}_{chunk_idx}",
                site_id=site_id,
                document_id=document_id,
                page_id=page_id,
                chunk_index=chunk_idx,
                text=chunk_text,
                lang=detected_lang,
                metadata_json={
                    "title": doc_title or "Archival Inscription Folio",
                    "line_ids": current_line_ids,
                    "start_line_no": start_line_no,
                    "end_line_no": end_line_no,
                    "page_id": page_id,
                },
                is_illustrative=False
            ))

        return chunks

    @staticmethod
    def chunk_translations(
        document_id: str,
        page_id: str,
        translations: list[dict[str, Any]],
        site_id: str | None = None,
        doc_title: str = "",
        target_lang: str = "en"
    ) -> list[ChunkData]:
        if not translations:
            return []

        chunks: list[ChunkData] = []
        combined_texts = []
        line_ids = []

        for tr in translations:
            text = (tr.get("text") or "").strip()
            if text:
                combined_texts.append(text)
                if tr.get("line_id"):
                    line_ids.append(str(tr["line_id"]))

        if combined_texts:
            chunks.append(ChunkData(
                source_type="translation",
                source_id=f"{document_id}_tr_0",
                site_id=site_id,
                document_id=document_id,
                page_id=page_id,
                chunk_index=0,
                text=" ".join(combined_texts),
                lang=target_lang,
                metadata_json={
                    "title": f"Translation: {doc_title}",
                    "line_ids": line_ids,
                    "page_id": page_id,
                },
                is_illustrative=False
            ))

        return chunks


class SiteChunker:
    """
    Chunks a monument monograph into a rich semantic entity chunk
    incorporating historical period, architecture, location, and multilingual names.
    """
    @staticmethod
    def chunk_site(site: Any) -> ChunkData:
        names_part = f"{site.name}"
        if getattr(site, "name_hi", None):
            names_part += f" ({site.name_hi})"
        if getattr(site, "name_gu", None):
            names_part += f" ({site.name_gu})"

        text_parts = [
            f"Monument: {names_part}.",
            f"Type: {getattr(site, 'site_type', 'heritage')}.",
            f"State: {getattr(site, 'state', '')}, District: {getattr(site, 'district', '')}.",
            f"Historical Period: {getattr(site, 'period_start_year', '')} to {getattr(site, 'period_end_year', '')} CE ({getattr(site, 'era_label', '')}).",
            f"Summary: {getattr(site, 'summary', '')}"
        ]
        if getattr(site, "source_text", None):
            text_parts.append(f"Historical Citation: {site.source_text}")

        full_text = " ".join(filter(None, text_parts))

        return ChunkData(
            source_type="site",
            source_id=str(site.id),
            site_id=str(site.id),
            chunk_index=0,
            text=full_text,
            lang="en",
            metadata_json={
                "title": site.name,
                "name_hi": getattr(site, "name_hi", None),
                "name_gu": getattr(site, "name_gu", None),
                "slug": getattr(site, "slug", ""),
                "site_type": getattr(site, "site_type", ""),
                "state": getattr(site, "state", ""),
                "district": getattr(site, "district", ""),
                "period_start_year": getattr(site, "period_start_year", None),
                "period_end_year": getattr(site, "period_end_year", None),
                "data_confidence": getattr(site, "data_confidence", "verified"),
            },
            is_illustrative=False
        )


class LoreAndObservationChunker:
    @staticmethod
    def chunk_folklore(folklore: Any, site: Any | None = None) -> ChunkData:
        site_name = site.name if site else "Heritage Site"
        text = f"{folklore.title} ({folklore.kind} for {site_name}): {folklore.body_md}. Source: {folklore.source or 'Living Tradition'}."
        return ChunkData(
            source_type="folklore",
            source_id=str(folklore.id),
            site_id=str(folklore.site_id) if folklore.site_id else None,
            chunk_index=0,
            text=text,
            lang=getattr(folklore, "language", "en") or "en",
            metadata_json={
                "title": folklore.title,
                "kind": folklore.kind,
                "site_name": site_name,
                "site_id": str(folklore.site_id) if folklore.site_id else None,
                "source": folklore.source,
                "data_confidence": getattr(folklore, "data_confidence", "likely"),
                "is_illustrative": getattr(folklore, "is_illustrative", False),
            },
            is_illustrative=getattr(folklore, "is_illustrative", False)
        )

    @staticmethod
    def chunk_observation(observation: Any, site: Any | None = None) -> ChunkData:
        site_name = site.name if site else "Heritage Site"
        text = f"{observation.title} ({observation.kind} at {site_name}): {observation.body_md}. Source: {observation.source or 'Architectural Survey'}."
        return ChunkData(
            source_type="observation",
            source_id=str(observation.id),
            site_id=str(observation.site_id) if observation.site_id else None,
            chunk_index=0,
            text=text,
            lang=getattr(observation, "language", "en") or "en",
            metadata_json={
                "title": observation.title,
                "kind": observation.kind,
                "site_name": site_name,
                "site_id": str(observation.site_id) if observation.site_id else None,
                "source": observation.source,
                "data_confidence": getattr(observation, "data_confidence", "verified"),
                "is_illustrative": getattr(observation, "is_illustrative", False),
            },
            is_illustrative=getattr(observation, "is_illustrative", False)
        )
