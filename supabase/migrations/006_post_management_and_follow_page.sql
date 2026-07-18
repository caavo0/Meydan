-- ============================================================
-- MEYDAN — 006: Gönderi yönetimi (düzenle / yorum aç-kapa /
-- sabitleme) + takipçi listesi sayfası için gerekli backend
-- değişiklikleri.
-- ============================================================
-- Bu dosyanın TAMAMINI Supabase Dashboard > SQL Editor içinde
-- tek seferde çalıştırın (New query > yapıştır > Run).
-- Önceki migration'lardan (001-005) SONRA çalıştırılmalıdır.
-- ============================================================

-- ------------------------------------------------------------
-- 1) POSTS — yeni kolonlar
-- ------------------------------------------------------------
alter table public.posts
  add column if not exists comments_enabled boolean not null default true;

alter table public.posts
  add column if not exists pinned boolean not null default false;

alter table public.posts
  add column if not exists pinned_at timestamptz;

-- Profil ızgarasında "sabitlenen gönderi en üstte" sıralaması ve
-- kullanıcı bazlı sorgular için index.
create index if not exists posts_user_pinned_created_idx
  on public.posts (user_id, pinned desc, created_at desc);

-- ------------------------------------------------------------
-- 2) POSTS — UPDATE RLS policy'si (şu ana kadar hiç yoktu)
-- ------------------------------------------------------------
-- Bir kullanıcı SADECE kendi gönderisini güncelleyebilir. Bu policy
-- caption / comments_enabled / pinned güncellemelerinin hepsini kapsar;
-- image_url, user_id gibi alanlar da teorik olarak güncellenebilir
-- durumda kalır ama React tarafı (src/lib/api.js updatePost) sadece
-- izin verilen 3 alanı gönderdiği için pratikte sorun oluşturmaz.
drop policy if exists "Kullanıcı sadece kendi gönderisini güncelleyebilir" on public.posts;
create policy "Kullanıcı sadece kendi gönderisini güncelleyebilir"
  on public.posts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 3) SABİTLEME TRIGGER'I — bir kullanıcının aynı anda sadece TEK
--    gönderisi sabitli olabilir. Yeni bir gönderi sabitlenince
--    aynı kullanıcının önceki sabitli gönderisi otomatik olarak
--    sabitlikten çıkar.
-- ------------------------------------------------------------
create or replace function public.enforce_single_pinned_post()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.pinned = true then
    new.pinned_at := now();
    update public.posts
      set pinned = false, pinned_at = null
      where user_id = new.user_id
        and id <> new.id
        and pinned = true;
  else
    new.pinned_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists on_post_pin_change on public.posts;
create trigger on_post_pin_change
  before insert or update of pinned on public.posts
  for each row execute procedure public.enforce_single_pinned_post();

-- ------------------------------------------------------------
-- 4) COMMENTS — yorum eklerken gönderi sahibinin yorumları kapatıp
--    kapatmadığını kontrol eden RLS policy'si (mevcut insert
--    policy'sinin yerine geçer).
-- ------------------------------------------------------------
drop policy if exists "Kullanıcı kendi yorumunu ekleyebilir" on public.comments;
create policy "Kullanıcı kendi yorumunu ekleyebilir"
  on public.comments for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.posts p
      where p.id = comments.post_id
        and p.comments_enabled = true
    )
  );

-- ------------------------------------------------------------
-- 5) REALTIME — posts tablosundaki UPDATE/DELETE olayları da
--    (düzenleme, sabitleme, silme) istemcilere anlık yansısın diye
--    publication'a ekli olduğundan emin ol. INSERT zaten 001'de
--    dolaylı olarak ekliydi ama publication ekleme idempotent değil,
--    bu yüzden var olup olmadığını kontrol edip ekliyoruz.
-- ------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'posts'
  ) then
    alter publication supabase_realtime add table public.posts;
  end if;
end $$;

-- follows tablosu 002 migration'ında zaten realtime publication'a
-- eklenmişti — takipçi/takip edilen tam sayfası bu sayede App.jsx'teki
-- global `follows` state'i üzerinden otomatik olarak canlı kalır,
-- ayrı bir subscription açmaya gerek yoktur.

-- ------------------------------------------------------------
-- 6) STORAGE — mevcut "images" bucket'ı fotoğraf + video için zaten
--    yeterli (bkz. 001_initial_schema.sql, bölüm 6). Kamera video
--    kayıtları da aynı bucket'a, aynı RLS policy'leriyle yükleniyor
--    (src/lib/api.js uploadPostMedia). Ek bir bucket gerekmiyor.
-- ------------------------------------------------------------
