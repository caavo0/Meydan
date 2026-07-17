import React, { useState, useEffect, useRef, useCallback } from "react";
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
} from "lucide-react";
import { supabase } from "./lib/supabase";
import * as api from "./lib/api";

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

function Spinner() {
  return <Loader2 size={22} className="animate-spin" style={{ color: COLORS.bronze }} />;
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
              className="w-full mt-2 text-sm font-semibold py-2.5 rounded-md transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
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
    { key: "messages", label: "Mesajlar", icon: Send },
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
                className="flex items-center gap-4 px-3 py-2.5 rounded-lg text-sm transition-colors"
                style={{
                  color: isActive ? COLORS.ivory : COLORS.muted,
                  background: isActive ? COLORS.surfaceAlt : "transparent",
                  fontWeight: isActive ? 700 : 500,
                }}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} color={isActive ? COLORS.bronzeSoft : COLORS.muted} />
                {label}
              </button>
            );
          })}
        </nav>
      </div>
      <div>
        <button
          onClick={() => setActive("profile")}
          className="flex items-center gap-3 px-3 py-2 rounded-lg mb-1 w-full"
          style={{ background: "transparent" }}
        >
          <Avatar name={user.username} size={28} avatarUrl={user.avatar_url} />
          <span className="text-sm font-medium truncate" style={{ color: COLORS.ivory }}>
            {user.username}
          </span>
        </button>
        <button onClick={onLogout} className="text-sm px-3 py-2 text-left w-full" style={{ color: COLORS.muted }}>
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
    { key: "messages", icon: Send },
    { key: "profile", icon: User },
  ];
  return (
    <div
      className="md:hidden fixed bottom-0 left-0 right-0 flex justify-around py-3 z-10"
      style={{ background: COLORS.surface, borderTop: `1px solid ${COLORS.border}` }}
    >
      {items.map(({ key, icon: Icon }) => (
        <button key={key} onClick={() => setActive(key)}>
          <Icon size={22} strokeWidth={active === key ? 2.5 : 2} color={active === key ? COLORS.bronzeSoft : COLORS.muted} />
        </button>
      ))}
    </div>
  );
}

/* --------------------------------- Post ------------------------------------ */

