import { useSyncExternalStore } from 'react'

let message: string | null = null
let timer: ReturnType<typeof setTimeout> | undefined
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export function toast(msg: string) {
  message = msg
  emit()
  clearTimeout(timer)
  timer = setTimeout(() => {
    message = null
    emit()
  }, 2600)
}

export const useToast = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => message,
  )
