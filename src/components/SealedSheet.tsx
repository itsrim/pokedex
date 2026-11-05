import { useState } from 'react'
import { SEALED_TYPES, sealedLabel } from '../lib/conditions'
import { cardmarketSearchUrl, formatEur, parsePrice, uid } from '../lib/format'
import { actions, getCollection } from '../lib/store'
import { getSetYear, type SetBrief } from '../lib/tcgdex'
import { toast } from '../lib/toast'
import type { SealedItem, SealedType } from '../lib/types'
import { BinderSelect, Chips, Stepper } from './Fields'
import { Sheet } from './Sheet'

type Props =
  | { mode: 'new'; set: SetBrief | null; onClose: () => void }
  | { mode: 'edit'; item: SealedItem; onClose: () => void }

export function SealedSheet(props: Props) {
  const existing = props.mode === 'edit' ? props.item : null
  const set = props.mode === 'new' ? props.set : null
  const setName = existing?.setName ?? set?.name ?? null

  const [type, setType] = useState<SealedType>(existing?.productType ?? 'booster')
  const [name, setName_] = useState(existing?.name ?? '')
  const [quantity, setQuantity] = useState(existing?.quantity ?? 1)
  const [binderId, setBinderId] = useState(existing?.binderId ?? getCollection().binders[0].id)
  const [price, setPrice] = useState(existing?.manualPrice != null ? String(existing.manualPrice).replace('.', ',') : '')

  const autoName = [sealedLabel(type).replace(/ \(.*\)$/, ''), setName].filter(Boolean).join(' ')
  const finalName = name.trim() || autoName
  const unit = parsePrice(price)

  async function save() {
    if (existing) {
      actions.updateItem(existing.uid, { productType: type, name: finalName, quantity, binderId, manualPrice: unit })
      toast('Produit mis à jour')
      props.onClose()
      return
    }
    const item: SealedItem = {
      kind: 'sealed',
      uid: uid(),
      productType: type,
      name: finalName,
      setId: set?.id ?? null,
      setName: set?.name ?? null,
      year: set ? await getSetYear('fr', set.id) : null,
      logo: set?.logo ?? null,
      quantity,
      binderId,
      manualPrice: unit,
      addedAt: Date.now(),
    }
    actions.addItem(item)
    toast(`${finalName} ajouté`)
    props.onClose()
  }

  return (
    <Sheet title={existing ? existing.name : 'Produit scellé'} subtitle={setName ?? 'Sans extension'} onClose={props.onClose}>
      {(existing?.logo ?? set?.logo) && (
        <img src={`${existing?.logo ?? set?.logo}.webp`} alt="" style={{ maxHeight: 70, margin: '0 auto 16px' }} />
      )}

      <div className="sheet-section">
        <h3>Type de produit</h3>
        <Chips label="Type de produit" options={SEALED_TYPES} value={type} onChange={setType} />
      </div>

      <div className="sheet-section">
        <label className="field">
          <span>Nom</span>
          <input className="input" placeholder={autoName || 'Ex. Coffret Dracaufeu ex'} value={name} onChange={(e) => setName_(e.target.value)} />
        </label>
      </div>

      <div className="sheet-section">
        <h3>Classeur</h3>
        <BinderSelect value={binderId} onChange={setBinderId} />
      </div>

      <div className="sheet-section row" style={{ alignItems: 'end' }}>
        <label className="field">
          <span>Quantité</span>
          <Stepper value={quantity} onChange={setQuantity} />
        </label>
        <label className="field">
          <span>Cote (€ / unité)</span>
          <input className="input num" inputMode="decimal" placeholder="0,00" value={price} onChange={(e) => setPrice(e.target.value)} />
        </label>
      </div>

      <p className="hint" style={{ marginTop: 10 }}>
        Il n’existe pas de cote gratuite et automatique pour le scellé : vérifie le prix sur{' '}
        <a className="link" href={cardmarketSearchUrl(finalName)} target="_blank" rel="noreferrer">Cardmarket</a>{' '}
        et reporte-le ici.{unit != null && quantity > 1 && <> Total : <strong className="num">{formatEur(unit * quantity)}</strong>.</>}
      </p>

      <div className="sheet-footer">
        {existing && (
          <button
            className="btn btn-danger"
            onClick={() => {
              if (confirm(`Retirer ${existing.name} de la collection ?`)) {
                actions.removeItem(existing.uid)
                toast('Produit retiré')
                props.onClose()
              }
            }}
          >
            Retirer
          </button>
        )}
        <button className="btn" onClick={save}>{existing ? 'Enregistrer' : 'Ajouter à la collection'}</button>
      </div>
    </Sheet>
  )
}
