"use client"

import { useEffect, useState } from "react"
import { ChevronDown } from "lucide-react"
import "./news-simulation.css"

type SimulationScreen = { screenNumber: number; name: string; port: number; url: string }
const ports = Array.from({ length: 12 }, (_, index) => 3000 + index)

export default function NewsSimulationPage() {
  const [screens, setScreens] = useState<SimulationScreen[]>([])
  const [port, setPort] = useState(3000)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const response = await fetch('/api/news-simulation', { signal: controller.signal })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Failed to load screens')
        setScreens(data)
        if (data.length) setPort(data[0].port)
      } catch (error) {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Failed to load screens')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void load()
    return () => controller.abort()
  }, [])

  async function savePort() {
    setSaving(true)
    setError("")
    setMessage("")
    try {
      const response = await fetch('/api/news-simulation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to save screens')
      setScreens(data)
      setMessage('All 12 screens saved.')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to save screens')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="news-simulation-page">
      <header className="news-simulation-heading">
        <h1>News Simulation</h1>
        <div className="news-simulation-source">
          <label htmlFor="simulation-port">Universal localhost port</label>
          <div className="news-simulation-select">
            <span>localhost:</span>
            <select id="simulation-port" value={port} disabled={loading || saving} onChange={(event) => { setPort(Number(event.target.value)); setMessage("") }} aria-label="Universal localhost port for all 12 screens">
              {ports.map((port) => <option key={port} value={port}>{port}</option>)}
            </select>
            <ChevronDown size={14} aria-hidden="true" />
          </div>
          <button className="news-simulation-save" type="button" onClick={savePort} disabled={loading || saving}>{saving ? 'Saving…' : 'Save all screens'}</button>
        </div>
      </header>
      {error && <p className="news-simulation-error" role="alert">{error}</p>}
      {message && <p className="news-simulation-message" role="status">{message}</p>}

      <div className="news-simulation-table-wrap">
        <table className="news-simulation-table" aria-label="News simulation screen ports">
          <thead>
            <tr><th scope="col">Screen Name</th><th scope="col">Port</th><th scope="col">URL</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={3}>Loading screens…</td></tr>}
            {!loading && !screens.length && <tr><td colSpan={3}>No saved screens. Select a port and save all screens.</td></tr>}
            {screens.map((screen) => (
              <tr key={screen.screenNumber}>
                <th scope="row">{screen.name}</th>
                <td>{screen.port}</td>
                <td className="news-simulation-url">{screen.url}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
