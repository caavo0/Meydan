import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Uygulama .env dosyası olmadan da açılsın diye burada throw etmiyoruz,
  // ama geliştiriciyi konsolda uyarıyoruz.
  console.error(
    "[Meydan] Supabase ortam değişkenleri eksik. Proje kök dizininde bir " +
      ".env dosyası oluşturup VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY " +
      "değerlerini doldurun (bkz. .env.example)."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Debug amaçlı: tarayıcı konsolundan `supabase.auth.getSession()` gibi
// komutlar çalıştırabilmek için global scope'a bağlıyoruz. Bu sadece
// geliştirme/hata ayıklama kolaylığı sağlar, güvenlik açığı oluşturmaz
// (anon key zaten public'tir, yalnızca RLS politikaları gerçek korumadır).
if (typeof window !== "undefined") {
  window.supabase = supabase;
}

// Bazı ortamlarda (özellikle geliştirme sırasında modülün yeniden
// yüklenmesi ya da sekme uzun süre aktif kalıp autoRefreshToken
// zamanlayıcısının beklenmedik şekilde tetiklenmemesi durumunda) elde
// süresi dolmuş bir access_token kalabiliyor. Kritik bir yazma işleminden
// (mesaj gönderme, sohbet açma vb.) hemen önce bu fonksiyonu çağırarak
// token'ın gerçekten geçerli olduğundan emin oluyoruz — pasif zamanlayıcıya
// güvenmek yerine aktif/garantili bir kontrol.
export async function ensureFreshSession() {
  try {
    const { data } = await supabase.auth.getSession();
    const session = data?.session;
    if (!session) return null;
    const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
    if (!expiresAt || expiresAt - Date.now() < 5 * 60 * 1000) {
      const { data: refreshed, error } = await supabase.auth.refreshSession();
      if (error) {
        console.error("[Meydan] Oturum tazelenemedi:", error);
        return session;
      }
      return refreshed.session;
    }
    return session;
  } catch (err) {
    console.error("[Meydan] Oturum kontrol edilemedi:", err);
    return null;
  }
}
