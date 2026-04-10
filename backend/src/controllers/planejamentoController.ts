/**
 * controllers/planejamentoController.ts
 * Gerencia o calendário logístico (alocação cliente × dia × semana)
 */

import { Request, Response } from 'express'
import { prisma } from '../config/database'
import { DiaSemana } from '@prisma/client'

const DIAS_UTEIS: DiaSemana[] = ['SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA']

// ── Listar planejamento ────────────────────────────────────
export async function listarPlanejamento(req: Request, res: Response) {
  const { vendedorId } = req.query

  const planos = await prisma.planejamentoDia.findMany({
    where: vendedorId ? { vendedorId: vendedorId as string } : {},
    include: {
      cliente: { select: { id: true, codigo: true, nome: true, lat: true, lng: true } },
      vendedor: { select: { id: true, nome: true, cor: true } },
    },
    orderBy: [{ semanasMes: 'asc' }, { diaSemana: 'asc' }],
  })

  res.json(planos)
}

// ── Alocar cliente em um dia ───────────────────────────────
export async function alocarCliente(req: Request, res: Response) {
  const { clienteId, vendedorId, diaSemana, semanasMes } = req.body as {
    clienteId: string
    vendedorId: string
    diaSemana: DiaSemana
    semanasMes: number
  }

  // ── Regra do sábado ──────────────────────────────────────
  // Sábado só aceita clientes sem dia fixo (seg–sex)
  if (diaSemana === 'SABADO') {
    const temDiaFixo = await prisma.planejamentoDia.findFirst({
      where: { clienteId, diaSemana: { in: DIAS_UTEIS } },
    })
    if (temDiaFixo) {
      return res.status(422).json({
        error: 'Este cliente já tem dia fixo (seg–sex). Sábado é reservado para clientes sem dia definido.',
      })
    }
  }

  // ── Upsert: cria ou atualiza se já existia neste dia/semana ──
  const plano = await prisma.planejamentoDia.upsert({
    where: {
      clienteId_diaSemana_semanasMes: { clienteId, diaSemana, semanasMes },
    },
    create: { clienteId, vendedorId, diaSemana, semanasMes: Number(semanasMes) },
    update: { vendedorId },
    include: { cliente: true },
  })

  res.status(201).json(plano)
}

// ── Remover alocação ───────────────────────────────────────
export async function removerAlocacao(req: Request, res: Response) {
  await prisma.planejamentoDia.delete({ where: { id: req.params.id } })
  res.status(204).send()
}

// ── Exportar planejamento completo ─────────────────────────
export async function exportarPlanejamento(req: Request, res: Response) {
  const { vendedorId } = req.query

  const planos = await prisma.planejamentoDia.findMany({
    where: vendedorId ? { vendedorId: vendedorId as string } : {},
    include: { cliente: true, vendedor: true },
    orderBy: [{ vendedorId: 'asc' }, { semanasMes: 'asc' }, { diaSemana: 'asc' }],
  })

  // Formata como CSV
  const linhas = [
    'Vendedor,Semana,Dia,Código Cliente,Nome Cliente,Endereço',
    ...planos.map((p) =>
      [
        p.vendedor.nome,
        `Semana ${p.semanasMes}`,
        p.diaSemana,
        p.cliente.codigo,
        p.cliente.nome,
        `"${p.cliente.endereco}"`,
      ].join(',')
    ),
  ]

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="planejamento.csv"')
  res.send('\uFEFF' + linhas.join('\n'))
}
