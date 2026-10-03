import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Standard 96-bit nonce for GCM
const AUTH_TAG_LENGTH = 16;

/**
 * Derives a consistent 32-byte key from ENCRYPTION_KEY or a secure deterministic development key.
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY || 'meri-dukan-default-secure-aes-encryption-key-32b';
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypts sensitive text using AES-256-GCM.
 * Output format: base64(iv + authTag + encryptedData)
 */
export function encryptData(plainText: string): string {
  if (!plainText) return '';
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Combine iv (12 bytes) + authTag (16 bytes) + encrypted data
  const combined = Buffer.concat([iv, authTag, encrypted]);
  return combined.toString('base64');
}

/**
 * Decrypts data previously encrypted using AES-256-GCM.
 */
export function decryptData(cipherTextBase64: string): string {
  if (!cipherTextBase64) return '';
  try {
    const key = getEncryptionKey();
    const combined = Buffer.from(cipherTextBase64, 'base64');

    if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH) {
      return '';
    }

    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (error) {
    console.error('Decryption failed:', error);
    return '';
  }
}

/**
 * Masks a sensitive number or string, showing only the last 4 characters.
 * Example: "123456789012" -> "••••••••9012"
 */
export function maskSensitive(value: string | null | undefined, visibleCount = 4): string {
  if (!value) return '';
  const str = String(value).trim();
  if (str.length <= visibleCount) return str;
  const maskedLength = str.length - visibleCount;
  return '•'.repeat(Math.max(maskedLength, 4)) + str.slice(-visibleCount);
}
