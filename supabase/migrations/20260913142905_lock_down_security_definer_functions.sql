begin;

-- ---------------------------------------------------------------------------
-- Supabase grants EXECUTE on new public functions directly to anon,
-- authenticated and service_role, so the earlier `revoke ... from public`
-- left those grants in place. Tighten each SECURITY DEFINER function to the
-- roles that actually need it.
-- ---------------------------------------------------------------------------

-- Called by signed-in users (client + edge functions using the user's JWT).
revoke execute on function public.consume_ai_credit(text) from public, anon;
revoke execute on function public.ai_credit_status() from public, anon;

-- Internal helper: only called from the SECURITY DEFINER functions above,
-- which run as the owner. Must not be exposed, or anyone can look up whether
-- an arbitrary user id is a paying subscriber.
revoke execute on function public.is_pro_user(uuid) from public, anon, authenticated;

-- Trigger functions: Postgres does not check EXECUTE when a trigger fires,
-- so nobody needs to call these through the API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.refresh_post_counter() from public, anon, authenticated;

commit;
