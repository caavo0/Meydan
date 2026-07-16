# Meydan

"Herkesin buluştuğu meydan" — gece lacivert + çini mavisi + pirinç/bakır temalı,
Instagram tarzı bir sosyal ağ prototipi. React 19 + Vite + Tailwind CSS ile
yazılmıştır.

## Depolama hakkında

Bu proje tamamen **tarayıcının `localStorage` API'si** üzerinde çalışır.
Herhangi bir sunucu, veritabanı veya `window.storage` bağımlılığı yoktur.

- Kullanıcılar, gönderiler, sohbetler ve oturum bilgisi tarayıcının
  `localStorage`'ında saklanır.
- Veriler yalnızca **aynı tarayıcı / aynı cihazda** kalıcıdır. Farklı bir
  tarayıcıda veya gizli sekmede açtığınızda veriler görünmez.
- Şifreler düz metin olarak saklanır. Bu bir **prototiptir**, gerçek bir
  ürün için ayrı, güvenli bir backend (kimlik doğrulama, şifre hash'leme,
  gerçek bir veritabanı) gereklidir.

## Kurulum

```bash
npm install
npm run dev
```

Tarayıcıda `http://localhost:5173` adresini açın.

## Production build

```bash
npm run build
npm run preview
```

## Vercel'e deploy

Bu proje standart bir Vite projesi olduğu için Vercel'e doğrudan deploy
edilebilir:

1. Depoyu GitHub'a push edin.
2. Vercel'de "New Project" ile depoyu import edin.
3. Framework preset olarak **Vite** otomatik algılanır.
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Deploy edin.

## Özellikler

- Giriş yap / Kayıt ol (localStorage tabanlı)
- Oturum kalıcılığı (sayfa yenilense de oturum açık kalır)
- Gönderi paylaşma (fotoğraf + açıklama)
- Fotoğraf yükleme (base64 olarak localStorage'da saklanır)
- Beğen sistemi
- Profil sayfası (kendi gönderileriniz)
- Keşfet (gönderi ve kullanıcı arama)
- Kullanıcılar arası mesajlaşma (sohbet listesi + mesaj gönderme)

## Proje yapısı

```
Meydan/
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── index.html
├── .gitignore
├── README.md
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
└── public/
    └── favicon.svg
```
