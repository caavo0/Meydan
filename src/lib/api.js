import { supabase } from "./supabase";

/* ==========================================================================
   AUTH
   ========================================================================== */

export async function signUp({ email, password, username }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } },
  });
  if (error) throw error;
  return data;
}

export async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

/* ==========================================================================
   PROFILES
   ========================================================================== */

export async function fetchProfile(userId) {
  // profile_private (email/phone) sadece satırın sahibi tarafından
  // okunabilir (bkz. migration 007); başkasının profiline bakılırken
  // bu join otomatik olarak boş döner, hata vermez.
  const { data, error } = await supabase
    .from("profiles")
    .select("*, profile_private(phone)")
    .eq("id", userId)
    .single();
  if (error) throw error;
  const { profile_private, ...profile } = data;
  return { ...profile, phone: profile_private?.phone ?? null };
}

export async function fetchProfiles() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function updateProfile(userId, updates) {
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function uploadAvatar(userId, file) {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${userId}/avatar-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage.from("images").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from("images").getPublicUrl(path);
  return data.publicUrl;
}

/* ==========================================================================
   POSTS + LIKES
   ========================================================================== */

export async function uploadPostImage(userId, file) {
  const ext = file.name?.split(".").pop() || (file.type?.includes("video") ? "webm" : "jpg");
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error: uploadError } = await supabase.storage.from("images").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from("images").getPublicUrl(path);
  return data.publicUrl;
}

// Kamera / galeriden gelen fotoğraf ya da video dosyasını yükler.
export async function uploadPostMedia(userId, file) {
  const mediaType = (file.type || "").startsWith("video") ? "video" : "image";
  const url = await uploadPostImage(userId, file);
  return { url, mediaType };
}

