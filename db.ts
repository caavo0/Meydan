import { and, desc, eq, like, ne, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { chats, InsertUser, likes, messages, posts, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ───────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  type TextField = (typeof textFields)[number];
  const assignNullable = (field: TextField) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  };
  textFields.forEach(assignNullable);

  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function updateUserProfile(userId: number, data: { username?: string; bio?: string }) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set(data).where(eq(users.id, userId));
}

export async function searchUsers(query: string, excludeUserId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(users)
    .where(and(ne(users.id, excludeUserId), like(users.username, `%${query}%`)))
    .limit(20);
}

export async function getAllUsers(excludeUserId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).where(ne(users.id, excludeUserId)).limit(50);
}

// ─── Posts ────────────────────────────────────────────────────────────────────

export async function createPost(data: { userId: number; imageKey: string; imageUrl: string; caption?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(posts).values(data);
  return result;
}

export async function getFeedPosts(currentUserId: number) {
  const db = await getDb();
  if (!db) return [];

  const allPosts = await db
    .select({
      id: posts.id,
      userId: posts.userId,
      imageKey: posts.imageKey,
      imageUrl: posts.imageUrl,
      caption: posts.caption,
      createdAt: posts.createdAt,
      username: users.username,
      name: users.name,
    })
    .from(posts)
    .leftJoin(users, eq(posts.userId, users.id))
    .orderBy(desc(posts.createdAt))
    .limit(50);

  const allLikes = await db.select().from(likes);

  return allPosts.map((post) => {
    const postLikes = allLikes.filter((l) => l.postId === post.id);
    return {
      ...post,
      likeCount: postLikes.length,
      likedByMe: postLikes.some((l) => l.userId === currentUserId),
    };
  });
}

export async function getPostsByUser(userId: number, currentUserId: number) {
  const db = await getDb();
  if (!db) return [];

  const userPosts = await db
    .select()
    .from(posts)
    .where(eq(posts.userId, userId))
    .orderBy(desc(posts.createdAt));

  const allLikes = await db.select().from(likes);

  return userPosts.map((post) => {
    const postLikes = allLikes.filter((l) => l.postId === post.id);
    return {
      ...post,
      likeCount: postLikes.length,
      likedByMe: postLikes.some((l) => l.userId === currentUserId),
    };
  });
}

export async function searchPosts(query: string, currentUserId: number) {
  const db = await getDb();
  if (!db) return [];

  const matched = await db
    .select({
      id: posts.id,
      userId: posts.userId,
      imageKey: posts.imageKey,
      imageUrl: posts.imageUrl,
      caption: posts.caption,
      createdAt: posts.createdAt,
      username: users.username,
      name: users.name,
    })
    .from(posts)
    .leftJoin(users, eq(posts.userId, users.id))
    .orderBy(desc(posts.createdAt))
    .limit(50);

  const q = query.toLowerCase();
  const filtered = matched.filter(
    (p) =>
      (p.username ?? "").toLowerCase().includes(q) ||
      (p.caption ?? "").toLowerCase().includes(q)
  );

  const allLikes = await db.select().from(likes);
  return filtered.map((post) => {
    const postLikes = allLikes.filter((l) => l.postId === post.id);
    return {
      ...post,
      likeCount: postLikes.length,
      likedByMe: postLikes.some((l) => l.userId === currentUserId),
    };
  });
}

// ─── Likes ────────────────────────────────────────────────────────────────────

export async function toggleLike(postId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db
    .select()
    .from(likes)
    .where(and(eq(likes.postId, postId), eq(likes.userId, userId)))
    .limit(1);

  if (existing.length > 0) {
    await db.delete(likes).where(and(eq(likes.postId, postId), eq(likes.userId, userId)));
    return { liked: false };
  } else {
    await db.insert(likes).values({ postId, userId });
    return { liked: true };
  }
}

// ─── Chats ────────────────────────────────────────────────────────────────────

export async function getOrCreateChat(user1Id: number, user2Id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db
    .select()
    .from(chats)
    .where(
      or(
        and(eq(chats.user1Id, user1Id), eq(chats.user2Id, user2Id)),
        and(eq(chats.user1Id, user2Id), eq(chats.user2Id, user1Id))
      )
    )
    .limit(1);

  if (existing.length > 0) return existing[0]!;

  const [result] = await db.insert(chats).values({ user1Id, user2Id });
  const newChat = await db.select().from(chats).where(eq(chats.id, (result as any).insertId)).limit(1);
  return newChat[0]!;
}

export async function getUserChats(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const userChats = await db
    .select()
    .from(chats)
    .where(or(eq(chats.user1Id, userId), eq(chats.user2Id, userId)))
    .orderBy(desc(chats.createdAt));

  const result = [];
  for (const chat of userChats) {
    const otherId = chat.user1Id === userId ? chat.user2Id : chat.user1Id;
    const otherUser = await getUserById(otherId);
    const lastMsg = await db
      .select()
      .from(messages)
      .where(eq(messages.chatId, chat.id))
      .orderBy(desc(messages.createdAt))
      .limit(1);

    result.push({
      ...chat,
      otherUser: otherUser ?? null,
      lastMessage: lastMsg[0] ?? null,
    });
  }
  return result;
}

export async function getChatMessages(chatId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(messages)
    .where(eq(messages.chatId, chatId))
    .orderBy(messages.createdAt);
}

export async function sendMessage(chatId: number, senderId: number, text: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(messages).values({ chatId, senderId, text });
}

export async function verifyChatAccess(chatId: number, userId: number) {
  const db = await getDb();
  if (!db) return false;
  const chat = await db.select().from(chats).where(eq(chats.id, chatId)).limit(1);
  if (!chat[0]) return false;
  return chat[0].user1Id === userId || chat[0].user2Id === userId;
}
