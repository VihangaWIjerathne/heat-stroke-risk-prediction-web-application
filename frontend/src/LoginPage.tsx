import { type FormEvent, useState } from 'react'
import { login } from './api'
import './LoginPage.css'

interface LoginPageProps {
  onSuccess: () => void
}

export default function LoginPage({ onSuccess }: LoginPageProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)
  const [success, setSuccess] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setShake(false)
    try {
      await login(username.trim(), password)
      setSuccess(true)
      window.setTimeout(() => onSuccess(), 420)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
      setShake(true)
      window.setTimeout(() => setShake(false), 500)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-scene">
      <div className="login-sky" aria-hidden="true">
        <div className="login-sun">
          <span className="login-sun-core" />
          <span className="login-sun-ring login-sun-ring--a" />
          <span className="login-sun-ring login-sun-ring--b" />
          <span className="login-sun-rays" />
        </div>
        <div className="login-haze login-haze--1" />
        <div className="login-haze login-haze--2" />
        <div className="login-haze login-haze--3" />
        <svg className="login-waves" viewBox="0 0 1440 320" preserveAspectRatio="none">
          <path
            className="login-wave login-wave--1"
            d="M0,192 C240,256 480,96 720,160 C960,224 1200,288 1440,192 L1440,320 L0,320 Z"
          />
          <path
            className="login-wave login-wave--2"
            d="M0,224 C320,160 640,288 960,224 C1120,192 1280,160 1440,208 L1440,320 L0,320 Z"
          />
        </svg>
      </div>

      <div className={`login-panel ${shake ? 'login-panel--shake' : ''} ${success ? 'login-panel--success' : ''}`}>
        <header className="login-brand">
          <h1 className="login-title">Heat Stroke</h1>
          <p className="login-subtitle">Risk Predictor</p>
          <p className="login-tagline">Sign in to assess heat exposure risk</p>
        </header>

        <form onSubmit={onSubmit} className="login-form">
          <div className="login-field login-field--delay-1">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
            />
          </div>

          <div className="login-field login-field--delay-2">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error ? (
            <div className="login-error" role="alert">
              {error}
            </div>
          ) : null}

          <button type="submit" className="login-submit" disabled={loading || success}>
            <span className="login-submit-label">
              {success ? 'Welcome' : loading ? 'Signing in…' : 'Sign in'}
            </span>
            <span className="login-submit-shine" aria-hidden="true" />
          </button>
        </form>
      </div>
    </div>
  )
}
