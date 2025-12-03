import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scrypt,
  createHash,
} from 'crypto';
import { promisify } from 'util';
@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits
  private readonly saltLength = 64;
  private readonly tagLength = 16;
  constructor(private configService: ConfigService) {}
  private async getKey(salt: Buffer): Promise<Buffer> {
    const password =
      this.configService.get<string>('ENCRYPTION_KEY') ||
      'default-key-change-in-production';
    const scryptAsync = promisify(scrypt);
    return (await scryptAsync(password, salt, this.keyLength)) as Buffer;
  }
  async encrypt(plaintext: string): Promise<string> {
    if (!plaintext) {
      return plaintext;
    }
    const salt = randomBytes(this.saltLength);
    const iv = randomBytes(this.ivLength);
    const key = await this.getKey(salt);
    const cipher = createCipheriv(this.algorithm, key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    const combined = Buffer.concat([salt, iv, authTag, encrypted]);
    return combined.toString('hex');
  }
  async decrypt(encryptedData: string): Promise<string> {
    if (!encryptedData) {
      return encryptedData;
    }
    try {
      const combined = Buffer.from(encryptedData, 'hex');
      const salt = combined.subarray(0, this.saltLength);
      const iv = combined.subarray(
        this.saltLength,
        this.saltLength + this.ivLength,
      );
      const authTag = combined.subarray(
        this.saltLength + this.ivLength,
        this.saltLength + this.ivLength + this.tagLength,
      );
      const encrypted = combined.subarray(
        this.saltLength + this.ivLength + this.tagLength,
      );
      const key = await this.getKey(salt);
      const decipher = createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(authTag);
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
      ]);
      return decrypted.toString('utf8');
    } catch {
      throw new Error('Failed to decrypt data');
    }
  }
  hash(data: string): string {
    return createHash('sha256').update(data).digest('hex');
  }
}
