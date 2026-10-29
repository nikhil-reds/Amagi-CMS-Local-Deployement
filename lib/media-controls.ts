export type MediaKind = 'pdf' | 'video' | 'website' | 'image' | 'audio' | 'other'
export type MediaControls = {
  page: number; zoom: number; scale: 'width' | 'page' | 'actual'; rotation: number;
  toolbar: boolean; thumbnails: boolean;
  paused: boolean; volume: number; rate: number; loop: boolean; autoplay: boolean;
  position: number; positionAt: number; fit: 'contain' | 'cover' | 'none';
  url: string; refresh: number; reload: number; background: 'black' | 'white' | 'transparent';
}
export const DEFAULT_CONTROLS: MediaControls = {
  page: 1, zoom: 100, scale: 'width', rotation: 0, toolbar: false, thumbnails: false,
  paused: false, volume: 70, rate: 1, loop: true, autoplay: true, position: 0, positionAt: 0,
  fit: 'contain', url: '', refresh: 0, reload: 0, background: 'black',
}
export function mediaKind(doc: { mimeType: string; websiteUrl?: string | null; sourceType?: string }): MediaKind {
  if (doc.websiteUrl || doc.sourceType === 'WEBSITE') return 'website'
  if (doc.mimeType === 'application/pdf') return 'pdf'
  for (const kind of ['video', 'image', 'audio'] as const) if (doc.mimeType.startsWith(`${kind}/`)) return kind
  return 'other'
}
export function controlsWithDefaults(value: unknown): MediaControls {
  return { ...DEFAULT_CONTROLS, ...(value && typeof value === 'object' && !Array.isArray(value) ? value : {}) }
}
const allowed: Record<MediaKind, string[]> = {
  pdf: ['page', 'zoom', 'scale', 'rotation', 'toolbar', 'thumbnails'],
  video: ['paused', 'volume', 'rate', 'loop', 'autoplay', 'position', 'fit'],
  audio: ['paused', 'volume', 'rate', 'loop', 'autoplay', 'position'],
  website: ['url', 'zoom', 'refresh', 'reload'], image: ['rotation', 'fit', 'background'], other: [],
}
export function validateControlPatch(kind: MediaKind, input: unknown): Partial<MediaControls> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Settings must be an object')
  const entries = Object.entries(input)
  if (!entries.length) throw new Error('No settings supplied')
  const ranges: Record<string, [number, number]> = { page: [1, 100000], zoom: [25, 300], volume: [0, 100], rate: [0.25, 4], position: [0, 604800], refresh: [0, 86400], reload: [0, Number.MAX_SAFE_INTEGER] }
  const enums: Record<string, unknown[]> = { scale: ['width', 'page', 'actual'], rotation: [0, 90, 180, 270], fit: ['contain', 'cover', 'none'], background: ['black', 'white', 'transparent'] }
  for (const [key, value] of entries) {
    if (!allowed[kind].includes(key)) throw new Error(`Setting '${key}' is not available for ${kind}`)
    if (key in ranges) {
      const [min, max] = ranges[key]
      if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || (['page', 'refresh', 'reload'].includes(key) && !Number.isInteger(value))) throw new Error(`Invalid ${key}`)
    } else if (key in enums) {
      if (!enums[key].includes(value)) throw new Error(`Invalid ${key}`)
    } else if (key === 'url') {
      if (typeof value !== 'string' || value.length > 4096) throw new Error('Invalid website address')
      if (value) { let url: URL; try { url = new URL(value) } catch { throw new Error('Enter a complete HTTP or HTTPS address') }; if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error('Only HTTP and HTTPS addresses without credentials are supported') }
    } else if (typeof value !== 'boolean') throw new Error(`Invalid ${key}`)
  }
  return Object.fromEntries(entries) as Partial<MediaControls>
}
export function mediaPosition(settings: MediaControls, now = Date.now()) {
  return Math.max(0, settings.position + (!settings.paused && settings.autoplay && settings.positionAt ? (now - settings.positionAt) / 1000 * settings.rate : 0))
}
