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
    { key: "messages", icon: Send },
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
  const [justLiked, setJustLiked] = useState(false);
  const [muted, setMuted] = useState(true);
  const isOwn = post.userId === currentUser.id;
  const isVideo = post.mediaType === "video";

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
          <span className="text-sm font-semibold" style={{ color: COLORS.ivory }}>
            {post.username}
          </span>
        </button>
        <button onClick={() => setMenuOpen((v) => !v)} className="press-scale">
          <MoreHorizontal size={20} color={COLORS.muted} />
        </button>
        {menuOpen && <PostMenu isOwn={isOwn} onClose={() => setMenuOpen(false)} onDelete={() => onDelete(post.id)} />}
      </div>
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
          <button onClick={() => onOpenComments(post)} className="press-scale">
            <MessageCircle size={22} color={COLORS.ivory} />
          </button>
          <button onClick={handleShare} className="press-scale">
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

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setError("");
    stopStream();

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
          audio: true,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
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

  useEffect(() => () => clearInterval(tickRef.current), []);

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
        <button
          onClick={() => setFacingMode((m) => (m === "user" ? "environment" : "user"))}
          className="p-2 rounded-full press-scale glass"
          disabled={isRecording}
        >
          <RotateCcw size={20} color="#fff" />
        </button>
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
              muted
              className="w-full h-full object-cover"
              style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
            />
            {!ready && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Spinner />
              </div>
            )}
          </>
        )}
      </div>

      <div className="relative z-10 flex items-center justify-between px-8 pb-10 pt-5">
        <button onClick={() => fileInput.current?.click()} className="p-3 rounded-xl press-scale glass flex flex-col items-center gap-1">
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
            width: 76,
            height: 76,
            background: "transparent",
            border: `4px solid #fff`,
            padding: 5,
          }}
        >
          <span
            className={`rounded-full transition-all duration-200 ${isRecording ? "animate-record-pulse" : ""}`}
            style={{
              width: isRecording ? 30 : "100%",
              height: isRecording ? 30 : "100%",
              borderRadius: isRecording ? 8 : 999,
              background: "#E07A5F",
            }}
          />
        </button>

        <div style={{ width: 48 }} />
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
            <video src={preview} className="w-full h-full object-cover" controls loop playsInline />
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

