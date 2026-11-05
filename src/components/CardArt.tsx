import { useState } from 'react'
import { cardImage } from '../lib/tcgdex'

/** Visuel d'une carte, avec repli si l'image n'existe pas (fréquent pour les cartes FR récentes) */
export function CardArt(props: { image: string | null | undefined; alt: string; quality?: 'low' | 'high' }) {
  const [failed, setFailed] = useState(false)
  const src = cardImage(props.image, props.quality)
  return (
    <div className="pocket-art">
      {src && !failed ? (
        <img src={src} alt={props.alt} loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <div className="placeholder-card">{props.alt}</div>
      )}
    </div>
  )
}
