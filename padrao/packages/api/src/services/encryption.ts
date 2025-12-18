import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = 32;

function getEncryptionKey(): Buffer {
	const secret = process.env.ENCRYPTION_SECRET;
	if (!secret) {
		throw new Error("ENCRYPTION_SECRET environment variable is required");
	}
	const salt = process.env.ENCRYPTION_SALT;
	if (!salt) {
		throw new Error("ENCRYPTION_SALT environment variable is required");
	}
	// Derive a 32-byte key from the secret using scrypt
	return scryptSync(secret, salt, 32);
}

export function encrypt(plaintext: string): string {
	const key = getEncryptionKey();
	const iv = randomBytes(IV_LENGTH);

	const cipher = createCipheriv(ALGORITHM, key, iv);
	let encrypted = cipher.update(plaintext, "utf8", "hex");
	encrypted += cipher.final("hex");

	const authTag = cipher.getAuthTag();

	// Format: iv:authTag:encryptedData (all in hex)
	return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

export function decrypt(ciphertext: string): string {
	const key = getEncryptionKey();

	const parts = ciphertext.split(":");
	if (parts.length !== 3) {
		throw new Error("Invalid ciphertext format");
	}

	const iv = Buffer.from(parts[0], "hex");
	const authTag = Buffer.from(parts[1], "hex");
	const encrypted = parts[2];

	if (iv.length !== IV_LENGTH) {
		throw new Error("Invalid IV length");
	}

	if (authTag.length !== TAG_LENGTH) {
		throw new Error("Invalid auth tag length");
	}

	const decipher = createDecipheriv(ALGORITHM, key, iv);
	decipher.setAuthTag(authTag);

	let decrypted = decipher.update(encrypted, "hex", "utf8");
	decrypted += decipher.final("utf8");

	return decrypted;
}

export function isValidCiphertext(value: string): boolean {
	try {
		const parts = value.split(":");
		if (parts.length !== 3) return false;

		const iv = Buffer.from(parts[0], "hex");
		const authTag = Buffer.from(parts[1], "hex");

		return iv.length === IV_LENGTH && authTag.length === TAG_LENGTH;
	} catch {
		return false;
	}
}
