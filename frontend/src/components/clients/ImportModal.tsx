'use client'

import { useState, useRef } from 'react'
import { X, Upload, CheckCircle, AlertCircle, FileText } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import Papa from 'papaparse'
import { clientesApi } from '@/lib/api'
import { useStore } from '@/lib/store'
import type { Cliente } from '@/types'

interface Props {
  onClose: () => void
}

const CSV_EXEMPLO = `codigo,nome,endereco,lat,lng,vendedorCodigo
C011,Mercado Novo,Rua das Acácias 100,-23.555,-46.640,V01
C012,Padaria Central,Av. Brasil 500,,,V02`

export function ImportModal({ onClose }: Props) {
  const setClientes = useStore((s) => s.setClientes)
  const qc = useQueryClient()

  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview]   = useState<Record<string, string>[] | null>(null)
  const [filename, setFilename] = useState('')
  const [resultado, setResultado] = useState<{ criados: number; atualizados: number; erros: string[] } | null>(null)

  const handleFile = (file: File) => {
    setFilename(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      const { data } = Papa.parse<Record<string, string>>(e.target!.result as string, {
        header: true, skipEmptyLines: true,
      })
      setPreview(data.slice(0, 5))
    }
    reader.readAsText(file)
  }

  const importMutation = useMutation({
    mutationFn: () => {
      if (!inputRef.current?.files?.[0]) throw new Error('Selecione um arquivo')
      return clientesApi.importar(inputRef.current.files[0])
    },
    onSuccess: async ({ data }) => {
      setResultado(data)
      // Recarrega lista
      const { data: novos } = await clientesApi.listar()
      setClientes(novos as Cliente[])
      qc.invalidateQueries({ queryKey: ['clientes'] })
      toast.success(`${data.criados} criados, ${data.atualizados} atualizados`)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Erro na importação')
    },
  })

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.xlsx'))) {
      if (inputRef.current) {
        const dt = new DataTransfer()
        dt.items.add(file)
        inputRef.current.files = dt.files
      }
      handleFile(file)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <span className="modal-title">Importar Clientes via CSV</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={15} /></button>
        </div>

        <div className="modal-body">
          {!resultado ? (
            <>
              {/* Exemplo de formato */}
              <div className="alert alert-info text-xs">
                <FileText size={13} className="flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium mb-1">Formato esperado do CSV:</div>
                  <code className="block bg-blue-100 rounded p-2 text-[11px] whitespace-pre font-mono">
                    {CSV_EXEMPLO}
                  </code>
                  <div className="mt-1 text-[11px] opacity-80">
                    Campos lat/lng opcionais — sem eles, a geocodificação é automática.
                  </div>
                </div>
              </div>

              {/* Drop zone */}
              <label
                className="block border-2 border-dashed border-gray-200 rounded-xl p-8 text-center
                           cursor-pointer hover:border-brand-400 hover:bg-brand-50 transition-all"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".csv,.xlsx"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
                <Upload size={24} className="mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-600">
                  {filename || 'Clique aqui ou arraste um arquivo CSV / Excel'}
                </p>
                <p className="text-xs text-gray-400 mt-1">Máx. 5 MB</p>
              </label>

              {/* Preview */}
              {preview && (
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-2">
                    Prévia (primeiras {preview.length} linhas):
                  </p>
                  <div className="overflow-x-auto rounded-lg border border-gray-100">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          {Object.keys(preview[0]).map((k) => (
                            <th key={k} className="px-3 py-2 text-left text-gray-500 font-medium">{k}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.map((row, i) => (
                          <tr key={i} className="border-t border-gray-100">
                            {Object.values(row).map((v, j) => (
                              <td key={j} className="px-3 py-1.5 text-gray-700 max-w-[120px] truncate">{v}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Resultado da importação */
            <div className="flex flex-col gap-3">
              <div className="alert alert-success">
                <CheckCircle size={15} />
                <div>
                  <div className="font-medium">Importação concluída!</div>
                  <div className="text-xs mt-0.5">
                    {resultado.criados} criados · {resultado.atualizados} atualizados
                  </div>
                </div>
              </div>
              {resultado.erros.length > 0 && (
                <div className="alert alert-warning">
                  <AlertCircle size={15} />
                  <div>
                    <div className="font-medium">{resultado.erros.length} linha(s) com erro:</div>
                    {resultado.erros.slice(0, 3).map((e, i) => (
                      <div key={i} className="text-xs mt-0.5">{e}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn" onClick={onClose}>
            {resultado ? 'Fechar' : 'Cancelar'}
          </button>
          {!resultado && (
            <button
              className="btn btn-primary"
              onClick={() => importMutation.mutate()}
              disabled={!preview || importMutation.isPending}
            >
              {importMutation.isPending ? 'Importando...' : 'Confirmar importação'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
