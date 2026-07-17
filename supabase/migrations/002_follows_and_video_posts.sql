-- ============================================================
-- MEYDAN — Migration 002: Takip sistemi + video gönderi desteği
-- ============================================================
-- Bu dosyayı Supabase Dashboard > SQL Editor içinde tek seferde
-- çalıştırın. Daha önce supabase/schema.sql'i çalıştırmış olan
-- mevcut projeler için tasarlanmıştır; tamamen idempotent'tir
-- (tekrar tekrar güvenle çalıştırılabilir).
-- Sıfırdan kurulum yapıyorsanız sadece supabase/schema.sql
-- yeterlidir — o dosya artık bu migration'ı da içeriyor.
-- ============================================================

-- ------------------------------------------------------------
-- 1) POSTS — video gönderileri için media_type kolonu
-- ------------------------------------------------------------
alter table public.posts
  add column if not exists media_type text not null default 'image';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'posts_media_type_check'
  ) then
    alter table public.posts
      add constraint posts_media_type_check check (media_type in ('image', 'video'));
  end if;
end $$;

-- ------------------------------------------------------------
-- 2) FOLLOWS — takip sistemi
-- ------------------------------------------------------------
create table if not exists public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint follows_no_self_follow check (follower_id <> following_id)
);

create index if not exists follows_follower_id_idx on public.follows (follower_id);
create index if not exists follows_following_id_idx on public.follows (following_id);

alter table public.follows enable row level security;

drop policy if exists "Takip ilişkileri herkes tarafından görülebilir" on public.follows;
create policy "Takip ilişkileri herkes tarafından görülebilir"
  on public.follows for select
  using (true);

drop policy if exists "Kullanıcı sadece kendi adına takip edebilir" on public.follows;
create policy "Kullanıcı sadece kendi adına takip edebilir"
  on public.follows for insert
  with check (auth.uid() = follower_id);

drop policy if exists "Kullanıcı sadece kendi takibini bırakabilir" on public.follows;
create policy "Kullanıcı sadece kendi takibini bırakabilir"
  on public.follows for delete
  using (auth.uid() = follower_id);

-- ------------------------------------------------------------
-- 3) REALTIME — follows tablosunu publication'a ekle
-- ------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'follows'
  ) then
    alter publication supabase_realtime add table public.follows;
  end if;
end $$;

-- ============================================================
-- Bitti. src/lib/api.js içindeki follow/unfollow/fetchFollows
-- fonksiyonları bu tabloyu kullanıyor.
-- ============================================================
