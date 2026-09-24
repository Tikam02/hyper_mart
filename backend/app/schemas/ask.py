from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class AskCreateIn(BaseModel):
    text: str = Field(min_length=2, max_length=300)
    pincode: str = Field(min_length=6, max_length=10)

    @field_validator("text")
    @classmethod
    def clean_text(cls, v: str) -> str:
        v = " ".join(v.split())
        if len(v) < 2:
            raise ValueError("Tell us what you're looking for")
        return v


class AskReplyOut(BaseModel):
    """One shop's slot against an ask — its reply, or the fact it hasn't yet.

    Carries the shop's number either way: a pending row is still a shop the
    customer can ring right now, which is the whole point of showing it.
    """

    request_id: int
    shop_id: int
    shop_name: str
    shop_contact_number: str
    shop_is_open: bool
    status: str
    owner_note: str | None
    responded_at: datetime | None


class AskOut(BaseModel):
    id: int
    text: str
    pincode: str
    created_at: datetime
    replies: list[AskReplyOut]

    @property
    def answered_count(self) -> int:
        return sum(1 for r in self.replies if r.status != "pending")


class TrendingAskOut(BaseModel):
    """An anonymised demand signal for the home page.

    No user, no shop, no precise time — only a term and how many different
    people asked for it. In a town of a few thousand, an attributed free-text
    question ("does anyone have <medicine>") identifies someone.
    """

    text: str
    asker_count: int
