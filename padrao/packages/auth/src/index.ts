import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@padrao/db";
import * as schema from "@padrao/db/schema/auth";

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "pg",

		schema: schema,
	}),
	trustedOrigins: [process.env.CORS_ORIGIN || ""],
	emailAndPassword: {
		enabled: true,
	},
	advanced: {
		defaultCookieAttributes: {
			sameSite: "none",
			secure: true,
			httpOnly: true,
		},
	},
});
