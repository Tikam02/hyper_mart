from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_shop, get_current_user, get_session_id
from app.models.catalog import Category, Product, ProductCategory, ShopCategory
from app.models.coupon import Coupon, CouponClaim
from app.models.enums import ClaimStatus, CouponStatus, EventType, ShopStatus, UserRole
from app.models.shop import Shop, ShopImage
from app.models.social import Follow, Review
from app.models.user import User
from app.schemas.shop import (
    ShopCategoriesIn,
    ShopCreateIn,
    ShopDetailOut,
    ShopImageIn,
    ShopImageOut,
    ShopImageUpdateIn,
    ShopOut,
    ShopPublicOut,
    ShopUpdateIn,
)
from app.services.events import log_event
from app.services.hours import shop_is_open_now, shop_open_state

router = APIRouter(prefix="/api/shops", tags=["shops"])

PUBLIC_FIELDS = ("id", "name", "address_text", "pincode", "locality", "contact_number", "is_open", "created_at")
MAX_SHOP_IMAGES = 20


def _owner_view(shop: Shop) -> dict:
    """ShopOut payload: the owner's raw stored fields, plus what customers see.

    The dashboard needs both — the override switch reflects `is_open`, while the
    status line ("Open now, closes 9:00 PM") reflects `is_open_now`.
    """
    is_open_now, closed_reason = shop_open_state(shop)
    return {
        **{col.name: getattr(shop, col.name) for col in Shop.__table__.columns},
        "is_open_now": is_open_now,
        "closed_reason": closed_reason,
    }


def _cover_url_column():
    """Lowest-ordered image for each shop, as a correlated subquery.

    Deliberately not `sort_order == 0`: deleting the cover leaves a shop whose
    lowest sort_order is 1, and an equality filter would silently drop its
    photo from the listing. Ordering and taking the first is delete-proof.
    """
    return (
        select(ShopImage.url)
        .where(ShopImage.shop_id == Shop.id)
        .order_by(ShopImage.sort_order, ShopImage.id)
        .limit(1)
        .scalar_subquery()
    )


