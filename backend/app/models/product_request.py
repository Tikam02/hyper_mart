from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.enums import RequestStatus


class ProductRequest(Base):
    """A customer asking a shop whether they stock something.

    The thing a customer actually does before walking to a shop, and the one
    question a directory listing can never answer. `product_id` is set when they
    tapped an item already in the catalog, and left null when they typed a free
    request for something that isn't listed — which is also the more valuable
    signal, since it tells the owner what demand they're missing.
    """

    __tablename__ = "product_requests"

    id: Mapped[int] = mapped_column(primary_key=True)
    shop_id: Mapped[int] = mapped_column(ForeignKey("shops.id"), index=True)
    # Set when this row is one shop's copy of a market-wide ask; null when the
    # customer asked this shop directly from its own page.
    ask_id: Mapped[int | None] = mapped_column(ForeignKey("market_asks.id"), nullable=True, index=True)
    customer_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    product_id: Mapped[int | None] = mapped_column(ForeignKey("products.id"), nullable=True)

    text: Mapped[str] = mapped_column(String(300))
    status: Mapped[str] = mapped_column(String(20), default=RequestStatus.pending.value, index=True)
    owner_note: Mapped[str | None] = mapped_column(String(300), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    responded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
