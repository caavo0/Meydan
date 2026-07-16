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

/* ------------------------------------------------------------------
   MEYDAN — "town square"
   Tasarım: gece lacivert zemin + çini mavisi + pirinç/bakır vurgu.
   Backend: localStorage (tarayıcı içi kalıcı depolama). Bu bir
   prototip veritabanıdır — gerçek bir sunucu değildir, şifreler düz
   metin saklanır ve veriler yalnızca bu tarayıcıda/bu cihazda
   tutulur, yani kullanıcılar arası gerçek paylaşım yoktur. Gerçek
   bir ürün için ayrı bir backend gerekir.
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

/* ---------------------------- storage helpers ---------------------------- */
/* window.storage.get()/set() tamamen kaldırıldı — yalnızca localStorage kullanılıyor */

const storageGet = (key) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error("storage get failed", key, e);
    return null;
  }
};

const storageSet = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("storage set failed", key, e);
  }
};

const getUsers = async () => storageGet("meydan:users") || [];
const saveUsers = async (u) => storageSet("meydan:users", u);
const getPosts = async () => storageGet("meydan:posts") || [];
const savePosts = async (p) => storageSet("meydan:posts", p);
const getChats = async () => storageGet("meydan:chats") || [];
const saveChats = async (c) => storageSet("meydan:chats", c);
const getSession = async () => storageGet("meydan:session");
const setSession = async (email) => storageSet("meydan:session", { email });
const clearSession = async () => storageSet("meydan:session", null);

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

function Avatar({ name, size = 32 }) {
  const initial = name ? name[0].toUpperCase() : "?";
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

  const handleSubmit = async () => {
    setError("");
    if (!email.trim() || !password.trim()) return;
    setBusy(true);
    const users = await getUsers();
    const existing = users.find((u) => u.email === email.trim().toLowerCase());

    if (mode === "login") {
      if (!existing || existing.password !== password) {
        setError("E-posta veya şifre hatalı.");
        setBusy(false);
        return;
      }
      await setSession(existing.email);
      onLogin(existing);
    } else {
      if (existing) {
        setError("Bu e-posta zaten kayıtlı.");
        setBusy(false);
        return;
      }
      if (!username.trim()) {
        setError("Bir kullanıcı adı seç.");
        setBusy(false);
        return;
      }
      const newUser = {
        email: email.trim().toLowerCase(),
        username: username.trim(),
        password,
        bio: "",
      };
      await saveUsers([...users, newUser]);
      await setSession(newUser.email);
      onLogin(newUser);
    }
    setBusy(false);
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center"
      style={{ background: COLORS.bg }}
    >
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
            {error && <p className="text-xs" style={{ color: "#E07A5F" }}>{error}</p>}
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
          Veriler bu tarayıcıda (localStorage) saklanır — bu bir prototiptir, gerçek bir güvenli sunucu değildir.
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
          <Avatar name={user.username} size={28} />
          <span className="text-sm font-medium truncate" style={{ color: COLORS.ivory }}>
            {user.username}
          </span>
        </button>
        <button
          onClick={onLogout}
          className="text-sm px-3 py-2 text-left w-full"
          style={{ color: COLORS.muted }}
        >
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
          <Icon
            size={22}
            strokeWidth={active === key ? 2.5 : 2}
            color={active === key ? COLORS.bronzeSoft : COLORS.muted}
          />
        </button>
      ))}
    </div>
  );
}

/* --------------------------------- Post ------------------------------------ */

function Post({ post, currentUser, onToggleLike }) {
  const liked = (post.likes || []).includes(currentUser.email);
  return (
    <div
      className="rounded-lg mb-6 overflow-hidden"
      style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar name={post.username} size={32} />
          <span className="text-sm font-semibold" style={{ color: COLORS.ivory }}>
            {post.username}
          </span>
        </div>
        <MoreHorizontal size={20} color={COLORS.muted} />
      </div>
      {post.image && <img src={post.image} alt="gönderi" className="w-full aspect-square object-cover" />}
      <div className="px-4 pt-3 pb-4">
        <div className="flex items-center gap-4 mb-2">
          <button onClick={() => onToggleLike(post.id)}>
            <Heart size={22} color={liked ? "#E07A5F" : COLORS.ivory} fill={liked ? "#E07A5F" : "none"} />
          </button>
          <MessageCircle size={22} color={COLORS.ivory} />
          <Send size={20} color={COLORS.ivory} />
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

function Feed({ loading, posts, currentUser, onToggleLike }) {
  return (
    <div className="max-w-lg mx-auto py-6 px-4">
      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      ) : posts.length === 0 ? (
        <EmptyState
          icon={ImagePlus}
          title="Akışında henüz gönderi yok"
          subtitle={'"Oluştur" bölümünden ilk paylaşımını yap'}
        />
      ) : (
        posts.map((post) => (
          <Post key={post.id} post={post} currentUser={currentUser} onToggleLike={onToggleLike} />
        ))
      )}
    </div>
  );
}

