from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_shop, get_current_user
from app.models.coupon import Coupon, CouponClaim
from app.models.enums import ClaimStatus, CouponStatus
from app.models.shop import Shop
from app.models.user import User
from app.schemas.coupon import (
    CouponClaimOut,
    CouponCreateIn,
    CouponFeedItemOut,
    CouponOut,
    CouponUpdateIn,
    RedeemIn,
)
from app.services.codes import coupon_code, random_code
from app.services.hours import shop_is_open_now

router = APIRouter(tags=["coupons"])


@router.post("/api/shops/me/coupons", response_model=CouponOut, status_code=status.HTTP_201_CREATED)
def create_coupon(
    body: CouponCreateIn,
    owner_shop: tuple[User, Shop] = Depends(get_current_shop),
    db: Session = Depends(get_db),
) -> Coupon:
    coupon = Coupon(
        shop_id=owner_shop[1].id,
        code=coupon_code(body.title),
        title=body.title,
        discount_type=body.discount_type.value,
        discount_value=body.discount_value,
        valid_from=body.valid_from,
        valid_to=body.valid_to,
        max_claims=body.max_claims,
    )
    db.add(coupon)
    db.commit()
    db.refresh(coupon)
    return coupon


@router.get("/api/shops/me/coupons", response_model=list[CouponOut])
def list_my_coupons(
    owner_shop: tuple[User, Shop] = Depends(get_current_shop),
    db: Session = Depends(get_db),
) -> list[Coupon]:
    return db.query(Coupon).filter(Coupon.shop_id == owner_shop[1].id).order_by(Coupon.created_at.desc()).all()


@router.patch("/api/coupons/{coupon_id}", response_model=CouponOut)
def update_coupon(
    coupon_id: int,
    body: CouponUpdateIn,
    owner_shop: tuple[User, Shop] = Depends(get_current_shop),
    db: Session = Depends(get_db),
) -> Coupon:
    coupon = db.get(Coupon, coupon_id)
    if not coupon or coupon.shop_id != owner_shop[1].id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Coupon not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(coupon, field, value)
    db.commit()
    db.refresh(coupon)
    return coupon


@router.post("/api/coupons/{coupon_id}/redeem", response_model=CouponClaimOut)
def redeem_coupon(
    coupon_id: int,
    body: RedeemIn,
    owner_shop: tuple[User, Shop] = Depends(get_current_shop),
    db: Session = Depends(get_db),
) -> CouponClaim:
    coupon = db.get(Coupon, coupon_id)
    if not coupon or coupon.shop_id != owner_shop[1].id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Coupon not found")
    claim = (
        db.query(CouponClaim)
        .filter(CouponClaim.coupon_id == coupon.id, CouponClaim.unique_code == body.unique_code.upper())
        .first()
    )
    if not claim:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No claim with that code for this coupon")
    if claim.status == ClaimStatus.redeemed.value:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Already redeemed")

    claim.status = ClaimStatus.redeemed.value
    claim.redeemed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(claim)
    return claim


@router.get("/api/coupons/feed", response_model=list[CouponFeedItemOut])
def coupon_feed(pincode: str, db: Session = Depends(get_db)) -> list[dict]:
    now = datetime.now(timezone.utc)
    rows = (
        db.query(Coupon, Shop)
        .join(Shop, Shop.id == Coupon.shop_id)
        .filter(
            Coupon.status == CouponStatus.active.value,
            Coupon.valid_from <= now,
            Coupon.valid_to >= now,
            Shop.pincode == pincode,
        )
        .order_by(Coupon.valid_to)
        .all()
    )
    return [
        {
            **{c: getattr(coupon, c) for c in (
                "id", "shop_id", "code", "title", "discount_type", "discount_value",
                "valid_from", "valid_to", "max_claims", "status", "created_at",
            )},
            "shop_name": shop.name,
            # Same helper the listing and shop page use — reading the raw column
            # here would show "Open now" on the feed for a shop whose own page
            # says closed.
            "shop_is_open": shop_is_open_now(shop),
            "shop_pincode": shop.pincode,
        }
        for coupon, shop in rows
    ]


@router.post("/api/coupons/{coupon_id}/claim", response_model=CouponClaimOut, status_code=status.HTTP_201_CREATED)
def claim_coupon(
    coupon_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CouponClaim:
    coupon = db.get(Coupon, coupon_id)
    if not coupon or coupon.status != CouponStatus.active.value:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Coupon not found")

    existing = (
        db.query(CouponClaim)
        .filter(CouponClaim.coupon_id == coupon.id, CouponClaim.customer_user_id == user.id)
        .first()
    )
    if existing:
        return existing

    if coupon.max_claims is not None:
        claim_count = db.query(CouponClaim).filter(CouponClaim.coupon_id == coupon.id).count()
        if claim_count >= coupon.max_claims:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "This coupon has been fully claimed")

    claim = CouponClaim(coupon_id=coupon.id, customer_user_id=user.id, unique_code=random_code(8))
    db.add(claim)
    db.commit()
    db.refresh(claim)
    return claim


@router.get("/api/me/claims", response_model=list[CouponClaimOut])
def my_claims(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[CouponClaim]:
    return (
        db.query(CouponClaim)
        .filter(CouponClaim.customer_user_id == user.id)
        .order_by(CouponClaim.claimed_at.desc())
        .all()
    )
