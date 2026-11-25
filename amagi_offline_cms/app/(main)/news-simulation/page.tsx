"use client"

import { useEffect, useState } from "react"
import { defaultScreenName } from '@/lib/screen-name'
import { Check, ChevronDown, Clock, Info, Play, Search } from "lucide-react"
import { Popover, Select } from 'radix-ui'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import "./news-simulation.css"

type SimulationScreen = { screenNumber: number; name: string; port: number; url: string }
type Destination = { id: string; code: string; name: string }
const ports = Array.from({ length: 12 }, (_, index) => 3000 + index)

function defaultTargets(screens: Destination[]) {
  return Array.from({ length: 4 }, (_, index) =>
    screens.find(screen => screen.name.trim().toLowerCase() === defaultScreenName(index + 1).toLowerCase())?.id || ''
  )
}

function SimulationTimer({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const update = () => setElapsed(Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)))
    const initial = window.setTimeout(update, 0)
    const interval = window.setInterval(update, 1000)
    return () => { window.clearTimeout(initial); window.clearInterval(interval) }
  }, [startedAt])
  const time = [Math.floor(elapsed / 3600), Math.floor(elapsed / 60) % 60, elapsed % 60].map(value => String(value).padStart(2, '0')).join(':')
  return <span className="simulation-timer" role="timer" aria-label={`Simulation elapsed time ${time}`}><Clock size={18} />{time}</span>
}

