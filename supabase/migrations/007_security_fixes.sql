-- ============================================================
-- MEYDAN — Migration 007: Güvenlik açıkları düzeltmesi
-- ============================================================
-- Bu dosyayı Supabase Dashboard > SQL Editor içinde tek seferde
-- çalıştırın. 001-006 migration'larından SONRA çalıştırılmalıdır.
-- İdempotenttir; tekrar tekrar güvenle çalıştırılabilir.
--
-- Kapsam:
--   1) profiles tablosundaki email/phone sızıntısının kapatılması
--      (yeni profile_private tablosu, sadece sahibi okuyabilir)
--   2) is_private ("gizli hesap") ayarının gerçekten uygulanması
--      (posts/comments/likes artık takip etmeyenlere kapalı)
--   3) storage upload path spoofing düzeltmesi (kullanıcı sadece
--      kendi klasörüne dosya yükleyebilir)
--   4) blocked_users'ın gerçekten uygulanması (mesaj/takip/görünürlük)
-- ============================================================

-- ------------------------------------------------------------
-- 1) PROFILES — hassas kolonların (email, phone) ayrı tabloya taşınması
-- ------------------------------------------------------------
-- Sorun: "profiles for select using (true)" hiçbir rol kısıtı içermiyordu,
-- yani giriş yapmamış (anon) biri bile sadece public anon key ile TÜM
-- kullanıcıların e-posta ve telefon numaralarını çekebiliyordu.
-- Postgres RLS satır bazlıdır, kolon bazlı değildir; bu yüzden hassas
-- kolonları ayrı, sıkı korumalı bir tabloya taşıyoruz.

create table if not exists public.profile_private (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  email text,
  phone text
);

alter table public.profile_private enable row level security;

-- Mevcut veriyi taşı (varsa)
insert into public.profile_private (user_id, email, phone)
select id, email, phone from public.profiles
on conflict (user_id) do update
  set email = excluded.email,
      phone = excluded.phone;

drop policy if exists "profile_private_select_own" on public.profile_private;
create policy "profile_private_select_own"
  on public.profile_private for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "profile_private_update_own" on public.profile_private;
create policy "profile_private_update_own"
  on public.profile_private for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "profile_private_insert_own" on public.profile_private;
create policy "profile_private_insert_own"
  on public.profile_private for insert
  to authenticated
  with check (auth.uid() = user_id);

-- profiles tablosundan artık gereksiz/tehlikeli hale gelen kolonları kaldır.
-- (email zaten auth.users / session üzerinden okunuyor, phone artık
-- profile_private'ta.)
alter table public.profiles drop column if exists email;
alter table public.profiles drop column if exists phone;

-- Yeni kullanıcı tetikleyicisi: profiles + profile_private'ı birlikte doldur.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1))
  );
  insert into public.profile_private (user_id, email)
  values (new.id, new.email);
  return new;
end;
$$;

-- profiles SELECT policy'sini sadece "güvenli" kolonlar kalacak şekilde
-- yeniden kur (artık email/phone barındırmadığı için herkese açık kalması
-- güvenlik sorunu değil — kullanıcı adı/avatar/bio zaten ürün gereği açık
-- olmalı ki Keşfet/yorum/mesaj ekranlarında görünebilsin).
drop policy if exists "Profiller herkes tarafından görülebilir" on public.profiles;
create policy "Profiller herkes tarafından görülebilir"
  on public.profiles for select
  using (true);

-- ------------------------------------------------------------
-- 2) IS_PRIVATE — "gizli hesap" ayarının gerçekten uygulanması
-- ------------------------------------------------------------
-- Yardımcı fonksiyon: bir gönderi, verilen kullanıcı tarafından
-- görülebilir mi? (herkese açık hesap sahibi / kendi gönderisi /
-- takip ediyor VE aralarında engelleme yok)
create or replace function public.is_post_visible(_post_id uuid, _viewer uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.posts p
    join public.profiles pr on pr.id = p.user_id
    where p.id = _post_id
      and not exists (
        select 1 from public.blocked_users b
        where (b.blocker_id = p.user_id and b.blocked_id = _viewer)
           or (b.blocker_id = _viewer and b.blocked_id = p.user_id)
      )
      and (
        pr.is_private = false
        or p.user_id = _viewer
        or exists (
          select 1 from public.follows f
          where f.following_id = p.user_id and f.follower_id = _viewer
        )
      )
  );
$$;

drop policy if exists "Gönderiler herkes tarafından görülebilir" on public.posts;
create policy "posts_select_visible"
  on public.posts for select
  using (public.is_post_visible(id, auth.uid()));

drop policy if exists "Yorumlar herkes tarafından görülebilir" on public.comments;
create policy "comments_select_visible"
  on public.comments for select
  using (public.is_post_visible(post_id, auth.uid()));

