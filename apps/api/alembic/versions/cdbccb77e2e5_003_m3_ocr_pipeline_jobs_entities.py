"""003_m3_ocr_pipeline_jobs_entities

Revision ID: cdbccb77e2e5
Revises: d35a897f3397
Create Date: 2026-11-01 23:15:37.615981

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cdbccb77e2e5'
down_revision: Union[str, Sequence[str], None] = 'd35a897f3397'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Update documents table
    op.add_column('documents', sa.Column('language_hint', sa.String(length=50), server_default='auto', nullable=False))
    op.add_column('documents', sa.Column('doc_type', sa.String(length=50), server_default='printed', nullable=False))
    op.add_column('documents', sa.Column('status', sa.String(length=50), server_default='uploaded', nullable=False))
    op.add_column('documents', sa.Column('uploaded_by', sa.String(length=100), nullable=True))
    op.add_column('documents', sa.Column('source', sa.String(length=255), nullable=True))
    op.add_column('documents', sa.Column('licence', sa.String(length=100), server_default='CC-BY-4.0', nullable=True))
    op.add_column('documents', sa.Column('license', sa.String(length=100), server_default='CC-BY-4.0', nullable=True))
    op.add_column('documents', sa.Column('attribution', sa.String(length=255), nullable=True))
    op.add_column('documents', sa.Column('storage_key', sa.String(length=500), nullable=True))
    op.add_column('documents', sa.Column('mime', sa.String(length=100), nullable=True))
    op.add_column('documents', sa.Column('page_count', sa.Integer(), server_default='1', nullable=True))
    op.add_column('documents', sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True))
    op.add_column('documents', sa.Column('deleted_at', sa.DateTime(), nullable=True))

    op.alter_column('documents', 'language', existing_type=sa.VARCHAR(length=50), nullable=True)
    op.alter_column('documents', 'source_archive', existing_type=sa.VARCHAR(length=255), nullable=True)

    # Backfill source from source_archive
    op.execute("UPDATE documents SET source = source_archive WHERE source IS NULL AND source_archive IS NOT NULL")
    op.execute("UPDATE documents SET status = 'ready' WHERE status = 'uploaded'")

    op.create_index(op.f('ix_documents_status'), 'documents', ['status'], unique=False)
    op.create_index(op.f('ix_documents_site_id'), 'documents', ['site_id'], unique=False)
    op.create_index(op.f('ix_documents_deleted_at'), 'documents', ['deleted_at'], unique=False)

    # 2. Update document_pages table
    op.add_column('document_pages', sa.Column('page_no', sa.Integer(), server_default='1', nullable=False))
    op.add_column('document_pages', sa.Column('image_key', sa.String(length=500), nullable=True))
    op.add_column('document_pages', sa.Column('rotation_deg', sa.Integer(), server_default='0', nullable=True))
    op.add_column('document_pages', sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True))

    op.alter_column('document_pages', 'image_url', existing_type=sa.VARCHAR(length=500), nullable=True)

    op.execute("UPDATE document_pages SET page_no = COALESCE(page_number, 1)")
    op.execute("UPDATE document_pages SET image_key = image_url WHERE image_key IS NULL")

    op.create_index(op.f('ix_document_pages_page_no'), 'document_pages', ['page_no'], unique=False)
    op.create_index(op.f('ix_document_pages_status'), 'document_pages', ['status'], unique=False)

    # 3. Update ocr_lines table
    op.add_column('ocr_lines', sa.Column('line_no', sa.Integer(), nullable=True))
    op.add_column('ocr_lines', sa.Column('text', sa.Text(), nullable=True))
    op.add_column('ocr_lines', sa.Column('polygon', sa.JSON(), nullable=True))
    op.add_column('ocr_lines', sa.Column('lang', sa.String(length=50), server_default='hi', nullable=True))
    op.add_column('ocr_lines', sa.Column('engine', sa.String(length=50), server_default='gemini_vision', nullable=True))

    op.execute("UPDATE ocr_lines SET line_no = COALESCE(line_index, 0), text = COALESCE(original_text, ''), lang = COALESCE(language, 'hi')")
    op.alter_column('ocr_lines', 'line_no', existing_type=sa.Integer(), nullable=False)
    op.alter_column('ocr_lines', 'text', existing_type=sa.Text(), nullable=False)

    op.create_index(op.f('ix_ocr_lines_line_no'), 'ocr_lines', ['line_no'], unique=False)
    op.create_index(op.f('ix_ocr_lines_confidence'), 'ocr_lines', ['confidence'], unique=False)

    # 4. Create translations table
    op.create_table(
        'translations',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('line_id', sa.String(), nullable=True),
        sa.Column('page_id', sa.String(), nullable=True),
        sa.Column('target_lang', sa.String(length=50), server_default='en', nullable=False),
        sa.Column('text', sa.Text(), nullable=False),
        sa.Column('engine', sa.String(length=50), server_default='gemini', nullable=True),
        sa.Column('version', sa.Integer(), server_default='1', nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.ForeignKeyConstraint(['line_id'], ['ocr_lines.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['page_id'], ['document_pages.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_translations_line_id'), 'translations', ['line_id'], unique=False)
    op.create_index(op.f('ix_translations_page_id'), 'translations', ['page_id'], unique=False)
    op.create_index(op.f('ix_translations_target_lang'), 'translations', ['target_lang'], unique=False)

    # Backfill translations from existing ocr_lines.translated_text if present
    op.execute("""
        INSERT INTO translations (id, line_id, page_id, target_lang, text, engine, version, created_at)
        SELECT gen_random_uuid()::varchar, id, page_id, 'en', translated_text, 'seed_engine', 1, CURRENT_TIMESTAMP
        FROM ocr_lines
        WHERE translated_text IS NOT NULL AND translated_text != ''
    """)

    # 5. Create text_versions table
    op.create_table(
        'text_versions',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('entity_type', sa.String(length=50), nullable=False),
        sa.Column('entity_id', sa.String(), nullable=False),
        sa.Column('version_no', sa.Integer(), nullable=False),
        sa.Column('text', sa.Text(), nullable=False),
        sa.Column('edited_by', sa.String(length=100), server_default='curator', nullable=True),
        sa.Column('edited_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('reason', sa.String(length=255), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_text_versions_entity_type'), 'text_versions', ['entity_type'], unique=False)
    op.create_index(op.f('ix_text_versions_entity_id'), 'text_versions', ['entity_id'], unique=False)

    # 6. Create entities table
    op.create_table(
        'entities',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('kind', sa.String(length=50), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('normalised_name', sa.String(length=255), nullable=False),
        sa.Column('wikidata_id', sa.String(length=100), nullable=True),
        sa.Column('site_id', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.ForeignKeyConstraint(['site_id'], ['sites.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_entities_kind'), 'entities', ['kind'], unique=False)
    op.create_index(op.f('ix_entities_normalised_name'), 'entities', ['normalised_name'], unique=False)
    op.create_index(op.f('ix_entities_site_id'), 'entities', ['site_id'], unique=False)

    # 7. Create entity_mentions table
    op.create_table(
        'entity_mentions',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('entity_id', sa.String(), nullable=False),
        sa.Column('line_id', sa.String(), nullable=False),
        sa.Column('char_start', sa.Integer(), nullable=False),
        sa.Column('char_end', sa.Integer(), nullable=False),
        sa.Column('confidence', sa.Float(), server_default='0.9', nullable=True),
        sa.ForeignKeyConstraint(['entity_id'], ['entities.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['line_id'], ['ocr_lines.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_entity_mentions_entity_id'), 'entity_mentions', ['entity_id'], unique=False)
    op.create_index(op.f('ix_entity_mentions_line_id'), 'entity_mentions', ['line_id'], unique=False)

    # 8. Update jobs table
    op.add_column('jobs', sa.Column('kind', sa.String(length=50), server_default='ocr_pipeline', nullable=True))
    op.add_column('jobs', sa.Column('stage', sa.String(length=100), nullable=True))
    op.add_column('jobs', sa.Column('attempts', sa.Integer(), server_default='0', nullable=True))
    op.add_column('jobs', sa.Column('idempotency_key', sa.String(length=255), nullable=True))
    op.add_column('jobs', sa.Column('started_at', sa.DateTime(), nullable=True))
    op.add_column('jobs', sa.Column('finished_at', sa.DateTime(), nullable=True))

    op.execute("UPDATE jobs SET kind = COALESCE(job_type, 'ocr_pipeline')")
    op.alter_column('jobs', 'kind', existing_type=sa.String(length=50), nullable=False)

    op.create_index(op.f('ix_jobs_kind'), 'jobs', ['kind'], unique=False)
    op.create_index(op.f('ix_jobs_status'), 'jobs', ['status'], unique=False)
    op.create_index(op.f('ix_jobs_idempotency_key'), 'jobs', ['idempotency_key'], unique=True)


def downgrade() -> None:
    # Drop jobs columns and indexes
    op.drop_index(op.f('ix_jobs_idempotency_key'), table_name='jobs')
    op.drop_index(op.f('ix_jobs_status'), table_name='jobs')
    op.drop_index(op.f('ix_jobs_kind'), table_name='jobs')
    op.drop_column('jobs', 'finished_at')
    op.drop_column('jobs', 'started_at')
    op.drop_column('jobs', 'idempotency_key')
    op.drop_column('jobs', 'attempts')
    op.drop_column('jobs', 'stage')
    op.drop_column('jobs', 'kind')

    # Drop entity_mentions
    op.drop_table('entity_mentions')

    # Drop entities
    op.drop_table('entities')

    # Drop text_versions
    op.drop_table('text_versions')

    # Drop translations
    op.drop_table('translations')

    # Revert ocr_lines
    op.drop_index(op.f('ix_ocr_lines_confidence'), table_name='ocr_lines')
    op.drop_index(op.f('ix_ocr_lines_line_no'), table_name='ocr_lines')
    op.drop_column('ocr_lines', 'engine')
    op.drop_column('ocr_lines', 'lang')
    op.drop_column('ocr_lines', 'polygon')
    op.drop_column('ocr_lines', 'text')
    op.drop_column('ocr_lines', 'line_no')

    # Revert document_pages
    op.drop_index(op.f('ix_document_pages_status'), table_name='document_pages')
    op.drop_index(op.f('ix_document_pages_page_no'), table_name='document_pages')
    op.drop_column('document_pages', 'created_at')
    op.drop_column('document_pages', 'rotation_deg')
    op.drop_column('document_pages', 'image_key')
    op.drop_column('document_pages', 'page_no')

    # Revert documents
    op.drop_index(op.f('ix_documents_deleted_at'), table_name='documents')
    op.drop_index(op.f('ix_documents_site_id'), table_name='documents')
    op.drop_index(op.f('ix_documents_status'), table_name='documents')
    op.drop_column('documents', 'deleted_at')
    op.drop_column('documents', 'updated_at')
    op.drop_column('documents', 'page_count')
    op.drop_column('documents', 'mime')
    op.drop_column('documents', 'storage_key')
    op.drop_column('documents', 'attribution')
    op.drop_column('documents', 'license')
    op.drop_column('documents', 'licence')
    op.drop_column('documents', 'source')
    op.drop_column('documents', 'uploaded_by')
    op.drop_column('documents', 'status')
    op.drop_column('documents', 'doc_type')
    op.drop_column('documents', 'language_hint')
