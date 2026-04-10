/**
 * controllers/rotaController.ts
 * Otimização de rotas (TSP), persistência e exportação Excel
 */

import { Request, Response } from 'express'
import ExcelJS from 'exceljs'
import { prisma } from '../config/database'
import {
  tspNearestNeighbor,
  calcKmTotal,
  calcTempoEstimadoMin,
  calcRotaComGoogleMaps,
  calcDistanciaKm,
} from '../services/rotaService'

// ── Listar rotas salvas ────────────────────────────────────
export async function listarRotas(req: Request, res: Response) {
  const { vendedorId } = req.query
  const rotas = await prisma.rota.findMany({
    where: vendedorId ? { vendedorId: vendedorId as string } : {},
    include: {
      vendedor: { select: { id: true, nome: true, cor: true } },
      clientes: { include: { cliente: true }, orderBy: { ordem: 'asc' } },
    },
    orderBy: { createdAt: 'desc' },
  })
  res.json(rotas)
}

// ── Otimizar rota (sem salvar) ─────────────────────────────
// Recebe vendedorId + lista de clienteIds, devolve a ordem otimizada
export async function otimizarRota(req: Request, res: Response) {
  const { vendedorId, clienteIds } = req.body as {
    vendedorId: string
    clienteIds: string[]
  }

  if (!vendedorId || !clienteIds?.length) {
    return res.status(400).json({ error: 'vendedorId e clienteIds são obrigatórios.' })
  }

  const vendedor = await prisma.vendedor.findUniqueOrThrow({ where: { id: vendedorId } })

  if (!vendedor.lat || !vendedor.lng) {
    return res.status(422).json({ error: 'Vendedor sem coordenadas. Configure o endereço com lat/lng.' })
  }

  const clientes = await prisma.cliente.findMany({
    where: { id: { in: clienteIds }, lat: { not: null }, lng: { not: null } },
  })

  const semCoordenadas = clienteIds.filter(
    (id) => !clientes.find((c) => c.id === id)
  )

  if (semCoordenadas.length) {
    return res.status(422).json({
      error: 'Alguns clientes não têm coordenadas.',
      clientesSemCoordenadas: semCoordenadas,
    })
  }

  // Executa TSP
  const pontoVendedor = { id: vendedor.id, lat: vendedor.lat, lng: vendedor.lng }
  const pontosClientes = clientes.map((c) => ({ id: c.id, lat: c.lat!, lng: c.lng!, nome: c.nome }))
  const ordemOtimizada = tspNearestNeighbor(pontoVendedor, pontosClientes)

  // Tenta Google Directions para distância real; fallback para Haversine
  const google = await calcRotaComGoogleMaps(pontoVendedor, ordemOtimizada)
  const kmTotal  = google?.kmTotal  ?? calcKmTotal(pontoVendedor, ordemOtimizada)
  const tempoMin = google?.tempoMin ?? calcTempoEstimadoMin(kmTotal, clientes.length)

  // Distância perna a perna
  const ordemComDistancia = ordemOtimizada.map((p, i) => {
    const proximo = i < ordemOtimizada.length - 1 ? ordemOtimizada[i + 1] : pontoVendedor
    return { ...p, distProx: Math.round(calcDistanciaKm(p, proximo) * 10) / 10 }
  })

  res.json({
    vendedor: { id: vendedor.id, nome: vendedor.nome, lat: vendedor.lat, lng: vendedor.lng },
    ordemOtimizada: ordemComDistancia,
    clientesOriginais: clientes,
    kmTotal,
    tempoMin,
    usouGoogleMaps: !!google,
  })
}

// ── Salvar rota ────────────────────────────────────────────
export async function salvarRota(req: Request, res: Response) {
  const { nome, vendedorId, clienteIds, kmTotal, tempoMin, otimizada, observacao } = req.body

  // Valida que todos os clientes existem
  const clientes = await prisma.cliente.findMany({ where: { id: { in: clienteIds } } })
  if (clientes.length !== clienteIds.length) {
    return res.status(422).json({ error: 'Um ou mais clientes não encontrados.' })
  }

  const rota = await prisma.rota.create({
    data: {
      nome,
      vendedorId,
      kmTotal: parseFloat(kmTotal) || 0,
      tempoMin: parseInt(tempoMin) || 0,
      otimizada: !!otimizada,
      status: 'SIMULADA',
      observacao,
      clientes: {
        create: clienteIds.map((id: string, idx: number) => ({
          clienteId: id,
          ordem: idx,
        })),
      },
    },
    include: {
      clientes: { include: { cliente: true }, orderBy: { ordem: 'asc' } },
      vendedor: true,
    },
  })

  res.status(201).json(rota)
}

