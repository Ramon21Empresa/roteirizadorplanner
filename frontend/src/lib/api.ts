/**
 * lib/api.ts — Cliente HTTP centralizado (axios)
 * Todas as chamadas à API passam por aqui
 */

import axios from 'axios'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// Interceptor: loga erros em desenvolvimento
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (process.env.NODE_ENV === 'development') {
      console.error('[API Error]', err.response?.data || err.message)
    }
    return Promise.reject(err)
  }
)

// ── Clientes ───────────────────────────────────────────────
export const clientesApi = {
  listar:     (params?: Record<string, string>) => api.get('/clientes', { params }),
  buscar:     (id: string)                      => api.get(`/clientes/${id}`),
  criar:      (data: unknown)                   => api.post('/clientes', data),
  atualizar:  (id: string, data: unknown)       => api.put(`/clientes/${id}`, data),
  remover:    (id: string)                      => api.delete(`/clientes/${id}`),
  importar:   (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/clientes/import', form, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  geocodificarPendentes: () => api.post('/clientes/geocode/batch'),
}

// ── Vendedores ─────────────────────────────────────────────
export const vendedoresApi = {
  listar:    ()                             => api.get('/vendedores'),
  buscar:    (id: string)                   => api.get(`/vendedores/${id}`),
  criar:     (data: unknown)                => api.post('/vendedores', data),
  atualizar: (id: string, data: unknown)    => api.put(`/vendedores/${id}`, data),
  kmCiclo:   (id: string)                   => api.get(`/vendedores/${id}/km`),
}

// ── Rotas ──────────────────────────────────────────────────
export const rotasApi = {
  listar:        (params?: Record<string, string>) => api.get('/rotas', { params }),
  otimizar:      (data: { vendedorId: string; clienteIds: string[] }) =>
                   api.post('/rotas/otimizar', data),
  salvar:        (data: unknown) => api.post('/rotas', data),
  exportar:      (id: string)    => api.get(`/rotas/${id}/export`, { responseType: 'blob' }),
  exportarTodas: ()              => api.get('/rotas/export',        { responseType: 'blob' }),
}

// ── Planejamento ───────────────────────────────────────────
export const planejamentoApi = {
  listar:          (params?: Record<string, string>) => api.get('/planejamento', { params }),
  alocar:          (data: unknown)  => api.post('/planejamento', data),
  removerAlocacao: (id: string)     => api.delete(`/planejamento/${id}`),
  exportar:        (params?: Record<string, string>) =>
                     api.get('/planejamento/export', { params, responseType: 'blob' }),
}

// ── Utilitário: download de blob ───────────────────────────
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href    = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default api
