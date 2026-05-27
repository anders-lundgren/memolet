import { useState, useMemo } from 'react'

const CATEGORY_COLORS = {
  'Prepositioner': '#c0392b',
  'Personliga pronomen': '#8e44ad',
  'Verb': '#2471a3',
  'Verbformer': '#2471a3',
  'Negationsord': '#c0392b',
  'Artiklar': '#5a7a5a',
  'Konjunktioner': '#d68910',
  'Demonstrativa': '#8e44ad',
  'Possessiva': '#8e44ad',
  'Adverb': '#2e86c1',
  'Hälsningar': '#c0392b',
  'Mängdord': '#5a7a5a',
  'Grundläggande': '#2471a3',
  'Frågeord': '#d68910',
  'Substantiv': '#1a5276',
  'Adjektiv': '#5a7a5a',
  'Tidsadverb': '#2e86c1',
  'Tidsenheter': '#2e86c1',
  'Tal': '#d68910',
  'Familj': '#c0392b',
  'Religion': '#8e44ad',
  'Storleks': '#5a7a5a',
  'Hemmet': '#c0392b',
  'Titlar': '#d68910',
  'Känslor': '#c0392b',
  'Yrken': '#1a5276',
  'Kroppen': '#8e44ad',
  'Rörelseverb': '#2471a3',
  'Transport': '#1a5276',
  'Slang': '#c0392b',
  'Våldsamma': '#c0392b',
  'Värderingsadjektiv': '#5a7a5a',
  'Mentala': '#8e44ad',
  'Polisutredning': '#c0392b',
  'Stad': '#1a5276',
  'Ordningstal': '#d68910',
  'Natur': '#5a7a5a',
  'Existensverb': '#2471a3',
  'Aktivitetsverb': '#2471a3',
  'Aktiviteter': '#d68910',
  'Skola': '#1a5276',
  'Teknik': '#1a5276',
  'Sport': '#5a7a5a',
  'Mat': '#c0392b',
  'Krig': '#c0392b',
  'Karaktärsdrag': '#8e44ad',
  'Sinnesverb': '#8e44ad',
  'Konst': '#d68910',
  'Pengar': '#5a7a5a',
  'Djur': '#5a7a5a',
  'Hälsa': '#c0392b',
  'Namn': '#d68910',
  'Sociala': '#c0392b',
  'Material': '#1a5276',
  'Organisation': '#1a5276',
  'Högtider': '#d68910',
  'Färger': '#d68910',
  'Väder': '#2e86c1',
  'Tillståndsadjektiv': '#5a7a5a',
  'Känslaverb': '#c0392b',
  'Politik': '#1a5276',
  'Kläder': '#8e44ad',
  'Länder': '#1a5276',
  'Köksredskap': '#c0392b',
  'Förvaltningsverb': '#2471a3',
  'Veckodagar': '#d68910',
  'Byggnader': '#1a5276',
  'Geografi': '#5a7a5a',
  'Månader': '#d68910',
  'Kommunikationsverb': '#2471a3',
  'Pronomen': '#8e44ad',
  'Bokstäver': '#d68910',
  'Brott': '#c0392b',
  'Platsadverb': '#2e86c1',
}

function getColor(name) {
  for (const [key, color] of Object.entries(CATEGORY_COLORS)) {
    if (name.startsWith(key)) return color
  }
  return '#5a7a5a'
}

