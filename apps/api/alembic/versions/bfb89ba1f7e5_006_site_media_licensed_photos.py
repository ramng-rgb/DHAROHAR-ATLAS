"""006_site_media_licensed_photos

Revision ID: bfb89ba1f7e5
Revises: 918a3e72b4c1
Create Date: 2026-11-04 17:17:16.595661

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'bfb89ba1f7e5'
down_revision: str | Sequence[str] | None = '918a3e72b4c1'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Add Step 1 required columns to site_media
    op.add_column("site_media", sa.Column("kind", sa.String(length=50), server_default="gallery", nullable=False))
    op.add_column("site_media", sa.Column("storage_key", sa.String(length=500), nullable=True))
    op.add_column("site_media", sa.Column("remote_url", sa.String(length=1000), nullable=True))
    op.add_column("site_media", sa.Column("width", sa.Integer(), nullable=True))
    op.add_column("site_media", sa.Column("height", sa.Integer(), nullable=True))
    op.add_column("site_media", sa.Column("dominant_colour", sa.String(length=50), nullable=True))
    op.add_column("site_media", sa.Column("blurhash", sa.String(length=100), nullable=True))
    op.add_column("site_media", sa.Column("licence_short", sa.String(length=100), server_default="CC-BY-SA-4.0", nullable=True))
    op.add_column("site_media", sa.Column("licence_url", sa.String(length=500), nullable=True))
    op.add_column("site_media", sa.Column("author", sa.String(length=500), nullable=True))
    op.add_column("site_media", sa.Column("credit", sa.String(length=500), nullable=True))
    op.add_column("site_media", sa.Column("original_filename", sa.String(length=500), nullable=True))
    op.add_column("site_media", sa.Column("is_placeholder", sa.Boolean(), server_default=sa.text("false"), nullable=False))
    op.add_column("site_media", sa.Column("verified", sa.Boolean(), server_default=sa.text("true"), nullable=False))
    op.add_column("site_media", sa.Column("sort_order", sa.Integer(), server_default=sa.text("0"), nullable=False))


def downgrade() -> None:
    op.drop_column("site_media", "sort_order")
    op.drop_column("site_media", "verified")
    op.drop_column("site_media", "is_placeholder")
    op.drop_column("site_media", "original_filename")
    op.drop_column("site_media", "credit")
    op.drop_column("site_media", "author")
    op.drop_column("site_media", "licence_url")
    op.drop_column("site_media", "licence_short")
    op.drop_column("site_media", "blurhash")
    op.drop_column("site_media", "dominant_colour")
    op.drop_column("site_media", "height")
    op.drop_column("site_media", "width")
    op.drop_column("site_media", "remote_url")
    op.drop_column("site_media", "storage_key")
    op.drop_column("site_media", "kind")
