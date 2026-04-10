/**
 * middleware/errorHandler.ts
 * Tratamento centralizado de erros — captura exceções de todos os controllers
 */

import { Request, Response, NextFunction } from 'express'

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error('[ERROR]', err)

  // Prisma: registro não encontrado
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Registro não encontrado.' })
  }

  // Prisma: violação de constraint único
  if (err.code === 'P2002') {
    const field = err.meta?.target?.[0] ?? 'campo'
    return res.status(409).json({ error: `Valor duplicado no campo: ${field}.` })
  }

  // Erros de validação
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message })
  }

  const status = err.status || err.statusCode || 500
  const message = err.message || 'Erro interno do servidor.'

  res.status(status).json({ error: message })
}
