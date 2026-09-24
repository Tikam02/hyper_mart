from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel

from app.models.enums import DiscountType


class CouponCreateIn(BaseModel):
    title: str
    discount_type: DiscountType
    discount_value: Decimal
    valid_from: datetime
    valid_to: datetime
    max_claims: int | None = None


class CouponUpdateIn(BaseModel):
    title: str | None = None
    valid_to: datetime | None = None
    status: str | None = None


class CouponOut(BaseModel):
    id: int
    shop_id: int
    code: str
    title: str
    discount_type: str
    discount_value: Decimal
    valid_from: datetime
    valid_to: datetime
    max_claims: int | None
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class CouponFeedItemOut(CouponOut):
    shop_name: str
    shop_is_open: bool
    shop_pincode: str


class CouponClaimOut(BaseModel):
    id: int
    coupon_id: int
    unique_code: str
    status: str
    claimed_at: datetime
    redeemed_at: datetime | None

    model_config = {"from_attributes": True}


class RedeemIn(BaseModel):
    unique_code: str
