"""widen_site_media_attribution_and_author

Revision ID: 086951796eae
Revises: bfb89ba1f7e5
Create Date: 2026-11-04 18:12:01.804215

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '086951796eae'
down_revision: Union[str, Sequence[str], None] = 'bfb89ba1f7e5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.alter_column('site_media', 'attribution', type_=sa.Text(), existing_type=sa.String(length=255))
    op.alter_column('site_media', 'author', type_=sa.Text(), existing_type=sa.String(length=500))
    op.alter_column('site_media', 'credit', type_=sa.Text(), existing_type=sa.String(length=500))
    op.alter_column('sites', 'hero_image_attribution', type_=sa.Text(), existing_type=sa.String(length=255))


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column('sites', 'hero_image_attribution', type_=sa.String(length=255), existing_type=sa.Text())
    op.alter_column('site_media', 'attribution', type_=sa.String(length=255), existing_type=sa.Text())
    op.alter_column('site_media', 'author', type_=sa.String(length=500), existing_type=sa.Text())
    op.alter_column('site_media', 'credit', type_=sa.String(length=500), existing_type=sa.Text())
