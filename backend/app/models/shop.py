from datetime import datetime, time

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Time, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.enums import ShopStatus


class Shop(Base):
    __tablename__ = "shops"

    id: Mapped[int] = mapped_column(primary_key=True)
    owner_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)

    name: Mapped[str] = mapped_column(String(200))
    owner_name: Mapped[str] = mapped_column(String(200))
    address_text: Mapped[str] = mapped_column(String(500))
    pincode: Mapped[str] = mapped_column(String(10), index=True)
    locality: Mapped[str | None] = mapped_column(String(200), nullable=True)
    lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    lng: Mapped[float | None] = mapped_column(Float, nullable=True)
    contact_number: Mapped[str] = mapped_column(String(15))
    gst_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    description: Mapped[str | None] = mapped_column(String(1000), nullable=True)

    status: Mapped[str] = mapped_column(String(20), default=ShopStatus.active.value)

    # Regular trading hours. Both null means the owner hasn't set any, in which
    # case `is_open` alone decides — that keeps shops created before this
    # feature behaving exactly as they did.
    opens_at: Mapped[time | None] = mapped_column(Time, nullable=True)
    closes_at: Mapped[time | None] = mapped_column(Time, nullable=True)
    weekly_off: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 0 = Monday .. 6 = Sunday

    # Manual override, not the whole story once hours exist: False means
    # "temporarily shut" (stock run out, family function) and always wins.
    is_open: Mapped[bool] = mapped_column(default=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class ShopImage(Base):
    """A shop's photos — the carousel at the top and the gallery below it.

    One list, not two: the first few double as the banner carousel and the whole
    set is the gallery, so a photo-led shop (furniture, boutique, decorator)
    adds pictures in one place instead of choosing where each one belongs.
    sort_order 0 is the cover the listing cards pull.
    """

    __tablename__ = "shop_images"

    id: Mapped[int] = mapped_column(primary_key=True)
    shop_id: Mapped[int] = mapped_column(ForeignKey("shops.id"), index=True)

    url: Mapped[str] = mapped_column(String(500))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    # Furniture, boutiques and decorators sell off the picture — a caption is
    # what turns a showroom photo into "3-seater teak sofa, ₹18,000".
    caption: Mapped[str | None] = mapped_column(String(200), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
