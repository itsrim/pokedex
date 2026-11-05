import { useEffect, useMemo, useState } from 'react'
import { CONDITIONS, VARIANTS, conditionOf } from '../lib/conditions'
import { cardmarketSearchUrl, formatEur, parsePrice, uid } from '../lib/format'
import { actions, getCollection } from '../lib/store'
import { availableVariants, getCard, getSetYear, priceFor, type CardFull } from '../lib/tcgdex'
import { toast } from '../lib/toast'
import type { CardItem, Condition, Lang, Variant } from '../lib/types'
import { CardArt } from './CardArt'
import { BinderSelect, Chips, Stepper } from './Fields'
import { Sheet } from './Sheet'

const LAST_BINDER = 'pokedex:lastBinder'

type Props =
  | { mode: 'new'; lang: Lang; cardId: string; onClose: () => void; onSaved?: () => void }
  | { mode: 'edit'; item: CardItem; onClose: () => void }

export function CardSheet(props: Props) {
  const lang = props.mode === 'new' ? props.lang : props.item.lang
  const cardId = props.mode === 'new' ? props.cardId : props.item.cardId
  const existing = props.mode === 'edit' ? props.item : null

  const [card, setCard] = useState<CardFull | null>(null)
  const [fallbackImage, setFallbackImage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [variant, setVariant] = useState<Variant>(existing?.variant ?? 'normal')
  const [condition, setCondition] = useState<Condition>(existing?.condition ?? 'NM')
  const [quantity, setQuantity] = useState(existing?.quantity ?? 1)
  const [binderId, setBinderId] = useState(() => {
    if (existing) return existing.binderId
    const last = localStorage.getItem(LAST_BINDER)
    const { binders } = getCollection()
    return binders.find((b) => b.id === last)?.id ?? binders[0].id
  })
  const [manual, setManual] = useState(existing?.manualPrice != null ? String(existing.manualPrice).replace('.', ',') : '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let alive = true
    getCard(lang, cardId)
      .then((c) => {
        if (!alive) return
        setCard(c)
        if (!existing) setVariant(availableVariants(c)[0])
        // Image manquante en français : on prend la version anglaise
        if (!c.image && lang !== 'en')
          getCard('en', cardId).then((en) => alive && setFallbackImage(en.image ?? null)).catch(() => {})
      })
      .catch(() =>
        alive &&
          setError(
            existing
              ? 'Hors connexion : la dernière cote connue est affichée.'
              : 'Impossible de charger la carte. Vérifie ta connexion.',
          ),
      )
    return () => {
      alive = false
    }
  }, [lang, cardId])

  const variants = useMemo(() => {
    const avail = card ? availableVariants(card) : VARIANTS.map((v) => v.id)
    return VARIANTS.filter((v) => avail.includes(v.id) || v.id === variant)
  }, [card, variant])

  const auto = card ? priceFor(card, variant) : { value: existing?.basePrice ?? null, source: existing?.priceSource ?? null }
  const factor = conditionOf(condition).factor
  const manualPrice = parsePrice(manual)
  const unit = manualPrice ?? (auto.value != null ? auto.value * factor : null)

  const name = card?.name ?? existing?.name ?? '…'
  const setName = card?.set.name ?? existing?.setName ?? ''
  const localId = card?.localId ?? existing?.localId ?? ''
  const total = card?.set.cardCount.official ?? existing?.setTotal ?? null
  const image = card?.image ?? fallbackImage ?? existing?.image ?? null

  async function save() {
    setSaving(true)
    localStorage.setItem(LAST_BINDER, binderId)
    const common = {
      variant,
      condition,
      quantity,
      binderId,
      manualPrice,
      basePrice: auto.value,
      priceSource: auto.source,
      priceUpdatedAt: card ? Date.now() : existing?.priceUpdatedAt ?? null,
      image,
    }
    if (existing) {
      actions.updateItem(existing.uid, common)
      toast('Carte mise à jour')
      props.onClose()
      return
    }
    if (!card) return
    const year = await getSetYear(lang, card.set.id)
    const item: CardItem = {
      kind: 'card',
      uid: uid(),
      cardId: card.id,
      lang,
      name: card.name,
      localId: card.localId,
      setId: card.set.id,
      setName: card.set.name,
      setTotal: card.set.cardCount.official ?? null,
      year,
      rarity: card.rarity ?? null,
      addedAt: Date.now(),
      ...common,
    }
    actions.addItem(item)
    const binder = getCollection().binders.find((b) => b.id === binderId)
    toast(`${card.name} rangée dans « ${binder?.name} »`)
    props.onClose()
    if (props.mode === 'new') props.onSaved?.()
  }

  return (
    <Sheet
      title={name}
      subtitle={
        <>
          {setName} · n° {localId}
          {total ? `/${total}` : ''}
          {existing?.year ? ` · ${existing.year}` : ''}
        </>
      }
      onClose={props.onClose}
    >
      {error && <p className={existing ? 'notice' : 'error'} style={{ marginTop: 0 }}>{error}</p>}

      <div className="sheet-card">
        <CardArt image={image} alt={name} quality="high" />
        <div className="stack">
          <div className="price-box">
            <small>Cote pour cet état</small>
            <div className="big num">{card || existing ? formatEur(unit != null ? unit * quantity : null) : <span className="spinner" />}</div>
            {quantity > 1 && unit != null && <small className="num">{formatEur(unit)} l’unité</small>}
            <small>
              {manualPrice != null
                ? 'Cote saisie à la main'
                : auto.value != null
                  ? `${auto.source} : ${formatEur(auto.value)} en Near Mint × ${factor.toLocaleString('fr-FR')}`
                  : card
                    ? 'Pas de cote disponible : saisis-la ci-dessous'
                    : 'Chargement de la cote…'}
            </small>
          </div>
          {card?.rarity && <p className="hint">Rareté : {card.rarity}</p>}
          <a className="link" href={cardmarketSearchUrl(`${name} ${setName}`)} target="_blank" rel="noreferrer">
            Voir sur Cardmarket
          </a>
        </div>
      </div>

      <div className="sheet-section">
        <h3>État</h3>
        <Chips label="État" options={CONDITIONS.map((c) => ({ id: c.id, label: c.label }))} value={condition} onChange={setCondition} />
      </div>

      <div className="sheet-section">
        <h3>Version</h3>
        <Chips label="Version" options={variants} value={variant} onChange={setVariant} />
      </div>

      <div className="sheet-section">
        <h3>Classeur</h3>
        <BinderSelect value={binderId} onChange={setBinderId} />
      </div>

      <div className="sheet-section row" style={{ alignItems: 'end' }}>
        <label className="field">
          <span>Exemplaires</span>
          <Stepper value={quantity} onChange={setQuantity} />
        </label>
        <label className="field">
          <span>Ma cote (€ / unité)</span>
          <input className="input num" inputMode="decimal" placeholder="Auto" value={manual} onChange={(e) => setManual(e.target.value)} />
        </label>
      </div>

      <div className="sheet-footer">
        {existing && (
          <button
            className="btn btn-danger"
            onClick={() => {
              if (confirm(`Retirer ${name} de la collection ?`)) {
                actions.removeItem(existing.uid)
                toast('Carte retirée')
                props.onClose()
              }
            }}
          >
            Retirer
          </button>
        )}
        <button className="btn" onClick={save} disabled={saving || (!existing && !card)}>
          {existing ? 'Enregistrer' : 'Ranger dans le classeur'}
        </button>
      </div>
    </Sheet>
  )
}
