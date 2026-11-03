"""004_m4_semantic_search_and_rag

Revision ID: 7274108e9b4e
Revises: cdbccb77e2e5
Create Date: 2026-11-03 11:28:48.833949

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from pgvector.sqlalchemy import Vector

# revision identifiers, used by Alembic.
revision: str = '7274108e9b4e'
down_revision: Union[str, Sequence[str], None] = 'cdbccb77e2e5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Extensions & Functions
    op.execute("CREATE EXTENSION IF NOT EXISTS vector;")
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm;")
    op.execute("CREATE EXTENSION IF NOT EXISTS unaccent;")
    op.execute("""
        CREATE OR REPLACE FUNCTION immutable_unaccent(text)
          RETURNS text AS
        $func$
        SELECT public.unaccent('public.unaccent', $1)
        $func$ LANGUAGE sql IMMUTABLE;
    """)

    # 2. search_chunks table
    op.create_table(
        'search_chunks',
        sa.Column('id', sa.String(length=100), primary_key=True),
        sa.Column('source_type', sa.String(length=50), nullable=False),  # site, document_line_group, folklore, observation, translation
        sa.Column('source_id', sa.String(length=100), nullable=False),
        sa.Column('site_id', sa.String(length=100), sa.ForeignKey('sites.id', ondelete='SET NULL'), nullable=True),
        sa.Column('document_id', sa.String(length=100), sa.ForeignKey('documents.id', ondelete='SET NULL'), nullable=True),
        sa.Column('page_id', sa.String(length=100), sa.ForeignKey('document_pages.id', ondelete='SET NULL'), nullable=True),
        sa.Column('chunk_index', sa.Integer(), server_default='0', nullable=False),
        sa.Column('text', sa.Text(), nullable=False),
        sa.Column('lang', sa.String(length=50), server_default='en', nullable=False),
        sa.Column('embedding', Vector(768), nullable=False),
        sa.Column('embedding_model', sa.String(length=100), server_default='text-embedding-004', nullable=False),
        sa.Column('metadata_json', postgresql.JSONB(astext_type=sa.Text()), server_default='{}', nullable=False),
        sa.Column(
            'tsv',
            postgresql.TSVECTOR(),
            sa.Computed("to_tsvector('simple', immutable_unaccent(text))", persisted=True),
            nullable=True,
        ),
        sa.Column('content_hash', sa.String(length=64), nullable=False),
        sa.Column('is_illustrative', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
    )

    # 3. Indexes on search_chunks
    # HNSW vector index (cosine distance)
    op.execute(
        "CREATE INDEX ix_search_chunks_embedding_hnsw ON search_chunks USING hnsw (embedding vector_cosine_ops);"
    )
    # GIN on tsvector
    op.create_index('ix_search_chunks_tsv', 'search_chunks', ['tsv'], postgresql_using='gin')
    # GIN on text for trigram similarity
    op.execute(
        "CREATE INDEX ix_search_chunks_text_trgm ON search_chunks USING gin (text gin_trgm_ops);"
    )
    # Compound B-tree for filtering
    op.create_index(
        'ix_search_chunks_source_site_doc_lang',
        'search_chunks',
        ['source_type', 'site_id', 'document_id', 'lang']
    )
    op.create_index(op.f('ix_search_chunks_source_id'), 'search_chunks', ['source_id'], unique=False)
    op.create_index(op.f('ix_search_chunks_site_id'), 'search_chunks', ['site_id'], unique=False)
    op.create_index(op.f('ix_search_chunks_document_id'), 'search_chunks', ['document_id'], unique=False)
    op.create_index(op.f('ix_search_chunks_content_hash'), 'search_chunks', ['content_hash'], unique=False)
    op.create_index(op.f('ix_search_chunks_deleted_at'), 'search_chunks', ['deleted_at'], unique=False)

    # 4. search_queries analytics table (no personal data)
    op.create_table(
        'search_queries',
        sa.Column('id', sa.String(length=100), primary_key=True),
        sa.Column('query', sa.Text(), nullable=False),
        sa.Column('lang', sa.String(length=50), nullable=True),
        sa.Column('filters', postgresql.JSONB(astext_type=sa.Text()), server_default='{}', nullable=False),
        sa.Column('result_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('latency_ms', sa.Float(), server_default='0.0', nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
    )
    op.create_index(op.f('ix_search_queries_created_at'), 'search_queries', ['created_at'], unique=False)


def downgrade() -> None:
    op.drop_table('search_queries')
    op.drop_table('search_chunks')
