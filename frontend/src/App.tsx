import { type FormEvent, type ReactNode, useCallback, useMemo, useState } from 'react'
import {
  clearToken,
  isLoggedIn,
  predictRisk,
  type PredictFormData,
  type PredictResponse,
  type RiskLevel,
  type Sex,
  type YesNo,
} from './api'
import HistoryPanel from './HistoryPanel'
import LoginPage from './LoginPage'


const today = new Date().toISOString().slice(0, 10)

const initialForm: PredictFormData = {
  diastolic_bp: 80,
  heat_index_c: 35,
  environmental_temperature: 32,
  age: 35,
  nationality: 'no',
  relative_humidity: 50,
  hot_dry_skin: 'no',
  sweating: 'yes',
  date: today,
  cardiovascular_disease_history: 'no',
  bmi: 22,
  daily_ingested_water_l: 2,
  heart_pulse_rate: 75,
  sex: 'male',
  time_of_day: '12:00',
}

const riskStyles: Record<
  RiskLevel,
  { ring: string; bg: string; text: string; badge: string }
> = {
  Low: {
    ring: 'ring-emerald-300',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    badge: 'bg-emerald-600',
  },
  Moderate: {
    ring: 'ring-amber-300',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    badge: 'bg-amber-500',
  },
  High: {
    ring: 'ring-red-300',
    bg: 'bg-red-50',
    text: 'text-red-700',
    badge: 'bg-red-600',
  },
}

function FieldLabel({ children, htmlFor }: { children: ReactNode; htmlFor: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-slate-700">
      {children}
    </label>
  )
}

function NumberField({
  id,
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
}: {
  id: keyof PredictFormData
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  onChange: (id: keyof PredictFormData, value: number) => void
}) {
  return (
    <div>
      <FieldLabel htmlFor={id}>
        {label}
        {unit ? <span className="font-normal text-slate-500"> ({unit})</span> : null}
      </FieldLabel>
      <input
        id={id}
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        required
        onChange={(e) => onChange(id, Number(e.target.value))}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
      />
    </div>
  )
}

