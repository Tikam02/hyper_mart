from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_shop, get_current_user
from app.models.catalog import Product
from app.models.enums import RequestStatus, ShopStatus
from app.models.product_request import ProductRequest
from app.models.shop import Shop
from app.models.user import User
from app.schemas.product_request import (
    ProductRequestCreateIn,
    ProductRequestCustomerOut,
    ProductRequestOwnerOut,
    ProductRequestRespondIn,
)
from app.services.rate_limit import check_rate_limit

router = APIRouter(tags=["product-requests"])

REQUEST_FIELDS = (
    "id", "shop_id", "product_id", "text", "status", "owner_note", "created_at", "responded_at",
)


@router.post(
    "/api/shops/{shop_id}/requests",
    response_model=ProductRequestCustomerOut,
    status_code=status.HTTP_201_CREATED,
)
def ask_shop(
    shop_id: int,
    body: ProductRequestCreateIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    shop = db.get(Shop, shop_id)
    if not shop or shop.status != ShopStatus.active.value:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Shop not found")

    # A shop owner's phone buzzes for these, so cap how fast one account can
    # fire them at a single shop.
    check_rate_limit(f"request:{user.id}:{shop_id}", max_hits=5, window_seconds=600)

    if body.product_id is not None:
        product = db.get(Product, body.product_id)
        if not product or product.shop_id != shop_id:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "That product isn't in this shop")

    request = ProductRequest(
        shop_id=shop_id,
        customer_user_id=user.id,
        product_id=body.product_id,
        text=body.text,
    )
    db.add(request)
    db.commit()
    db.refresh(request)
    return {**{f: getattr(request, f) for f in REQUEST_FIELDS}, "shop_name": shop.name}


@router.get("/api/me/requests", response_model=list[ProductRequestCustomerOut])
def my_requests(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[dict]:
    rows = (
        db.query(ProductRequest, Shop)
        .join(Shop, Shop.id == ProductRequest.shop_id)
        .filter(ProductRequest.customer_user_id == user.id)
        .order_by(ProductRequest.created_at.desc())
        .all()
    )
    return [
        {**{f: getattr(request, f) for f in REQUEST_FIELDS}, "shop_name": shop.name}
        for request, shop in rows
    ]


@router.get("/api/shops/me/requests", response_model=list[ProductRequestOwnerOut])
def shop_requests(
    owner_shop: tuple[User, Shop] = Depends(get_current_shop),
    db: Session = Depends(get_db),
) -> list[dict]:
    rows = (
        db.query(ProductRequest, User)
        .join(User, User.id == ProductRequest.customer_user_id)
        .filter(ProductRequest.shop_id == owner_shop[1].id)
        # Unanswered first: this list is a to-do, not a history.
        .order_by(
            (ProductRequest.status != RequestStatus.pending.value),
            ProductRequest.created_at.desc(),
        )
        .all()
    )
    return [
        {**{f: getattr(request, f) for f in REQUEST_FIELDS}, "customer_phone": customer.phone}
        for request, customer in rows
    ]


@router.patch("/api/requests/{request_id}", response_model=ProductRequestOwnerOut)
def respond_to_request(
    request_id: int,
    body: ProductRequestRespondIn,
    owner_shop: tuple[User, Shop] = Depends(get_current_shop),
    db: Session = Depends(get_db),
) -> dict:
    request = db.get(ProductRequest, request_id)
    if not request or request.shop_id != owner_shop[1].id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Request not found")

    request.status = body.status
    request.owner_note = body.owner_note
    request.responded_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(request)

    customer = db.get(User, request.customer_user_id)
    return {**{f: getattr(request, f) for f in REQUEST_FIELDS}, "customer_phone": customer.phone}
