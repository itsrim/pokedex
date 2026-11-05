/**
 * Lecture du nom et du numéro d'une carte avec Tesseract.js (OCR dans le navigateur).
 * Le moteur (~ quelques Mo) est téléchargé au premier scan puis mis en cache.
 */
import type { Worker } from 'tesseract.js'

let workerPromise: Promise<Worker> | null = null

function getWorker() {
  if (!workerPromise) {
    workerPromise = import('tesseract.js').then(({ createWorker }) => createWorker(['fra', 'eng'], 1))
    workerPromise.catch(() => (workerPromise = null))
  }
  return workerPromise
}

/** Lancer le chargement en avance (à l'ouverture de l'onglet Scanner) */
export const warmUpOcr = () => void getWorker().catch(() => {})

export interface ScanReading {
  names: string[]
  number: string | null
  total: number | null
  rawName: string
  rawNumber: string
}

const STOP_WORDS = new Set([
  'BASE', 'BASIC', 'NIVEAU', 'STADE', 'STAGE', 'PV', 'HP', 'POKEMON', 'POKÉMON', 'EVOLUE', 'ÉVOLUE',
  'EVOLVES', 'FROM', 'DE', 'DU', 'LA', 'LE', 'LES', 'ET', 'DRESSEUR', 'TRAINER', 'OBJET', 'ITEM',
  'SUPPORTER', 'STADIUM', 'ENERGIE', 'ÉNERGIE', 'ENERGY', 'TALENT', 'ABILITY',
  'TERA', 'TÉRA', 'RESTORED', 'RESTAURÉ', 'NIV', 'LV',
])

/** Recadre une zone (en fractions de l'image) et la prépare pour l'OCR */
function region(src: HTMLCanvasElement, x: number, y: number, w: number, h: number, scale = 2) {
  const c = document.createElement('canvas')
  c.width = Math.round(src.width * w * scale)
  c.height = Math.round(src.height * h * scale)
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(src, src.width * x, src.height * y, src.width * w, src.height * h, 0, 0, c.width, c.height)
  // Niveaux de gris + contraste
  const img = ctx.getImageData(0, 0, c.width, c.height)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
    const v = Math.max(0, Math.min(255, (g - 128) * 1.6 + 128))
    d[i] = d[i + 1] = d[i + 2] = v
  }
  ctx.putImageData(img, 0, 0)
  return c
}

function parseNumber(text: string) {
  const t = text.toUpperCase().replace(/[Oo](?=\d)/g, '0').replace(/[|\\]/g, '/')
  const m = t.match(/([A-Z]{0,3}\d{1,3})\s*\/\s*([A-Z]{0,3}\d{2,3})/)
  if (m) {
    const total = Number(m[2].replace(/\D/g, ''))
    return { number: m[1], total: Number.isFinite(total) ? total : null }
  }
  const promo = t.match(/\b(SWSH|SVP|SM|XY|BW|DP|TG|GG|SV)\s?(\d{1,3})\b/)
  if (promo) return { number: promo[1] + promo[2], total: null }
  return { number: null, total: null }
}

function parseNames(text: string) {
  const words = text
    .replace(/[^A-Za-zÀ-ÖØ-öø-ÿ'’\-\s]/g, ' ')
    .split(/\s+/)
    .map((w) => w.replace(/^[-'’]+|[-'’]+$/g, ''))
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w.toUpperCase()))
  // Les mots les plus longs sont souvent le nom du Pokémon
  const sorted = [...words].sort((a, b) => b.length - a.length)
  const names: string[] = []
  if (words.length >= 2) names.push(words.slice(0, 2).join(' '))
  for (const w of sorted) if (!names.includes(w)) names.push(w)
  return names.slice(0, 4)
}

/**
 * `card` : image de la carte recadrée (format 63 × 88).
 * Nom en haut à gauche, numéro en bas (à gauche sur les cartes récentes, à droite sur les anciennes).
 */
export async function readCard(card: HTMLCanvasElement): Promise<ScanReading> {
  const worker = await getWorker()
  const nameZone = region(card, 0.04, 0.025, 0.74, 0.085)
  const numberZone = region(card, 0.0, 0.88, 1, 0.11, 2.5)

  const [nameRes, numberRes] = [
    await worker.recognize(nameZone),
    await worker.recognize(numberZone),
  ]
  const rawName = nameRes.data.text.trim()
  const rawNumber = numberRes.data.text.trim()
  const { number, total } = parseNumber(rawNumber)
  return { names: parseNames(rawName), number, total, rawName, rawNumber }
}
