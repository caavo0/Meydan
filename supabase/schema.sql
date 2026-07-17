-- ============================================================
-- MEYDAN — Supabase şema, RLS policy'leri ve storage ayarları
-- ============================================================
-- Bu dosyanın TAMAMINI Supabase Dashboard > SQL Editor içinde
-- tek seferde çalıştırın (New query > yapıştır > Run).
-- ============================================================

-- ------------------------------------------------------------
-- 1) PROFILES
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  email text not null,
  bio text default '',
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiller herkes tarafından görülebilir"
  on public.profiles for select
  using (true);

create policy "Kullanıcı sadece kendi profilini güncelleyebilir"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Kullanıcı kendi profilini oluşturabilir"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Yeni kullanıcı auth.users tablosuna kaydolduğunda otomatik olarak
-- profiles tablosunda bir satır oluşturan trigger.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ------------------------------------------------------------
-- 2) POSTS
-- ------------------------------------------------------------
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  image_url text not null,
  caption text default '',
  created_at timestamptz not null default now()
);

create index if not exists posts_created_at_idx on public.posts (created_at desc);
create index if not exists posts_user_id_idx on public.posts (user_id);

alter table public.posts enable row level security;

create policy "Gönderiler herkes tarafından görülebilir"
  on public.posts for select
  using (true);

create policy "Kullanıcı kendi gönderisini oluşturabilir"
  on public.posts for insert
  with check (auth.uid() = user_id);

create policy "Kullanıcı sadece kendi gönderisini silebilir"
  on public.posts for delete
  using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 3) LIKES  (bir kullanıcı bir gönderiyi sadece 1 kez beğenebilir)
-- ------------------------------------------------------------
create table if not exists public.likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create index if not exists likes_post_id_idx on public.likes (post_id);

alter table public.likes enable row level security;

create policy "Beğeniler herkes tarafından görülebilir"
  on public.likes for select
  using (true);

create policy "Kullanıcı kendi beğenisini ekleyebilir"
  on public.likes for insert
  with check (auth.uid() = user_id);

create policy "Kullanıcı kendi beğenisini kaldırabilir"
  on public.likes for delete
  using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 3b) COMMENTS
-- ------------------------------------------------------------
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

create index if not exists comments_post_id_idx on public.comments (post_id, created_at);

alter table public.comments enable row level security;

create policy "Yorumlar herkes tarafından görülebilir"
  on public.comments for select
  using (true);

create policy "Kullanıcı kendi yorumunu ekleyebilir"
  on public.comments for insert
  with check (auth.uid() = user_id);

create policy "Kullanıcı sadece kendi yorumunu silebilir"
  on public.comments for delete
  using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 4) CONVERSATIONS + CONVERSATION_MEMBERS
-- ------------------------------------------------------------
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

alter table public.conversations enable row level security;

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (conversation_id, user_id)
);

alter table public.conversation_members enable row level security;

create policy "Kullanıcı üyesi olduğu konuşmaları görebilir"
  on public.conversations for select
  using (
    exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = conversations.id
        and cm.user_id = auth.uid()
    )
  );

create policy "Giriş yapan kullanıcı yeni konuşma oluşturabilir"
  on public.conversations for insert
  with check (auth.uid() is not null);

create policy "Üyeler kendi konuşmalarındaki üyelik listesini görebilir"
  on public.conversation_members for select
  using (
    exists (
      select 1 from public.conversation_members cm2
      where cm2.conversation_id = conversation_members.conversation_id
        and cm2.user_id = auth.uid()
    )
  );

-- Not: 1'e-1 sohbet oluşturulurken tek bir kullanıcı hem kendisini hem de
-- karşı tarafı conversation_members'a ekler (yeni konuşmayı o başlatır).
-- Bu yüzden policy'i "sadece kendini ekleyebilir" ile sınırlamak yerine,
-- giriş yapmış herhangi bir kullanıcının üyelik satırı eklemesine izin
-- veriyoruz. Okuma (select) tarafı zaten yukarıda üyelikle kısıtlı.
create policy "Giriş yapan kullanıcı konuşmaya üye ekleyebilir"
  on public.conversation_members for insert
  with check (auth.uid() is not null);

