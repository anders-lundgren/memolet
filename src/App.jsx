import { useState, useCallback } from 'react'
import rawDecks from './data/cards.json'
import DeckBrowser from './components/DeckBrowser.jsx'
import StudyView from './components/StudyView.jsx'

// Maximum cards per displayed group (≈ one 5-minute session)
const MAX_GROUP_CARDS = 20

// Group source decks by their base name, then chunk so no group exceeds MAX_GROUP_CARDS.
// With source decks already batched at ~20 cards each, every source deck becomes its own
// displayed group. Single-deck categories keep their original name; multi-deck categories
// are numbered 1, 2, 3… matching the source batch numbers.
function groupDecks(decks) {
  // Collect source decks by base name, preserving JSON order
  const byBase = {}
  decks.forEach(deck => {
    const base = deck.name.replace(/\s+\d+$/, '').trim()
    if (!byBase[base]) byBase[base] = []
    byBase[base].push(deck)
  })

  const groups = []
  for (const [base, sourceDecks] of Object.entries(byBase)) {
    // Build chunks: start a new chunk whenever adding the next deck would exceed the cap
    const chunks = []
    let current = [], currentTotal = 0
    for (const deck of sourceDecks) {
      if (current.length > 0 && currentTotal + deck.cards.length > MAX_GROUP_CARDS) {
        chunks.push(current)
        current = []
        currentTotal = 0
      }
      current.push(deck)
      currentTotal += deck.cards.length
    }
    if (current.length > 0) chunks.push(current)

    // Name each chunk: no suffix when there's only one, numbered otherwise
    chunks.forEach((chunk, i) => {
      groups.push({
        name: chunks.length === 1 ? base : `${base} ${i + 1}`,
        decks: chunk,
        totalCards: chunk.reduce((s, d) => s + d.cards.length, 0),
      })
    })
  }

  return groups
}

const deckGroups = groupDecks(rawDecks)

const STORAGE_KEY = 'memolet_progress'

function loadProgress() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {} }
  catch { return {} }
}

export default function App() {
  const [studyGroup, setStudyGroup] = useState(null)
  const [studyMode, setStudyMode] = useState('fr→sv') // 'fr→sv' | 'sv→fr' | 'mixed'
  const [progress, setProgress] = useState(loadProgress)

  const startStudy = useCallback((group, mode) => {
    setStudyGroup(group)
    setStudyMode(mode)
  }, [])

  const exitStudy = useCallback(() => setStudyGroup(null), [])

  if (studyGroup) {
    // Flatten all cards from all decks in this group
    const allCards = studyGroup.decks.flatMap(d => d.cards)
    const groupName = studyGroup.name
    const groupTotal = studyGroup.totalCards

    function handleComplete(knownCount) {
      setProgress(prev => {
        // Keep the best (highest) known count ever achieved for this group
        const best = Math.max(prev[groupName]?.known ?? 0, knownCount)
        const next = { ...prev, [groupName]: { known: best, total: groupTotal } }
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
        return next
      })
    }

    return (
      <StudyView
        cards={allCards}
        deckName={groupName}
        mode={studyMode}
        onExit={exitStudy}
        onComplete={handleComplete}
      />
    )
  }

  return <DeckBrowser groups={deckGroups} onStart={startStudy} progress={progress} />
}
