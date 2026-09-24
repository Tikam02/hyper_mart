from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class MarketAsk(Base):
    """One customer question put to the market rather than to a single shop.

    "Who near me has this, right now?" is the question a directory can't answer
    and the reason someone reopens the app. Each ask fans out into
    `ProductRequest` rows — one per targeted shop, carrying that shop's reply —
    so the owner inbox and the direct single-shop ask keep working unchanged.

    Deliberately no category: making the customer classify their own question
    ("is a phone charger Electronics or Mobile & Accessories?") adds a step to
    the one flow that has to stay frictionless. Routing is by pincode.
    """

    __tablename__ = "market_asks"

    id: Mapped[int] = mapped_column(primary_key=True)
    customer_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)

    pincode: Mapped[str] = mapped_column(String(10), index=True)
    text: Mapped[str] = mapped_column(String(300))

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
