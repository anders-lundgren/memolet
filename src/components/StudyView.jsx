import { useState, useEffect, useCallback, useRef } from 'react'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function StudyView({ cards, deckName, mode, onExit, onComplete }) {
  const [deck, setDeck] = useState(() => shuffle(cards))
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [swipeAnim, setSwipeAnim] = useState(null) // 'right' | 'left'
  const [known, setKnown] = useState([])   // indices of known cards
  const [unknown, setUnknown] = useState([]) // indices of unsure cards
  const [done, setDone] = useState(false)
  const [showHint, setShowHint] = useState(true)
  const [draining, setDraining] = useState(false)
  const touchStart = useRef(null)

  // Auto-return to deck view after results; cancelled if the user starts a retry
  useEffect(() => {
    if (!done) { setDraining(false); return }
    const raf = requestAnimationFrame(() => setDraining(true))
    const timer = setTimeout(onExit, 4000)
    return () => { cancelAnimationFrame(raf); clearTimeout(timer) }
  }, [done, onExit])

  const card = deck[index]
  const progress = index / deck.length

  // Determine which side to show
  const showFront = mode === 'fr→sv' ? card?.fr :
                    mode === 'sv→fr' ? card?.sv :
                    index % 2 === 0 ? card?.fr : card?.sv
  const showBack  = mode === 'fr→sv' ? card?.sv :
                    mode === 'sv→fr' ? card?.fr :
                    index % 2 === 0 ? card?.sv : card?.fr

  const frontLang = mode === 'fr→sv' ? 'FR' : mode === 'sv→fr' ? 'SV' : index % 2 === 0 ? 'FR' : 'SV'
  const backLang  = frontLang === 'FR' ? 'SV' : 'FR'

  useEffect(() => {
    // Hide tap hint after first flip
    if (flipped) setShowHint(false)
  }, [flipped])

  function handleFlip() {
    setFlipped(f => !f)
  }

  function advance(wasKnown) {
    if (swipeAnim) return
    setSwipeAnim(wasKnown ? 'right' : 'left')
    if (wasKnown) setKnown(k => [...k, index])
    else setUnknown(u => [...u, index])

    // Compute final known count now (before state update re-renders)
    const finalKnown = known.length + (wasKnown ? 1 : 0)

    setTimeout(() => {
      setSwipeAnim(null)
      setFlipped(false)
      if (index + 1 >= deck.length) {
        setDone(true)
        onComplete?.(finalKnown)
      } else {
        setIndex(i => i + 1)
      }
    }, 380)
  }

  function restart(onlyUnknown = false) {
    if (onlyUnknown && unknown.length > 0) {
      const retry = unknown.map(i => deck[i])
      setDeck(shuffle(retry))
    } else {
      setDeck(shuffle(cards))
    }
    setIndex(0)
    setFlipped(false)
    setKnown([])
    setUnknown([])
    setDone(false)
    setShowHint(true)
  }

  // Touch/swipe support
  function onTouchStart(e) {
    touchStart.current = e.touches[0].clientX
  }
  function onTouchEnd(e) {
    if (touchStart.current === null) return
    const dx = e.changedTouches[0].clientX - touchStart.current
    touchStart.current = null
    if (Math.abs(dx) < 50) {
      if (!flipped) handleFlip()
      return
    }
    if (!flipped) { handleFlip(); return }
    if (dx > 50) advance(true)
    else if (dx < -50) advance(false)
  }

  // Keyboard support
  useEffect(() => {
    function onKey(e) {
      if (done) return
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); handleFlip() }
      if (e.key === 'ArrowRight') advance(true)
      if (e.key === 'ArrowLeft') advance(false)
      if (e.key === 'Escape') onExit()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [flipped, done, index])

  if (done) {
    const pct = Math.round((known.length / deck.length) * 100)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 animate-pop-in"
        style={{ background: 'var(--cream)' }}>
        <div className="w-full max-w-sm text-center">
          <div className="text-5xl mb-4">
            {pct >= 80 ? '🎉' : pct >= 50 ? '💪' : '📚'}
          </div>
          <h2 className="font-display text-3xl mb-2" style={{ color: 'var(--ink)' }}>
            {pct >= 80 ? 'Bravo!' : pct >= 50 ? 'Bra jobbat!' : 'Fortsätt öva!'}
          </h2>
          <p className="mb-6" style={{ color: '#7a7060' }}>
            {known.length} av {deck.length} kort kände du igen ({pct}%)
          </p>

          <div className="rounded-2xl p-4 mb-6 text-left" style={{ background: 'var(--paper)' }}>
            <div className="flex justify-between text-sm mb-2">
              <span style={{ color: 'var(--sage)' }}>✓ Kunde  {known.length}</span>
              <span style={{ color: 'var(--rouge)' }}>✗ Oklart  {unknown.length}</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--mist)' }}>
              <div
                className="h-full rounded-full progress-fill"
                style={{ width: `${pct}%`, background: 'var(--sage)' }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            {unknown.length > 0 && (
              <button
                onClick={() => restart(true)}
                className="w-full rounded-xl py-3.5 font-medium"
                style={{ background: 'var(--rouge)', color: '#fff' }}
              >
                Öva oklara kort ({unknown.length})
              </button>
            )}
            <button
              onClick={() => restart(false)}
              className="w-full rounded-xl py-3.5 font-medium"
              style={{ background: 'var(--ink)', color: 'var(--cream)' }}
            >
              Kör om alla kort
            </button>
            <button
              onClick={onExit}
              className="w-full rounded-xl py-3.5 font-medium"
              style={{ background: 'var(--mist)', color: 'var(--ink)' }}
            >
              ← Tillbaka till lekar
            </button>
          </div>

          {/* Auto-return countdown bar */}
          <div className="mt-5">
            <div className="h-0.5 rounded-full overflow-hidden" style={{ background: 'var(--mist)' }}>
              <div style={{
                height: '100%', background: 'var(--sage)', transformOrigin: 'left',
                transform: draining ? 'scaleX(0)' : 'scaleX(1)',
                transition: draining ? 'transform 4s linear' : 'none',
              }} />
            </div>
            <p className="text-xs mt-1.5 text-center" style={{ color: '#9a8f7f' }}>
              Återvänder automatiskt…
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--cream)' }}>
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3"
        style={{ borderBottom: '1px solid var(--mist)' }}>
        <button
          onClick={onExit}
          className="text-sm px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70"
          style={{ background: 'var(--mist)', color: 'var(--ink)' }}
        >
          ←
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-display text-sm leading-tight truncate" style={{ color: 'var(--ink)' }}>
            {deckName}
          </p>
          <p className="text-xs" style={{ color: '#9a8f7f' }}>
            {index + 1} / {deck.length}
          </p>
        </div>
        <div className="flex gap-3 text-xs">
          <span style={{ color: 'var(--sage)' }}>✓ {known.length}</span>
          <span style={{ color: 'var(--rouge)' }}>✗ {unknown.length}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1" style={{ background: 'var(--mist)' }}>
        <div
          className="h-full progress-fill"
          style={{ width: `${progress * 100}%`, background: 'var(--gold)' }}
        />
      </div>

      {/* Card area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 gap-6">
        {/* Flashcard */}
        <div
          className="card-scene w-full"
          style={{ maxWidth: 420, height: 260 }}
          onClick={handleFlip}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div className={`card-inner${flipped ? ' flipped' : ''}${swipeAnim === 'right' ? ' animate-swipe-right' : swipeAnim === 'left' ? ' animate-swipe-left' : ''}`}>
            {/* Front */}
            <div className="card-face card-front flex flex-col items-center justify-center rounded-3xl px-8 py-8 cursor-pointer select-none"
              style={{ background: 'var(--paper)', border: '1.5px solid var(--mist)', boxShadow: '0 8px 32px rgba(26,22,18,0.08)' }}>
              <span className="text-xs font-medium tracking-widest mb-4 px-2 py-0.5 rounded-full"
                style={{ background: 'var(--mist)', color: '#9a8f7f' }}>
                {frontLang}
              </span>
              <p className="font-display text-3xl text-center leading-snug" style={{ color: 'var(--ink)' }}>
                {showFront}
              </p>
              {showHint && (
                <p className="text-xs mt-6 pulse" style={{ color: '#b0a090' }}>
                  Tryck för att vända
                </p>
              )}
            </div>

            {/* Back */}
            <div className="card-face card-back flex flex-col items-center justify-center rounded-3xl px-8 py-8 cursor-pointer select-none"
              style={{ background: 'var(--ink)', boxShadow: '0 8px 32px rgba(26,22,18,0.18)' }}>
              <span className="text-xs font-medium tracking-widest mb-4 px-2 py-0.5 rounded-full"
                style={{ background: '#2e2820', color: '#c9a84c' }}>
                {backLang}
              </span>
              <p className="font-display text-3xl text-center leading-snug" style={{ color: 'var(--cream)' }}>
                {showBack}
              </p>
            </div>
          </div>
        </div>

        {/* Action buttons (only after flip) */}
        {flipped ? (
          <div className="flex gap-3 w-full animate-fade-up" style={{ maxWidth: 420 }}>
            <button
              onClick={() => advance(false)}
              className="flex-1 rounded-2xl py-4 flex flex-col items-center gap-1 transition-all active:scale-95"
              style={{ background: '#fff0ef', border: '1.5px solid var(--rouge)' }}
            >
              <span className="text-2xl">✗</span>
              <span className="text-xs font-medium" style={{ color: 'var(--rouge)' }}>Kunde inte</span>
            </button>
            <button
              onClick={() => advance(true)}
              className="flex-1 rounded-2xl py-4 flex flex-col items-center gap-1 transition-all active:scale-95"
              style={{ background: '#f0fff4', border: `1.5px solid var(--sage)` }}
            >
              <span className="text-2xl">✓</span>
              <span className="text-xs font-medium" style={{ color: 'var(--sage)' }}>Kunde!</span>
            </button>
          </div>
        ) : (
          <div className="flex gap-3 w-full opacity-30 pointer-events-none" style={{ maxWidth: 420 }}>
            <div className="flex-1 rounded-2xl py-4 flex items-center justify-center"
              style={{ background: 'var(--mist)' }}>
              <span className="text-xs">✗ Kunde inte</span>
            </div>
            <div className="flex-1 rounded-2xl py-4 flex items-center justify-center"
              style={{ background: 'var(--mist)' }}>
              <span className="text-xs">✓ Kunde!</span>
            </div>
          </div>
        )}

        {/* Keyboard hint */}
        <p className="text-xs hidden sm:block" style={{ color: '#c0b09f' }}>
          Mellanslag = vänd · → Kunde · ← Kunde inte
        </p>
      </div>
    </div>
  )
}
