"""shop hours, owner product categories, product requests

Revision ID: 80e186e7c2f8
Revises: 93758a9bf80f
Create Date: 2026-09-24 23:42:18.880204

`products.category_id` changes meaning here: it used to point at the global
`categories` taxonomy (shop types like "Grocery & Kirana") and now points at
`product_categories`, a per-shop set of catalog sections the owner names
themselves. Existing rows are carried across by name, so every shop keeps the
sections its products were already filed under.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = '80e186e7c2f8'
down_revision: Union[str, None] = '93758a9bf80f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'product_categories',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('shop_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('sort_order', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['shop_id'], ['shops.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('shop_id', 'name', name='uq_product_category_name'),
    )
    op.create_index(op.f('ix_product_categories_shop_id'), 'product_categories', ['shop_id'], unique=False)

    op.create_table(
        'product_requests',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('shop_id', sa.Integer(), nullable=False),
        sa.Column('customer_user_id', sa.Integer(), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=True),
        sa.Column('text', sa.String(length=300), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('owner_note', sa.String(length=300), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('responded_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['customer_user_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ),
        sa.ForeignKeyConstraint(['shop_id'], ['shops.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_product_requests_customer_user_id'), 'product_requests', ['customer_user_id'], unique=False)
    op.create_index(op.f('ix_product_requests_shop_id'), 'product_requests', ['shop_id'], unique=False)
    op.create_index(op.f('ix_product_requests_status'), 'product_requests', ['status'], unique=False)

    # Drop the old constraint first: the repoint below deliberately writes ids
    # that don't exist in `categories`, which the old FK would reject.
    op.drop_constraint('products_category_id_fkey', 'products', type_='foreignkey')

    # Give each shop one section per global category its products actually use.
    op.execute(
        """
        INSERT INTO product_categories (shop_id, name, sort_order, created_at)
        SELECT DISTINCT p.shop_id, c.name, 0, now()
        FROM products p
        JOIN categories c ON c.id = p.category_id
        """
    )
    op.execute(
        """
        UPDATE products p
        SET category_id = pc.id
        FROM product_categories pc, categories c
        WHERE c.id = p.category_id
          AND pc.shop_id = p.shop_id
          AND pc.name = c.name
        """
    )

    op.create_foreign_key(
        'products_category_id_fkey', 'products', 'product_categories', ['category_id'], ['id']
    )

    op.add_column('shops', sa.Column('opens_at', sa.Time(), nullable=True))
    op.add_column('shops', sa.Column('closes_at', sa.Time(), nullable=True))
    op.add_column('shops', sa.Column('weekly_off', sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column('shops', 'weekly_off')
    op.drop_column('shops', 'closes_at')
    op.drop_column('shops', 'opens_at')

    op.drop_constraint('products_category_id_fkey', 'products', type_='foreignkey')

    # Only sections whose name still matches a global category can be mapped
    # back. A section the owner invented ("Cold Drinks") has no global
    # equivalent, so reversing would orphan those products — fail loudly rather
    # than silently repoint them to an unrelated category.
    conn = op.get_bind()
    unmappable = conn.execute(
        sa.text(
            """
            SELECT count(*)
            FROM products p
            JOIN product_categories pc ON pc.id = p.category_id
            WHERE NOT EXISTS (SELECT 1 FROM categories c WHERE c.name = pc.name)
            """
        )
    ).scalar()
    if unmappable:
        raise RuntimeError(
            f"Cannot downgrade: {unmappable} product(s) sit in owner-created categories "
            "with no global equivalent. Reassign them to a standard category first."
        )

    op.execute(
        """
        UPDATE products p
        SET category_id = c.id
        FROM product_categories pc, categories c
        WHERE pc.id = p.category_id
          AND c.name = pc.name
        """
    )
    op.create_foreign_key('products_category_id_fkey', 'products', 'categories', ['category_id'], ['id'])

    op.drop_index(op.f('ix_product_requests_status'), table_name='product_requests')
    op.drop_index(op.f('ix_product_requests_shop_id'), table_name='product_requests')
    op.drop_index(op.f('ix_product_requests_customer_user_id'), table_name='product_requests')
    op.drop_table('product_requests')
    op.drop_index(op.f('ix_product_categories_shop_id'), table_name='product_categories')
    op.drop_table('product_categories')