function Discover({ posts, users, currentUser, follows, onToggleFollow, onOpenChat, onOpenProfile }) {
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
                onClick={() => onOpenProfile(post.userId)}
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
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center animate-scrim" style={{ background: "rgba(15,27,45,0.7)" }} onClick={onClose}>
      <div
        className="w-full md:max-w-sm rounded-t-2xl md:rounded-lg overflow-hidden animate-modal-rise glass-strong"
        style={{ border: `1px solid ${COLORS.border}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
          <span className="text-sm font-semibold" style={{ color: COLORS.ivory }}>
            Profili düzenle
          </span>
          <button onClick={onClose} className="text-sm press-scale" style={{ color: COLORS.muted }}>
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

/* ------------------------------- Follow list --------------------------------- */

function FollowListModal({ title, userIds, users, currentUser, follows, onToggleFollow, onOpenProfile, onClose }) {
  const list = userIds.map((id) => users.find((u) => u.id === id)).filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center animate-scrim" style={{ background: "rgba(15,27,45,0.7)" }} onClick={onClose}>
      <div
        className="w-full md:max-w-sm max-h-[75vh] flex flex-col rounded-t-2xl md:rounded-lg overflow-hidden animate-modal-rise glass-strong"
        style={{ border: `1px solid ${COLORS.border}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
          <span className="text-sm font-semibold" style={{ color: COLORS.ivory }}>
            {title}
          </span>
          <button onClick={onClose} className="press-scale">
            <X size={18} color={COLORS.muted} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {list.length === 0 ? (
            <p className="text-sm text-center py-10" style={{ color: COLORS.muted }}>
              Henüz kimse yok.
            </p>
          ) : (
            list.map((u) => {
              const isFollowing = follows.some((f) => f.follower_id === currentUser.id && f.following_id === u.id);
              const isSelf = u.id === currentUser.id;
              return (
                <div key={u.id} className="flex items-center justify-between px-2 py-2.5 rounded-lg animate-fade-slide-soft">
                  <button
                    className="flex items-center gap-3 press-scale"
                    onClick={() => {
                      onOpenProfile(u.id);
                      onClose();
                    }}
                  >
                    <Avatar name={u.username} size={40} avatarUrl={u.avatar_url} />
                    <span className="text-sm font-medium" style={{ color: COLORS.ivory }}>
                      {u.username}
                    </span>
                  </button>
                  {!isSelf && (
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
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

/* --------------------------------- Profile ---------------------------------- */

function Profile({ profileUser, isOwnProfile, posts, users, follows, currentUser, onToggleFollow, onEditProfile, onMessage, onBack, onOpenProfile, postsLoading }) {
  const [listModal, setListModal] = useState(null); // null | 'followers' | 'following'

  const mine = useMemo(() => posts.filter((p) => p.userId === profileUser.id), [posts, profileUser.id]);
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
      {!isOwnProfile && (
        <button onClick={onBack} className="flex items-center gap-1 text-sm mb-4 press-scale" style={{ color: COLORS.muted }}>
          <ArrowLeft size={16} /> Geri
        </button>
      )}

      <div className="flex flex-col items-center text-center mb-6 animate-fade-slide-soft">
        <Avatar name={profileUser.username} size={96} avatarUrl={profileUser.avatar_url} />
        <h2 className="text-xl font-semibold mt-3" style={{ color: COLORS.ivory, fontFamily: "Georgia, serif" }}>
          {profileUser.username}
        </h2>
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
          <button className="text-center press-scale" onClick={() => setListModal("followers")}>
            <p className="text-base font-bold" style={{ color: COLORS.ivory }}>
              {followerIds.length}
            </p>
            <p className="text-[11px] uppercase tracking-wide" style={{ color: COLORS.muted }}>
              Takipçi
            </p>
          </button>
          <button className="text-center press-scale" onClick={() => setListModal("following")}>
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
            <div
              key={post.id}
              className="aspect-square relative overflow-hidden animate-pop-in"
              style={{ background: COLORS.surfaceAlt, animationDelay: `${Math.min(i, 8) * 0.03}s` }}
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
            </div>
          ))}
        </div>
      )}

      {listModal && (
        <FollowListModal
          title={listModal === "followers" ? "Takipçiler" : "Takip edilenler"}
          userIds={listModal === "followers" ? followerIds : followingIds}
          users={users}
          currentUser={currentUser}
          follows={follows}
          onToggleFollow={onToggleFollow}
          onOpenProfile={(id) => {
            onOpenProfile(id);
            setListModal(null);
          }}
          onClose={() => setListModal(null)}
        />
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
  const [follows, setFollows] = useState([]);
  const [chats, setChats] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [openChatId, setOpenChatId] = useState(null);
  const [viewingUserId, setViewingUserId] = useState(null); // null => kendi profilim
  const [commentsPost, setCommentsPost] = useState(null);
  const [showEditProfile, setShowEditProfile] = useState(false);

  const refreshPosts = useCallback(async () => setPosts(await api.fetchPosts()), []);
  const refreshUsers = useCallback(async () => setUsers(await api.fetchProfiles()), []);
  const refreshFollows = useCallback(async () => setFollows(await api.fetchFollows()), []);
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
    Promise.all([refreshPosts(), refreshUsers(), refreshFollows(), refreshChats()]).finally(() => setLoadingPosts(false));
  }, [user, refreshPosts, refreshUsers, refreshFollows, refreshChats]);

  // Realtime abonelikleri: yeni kullanıcı, yeni gönderi, yeni beğeni, yeni mesaj, takip
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
      .on("postgres_changes", { event: "*", schema: "public", table: "follows" }, () => {
        refreshFollows();
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
        <PageTransition transitionKey={active}>
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
          {active === "discover" && (
            <Discover
              posts={posts}
              users={users}
              currentUser={user}
              follows={follows}
              onToggleFollow={toggleFollow}
              onOpenChat={openChatWith}
              onOpenProfile={openProfile}
            />
          )}
          {active === "profile" && (
            <Profile
              profileUser={profileUser}
              isOwnProfile={isOwnProfile}
              posts={posts}
              users={users}
              follows={follows}
              currentUser={user}
              onToggleFollow={toggleFollow}
              onEditProfile={() => setShowEditProfile(true)}
              onMessage={() => openChatWith(profileUser)}
              onBack={() => setViewingUserId(null)}
              onOpenProfile={openProfile}
              postsLoading={loadingPosts}
            />
          )}
          {active === "messages" && (
            <Messages user={user} chats={chats} refreshChats={refreshChats} openChatId={openChatId} setOpenChatId={setOpenChatId} />
          )}
        </PageTransition>
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
