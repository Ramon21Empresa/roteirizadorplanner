import { Router } from 'express'
import * as ctrl from '../controllers/rotaController'

const router = Router()

router.get ('/export',         ctrl.exportarTodasRotas)
router.get ('/',               ctrl.listarRotas)
router.post('/otimizar',       ctrl.otimizarRota)
router.post('/',               ctrl.salvarRota)
router.get ('/:id/export',     ctrl.exportarRota)

export default router
