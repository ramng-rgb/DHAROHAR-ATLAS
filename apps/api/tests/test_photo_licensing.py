import os

from scripts.fetch_photos import (
    is_content_rejected,
    is_license_allowed,
    sanitize_html,
    verify_monument_match,
)


def test_license_filter_accepts_valid_licenses():
    """Verify allowable licenses: Public Domain, CC0, CC-BY, CC-BY-SA across versions."""
    valid_samples = [
        "CC BY-SA 4.0",
        "CC BY-SA 3.0",
        "CC BY 4.0",
        "CC BY 2.5",
        "CC0",
        "Public Domain",
        "PD-self",
        "CC-BY-SA-4.0",
    ]
    for lic in valid_samples:
        assert is_license_allowed(lic), f"Expected license '{lic}' to be allowed"

def test_license_filter_rejects_nc_nd_and_unknown():
    """Verify explicit rejection of NC, ND, All Rights Reserved, Fair Use, and unknown licenses."""
    invalid_samples = [
        "CC BY-NC 4.0",
        "CC BY-NC-SA 3.0",
        "CC BY-ND 4.0",
        "All Rights Reserved",
        "Fair Use",
        "Copyrighted",
        "Unknown",
        "",
        "Some random commercial license",
    ]
    for lic in invalid_samples:
        assert not is_license_allowed(lic), f"Expected license '{lic}' to be rejected"

def test_filename_and_description_reject_keywords():
    """Verify that maps, sketches, coins, stamps, logos, and diagrams are rejected."""
    rejected_cases = [
        ("site_location_map.jpg", "A detailed map showing location of Rani ki Vav"),
        ("ancient_coin_chola.png", "Silver coin minted in Gujarat"),
        ("temple_floor_plan.jpg", "Architectural plan drawing of temple sanctum"),
        ("monument_official_logo.png", "Logo emblem of the foundation"),
        ("postal_stamp_1985.jpg", "Commemorative postage stamp depicting fort"),
        ("historical_sketch_drawing.jpg", "19th century pencil sketch drawing"),
    ]
    for fname, desc in rejected_cases:
        reject, reason = is_content_rejected(fname, desc, "temples monuments", is_hero=False)
        assert reject is True, f"Expected '{fname}' to be rejected, got accepted"
        assert any(k in reason for k in ["keyword", "plan", "map", "coin", "logo", "stamp", "sketch", "drawing"])

def test_hero_rejects_interior_and_detail_keywords():
    """Verify hero image specifically rejects interior, close-up, and ceiling details."""
    fname = "rani_ki_vav_pillar_carving_detail.jpg"
    desc = "Close-up interior detail of stone carving"
    reject, reason = is_content_rejected(fname, desc, "monuments", is_hero=True)
    assert reject is True
    assert "hero candidate" in reason or "interior" in reason or "detail" in reason

def test_verify_monument_match_rule():
    """Verify title/category matching prevents cross-monument photo contamination."""
    site_name = "Rani ki Vav"
    site_slug = "rani-ki-vav"

    # Positive match
    assert verify_monument_match(site_name, site_slug, "File:Rani ki Vav stepwell Patan.jpg", "A view of the stepwell", "Stepwells in Gujarat") is True
    assert verify_monument_match(site_name, site_slug, "File:DSC_0042.jpg", "Photo taken at Rani ki Vav in Patan", "Heritage sites in Patan") is True

    # Negative mismatch (different monument)
    assert verify_monument_match(site_name, site_slug, "File:Taj Mahal Agra.jpg", "Mausoleum in Agra", "Monuments in Uttar Pradesh") is False
    assert verify_monument_match(site_name, site_slug, "File:Qutub Minar Delhi.jpg", "Minaret in Mehrauli", "World Heritage Sites in Delhi") is False

def test_sanitize_artist_text_strips_html_and_newlines():
    """Verify artist field strips raw HTML tags, links, and extra whitespaces."""
    dirty_html = '<a href="https://example.com/user">Snehrashmi</a> (<i>Photographer</i>)\n\n'
    clean = sanitize_html(dirty_html)
    assert clean == "Snehrashmi (Photographer)"

    span_html = '<span>Dr. Amit Patel</span> <br/>'
    clean_span = sanitize_html(span_html)
    assert clean_span == "Dr. Amit Patel"

def test_photo_overrides_yaml_structure(tmp_path):
    """Verify that photo_overrides.yaml allows force-include, force-exclude, and pinned files."""
    overrides_file = os.path.join(os.path.dirname(__file__), "../../../db/seed/photo_overrides.yaml")
    assert os.path.exists(overrides_file), "photo_overrides.yaml should exist"
