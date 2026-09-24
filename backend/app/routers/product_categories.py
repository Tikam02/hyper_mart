from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_shop
from app.models.catalog import Product, ProductCategory
from app.models.shop import Shop
from app.models.user import User
from app.schemas.catalog import ProductCategoryCreateIn, ProductCategoryOut, ProductCategoryUpdateIn

router = APIRouter(prefix="/api/shops/me/product-categories", tags=["product-categories"])

MAX_CATEGORIES = 30


def _get_own_category(category_id: int, shop: Shop, db: Session) -> ProductCategory:
    category = db.get(ProductCategory, category_id)
    if not category or category.shop_id != shop.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Section not found")
    return category


@router.get("", response_model=list[ProductCategoryOut])
def list_my_categories(
    owner_shop: tuple[User, Shop] = Depends(get_current_shop),
    db: Session = Depends(get_db),
) -> list[ProductCategory]:
    return (
        db.query(ProductCategory)
        .filter(ProductCategory.shop_id == owner_shop[1].id)
        .order_by(ProductCategory.sort_order, ProductCategory.name)
        .all()
    )


@router.post("", response_model=ProductCategoryOut, status_code=status.HTTP_201_CREATED)
def create_my_category(
    body: ProductCategoryCreateIn,
    owner_shop: tuple[User, Shop] = Depends(get_current_shop),
    db: Session = Depends(get_db),
) -> ProductCategory:
    shop = owner_shop[1]
    count = db.query(func.count(ProductCategory.id)).filter(ProductCategory.shop_id == shop.id).scalar() or 0
    if count >= MAX_CATEGORIES:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"You can have up to {MAX_CATEGORIES} sections")

    next_order = db.query(func.coalesce(func.max(ProductCategory.sort_order), -1) + 1).filter(
        ProductCategory.shop_id == shop.id
    ).scalar()
    category = ProductCategory(shop_id=shop.id, name=body.name, sort_order=next_order)
    db.add(category)
    try:
        db.commit()
    except IntegrityError as exc:
        # The (shop_id, name) unique constraint — a duplicate is user error, not
        # a server fault.
        db.rollback()
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f'You already have a section called "{body.name}"') from exc
    db.refresh(category)
    return category


@router.patch("/{category_id}", response_model=ProductCategoryOut)
def update_my_category(
    category_id: int,
    body: ProductCategoryUpdateIn,
    owner_shop: tuple[User, Shop] = Depends(get_current_shop),
    db: Session = Depends(get_db),
) -> ProductCategory:
    category = _get_own_category(category_id, owner_shop[1], db)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(category, field, value)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You already have a section with that name") from exc
    db.refresh(category)
    return category


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_my_category(
    category_id: int,
    owner_shop: tuple[User, Shop] = Depends(get_current_shop),
    db: Session = Depends(get_db),
) -> None:
    category = _get_own_category(category_id, owner_shop[1], db)
    in_use = db.query(func.count(Product.id)).filter(Product.category_id == category.id).scalar() or 0
    if in_use:
        # Refusing is kinder than cascading: the owner loses nothing and the
        # message tells them exactly what to move first.
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"“{category.name}” still has {in_use} product{'s' if in_use != 1 else ''}. "
            "Move or delete them first.",
        )
    db.delete(category)
    db.commit()
