export type UserRole = "customer" | "shop_owner";

export interface User {
  id: number;
  phone: string;
  email: string | null;
  role: UserRole;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
}

export interface Product {
  id: number;
  shop_id: number;
  category_id: number;
  name: string;
  price: string;
  image_url: string | null;
  in_stock: boolean;
  created_at: string;
}

export type DiscountType = "flat" | "percent";
export type CouponStatus = "active" | "expired" | "disabled";

export interface Coupon {
  id: number;
  shop_id: number;
  code: string;
  title: string;
  discount_type: DiscountType;
  discount_value: string;
  valid_from: string;
  valid_to: string;
  max_claims: number | null;
  status: CouponStatus;
  created_at: string;
}

export interface CouponFeedItem extends Coupon {
  shop_name: string;
  shop_is_open: boolean;
  shop_pincode: string;
}

export interface CouponClaim {
  id: number;
  coupon_id: number;
  unique_code: string;
  status: "claimed" | "redeemed" | "expired";
  claimed_at: string;
  redeemed_at: string | null;
}

export interface ShopImage {
  id: number;
  url: string;
  sort_order: number;
  caption: string | null;
}

/** A section of one shop's own catalog, named by the owner ("Cold Drinks"). */
export interface ProductCategory {
  id: number;
  shop_id: number;
  name: string;
  sort_order: number;
}

export type RequestStatus = "pending" | "available" | "unavailable";

interface ProductRequestBase {
  id: number;
  shop_id: number;
  product_id: number | null;
  text: string;
  status: RequestStatus;
  owner_note: string | null;
  created_at: string;
  responded_at: string | null;
}

/** What the customer sees in their own list of questions. */
export interface ProductRequest extends ProductRequestBase {
  shop_name: string;
}

/** What the owner sees in their inbox — includes who asked, so they can call back. */
export interface ShopProductRequest extends ProductRequestBase {
  customer_phone: string;
}

export interface ShopPublic {
  id: number;
  name: string;
  address_text: string;
  pincode: string;
  locality: string | null;
  contact_number: string;
  is_open: boolean;
  created_at: string;
  cover_url: string | null;
  review_count: number;
  avg_rating: number | null;
}

export interface ShopDetail extends ShopPublic {
  description: string | null;
  opens_at: string | null;
  closes_at: string | null;
  weekly_off: number | null;
  images: ShopImage[];
  /** Global shop-type taxonomy, shown in the Details row. */
  categories: Category[];
  /** The owner's own catalog sections, used for the tabs above the products. */
  product_categories: ProductCategory[];
  products: Product[];
  active_coupons: Coupon[];
  follower_count: number;
  redeemed_count: number;
}

/**
 * The owner's own shop, as returned by /api/shops/me.
 *
 * Deliberately not `extends ShopPublic`: the public shape carries listing
 * aggregates (cover_url, review_count, avg_rating) that this endpoint does not
 * send, and inheriting them would type fields that are always undefined at
 * runtime — a lie the compiler cannot catch.
 */
export interface Shop {
  id: number;
  name: string;
  owner_name: string;
  address_text: string;
  pincode: string;
  locality: string | null;
  contact_number: string;
  gst_number: string | null;
  description: string | null;
  status: string;
  opens_at: string | null;
  closes_at: string | null;
  weekly_off: number | null;
  /** The owner's override switch — false means "temporarily closed". */
  is_open: boolean;
  /** What customers actually see, after hours and weekly off are applied. */
  is_open_now: boolean;
  /** Why it reads as closed: temporarily_closed | weekly_off | outside_hours. */
  closed_reason: "temporarily_closed" | "weekly_off" | "outside_hours" | null;
  created_at: string;
}

export interface Review {
  id: number;
  shop_id: number;
  customer_user_id: number;
  rating: number;
  text: string | null;
  shop_reply_text: string | null;
  created_at: string;
}

export interface PincodeInfo {
  pincode: string;
  locality: string;
  city: string;
  state: string;
}
