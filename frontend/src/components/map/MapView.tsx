'use client'

/**
 * MapView.tsx — Mapa interativo com Leaflet
 * Importado dinamicamente (sem SSR) pois Leaflet requer window
 *
 * Uso:
 *   import dynamic from 'next/dynamic'
 *   const MapView = dynamic(() => import('@/components/map/MapView'), { ssr: false })
 */

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import type { Cliente, Vendedor, ResultadoOtimizacao } from '@/types'

// Corrige ícones padrão do Leaflet no Next.js (problema conhecido)
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

interface MapViewProps {
  clientes:            Cliente[]
  vendedores:          Vendedor[]
  clientesSelecionados?: string[]
  vendedorSelecionado?:  string | null
  resultadoOtimizacao?:  ResultadoOtimizacao | null
  onClienteClick?:     (id: string) => void
  height?:             string
}

// ── Cria SVG marker colorido ───────────────────────────────
function criarIconeCliente(cor: string, selecionado: boolean, codigo: string): L.DivIcon {
  const size  = selecionado ? 28 : 22
  const label = codigo.replace('C', '').substring(0, 3)
  return L.divIcon({
    className: '',
    iconAnchor: [size / 2, size / 2],
    html: `
      <div style="
        width:${size}px;height:${size}px;border-radius:50%;
        background:${cor};border:2.5px solid white;
        box-shadow:0 2px 8px rgba(0,0,0,0.3);
        display:flex;align-items:center;justify-content:center;
        color:white;font-size:${selecionado ? 10 : 9}px;font-weight:700;
        font-family:system-ui,sans-serif;
        ${selecionado ? 'outline:3px solid ' + cor + '55;' : ''}
        transition:all 0.15s;
      ">${label}</div>
    `,
  })
}

function criarIconeVendedor(cor: string, codigo: string, ativo: boolean): L.DivIcon {
  return L.divIcon({
    className: '',
    iconAnchor: [14, 14],
    html: `
      <div style="
        width:28px;height:28px;border-radius:7px;
        background:${cor};border:2.5px solid white;
        box-shadow:0 2px 8px rgba(0,0,0,0.3);
        display:flex;align-items:center;justify-content:center;
        color:white;font-size:9px;font-weight:700;
        font-family:system-ui,sans-serif;
        ${ativo ? 'outline:3px solid ' + cor + '55;' : ''}
      ">${codigo.replace('V', 'V')}</div>
    `,
  })
}

export default function MapView({
  clientes,
  vendedores,
  clientesSelecionados = [],
  vendedorSelecionado  = null,
  resultadoOtimizacao  = null,
  onClienteClick,
  height = '100%',
}: MapViewProps) {
  const mapRef      = useRef<L.Map | null>(null)
  const containerId = useRef(`map-${Math.random().toString(36).slice(2)}`)
  const layerRef    = useRef<L.LayerGroup | null>(null)

  // ── Inicializa mapa ────────────────────────────────────
  useEffect(() => {
    if (mapRef.current) return

    const map = L.map(containerId.current, {
      center:     [-23.555, -46.650],
      zoom:       13,
      zoomControl: true,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)

    layerRef.current = L.layerGroup().addTo(map)
    mapRef.current   = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // ── Redesenha markers e rotas ──────────────────────────
  useEffect(() => {
    const map   = mapRef.current
    const layer = layerRef.current
    if (!map || !layer) return

    layer.clearLayers()

    // Clientes
    clientes.forEach((c) => {
      if (!c.lat || !c.lng) return
      const isSel = clientesSelecionados.includes(c.id)
      const cor   = c.vendedor?.cor || '#185FA5'
      const icon  = criarIconeCliente(cor, isSel, c.codigo)

      const marker = L.marker([c.lat, c.lng], { icon })
        .bindPopup(
          `<div style="font-size:13px;min-width:160px;">
            <strong>${c.nome}</strong><br/>
            <span style="color:#666;font-size:11px;">${c.codigo}</span><br/>
            <span style="font-size:11px;">${c.endereco}</span>
          </div>`,
          { maxWidth: 220 }
        )

      if (onClienteClick) {
        marker.on('click', () => onClienteClick(c.id))
      }

      layer.addLayer(marker)
    })

    // Vendedores
    vendedores.forEach((v) => {
      if (!v.lat || !v.lng) return
      const ativo = vendedorSelecionado === v.id
      const icon  = criarIconeVendedor(v.cor || '#185FA5', v.codigo, ativo)

      L.marker([v.lat, v.lng], { icon })
        .bindPopup(
          `<div style="font-size:13px;">
            <strong>${v.nome}</strong><br/>
            <span style="color:#666;font-size:11px;">Vendedor · ${v.codigo}</span><br/>
            <span style="font-size:11px;">${v.endereco}</span>
          </div>`
        )
        .addTo(layer)
    })

    // ── Linha de rota otimizada ──────────────────────────
    if (resultadoOtimizacao) {
      const { vendedor, ordemOtimizada } = resultadoOtimizacao
      const cor = vendedores.find((v) => v.id === vendedor.id)?.cor || '#185FA5'

      const pontos: L.LatLngTuple[] = [
        [vendedor.lat, vendedor.lng],
        ...ordemOtimizada.map((p): L.LatLngTuple => [p.lat, p.lng]),
        [vendedor.lat, vendedor.lng],       // retorno
      ]

      L.polyline(pontos, {
        color:     cor,
        weight:    3,
        opacity:   0.8,
        dashArray: '8, 5',
      }).addTo(layer)

      // Ajusta zoom para mostrar toda a rota
      map.fitBounds(L.latLngBounds(pontos), { padding: [40, 40] })
    } else if (clientes.length || vendedores.length) {
      // Auto-zoom para todos os pontos
      const todos = [
        ...clientes.filter((c) => c.lat && c.lng).map((c): L.LatLngTuple => [c.lat!, c.lng!]),
        ...vendedores.filter((v) => v.lat && v.lng).map((v): L.LatLngTuple => [v.lat!, v.lng!]),
      ]
      if (todos.length > 1) {
        map.fitBounds(L.latLngBounds(todos), { padding: [40, 40] })
      }
    }
  }, [clientes, vendedores, clientesSelecionados, vendedorSelecionado, resultadoOtimizacao, onClienteClick])

  return (
    <div
      id={containerId.current}
      style={{ height, width: '100%' }}
      className="rounded-lg overflow-hidden z-0"
    />
  )
}
