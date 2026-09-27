# StrictlyFuel community photo moderation

Publishing is fail-closed. The mobile app calls `publish-fuel-post` with the exact JPEG it wants to share and its caption. Only that authenticated Edge Function can create or update `fuel_posts`; client insert/update privileges have been removed. OpenAI's image-and-text moderation checks the actual photo and caption. Flagged posts are rejected, borderline results remain private as `needs_review`, and provider/storage failures also remain private. Approved bytes are stored in the public-read, service-only-write `community-images` bucket; pending review bytes stay in private `community-review` storage. The API key is a Supabase Edge secret, never a mobile environment variable.

## Human review

`review-fuel-post` supports `GET` for up to 25 oldest pending/needs-review posts, returning a ten-minute signed photo URL, and `POST` with `{ "postId": "...", "action": "approve" | "reject" }`. Only an authenticated account with `app_metadata.community_moderator === true` may call it. Assign that role from Supabase Auth administration, not user-editable `user_metadata`. Approving copies the reviewed photo into the approved-only bucket before making the post public; rejecting removes its private review photo. Do not approve a row whose photo cannot be inspected.

`getstrictly@gmail.com` has the scoped `community_moderator` role. A review dashboard has not been built yet, so uncertain posts stay private until reviewed through the protected review endpoint. Check the queue regularly and respond promptly to user reports. This automation does not replace the in-app report/block flows or a published support contact.

## Release notes

- This migration was applied to project `ggjztwwkqbtqnpqrzrye` via `supabase db query --linked --file` and then recorded as applied because three unrelated remote migrations are absent from this local branch. Do not run a blanket migration repair on those versions.
- Both Edge Functions have been deployed. The new mobile publishing flow still needs an app build/release; older installed builds attempting direct inserts will fail safely.
- The current Discover feed still uses local/demo posts (`fetchFuelPosts` returns an empty array). This work protects publication in the database, but is not a finished cross-user social feed.
- Automated moderation is imperfect. Test with benign, borderline, and prohibited test images, and review privacy disclosure before enabling broad community sharing.
