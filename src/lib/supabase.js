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
