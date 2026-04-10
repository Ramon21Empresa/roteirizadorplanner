/**
 * types/index.ts — Tipos TypeScript compartilhados em todo o frontend
 * Espelham os modelos do Prisma no backend
 */

export type DiaSemana = 'SEGUNDA' | 'TERCA' | 'QUARTA' | 'QUINTA' | 'SEXTA' | 'SABADO'
export type RotaStatus = 'RASCUNHO' | 'SIMULADA' | 'CONFIRMADA'

export interface Vendedor {
  id: string
  codigo: string
  nome: string
  endereco: string
  lat: number | null
  lng: number | null
  ativo: boolean
  cor: string | null
  createdAt: string
  _count?: { clientes: number; rotas: number }
}

export interface Cliente {
  id: string
  codigo: string
  nome: string
  endereco: string
  lat: number | null
  lng: number | null
  ativo: boolean
  observacao?: string | null
  vendedorId?: string | null
  vendedor?: Pick<Vendedor, 'id' | 'nome' | 'cor'> | null
  createdAt: string
}

export interface RotaCliente {
  id: string
  ordem: number
  distProx: number | null
  cliente: Cliente
}

export interface Rota {
  id: string
  nome: string
  vendedorId: string
  vendedor: Pick<Vendedor, 'id' | 'nome' | 'cor'>
  kmTotal: number
  tempoMin: number
  otimizada: boolean
  status: RotaStatus
  observacao?: string | null
  createdAt: string
  clientes: RotaCliente[]
}

export interface PlanejamentoDia {
  id: string
  clienteId: string
  vendedorId: string
  diaSemana: DiaSemana
  semanasMes: number
  cliente: Pick<Cliente, 'id' | 'codigo' | 'nome' | 'lat' | 'lng'>
  vendedor: Pick<Vendedor, 'id' | 'nome' | 'cor'>
}

// Resultado do endpoint POST /api/rotas/otimizar
export interface ResultadoOtimizacao {
  vendedor: { id: string; nome: string; lat: number; lng: number }
  ordemOtimizada: Array<{ id: string; lat: number; lng: number; nome: string; distProx: number }>
  clientesOriginais: Cliente[]
  kmTotal: number
  tempoMin: number
  usouGoogleMaps: boolean
}

// Forma do objeto no store/state local de planejamento
export interface SlotPlanejamento {
  dia: DiaSemana
  semana: number   // 1–4
  clientes: Cliente[]
}
