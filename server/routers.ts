import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { startTelegramMonitor, getMonitorResults } from "./telegram";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(({ ctx }) => ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => { ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 }); return { success: true } as const; }),
  }),
  monitor: router({
    challenge: publicProcedure.input(z.object({ domain: z.string().min(3) })).mutation(async ({ input, ctx }) => {
      const origin = process.env.PUBLIC_BASE_URL?.trim() || (typeof ctx.req.headers.origin === "string" ? ctx.req.headers.origin : `${ctx.req.protocol}://${ctx.req.get("host")}`);
      return startTelegramMonitor(input.domain, origin);
    }),
    results: publicProcedure.input(z.object({ domain: z.string().min(3) })).query(({ input }) => getMonitorResults(input.domain)),
  }),
});
export type AppRouter = typeof appRouter;
