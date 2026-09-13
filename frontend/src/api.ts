export type YesNo = 'yes' | 'no'
export type Sex = 'male' | 'female'
export type RiskLevel = 'Low' | 'Moderate' | 'High'

const TOKEN_KEY = 'heat_stroke_auth_token'

export interface PredictFormData {
  diastolic_bp: number
  heat_index_c: number
  environmental_temperature: number
  age: number
  nationality: YesNo
  relative_humidity: number
  hot_dry_skin: YesNo
  sweating: YesNo
  date: string
  cardiovascular_disease_history: YesNo
  bmi: number
  daily_ingested_water_l: number
  heart_pulse_rate: number
  sex: Sex
  time_of_day: string
}

export interface PredictResponse {
  id?: number
  risk_score: number
  risk_percentage: string
  risk_level: RiskLevel
  prediction: number
  message: string
}

export interface HistoryItem {
  id: number
  created_at: string
  inputs: PredictFormData
  risk_score: number
  risk_percentage: string
  risk_level: RiskLevel
  prediction: number
  message: string
}

export interface HistoryResponse {
  items: HistoryItem[]
  count: number
}

export interface LoginResponse {
  token: string
  username: string
}

function authHeaders(): HeadersInit {
  const token = getToken()
  if (!token) {
    throw new Error('Unauthorized — please log in')
  }
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

async function handleAuthError(res: Response): Promise<void> {
  if (res.status === 401) {
    clearToken()
    throw new Error('Session expired — please log in again')
  }
}

function apiErrorMessage(data: unknown, fallback: string): string {
  if (!data || typeof data !== 'object') return fallback
  const detail = (data as { detail?: unknown }).detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail.map((d: { msg?: string }) => d.msg ?? JSON.stringify(d)).join('; ')
  }
  return fallback
}

export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  sessionStorage.removeItem(TOKEN_KEY)
}

export function isLoggedIn(): boolean {
  return Boolean(getToken())
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })

  if (!res.ok) {
    let detail = 'Login failed'
    try {
      detail = apiErrorMessage(await res.json(), detail)
    } catch {
      /* ignore */
    }
    throw new Error(detail)
  }

  const data: LoginResponse = await res.json()
  setToken(data.token)
  return data
}

export async function predictRisk(body: PredictFormData): Promise<PredictResponse> {
  const res = await fetch('/api/predict', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  })

  await handleAuthError(res)

  if (!res.ok) {
    let detail = 'Prediction request failed'
    try {
      detail = apiErrorMessage(await res.json(), detail)
    } catch {
      /* ignore parse errors */
    }
    throw new Error(detail)
  }

  return res.json()
}

export async function fetchHistory(limit = 50): Promise<HistoryResponse> {
  const res = await fetch(`/api/history?limit=${limit}`, {
    headers: authHeaders(),
  })

  await handleAuthError(res)

  if (!res.ok) {
    let detail = 'Failed to load history'
    try {
      detail = apiErrorMessage(await res.json(), detail)
    } catch {
      /* ignore */
    }
    throw new Error(detail)
  }

  return res.json()
}
