'use client'

import { useState, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Download, Info, X } from 'lucide-react'
import { useStore } from '@/lib/store'
import { planejamentoApi, downloadBlob } from '@/lib/api'
import type { DiaSemana, PlanejamentoDia, Cliente } from '@/types'

const DIAS: { id: DiaSemana; label: string; abrev: string }[] = [
  { id: 'SEGUNDA', label: 'Segunda',  abrev: 'Seg' },
  { id: 'TERCA',   label: 'Terça',    abrev: 'Ter' },
  { id: 'QUARTA',  label: 'Quarta',   abrev: 'Qua' },
  { id: 'QUINTA',  label: 'Quinta',   abrev: 'Qui' },
  { id: 'SEXTA',   label: 'Sexta',    abrev: 'Sex' },
  { id: 'SABADO',  label: 'Sábado',   abrev: 'Sáb' },
]

const SEMANAS = [1, 2, 3, 4]

// ── Chip de cliente dentro de um slot ─────────────────────
function ClienteChip({
  plano,
  onRemover,
}: {
  plano: PlanejamentoDia
  onRemover: (id: string) => void
}) {
  return (
    <div
      className="route-chip"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('clienteId',   plano.cliente.id)
        e.dataTransfer.setData('planejamentoId', plano.id)
        e.dataTransfer.effectAllowed = 'move'
      }}
    >
      <span className="truncate max-w-[72px]" title={plano.cliente.nome}>
        {plano.cliente.nome.split(' ')[0]}
      </span>
      <button
        className="ml-1 text-gray-400 hover:text-red-500 transition-colors"
        onClick={(e) => { e.stopPropagation(); onRemover(plano.id) }}
      >
        <X size={10} />
      </button>
    </div>
  )
}

