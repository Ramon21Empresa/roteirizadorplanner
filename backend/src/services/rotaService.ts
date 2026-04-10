/**
 * services/rotaService.ts
 * Serviço de cálculo de rotas otimizadas
 *
 * Implementa:
 * - Distância Haversine (cálculo geográfico offline)
 * - TSP Nearest Neighbor (heurística O(n²))
 * - Integração opcional com Google Directions API
 */

interface Ponto {
  id: string
  lat: number
  lng: number
  nome?: string
}

// ── Haversine ──────────────────────────────────────────────
// Calcula a distância em km entre dois pontos geográficos
export function calcDistanciaKm(a: Ponto, b: Ponto): number {
  const R = 6371 // Raio da Terra em km
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const sinLat = Math.sin(dLat / 2)
  const sinLng = Math.sin(dLng / 2)
  const c =
    sinLat * sinLat +
    Math.cos((a.lat * Math.PI) / 180) *
    Math.cos((b.lat * Math.PI) / 180) *
    sinLng * sinLng
  return R * 2 * Math.atan2(Math.sqrt(c), Math.sqrt(1 - c))
}

// ── TSP Nearest Neighbor ───────────────────────────────────
// Heurística gulosa: a cada passo escolhe o vizinho mais próximo
// Complexidade: O(n²) — eficiente para até ~200 clientes
//
// Retorna os pontos na ordem otimizada (sem o ponto inicial)
export function tspNearestNeighbor(inicio: Ponto, pontos: Ponto[]): Ponto[] {
  if (pontos.length === 0) return []
  if (pontos.length === 1) return pontos

  const restantes = [...pontos]
  const rota: Ponto[] = []
  let atual = inicio

  while (restantes.length > 0) {
    let menorDist = Infinity
    let maisProximo: Ponto | null = null
    let idxMaisProximo = -1

    restantes.forEach((p, idx) => {
      const dist = calcDistanciaKm(atual, p)
      if (dist < menorDist) {
        menorDist = dist
        maisProximo = p
        idxMaisProximo = idx
      }
    })

    if (maisProximo) {
      rota.push(maisProximo)
      restantes.splice(idxMaisProximo, 1)
      atual = maisProximo
    }
  }

  return rota
}

// ── KM total de uma rota ───────────────────────────────────
// Calcula o percurso completo: início → clientes → retorno ao início
export function calcKmTotal(inicio: Ponto, pontos: Ponto[]): number {
  if (pontos.length === 0) return 0

  let total = 0
  let atual = inicio

  pontos.forEach((p) => {
    total += calcDistanciaKm(atual, p)
    atual = p
  })

  // Retorno ao ponto de origem
  total += calcDistanciaKm(atual, inicio)

  return Math.round(total * 10) / 10
}

// ── Tempo estimado ─────────────────────────────────────────
// Estimativa simples: velocidade média urbana de 40 km/h
// + 15 min de atendimento por cliente
export function calcTempoEstimadoMin(kmTotal: number, numClientes: number): number {
  const tempoDeslocamento = (kmTotal / 40) * 60   // km ÷ velocidade × 60min
  const tempoAtendimento  = numClientes * 15       // 15 min por cliente
  return Math.round(tempoDeslocamento + tempoAtendimento)
}

// ── Google Directions API (opcional) ──────────────────────
// Usa a API real para maior precisão (considera trânsito, estradas reais)
// Só ativa se GOOGLE_MAPS_API_KEY estiver configurado
export async function calcRotaComGoogleMaps(
  inicio: Ponto,
  pontos: Ponto[]
): Promise<{ kmTotal: number; tempoMin: number } | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey || pontos.length === 0) return null

  try {
    const waypoints = pontos
      .slice(0, -1)
      .map((p) => `${p.lat},${p.lng}`)
      .join('|')

    const destino = pontos[pontos.length - 1]
    const url =
      `https://maps.googleapis.com/maps/api/directions/json` +
      `?origin=${inicio.lat},${inicio.lng}` +
      `&destination=${destino.lat},${destino.lng}` +
      (waypoints ? `&waypoints=optimize:true|${waypoints}` : '') +
      `&key=${apiKey}`

    const res  = await fetch(url)
    const data = await res.json()

    if (data.status !== 'OK') return null

    // Soma distâncias e durações de todas as pernas da rota
    const legs  = data.routes[0].legs as any[]
    const km    = legs.reduce((acc: number, l: any) => acc + l.distance.value, 0) / 1000
    const seg   = legs.reduce((acc: number, l: any) => acc + l.duration.value, 0)

    return { kmTotal: Math.round(km * 10) / 10, tempoMin: Math.round(seg / 60) }
  } catch (err) {
    console.error('Erro ao consultar Google Directions:', err)
    return null
  }
}

// ── Geocodificação via Google Geocoding API ────────────────
export async function geocodeEndereco(
  endereco: string
): Promise<{ lat: number; lng: number } | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) return null

  try {
    const url =
      `https://maps.googleapis.com/maps/api/geocode/json` +
      `?address=${encodeURIComponent(endereco)}` +
      `&key=${apiKey}`

    const res  = await fetch(url)
    const data = await res.json()

    if (data.status !== 'OK') return null

    const loc = data.results[0].geometry.location
    return { lat: loc.lat, lng: loc.lng }
  } catch {
    return null
  }
}
