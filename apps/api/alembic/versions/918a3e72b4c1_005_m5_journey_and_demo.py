"""005_m5_journey_and_demo

Revision ID: 918a3e72b4c1
Revises: 7274108e9b4e
Create Date: 2026-11-03 12:35:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '918a3e72b4c1'
down_revision: Union[str, None] = '7274108e9b4e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Extend routes
    op.add_column('routes', sa.Column('title_hi', sa.String(length=255), nullable=True))
    op.add_column('routes', sa.Column('title_gu', sa.String(length=255), nullable=True))
    op.add_column('routes', sa.Column('summary_hi', sa.Text(), nullable=True))
    op.add_column('routes', sa.Column('summary_gu', sa.Text(), nullable=True))
    op.add_column('routes', sa.Column('cover_media_id', sa.String(length=255), nullable=True))
    op.add_column('routes', sa.Column('difficulty', sa.String(length=50), nullable=True, server_default='Moderate'))

    # 2. Extend route_stops
    op.add_column('route_stops', sa.Column('arrival_note_source', sa.String(length=255), nullable=True))
    op.add_column('route_stops', sa.Column('is_illustrative', sa.Boolean(), nullable=True, server_default=sa.false()))
    op.add_column('route_stops', sa.Column('dwell_seconds', sa.Integer(), nullable=True, server_default='12'))
    op.add_column('route_stops', sa.Column('linked_folklore_ids', sa.JSON(), nullable=True, server_default='[]'))
    op.add_column('route_stops', sa.Column('linked_observation_ids', sa.JSON(), nullable=True, server_default='[]'))
    op.add_column('route_stops', sa.Column('linked_document_ids', sa.JSON(), nullable=True, server_default='[]'))


def downgrade() -> None:
    op.drop_column('route_stops', 'linked_document_ids')
    op.drop_column('route_stops', 'linked_observation_ids')
    op.drop_column('route_stops', 'linked_folklore_ids')
    op.drop_column('route_stops', 'dwell_seconds')
    op.drop_column('route_stops', 'is_illustrative')
    op.drop_column('route_stops', 'arrival_note_source')

    op.drop_column('routes', 'difficulty')
    op.drop_column('routes', 'cover_media_id')
    op.drop_column('routes', 'summary_gu')
    op.drop_column('routes', 'summary_hi')
    op.drop_column('routes', 'title_gu')
    op.drop_column('routes', 'title_hi')
