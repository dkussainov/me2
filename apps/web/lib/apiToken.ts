import { SignJWT, jwtVerify } from 'jose';

const TOKEN_ISSUER = 'me2.app';
const TOKEN_AUDIENCE = 'me2.mobile';
const TOKEN_EXPIRY_SECONDS = 30 * 24 * 60 * 60;

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('AUTH_SECRET is not set or too short (min 16 chars).');
  }
  return new TextEncoder().encode(secret);
}

export interface ApiTokenPayload {
  userId: string;
}

export interface SignedApiToken {
  token: string;
  expiresAt: string;
}

export async function signApiToken(payload: ApiTokenPayload): Promise<SignedApiToken> {
  const expSeconds = Math.floor(Date.now() / 1000) + TOKEN_EXPIRY_SECONDS;
  const token = await new SignJWT({ userId: payload.userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.userId)
    .setIssuer(TOKEN_ISSUER)
    .setAudience(TOKEN_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(expSeconds)
    .sign(getSecret());
  return { token, expiresAt: new Date(expSeconds * 1000).toISOString() };
}

export async function verifyApiToken(token: string): Promise<ApiTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE,
    });
    const userId = payload.userId;
    if (typeof userId !== 'string' || userId.length === 0) return null;
    return { userId };
  } catch {
    return null;
  }
}
