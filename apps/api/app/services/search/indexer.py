import logging
import uuid
from collections.abc import Callable
from datetime import datetime
from typing import Any

from app.models.models import (
    Document,
    DocumentPage,
    FolkloreItem,
    Observation,
    SearchChunk,
    Site,
)
from app.services.search.chunker import (
    ChunkData,
    DocumentChunker,
    LoreAndObservationChunker,
    SiteChunker,
)
from app.services.search.embeddings import EmbeddingProvider, get_embedding_provider
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

logger = logging.getLogger(__name__)

class SearchIndexer:
    def __init__(self, db: AsyncSession, embedding_provider: EmbeddingProvider | None = None):
        self.db = db
        self.embedding_provider = embedding_provider or get_embedding_provider()

    async def index_chunks(self, chunks: list[ChunkData]) -> int:
        """
        Embeds and saves chunks idempotently using content_hash comparison.
        """
        if not chunks:
            return 0

        indexed_count = 0
        for chunk in chunks:
            # Check existing chunk by source_id, chunk_index, and source_type
            q = select(SearchChunk).where(
                SearchChunk.source_type == chunk.source_type,
                SearchChunk.source_id == chunk.source_id,
                SearchChunk.chunk_index == chunk.chunk_index,
                SearchChunk.deleted_at.is_(None)
            )
            res = (await self.db.execute(q)).scalars().first()

            if res:
                if res.content_hash == chunk.content_hash:
                    # Content unchanged, skip re-embedding
                    continue
                # Content changed, update
                vec = await self.embedding_provider.embed_text(chunk.text)
                res.text = chunk.text
                res.lang = chunk.lang
                res.embedding = vec
                res.embedding_model = self.embedding_provider.name
                res.metadata_json = chunk.metadata_json
                res.content_hash = chunk.content_hash
                res.is_illustrative = chunk.is_illustrative
                res.updated_at = datetime.utcnow()
                indexed_count += 1
            else:
                # New chunk, embed and insert
                vec = await self.embedding_provider.embed_text(chunk.text)
                new_chunk = SearchChunk(
                    id=str(uuid.uuid4()),
                    source_type=chunk.source_type,
                    source_id=chunk.source_id,
                    site_id=chunk.site_id,
                    document_id=chunk.document_id,
                    page_id=chunk.page_id,
                    chunk_index=chunk.chunk_index,
                    text=chunk.text,
                    lang=chunk.lang,
                    embedding=vec,
                    embedding_model=self.embedding_provider.name,
                    metadata_json=chunk.metadata_json,
                    content_hash=chunk.content_hash,
                    is_illustrative=chunk.is_illustrative,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                self.db.add(new_chunk)
                indexed_count += 1

        await self.db.flush()
        return indexed_count

    async def index_site(self, site_id: str) -> int:
        stmt = select(Site).where(Site.id == site_id)
        site = (await self.db.execute(stmt)).scalars().first()
        if not site or site.deleted_at:
            await self.soft_delete_chunks("site", site_id)
            return 0

        chunk = SiteChunker.chunk_site(site)
        return await self.index_chunks([chunk])

    async def index_document(self, document_id: str) -> int:
        stmt = (
            select(Document)
            .options(
                selectinload(Document.pages).selectinload(DocumentPage.ocr_lines),
                selectinload(Document.pages).selectinload(DocumentPage.translations)
            )
            .where(Document.id == document_id)
        )
        doc = (await self.db.execute(stmt)).scalars().first()
        if not doc or doc.deleted_at:
            await self.soft_delete_chunks("document_line_group", document_id)
            await self.soft_delete_chunks("translation", document_id)
            return 0

        all_chunks: list[ChunkData] = []
        for page in doc.pages:
            lines_data = [
                {
                    "id": str(line.id),
                    "line_no": line.line_no,
                    "text": line.text,
                    "lang": line.lang,
                    "confidence": line.confidence
                }
                for line in page.ocr_lines
            ]
            page_chunks = DocumentChunker.chunk_document_lines(
                document_id=str(doc.id),
                page_id=str(page.id),
                lines=lines_data,
                site_id=str(doc.site_id) if doc.site_id else None,
                doc_title=doc.title
            )
            all_chunks.extend(page_chunks)

            tr_data = [
                {
                    "id": str(tr.id),
                    "line_id": str(tr.line_id) if tr.line_id else None,
                    "text": tr.text,
                    "target_lang": tr.target_lang
                }
                for tr in page.translations
            ]
            tr_chunks = DocumentChunker.chunk_translations(
                document_id=str(doc.id),
                page_id=str(page.id),
                translations=tr_data,
                site_id=str(doc.site_id) if doc.site_id else None,
                doc_title=doc.title
            )
            all_chunks.extend(tr_chunks)

        return await self.index_chunks(all_chunks)

    async def index_folklore(self, folklore_id: str) -> int:
        stmt = select(FolkloreItem).options(selectinload(FolkloreItem.site)).where(FolkloreItem.id == folklore_id)
        item = (await self.db.execute(stmt)).scalars().first()
        if not item:
            await self.soft_delete_chunks("folklore", folklore_id)
            return 0

        chunk = LoreAndObservationChunker.chunk_folklore(item, item.site)
        return await self.index_chunks([chunk])

    async def index_observation(self, observation_id: str) -> int:
        stmt = select(Observation).options(selectinload(Observation.site)).where(Observation.id == observation_id)
        item = (await self.db.execute(stmt)).scalars().first()
        if not item:
            await self.soft_delete_chunks("observation", observation_id)
            return 0

        chunk = LoreAndObservationChunker.chunk_observation(item, item.site)
        return await self.index_chunks([chunk])

    async def soft_delete_chunks(self, source_type: str, source_id: str) -> None:
        stmt = (
            update(SearchChunk)
            .where(
                SearchChunk.source_type == source_type,
                (SearchChunk.source_id.startswith(source_id) | (SearchChunk.document_id == source_id) | (SearchChunk.site_id == source_id))
            )
            .values(deleted_at=datetime.utcnow())
        )
        await self.db.execute(stmt)
        await self.db.flush()

    async def reindex_all(self, progress_callback: Callable[[str, int, int], None] | None = None) -> dict[str, Any]:
        """
        Backfills all sites, documents, folklore items, and observations into search_chunks.
        """
        counts = {"sites": 0, "documents": 0, "folklore": 0, "observations": 0, "total_chunks": 0}

        # 1. Sites
        sites = (await self.db.execute(select(Site).where(Site.deleted_at.is_(None)))).scalars().all()
        for idx, site in enumerate(sites):
            c = await self.index_site(str(site.id))
            counts["sites"] += 1
            counts["total_chunks"] += c
            if progress_callback:
                progress_callback("sites", idx + 1, len(sites))

        # 2. Documents
        docs = (await self.db.execute(select(Document).where(Document.deleted_at.is_(None)))).scalars().all()
        for idx, doc in enumerate(docs):
            c = await self.index_document(str(doc.id))
            counts["documents"] += 1
            counts["total_chunks"] += c
            if progress_callback:
                progress_callback("documents", idx + 1, len(docs))

        # 3. Folklore
        folklore = (await self.db.execute(select(FolkloreItem))).scalars().all()
        for idx, f in enumerate(folklore):
            c = await self.index_folklore(str(f.id))
            counts["folklore"] += 1
            counts["total_chunks"] += c
            if progress_callback:
                progress_callback("folklore", idx + 1, len(folklore))

        # 4. Observations
        obs = (await self.db.execute(select(Observation))).scalars().all()
        for idx, o in enumerate(obs):
            c = await self.index_observation(str(o.id))
            counts["observations"] += 1
            counts["total_chunks"] += c
            if progress_callback:
                progress_callback("observations", idx + 1, len(obs))

        await self.db.commit()
        return counts
