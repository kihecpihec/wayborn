create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade
);
alter table public.profiles enable row level security;
revoke all on public.profiles from public, anon, authenticated;
grant select on public.profiles to authenticated;
create policy own_profile on public.profiles for select to authenticated using (id = (select auth.uid()));

create function public.create_wayborn_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id) values (new.id);
  return new;
end;
$$;
revoke all on function public.create_wayborn_profile() from public, anon, authenticated;
create trigger create_wayborn_profile after insert on auth.users
for each row execute function public.create_wayborn_profile();
insert into public.profiles select id from auth.users on conflict do nothing;