-- ------------------------------------------------------------
-- 5) MESSAGES
-- ------------------------------------------------------------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_id_idx on public.messages (conversation_id, created_at);

alter table public.messages enable row level security;

create policy "Üyeler kendi konuşmalarındaki mesajları görebilir"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = messages.conversation_id
        and cm.user_id = auth.uid()
    )
  );

create policy "Kullanıcı sadece kendi mesajını, üyesi olduğu bir konuşmaya gönderebilir"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = messages.conversation_id
        and cm.user_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- 6) STORAGE — "images" bucket (gönderi fotoğrafları)
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('images', 'images', true)
on conflict (id) do nothing;

create policy "Herkes images bucket'ındaki dosyaları görüntüleyebilir"
  on storage.objects for select
  using (bucket_id = 'images');

create policy "Giriş yapan kullanıcılar images bucket'ına dosya yükleyebilir"
  on storage.objects for insert
  with check (bucket_id = 'images' and auth.uid() is not null);

create policy "Kullanıcı kendi yüklediği dosyayı silebilir"
  on storage.objects for delete
  using (bucket_id = 'images' and owner = auth.uid());

-- ------------------------------------------------------------
-- 7) REALTIME — ilgili tabloları realtime publication'a ekle
-- ------------------------------------------------------------
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.posts;
alter publication supabase_realtime add table public.likes;
alter publication supabase_realtime add table public.comments;
alter publication supabase_realtime add table public.messages;

-- ------------------------------------------------------------
-- 8) conversation_members / conversations / messages için
-- sonsuz döngü (infinite recursion) düzeltmesi. Bu bölüm daha
-- önce projeyi kurmuş olanlar için de güvenle tekrar çalıştırılabilir.
-- ------------------------------------------------------------
create or replace function public.is_conversation_member(_conversation_id uuid, _user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.conversation_members
    where conversation_id = _conversation_id
      and user_id = _user_id
  );
$$;

drop policy if exists "Üyeler kendi konuşmalarındaki üyelik listesini görebilir" on public.conversation_members;
drop policy if exists "Kullanıcı üyesi olduğu konuşmaları görebilir" on public.conversations;
drop policy if exists "Üyeler kendi konuşmalarındaki mesajları görebilir" on public.messages;
drop policy if exists "Kullanıcı sadece kendi mesajını, üyesi olduğu bir konuşmaya gönderebilir" on public.messages;

create policy "Üyeler kendi konuşmalarındaki üyelik listesini görebilir"
  on public.conversation_members for select
  using (public.is_conversation_member(conversation_id, auth.uid()));

create policy "Kullanıcı üyesi olduğu konuşmaları görebilir"
  on public.conversations for select
  using (public.is_conversation_member(id, auth.uid()));

create policy "Üyeler kendi konuşmalarındaki mesajları görebilir"
  on public.messages for select
  using (public.is_conversation_member(conversation_id, auth.uid()));

create policy "Kullanıcı sadece kendi mesajını, üyesi olduğu bir konuşmaya gönderebilir"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and public.is_conversation_member(conversation_id, auth.uid())
  );

-- ------------------------------------------------------------
-- 9) POSTS — video gönderileri için media_type kolonu
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
-- 10) FOLLOWS — takip sistemi
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

create policy "Takip ilişkileri herkes tarafından görülebilir"
  on public.follows for select
  using (true);

create policy "Kullanıcı sadece kendi adına takip edebilir"
  on public.follows for insert
  with check (auth.uid() = follower_id);

create policy "Kullanıcı sadece kendi takibini bırakabilir"
  on public.follows for delete
  using (auth.uid() = follower_id);

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
-- Bitti. Sıradaki adım için README.md dosyasındaki kurulum
-- talimatlarını takip edin (Storage bucket ve Auth ayarları dahil).
-- Mevcut bir projeyi güncelliyorsanız supabase/migrations/002_follows_and_video_posts.sql
-- dosyasını çalıştırmanız yeterlidir.
-- ============================================================