@router.post("/me", response_model=ShopOut, status_code=status.HTTP_201_CREATED)
def create_my_shop(body: ShopCreateIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    existing = db.query(Shop).filter(Shop.owner_user_id == user.id).first()
    if existing:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This account already has a shop")

    shop = Shop(owner_user_id=user.id, **body.model_dump())
    db.add(shop)
    user.role = UserRole.shop_owner.value
    db.commit()
    db.refresh(shop)
    return _owner_view(shop)


@router.get("/me", response_model=ShopOut)
def get_my_shop(owner_shop: tuple[User, Shop] = Depends(get_current_shop)) -> dict:
    return _owner_view(owner_shop[1])


@router.patch("/me", response_model=ShopOut)
def update_my_shop(
    body: ShopUpdateIn,
    owner_shop: tuple[User, Shop] = Depends(get_current_shop),
    db: Session = Depends(get_db),
) -> dict:
    shop = owner_shop[1]
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(shop, field, value)
    db.commit()
    db.refresh(shop)
    return _owner_view(shop)


@router.get("/me/categories", response_model=list[int])
def get_my_categories(
    owner_shop: tuple[User, Shop] = Depends(get_current_shop),
    db: Session = Depends(get_db),
) -> list[int]:
    shop = owner_shop[1]
    return [sc.category_id for sc in db.query(ShopCategory).filter(ShopCategory.shop_id == shop.id)]


@router.put("/me/categories", response_model=list[int])
def set_my_categories(
    body: ShopCategoriesIn,
    owner_shop: tuple[User, Shop] = Depends(get_current_shop),
    db: Session = Depends(get_db),
) -> list[int]:
    shop = owner_shop[1]
    db.query(ShopCategory).filter(ShopCategory.shop_id == shop.id).delete()
    for cid in body.category_ids:
        db.add(ShopCategory(shop_id=shop.id, category_id=cid))
    db.commit()
    return body.category_ids


@router.get("", response_model=list[ShopPublicOut])
def list_shops(
    pincode: str,
    q: str | None = None,
    session_id: str = Depends(get_session_id),
    db: Session = Depends(get_db),
) -> list[dict]:
    # Ratings come from one grouped subquery joined once, not a lookup per shop:
    # the listing renders a card per row and would otherwise scale as N+1.
    ratings = (
        db.query(
            Review.shop_id.label("shop_id"),
            func.count(Review.id).label("review_count"),
            func.avg(Review.rating).label("avg_rating"),
        )
        .group_by(Review.shop_id)
        .subquery()
    )
    query = (
        db.query(Shop, ratings.c.review_count, ratings.c.avg_rating, _cover_url_column().label("cover_url"))
        .outerjoin(ratings, ratings.c.shop_id == Shop.id)
        .filter(Shop.pincode == pincode, Shop.status == ShopStatus.active.value)
    )
    if q:
        like = f"%{q}%"
        query = query.filter(
            or_(
                Shop.name.ilike(like),
                Shop.id.in_(
                    db.query(Product.shop_id).filter(Product.name.ilike(like))
                ),
            )
        )
        log_event(db, type=EventType.search.value, session_id=session_id, query_text=q)

    rows = query.order_by(Shop.name).all()
    out = [
        {
            **{c: getattr(shop, c) for c in PUBLIC_FIELDS},
            # Overrides the stored column: open/closed is derived from trading
            # hours, so the raw value would contradict the shop's own page.
            "is_open": shop_is_open_now(shop),
            "cover_url": cover_url,
            "review_count": review_count or 0,
            "avg_rating": round(float(avg_rating), 1) if avg_rating else None,
        }
        for shop, review_count, avg_rating, cover_url in rows
    ]
    # Sorted here rather than in SQL: the database can't evaluate the hours rule,
    # so ordering by the raw column would float shops that are actually shut.
    out.sort(key=lambda s: (not s["is_open"], s["name"]))
    return out


@router.get("/{shop_id}", response_model=ShopDetailOut)
def get_shop(shop_id: int, session_id: str = Depends(get_session_id), db: Session = Depends(get_db)) -> dict:
    shop = db.get(Shop, shop_id)
    if not shop or shop.status != ShopStatus.active.value:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Shop not found")

    log_event(db, type=EventType.shop_view.value, session_id=session_id, shop_id=shop.id)

    category_ids = [sc.category_id for sc in db.query(ShopCategory).filter(ShopCategory.shop_id == shop.id)]
    categories = db.query(Category).filter(Category.id.in_(category_ids)).all() if category_ids else []
    products = db.query(Product).filter(Product.shop_id == shop.id).all()
    product_categories = (
        db.query(ProductCategory)
        .filter(ProductCategory.shop_id == shop.id)
        .order_by(ProductCategory.sort_order, ProductCategory.name)
        .all()
    )
    active_coupons = (
        db.query(Coupon)
        .filter(Coupon.shop_id == shop.id, Coupon.status == CouponStatus.active.value)
        .order_by(Coupon.valid_to)
        .all()
    )
    review_count, avg_rating = db.query(func.count(Review.id), func.avg(Review.rating)).filter(
        Review.shop_id == shop.id
    ).one()
    images = (
        db.query(ShopImage)
        .filter(ShopImage.shop_id == shop.id)
        .order_by(ShopImage.sort_order, ShopImage.id)
        .all()
    )
    follower_count = db.query(func.count(Follow.id)).filter(Follow.shop_id == shop.id).scalar() or 0
    # Coupons actually redeemed in-store — the shop's real track record, as
    # opposed to an owner-typed number nobody can verify.
    redeemed_count = (
        db.query(func.count(CouponClaim.id))
        .join(Coupon, Coupon.id == CouponClaim.coupon_id)
        .filter(Coupon.shop_id == shop.id, CouponClaim.status == ClaimStatus.redeemed.value)
        .scalar()
        or 0
    )

    return {
        **{c: getattr(shop, c) for c in PUBLIC_FIELDS},
        "is_open": shop_is_open_now(shop),
        "description": shop.description,
        "opens_at": shop.opens_at,
        "closes_at": shop.closes_at,
        "weekly_off": shop.weekly_off,
        "cover_url": images[0].url if images else None,
        "images": images,
        "categories": categories,
        "product_categories": product_categories,
        "products": products,
        "active_coupons": active_coupons,
        "review_count": review_count or 0,
        "avg_rating": round(float(avg_rating), 1) if avg_rating else None,
        "follower_count": follower_count,
        "redeemed_count": redeemed_count,
    }


@router.get("/me/images", response_model=list[ShopImageOut])
def list_my_images(
    owner_shop: tuple[User, Shop] = Depends(get_current_shop),
    db: Session = Depends(get_db),
) -> list[ShopImage]:
    shop = owner_shop[1]
    return (
        db.query(ShopImage)
        .filter(ShopImage.shop_id == shop.id)
        .order_by(ShopImage.sort_order, ShopImage.id)
        .all()
    )


@router.post("/me/images", response_model=ShopImageOut, status_code=status.HTTP_201_CREATED)
def add_my_image(
    body: ShopImageIn,
    owner_shop: tuple[User, Shop] = Depends(get_current_shop),
    db: Session = Depends(get_db),
) -> ShopImage:
    shop = owner_shop[1]
    count = db.query(func.count(ShopImage.id)).filter(ShopImage.shop_id == shop.id).scalar() or 0
    if count >= MAX_SHOP_IMAGES:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"A shop can have up to {MAX_SHOP_IMAGES} photos")

    next_order = db.query(func.coalesce(func.max(ShopImage.sort_order), -1) + 1).filter(
        ShopImage.shop_id == shop.id
    ).scalar()
    image = ShopImage(shop_id=shop.id, url=body.url, caption=body.caption, sort_order=next_order)
    db.add(image)
    db.commit()
    db.refresh(image)
    return image


@router.patch("/me/images/{image_id}", response_model=ShopImageOut)
def update_my_image(
    image_id: int,
    body: ShopImageUpdateIn,
    owner_shop: tuple[User, Shop] = Depends(get_current_shop),
    db: Session = Depends(get_db),
) -> ShopImage:
    shop = owner_shop[1]
    image = db.get(ShopImage, image_id)
    if not image or image.shop_id != shop.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Photo not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(image, field, value)
    db.commit()
    db.refresh(image)
    return image


@router.delete("/me/images/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_my_image(
    image_id: int,
    owner_shop: tuple[User, Shop] = Depends(get_current_shop),
    db: Session = Depends(get_db),
) -> None:
    shop = owner_shop[1]
    image = db.get(ShopImage, image_id)
    if not image or image.shop_id != shop.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Photo not found")
    db.delete(image)
    db.commit()
