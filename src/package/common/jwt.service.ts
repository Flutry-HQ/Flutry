import jwt, { Algorithm } from 'jsonwebtoken';
import parse_duration from 'parse-duration';
import crypto from 'crypto';
export class JWT {
  private static readonly SECRET_KEY = process.env.JWT_SECRET_KEY || null;
  private static readonly ALGORITHM: Algorithm = 'HS256';
  private static readonly EXPIRATION_TIME = '1h';

  public static generateToken(payload: any, time?: string): string {
    if (this.SECRET_KEY === null) {
      throw new Error('JWT_SECRET_KEY is not defined in environment variables');
    }
    const enhancedPayload = {
      ...payload,
      rand: crypto.randomUUID(),
    };
    const parsedDuration = time ? parse_duration(time) : parse_duration(this.EXPIRATION_TIME);
    return jwt.sign(enhancedPayload, this.SECRET_KEY, {
      expiresIn: parsedDuration ? parsedDuration / 1000 : undefined,
      algorithm: this.ALGORITHM,
    });
  }

  public static verifyToken(token: string): any {
    if (this.SECRET_KEY === null) {
      throw new Error('JWT_SECRET_KEY is not defined in environment variables');
    }
    try {
      return jwt.verify(token, this.SECRET_KEY);
    } catch {
      throw new Error('Invalid token');
    }
  }

  public static decodeToken(token: string): any {
    if (this.SECRET_KEY === null) {
      throw new Error('JWT_SECRET_KEY is not defined in environment variables');
    }
    return jwt.decode(token);
  }

  public static getTokenExpiration(token: string): Date {
    if (this.SECRET_KEY === null) {
      throw new Error('JWT_SECRET_KEY is not defined in environment variables');
    }
    const payload = this.decodeToken(token);
    if (payload && typeof payload === 'object' && 'exp' in payload) {
      return payload.exp;
    }
    throw new Error('Invalid token');
  }
}
