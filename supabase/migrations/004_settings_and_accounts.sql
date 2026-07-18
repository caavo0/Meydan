-- ============================================================
-- MEYDAN — Migration 004: Ayarlar sayfası + hesap yönetimi
-- ============================================================
-- Bu dosyayı Supabase Dashboard > SQL Editor içinde tek seferde
-- çalıştırın. Tamamen idempotent'tir (tekrar tekrar güvenle
-- çalıştırılabilir). 001, 002 ve 003 migrationlarının daha önce
-- çalıştırılmış olduğunu varsayar.
--
-- Kapsam:
--   1) profiles — kapak fotoğrafı, ad soyad, telefon, gizlilik,
--      bildirim tercihleri kolonları
--   2) blocked_users — engellenen kullanıcılar
--   3) delete_own_account() — "Hesabı Sil" için RPC
--   4) storage — kapak fotoğrafları için policy (images bucket'ı
--      "covers/" klasörü altında yeniden kullanılıyor)
-- ============================================================

-- ------------------------------------------------------------
-- 1) PROFILES — yeni kolonlar
-- ------------------------------------------------------------
alter table public.profiles
  add column if not exists full_name text default '',
  add column if not exists cover_url text,
  add column if not exists phone text,
  add column if not exists is_private boolean not null default false,
  add column if not exists notification_prefs jsonb not null default
    '{"likes": true, "comments": true, "follows": true, "messages": true}'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

-- Profil güncellendiğinde updated_at otomatik yenilensin.
create or replace function public.touch_profile_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_profile_updated on public.profiles;
create trigger on_profile_updated
  before update on public.profiles
  for each row execute procedure public.touch_profile_updated_at();

-- ------------------------------------------------------------
-- 2) BLOCKED_USERS — engellenen kullanıcılar
-- ------------------------------------------------------------
create table if not exists public.blocked_users (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocked_users_no_self_block check (blocker_id <> blocked_id)
);

create index if not exists blocked_users_blocker_id_idx on public.blocked_users (blocker_id);
create index if not exists blocked_users_blocked_id_idx on public.blocked_users (blocked_id);

alter table public.blocked_users enable row level security;

drop policy if exists "Kullanıcı sadece kendi engel listesini görebilir" on public.blocked_users;
create policy "Kullanıcı sadece kendi engel listesini görebilir"
  on public.blocked_users for select
  using (auth.uid() = blocker_id);

drop policy if exists "Kullanıcı kendi adına engelleme ekleyebilir" on public.blocked_users;
create policy "Kullanıcı kendi adına engelleme ekleyebilir"
  on public.blocked_users for insert
  with check (auth.uid() = blocker_id);

drop policy if exists "Kullanıcı kendi engellemesini kaldırabilir" on public.blocked_users;
create policy "Kullanıcı kendi engellemesini kaldırabilir"
  on public.blocked_users for delete
  using (auth.uid() = blocker_id);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'blocked_users'
  ) then
    alter publication supabase_realtime add table public.blocked_users;
  end if;
end $$;

-- Engelleme ilişkisi varken karşılıklı takip de otomatik kaldırılsın.
create or replace function public.handle_new_block()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  delete from public.follows
  where (follower_id = new.blocker_id and following_id = new.blocked_id)
     or (follower_id = new.blocked_id and following_id = new.blocker_id);
  return new;
end;
$$;

drop trigger if exists on_block_created on public.blocked_users;
create trigger on_block_created
  after insert on public.blocked_users
  for each row execute procedure public.handle_new_block();

-- ------------------------------------------------------------
-- 3) HESABI SİL — RPC fonksiyonu
-- ------------------------------------------------------------
-- Not: auth.users satırının silinmesi normalde sadece service_role
-- yetkisiyle (Admin API / Edge Function) yapılabilir. Bu fonksiyon
-- security definer ile tanımlanıp postgres sahipliğinde çalıştığı
-- için auth.users üzerinde silme izni taşır; profiles satırı zaten
-- "on delete cascade" ile posts/likes/comments/follows/messages vb.
-- tüm ilişkili verileri otomatik temizler.
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Oturum bulunamadı';
  end if;

  delete from public.profiles where id = uid;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;

-- ------------------------------------------------------------
-- 4) STORAGE — kapak fotoğrafları (images bucket, covers/ klasörü)
-- ------------------------------------------------------------
-- images bucket'ı zaten 001 migration'ında herkese açık select +
-- giriş yapan kullanıcılar için insert izniyle oluşturuldu; kapak
-- fotoğrafları da aynı bucket'ta "covers/{user_id}/..." yolunda
-- saklanıyor, bu yüzden ek bir policy gerekmiyor. Kullanıcının
-- sadece kendi kapak fotoğrafını silebilmesi için:
drop policy if exists "Kullanıcı kendi kapak fotoğrafını silebilir" on storage.objects;
create policy "Kullanıcı kendi kapak fotoğrafını silebilir"
  on storage.objects for delete
  using (bucket_id = 'images' and owner = auth.uid());

-- ============================================================
-- Bitti. Google ile giriş / hesap bağlama için Supabase Dashboard
-- > Authentication > Providers > Google kısmından OAuth Client ID
-- ve Secret girilmesi gerekir — bu adım SQL ile yapılamaz.
-- ============================================================
