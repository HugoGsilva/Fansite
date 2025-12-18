import { describe, it, expect, beforeAll } from "bun:test";
import fc from "fast-check";
import { encrypt, decrypt, isValidCiphertext } from "../services/encryption";

// Set test encryption secrets
beforeAll(() => {
	process.env.ENCRYPTION_SECRET = "test-secret-key-for-encryption-tests-32bytes";
	process.env.ENCRYPTION_SALT = "test-salt-for-encryption-tests-unique";
});

/**
 * Property 19: Message Encryption Round-Trip
 * For any chat message, encrypting then decrypting should produce the original message content.
 * Validates: Requirements 6.5, 12.2
 * **Feature: rubin-market, Property 19: Message Encryption Round-Trip**
 */
describe("Feature: rubin-market, Property 19: Message Encryption Round-Trip", () => {
	it("should preserve message content after encrypt/decrypt cycle", () => {
		fc.assert(
			fc.property(
				fc.string({ minLength: 1, maxLength: 2000 }),
				(message) => {
					const encrypted = encrypt(message);
					const decrypted = decrypt(encrypted);

					expect(decrypted).toBe(message);
				},
			),
			{ numRuns: 50 },
		);
	}, 10000);

	it("should produce different ciphertexts for same plaintext (due to random IV)", () => {
		const message = "Test message for encryption";

		const encrypted1 = encrypt(message);
		const encrypted2 = encrypt(message);

		// Different ciphertexts due to random IV
		expect(encrypted1).not.toBe(encrypted2);

		// But both decrypt to same value
		expect(decrypt(encrypted1)).toBe(message);
		expect(decrypt(encrypted2)).toBe(message);
	});

	it("should produce valid ciphertext format", () => {
		fc.assert(
			fc.property(
				fc.string({ minLength: 1, maxLength: 500 }),
				(message) => {
					const encrypted = encrypt(message);

					expect(isValidCiphertext(encrypted)).toBe(true);

					// Should have 3 parts separated by colons
					const parts = encrypted.split(":");
					expect(parts.length).toBe(3);

					// IV should be 32 hex chars (16 bytes)
					expect(parts[0].length).toBe(32);

					// Auth tag should be 32 hex chars (16 bytes)
					expect(parts[1].length).toBe(32);

					// Encrypted data should exist
					expect(parts[2].length).toBeGreaterThan(0);
				},
			),
			{ numRuns: 100 },
		);
	});

	it("should handle unicode and special characters", () => {
		const testCases = [
			"Hello, 世界! 🌍",
			"Émojis: 😀🎉🔥💯",
			"Special chars: @#$%^&*(){}[]|\\",
			"Newlines:\nand\ttabs",
			"Русский текст",
			"日本語テキスト",
		];

		for (const message of testCases) {
			const encrypted = encrypt(message);
			const decrypted = decrypt(encrypted);
			expect(decrypted).toBe(message);
		}
	});

	it("should handle empty-ish edge cases", () => {
		const testCases = [" ", "  ", "\n", "\t", "a"];

		for (const message of testCases) {
			const encrypted = encrypt(message);
			const decrypted = decrypt(encrypted);
			expect(decrypted).toBe(message);
		}
	});

	it("should reject tampered ciphertext", () => {
		const message = "Original message";
		const encrypted = encrypt(message);

		// Tamper with the encrypted data
		const parts = encrypted.split(":");
		const tamperedParts = [...parts];
		tamperedParts[2] = tamperedParts[2].slice(0, -2) + "00"; // Modify last byte

		const tamperedCiphertext = tamperedParts.join(":");

		expect(() => decrypt(tamperedCiphertext)).toThrow();
	});

	it("should reject invalid ciphertext formats", () => {
		const invalidFormats = [
			"invalid",
			"only:two",
			"",
			"a:b:c:d",
			"notHex:notHex:notHex",
		];

		for (const invalid of invalidFormats) {
			expect(isValidCiphertext(invalid)).toBe(false);
		}
	});
});
