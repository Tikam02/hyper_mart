"""Dev/pilot-region seed data. Run with: python -m app.seed

Pincode rows are an approximate starter set for the Bastar/Kondagaon pilot
region (PRD §6) — replace with a real India Post CSV import before expanding
beyond the pilot area.
"""

from app.db import SessionLocal
from app.models.catalog import Category
from app.models.geo import PincodeLookup

CATEGORIES = [
    "Grocery & Kirana",
    "Bakery",
    "Electronics",
    "Clothing & Fashion",
    "Pharmacy",
    "Restaurant & Food",
    "Salon & Beauty",
    "Hardware",
    "Stationery & Books",
    "Mobile & Accessories",
    "Footwear",
    "Sweets & Namkeen",
]

PINCODES = [
    ("494226", "Kondagaon", "Kondagaon", "Chhattisgarh", 19.5960, 81.6644),
    ("494226", "Mardapal", "Kondagaon", "Chhattisgarh", 19.5423, 81.5871),
    ("494226", "Farasgaon", "Kondagaon", "Chhattisgarh", 19.4732, 81.5330),
    ("494441", "Keshkal", "Kondagaon", "Chhattisgarh", 19.9066, 81.5385),
    ("494001", "Jagdalpur", "Bastar", "Chhattisgarh", 19.0748, 82.0232),
    ("494005", "Bastar", "Bastar", "Chhattisgarh", 19.0224, 81.9483),
    ("494661", "Narayanpur", "Narayanpur", "Chhattisgarh", 19.7180, 81.2461),
]


def run() -> None:
    db = SessionLocal()
    try:
        if not db.query(Category).count():
            db.add_all(
                Category(name=name, slug=name.lower().replace(" & ", "-").replace(" ", "-")) for name in CATEGORIES
            )
        if not db.query(PincodeLookup).count():
            db.add_all(
                PincodeLookup(pincode=p, locality=loc, city=city, state=state, lat=lat, lng=lng)
                for p, loc, city, state, lat, lng in PINCODES
            )
        db.commit()
        print(f"Seeded {len(CATEGORIES)} categories and {len(PINCODES)} pincode rows")
    finally:
        db.close()


if __name__ == "__main__":
    run()
