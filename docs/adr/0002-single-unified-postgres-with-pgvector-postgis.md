# ADR 002: Unified PostgreSQL Instance with pgvector and PostGIS vs Fragmented Datastores

## Status
Accepted

## Context
A digital cultural heritage platform requires relational data (monuments, users, provenance, audits), spatial GIS queries (bounding-box viewport filtering, nearest neighbor clustering), and high-dimensional semantic vector indexing. Teams often introduce separate databases: MongoDB for documents, Neo4j for graphs, Pinecone for vectors, and Postgres for relational core, leading to distributed consistency lag, complex backups, and inflated deployment costs.

## Decision
We adopted a unified PostgreSQL 16 database leveraging native extensions:
- **Relational Integrity:** Foreign keys cascading between sites, media, models, folios, and lines.
- **pgvector:** 768-dimensional neural vector embeddings indexed via HNSW.
- **pg_trgm:** Multi-lingual fuzzy string similarity and substring indexing.
- **PostGIS / Haversine Functions:** Spatial bounding box queries and geodesic clustering.

## Consequences
- **Positive:** ACID transactions across relational metadata and vector embeddings in a single commit.
- **Positive:** Simplifies developer onboarding and local testing (`make up` launches one database container).
- **Positive:** Enables multi-tenant Row-Level Security (RLS) across vector, spatial, and relational layers.
- **Trade-off:** Memory allocation (`shared_buffers`, `maintenance_work_mem`) must be balanced between relational caching and HNSW graph traversal.