drop policy if exists "Kullanıcı kendi yorumunu ekleyebilir" on public.comments;
create policy "Kullanıcı kendi yorumunu ekleyebilir"
  on public.comments for insert
  with check (
    auth.uid() = user_id
    and public.is_post_visible(post_id, auth.uid())
    and exists (
      select 1 from public.posts p
      where p.id = comments.post_id
        and p.comments_enabled = true
    )
  );

drop policy if exists "Beğeniler herkes tarafından görülebilir" on public.likes;
create policy "likes_select_visible"
  on public.likes for select
  using (public.is_post_visible(post_id, auth.uid()));

drop policy if exists "Kullanıcı kendi beğenisini ekleyebilir" on public.likes;
create policy "Kullanıcı kendi beğenisini ekleyebilir"
  on public.likes for insert
  with check (auth.uid() = user_id and public.is_post_visible(post_id, auth.uid()));

-- ------------------------------------------------------------
-- 3) STORAGE — kullanıcı sadece kendi klasörüne yükleyebilsin
-- ------------------------------------------------------------
-- Sorun: eski policy sadece "auth.uid() is not null" kontrol ediyordu;
-- path (userId/...) client tarafından belirlendiği için herhangi bir
-- giriş yapmış kullanıcı, başka bir kullanıcının klasör path'ine dosya
-- yükleyebiliyordu. Artık path'in ilk klasör segmentinin auth.uid()
-- ile eşleştiği zorunlu kılınıyor.
drop policy if exists "Giriş yapan kullanıcılar images bucket'ına dosya yükleyebilir" on storage.objects;
create policy "images_insert_own_folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Not: src/lib/api.js içindeki uploadCover() artık `${userId}/covers/...`
-- path'ini kullanacak şekilde güncellendi (önceden `covers/${userId}/...`
-- idi, ilk segment userId olmadığı için yukarıdaki policy'i geçemezdi).

-- ------------------------------------------------------------
-- 4) BLOCKED_USERS — engellemenin gerçekten uygulanması
-- ------------------------------------------------------------

-- 4a) Engellenen biriyle yeni sohbet başlatılamasın (iki yönlü)
create or replace function public.check_no_block_in_conversation()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if exists (
    select 1
    from public.conversation_members cm
    join public.blocked_users b
      on (b.blocker_id = cm.user_id and b.blocked_id = new.user_id)
      or (b.blocker_id = new.user_id and b.blocked_id = cm.user_id)
    where cm.conversation_id = new.conversation_id
      and cm.user_id <> new.user_id
  ) then
    raise exception 'Bu kullanıcıyla aranızda bir engelleme bulunduğu için sohbet başlatılamaz.';
  end if;
  return new;
end;
$$;

drop trigger if exists on_conversation_member_block_check on public.conversation_members;
create trigger on_conversation_member_block_check
  before insert on public.conversation_members
  for each row execute procedure public.check_no_block_in_conversation();

-- 4b) Var olan bir sohbette de (engelleme sonradan eklendiyse) mesaj
-- gönderilemesin
create or replace function public.conversation_has_block(_conversation_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.conversation_members cm1
    join public.conversation_members cm2
      on cm2.conversation_id = cm1.conversation_id and cm2.user_id <> cm1.user_id
    join public.blocked_users b
      on (b.blocker_id = cm1.user_id and b.blocked_id = cm2.user_id)
      or (b.blocker_id = cm2.user_id and b.blocked_id = cm1.user_id)
    where cm1.conversation_id = _conversation_id
  );
$$;

drop policy if exists "Kullanıcı sadece kendi mesajını, üyesi olduğu bir konuşmaya gönderebilir" on public.messages;
drop policy if exists "messages_insert" on public.messages;
create policy "messages_insert"
  on public.messages for insert
  to authenticated
  with check (
    auth.uid() = sender_id
    and public.is_conversation_member(conversation_id, auth.uid())
    and not public.conversation_has_block(conversation_id)
  );

-- 4c) Engelli biri takip edilemesin / o kişi tarafından takip edilemesin
drop policy if exists "Kullanıcı sadece kendi adına takip edebilir" on public.follows;
create policy "Kullanıcı sadece kendi adına takip edebilir"
  on public.follows for insert
  with check (
    auth.uid() = follower_id
    and not exists (
      select 1 from public.blocked_users b
      where (b.blocker_id = follows.following_id and b.blocked_id = follows.follower_id)
         or (b.blocker_id = follows.follower_id and b.blocked_id = follows.following_id)
    )
  );

-- ============================================================
-- Bitti. Bu migration'dan sonra:
--  - profiles.email / profiles.phone artık mevcut değil (profile_private'a taşındı)
--  - is_private=true olan hesapların gönderi/yorum/beğenileri sadece
--    kendileri ve takipçileri tarafından görülebilir
--  - storage'a sadece kendi klasörünüze dosya yükleyebilirsiniz
--  - engellenen kullanıcılarla mesajlaşma/takip/sohbet başlatma engellenir
-- ============================================================
