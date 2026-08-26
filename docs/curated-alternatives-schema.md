# Curated alternatives

Firestore collection: `curatedAlternatives/{barcode}`

Each published record is a product-level recommendation with a reproducible
baseline score. The app recomputes `scoreBreakdown` against the current user's
nutrition profile before displaying it.

Required fields:

- `code`: barcode or stable source product ID
- `productName`, `brand`, `category`, `categoryKeys`
- `ingredients`: normalized ingredient names used by `scoreIngredients`
- `catalogScore`: baseline score for a profile with no conflicts
- `scoreBreakdown`: `{ quality, processing, fit, score }`
- `scoringVersion`: currently `strictly-v1`
- `status`: `published`, `needs_review`, or `retired`
- `sourceIds`, `sourceUrl`, `productUrl`
- `region`, `verifiedAt`

Starter records are deliberately limited to short, recognizable labels. A
catalog score is not a medical or universal safety claim; it is a transparent
ranking based on the recorded label and the current Strictly scoring rules.
