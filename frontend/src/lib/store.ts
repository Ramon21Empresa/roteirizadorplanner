/**
 * lib/store.ts — Estado global com Zustand
 * Mantém clientes, vendedores, rota ativa e planejamento em memória
 */

import { create } from 'zustand'
import type { Cliente, Vendedor, Rota, PlanejamentoDia, DiaSemana, ResultadoOtimizacao } from '@/types'

interface AppStore {
  // ── Dados base ─────────────────────────────────────────
  clientes:   Cliente[]
  vendedores: Vendedor[]
  rotas:      Rota[]
  planejamento: PlanejamentoDia[]

  setClientes:     (c: Cliente[])       => void
  setVendedores:   (v: Vendedor[])      => void
  setRotas:        (r: Rota[])          => void
  setPlanejamento: (p: PlanejamentoDia[]) => void

  addCliente:    (c: Cliente)   => void
  updateCliente: (c: Cliente)   => void
  removeCliente: (id: string)   => void

  addVendedor:    (v: Vendedor)  => void
  updateVendedor: (v: Vendedor)  => void

  addRota:    (r: Rota) => void
  removeRota: (id: string) => void

  // ── Estado da sessão de roteirização ──────────────────
  vendedorSelecionado:  string | null
  clientesSelecionados: string[]
  resultadoOtimizacao:  ResultadoOtimizacao | null
  rotaAtiva:            Rota | null

  setVendedorSelecionado:  (id: string | null)         => void
  setClientesSelecionados: (ids: string[])              => void
  toggleClienteSelecionado:(id: string)                 => void
  setResultadoOtimizacao:  (r: ResultadoOtimizacao | null) => void
  setRotaAtiva:            (r: Rota | null)              => void

  // ── Filtros da lista de clientes ──────────────────────
  filtroCliente:   string
  filtroVendedor:  string
  setFiltroCliente:  (v: string) => void
  setFiltroVendedor: (v: string) => void
}

export const useStore = create<AppStore>((set) => ({
  clientes:    [],
  vendedores:  [],
  rotas:       [],
  planejamento: [],

  setClientes:     (c)  => set({ clientes: c }),
  setVendedores:   (v)  => set({ vendedores: v }),
  setRotas:        (r)  => set({ rotas: r }),
  setPlanejamento: (p)  => set({ planejamento: p }),

  addCliente:    (c)  => set((s) => ({ clientes: [...s.clientes, c] })),
  updateCliente: (c)  => set((s) => ({ clientes: s.clientes.map((x) => x.id === c.id ? c : x) })),
  removeCliente: (id) => set((s) => ({ clientes: s.clientes.filter((x) => x.id !== id) })),

  addVendedor:    (v)  => set((s) => ({ vendedores: [...s.vendedores, v] })),
  updateVendedor: (v)  => set((s) => ({ vendedores: s.vendedores.map((x) => x.id === v.id ? v : x) })),

  addRota:    (r)  => set((s) => ({ rotas: [r, ...s.rotas] })),
  removeRota: (id) => set((s) => ({ rotas: s.rotas.filter((x) => x.id !== id) })),

  vendedorSelecionado:  null,
  clientesSelecionados: [],
  resultadoOtimizacao:  null,
  rotaAtiva:            null,

  setVendedorSelecionado:  (id) => set({ vendedorSelecionado: id, clientesSelecionados: [], resultadoOtimizacao: null }),
  setClientesSelecionados: (ids) => set({ clientesSelecionados: ids }),
  toggleClienteSelecionado: (id) =>
    set((s) => ({
      clientesSelecionados: s.clientesSelecionados.includes(id)
        ? s.clientesSelecionados.filter((x) => x !== id)
        : [...s.clientesSelecionados, id],
    })),
  setResultadoOtimizacao: (r)  => set({ resultadoOtimizacao: r }),
  setRotaAtiva:           (r)  => set({ rotaAtiva: r }),

  filtroCliente:  '',
  filtroVendedor: '',
  setFiltroCliente:  (v) => set({ filtroCliente: v }),
  setFiltroVendedor: (v) => set({ filtroVendedor: v }),
}))
