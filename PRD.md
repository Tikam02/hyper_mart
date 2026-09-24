# Hylo Hub — Product Requirements Document

Status: Draft v0.2 — MVP decisions locked (see §10), ready for schema/build planning
Stack: FastAPI (backend) + Next.js (frontend, PWA)

## 1. Vision

A hyperlocal marketplace PWA where nearby shops run a lightweight digital storefront — catalog, coupons, sale posters — and customers discover what's on offer near them without installing a native app or logging in first.

## 2. Problem

- Local shop owners currently broadcast sales only via WhatsApp status/groups — no searchable, persistent, location-filtered place for it to live.
- Customers rely on scattered WhatsApp groups, Google, or walking past the shop to know what's on sale nearby.
- Google/Justdial listings aren't built for daily offers and catalogs, and shop owners don't control them.

## 3. Goals (MVP)

- Shop owner: signup → live shop with catalog + one coupon in under 5 minutes, unassisted.
- Customer: zero login, sees relevant nearby offers within seconds of opening the app.
- Capture structured behavioral data (views, searches, redemptions) from day one — this is the long-term moat (a sellable local-demand-insights product for brands later), not ad revenue. Design the schema so this data exists even if the analytics product ships later.

### Non-goals for MVP (explicitly deferred)

- Online ordering / payments / delivery
- Automated WhatsApp broadcast via WhatsApp Business API (MVP uses the native share sheet only — Business API costs per conversation and needs Meta Business verification, not worth it pre-traction)
- Multi-city rollout — one pilot neighborhood first
- In-app chat between customer and shop owner

## 4. Roles

Two public-facing roles, as specified:

- **Shop Owner** — manages a shop's catalog, coupons, posters
- **Customer** — anonymous by default; phone-verified only for actions that need identity (claim coupon, review, follow)

**Gap flagged:** no moderation/admin role was specified. Once onboarding isn't 100% manual, fake shops and spam coupons will land with zero moderation in place. Doesn't need to be a polished role for MVP — a protected internal route to disable a shop/coupon is enough — but it should exist before public self-serve signup opens, not after the first abuse report.

## 5. Core Flows

### 5.1 Shop Owner Onboarding

1. Mobile number → OTP (dev: stubbed; prod: MSG91) → session
2. Shop name, owner name, address (free text), pincode, contact number (defaults to login number, editable) - name and authenticity can be verified by GST which is free api call
3. Dashboard prompts: pick category → add products (name, price, photo, in-stock toggle) → create a coupon or upload a sale poster → share to WhatsApp / get public shop link

### 5.2 Customer Discovery

1. Open app, no login wall
2. Location: browser Geolocation API; on denial, fall back to manual pincode/locality entry. They can switch location like - village name, town name, for example - Kondagaon, 494226 like this
3. Home feed: shops with active offers in the user's region, sorted by relevance/distance
4. Search: shop name, category, or product
5. Shop page: catalog, active coupons, reviews, contact/share
6. Phone verification gate applies only to: claim coupon, leave review, follow shop

### 5.3 Coupon Lifecycle (confirmed — §10)

Owner creates coupon → customer claims it (generates a unique code tied to that customer+coupon) → customer shows the code in-store → owner marks it redeemed from their dashboard. Marginal extra work over a static poster, but it's what turns "we posted an offer" into "we know 40% of viewers redeemed it" — exactly the data that's monetizable later.

## 6. The Google Maps Problem

You likely don't need a paid maps API for MVP at all. Breaking down what "maps" is actually doing here:

