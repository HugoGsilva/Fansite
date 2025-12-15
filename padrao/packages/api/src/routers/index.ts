import { protectedProcedure, publicProcedure, router } from "../index";
import { profileRouter } from "./profile";
import { moderationRouter } from "./moderation";
import { datasetRouter } from "./dataset";
import { listingsRouter } from "./listings";
import { chatRouter } from "./chat";
import { notificationsRouter } from "./notifications";
import { reportsRouter } from "./reports";

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
	dataset: datasetRouter,
	listings: listingsRouter,
	chat: chatRouter,
	notifications: notificationsRouter,
	reports: reportsRouter,
});
export type AppRouter = typeof appRouter;
