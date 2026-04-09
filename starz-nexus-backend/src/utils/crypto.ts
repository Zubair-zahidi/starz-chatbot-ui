import crypto from 'crypto';
import { config } from '../config';

type EncryptedPayload = {
  ciphertext: string; // base64
  iv: string; // base64
  authTag: string; // base64
  alg: 'aes-256-gcm';
};

function getKey(): Buffer {
  if (!config.DATA_ENCRYPTION_KEY) {
    throw new Error('DATA_ENCRYPTION_KEY is not set');
  }

  const key = Buffer.from(config.DATA_ENCRYPTION_KEY, 'base64');
  if (key.length !== 32) {
    throw new Error('DATA_ENCRYPTION_KEY must be 32 bytes (base64)');
  }
  return key;
}

export function encryptString(plaintext: string): EncryptedPayload {
  const key = getKey();
  const iv = crypto.randomBytes(12); // recommended for GCM

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    alg: 'aes-256-gcm',
  };
}

export function decryptString(payload: EncryptedPayload): string {
  if (payload.alg !== 'aes-256-gcm') {
    throw new Error(`Unsupported alg: ${payload.alg}`);
  }
  const key = getKey();

  const iv = Buffer.from(payload.iv, 'base64');
  const authTag = Buffer.from(payload.authTag, 'base64');
  const ciphertext = Buffer.from(payload.ciphertext, 'base64');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString('utf8');
}