| Need | Paid Google API way | Free/cheap alternative |
|---|---|---|
| Shop enters address at signup | Places Autocomplete | Free text + pincode; no geocoding call needed at signup |
| Region-match shops to customers | Maps geocoding | India Post pincode dataset (free, one-time import into your own Postgres table — don't call a live API per user) |
| Customer's current location → region | Geocoding API | Browser Geolocation API (free) for lat/lng, then **one** reverse-geocode per session (cache it) — Nominatim (OSM, free, low volume only) or Mappls/Ola Maps (India-focused, generous free tiers, much cheaper than Google at scale) |
| "Shops near me" sorting | Distance Matrix API | Haversine formula directly in Postgres SQL — no extension, no external call. Only reach for PostGIS if you outgrow one-city scale |
| Visual map with pins | Maps JavaScript API | Leaflet.js + OpenStreetMap tiles (free, no key required for reasonable usage) |
| Owner pins exact shop location | Maps picker | Leaflet + OSM drag-a-pin widget — zero API cost |

Net effect: pincode does the heavy lifting for "region," GPS is a nice-to-have layered on top, and you don't pay a maps vendor anything until you're doing serious volume — at which point Mappls/Ola Maps (India-focused, cheaper) are the natural upgrade over Google, not a rebuild.

## 7. Data Model (high-level)

| Entity | Key fields | Notes |
|---|---|---|
| User | phone (unique), email (nullable), role | Phone is the only required identity |
| Shop | owner_user_id, name, address_text, pincode, locality, lat/lng (nullable), contact_number, status | lat/lng optional at signup, filled in later via pin-drop |
| Category | name, slug | Global seeded taxonomy |
| ShopCategory | shop_id, category_id | Many-to-many — a shop can span categories |
| Product | shop_id, category_id, name, price, image_url, in_stock | |
| Coupon | shop_id, code, title, discount_type, discount_value, valid_from/to, max_claims, status | |
| CouponClaim | coupon_id, customer_user_id, unique_code, status, claimed_at, redeemed_at | The redemption-tracking table from §5.3 |
| Review | shop_id, customer_user_id, rating, text, shop_reply_text | One per customer per shop (upsert) |
| Follow | shop_id, customer_user_id | Powers push notifications in V1.1 |
| PincodeLookup | pincode, locality, city, state, lat/lng (centroid) | Static reference table, imported once |

`owner_user_id` on `Shop` is a plain FK, not a unique constraint. MVP enforces one shop per owner at the application layer (§10); the FK shape means lifting that to multi-shop later is a validation-logic change, not a migration.

## 8. Phased Roadmap

| Phase | Scope |
|---|---|
| **MVP** | Single pilot neighborhood. Owner onboarding, catalog, tracked-redemption coupons, customer browse/search (pincode + GPS fallback), WhatsApp share sheet, basic reviews, OTP stub |
| **V1.1** | Real MSG91 OTP, web push notifications for followed shops, owner-facing analytics dashboard (views/redemptions), pincode dataset + reverse-geocode caching |
| **V2** | Multi-region expansion, paid featured placement, aggregated local-demand report product for brands, trust/verification badges, possible delivery add-on |

## 9. Non-functional requirements

- **OTP abuse protection**: per-number and per-IP rate limiting from day one, even against the dev stub — this needs to be load-bearing before MSG91 is wired up, not after the first SMS-pumping bill.
- **Image handling**: resize/compress on upload, store in S3-compatible object storage (e.g. Cloudflare R2 — cheap egress), never on the FastAPI app server disk.
- **PWA**: manifest + service worker for installability; offline shell at minimum for the owner dashboard.
- **Shareability**: Next.js metadata/OG tags per shop and coupon page — the entire growth loop is "share to WhatsApp," so link-preview quality (image, title) directly drives click-through. Treat this as core, not polish.
- **Spam/rate limiting** on coupon creation and review submission.

## 10. Decisions Locked (2026-09-24)

1. **Region matching**: pincode primary, GPS as refinement. Shop stores pincode at signup (no geocoding call). Customer's GPS is reverse-geocoded once per session (cached) to suggest a pincode; manual override always available.
2. **Coupon redemption**: claim-and-redeem tracking (§5.3), not a static poster/code. Funnel data (view → claim → redeem) is worth the extra build effort given the data-monetization goal in §3.
3. **WhatsApp integration**: native share sheet only for MVP. WhatsApp Business API (paid, automated broadcast) stays out of scope until there's traction to justify the per-conversation cost and Meta Business verification overhead.
4. **Shop-owner cardinality**: one shop per owner account for MVP. Multi-branch owners create separate accounts for now; schema supports lifting this later (§7) without a migration.

## 11. Risks

- **Cold start**: classic two-sided marketplace problem — no shops means no customers, no customers means no shop incentive. Mitigation: manually onboard the first 50-100 shops in one neighborhood rather than opening self-serve signup first.
- **Trust/spam**: no moderation role specified yet (§4) — fake shops or junk coupons will surface fast once onboarding isn't hand-held.
- **Address quality**: free-text address with no map verification will produce messy region-matching; the optional pin-drop (§6) is the cheap fix, not a live geocoding call per signup.
- **Competition**: WhatsApp groups and Justdial are the incumbent "free" alternatives shop owners already use — the pitch has to be materially less effort than what they already do, which is exactly why the WhatsApp-share-sheet growth loop (§5.1) matters more than it looks.

## 12. Competitive Moat

**Structural edge**: if the pilot region is tier-3/rural (e.g. Kondagaon-scale towns), quick-commerce (Blinkit/Zepto/Instamart) cannot follow — dark-store delivery only pencils out above a per-km² order density that these towns don't have. Justdial/IndiaMart nominally list these towns but are lead-gen directories sold via telecalling annual packages; their revenue model gives them no incentive to build daily-engagement tooling. This isn't a feature, it's a market they can't profitably enter — decide the pilot region with this in mind.

Feature-level moat, grouped by the psychological lever it pulls and why a directory/quick-commerce incumbent won't copy it:

| Feature | Lever | Why they won't copy it |
|---|---|---|
| "Open Now/Closed" live toggle + "posted X min ago" timestamps | Recency bias — dead listings feel untrustworthy | No daily owner engagement loop exists on those platforms to generate real freshness signals |
| "N people viewed today / M claimed this hour" | Social proof, FOMO | Needs concentrated local traffic per listing; their traffic is spread thin city-wide |
| Countdown on coupon expiry | Scarcity | Needs the claim/redeem model (§5.3) they have no equivalent of |
| One-tap "Ask on WhatsApp" (`wa.me` deep link, pre-filled) | Removes cold-call friction | They just show a phone number — a call is much higher friction than a pre-filled chat |
| QR sticker at the shop's physical counter | Bridges foot traffic → app instantly | No physical-world touchpoint strategy; costs us nothing (just a link) |
| Home feed defaults to offers expiring today/this week, not a static listing | Habit loop — reason to open with no immediate need | Core behavioral gap: directories are opened out of necessity, rarely; this aims for daily-scroll cadence |
| Owner nudge: "shops posting 3x/week get ~3x more views" | Keeps supply fresh enough for the habit loop above to work | Their revenue is annual-package based, not engagement-based — no incentive to build this |
| Default language by pincode (regional-first, not English-first) | In-group trust — feels built *for* the town | Incumbents remain English/metro-coded UX even where language toggles exist |

**Build-first three** (highest impact-to-effort): time-bound offer feed as home screen default, WhatsApp "Ask" deep link, "posted X ago" + Open Now toggle. All three are near-zero marginal build cost on top of the MVP schema already in §7.
