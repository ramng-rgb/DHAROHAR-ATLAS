import sys
# pyrefly: ignore[missing-import]
import httpx

API_URL = "http://127.0.0.1:8000"
WEB_URL = "http://localhost:3000"

def test_endpoint(client: httpx.Client, method: str, url: str, expected_code: int = 200, **kwargs) -> dict:
    resp = client.request(method, url, timeout=10.0, **kwargs)
    status = resp.status_code
    assert status == expected_code, f"Expected {expected_code} for {url}, got {status}: {resp.text[:200]}"
    return resp.json() if "application/json" in resp.headers.get("content-type", "") else {}

def main():
    print("=== Dharohar Atlas Production Smoke Test ===")
    with httpx.Client() as client:
        # 1. API Liveness
        print("1. Checking API Liveness (/health/live)...", end=" ")
        data = test_endpoint(client, "GET", f"{API_URL}/health/live")
        assert data.get("status") == "healthy"
        print("[OK]")

        # 2. API Readiness
        print("2. Checking API Readiness (/health/ready)...", end=" ")
        data = test_endpoint(client, "GET", f"{API_URL}/health/ready")
        assert data.get("status") == "ready"
        assert data.get("checks", {}).get("database") == "connected"
        assert data.get("checks", {}).get("redis") == "connected"
        print("[OK]")

        # 3. GeoJSON Viewport Query
        print("3. Querying Gujarat GeoJSON Viewport (/api/v1/sites)...", end=" ")
        data = test_endpoint(client, "GET", f"{API_URL}/api/v1/sites?bbox=68,20,74,25")
        sites_list = data if isinstance(data, list) else data.get("features", [])
        assert len(sites_list) >= 8
        print(f"[OK] ({len(sites_list)} sites returned)")

        # 4. Monument Monograph Detail
        print("4. Fetching Rani ki Vav Monograph (/api/v1/sites/rani-ki-vav)...", end=" ")
        data = test_endpoint(client, "GET", f"{API_URL}/api/v1/sites/rani-ki-vav")
        assert data.get("slug") == "rani-ki-vav"
        assert len(data.get("models_3d", [])) >= 1
        print("[OK]")

        # 5. Animated Journey Mode
        print("5. Fetching Gujarat Stepwell Journey (/api/v1/routes/.../journey)...", end=" ")
        data = test_endpoint(client, "GET", f"{API_URL}/api/v1/routes/gujarat-stepwell-trail/journey")
        assert data.get("total_stops") == 8
        assert data.get("full_geometry", {}).get("type") == "LineString"
        print(f"[OK] ({data['total_stops']} stops, {data['total_distance_km']} km)")

        # 6. Facets Aggregation (Cached)
        print("6. Fetching Facets Aggregation (/api/v1/facets)...", end=" ")
        data = test_endpoint(client, "GET", f"{API_URL}/api/v1/facets")
        assert data.get("total_sites", 0) >= 25
        print(f"[OK] ({data['total_sites']} total sites)")

        # 7. Demo Script Integrity
        print("7. Fetching Demo Script (/api/v1/demo/script)...", end=" ")
        data = test_endpoint(client, "GET", f"{API_URL}/api/v1/demo/script")
        assert data.get("total_steps") >= 9
        print(f"[OK] ({data['total_steps']} steps verified)")

        # 8. Grounded Ask the Archive
        print("8. Querying Grounded RAG (/api/v1/ask)...", end=" ")
        data = test_endpoint(
            client,
            "POST",
            f"{API_URL}/api/v1/ask",
            json={"question": "Tell me about Rani ki Vav", "lang": "en"}
        )
        assert "[1]" in data.get("answer", "")
        print("[OK]")

        # 9. Next.js Web Frontend
        print("9. Checking Next.js Web Frontend (http://localhost:3000)...", end=" ")
        resp = client.get(WEB_URL, timeout=10.0)
        assert resp.status_code == 200
        assert "Dharohar" in resp.text
        print("[OK]")

    print("\n>>> ALL 9 SMOKE TESTS PASSED CLEANLY (100% OPERATIONAL) <<<")

if __name__ == "__main__":
    main()
