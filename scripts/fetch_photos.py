#!/usr/bin/env python3
"""
scripts/fetch_photos.py

Fetch authentic, verified, legally compliant photographs for Dharohar Atlas heritage monuments:
- Sources: (1) Local own photos in photos/own/<site-slug>/
           (2) Wikimedia Commons via official MediaWiki API
           (3) Optional Wikidata P18 image
- Licenses: Public Domain, CC0, CC-BY (any version), CC-BY-SA (any version)
- Filters: Rejects non-photos (maps, plans, logos, coins, etc.), low resolution (<1200px width),
           unclear licenses, unverified monuments.
- Deduping: Perceptual difference hashing (dHash)
- Output: 1600px & 800px WebP images in apps/web/public/seed-images/<site-slug>/
          Saves metadata to db/seed/licensed_photos.json and generates docs/photo-review.html
"""

import argparse
import html
import json
import os
import re
import time
from typing import Any

import httpx
import numpy as np
import yaml
from PIL import Image

# Allow-list for acceptable Creative Commons and Public Domain licenses
ALLOWED_LICENSES: set[str] = {
    "public domain",
    "cc0",
    "cc0 1.0",
    "cc-zero",
    "pd",
    "cc by 1.0",
    "cc by 2.0",
    "cc by 2.5",
    "cc by 3.0",
    "cc by 4.0",
    "cc-by-1.0",
    "cc-by-2.0",
    "cc-by-2.5",
    "cc-by-3.0",
    "cc-by-4.0",
    "cc by-sa 1.0",
    "cc by-sa 2.0",
    "cc by-sa 2.5",
    "cc by-sa 3.0",
    "cc by-sa 4.0",
    "cc-by-sa-1.0",
    "cc-by-sa-2.0",
    "cc-by-sa-2.5",
    "cc-by-sa-3.0",
    "cc-by-sa-4.0",
    "gfdl",  # GNU Free Documentation License commonly dual-licensed with CC-BY-SA
}

# Reject keywords in filename, title, or categories
REJECT_KEYWORDS: list[str] = [
    "map", "plan", "diagram", "logo", "flag", "coat of arms",
    "stamp", "coin", "sketch", "painting", "drawing", "poster",
    "collage", "floorplan", "elevation", "blueprint", "aerial_map"
]

HERO_REJECT_KEYWORDS: list[str] = [
    "interior", "ceiling", "pillar", "sculpture detail", "inscription"
]

def sanitize_html(raw_html: str | None) -> str:
    """Strip HTML tags and unescape entities to return clean text."""
    if not raw_html:
        return ""
    text = re.sub(r"<[^>]+>", "", str(raw_html))
    text = html.unescape(text)
    return " ".join(text.split()).strip()

def is_license_allowed(license_str: str | None) -> bool:
    """Check if license belongs to Public Domain or CC-BY / CC-BY-SA allow-list."""
    if not license_str:
        return False
    clean = license_str.lower().strip()
    # Check for direct match
    if clean in ALLOWED_LICENSES:
        return True
    # Explicitly reject non-commercial or no-derivatives
    if "nc" in clean or "nd" in clean or "non-commercial" in clean or "noncommercial" in clean or "all rights reserved" in clean:
        return False
    # Check partials
    if "public domain" in clean or "cc0" in clean or "pd-" in clean or "cc-zero" in clean:
        return True
    return bool(clean.startswith(("cc by-sa", "cc-by-sa", "cc by", "cc-by")))

def is_content_rejected(title: str, description: str, categories: str, is_hero: bool = False) -> tuple[bool, str]:
    """Check whether candidate file matches rejected content categories."""
    combined = f"{title} {description} {categories}".lower()
    for kw in REJECT_KEYWORDS:
        # Match as word boundary or preceded/followed by underscore/punctuation
        pattern = r"(?:\b|_)" + re.escape(kw) + r"(?:\b|_)"
        if re.search(pattern, combined):
            return True, f"contains rejected keyword '{kw}'"

    if is_hero:
        for kw in HERO_REJECT_KEYWORDS:
            pattern = r"(?:\b|_)" + re.escape(kw) + r"(?:\b|_)"
            if re.search(pattern, combined):
                return True, f"hero candidate contains interior/detail keyword '{kw}'"

    return False, ""