export default function DeckBrowser({ groups, onStart, progress = {} }) {
  const [search, setSearch] = useState('')
  const [activeGroup, setActiveGroup] = useState(null) // for mode picker
  const [mode, setMode] = useState('fr→sv')

  const filtered = useMemo(() => {
    if (!search.trim()) return groups
    const q = search.toLowerCase()
    return groups.filter(g =>
      g.name.toLowerCase().includes(q) ||
      g.decks.some(d => d.cards.some(c =>
        c.fr.toLowerCase().includes(q) || c.sv.toLowerCase().includes(q)
      ))
    )
  }, [search, groups])

  const totalCards = groups.reduce((s, g) => s + g.totalCards, 0)

  function handleDeckClick(group) {
    setActiveGroup(group)
  }

  function handleStart() {
    if (activeGroup) {
      onStart(activeGroup, mode)
      setActiveGroup(null)
    }
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--cream)' }}>
      {/* Header */}
      <header className="sticky top-0 z-20 px-4 py-3 flex items-center gap-3"
        style={{ background: 'var(--cream)', borderBottom: '1px solid var(--mist)' }}>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-2xl leading-tight" style={{ color: 'var(--ink)' }}>
            Mémolet
          </h1>
          <p className="text-xs" style={{ color: '#7a7060' }}>
            {groups.length} lekar · {totalCards} kort
          </p>
        </div>
        <div className="relative">
          <input
            type="search"
            placeholder="Sök lekar…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="rounded-full px-4 py-1.5 text-sm outline-none w-40 sm:w-56"
            style={{
              background: 'var(--paper)',
              border: '1px solid var(--mist)',
              color: 'var(--ink)',
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >✕</button>
          )}
        </div>
      </header>

      {/* Intro blurb */}
      {!search && (
        <div className="px-4 pt-4 pb-2 animate-fade-up">
          <p className="font-display italic text-base" style={{ color: '#7a7060' }}>
            Petit mot, grand progrès.
          </p>
        </div>
      )}

      {/* Deck grid */}
      <main className="px-3 pb-24 pt-2">
        {filtered.length === 0 && (
          <p className="text-center py-12" style={{ color: '#9a8f7f' }}>
            Inga lekar hittades.
          </p>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
          {filtered.map(group => {
            const color = getColor(group.name)
            const p = progress[group.name]
            const allCorrect = p && p.known >= p.total
            return (
              <button
                key={group.name}
                onClick={() => handleDeckClick(group)}
                className="rounded-2xl p-3.5 text-left transition-all active:scale-95"
                style={{
                  background: color + '12',
                  border: `1.5px solid ${allCorrect ? 'var(--sage)' : color + '30'}`,
                }}
              >
                <div
                  className="text-xs font-medium mb-2 px-2 py-0.5 rounded-full inline-block"
                  style={{ background: color + '20', color }}
                >
                  {group.totalCards} kort
                </div>
                <p className="font-display text-sm leading-snug" style={{ color: 'var(--ink)' }}>
                  {group.name}
                </p>
                {/* Progress indicator */}
                <div className="mt-2.5">
                  <div className="h-0.5 rounded-full overflow-hidden" style={{ background: color + '25' }}>
                    <div
                      className="h-full rounded-full progress-fill"
                      style={{
                        width: p ? `${Math.round((p.known / p.total) * 100)}%` : '0%',
                        background: allCorrect ? 'var(--sage)' : color,
                      }}
                    />
                  </div>
                  {p && (
                    <p className="text-xs mt-1" style={{ color: allCorrect ? 'var(--sage)' : '#9a8f7f' }}>
                      {allCorrect ? '✓ Alla rätt' : `${p.known} / ${p.total}`}
                    </p>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </main>

      {/* Mode picker modal */}
      {activeGroup && (
        <div
          className="fixed inset-0 z-30 flex items-end sm:items-center justify-center p-4"
          style={{ background: 'rgba(26,22,18,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setActiveGroup(null) }}
        >
          <div
            className="w-full max-w-sm rounded-3xl p-6 animate-pop-in"
            style={{ background: 'var(--paper)' }}
          >
            <h2 className="font-display text-xl mb-1" style={{ color: 'var(--ink)' }}>
              {activeGroup.name}
            </h2>
            <p className="text-sm mb-5" style={{ color: '#9a8f7f' }}>
              {activeGroup.totalCards} kort · välj riktning
            </p>

            <div className="flex flex-col gap-2 mb-5">
              {[
                { val: 'fr→sv', label: 'Franska → Svenska', desc: 'Visa franska, gissa svenska' },
                { val: 'sv→fr', label: 'Svenska → Franska', desc: 'Visa svenska, gissa franska' },
                { val: 'mixed', label: 'Blandat', desc: 'Slumpmässig riktning' },
              ].map(opt => (
                <button
                  key={opt.val}
                  onClick={() => setMode(opt.val)}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all"
                  style={{
                    background: mode === opt.val ? 'var(--ink)' : 'var(--mist)',
                    color: mode === opt.val ? 'var(--cream)' : 'var(--ink)',
                  }}
                >
                  <span className="text-lg">{mode === opt.val ? '●' : '○'}</span>
                  <div>
                    <p className="font-medium text-sm">{opt.label}</p>
                    <p className="text-xs opacity-60">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setActiveGroup(null)}
                className="flex-1 rounded-xl py-3 text-sm font-medium"
                style={{ background: 'var(--mist)', color: 'var(--ink)' }}
              >
                Avbryt
              </button>
              <button
                onClick={handleStart}
                className="flex-1 rounded-xl py-3 text-sm font-medium"
                style={{ background: 'var(--rouge)', color: '#fff' }}
              >
                Börja studera →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
