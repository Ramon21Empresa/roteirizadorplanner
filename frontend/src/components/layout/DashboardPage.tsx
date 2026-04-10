'use client'

import { useMemo } from 'react'
import { Users, UserCheck, Navigation, AlertTriangle, TrendingUp } from 'lucide-react'
import { useStore } from '@/lib/store'
import { kmCiclo, nearestNeighbor } from '@/lib/tsp'

// ── Stat card component ────────────────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = 'bg-gray-50',
}: {
  icon: React.ElementType
  label: string
  value: string | number
  sub?: string
  color?: string
}) {
  return (
    <div className={`${color} rounded-xl p-4`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={15} className="text-gray-500" />
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <div className="text-2xl font-semibold">{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </div>
  )
}

export function DashboardPage() {
  const clientes   = useStore((s) => s.clientes)
  const vendedores = useStore((s) => s.vendedores)
  const rotas      = useStore((s) => s.rotas)

  const semCoordenadas = clientes.filter((c) => !c.lat || !c.lng).length
  const semVendedor    = clientes.filter((c) => !c.vendedorId).length

  // KM estimado total (soma de todos os vendedores)
  const kmTotal = useMemo(() => {
    return vendedores.reduce((acc, v) => {
      if (!v.lat || !v.lng) return acc
      const cs = clientes.filter((c) => c.vendedorId === v.id && c.lat && c.lng)
      if (!cs.length) return acc
      const inicio = { id: v.id, lat: v.lat, lng: v.lng }
      const pontos = cs.map((c) => ({ id: c.id, lat: c.lat!, lng: c.lng! }))
      return acc + kmCiclo(inicio, nearestNeighbor(inicio, pontos))
    }, 0)
  }, [clientes, vendedores])

  // Cobertura por vendedor
  const cobertura = useMemo(() =>
    vendedores.map((v) => ({
      vendedor: v,
      count: clientes.filter((c) => c.vendedorId === v.id).length,
      pct: clientes.length
        ? Math.round((clientes.filter((c) => c.vendedorId === v.id).length / clientes.length) * 100)
        : 0,
      km: (() => {
        if (!v.lat || !v.lng) return 0
        const cs = clientes.filter((c) => c.vendedorId === v.id && c.lat && c.lng)
        if (!cs.length) return 0
        const inicio = { id: v.id, lat: v.lat, lng: v.lng }
        const pontos = cs.map((c) => ({ id: c.id, lat: c.lat!, lng: c.lng! }))
        return kmCiclo(inicio, nearestNeighbor(inicio, pontos))
      })(),
    })),
    [clientes, vendedores]
  )

  return (
    <div className="flex-1 p-5 flex flex-col gap-5">

      {/* ── Alertas ───────────────────────────────────────── */}
      {(semCoordenadas > 0 || semVendedor > 0) && (
        <div className="flex flex-col gap-2">
          {semCoordenadas > 0 && (
            <div className="alert alert-warning">
              <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
              <span>
                <strong>{semCoordenadas} cliente(s)</strong> sem coordenadas geográficas.
                Eles não aparecerão no mapa nem nas rotas até serem geocodificados.
              </span>
            </div>
          )}
          {semVendedor > 0 && (
            <div className="alert alert-warning">
              <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
              <span>
                <strong>{semVendedor} cliente(s)</strong> sem vendedor vinculado.
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── KPIs ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Users}      label="Clientes na base"   value={clientes.length}          sub="cadastrados" />
        <StatCard icon={UserCheck}  label="Vendedores"         value={vendedores.length}         sub="ativos" />
        <StatCard icon={Navigation} label="KM estimados/ciclo" value={`${Math.round(kmTotal)} km`} sub="todos os vendedores" color="bg-blue-50" />
        <StatCard icon={TrendingUp} label="Rotas salvas"       value={rotas.length}              sub="simulações" color="bg-green-50" />
      </div>

      {/* ── Cobertura por vendedor ─────────────────────────── */}
      {cobertura.length > 0 && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Cobertura por vendedor</span>
          </div>
          <div className="p-4 flex flex-col gap-4">
            {cobertura.map(({ vendedor, count, pct, km }) => (
              <div key={vendedor.id}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                      style={{ background: vendedor.cor || '#185FA5' }}
                    >
                      {vendedor.nome.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                    </div>
                    <span className="text-sm font-medium">{vendedor.nome}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="tag tag-blue">{count} clientes · {pct}%</span>
                    <span className="tag tag-green">{Math.round(km)} km/ciclo</span>
                  </div>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: vendedor.cor || '#185FA5' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Guia de início rápido ─────────────────────────── */}
      {clientes.length === 0 && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Como começar</span>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
            {[
              { n: '1', title: 'Cadastre clientes',     desc: 'Importe CSV ou adicione manualmente com endereço ou lat/lng.',       bg: 'bg-blue-50',   tc: 'text-blue-900' },
              { n: '2', title: 'Crie os vendedores',    desc: 'Defina cada vendedor com seu endereço de base (ponto de partida).', bg: 'bg-green-50',  tc: 'text-green-900' },
              { n: '3', title: 'Monte a rota',          desc: 'Selecione vendedor + clientes e clique em Otimizar.',               bg: 'bg-amber-50',  tc: 'text-amber-900' },
              { n: '4', title: 'Planeje a semana',      desc: 'Distribua clientes nos dias com drag-and-drop e exporte.',          bg: 'bg-purple-50', tc: 'text-purple-900' },
            ].map((s) => (
              <div key={s.n} className={`${s.bg} rounded-xl p-4`}>
                <div className={`text-2xl font-semibold ${s.tc} mb-1`}>{s.n}</div>
                <div className={`text-sm font-medium ${s.tc} mb-1`}>{s.title}</div>
                <div className={`text-xs ${s.tc} opacity-75`}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
