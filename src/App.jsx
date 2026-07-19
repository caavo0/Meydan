import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Heart,
  MessageCircle,
  Send,
  Search,
  Home,
  PlusSquare,
  User,
  Compass,
  MoreHorizontal,
  ArrowLeft,
  ImagePlus,
  Grid3x3,
  Settings,
  Users,
  Loader2,
  UserPlus,
  UserCheck,
  X,
  Camera,
  RotateCcw,
  Image as ImageIcon,
  Play,
  Volume2,
  VolumeX,
  ChevronRight,
  ChevronDown,
  LogOut,
  Trash2,
  Shield,
  Bell,
  Lock,
  HelpCircle,
  Info,
  UserX,
  Phone,
  Mail,
  KeyRound,
  Check,
  Plus,
  UserPlus2,
  UsersRound,
  Pencil,
  MessageSquareOff,
  MessageSquare,
  Pin,
  PinOff,
  Zap,
  ZapOff,
  ZoomIn,
  SwitchCamera,
  Circle,
  Film,
  ChevronLeft,
  Music2,
} from "lucide-react";
import { supabase } from "./lib/supabase";
import * as api from "./lib/api";
import * as accountsStore from "./lib/accounts";

/* ------------------------------------------------------------------
   MEYDAN — "town square"
   Tasarım: gece lacivert zemin + çini mavisi + pirinç/bakır vurgu.
   Backend: Supabase (Auth + Postgres Database + Storage + Realtime).
   localStorage / window.storage tamamen kaldırıldı — tüm veri gerçek
   bir Supabase projesinde saklanıyor. Kurulum adımları için README.md
   ve supabase/schema.sql dosyalarına bakın.
------------------------------------------------------------------- */

const COLORS = {
  bg: "#0F1B2D",
  surface: "#16233A",
  surfaceAlt: "#1C2C46",
  border: "#28405F",
  ivory: "#F3EDE0",
  muted: "#8FA0B8",
  bronze: "#C98A3B",
  bronzeSoft: "#E4B36B",
  cini: "#2E7BA6",
};

/* -------------------------------- helpers --------------------------------- */

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const sec = Math.max(1, Math.floor(diffMs / 1000));
  if (sec < 60) return "az önce";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}dk`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}sa`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}g`;
  const week = Math.floor(day / 7);
  if (week < 5) return `${week}h`;
  const month = Math.floor(day / 30);
  if (month < 12) return `${month}ay`;
  return `${Math.floor(day / 365)}y`;
}

/* ------------------------------- tile motif ------------------------------ */

function TileMotif({ size = 18, className = "" }) {
  // Küçük çini-esintili baklava deseni — imza öge
  return (
    <div
      className={className}
      style={{
        width: "100%",
        height: size,
        backgroundImage: `repeating-linear-gradient(45deg, ${COLORS.bronze} 0 2px, transparent 2px 10px), repeating-linear-gradient(-45deg, ${COLORS.cini} 0 2px, transparent 2px 10px)`,
        opacity: 0.55,
      }}
    />
  );
}

function Logo({ size = "text-2xl" }) {
  return (
    <span
      className={`${size} font-bold tracking-tight`}
      style={{ color: COLORS.ivory, fontFamily: "Georgia, 'Times New Roman', serif" }}
    >
      Meydan
    </span>
  );
}

function Avatar({ name, size = 32, avatarUrl = null }) {
  const initial = name ? name[0].toUpperCase() : "?";
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        style={{ width: size, height: size, border: `1px solid ${COLORS.bronzeSoft}` }}
        className="rounded-full object-cover flex-shrink-0"
      />
    );
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${COLORS.bronze}, ${COLORS.cini})`,
        border: `1px solid ${COLORS.bronzeSoft}`,
      }}
      className="rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0"
    >
      <span style={{ fontSize: size * 0.4, fontFamily: "Georgia, serif" }}>{initial}</span>
    </div>
  );
}

// Bildirimler için Meydan'a özgü ikon: çini mavisi/pirinç çerçeveli, köşesinde
// ufak bir çini deseni olan madalyon — düz bir Bell ikonundan ayrışması için.
function NotifBadgeIcon({ size = 22, hasUnread = false, active = false }) {
  const ring = active ? COLORS.bronzeSoft : COLORS.border;
  return (
    <span
      className="relative inline-flex items-center justify-center rounded-full"
      style={{
        width: size + 14,
        height: size + 14,
        background: active ? `linear-gradient(135deg, ${COLORS.surfaceAlt}, ${COLORS.cini}22)` : COLORS.surfaceAlt,
        border: `1.5px solid ${ring}`,
      }}
    >
      <Bell
        size={size * 0.62}
        color={active ? COLORS.bronzeSoft : COLORS.ivory}
        strokeWidth={2.2}
        fill={active ? COLORS.bronzeSoft : "none"}
        fillOpacity={active ? 0.15 : 0}
      />
      <span
        className="absolute rounded-full"
        style={{
          width: 3,
          height: 3,
          top: 3,
          right: "50%",
          transform: "translateX(1.5px)",
          background: COLORS.bronze,
          opacity: 0.6,
        }}
      />
      {hasUnread && (
        <span
          className="absolute rounded-full animate-notif-pulse"
          style={{ width: 9, height: 9, top: -1, right: -1, background: "#E07A5F", border: `1.5px solid ${COLORS.bg}` }}
        />
      )}
    </span>
  );
}

function Spinner() {
  return <Loader2 size={22} className="animate-spin" style={{ color: COLORS.bronze }} />;
}

/* ------------------------------- skeletons -------------------------------- */

function PostSkeleton() {
  return (
    <div className="rounded-lg mb-6 overflow-hidden animate-fade-slide-soft" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="skeleton rounded-full flex-shrink-0" style={{ width: 32, height: 32 }} />
        <div className="skeleton rounded" style={{ width: 96, height: 12 }} />
      </div>
      <div className="skeleton w-full aspect-square" />
      <div className="px-4 pt-3 pb-4 flex flex-col gap-2">
        <div className="flex items-center gap-4">
          <div className="skeleton rounded-full" style={{ width: 22, height: 22 }} />
          <div className="skeleton rounded-full" style={{ width: 22, height: 22 }} />
          <div className="skeleton rounded-full" style={{ width: 22, height: 22 }} />
        </div>
        <div className="skeleton rounded" style={{ width: "40%", height: 10 }} />
        <div className="skeleton rounded" style={{ width: "70%", height: 10 }} />
      </div>
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div>
      <PostSkeleton />
      <PostSkeleton />
    </div>
  );
}

function GridSkeleton({ count = 9 }) {
  return (
    <div className="grid grid-cols-3 gap-1">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton aspect-square" style={{ animationDelay: `${i * 0.04}s` }} />
      ))}
    </div>
  );
}

function ProfileHeaderSkeleton() {
  return (
    <div className="flex flex-col items-center gap-3 mb-6 animate-fade-slide-soft">
      <div className="skeleton rounded-full" style={{ width: 96, height: 96 }} />
      <div className="skeleton rounded" style={{ width: 140, height: 16 }} />
      <div className="flex gap-8">
        <div className="skeleton rounded" style={{ width: 48, height: 34 }} />
        <div className="skeleton rounded" style={{ width: 48, height: 34 }} />
        <div className="skeleton rounded" style={{ width: 48, height: 34 }} />
      </div>
    </div>
  );
}

/* ---------------------------- page transition ------------------------------ */

function PageTransition({ children, transitionKey }) {
  return (
    <div key={transitionKey} className="animate-fade-slide">
      {children}
    </div>
  );
}

/* -------------------------------- Auth ------------------------------------ */

function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const translateError = (err) => {
    const msg = err?.message || "";
    if (msg.includes("already registered") || msg.includes("already been registered")) {
      return "Bu e-posta zaten kayıtlı.";
    }
    if (msg.includes("duplicate key") && msg.includes("username")) {
      return "Bu kullanıcı adı zaten alınmış.";
    }
    if (msg.includes("Invalid login credentials")) {
      return "E-posta veya şifre hatalı.";
    }
    if (msg.includes("Password should be at least")) {
      return "Şifre en az 6 karakter olmalı.";
    }
    if (msg.includes("Email not confirmed")) {
      return "E-posta adresini onaylaman gerekiyor. Gelen kutunu kontrol et (veya Supabase projesinde e-posta onayını kapat).";
    }
    return msg || "Bir şeyler ters gitti, tekrar dene.";
  };

  const handleSubmit = async () => {
    setError("");
    if (!email.trim() || !password.trim()) return;
    setBusy(true);
    try {
      if (mode === "login") {
        await api.signIn({ email: email.trim().toLowerCase(), password });
        // onAuthStateChange App bileşeninde kullanıcıyı yükleyecek
      } else {
        if (!username.trim()) {
          setError("Bir kullanıcı adı seç.");
          setBusy(false);
          return;
        }
        await api.signUp({
          email: email.trim().toLowerCase(),
          password,
          username: username.trim(),
        });
      }
      onLogin();
    } catch (err) {
      setError(translateError(err));
    }
    setBusy(false);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center" style={{ background: COLORS.bg }}>
      <div className="w-full max-w-sm px-6">
        <div
          className="rounded-lg p-8 flex flex-col items-center"
          style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}
        >
          <TileMotif className="rounded-t-md -mt-8 mb-6" />
          <div className="mb-1 mt-2">
            <Logo />
          </div>
          <p className="text-xs mb-7" style={{ color: COLORS.muted }}>
            herkesin buluştuğu meydan
          </p>

          <div className="w-full flex flex-col gap-2">
            <input
              type="email"
              placeholder="E-posta"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full text-sm px-3 py-2.5 rounded-md focus:outline-none"
              style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ivory }}
            />
            {mode === "signup" && (
              <input
                type="text"
                placeholder="Kullanıcı adı"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full text-sm px-3 py-2.5 rounded-md focus:outline-none"
                style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ivory }}
              />
            )}
            <input
              type="password"
              placeholder="Şifre"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="w-full text-sm px-3 py-2.5 rounded-md focus:outline-none"
              style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ivory }}
            />
            {error && (
              <p className="text-xs" style={{ color: "#E07A5F" }}>
                {error}
              </p>
            )}
            <button
              onClick={handleSubmit}
              disabled={!email.trim() || !password.trim() || busy}
              className="w-full mt-2 text-sm font-semibold py-2.5 rounded-md transition-opacity disabled:opacity-40 flex items-center justify-center gap-2 press-scale"
              style={{ background: `linear-gradient(90deg, ${COLORS.bronze}, ${COLORS.bronzeSoft})`, color: "#241608" }}
            >
              {busy && <Spinner />}
              {mode === "login" ? "Giriş yap" : "Hesap oluştur"}
            </button>
          </div>
        </div>

        <div
          className="rounded-lg mt-3 p-5 text-center"
          style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}
        >
          <span className="text-sm" style={{ color: COLORS.muted }}>
            {mode === "login" ? "Hesabın yok mu?" : "Zaten hesabın var mı?"}{" "}
          </span>
          <button
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setError("");
            }}
            className="text-sm font-semibold hover:underline"
            style={{ color: COLORS.bronzeSoft }}
          >
            {mode === "login" ? "Kaydol" : "Giriş yap"}
          </button>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: COLORS.muted }}>
          Veriler Supabase üzerinde, gerçek bir veritabanında saklanır.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------ Navigation --------------------------------- */

function Sidebar({ active, setActive, onLogout, user }) {
  const items = [
    { key: "feed", label: "Akış", icon: Home },
    { key: "discover", label: "Keşfet", icon: Compass },
    { key: "new", label: "Oluştur", icon: PlusSquare },
    { key: "reels", label: "Kısalar", icon: Film },
    { key: "profile", label: "Profil", icon: User },
  ];
  return (
    <div
      className="hidden md:flex flex-col w-64 h-screen sticky top-0 px-4 py-6 justify-between"
      style={{ background: COLORS.bg, borderRight: `1px solid ${COLORS.border}` }}
    >
      <div>
        <div className="px-2 mb-2">
          <Logo />
        </div>
        <TileMotif size={6} className="mb-6 rounded-full" />
        <nav className="flex flex-col gap-1">
          {items.map(({ key, label, icon: Icon }) => {
            const isActive = active === key;
            return (
              <button
                key={key}
                onClick={() => setActive(key)}
                className="flex items-center gap-4 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 press-scale"
                style={{
                  color: isActive ? COLORS.ivory : COLORS.muted,
                  background: isActive ? COLORS.surfaceAlt : "transparent",
                  fontWeight: isActive ? 700 : 500,
                }}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} color={isActive ? COLORS.bronzeSoft : COLORS.muted} className="transition-transform duration-200" style={isActive ? { transform: "scale(1.08)" } : undefined} />
                {label}
              </button>
            );
          })}
        </nav>
      </div>
      <div>
        <button
          onClick={() => setActive("profile")}
          className="flex items-center gap-3 px-3 py-2 rounded-lg mb-1 w-full press-scale"
          style={{ background: "transparent" }}
        >
          <Avatar name={user.username} size={28} avatarUrl={user.avatar_url} />
          <span className="text-sm font-medium truncate" style={{ color: COLORS.ivory }}>
            {user.username}
          </span>
        </button>
        <button onClick={onLogout} className="text-sm px-3 py-2 text-left w-full press-scale" style={{ color: COLORS.muted }}>
          Çıkış yap
        </button>
      </div>
    </div>
  );
}

function MobileNav({ active, setActive }) {
  const items = [
    { key: "feed", icon: Home },
    { key: "discover", icon: Compass },
    { key: "new", icon: PlusSquare },
    { key: "reels", icon: Film },
    { key: "profile", icon: User },
  ];
  return (
    <div
      className="md:hidden fixed bottom-0 left-0 right-0 flex justify-around py-3 z-10 glass-strong"
      style={{ borderTop: `1px solid ${COLORS.border}` }}
    >
      {items.map(({ key, icon: Icon }) => (
        <button key={key} onClick={() => setActive(key)} className="press-scale p-1.5">
          <Icon
            size={22}
            strokeWidth={active === key ? 2.5 : 2}
            color={active === key ? COLORS.bronzeSoft : COLORS.muted}
            className="transition-transform duration-200"
            style={active === key ? { transform: "scale(1.15)" } : undefined}
          />
        </button>
      ))}
    </div>
  );
}

function TopBar({ active, setActive, hasUnreadNotifs, unreadMessages }) {
  return (
    <div
      className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 glass-strong"
      style={{ borderBottom: `1px solid ${COLORS.border}` }}
    >
      <div className="flex items-center gap-2">
        <Logo size="text-xl" />
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setActive("messages")}
          className="relative p-1.5 press-scale"
          aria-label="Mesajlar"
        >
          <Send size={22} color={active === "messages" ? COLORS.bronzeSoft : COLORS.ivory} />
          {unreadMessages && (
            <span
              className="absolute rounded-full"
              style={{ width: 8, height: 8, top: 2, right: 2, background: "#E07A5F", border: `1.5px solid ${COLORS.bg}` }}
            />
          )}
        </button>
        <button onClick={() => setActive("notifications")} className="press-scale" aria-label="Bildirimler">
          <NotifBadgeIcon hasUnread={hasUnreadNotifs} active={active === "notifications"} />
        </button>
      </div>
    </div>
  );
}

