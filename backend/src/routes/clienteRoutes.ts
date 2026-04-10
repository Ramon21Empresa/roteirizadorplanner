// routes/clienteRoutes.ts
import { Router } from 'express'
import multer from 'multer'
import * as ctrl from '../controllers/clienteController'

const router  = Router()
const upload  = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })

router.get   ('/',              ctrl.listarClientes)
router.get   ('/:id',          ctrl.buscarCliente)
router.post  ('/',              ctrl.criarCliente)
router.put   ('/:id',          ctrl.atualizarCliente)
router.delete('/:id',          ctrl.removerCliente)
router.post  ('/import',       upload.single('file'), ctrl.importarClientes)
router.post  ('/geocode/batch', ctrl.geocodificarPendentes)

export default router
