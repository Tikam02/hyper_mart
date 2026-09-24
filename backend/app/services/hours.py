from datetime import datetime
from zoneinfo import ZoneInfo

from app.models.shop import Shop

# Every shop on the platform trades in India, and the server may well run in UTC.
# Deriving "open now" from naive local time would show a 9am-9pm shop as closed
# until 2:30pm.
IST = ZoneInfo("Asia/Kolkata")

# Why customers are seeing a shop as closed. The owner's dashboard turns these
# into a sentence; without one, flipping the override outside trading hours
# looks like it did nothing, because the shop stays closed either way.
TEMPORARILY_CLOSED = "temporarily_closed"
WEEKLY_OFF = "weekly_off"
OUTSIDE_HOURS = "outside_hours"


def shop_open_state(shop: Shop, now: datetime | None = None) -> tuple[bool, str | None]:
    """Whether customers see this shop as open, and if not, why.

    The single source of truth for open/closed. Every surface — listing cards,
    shop page, coupon feed — must go through this, or the same shop reads
    "Open now" on one screen and "Closed" on another.

    `now` is injectable so the rules can be tested at a fixed instant.
    """
    # A temporary close is a deliberate act by the owner and outranks the
    # timetable.
    if not shop.is_open:
        return False, TEMPORARILY_CLOSED

    # No hours set: the manual toggle is all we have, and it said open.
    if shop.opens_at is None or shop.closes_at is None:
        return True, None

    now = now or datetime.now(IST)
    if shop.weekly_off is not None and now.weekday() == shop.weekly_off:
        return False, WEEKLY_OFF

    current = now.time()
    if shop.opens_at <= shop.closes_at:
        within = shop.opens_at <= current <= shop.closes_at
    else:
        # Overnight trading (a dhaba open 20:00-02:00): the window wraps
        # midnight, so it's a union of two ranges rather than an intersection.
        within = current >= shop.opens_at or current <= shop.closes_at
    return (True, None) if within else (False, OUTSIDE_HOURS)


def shop_is_open_now(shop: Shop, now: datetime | None = None) -> bool:
    return shop_open_state(shop, now)[0]
