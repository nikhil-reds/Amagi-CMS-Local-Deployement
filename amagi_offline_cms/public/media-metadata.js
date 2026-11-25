/* Metadata only: never creates a preview, iframe, image or playing media element. */
;(function () {
  const base = document.currentScript.src
  let library
  window.MediaMetadataReader = {
    async read(asset, signal) {
      const url = asset.document.s3Url
      if (asset.kind === 'pdf') {
        library ||= import(new URL('./pdfjs/pdf.mjs', base).href).then(pdf => {
          pdf.GlobalWorkerOptions.workerSrc = new URL('./pdfjs/pdf.worker.mjs', base).href
          return pdf
        })
        const pdf = await library
        if (signal.aborted) return {}
        const task = pdf.getDocument({ url, disableAutoFetch: true, disableStream: true })
        const cancel = () => { task.destroy() }
        signal.addEventListener('abort', cancel, { once: true })
        try { const document = await task.promise; return { pages: document.numPages } }
        finally { signal.removeEventListener('abort', cancel); await task.destroy() }
      }
      if (asset.kind === 'video' || asset.kind === 'audio') {
        return new Promise((resolve, reject) => {
          const media = document.createElement(asset.kind)
          media.preload = 'metadata'; media.muted = true
          const finish = (error) => {
            clearTimeout(timeout); signal.removeEventListener('abort', cancel)
            const duration = Number.isFinite(media.duration) ? media.duration : 0
            media.onloadedmetadata = null; media.onerror = null
            media.removeAttribute('src'); media.load()
            if (error) reject(error); else resolve({ duration })
          }
          const cancel = () => finish(new Error('Cancelled'))
          const timeout = setTimeout(() => finish(new Error('Unable to read media duration')), 20000)
          media.onloadedmetadata = () => finish()
          media.onerror = () => finish(new Error('Unable to read media duration'))
          signal.addEventListener('abort', cancel, { once: true })
          if (signal.aborted) return cancel()
          media.src = url
        })
      }
      return {}
    },
  }
})()
