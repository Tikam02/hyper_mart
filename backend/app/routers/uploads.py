import io
import uuid
from pathlib import Path

import pillow_heif
from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from PIL import Image, ImageOps, UnidentifiedImageError

from app.config import get_settings
from app.deps import get_current_user
from app.models.user import User

# iPhones — and newer Android cameras — save HEIC by default, so without this
# the photos already in a shop owner's gallery are simply unreadable.
pillow_heif.register_heif_opener()

router = APIRouter(prefix="/api/uploads", tags=["uploads"])

# Phone photos routinely exceed 5MB; a 50MP Android shot is 10MB+. Since every
# upload is re-encoded and downscaled below, accept generously and shrink rather
# than bounce the owner back to a file manager.
MAX_BYTES = 20 * 1024 * 1024
MAX_EDGE = 1920
JPEG_QUALITY = 85

# What we can decode. MPO is what Android HDR and burst shots report — a JPEG
# carrying extra frames — and is the most common reason a perfectly ordinary
# phone photo gets rejected as "not a JPEG".
READABLE_FORMATS = {"JPEG", "JPEG2000", "PNG", "WEBP", "MPO", "HEIF", "HEIC", "AVIF", "GIF", "BMP", "TIFF"}


@router.post("/image")
async def upload_image(file: UploadFile, _user: User = Depends(get_current_user)) -> dict:
    raw = await file.read(MAX_BYTES + 1)
    if len(raw) > MAX_BYTES:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Photo is too large — please pick one under 20MB")

    try:
        Image.open(io.BytesIO(raw)).verify()
        image = Image.open(io.BytesIO(raw))  # re-open: verify() consumes the parser
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "That file isn't a photo we can read. Pick an image from your gallery and try again.",
        ) from exc

    if image.format not in READABLE_FORMATS:
        # Name the format we actually saw: a generic "unsupported" message makes
        # a phone-upload failure impossible to diagnose from a bug report.
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"{image.format or 'That'} photos aren't supported yet — try a JPEG, PNG, HEIC or WEBP",
        )

    # Phone cameras record rotation in EXIF instead of rotating the pixels, so a
    # portrait shot arrives sideways unless this is applied before saving.
    image = ImageOps.exif_transpose(image)

    # Shrink to something a phone on a slow rural connection can actually load;
    # thumbnail() only ever scales down, so small images pass through untouched.
    image.thumbnail((MAX_EDGE, MAX_EDGE))

    settings = get_settings()
    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)

    has_alpha = image.mode in ("RGBA", "LA") or (image.mode == "P" and "transparency" in image.info)
    if has_alpha:
        image = image.convert("RGBA")
        ext, save_kwargs = "png", {"optimize": True}
    else:
        image = image.convert("RGB")
        ext, save_kwargs = "jpg", {"quality": JPEG_QUALITY, "optimize": True, "progressive": True}

    filename = f"{uuid.uuid4().hex}.{ext}"
    image.save(upload_dir / filename, **save_kwargs)

    return {"url": f"/uploads/{filename}"}
