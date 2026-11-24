'use client'

import type { PointerEvent as ReactPointerEvent } from 'react'

export const TOUCH_HOVER_EVENT = 'touchdrag:hover'
export const TOUCH_DROP_EVENT = 'touchdrag:drop'
export const ASSIGN_REQUEST_EVENT = 'document:assign-request'

export type TouchHoverDetail = { screenId: string | null }
export type TouchDropDetail<T = unknown> = { screenId: string; payload: T }

const EDGE_SIZE = 56
const SCROLL_STEP = 12

function scrollAtEdge(hit: Element | null, x: number, y: number) {
  let movedX = false
  let movedY = false
  for (let box = hit; box instanceof HTMLElement; box = box.parentElement) {
    if (!box.matches('[data-autoscroll], .console-content') && box !== document.scrollingElement) continue
    const rect = box.getBoundingClientRect()
    const dx = x < Math.max(0, rect.left) + EDGE_SIZE ? -SCROLL_STEP : x > Math.min(innerWidth, rect.right) - EDGE_SIZE ? SCROLL_STEP : 0
    const dy = y < Math.max(0, rect.top) + EDGE_SIZE ? -SCROLL_STEP : y > Math.min(innerHeight, rect.bottom) - EDGE_SIZE ? SCROLL_STEP : 0
    const left = box.scrollLeft
    const top = box.scrollTop
    if (!movedX && dx) box.scrollLeft += dx
    if (!movedY && dy) box.scrollTop += dy
    movedX ||= box.scrollLeft !== left
    movedY ||= box.scrollTop !== top
  }
}

export function startTouchDrag(event: ReactPointerEvent<HTMLElement>, payload: unknown, label: string) {
  if (event.pointerType === 'mouse' || !event.isPrimary || event.button !== 0) return
  event.preventDefault()

  const source = event.currentTarget
  const pointerId = event.pointerId
  const startX = event.clientX
  const startY = event.clientY
  let x = startX
  let y = startY
  let active = false
  let ghost: HTMLDivElement | null = null
  let hover: string | null = null
  let frame = 0

  const setHover = (screenId: string | null) => {
    if (screenId === hover) return
    hover = screenId
    window.dispatchEvent(new CustomEvent<TouchHoverDetail>(TOUCH_HOVER_EVENT, { detail: { screenId } }))
  }

  const tick = () => {
    if (!active) return
    if (!source.isConnected) { cleanup(); return }
    if (ghost) ghost.style.transform = `translate(${x}px, ${y}px) translate(-50%, -130%)`

    const hit = document.elementFromPoint(x, y)
    setHover(hit?.closest<HTMLElement>('[data-drop-screen]')?.dataset.dropScreen ?? null)
    scrollAtEdge(hit, x, y)

    frame = requestAnimationFrame(tick)
  }

  const activate = () => {
    active = true
    navigator.vibrate?.(15)
    try {
      source.setPointerCapture(pointerId)
    } catch {
      // Pointer may already be gone; the drag will end via pointercancel.
    }

    ghost = document.createElement('div')
    ghost.textContent = label
    ghost.style.cssText =
      'position:fixed;top:0;left:0;z-index:100;pointer-events:none;max-width:220px;overflow:hidden;' +
      'text-overflow:ellipsis;white-space:nowrap;padding:8px 12px;border-radius:12px;background:#000;color:#fff;' +
      'font:600 12px system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.35);opacity:.95;'
    document.body.appendChild(ghost)
    document.documentElement.style.userSelect = 'none'
    frame = requestAnimationFrame(tick)
  }

  const onMove = (e: PointerEvent) => {
    if (e.pointerId !== pointerId) return
    x = e.clientX
    y = e.clientY

  }

  const onUp = (e: PointerEvent) => {
    if (e.pointerId !== pointerId) return
    if (active) {
      const screenId = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-drop-screen]')?.dataset.dropScreen
      if (screenId) {
        window.dispatchEvent(
          new CustomEvent<TouchDropDetail>(TOUCH_DROP_EVENT, { detail: { screenId, payload } }),
        )
      }

    }
    cleanup()
  }

  const onCancel = (e: PointerEvent) => {
    if (e.pointerId === pointerId) cleanup()
  }

  function cleanup() {
    source.removeEventListener('lostpointercapture', onCancel)
    window.removeEventListener('blur', cleanup)
    cancelAnimationFrame(frame)
    ghost?.remove()
    ghost = null
    active = false
    document.documentElement.style.userSelect = ''
    setHover(null)
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    window.removeEventListener('pointercancel', onCancel)

  }

  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  window.addEventListener('pointercancel', onCancel)
  source.addEventListener('lostpointercapture', onCancel)
  window.addEventListener('blur', cleanup)
  activate()
}
