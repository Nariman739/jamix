import crypto from "crypto";

// AES-256-GCM session encryption.
// WA_ENCRYPTION_KEY must be a 32-byte key encoded as base64 (44 chars) or hex (64 chars).
// Generate one with: openssl rand -base64 32

function getKey(): Buffer {
  const raw = process.env.WA_ENCRYPTION_KEY;
  if (!raw) throw new Error("WA_ENCRYPTION_KEY env var is required");
  const buf =
    raw.length === 64 ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  if (buf.length !== 32) {
    throw new Error("WA_ENCRYPTION_KEY must decode to exactly 32 bytes");
  }
  return buf;
}

export function encryptSession(plaintext: Buffer): Buffer {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  // layout: iv(12) | tag(16) | ciphertext
  return Buffer.concat([iv, tag, enc]);
}

export function decryptSession(blob: Buffer): Buffer {
  if (blob.length < 12 + 16 + 1) throw new Error("Encrypted blob too short");
  const iv = blob.subarray(0, 12);
  const tag = blob.subarray(12, 28);
  const ct = blob.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]);
}
