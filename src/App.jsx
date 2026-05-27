import { useState, useCallback } from 'react'
import rawDecks from './data/cards.json'
import DeckBrowser from './components/DeckBrowser.jsx'
import StudyView from './components/StudyView.jsx'

// Group sheets by prefix (e.g. "Vanliga adverb 1", "Vanliga adverb 2" → one group)
function groupDecks(decks) {
  const groups = {}
  decks.forEach(deck => {
    // strip trailing number
    const base = deck.name.replace(/\s+\d+$/, '').trim()
    if (!groups[base]) groups[base] = { name: base, decks: [], totalCards: 0 }
    groups[base].decks.push(deck)
    groups[base].totalCards += deck.cards.length
  })
  return Object.values(groups)
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
