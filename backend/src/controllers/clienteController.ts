/**
 * controllers/clienteController.ts
 * CRUD de clientes + importação CSV/Excel + geocodificação
 */

import { Request, Response } from 'express'
import { prisma } from '../config/database'
import { geocodeEndereco } from '../services/rotaService'
import Papa from 'papaparse'

// ── Listar todos ───────────────────────────────────────────
export async function listarClientes(req: Request, res: Response) {
  const { vendedorId, semCoordenadas } = req.query

  const where: any = {}
  if (vendedorId) where.vendedorId = vendedorId as string
  if (semCoordenadas === 'true') where.lat = null

  const clientes = await prisma.cliente.findMany({
    where,
    include: { vendedor: { select: { id: true, nome: true, cor: true } } },
    orderBy: { codigo: 'asc' },
  })

  res.json(clientes)
}

// ── Buscar um ──────────────────────────────────────────────
export async function buscarCliente(req: Request, res: Response) {
  const cliente = await prisma.cliente.findUniqueOrThrow({
    where: { id: req.params.id },
    include: { vendedor: true },
  })
  res.json(cliente)
}

// ── Criar ──────────────────────────────────────────────────
export async function criarCliente(req: Request, res: Response) {
  const { codigo, nome, endereco, lat, lng, vendedorId, observacao } = req.body

  // Valida unicidade do código
  const existe = await prisma.cliente.findUnique({ where: { codigo } })
  if (existe) {
    return res.status(409).json({ error: `Cliente com código "${codigo}" já existe.` })
  }

  // Geocodifica se não veio coordenada
  let finalLat = lat ? parseFloat(lat) : null
  let finalLng = lng ? parseFloat(lng) : null

  if ((!finalLat || !finalLng) && endereco) {
    const coords = await geocodeEndereco(endereco)
    if (coords) { finalLat = coords.lat; finalLng = coords.lng }
  }

  const cliente = await prisma.cliente.create({
    data: { codigo, nome, endereco, lat: finalLat, lng: finalLng, vendedorId, observacao },
  })

  res.status(201).json(cliente)
}

// ── Atualizar ──────────────────────────────────────────────
export async function atualizarCliente(req: Request, res: Response) {
  const { nome, endereco, lat, lng, vendedorId, ativo, observacao } = req.body

  let finalLat = lat ? parseFloat(lat) : undefined
  let finalLng = lng ? parseFloat(lng) : undefined

  // Re-geocodifica se endereço mudou e não há coordenadas
  if ((!finalLat || !finalLng) && endereco) {
    const coords = await geocodeEndereco(endereco)
    if (coords) { finalLat = coords.lat; finalLng = coords.lng }
  }

  const cliente = await prisma.cliente.update({
    where: { id: req.params.id },
    data: { nome, endereco, lat: finalLat, lng: finalLng, vendedorId, ativo, observacao },
  })

  res.json(cliente)
}

// ── Remover ────────────────────────────────────────────────
export async function removerCliente(req: Request, res: Response) {
  await prisma.cliente.delete({ where: { id: req.params.id } })
  res.status(204).send()
}

// ── Importar CSV ───────────────────────────────────────────
// Aceita CSV com colunas: codigo, nome, endereco, lat, lng, vendedorCodigo
export async function importarClientes(req: Request, res: Response) {
  if (!req.file) return res.status(400).json({ error: 'Arquivo não enviado.' })

  const conteudo = req.file.buffer.toString('utf-8')
  const { data, errors } = Papa.parse(conteudo, { header: true, skipEmptyLines: true })

  if (errors.length) {
    return res.status(400).json({ error: 'CSV inválido', detalhes: errors.slice(0, 5) })
  }

  const resultados = { criados: 0, atualizados: 0, erros: [] as string[] }

  for (const row of data as any[]) {
    try {
      const codigo = row.codigo?.trim()
      if (!codigo) { resultados.erros.push('Linha sem código ignorada'); continue }

      // Resolve vendedor por código
      let vendedorId: string | undefined
      if (row.vendedorCodigo) {
        const v = await prisma.vendedor.findUnique({ where: { codigo: row.vendedorCodigo.trim() } })
        vendedorId = v?.id
      }

      let lat = row.lat ? parseFloat(row.lat) : null
      let lng = row.lng ? parseFloat(row.lng) : null

      if ((!lat || !lng) && row.endereco) {
        const coords = await geocodeEndereco(row.endereco.trim())
        if (coords) { lat = coords.lat; lng = coords.lng }
      }

      const existe = await prisma.cliente.findUnique({ where: { codigo } })

      if (existe) {
        await prisma.cliente.update({
          where: { codigo },
          data: { nome: row.nome, endereco: row.endereco, lat, lng, vendedorId },
        })
        resultados.atualizados++
      } else {
        await prisma.cliente.create({
          data: { codigo, nome: row.nome?.trim(), endereco: row.endereco?.trim(), lat, lng, vendedorId },
        })
        resultados.criados++
      }
    } catch (e: any) {
      resultados.erros.push(`Linha ${row.codigo}: ${e.message}`)
    }
  }

  res.json(resultados)
}

// ── Geocodificar em lote ───────────────────────────────────
export async function geocodificarPendentes(_req: Request, res: Response) {
  const pendentes = await prisma.cliente.findMany({
    where: { lat: null, endereco: { not: '' } },
    take: 50,
  })

  let atualizados = 0

  for (const c of pendentes) {
    const coords = await geocodeEndereco(c.endereco)
    if (coords) {
      await prisma.cliente.update({ where: { id: c.id }, data: coords })
      atualizados++
    }
  }

  res.json({ total: pendentes.length, atualizados })
}
