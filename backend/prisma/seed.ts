/**
 * seed.ts — Popula o banco com dados de exemplo para desenvolvimento
 * Execute: npm run seed
 */

import { PrismaClient, DiaSemana } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

  // Limpa dados existentes (ordem importa por FK)
  await prisma.planejamentoDia.deleteMany()
  await prisma.rotaCliente.deleteMany()
  await prisma.rota.deleteMany()
  await prisma.cliente.deleteMany()
  await prisma.vendedor.deleteMany()

  // ── Vendedores ────────────────────────────────
  const carlos = await prisma.vendedor.create({
    data: {
      codigo: 'V01',
      nome: 'Carlos Mendes',
      endereco: 'Rua Vergueiro, 2500, São Paulo - SP',
      lat: -23.578,
      lng: -46.637,
      cor: '#185FA5',
    },
  })

  const ana = await prisma.vendedor.create({
    data: {
      codigo: 'V02',
      nome: 'Ana Souza',
      endereco: 'Av. Ipiranga, 1100, São Paulo - SP',
      lat: -23.542,
      lng: -46.647,
      cor: '#1D9E75',
    },
  })

  console.log('✅ Vendedores criados')

  // ── Clientes do Carlos (V01) ──────────────────
  const clientesCarlos = await Promise.all([
    prisma.cliente.create({ data: { codigo: 'C001', nome: 'Supermercado Central', endereco: 'Rua das Flores, 120, São Paulo', lat: -23.549, lng: -46.633, vendedorId: carlos.id } }),
    prisma.cliente.create({ data: { codigo: 'C002', nome: 'Padaria Estrela', endereco: 'Av. Paulista, 800, São Paulo', lat: -23.562, lng: -46.655, vendedorId: carlos.id } }),
    prisma.cliente.create({ data: { codigo: 'C003', nome: 'Mercearia do João', endereco: 'Rua Augusta, 300, São Paulo', lat: -23.558, lng: -46.661, vendedorId: carlos.id } }),
    prisma.cliente.create({ data: { codigo: 'C004', nome: 'Empório Gourmet', endereco: 'Rua Oscar Freire, 500, São Paulo', lat: -23.565, lng: -46.672, vendedorId: carlos.id } }),
    prisma.cliente.create({ data: { codigo: 'C005', nome: 'Comércio Bom Preço', endereco: 'Rua da Consolação, 1200, São Paulo', lat: -23.570, lng: -46.658, vendedorId: carlos.id } }),
  ])

  // ── Clientes da Ana (V02) ─────────────────────
  const clientesAna = await Promise.all([
    prisma.cliente.create({ data: { codigo: 'C006', nome: 'Distribuidora Norte', endereco: 'Av. Norte, 400, São Paulo', lat: -23.538, lng: -46.640, vendedorId: ana.id } }),
    prisma.cliente.create({ data: { codigo: 'C007', nome: 'Atacado Familiar', endereco: 'Rua dos Pinheiros, 600, São Paulo', lat: -23.574, lng: -46.685, vendedorId: ana.id } }),
    prisma.cliente.create({ data: { codigo: 'C008', nome: 'Mini Mercado Sol', endereco: 'Rua Haddock Lobo, 200, São Paulo', lat: -23.557, lng: -46.668, vendedorId: ana.id } }),
    prisma.cliente.create({ data: { codigo: 'C009', nome: 'Loja dos Frescos', endereco: 'Alameda Santos, 700, São Paulo', lat: -23.567, lng: -46.649, vendedorId: ana.id } }),
    prisma.cliente.create({ data: { codigo: 'C010', nome: 'Quitanda Popular', endereco: 'Rua Frei Caneca, 900, São Paulo', lat: -23.553, lng: -46.643, vendedorId: ana.id } }),
  ])

  console.log('✅ Clientes criados')

  // ── Planejamento de exemplo ────────────────────
  const planejamentos = [
    { clienteId: clientesCarlos[0].id, vendedorId: carlos.id, diaSemana: DiaSemana.SEGUNDA, semanasMes: 1 },
    { clienteId: clientesCarlos[1].id, vendedorId: carlos.id, diaSemana: DiaSemana.TERCA,   semanasMes: 1 },
    { clienteId: clientesCarlos[2].id, vendedorId: carlos.id, diaSemana: DiaSemana.QUARTA,  semanasMes: 1 },
    { clienteId: clientesCarlos[3].id, vendedorId: carlos.id, diaSemana: DiaSemana.QUINTA,  semanasMes: 2 },
    { clienteId: clientesCarlos[4].id, vendedorId: carlos.id, diaSemana: DiaSemana.SEXTA,   semanasMes: 2 },
    { clienteId: clientesAna[0].id,   vendedorId: ana.id,    diaSemana: DiaSemana.SEGUNDA,  semanasMes: 1 },
    { clienteId: clientesAna[1].id,   vendedorId: ana.id,    diaSemana: DiaSemana.QUARTA,   semanasMes: 1 },
    { clienteId: clientesAna[2].id,   vendedorId: ana.id,    diaSemana: DiaSemana.SEXTA,    semanasMes: 1 },
  ]

  await prisma.planejamentoDia.createMany({ data: planejamentos })
  console.log('✅ Planejamento criado')
  console.log('🎉 Seed concluído com sucesso!')
}

main()
  .catch((e) => { console.error('❌ Erro no seed:', e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
