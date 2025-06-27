import * as crypto from 'crypto';

export function genRandomStr(length: number): string {
  return crypto
    .randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
}

export function safeJsonParse(jsonString: string, defaultValue = null) {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.log('safeJsonParse error', error);
    return defaultValue;
  }
}
