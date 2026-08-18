import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from './AuthContext';
import { ApiError } from '../../lib/apiClient';

const loginFormSchema = z.object({
  email: z.string().email('Ingresa un email valido'),
  password: z.string().min(1, 'Ingresa tu contrasena'),
});

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = loginFormSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Datos invalidos');
      return;
    }

    setLoading(true);
    try {
      await login(parsed.data.email, parsed.data.password);
      navigate('/admin');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo iniciar sesion');
    } finally {
      setLoading(false);
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
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>

          <div className="login-remember">
            <span>Mantener sesion iniciada</span>
            <span className="toggle-track on" aria-hidden="true">
              <span className="toggle-knob" />
            </span>
          </div>

          {error && <p className="login-error">{error}</p>}

          <button type="submit" className="button-primary button-block" disabled={loading}>
            {loading ? 'Ingresando...' : 'Ingresar'}
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
