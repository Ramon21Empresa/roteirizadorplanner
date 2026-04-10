'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useStore } from '@/lib/store'
import { RotasSidebar } from './RotasSidebar'
import { PlanejamentoSemanal } from './PlanejamentoSemanal'

// Leaflet não funciona com SSR — importação dinâmica obrigatória
const MapView = dynamic(() => import('@/components/map/MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center text-sm text-gray-400">
      Carregando mapa...
    </div>
  ),
})

type Tab = 'mapa' | 'planejamento'

export function RotasPage() {
  const [activeTab, setActiveTab] = useState<Tab>('mapa')

  const clientes            = useStore((s) => s.clientes)
  const vendedores          = useStore((s) => s.vendedores)
  const clientesSelecionados = useStore((s) => s.clientesSelecionados)
  const vendedorSelecionado  = useStore((s) => s.vendedorSelecionado)
  const resultadoOtimizacao  = useStore((s) => s.resultadoOtimizacao)
  const toggleCliente        = useStore((s) => s.toggleClienteSelecionado)

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* ── Sidebar de controle ──────────────────────────── */}
      <RotasSidebar />

      {/* ── Área principal ──────────────────────────────── */}
      <div className="flex flex-col flex-1 overflow-hidden">

        {/* Tab bar */}
        <div className="bg-white border-b border-gray-200 px-4 flex gap-0 flex-shrink-0">
          {[
            { id: 'mapa'        as Tab, label: 'Mapa interativo' },
            { id: 'planejamento'as Tab, label: 'Planejamento semanal' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-3 text-sm border-b-2 transition-all ${
                activeTab === t.id
                  ? 'border-brand-600 text-brand-600 font-medium'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Conteúdo da tab */}
        {activeTab === 'mapa' && (
          <div className="flex-1 p-3 overflow-hidden">
            <MapView
              clientes={clientes}
              vendedores={vendedores}
              clientesSelecionados={clientesSelecionados}
              vendedorSelecionado={vendedorSelecionado}
              resultadoOtimizacao={resultadoOtimizacao}
              onClienteClick={toggleCliente}
              height="100%"
            />
          </div>
        )}

        {activeTab === 'planejamento' && (
          <div className="flex-1 overflow-y-auto p-4">
            <PlanejamentoSemanal />
          </div>
        )}
      </div>
    </div>
  )
}
