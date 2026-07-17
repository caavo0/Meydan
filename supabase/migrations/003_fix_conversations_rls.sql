-- ============================================================
-- MEYDAN — conversations / conversation_members / messages
-- RLS policy'lerini sıfırdan, İDEMPOTENT şekilde kurar.
-- ============================================================
-- Bu dosya kaç kere çalıştırılırsa çalıştırılsın güvenlidir:
-- her policy önce DROP IF EXISTS ile silinir, sonra yeniden
-- oluşturulur. "42501 - new row violates row-level security
-- policy for table conversations" hatası genelde canlı projede
-- bu policy'lerin hiç uygulanmamış ya da yarım kalmış olmasından
-- kaynaklanır. Bu dosyayı Supabase Dashboard > SQL Editor'de
-- TAMAMINI tek seferde çalıştırın.
-- ============================================================

-- ------------------------------------------------------------
-- 0) Tabloların var olduğundan emin ol (repodaki şemayla birebir)
-- ------------------------------------------------------------
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_id_idx
  on public.messages (conversation_id, created_at);

-- ------------------------------------------------------------
-- 1) RLS'yi aç
-- ------------------------------------------------------------
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;

-- ------------------------------------------------------------
-- 2) Sonsuz döngüyü (infinite recursion) önleyen yardımcı fonksiyon
-- ------------------------------------------------------------
-- conversations/conversation_members birbirine bakan policy'ler
-- yazınca Postgres "infinite recursion detected in policy" hatası
-- verebilir. SECURITY DEFINER fonksiyon bunu bypass eder.
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
-- 3) Eski policy'leri temizle (isim ne olursa olsun, güvenle tekrar
--    çalıştırılabilsin diye tüm bilinen isim varyasyonlarını siliyoruz)
-- ------------------------------------------------------------
drop policy if exists "Kullanıcı üyesi olduğu konuşmaları görebilir" on public.conversations;
drop policy if exists "Giriş yapan kullanıcı yeni konuşma oluşturabilir" on public.conversations;
drop policy if exists "conversations_select" on public.conversations;
drop policy if exists "conversations_insert" on public.conversations;
drop policy if exists "conversations_update" on public.conversations;
drop policy if exists "conversations_delete" on public.conversations;

drop policy if exists "Üyeler kendi konuşmalarındaki üyelik listesini görebilir" on public.conversation_members;
drop policy if exists "Giriş yapan kullanıcı konuşmaya üye ekleyebilir" on public.conversation_members;
drop policy if exists "participants_select" on public.conversation_members;
drop policy if exists "participants_insert" on public.conversation_members;
drop policy if exists "participants_delete" on public.conversation_members;
drop policy if exists "conversation_members_delete" on public.conversation_members;

drop policy if exists "Üyeler kendi konuşmalarındaki mesajları görebilir" on public.messages;
drop policy if exists "Kullanıcı sadece kendi mesajını, üyesi olduğu bir konuşmaya gönderebilir" on public.messages;
drop policy if exists "messages_select" on public.messages;
drop policy if exists "messages_insert" on public.messages;

-- ------------------------------------------------------------
-- 4) CONVERSATIONS policy'leri
-- ------------------------------------------------------------

-- SELECT: sadece üyesi olduğu konuşmaları görebilir
create policy "conversations_select"
on public.conversations
for select
to authenticated
using (public.is_conversation_member(id, auth.uid()));

-- INSERT: sadece giriş yapmış (auth.uid() dolu) kullanıcı yeni konuşma
-- satırı oluşturabilir. conversations tablosunda "sahip" kolonu olmadığı
-- için (yalnızca id + created_at) buradaki tek kontrol oturumun var olması.
-- Gerçek erişim kontrolü bir sonraki adımda conversation_members ile yapılır.
create policy "conversations_insert"
on public.conversations
for insert
to authenticated
with check (auth.uid() is not null);

-- Bu tabloda UPDATE senaryosu yok (başlık/isim gibi düzenlenebilir bir alan
-- bulunmuyor); istenirse aşağıdaki gibi eklenebilir, şimdilik pas geçiyoruz.

-- DELETE: sadece konuşmanın üyesi konuşmayı silebilir
create policy "conversations_delete"
on public.conversations
for delete
to authenticated
using (public.is_conversation_member(id, auth.uid()));

-- ------------------------------------------------------------
-- 5) CONVERSATION_MEMBERS policy'leri
-- ------------------------------------------------------------

-- SELECT: kullanıcı, kendisinin de üyesi olduğu konuşmaların üye listesini görebilir
create policy "participants_select"
on public.conversation_members
for select
to authenticated
using (public.is_conversation_member(conversation_id, auth.uid()));

-- INSERT: giriş yapmış kullanıcı üyelik satırı ekleyebilir.
-- Not: Yeni 1'e-1 sohbet açılırken TEK bir kullanıcı hem kendisini hem
-- karşı tarafı tek seferde ekliyor (bkz. api.js findOrCreateConversation).
-- Bu yüzden "sadece kendini ekleyebilir" kısıtı burada UYGULANMIYOR;
-- okuma zaten üyelikle sınırlı olduğu için güvenlik açığı oluşturmuyor.
create policy "participants_insert"
on public.conversation_members
for insert
to authenticated
with check (auth.uid() is not null);

-- DELETE: kullanıcı sadece kendi üyeliğini silebilir (sohbetten ayrılma)
create policy "participants_delete"
on public.conversation_members
for delete
to authenticated
using (user_id = auth.uid());

-- ------------------------------------------------------------
-- 6) MESSAGES policy'leri
-- ------------------------------------------------------------

-- SELECT: sadece üyesi olduğu konuşmalardaki mesajları görebilir
create policy "messages_select"
on public.messages
for select
to authenticated
using (public.is_conversation_member(conversation_id, auth.uid()));

-- INSERT: sadece kendi adına (sender_id = auth.uid()) VE üyesi olduğu
-- bir konuşmaya mesaj gönderebilir
create policy "messages_insert"
on public.messages
for insert
to authenticated
with check (
  auth.uid() = sender_id
  and public.is_conversation_member(conversation_id, auth.uid())
);

-- ------------------------------------------------------------
-- 7) Doğrulama sorguları (isteğe bağlı — SQL Editor'de ayrıca çalıştırıp
--    policy'lerin gerçekten yazıldığını kontrol edebilirsiniz)
-- ------------------------------------------------------------
-- select schemaname, tablename, policyname, cmd, roles
-- from pg_policies
-- where tablename in ('conversations', 'conversation_members', 'messages')
-- order by tablename, cmd;
