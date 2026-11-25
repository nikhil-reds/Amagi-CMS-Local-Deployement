// Next can use its bind address in request.url. Playback URLs must use the client-facing host.
export function requestOrigin(request: Request) {
  const url = new URL(request.url)
  const host = request.headers.get('host') || request.headers.get('x-forwarded-host')?.split(',')[0].trim()
  if (host) url.host = host
  const protocol = request.headers.get('x-forwarded-proto')?.split(',')[0].trim()
  if (protocol === 'http' || protocol === 'https') url.protocol = `${protocol}:`
  return url.origin
}
export function reachableAssetUrl(value: string, origin: string) {
  if (!value) return value
  const url = new URL(value, origin)
  // A local storage URL must refer to the CMS computer when the viewer is on another device.
  if (['localhost', '127.0.0.1', '0.0.0.0', '[::1]'].includes(url.hostname)) url.hostname = new URL(origin).hostname
  return url.href
}