/* --------------------------------- Post ------------------------------------ */

function PostMenu({ isOwn, post, onClose, onDelete, onStartEdit, onToggleComments, onTogglePin }) {
  return (
    <div className="absolute right-3 top-11 z-20 w-52 rounded-md overflow-hidden shadow-lg animate-fade-slide-soft" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}` }}>
      {isOwn ? (
        <>
          <button
            onClick={() => {
              onStartEdit();
              onClose();
            }}
            className="w-full flex items-center gap-2.5 text-left text-sm px-4 py-2.5 press-scale"
            style={{ color: COLORS.ivory }}
          >
            <Pencil size={15} />
            Düzenle / Açıklamayı değiştir
          </button>
          <button
            onClick={() => {
              onToggleComments();
              onClose();
            }}
            className="w-full flex items-center gap-2.5 text-left text-sm px-4 py-2.5 press-scale"
            style={{ color: COLORS.ivory, borderTop: `1px solid ${COLORS.border}` }}
          >
            {post.commentsEnabled === false ? <MessageSquare size={15} /> : <MessageSquareOff size={15} />}
            {post.commentsEnabled === false ? "Yorumları aç" : "Yorumları kapat"}
          </button>
          <button
            onClick={() => {
              onTogglePin();
              onClose();
            }}
            className="w-full flex items-center gap-2.5 text-left text-sm px-4 py-2.5 press-scale"
            style={{ color: COLORS.ivory, borderTop: `1px solid ${COLORS.border}` }}
          >
            {post.pinned ? <PinOff size={15} /> : <Pin size={15} />}
            {post.pinned ? "Sabitlemeyi kaldır" : "Gönderiyi sabitle"}
          </button>
          <button
            onClick={() => {
              onDelete();
              onClose();
            }}
            className="w-full flex items-center gap-2.5 text-left text-sm px-4 py-2.5 press-scale"
            style={{ color: "#E07A5F", borderTop: `1px solid ${COLORS.border}` }}
          >
            <Trash2 size={15} />
            Gönderiyi sil
          </button>
        </>
      ) : (
        <button onClick={onClose} className="w-full text-left text-sm px-4 py-2.5" style={{ color: COLORS.ivory }}>
          Bildir
        </button>
      )}
      <button onClick={onClose} className="w-full text-left text-sm px-4 py-2.5" style={{ color: COLORS.muted, borderTop: `1px solid ${COLORS.border}` }}>
        İptal
      </button>
    </div>
  );
}

function Post({ post, currentUser, onToggleLike, onOpenProfile, onOpenComments, onDelete, onUpdatePost, commentCount }) {
  const liked = (post.likes || []).includes(currentUser.id);
  const [menuOpen, setMenuOpen] = useState(false);
  const [justLiked, setJustLiked] = useState(false);
  const [muted, setMuted] = useState(true);
  const [editingCaption, setEditingCaption] = useState(false);
  const [captionDraft, setCaptionDraft] = useState(post.caption || "");
  const [savingCaption, setSavingCaption] = useState(false);
  const isOwn = post.userId === currentUser.id;
  const isVideo = post.mediaType === "video";

  const saveCaption = async () => {
    setSavingCaption(true);
    try {
      await onUpdatePost(post.id, { caption: captionDraft.trim() });
      setEditingCaption(false);
    } catch (err) {
      console.error("Açıklama güncellenemedi", err);
    }
    setSavingCaption(false);
  };

  const handleToggleComments = () => {
    onUpdatePost(post.id, { comments_enabled: post.commentsEnabled === false }).catch((err) =>
      console.error("Yorum ayarı değiştirilemedi", err)
    );
  };

  const handleTogglePin = () => {
    onUpdatePost(post.id, { pinned: !post.pinned }).catch((err) => console.error("Sabitleme başarısız", err));
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}#post-${post.id}`;
    const shareData = {
      title: "Meydan",
      text: post.caption ? `${post.username}: ${post.caption}` : `${post.username} bir gönderi paylaştı`,
      url: shareUrl,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareUrl);
        alert("Gönderi bağlantısı kopyalandı.");
      }
    } catch {
      // kullanıcı paylaşımı iptal ettiyse sessizce geç
    }
  };

  const handleLikeClick = () => {
    if (!liked) {
      setJustLiked(true);
      setTimeout(() => setJustLiked(false), 320);
    }
    onToggleLike(post.id);
  };

  return (
    <div className="rounded-lg mb-6 overflow-hidden relative" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
      <div className="flex items-center justify-between px-4 py-3">
        <button className="flex items-center gap-3 press-scale" onClick={() => onOpenProfile(post.userId)}>
          <Avatar name={post.username} size={32} avatarUrl={post.avatarUrl} />
          <span className="text-sm font-semibold flex items-center gap-1.5" style={{ color: COLORS.ivory }}>
            {post.username}
            {post.pinned && <Pin size={12} color={COLORS.bronzeSoft} fill={COLORS.bronzeSoft} />}
          </span>
        </button>
        <button onClick={() => setMenuOpen((v) => !v)} className="press-scale">
          <MoreHorizontal size={20} color={COLORS.muted} />
        </button>
        {menuOpen && (
          <PostMenu
            isOwn={isOwn}
            post={post}
            onClose={() => setMenuOpen(false)}
            onDelete={() => onDelete(post.id)}
            onStartEdit={() => {
              setCaptionDraft(post.caption || "");
              setEditingCaption(true);
            }}
            onToggleComments={handleToggleComments}
            onTogglePin={handleTogglePin}
          />
        )}
      </div>
      {editingCaption && (
        <div className="px-4 pb-3 animate-fade-slide-soft">
          <textarea
            value={captionDraft}
            onChange={(e) => setCaptionDraft(e.target.value)}
            rows={2}
            autoFocus
            placeholder="Açıklama yaz..."
            className="w-full text-sm px-3 py-2 rounded-md resize-none focus:outline-none"
            style={{ background: COLORS.surfaceAlt, color: COLORS.ivory, border: `1px solid ${COLORS.border}` }}
          />
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={saveCaption}
              disabled={savingCaption}
              className="text-xs font-semibold px-4 py-1.5 rounded-md press-scale disabled:opacity-50"
              style={{ background: `linear-gradient(90deg, ${COLORS.bronze}, ${COLORS.bronzeSoft})`, color: "#241608" }}
            >
              {savingCaption ? "Kaydediliyor..." : "Kaydet"}
            </button>
            <button
              onClick={() => setEditingCaption(false)}
              className="text-xs font-medium px-4 py-1.5 rounded-md press-scale"
              style={{ border: `1px solid ${COLORS.border}`, color: COLORS.muted }}
            >
              Vazgeç
            </button>
          </div>
        </div>
      )}
      {post.image && (
        <div className="relative w-full aspect-square" style={{ background: "#000" }} onDoubleClick={handleLikeClick}>
          {isVideo ? (
            <>
              <video
                src={post.image}
                className="w-full h-full object-cover"
                autoPlay
                loop
                muted={muted}
                playsInline
                preload="metadata"
              />
              <button
                onClick={() => setMuted((m) => !m)}
                className="absolute bottom-3 right-3 p-2 rounded-full press-scale"
                style={{ background: "rgba(15,27,45,0.6)" }}
              >
                {muted ? <VolumeX size={15} color={COLORS.ivory} /> : <Volume2 size={15} color={COLORS.ivory} />}
              </button>
            </>
          ) : (
            <img src={post.image} alt="gönderi" className="w-full h-full object-cover" />
          )}
          {justLiked && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <Heart size={92} color="#E07A5F" fill="#E07A5F" className="animate-pop-in drop-shadow-lg" />
            </div>
          )}
        </div>
      )}
      <div className="px-4 pt-3 pb-4">
        <div className="flex items-center gap-4 mb-2">
          <button onClick={handleLikeClick} className="press-scale">
            <Heart size={22} color={liked ? "#E07A5F" : COLORS.ivory} fill={liked ? "#E07A5F" : "none"} className="transition-transform" />
          </button>
          {post.commentsEnabled !== false ? (
            <button onClick={() => onOpenComments(post)} className="press-scale">
              <MessageCircle size={22} color={COLORS.ivory} />
            </button>
          ) : (
            <MessageSquareOff size={20} color={COLORS.muted} />
          )}
          <button onClick={handleShare} className="press-scale">
            <Send size={20} color={COLORS.ivory} />
          </button>
        </div>
        <p className="text-sm font-semibold mb-1" style={{ color: COLORS.ivory }}>
          {(post.likes || []).length} beğenme
        </p>
        {!editingCaption && post.caption && (
          <p className="text-sm" style={{ color: COLORS.ivory }}>
            <span className="font-semibold mr-1">{post.username}</span>
            {post.caption}
          </p>
        )}
        {post.commentsEnabled === false ? (
          <p className="text-xs mt-1" style={{ color: COLORS.muted }}>
            Yorumlar kapalı
          </p>
        ) : (
          commentCount > 0 && (
            <button onClick={() => onOpenComments(post)} className="text-sm mt-1" style={{ color: COLORS.muted }}>
              {commentCount} yorumun tümünü gör
            </button>
          )
        )}
        <p className="text-[11px] mt-1 uppercase tracking-wide" style={{ color: COLORS.muted }}>
          {post.time}
        </p>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-3 px-6 text-center">
      <Icon size={38} strokeWidth={1.5} color={COLORS.muted} />
      <p className="text-sm font-semibold" style={{ color: COLORS.ivory }}>
        {title}
      </p>
      {subtitle && (
        <p className="text-xs" style={{ color: COLORS.muted }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

function Feed({ loading, posts, currentUser, onToggleLike, onOpenProfile, onOpenComments, onDelete, onUpdatePost }) {
  return (
    <div className="max-w-lg mx-auto py-6 px-4">
      {loading ? (
        <FeedSkeleton />
      ) : posts.length === 0 ? (
        <EmptyState icon={ImagePlus} title="Akışında henüz gönderi yok" subtitle={'"Oluştur" bölümünden ilk paylaşımını yap'} />
      ) : (
        posts.map((post, i) => (
          <div key={post.id} className="animate-fade-slide-soft" style={{ animationDelay: `${Math.min(i, 6) * 0.04}s` }}>
            <Post
              post={post}
              currentUser={currentUser}
              onToggleLike={onToggleLike}
              onOpenProfile={onOpenProfile}
              onOpenComments={onOpenComments}
              onDelete={onDelete}
              onUpdatePost={onUpdatePost}
              commentCount={post.commentCount || 0}
            />
          </div>
        ))
      )}
    </div>
  );
}

/* ------------------------------- Comments ----------------------------------- */

function CommentsModal({ post, currentUser, onClose, onCommentAdded }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.fetchComments(post.id);
      setComments(data);
    } catch (err) {
      console.error("Yorumlar yüklenemedi", err);
    }
    setLoading(false);
  }, [post.id]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    if (!draft.trim()) return;
    setSending(true);
    try {
      await api.addComment(post.id, currentUser.id, draft.trim());
      setDraft("");
      await load();
      onCommentAdded?.();
    } catch (err) {
      console.error("Yorum eklenemedi", err);
      if (err?.code === "42501" || err?.code === "PGRST301") {
        alert("Bu gönderinin sahibi yorumları kapatmış.");
      }
    }
    setSending(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center animate-scrim" style={{ background: "rgba(15,27,45,0.7)" }} onClick={onClose}>
      <div
        className="w-full md:max-w-md max-h-[80vh] flex flex-col rounded-t-2xl md:rounded-lg overflow-hidden animate-modal-rise glass-strong"
        style={{ border: `1px solid ${COLORS.border}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
          <span className="text-sm font-semibold" style={{ color: COLORS.ivory }}>
            Yorumlar
          </span>
          <button onClick={onClose} className="text-sm press-scale" style={{ color: COLORS.muted }}>
            Kapat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
          {loading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : comments.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: COLORS.muted }}>
              Henüz yorum yok. İlk yorumu sen yaz.
            </p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex items-start gap-3">
                <Avatar name={c.username} size={30} avatarUrl={c.avatarUrl} />
                <div>
                  <p className="text-sm" style={{ color: COLORS.ivory }}>
                    <span className="font-semibold mr-1">{c.username}</span>
                    {c.text}
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: COLORS.muted }}>
                    {c.time}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="px-4 py-3 flex items-center gap-2" style={{ borderTop: `1px solid ${COLORS.border}` }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Yorum yaz..."
            className="flex-1 text-sm px-4 py-2 rounded-full focus:outline-none"
            style={{ background: COLORS.surfaceAlt, color: COLORS.ivory }}
          />
          <button onClick={submit} disabled={!draft.trim() || sending} className="font-semibold text-sm px-2 disabled:opacity-30" style={{ color: COLORS.bronzeSoft }}>
            Gönder
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ Create post -------------------------------- */

const MAX_RECORD_SECONDS = 60;
const HOLD_THRESHOLD_MS = 320;

function CameraView({ onCapturePhoto, onCaptureVideo, onPickFromGallery, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const holdTimerRef = useRef(null);
  const tickRef = useRef(null);
  const fileInput = useRef(null);

  const [facingMode, setFacingMode] = useState("environment");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [flashOn, setFlashOn] = useState(false);
  const [flashSupported, setFlashSupported] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [zoomCaps, setZoomCaps] = useState(null); // { min, max, step } | null

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setError("");
    setFlashOn(false);
    setFlashSupported(false);
    setZoomCaps(null);
    setZoom(1);
    stopStream();

    (async () => {
      try {
        // Kamera + mikrofon izinlerini tarayıcıdan otomatik ister (izin
        // istemi getUserMedia çağrısıyla tetiklenir, ekstra bir adım gerekmez).
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1280 }, height: { ideal: 1280 } },
          audio: true,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          const videoEl = videoRef.current;
          videoEl.srcObject = stream;
          await videoEl.play().catch(() => {});
          // `play()` sözü yerine gelmesi, ilk karenin gerçekten ekrana çizildiği
          // anlamına gelmez — bazı cihazlarda (özellikle Android WebView) bu ikisi
          // arasında kısa bir boşluk olur ve kullanıcı o sırada çekim tuşuna basarsa
          // ekran anlık olarak siyah görünür. Gerçek ilk kare çizilene kadar bekleyip
          // ondan sonra "hazır" işaretlemek bu anlık siyah ekranı engeller.
          if (videoEl.readyState < 2) {
            await new Promise((resolve) => {
              const done = () => {
                videoEl.removeEventListener("loadeddata", done);
                resolve();
              };
              videoEl.addEventListener("loadeddata", done, { once: true });
              // güvenlik ağı: bir saniye içinde olay gelmezse yine de devam et
              setTimeout(done, 1000);
            });
          }
        }
        if (cancelled) return;
        // Flash (torch) ve zoom desteğini cihaz/tarayıcıdan kontrol et.
        // Her tarayıcı/cihaz desteklemez (özellikle iOS Safari) — desteklenmediğinde
        // ilgili kontrol arayüzde gösterilmez.
        try {
          const track = stream.getVideoTracks()[0];
          const caps = track.getCapabilities?.() || {};
          setFlashSupported(!!caps.torch);
          if (caps.zoom) {
            setZoomCaps({ min: caps.zoom.min ?? 1, max: caps.zoom.max ?? 1, step: caps.zoom.step ?? 0.1 });
            setZoom(track.getSettings?.().zoom || caps.zoom.min || 1);
          }
        } catch {
          // capabilities API'si yoksa sessizce geç
        }
        setReady(true);
      } catch (err) {
        console.error("Kamera açılamadı", err);
        setError("Kameraya erişilemedi. Lütfen tarayıcı izinlerini kontrol et ya da galeriden seç.");
      }
    })();

    return () => {
      cancelled = true;
      stopStream();
    };
  }, [facingMode, stopStream]);

  const toggleFlash = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track || !flashSupported) return;
    const next = !flashOn;
    try {
      await track.applyConstraints({ advanced: [{ torch: next }] });
      setFlashOn(next);
    } catch (err) {
      console.error("Flaş değiştirilemedi", err);
    }
  }, [flashOn, flashSupported]);

  const applyZoom = useCallback(
    async (value) => {
      const track = streamRef.current?.getVideoTracks()[0];
      if (!track || !zoomCaps) return;
      try {
        await track.applyConstraints({ advanced: [{ zoom: value }] });
        setZoom(value);
      } catch (err) {
        console.error("Yakınlaştırma uygulanamadı", err);
      }
    },
    [zoomCaps]
  );

  useEffect(() => () => clearInterval(tickRef.current), []);

  // Bazı tarayıcılarda (özellikle Android WebView) MediaRecorder aktifken ya da
  // sekme/uygulama arka plandan öne dönerken canlı önizleme kendiliğinden duruyor
  // ve tek kare siyah kalıyor. Kayıt başladığında ve sayfa yeniden görünür
  // olduğunda oynatmayı zorla yeniden tetikleyerek bunu önlüyoruz.
  useEffect(() => {
    const resume = () => {
      const v = videoRef.current;
      if (v && v.srcObject && v.paused) v.play().catch(() => {});
    };
    resume();
    document.addEventListener("visibilitychange", resume);
    return () => document.removeEventListener("visibilitychange", resume);
  }, [isRecording]);

  const takePhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const size = Math.min(video.videoWidth, video.videoHeight);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    const sx = (video.videoWidth - size) / 2;
    const sy = (video.videoHeight - size) / 2;
    ctx.translate(size, 0);
    ctx.scale(facingMode === "user" ? -1 : 1, 1);
    ctx.drawImage(video, sx, sy, size, size, facingMode === "user" ? 0 : 0, 0, size, size);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `meydan-${Date.now()}.jpg`, { type: "image/jpeg" });
        onCapturePhoto(file);
      },
      "image/jpeg",
      0.92
    );
  }, [facingMode, onCapturePhoto]);

  const startRecording = useCallback(() => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    let recorder;
    try {
      recorder = new MediaRecorder(streamRef.current, { mimeType: "video/webm;codecs=vp9,opus" });
    } catch {
      try {
        recorder = new MediaRecorder(streamRef.current);
      } catch (err) {
        console.error("MediaRecorder desteklenmiyor", err);
        return;
      }
    }
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "video/webm" });
      const ext = (recorder.mimeType || "video/webm").includes("mp4") ? "mp4" : "webm";
      const file = new File([blob], `meydan-${Date.now()}.${ext}`, { type: blob.type });
      onCaptureVideo(file);
    };
    recorderRef.current = recorder;
    recorder.start();
    setIsRecording(true);
    setSeconds(0);
    tickRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s + 1 >= MAX_RECORD_SECONDS) {
          stopRecording();
          return s;
        }
        return s + 1;
      });
    }, 1000);
  }, [onCaptureVideo]);

  const stopRecording = useCallback(() => {
    clearInterval(tickRef.current);
    setIsRecording(false);
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  }, []);

  const handlePointerDown = () => {
    if (!ready) return;
    holdTimerRef.current = setTimeout(() => {
      holdTimerRef.current = "recording";
      startRecording();
    }, HOLD_THRESHOLD_MS);
  };

  const handlePointerUp = () => {
    if (holdTimerRef.current === "recording") {
      stopRecording();
    } else if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      takePhoto();
    }
    holdTimerRef.current = null;
  };

  const handleGalleryFile = (e) => {
    const f = e.target.files?.[0];
    if (f) onPickFromGallery(f);
  };

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div className="fixed inset-0 z-50 flex flex-col animate-scrim" style={{ background: "#000" }}>
      <div className="flex items-center justify-between px-4 pt-4 pb-2 relative z-10">
        <button onClick={onClose} className="p-2 rounded-full press-scale glass">
          <X size={20} color="#fff" />
        </button>
        {isRecording && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: "rgba(224,122,95,0.9)" }}>
            <span className="w-2 h-2 rounded-full bg-white" />
            <span className="text-xs font-semibold text-white tabular-nums">
              {mm}:{ss}
            </span>
          </div>
        )}
        {flashSupported ? (
          <button onClick={toggleFlash} className="p-2 rounded-full press-scale glass" disabled={isRecording}>
            {flashOn ? <Zap size={20} color="#F4C95D" fill="#F4C95D" /> : <ZapOff size={20} color="#fff" />}
          </button>
        ) : (
          <div style={{ width: 36 }} />
        )}
      </div>

      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {error ? (
          <div className="flex flex-col items-center gap-3 px-8 text-center">
            <Camera size={40} strokeWidth={1.5} color={COLORS.muted} />
            <p className="text-sm" style={{ color: COLORS.ivory }}>
              {error}
            </p>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              webkit-playsinline="true"
              disablePictureInPicture
              muted
              className="w-full h-full object-cover"
              style={{
                transform: facingMode === "user" ? "scaleX(-1) translateZ(0)" : "translateZ(0)",
                WebkitTransform: facingMode === "user" ? "scaleX(-1) translateZ(0)" : "translateZ(0)",
                backfaceVisibility: "hidden",
              }}
            />
            {!ready && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Spinner />
              </div>
            )}
            {ready && zoomCaps && zoomCaps.max > zoomCaps.min && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-2 rounded-full glass">
                <ZoomIn size={14} color="#fff" />
                <input
                  type="range"
                  min={zoomCaps.min}
                  max={zoomCaps.max}
                  step={zoomCaps.step || 0.1}
                  value={zoom}
                  onChange={(e) => applyZoom(parseFloat(e.target.value))}
                  className="w-28 accent-[#E07A5F]"
                />
                <span className="text-[11px] text-white tabular-nums w-8">{zoom.toFixed(1)}x</span>
              </div>
            )}
          </>
        )}
      </div>

      <div className="relative z-10 flex items-center justify-between px-8 pb-10 pt-5">
        <button
          onClick={() => fileInput.current?.click()}
          className="p-3 rounded-xl press-scale glass flex flex-col items-center gap-1"
          aria-label="Galeriden seç"
        >
          <ImageIcon size={22} color="#fff" />
        </button>
        <input ref={fileInput} type="file" accept="image/*,video/*" onChange={handleGalleryFile} className="hidden" />

        <button
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={() => {
            if (holdTimerRef.current === "recording") stopRecording();
          }}
          disabled={!ready}
          className="rounded-full flex items-center justify-center press-scale disabled:opacity-40"
          style={{
            width: 84,
            height: 84,
            background: "transparent",
            border: `4px solid #fff`,
            padding: 5,
          }}
          aria-label="Başlat"
        >
          <span
            className={`rounded-full flex items-center justify-center transition-all duration-200 ${
              isRecording ? "animate-record-pulse" : ""
            }`}
            style={{
              width: isRecording ? 32 : "100%",
              height: isRecording ? 32 : "100%",
              borderRadius: isRecording ? 8 : 999,
              background: "#E07A5F",
            }}
          >
            {!isRecording && (
              <span className="text-[10px] font-bold tracking-wide text-white uppercase">Başlat</span>
            )}
          </span>
        </button>

        <button
          onClick={() => setFacingMode((m) => (m === "user" ? "environment" : "user"))}
          className="p-3 rounded-xl press-scale glass flex flex-col items-center gap-1"
          disabled={isRecording}
          aria-label="Kamera değiştir"
        >
          <SwitchCamera size={22} color="#fff" />
        </button>
      </div>
      <p className="text-center text-[11px] pb-4 -mt-6" style={{ color: "rgba(255,255,255,0.55)" }}>
        {isRecording ? "Bırakınca kaydı bitir" : "Fotoğraf için dokun, video için basılı tut"}
      </p>
    </div>
  );
}

function CreatePost({ user, onCreated, goTo }) {
  const [step, setStep] = useState("camera"); // camera | preview
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [mediaType, setMediaType] = useState("image");
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const galleryInput = useRef(null);

  const setCaptured = (selected, type) => {
    setFile(selected);
    setMediaType(type);
    setPreview(URL.createObjectURL(selected));
    setStep("preview");
  };

  const handleGalleryPick = (selected) => {
    if (!selected) return;
    const type = selected.type?.startsWith("video") ? "video" : "image";
    setCaptured(selected, type);
  };

  const handleShare = async () => {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const { url, mediaType: uploadedType } = await api.uploadPostMedia(user.id, file);
      await api.createPost({ userId: user.id, imageUrl: url, caption, mediaType: uploadedType });
      setPreview(null);
      setFile(null);
      setCaption("");
      await onCreated();
      goTo("feed");
    } catch (err) {
      setError(err?.message || "Gönderi paylaşılamadı, tekrar dene.");
    }
    setBusy(false);
  };

  const retake = () => {
    setPreview(null);
    setFile(null);
    setCaption("");
    setError("");
    setStep("camera");
  };

  if (step === "camera") {
    return (
      <CameraView
        onClose={() => goTo("feed")}
        onCapturePhoto={(f) => setCaptured(f, "image")}
        onCaptureVideo={(f) => setCaptured(f, "video")}
        onPickFromGallery={handleGalleryPick}
      />
    );
  }

  return (
    <div className="max-w-lg mx-auto py-6 px-4 animate-fade-slide">
      <div className="flex items-center justify-between mb-4">
        <button onClick={retake} className="flex items-center gap-1 text-sm press-scale" style={{ color: COLORS.muted }}>
          <ArrowLeft size={16} /> Yeniden çek
        </button>
        <h2 className="text-lg font-bold" style={{ color: COLORS.ivory, fontFamily: "Georgia, serif" }}>
          Paylaşıma hazırla
        </h2>
        <button
          onClick={handleShare}
          disabled={busy}
          className="text-sm font-semibold px-4 py-1.5 rounded-full disabled:opacity-40 flex items-center gap-2 press-scale"
          style={{ background: `linear-gradient(90deg, ${COLORS.bronze}, ${COLORS.bronzeSoft})`, color: "#241608" }}
        >
          {busy && <Spinner />}
          Paylaş
        </button>
      </div>

      <div className="rounded-lg overflow-hidden animate-pop-in" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
        <div className="relative w-full aspect-square" style={{ background: "#000" }}>
          {mediaType === "video" ? (
            <video src={preview} className="w-full h-full object-cover" controls loop playsInline preload="auto" />
          ) : (
            <img src={preview} alt="önizleme" className="w-full h-full object-cover" />
          )}
          <button
            onClick={() => galleryInput.current?.click()}
            className="absolute bottom-3 right-3 text-xs font-semibold px-3 py-1.5 rounded-full press-scale"
            style={{ background: "rgba(15,27,45,0.75)", color: COLORS.bronzeSoft, border: `1px solid ${COLORS.bronze}` }}
          >
            Değiştir
          </button>
          <input
            ref={galleryInput}
            type="file"
            accept="image/*,video/*"
            onChange={(e) => handleGalleryPick(e.target.files?.[0])}
            className="hidden"
          />
        </div>

        <div className="p-4 flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <Avatar name={user.username} size={32} avatarUrl={user.avatar_url} />
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Bir açıklama yaz..."
              rows={3}
              className="flex-1 text-sm px-3 py-2 rounded-md resize-none focus:outline-none"
              style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ivory }}
            />
          </div>
          {error && (
            <p className="text-xs" style={{ color: "#E07A5F" }}>
              {error}
            </p>
          )}
          <button
            onClick={handleShare}
            disabled={busy}
            className="w-full text-sm font-semibold py-2.5 rounded-md disabled:opacity-40 flex items-center justify-center gap-2 md:hidden press-scale"
            style={{ background: `linear-gradient(90deg, ${COLORS.bronze}, ${COLORS.bronzeSoft})`, color: "#241608" }}
          >
            {busy && <Spinner />}
            Paylaş
          </button>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------- Discover -------------------------------- */