function PostMenu({ isOwn, onClose, onDelete }) {
  return (
    <div className="absolute right-3 top-11 z-20 w-44 rounded-md overflow-hidden shadow-lg" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}` }}>
      {isOwn ? (
        <button
          onClick={() => {
            onDelete();
            onClose();
          }}
          className="w-full text-left text-sm px-4 py-2.5"
          style={{ color: "#E07A5F" }}
        >
          Gönderiyi sil
        </button>
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

function Post({ post, currentUser, onToggleLike, onOpenProfile, onOpenComments, onDelete, commentCount }) {
  const liked = (post.likes || []).includes(currentUser.id);
  const [menuOpen, setMenuOpen] = useState(false);
  const isOwn = post.userId === currentUser.id;

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

  return (
    <div className="rounded-lg mb-6 overflow-hidden relative" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
      <div className="flex items-center justify-between px-4 py-3">
        <button className="flex items-center gap-3" onClick={() => onOpenProfile(post.userId)}>
          <Avatar name={post.username} size={32} avatarUrl={post.avatarUrl} />
          <span className="text-sm font-semibold" style={{ color: COLORS.ivory }}>
            {post.username}
          </span>
        </button>
        <button onClick={() => setMenuOpen((v) => !v)}>
          <MoreHorizontal size={20} color={COLORS.muted} />
        </button>
        {menuOpen && <PostMenu isOwn={isOwn} onClose={() => setMenuOpen(false)} onDelete={() => onDelete(post.id)} />}
      </div>
      {post.image && <img src={post.image} alt="gönderi" className="w-full aspect-square object-cover" />}
      <div className="px-4 pt-3 pb-4">
        <div className="flex items-center gap-4 mb-2">
          <button onClick={() => onToggleLike(post.id)}>
            <Heart size={22} color={liked ? "#E07A5F" : COLORS.ivory} fill={liked ? "#E07A5F" : "none"} />
          </button>
          <button onClick={() => onOpenComments(post)}>
            <MessageCircle size={22} color={COLORS.ivory} />
          </button>
          <button onClick={handleShare}>
            <Send size={20} color={COLORS.ivory} />
          </button>
        </div>
        <p className="text-sm font-semibold mb-1" style={{ color: COLORS.ivory }}>
          {(post.likes || []).length} beğenme
        </p>
        {post.caption && (
          <p className="text-sm" style={{ color: COLORS.ivory }}>
            <span className="font-semibold mr-1">{post.username}</span>
            {post.caption}
          </p>
        )}
        {commentCount > 0 && (
          <button onClick={() => onOpenComments(post)} className="text-sm mt-1" style={{ color: COLORS.muted }}>
            {commentCount} yorumun tümünü gör
          </button>
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

function Feed({ loading, posts, currentUser, onToggleLike, onOpenProfile, onOpenComments, onDelete }) {
  return (
    <div className="max-w-lg mx-auto py-6 px-4">
      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      ) : posts.length === 0 ? (
        <EmptyState icon={ImagePlus} title="Akışında henüz gönderi yok" subtitle={'"Oluştur" bölümünden ilk paylaşımını yap'} />
      ) : (
        posts.map((post) => (
          <Post
            key={post.id}
            post={post}
            currentUser={currentUser}
            onToggleLike={onToggleLike}
            onOpenProfile={onOpenProfile}
            onOpenComments={onOpenComments}
            onDelete={onDelete}
            commentCount={post.commentCount || 0}
          />
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
    }
    setSending(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" style={{ background: "rgba(15,27,45,0.7)" }} onClick={onClose}>
      <div
        className="w-full md:max-w-md max-h-[80vh] flex flex-col rounded-t-2xl md:rounded-lg overflow-hidden"
        style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
          <span className="text-sm font-semibold" style={{ color: COLORS.ivory }}>
            Yorumlar
          </span>
          <button onClick={onClose} className="text-sm" style={{ color: COLORS.muted }}>
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

function CreatePost({ user, onCreated, goTo }) {
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef(null);

  const pickFile = (selected) => {
    if (!selected) return;
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  };

  const handleFile = (e) => pickFile(e.target.files?.[0]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    pickFile(e.dataTransfer.files?.[0]);
  };

  const handleShare = async () => {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const imageUrl = await api.uploadPostImage(user.id, file);
      await api.createPost({ userId: user.id, imageUrl, caption });
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

  return (
    <div className="max-w-lg mx-auto py-6 px-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold" style={{ color: COLORS.ivory, fontFamily: "Georgia, serif" }}>
          Yeni gönderi oluştur
        </h2>
        {preview && (
          <button
            onClick={handleShare}
            disabled={busy}
            className="text-sm font-semibold px-4 py-1.5 rounded-full disabled:opacity-40 flex items-center gap-2"
            style={{ background: `linear-gradient(90deg, ${COLORS.bronze}, ${COLORS.bronzeSoft})`, color: "#241608" }}
          >
            {busy && <Spinner />}
            Paylaş
          </button>
        )}
      </div>

      <div className="rounded-lg overflow-hidden" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
        {preview ? (
          <div className="relative">
            <img src={preview} alt="önizleme" className="w-full aspect-square object-cover" />
            <button
              onClick={() => {
                setPreview(null);
                setFile(null);
              }}
              className="absolute top-3 right-3 text-xs font-semibold px-3 py-1.5 rounded-full"
              style={{ background: "rgba(15,27,45,0.75)", color: COLORS.ivory, border: `1px solid ${COLORS.border}` }}
            >
              Kaldır
            </button>
            <button
              onClick={() => fileInput.current?.click()}
              className="absolute bottom-3 right-3 text-xs font-semibold px-3 py-1.5 rounded-full"
              style={{ background: "rgba(15,27,45,0.75)", color: COLORS.bronzeSoft, border: `1px solid ${COLORS.bronze}` }}
            >
              Fotoğrafı değiştir
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInput.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className="w-full aspect-square flex flex-col items-center justify-center gap-3 m-3 rounded-lg transition-colors"
            style={{
              width: "calc(100% - 24px)",
              border: `2px dashed ${dragOver ? COLORS.bronzeSoft : COLORS.border}`,
              color: COLORS.muted,
              background: dragOver ? COLORS.surfaceAlt : "transparent",
            }}
          >
            <ImagePlus size={40} strokeWidth={1.5} color={COLORS.bronzeSoft} />
            <span className="text-sm font-medium" style={{ color: COLORS.ivory }}>
              Fotoğraf sürükle bırak
            </span>
            <span className="text-xs">veya seçmek için dokun</span>
          </button>
        )}
        <input ref={fileInput} type="file" accept="image/*" onChange={handleFile} className="hidden" />

        <div className="p-4 flex flex-col gap-3">
          {preview && (
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
          )}
          {error && (
            <p className="text-xs" style={{ color: "#E07A5F" }}>
              {error}
            </p>
          )}
          {preview && (
            <button
              onClick={handleShare}
              disabled={busy}
              className="w-full text-sm font-semibold py-2.5 rounded-md disabled:opacity-40 flex items-center justify-center gap-2 md:hidden"
              style={{ background: `linear-gradient(90deg, ${COLORS.bronze}, ${COLORS.bronzeSoft})`, color: "#241608" }}
            >
              {busy && <Spinner />}
              Paylaş
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* --------------------------------- Discover -------------------------------- */

function Discover({ posts, users, currentUser, onOpenChat, onOpenProfile }) {
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
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded"
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
                onClick={() => onOpenProfile(post.userId)}
                className="aspect-square relative group overflow-hidden text-left"
                style={{ background: COLORS.surfaceAlt }}
              >
                {post.image && <img src={post.image} alt="" className="w-full h-full object-cover" />}
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
          {filteredUsers.map((u) => (
            <div key={u.id} className="flex items-center justify-between px-4 py-3 rounded-lg" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
              <button className="flex items-center gap-3" onClick={() => onOpenProfile(u.id)}>
                <Avatar name={u.username} size={40} avatarUrl={u.avatar_url} />
                <span className="text-sm font-medium" style={{ color: COLORS.ivory }}>
                  {u.username}
                </span>
              </button>
              <button
                onClick={() => onOpenChat(u)}
                className="text-xs font-semibold px-3 py-1.5 rounded-md"
                style={{ border: `1px solid ${COLORS.bronze}`, color: COLORS.bronzeSoft }}
              >
                Mesaj gönder
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* --------------------------------- Profile ---------------------------------- */

function EditProfileModal({ user, onClose, onSaved }) {
  const [username, setUsername] = useState(user.username || "");
  const [bio, setBio] = useState(user.bio || "");
  const [avatarPreview, setAvatarPreview] = useState(user.avatar_url || null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef(null);

  const handleAvatarPick = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setAvatarFile(f);
    setAvatarPreview(URL.createObjectURL(f));
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
      const updated = await api.updateProfile(user.id, { username: username.trim(), bio: bio.trim(), avatar_url });
      onSaved(updated);
      onClose();
    } catch (err) {
      const msg = err?.message || "";
      setError(msg.includes("duplicate key") ? "Bu kullanıcı adı zaten alınmış." : msg || "Profil güncellenemedi.");
    }
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" style={{ background: "rgba(15,27,45,0.7)" }} onClick={onClose}>
      <div
        className="w-full md:max-w-sm rounded-t-2xl md:rounded-lg overflow-hidden"
        style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
          <span className="text-sm font-semibold" style={{ color: COLORS.ivory }}>
            Profili düzenle
          </span>
          <button onClick={onClose} className="text-sm" style={{ color: COLORS.muted }}>
            Kapat
          </button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div className="flex flex-col items-center gap-2">
            <button onClick={() => fileInput.current?.click()}>
              <Avatar name={username || "?"} size={72} avatarUrl={avatarPreview} />
            </button>
            <button onClick={() => fileInput.current?.click()} className="text-xs font-semibold" style={{ color: COLORS.bronzeSoft }}>
              Fotoğrafı değiştir
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

function Profile({ profileUser, isOwnProfile, posts, onEditProfile, onMessage, onBack }) {
  const mine = posts.filter((p) => p.userId === profileUser.id);
  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      {!isOwnProfile && (
        <button onClick={onBack} className="flex items-center gap-1 text-sm mb-4" style={{ color: COLORS.muted }}>
          <ArrowLeft size={16} /> Geri
        </button>
      )}
      <div className="flex items-center gap-8 mb-6">
        <Avatar name={profileUser.username} size={84} avatarUrl={profileUser.avatar_url} />
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-3">
            <h2 className="text-xl font-semibold" style={{ color: COLORS.ivory, fontFamily: "Georgia, serif" }}>
              {profileUser.username}
            </h2>
            {isOwnProfile ? (
              <button
                onClick={onEditProfile}
                className="flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-md"
                style={{ border: `1px solid ${COLORS.border}`, color: COLORS.muted }}
              >
                <Settings size={14} />
                Profili düzenle
              </button>
            ) : (
              <button
                onClick={onMessage}
                className="flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-md"
                style={{ border: `1px solid ${COLORS.bronze}`, color: COLORS.bronzeSoft }}
              >
                <Send size={14} />
                Mesaj gönder
              </button>
            )}
          </div>
          <div className="flex gap-6 text-sm" style={{ color: COLORS.ivory }}>
            <span>
              <b>{mine.length}</b> gönderi
            </span>
          </div>
          {profileUser.bio && (
            <p className="text-sm mt-2" style={{ color: COLORS.ivory }}>
              {profileUser.bio}
            </p>
          )}
        </div>
      </div>

      <TileMotif className="mb-4 rounded-full" />

      {mine.length === 0 ? (
        <EmptyState
          icon={Grid3x3}
          title={isOwnProfile ? "Henüz paylaşım yok" : "Henüz paylaşım yok"}
          subtitle={isOwnProfile ? '"Oluştur" bölümünden ilk gönderini paylaş' : undefined}
        />
      ) : (
        <div className="grid grid-cols-3 gap-1">
          {mine.map((post) => (
            <div key={post.id} className="aspect-square" style={{ background: COLORS.surfaceAlt }}>
              {post.image && <img src={post.image} alt="" className="w-full h-full object-cover" />}
            </div>
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
  const [posts, setPosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [chats, setChats] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [openChatId, setOpenChatId] = useState(null);
  const [viewingUserId, setViewingUserId] = useState(null); // null => kendi profilim
  const [commentsPost, setCommentsPost] = useState(null);
  const [showEditProfile, setShowEditProfile] = useState(false);

  const refreshPosts = useCallback(async () => setPosts(await api.fetchPosts()), []);
  const refreshUsers = useCallback(async () => setUsers(await api.fetchProfiles()), []);
  const refreshChats = useCallback(async () => {
    const session = await api.getCurrentSession();
    if (!session?.user?.id) return;
    setChats(await api.fetchChats(session.user.id));
  }, []);

  const loadUserFromSession = useCallback(async (sessionUser) => {
    if (!sessionUser) {
      setUser(null);
      return;
    }
    try {
      const profile = await api.fetchProfile(sessionUser.id);
      setUser({ ...profile, id: sessionUser.id, email: sessionUser.email });
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
        await loadUserFromSession(session?.user || null);
        setCheckingSession(false);
      }
    })();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      await loadUserFromSession(session?.user || null);
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [loadUserFromSession]);

  // Kullanıcı oturum açtığında ilk veri yükleme
  useEffect(() => {
    if (!user) return;
    setLoadingPosts(true);
    Promise.all([refreshPosts(), refreshUsers(), refreshChats()]).finally(() => setLoadingPosts(false));
  }, [user, refreshPosts, refreshUsers, refreshChats]);

  // Realtime abonelikleri: yeni kullanıcı, yeni gönderi, yeni beğeni, yeni mesaj
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("meydan-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "profiles" }, () => {
        refreshUsers();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, () => {
        refreshPosts();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "likes" }, () => {
        refreshPosts();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "comments" }, () => {
        refreshPosts();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        refreshChats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refreshUsers, refreshPosts, refreshChats]);

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

  const openProfile = (userId) => {
    setViewingUserId(userId === user.id ? null : userId);
    setActive("profile");
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
    await api.signOut();
    setUser(null);
    setActive("feed");
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

  return (
    <div className="flex min-h-screen" style={{ background: COLORS.bg, color: COLORS.ivory, fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <Sidebar
        active={active}
        setActive={(key) => {
          if (key === "profile") setViewingUserId(null);
          setActive(key);
        }}
        onLogout={handleLogout}
        user={user}
      />
      <div className="flex-1 pb-16 md:pb-0">
        {active === "feed" && (
          <Feed
            loading={loadingPosts}
            posts={posts}
            currentUser={user}
            onToggleLike={toggleLike}
            onOpenProfile={openProfile}
            onOpenComments={setCommentsPost}
            onDelete={handleDeletePost}
          />
        )}
        {active === "new" && <CreatePost user={user} onCreated={refreshPosts} goTo={setActive} />}
        {active === "discover" && <Discover posts={posts} users={users} currentUser={user} onOpenChat={openChatWith} onOpenProfile={openProfile} />}
        {active === "profile" && (
          <Profile
            profileUser={profileUser}
            isOwnProfile={isOwnProfile}
            posts={posts}
            onEditProfile={() => setShowEditProfile(true)}
            onMessage={() => openChatWith(profileUser)}
            onBack={() => setViewingUserId(null)}
          />
        )}
        {active === "messages" && (
          <Messages user={user} chats={chats} refreshChats={refreshChats} openChatId={openChatId} setOpenChatId={setOpenChatId} />
        )}
      </div>
      <MobileNav
        active={active}
        setActive={(key) => {
          if (key === "profile") setViewingUserId(null);
          setActive(key);
        }}
      />

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
    </div>
  );
}
