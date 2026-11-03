#!/usr/bin/env python3
import asyncio
import os
import sys

# Add apps/api to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import AsyncSessionLocal
from app.services.search.indexer import SearchIndexer


async def main():
    print("==================================================")
    print("Dharohar Atlas: Semantic Search Indexer Backfill")
    print("==================================================")
    async with AsyncSessionLocal() as session:
        indexer = SearchIndexer(session)
        def on_progress(category: str, current: int, total: int):
            print(f"[{category.upper()}] Indexed {current}/{total}...")

        counts = await indexer.reindex_all(progress_callback=on_progress)
        print("\nReindexing Complete!")
        print(f"Sites indexed:        {counts['sites']}")
        print(f"Documents indexed:    {counts['documents']}")
        print(f"Folklore items:       {counts['folklore']}")
        print(f"Observations:         {counts['observations']}")
        print(f"Total active chunks:  {counts['total_chunks']}")

if __name__ == "__main__":
    asyncio.run(main())
