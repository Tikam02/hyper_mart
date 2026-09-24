from math import asin, cos, radians, sin, sqrt

from sqlalchemy.orm import Session

from app.models.geo import PincodeLookup

EARTH_RADIUS_KM = 6371


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    lat1, lng1, lat2, lng2 = map(radians, [lat1, lng1, lat2, lng2])
    dlat, dlng = lat2 - lat1, lng2 - lng1
    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlng / 2) ** 2
    return 2 * EARTH_RADIUS_KM * asin(sqrt(a))


def nearest_pincode(db: Session, lat: float, lng: float) -> PincodeLookup | None:
    """Nearest-centroid lookup over the seeded PincodeLookup table.

    Fine for a few hundred seeded rows (one pilot region); would need a real
    spatial index before seeding all-India data (see PRD §6 scope note).
    """
    rows = db.query(PincodeLookup).filter(PincodeLookup.lat.isnot(None), PincodeLookup.lng.isnot(None)).all()
    if not rows:
        return None
    return min(rows, key=lambda r: haversine_km(lat, lng, r.lat, r.lng))
