-- ============================================================
-- MEYDAN — Migration 004: Ayarlar sayfası + gönderi yönetimi
-- ============================================================
-- Bu dosyayı Supabase Dashboard > SQL Editor içinde tek seferde
-- çalıştırın. Tamamen idempotent'tir (tekrar tekrar güvenle
-- çalıştırılabilir). Önceki migration'ları (001-003) ve
-- supabase/schema.sql'i çalıştırmış olan projeler içindir.
--
-- Bu migration ekliyor:
--   1) profiles: cover_url, phone, pinned_post_id
--   2) posts: comments_disabled, edited_at
--   3) saved_posts tablosu (yalnızca sahibi görebilir)
--   4) blocked_users tablosu + engellenen kullanıcıların
--      gönderi/profil görünürlüğünü kısıtlayan RLS güncellemeleri
--   5) delete_own_account() — "Hesabı Sil" için RPC fonksiyonu
--   6) "images" storage bucket'ının video dosyalarını da
--      (mp4/mov/webm) kabul etmesi için mime-type/limit güncellemesi
-- ============================================================

-- ------------------------------------------------------------
-- 1) PROFILES — kapak fotoğrafı, telefon, sabitlenen gönderi
-- ------------------------------------------------------------
alter table public.profiles
  add column if not exists cover_url text;

alter table public.profiles
  add column if not exists phone text;

alter table public.profiles
  add column if not exists pinned_post_id uuid references public.posts (id) on delete set null;

-- ------------------------------------------------------------
-- 2) POSTS — yorum kapatma + düzenleme zaman damgası
-- ------------------------------------------------------------
alter table public.posts
  add column if not exists comments_disabled boolean not null default false;

alter table public.posts
  add column if not exists edited_at timestamptz;

-- Gönderi düzenlendiğinde (caption değiştiğinde) edited_at'i otomatik doldur
create or replace function public.set_post_edited_at()
returns trigger
language plpgsql
as $$
begin
  if new.caption is distinct from old.caption then
    new.edited_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists on_post_caption_updated on public.posts;
create trigger on_post_caption_updated
  before update on public.posts
  for each row execute procedure public.set_post_edited_at();

-- Kullanıcının kendi gönderisini güncelleyebilmesi (düzenle / sabitle / yorum kapat)
drop policy if exists "Kullanıcı sadece kendi gönderisini güncelleyebilir" on public.posts;
create policy "Kullanıcı sadece kendi gönderisini güncelleyebilir"
  on public.posts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 3) SAVED_POSTS — kaydedilenler (sadece kullanıcının kendisi görebilir)
-- ------------------------------------------------------------
create table if not exists public.saved_posts (
  user_id uuid not null references public.profiles (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create index if not exists saved_posts_user_id_idx on public.saved_posts (user_id, created_at desc);

alter table public.saved_posts enable row level security;

drop policy if exists "Kullanıcı sadece kendi kayıtlarını görebilir" on public.saved_posts;
create policy "Kullanıcı sadece kendi kayıtlarını görebilir"
  on public.saved_posts for select
  using (auth.uid() = user_id);

drop policy if exists "Kullanıcı kendi adına gönderi kaydedebilir" on public.saved_posts;
create policy "Kullanıcı kendi adına gönderi kaydedebilir"
  on public.saved_posts for insert
  with check (auth.uid() = user_id);

drop policy if exists "Kullanıcı kendi kaydını kaldırabilir" on public.saved_posts;
create policy "Kullanıcı kendi kaydını kaldırabilir"
  on public.saved_posts for delete
  using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 4) BLOCKED_USERS — engellenen kullanıcılar
-- ------------------------------------------------------------
create table if not exists public.blocked_users (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocked_users_no_self_block check (blocker_id <> blocked_id)
);

create index if not exists blocked_users_blocker_idx on public.blocked_users (blocker_id);
create index if not exists blocked_users_blocked_idx on public.blocked_users (blocked_id);

alter table public.blocked_users enable row level security;

drop policy if exists "Kullanıcı sadece kendi engel listesini görebilir" on public.blocked_users;
create policy "Kullanıcı sadece kendi engel listesini görebilir"
  on public.blocked_users for select
  using (auth.uid() = blocker_id);

drop policy if exists "Kullanıcı kendi adına birini engelleyebilir" on public.blocked_users;
create policy "Kullanıcı kendi adına birini engelleyebilir"
  on public.blocked_users for insert
  with check (auth.uid() = blocker_id);

drop policy if exists "Kullanıcı kendi engelini kaldırabilir" on public.blocked_users;
create policy "Kullanıcı kendi engelini kaldırabilir"
  on public.blocked_users for delete
  using (auth.uid() = blocker_id);

-- Engellenen biri sizi engelleyen kişiyi takip edemesin, engellenen kişiye
-- mesaj gönderilemesin diye küçük bir yardımcı fonksiyon:
create or replace function public.is_blocked(_a uuid, _b uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.blocked_users
    where (blocker_id = _a and blocked_id = _b)
       or (blocker_id = _b and blocked_id = _a)
  );
$$;

drop policy if exists "Kullanıcı sadece kendi adına takip edebilir" on public.follows;
create policy "Kullanıcı sadece kendi adına takip edebilir"
  on public.follows for insert
  with check (auth.uid() = follower_id and not public.is_blocked(follower_id, following_id));

drop policy if exists "Kullanıcı sadece kendi mesajını, üyesi olduğu bir konuşmaya gönderebilir" on public.messages;
create policy "Kullanıcı sadece kendi mesajını, üyesi olduğu bir konuşmaya gönderebilir"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and public.is_conversation_member(conversation_id, auth.uid())
    and not exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = messages.conversation_id
        and cm.user_id <> auth.uid()
        and public.is_blocked(auth.uid(), cm.user_id)
    )
  );

-- ------------------------------------------------------------
-- 5) HESABI SİL — auth.users satırını da temizleyen RPC
-- ------------------------------------------------------------
-- profiles.id -> auth.users.id "on delete cascade" olduğu için
-- auth.users satırı silinince profiles / posts / likes / comments /
-- follows / saved_posts / blocked_users otomatik temizlenir.
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Oturum açık değil';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

grant execute on function public.delete_own_account() to authenticated;

-- ------------------------------------------------------------
-- 6) STORAGE — "images" bucket'ını video dosyaları için genişlet
-- ------------------------------------------------------------
update storage.buckets
set file_size_limit = 104857600, -- 100 MB (video için)
    allowed_mime_types = array[
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'video/mp4', 'video/quicktime', 'video/webm'
    ]
where id = 'images';

-- ------------------------------------------------------------
-- 7) REALTIME — saved_posts / blocked_users değişiklik yayını
-- ------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'saved_posts'
  ) then
    alter publication supabase_realtime add table public.saved_posts;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'blocked_users'
  ) then
    alter publication supabase_realtime add table public.blocked_users;
  end if;
end $$;

-- ============================================================
-- Bitti. src/lib/api.js içindeki yeni ayarlar / kaydetme / sabitleme /
-- engelleme fonksiyonları bu tabloları ve RPC'yi kullanıyor.
-- ============================================================
