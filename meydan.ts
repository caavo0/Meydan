import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

// Mock db module
vi.mock("./db", () => ({
  getFeedPosts: vi.fn().mockResolvedValue([
    {
      id: 1,
      userId: 1,
      imageKey: "posts/1/test.jpg",
      imageUrl: "/manus-storage/posts/1/test.jpg",
      caption: "Test gönderi",
      createdAt: new Date("2024-01-01"),
      username: "testuser",
      name: "Test User",
      likeCount: 3,
      likedByMe: false,
    },
  ]),
  getPostsByUser: vi.fn().mockResolvedValue([]),
  searchPosts: vi.fn().mockResolvedValue([]),
  createPost: vi.fn().mockResolvedValue({ insertId: 1 }),
  toggleLike: vi.fn().mockResolvedValue({ liked: true }),
  getUserById: vi.fn().mockResolvedValue({
    id: 1,
    openId: "test-open-id",
    username: "testuser",
    name: "Test User",
    email: "test@example.com",
    bio: null,
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  }),
  getAllUsers: vi.fn().mockResolvedValue([]),
  searchUsers: vi.fn().mockResolvedValue([]),
  updateUserProfile: vi.fn().mockResolvedValue(undefined),
  getUserChats: vi.fn().mockResolvedValue([]),
  getOrCreateChat: vi.fn().mockResolvedValue({ id: 1, user1Id: 1, user2Id: 2, createdAt: new Date() }),
  getChatMessages: vi.fn().mockResolvedValue([]),
  sendMessage: vi.fn().mockResolvedValue(undefined),
  verifyChatAccess: vi.fn().mockResolvedValue(true),
  upsertUser: vi.fn().mockResolvedValue(undefined),
  getUserByOpenId: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ key: "posts/1/test.jpg", url: "/manus-storage/posts/1/test.jpg" }),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function makeCtx(overrides?: Partial<TrpcContext>): TrpcContext {
  const clearedCookies: { name: string; options: Record<string, unknown> }[] = [];
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-open-id",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
    ...overrides,
  };
}

describe("auth", () => {
  it("me returns the current user", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toMatchObject({ id: 1, email: "test@example.com" });
  });

  it("logout clears session cookie", async () => {
    const clearedCookies: { name: string; options: Record<string, unknown> }[] = [];
    const ctx = makeCtx({
      res: {
        clearCookie: (name: string, options: Record<string, unknown>) => {
          clearedCookies.push({ name, options });
        },
      } as TrpcContext["res"],
    });
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
  });
});

describe("post", () => {
  it("feed returns list of posts", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const posts = await caller.post.feed();
    expect(Array.isArray(posts)).toBe(true);
    expect(posts[0]).toMatchObject({ id: 1, caption: "Test gönderi" });
  });

  it("toggleLike returns liked status", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.post.toggleLike({ postId: 1 });
    expect(result).toMatchObject({ liked: true });
  });

  it("create post succeeds with base64 image", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const fakeBase64 = "data:image/jpeg;base64," + Buffer.from("fake-image-data").toString("base64");
    const result = await caller.post.create({
      imageBase64: fakeBase64,
      mimeType: "image/jpeg",
      caption: "Test açıklama",
    });
    expect(result).toMatchObject({ success: true });
  });
});

describe("user", () => {
  it("me returns current user profile", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const user = await caller.user.me();
    expect(user).toMatchObject({ id: 1, username: "testuser" });
  });

  it("search returns users list", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const users = await caller.user.search({ query: "" });
    expect(Array.isArray(users)).toBe(true);
  });
});

describe("chat", () => {
  it("list returns empty array when no chats", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const chats = await caller.chat.list();
    expect(Array.isArray(chats)).toBe(true);
  });

  it("getOrCreate returns a chat object", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const chat = await caller.chat.getOrCreate({ otherUserId: 2 });
    expect(chat).toMatchObject({ id: 1, user1Id: 1, user2Id: 2 });
  });

  it("messages returns array when access is granted", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const msgs = await caller.chat.messages({ chatId: 1 });
    expect(Array.isArray(msgs)).toBe(true);
  });

  it("send returns success", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.chat.send({ chatId: 1, text: "Merhaba!" });
    expect(result).toMatchObject({ success: true });
  });
});
