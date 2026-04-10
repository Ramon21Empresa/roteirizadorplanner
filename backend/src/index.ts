/**
 * index.ts — Entrypoint do servidor Express
 * Configura middlewares globais, rotas e tratamento de erros
 */

import 'express-async-errors'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import dotenv from 'dotenv'

import clienteRoutes from './routes/clienteRoutes'
import vendedorRoutes from './routes/vendedorRoutes'
import rotaRoutes from './routes/rotaRoutes'
import planejamentoRoutes from './routes/planejamentoRoutes'
import { errorHandler } from './middleware/errorHandler'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// ── Middlewares globais ────────────────────────
app.use(helmet())                           // Headers de segurança
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }))
app.use(morgan('dev'))                      // Log de requisições
app.use(express.json({ limit: '10mb' }))   // Parse JSON
app.use(express.urlencoded({ extended: true }))

// ── Rotas da API ───────────────────────────────
app.use('/api/clientes',     clienteRoutes)
app.use('/api/vendedores',   vendedorRoutes)
app.use('/api/rotas',        rotaRoutes)
app.use('/api/planejamento', planejamentoRoutes)

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ── Tratamento centralizado de erros ──────────
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`🚀 RoutePlan API rodando em http://localhost:${PORT}`)
  console.log(`   Ambiente: ${process.env.NODE_ENV || 'development'}`)
})

export default app
