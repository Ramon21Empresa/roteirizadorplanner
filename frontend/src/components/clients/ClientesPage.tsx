'use client'

import { useState, useMemo } from 'react'
import { Plus, Upload, Search, Edit2, Trash2, MapPin, AlertCircle } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useStore } from '@/lib/store'
import { clientesApi } from '@/lib/api'
import { ClienteModal } from './ClienteModal'
import { ImportModal } from './ImportModal'
import type { Cliente } from '@/types'

export function ClientesPage() {
  const clientes    = useStore((s) => s.clientes)
  const vendedores  = useStore((s) => s.vendedores)
  const removeCliente = useStore((s) => s.removeCliente)

  const [search,        setSearch]        = useState('')
  const [filtroVend,    setFiltroVend]    = useState('')
  const [showModal,     setShowModal]     = useState(false)
  const [showImport,    setShowImport]    = useState(false)
  const [editCliente,   setEditCliente]   = useState<Cliente | null>(null)

  const qc = useQueryClient()

  const filtrados = useMemo(() => {
    const q = search.toLowerCase()
    return clientes.filter((c) => {
      const matchSearch  = !q || c.nome.toLowerCase().includes(q) || c.codigo.toLowerCase().includes(q) || c.endereco.toLowerCase().includes(q)
      const matchVend    = !filtroVend || (filtroVend === 'sem' ? !c.vendedorId : c.vendedorId === filtroVend)
      return matchSearch && matchVend
    })
  }, [clientes, search, filtroVend])

  const deleteMutation = useMutation({
    mutationFn: (id: string) => clientesApi.remover(id),
    onSuccess: (_data, id) => {
      removeCliente(id)
      qc.invalidateQueries({ queryKey: ['clientes'] })
      toast.success('Cliente removido')
    },
    onError: () => toast.error('Erro ao remover cliente'),
  })

  const handleDelete = (c: Cliente) => {
    if (confirm(`Remover "${c.nome}"? Esta ação não pode ser desfeita.`)) {
      deleteMutation.mutate(c.id)
    }
  }

  return (
    <div className="flex-1 p-5 flex flex-col gap-4">
      {/* ── Header ──────────────────────────────────────── */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Base de clientes ({filtrados.length})</span>
          <div className="flex items-center gap-2">
            <button className="btn btn-sm" onClick={() => setShowImport(true)}>
              <Upload size={13} /> Importar CSV
            </button>
            <button className="btn btn-sm btn-primary" onClick={() => { setEditCliente(null); setShowModal(true) }}>
              <Plus size={13} /> Novo cliente
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input pl-8"
              placeholder="Buscar por nome, código ou endereço..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="select w-48"
            value={filtroVend}
            onChange={(e) => setFiltroVend(e.target.value)}
          >
            <option value="">Todos os vendedores</option>
            {vendedores.map((v) => (
              <option key={v.id} value={v.id}>{v.nome}</option>
            ))}
            <option value="sem">Sem vendedor</option>
          </select>
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Código', 'Nome', 'Endereço', 'Vendedor', 'Coord.', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-2 text-xs text-gray-500 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map((c) => (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50 group">
                  <td className="px-4 py-2.5">
                    <span className="tag tag-gray">{c.codigo}</span>
                  </td>
                  <td className="px-4 py-2.5 font-medium">{c.nome}</td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs max-w-[200px] truncate">
                    {c.endereco}
                  </td>
                  <td className="px-4 py-2.5">
                    {c.vendedor ? (
                      <span className="tag tag-blue">{c.vendedor.nome}</span>
                    ) : (
                      <span className="tag tag-amber">Sem vínculo</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {c.lat ? (
                      <span className="tag tag-green flex items-center gap-1">
                        <MapPin size={10} /> OK
                      </span>
                    ) : (
                      <span className="tag tag-red flex items-center gap-1">
                        <AlertCircle size={10} /> Pendente
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => { setEditCliente(c); setShowModal(true) }}
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        className="btn btn-ghost btn-sm text-red-500 hover:text-red-600"
                        onClick={() => handleDelete(c)}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtrados.length === 0 && (
            <div className="flex flex-col items-center py-12 text-gray-400">
              <Search size={28} className="mb-2 opacity-40" />
              <p className="text-sm">Nenhum cliente encontrado</p>
            </div>
          )}
        </div>
      </div>

      {/* Modais */}
      {showModal && (
        <ClienteModal
          inicial={editCliente}
          onClose={() => setShowModal(false)}
        />
      )}
      {showImport && (
        <ImportModal onClose={() => setShowImport(false)} />
      )}
    </div>
  )
}
