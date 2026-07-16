import { supabase } from "./supabase";

/* ==========================================================================
   AUTH
c   ========================================================================== */

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
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (error) throw error;
  return data;
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

/* ==========================================================================
   POSTS + LIKES
   ========================================================================== */

export async function uploadPostImage(userId, file) {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error: uploadError } = await supabase.storage.from("images").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from("images").getPublicUrl(path);
  return data.publicUrl;
}

export async function createPost({ userId, imageUrl, caption }) {
  const { data, error } = await supabase
    .from("posts")
    .insert({ user_id: userId, image_url: imageUrl, caption })
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
    .select("id, user_id, image_url, caption, created_at, profiles(username, avatar_url)")
    .order("created_at", { ascending: false });
  if (error) throw error;

  const { data: likes, error: likesError } = await supabase.from("likes").select("post_id, user_id");
  if (likesError) throw likesError;

  return (posts || []).map((p) => ({
    id: p.id,
    userId: p.user_id,
    email: p.user_id, // component'lerdeki eski "email" alanı artık user id taşıyor
    username: p.profiles?.username || "silinmiş kullanıcı",
    avatarUrl: p.profiles?.avatar_url || null,
    image: p.image_url,
    caption: p.caption,
    time: new Date(p.created_at).toLocaleString("tr-TR"),
    likes: (likes || []).filter((l) => l.post_id === p.id).map((l) => l.user_id),
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
