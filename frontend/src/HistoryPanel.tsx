import { useEffect, useState } from 'react'
import { fetchHistory, type HistoryItem, type RiskLevel } from './api'

const levelColor: Record<RiskLevel, string> = {
  Low: 'bg-emerald-100 text-emerald-800',
  Moderate: 'bg-amber-100 text-amber-800',
  High: 'bg-red-100 text-red-800',
}

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

interface HistoryPanelProps {
  refreshKey: number
  onAuthError: () => void
}

export default function HistoryPanel({ refreshKey, onAuthError }: HistoryPanelProps) {
  const [items, setItems] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchHistory()
        if (!cancelled) setItems(data.items)
      } catch (err) {
        if (cancelled) return
        const message = err instanceof Error ? err.message : 'Failed to load history'
        setError(message)
        if (message.toLowerCase().includes('log in')) onAuthError()
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [refreshKey, onAuthError])

  if (loading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
        Loading prediction history…
      </section>
    )
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 shadow-sm">
        {error}
      </section>
    )
  }

  if (items.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-6 text-slate-500 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-700">No predictions yet</h2>
        <p className="mt-2 text-sm">
          Run a prediction from the Predict tab. Each result is saved to SQLite and listed here.
        </p>
      </section>
    )
  }

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-800">Prediction history</h2>
        <span className="text-sm text-slate-500">{items.length} saved</span>
      </div>

      <ul className="space-y-3">
        {items.map((item) => {
          const open = expandedId === item.id
          return (
            <li
              key={item.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <button
                type="button"
                className="flex w-full items-start justify-between gap-3 text-left"
                onClick={() => setExpandedId(open ? null : item.id)}
              >
                <div>
                  <p className="text-sm text-slate-500">{formatWhen(item.created_at)}</p>
                  <p className="mt-1 font-semibold text-slate-800">
                    #{item.id} · {item.risk_percentage} · {item.message}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${levelColor[item.risk_level]}`}
                >
                  {item.risk_level}
                </span>
              </button>

              {open ? (
                <dl className="mt-4 grid gap-2 border-t border-slate-100 pt-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-slate-500">Age / Sex</dt>
                    <dd className="font-medium text-slate-800">
                      {item.inputs.age} · {item.inputs.sex}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">BMI / Pulse</dt>
                    <dd className="font-medium text-slate-800">
                      {item.inputs.bmi} · {item.inputs.heart_pulse_rate} bpm
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Heat index / Env. temp</dt>
                    <dd className="font-medium text-slate-800">
                      {item.inputs.heat_index_c}°C · {item.inputs.environmental_temperature}°C
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Humidity / Water</dt>
                    <dd className="font-medium text-slate-800">
                      {item.inputs.relative_humidity}% · {item.inputs.daily_ingested_water_l} L
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Date / Time</dt>
                    <dd className="font-medium text-slate-800">
                      {item.inputs.date} · {item.inputs.time_of_day}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Symptoms</dt>
                    <dd className="font-medium text-slate-800">
                      Hot/dry skin: {item.inputs.hot_dry_skin} · Sweating: {item.inputs.sweating}
                    </dd>
                  </div>
                </dl>
              ) : null}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
