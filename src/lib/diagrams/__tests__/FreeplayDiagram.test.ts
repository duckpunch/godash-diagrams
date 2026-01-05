import { describe, it, expect } from 'vitest'
import { FreeplayDiagram } from '../FreeplayDiagram'
import { createMockElement, createBoardLines } from './helpers'

describe('FreeplayDiagram', () => {
  describe('Basic Rendering', () => {
    it('renders an empty board', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        freeplay

        . . .
        . . .
        . . .
      `)

      const diagram = new FreeplayDiagram(element, lines)
      diagram.render()

      expect(element.innerHTML).toContain('<svg')
      expect(element.innerHTML).toContain('class="godash-board"')
    })

    it('renders with initial stones', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        freeplay

        X O .
        . X .
        O . .
      `)

      const diagram = new FreeplayDiagram(element, lines)
      diagram.render()

      expect(element.innerHTML).toContain('fill="#000"')
      expect(element.innerHTML).toContain('fill="#fff"')
    })

    it('renders control buttons', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        freeplay

        . . .
        . . .
        . . .
      `)

      const diagram = new FreeplayDiagram(element, lines)
      diagram.render()

      // Should have undo, redo, pass, reset buttons
      expect(element.innerHTML).toContain('id="undo-')
      expect(element.innerHTML).toContain('id="redo-')
      expect(element.innerHTML).toContain('id="pass-')
      expect(element.innerHTML).toContain('id="reset-')
    })

    it('renders turn indicator', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        freeplay

        . . .
        . . .
        . . .
      `)

      const diagram = new FreeplayDiagram(element, lines)
      diagram.render()

      // Should show turn indicator (black starts by default)
      expect(element.innerHTML).toContain('Black to play')
    })

    it('renders capture counts', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        freeplay

        . . .
        . . .
        . . .
      `)

      const diagram = new FreeplayDiagram(element, lines)
      diagram.render()

      // Initial capture counts should be 0
      expect(element.innerHTML).toMatch(/>0</)
    })
  })

  describe('Configuration Parsing', () => {
    it('defaults to alternate color mode', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        freeplay

        . . .
        . . .
        . . .
      `)

      const diagram = new FreeplayDiagram(element, lines)
      expect(() => diagram.render()).not.toThrow()
    })

    it('accepts color: black option', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        freeplay

        . . .
        . . .
        . . .

        ---
        color: black
      `)

      const diagram = new FreeplayDiagram(element, lines)
      diagram.render()

      expect(element.innerHTML).toContain('Black to play')
    })

    it('accepts color: white option', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        freeplay

        . . .
        . . .
        . . .

        ---
        color: white
      `)

      const diagram = new FreeplayDiagram(element, lines)
      diagram.render()

      expect(element.innerHTML).toContain('White to play')
    })

    it('accepts color: alternate option', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        freeplay

        . . .
        . . .
        . . .

        ---
        color: alternate
      `)

      const diagram = new FreeplayDiagram(element, lines)
      diagram.render()

      expect(element.innerHTML).toContain('Black to play')
    })

    it('throws error on invalid color option', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        freeplay

        . . .
        . . .
        . . .

        ---
        color: invalid
      `)

      expect(() => new FreeplayDiagram(element, lines)).toThrow()
    })

    it('accepts numbered: true option', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        freeplay

        . . .
        . . .
        . . .

        ---
        numbered: true
      `)

      expect(() => new FreeplayDiagram(element, lines)).not.toThrow()
    })

    it('accepts numbered: false option', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        freeplay

        . . .
        . . .
        . . .

        ---
        numbered: false
      `)

      expect(() => new FreeplayDiagram(element, lines)).not.toThrow()
    })

    it('accepts ignore-ko: true option', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        freeplay

        . . .
        . . .
        . . .

        ---
        ignore-ko: true
      `)

      expect(() => new FreeplayDiagram(element, lines)).not.toThrow()
    })

    it('accepts ignore-ko: false option', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        freeplay

        . . .
        . . .
        . . .

        ---
        ignore-ko: false
      `)

      expect(() => new FreeplayDiagram(element, lines)).not.toThrow()
    })

    it('accepts to-play: black option', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        freeplay

        . . .
        . . .
        . . .

        ---
        to-play: black
      `)

      const diagram = new FreeplayDiagram(element, lines)
      diagram.render()

      expect(element.innerHTML).toContain('Black to play')
    })

    it('accepts to-play: white option', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        freeplay

        . . .
        . . .
        . . .

        ---
        to-play: white
      `)

      const diagram = new FreeplayDiagram(element, lines)
      diagram.render()

      expect(element.innerHTML).toContain('White to play')
    })

    it('to-play overrides color mode default in alternate mode', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        freeplay

        . . .
        . . .
        . . .

        ---
        color: alternate
        to-play: white
      `)

      const diagram = new FreeplayDiagram(element, lines)
      diagram.render()

      // Should start with white even though alternate normally starts with black
      expect(element.innerHTML).toContain('White to play')
    })

    it('throws error on invalid to-play option', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        freeplay

        . . .
        . . .
        . . .

        ---
        to-play: invalid
      `)

      expect(() => new FreeplayDiagram(element, lines)).toThrow()
    })
  })

  describe('Initial State', () => {
    it('initializes with empty history', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        freeplay

        . . .
        . . .
        . . .
      `)

      const diagram = new FreeplayDiagram(element, lines)
      diagram.render()

      // Undo/redo should be disabled initially
      const undoButton = element.querySelector('[id^="undo-"]')
      const redoButton = element.querySelector('[id^="redo-"]')
      expect(undoButton?.hasAttribute('disabled')).toBe(true)
      expect(redoButton?.hasAttribute('disabled')).toBe(true)
    })

    it('initializes with zero captures', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        freeplay

        . . .
        . . .
        . . .
      `)

      const diagram = new FreeplayDiagram(element, lines)
      diagram.render()

      // Should show 0 captures for both colors
      const html = element.innerHTML
      expect(html).toMatch(/>0</)
    })
  })

  describe('Board Validation', () => {
    it('accepts valid board configuration', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        freeplay

        X O .
        O X .
        . . .
      `)

      expect(() => new FreeplayDiagram(element, lines)).not.toThrow()
    })

    it('accepts board with annotations', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        freeplay

        X a O
        . . .
        . . .
      `)

      const diagram = new FreeplayDiagram(element, lines)
      diagram.render()

      expect(element.innerHTML).toContain('>a<')
    })

    it('handles different board sizes', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        freeplay

        . . . . .
        . . . . .
        . . . . .
        . . . . .
        . . . . .
      `)

      expect(() => new FreeplayDiagram(element, lines)).not.toThrow()
    })
  })

  describe('Edge Cases', () => {
    it('handles board with no configuration', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        freeplay

        . . .
        . . .
        . . .
      `)

      expect(() => new FreeplayDiagram(element, lines)).not.toThrow()
    })

    it('handles empty board', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        freeplay

        . . .
        . . .
        . . .
      `)

      const diagram = new FreeplayDiagram(element, lines)
      diagram.render()

      expect(element.innerHTML).toContain('<svg')
    })

    it('handles board with complex initial position', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        freeplay

        X X O
        X O O
        O O X
      `)

      const diagram = new FreeplayDiagram(element, lines)
      diagram.render()

      expect(element.innerHTML).toContain('fill="#000"')
      expect(element.innerHTML).toContain('fill="#fff"')
    })
  })
})
