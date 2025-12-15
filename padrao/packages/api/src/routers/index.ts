import { protectedProcedure, publicProcedure, router } from "../index";
import { profileRouter } from "./profile";
import { moderationRouter } from "./moderation";

export const appRouter = router({
	healthCheck: publicProcedure.query(() => {
		return "OK";
	}),
	privateData: protectedProcedure.query(({ ctx }) => {
		return {
			message: "This is private",
			user: ctx.session.user,
		};
	}),
	profile: profileRouter,
	moderation: moderationRouter,
});
export type AppRouter = typeof appRouter;
