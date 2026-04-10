'use client'

import { useState } from 'react'
import { Zap, Save, Download, Home, ChevronRight, RotateCcw, Info } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useStore } from '@/lib/store'
import { rotasApi, downloadBlob } from '@/lib/api'
import { formatarTempo } from '@/lib/tsp'
import type { Rota, ResultadoOtimizacao } from '@/types'

export function RotasSidebar() {
  const vendedores           = useStore((s) => s.vendedores)
  const clientes             = useStore((s) => s.clientes)
  const rotas                = useStore((s) => s.rotas)
  const vendedorSelecionado  = useStore((s) => s.vendedorSelecionado)
  const clientesSelecionados = useStore((s) => s.clientesSelecionados)
  const resultado            = useStore((s) => s.resultadoOtimizacao)
  const rotaAtiva            = useStore((s) => s.rotaAtiva)

  const setVendedor      = useStore((s) => s.setVendedorSelecionado)
  const toggleCliente    = useStore((s) => s.toggleClienteSelecionado)
  const setClientes      = useStore((s) => s.setClientesSelecionados)
  const setResultado     = useStore((s) => s.setResultadoOtimizacao)
  const setRotaAtiva     = useStore((s) => s.setRotaAtiva)
  const addRota          = useStore((s) => s.addRota)

  const qc = useQueryClient()

  const vendedor          = vendedores.find((v) => v.id === vendedorSelecionado)
  const clientesDoVendedor = clientes.filter((c) => c.vendedorId === vendedorSelecionado)

  // ── Otimizar ─────────────────────────────────────────
  const otimizarMutation = useMutation({
    mutationFn: () =>
      rotasApi.otimizar({ vendedorId: vendedorSelecionado!, clienteIds: clientesSelecionados }),
    onSuccess: ({ data }) => {
      setResultado(data as ResultadoOtimizacao)
      toast.success(`Rota otimizada — ${(data as ResultadoOtimizacao).kmTotal} km`)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Erro ao otimizar rota')
    },
  })

  const handleOtimizar = () => {
    if (!vendedorSelecionado) { toast.error('Selecione um vendedor'); return }
    if (!clientesSelecionados.length) { toast.error('Selecione ao menos um cliente'); return }
    otimizarMutation.mutate()
  }

  // ── Salvar rota ───────────────────────────────────────
  const salvarMutation = useMutation({
    mutationFn: () => {
      if (!resultado) throw new Error('Otimize a rota antes de salvar')
      return rotasApi.salvar({
        nome:        `Rota ${vendedor?.nome} — ${new Date().toLocaleDateString('pt-BR')}`,
        vendedorId:  vendedorSelecionado,
        clienteIds:  resultado.ordemOtimizada.map((p) => p.id),
        kmTotal:     resultado.kmTotal,
        tempoMin:    resultado.tempoMin,
        otimizada:   true,
      })
    },
    onSuccess: ({ data }) => {
      addRota(data as Rota)
      setRotaAtiva(data as Rota)
      qc.invalidateQueries({ queryKey: ['rotas'] })
      toast.success('Rota salva com sucesso!')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Erro ao salvar rota')
    },
  })

  // ── Exportar rota ─────────────────────────────────────
  const exportarMutation = useMutation({
    mutationFn: (id: string) => rotasApi.exportar(id),
    onSuccess: ({ data }, id) => {
      const rota = rotas.find((r) => r.id === id)
      downloadBlob(data as Blob, `rota-${rota?.nome || id}.xlsx`)
      toast.success('Excel baixado!')
    },
    onError: () => toast.error('Erro ao exportar'),
  })

  const [mostrarRotasSalvas, setMostrarRotasSalvas] = useState(true)

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        Módulo de Rotas
        <button
          className="btn btn-ghost btn-sm text-xs"
          onClick={() => { setResultado(null); setClientes([]); setRotaAtiva(null) }}
          title="Limpar seleção"
        >
          <RotateCcw size={12} />
        </button>
      </div>

      <div className="sidebar-body flex flex-col gap-4">

        {/* ── Seleção de vendedor ──────────────────────── */}
        <div>
          <label className="label">Vendedor</label>
          <select
            className="select"
            value={vendedorSelecionado || ''}
            onChange={(e) => setVendedor(e.target.value || null)}
          >
            <option value="">Selecione um vendedor...</option>
            {vendedores.map((v) => (
              <option key={v.id} value={v.id}>{v.nome} ({v.codigo})</option>
            ))}
          </select>
        </div>

        {/* ── Clientes do vendedor ────────────────────── */}
        {vendedorSelecionado && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="label mb-0">
                Clientes ({clientesDoVendedor.length})
              </span>
              <div className="flex gap-1">
                <button className="btn btn-ghost btn-sm text-xs"
                  onClick={() => setClientes(clientesDoVendedor.map((c) => c.id))}>
                  Todos
                </button>
                <button className="btn btn-ghost btn-sm text-xs"
                  onClick={() => setClientes([])}>
                  Limpar
                </button>
              </div>
            </div>

            {clientesDoVendedor.length === 0 ? (
              <div className="text-xs text-gray-400 py-2 text-center">
                Nenhum cliente vinculado a este vendedor
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {clientesDoVendedor.map((c) => {
                  const selecionado = clientesSelecionados.includes(c.id)
                  const semCoord    = !c.lat || !c.lng
                  return (
                    <button
                      key={c.id}
                      onClick={() => !semCoord && toggleCliente(c.id)}
                      title={semCoord ? 'Sem coordenadas — geocodifique primeiro' : c.endereco}
                      className={`chip ${selecionado ? 'chip-active' : ''} ${semCoord ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: vendedor?.cor || '#185FA5' }}
                      />
                      {c.nome.split(' ')[0]}
                      {semCoord && <span className="text-amber-500">!</span>}
                    </button>
                  )
                })}
              </div>
            )}

            <div className="text-xs text-gray-400 mt-1">
              {clientesSelecionados.length} selecionado(s)
            </div>
          </div>
        )}

        {/* ── Botão otimizar ───────────────────────────── */}
        <button
          className="btn btn-primary w-full"
          onClick={handleOtimizar}
          disabled={otimizarMutation.isPending || !vendedorSelecionado || !clientesSelecionados.length}
        >
          <Zap size={14} />
          {otimizarMutation.isPending ? 'Otimizando...' : 'Otimizar rota (TSP)'}
        </button>

        {/* ── Resultado da otimização ──────────────────── */}
        {resultado && (
          <div className="flex flex-col gap-2">
            {/* Métricas */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-blue-50 rounded-lg p-2.5 text-center">
                <div className="text-base font-semibold text-blue-800">{resultado.kmTotal} km</div>
                <div className="text-[10px] text-blue-600">percurso total</div>
              </div>
              <div className="bg-amber-50 rounded-lg p-2.5 text-center">
                <div className="text-base font-semibold text-amber-800">{formatarTempo(resultado.tempoMin)}</div>
                <div className="text-[10px] text-amber-600">tempo estimado</div>
              </div>
            </div>

            {resultado.usouGoogleMaps && (
              <div className="alert alert-success text-xs py-1.5">
                <Info size={11} /> Cálculo via Google Maps Directions API
              </div>
            )}

            {/* Ordem da rota */}
            <div>
              <div className="text-xs font-medium text-gray-600 mb-1.5">Sequência otimizada</div>
              <div className="flex flex-col gap-1">
                {/* Início */}
                <div className="flex items-center gap-2 px-2.5 py-1.5 bg-green-50 rounded-lg text-xs">
                  <div className="w-5 h-5 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
                    <Home size={9} className="text-white" />
                  </div>
                  <span className="font-medium text-green-800">{vendedor?.nome} (base)</span>
                </div>

                {resultado.ordemOtimizada.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-2 px-2.5 py-1.5 bg-gray-50 rounded-lg text-xs">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 text-[9px]"
                      style={{ background: vendedor?.cor || '#185FA5' }}
                    >
                      {i + 1}
                    </div>
                    <span className="flex-1 truncate">{p.nome}</span>
                    {p.distProx && (
                      <span className="text-gray-400 flex-shrink-0">{p.distProx} km</span>
                    )}
                    <ChevronRight size={10} className="text-gray-300 flex-shrink-0" />
                  </div>
                ))}

                {/* Retorno */}
                <div className="flex items-center gap-2 px-2.5 py-1.5 bg-green-50 rounded-lg text-xs">
                  <div className="w-5 h-5 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
                    <Home size={9} className="text-white" />
                  </div>
                  <span className="font-medium text-green-800">{vendedor?.nome} (retorno)</span>
                </div>
              </div>
            </div>

            {/* Salvar */}
            <button
              className="btn btn-primary w-full"
              onClick={() => salvarMutation.mutate()}
              disabled={salvarMutation.isPending}
            >
              <Save size={13} />
              {salvarMutation.isPending ? 'Salvando...' : 'Salvar esta rota'}
            </button>
          </div>
        )}

        {/* ── Rotas salvas ─────────────────────────────── */}
        {rotas.length > 0 && (
          <div>
            <button
              className="flex items-center justify-between w-full text-xs font-medium text-gray-600 mb-2"
              onClick={() => setMostrarRotasSalvas((v) => !v)}
            >
              Rotas salvas ({rotas.length})
              <ChevronRight
                size={13}
                className={`transition-transform ${mostrarRotasSalvas ? 'rotate-90' : ''}`}
              />
            </button>

            {mostrarRotasSalvas && (
              <div className="flex flex-col gap-1.5">
                {rotas.slice(0, 8).map((r) => (
                  <div
                    key={r.id}
                    className={`list-item ${rotaAtiva?.id === r.id ? 'list-item-selected' : ''}`}
                    onClick={() => setRotaAtiva(rotaAtiva?.id === r.id ? null : r)}
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: r.vendedor.cor || '#185FA5' }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">{r.nome}</div>
                      <div className="text-[10px] text-gray-500">
                        {r.kmTotal} km · {formatarTempo(r.tempoMin)} · {r.clientes.length} clientes
                      </div>
                    </div>
                    <button
                      className="btn btn-ghost btn-sm opacity-60 hover:opacity-100"
                      onClick={(e) => { e.stopPropagation(); exportarMutation.mutate(r.id) }}
                      title="Exportar Excel"
                    >
                      <Download size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
