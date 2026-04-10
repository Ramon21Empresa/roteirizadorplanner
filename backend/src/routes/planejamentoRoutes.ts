import { Router } from 'express'
import * as ctrl from '../controllers/planejamentoController'

const router = Router()

router.get ('/export',  ctrl.exportarPlanejamento)
router.get ('/',        ctrl.listarPlanejamento)
router.post('/',        ctrl.alocarCliente)
router.delete('/:id',   ctrl.removerAlocacao)

export default router