function ToggleField({
  id,
  label,
  value,
  onChange,
}: {
  id: keyof PredictFormData
  label: string
  value: YesNo
  onChange: (id: keyof PredictFormData, value: YesNo) => void
}) {
  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="flex gap-2">
        {(['yes', 'no'] as YesNo[]).map((opt) => (
          <button
            key={opt}
            type="button"
            id={opt === 'yes' ? id : undefined}
            onClick={() => onChange(id, opt)}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium capitalize transition ${
              value === opt
                ? 'border-sky-600 bg-sky-600 text-white'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

function ResultCard({ result }: { result: PredictResponse }) {
  const style = riskStyles[result.risk_level]
  return (
    <section
      className={`rounded-2xl ring-2 ${style.ring} ${style.bg} p-6 shadow-sm`}
      aria-live="polite"
    >
      <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Risk assessment</p>
      <h2 className={`mt-1 text-4xl font-bold ${style.text}`}>{result.risk_level}</h2>
      <p className={`mt-2 text-2xl font-semibold ${style.text}`}>{result.risk_percentage}</p>
      <p className="mt-4 text-base text-slate-700">{result.message}</p>
      <span
        className={`mt-4 inline-block rounded-full ${style.badge} px-3 py-1 text-xs font-semibold text-white`}
      >
        Score {result.risk_score.toFixed(2)} · prediction {result.prediction}
      </span>
    </section>
  )
}

export default function App() {
  const [authed, setAuthed] = useState(() => isLoggedIn())

  if (!authed) {
    return <LoginPage onSuccess={() => setAuthed(true)} />
  }

  return (
    <PredictorPage
      onLogout={() => {
        clearToken()
        setAuthed(false)
      }}
    />
  )
}

function PredictorPage({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<'predict' | 'history'>('predict')
  const [form, setForm] = useState<PredictFormData>(initialForm)
  const [result, setResult] = useState<PredictResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [historyKey, setHistoryKey] = useState(0)

  const handleAuthError = useCallback(() => {
    clearToken()
    onLogout()
  }, [onLogout])

  const setNumber = (id: keyof PredictFormData, value: number) => {
    setForm((prev) => ({ ...prev, [id]: value }))
  }

  const setYesNo = (id: keyof PredictFormData, value: YesNo) => {
    setForm((prev) => ({ ...prev, [id]: value }))
  }

  const canSubmit = useMemo(() => !loading, [loading])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const data = await predictRisk(form)
      setResult(data)
      setHistoryKey((k) => k + 1)
    } catch (err) {
      setResult(null)
      const message = err instanceof Error ? err.message : 'Something went wrong'
      setError(message)
      if (message.toLowerCase().includes('log in')) {
        handleAuthError()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-slate-50 to-orange-50">
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-lg text-white shadow">
              ☀
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Heat Stroke Risk Predictor</h1>
              <p className="text-sm text-slate-500">
                Enter vitals and conditions to estimate heat stroke risk
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Log out
          </button>
        </div>

        <div className="mx-auto flex max-w-5xl gap-2 px-4 pb-4">
          <button
            type="button"
            onClick={() => setTab('predict')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              tab === 'predict'
                ? 'bg-sky-600 text-white'
                : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
            }`}
          >
            Predict
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('history')
              setHistoryKey((k) => k + 1)
            }}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              tab === 'history'
                ? 'bg-sky-600 text-white'
                : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
            }`}
          >
            History
          </button>
        </div>
      </header>

      {tab === 'history' ? (
        <main className="mx-auto max-w-5xl px-4 py-8">
          <HistoryPanel refreshKey={historyKey} onAuthError={handleAuthError} />
        </main>
      ) : (
      <main className="mx-auto grid max-w-5xl gap-6 px-4 py-8 lg:grid-cols-5">
        <form
          onSubmit={onSubmit}
          className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-3"
        >
          <h2 className="text-lg font-semibold text-slate-800">Patient & environment</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              id="diastolic_bp"
              label="Diastolic BP"
              unit="mmHg"
              min={40}
              max={130}
              value={form.diastolic_bp}
              onChange={setNumber}
            />
            <NumberField
              id="heat_index_c"
              label="Heat Index"
              unit="°C"
              min={0}
              max={100}
              step={0.1}
              value={form.heat_index_c}
              onChange={setNumber}
            />
            <NumberField
              id="environmental_temperature"
              label="Environmental temperature"
              unit="°C"
              min={0}
              max={60}
              step={0.1}
              value={form.environmental_temperature}
              onChange={setNumber}
            />
            <NumberField
              id="age"
              label="Age"
              unit="years"
              min={12}
              max={80}
              value={form.age}
              onChange={setNumber}
            />
            <NumberField
              id="relative_humidity"
              label="Relative humidity"
              unit="%"
              min={0}
              max={100}
              value={form.relative_humidity}
              onChange={setNumber}
            />
            <NumberField
              id="bmi"
              label="BMI"
              min={15}
              max={45}
              step={0.1}
              value={form.bmi}
              onChange={setNumber}
            />
            <NumberField
              id="daily_ingested_water_l"
              label="Daily ingested water"
              unit="L"
              min={0}
              max={15}
              step={0.1}
              value={form.daily_ingested_water_l}
              onChange={setNumber}
            />
            <NumberField
              id="heart_pulse_rate"
              label="Heart / pulse rate"
              unit="bpm"
              min={40}
              max={220}
              value={form.heart_pulse_rate}
              onChange={setNumber}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="sex">Sex</FieldLabel>
              <select
                id="sex"
                value={form.sex}
                onChange={(e) => setForm((p) => ({ ...p, sex: e.target.value as Sex }))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div>
              <FieldLabel htmlFor="date">Date (time of year)</FieldLabel>
              <input
                id="date"
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
              />
            </div>
            <div>
              <FieldLabel htmlFor="time_of_day">Time of day</FieldLabel>
              <input
                id="time_of_day"
                type="time"
                min="09:00"
                max="17:00"
                required
                value={form.time_of_day}
                onChange={(e) => setForm((p) => ({ ...p, time_of_day: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
              />
              <p className="mt-1 text-xs text-slate-500">Between 09:00 and 17:00</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <ToggleField
              id="nationality"
              label="Nationality"
              value={form.nationality}
              onChange={setYesNo}
            />
            <ToggleField
              id="hot_dry_skin"
              label="Hot / dry skin"
              value={form.hot_dry_skin}
              onChange={setYesNo}
            />
            <ToggleField id="sweating" label="Sweating" value={form.sweating} onChange={setYesNo} />
            <ToggleField
              id="cardiovascular_disease_history"
              label="Cardiovascular disease history"
              value={form.cardiovascular_disease_history}
              onChange={setYesNo}
            />
          </div>

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-xl bg-sky-600 px-4 py-3 text-base font-semibold text-white shadow hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Calculating…' : 'Predict risk'}
          </button>
        </form>

        <aside className="space-y-4 lg:col-span-2">
          {result ? (
            <ResultCard result={result} />
          ) : (
            <section className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-6 text-slate-500 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-700">Your result</h2>
              <p className="mt-2 text-sm">
                Fill in the form and tap <strong>Predict risk</strong>. The risk level, percentage,
                and a short safety message will appear here.
              </p>
              <ul className="mt-4 space-y-2 text-sm">
                <li>
                  <span className="font-semibold text-emerald-700">Low</span> — 0–30%
                </li>
                <li>
                  <span className="font-semibold text-amber-600">Moderate</span> — 30–60%
                </li>
                <li>
                  <span className="font-semibold text-red-600">High</span> — 60–100%
                </li>
              </ul>
            </section>
          )}

          <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
            <h3 className="font-semibold text-slate-800">Notes</h3>
            <p className="mt-2">
              Heat Index is entered in °C and converted to Fahrenheit for the model. Humidity is
              entered as a percentage. Each prediction is saved and available under History. This
              tool is for demonstration and is not a medical diagnosis.
            </p>
          </section>
        </aside>
      </main>
      )}
    </div>
  )
}
