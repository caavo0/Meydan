# Meydan

"Herkesin buluştuğu meydan" — gece lacivert + çini mavisi + pirinç/bakır
temalı, Instagram tarzı bir sosyal ağ. React 19 + Vite + Tailwind CSS +
**Supabase** (Auth, Postgres Database, Storage, Realtime) ile yazılmıştır.

Bu proje artık **hiçbir yerel depolama (localStorage / window.storage)
kullanmıyor.** Tüm veriler gerçek bir Supabase projesinde saklanır.

## Özellikler

- **Auth:** e-posta + şifre ile kayıt/giriş, çıkış, oturum kalıcılığı
  (sayfa yenilense bile giriş açık kalır)
- **Gönderiler:** fotoğraf Supabase Storage'a gerçek dosya olarak yüklenir,
  açıklama ile birlikte veritabanına kaydedilir
- **Beğeni:** her kullanıcı bir gönderiyi yalnızca 1 kez beğenebilir,
  tekrar basınca kaldırılır, sayaç gerçek veriden gelir
- **Profil:** profil resmi, kullanıcı adı, bio, gönderi sayısı ve tüm
  gönderiler — hepsi veritabanından
- **Keşfet:** tüm kullanıcılar ve gönderiler, arama, realtime güncelleme
- **Mesajlaşma:** Supabase Realtime ile anlık mesajlaşma, sayfa
  yenilenince sohbet kaybolmaz
- **Realtime:** yeni kullanıcı, yeni gönderi, yeni beğeni, yeni mesaj
  anında ekrana yansır
- **RLS (Row Level Security):** her tabloda etkin; kullanıcılar sadece
  kendi verilerini değiştirebilir, herkes gönderileri ve kullanıcıları
  görebilir

---

## Kurulum — adım adım

### 1) Supabase hesabı oluştur

