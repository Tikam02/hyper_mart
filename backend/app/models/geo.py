from sqlalchemy import Float, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class PincodeLookup(Base):
    __tablename__ = "pincode_lookup"

    id: Mapped[int] = mapped_column(primary_key=True)
    pincode: Mapped[str] = mapped_column(String(10), index=True)
    locality: Mapped[str] = mapped_column(String(200))
    city: Mapped[str] = mapped_column(String(200))
    state: Mapped[str] = mapped_column(String(200))
    lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    lng: Mapped[float | None] = mapped_column(Float, nullable=True)
