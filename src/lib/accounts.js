// Cihazda birden fazla Meydan hesabı arasında geçiş yapabilmek için
// oturum (access_token/refresh_token) bilgilerini localStorage'da saklar.
// Not: Bu bilgiler zaten Supabase'in kendi persistSession mekanizmasının
// sakladığı verilerle aynı hassasiyette — sadece cihaz üzerinde, tek
// kullanıcının kendi tarayıcısında tutulur.

const STORAGE_KEY = "meydan_accounts_v1";

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(accounts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}

export function getSavedAccounts() {
  return readAll();
}

// Giriş yapıldığında / oturum yenilendiğinde o hesabı listeye ekler ya da günceller.
export function saveAccountSession(profile, session) {
  if (!profile?.id || !session?.access_token || !session?.refresh_token) return;
  const accounts = readAll();
  const idx = accounts.findIndex((a) => a.id === profile.id);
  const entry = {
    id: profile.id,
    username: profile.username,
    avatar_url: profile.avatar_url || null,
    email: profile.email || session.user?.email || "",
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  };
  if (idx >= 0) accounts[idx] = entry;
  else accounts.push(entry);
  writeAll(accounts);
}

export function removeAccount(userId) {
  writeAll(readAll().filter((a) => a.id !== userId));
}

export function getAccount(userId) {
  return readAll().find((a) => a.id === userId) || null;
}
