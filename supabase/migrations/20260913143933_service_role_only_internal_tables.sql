begin;

-- ---------------------------------------------------------------------------
-- These tables are only read and written by edge functions using the service
-- role (search cache, API telemetry, barcode miss queue, RevenueCat delivery
-- log). RLS already blocks anon/authenticated; make that intent explicit with
-- a service-role-only policy so clients never gain access by accident.
-- ---------------------------------------------------------------------------

create policy "service role only" on public.food_api_events
  for all to service_role using (true) with check (true);

create policy "service role only" on public.food_barcode_misses
  for all to service_role using (true) with check (true);

create policy "service role only" on public.food_search_cache
  for all to service_role using (true) with check (true);

create policy "service role only" on public.revenuecat_webhook_events
  for all to service_role using (true) with check (true);

commit;
