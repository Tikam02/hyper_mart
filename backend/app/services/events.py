from sqlalchemy.orm import Session

from app.models.event import Event


def log_event(
    db: Session,
    *,
    type: str,
    session_id: str,
    user_id: int | None = None,
    shop_id: int | None = None,
    product_id: int | None = None,
    coupon_id: int | None = None,
    query_text: str | None = None,
) -> None:
    db.add(
        Event(
            type=type,
            session_id=session_id,
            user_id=user_id,
            shop_id=shop_id,
            product_id=product_id,
            coupon_id=coupon_id,
            query_text=query_text,
        )
    )
    db.commit()
