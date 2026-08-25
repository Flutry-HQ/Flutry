import argon2 from 'argon2';
import crypto from 'crypto';

export class Encryption {
  public static hashPassword = async (password: string) => {
    try {
      const argon2Hash = await argon2.hash(password, {
        type: argon2.argon2id,
        timeCost: 6,
        memoryCost: 2 ** 17,
        parallelism: 2,
      });
      const encrypted = Encryption.encrypt(argon2Hash);
      return encrypted;
    } catch (error) {
      throw new Error('An error occurred while hashing the password');
    }
  };

  public static comparePassword = async (password: string, hashedPassword: string) => {
    try {
      const decryptedHash = Encryption.decrypt(hashedPassword);
      const isMatch = await argon2.verify(decryptedHash, password);
      return isMatch;
    } catch (error) {
      return false;
    }
  };

  private static getKey(secret?: string) {
    return crypto.scryptSync(secret ?? process.env.SECRET_KEY!, process.env.SECRET_SALT!, 32);
  }

  public static encrypt = (text: string, secret?: string) => {
    const key = this.getKey(secret);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]).toString('base64');
  };

  public static decrypt = (data: string, secret?: string) => {
    const key = this.getKey(secret);
    const buffer = Buffer.from(data, 'base64');
    const iv = buffer.subarray(0, 12);
    const tag = buffer.subarray(12, 28);
    const text = buffer.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(text, undefined, 'utf8') + decipher.final('utf8');
  };
}
