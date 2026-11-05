import { useEffect, useMemo, useState } from 'react'
import { normLocalId } from '../lib/format'
import { getSet, getSets, getSetsByYear, searchCardsByName, setIdOfCard, type CardBrief, type SetBrief } from '../lib/tcgdex'
import type { Lang } from '../lib/types'
import { CardArt } from './CardArt'
import { CardSheet } from './CardSheet'
import { SealedSheet } from './SealedSheet'

const fold = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const YEARS = Array.from({ length: new Date().getFullYear() - 1998 }, (_, i) => new Date().getFullYear() - i)

/** Extensions de la langue, filtrées par année si possible */
function useSets(lang: Lang, year: number | null) {
  const [all, setAll] = useState<SetBrief[]>([])
  const [byYear, setByYear] = useState<SetBrief[] | null>(null)
  const [yearUnsupported, setYearUnsupported] = useState(false)

  useEffect(() => {
    getSets(lang).then(setAll).catch(() => setAll([]))
  }, [lang])

  useEffect(() => {
    setByYear(null)
    setYearUnsupported(false)
    if (!year) return
    getSetsByYear(lang, year)
      .then((s) => (s ? setByYear(s) : setYearUnsupported(true)))
      .catch(() => setYearUnsupported(true))
  }, [lang, year])

  return { all, sets: byYear ?? all, yearUnsupported }
}

export function AddView() {
  const [tab, setTab] = useState<'cards' | 'sealed'>('cards')
  return (
    <section className="view">
      <h1 className="view-title">Ajouter</h1>
      <div className="segmented" role="group" aria-label="Type d’ajout">
        <button aria-pressed={tab === 'cards'} onClick={() => setTab('cards')}>Une carte</button>
        <button aria-pressed={tab === 'sealed'} onClick={() => setTab('sealed')}>Un produit scellé</button>
      </div>
      {tab === 'cards' ? <CardSearch /> : <SealedSearch />}
    </section>
  )
}