function Discover({ posts, users, currentUser, follows, onToggleFollow, onOpenChat, onOpenProfile, onOpenReel }) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("posts"); // posts | users

  const q = query.trim().toLowerCase();
  const filteredPosts = posts.filter(
    (p) => !q || p.username.toLowerCase().includes(q) || (p.caption || "").toLowerCase().includes(q)
  );
  const filteredUsers = users.filter((u) => u.id !== currentUser.id && (!q || u.username.toLowerCase().includes(q)));

  return (
    <div className="max-w-3xl mx-auto py-6 px-4">
      <h2 className="text-lg font-bold mb-4" style={{ color: COLORS.ivory, fontFamily: "Georgia, serif" }}>
        Keşfet
      </h2>
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-md" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}` }}>
          <Search size={16} color={COLORS.muted} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Kullanıcı veya açıklama ara..."
            className="w-full text-sm bg-transparent focus:outline-none"
            style={{ color: COLORS.ivory }}
          />
        </div>
      </div>

      <div className="flex gap-1 mb-5 rounded-md p-1 w-fit" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
        {[
          { key: "posts", label: "Gönderiler", icon: Grid3x3 },
          { key: "users", label: "Kullanıcılar", icon: Users },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded press-scale transition-colors"
            style={{ background: tab === key ? COLORS.surfaceAlt : "transparent", color: tab === key ? COLORS.bronzeSoft : COLORS.muted }}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {tab === "posts" ? (
        filteredPosts.length === 0 ? (
          <EmptyState icon={Compass} title="Sonuç yok" subtitle="Farklı bir arama dene" />
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {filteredPosts.map((post) => (
              <button
                key={post.id}
                onClick={() => (post.mediaType === "video" ? onOpenReel(post) : onOpenProfile(post.userId))}
                className="aspect-square relative group overflow-hidden text-left press-scale"
                style={{ background: COLORS.surfaceAlt }}
              >
                {post.image &&
                  (post.mediaType === "video" ? (
                    <video src={post.image} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                  ) : (
                    <img src={post.image} alt="" className="w-full h-full object-cover" />
                  ))}
                {post.mediaType === "video" && (
                  <div className="absolute top-1.5 right-1.5">
                    <Play size={14} color="#fff" fill="#fff" />
                  </div>
                )}
                <div
                  className="absolute bottom-0 left-0 right-0 px-2 py-1 text-[10px]"
                  style={{ background: "rgba(15,27,45,0.75)", color: COLORS.ivory }}
                >
                  {post.username}
                </div>
              </button>
            ))}
          </div>
        )
      ) : filteredUsers.length === 0 ? (
        <EmptyState icon={Users} title="Kullanıcı bulunamadı" />
      ) : (
        <div className="flex flex-col gap-2">
          {filteredUsers.map((u) => {
            const isFollowing = follows.some((f) => f.follower_id === currentUser.id && f.following_id === u.id);
            return (
              <div key={u.id} className="flex items-center justify-between px-4 py-3 rounded-lg animate-fade-slide-soft" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
                <button className="flex items-center gap-3 press-scale" onClick={() => onOpenProfile(u.id)}>
                  <Avatar name={u.username} size={40} avatarUrl={u.avatar_url} />
                  <span className="text-sm font-medium" style={{ color: COLORS.ivory }}>
                    {u.username}
                  </span>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onToggleFollow(u.id, isFollowing)}
                    className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-md press-scale transition-colors"
                    style={
                      isFollowing
                        ? { background: COLORS.surfaceAlt, color: COLORS.muted, border: `1px solid ${COLORS.border}` }
                        : { background: `linear-gradient(90deg, ${COLORS.bronze}, ${COLORS.bronzeSoft})`, color: "#241608" }
                    }
                  >
                    {isFollowing ? <UserCheck size={13} /> : <UserPlus size={13} />}
                    {isFollowing ? "Takiptesin" : "Takip et"}
                  </button>
                  <button
                    onClick={() => onOpenChat(u)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-md press-scale"
                    style={{ border: `1px solid ${COLORS.bronze}`, color: COLORS.bronzeSoft }}
                  >
                    Mesaj
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* --------------------------------- Reels ------------------------------------ */
/* Instagram'ın "Reels"ine benzer bir tam ekran dikey kısa video akışı, ama
   Meydan'ın kendi diline çevrilmiş: sağdaki eylem çubuğu yuvarlak yerine
   çini motifli madalyonlar, altbilgi kartı camsı bir "meydan taşı" paneli,
   üstte klasik Instagram'daki gibi tab değil ince bir ilerleme çizgisi var. */

function ReelCard({ post, currentUser, onToggleLike, onOpenProfile, onOpenComments, isActive }) {
  const [muted, setMuted] = useState(true);
  const [justLiked, setJustLiked] = useState(false);
  const videoRef = useRef(null);
  const liked = (post.likes || []).includes(currentUser.id);
  const isFollowingSelf = post.userId === currentUser.id;

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isActive) {
      v.currentTime = 0;
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, [isActive]);

  const handleLikeClick = () => {
    if (!liked) {
      setJustLiked(true);
      setTimeout(() => setJustLiked(false), 320);
    }
    onToggleLike(post.id);
  };

  return (
    <div className="relative w-full h-full snap-start flex-shrink-0 overflow-hidden" style={{ background: "#000" }}>
      <video
        ref={videoRef}
        src={post.image}
        className="w-full h-full object-cover"
        loop
        muted={muted}
        playsInline
        preload="metadata"
        onDoubleClick={handleLikeClick}
        onClick={() => setMuted((m) => !m)}
      />

      {/* üstte ince ilerleme/aktiflik çizgisi — hikaye barından farklı, tek ve sabit */}
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: "rgba(255,255,255,0.15)" }}>
        <div className="h-full" style={{ width: isActive ? "100%" : "0%", background: COLORS.bronzeSoft, transition: "width 4s linear" }} />
      </div>

      {justLiked && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Heart size={100} color="#E07A5F" fill="#E07A5F" className="animate-pop-in drop-shadow-lg" />
        </div>
      )}

      {/* alt bilgi paneli — Meydan taşı deseni */}
      <div className="absolute left-0 right-0 bottom-0 px-4 pb-5 pt-14" style={{ background: "linear-gradient(to top, rgba(15,27,45,0.88), transparent)" }}>
        <TileMotif size={4} className="mb-2 rounded-full opacity-70" />
        <button className="flex items-center gap-2 press-scale mb-1.5" onClick={() => onOpenProfile(post.userId)}>
          <Avatar name={post.username} size={30} avatarUrl={post.avatarUrl} />
          <span className="text-sm font-semibold" style={{ color: COLORS.ivory }}>
            {isFollowingSelf ? "sen" : post.username}
          </span>
        </button>
        {post.caption && (
          <p className="text-sm max-w-[80%]" style={{ color: COLORS.ivory }}>
            {post.caption}
          </p>
        )}
        <div className="flex items-center gap-1.5 mt-2 text-[11px]" style={{ color: COLORS.muted }}>
          <Music2 size={12} />
          <span>orijinal ses</span>
        </div>
      </div>

      {/* sağ eylem çubuğu — madalyon şeklinde, düz ikon sütunu değil */}
      <div className="absolute right-3 bottom-24 flex flex-col items-center gap-5">
        <button onClick={handleLikeClick} className="flex flex-col items-center gap-1 press-scale">
          <span
            className="flex items-center justify-center rounded-full"
            style={{ width: 40, height: 40, background: "rgba(15,27,45,0.55)", border: `1.5px solid ${liked ? "#E07A5F" : COLORS.border}` }}
          >
            <Heart size={19} color={liked ? "#E07A5F" : "#fff"} fill={liked ? "#E07A5F" : "none"} />
          </span>
          <span className="text-[11px] font-semibold" style={{ color: "#fff" }}>
            {(post.likes || []).length}
          </span>
        </button>
        <button onClick={() => onOpenComments(post)} className="flex flex-col items-center gap-1 press-scale">
          <span
            className="flex items-center justify-center rounded-full"
            style={{ width: 40, height: 40, background: "rgba(15,27,45,0.55)", border: `1.5px solid ${COLORS.border}` }}
          >
            <MessageCircle size={18} color="#fff" />
          </span>
          <span className="text-[11px] font-semibold" style={{ color: "#fff" }}>
            {post.commentCount || 0}
          </span>
        </button>
        <button onClick={() => setMuted((m) => !m)} className="flex flex-col items-center gap-1 press-scale">
          <span
            className="flex items-center justify-center rounded-full"
            style={{ width: 40, height: 40, background: "rgba(15,27,45,0.55)", border: `1.5px solid ${COLORS.border}` }}
          >
            {muted ? <VolumeX size={17} color="#fff" /> : <Volume2 size={17} color="#fff" />}
          </span>
        </button>
      </div>
    </div>
  );
}

function Reels({ posts, currentUser, onToggleLike, onOpenProfile, onOpenComments }) {
  const reelPosts = useMemo(() => posts.filter((p) => p.mediaType === "video"), [posts]);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef(null);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollTop / el.clientHeight);
    setActiveIndex((prev) => (prev === idx ? prev : idx));
  }, []);

  if (reelPosts.length === 0) {
    return (
      <div className="h-[calc(100vh-64px)] md:h-screen flex items-center justify-center">
        <EmptyState icon={Film} title="Henüz kısa video yok" subtitle="Kamera ile video çekip paylaştığında burada akacak" />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="h-[calc(100vh-64px)] md:h-screen w-full overflow-y-scroll snap-y snap-mandatory animate-reels-slide"
      style={{ scrollbarWidth: "none" }}
    >
      {reelPosts.map((post, i) => (
        <div key={post.id} className="h-full w-full snap-start">
          <ReelCard
            post={post}
            currentUser={currentUser}
            onToggleLike={onToggleLike}
            onOpenProfile={onOpenProfile}
            onOpenComments={onOpenComments}
            isActive={i === activeIndex}
          />
        </div>
      ))}
    </div>
  );
}

/* ------------------------------ Reels Overlay -------------------------------- */
/* Keşfet'te ya da profilde bir videoya tıklandığında, kanala/gönderiye değil
   doğrudan o videoya — Kısalar akışındaki gibi tam ekran dikey bir izleyiciye —
   düşer. Sidebar/TopBar'dan bağımsız, tarayıcının gerçek görünür yüksekliğine
   (dvh) oturan tam ekran bir katman olarak render edilir. */

function ReelsOverlay({ posts, startId, currentUser, onToggleLike, onOpenProfile, onOpenComments, onClose }) {
  const containerRef = useRef(null);
  const startIndex = Math.max(0, posts.findIndex((p) => p.id === startId));
  const [activeIndex, setActiveIndex] = useState(startIndex === -1 ? 0 : startIndex);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const idx = startIndex === -1 ? 0 : startIndex;
    el.scrollTop = idx * el.clientHeight;
    setActiveIndex(idx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollTop / el.clientHeight);
    setActiveIndex((prev) => (prev === idx ? prev : idx));
  }, []);

  if (posts.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 animate-scrim" style={{ background: "#000", height: "100dvh" }}>
      <button
        onClick={onClose}
        className="absolute top-4 left-4 z-20 p-2 rounded-full press-scale"
        style={{ background: "rgba(15,27,45,0.55)" }}
        aria-label="Geri"
      >
        <ArrowLeft size={20} color="#fff" />
      </button>
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="w-full overflow-y-scroll snap-y snap-mandatory"
        style={{ height: "100dvh", scrollbarWidth: "none" }}
      >
        {posts.map((post, i) => (
          <div key={post.id} className="w-full snap-start" style={{ height: "100dvh" }}>
            <ReelCard
              post={post}
              currentUser={currentUser}
              onToggleLike={onToggleLike}
              onOpenProfile={onOpenProfile}
              onOpenComments={onOpenComments}
              isActive={i === activeIndex}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* --------------------------------- Profile ---------------------------------- */

function EditProfileModal({ user, onClose, onSaved }) {
  const [username, setUsername] = useState(user.username || "");
  const [fullName, setFullName] = useState(user.full_name || "");
  const [bio, setBio] = useState(user.bio || "");
  const [avatarPreview, setAvatarPreview] = useState(user.avatar_url || null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(user.cover_url || null);
  const [coverFile, setCoverFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef(null);
  const coverInput = useRef(null);

  const handleAvatarPick = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setAvatarFile(f);
    setAvatarPreview(URL.createObjectURL(f));
  };

  const handleCoverPick = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setCoverFile(f);
    setCoverPreview(URL.createObjectURL(f));
  };

  const handleSave = async () => {
    if (!username.trim()) {
      setError("Kullanıcı adı boş olamaz.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      let avatar_url = user.avatar_url || null;
      if (avatarFile) {
        avatar_url = await api.uploadAvatar(user.id, avatarFile);
      }
      let cover_url = user.cover_url || null;
      if (coverFile) {
        cover_url = await api.uploadCover(user.id, coverFile);
      }
      const updated = await api.updateProfile(user.id, {
        username: username.trim(),
        full_name: fullName.trim(),
        bio: bio.trim(),
        avatar_url,
        cover_url,
      });
      onSaved(updated);
      onClose();
    } catch (err) {
      const msg = err?.message || "";
      setError(msg.includes("duplicate key") ? "Bu kullanıcı adı zaten alınmış." : msg || "Profil güncellenemedi.");
    }
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center animate-scrim" style={{ background: "rgba(15,27,45,0.7)" }} onClick={onClose}>
      <div
        className="w-full md:max-w-sm rounded-t-2xl md:rounded-lg overflow-hidden animate-modal-rise glass-strong max-h-[90vh] overflow-y-auto"
        style={{ border: `1px solid ${COLORS.border}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 sticky top-0 z-10" style={{ borderBottom: `1px solid ${COLORS.border}`, background: COLORS.surface }}>
          <span className="text-sm font-semibold" style={{ color: COLORS.ivory }}>
            Profili düzenle
          </span>
          <button onClick={onClose} className="text-sm press-scale" style={{ color: COLORS.muted }}>
            Kapat
          </button>
        </div>

        <button
          onClick={() => coverInput.current?.click()}
          className="relative w-full h-28 block press-scale"
          style={{ background: coverPreview ? `url(${coverPreview}) center/cover no-repeat` : COLORS.surfaceAlt }}
        >
          {!coverPreview && (
            <span className="absolute inset-0 flex items-center justify-center text-xs font-medium" style={{ color: COLORS.muted }}>
              Kapak fotoğrafı ekle
            </span>
          )}
          <span className="absolute bottom-2 right-2 text-[11px] font-semibold px-2 py-1 rounded-md" style={{ background: "rgba(15,27,45,0.75)", color: COLORS.ivory }}>
            Değiştir
          </span>
        </button>
        <input ref={coverInput} type="file" accept="image/*" onChange={handleCoverPick} className="hidden" />

        <div className="p-5 flex flex-col gap-4 -mt-8">
          <div className="flex flex-col items-center gap-2">
            <button onClick={() => fileInput.current?.click()} className="press-scale" style={{ border: `3px solid ${COLORS.surface}`, borderRadius: "9999px" }}>
              <Avatar name={username || "?"} size={72} avatarUrl={avatarPreview} />
            </button>
            <button onClick={() => fileInput.current?.click()} className="text-xs font-semibold" style={{ color: COLORS.bronzeSoft }}>
              Profil fotoğrafını değiştir
            </button>
            <input ref={fileInput} type="file" accept="image/*" onChange={handleAvatarPick} className="hidden" />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: COLORS.muted }}>
              Kullanıcı adı
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full text-sm px-3 py-2.5 rounded-md focus:outline-none"
              style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ivory }}
            />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: COLORS.muted }}>
              Ad soyad
            </label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Adın ve soyadın"
              className="w-full text-sm px-3 py-2.5 rounded-md focus:outline-none"
              style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ivory }}
            />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: COLORS.muted }}>
              Biyografi
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full text-sm px-3 py-2.5 rounded-md resize-none focus:outline-none"
              style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ivory }}
            />
          </div>
          {error && (
            <p className="text-xs" style={{ color: "#E07A5F" }}>
              {error}
            </p>
          )}
          <button
            onClick={handleSave}
            disabled={busy}
            className="w-full text-sm font-semibold py-2.5 rounded-md disabled:opacity-40 flex items-center justify-center gap-2"
            style={{ background: `linear-gradient(90deg, ${COLORS.bronze}, ${COLORS.bronzeSoft})`, color: "#241608" }}
          >
            {busy && <Spinner />}
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------- Settings ----------------------------------- */

function SettingsRow({ icon: Icon, label, danger, subtitle, onClick, right }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 press-scale text-left"
      style={{ borderBottom: `1px solid ${COLORS.border}` }}
    >
      <Icon size={18} color={danger ? "#E07A5F" : COLORS.muted} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: danger ? "#E07A5F" : COLORS.ivory }}>
          {label}
        </p>
        {subtitle && (
          <p className="text-xs mt-0.5 truncate" style={{ color: COLORS.muted }}>
            {subtitle}
          </p>
        )}
      </div>
      {right !== undefined ? right : <ChevronRight size={16} color={COLORS.muted} />}
    </button>
  );
}

function SettingsSection({ title, children }) {
  return (
    <div className="mb-6">
      {title && (
        <p className="text-[11px] font-semibold uppercase tracking-wide px-4 mb-1.5" style={{ color: COLORS.muted }}>
          {title}
        </p>
      )}
      <div className="rounded-lg overflow-hidden" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
        {children}
      </div>
    </div>
  );
}

function SettingsSubpage({ title, onBack, children }) {
  return (
    <div className="max-w-lg mx-auto py-4 px-4 animate-fade-slide">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onBack} className="press-scale p-1 -ml-1">
          <ArrowLeft size={20} color={COLORS.ivory} />
        </button>
        <h2 className="text-base font-semibold" style={{ color: COLORS.ivory, fontFamily: "Georgia, serif" }}>
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}

function ToggleSwitch({ checked, onChange, disabled }) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className="relative w-11 h-6 rounded-full transition-colors duration-200 press-scale disabled:opacity-60"
      style={{ background: checked ? COLORS.bronze : COLORS.border }}
    >
      <span
        className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200"
        style={{ transform: checked ? "translateX(22px)" : "translateX(2px)" }}
      />
    </button>
  );
}

function SettingsTextField({ label, ...props }) {
  return (
    <div className="mb-4">
      <label className="text-xs mb-1 block" style={{ color: COLORS.muted }}>
        {label}
      </label>
      <input
        {...props}
        className="w-full text-sm px-3 py-2.5 rounded-md focus:outline-none"
        style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ivory }}
      />
    </div>
  );
}

function SettingsSaveButton({ busy, onClick, label = "Kaydet" }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="w-full text-sm font-semibold py-2.5 rounded-md disabled:opacity-40 flex items-center justify-center gap-2"
      style={{ background: `linear-gradient(90deg, ${COLORS.bronze}, ${COLORS.bronzeSoft})`, color: "#241608" }}
    >
      {busy && <Spinner />}
      {label}
    </button>
  );
}

function PasswordSettings({ onBack }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const handleSave = async () => {
    if (password.length < 6) return setMsg({ error: true, text: "Şifre en az 6 karakter olmalı." });
    if (password !== confirm) return setMsg({ error: true, text: "Şifreler eşleşmiyor." });
    setBusy(true);
    setMsg(null);
    try {
      await api.changePassword(password);
      setMsg({ error: false, text: "Şifren güncellendi." });
      setPassword("");
      setConfirm("");
    } catch (err) {
      setMsg({ error: true, text: err?.message || "Şifre güncellenemedi." });
    }
    setBusy(false);
  };

  return (
    <SettingsSubpage title="Şifre değiştir" onBack={onBack}>
      <SettingsTextField label="Yeni şifre" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <SettingsTextField label="Yeni şifre (tekrar)" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      {msg && (
        <p className="text-xs mb-3" style={{ color: msg.error ? "#E07A5F" : "#7FB88A" }}>
          {msg.text}
        </p>
      )}
      <SettingsSaveButton busy={busy} onClick={handleSave} />
    </SettingsSubpage>
  );
}

function EmailSettings({ user, onBack }) {
  const [email, setEmail] = useState(user.email || "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const handleSave = async () => {
    if (!email.includes("@")) return setMsg({ error: true, text: "Geçerli bir e-posta gir." });
    setBusy(true);
    setMsg(null);
    try {
      await api.changeEmail(email.trim());
      setMsg({ error: false, text: "Onay bağlantısı yeni e-posta adresine gönderildi." });
    } catch (err) {
      setMsg({ error: true, text: err?.message || "E-posta güncellenemedi." });
    }
    setBusy(false);
  };

  return (
    <SettingsSubpage title="E-posta değiştir" onBack={onBack}>
      <SettingsTextField label="E-posta adresi" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      {msg && (
        <p className="text-xs mb-3" style={{ color: msg.error ? "#E07A5F" : "#7FB88A" }}>
          {msg.text}
        </p>
      )}
      <SettingsSaveButton busy={busy} onClick={handleSave} />
    </SettingsSubpage>
  );
}

function PhoneSettings({ user, onBack, onSaved }) {
  const [phone, setPhone] = useState(user.phone || "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const handleSave = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const updated = await api.updatePhone(user.id, phone.trim());
      onSaved(updated);
      setMsg({ error: false, text: "Telefon numarası kaydedildi." });
    } catch (err) {
      setMsg({ error: true, text: err?.message || "Kaydedilemedi." });
    }
    setBusy(false);
  };

  return (
    <SettingsSubpage title="Telefon numarası" onBack={onBack}>
      <SettingsTextField label="Telefon numarası" type="tel" placeholder="+90 5xx xxx xx xx" value={phone} onChange={(e) => setPhone(e.target.value)} />
      {msg && (
        <p className="text-xs mb-3" style={{ color: msg.error ? "#E07A5F" : "#7FB88A" }}>
          {msg.text}
        </p>
      )}
      <SettingsSaveButton busy={busy} onClick={handleSave} />
    </SettingsSubpage>
  );
}

function PrivacySettings({ user, onBack, onSaved }) {
  const [isPrivate, setIsPrivate] = useState(!!user.is_private);
  const [busy, setBusy] = useState(false);

  const toggle = async (val) => {
    setIsPrivate(val);
    setBusy(true);
    try {
      const updated = await api.updateProfile(user.id, { is_private: val });
      onSaved(updated);
    } catch (err) {
      console.error(err);
      setIsPrivate(!val);
    }
    setBusy(false);
  };

  return (
    <SettingsSubpage title="Gizlilik ayarları" onBack={onBack}>
      <SettingsSection>
        <div className="w-full flex items-center gap-3 px-4 py-3.5">
          <Lock size={18} color={COLORS.muted} />
          <div className="flex-1">
            <p className="text-sm font-medium" style={{ color: COLORS.ivory }}>
              Hesabı gizli yap
            </p>
            <p className="text-xs mt-0.5" style={{ color: COLORS.muted }}>
              Gizli hesaplarda gönderiler sadece onaylanan takipçilere görünür.
            </p>
          </div>
          <ToggleSwitch checked={isPrivate} onChange={toggle} disabled={busy} />
        </div>
      </SettingsSection>
    </SettingsSubpage>
  );
}

function NotificationSettings({ user, onBack, onSaved }) {
  const defaults = { likes: true, comments: true, follows: true, messages: true };
  const [prefs, setPrefs] = useState({ ...defaults, ...(user.notification_prefs || {}) });
  const [busy, setBusy] = useState(false);

  const toggle = async (key, val) => {
    const next = { ...prefs, [key]: val };
    setPrefs(next);
    setBusy(true);
    try {
      const updated = await api.updateProfile(user.id, { notification_prefs: next });
      onSaved(updated);
    } catch (err) {
      console.error(err);
      setPrefs(prefs);
    }
    setBusy(false);
  };

  const rows = [
    { key: "likes", label: "Beğeniler" },
    { key: "comments", label: "Yorumlar" },
    { key: "follows", label: "Yeni takipçiler" },
    { key: "messages", label: "Mesajlar" },
  ];

  return (
    <SettingsSubpage title="Bildirim ayarları" onBack={onBack}>
      <SettingsSection>
        {rows.map((r, i) => (
          <div
            key={r.key}
            className="w-full flex items-center gap-3 px-4 py-3.5"
            style={{ borderBottom: i < rows.length - 1 ? `1px solid ${COLORS.border}` : "none" }}
          >
            <p className="flex-1 text-sm font-medium" style={{ color: COLORS.ivory }}>
              {r.label}
            </p>
            <ToggleSwitch checked={!!prefs[r.key]} onChange={(v) => toggle(r.key, v)} disabled={busy} />
          </div>
        ))}
      </SettingsSection>
    </SettingsSubpage>
  );
}

function SecuritySettings({ onBack, goTo, onLogout }) {
  return (
    <SettingsSubpage title="Güvenlik" onBack={onBack}>
      <SettingsSection>
        <SettingsRow icon={KeyRound} label="Şifreyi değiştir" onClick={() => goTo("password")} />
        <SettingsRow icon={LogOut} label="Bu cihazdan çıkış yap" onClick={onLogout} />
      </SettingsSection>
      <p className="text-xs px-1" style={{ color: COLORS.muted }}>
        İki adımlı doğrulama yakında eklenecek.
      </p>
    </SettingsSubpage>
  );
}

function BlockedUsersSettings({ onBack, blockedUsers, onUnblock, loading }) {
  return (
    <SettingsSubpage title="Engellenen kullanıcılar" onBack={onBack}>
      {loading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : blockedUsers.length === 0 ? (
        <EmptyState icon={UserX} title="Engellenen kullanıcı yok" />
      ) : (
        <SettingsSection>
          {blockedUsers.map((u, i) => (
            <div
              key={u.id}
              className="flex items-center gap-3 px-4 py-3"
              style={{ borderBottom: i < blockedUsers.length - 1 ? `1px solid ${COLORS.border}` : "none" }}
            >
              <Avatar name={u.username} size={36} avatarUrl={u.avatarUrl} />
              <p className="flex-1 text-sm font-medium truncate" style={{ color: COLORS.ivory }}>
                {u.username}
              </p>
              <button
                onClick={() => onUnblock(u.id)}
                className="text-xs font-semibold px-3 py-1.5 rounded-md press-scale"
                style={{ border: `1px solid ${COLORS.border}`, color: COLORS.ivory }}
              >
                Kaldır
              </button>
            </div>
          ))}
        </SettingsSection>
      )}
    </SettingsSubpage>
  );
}

function HelpSettings({ onBack }) {
  return (
    <SettingsSubpage title="Yardım ve Destek" onBack={onBack}>
      <SettingsSection>
        <div className="px-4 py-3.5 text-sm" style={{ color: COLORS.ivory }}>
          Sorun mu yaşıyorsun? destek@meydan.app adresine e-posta gönder, en kısa sürede dönüş yapalım.
        </div>
      </SettingsSection>
      <SettingsSection title="Sıkça sorulanlar">
        <div className="px-4 py-3.5 text-sm" style={{ color: COLORS.muted }}>
          Şifremi unuttum, hesabımı nasıl silerim, gizlilik ayarları hakkında sorularının çoğuna Ayarlar menüsünden ulaşabilirsin.
        </div>
      </SettingsSection>
    </SettingsSubpage>
  );
}

const APP_VERSION = "1.1.0";

function AboutSettings({ onBack }) {
  return (
    <SettingsSubpage title="Hakkında" onBack={onBack}>
      <div className="flex flex-col items-center text-center gap-3 py-6">
        <Logo />
        <p className="text-sm max-w-xs" style={{ color: COLORS.muted }}>
          Meydan, çini mavisi ve pirinç tonlarıyla tasarlanmış bir "şehir meydanı" — paylaş, keşfet, bağlan.
        </p>
        <p className="text-xs" style={{ color: COLORS.muted }}>
          Uygulama sürümü {APP_VERSION}
        </p>
      </div>
    </SettingsSubpage>
  );
}

function SettingsPage({ user, onBack, onEditProfile, onLogout, onDeleteAccount, onSaved, blockedUsers, blockedLoading, onUnblock, onLinkGoogle, onGoogleSignIn }) {
  const [view, setView] = useState("root");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDelete = async () => {
    setDeleteBusy(true);
    try {
      await onDeleteAccount();
    } catch (err) {
      console.error(err);
      setDeleteBusy(false);
    }
  };

  if (view === "password") return <PasswordSettings onBack={() => setView("root")} />;
  if (view === "email") return <EmailSettings user={user} onBack={() => setView("root")} />;
  if (view === "phone") return <PhoneSettings user={user} onBack={() => setView("root")} onSaved={onSaved} />;
  if (view === "privacy") return <PrivacySettings user={user} onBack={() => setView("root")} onSaved={onSaved} />;
  if (view === "notifications") return <NotificationSettings user={user} onBack={() => setView("root")} onSaved={onSaved} />;
  if (view === "security") return <SecuritySettings onBack={() => setView("root")} goTo={setView} onLogout={onLogout} />;
  if (view === "blocked")
    return <BlockedUsersSettings onBack={() => setView("root")} blockedUsers={blockedUsers} loading={blockedLoading} onUnblock={onUnblock} />;
  if (view === "help") return <HelpSettings onBack={() => setView("root")} />;
  if (view === "about") return <AboutSettings onBack={() => setView("root")} />;

  return (
    <div className="max-w-lg mx-auto py-4 px-4 pb-10 animate-fade-slide">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onBack} className="press-scale p-1 -ml-1">
          <ArrowLeft size={20} color={COLORS.ivory} />
        </button>
        <h2 className="text-lg font-semibold" style={{ color: COLORS.ivory, fontFamily: "Georgia, serif" }}>
          Ayarlar
        </h2>
      </div>

      <SettingsSection title="Hesap bilgileri">
        <SettingsRow icon={User} label="Profili düzenle" subtitle="Kullanıcı adı, ad soyad, biyografi, fotoğraflar" onClick={onEditProfile} />
        <SettingsRow icon={KeyRound} label="Şifre değiştir" onClick={() => setView("password")} />
        <SettingsRow icon={Mail} label="E-posta değiştir" subtitle={user.email} onClick={() => setView("email")} />
        <SettingsRow icon={Phone} label="Telefon numarası" subtitle={user.phone || "Eklenmedi"} onClick={() => setView("phone")} />
        <SettingsRow icon={UserPlus2} label="Google hesabını bağla" onClick={onLinkGoogle} />
        <SettingsRow icon={UserPlus2} label="Google ile giriş yap" onClick={onGoogleSignIn} />
      </SettingsSection>

      <SettingsSection title="Tercihler">
        <SettingsRow icon={Lock} label="Gizlilik ayarları" onClick={() => setView("privacy")} />
        <SettingsRow icon={Bell} label="Bildirim ayarları" onClick={() => setView("notifications")} />
        <SettingsRow icon={Shield} label="Güvenlik ayarları" onClick={() => setView("security")} />
        <SettingsRow icon={UserX} label="Engellenen kullanıcılar" onClick={() => setView("blocked")} />
      </SettingsSection>

      <SettingsSection title="Destek">
        <SettingsRow icon={HelpCircle} label="Yardım ve Destek" onClick={() => setView("help")} />
        <SettingsRow icon={Info} label="Hakkında" subtitle={`Sürüm ${APP_VERSION}`} onClick={() => setView("about")} />
      </SettingsSection>

      <SettingsSection>
        <SettingsRow icon={LogOut} label="Çıkış Yap" onClick={onLogout} />
        <SettingsRow icon={Trash2} label="Hesabı Sil" danger onClick={() => setConfirmDelete(true)} />
      </SettingsSection>

      {confirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-6 animate-scrim" style={{ background: "rgba(15,27,45,0.75)" }}>
          <div className="w-full max-w-sm rounded-lg p-5 animate-modal-rise" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
            <p className="text-sm font-semibold mb-2" style={{ color: COLORS.ivory }}>
              Hesabını silmek istediğine emin misin?
            </p>
            <p className="text-xs mb-4" style={{ color: COLORS.muted }}>
              Bu işlem geri alınamaz. Tüm gönderilerin, yorumların ve mesajların kalıcı olarak silinir.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 text-sm font-medium py-2 rounded-md press-scale"
                style={{ border: `1px solid ${COLORS.border}`, color: COLORS.ivory }}
              >
                Vazgeç
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteBusy}
                className="flex-1 text-sm font-semibold py-2 rounded-md press-scale disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ background: "#E07A5F", color: "#241608" }}
              >
                {deleteBusy && <Spinner />}
                Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* --------------------------- Account switcher sheet --------------------------- */

function AccountSwitcherSheet({ currentUser, savedAccounts, onClose, onSwitch, onAddAccount, onManage }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center animate-scrim" style={{ background: "rgba(15,27,45,0.7)" }} onClick={onClose}>
      <div
        className="w-full md:max-w-sm rounded-t-2xl overflow-hidden animate-modal-rise glass-strong"
        style={{ border: `1px solid ${COLORS.border}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-2.5 pb-1">
          <div className="w-9 h-1 rounded-full" style={{ background: COLORS.border }} />
        </div>
        <div className="px-4 py-2.5 text-center text-sm font-semibold" style={{ color: COLORS.ivory, borderBottom: `1px solid ${COLORS.border}` }}>
          Hesaplar
        </div>

        <div className="max-h-[50vh] overflow-y-auto">
          {savedAccounts.map((acc) => {
            const isCurrent = acc.id === currentUser.id;
            return (
              <button
                key={acc.id}
                onClick={() => !isCurrent && onSwitch(acc)}
                className="w-full flex items-center gap-3 px-4 py-3 press-scale"
                style={{ borderBottom: `1px solid ${COLORS.border}` }}
              >
                <Avatar name={acc.username} size={40} avatarUrl={acc.avatar_url} />
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: COLORS.ivory }}>
                    {acc.username}
                  </p>
                  {isCurrent && (
                    <p className="text-xs" style={{ color: COLORS.muted }}>
                      Mevcut hesap
                    </p>
                  )}
                </div>
                {isCurrent && <Check size={18} color={COLORS.bronzeSoft} />}
              </button>
            );
          })}
        </div>

        <button onClick={onAddAccount} className="w-full flex items-center gap-3 px-4 py-3.5 press-scale" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ border: `1.5px dashed ${COLORS.border}` }}>
            <Plus size={16} color={COLORS.muted} />
          </div>
          <span className="text-sm font-medium" style={{ color: COLORS.ivory }}>
            Hesap ekle
          </span>
        </button>

        <button onClick={onManage} className="w-full flex items-center gap-3 px-4 py-3.5 press-scale">
          <UsersRound size={18} color={COLORS.muted} />
          <span className="text-sm font-medium" style={{ color: COLORS.ivory }}>
            Hesapları yönet
          </span>
        </button>

        <div className="h-2" />
      </div>
    </div>
  );
}

function ManageAccountsPage({ savedAccounts, currentUser, onBack, onRemove }) {
  return (
    <SettingsSubpage title="Hesapları yönet" onBack={onBack}>
      <SettingsSection>
        {savedAccounts.map((acc, i) => (
          <div
            key={acc.id}
            className="flex items-center gap-3 px-4 py-3"
            style={{ borderBottom: i < savedAccounts.length - 1 ? `1px solid ${COLORS.border}` : "none" }}
          >
            <Avatar name={acc.username} size={36} avatarUrl={acc.avatar_url} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: COLORS.ivory }}>
                {acc.username}
              </p>
              {acc.id === currentUser.id && (
                <p className="text-xs" style={{ color: COLORS.muted }}>
                  Mevcut hesap
                </p>
              )}
            </div>
            {acc.id !== currentUser.id && (
              <button
                onClick={() => onRemove(acc.id)}
                className="text-xs font-semibold px-3 py-1.5 rounded-md press-scale"
                style={{ border: `1px solid ${COLORS.border}`, color: "#E07A5F" }}
              >
                Kaldır
              </button>
            )}
          </div>
        ))}
      </SettingsSection>
      <p className="text-xs px-1" style={{ color: COLORS.muted }}>
        Bir hesabı kaldırmak sadece bu cihazdaki kayıtlı girişi siler, hesabı silmez.
      </p>
    </SettingsSubpage>
  );
}

/* ------------------------------- Follow list (tam sayfa) --------------------------------- */

// Takipçi / Takip edilen listesi artık bir modal değil, kendi rotası olan tam
// bir sayfa. `follows` prop'u App'teki global realtime aboneliği tarafından
// canlı tutulduğu için bu sayfa da her `follows` değişiminde otomatik olarak
// güncel listeyi gösterir (ekstra bir subscription açmaya gerek yok).
function FollowListPage({ title, userIds, users, currentUser, follows, onToggleFollow, onOpenProfile, onBack }) {
  const [query, setQuery] = useState("");

  const list = useMemo(() => {
    const base = userIds.map((id) => users.find((u) => u.id === id)).filter(Boolean);
    if (!query.trim()) return base;
    const q = query.trim().toLowerCase();
    return base.filter(
      (u) => u.username?.toLowerCase().includes(q) || u.full_name?.toLowerCase().includes(q)
    );
  }, [userIds, users, query]);

  return (
    <div className="max-w-lg mx-auto py-6 px-4 animate-fade-slide">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="p-1.5 -ml-1.5 press-scale" aria-label="Geri">
          <ArrowLeft size={20} color={COLORS.ivory} />
        </button>
        <h2 className="text-base font-semibold" style={{ color: COLORS.ivory, fontFamily: "Georgia, serif" }}>
          {title}
        </h2>
        <span className="text-xs" style={{ color: COLORS.muted }}>
          ({userIds.length})
        </span>
      </div>

      <div className="relative mb-4">
        <Search size={16} color={COLORS.muted} className="absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Kullanıcı ara..."
          className="w-full text-sm pl-9 pr-3 py-2.5 rounded-lg focus:outline-none"
          style={{ background: COLORS.surfaceAlt, color: COLORS.ivory, border: `1px solid ${COLORS.border}` }}
        />
      </div>

      {list.length === 0 ? (
        <EmptyState icon={UsersRound} title={query ? "Sonuç bulunamadı" : "Henüz kimse yok"} />
      ) : (
        <div className="flex flex-col">
          {list.map((u, i) => {
            const isFollowing = follows.some((f) => f.follower_id === currentUser.id && f.following_id === u.id);
            const isSelf = u.id === currentUser.id;
            return (
              <div
                key={u.id}
                className="flex items-center justify-between py-2.5 animate-fade-slide-soft"
                style={{ borderBottom: `1px solid ${COLORS.border}`, animationDelay: `${Math.min(i, 10) * 0.03}s` }}
              >
                <button className="flex items-center gap-3 press-scale min-w-0" onClick={() => onOpenProfile(u.id)}>
                  <Avatar name={u.username} size={44} avatarUrl={u.avatar_url} />
                  <div className="text-left min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: COLORS.ivory }}>
                      {u.username}
                    </p>
                    {u.full_name && (
                      <p className="text-xs truncate" style={{ color: COLORS.muted }}>
                        {u.full_name}
                      </p>
                    )}
                  </div>
                </button>
                {!isSelf && (
                  <button
                    onClick={() => onToggleFollow(u.id, isFollowing)}
                    className="flex items-center gap-1 text-xs font-semibold px-3.5 py-1.5 rounded-md press-scale transition-colors shrink-0"
                    style={
                      isFollowing
                        ? { background: COLORS.surfaceAlt, color: COLORS.muted, border: `1px solid ${COLORS.border}` }
                        : { background: `linear-gradient(90deg, ${COLORS.bronze}, ${COLORS.bronzeSoft})`, color: "#241608" }
                    }
                  >
                    {isFollowing ? <UserCheck size={13} /> : <UserPlus size={13} />}
                    {isFollowing ? "Takiptesin" : "Takip et"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* --------------------------------- Profile ---------------------------------- */

function Profile({
  profileUser,
  isOwnProfile,
  posts,
  users,
  follows,
  currentUser,
  onToggleFollow,
  onEditProfile,
  onOpenSettings,
  onSwitchAccount,
  onMessage,
  onBack,
  onOpenProfile,
  onBlockUser,
  onOpenFollowList,
  postsLoading,
  onToggleLike,
  onOpenComments,
  onDelete,
  onUpdatePost,
  onOpenReel,
}) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(null); // grid'de tıklanan gönderinin index'i

  const mine = useMemo(
    () =>
      posts
        .filter((p) => p.userId === profileUser.id)
        .slice()
        .sort((a, b) => (b.pinned === a.pinned ? 0 : b.pinned ? 1 : -1)),
    [posts, profileUser.id]
  );
  const totalLikes = useMemo(() => mine.reduce((sum, p) => sum + (p.likes?.length || 0), 0), [mine]);

  const followerIds = useMemo(
    () => follows.filter((f) => f.following_id === profileUser.id).map((f) => f.follower_id),
    [follows, profileUser.id]
  );
  const followingIds = useMemo(
    () => follows.filter((f) => f.follower_id === profileUser.id).map((f) => f.following_id),
    [follows, profileUser.id]
  );
  const isFollowing = follows.some((f) => f.follower_id === currentUser.id && f.following_id === profileUser.id);

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 animate-fade-slide">
      <div className="flex items-center justify-between mb-4">
        {!isOwnProfile ? (
          <button onClick={onBack} className="flex items-center gap-1 text-sm press-scale" style={{ color: COLORS.muted }}>
            <ArrowLeft size={16} /> Geri
          </button>
        ) : (
          <span />
        )}
        {isOwnProfile ? (
          <button onClick={onOpenSettings} className="p-1.5 press-scale" aria-label="Ayarlar">
            <Settings size={22} color={COLORS.ivory} />
          </button>
        ) : (
          <div className="relative">
            <button onClick={() => setShowProfileMenu((v) => !v)} className="p-1.5 press-scale" aria-label="Diğer seçenekler">
              <MoreHorizontal size={20} color={COLORS.ivory} />
            </button>
            {showProfileMenu && (
              <div
                className="absolute right-0 top-9 z-20 w-48 rounded-md overflow-hidden shadow-lg"
                style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}` }}
              >
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    onBlockUser(profileUser.id);
                  }}
                  className="w-full text-left text-sm px-4 py-2.5"
                  style={{ color: "#E07A5F" }}
                >
                  Kullanıcıyı engelle
                </button>
                <button
                  onClick={() => setShowProfileMenu(false)}
                  className="w-full text-left text-sm px-4 py-2.5"
                  style={{ color: COLORS.ivory, borderTop: `1px solid ${COLORS.border}` }}
                >
                  İptal
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {profileUser.cover_url && (
        <div className="w-full h-32 rounded-lg overflow-hidden mb-[-2.5rem]" style={{ background: COLORS.surfaceAlt }}>
          <img src={profileUser.cover_url} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      <div className="flex flex-col items-center text-center mb-6 animate-fade-slide-soft">
        <button
          onClick={() => profileUser.avatar_url && setAvatarOpen(true)}
          className="press-scale rounded-full"
          aria-label="Profil fotoğrafını büyüt"
        >
          <Avatar name={profileUser.username} size={96} avatarUrl={profileUser.avatar_url} />
        </button>
        {isOwnProfile ? (
          <button onClick={onSwitchAccount} className="flex items-center gap-1 mt-3 press-scale">
            <h2 className="text-xl font-semibold" style={{ color: COLORS.ivory, fontFamily: "Georgia, serif" }}>
              {profileUser.username}
            </h2>
            <ChevronDown size={16} color={COLORS.muted} />
          </button>
        ) : (
          <h2 className="text-xl font-semibold mt-3" style={{ color: COLORS.ivory, fontFamily: "Georgia, serif" }}>
            {profileUser.username}
          </h2>
        )}
        {profileUser.full_name && (
          <p className="text-sm" style={{ color: COLORS.muted }}>
            {profileUser.full_name}
          </p>
        )}
        {profileUser.bio ? (
          <p className="text-sm mt-1.5 max-w-sm" style={{ color: COLORS.ivory }}>
            {profileUser.bio}
          </p>
        ) : isOwnProfile ? (
          <p className="text-sm mt-1.5" style={{ color: COLORS.muted }}>
            Kendini anlatan kısa bir biyografi ekle
          </p>
        ) : null}

        <div className="flex items-center gap-8 mt-5">
          <div className="text-center">
            <p className="text-base font-bold" style={{ color: COLORS.ivory }}>
              {mine.length}
            </p>
            <p className="text-[11px] uppercase tracking-wide" style={{ color: COLORS.muted }}>
              Gönderi
            </p>
          </div>
          <button className="text-center press-scale" onClick={() => onOpenFollowList(profileUser.id, "followers")}>
            <p className="text-base font-bold" style={{ color: COLORS.ivory }}>
              {followerIds.length}
            </p>
            <p className="text-[11px] uppercase tracking-wide" style={{ color: COLORS.muted }}>
              Takipçi
            </p>
          </button>
          <button className="text-center press-scale" onClick={() => onOpenFollowList(profileUser.id, "following")}>
            <p className="text-base font-bold" style={{ color: COLORS.ivory }}>
              {followingIds.length}
            </p>
            <p className="text-[11px] uppercase tracking-wide" style={{ color: COLORS.muted }}>
              Takip
            </p>
          </button>
          <div className="text-center">
            <p className="text-base font-bold" style={{ color: COLORS.ivory }}>
              {totalLikes}
            </p>
            <p className="text-[11px] uppercase tracking-wide" style={{ color: COLORS.muted }}>
              Beğeni
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-5">
          {isOwnProfile ? (
            <button
              onClick={onEditProfile}
              className="flex items-center gap-1.5 text-sm font-medium px-5 py-2 rounded-md press-scale"
              style={{ border: `1px solid ${COLORS.border}`, color: COLORS.ivory, background: COLORS.surfaceAlt }}
            >
              <Settings size={14} />
              Profili düzenle
            </button>
          ) : (
            <>
              <button
                onClick={() => onToggleFollow(profileUser.id, isFollowing)}
                className="flex items-center gap-1.5 text-sm font-semibold px-5 py-2 rounded-md press-scale transition-colors"
                style={
                  isFollowing
                    ? { background: COLORS.surfaceAlt, color: COLORS.ivory, border: `1px solid ${COLORS.border}` }
                    : { background: `linear-gradient(90deg, ${COLORS.bronze}, ${COLORS.bronzeSoft})`, color: "#241608" }
                }
              >
                {isFollowing ? <UserCheck size={15} /> : <UserPlus size={15} />}
                {isFollowing ? "Takip ediliyor" : "Takip et"}
              </button>
              <button
                onClick={onMessage}
                className="flex items-center gap-1.5 text-sm font-medium px-5 py-2 rounded-md press-scale"
                style={{ border: `1px solid ${COLORS.bronze}`, color: COLORS.bronzeSoft }}
              >
                <Send size={14} />
                Mesaj
              </button>
            </>
          )}
        </div>
      </div>

      <TileMotif className="mb-4 rounded-full" />

      {postsLoading ? (
        <GridSkeleton />
      ) : mine.length === 0 ? (
        <EmptyState
          icon={Grid3x3}
          title="Henüz paylaşım yok"
          subtitle={isOwnProfile ? '"Oluştur" bölümünden ilk gönderini paylaş' : undefined}
        />
      ) : (
        <div className="grid grid-cols-3 gap-1">
          {mine.map((post, i) => (
            <button
              key={post.id}
              onClick={() => (post.mediaType === "video" ? onOpenReel(post, mine) : setViewerIndex(i))}
              className="aspect-square relative overflow-hidden animate-pop-in press-scale text-left"
              style={{ background: COLORS.surfaceAlt, animationDelay: `${Math.min(i, 8) * 0.03}s` }}
              aria-label="Gönderiyi aç"
            >
              {post.image &&
                (post.mediaType === "video" ? (
                  <video src={post.image} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                ) : (
                  <img src={post.image} alt="" className="w-full h-full object-cover" />
                ))}
              {post.mediaType === "video" && (
                <div className="absolute top-1.5 right-1.5">
                  <Play size={13} color="#fff" fill="#fff" />
                </div>
              )}
              {post.pinned && (
                <div className="absolute top-1.5 left-1.5">
                  <Pin size={13} color="#fff" fill="#fff" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {avatarOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center animate-scrim"
          style={{ background: "rgba(6,11,19,0.88)" }}
          onClick={() => setAvatarOpen(false)}
        >
          <button
            onClick={() => setAvatarOpen(false)}
            className="absolute top-5 right-5 p-2 press-scale"
            aria-label="Kapat"
          >
            <X size={26} color="#fff" />
          </button>
          <img
            src={profileUser.avatar_url}
            alt={profileUser.username}
            className="rounded-full object-cover animate-avatar-zoom"
            style={{
              width: "min(78vw, 340px)",
              height: "min(78vw, 340px)",
              border: `2px solid ${COLORS.bronzeSoft}`,
              boxShadow: "0 0 60px rgba(0,0,0,0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {viewerIndex !== null && mine[viewerIndex] && (
        <div className="fixed inset-0 z-50 flex flex-col animate-scrim" style={{ background: "rgba(6,11,19,0.96)" }}>
          <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
            <button onClick={() => setViewerIndex(null)} className="press-scale flex items-center gap-1" style={{ color: COLORS.ivory }}>
              <ArrowLeft size={20} /> <span className="text-sm">Geri</span>
            </button>
            <span className="text-xs" style={{ color: COLORS.muted }}>
              {viewerIndex + 1} / {mine.length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto px-3 pb-8 flex items-start justify-center">
            <div className="w-full max-w-md relative">
              {viewerIndex > 0 && (
                <button
                  onClick={() => setViewerIndex((i) => Math.max(0, i - 1))}
                  className="hidden md:flex items-center justify-center absolute -left-14 top-1/3 p-2 rounded-full press-scale"
                  style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}` }}
                  aria-label="Önceki"
                >
                  <ChevronLeft size={20} color={COLORS.ivory} />
                </button>
              )}
              {viewerIndex < mine.length - 1 && (
                <button
                  onClick={() => setViewerIndex((i) => Math.min(mine.length - 1, i + 1))}
                  className="hidden md:flex items-center justify-center absolute -right-14 top-1/3 p-2 rounded-full press-scale"
                  style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}` }}
                  aria-label="Sonraki"
                >
                  <ChevronRight size={20} color={COLORS.ivory} />
                </button>
              )}
              <Post
                post={mine[viewerIndex]}
                currentUser={currentUser}
                onToggleLike={onToggleLike}
                onOpenProfile={onOpenProfile}
                onOpenComments={onOpenComments}
                onDelete={(id) => {
                  onDelete(id);
                  setViewerIndex(null);
                }}
                onUpdatePost={onUpdatePost}
                commentCount={mine[viewerIndex].commentCount || 0}
              />
              <div className="flex md:hidden items-center justify-between mt-2">
                <button
                  onClick={() => setViewerIndex((i) => Math.max(0, i - 1))}
                  disabled={viewerIndex === 0}
                  className="text-xs font-medium px-4 py-2 rounded-md press-scale disabled:opacity-30"
                  style={{ border: `1px solid ${COLORS.border}`, color: COLORS.ivory }}
                >
                  Önceki
                </button>
                <button
                  onClick={() => setViewerIndex((i) => Math.min(mine.length - 1, i + 1))}
                  disabled={viewerIndex === mine.length - 1}
                  className="text-xs font-medium px-4 py-2 rounded-md press-scale disabled:opacity-30"
                  style={{ border: `1px solid ${COLORS.border}`, color: COLORS.ivory }}
                >
                  Sonraki
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------ Notifications ------------------------------- */

function NotificationRow({ notif, onOpenProfile }) {
  const label =
    notif.type === "like"
      ? "gönderini beğendi"
      : notif.type === "comment"
      ? `yorum yaptı: "${(notif.text || "").slice(0, 60)}${(notif.text || "").length > 60 ? "…" : ""}"`
      : "seni takip etmeye başladı";

  return (
    <button
      onClick={() => onOpenProfile(notif.actorId)}
      className="w-full flex items-center gap-3 px-4 py-3 press-scale text-left"
      style={{ borderBottom: `1px solid ${COLORS.border}` }}
    >
      <Avatar name={notif.actorUsername} size={40} avatarUrl={notif.actorAvatar} />
      <div className="flex-1 min-w-0">
        <p className="text-sm" style={{ color: COLORS.ivory }}>
          <span className="font-semibold">{notif.actorUsername}</span>{" "}
          <span style={{ color: COLORS.muted }}>{label}</span>
        </p>
        <p className="text-[11px] mt-0.5 uppercase tracking-wide" style={{ color: COLORS.muted }}>
          {timeAgo(notif.createdAt)} önce
        </p>
      </div>
      <div className="flex-shrink-0">
        {notif.type === "follow" ? (
          <UserPlus2 size={18} color={COLORS.bronzeSoft} />
        ) : notif.postImage ? (
          <div className="relative w-10 h-10 rounded overflow-hidden" style={{ background: COLORS.surfaceAlt }}>
            {notif.postMediaType === "video" ? (
              <video src={notif.postImage} className="w-full h-full object-cover" muted playsInline preload="metadata" />
            ) : (
              <img src={notif.postImage} alt="" className="w-full h-full object-cover" />
            )}
          </div>
        ) : notif.type === "like" ? (
          <Heart size={18} color="#E07A5F" fill="#E07A5F" />
        ) : (
          <MessageCircle size={18} color={COLORS.muted} />
        )}
      </div>
    </button>
  );
}

function Notifications({ notifications, loading, onOpenProfile, onBack }) {
  return (
    <div className="max-w-lg mx-auto animate-fade-slide">
      <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
        <button onClick={onBack} className="press-scale md:hidden" aria-label="Geri">
          <ArrowLeft size={20} color={COLORS.ivory} />
        </button>
        <h2 className="text-lg font-semibold" style={{ color: COLORS.ivory, fontFamily: "Georgia, serif" }}>
          Bildirimler
        </h2>
      </div>
      {loading ? (
        <div className="p-4">
          <FeedSkeleton />
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Henüz bildirimin yok"
          subtitle="Beğeniler, yorumlar ve yeni takipçiler burada görünecek"
        />
      ) : (
        <div>
          {notifications.map((n) => (
            <NotificationRow key={n.id} notif={n} onOpenProfile={onOpenProfile} />
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------------------- Messages ---------------------------------- */

function Messages({ user, chats, refreshChats, openChatId, setOpenChatId }) {
  const [draft, setDraft] = useState("");
  const [mobileShowChat, setMobileShowChat] = useState(!!openChatId);
  const [sending, setSending] = useState(false);

  const myChats = chats; // App bileşeni zaten sadece bu kullanıcının sohbetlerini yüklüyor
  const selected = myChats.find((c) => c.id === openChatId) || null;

  useEffect(() => {
    if (openChatId) setMobileShowChat(true);
  }, [openChatId]);

  const otherOf = (chat) => chat.otherUser || { username: "silinmiş kullanıcı" };

  const sendMessage = async () => {
    if (!draft.trim() || !selected) return;
    setSending(true);
    try {
      await api.sendMessage(selected.id, user.id, draft.trim());
      setDraft("");
      await refreshChats();
    } catch (err) {
      console.error("Mesaj gönderilemedi", err);
    }
    setSending(false);
  };

  if (myChats.length === 0) {
    return <EmptyState icon={Send} title="Henüz mesajın yok" subtitle="Keşfet'ten bir kullanıcı seçip mesaj gönder" />;
  }

  return (
    <div className="flex h-screen md:h-auto">
      <div className={`w-full md:w-80 flex-shrink-0 ${mobileShowChat ? "hidden md:block" : "block"}`} style={{ borderRight: `1px solid ${COLORS.border}` }}>
        <div className="px-5 py-5" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
          <h2 className="text-lg font-bold" style={{ color: COLORS.ivory, fontFamily: "Georgia, serif" }}>
            Mesajlar
          </h2>
        </div>
        {myChats.map((chat) => {
          const other = otherOf(chat);
          const last = chat.messages[chat.messages.length - 1];
          return (
            <button
              key={chat.id}
              onClick={() => setOpenChatId(chat.id)}
              className="w-full flex items-center gap-3 px-5 py-3 text-left"
              style={{ background: openChatId === chat.id ? COLORS.surface : "transparent" }}
            >
              <Avatar name={other.username} size={44} avatarUrl={other.avatar_url} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: COLORS.ivory }}>
                  {other.username}
                </p>
                <p className="text-xs truncate" style={{ color: COLORS.muted }}>
                  {last ? last.text : "Sohbete başla"}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {selected && (
        <div className={`flex-1 flex flex-col ${mobileShowChat ? "block" : "hidden md:flex"}`}>
          <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
            <button className="md:hidden" onClick={() => setMobileShowChat(false)}>
              <ArrowLeft size={20} color={COLORS.ivory} />
            </button>
            <Avatar name={otherOf(selected).username} size={34} avatarUrl={otherOf(selected).avatar_url} />
            <span className="text-sm font-semibold" style={{ color: COLORS.ivory }}>
              {otherOf(selected).username}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-2">
            {selected.messages.map((m, i) => (
              <div
                key={i}
                className="max-w-[70%] px-4 py-2 rounded-2xl text-sm"
                style={
                  m.from === user.id
                    ? { alignSelf: "flex-end", background: `linear-gradient(90deg, ${COLORS.bronze}, ${COLORS.bronzeSoft})`, color: "#241608" }
                    : { alignSelf: "flex-start", background: COLORS.surface, color: COLORS.ivory }
                }
              >
                {m.text}
              </div>
            ))}
          </div>
          <div className="px-4 py-3 flex items-center gap-2" style={{ borderTop: `1px solid ${COLORS.border}` }}>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Mesaj yaz..."
              className="flex-1 text-sm px-4 py-2 rounded-full focus:outline-none"
              style={{ background: COLORS.surface, color: COLORS.ivory }}
            />
            <button
              onClick={sendMessage}
              disabled={!draft.trim() || sending}
              className="font-semibold text-sm px-2 disabled:opacity-30"
              style={{ color: COLORS.bronzeSoft }}
            >
              Gönder
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ----------------------------------- App ------------------------------------ */

export default function Meydan() {
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [active, setActive] = useState("feed");
  // navTab: alt/yan menüde hangi sekmenin vurgulanacağını tutar. `active`'ten
  // ayrı tutulur çünkü "Keşfet"ten bir profile girmek ya da Ayarlar'ı açmak
  // içerik olarak farklı bir sayfa gösterir ama navigasyonda geldiğin sekme
  // (ör. Keşfet) vurgulu kalmalı — bu da Keşfet'ten profile girince "Profil"
  // sekmesinin yanlışlıkla aktif görünmesi hatasını çözer.
  const [navTab, setNavTab] = useState("feed");
  const [posts, setPosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [follows, setFollows] = useState([]);
  const [chats, setChats] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [openChatId, setOpenChatId] = useState(null);
  const [viewingUserId, setViewingUserId] = useState(null); // null => kendi profilim
  const [followListView, setFollowListView] = useState(null); // { userId, type: 'followers'|'following' } | null
  const [commentsPost, setCommentsPost] = useState(null);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showAccountSwitcher, setShowAccountSwitcher] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState(() => accountsStore.getSavedAccounts());
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [blockedLoading, setBlockedLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [lastSeenNotifsAt, setLastSeenNotifsAt] = useState(null);
  const [reelsOverlay, setReelsOverlay] = useState(null); // { posts: [...], startId } | null

  const refreshPosts = useCallback(async () => setPosts(await api.fetchPosts()), []);
  const refreshUsers = useCallback(async () => setUsers(await api.fetchProfiles()), []);
  const refreshFollows = useCallback(async () => setFollows(await api.fetchFollows()), []);
  const refreshNotifications = useCallback(async (userId) => {
    if (!userId) return;
    setNotificationsLoading(true);
    try {
      setNotifications(await api.fetchNotifications(userId));
    } catch (err) {
      console.error("Bildirimler yüklenemedi", err);
    }
    setNotificationsLoading(false);
  }, []);
  const refreshChats = useCallback(async () => {
    const session = await api.getCurrentSession();
    if (!session?.user?.id) return;
    setChats(await api.fetchChats(session.user.id));
  }, []);

  const loadUserFromSession = useCallback(async (session) => {
    const sessionUser = session?.user || null;
    if (!sessionUser) {
      setUser(null);
      return;
    }
    try {
      const profile = await api.fetchProfile(sessionUser.id);
      const fullUser = { ...profile, id: sessionUser.id, email: sessionUser.email };
      setUser(fullUser);
      accountsStore.saveAccountSession(fullUser, session);
      setSavedAccounts(accountsStore.getSavedAccounts());
    } catch (err) {
      console.error("Profil yüklenemedi", err);
      setUser(null);
    }
  }, []);

  // Oturum kontrolü + Supabase Auth durum dinleyicisi
  useEffect(() => {
    let mounted = true;
    (async () => {
      const session = await api.getCurrentSession();
      if (mounted) {
        await loadUserFromSession(session);
        setCheckingSession(false);
      }
    })();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      await loadUserFromSession(session);
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [loadUserFromSession]);

  // Mobil tarayıcılarda sekme/uygulama arka planda kalınca (ekran kilidi,
  // uygulama değiştirme vb.) Supabase'in autoRefreshToken zamanlayıcısı
  // duraklayabiliyor. Bu da öne dönüldüğünde elde bayat (süresi dolmuş)
  // bir access_token kalmasına ve "row-level security policy" gibi
  // auth.uid() null döndüğü için oluşan hatalara yol açıyor. Sekme her
  // öne geldiğinde oturumu kontrol edip gerekirse tazeliyoruz.
  useEffect(() => {
    const refreshIfStale = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const { data } = await supabase.auth.getSession();
        const session = data?.session;
        if (!session) return;
        const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
        // Süresi dolmuşsa ya da 2 dakikadan az kalmışsa proaktif olarak yenile.
        if (expiresAt && expiresAt - Date.now() < 2 * 60 * 1000) {
          await supabase.auth.refreshSession();
        }
      } catch (err) {
        console.error("Oturum tazelenemedi", err);
      }
    };
    refreshIfStale();
    document.addEventListener("visibilitychange", refreshIfStale);
    window.addEventListener("focus", refreshIfStale);
    return () => {
      document.removeEventListener("visibilitychange", refreshIfStale);
      window.removeEventListener("focus", refreshIfStale);
    };
  }, []);

  const refreshBlocked = useCallback(async () => {
    if (!user) return;
    setBlockedLoading(true);
    try {
      setBlockedUsers(await api.fetchBlockedUsers(user.id));
    } catch (err) {
      console.error("Engellenen kullanıcılar yüklenemedi", err);
    }
    setBlockedLoading(false);
  }, [user]);

  // Kullanıcı oturum açtığında ilk veri yükleme
  useEffect(() => {
    if (!user) return;
    setLoadingPosts(true);
    Promise.all([refreshPosts(), refreshUsers(), refreshFollows(), refreshChats()]).finally(() => setLoadingPosts(false));
    refreshBlocked();
    refreshNotifications(user.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, refreshPosts, refreshUsers, refreshFollows, refreshChats]);

  // Realtime abonelikleri: yeni kullanıcı, yeni gönderi, yeni beğeni, yeni mesaj, takip
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("meydan-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "profiles" }, () => {
        refreshUsers();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => {
        refreshPosts();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "likes" }, () => {
        refreshPosts();
        refreshNotifications(user.id);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "comments" }, () => {
        refreshPosts();
        refreshNotifications(user.id);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "follows" }, () => {
        refreshFollows();
        refreshNotifications(user.id);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        refreshChats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refreshUsers, refreshPosts, refreshFollows, refreshChats]);

  const toggleLike = async (postId) => {
    const post = posts.find((p) => p.id === postId);
    const alreadyLiked = (post?.likes || []).includes(user.id);
    // İyimser güncelleme: arayüz anında değişsin, realtime olay geldiğinde zaten senkron kalacak
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const likes = p.likes || [];
        return { ...p, likes: alreadyLiked ? likes.filter((id) => id !== user.id) : [...likes, user.id] };
      })
    );
    try {
      await api.toggleLike(postId, user.id, alreadyLiked);
    } catch (err) {
      console.error("Beğeni işlemi başarısız", err);
      refreshPosts();
    }
  };

  const toggleFollow = async (targetUserId, alreadyFollowing) => {
    if (!user || targetUserId === user.id) return;
    // İyimser güncelleme
    setFollows((prev) =>
      alreadyFollowing
        ? prev.filter((f) => !(f.follower_id === user.id && f.following_id === targetUserId))
        : [...prev, { follower_id: user.id, following_id: targetUserId }]
    );
    try {
      if (alreadyFollowing) {
        await api.unfollowUser(user.id, targetUserId);
      } else {
        await api.followUser(user.id, targetUserId);
      }
    } catch (err) {
      console.error("Takip işlemi başarısız", err);
      refreshFollows();
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm("Bu gönderiyi silmek istediğine emin misin?")) return;
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    try {
      await api.deletePost(postId, user.id);
    } catch (err) {
      console.error("Gönderi silinemedi", err);
      refreshPosts();
    }
  };

  const handleUpdatePost = async (postId, updates) => {
    // İyimser güncelleme
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              ...(updates.caption !== undefined ? { caption: updates.caption } : {}),
              ...(updates.comments_enabled !== undefined ? { commentsEnabled: updates.comments_enabled } : {}),
              ...(updates.pinned !== undefined ? { pinned: updates.pinned } : {}),
            }
          : updates.pinned && p.userId === user.id
          ? { ...p, pinned: false } // aynı kullanıcının diğer gönderileri sabitlenmiş olabilir, arayüzde tek sabit gösterelim
          : p
      )
    );
    try {
      await api.updatePost(postId, user.id, updates);
    } catch (err) {
      console.error("Gönderi güncellenemedi", err);
      refreshPosts();
      throw err;
    }
  };

  const blockedIds = useMemo(() => new Set(blockedUsers.map((b) => b.id)), [blockedUsers]);
  const visiblePosts = useMemo(() => posts.filter((p) => !blockedIds.has(p.userId)), [posts, blockedIds]);

  const openReel = useCallback((post, list) => {
    const source = (list || visiblePosts).filter((p) => p.mediaType === "video");
    setReelsOverlay({ posts: source, startId: post.id });
  }, [visiblePosts]);

  const openProfile = (userId) => {
    // navTab kasıtlı olarak değiştirilmiyor: Keşfet'ten ya da mesajlardan bir
    // profile giriliyorsa alt menüde geldiğin sekme vurgulu kalmaya devam eder.
    setViewingUserId(userId === user.id ? null : userId);
    setActive("profile");
  };

  const openFollowList = (userId, type) => {
    setFollowListView({ userId, type });
    setActive("followList");
  };

  const openOwnProfileTab = () => {
    setViewingUserId(null);
    setActive("profile");
    setNavTab("profile");
  };

  const openSettings = () => setActive("settings");

  const handleBlockUser = async (targetUserId) => {
    try {
      await api.blockUser(user.id, targetUserId);
      await Promise.all([refreshBlocked(), refreshFollows()]);
      if (viewingUserId === targetUserId) {
        setViewingUserId(null);
        setActive("feed");
        setNavTab("feed");
      }
    } catch (err) {
      console.error("Kullanıcı engellenemedi", err);
    }
  };

  const handleUnblockUser = async (targetUserId) => {
    try {
      await api.unblockUser(user.id, targetUserId);
      await refreshBlocked();
    } catch (err) {
      console.error("Engel kaldırılamadı", err);
    }
  };

  const handleSwitchAccount = async (account) => {
    setShowAccountSwitcher(false);
    if (account.id === user.id) return;
    try {
      const { error } = await supabase.auth.setSession({
        access_token: account.access_token,
        refresh_token: account.refresh_token,
      });
      if (error) throw error;
      setActive("feed");
      setNavTab("feed");
      setViewingUserId(null);
    } catch (err) {
      console.error("Hesap değiştirilemedi, tekrar giriş gerekebilir", err);
      accountsStore.removeAccount(account.id);
      setSavedAccounts(accountsStore.getSavedAccounts());
    }
  };

  const handleAddAccount = async () => {
    setShowAccountSwitcher(false);
    // Mevcut hesap zaten kayıtlı token'larıyla listede duruyor; sadece bu
    // cihazdaki oturumu kapatıp (token'ları iptal etmeden) giriş ekranına dön.
    await supabase.auth.signOut({ scope: "local" });
  };

  const handleRemoveSavedAccount = (accountId) => {
    accountsStore.removeAccount(accountId);
    setSavedAccounts(accountsStore.getSavedAccounts());
  };

  const openChatWith = async (otherUser) => {
    try {
      const conversationId = await api.findOrCreateConversation(user.id, otherUser.id);
      await refreshChats();
      setOpenChatId(conversationId);
      setActive("messages");
    } catch (err) {
      console.error("Sohbet açılamadı", err);
    }
  };

  const handleLogout = async () => {
    if (user) accountsStore.removeAccount(user.id);
    setSavedAccounts(accountsStore.getSavedAccounts());
    await api.signOut();
    setUser(null);
    setActive("feed");
    setNavTab("feed");
  };

  const handleDeleteAccount = async () => {
    await api.deleteAccount();
    if (user) accountsStore.removeAccount(user.id);
    setSavedAccounts(accountsStore.getSavedAccounts());
    setUser(null);
    setActive("feed");
    setNavTab("feed");
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center" style={{ background: COLORS.bg }}>
        <Spinner />
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onLogin={() => {}} />;
  }

  const profileUser = viewingUserId ? users.find((u) => u.id === viewingUserId) || { id: viewingUserId, username: "..." } : user;
  const isOwnProfile = !viewingUserId;

  const hasUnreadNotifs = notifications.some(
    (n) => !lastSeenNotifsAt || new Date(n.createdAt) > new Date(lastSeenNotifsAt)
  );
  const hasUnreadMessages = chats.some((c) => {
    const last = c.messages[c.messages.length - 1];
    return last && last.from !== user.id;
  });

  const goToTab = (key) => {
    if (key === "profile") setViewingUserId(null);
    if (key === "notifications") setLastSeenNotifsAt(new Date().toISOString());
    setActive(key);
    setNavTab(key);
  };

  return (
    <div className="flex min-h-screen" style={{ background: COLORS.bg, color: COLORS.ivory, fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <Sidebar active={navTab} setActive={goToTab} onLogout={handleLogout} user={user} />
      <div className="flex-1 pb-16 md:pb-0">
        {active === "feed" && (
          <TopBar active={active} setActive={goToTab} hasUnreadNotifs={hasUnreadNotifs} unreadMessages={hasUnreadMessages} />
        )}
        <PageTransition transitionKey={active}>
          {active === "feed" && (
            <Feed
              loading={loadingPosts}
              posts={visiblePosts}
              currentUser={user}
              onToggleLike={toggleLike}
              onOpenProfile={openProfile}
              onOpenComments={setCommentsPost}
              onDelete={handleDeletePost}
              onUpdatePost={handleUpdatePost}
            />
          )}
          {active === "new" && <CreatePost user={user} onCreated={refreshPosts} goTo={setActive} />}
          {active === "discover" && (
            <Discover
              posts={visiblePosts}
              users={users.filter((u) => !blockedIds.has(u.id))}
              currentUser={user}
              follows={follows}
              onToggleFollow={toggleFollow}
              onOpenChat={openChatWith}
              onOpenProfile={openProfile}
              onOpenReel={openReel}
            />
          )}
          {active === "reels" && (
            <Reels
              posts={visiblePosts}
              currentUser={user}
              onToggleLike={toggleLike}
              onOpenProfile={openProfile}
              onOpenComments={setCommentsPost}
            />
          )}
          {active === "notifications" && (
            <Notifications
              notifications={notifications}
              loading={notificationsLoading}
              onOpenProfile={openProfile}
              onBack={() => goToTab("feed")}
            />
          )}
          {active === "profile" && (
            <Profile
              profileUser={profileUser}
              isOwnProfile={isOwnProfile}
              posts={visiblePosts}
              users={users}
              follows={follows}
              currentUser={user}
              onToggleFollow={toggleFollow}
              onEditProfile={() => setShowEditProfile(true)}
              onOpenSettings={openSettings}
              onSwitchAccount={() => setShowAccountSwitcher(true)}
              onMessage={() => openChatWith(profileUser)}
              onBack={() => setViewingUserId(null)}
              onOpenProfile={openProfile}
              onBlockUser={handleBlockUser}
              onOpenFollowList={openFollowList}
              postsLoading={loadingPosts}
              onToggleLike={toggleLike}
              onOpenComments={setCommentsPost}
              onDelete={handleDeletePost}
              onUpdatePost={handleUpdatePost}
              onOpenReel={openReel}
            />
          )}
          {active === "followList" && followListView && (
            <FollowListPage
              title={followListView.type === "followers" ? "Takipçiler" : "Takip edilenler"}
              userIds={follows
                .filter((f) =>
                  followListView.type === "followers"
                    ? f.following_id === followListView.userId
                    : f.follower_id === followListView.userId
                )
                .map((f) => (followListView.type === "followers" ? f.follower_id : f.following_id))}
              users={users}
              currentUser={user}
              follows={follows}
              onToggleFollow={toggleFollow}
              onOpenProfile={(id) => {
                setFollowListView(null);
                openProfile(id);
              }}
              onBack={() => {
                setFollowListView(null);
                setActive("profile");
              }}
            />
          )}
          {active === "messages" && (
            <Messages user={user} chats={chats} refreshChats={refreshChats} openChatId={openChatId} setOpenChatId={setOpenChatId} />
          )}
          {active === "settings" && (
            <SettingsPage
              user={user}
              onBack={() => setActive("profile")}
              onEditProfile={() => setShowEditProfile(true)}
              onLogout={handleLogout}
              onDeleteAccount={handleDeleteAccount}
              onSaved={(updated) => setUser((prev) => ({ ...prev, ...updated }))}
              blockedUsers={blockedUsers}
              blockedLoading={blockedLoading}
              onUnblock={handleUnblockUser}
              onLinkGoogle={async () => {
                try {
                  await api.linkGoogleAccount();
                } catch (err) {
                  console.error("Google hesabı bağlanamadı", err);
                }
              }}
              onGoogleSignIn={async () => {
                try {
                  await api.signInWithGoogle();
                } catch (err) {
                  console.error("Google ile giriş başarısız", err);
                }
              }}
            />
          )}
          {active === "manageAccounts" && (
            <ManageAccountsPage
              savedAccounts={savedAccounts}
              currentUser={user}
              onBack={() => setActive("profile")}
              onRemove={handleRemoveSavedAccount}
            />
          )}
        </PageTransition>
      </div>
      <MobileNav active={navTab} setActive={goToTab} />

      {commentsPost && (
        <CommentsModal
          post={commentsPost}
          currentUser={user}
          onClose={() => setCommentsPost(null)}
          onCommentAdded={refreshPosts}
        />
      )}

      {showEditProfile && (
        <EditProfileModal
          user={user}
          onClose={() => setShowEditProfile(false)}
          onSaved={(updated) => {
            setUser((prev) => ({ ...prev, ...updated }));
            refreshUsers();
          }}
        />
      )}

      {reelsOverlay && (
        <ReelsOverlay
          posts={reelsOverlay.posts}
          startId={reelsOverlay.startId}
          currentUser={user}
          onToggleLike={toggleLike}
          onOpenProfile={(id) => {
            setReelsOverlay(null);
            openProfile(id);
          }}
          onOpenComments={setCommentsPost}
          onClose={() => setReelsOverlay(null)}
        />
      )}

      {showAccountSwitcher && (
        <AccountSwitcherSheet
          currentUser={user}
          savedAccounts={savedAccounts}
          onClose={() => setShowAccountSwitcher(false)}
          onSwitch={handleSwitchAccount}
          onAddAccount={handleAddAccount}
          onManage={() => {
            setShowAccountSwitcher(false);
            setActive("manageAccounts");
          }}
        />
      )}
    </div>
  );
}
