from datetime import datetime

from pydantic import BaseModel, Field


class ReviewIn(BaseModel):
    rating: int = Field(ge=1, le=5)
    text: str | None = None


class ReviewOut(BaseModel):
    id: int
    shop_id: int
    customer_user_id: int
    rating: int
    text: str | None
    shop_reply_text: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class FollowOut(BaseModel):
    shop_id: int
    following: bool