/* ------------------------------ Create post -------------------------------- */

function CreatePost({ user, onCreated, goTo }) {
  const [preview, setPreview] = useState(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const fileInput = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleShare = async () => {
    if (!preview) return;
    setBusy(true);
    const posts = await getPosts();
    const newPost = {
      id: Date.now(),
      email: user.email,
      username: user.username,
      image: preview,
      caption,
      likes: [],
      time: new Date().toLocaleString("tr-TR"),
    };
    await savePosts([newPost, ...posts]);
    setBusy(false);
    setPreview(null);
    setCaption("");
    onCreated();
    goTo("feed");
  };

  return (
    <div className="max-w-lg mx-auto py-6 px-4">
      <h2 className="text-lg font-bold mb-4" style={{ color: COLORS.ivory, fontFamily: "Georgia, serif" }}>
        Yeni gönderi oluştur
      </h2>
      <div className="rounded-lg overflow-hidden" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
        {preview ? (
          <img src={preview} alt="önizleme" className="w-full aspect-square object-cover" />
        ) : (
          <button
            onClick={() => fileInput.current?.click()}
            className="w-full aspect-square flex flex-col items-center justify-center gap-2"
            style={{ color: COLORS.muted }}
          >
            <ImagePlus size={34} strokeWidth={1.5} />
            <span className="text-sm">Fotoğraf seç</span>
          </button>
        )}
        <input ref={fileInput} type="file" accept="image/*" onChange={handleFile} className="hidden" />
        <div className="p-4 flex flex-col gap-3">
          {preview && (
            <button
              onClick={() => fileInput.current?.click()}
              className="text-xs font-semibold self-start"
              style={{ color: COLORS.bronzeSoft }}
            >
              Fotoğrafı değiştir
            </button>
          )}
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Bir açıklama yaz..."
            rows={3}
            className="w-full text-sm px-3 py-2 rounded-md resize-none focus:outline-none"
            style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ivory }}
          />
          <button
            onClick={handleShare}
            disabled={!preview || busy}
            className="w-full text-sm font-semibold py-2.5 rounded-md disabled:opacity-40 flex items-center justify-center gap-2"
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

function Discover({ posts, users, currentUser, onOpenChat }) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("posts"); // posts | users

  const q = query.trim().toLowerCase();
  const filteredPosts = posts.filter(
    (p) => !q || p.username.toLowerCase().includes(q) || (p.caption || "").toLowerCase().includes(q)
  );
  const filteredUsers = users.filter(
    (u) => u.email !== currentUser.email && (!q || u.username.toLowerCase().includes(q))
  );

  return (
    <div className="max-w-3xl mx-auto py-6 px-4">
      <h2 className="text-lg font-bold mb-4" style={{ color: COLORS.ivory, fontFamily: "Georgia, serif" }}>
        Keşfet
      </h2>
      <div className="flex items-center gap-2 mb-4">
        <div
          className="flex-1 flex items-center gap-2 px-3 py-2 rounded-md"
          style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}` }}
        >
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
            style={{
              background: tab === key ? COLORS.surfaceAlt : "transparent",
              color: tab === key ? COLORS.bronzeSoft : COLORS.muted,
            }}
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
              <div key={post.id} className="aspect-square relative group overflow-hidden" style={{ background: COLORS.surfaceAlt }}>
                {post.image && <img src={post.image} alt="" className="w-full h-full object-cover" />}
                <div className="absolute bottom-0 left-0 right-0 px-2 py-1 text-[10px]" style={{ background: "rgba(15,27,45,0.75)", color: COLORS.ivory }}>
                  {post.username}
                </div>
              </div>
            ))}
          </div>
        )
      ) : filteredUsers.length === 0 ? (
        <EmptyState icon={Users} title="Kullanıcı bulunamadı" />
      ) : (
        <div className="flex flex-col gap-2">
          {filteredUsers.map((u) => (
            <div
              key={u.email}
              className="flex items-center justify-between px-4 py-3 rounded-lg"
              style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}
            >
              <div className="flex items-center gap-3">
                <Avatar name={u.username} size={40} />
                <span className="text-sm font-medium" style={{ color: COLORS.ivory }}>
                  {u.username}
                </span>
              </div>
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

function Profile({ user, posts }) {
  const mine = posts.filter((p) => p.email === user.email);
  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="flex items-center gap-8 mb-6">
        <Avatar name={user.username} size={84} />
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-3">
            <h2 className="text-xl font-semibold" style={{ color: COLORS.ivory, fontFamily: "Georgia, serif" }}>
              {user.username}
            </h2>
            <button
              className="flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-md"
              style={{ border: `1px solid ${COLORS.border}`, color: COLORS.muted }}
            >
              <Settings size={14} />
              Profili düzenle
            </button>
          </div>
          <div className="flex gap-6 text-sm" style={{ color: COLORS.ivory }}>
            <span>
              <b>{mine.length}</b> gönderi
            </span>
          </div>
          <p className="text-xs mt-3" style={{ color: COLORS.muted }}>
            {user.email}
          </p>
        </div>
      </div>

      <TileMotif className="mb-4 rounded-full" />

      {mine.length === 0 ? (
        <EmptyState icon={Grid3x3} title="Henüz paylaşım yok" subtitle={'"Oluştur" bölümünden ilk gönderini paylaş'} />
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

function Messages({ user, users, chats, refreshChats, openChatId, setOpenChatId }) {
  const [draft, setDraft] = useState("");
  const [mobileShowChat, setMobileShowChat] = useState(!!openChatId);
  const [sending, setSending] = useState(false);

  const myChats = chats.filter((c) => c.participants.includes(user.email));
  const selected = myChats.find((c) => c.id === openChatId) || null;

  useEffect(() => {
    if (openChatId) setMobileShowChat(true);
  }, [openChatId]);

  const otherOf = (chat) => {
    const otherEmail = chat.participants.find((e) => e !== user.email);
    return users.find((u) => u.email === otherEmail) || { username: "silinmiş kullanıcı" };
  };

  const sendMessage = async () => {
    if (!draft.trim() || !selected) return;
    setSending(true);
    const allChats = await getChats();
    const updated = allChats.map((c) =>
      c.id === selected.id
        ? { ...c, messages: [...c.messages, { from: user.email, text: draft, time: "şimdi" }] }
        : c
    );
    await saveChats(updated);
    await refreshChats();
    setDraft("");
    setSending(false);
  };

  if (myChats.length === 0) {
    return <EmptyState icon={Send} title="Henüz mesajın yok" subtitle="Keşfet'ten bir kullanıcı seçip mesaj gönder" />;
  }

  return (
    <div className="flex h-screen md:h-auto">
      <div
        className={`w-full md:w-80 flex-shrink-0 ${mobileShowChat ? "hidden md:block" : "block"}`}
        style={{ borderRight: `1px solid ${COLORS.border}` }}
      >
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
              <Avatar name={other.username} size={44} />
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
            <Avatar name={otherOf(selected).username} size={34} />
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
                  m.from === user.email
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

  const refreshPosts = useCallback(async () => setPosts(await getPosts()), []);
  const refreshUsers = useCallback(async () => setUsers(await getUsers()), []);
  const refreshChats = useCallback(async () => setChats(await getChats()), []);

  // Oturum kontrolü
  useEffect(() => {
    (async () => {
      const session = await getSession();
      if (session?.email) {
        const all = await getUsers();
        const found = all.find((u) => u.email === session.email);
        if (found) setUser(found);
      }
      setCheckingSession(false);
    })();
  }, []);

  useEffect(() => {
    if (!user) return;
    setLoadingPosts(true);
    Promise.all([refreshPosts(), refreshUsers(), refreshChats()]).finally(() => setLoadingPosts(false));
  }, [user, refreshPosts, refreshUsers, refreshChats]);

  const toggleLike = async (postId) => {
    const all = await getPosts();
    const updated = all.map((p) => {
      if (p.id !== postId) return p;
      const likes = p.likes || [];
      const has = likes.includes(user.email);
      return { ...p, likes: has ? likes.filter((e) => e !== user.email) : [...likes, user.email] };
    });
    await savePosts(updated);
    setPosts(updated);
  };

  const openChatWith = async (otherUser) => {
    let all = await getChats();
    let chat = all.find(
      (c) => c.participants.includes(user.email) && c.participants.includes(otherUser.email)
    );
    if (!chat) {
      chat = { id: Date.now(), participants: [user.email, otherUser.email], messages: [] };
      all = [...all, chat];
      await saveChats(all);
    }
    setChats(all);
    setOpenChatId(chat.id);
    setActive("messages");
  };

  const handleLogout = async () => {
    await clearSession();
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
    return <AuthScreen onLogin={setUser} />;
  }

  return (
    <div
      className="flex min-h-screen"
      style={{ background: COLORS.bg, color: COLORS.ivory, fontFamily: "system-ui, -apple-system, sans-serif" }}
    >
      <Sidebar active={active} setActive={setActive} onLogout={handleLogout} user={user} />
      <div className="flex-1 pb-16 md:pb-0">
        {active === "feed" && (
          <Feed loading={loadingPosts} posts={posts} currentUser={user} onToggleLike={toggleLike} />
        )}
        {active === "new" && <CreatePost user={user} onCreated={refreshPosts} goTo={setActive} />}
        {active === "discover" && (
          <Discover posts={posts} users={users} currentUser={user} onOpenChat={openChatWith} />
        )}
        {active === "profile" && <Profile user={user} posts={posts} />}
        {active === "messages" && (
          <Messages
            user={user}
            users={users}
            chats={chats}
            refreshChats={refreshChats}
            openChatId={openChatId}
            setOpenChatId={setOpenChatId}
          />
        )}
      </div>
      <MobileNav active={active} setActive={setActive} />
    </div>
  );
}
