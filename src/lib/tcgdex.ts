/**
 * Client de l'API TCGdex (gratuite, sans clé) : https://tcgdex.dev
 * Fournit les cartes en français et en anglais, avec les cotes Cardmarket (EUR)
 * et TCGplayer (USD) intégrées à chaque carte.
 */
import type { Lang, Variant } from './types'
import { normLocalId } from './format'

const API = 'https://api.tcgdex.net/v2'
/** Conversion approximative USD → EUR, utilisée seulement si Cardmarket n'a pas de cote */
const USD_TO_EUR = 0.86

export interface CardBrief {
  id: string
  localId: string
  name: string
  image?: string
}

export interface SetBrief {
  id: string
  name: string
  logo?: string
  symbol?: string
  cardCount: { total: number; official: number }
}

export interface SetFull extends SetBrief {
  releaseDate?: string
  serie?: { id: string; name: string }
  cards: CardBrief[]
}

type Cardmarket = Partial<Record<
  'avg' | 'low' | 'trend' | 'avg1' | 'avg7' | 'avg30' | 'avg-holo' | 'low-holo' | 'trend-holo' | 'avg7-holo' | 'avg30-holo',
  number | null
>>
type TcgPlayerPrices = { marketPrice?: number | null; midPrice?: number | null; lowPrice?: number | null }

export interface CardFull extends CardBrief {
  category?: string
  rarity?: string
  illustrator?: string
  set: SetBrief
  variants?: Partial<Record<'normal' | 'reverse' | 'holo' | 'firstEdition', boolean>>
  pricing?: {
    cardmarket?: Cardmarket | null
    tcgplayer?: Record<string, TcgPlayerPrices | string | number | null> | null
  } | null
}

async function get<T>(lang: Lang, path: string): Promise<T> {
  const res = await fetch(`${API}/${lang}${path}`)
  if (res.status === 404) return [] as unknown as T
  if (!res.ok) throw new Error(`TCGdex ${res.status}`)
  return res.json() as Promise<T>
}

/** Image d'une carte : `quality` low (≈ 245 px) ou high (≈ 600 px) */
export const cardImage = (base: string | null | undefined, quality: 'low' | 'high' = 'low') =>
  base ? `${base}/${quality}.webp` : null

export const setIdOfCard = (cardId: string) => cardId.slice(0, cardId.lastIndexOf('-'))

/* ---------- Cartes ---------- */

export function searchCardsByName(lang: Lang, name: string) {
  return get<CardBrief[]>(lang, `/cards?name=${encodeURIComponent(name)}`)
}

const cardCache = new Map<string, Promise<CardFull>>()
export function getCard(lang: Lang, id: string) {
  const key = `${lang}:${id}`
  if (!cardCache.has(key)) {
    const p = get<CardFull>(lang, `/cards/${encodeURIComponent(id)}`)
    p.catch(() => cardCache.delete(key))
    cardCache.set(key, p)
  }
  return cardCache.get(key)!
}

/* ---------- Extensions ---------- */

const setsCache = new Map<Lang, Promise<SetBrief[]>>()
export function getSets(lang: Lang) {
  if (!setsCache.has(lang)) {
    const p = get<SetBrief[]>(lang, '/sets')
    p.catch(() => setsCache.delete(lang))
    setsCache.set(lang, p)
  }
  return setsCache.get(lang)!
}

/** Extensions sorties une année donnée (filtre TCGdex sur releaseDate) */
export async function getSetsByYear(lang: Lang, year: number) {
  const all = await getSets(lang)
  const filtered = await get<SetBrief[]>(lang, `/sets?releaseDate=${year}`)
  // Si l'API ignore le filtre, on ne fait pas semblant d'avoir filtré
  if (!filtered.length || filtered.length === all.length) return null
  return filtered
}

const setCache = new Map<string, Promise<SetFull>>()
export function getSet(lang: Lang, id: string) {
  const key = `${lang}:${id}`
  if (!setCache.has(key)) {
    const p = get<SetFull>(lang, `/sets/${encodeURIComponent(id)}`)
    p.catch(() => setCache.delete(key))
    setCache.set(key, p)
  }
  return setCache.get(key)!
}

export async function getSetYear(lang: Lang, setId: string): Promise<number | null> {
  try {
    const s = await getSet(lang, setId)
    return s.releaseDate ? Number(s.releaseDate.slice(0, 4)) : null
  } catch {
    return null
  }
}

/* ---------- Cotes ---------- */

