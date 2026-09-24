from pydantic import BaseModel


class PincodeOut(BaseModel):
    pincode: str
    locality: str
    city: str
    state: str

    model_config = {"from_attributes": True}
