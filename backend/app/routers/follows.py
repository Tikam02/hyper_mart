from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user
from app.models.shop import Shop
from app.models.social import Follow
from app.models.user import User
from app.schemas.shop import ShopPublicOut
from app.schemas.social import FollowOut

router = APIRouter(tags=["follows"])


@router.post("/api/shops/{shop_id}/follow", response_model=FollowOut)
def toggle_follow(shop_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> FollowOut:
    if not db.get(Shop, shop_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Shop not found")

    existing = db.query(Follow).filter(Follow.shop_id == shop_id, Follow.customer_user_id == user.id).first()
    if existing:
        db.delete(existing)
        db.commit()
        return FollowOut(shop_id=shop_id, following=False)

    db.add(Follow(shop_id=shop_id, customer_user_id=user.id))
    db.commit()
    return FollowOut(shop_id=shop_id, following=True)


@router.get("/api/me/following", response_model=list[ShopPublicOut])
def my_following(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[Shop]:
    return (
        db.query(Shop)
        .join(Follow, Follow.shop_id == Shop.id)
        .filter(Follow.customer_user_id == user.id)
        .all()
    )
