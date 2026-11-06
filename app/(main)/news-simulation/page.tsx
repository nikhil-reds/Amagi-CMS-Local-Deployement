"use client"

import { useEffect, useState } from "react"
import { ChevronDown } from "lucide-react"
import "./news-simulation.css"

type SimulationScreen = { screenNumber: number; name: string; port: number; url: string }
type Destination = { id: string; code: string; name: string }
const ports = Array.from({ length: 12 }, (_, index) => 3000 + index)

export default function NewsSimulationPage() {
  const [screens, setScreens] = useState<SimulationScreen[]>([])
  const [address, setAddress] = useState('localhost')
  const [port, setPort] = useState(3000)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [active, setActive] = useState(false)
  const [changing, setChanging] = useState(false)
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [targets, setTargets] = useState<string[]>(['', '', '', ''])

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const response = await fetch('/api/news-simulation', { signal: controller.signal })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Failed to load screens')
        setScreens(data)
        if (data.length) {
          setPort(data[0].port)
          try { setAddress(new URL(data[0].url).hostname) } catch {}
        }
        const stateResponse = await fetch('/api/news-simulation/session', { signal: controller.signal, cache: 'no-store' })
        const state = await stateResponse.json()
        if (!stateResponse.ok) throw new Error(state.error || 'Failed to load simulation state')
        setActive(state.active)
        setDestinations(state.screens)
        setTargets(state.targetScreenIds.length === 4 ? state.targetScreenIds : Array.from({ length: 4 }, (_, index) => state.screens.find((screen: Destination) => screen.name.toLowerCase() === `screen ${String(index + 1).padStart(2, '0')}`)?.id || ''))
      } catch (error) {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Failed to load screens')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void load()
    return () => controller.abort()
  }, [])

  async function changeSimulation(action: 'start' | 'end') {
    setChanging(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/news-simulation/session', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, targetScreenIds: targets }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to change simulation')
      setActive(data.active)
      setTargets(data.targetScreenIds)
      setMessage(data.active ? 'Simulation started on the four selected screens.' : 'Simulation ended. Original content restored.')
      if (data.warning) setError(data.warning)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to change simulation')
    } finally {
      setChanging(false)
    }
  }

  async function savePort() {
    setSaving(true)
    setError("")
    setMessage("")
    try {
      const response = await fetch('/api/news-simulation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, port }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to save screens')
      setScreens(data)
      setMessage(`All ${data.length} screens saved.`)
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
          <div className="news-simulation-fields">
            <label>
              <span>Universal IP address</span>
              <input value={address} disabled={loading || saving || changing || active} onChange={(event) => { setAddress(event.target.value); setMessage("") }} placeholder="192.168.1.100" inputMode="url" autoComplete="url" aria-label="Universal IP address for all simulation screens" />
            </label>
            <label>
              <span>Universal port</span>
              <div className="news-simulation-select">
                <select id="simulation-port" value={port} disabled={loading || saving || changing || active} onChange={(event) => { setPort(Number(event.target.value)); setMessage("") }} aria-label="Universal port for all simulation screens">
                  {ports.map((port) => <option key={port} value={port}>{port}</option>)}
                </select>
                <ChevronDown size={14} aria-hidden="true" />
              </div>
            </label>
          </div>
          <p className="news-simulation-origin">Static base URL: <strong>http://{address.trim() || '<IP address>'}:{port}</strong></p>
          <button className="news-simulation-save" type="button" onClick={savePort} disabled={loading || saving || changing || active}>{saving ? 'Saving…' : 'Save all screens'}</button>
        </div>
      </header>
      {error && <p className="news-simulation-error" role="alert">{error}</p>}
      {message && <p className="news-simulation-message" role="status">{message}</p>}

      <section className="simulation-controls" aria-label="Simulation controls">
        <div className="simulation-toolbar">
          <span role="status">Simulation: {active ? 'Active' : 'Inactive'}</span>
          <button type="button" onClick={() => changeSimulation('start')} disabled={loading || saving || changing || active || targets.some(id => !id) || new Set(targets).size !== 4}>Start New Simulation</button>
          <button type="button" onClick={() => changeSimulation('end')} disabled={loading || saving || changing || !active}>End Simulation</button>
        </div>
        <p>Start opens the 12 saved simulation URLs on the four selected CMS screens, three URLs stacked vertically on each screen. End Simulation restores the original content.</p>
        <div className="simulation-targets">
          {[0, 1, 2, 3].map(index => <label key={index}>
            Screen {String(index + 1).padStart(2, '0')} · feeds {index * 3 + 1}–{index * 3 + 3}
            <select aria-label={`Destination for Screen ${String(index + 1).padStart(2, '0')}`} value={targets[index] || ''} disabled={loading || changing || active} onChange={event => setTargets(values => values.map((value, position) => position === index ? event.target.value : value))}>
              <option value="">Choose screen</option>
              {destinations.map(screen => <option key={screen.id} value={screen.id}>{screen.name} ({screen.code})</option>)}
            </select>
          </label>)}
        </div>
      </section>

      <div className="news-simulation-table-wrap">
        <table className="news-simulation-table" aria-label="News simulation screen ports">
          <thead>
            <tr><th scope="col">News Simulation Screen</th><th scope="col">Port</th><th scope="col">URL</th></tr>
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
