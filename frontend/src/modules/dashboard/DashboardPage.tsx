import { useEffect, useState } from 'react';
import { listTurnosRequest } from '../turnos/turnos.api';
import { listStockBajoRequest } from '../articulos/articulos.api';
import { listVentasRequest } from '../ventas/ventas.api';
import { listCortesRequest } from '../cortes/cortes.api';
import type { Turno } from '../turnos/turnos.types';
import { nivelStock, type Articulo } from '../articulos/articulos.types';
import { formatCurrency, todayIso } from '../../lib/format';
import { useAuth } from '../auth/AuthContext';
import { ErrorState, LoadingState, toErrorMessage } from '../../components/AsyncState';

const TODAY = todayIso();

export function DashboardPage() {
  const { user } = useAuth();
  const canSeeStock = user?.role === 'DEV' || user?.role === 'ENCARGADO';
  const canSeeVentas = user?.role === 'DEV' || user?.role === 'ENCARGADO';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [turnosHoy, setTurnosHoy] = useState<Turno[]>([]);
  const [stockBajo, setStockBajo] = useState<Articulo[]>([]);
  const [totalVentas, setTotalVentas] = useState(0);
  const [cortesEquipo, setCortesEquipo] = useState<{ nombre: string; cantidad: number }[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [turnos, articulosStockBajo, ventas, cortes] = await Promise.all([
          listTurnosRequest(),
          canSeeStock ? listStockBajoRequest() : Promise.resolve([]),
          canSeeVentas ? listVentasRequest({ fechaDesde: TODAY, fechaHasta: TODAY }) : Promise.resolve([]),
          listCortesRequest(),
        ]);

        setTurnosHoy(turnos.filter((t) => t.fecha === TODAY));
        setStockBajo(articulosStockBajo);
        setTotalVentas(ventas.reduce((sum, v) => sum + v.total, 0));

        const cortesHoy = cortes.filter((c) => c.fecha === TODAY);
        const porBarbero = new Map<string, number>();
        cortesHoy.forEach((c) => porBarbero.set(c.barberoNombre, (porBarbero.get(c.barberoNombre) ?? 0) + 1));
        setCortesEquipo(
          [...porBarbero.entries()].map(([nombre, cantidad]) => ({ nombre, cantidad }))
        );
      } catch (err) {
        setError(toErrorMessage(err, 'No se pudo cargar el dashboard.'));
      } finally {
        setLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSeeStock, canSeeVentas]);

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
      </div>
      <p className="text-muted">
        Bienvenido{user ? `, ${user.firstName}` : ''}. Resumen del dia de hoy.
      </p>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} />
      ) : (
        <>
          <div className="stat-row">
            <div className="stat-tile">
              <span className="stat-label">Turnos de hoy</span>
              <span className="stat-value">{turnosHoy.length}</span>
            </div>
            {canSeeVentas && (
              <div className="stat-tile">
                <span className="stat-label">Vendido hoy</span>
                <span className="stat-value">{formatCurrency(totalVentas)}</span>
              </div>
            )}
            {canSeeStock && (
              <div className="stat-tile">
                <span className="stat-label">Alertas de stock</span>
                <span className="stat-value">{stockBajo.length}</span>
              </div>
            )}
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

            {canSeeStock && (
              <div className="card">
                <h2>Alertas de stock</h2>
                {stockBajo.length === 0 ? (
                  <p className="text-muted">Todo el stock esta en niveles saludables.</p>
                ) : (
                  <ul className="simple-list">
                    {stockBajo.map((articulo) => {
                      const nivel = nivelStock(articulo);
                      return (
                        <li key={articulo.id}>
                          <span
                            className={nivel === 'critico' ? 'badge badge-danger' : 'badge badge-warning'}
                          >
                            {nivel === 'critico' ? 'Critico' : 'Bajo'}
                          </span>{' '}
                          {articulo.nombre}: quedan {articulo.stock} unidades (minimo {articulo.stockMinimo})
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}

            <div className="card">
              <h2>Desempeno del equipo hoy</h2>
              {cortesEquipo.length === 0 ? (
                <p className="text-muted">Todavia no hay cortes registrados hoy.</p>
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
