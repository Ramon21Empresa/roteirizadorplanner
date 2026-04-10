'use client'

import { useState } from 'react'
import { Plus, Edit2, Navigation } from 'lucide-react'
import { useStore } from '@/lib/store'
import { kmCiclo, nearestNeighbor, formatarTempo, tempoEstimadoMin } from '@/lib/tsp'
import { VendedorModal } from './VendedorModal'
import type { Vendedor } from '@/types'

export function VendedoresPage() {
  const vendedores = useStore((s) => s.vendedores)
  const clientes   = useStore((s) => s.clientes)
  const [showModal, setShowModal]   = useState(false)
  const [editVend,  setEditVend]    = useState<Vendedor | null>(null)

  const stats = vendedores.map((v) => {
    const cs = clientes.filter((c) => c.vendedorId === v.id && c.lat && c.lng)
    const inicio = v.lat && v.lng ? { id: v.id, lat: v.lat, lng: v.lng } : null
    const pontos = cs.map((c) => ({ id: c.id, lat: c.lat!, lng: c.lng! }))
    const km     = inicio && pontos.length ? kmCiclo(inicio, nearestNeighbor(inicio, pontos)) : 0
    const tempo  = tempoEstimadoMin(km, cs.length)
    return { vendedor: v, clientes: cs.length, km, tempo }
  })

  return (
    <div className="flex-1 p-5 flex flex-col gap-4">
      <div className="card">
        <div className="card-header">
          <span className="card-title">Equipe de vendedores ({vendedores.length})</span>
          <button
            className="btn btn-sm btn-primary"
            onClick={() => { setEditVend(null); setShowModal(true) }}
          >
            <Plus size={13} /> Adicionar vendedor
          </button>
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stats.map(({ vendedor, clientes: qtd, km, tempo }) => (
            <div
              key={vendedor.id}
              className="card hover:shadow-sm transition-shadow"
              style={{ borderLeft: `3px solid ${vendedor.cor || '#185FA5'}` }}
            >
              <div className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                    style={{ background: vendedor.cor || '#185FA5' }}
                  >
                    {vendedor.nome.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{vendedor.nome}</div>
                    <div className="text-xs text-gray-500">{vendedor.codigo}</div>
                  </div>
                  <button
                    className="btn btn-ghost btn-sm opacity-0 group-hover:opacity-100"
                    onClick={() => { setEditVend(vendedor); setShowModal(true) }}
                  >
                    <Edit2 size={12} />
                  </button>
                </div>

                <div className="text-xs text-gray-500 truncate mb-3">
                  📍 {vendedor.endereco || 'Endereço não configurado'}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-gray-50 rounded-lg p-2 text-center">
                    <div className="text-base font-semibold">{qtd}</div>
                    <div className="text-[10px] text-gray-500">clientes</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-2 text-center">
                    <div className="text-base font-semibold text-blue-800">{Math.round(km)}</div>
                    <div className="text-[10px] text-blue-600">km/ciclo</div>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-2 text-center">
                    <div className="text-base font-semibold text-amber-800">{formatarTempo(tempo)}</div>
                    <div className="text-[10px] text-amber-600">estimado</div>
                  </div>
                </div>

                {!vendedor.lat && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-amber-600">
                    <Navigation size={11} />
                    Sem coordenadas — configure o endereço
                  </div>
                )}
              </div>
            </div>
          ))}

          {vendedores.length === 0 && (
            <div className="col-span-3 flex flex-col items-center py-16 text-gray-400">
              <div className="text-4xl mb-3 opacity-30">👤</div>
              <p className="text-sm">Nenhum vendedor cadastrado</p>
              <button
                className="btn btn-primary mt-3"
                onClick={() => { setEditVend(null); setShowModal(true) }}
              >
                <Plus size={13} /> Adicionar primeiro vendedor
              </button>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <VendedorModal
          inicial={editVend}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