export async function createPost({ userId, imageUrl, caption, mediaType = "image" }) {
  const { data, error } = await supabase
    .from("posts")
    .insert({ user_id: userId, image_url: imageUrl, caption, media_type: mediaType })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Feed'de/Discover'da kullanılan post şekli, eski localStorage sürümüyle
// aynı: { id, username, image, caption, time, likes: [userId, ...] }
// Böylece Post / Feed / Discover / Profile bileşenleri neredeyse hiç değişmiyor.
export async function fetchPosts() {
  const { data: posts, error } = await supabase
    .from("posts")
    .select(
      "id, user_id, image_url, caption, media_type, comments_enabled, pinned, created_at, profiles!posts_user_id_fkey(username, avatar_url)"
    )
    .order("created_at", { ascending: false });
  if (error) throw error;

  const { data: likes, error: likesError } = await supabase.from("likes").select("post_id, user_id");
  if (likesError) throw likesError;

  const { data: comments, error: commentsError } = await supabase.from("comments").select("post_id");
  if (commentsError) throw commentsError;

  return (posts || []).map((p) => ({
    id: p.id,
    userId: p.user_id,
    email: p.user_id, // component'lerdeki eski "email" alanı artık user id taşıyor
    username: p.profiles?.username || "silinmiş kullanıcı",
    avatarUrl: p.profiles?.avatar_url || null,
    image: p.image_url,
    mediaType: p.media_type || "image",
    caption: p.caption,
    commentsEnabled: p.comments_enabled !== false,
    pinned: !!p.pinned,
    time: new Date(p.created_at).toLocaleString("tr-TR"),
    likes: (likes || []).filter((l) => l.post_id === p.id).map((l) => l.user_id),
    commentCount: (comments || []).filter((c) => c.post_id === p.id).length,
  }));
}

export async function toggleLike(postId, userId, alreadyLiked) {
  if (alreadyLiked) {
    const { error } = await supabase
      .from("likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", userId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("likes").insert({ post_id: postId, user_id: userId });
    // Aynı kullanıcı aynı anda iki kere basarsa unique constraint hatası
    // gelebilir — bu durumda sessizce yoksayıyoruz (zaten beğenilmiş demektir).
    if (error && error.code !== "23505") throw error;
  }
}

export async function deletePost(postId, userId) {
  const { error } = await supabase.from("posts").delete().eq("id", postId).eq("user_id", userId);
  if (error) throw error;
}

// Kendi gönderisinde: açıklamayı değiştirme, yorumları aç/kapa, sabitle/kaldır.
// `updates` içinde caption / comments_enabled / pinned alanlarından biri veya
// birkaçı olabilir. RLS, sadece auth.uid() = user_id olan satırların
// güncellenebilmesini garanti eder (bkz. migration 006).
export async function updatePost(postId, userId, updates) {
  const allowed = {};
  if (updates.caption !== undefined) allowed.caption = updates.caption;
  if (updates.comments_enabled !== undefined) allowed.comments_enabled = updates.comments_enabled;
  if (updates.pinned !== undefined) allowed.pinned = updates.pinned;

  const { data, error } = await supabase
    .from("posts")
    .update(allowed)
    .eq("id", postId)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/* ==========================================================================
   COMMENTS
   ========================================================================== */

export async function fetchComments(postId) {
  const { data, error } = await supabase
    .from("comments")
    .select("id, post_id, user_id, text, created_at, profiles(username, avatar_url)")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []).map((c) => ({
    id: c.id,
    postId: c.post_id,
    userId: c.user_id,
    username: c.profiles?.username || "silinmiş kullanıcı",
    avatarUrl: c.profiles?.avatar_url || null,
    text: c.text,
    time: new Date(c.created_at).toLocaleString("tr-TR"),
  }));
}

export async function addComment(postId, userId, text) {
  const { error } = await supabase.from("comments").insert({ post_id: postId, user_id: userId, text });
  if (error) throw error;
}

export async function deleteComment(commentId, userId) {
  const { error } = await supabase.from("comments").delete().eq("id", commentId).eq("user_id", userId);
  if (error) throw error;
}

/* ==========================================================================
   CONVERSATIONS + MESSAGES
   ========================================================================== */

export async function findOrCreateConversation(userId, otherUserId) {
  const { data: mine, error: mineError } = await supabase
    .from("conversation_members")
    .select("conversation_id")
    .eq("user_id", userId);
  if (mineError) throw mineError;
  const myConvIds = (mine || []).map((m) => m.conversation_id);

  if (myConvIds.length > 0) {
    const { data: shared, error: sharedError } = await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", otherUserId)
      .in("conversation_id", myConvIds);
    if (sharedError) throw sharedError;
    if (shared && shared.length > 0) {
      return shared[0].conversation_id;
    }
  }

  const { data: conv, error: convError } = await supabase
    .from("conversations")
    .insert({})
    .select()
    .single();
  if (convError) throw convError;

  const { error: membersError } = await supabase.from("conversation_members").insert([
    { conversation_id: conv.id, user_id: userId },
    { conversation_id: conv.id, user_id: otherUserId },
  ]);
  if (membersError) throw membersError;

  return conv.id;
}

// chat şekli eski sürümle uyumlu: { id, participants: [userId, ...], messages: [{from, text, time}] }
export async function fetchChats(userId) {
  const { data: memberRows, error: memberError } = await supabase
    .from("conversation_members")
    .select("conversation_id")
    .eq("user_id", userId);
  if (memberError) throw memberError;

  const conversationIds = (memberRows || []).map((m) => m.conversation_id);
  if (conversationIds.length === 0) return [];

  const { data: allMembers, error: allMembersError } = await supabase
    .from("conversation_members")
    .select("conversation_id, user_id, profiles(id, username, avatar_url)")
    .in("conversation_id", conversationIds);
  if (allMembersError) throw allMembersError;

  const { data: allMessages, error: messagesError } = await supabase
    .from("messages")
    .select("id, conversation_id, sender_id, text, created_at")
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: true });
  if (messagesError) throw messagesError;

  return conversationIds.map((convId) => {
    const members = (allMembers || []).filter((m) => m.conversation_id === convId);
    const participants = members.map((m) => m.user_id);
    const otherMember = members.find((m) => m.user_id !== userId);
    const messages = (allMessages || [])
      .filter((m) => m.conversation_id === convId)
      .map((m) => ({
        from: m.sender_id,
        text: m.text,
        time: new Date(m.created_at).toLocaleString("tr-TR"),
      }));
    return {
      id: convId,
      participants,
      otherUser: otherMember?.profiles || null,
      messages,
    };
  });
}

export async function sendMessage(conversationId, senderId, text) {
  const { error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: senderId, text });
  if (error) throw error;
}

/* ==========================================================================
   FOLLOWS
   ========================================================================== */

// Uygulama küçük ölçekli olduğu için (posts/profiles gibi) tüm takip
// ilişkisini tek seferde çekip App state'inde tutuyoruz; takipçi/takip
// sayıları ve "takip ediyor musun" durumu buradan client-side hesaplanıyor.
export async function fetchFollows() {
  const { data, error } = await supabase.from("follows").select("follower_id, following_id, created_at");
  if (error) throw error;
  return data || [];
}

export async function followUser(followerId, followingId) {
  if (followerId === followingId) return;
  const { error } = await supabase.from("follows").insert({ follower_id: followerId, following_id: followingId });
  // Aynı takip iki kere hızlıca tıklanırsa unique constraint hatası gelebilir,
  // bu durumda zaten takip ediliyor demektir — sessizce geç.
  if (error && error.code !== "23505") throw error;
}

export async function unfollowUser(followerId, followingId) {
  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", followerId)
    .eq("following_id", followingId);
  if (error) throw error;
}

/* ==========================================================================
   BİLDİRİMLER — beğeni / yorum / yeni takipçi bildirimleri, mevcut
   likes / comments / follows tablolarından türetilir (ek migration
   gerekmez, hepsinin created_at kolonu ve herkese açık select politikası
   zaten var).
   ========================================================================== */