const pos = (v: number | null | undefined) => (typeof v === 'number' && v > 0 ? v : null)

/** Cote « Near Mint » d'une carte pour une variante, en euros */
export function priceFor(card: CardFull, variant: Variant): { value: number | null; source: string | null } {
  const cm = card.pricing?.cardmarket
  if (cm) {
    const foil = pos(cm['trend-holo']) ?? pos(cm['avg30-holo']) ?? pos(cm['avg-holo'])
    const plain = pos(cm.trend) ?? pos(cm.avg30) ?? pos(cm.avg)
    const hasNormal = card.variants?.normal !== false
    // Reverse = version brillante d'une carte normale ; Holo d'une carte qui existe aussi en normal
    const wantsFoil = variant === 'reverse' || (variant === 'holo' && hasNormal)
    const v = wantsFoil ? foil ?? plain : plain ?? foil
    if (v != null) return { value: round(v), source: 'Cardmarket' }
  }

  const tp = card.pricing?.tcgplayer
  if (tp) {
    const order: Record<Variant, string[]> = {
      normal: ['normal', 'holofoil', 'reverse-holofoil'],
      reverse: ['reverse-holofoil', 'reverseHolofoil', 'normal', 'holofoil'],
      holo: ['holofoil', 'normal', 'reverse-holofoil'],
      firstEdition: ['1st-edition-holofoil', '1stEditionHolofoil', '1st-edition', 'holofoil', 'normal'],
    }
    for (const k of [...order[variant], ...Object.keys(tp)]) {
      const p = tp[k]
      if (p && typeof p === 'object') {
        const v = pos(p.marketPrice) ?? pos(p.midPrice)
        if (v != null) return { value: round(v * USD_TO_EUR), source: 'TCGplayer (≈ converti)' }
      }
    }
  }
  return { value: null, source: null }
}

const round = (v: number) => Math.round(v * 100) / 100

/** Variantes disponibles pour une carte, dans l'ordre de préférence */
export function availableVariants(card: CardFull): Variant[] {
  const v = card.variants
  if (!v) return ['normal', 'reverse', 'holo']
  const list = (['normal', 'holo', 'reverse', 'firstEdition'] as Variant[]).filter((k) => v[k])
  return list.length ? list : ['normal']
}

/* ---------- Recherche pour le scan ---------- */

export interface Candidate {
  lang: Lang
  brief: CardBrief
  score: number
}

/**
 * Trouve les cartes correspondant au nom et/ou au numéro lus sur la carte.
 * `number` = numéro dans l'extension (ex. "25", "TG05"), `total` = nombre de cartes officielles ("165").
 */
export async function findCandidates(opts: {
  names: string[]
  number: string | null
  total: number | null
}): Promise<Candidate[]> {
  const { names, number, total } = opts
  const wanted = number ? normLocalId(number) : null
  const results: Candidate[] = []
  const seen = new Set<string>()

  const push = (lang: Lang, brief: CardBrief, score: number) => {
    const k = `${lang}:${brief.id}`
    if (seen.has(k)) return
    seen.add(k)
    results.push({ lang, brief, score })
  }

  for (const lang of ['fr', 'en'] as Lang[]) {
    const sets = await getSets(lang).catch(() => [] as SetBrief[])
    const officialById = new Map(sets.map((s) => [s.id, s.cardCount.official]))

    // 1) Par nom, puis départage avec le numéro et la taille de l'extension
    for (const name of names) {
      const briefs = await searchCardsByName(lang, name).catch(() => [] as CardBrief[])
      for (const b of briefs) {
        let score = 1
        if (wanted && normLocalId(b.localId) === wanted) score += 10
        if (total && officialById.get(setIdOfCard(b.id)) === total) score += 5
        push(lang, b, score)
      }
      if (briefs.length) break
    }

    // 2) Sans nom exploitable : extensions qui ont le bon nombre de cartes
    if (wanted && total && !results.some((r) => r.score >= 11)) {
      const matchingSets = sets.filter((s) => s.cardCount.official === total).slice(0, 8)
      const fulls = await Promise.all(matchingSets.map((s) => getSet(lang, s.id).catch(() => null)))
      for (const s of fulls) {
        const b = s?.cards?.find((c) => normLocalId(c.localId) === wanted)
        if (b) push(lang, b, 12)
      }
    }

    // Une correspondance solide en français suffit
    if (results.some((r) => r.score >= 15)) break
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 24)
}
