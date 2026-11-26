import crypto from 'node:crypto'

export function keysMatch(input, expected) {
  const left = crypto.createHash('sha256').update(String(input ?? '')).digest()
  const right = crypto.createHash('sha256').update(String(expected ?? '')).digest()
  return crypto.timingSafeEqual(left, right)
}

export function signToken(secret) {
  const body = Buffer.from(JSON.stringify({
    role: 'presenter',
    exp: Date.now() + 20 * 60 * 60 * 1000,
  })).toString('base64url')
  const signature = crypto.createHmac('sha256', secret).update(body).digest('base64url')
  return `${body}.${signature}`
}

export function verifyToken(token, secret) {
  if (!secret || typeof token !== 'string' || !token.includes('.')) return false
  const [body, signature] = token.split('.')
  if (!body || !signature) return false
  const expected = crypto.createHmac('sha256', secret).update(body).digest('base64url')
  const left = Buffer.from(signature)
  const right = Buffer.from(expected)
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return false
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString())
    return payload.role === 'presenter' && Number(payload.exp) > Date.now()
  } catch {
    return false
  }
}

export function hashSecret(secret) {
  return crypto.createHash('sha256').update(String(secret)).digest('hex')
}

export function secretMatches(hash, secret) {
  const left = Buffer.from(String(hash || ''), 'hex')
  const right = Buffer.from(hashSecret(secret), 'hex')
  return left.length === right.length && left.length > 0 && crypto.timingSafeEqual(left, right)
}
