const eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
export const formatEur = (v: number | null | undefined) => (v == null ? '—' : eur.format(v))

export const uid = () =>
  (crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`)

export const parsePrice = (s: string): number | null => {
  const n = Number(s.replace(/\s/g, '').replace(',', '.').replace('€', ''))
  return Number.isFinite(n) && s.trim() !== '' ? Math.max(0, n) : null
}

export const cardmarketSearchUrl = (q: string) =>
  `https://www.cardmarket.com/fr/Pokemon/Products/Search?searchString=${encodeURIComponent(q)}`

export const normLocalId = (s: string) => s.toUpperCase().replace(/^([A-Z]*)0+(?=\d)/, '$1')
