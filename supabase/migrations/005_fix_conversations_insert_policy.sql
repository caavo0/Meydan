-- ============================================================
-- MEYDAN — Migration 005: conversations RLS düzeltmesi
-- ============================================================
-- "new row violates row-level security policy for table
-- conversations" hatası, conversations tablosunda insert için
-- policy bulunmadığında ya da isim çakışması / önceki elle yapılan
-- değişikliklerle bozulduğunda oluşur. Bu migration policy'leri adı
-- ne olursa olsun temizleyip sıfırdan, doğru haliyle kurar.
-- Supabase Dashboard > SQL Editor'de tek seferde çalıştırın.
-- ============================================================

alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;

-- ------------------------------------------------------------
-- conversations tablosundaki TÜM mevcut policy'leri temizle
-- ------------------------------------------------------------
do $$
declare
  pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'conversations'
  loop
    execute format('drop policy if exists %I on public.conversations', pol.policyname);
  end loop;

  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'conversation_members'
  loop
    execute format('drop policy if exists %I on public.conversation_members', pol.policyname);
  end loop;
end $$;

-- ------------------------------------------------------------
-- is_conversation_member helper fonksiyonu (yoksa oluştur)
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

-- ------------------------------------------------------------
-- conversations policy'leri
-- ------------------------------------------------------------
create policy "conversations_select_members"
  on public.conversations for select
  using (public.is_conversation_member(id, auth.uid()));

create policy "conversations_insert_authenticated"
  on public.conversations for insert
  with check (auth.uid() is not null);

-- ------------------------------------------------------------
-- conversation_members policy'leri
-- ------------------------------------------------------------
create policy "conversation_members_select_members"
  on public.conversation_members for select
  using (public.is_conversation_member(conversation_id, auth.uid()));

create policy "conversation_members_insert_authenticated"
  on public.conversation_members for insert
  with check (auth.uid() is not null);

-- ============================================================
-- Bitti. Artık giriş yapmış herhangi bir kullanıcı yeni bir
-- konuşma + üyelik satırı oluşturabilir; okuma ise sadece o
-- konuşmanın üyeleriyle sınırlı kalır.
-- ============================================================
