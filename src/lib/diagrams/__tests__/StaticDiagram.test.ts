import { describe, it, expect } from 'vitest'
import { StaticDiagram } from '../StaticDiagram'
import { createMockElement, createBoardLines } from './helpers'

describe('StaticDiagram', () => {
  describe('Basic Rendering', () => {
    it('renders a simple 3x3 empty board', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        static

        . . .
        . . .
        . . .
      `)

      const diagram = new StaticDiagram(element, lines)
      diagram.render()

      expect(element.innerHTML).toContain('<svg')
      expect(element.innerHTML).toContain('class="godash-board"')
    })

    it('renders a board with black and white stones', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        static

        X O .
        . X .
        O . X
      `)

      const diagram = new StaticDiagram(element, lines)
      diagram.render()

      expect(element.innerHTML).toContain('<svg')
      // Black stones use fill="#000"
      expect(element.innerHTML).toContain('fill="#000"')
      // White stones use fill="#fff"
      expect(element.innerHTML).toContain('fill="#fff"')
    })

    it('renders a board with text annotations', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        static

        a b c
        . . .
        . . .
      `)

      const diagram = new StaticDiagram(element, lines)
      diagram.render()

      expect(element.innerHTML).toContain('>a<')
      expect(element.innerHTML).toContain('>b<')
      expect(element.innerHTML).toContain('>c<')
    })
  })

  describe('Annotation Shapes', () => {
    it('renders triangle annotations', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        static

        a . .
        . . .
        . . .
        ---
        triangle: a
      `)

      const diagram = new StaticDiagram(element, lines)
      diagram.render()

      // Triangle annotations render as polygons
      expect(element.innerHTML).toContain('<polygon')
      expect(element.innerHTML).toContain('points=')
    })

    it('renders square annotations', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        static

        a . .
        . . .
        . . .
        ---
        square: a
      `)

      const diagram = new StaticDiagram(element, lines)
      diagram.render()

      // Square annotations render as rects
      expect(element.innerHTML).toContain('<rect')
    })

    it('renders circle annotations', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        static

        a . .
        . . .
        . . .
        ---
        circle: a
      `)

      const diagram = new StaticDiagram(element, lines)
      diagram.render()

      // Circle annotations render as circles with fill="none" (not stones)
      expect(element.innerHTML).toContain('fill="none"')
    })

    it('renders x annotations', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        static

        a . .
        . . .
        . . .
        ---
        x: a
      `)

      const diagram = new StaticDiagram(element, lines)
      diagram.render()

      // X annotations render as two lines
      expect(element.innerHTML).toContain('<line')
    })

    it('handles mixed annotation types', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        static

        a b c d
        . . . .
        . . . .
        . . . .
        ---
        triangle: a
        square: b
        circle: c
        x: d
      `)

      const diagram = new StaticDiagram(element, lines)
      diagram.render()

      expect(element.innerHTML).toContain('<polygon')
      expect(element.innerHTML).toContain('<rect')
      expect(element.innerHTML).toContain('fill="none"')
      expect(element.innerHTML).toContain('<line')
    })
  })

  describe('Area Colors', () => {
    it('renders area colors with single prefix', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        static

        r. . .
        . . .
        . . .
        ---
        area-colors:
          r: red
      `)

      const diagram = new StaticDiagram(element, lines)
      diagram.render()

      // Area colors are applied to board areas
      expect(element.innerHTML).toContain('fill="red"')
    })

    it('renders multiple area color prefixes', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        static

        r. b. g.
        r. b. g.
        r. b. g.
        ---
        area-colors:
          r: red
          b: blue
          g: green
      `)

      const diagram = new StaticDiagram(element, lines)
      diagram.render()

      expect(element.innerHTML).toContain('fill="red"')
      expect(element.innerHTML).toContain('fill="blue"')
      expect(element.innerHTML).toContain('fill="green"')
    })

    it('throws error on invalid area prefix (uppercase)', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        static

        . . .
        . . .
        . . .
        ---
        area-colors:
          R: red
      `)

      expect(() => new StaticDiagram(element, lines)).toThrow(
        "Invalid area prefix 'R'. Must be a single lowercase letter (a-z)"
      )
    })

    it('throws error on invalid area prefix (multiple characters)', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        static

        . . .
        . . .
        . . .
        ---
        area-colors:
          rr: red
      `)

      expect(() => new StaticDiagram(element, lines)).toThrow(
        "Invalid area prefix 'rr'. Must be a single lowercase letter (a-z)"
      )
    })

    it('throws error on invalid area prefix (number)', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        static

        . . .
        . . .
        . . .
        ---
        area-colors:
          '1': red
      `)

      expect(() => new StaticDiagram(element, lines)).toThrow(
        "Invalid area prefix '1'. Must be a single lowercase letter (a-z)"
      )
    })
  })

  describe('Configuration Parsing', () => {
    it('parses black marks from YAML config', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        static

        a b .
        . . .
        . . .
        ---
        black: a,b
      `)

      const diagram = new StaticDiagram(element, lines)
      diagram.render()

      // Black stones at positions marked a and b
      expect(element.innerHTML).toContain('fill="#000"')
    })

    it('parses white marks from YAML config', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        static

        a b .
        . . .
        . . .
        ---
        white: a,b
      `)

      const diagram = new StaticDiagram(element, lines)
      diagram.render()

      // White stones at positions marked a and b
      expect(element.innerHTML).toContain('fill="#fff"')
    })

    it('parses black marks as array from YAML config', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        static

        a b .
        . . .
        . . .
        ---
        black: [a, b]
      `)

      const diagram = new StaticDiagram(element, lines)
      diagram.render()

      expect(element.innerHTML).toContain('fill="#000"')
    })

    it('parses both black and white marks', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        static

        a b c
        . . .
        . . .
        ---
        black: a,b
        white: c
      `)

      const diagram = new StaticDiagram(element, lines)
      diagram.render()

      expect(element.innerHTML).toContain('fill="#000"')
      expect(element.innerHTML).toContain('fill="#fff"')
    })

    it('handles ignore-rules option as boolean', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        static

        . . .
        . . .
        . . .
        ---
        ignore-rules: true
      `)

      expect(() => new StaticDiagram(element, lines)).not.toThrow()
    })

    it('handles ignore-rules option as string', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        static

        . . .
        . . .
        . . .
        ---
        ignore-rules: 'true'
      `)

      expect(() => new StaticDiagram(element, lines)).not.toThrow()
    })
  })

  describe('Edge Cases', () => {
    it('handles empty annotations', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        static

        . . .
        . . .
        . . .
      `)

      const diagram = new StaticDiagram(element, lines)
      diagram.render()

      expect(element.innerHTML).toContain('<svg')
    })

    it('handles board with no configuration section', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        static

        X O .
        . . .
        . . .
      `)

      const diagram = new StaticDiagram(element, lines)
      diagram.render()

      expect(element.innerHTML).toContain('<svg')
      expect(element.innerHTML).toContain('fill="#000"')
      expect(element.innerHTML).toContain('fill="#fff"')
    })

    it('handles marks with whitespace in config', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        static

        a b c
        . . .
        . . .
        ---
        black: a, b, c
      `)

      const diagram = new StaticDiagram(element, lines)
      diagram.render()

      expect(element.innerHTML).toContain('fill="#000"')
    })

    it('handles combination of stones and annotations', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        static

        X a O
        b . c
        . . .
        ---
        triangle: a
        square: b
        circle: c
      `)

      const diagram = new StaticDiagram(element, lines)
      diagram.render()

      // Has black and white stones
      expect(element.innerHTML).toContain('fill="#000"')
      expect(element.innerHTML).toContain('fill="#fff"')
      // Has shape annotations
      expect(element.innerHTML).toContain('<polygon')
      expect(element.innerHTML).toContain('<rect')
    })
  })
})
