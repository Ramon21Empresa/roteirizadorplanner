/**
 * controllers/vendedorController.ts
 */

import { Request, Response } from 'express'
import { prisma } from '../config/database'
import { geocodeEndereco, tspNearestNeighbor, calcKmTotal } from '../services/rotaService'

export async function listarVendedores(_req: Request, res: Response) {
  const vendedores = await prisma.vendedor.findMany({
    include: {
      _count: { select: { clientes: true, rotas: true } },
    },
    orderBy: { codigo: 'asc' },
  })
  res.json(vendedores)
}

export async function buscarVendedor(req: Request, res: Response) {
  const vendedor = await prisma.vendedor.findUniqueOrThrow({
    where: { id: req.params.id },
    include: {
      clientes: true,
      rotas: { orderBy: { createdAt: 'desc' }, take: 10 },
    },
  })
  res.json(vendedor)
}

export async function criarVendedor(req: Request, res: Response) {
  const { codigo, nome, endereco, lat, lng, cor } = req.body

  const existe = await prisma.vendedor.findUnique({ where: { codigo } })
  if (existe) return res.status(409).json({ error: `Vendedor com código "${codigo}" já existe.` })

  let finalLat = lat ? parseFloat(lat) : null
  let finalLng = lng ? parseFloat(lng) : null

  if ((!finalLat || !finalLng) && endereco) {
    const coords = await geocodeEndereco(endereco)
    if (coords) { finalLat = coords.lat; finalLng = coords.lng }
  }

  const vendedor = await prisma.vendedor.create({
    data: { codigo, nome, endereco, lat: finalLat, lng: finalLng, cor },
  })

  res.status(201).json(vendedor)
}

export async function atualizarVendedor(req: Request, res: Response) {
  const { nome, endereco, lat, lng, ativo, cor } = req.body

  let finalLat = lat ? parseFloat(lat) : undefined
  let finalLng = lng ? parseFloat(lng) : undefined

  if ((!finalLat || !finalLng) && endereco) {
    const coords = await geocodeEndereco(endereco)
    if (coords) { finalLat = coords.lat; finalLng = coords.lng }
  }

  const vendedor = await prisma.vendedor.update({
    where: { id: req.params.id },
    data: { nome, endereco, lat: finalLat, lng: finalLng, ativo, cor },
  })

  res.json(vendedor)
}

// Retorna KM estimado para o ciclo completo de um vendedor
export async function kmCicloVendedor(req: Request, res: Response) {
  const vendedor = await prisma.vendedor.findUniqueOrThrow({
    where: { id: req.params.id },
    include: { clientes: true },
  })

  if (!vendedor.lat || !vendedor.lng) {
    return res.status(422).json({ error: 'Vendedor sem coordenadas.' })
  }

  const clientes = vendedor.clientes.filter((c) => c.lat && c.lng)
  const pontos   = clientes.map((c) => ({ id: c.id, lat: c.lat!, lng: c.lng! }))
  const inicio   = { id: vendedor.id, lat: vendedor.lat, lng: vendedor.lng }
  const otimized = tspNearestNeighbor(inicio, pontos)
  const km       = calcKmTotal(inicio, otimized)

  res.json({ vendedorId: vendedor.id, km, clientes: clientes.length })
}
