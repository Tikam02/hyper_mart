from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.geo import PincodeLookup
from app.schemas.geo import PincodeOut
from app.services.geo import nearest_pincode

router = APIRouter(prefix="/api/pincodes", tags=["pincodes"])


@router.get("/resolve", response_model=PincodeOut)
def resolve_pincode(lat: float, lng: float, db: Session = Depends(get_db)) -> PincodeLookup:
    match = nearest_pincode(db, lat, lng)
    if not match:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No pincode data seeded yet for this area")
    return match


@router.get("/search", response_model=list[PincodeOut])
def search_pincodes(q: str, db: Session = Depends(get_db)) -> list[PincodeLookup]:
    like = f"%{q}%"
    return (
        db.query(PincodeLookup)
        .filter(
            or_(
                PincodeLookup.pincode.ilike(like),
                PincodeLookup.locality.ilike(like),
                PincodeLookup.city.ilike(like),
            )
        )
        .limit(20)
        .all()
    )
