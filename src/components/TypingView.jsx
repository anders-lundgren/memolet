import { useState, useEffect, useRef } from 'react'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function parseAnswers(fr) {
  return fr.split(/[,;]/).map(s => s.replace(/\s*\([^)]*\)/g, '').trim()).filter(Boolean)
}

function isMatch(fr, typed) {
  return parseAnswers(fr).some(a => a.toLowerCase() === typed.trim().toLowerCase())
}

// Returns a hint string when the French answer has multiple words, null otherwise
function getHint(fr) {
  const multi = parseAnswers(fr).find(a => a.split(/\s+/).length > 1)
  if (!multi) return null
  const first = multi.split(/\s+/)[0].toLowerCase()
  if (['le', 'la', 'les'].includes(first) || /^l['']/.test(first)) return 'Inkludera bestämd artikel'
  if (['un', 'une', 'des'].includes(first)) return 'Inkludera obestämd artikel'
  if (['du', 'de'].includes(first)) return 'Inkludera partikel'
  if (['je', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles'].includes(first)) return 'Inkludera pronomen'
  return `Svaret har ${multi.split(/\s+/).length} ord`
}

const DIACRITICS = ['é', 'è', 'ê', 'ë', 'à', 'â', 'ç', 'î', 'ï', 'ô', 'ù', 'û', 'œ']
const RERUN_TARGET = 3

export default function TypingView({ cards, deckName, onExit, onComplete }) {
  // Main phase
  const [mainDeck, setMainDeck] = useState(() => shuffle(cards))
  const [mainIndex, setMainIndex] = useState(0)
  const [mainCorrect, setMainCorrect] = useState(0)
  const [failedCards, setFailedCards] = useState([]) // card objects that failed first try

  // Rerun phase — successCounts uses card object identity as key
  const [rerunBatch, setRerunBatch] = useState([])
  const [rerunBatchIdx, setRerunBatchIdx] = useState(0)
  const [successCounts, setSuccessCounts] = useState(new Map())

  // Shared UI
  const [phase, setPhase] = useState('main') // 'main' | 'rerun' | 'done'
  const [input, setInput] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [draining, setDraining] = useState(false)
  const inputRef = useRef(null)

  // Auto-return to deck view after results; cancelled if the user restarts
  useEffect(() => {
    if (phase !== 'done') { setDraining(false); return }
    const raf = requestAnimationFrame(() => setDraining(true))
    const timer = setTimeout(onExit, 4000)
    return () => { cancelAnimationFrame(raf); clearTimeout(timer) }
  }, [phase, onExit])

  const isRerun = phase === 'rerun'
  const card = isRerun ? rerunBatch[rerunBatchIdx] : mainDeck[mainIndex]
  const hint = card ? getHint(card.fr) : null
  const progressFrac = isRerun
    ? rerunBatchIdx / rerunBatch.length
    : mainIndex / mainDeck.length

  // Computed after handleSubmit re-renders (input and successCounts are current)
  const isCorrect = submitted && card ? isMatch(card.fr, input) : null
  const cardSuccesses = isRerun && card ? (successCounts.get(card) ?? 0) : 0
  const rerunCleared = failedCards.filter(c => (successCounts.get(c) ?? 0) >= RERUN_TARGET).length

  useEffect(() => {
    if (!submitted) inputRef.current?.focus()
  }, [mainIndex, rerunBatchIdx, submitted])

  useEffect(() => {
    function onKey(e) {
      if (phase === 'done') return
      if (e.key === 'Enter') {
        e.preventDefault()
        if (!submitted) handleSubmit()
        else handleAdvance()
      }
      if (e.key === 'Escape') onExit()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [input, submitted, phase, mainIndex, rerunBatchIdx])

  function handleSubmit() {
    if (!input.trim() || submitted) return
    const ok = isMatch(card.fr, input)
    setSubmitted(true)
    if (!isRerun) {
      if (ok) setMainCorrect(n => n + 1)
      else setFailedCards(f => [...f, card])
    } else if (ok) {
      setSuccessCounts(m => {
        const next = new Map(m)
        next.set(card, (m.get(card) ?? 0) + 1)
        return next
      })
    }
  }

  function handleDontKnow() {
    if (submitted) return
    setSubmitted(true)
    if (!isRerun) setFailedCards(f => [...f, card])
    // rerun: successCounts unchanged — same as a wrong answer
  }

  function handleAdvance() {
    setInput('')
    setSubmitted(false)

    if (!isRerun) {
      if (mainIndex + 1 >= mainDeck.length) {
        // failedCards is current state — updated by handleSubmit before this render
        if (failedCards.length === 0) {
          setPhase('done')
          onComplete?.(mainCorrect)
        } else {
          setSuccessCounts(new Map(failedCards.map(c => [c, 0])))
          setRerunBatch(shuffle([...failedCards]))
          setRerunBatchIdx(0)
          setPhase('rerun')
        }
      } else {
        setMainIndex(i => i + 1)
      }
    } else {
      if (rerunBatchIdx + 1 >= rerunBatch.length) {
        // successCounts is current state — updated by handleSubmit before this render
        const needMore = failedCards.filter(c => (successCounts.get(c) ?? 0) < RERUN_TARGET)
        if (needMore.length === 0) {
          setPhase('done')
          onComplete?.(mainCorrect)
        } else {
          setRerunBatch(shuffle(needMore))
          setRerunBatchIdx(0)
        }
      } else {
        setRerunBatchIdx(i => i + 1)
      }
    }
  }

  function appendChar(ch) {
    setInput(prev => prev + ch)
    inputRef.current?.focus()
  }

  function restart() {
    setMainDeck(shuffle(cards))
    setMainIndex(0)
    setMainCorrect(0)
    setFailedCards([])
    setRerunBatch([])
    setRerunBatchIdx(0)
    setSuccessCounts(new Map())
    setPhase('main')
    setInput('')
    setSubmitted(false)
  }

  // Done screen
  if (phase === 'done') {
    const pct = Math.round((mainCorrect / mainDeck.length) * 100)
    const hadReruns = failedCards.length > 0
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
          <p className="mb-1" style={{ color: '#7a7060' }}>
            {mainCorrect} av {mainDeck.length} rätt på första försöket ({pct}%)
          </p>
          {hadReruns && (
            <p className="text-sm mb-5" style={{ color: 'var(--sage)' }}>
              Alla {failedCards.length} omövningsord klarades!
            </p>
          )}
          {!hadReruns && <div className="mb-5" />}

          <div className="rounded-2xl p-4 mb-6 text-left" style={{ background: 'var(--paper)' }}>
            <div className="flex justify-between text-sm mb-2">
              <span style={{ color: 'var(--sage)' }}>✓ Rätt  {mainCorrect}</span>
              <span style={{ color: 'var(--rouge)' }}>✗ Fel  {mainDeck.length - mainCorrect}</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--mist)' }}>
              <div className="h-full rounded-full progress-fill"
                style={{ width: `${pct}%`, background: 'var(--sage)' }} />
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            <button onClick={restart}
              className="w-full rounded-xl py-3.5 font-medium"
              style={{ background: 'var(--ink)', color: 'var(--cream)' }}>
              Kör om
            </button>
            <button onClick={onExit}
              className="w-full rounded-xl py-3.5 font-medium"
              style={{ background: 'var(--mist)', color: 'var(--ink)' }}>
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
        <button onClick={onExit}
          className="text-sm px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70"
          style={{ background: 'var(--mist)', color: 'var(--ink)' }}>
          ←
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-display text-sm leading-tight truncate" style={{ color: 'var(--ink)' }}>
            {isRerun ? 'Omövning — ' : ''}{deckName}
          </p>
          <p className="text-xs" style={{ color: '#9a8f7f' }}>
            {isRerun
              ? `${rerunCleared} av ${failedCards.length} klara`
              : `${mainIndex + 1} / ${mainDeck.length}`}
          </p>
        </div>
        <div className="flex gap-3 text-xs">
          {isRerun ? (
            <span style={{ color: 'var(--sage)' }}>
              {rerunCleared} / {failedCards.length} klara
            </span>
          ) : (
            <>
              <span style={{ color: 'var(--sage)' }}>✓ {mainCorrect}</span>
              <span style={{ color: 'var(--rouge)' }}>✗ {mainIndex - mainCorrect}</span>
            </>
          )}
        </div>
      </div>

      {/* Progress bar — gold in main, green in rerun */}
      <div className="h-1" style={{ background: 'var(--mist)' }}>
        <div className="h-full progress-fill"
          style={{
            width: `${progressFrac * 100}%`,
            background: isRerun ? 'var(--sage)' : 'var(--gold)',
          }} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 gap-5">

        {/* Prompt card */}
        <div className="w-full flex flex-col items-center justify-center rounded-3xl px-8 py-8"
          style={{
            maxWidth: 420,
            minHeight: 160,
            background: isRerun ? '#f0f7f0' : 'var(--paper)',
            border: `1.5px solid ${isRerun ? '#b8d4b8' : 'var(--mist)'}`,
            boxShadow: '0 8px 32px rgba(26,22,18,0.08)',
          }}>
          <span className="text-xs font-medium tracking-widest mb-4 px-2 py-0.5 rounded-full"
            style={{ background: 'var(--mist)', color: '#9a8f7f' }}>
            SV
          </span>
          <p className="font-display text-3xl text-center leading-snug" style={{ color: 'var(--ink)' }}>
            {card?.sv}
          </p>
          {isRerun && (
            <p className="text-xs mt-4" style={{ color: 'var(--sage)' }}>
              {cardSuccesses} / {RERUN_TARGET} gånger rätt
            </p>
          )}
        </div>

        {/* Multi-word hint */}
        {hint && !submitted && (
          <p className="text-xs" style={{ color: '#9a8f7f' }}>
            ⓘ {hint}
          </p>
        )}

        {/* Input area */}
        <div className="w-full flex flex-col gap-3" style={{ maxWidth: 420 }}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => { if (!submitted) setInput(e.target.value) }}
            placeholder="Skriv på franska…"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            className="w-full rounded-2xl px-5 py-4 text-xl font-display outline-none transition-all"
            style={{
              background: submitted ? (isCorrect ? '#f0fff4' : '#fff0ef') : 'var(--paper)',
              border: `1.5px solid ${submitted ? (isCorrect ? 'var(--sage)' : 'var(--rouge)') : 'var(--mist)'}`,
              color: 'var(--ink)',
            }}
          />

          {/* French diacritic helpers */}
          {!submitted && (
            <div className="flex gap-1.5 justify-center flex-wrap">
              {DIACRITICS.map(ch => (
                <button key={ch} onClick={() => appendChar(ch)}
                  className="rounded-lg px-3 py-1.5 text-sm font-medium transition-all active:scale-95"
                  style={{ background: 'var(--mist)', color: 'var(--ink)' }}>
                  {ch}
                </button>
              ))}
            </div>
          )}

          {/* Result feedback */}
          {submitted && (
            <div className="rounded-2xl px-5 py-4 animate-fade-up"
              style={{ background: isCorrect ? '#f0fff4' : '#fff0ef' }}>
              {isCorrect ? (
                <p className="text-sm font-medium" style={{ color: 'var(--sage)' }}>
                  ✓ Rätt!
                  {isRerun && (
                    <span className="ml-2 font-normal opacity-70">
                      ({cardSuccesses} / {RERUN_TARGET} gånger)
                    </span>
                  )}
                </p>
              ) : (
                <>
                  <p className="text-sm font-medium mb-1" style={{ color: 'var(--rouge)' }}>✗ Fel!</p>
                  <p className="text-sm" style={{ color: 'var(--ink)' }}>
                    Rätt svar: <span className="font-display">{card?.fr}</span>
                  </p>
                </>
              )}
            </div>
          )}

          {/* Action buttons */}
          {!submitted ? (
            <div className="flex gap-2">
              <button onClick={handleSubmit}
                disabled={!input.trim()}
                className="flex-1 rounded-xl py-3.5 font-medium transition-all active:scale-95"
                style={{
                  background: input.trim() ? 'var(--ink)' : 'var(--mist)',
                  color: input.trim() ? 'var(--cream)' : '#9a8f7f',
                }}>
                Kontrollera
              </button>
              <button onClick={handleDontKnow}
                className="rounded-xl px-4 py-3.5 font-medium transition-all active:scale-95"
                style={{ background: 'var(--mist)', color: '#9a8f7f' }}>
                Vet inte
              </button>
            </div>
          ) : (
            <button onClick={handleAdvance}
              className="w-full rounded-xl py-3.5 font-medium transition-all active:scale-95 animate-fade-up"
              style={{ background: isCorrect ? 'var(--sage)' : 'var(--rouge)', color: '#fff' }}>
              Nästa →
            </button>
          )}
        </div>

        <p className="text-xs hidden sm:block" style={{ color: '#c0b09f' }}>
          Enter = kontrollera / nästa · Esc = avsluta
        </p>
      </div>
    </div>
  )
}