// ── Exportar rota para Excel ───────────────────────────────
export async function exportarRota(req: Request, res: Response) {
  const rota = await prisma.rota.findUniqueOrThrow({
    where: { id: req.params.id },
    include: {
      vendedor: true,
      clientes: { include: { cliente: true }, orderBy: { ordem: 'asc' } },
    },
  })

  const wb = new ExcelJS.Workbook()
  wb.creator = 'RoutePlan'
  wb.created = new Date()

  // ── Aba 1: Detalhes da rota ──
  const ws = wb.addWorksheet('Rota')
  ws.columns = [
    { header: 'Ordem', key: 'ordem', width: 8 },
    { header: 'Código', key: 'codigo', width: 12 },
    { header: 'Cliente', key: 'nome', width: 30 },
    { header: 'Endereço', key: 'endereco', width: 40 },
    { header: 'Latitude', key: 'lat', width: 14 },
    { header: 'Longitude', key: 'lng', width: 14 },
    { header: 'KM até próximo', key: 'distProx', width: 16 },
  ]

  // Linha de cabeçalho colorida
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF185FA5' } }

  // Linha do vendedor (início/fim)
  ws.addRow({
    ordem: 'Início',
    codigo: rota.vendedor.codigo,
    nome: `${rota.vendedor.nome} (BASE)`,
    endereco: rota.vendedor.endereco,
    lat: rota.vendedor.lat,
    lng: rota.vendedor.lng,
  })

  rota.clientes.forEach((rc, i) => {
    ws.addRow({
      ordem: i + 1,
      codigo: rc.cliente.codigo,
      nome: rc.cliente.nome,
      endereco: rc.cliente.endereco,
      lat: rc.cliente.lat,
      lng: rc.cliente.lng,
      distProx: rc.distProx,
    })
  })

  ws.addRow({
    ordem: 'Fim',
    codigo: rota.vendedor.codigo,
    nome: `${rota.vendedor.nome} (BASE)`,
    endereco: rota.vendedor.endereco,
  })

  // ── Aba 2: Resumo ──
  const wsRes = wb.addWorksheet('Resumo')
  wsRes.addRow(['Campo', 'Valor'])
  wsRes.getRow(1).font = { bold: true }
  wsRes.addRows([
    ['Rota', rota.nome],
    ['Vendedor', rota.vendedor.nome],
    ['Total de clientes', rota.clientes.length],
    ['KM total', `${rota.kmTotal} km`],
    ['Tempo estimado', `${rota.tempoMin} min`],
    ['Otimizada', rota.otimizada ? 'Sim' : 'Não'],
    ['Gerada em', rota.createdAt.toLocaleString('pt-BR')],
  ])
  wsRes.columns = [{ width: 20 }, { width: 30 }]

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', `attachment; filename="rota-${rota.id}.xlsx"`)

  await wb.xlsx.write(res)
}

// ── Exportar todas as rotas (resumo) ──────────────────────
export async function exportarTodasRotas(_req: Request, res: Response) {
  const rotas = await prisma.rota.findMany({
    include: {
      vendedor: true,
      clientes: { include: { cliente: true }, orderBy: { ordem: 'asc' } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Rotas')

  ws.columns = [
    { header: 'Rota', key: 'rota', width: 30 },
    { header: 'Vendedor', key: 'vendedor', width: 20 },
    { header: 'Clientes', key: 'clientes', width: 10 },
    { header: 'KM Total', key: 'km', width: 12 },
    { header: 'Tempo (min)', key: 'tempo', width: 14 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Data', key: 'data', width: 18 },
  ]

  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF185FA5' } }

  rotas.forEach((r) => {
    ws.addRow({
      rota: r.nome,
      vendedor: r.vendedor.nome,
      clientes: r.clientes.length,
      km: r.kmTotal,
      tempo: r.tempoMin,
      status: r.status,
      data: r.createdAt.toLocaleDateString('pt-BR'),
    })
  })

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', 'attachment; filename="rotas-resumo.xlsx"')

  await wb.xlsx.write(res)
}