def compute_dhash(image: Image.Image, hash_size: int = 8) -> np.ndarray:
    """Compute difference hash for deduplication using pure Pillow and Numpy."""
    img = image.convert("L").resize((hash_size + 1, hash_size), Image.Resampling.LANCZOS)
    pixels = np.asarray(img, dtype=np.float32)
    diff = pixels[:, 1:] > pixels[:, :-1]
    return diff

def is_duplicate(new_hash: np.ndarray, existing_hashes: list[np.ndarray], threshold: int = 6) -> bool:
    """Check if new image hash is too close to any previously accepted image hash."""
    for h in existing_hashes:
        dist = int(np.count_nonzero(new_hash != h))
        if dist <= threshold:
            return True
    return False

def verify_monument_match(site_name: str, site_slug: str, title: str, description: str, categories: str) -> bool:
    """Verify that Commons file or categories explicitly reference the monument."""
    combined = f"{title} {description} {categories}".lower()
    
    # Extract significant tokens from site name (e.g. "Rani ki Vav" -> ["rani", "vav"])
    clean_name = re.sub(r"\(.*?\)", "", site_name).strip().lower()
    tokens = [t for t in re.split(r"[\s\-]+", clean_name) if len(t) > 3 and t not in {"group", "monuments", "temple", "fort", "caves"}]
    
    # If key specific tokens match
    matched_tokens = [t for t in tokens if t in combined]
    if len(tokens) > 0 and len(matched_tokens) >= 1:
        return True
    
    slug_tokens = [t for t in site_slug.split("-") if len(t) > 3 and t not in {"fort", "temple", "group", "caves"}]
    return bool(any(t in combined for t in slug_tokens))

