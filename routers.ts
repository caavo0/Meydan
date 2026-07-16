import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  createPost,
  getAllUsers,
  getChatMessages,
  getFeedPosts,
  getOrCreateChat,
  getPostsByUser,
  getUserById,
  getUserChats,
  searchPosts,
  searchUsers,
  sendMessage,
  toggleLike,
  updateUserProfile,
  verifyChatAccess,
} from "./db";
import { storagePut } from "./storage";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── User ─────────────────────────────────────────────────────────────────
  user: router({
    me: protectedProcedure.query(async ({ ctx }) => {
      return getUserById(ctx.user.id);
    }),

    updateProfile: protectedProcedure
      .input(
        z.object({
          username: z.string().min(2).max(64).optional(),
          bio: z.string().max(300).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await updateUserProfile(ctx.user.id, input);
        return { success: true };
      }),

    search: protectedProcedure
      .input(z.object({ query: z.string() }))
      .query(async ({ ctx, input }) => {
        if (!input.query.trim()) return getAllUsers(ctx.user.id);
        return searchUsers(input.query, ctx.user.id);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getUserById(input.id);
      }),
  }),

  // ─── Post ─────────────────────────────────────────────────────────────────
  post: router({
    feed: protectedProcedure.query(async ({ ctx }) => {
      return getFeedPosts(ctx.user.id);
    }),

    myPosts: protectedProcedure.query(async ({ ctx }) => {
      return getPostsByUser(ctx.user.id, ctx.user.id);
    }),

    userPosts: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ ctx, input }) => {
        return getPostsByUser(input.userId, ctx.user.id);
      }),

    search: protectedProcedure
      .input(z.object({ query: z.string() }))
      .query(async ({ ctx, input }) => {
        if (!input.query.trim()) return getFeedPosts(ctx.user.id);
        return searchPosts(input.query, ctx.user.id);
      }),

    create: protectedProcedure
      .input(
        z.object({
          imageBase64: z.string(),
          mimeType: z.string().default("image/jpeg"),
          caption: z.string().max(2200).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const base64Data = input.imageBase64.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        const ext = input.mimeType.split("/")[1] ?? "jpg";
        const fileKey = `posts/${ctx.user.id}/${Date.now()}.${ext}`;

        const { key, url } = await storagePut(fileKey, buffer, input.mimeType);

        await createPost({
          userId: ctx.user.id,
          imageKey: key,
          imageUrl: url,
          caption: input.caption,
        });

        return { success: true };
      }),

    toggleLike: protectedProcedure
      .input(z.object({ postId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return toggleLike(input.postId, ctx.user.id);
      }),
  }),

  // ─── Chat ─────────────────────────────────────────────────────────────────
  chat: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getUserChats(ctx.user.id);
    }),

    getOrCreate: protectedProcedure
      .input(z.object({ otherUserId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const chat = await getOrCreateChat(ctx.user.id, input.otherUserId);
        return chat;
      }),

    messages: protectedProcedure
      .input(z.object({ chatId: z.number() }))
      .query(async ({ ctx, input }) => {
        const hasAccess = await verifyChatAccess(input.chatId, ctx.user.id);
        if (!hasAccess) throw new TRPCError({ code: "FORBIDDEN" });
        return getChatMessages(input.chatId);
      }),

    send: protectedProcedure
      .input(z.object({ chatId: z.number(), text: z.string().min(1).max(2000) }))
      .mutation(async ({ ctx, input }) => {
        const hasAccess = await verifyChatAccess(input.chatId, ctx.user.id);
        if (!hasAccess) throw new TRPCError({ code: "FORBIDDEN" });
        await sendMessage(input.chatId, ctx.user.id, input.text);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
