'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { vendedoresApi } from '@/lib/api'
import { useStore } from '@/lib/store'
import type { Vendedor } from '@/types'

const CORES = ['#185FA5','#1D9E75','#D85A30','#D4537E','#BA7517','#533AB7','#639922','#E24B4A']

interface Props {
  inicial?: Vendedor | null
  onClose:  () => void
}

export function VendedorModal({ inicial, onClose }: Props) {
  const addVendedor    = useStore((s) => s.addVendedor)
  const updateVendedor = useStore((s) => s.updateVendedor)
  const qc = useQueryClient()

  const [form, setForm] = useState({
    codigo:   inicial?.codigo   || '',
    nome:     inicial?.nome     || '',
    endereco: inicial?.endereco || '',
    lat:      inicial?.lat?.toString()  || '',
    lng:      inicial?.lng?.toString()  || '',
    cor:      inicial?.cor      || CORES[0],
  })

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const mutation = useMutation({
    mutationFn: (data: typeof form) =>
      inicial
        ? vendedoresApi.atualizar(inicial.id, data)
        : vendedoresApi.criar(data),
    onSuccess: ({ data }) => {
      inicial ? updateVendedor(data) : addVendedor(data)
      qc.invalidateQueries({ queryKey: ['vendedores'] })
      toast.success(inicial ? 'Vendedor atualizado' : 'Vendedor criado')
      onClose()
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Erro ao salvar vendedor')
    },
  })

  const handleSave = () => {
    if (!form.codigo.trim()) { toast.error('Código obrigatório'); return }
    if (!form.nome.trim())   { toast.error('Nome obrigatório');   return }
    mutation.mutate(form)
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{inicial ? 'Editar' : 'Novo'} Vendedor</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={15} /></button>
        </div>

        <div className="modal-body">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Código *</label>
              <input className="input" value={form.codigo} onChange={(e) => set('codigo', e.target.value)}
                placeholder="V03" disabled={!!inicial} />
            </div>
            <div>
              <label className="label">Cor no mapa</label>
              <div className="flex gap-1.5 flex-wrap mt-1">
                {CORES.map((c) => (
                  <button
                    key={c}
                    onClick={() => set('cor', c)}
                    className="w-6 h-6 rounded-full border-2 transition-all"
                    style={{
                      background: c,
                      borderColor: form.cor === c ? '#1a1a1a' : 'white',
                      transform: form.cor === c ? 'scale(1.2)' : 'scale(1)',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="label">Nome *</label>
            <input className="input" value={form.nome} onChange={(e) => set('nome', e.target.value)}
              placeholder="Nome do vendedor" />
          </div>

          <div>
            <label className="label">Endereço da base (ponto de partida/retorno)</label>
            <input className="input" value={form.endereco} onChange={(e) => set('endereco', e.target.value)}
              placeholder="Rua, número, bairro, cidade" />
          </div>

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
        </div>

        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={mutation.isPending}>
            {mutation.isPending ? 'Salvando...' : (inicial ? 'Atualizar' : 'Criar vendedor')}
          </button>
        </div>
      </div>
    </div>
  )
}