function ScreenDestination({ index, destinations, targets, disabled, onSelect }: {
  index: number; destinations: Destination[]; targets: string[]; disabled: boolean; onSelect: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const selected = destinations.find(screen => screen.id === targets[index])
  return <article className={`simulation-map-card ${open ? 'is-selecting' : ''}`}>
    <div className="simulation-monitor" aria-label={`Feeds ${index * 3 + 1} to ${index * 3 + 3}`}>
      <div className="simulation-monitor-display">
        {[1, 2, 3].map(offset => <div className="simulation-feed" key={offset}><b>{index * 3 + offset}</b><span>Feed {index * 3 + offset}</span></div>)}
      </div>
      <div className="simulation-monitor-neck" /><div className="simulation-monitor-foot" />
    </div>
    <div className="simulation-map-details">
      <h2>{selected?.name || defaultScreenName(index + 1)}{selected && <span>({selected.code})</span>}</h2>
      <p>Feeds {index * 3 + 1}–{index * 3 + 3}</p>
      <Popover.Root open={open} onOpenChange={value => { setOpen(value); setQuery('') }}>
        <Popover.Trigger disabled={disabled} className="simulation-destination-trigger" aria-label={`Destination for ${defaultScreenName(index + 1)}`}>
          <span>{selected ? `${selected.name} (${selected.code})` : 'Choose screen'}</span><ChevronDown size={18} />
        </Popover.Trigger>
        <Popover.Portal><Popover.Content className="simulation-destination-menu" sideOffset={10} collisionPadding={12} align="end">
          <div className="simulation-destination-search"><Search size={18} /><input aria-label="Find a screen" placeholder="Find a screen" value={query} onChange={event => setQuery(event.target.value)} /></div>
          <div className="simulation-destination-options">
            {destinations.filter(screen => `${screen.name} ${screen.code}`.toLowerCase().includes(query.toLowerCase())).map(screen => {
              const assignedIndex = targets.indexOf(screen.id)
              const isSelected = targets[index] === screen.id
              const assignedElsewhere = assignedIndex !== -1 && assignedIndex !== index
              return <button key={screen.id} type="button" disabled={assignedElsewhere} className="simulation-destination-option" aria-pressed={isSelected} onClick={() => { onSelect(screen.id); setOpen(false) }}>
                <span>{screen.name} ({screen.code})<small>{assignedIndex === -1 ? 'Available' : `Feeds ${assignedIndex * 3 + 1}–${assignedIndex * 3 + 3}${assignedElsewhere ? ' · Assigned' : ''}`}</small></span>
                {isSelected && <Check size={20} />}
              </button>
            })}
            {!destinations.some(screen => `${screen.name} ${screen.code}`.toLowerCase().includes(query.toLowerCase())) && <p className="simulation-no-results">No matching screens</p>}
          </div>
        </Popover.Content></Popover.Portal>
      </Popover.Root>
    </div>
  </article>
}

export default function NewsSimulationPage() {
  const [screens, setScreens] = useState<SimulationScreen[]>([])
  const [address, setAddress] = useState('localhost')
  const [port, setPort] = useState(3000)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [active, setActive] = useState(false)
  const [startedAt, setStartedAt] = useState<string | null>(null)
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
        setStartedAt(state.startedAt ?? null)
        setDestinations(state.screens)
        setTargets(state.active && state.targetScreenIds.length === 4 ? state.targetScreenIds : defaultTargets(state.screens))
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
      setStartedAt(data.startedAt ?? null)
      setTargets(data.active ? data.targetScreenIds : defaultTargets(destinations))
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
      setSettingsOpen(false)
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
        <div className="news-simulation-header-actions">
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogTrigger asChild>
            <button className="news-simulation-settings-button" type="button">Universal IP &amp; Port</button>
          </DialogTrigger>
          <DialogContent className="news-simulation-settings-dialog">
            <DialogHeader>
              <DialogTitle>Universal IP &amp; Port</DialogTitle>
              <DialogDescription>Set the IP address and port for all 12 simulation screens.</DialogDescription>
            </DialogHeader>
        <div className="news-simulation-source">
          <div className="news-simulation-fields">
            <label>
              <span>Universal IP address</span>
              <input value={address} disabled={loading || saving || changing || active} onChange={(event) => { setAddress(event.target.value); setMessage("") }} placeholder="192.168.1.100" inputMode="url" autoComplete="url" aria-label="Universal IP address for all simulation screens" />
            </label>
            <label>
              <span>Universal port</span>
              <Select.Root value={String(port)} disabled={loading || saving || changing || active} onValueChange={(value) => { setPort(Number(value)); setMessage("") }}>
                <Select.Trigger id="simulation-port" className="simulation-port-trigger" aria-label="Universal port for all simulation screens">
                  <Select.Value />
                  <Select.Icon><ChevronDown size={14} /></Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content className="simulation-port-menu" position="popper" sideOffset={6} collisionPadding={12}>
                    <Select.Viewport>
                      {ports.map(value => <Select.Item className="simulation-port-option" key={value} value={String(value)}><Select.ItemText>{value}</Select.ItemText></Select.Item>)}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </label>
          </div>
          <p className="news-simulation-origin">Static base URL: <strong>http://{address.trim() || '<IP address>'}:{port}</strong></p>
          {active && <p className="news-simulation-origin">End the simulation before changing these settings.</p>}
          {error && <p className="news-simulation-error" role="alert">{error}</p>}
          <button className="news-simulation-save" type="button" onClick={savePort} disabled={loading || saving || changing || active}>{saving ? 'Saving…' : 'Save all screens'}</button>
        </div>
          </DialogContent>
        </Dialog>
        <Dialog>
          <DialogTrigger asChild>
            <button className="news-simulation-settings-button" type="button">URLs</button>
          </DialogTrigger>
          <DialogContent className="news-simulation-settings-dialog news-simulation-urls-dialog">
            <DialogHeader>
              <DialogTitle>Simulation URLs</DialogTitle>
              <DialogDescription>All saved simulation screen URLs and ports.</DialogDescription>
            </DialogHeader>
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
          </DialogContent>
        </Dialog>
        </div>
      </header>
      {error && <p className="news-simulation-error" role="alert">{error}</p>}
      {message && <p className="news-simulation-message" role="status">{message}</p>}

      <section className="simulation-status-bar" aria-label="Simulation controls">
        <div className="simulation-status" role="status"><i className={active ? 'is-active' : ''} />{active ? 'Active' : 'Inactive'}</div>
        <span className="simulation-feed-count">4 screens · 12 feeds</span>
        {active && startedAt && <SimulationTimer key={startedAt} startedAt={startedAt} />}
        <div className="simulation-status-actions">
          <button className="simulation-start" type="button" onClick={() => changeSimulation('start')} disabled={loading || saving || changing || active || targets.some(id => !id) || new Set(targets).size !== 4}><Play size={19} fill="currentColor" />{changing && !active ? 'Starting…' : 'Start New Simulation'}</button>
          <button className="simulation-end" type="button" onClick={() => changeSimulation('end')} disabled={loading || saving || changing || !active}>{changing && active ? 'Ending…' : 'End Simulation'}</button>
        </div>
      </section>
      <section className="simulation-map-grid" aria-label="Simulation screen mapping" aria-busy={loading}>
        {[0, 1, 2, 3].map(index => <ScreenDestination key={index} index={index} destinations={destinations} targets={targets} disabled={loading || changing || active} onSelect={id => setTargets(values => values.map((value, position) => position === index ? id : value))} />)}
      </section>
      <p className="simulation-restore-note"><Info size={22} />Ending the simulation restores original screen content.</p>


    </div>
  )
}
