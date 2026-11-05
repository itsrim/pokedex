import { useState } from 'react'
import { actions, useCollection } from '../lib/store'

export function Chips<T extends string>(props: {
  options: { id: T; label: string }[]
  value: T
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div className="chips wrap" role="group" aria-label={props.label}>
      {props.options.map((o) => (
        <button key={o.id} type="button" className="chip" aria-pressed={o.id === props.value} onClick={() => props.onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Stepper(props: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="stepper">
      <button type="button" aria-label="Retirer un exemplaire" onClick={() => props.onChange(Math.max(1, props.value - 1))}>−</button>
      <output className="num" aria-live="polite">{props.value}</output>
      <button type="button" aria-label="Ajouter un exemplaire" onClick={() => props.onChange(props.value + 1)}>+</button>
    </div>
  )
}

/** Choix du classeur, avec création à la volée */
export function BinderSelect(props: { value: string; onChange: (id: string) => void }) {
  const { binders } = useCollection()
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')

  if (creating)
    return (
      <div className="row">
        <input className="input" autoFocus placeholder="Nom du classeur" value={name} onChange={(e) => setName(e.target.value)} />
        <button
          type="button"
          className="btn btn-blue"
          style={{ flex: 'none' }}
          onClick={() => {
            const b = actions.addBinder(name)
            props.onChange(b.id)
            setCreating(false)
            setName('')
          }}
        >
          Créer
        </button>
      </div>
    )

  return (
    <div className="chips wrap" role="group" aria-label="Classeur">
      {binders.map((b) => (
        <button key={b.id} type="button" className="chip" aria-pressed={b.id === props.value} onClick={() => props.onChange(b.id)}>
          {b.name}
        </button>
      ))}
      <button type="button" className="chip chip-add" onClick={() => setCreating(true)}>+ Nouveau classeur</button>
    </div>
  )
}
