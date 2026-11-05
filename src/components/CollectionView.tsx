import { useMemo, useRef, useState } from 'react'
import { conditionOf, sealedLabel } from '../lib/conditions'
import { formatEur } from '../lib/format'
import { actions, getCollection, itemValue, totalValue, useCollection } from '../lib/store'
import { getCard, priceFor } from '../lib/tcgdex'
import { toast } from '../lib/toast'
import type { Item } from '../lib/types'
import { CardArt } from './CardArt'
import { CardSheet } from './CardSheet'
import { SealedSheet } from './SealedSheet'

type Sort = 'recent' | 'value' | 'name' | 'set'

export function CollectionView(props: { onScan: () => void; onAdd: () => void }) {
  const { items, binders } = useCollection()
  const [binderId, setBinderId] = useState<string | 'all'>('all')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<Sort>('recent')
  const [open, setOpen] = useState<Item | null>(null)
  const [refreshing, setRefreshing] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const inBinder = useMemo(() => (binderId === 'all' ? items : items.filter((i) => i.binderId === binderId)), [items, binderId])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q
      ? inBinder.filter((i) =>
          [i.name, i.setName, i.kind === 'card' ? i.localId : sealedLabel(i.productType), i.year]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(q),
        )
      : [...inBinder]
    const by: Record<Sort, (a: Item, b: Item) => number> = {
      recent: (a, b) => b.addedAt - a.addedAt,
      value: (a, b) => (itemValue(b) ?? 0) - (itemValue(a) ?? 0),
      name: (a, b) => a.name.localeCompare(b.name, 'fr'),
      set: (a, b) =>
        (a.year ?? 0) - (b.year ?? 0) ||
        (a.setName ?? '').localeCompare(b.setName ?? '', 'fr') ||
        (a.kind === 'card' && b.kind === 'card' ? a.localId.localeCompare(b.localId, 'fr', { numeric: true }) : 0),
    }
    return list.sort(by[sort])
  }, [inBinder, query, sort])

  const cardsCount = inBinder.filter((i) => i.kind === 'card').reduce((n, i) => n + i.quantity, 0)
  const sealedCount = inBinder.filter((i) => i.kind === 'sealed').reduce((n, i) => n + i.quantity, 0)
  const currentBinder = binders.find((b) => b.id === binderId)

  async function refreshPrices() {
    const cards = getCollection().items.filter((i) => i.kind === 'card')
    let done = 0
    let updated = 0
    setRefreshing(`0/${cards.length}`)
    const queue = [...cards]
    const worker = async () => {
      for (let it = queue.shift(); it; it = queue.shift()) {
        if (it.kind !== 'card') continue
        try {
          const card = await getCard(it.lang, it.cardId)
          const p = priceFor(card, it.variant)
          if (p.value != null) {
            actions.updateItem(it.uid, { basePrice: p.value, priceSource: p.source, priceUpdatedAt: Date.now() })
            updated++
          }
        } catch {
          /* on passe à la suivante */
        }
        setRefreshing(`${++done}/${cards.length}`)
      }
    }
    await Promise.all([worker(), worker(), worker(), worker()])
    setRefreshing(null)
    toast(`${updated} cote${updated > 1 ? 's' : ''} mise${updated > 1 ? 's' : ''} à jour`)
  }

  function exportBackup() {
    const blob = new Blob([JSON.stringify(getCollection(), null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `pokedex-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  async function importBackup(file: File) {
    try {
      const data = JSON.parse(await file.text())
      if (!confirm('Remplacer toute la collection par cette sauvegarde ?')) return
      actions.replaceAll(data)
      setBinderId('all')
      toast('Sauvegarde restaurée')
    } catch {
      toast('Ce fichier n’est pas une sauvegarde Pokédex')
    }
  }

  function manageBinder() {
    if (!currentBinder) return
    const name = prompt('Nom du classeur (laisser vide pour le supprimer)', currentBinder.name)
    if (name === null) return
    if (name.trim()) return actions.renameBinder(currentBinder.id, name.trim())
    if (binders.length === 1) return toast('Il faut garder au moins un classeur')
    if (confirm(`Supprimer « ${currentBinder.name} » ? Ses cartes iront dans « ${binders.find((b) => b.id !== currentBinder.id)?.name} ».`)) {
      actions.removeBinder(currentBinder.id)
      setBinderId('all')
    }
  }

  return (
    <section className="view">
      <h1 className="view-title">Ma collection</h1>

      <section
        className="holo"
        aria-label="Cote totale"
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          const x = (e.clientX - r.left) / r.width - 0.5
          e.currentTarget.style.setProperty('--holo-tilt', `${x * 60}deg`)
        }}
      >
        <p className="holo-label">{currentBinder ? `Cote de « ${currentBinder.name} »` : 'Cote de la collection'}</p>
        <p className="holo-total num">{formatEur(totalValue(inBinder))}</p>
        <p className="holo-meta num">
          {cardsCount} carte{cardsCount > 1 ? 's' : ''}
          {sealedCount > 0 && ` et ${sealedCount} produit${sealedCount > 1 ? 's' : ''} scellé${sealedCount > 1 ? 's' : ''}`}
        </p>
        <div className="holo-actions">
          <button className="btn btn-small" onClick={refreshPrices} disabled={!!refreshing || !items.length}>
            {refreshing ? `Mise à jour ${refreshing}` : 'Actualiser les cotes'}
          </button>
        </div>
      </section>

      <div className="chips" role="group" aria-label="Classeurs">
        <button className="chip" aria-pressed={binderId === 'all'} onClick={() => setBinderId('all')}>Tout</button>
        {binders.map((b) => (
          <button key={b.id} className="chip" aria-pressed={binderId === b.id} onClick={() => setBinderId(b.id)}>
            {b.name}
          </button>
        ))}
        {currentBinder ? (
          <button className="chip chip-add" onClick={manageBinder}>Renommer ou supprimer</button>
        ) : (
          <button
            className="chip chip-add"
            onClick={() => {
              const n = prompt('Nom du nouveau classeur')
              if (n?.trim()) setBinderId(actions.addBinder(n).id)
            }}
          >
            + Classeur
          </button>
        )}
      </div>

      {items.length > 0 && (
        <div className="toolbar">
          <input className="input" type="search" placeholder="Nom, extension, numéro, année" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Rechercher dans la collection" />
          <select className="select" value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Trier">
            <option value="recent">Récents</option>
            <option value="value">Cote</option>
            <option value="name">Nom</option>
            <option value="set">Extension</option>
          </select>
        </div>
      )}

      {shown.length ? (
        <div className="binder">
          {shown.map((i) => (
            <button key={i.uid} className="pocket" onClick={() => setOpen(i)} aria-label={`${i.name}, ${formatEur(itemValue(i))}`}>
              {i.kind === 'card' ? (
                <CardArt image={i.image} alt={i.name} />
              ) : (
                <div className="pocket-art pocket-sealed">
                  {i.logo && <img src={`${i.logo}.webp`} alt="" loading="lazy" />}
                  <small>{sealedLabel(i.productType)}</small>
                </div>
              )}
              {i.quantity > 1 && <span className="pocket-qty num">×{i.quantity}</span>}
              <span className="pocket-name">{i.name}</span>
              <span className="pocket-cond">
                {i.kind === 'card' ? `${i.localId}${i.setTotal ? '/' + i.setTotal : ''} · ${conditionOf(i.condition).id}` : i.setName ?? 'Scellé'}
              </span>
              <span className="pocket-price num">{formatEur(itemValue(i))}</span>
            </button>
          ))}
        </div>
      ) : items.length ? (
        <p className="hint">Aucune carte ne correspond.</p>
      ) : (
        <div className="empty">
          <h2>Ton classeur est vide</h2>
          <p>Scanne ta première carte ou ajoute-la en la cherchant par son nom.</p>
          <div className="row" style={{ maxWidth: 360, margin: '0 auto' }}>
            <button className="btn" onClick={props.onScan}>Scanner</button>
            <button className="btn btn-ghost" onClick={props.onAdd}>Chercher</button>
          </div>
        </div>
      )}


      <div className="backup">
        <p className="hint">Tes cartes sont enregistrées sur cet appareil. Garde une copie de temps en temps.</p>
        <div className="row">
          <button className="btn btn-ghost btn-small" onClick={exportBackup} disabled={!items.length}>Sauvegarder</button>
          <button className="btn btn-ghost btn-small" onClick={() => fileRef.current?.click()}>Restaurer</button>
        </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) importBackup(f)
              e.target.value = ''
            }}
          />
      </div>

      {open?.kind === 'card' && <CardSheet mode="edit" item={open} onClose={() => setOpen(null)} />}
      {open?.kind === 'sealed' && <SealedSheet mode="edit" item={open} onClose={() => setOpen(null)} />}
    </section>
  )
}
