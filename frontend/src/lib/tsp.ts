/**
 * lib/tsp.ts — Algoritmos de rota para uso no frontend
 * (cálculo local sem precisar chamar a API para prévia)
 */

export interface Ponto {
  id: string
  lat: number
  lng: number
  nome?: string
}

/** Distância Haversine em km */
export function haversineKm(a: Ponto, b: Ponto): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
    Math.cos((b.lat * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

/** TSP Nearest Neighbor — retorna pontos na ordem otimizada */
export function nearestNeighbor(inicio: Ponto, pontos: Ponto[]): Ponto[] {
  if (!pontos.length) return []
  const restantes = [...pontos]
  const rota: Ponto[] = []
  let atual = inicio

  while (restantes.length) {
    let minD = Infinity
    let idx = 0
    restantes.forEach((p, i) => {
      const d = haversineKm(atual, p)
      if (d < minD) { minD = d; idx = i }
    })
    rota.push(restantes[idx])
    atual = restantes[idx]
    restantes.splice(idx, 1)
  }
  return rota
}

/** KM total do ciclo completo (início → pontos → retorno) */
export function kmCiclo(inicio: Ponto, pontos: Ponto[]): number {
  if (!pontos.length) return 0
  let total = 0
  let cur = inicio
  pontos.forEach((p) => { total += haversineKm(cur, p); cur = p })
  total += haversineKm(cur, inicio)
  return Math.round(total * 10) / 10
}

/** Tempo estimado em minutos (velocidade urbana 40 km/h + 15 min/cliente) */
export function tempoEstimadoMin(km: number, numClientes: number): number {
  return Math.round((km / 40) * 60 + numClientes * 15)
}

/** Formata minutos como "2h 30min" */
export function formatarTempo(min: number): string {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}
