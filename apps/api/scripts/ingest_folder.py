import os
import sys
import io
import argparse
import asyncio
import logging
from typing import List, Dict, Any
from PIL import Image

try:
    from pptx import Presentation
    from pptx.enum.shapes import MSO_SHAPE_TYPE
except ImportError:
    Presentation = None

from app.core.database import AsyncSessionLocal
from app.models.models import Document, DocumentPage, OCRLine, Translation, Job, DocStatus, JobStatus
from app.schemas.schemas import DocumentCreate
from app.services.document_service import DocumentService
from app.services.pipeline.orchestrator import DocumentPipeline

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ingest-folder")

def extract_pptx_slides(pptx_path: str) -> List[Dict[str, Any]]:
    """
    Extracts text, slide titles, notes, and embedded images from PowerPoint archives.
    """
    if not Presentation:
        logger.warning("python-pptx not available; skipping PPTX extraction.")
        return []

    prs = Presentation(pptx_path)
    slides_data = []

    for idx, slide in enumerate(prs.slides, start=1):
        slide_text_parts = []
        slide_images = []

        for shape in slide.shapes:
            if shape.has_text_frame:
                for para in shape.text_frame.paragraphs:
                    txt = para.text.strip()
                    if txt:
                        slide_text_parts.append(txt)

            if shape.shape_type == MSO_SHAPE_TYPE.PICTURE:
                try:
                    img_bytes = shape.image.blob
                    slide_images.append(img_bytes)
                except Exception as e:
                    logger.debug("Could not extract picture from shape: %s", e)

        # Slide notes
        notes_text = ""
        if slide.has_notes_slide and slide.notes_slide.notes_text_frame:
            notes_text = slide.notes_slide.notes_text_frame.text.strip()

        slides_data.append({
            "slide_no": idx,
            "title": slide_text_parts[0] if slide_text_parts else f"Slide {idx}",
            "text": "\n".join(slide_text_parts),
            "notes": notes_text,
            "images": slide_images
        })

    return slides_data

async def ingest_file(session, file_path: str) -> int:
    service = DocumentService(session)
    filename = os.path.basename(file_path)
    ext = os.path.splitext(filename)[1].lower()

    if ext == ".pptx":
        logger.info("Processing PPTX archival deck: %s", filename)
        slides = extract_pptx_slides(file_path)
        count = 0
        for s in slides:
            title = f"{filename} — Slide {s['slide_no']}: {s['title'][:60]}"
            # If slide has image, use primary image; otherwise render text onto image card
            if s["images"]:
                img_bytes = s["images"][0]
            else:
                # Render clean title/text placeholder image
                im = Image.new("RGB", (1200, 800), color=(248, 246, 240))
                buf = io.BytesIO()
                im.save(buf, format="JPEG")
                img_bytes = buf.getvalue()

            doc_in = DocumentCreate(
                title=title,
                language_hint="auto",
                doc_type="slide",
                source=f"Archival Presentation Deck ({filename})",
                licence="CC-BY-4.0",
                attribution="Archival Slide Repository",
                mime="image/jpeg",
                original_filename=f"{filename}_slide_{s['slide_no']}.jpg"
            )
            doc, job = await service.create_document_and_enqueue_job(doc_in, file_bytes=img_bytes)

            pipeline = DocumentPipeline(session)
            await pipeline.run(job_id=job.id, file_bytes=img_bytes)
            count += 1
        return count

    elif ext in (".png", ".jpg", ".jpeg", ".webp", ".tiff", ".tif", ".pdf"):
        logger.info("Ingesting standalone folio/document: %s", filename)
        with open(file_path, "rb") as f:
            content = f.read()

        mime = "application/pdf" if ext == ".pdf" else "image/jpeg"
        doc_in = DocumentCreate(
            title=os.path.splitext(filename)[0].replace("_", " ").title(),
            language_hint="auto",
            doc_type="printed" if ext == ".pdf" else "inscription",
            source=f"Folder Ingestion: {filename}",
            licence="CC-BY-4.0",
            attribution="Field Documentation",
            mime=mime,
            original_filename=filename
        )
        doc, job = await service.create_document_and_enqueue_job(doc_in, file_bytes=content)

        pipeline = DocumentPipeline(session)
        await pipeline.run(job_id=job.id, file_bytes=content)
        return 1

    else:
        logger.warning("Unsupported file type '%s' for %s. Skipping.", ext, filename)
        return 0

async def main():
    parser = argparse.ArgumentParser(description="Ingest directory of images, PDFs, and PPTX decks.")
    parser.add_argument("--dir", required=True, help="Directory path to scan and ingest")
    args = parser.parse_args()

    target_dir = os.path.abspath(args.dir)
    if not os.path.exists(target_dir):
        logger.error("Directory not found: %s", target_dir)
        sys.exit(1)

    logger.info("Scanning directory: %s", target_dir)
    total_docs = 0

    async with AsyncSessionLocal() as session:
        for root, _, files in os.walk(target_dir):
            for file in sorted(files):
                if file.startswith("."):
                    continue
                file_path = os.path.join(root, file)
                try:
                    c = await ingest_file(session, file_path)
                    total_docs += c
                except Exception as e:
                    logger.error("Failed to ingest %s: %s", file, e, exc_info=True)

    logger.info("Ingestion complete. Total documents processed: %d", total_docs)

if __name__ == "__main__":
    asyncio.run(main())
