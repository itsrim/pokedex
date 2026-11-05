import { useCallback, useEffect, useRef, useState } from 'react'
import { readCard, warmUpOcr, type ScanReading } from '../lib/ocr'
import { findCandidates, getSets, setIdOfCard, type Candidate, type SetBrief } from '../lib/tcgdex'
import type { Lang } from '../lib/types'
import { CardArt } from './CardArt'
import { CardSheet } from './CardSheet'

const CARD_W = 900
const CARD_H = Math.round((CARD_W * 88) / 63)

type Phase = 'aim' | 'reading' | 'searching' | 'done'

export function ScanView(props: { onManual: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('aim')
  const [reading, setReading] = useState<ScanReading | null>(null)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [setsByLang, setSetsByLang] = useState<Record<Lang, Map<string, SetBrief>>>({ fr: new Map(), en: new Map() })
  const [picked, setPicked] = useState<Candidate | null>(null)
  const [fixName, setFixName] = useState('')
  const [fixNumber, setFixNumber] = useState('')

  /* Caméra arrière */
  useEffect(() => {
    warmUpOcr()
    ;(['fr', 'en'] as Lang[]).forEach((l) =>
      getSets(l).then((s) => setSetsByLang((prev) => ({ ...prev, [l]: new Map(s.map((x) => [x.id, x])) }))).catch(() => {}),
    )
    let stream: MediaStream | null = null
    let cancelled = false
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('La caméra n’est pas accessible ici. Ouvre l’appli en https, ou importe une photo.')
      return
    }
    navigator.mediaDevices
      .getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } } })
      .then((s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop())
        stream = s
        if (videoRef.current) {
          videoRef.current.srcObject = s
          videoRef.current.play().catch(() => {})
        }
      })
      .catch(() => setCameraError('Accès à la caméra refusé. Autorise-le dans Réglages > Safari > Caméra, ou importe une photo.'))
    return () => {
      cancelled = true
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  const analyse = useCallback(async (card: HTMLCanvasElement) => {
    setPhase('reading')
    setCandidates([])
    try {
      const r = await readCard(card)
      setReading(r)
      setFixName(r.names[0] ?? '')
      setFixNumber(r.number ? `${r.number}${r.total ? '/' + r.total : ''}` : '')
      setPhase('searching')
      setCandidates(await findCandidates(r))
    } catch (e) {
      console.error(e)
      setReading(null)
    }
    setPhase('done')
  }, [])

  /** Capture la zone du cadre jaune dans le flux vidéo */
  function capture() {
    const video = videoRef.current
    const frame = frameRef.current
    if (!video || !frame || !video.videoWidth) return
    const vr = video.getBoundingClientRect()
    const fr = frame.getBoundingClientRect()
    const scale = Math.max(vr.width / video.videoWidth, vr.height / video.videoHeight)
    const ox = (vr.width - video.videoWidth * scale) / 2
    const oy = (vr.height - video.videoHeight * scale) / 2
    const sx = (fr.left - vr.left - ox) / scale
    const sy = (fr.top - vr.top - oy) / scale
    const canvas = document.createElement('canvas')
    canvas.width = CARD_W
    canvas.height = CARD_H
    canvas.getContext('2d')!.drawImage(video, sx, sy, fr.width / scale, fr.height / scale, 0, 0, CARD_W, CARD_H)
    analyse(canvas)
  }

  /** Photo importée : on garde la plus grande zone au format carte, centrée */
  async function fromFile(file: File) {
    const bmp = await createImageBitmap(file)
    const ratio = 63 / 88
    let w = bmp.width
    let h = w / ratio
    if (h > bmp.height) {
      h = bmp.height
      w = h * ratio
    }
    const canvas = document.createElement('canvas')
    canvas.width = CARD_W
    canvas.height = CARD_H
    canvas.getContext('2d')!.drawImage(bmp, (bmp.width - w) / 2, (bmp.height - h) / 2, w, h, 0, 0, CARD_W, CARD_H)
    analyse(canvas)
  }

  async function retry() {
    const [num, tot] = fixNumber.split('/').map((s) => s.trim())
    setPhase('searching')
    setCandidates(
      await findCandidates({
        names: fixName.trim() ? [fixName.trim()] : [],
        number: num || null,
        total: tot ? Number(tot) || null : null,
      }).catch(() => []),
    )
    setPhase('done')
  }

  const reset = () => {
    setPhase('aim')
    setReading(null)
    setCandidates([])
    videoRef.current?.play().catch(() => {})
  }

  const best = candidates[0]
  const confident = best && best.score >= 11
  const setName = (c: Candidate) => setsByLang[c.lang].get(setIdOfCard(c.brief.id))?.name ?? setIdOfCard(c.brief.id)

  return (
    <section className="view view-scan">
      <h1 className="view-title">Scanner une carte</h1>

      <div className="scan-stage" hidden={phase === 'done'}>
          <div className="scanner">
            {cameraError ? (
              <div className="camera-off"><p>{cameraError}</p></div>
            ) : (
              <>
                <video ref={videoRef} playsInline muted autoPlay />
                <div className="scan-frame" ref={frameRef} />
                <p className="scan-tip">Cadre la carte entière, bien à plat et éclairée, sans reflet.</p>
              </>
            )}
          </div>
          <div className="scan-actions">
            <button className="btn btn-ghost" onClick={() => fileRef.current?.click()} disabled={phase !== 'aim'}>Importer une photo</button>
            {!cameraError && (
              <button className="shutter" aria-label="Scanner la carte" onClick={capture} disabled={phase !== 'aim'} />
            )}
            <button className="btn btn-ghost" onClick={props.onManual}>Chercher</button>
          </div>
          <p className="scan-status" aria-live="polite">
            {phase === 'reading' && <><span className="spinner" /> Lecture du nom et du numéro…</>}
            {phase === 'searching' && <><span className="spinner" /> Recherche de la carte…</>}
            {phase === 'aim' && 'Le premier scan télécharge le moteur de lecture, il prend quelques secondes de plus.'}
          </p>
      </div>

      {phase === 'done' && (
        <div className="stack">
          {best ? (
            <>
              <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{confident ? 'Carte reconnue' : 'Est-ce l’une de ces cartes ?'}</h2>
              {confident && (
                <button className="list-item" onClick={() => setPicked(best)} style={{ alignItems: 'stretch' }}>
                  <div style={{ width: '38%', flex: 'none' }}><CardArt image={best.brief.image} alt={best.brief.name} /></div>
                  <div className="list-text" style={{ alignSelf: 'center' }}>
                    <strong style={{ fontSize: '1.2rem' }}>{best.brief.name}</strong>
                    <small>{setName(best)} · n° {best.brief.localId}</small>
                    <div style={{ marginTop: 12 }}><span className="btn">Choisir l’état et ranger</span></div>
                  </div>
                </button>
              )}
              {candidates.length > (confident ? 1 : 0) && (
                <>
                  {confident && <h3 style={{ margin: '6px 0 0', fontSize: '1rem' }}>Autres possibilités</h3>}
                  <div className="results">
                    {candidates.slice(confident ? 1 : 0).map((c) => (
                      <button key={`${c.lang}-${c.brief.id}`} className="result" onClick={() => setPicked(c)}>
                        <CardArt image={c.brief.image} alt={c.brief.name} />
                        <div className="result-name">{c.brief.name}</div>
                        <div className="result-sub">{setName(c)} · {c.brief.localId}{c.lang === 'en' ? ' · EN' : ''}</div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="notice">
              <strong>Carte non reconnue.</strong> Corrige ce qui a été lu ci-dessous, ou reprends la photo avec plus de lumière.
            </div>
          )}

          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault()
              retry()
            }}
          >
            <p className="hint">
              Lu sur la carte : « {reading?.rawName || '?'} » et « {reading?.rawNumber || '?'} »
            </p>
            <div className="row">
              <label className="field">
                <span>Nom</span>
                <input className="input" value={fixName} onChange={(e) => setFixName(e.target.value)} />
              </label>
              <label className="field">
                <span>Numéro</span>
                <input className="input num" value={fixNumber} placeholder="25/165" onChange={(e) => setFixNumber(e.target.value)} />
              </label>
            </div>
            <div className="row">
              <button type="submit" className="btn btn-blue">Relancer la recherche</button>
              <button type="button" className="btn btn-ghost" onClick={reset}>Nouveau scan</button>
            </div>
          </form>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) fromFile(f)
          e.target.value = ''
        }}
      />

      {picked && (
        <CardSheet mode="new" lang={picked.lang} cardId={picked.brief.id} onClose={() => setPicked(null)} onSaved={reset} />
      )}
    </section>
  )
}
