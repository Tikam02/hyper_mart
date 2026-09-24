from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user
from app.models.shop import Shop
from app.models.social import Review
from app.models.user import User
from app.schemas.social import ReviewIn, ReviewOut

router = APIRouter(tags=["reviews"])


@router.put("/api/shops/{shop_id}/reviews/me", response_model=ReviewOut)
def upsert_my_review(
    shop_id: int,
    body: ReviewIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Review:
    if not db.get(Shop, shop_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Shop not found")

    review = db.query(Review).filter(Review.shop_id == shop_id, Review.customer_user_id == user.id).first()
    if review:
        review.rating = body.rating
        review.text = body.text
    else:
        review = Review(shop_id=shop_id, customer_user_id=user.id, rating=body.rating, text=body.text)
        db.add(review)
    db.commit()
    db.refresh(review)
    return review


@router.get("/api/shops/{shop_id}/reviews", response_model=list[ReviewOut])
def list_reviews(shop_id: int, db: Session = Depends(get_db)) -> list[Review]:
    return db.query(Review).filter(Review.shop_id == shop_id).order_by(Review.created_at.desc()).all()