export async function fetchNotifications(userId) {
  const { data: myPosts, error: myPostsError } = await supabase
    .from("posts")
    .select("id, image_url, media_type")
    .eq("user_id", userId);
  if (myPostsError) throw myPostsError;

  const myPostIds = (myPosts || []).map((p) => p.id);
  const postById = new Map((myPosts || []).map((p) => [p.id, p]));

  let likeNotifs = [];
  let commentNotifs = [];
  if (myPostIds.length > 0) {
    const { data: likes, error: likesError } = await supabase
      .from("likes")
      .select("post_id, user_id, created_at, profiles(username, avatar_url)")
      .in("post_id", myPostIds)
      .neq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(40);
    if (likesError) throw likesError;
    likeNotifs = (likes || []).map((l) => ({
      id: `like-${l.post_id}-${l.user_id}`,
      type: "like",
      actorId: l.user_id,
      actorUsername: l.profiles?.username || "silinmiş kullanıcı",
      actorAvatar: l.profiles?.avatar_url || null,
      postId: l.post_id,
      postImage: postById.get(l.post_id)?.image_url || null,
      postMediaType: postById.get(l.post_id)?.media_type || "image",
      createdAt: l.created_at,
    }));

    const { data: comments, error: commentsError } = await supabase
      .from("comments")
      .select("id, post_id, user_id, text, created_at, profiles(username, avatar_url)")
      .in("post_id", myPostIds)
      .neq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(40);
    if (commentsError) throw commentsError;
    commentNotifs = (comments || []).map((c) => ({
      id: `comment-${c.id}`,
      type: "comment",
      actorId: c.user_id,
      actorUsername: c.profiles?.username || "silinmiş kullanıcı",
      actorAvatar: c.profiles?.avatar_url || null,
      postId: c.post_id,
      postImage: postById.get(c.post_id)?.image_url || null,
      postMediaType: postById.get(c.post_id)?.media_type || "image",
      text: c.text,
      createdAt: c.created_at,
    }));
  }

  const { data: newFollowers, error: followsError } = await supabase
    .from("follows")
    .select("follower_id, created_at, profiles!follows_follower_id_fkey(username, avatar_url)")
    .eq("following_id", userId)
    .order("created_at", { ascending: false })
    .limit(40);
  if (followsError) throw followsError;
  const followNotifs = (newFollowers || []).map((f) => ({
    id: `follow-${f.follower_id}`,
    type: "follow",
    actorId: f.follower_id,
    actorUsername: f.profiles?.username || "silinmiş kullanıcı",
    actorAvatar: f.profiles?.avatar_url || null,
    createdAt: f.created_at,
  }));

  return [...likeNotifs, ...commentNotifs, ...followNotifs].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
}

/* ==========================================================================
   AYARLAR — profil düzenleme (kapak foto), şifre/e-posta/telefon, Google
   ========================================================================== */

export async function uploadCover(userId, file) {
  const ext = file.name?.split(".").pop() || "jpg";
  // Path'in ilk segmenti auth.uid() olmak zorunda (bkz. migration 007
  // storage policy'si); bu yüzden userId artık path'in başında.
  const path = `${userId}/covers/cover-${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage.from("images").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (uploadError) throw uploadError;
  const { data } = supabase.storage.from("images").getPublicUrl(path);
  return data.publicUrl;
}

export async function changePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function changeEmail(newEmail) {
  const { error } = await supabase.auth.updateUser({ email: newEmail });
  if (error) throw error;
}

export async function updatePhone(userId, phone) {
  // phone artık profiles değil, kilitli profile_private tablosunda.
  const { error } = await supabase
    .from("profile_private")
    .upsert({ user_id: userId, phone }, { onConflict: "user_id" });
  if (error) throw error;
  return { phone };
}

export async function linkGoogleAccount() {
  const { data, error } = await supabase.auth.linkIdentity({
    provider: "google",
    options: { redirectTo: window.location.origin },
  });
  if (error) throw error;
  return data;
}

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin },
  });
  if (error) throw error;
  return data;
}

export async function deleteAccount() {
  const { error } = await supabase.rpc("delete_own_account");
  if (error) throw error;
}

/* ==========================================================================
   ENGELLENEN KULLANICILAR
   ========================================================================== */

export async function fetchBlockedUsers(userId) {
  const { data, error } = await supabase
    .from("blocked_users")
    .select("blocked_id, created_at, profiles!blocked_users_blocked_id_fkey(id, username, avatar_url)")
    .eq("blocker_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.blocked_id,
    username: row.profiles?.username || "silinmiş kullanıcı",
    avatarUrl: row.profiles?.avatar_url || null,
  }));
}

export async function blockUser(blockerId, blockedId) {
  const { error } = await supabase.from("blocked_users").insert({ blocker_id: blockerId, blocked_id: blockedId });
  if (error && error.code !== "23505") throw error;
}

export async function unblockUser(blockerId, blockedId) {
  const { error } = await supabase
    .from("blocked_users")
    .delete()
    .eq("blocker_id", blockerId)
    .eq("blocked_id", blockedId);
  if (error) throw error;
}

