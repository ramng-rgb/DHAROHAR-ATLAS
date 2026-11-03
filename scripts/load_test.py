import asyncio
import statistics
import time
from typing import Any
import httpx

BASE_URL = "http://127.0.0.1:8000"
CONCURRENCY = 50
TOTAL_REQUESTS_PER_WORKER = 10

ENDPOINTS = [
    ("GET", "/api/v1/sites?bbox=68,20,74,25"),
    ("GET", "/api/v1/search?q=stepwell&limit=10"),
    ("GET", "/api/v1/facets"),
    ("GET", "/api/v1/sites/rani-ki-vav"),
    ("GET", "/api/v1/routes/gujarat-stepwell-trail/journey"),
    ("POST", "/api/v1/ask", {"question": "Tell me about Rani ki Vav", "lang": "en"}),
]

async def worker(worker_id: int, results: list[dict[str, Any]], semaphore: asyncio.Semaphore):
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0) as client:
        for i in range(TOTAL_REQUESTS_PER_WORKER):
            for ep in ENDPOINTS:
                async with semaphore:
                    method = ep[0]
                    path = ep[1]
                    payload = ep[2] if len(ep) > 2 else None

                    start = time.perf_counter()
                    try:
                        if method == "GET":
                            resp = await client.get(path, headers={"X-Internal-Token": "dharohar-internal-metrics-key"})
                        else:
                            resp = await client.post(path, json=payload, headers={"X-Internal-Token": "dharohar-internal-metrics-key"})
                        elapsed_ms = (time.perf_counter() - start) * 1000.0
                        results.append({
                            "endpoint": path,
                            "status": resp.status_code,
                            "latency_ms": elapsed_ms,
                            "error": resp.status_code >= 400
                        })
                    except Exception as e:
                        elapsed_ms = (time.perf_counter() - start) * 1000.0
                        results.append({
                            "endpoint": path,
                            "status": 0,
                            "latency_ms": elapsed_ms,
                            "error": True,
                            "exception": str(e)
                        })

async def main():
    print(f"=== Starting High-Concurrency Load Test ({CONCURRENCY} virtual users) ===")
    print(f"Endpoints: {len(ENDPOINTS)} | Requests per worker: {TOTAL_REQUESTS_PER_WORKER} | Total Target: {CONCURRENCY * TOTAL_REQUESTS_PER_WORKER * len(ENDPOINTS)} requests")
    
    semaphore = asyncio.Semaphore(CONCURRENCY)
    results: list[dict[str, Any]] = []
    
    t0 = time.perf_counter()
    tasks = [worker(w, results, semaphore) for w in range(CONCURRENCY)]
    await asyncio.gather(*tasks)
    total_time = time.perf_counter() - t0
    
    total_requests = len(results)
    errors = [r for r in results if r["error"]]
    latencies = [r["latency_ms"] for r in results]
    latencies.sort()
    
    p50 = statistics.median(latencies)
    p95 = latencies[int(len(latencies) * 0.95)]
    p99 = latencies[int(len(latencies) * 0.99)]
    avg = statistics.mean(latencies)
    rps = total_requests / total_time
    
    print("\n--- Load Test Results ---")
    print(f"Total Completed:  {total_requests} requests in {total_time:.2f}s ({rps:.1f} req/s)")
    print(f"Error Count:      {len(errors)} ({len(errors)/total_requests*100:.2f}%)")
    print(f"Latency Avg:      {avg:.2f} ms")
    print(f"Latency p50:      {p50:.2f} ms")
    print(f"Latency p95:      {p95:.2f} ms")
    print(f"Latency p99:      {p99:.2f} ms")
    
    # Endpoint breakdown
    print("\n--- Latency By Endpoint (p50 / p95) ---")
    endpoint_groups: dict[str, list[float]] = {}
    for r in results:
        ep = r["endpoint"].split("?")[0]
        endpoint_groups.setdefault(ep, []).append(r["latency_ms"])
        
    for ep, l_list in endpoint_groups.items():
        l_list.sort()
        ep_p50 = statistics.median(l_list)
        ep_p95 = l_list[int(len(l_list) * 0.95)]
        print(f"{ep:<35} : p50={ep_p50:>6.2f}ms | p95={ep_p95:>6.2f}ms (count={len(l_list)})")

if __name__ == "__main__":
    asyncio.run(main())
