// Test setup - load environment variables before any tests run
import { config } from "dotenv";
import { resolve } from "path";

// Load .env from project root (two levels up from packages/api)
config({ path: resolve(__dirname, "../../../../.env") });

// Ensure encryption variables are set for tests
if (!process.env.ENCRYPTION_SECRET) {
	process.env.ENCRYPTION_SECRET = "test-secret-key-for-tests-32bytes!!";
}
if (!process.env.ENCRYPTION_SALT) {
	process.env.ENCRYPTION_SALT = "test-salt-for-tests-unique-value!!";
}
if (!process.env.DATABASE_URL) {
	process.env.DATABASE_URL = "postgresql://postgres:password@localhost:5432/padrao";
}
