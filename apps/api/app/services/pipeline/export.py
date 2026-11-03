import json
import xml.etree.ElementTree as ET
from typing import Any
from xml.dom import minidom

from app.models.models import Document


def export_document_as_txt(doc: Document) -> str:
    lines = []
    lines.append(f"# {doc.title}")
    if doc.site:
        lines.append(f"Linked Heritage Site: {doc.site.name} ({doc.site.state})")
    lines.append(f"Licence: {doc.licence or 'CC-BY-4.0'}")
    lines.append("=" * 60)

    for page in doc.pages:
        lines.append(f"\n--- Page {page.page_no} ---")
        for line in page.ocr_lines:
            trans_str = ""
            if line.translations:
                trans_str = f"  -> [EN]: {line.translations[0].text}"
            elif line.translated_text:
                trans_str = f"  -> [EN]: {line.translated_text}"
            lines.append(f"[{line.line_no:02d}] {line.text}{trans_str}")

    return "\n".join(lines)

def export_document_as_json(doc: Document) -> str:
    data: dict[str, Any] = {
        "id": doc.id,
        "title": doc.title,
        "language_hint": doc.language_hint,
        "doc_type": doc.doc_type,
        "status": doc.status,
        "licence": doc.licence,
        "attribution": doc.attribution,
        "site_id": doc.site_id,
        "created_at": doc.created_at.isoformat() if doc.created_at else None,
        "pages": []
    }

    for page in doc.pages:
        p_data = {
            "page_no": page.page_no,
            "width": page.width,
            "height": page.height,
            "image_key": page.image_key,
            "lines": []
        }
        for l in page.ocr_lines:
            translations = [{"target_lang": t.target_lang, "text": t.text} for t in l.translations]
            p_data["lines"].append({
                "id": l.id,
                "line_no": l.line_no,
                "text": l.text,
                "bbox": {"x": l.bbox_x, "y": l.bbox_y, "w": l.bbox_w, "h": l.bbox_h},
                "confidence": l.confidence,
                "lang": l.lang,
                "engine": l.engine,
                "translations": translations
            })
        data["pages"].append(p_data)

    return json.dumps(data, ensure_ascii=False, indent=2)

def export_document_as_alto_xml(doc: Document) -> str:
    """
    Standard Library of Congress ALTO XML format for digitized text and layout.
    """
    alto = ET.Element("alto", xmlns="http://www.loc.gov/standards/alto/ns-v4#")
    description = ET.SubElement(alto, "Description")
    measurement = ET.SubElement(description, "MeasurementUnit")
    measurement.text = "pixel"
    source = ET.SubElement(description, "sourceInformation")
    fileName = ET.SubElement(source, "fileName")
    fileName.text = doc.original_filename or f"{doc.title}.jpg"

    layout = ET.SubElement(alto, "Layout")

    for page in doc.pages:
        page_elem = ET.SubElement(
            layout, "Page",
            ID=f"page_{page.page_no}",
            PHYSICAL_IMG_NR=str(page.page_no),
            WIDTH=str(page.width),
            HEIGHT=str(page.height)
        )
        print_space = ET.SubElement(
            page_elem, "PrintSpace",
            HPOS="0", VPOS="0", WIDTH=str(page.width), HEIGHT=str(page.height)
        )
        text_block = ET.SubElement(
            print_space, "TextBlock",
            ID=f"block_{page.page_no}_1",
            HPOS="0", VPOS="0", WIDTH=str(page.width), HEIGHT=str(page.height)
        )

        for line in page.ocr_lines:
            # Denormalize coordinates to pixels
            hpos = int(line.bbox_x * page.width)
            vpos = int(line.bbox_y * page.height)
            width = int(line.bbox_w * page.width)
            height = int(line.bbox_h * page.height)

            text_line = ET.SubElement(
                text_block, "TextLine",
                ID=f"line_{line.id}",
                HPOS=str(hpos),
                VPOS=str(vpos),
                WIDTH=str(width),
                HEIGHT=str(height)
            )
            # Add string element
            ET.SubElement(
                text_line, "String",
                CONTENT=line.text,
                WC=f"{line.confidence:.3f}",
                HPOS=str(hpos),
                VPOS=str(vpos),
                WIDTH=str(width),
                HEIGHT=str(height)
            )

    xml_str = ET.tostring(alto, encoding="utf-8")
    parsed = minidom.parseString(xml_str)
    return parsed.toprettyxml(indent="  ")
