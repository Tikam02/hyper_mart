import enum


class UserRole(str, enum.Enum):
    customer = "customer"
    shop_owner = "shop_owner"


class ShopStatus(str, enum.Enum):
    active = "active"
    pending = "pending"
    disabled = "disabled"


class DiscountType(str, enum.Enum):
    flat = "flat"
    percent = "percent"


class CouponStatus(str, enum.Enum):
    active = "active"
    expired = "expired"
    disabled = "disabled"


class ClaimStatus(str, enum.Enum):
    claimed = "claimed"
    redeemed = "redeemed"
    expired = "expired"


class RequestStatus(str, enum.Enum):
    pending = "pending"
    available = "available"
    unavailable = "unavailable"


class EventType(str, enum.Enum):
    shop_view = "shop_view"
    product_view = "product_view"
    coupon_view = "coupon_view"
    search = "search"
