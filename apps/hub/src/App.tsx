import { useState } from 'react'
import { AccountBar } from '@soritok/auth'
import { services } from './data/services'
import type { Service } from './types'
import Header from './components/Header'
import Scene from './components/Scene'
import ServiceModal from './components/ServiceModal'
import Footer from './components/Footer'

export default function App() {
  const [selected, setSelected] = useState<Service | null>(null)

  return (
    <div className="room">
      <div className="room__light" aria-hidden />
      <div className="room__vignette" aria-hidden />

      <AccountBar brand="소리톡" />

      <main className="scene">
        <Header />
        <Scene services={services} onPick={setSelected} />
        <Footer count={services.filter((s) => s.status === 'active').length} />
      </main>

      <ServiceModal service={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
