import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from './AuthContext';
import { ApiError, isColdStartError } from '../../lib/apiClient';

const loginFormSchema = z.object({
  email: z.string().email('Ingresa un email valido'),
  password: z.string().min(1, 'Ingresa tu contrasena'),
});

// Si el backend estaba dormido (Render free tier), el primer intento puede
// haber tardado tanto que el cliente lo dio por perdido. Reintentamos un par
// de veces en vez de mostrar directo un error de red generico: para cuando
// llega el 2do/3er intento el servicio ya deberia estar despierto.
const COLD_START_RETRIES = 2;

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setStarting(false);

    const parsed = loginFormSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Datos invalidos');
      return;
    }

    setLoading(true);
    try {
      for (let attempt = 0; ; attempt += 1) {
        try {
          await login(parsed.data.email, parsed.data.password);
          navigate('/admin');
          return;
        } catch (err) {
          if (isColdStartError(err) && attempt < COLD_START_RETRIES) {
            setStarting(true);
            continue;
          }
          throw err;
        }
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo iniciar sesion');
    } finally {
      setLoading(false);
      setStarting(false);
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-brand">
          <span className="login-brand-mark" aria-hidden="true" />
          <span className="login-brand-name">Kort</span>
        </div>

        <div className="login-heading">
          <h1>Acceso del equipo</h1>
          <p className="login-subtitle">Ingresa con la cuenta que te asigno el encargado del local.</p>
        </div>

        <div className="login-fields">
          <label className="login-field" htmlFor="email">
            <span>Email</span>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
            />
          </label>

          <label className="login-field" htmlFor="password">
            <span>Contrasena</span>
            <div className="login-password-wrap">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
                aria-pressed={showPassword}
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                    <path
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 3l18 18M10.58 10.58a2 2 0 002.83 2.83M9.36 5.32A9.77 9.77 0 0112 5c5 0 9 4.5 10 7-.42 1.05-1.28 2.4-2.5 3.6M6.6 6.6C4.4 8 2.9 9.9 2 12c1 2.5 5 7 10 7 1.14 0 2.24-.2 3.27-.57"
                    />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                    <path
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2 12c1-2.5 5-7 10-7s9 4.5 10 7c-1 2.5-5 7-10 7s-9-4.5-10-7z"
                    />
                    <circle cx="12" cy="12" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.8" />
                  </svg>
                )}
              </button>
            </div>
          </label>

          <div className="login-remember">
            <span>Mantener sesion iniciada</span>
            <span className="toggle-track on" aria-hidden="true">
              <span className="toggle-knob" />
            </span>
          </div>

          {error && <p className="login-error">{error}</p>}
          {starting && !error && (
            <p className="login-hint">El sistema esta iniciando, puede tardar unos segundos...</p>
          )}

          <button type="submit" className="button-primary button-block" disabled={loading}>
            {starting ? 'Iniciando sistema...' : loading ? 'Ingresando...' : 'Ingresar'}
          </button>

          <p className="login-forgot">Olvide mi contrasena</p>
        </div>

        <p className="login-footnote">
          Los clientes no pasan por esta pantalla: reservan desde su link y van directo al turno.
        </p>
      </form>
    </div>
  );
}
