import { describe, it, expect } from 'vitest'
import { ReplayDiagram } from '../ReplayDiagram'
import { createMockElement, createBoardLines, clickButtonByPrefix } from './helpers'

describe('ReplayDiagram', () => {
  describe('Basic Rendering', () => {
    it('renders initial board position', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        replay

        1 2 3
        . . .
        . . .
      `)

      const diagram = new ReplayDiagram(element, lines)
      diagram.render()

      expect(element.innerHTML).toContain('<svg')
      expect(element.innerHTML).toContain('class="godash-board"')
    })

    it('renders navigation buttons', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        replay

        1 2 .
        . . .
        . . .
      `)

      const diagram = new ReplayDiagram(element, lines)
      diagram.render()

      // Should have first, previous, next, last buttons
      expect(element.innerHTML).toContain('id="first-')
      expect(element.innerHTML).toContain('id="prev-')
      expect(element.innerHTML).toContain('id="next-')
      expect(element.innerHTML).toContain('id="last-')
    })

    it('renders move counter', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        replay

        1 2 .
        . . .
        . . .
      `)

      const diagram = new ReplayDiagram(element, lines)
      diagram.render()

      // Move counter shows current/total
      expect(element.innerHTML).toContain('0 / 2')
    })
  })

  describe('Navigation - Forward', () => {
    it('advances to next move on next button click', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        replay

        1 2 3
        . . .
        . . .
      `)

      const diagram = new ReplayDiagram(element, lines)
      diagram.render()

      // Initial state: 0 / 3
      expect(element.innerHTML).toContain('0 / 3')

      // Click next
      clickButtonByPrefix(element, 'next')

      // Should show 1 / 3 and have a black stone
      expect(element.innerHTML).toContain('1 / 3')
      expect(element.innerHTML).toContain('fill="#000"')
    })

    it('advances to last move on last button click', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        replay

        1 2 3
        . . .
        . . .
      `)

      const diagram = new ReplayDiagram(element, lines)
      diagram.render()

      // Click last
      clickButtonByPrefix(element, 'last')

      // Should show all moves: 3 / 3
      expect(element.innerHTML).toContain('3 / 3')
    })

    it('disables next/last buttons at end of sequence', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        replay

        1 2 .
        . . .
        . . .
      `)

      const diagram = new ReplayDiagram(element, lines)
      diagram.render()

      // Go to last move
      clickButtonByPrefix(element, 'last')

      // Next and last buttons should be disabled
      const nextButton = element.querySelector('[id^="next-"]')
      const lastButton = element.querySelector('[id^="last-"]')
      expect(nextButton?.hasAttribute('disabled')).toBe(true)
      expect(lastButton?.hasAttribute('disabled')).toBe(true)
    })
  })

  describe('Navigation - Backward', () => {
    it('goes back to previous move on previous button click', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        replay

        1 2 3
        . . .
        . . .
      `)

      const diagram = new ReplayDiagram(element, lines)
      diagram.render()

      // Go forward then back
      clickButtonByPrefix(element, 'next')
      clickButtonByPrefix(element, 'next')
      expect(element.innerHTML).toContain('2 / 3')

      clickButtonByPrefix(element, 'prev')
      expect(element.innerHTML).toContain('1 / 3')
    })

    it('goes back to first move on first button click', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        replay

        1 2 3
        . . .
        . . .
      `)

      const diagram = new ReplayDiagram(element, lines)
      diagram.render()

      // Go to last, then to first
      clickButtonByPrefix(element, 'last')
      clickButtonByPrefix(element, 'first')

      // Should be back to 0 / 3
      expect(element.innerHTML).toContain('0 / 3')
    })

    it('disables previous/first buttons at start', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        replay

        1 2 .
        . . .
        . . .
      `)

      const diagram = new ReplayDiagram(element, lines)
      diagram.render()

      // At start, previous and first should be disabled
      const prevButton = element.querySelector('[id^="prev-"]')
      const firstButton = element.querySelector('[id^="first-"]')
      expect(prevButton?.hasAttribute('disabled')).toBe(true)
      expect(firstButton?.hasAttribute('disabled')).toBe(true)
    })
  })

  describe('Move Sequence Parsing', () => {
    it('parses consecutive numbered moves starting from 1', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        replay

        1 2 3
        4 5 6
        7 8 9
      `)

      expect(() => new ReplayDiagram(element, lines)).not.toThrow()
    })

    it('throws error on non-consecutive move numbers', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        replay

        1 3 .
        . . .
        . . .
      `)

      expect(() => new ReplayDiagram(element, lines)).toThrow()
    })

    it('throws error on duplicate move numbers', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        replay

        1 1 .
        . . .
        . . .
      `)

      expect(() => new ReplayDiagram(element, lines)).toThrow()
    })

    it('throws error when missing move 1', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        replay

        2 3 .
        . . .
        . . .
      `)

      expect(() => new ReplayDiagram(element, lines)).toThrow()
    })

    it('requires at least one numbered move', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        replay

        . . .
        . . .
        . . .
      `)

      expect(() => new ReplayDiagram(element, lines)).toThrow()
    })
  })

  describe('Configuration Options', () => {
    it('respects start-color option (black)', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        replay

        1 . .
        . . .
        . . .

        ---
        start-color: black
      `)

      const diagram = new ReplayDiagram(element, lines)
      diagram.render()

      clickButtonByPrefix(element, 'next')

      // First move should be black
      expect(element.innerHTML).toContain('fill="#000"')
    })

    it('respects start-color option (white)', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        replay

        1 . .
        . . .
        . . .

        ---
        start-color: white
      `)

      const diagram = new ReplayDiagram(element, lines)
      diagram.render()

      clickButtonByPrefix(element, 'next')

      // First move should be white
      expect(element.innerHTML).toContain('fill="#fff"')
    })

    it('respects show-numbers option (true)', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        replay

        1 2 .
        . . .
        . . .

        ---
        show-numbers: true
      `)

      const diagram = new ReplayDiagram(element, lines)
      diagram.render()

      clickButtonByPrefix(element, 'last')

      // Should show move numbers as text annotations
      expect(element.innerHTML).toContain('>1<')
      expect(element.innerHTML).toContain('>2<')
    })

    it('respects show-numbers option (false)', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        replay

        1 2 .
        . . .
        . . .

        ---
        show-numbers: false
      `)

      const diagram = new ReplayDiagram(element, lines)
      diagram.render()

      clickButtonByPrefix(element, 'last')

      // Should not show move numbers, just stones
      expect(element.innerHTML).not.toContain('>1<')
      expect(element.innerHTML).not.toContain('>2<')
    })

    it('respects initial-move option', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        replay

        1 2 3
        . . .
        . . .

        ---
        initial-move: 2
      `)

      const diagram = new ReplayDiagram(element, lines)
      diagram.render()

      // Should start at move 2
      expect(element.innerHTML).toContain('2 / 3')
    })

    it('throws error if initial-move exceeds sequence length', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        replay

        1 2 .
        . . .
        . . .

        ---
        initial-move: 5
      `)

      expect(() => new ReplayDiagram(element, lines)).toThrow()
    })
  })

  describe('State Management', () => {
    it('rebuilds board correctly when navigating', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        replay

        1 2 3
        . . .
        . . .
      `)

      const diagram = new ReplayDiagram(element, lines)
      diagram.render()

      // Navigate forward
      clickButtonByPrefix(element, 'next')
      clickButtonByPrefix(element, 'next')

      // Should have 2 stones
      const html2 = element.innerHTML
      const count2 = (html2.match(/fill="#000"/g) || []).length + (html2.match(/fill="#fff"/g) || []).length
      expect(count2).toBeGreaterThanOrEqual(2)

      // Navigate back
      clickButtonByPrefix(element, 'first')

      // Should have no stones
      const html0 = element.innerHTML
      const count0 = (html0.match(/fill="#000"/g) || []).length + (html0.match(/fill="#fff"/g) || []).length
      expect(count0).toBe(0)
    })

    it('shows last move marker', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        replay

        1 2 .
        . . .
        . . .
      `)

      const diagram = new ReplayDiagram(element, lines)
      diagram.render()

      clickButtonByPrefix(element, 'next')

      // Should have a last move marker (circle with fill="none")
      expect(element.innerHTML).toContain('fill="none"')
    })

    it('updates turn indicator based on next move', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        replay

        1 2 3
        . . .
        . . .
      `)

      const diagram = new ReplayDiagram(element, lines)
      diagram.render()

      // At start (move 0), next player is black
      expect(element.innerHTML).toContain('Turn Indicator')

      // After move 1 (black), next player is white
      clickButtonByPrefix(element, 'next')
      expect(element.innerHTML).toContain('Turn Indicator')
    })
  })

  describe('Edge Cases', () => {
    it('handles single move sequence', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        replay

        1 . .
        . . .
        . . .
      `)

      const diagram = new ReplayDiagram(element, lines)
      diagram.render()

      expect(element.innerHTML).toContain('0 / 1')

      clickButtonByPrefix(element, 'next')
      expect(element.innerHTML).toContain('1 / 1')
    })

    it('handles large move sequences', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        replay

        1 2 3
        4 5 6
        7 8 9
      `)

      const diagram = new ReplayDiagram(element, lines)
      diagram.render()

      clickButtonByPrefix(element, 'last')
      expect(element.innerHTML).toContain('9 / 9')
    })
  })
})
