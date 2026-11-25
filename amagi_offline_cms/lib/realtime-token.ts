import crypto from 'node:crypto'
export const CONTROL_SESSION_MS = 5 * 60 * 1000
function secret() {
  const value = process.env.CENTRIFUGO_TOKEN_SECRET
  if (!value) throw new Error('Centrifugo token secret is not configured')
  return value
}
export function signRealtimeToken(payload: object) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const unsigned = `${header}.${body}`
  return `${unsigned}.${crypto.createHmac('sha256', secret()).update(unsigned).digest('base64url')}`
}
export function validControlSession(token: string | null, userId: string, screenId: string) {
  if (!token) return false
  try {
    const [header, body, signature, extra] = token.split('.')
    if (extra || !header || !body || !signature) return false
    const expected = crypto.createHmac('sha256', secret()).update(`${header}.${body}`).digest()
    const supplied = Buffer.from(signature, 'base64url')
    if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) return false
    const p = JSON.parse(Buffer.from(body, 'base64url').toString())
    return p.purpose === 'controls' && p.sub === userId && p.screenId === screenId && p.exp * 1000 > Date.now()
  } catch { return false }
}
