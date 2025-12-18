import * as schema from "./schema";

import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";

let _db: NodePgDatabase<typeof schema> | null = null;

function getDb(): NodePgDatabase<typeof schema> {
	if (!_db) {
		const url = process.env.DATABASE_URL;
		if (!url) {
			throw new Error("DATABASE_URL environment variable is required");
		}
		_db = drizzle(url, { schema });
	}
	return _db;
}

export const db = new Proxy({} as NodePgDatabase<typeof schema>, {
	get(_, prop) {
		return (getDb() as any)[prop];
	},
});
