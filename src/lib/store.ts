import { useSyncExternalStore } from 'react'
import { conditionOf } from './conditions'
import type { Binder, CollectionState, Item } from './types'
import { uid } from './format'

const KEY = 'pokedex:collection:v1'
const DEFAULT_BINDER: Binder = { id: 'default', name: 'Mon classeur' }

function load(): CollectionState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const s = JSON.parse(raw) as CollectionState
      if (Array.isArray(s.items) && Array.isArray(s.binders) && s.binders.length) return s
    }
  } catch {
    /* stockage vide ou illisible : on repart de zéro */
  }
  return { items: [], binders: [DEFAULT_BINDER] }
}

let state: CollectionState = load()
const listeners = new Set<() => void>()

function set(next: CollectionState) {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch (e) {
    console.warn('Sauvegarde impossible', e)
  }
  listeners.forEach((l) => l())
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export const useCollection = () => useSyncExternalStore(subscribe, () => state)
export const getCollection = () => state

/** Valeur d'une ligne (quantité incluse) */
export function itemValue(item: Item): number | null {
  const unit =
    item.manualPrice ??
    (item.kind === 'card' && item.basePrice != null
      ? item.basePrice * conditionOf(item.condition).factor
      : null)
  return unit == null ? null : unit * item.quantity
}

export function totalValue(items: Item[]) {
  return items.reduce((sum, i) => sum + (itemValue(i) ?? 0), 0)
}

export const actions = {
  addItem(item: Item) {
    set({ ...state, items: [item, ...state.items] })
  },
  updateItem(uidToUpdate: string, patch: Partial<Item>) {
    set({
      ...state,
      items: state.items.map((i) => (i.uid === uidToUpdate ? ({ ...i, ...patch } as Item) : i)),
    })
  },
  removeItem(uidToRemove: string) {
    set({ ...state, items: state.items.filter((i) => i.uid !== uidToRemove) })
  },
  addBinder(name: string): Binder {
    const b = { id: uid(), name: name.trim() || 'Nouveau classeur' }
    set({ ...state, binders: [...state.binders, b] })
    return b
  },
  renameBinder(id: string, name: string) {
    set({ ...state, binders: state.binders.map((b) => (b.id === id ? { ...b, name } : b)) })
  },
  /** Supprime un classeur ; ses cartes rejoignent le premier classeur restant */
  removeBinder(id: string) {
    const binders = state.binders.filter((b) => b.id !== id)
    if (!binders.length) return
    const fallback = binders[0].id
    set({
      binders,
      items: state.items.map((i) => (i.binderId === id ? { ...i, binderId: fallback } : i)),
    })
  },
  replaceAll(next: CollectionState) {
    if (!Array.isArray(next.items) || !Array.isArray(next.binders) || !next.binders.length)
      throw new Error('Fichier de sauvegarde invalide')
    set(next)
  },
}

/** Demande au navigateur de ne pas effacer les données (utile sur iPhone) */
export function requestPersistentStorage() {
  navigator.storage?.persist?.().catch(() => {})
}
