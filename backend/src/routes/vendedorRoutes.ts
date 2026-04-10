import { Router } from 'express'
import * as ctrl from '../controllers/vendedorController'

const router = Router()

router.get ('/',           ctrl.listarVendedores)
router.get ('/:id',        ctrl.buscarVendedor)
router.post('/',           ctrl.criarVendedor)
router.put ('/:id',        ctrl.atualizarVendedor)
router.get ('/:id/km',     ctrl.kmCicloVendedor)

export default router
