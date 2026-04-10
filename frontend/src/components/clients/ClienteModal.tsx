'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Info, X } from 'lucide-react'
import { useStore } from '@/lib/store'
import { clientesApi } from '@/lib/api'
import type { Cliente } from '@/types'

interface Props {
  inicial?: Cliente | null
  onClose: () => void
}

export function ClienteModal({ inicial, onClose }: Props) {
  const vendedores   = useStore((s) => s.vendedores)
  const addCliente   = useStore((s) => s.addCliente)
  const updateCliente = useStore((s) => s.updateCliente)
  const qc           = useQueryClient()

  const [form, setForm] = useState({
    codigo:     inicial?.codigo     || '',
    nome:       inicial?.nome       || '',
    endereco:   inicial?.endereco   || '',
    lat:        inicial?.lat?.toString()  || '',
    lng:        inicial?.lng?.toString()  || '',
    vendedorId: inicial?.vendedorId || '',
    observacao: inicial?.observacao || '',
  })

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const mutation = useMutation({
    mutationFn: (data: typeof form) =>
      inicial
        ? clientesApi.atualizar(inicial.id, data)
        : clientesApi.criar(data),
    onSuccess: ({ data }) => {
      inicial ? updateCliente(data) : addCliente(data)
      qc.invalidateQueries({ queryKey: ['clientes'] })
      toast.success(inicial ? 'Cliente atualizado' : 'Cliente criado com sucesso')
      onClose()
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Erro ao salvar cliente')
    },
  })

  const handleSave = () => {
    if (!form.codigo.trim()) { toast.error('Código é obrigatório'); return }
    if (!form.nome.trim())   { toast.error('Nome é obrigatório');   return }
    mutation.mutate(form)
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{inicial ? 'Editar' : 'Novo'} Cliente</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={15} /></button>
        </div>

        <div className="modal-body">
          <div className="alert alert-info text-xs">
            <Info size={13} className="flex-shrink-0 mt-0.5" />
            Caso informe apenas o endereço, a geocodificação será realizada automaticamente
            (requer Google Maps API Key configurada no backend).
          </div>

          {/* Código + Vendedor */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Código *</label>
              <input className="input" value={form.codigo} onChange={(e) => set('codigo', e.target.value)}
                placeholder="C011" disabled={!!inicial} />
            </div>
            <div>
              <label className="label">Vendedor</label>
              <select className="select" value={form.vendedorId} onChange={(e) => set('vendedorId', e.target.value)}>
                <option value="">Sem vínculo</option>
                {vendedores.map((v) => (
                  <option key={v.id} value={v.id}>{v.nome}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Nome */}
          <div>
            <label className="label">Nome *</label>
            <input className="input" value={form.nome} onChange={(e) => set('nome', e.target.value)}
              placeholder="Nome completo do cliente" />
          </div>

          {/* Endereço */}
          <div>
            <label className="label">Endereço completo</label>
            <input className="input" value={form.endereco} onChange={(e) => set('endereco', e.target.value)}
              placeholder="Rua, número, bairro, cidade" />
          </div>

          {/* Lat / Lng */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Latitude</label>
              <input className="input" value={form.lat} onChange={(e) => set('lat', e.target.value)}
                placeholder="-23.5505" type="number" step="any" />
            </div>
            <div>
              <label className="label">Longitude</label>
              <input className="input" value={form.lng} onChange={(e) => set('lng', e.target.value)}
                placeholder="-46.6333" type="number" step="any" />
            </div>
          </div>

          {/* Observação */}
          <div>
            <label className="label">Observação</label>
            <textarea className="input h-16 resize-none" value={form.observacao}
              onChange={(e) => set('observacao', e.target.value)}
              placeholder="Informações adicionais..." />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={mutation.isPending}>
            {mutation.isPending ? 'Salvando...' : (inicial ? 'Atualizar' : 'Criar cliente')}
          </button>
        </div>
      </div>
    </div>
  )
}