function CardSearch() {
  const [lang, setLang] = useState<Lang>('fr')
  const [name, setName] = useState('')
  const [number, setNumber] = useState('')
  const [year, setYear] = useState<number | null>(null)
  const [setId, setSetId] = useState('')
  const { all, sets, yearUnsupported } = useSets(lang, year)
  const [results, setResults] = useState<CardBrief[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [picked, setPicked] = useState<string | null>(null)

  const setNames = useMemo(() => new Map(all.map((s) => [s.id, s])), [all])
  const canSearch = !!(name.trim() || setId)

  async function search() {
    setLoading(true)
    setError(null)
    try {
      const n = fold(name.trim())
      const num = number.trim() ? normLocalId(number.trim().split('/')[0]) : null
      let list: CardBrief[]
      if (setId) {
        list = (await getSet(lang, setId)).cards ?? []
        if (n) list = list.filter((c) => fold(c.name).includes(n))
      } else {
        list = await searchCardsByName(lang, name.trim())
        if (year && !yearUnsupported) {
          const ids = new Set(sets.map((s) => s.id))
          list = list.filter((c) => ids.has(setIdOfCard(c.id)))
        }
      }
      if (num) list = list.filter((c) => normLocalId(c.localId) === num)
      setResults(list.slice(0, 120))
    } catch {
      setError('La recherche a échoué. Vérifie ta connexion et réessaie.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault()
          if (canSearch) search()
        }}
      >
        <div className="segmented" style={{ marginBottom: 0 }} role="group" aria-label="Langue des cartes">
          <button type="button" aria-pressed={lang === 'fr'} onClick={() => { setLang('fr'); setSetId('') }}>Cartes françaises</button>
          <button type="button" aria-pressed={lang === 'en'} onClick={() => { setLang('en'); setSetId('') }}>Cartes anglaises</button>
        </div>
        <label className="field">
          <span>Nom</span>
          <input className="input" placeholder="Ex. Dracaufeu" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
        </label>
        <div className="row">
          <label className="field">
            <span>Numéro</span>
            <input className="input num" placeholder="Ex. 4/102" value={number} onChange={(e) => setNumber(e.target.value)} autoComplete="off" />
          </label>
          <label className="field">
            <span>Année</span>
            <select className="select" value={year ?? ''} onChange={(e) => { setYear(e.target.value ? Number(e.target.value) : null); setSetId('') }}>
              <option value="">Toutes</option>
              {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </label>
        </div>
        <label className="field">
          <span>Extension</span>
          <select className="select" value={setId} onChange={(e) => setSetId(e.target.value)}>
            <option value="">Toutes les extensions</option>
            {[...sets].reverse().map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.cardCount.official})</option>
            ))}
          </select>
        </label>
        {yearUnsupported && year && <p className="hint">Le filtre par année n’est pas disponible pour le moment : toutes les extensions sont listées.</p>}
        <button className="btn btn-blue" disabled={!canSearch || loading}>
          {loading ? <span className="spinner" /> : 'Rechercher'}
        </button>
        {!canSearch && <p className="hint">Indique au moins un nom ou une extension.</p>}
      </form>

      {error && <p className="error">{error}</p>}
      {results && (
        <div className="sheet-section">
          <h3 style={{ marginBottom: 10 }}>{results.length ? `${results.length} résultat${results.length > 1 ? 's' : ''}` : 'Aucune carte trouvée'}</h3>
          {!results.length && <p className="hint">Essaie sans le numéro, ou change de langue : une carte française se cherche avec son nom français.</p>}
          <div className="results">
            {results.map((c) => (
              <button key={c.id} className="result" onClick={() => setPicked(c.id)}>
                <CardArt image={c.image} alt={c.name} />
                <div className="result-name">{c.name}</div>
                <div className="result-sub">
                  {setNames.get(setIdOfCard(c.id))?.name ?? setIdOfCard(c.id)} · {c.localId}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {picked && <CardSheet mode="new" lang={lang} cardId={picked} onClose={() => setPicked(null)} />}
    </>
  )
}

function SealedSearch() {
  const [query, setQuery] = useState('')
  const [year, setYear] = useState<number | null>(null)
  const { sets, yearUnsupported } = useSets('fr', year)
  const [chosen, setChosen] = useState<SetBrief | null | undefined>(undefined)

  const shown = useMemo(() => {
    const q = fold(query.trim())
    return [...sets].reverse().filter((s) => !q || fold(s.name).includes(q)).slice(0, 60)
  }, [sets, query])

  return (
    <>
      <p className="hint" style={{ marginBottom: 14 }}>
        Booster, ETB, display, coffret… Choisis l’extension du produit, puis son type.
      </p>
      <div className="row" style={{ marginBottom: 14 }}>
        <input className="input" type="search" placeholder="Extension (ex. Flammes Obsidiennes)" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Rechercher une extension" style={{ flex: 2 }} />
        <select className="select" value={year ?? ''} onChange={(e) => setYear(e.target.value ? Number(e.target.value) : null)} aria-label="Année">
          <option value="">Année</option>
          {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      {yearUnsupported && year && <p className="hint">Filtre par année indisponible pour le moment.</p>}

      <div className="list">
        <button className="list-item" onClick={() => setChosen(null)}>
          <div className="list-text">
            <strong>Produit sans extension précise</strong>
            <small>Coffret collection, pack promo, objet…</small>
          </div>
        </button>
        {shown.map((s) => (
          <button key={s.id} className="list-item" onClick={() => setChosen(s)}>
            {s.logo ? <img src={`${s.logo}.webp`} alt="" loading="lazy" /> : <span style={{ width: 72 }} />}
            <div className="list-text">
              <strong>{s.name}</strong>
              <small className="num">{s.cardCount.official} cartes</small>
            </div>
          </button>
        ))}
      </div>

      {chosen !== undefined && <SealedSheet mode="new" set={chosen} onClose={() => setChosen(undefined)} />}
    </>
  )
}
