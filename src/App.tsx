import { useEffect, useState } from 'react'
import { AddView } from './components/AddView'
import { CollectionView } from './components/CollectionView'
import { IconBinder, IconPlus, IconScan } from './components/Icons'
import { ScanView } from './components/ScanView'
import { requestPersistentStorage } from './lib/store'
import { useToast } from './lib/toast'

type Tab = 'collection' | 'scan' | 'add'
const TABS: Tab[] = ['collection', 'scan', 'add']
const fromHash = (): Tab => {
  const h = location.hash.slice(1) as Tab
  return TABS.includes(h) ? h : 'collection'
}

export default function App() {
  const [tab, setTab] = useState<Tab>(fromHash)
  const toast = useToast()

  useEffect(() => {
    requestPersistentStorage()
    const onHash = () => setTab(fromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const go = (t: Tab) => {
    if (t !== tab) location.hash = t
    window.scrollTo({ top: 0 })
  }

  return (
    <div className="app">
      <main>
        {tab === 'collection' && <CollectionView onScan={() => go('scan')} onAdd={() => go('add')} />}
        {tab === 'scan' && <ScanView onManual={() => go('add')} />}
        {tab === 'add' && <AddView />}
      </main>

      <nav className="tabbar" aria-label="Navigation principale">
        <div className="tabbar-inner">
          <button className="tab" aria-current={tab === 'collection' ? 'page' : undefined} onClick={() => go('collection')}>
            <IconBinder />
            Collection
          </button>
          <button className="tab-scan" aria-current={tab === 'scan' ? 'page' : undefined} onClick={() => go('scan')} aria-label="Scanner">
            <IconScan />
          </button>
          <button className="tab" aria-current={tab === 'add' ? 'page' : undefined} onClick={() => go('add')}>
            <IconPlus />
            Ajouter
          </button>
        </div>
      </nav>

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  )
}
