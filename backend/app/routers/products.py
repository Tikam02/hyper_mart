from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_shop
from app.models.catalog import Product
from app.models.shop import Shop
from app.models.user import User
from app.schemas.catalog import ProductCreateIn, ProductOut, ProductUpdateIn

router = APIRouter(tags=["products"])


@router.post("/api/shops/me/products", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(
    body: ProductCreateIn,
    owner_shop: tuple[User, Shop] = Depends(get_current_shop),
    db: Session = Depends(get_db),
) -> Product:
    product = Product(shop_id=owner_shop[1].id, **body.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.get("/api/shops/me/products", response_model=list[ProductOut])
def list_my_products(
    owner_shop: tuple[User, Shop] = Depends(get_current_shop),
    db: Session = Depends(get_db),
) -> list[Product]:
    return db.query(Product).filter(Product.shop_id == owner_shop[1].id).order_by(Product.created_at.desc()).all()


def _get_own_product(product_id: int, owner_shop: tuple[User, Shop], db: Session) -> Product:
    product = db.get(Product, product_id)
    if not product or product.shop_id != owner_shop[1].id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Product not found")
    return product


@router.patch("/api/products/{product_id}", response_model=ProductOut)
def update_product(
    product_id: int,
    body: ProductUpdateIn,
    owner_shop: tuple[User, Shop] = Depends(get_current_shop),
    db: Session = Depends(get_db),
) -> Product:
    product = _get_own_product(product_id, owner_shop, db)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(product, field, value)
    db.commit()
    db.refresh(product)
    return product


@router.delete("/api/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: int,
    owner_shop: tuple[User, Shop] = Depends(get_current_shop),
    db: Session = Depends(get_db),
) -> None:
    product = _get_own_product(product_id, owner_shop, db)
    db.delete(product)
    db.commit()
