'use client'

import { useState } from 'react'
import { Map, Users, UserCheck, Route, LayoutDashboard } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { clientesApi, vendedoresApi, rotasApi, planejamentoApi } from '@/lib/api'
import { useStore } from '@/lib/store'
import { ClientesPage } from '@/components/clients/ClientesPage'
import { VendedoresPage } from '@/components/vendors/VendedoresPage'
import { RotasPage } from '@/components/routes/RotasPage'
import type { Cliente, Vendedor, Rota, PlanejamentoDia } from '@/types'

type Tab = 'dashboard' | 'clientes' | 'vendedores' | 'rotas'

// ── Carrega dados iniciais e injeta no store ───────────────
function DataLoader() {
  const { setClientes, setVendedores, setRotas, setPlanejamento } = useStore()

  useQuery({
    queryKey: ['clientes'],
    queryFn: async () => {
      const { data } = await clientesApi.listar()
      setClientes(data as Cliente[])
      return data
    },
  })
  useQuery({
    queryKey: ['vendedores'],
    queryFn: async () => {
      const { data } = await vendedoresApi.listar()
      setVendedores(data as Vendedor[])
      return data
    },
  })
  useQuery({
    queryKey: ['rotas'],
    queryFn: async () => {
      const { data } = await rotasApi.listar()
      setRotas(data as Rota[])
      return data
    },
  })
  useQuery({
    queryKey: ['planejamento'],
    queryFn: async () => {
      const { data } = await planejamentoApi.listar()
      setPlanejamento(data as PlanejamentoDia[])
      return data
    },
  })

  return null
}

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const clientes  = useStore((s) => s.clientes)
  const vendedores = useStore((s) => s.vendedores)

  const tabs = [
    { id: 'dashboard' as Tab, label: 'Dashboard',         icon: LayoutDashboard },
    { id: 'clientes'  as Tab, label: 'Clientes',          icon: Users,      count: clientes.length },
    { id: 'vendedores'as Tab, label: 'Vendedores',        icon: UserCheck,  count: vendedores.length },
    { id: 'rotas'     as Tab, label: 'Rotas & Simulação', icon: Route },
  ]

  return (
    <div className="app-shell">
      <DataLoader />

      {/* ── Topbar ─────────────────────────────────────────── */}
      <header className="app-topbar">
        {/* Logo */}
        <div className="flex items-center gap-2 mr-2">
          <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center flex-shrink-0">
            <Map size={14} className="text-white" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight">RoutePlan</span>
        </div>

        {/* Nav tabs */}
        <nav className="flex gap-0.5">
          {tabs.map((t) => {
            const Icon = t.icon
            const active = activeTab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all
                  ${active
                    ? 'bg-gray-100 text-gray-900 font-medium'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                  }`}
              >
                <Icon size={14} />
                {t.label}
                {t.count !== undefined && (
                  <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-brand-600 text-white text-[10px] font-semibold leading-none">
                    {t.count}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </header>

      {/* ── Conteúdo por aba ───────────────────────────────── */}
      <main className={`app-main ${activeTab !== 'rotas' ? 'overflow-auto' : 'overflow-hidden'}`}>
        {activeTab === 'dashboard'  && children}
        {activeTab === 'clientes'   && <ClientesPage />}
        {activeTab === 'vendedores' && <VendedoresPage />}
        {activeTab === 'rotas'      && <RotasPage />}
      </main>
    </div>
  )
}