// ── Célula de um dia/semana ────────────────────────────────
function CelulaPlano({
  dia,
  semana,
  planos,
  onDrop,
  onRemover,
}: {
  dia: DiaSemana
  semana: number
  planos: PlanejamentoDia[]
  onDrop: (dia: DiaSemana, semana: number, clienteId: string, planejamentoIdOrigem?: string) => void
  onRemover: (id: string) => void
}) {
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setIsDragOver(true)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const clienteId        = e.dataTransfer.getData('clienteId')
    const planejamentoId   = e.dataTransfer.getData('planejamentoId')
    if (clienteId) onDrop(dia, semana, clienteId, planejamentoId || undefined)
  }

  const isSabado = dia === 'SABADO'

  return (
    <div
      className={`drop-zone ${isDragOver ? 'drop-zone-over' : ''} ${isSabado ? 'bg-amber-50/50' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      {planos.map((p) => (
        <ClienteChip key={p.id} plano={p} onRemover={onRemover} />
      ))}
      {planos.length === 0 && (
        <div className="text-[10px] text-gray-300 text-center py-2 select-none">
          soltar aqui
        </div>
      )}
    </div>
  )
}

// ── Painel de clientes disponíveis (fonte de arrastar) ─────
function PainelClientes({
  clientes,
  vendedorId,
}: {
  clientes: Cliente[]
  vendedorId: string | null
}) {
  const filtrados = vendedorId
    ? clientes.filter((c) => c.vendedorId === vendedorId)
    : clientes

  return (
    <div className="card mb-4">
      <div className="card-header">
        <span className="card-title">
          Clientes disponíveis{vendedorId ? ` (vendedor selecionado)` : ' (todos)'}
        </span>
        <span className="tag tag-gray text-[10px]">{filtrados.length}</span>
      </div>
      <div className="p-3 flex flex-wrap gap-1.5">
        {filtrados.map((c) => (
          <div
            key={c.id}
            className="chip cursor-grab active:cursor-grabbing active:opacity-60"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('clienteId', c.id)
              e.dataTransfer.effectAllowed = 'copy'
            }}
            title={c.endereco}
          >
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: c.vendedor?.cor || '#888' }}
            />
            {c.nome.split(' ')[0]}
          </div>
        ))}
        {filtrados.length === 0 && (
          <span className="text-xs text-gray-400">
            Nenhum cliente para mostrar
          </span>
        )}
      </div>
    </div>
  )
}

// ── Componente principal ───────────────────────────────────
export function PlanejamentoSemanal() {
  const clientes          = useStore((s) => s.clientes)
  const vendedores        = useStore((s) => s.vendedores)
  const planejamento      = useStore((s) => s.planejamento)
  const setPlanejamento   = useStore((s) => s.setPlanejamento)
  const vendedorSelecionado = useStore((s) => s.vendedorSelecionado)

  const [filtroPorVendedor, setFiltroPorVendedor] = useState(true)
  const qc = useQueryClient()

  // ── Alocar cliente ────────────────────────────────────
  const alocarMutation = useMutation({
    mutationFn: (data: { clienteId: string; vendedorId: string; diaSemana: DiaSemana; semanasMes: number }) =>
      planejamentoApi.alocar(data),
    onSuccess: ({ data }) => {
      setPlanejamento([
        ...planejamento.filter((p) => p.id !== (data as PlanejamentoDia).id),
        data as PlanejamentoDia,
      ])
      qc.invalidateQueries({ queryKey: ['planejamento'] })
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Erro ao alocar cliente')
    },
  })

  // ── Remover alocação ──────────────────────────────────
  const removerMutation = useMutation({
    mutationFn: (id: string) => planejamentoApi.removerAlocacao(id),
    onSuccess: (_data, id) => {
      setPlanejamento(planejamento.filter((p) => p.id !== id))
      qc.invalidateQueries({ queryKey: ['planejamento'] })
    },
    onError: () => toast.error('Erro ao remover alocação'),
  })

  const handleDrop = useCallback(
    (dia: DiaSemana, semana: number, clienteId: string, planejamentoIdOrigem?: string) => {
      const cliente = clientes.find((c) => c.id === clienteId)
      if (!cliente) return

      const vendedorId = cliente.vendedorId || vendedorSelecionado
      if (!vendedorId) {
        toast.error('Cliente sem vendedor vinculado. Vincule antes de alocar.')
        return
      }

      // Verifica regra do sábado
      if (dia === 'SABADO') {
        const diasUteis: DiaSemana[] = ['SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA']
        const temDiaFixo = planejamento.some(
          (p) => p.clienteId === clienteId && diasUteis.includes(p.diaSemana)
        )
        if (temDiaFixo) {
          toast.error('Este cliente já tem dia fixo (seg–sex). Sábado é para clientes sem dia definido.')
          return
        }
      }

      // Remove origem se veio de outro slot (mover, não copiar)
      if (planejamentoIdOrigem) {
        const origem = planejamento.find((p) => p.id === planejamentoIdOrigem)
        if (origem && (origem.diaSemana !== dia || origem.semanasMes !== semana)) {
          removerMutation.mutate(planejamentoIdOrigem)
        }
      }

      alocarMutation.mutate({ clienteId, vendedorId, diaSemana: dia, semanasMes: semana })
    },
    [clientes, planejamento, vendedorSelecionado, alocarMutation, removerMutation]
  )

  // ── Exportar planejamento ─────────────────────────────
  const exportarMutation = useMutation({
    mutationFn: () =>
      planejamentoApi.exportar(vendedorSelecionado ? { vendedorId: vendedorSelecionado } : undefined),
    onSuccess: ({ data }) => {
      downloadBlob(data as Blob, 'planejamento.csv')
      toast.success('Planejamento exportado!')
    },
    onError: () => toast.error('Erro ao exportar'),
  })

  // Filtra clientes para o painel de arraste
  const clientesDisponiveis = filtroPorVendedor && vendedorSelecionado
    ? clientes.filter((c) => c.vendedorId === vendedorSelecionado)
    : clientes

  return (
    <div className="flex flex-col gap-4">
      {/* Aviso e ações */}
      <div className="flex items-start justify-between gap-4">
        <div className="alert alert-info text-xs flex-1">
          <Info size={13} className="flex-shrink-0 mt-0.5" />
          Arraste clientes do painel acima para os slots abaixo.
          Sábado aceita apenas clientes <strong>sem dia fixo</strong> definido.
          Para mover entre dias: arraste o chip de um slot para outro.
        </div>
        <button
          className="btn btn-sm flex-shrink-0"
          onClick={() => exportarMutation.mutate()}
          disabled={exportarMutation.isPending}
        >
          <Download size={13} />
          {exportarMutation.isPending ? 'Exportando...' : 'Exportar CSV'}
        </button>
      </div>

      {/* Filtro de vendedor */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500">Mostrar clientes:</span>
        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={filtroPorVendedor}
            onChange={(e) => setFiltroPorVendedor(e.target.checked)}
            className="w-3 h-3"
          />
          Apenas do vendedor selecionado
        </label>
        {vendedorSelecionado && (
          <span className="tag tag-blue">
            {vendedores.find((v) => v.id === vendedorSelecionado)?.nome}
          </span>
        )}
      </div>

      {/* Painel de clientes disponíveis */}
      <PainelClientes
        clientes={clientesDisponiveis}
        vendedorId={filtroPorVendedor ? vendedorSelecionado : null}
      />

      {/* Grade semanal */}
      {SEMANAS.map((semana) => (
        <div key={semana} className="card">
          <div className="card-header">
            <span className="card-title">Semana {semana}</span>
            <span className="tag tag-gray text-[10px]">
              {planejamento.filter((p) => p.semanasMes === semana).length} alocações
            </span>
          </div>

          <div className="p-3">
            <div className="grid grid-cols-6 gap-2">
              {DIAS.map(({ id, label, abrev }) => {
                const planosSlot = planejamento.filter(
                  (p) => p.diaSemana === id && p.semanasMes === semana
                )
                const isSabado = id === 'SABADO'

                return (
                  <div key={id}>
                    <div className={`text-center text-xs font-medium mb-1.5 ${isSabado ? 'text-amber-600' : 'text-gray-600'}`}>
                      <span className="hidden md:inline">{label}</span>
                      <span className="md:hidden">{abrev}</span>
                    </div>
                    <CelulaPlano
                      dia={id}
                      semana={semana}
                      planos={planosSlot}
                      onDrop={handleDrop}
                      onRemover={(id) => removerMutation.mutate(id)}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
