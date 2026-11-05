export type Condition = 'MT' | 'NM' | 'EX' | 'GD' | 'LP' | 'PL' | 'PO'
export type Variant = 'normal' | 'reverse' | 'holo' | 'firstEdition'
export type Lang = 'fr' | 'en'

export interface Binder {
  id: string
  name: string
}

interface BaseItem {
  uid: string
  binderId: string
  quantity: number
  /** Cote saisie à la main, en euros. Prioritaire sur la cote automatique. */
  manualPrice: number | null
  addedAt: number
}

export interface CardItem extends BaseItem {
  kind: 'card'
  cardId: string
  lang: Lang
  name: string
  localId: string
  setId: string
  setName: string
  setTotal: number | null
  year: number | null
  image: string | null
  rarity: string | null
  variant: Variant
  condition: Condition
  /** Cote Cardmarket (état « Near Mint ») en euros, au moment de la dernière mise à jour */
  basePrice: number | null
  priceSource: string | null
  priceUpdatedAt: number | null
}

export type SealedType = 'booster' | 'tripack' | 'blister' | 'etb' | 'display' | 'coffret' | 'autre'

export interface SealedItem extends BaseItem {
  kind: 'sealed'
  productType: SealedType
  name: string
  setId: string | null
  setName: string | null
  year: number | null
  logo: string | null
}

export type Item = CardItem | SealedItem

export interface CollectionState {
  items: Item[]
  binders: Binder[]
}
