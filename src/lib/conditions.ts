import type { Condition, SealedType, Variant } from './types'

/**
 * États Cardmarket. La cote automatique correspond à une carte « Near Mint » ;
 * le coefficient ajuste la valeur selon l'état choisi. Modifiable à volonté.
 */
export const CONDITIONS: { id: Condition; label: string; factor: number }[] = [
  { id: 'MT', label: 'Mint', factor: 1.1 },
  { id: 'NM', label: 'Near Mint', factor: 1 },
  { id: 'EX', label: 'Excellent', factor: 0.8 },
  { id: 'GD', label: 'Good', factor: 0.65 },
  { id: 'LP', label: 'Light Played', factor: 0.5 },
  { id: 'PL', label: 'Played', factor: 0.35 },
  { id: 'PO', label: 'Poor', factor: 0.2 },
]

export const conditionOf = (c: Condition) => CONDITIONS.find((x) => x.id === c) ?? CONDITIONS[1]

export const VARIANTS: { id: Variant; label: string }[] = [
  { id: 'normal', label: 'Normale' },
  { id: 'reverse', label: 'Reverse' },
  { id: 'holo', label: 'Holo' },
  { id: 'firstEdition', label: '1re édition' },
]

export const SEALED_TYPES: { id: SealedType; label: string }[] = [
  { id: 'booster', label: 'Booster' },
  { id: 'tripack', label: 'Tripack' },
  { id: 'blister', label: 'Blister' },
  { id: 'etb', label: 'Coffret Dresseur d’élite (ETB)' },
  { id: 'display', label: 'Display (36 boosters)' },
  { id: 'coffret', label: 'Coffret' },
  { id: 'autre', label: 'Autre' },
]

export const sealedLabel = (t: SealedType) => SEALED_TYPES.find((x) => x.id === t)?.label ?? 'Produit'
