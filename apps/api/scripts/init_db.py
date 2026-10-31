import asyncio
from app.core.database import engine, Base
from app.models.models import (
    Site, SiteMedia, Model3D, Hotspot, Document, DocumentPage, 
    OCRLine, DocumentEntity, FolkloreItem, ArchitecturalObservation, 
    Route, RouteStop, Embedding, Job
)

async def init_tables():
    print("Connecting to database and creating tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Tables created successfully!")

if __name__ == "__main__":
    asyncio.run(init_tables())