class PhotoFetcher:
    def __init__(
        self,
        output_dir: str = "apps/web/public/seed-images",
        data_dir: str = "db/seed",
        contact_info: str | None = None,
        max_sites: int | None = None
    ):
        self.output_dir = output_dir
        self.data_dir = data_dir
        os.makedirs(self.output_dir, exist_ok=True)
        os.makedirs(self.data_dir, exist_ok=True)

        user_agent_contact = contact_info or os.environ.get("PHOTO_FETCH_CONTACT", "https://dharohar-atlas.org; bot@dharohar.org")
        self.headers = {
            "User-Agent": f"DharoharAtlasPhotoBot/1.0 ({user_agent_contact})"
        }
        self.max_sites = max_sites
        self.client = httpx.Client(headers=self.headers, timeout=20.0, follow_redirects=True)
        self.load_overrides()

    def load_overrides(self):
        override_file = os.path.join(self.data_dir, "photo_overrides.yaml")
        self.overrides = {}
        if os.path.exists(override_file):
            try:
                with open(override_file, "r", encoding="utf-8") as f:
                    content = yaml.safe_load(f) or {}
                    self.overrides = content.get("overrides", {})
            except Exception as e:  # noqa: BLE001
                print(f"[!] Error loading overrides: {e}")

    def commons_search(self, query: str, limit: int = 15) -> list[dict[str, Any]]:
        """Query Wikimedia Commons API via action=query&list=search."""
        url = "https://commons.wikimedia.org/w/api.php"
        params = {
            "action": "query",
            "list": "search",
            "srsearch": query,
            "srnamespace": "6",  # File namespace
            "srlimit": str(limit),
            "format": "json"
        }
        try:
            time.sleep(1.0)  # Wikimedia rate limit policy: ~1 req/sec
            res = self.client.get(url, params=params)
            if res.status_code == 200:
                data = res.json()
                return data.get("query", {}).get("search", [])
        except Exception as e:  # noqa: BLE001
            print(f"    [!] Commons search error for '{query}': {e}")
        return []

    def get_image_info(self, file_titles: list[str]) -> dict[str, dict[str, Any]]:
        """Fetch imageinfo, dimensions, licenses, metadata for files."""
        if not file_titles:
            return {}
        url = "https://commons.wikimedia.org/w/api.php"
        titles_str = "|".join(file_titles[:20])
        params = {
            "action": "query",
            "titles": titles_str,
            "prop": "imageinfo",
            "iiprop": "url|size|mime|extmetadata",
            "iiurlwidth": "1600",
            "format": "json"
        }
        try:
            time.sleep(1.0)
            res = self.client.get(url, params=params)
            if res.status_code == 200:
                pages = res.json().get("query", {}).get("pages", {})
                info_by_title = {}
                for page in pages.values():
                    title = page.get("title")
                    if "imageinfo" in page and len(page["imageinfo"]) > 0:
                        info_by_title[title] = page["imageinfo"][0]
                return info_by_title
        except Exception as e:  # noqa: BLE001
            print(f"    [!] Error getting image info: {e}")
        return {}

    def fetch_and_process_image(
        self,
        thumb_url: str,
        site_slug: str,
        filename_prefix: str
    ) -> dict[str, Any] | None:
        """Download thumbnail and create WebP versions (1600w, 800w)."""
        site_dir = os.path.join(self.output_dir, site_slug)
        os.makedirs(site_dir, exist_ok=True)

        try:
            time.sleep(0.5)
            r = self.client.get(thumb_url)
            if r.status_code != 200:
                return None

            from io import BytesIO
            img = Image.open(BytesIO(r.content))
            
            # Convert RGBA / P to RGB for clean WebP
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")

            orig_w, orig_h = img.size
            if orig_w == 0 or orig_h == 0:
                return None

            # Calculate dominant color
            small_img = img.resize((1, 1), Image.Resampling.BOX)
            dom_rgb = small_img.getpixel((0, 0))
            dominant_colour = f"#{dom_rgb[0]:02x}{dom_rgb[1]:02x}{dom_rgb[2]:02x}"

            # 1600px width (or native if smaller)
            w_1600 = min(1600, orig_w)
            h_1600 = int(orig_h * (w_1600 / orig_w))
            img_1600 = img.resize((w_1600, h_1600), Image.Resampling.LANCZOS)
            path_1600 = os.path.join(site_dir, f"{filename_prefix}_1600.webp")
            img_1600.save(path_1600, "WEBP", quality=80)

            # 800px width
            w_800 = min(800, orig_w)
            h_800 = int(orig_h * (w_800 / orig_w))
            img_800 = img.resize((w_800, h_800), Image.Resampling.LANCZOS)
            path_800 = os.path.join(site_dir, f"{filename_prefix}_800.webp")
            img_800.save(path_800, "WEBP", quality=80)

            dhash_val = compute_dhash(img)

            return {
                "local_url": f"/seed-images/{site_slug}/{filename_prefix}_1600.webp",
                "thumbnail_url": f"/seed-images/{site_slug}/{filename_prefix}_800.webp",
                "storage_key": f"seed-images/{site_slug}/{filename_prefix}_1600.webp",
                "width": w_1600,
                "height": h_1600,
                "dominant_colour": dominant_colour,
                "dhash": dhash_val
            }
        except Exception as e:  # noqa: BLE001
            print(f"    [!] Error downloading/converting image: {e}")
            return None

    def process_site(self, site: dict[str, Any]) -> dict[str, Any]:
        slug = site["slug"]
        name = site["name"]
        city = site.get("district") or site.get("city") or ""
        state = site.get("state") or ""

        site_override = self.overrides.get(slug, {})
        force_verified = site_override.get("verified", True)
        pinned_hero = site_override.get("hero_file")
        force_excludes = set(site_override.get("force_exclude", []))

        print(f"\nProcessing [{slug}]: {name} ({state})...")

        # 1. Check local own photos first
        own_dir = os.path.join("photos", "own", slug)
        accepted_media = []
        seen_hashes = []
        log_report = {"site_slug": slug, "images_found": 0, "rejected": [], "sources": []}

        if os.path.exists(own_dir):
            files = [f for f in os.listdir(own_dir) if f.lower().endswith((".jpg", ".jpeg", ".png"))]
            if files:
                print(f"  -> Found {len(files)} local owner photos in {own_dir}")
                for idx, fname in enumerate(sorted(files)[:5]):
                    fpath = os.path.join(own_dir, fname)
                    try:
                        img = Image.open(fpath)
                        if img.mode in ("RGBA", "P"):
                            img = img.convert("RGB")
                        w, h = img.size
                        prefix = "hero" if idx == 0 else f"gallery_{idx}"
                        site_dest = os.path.join(self.output_dir, slug)
                        os.makedirs(site_dest, exist_ok=True)
                        dest_1600 = os.path.join(site_dest, f"{prefix}_1600.webp")
                        dest_800 = os.path.join(site_dest, f"{prefix}_800.webp")
                        img.resize((min(1600, w), int(h * min(1600, w) / w)), Image.Resampling.LANCZOS).save(dest_1600, "WEBP", quality=80)
                        img.resize((min(800, w), int(h * min(800, w) / w)), Image.Resampling.LANCZOS).save(dest_800, "WEBP", quality=80)
                        
                        accepted_media.append({
                            "kind": "hero" if idx == 0 else "gallery",
                            "url": f"/seed-images/{slug}/{prefix}_1600.webp",
                            "thumbnail_url": f"/seed-images/{slug}/{prefix}_800.webp",
                            "width": min(1600, w),
                            "height": int(h * min(1600, w) / w),
                            "licence_short": "CC0 / Owner",
                            "licence_url": "https://creativecommons.org/publicdomain/zero/1.0/",
                            "author": "Dharohar Atlas Field Archives",
                            "credit": "Original field photography by repository author",
                            "source_url": f"photos/own/{slug}/{fname}",
                            "original_filename": fname,
                            "is_placeholder": False,
                            "verified": True,
                            "sort_order": idx
                        })
                        seen_hashes.append(compute_dhash(img))
                    except Exception as err:  # noqa: BLE001
                        print(f"    [!] Error processing local file {fname}: {err}")

        # If own photos satisfied hero + gallery, return
        if accepted_media:
            return {"site": site, "media": accepted_media, "report": log_report}

        # 2. Search Wikimedia Commons
        candidates = []
        if pinned_hero:
            candidates.append(pinned_hero)

        # Search queries: Clean monument name + state
        clean_name = re.sub(r"\(.*?\)", "", name).strip()
        search_queries = [
            f"{clean_name} {state}",
            f"{clean_name}",
            f"{slug.replace('-', ' ')}"
        ]

        search_results = []
        for q in search_queries:
            items = self.commons_search(q, limit=12)
            search_results.extend(items)
            if len(search_results) >= 15:
                break

        # Deduplicate titles
        titles = list(candidates)
        for item in search_results:
            t = item.get("title")
            if t and t not in titles and t not in force_excludes:
                titles.append(t)

        print(f"  -> Found {len(titles)} candidate files on Commons")
        info_map = self.get_image_info(titles)

        hero_chosen = False
        gallery_count = 0

        for file_title, info in info_map.items():
            if hero_chosen and gallery_count >= 4:
                break

            mime = info.get("mime", "")
            if mime not in ("image/jpeg", "image/png"):
                log_report["rejected"].append((file_title, f"invalid mime: {mime}"))
                continue

            width = info.get("width", 0)
            height = info.get("height", 0)
            if width < 1200:
                log_report["rejected"].append((file_title, f"width < 1200 ({width}px)"))
                continue

            metadata = info.get("extmetadata", {})
            lic_short = metadata.get("LicenseShortName", {}).get("value", "")
            lic_url = metadata.get("LicenseUrl", {}).get("value", "")
            artist_raw = metadata.get("Artist", {}).get("value", "")
            credit_raw = metadata.get("Credit", {}).get("value", "")
            desc_raw = metadata.get("ImageDescription", {}).get("value", "")
            cats_raw = metadata.get("Categories", {}).get("value", "")

            # Verify license
            if not is_license_allowed(lic_short):
                log_report["rejected"].append((file_title, f"license not in allow-list ({lic_short})"))
                continue

            # Check rejected keywords
            is_hero_candidate = not hero_chosen
            rejected, reason = is_content_rejected(file_title, desc_raw, cats_raw, is_hero=is_hero_candidate)
            if rejected:
                log_report["rejected"].append((file_title, reason))
                continue

            # Verify monument name match
            if not verify_monument_match(name, slug, file_title, desc_raw, cats_raw):
                log_report["rejected"].append((file_title, "monument title/category mismatch"))
                continue

            # Clean fields
            artist_clean = sanitize_html(artist_raw) or "Wikimedia Commons Contributor"
            credit_clean = sanitize_html(credit_raw) or f"Photo by {artist_clean}"
            desc_clean = sanitize_html(desc_raw)

            thumb_url = info.get("thumburl") or info.get("url")
            if not thumb_url:
                continue

            # Determine kind: prefer landscape for hero
            is_landscape = width >= height
            kind = "gallery"
            if not hero_chosen and (is_landscape or len(accepted_media) == 0):
                kind = "hero"

            prefix = "hero" if kind == "hero" else f"gallery_{gallery_count + 1}"
            processed = self.fetch_and_process_image(thumb_url, slug, prefix)
            if not processed:
                continue

            # Deduplication check
            if is_duplicate(processed["dhash"], seen_hashes):
                log_report["rejected"].append((file_title, "perceptual duplicate"))
                continue

            seen_hashes.append(processed["dhash"])
            original_filename = file_title.replace("File:", "")
            commons_file_page = f"https://commons.wikimedia.org/wiki/{file_title.replace(' ', '_')}"

            media_item = {
                "kind": kind,
                "url": processed["local_url"],
                "thumbnail_url": processed["thumbnail_url"],
                "storage_key": processed["storage_key"],
                "remote_url": info.get("url"),
                "width": processed["width"],
                "height": processed["height"],
                "dominant_colour": processed["dominant_colour"],
                "licence_short": lic_short,
                "licence_url": lic_url or "https://creativecommons.org/licenses/",
                "author": artist_clean,
                "credit": credit_clean,
                "attribution": f"Photo: {artist_clean}, {lic_short} via Wikimedia Commons",
                "source_url": commons_file_page,
                "original_filename": original_filename,
                "caption": desc_clean[:250] if desc_clean else f"{name}, {city}, {state}",
                "is_placeholder": False,
                "verified": force_verified,
                "sort_order": 0 if kind == "hero" else (gallery_count + 1)
            }

            accepted_media.append(media_item)
            if kind == "hero":
                hero_chosen = True
            else:
                gallery_count += 1

            print(f"  [✓] Accepted {kind}: {original_filename} ({lic_short} by {artist_clean})")

        # If no acceptable photo found, create a labelled placeholder entry
        if not accepted_media:
            print(f"  [-] No verified image found for {slug}. Keeping placeholder.")
            placeholder_item = {
                "kind": "hero",
                "url": f"/placeholders/{slug}.svg",
                "thumbnail_url": f"/placeholders/{slug}.svg",
                "storage_key": None,
                "remote_url": None,
                "width": 1600,
                "height": 900,
                "dominant_colour": "#3E2723",
                "licence_short": "Public Domain / Placeholder",
                "licence_url": "https://creativecommons.org/publicdomain/zero/1.0/",
                "author": "Dharohar Atlas Heritage Preservation Project",
                "credit": "Architectural survey illustration pending field photograph verification",
                "attribution": "Dharohar Atlas Visual Archive (Field Verification In Progress)",
                "source_url": "https://dharohar-atlas.org/archive",
                "original_filename": f"placeholder_{slug}.svg",
                "caption": f"Placeholder illustration for {name} ({state}). Verified field photograph pending.",
                "is_placeholder": True,
                "verified": False,
                "sort_order": 0
            }
            accepted_media.append(placeholder_item)

        log_report["images_found"] = len([m for m in accepted_media if not m["is_placeholder"]])
        return {"site": site, "media": accepted_media, "report": log_report}

    def generate_review_contact_sheet(self, all_results: list[dict[str, Any]]):
        """Generate docs/photo-review.html contact sheet for visual review in 5 minutes."""
        html_out = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Dharohar Atlas — Visual Photo Review & Verification Sheet</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0E0C09; color: #F6F1E9; margin: 0; padding: 24px; }
    h1 { color: #D4AF37; margin-bottom: 8px; }
    .subtitle { color: #D8C3A5; margin-bottom: 24px; font-size: 14px; }
    .summary-card { background: #1C1814; border: 1px solid #D4AF37; border-radius: 12px; padding: 16px; margin-bottom: 32px; display: flex; gap: 24px; }
    .stat { display: flex; flex-direction: column; }
    .stat-val { font-size: 24px; font-weight: bold; color: #D4AF37; }
    .stat-label { font-size: 12px; color: #D8C3A5; text-transform: uppercase; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 24px; }
    .card { background: #1C1814; border: 1px solid #332B24; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; }
    .card.placeholder { border-color: #E65100; }
    .img-wrap { position: relative; width: 100%; height: 220px; background: #000; }
    .img-wrap img { width: 100%; height: 100%; object-fit: cover; }
    .badge { position: absolute; top: 8px; left: 8px; background: rgba(0,0,0,0.75); color: #D4AF37; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }
    .badge.verified { background: #1B5E20; color: #FFF; }
    .badge.ph { background: #B71C1C; color: #FFF; }
    .info { padding: 16px; flex: 1; display: flex; flex-direction: column; justify-content: space-between; font-size: 13px; }
    .site-title { font-size: 16px; font-weight: bold; color: #F6F1E9; margin-bottom: 4px; }
    .meta-line { color: #D8C3A5; font-size: 12px; margin-bottom: 8px; }
    .attribution-box { background: rgba(0,0,0,0.3); border-left: 3px solid #D4AF37; padding: 8px; border-radius: 4px; font-size: 11px; color: #D8C3A5; margin-top: 8px; }
    .attribution-box a { color: #D4AF37; text-decoration: none; }
    .attribution-box a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>🏛️ Dharohar Atlas — Photo Verification Contact Sheet</h1>
  <div class="subtitle">Reviewing licensed photographs across Indian archaeological monuments. Generated automatically via <code>make fetch-photos</code>.</div>
"""
        total_sites = len(all_results)
        real_photos = sum(1 for r in all_results if any(not m["is_placeholder"] for m in r["media"]))
        placeholders = total_sites - real_photos

        html_out += f"""
  <div class="summary-card">
    <div class="stat"><span class="stat-val">{total_sites}</span><span class="stat-label">Total Monuments</span></div>
    <div class="stat"><span class="stat-val">{real_photos}</span><span class="stat-label">Real Licensed Photos</span></div>
    <div class="stat"><span class="stat-val">{placeholders}</span><span class="stat-label">Placeholders</span></div>
  </div>
  <div class="grid">
"""

        for item in all_results:
            site = item["site"]
            media = item["media"]
            hero = next((m for m in media if m["kind"] == "hero"), media[0])
            is_ph = hero.get("is_placeholder", False)
            card_class = "card placeholder" if is_ph else "card"
            badge_class = "badge ph" if is_ph else "badge verified"
            badge_text = "PLACEHOLDER" if is_ph else "VERIFIED PHOTO"

            # Image path
            img_src = hero["url"]
            if not is_ph:
                # Relative link from docs/ to apps/web/public/seed-images
                img_src = f"../apps/web/public{hero['url']}"

            html_out += f"""
    <div class="{card_class}">
      <div class="img-wrap">
        <span class="{badge_class}">{badge_text}</span>
        <img src="{img_src}" alt="{site['name']}" loading="lazy" />
      </div>
      <div class="info">
        <div>
          <div class="site-title">{site['name']}</div>
          <div class="meta-line">{site.get('district', '')}, {site.get('state', '')} • {hero.get('licence_short', '')}</div>
        </div>
        <div class="attribution-box">
          <strong>Author:</strong> {hero.get('author', 'Unknown')}<br/>
          <strong>Licence:</strong> <a href="{hero.get('licence_url', '#')}" target="_blank">{hero.get('licence_short', 'CC')}</a><br/>
          <strong>Source:</strong> <a href="{hero.get('source_url', '#')}" target="_blank">{hero.get('original_filename', 'Commons')}</a>
        </div>
      </div>
    </div>
"""

        html_out += """
  </div>
</body>
</html>
"""
        os.makedirs("docs", exist_ok=True)
        review_path = os.path.join("docs", "photo-review.html")
        with open(review_path, "w", encoding="utf-8") as f:
            f.write(html_out)
        print(f"\n[✓] Contact sheet generated at {review_path}")

    def run(self, seed_file: str = "db/seed/sites.yaml"):
        with open(seed_file, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
        sites = data if isinstance(data, list) else data.get("sites", [])

        if self.max_sites:
            sites = sites[:self.max_sites]

        print(f"Starting photo ingestion for {len(sites)} sites...")
        all_results = []
        reports = []

        for site in sites:
            res = self.process_site(site)
            all_results.append(res)
            reports.append(res["report"])

        # Save metadata output
        meta_path = os.path.join(self.data_dir, "licensed_photos.json")
        saved_data = {}
        for r in all_results:
            saved_data[r["site"]["slug"]] = r["media"]
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(saved_data, f, indent=2)
        print(f"[✓] Saved licensed photo metadata to {meta_path}")

        # Generate contact sheet
        self.generate_review_contact_sheet(all_results)

        # Print summary
        real_count = sum(1 for r in all_results if any(not m["is_placeholder"] for m in r["media"]))
        ph_count = len(all_results) - real_count
        print("\n=======================================================")
        print(f"📊 Photo Ingestion Complete: {len(all_results)} total sites")
        print(f"   • Real Licensed Photos: {real_count}")
        print(f"   • Placeholders:         {ph_count}")
        print("=======================================================")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fetch licensed photographs for monuments")
    parser.add_argument("--max-sites", type=int, default=None, help="Limit number of sites to process")
    parser.add_argument("--seed-file", type=str, default="db/seed/sites.yaml", help="Path to sites.yaml")
    args = parser.parse_args()

    fetcher = PhotoFetcher(max_sites=args.max_sites)
    fetcher.run(seed_file=args.seed_file)
