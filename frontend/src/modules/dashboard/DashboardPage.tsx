import { useEffect, useState } from 'react';
import { listTurnosRequest } from '../turnos/turnos.api';
import { listArticulosRequest } from '../articulos/articulos.api';
import { listVentasRequest } from '../ventas/ventas.api';
import { listCortesRequest } from '../cortes/cortes.api';
import type { Turno } from '../turnos/turnos.types';
import type { Articulo } from '../articulos/articulos.types';
import { formatCurrency, todayIso } from '../../lib/format';
import { useAuth } from '../auth/AuthContext';

const TODAY = todayIso();

export function DashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [turnosHoy, setTurnosHoy] = useState<Turno[]>([]);
  const [stockBajo, setStockBajo] = useState<Articulo[]>([]);
  const [totalVentas, setTotalVentas] = useState(0);
  const [cortesEquipo, setCortesEquipo] = useState<{ nombre: string; cantidad: number }[]>([]);

  useEffect(() => {
    async function load() {
      const [turnos, articulos, ventas, cortes] = await Promise.all([
        listTurnosRequest(),
        listArticulosRequest(),
        listVentasRequest(),
        listCortesRequest(),
      ]);

      setTurnosHoy(turnos.filter((t) => t.fecha === TODAY));
      setStockBajo(articulos.filter((a) => a.stock <= 5));
      setTotalVentas(ventas.reduce((sum, v) => sum + v.total, 0));

      const porBarbero = new Map<string, number>();
      cortes.forEach((c) => porBarbero.set(c.barberoNombre, (porBarbero.get(c.barberoNombre) ?? 0) + 1));
      setCortesEquipo(
        [...porBarbero.entries()].map(([nombre, cantidad]) => ({ nombre, cantidad }))
      );

      setLoading(false);
    }
    load();
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
      </div>
      <p className="text-muted">
        Bienvenido{user ? `, ${user.firstName}` : ''}. Resumen general del estado del sistema
        (datos de ejemplo).
      </p>

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <>
          <div className="stat-row">
            <div className="stat-tile">
              <span className="stat-label">Turnos de hoy</span>
              <span className="stat-value">{turnosHoy.length}</span>
            </div>
            <div className="stat-tile">
              <span className="stat-label">Total vendido</span>
              <span className="stat-value">{formatCurrency(totalVentas)}</span>
            </div>
            <div className="stat-tile">
              <span className="stat-label">Alertas de stock</span>
              <span className="stat-value">{stockBajo.length}</span>
            </div>
          </div>

          <div className="card-grid">
            <div className="card">
              <h2>Turnos de hoy</h2>
              {turnosHoy.length === 0 ? (
                <p className="text-muted">No hay turnos agendados para hoy.</p>
              ) : (
                <ul className="simple-list">
                  {turnosHoy.map((turno) => (
                    <li key={turno.id}>
                      {turno.hora} · {turno.clienteNombre} {turno.clienteApellido} con{' '}
                      {turno.barberoNombre} ({turno.tipoCorteNombre})
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="card">
              <h2>Alertas de stock</h2>
              {stockBajo.length === 0 ? (
                <p className="text-muted">Todo el stock esta en niveles saludables.</p>
              ) : (
                <ul className="simple-list">
                  {stockBajo.map((articulo) => (
                    <li key={articulo.id}>
                      {articulo.nombre}: quedan {articulo.stock} unidades
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="card">
              <h2>Desempeno del equipo</h2>
              {cortesEquipo.length === 0 ? (
                <p className="text-muted">Todavia no hay cortes registrados.</p>
              ) : (
                <ul className="simple-list">
                  {cortesEquipo.map((item) => (
                    <li key={item.nombre}>
                      {item.nombre}: {item.cantidad} cortes
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
