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

export default function App() {
  const [studyGroup, setStudyGroup] = useState(null)
  const [studyMode, setStudyMode] = useState('fr→sv') // 'fr→sv' | 'sv→fr' | 'mixed'

  const startStudy = useCallback((group, mode) => {
    setStudyGroup(group)
    setStudyMode(mode)
  }, [])

  const exitStudy = useCallback(() => setStudyGroup(null), [])

  if (studyGroup) {
    // Flatten all cards from all decks in this group
    const allCards = studyGroup.decks.flatMap(d => d.cards)
    return (
      <StudyView
        cards={allCards}
        deckName={studyGroup.name}
        mode={studyMode}
        onExit={exitStudy}
      />
    )
  }

  return <DeckBrowser groups={deckGroups} onStart={startStudy} />
}
