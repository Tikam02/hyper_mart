from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user
from app.models.catalog import Product
from app.models.enums import ShopStatus
from app.models.market_ask import MarketAsk
from app.models.product_request import ProductRequest
from app.models.shop import Shop
from app.models.user import User
from app.schemas.ask import AskCreateIn, AskOut, AskReplyOut, TrendingAskOut
from app.services.hours import shop_is_open_now
from app.services.rate_limit import check_rate_limit

router = APIRouter(tags=["asks"])

# Deliberately small. One question should not buzz every shopkeeper in town —
# that is how owners learn to ignore the app. Raise it only once the
# answered-within-30-minutes rate justifies a wider net.
MAX_FANOUT = 4

# A term appears in the public "people are asking for" list only after this many
# different people have asked it, so no single person's question is exposed.
TRENDING_MIN_ASKERS = 3
TRENDING_WINDOW_DAYS = 14


def _rank_shops(shops: list[Shop], text: str, db: Session) -> list[Shop]:
    """Who to put the question to first.

    Open shops lead — a reply from a shut shop helps nobody this evening. Within
    that, shops already listing something matching the words go first, since
    they are the most likely to actually have it.
    """
    like = f"%{text}%"
    matching_ids = {
        row[0]
        for row in db.query(Product.shop_id)
        .filter(Product.shop_id.in_([s.id for s in shops]), Product.name.ilike(like))
        .distinct()
    } if shops else set()

    return sorted(
        shops,
        key=lambda s: (not shop_is_open_now(s), s.id not in matching_ids, s.name),
    )


def _ask_payload(ask: MarketAsk, db: Session) -> dict:
    rows = (
        db.query(ProductRequest, Shop)
        .join(Shop, Shop.id == ProductRequest.shop_id)
        .filter(ProductRequest.ask_id == ask.id)
        .all()
    )
    replies = [
        AskReplyOut(
            request_id=req.id,
            shop_id=shop.id,
            shop_name=shop.name,
            shop_contact_number=shop.contact_number,
            shop_is_open=shop_is_open_now(shop),
            status=req.status,
            owner_note=req.owner_note,
            responded_at=req.responded_at,
        )
        for req, shop in rows
    ]
    # Answered first, then open shops the customer could ring right now.
    replies.sort(key=lambda r: (r.status == "pending", not r.shop_is_open, r.shop_name))
    return {
        "id": ask.id,
        "text": ask.text,
        "pincode": ask.pincode,
        "created_at": ask.created_at,
        "replies": replies,
    }


@router.post("/api/asks", response_model=AskOut, status_code=status.HTTP_201_CREATED)
def create_ask(
    body: AskCreateIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    # Keyed on the asker, not on each shop: the per-shop limiter used by the
    # direct ask would never fire here, because a fan-out writes one row per
    # shop and so one hit per key.
    check_rate_limit(f"ask:{user.id}", max_hits=6, window_seconds=600)

    ask = MarketAsk(customer_user_id=user.id, pincode=body.pincode, text=body.text)
    db.add(ask)
    db.flush()  # need ask.id before the fan-out rows reference it

    shops = (
        db.query(Shop)
        .filter(Shop.pincode == body.pincode, Shop.status == ShopStatus.active.value)
        .all()
    )
    for shop in _rank_shops(shops, body.text, db)[:MAX_FANOUT]:
        db.add(
            ProductRequest(
                shop_id=shop.id,
                ask_id=ask.id,
                customer_user_id=user.id,
                text=body.text,
            )
        )

    db.commit()
    db.refresh(ask)
    return _ask_payload(ask, db)


@router.get("/api/me/asks", response_model=list[AskOut])
def my_asks(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[dict]:
    asks = (
        db.query(MarketAsk)
        .filter(MarketAsk.customer_user_id == user.id)
        .order_by(MarketAsk.created_at.desc())
        .limit(20)
        .all()
    )
    return [_ask_payload(a, db) for a in asks]


@router.get("/api/asks/{ask_id}", response_model=AskOut)
def get_ask(ask_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    ask = db.get(MarketAsk, ask_id)
    if not ask or ask.customer_user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Question not found")
    return _ask_payload(ask, db)


@router.get("/api/asks/nearby/trending", response_model=list[TrendingAskOut])
def trending_asks(pincode: str, db: Session = Depends(get_db)) -> list[dict]:
    """What people around here keep asking for. Public, so it is anonymised.

    Grouped on the normalised text and gated on distinct askers, with no user,
    shop or timestamp returned. Expect this to be empty early on — an empty
    section is the correct outcome, not a reason to lower the floor.
    """
    term = func.lower(func.trim(MarketAsk.text))
    rows = (
        db.query(term.label("text"), func.count(func.distinct(MarketAsk.customer_user_id)).label("askers"))
        .filter(
            MarketAsk.pincode == pincode,
            MarketAsk.created_at > func.now() - func.make_interval(0, 0, 0, TRENDING_WINDOW_DAYS),
        )
        .group_by(term)
        .having(func.count(func.distinct(MarketAsk.customer_user_id)) >= TRENDING_MIN_ASKERS)
        .order_by(func.count(func.distinct(MarketAsk.customer_user_id)).desc())
        .limit(6)
        .all()
    )
    return [{"text": r.text, "asker_count": r.askers} for r in rows]