[supabase.com](https://supabase.com) adresine gidin, **Start your project**
ile ücretsiz bir hesap oluşturun (GitHub ile giriş yapabilirsiniz).

### 2) Yeni proje oluştur

Supabase Dashboard'da **New Project** tıklayın:

- Bir isim verin (örn. `meydan`)
- Güçlü bir veritabanı şifresi belirleyin (bunu not edin, tekrar
  gerekmeyecek ama kaybetmeyin)
- Size en yakın bölgeyi seçin
- **Create new project** — proje birkaç dakikada hazır olur

### 3) SQL şemasını çalıştır

1. Sol menüden **SQL Editor**'ı açın
2. **New query** tıklayın
3. Bu depodaki `supabase/schema.sql` dosyasının **tamamını** kopyalayıp
   yapıştırın
4. **Run** tıklayın

Bu tek işlem şunları oluşturur:
- `profiles`, `posts`, `likes`, `conversations`, `conversation_members`,
  `messages` tabloları
- Her tabloda RLS (Row Level Security) ve gerekli policy'ler
- Yeni kullanıcı kayıt olduğunda otomatik profil oluşturan trigger
- `images` adında herkese açık bir Storage bucket'ı ve onun policy'leri
- Realtime yayını için gerekli tablo abonelikleri

> Bucket'ı ayrıca elle oluşturmanıza gerek yok — SQL script bunu sizin
> için yapıyor. Yine de Dashboard'da **Storage** sekmesinden `images`
> bucket'ının oluştuğunu görebilirsiniz.

### 4) E-posta onayını kapatın (önerilir)

Varsayılan olarak Supabase, kayıt sonrası e-posta onayı isteyebilir; bu
durumda kullanıcı kayıt olur olmaz otomatik giriş yapamaz. Geliştirme
sırasında bunu kapatmak için:

**Authentication → Providers → Email** içinde **Confirm email**
seçeneğini kapatın (Disable).

(Prodüksiyonda gerçek e-posta onayı istiyorsanız açık bırakabilirsiniz;
bu durumda kullanıcı kayıt sonrası gelen e-postadaki linke tıklamadan
giriş yapamaz.)

### 5) API anahtarlarını al

**Project Settings → API** sayfasına gidin ve şu iki değeri kopyalayın:

- **Project URL** (`https://xxxxx.supabase.co`)
- **anon public** key (uzun bir JWT string)

### 6) `.env` dosyasını doldurun

Proje kök dizininde `.env.example` dosyasını kopyalayıp `.env` olarak
kaydedin, sonra az önce aldığınız değerleri yapıştırın:

```bash
cp .env.example .env
```

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

`.env` dosyası `.gitignore` içinde olduğu için GitHub'a yüklenmez.

### 7) Bağımlılıkları kurun

```bash
npm install
```

### 8) Geliştirme sunucusunu başlatın

```bash
npm run dev
```

Tarayıcıda `http://localhost:5173` adresini açın. Kayıt olup uygulamayı
deneyebilirsiniz.

### 9) Vercel'e deploy edin

1. Projeyi GitHub'a push edin
2. [vercel.com](https://vercel.com)'da **Add New → Project** ile
   deponuzu import edin
3. Vercel, Vite projesini otomatik algılar (Build Command:
   `npm run build`, Output Directory: `dist`) — **hiçbir ayarı
   değiştirmenize gerek yok**
4. **Environment Variables** kısmına şunları ekleyin:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. **Deploy** — proje sadece bu iki değişkenle sorunsuz çalışır

---

## Proje yapısı

```
Meydan/
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── index.html
├── .env.example
├── .gitignore
├── README.md
├── supabase/
│   └── schema.sql          # tablolar, RLS policy'leri, trigger, storage bucket
├── src/
│   ├── App.jsx              # tüm UI bileşenleri (tasarım korunmuştur)
│   ├── main.jsx
│   ├── index.css
│   └── lib/
│       ├── supabase.js      # Supabase client
│       └── api.js           # auth / database / storage / chat fonksiyonları
└── public/
    └── favicon.svg
```

## Veri modeli

| Tablo                  | Açıklama                                              |
|-------------------------|--------------------------------------------------------|
| `profiles`              | `id` (auth.users ile aynı), `username`, `email`, `bio`, `avatar_url` |
| `posts`                 | `user_id`, `image_url` (Storage'daki public URL), `caption` |
| `likes`                 | `post_id`, `user_id` — `(post_id, user_id)` unique, tekrar beğeniyi engeller |
| `conversations`         | Boş bir "sohbet odası" kaydı                          |
| `conversation_members`  | Bir sohbetteki katılımcılar                           |
| `messages`               | `conversation_id`, `sender_id`, `text`                |

## Güvenlik (RLS)

Tüm tablolarda Row Level Security etkindir (`supabase/schema.sql` içinde
tanımlıdır):

- **Herkes** (giriş yapmış herhangi bir kullanıcı) gönderileri,
  profilleri ve beğenileri görebilir.
- Kullanıcı **sadece kendi profilini** güncelleyebilir.
- Kullanıcı **sadece kendi gönderisini** silebilir.
- Kullanıcı **sadece kendi mesajını**, sadece üyesi olduğu bir
  konuşmaya gönderebilir.
- Mesajlar ve konuşma üyelikleri **sadece o konuşmanın üyeleri**
  tarafından görülebilir.
- Storage'daki `images` bucket'ı herkese açık okunur; yükleme sadece
  giriş yapmış kullanıcılara, silme sadece dosyanın sahibine açıktır.

## Notlar

- Profil resmi yükleme arayüzü bu sürümde yok (yalnızca gönderi
  fotoğrafı yükleme isteniyordu); `avatar_url` alanı veritabanında
  hazır bekliyor, isterseniz `profiles` tablosunu Supabase Table
  Editor'dan elle güncelleyip test edebilirsiniz.
- "Profili düzenle" butonu tasarımda mevcut ama orijinal projede de
  işlevsizdi; bu sürümde de aynı şekilde bırakıldı ki tasarım ve
  bileşen yapısı bozulmasın.
