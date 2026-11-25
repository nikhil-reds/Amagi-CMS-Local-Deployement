/* Shared browser/XOS renderer. Settings update in place, so changing volume never restarts a video. */
;(function (global) {
  const scriptUrl = document.currentScript?.src || new URL('/media-runtime.js', location.href).href
  let pdfLibrary
  function loadPdfLibrary() {
    return pdfLibrary ||= import(new URL('./pdfjs/pdf.mjs', scriptUrl).href).then(lib => {
      lib.GlobalWorkerOptions.workerSrc = new URL('./pdfjs/pdf.worker.mjs', scriptUrl).href
      return lib
    })
  }
  function mount(host, item, options = {}) {
    let settings = {}, frameKey = '', refreshTimer, previousTimeKey = '', disposed = false
    const doc = item.document || item
    const kind = item.kind
    const source = doc.websiteUrl || doc.s3Url || item.src || ''
    host.style.cssText = 'position:relative;width:100%;height:100%;overflow:hidden;background:black;'
    const element = document.createElement(kind === 'pdf' ? 'div' : kind === 'image' ? 'img' : kind === 'video' || kind === 'audio' ? kind : 'iframe')
    element.style.cssText = 'display:block;width:100%;height:100%;border:0;'
    element.title = doc.name || item.name || ''
    if (kind === 'image') element.alt = element.title
    if (kind === 'video' || kind === 'audio') {
      element.src = source
      element.controls = !options.kiosk
      element.playsInline = true
      element.muted = Boolean(options.preview)
      element.preload = 'metadata'
    } else if (kind === 'image') element.src = source
    let pdfDocument, pdfTask, pdfRender, thumbnailObserver, pdfGeneration = 0
    let pdfKey = '', pdfPage = 1
    const pdfToolbar = document.createElement('div')
    const pdfIndex = document.createElement('div')
    const pdfViewport = document.createElement('div')
    if (kind === 'pdf') {
      element.style.cssText = 'display:flex;flex-direction:column;width:100%;height:100%;background:#27272a;'
      pdfToolbar.style.cssText = 'flex:none;display:flex;gap:12px;align-items:center;padding:8px;background:#18181b;color:white;font:12px sans-serif;'
      const row = document.createElement('div'); row.style.cssText = 'display:flex;flex:1;min-height:0;'
      pdfIndex.style.cssText = 'flex:none;width:80px;overflow:auto;padding:6px;background:#18181b;'
      pdfViewport.style.cssText = 'flex:1;min-width:0;min-height:0;overflow:auto;text-align:center;'
      row.append(pdfIndex, pdfViewport); element.append(pdfToolbar, row)
    }
    async function renderPdf() {
      if (kind !== 'pdf' || disposed) return
      const generation = ++pdfGeneration
      try {
        if (!pdfTask) {
          const lib = await loadPdfLibrary()
          if (disposed || generation !== pdfGeneration) return
          pdfTask = lib.getDocument({ url: source, cMapUrl: new URL('./pdfjs/cmaps/', scriptUrl).href, cMapPacked: true, standardFontDataUrl: new URL('./pdfjs/standard_fonts/', scriptUrl).href, wasmUrl: new URL('./pdfjs/wasm/', scriptUrl).href })
        }
        pdfDocument ||= await pdfTask.promise
        if (disposed || generation !== pdfGeneration) return
        pdfPage = Math.max(1, Math.min(settings.page, pdfDocument.numPages))
        report({ pages: pdfDocument.numPages, page: pdfPage })
        pdfToolbar.style.display = settings.toolbar ? 'flex' : 'none'
        pdfIndex.style.display = settings.thumbnails ? 'block' : 'none'
        pdfToolbar.replaceChildren()
        for (const [label, step] of [['Previous', -1], ['Next', 1]]) {
          const button = document.createElement('button'); button.textContent = label; button.type = 'button'
          button.disabled = step < 0 ? pdfPage === 1 : pdfPage === pdfDocument.numPages
          button.onclick = () => { settings = { ...settings, page: pdfPage + step }; renderPdf() }
          pdfToolbar.append(button)
        }
        const label = document.createElement('span'); label.textContent = `Page ${pdfPage} / ${pdfDocument.numPages}`; pdfToolbar.append(label)
        if (settings.thumbnails && !pdfIndex.children.length) {
          thumbnailObserver = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => {
            for (const entry of entries) {
              if (!entry.isIntersecting) continue
              thumbnailObserver.unobserve(entry.target)
              const button = entry.target
              pdfDocument.getPage(Number(button.dataset.page)).then(page => {
                if (disposed) return
                const raw = page.getViewport({ scale: 1 })
                const viewport = page.getViewport({ scale: 60 / raw.width })
                const canvas = document.createElement('canvas'); canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height)
                canvas.style.cssText = 'display:block;margin:0 auto 6px;background:white;'
                return page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise.then(() => { if (!disposed) button.prepend(canvas) })
              }).catch(() => {})
            }
          }, { root: pdfIndex })
          for (let i = 1; i <= pdfDocument.numPages; i++) {
            const button = document.createElement('button'); button.textContent = `Page ${i}`; button.type = 'button'
            button.style.cssText = 'display:block;width:100%;padding:10px 3px;margin-bottom:4px;border:1px solid #52525b;border-radius:4px;background:#27272a;color:white;cursor:pointer;font-size:11px;'
            button.dataset.page = String(i)
            button.onclick = () => { settings = { ...settings, page: i }; renderPdf() }; pdfIndex.append(button); thumbnailObserver?.observe(button)
          }
        }
        const page = await pdfDocument.getPage(pdfPage)
        if (disposed || generation !== pdfGeneration) return
        const raw = page.getViewport({ scale: 1, rotation: settings.rotation })
        const widthScale = Math.max(50, pdfViewport.clientWidth - 16) / raw.width
        const heightScale = Math.max(50, pdfViewport.clientHeight - 16) / raw.height
        const scale = (settings.scale === 'width' ? widthScale : settings.scale === 'page' ? Math.min(widthScale, heightScale) : 1) * settings.zoom / 100
        const viewport = page.getViewport({ scale, rotation: settings.rotation })
        const ratio = Math.min(global.devicePixelRatio || 1, 2)
        const canvas = document.createElement('canvas')
        canvas.width = Math.ceil(viewport.width * ratio); canvas.height = Math.ceil(viewport.height * ratio)
        canvas.style.cssText = `width:${viewport.width}px;height:${viewport.height}px;display:inline-block;margin:8px;background:white;`
        pdfRender?.cancel()
        pdfRender = page.render({ canvasContext: canvas.getContext('2d'), viewport, transform: ratio === 1 ? null : [ratio, 0, 0, ratio, 0, 0] })
        await pdfRender.promise
        if (disposed || generation !== pdfGeneration) return
        pdfViewport.replaceChildren(canvas); message.style.display = 'none'
      } catch (e) { if (!disposed && generation === pdfGeneration && e.name !== 'RenderingCancelledException') error('Unable to render PDF. Check the file and connection.') }
    }
    function applyImage() {
      if (kind !== 'image') return
      const sideways = settings.rotation % 180 !== 0
      element.style.position = 'absolute'; element.style.left = '50%'; element.style.top = '50%'
      element.style.width = `${sideways ? host.clientHeight : host.clientWidth}px`
      element.style.height = `${sideways ? host.clientWidth : host.clientHeight}px`
      element.style.transform = `translate(-50%, -50%) rotate(${settings.rotation}deg)`
    }
    const resize = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => { if (kind === 'pdf') renderPdf(); else if (kind === 'image') applyImage() }) : null
    resize?.observe(host)
    const message = document.createElement('div')
    message.style.cssText = 'position:absolute;bottom:10px;left:10px;right:10px;padding:8px;background:#18181bdd;color:white;font:12px sans-serif;border-radius:6px;display:none;z-index:2;'
    function report(status) { options.onStatus?.(status) }
    function error(text) { message.textContent = text; message.style.display = 'block'; report({ error: text }) }
    element.addEventListener('error', () => error('Could not load this media. Check its URL and connection.'))
    const ready = () => {
      report({ duration: Number.isFinite(element.duration) ? element.duration : 0, currentTime: element.currentTime || 0 })
      applyMedia(true)
    }
    element.addEventListener('loadedmetadata', ready)
    element.addEventListener('timeupdate', () => report({ duration: Number.isFinite(element.duration) ? element.duration : 0, currentTime: element.currentTime || 0 }))
    host.replaceChildren(element, message)
    function applyMedia(force) {
      if (kind !== 'video' && kind !== 'audio') return
      element.volume = settings.volume / 100
      element.playbackRate = settings.rate
      element.loop = settings.loop
      const key = `${settings.position}:${settings.positionAt}`
      if ((force || key !== previousTimeKey) && element.readyState >= 1) {
        let time = settings.position + (!settings.paused && settings.autoplay && settings.positionAt ? Math.max(0, Date.now() - settings.positionAt) / 1000 * settings.rate : 0)
        if (Number.isFinite(element.duration) && element.duration > 0) time = settings.loop ? time % element.duration : Math.min(time, element.duration)
        try { element.currentTime = time } catch {}
        previousTimeKey = key
      }
      if (options.preview || settings.paused || !settings.autoplay) element.pause()
      else if (element.paused && !element.ended) {
        element.play().then(() => { message.style.display = 'none' }).catch(() => error('Playback blocked. Click the player to enable sound and playback.'))
      }
    }
    const resume = () => { if (!options.preview && !settings.paused && settings.autoplay) element.play?.().then(() => { message.style.display = 'none' }).catch(() => {}) }
    host.addEventListener('click', resume)
    function update(next) {
      if (disposed) return
      const old = settings
      settings = { page: 1, zoom: 100, scale: 'width', rotation: 0, toolbar: false, thumbnails: false, paused: false, volume: 70, rate: 1, loop: true, autoplay: true, position: 0, positionAt: 0, fit: 'contain', url: '', refresh: 0, reload: 0, background: 'black', ...next }
      if (kind === 'video' || kind === 'audio') {
        element.style.objectFit = settings.fit
        applyMedia(false)
      } else if (kind === 'pdf') {
        const key = JSON.stringify([settings.page, settings.zoom, settings.scale, settings.rotation, settings.toolbar, settings.thumbnails])
        if (key !== pdfKey) { pdfKey = key; renderPdf() }
      } else if (kind === 'website') {
        const key = `${settings.url || source}|${settings.reload}`
        if (key !== frameKey) { element.src = settings.url || source; frameKey = key }
        const zoom = settings.zoom / 100
        element.style.transformOrigin = 'top left'
        element.style.transform = `scale(${zoom})`
        element.style.width = `${100 / zoom}%`; element.style.height = `${100 / zoom}%`
        if (old.refresh !== settings.refresh || old.url !== settings.url) {
          clearInterval(refreshTimer)
          if (settings.refresh > 0) refreshTimer = setInterval(() => { element.src = settings.url || source }, settings.refresh * 1000)
        }
      } else if (kind === 'image') {
        host.style.background = settings.background
        element.style.objectFit = settings.fit
        element.style.background = 'transparent'
        applyImage()
      }
    }
    update(item.controls || {})
    return { update, element, destroy() { disposed = true; pdfGeneration++; pdfRender?.cancel(); thumbnailObserver?.disconnect(); pdfTask?.destroy(); resize?.disconnect(); clearInterval(refreshTimer); host.removeEventListener('click', resume); if (kind === 'video' || kind === 'audio') { element.pause(); element.removeAttribute('src'); element.load() }; host.replaceChildren() } }
  }
  global.MediaRuntime = { mount }
})(typeof window === 'undefined' ? globalThis : window)
