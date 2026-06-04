create schema if not exists app_private;
revoke all on schema app_private from public;
grant usage on schema app_private to anon, authenticated;

create or replace function app_private.cancel_recommendation(
  p_photo_id uuid,
  p_visitor_id text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  deleted_id uuid;
  updated_count integer;
begin
  if p_visitor_id is null or char_length(p_visitor_id) < 8 or char_length(p_visitor_id) > 128 then
    return jsonb_build_object('ok', false, 'reason', 'invalid_visitor');
  end if;

  perform pg_advisory_xact_lock(hashtext(p_visitor_id));

  delete from public.recommendations
  where photo_id = p_photo_id
    and visitor_id = p_visitor_id
  returning id into deleted_id;

  if deleted_id is null then
    return jsonb_build_object('ok', false, 'reason', 'not_recommended');
  end if;

  update public.photos
  set recommendation_count = greatest(0, recommendation_count - 1)
  where id = p_photo_id
  returning recommendation_count into updated_count;

  return jsonb_build_object('ok', true, 'recommendation_count', updated_count);
end;
$$;

create or replace function public.cancel_recommendation(
  p_photo_id uuid,
  p_visitor_id text
)
returns jsonb
language sql
security invoker
set search_path = pg_catalog
as $$
  select app_private.cancel_recommendation(p_photo_id, p_visitor_id);
$$;

grant execute on function app_private.cancel_recommendation(uuid, text) to anon, authenticated;
grant execute on function public.cancel_recommendation(uuid, text) to anon, authenticated;
