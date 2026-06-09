import { useState } from 'react'
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

      <main className="scene">
        <Header />
        <Scene services={services} onPick={setSelected} />
        <Footer count={services.filter((s) => s.status === 'active').length} />
      </main>

      <ServiceModal service={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
