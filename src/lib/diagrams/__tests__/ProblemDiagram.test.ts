import { describe, it, expect } from 'vitest'
import { ProblemDiagram } from '../ProblemDiagram'
import { ProblemResult } from '../types'
import { createMockElement, createBoardLines } from './helpers'

describe('ProblemDiagram', () => {
  describe('Basic Rendering', () => {
    it('renders initial problem position', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        problem

        a b c
        . . .
        . . .

        ---
        solutions: a>b>c
      `)

      const diagram = new ProblemDiagram(element, lines)
      diagram.render()

      expect(element.innerHTML).toContain('<svg')
      expect(element.innerHTML).toContain('class="godash-board"')
    })

    it('renders annotations for problem marks', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        problem

        a b .
        . . .
        . . .

        ---
        solutions: a>b
      `)

      const diagram = new ProblemDiagram(element, lines)
      diagram.render()

      expect(element.innerHTML).toContain('>a<')
      expect(element.innerHTML).toContain('>b<')
    })

    it('renders reset button', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        problem

        a . .
        . . .
        . . .

        ---
        solutions: a
      `)

      const diagram = new ProblemDiagram(element, lines)
      diagram.render()

      expect(element.innerHTML).toContain('id="reset-')
    })

    it('shows incomplete state initially', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        problem

        a . .
        . . .
        . . .

        ---
        solutions: a
      `)

      const diagram = new ProblemDiagram(element, lines)
      expect(diagram.result).toBe(ProblemResult.Incomplete)
    })
  })

  describe('Configuration Parsing', () => {
    it('parses single solution string', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        problem

        a b c
        . . .
        . . .

        ---
        solutions: a>b>c
      `)

      expect(() => new ProblemDiagram(element, lines)).not.toThrow()
    })

    it('parses multiple solutions as array', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        problem

        a b c
        . . .
        . . .

        ---
        solutions: [a>b, a>c]
      `)

      expect(() => new ProblemDiagram(element, lines)).not.toThrow()
    })

    it('parses failure sequences', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        problem

        a b c
        . . .
        . . .

        ---
        solutions: a>b
        sequences: c>a
      `)

      expect(() => new ProblemDiagram(element, lines)).not.toThrow()
    })

    it('accepts to-play: black option', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        problem

        a . .
        . . .
        . . .

        ---
        to-play: black
        solutions: a
      `)

      const diagram = new ProblemDiagram(element, lines)
      expect(diagram.toPlay).toBe(1) // BLACK = 1
    })

    it('accepts to-play: white option', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        problem

        a . .
        . . .
        . . .

        ---
        to-play: white
        solutions: a
      `)

      const diagram = new ProblemDiagram(element, lines)
      expect(diagram.toPlay).toBe(2) // WHITE = 2
    })

    it('defaults to black to play', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        problem

        a . .
        . . .
        . . .

        ---
        solutions: a
      `)

      const diagram = new ProblemDiagram(element, lines)
      expect(diagram.toPlay).toBe(1) // BLACK = 1
    })

    it('accepts ignore-ko option', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        problem

        a . .
        . . .
        . . .

        ---
        ignore-ko: true
        solutions: a
      `)

      expect(() => new ProblemDiagram(element, lines)).not.toThrow()
    })

    it('parses black marks', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        problem

        a . .
        . . .
        . . .

        ---
        black: a
        solutions: a
      `)

      const diagram = new ProblemDiagram(element, lines)
      diagram.render()

      expect(element.innerHTML).toContain('fill="#000"')
    })

    it('parses white marks', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        problem

        a . .
        . . .
        . . .

        ---
        white: a
        solutions: a
      `)

      const diagram = new ProblemDiagram(element, lines)
      diagram.render()

      expect(element.innerHTML).toContain('fill="#fff"')
    })
  })

  describe('Sequence Validation', () => {
    it('validates solution moves are legal', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        problem

        a X .
        . . .
        . . .

        ---
        solutions: a
      `)

      // Move 'a' is occupied, should throw
      expect(() => new ProblemDiagram(element, lines)).toThrow()
    })

    it('validates marks are unique', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        problem

        a a .
        . . .
        . . .

        ---
        solutions: a
      `)

      // Duplicate mark 'a' should throw
      expect(() => new ProblemDiagram(element, lines)).toThrow()
    })

    it('validates black and white marks are disjoint', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        problem

        a . .
        . . .
        . . .

        ---
        black: a
        white: a
        solutions: a
      `)

      // 'a' can't be both black and white
      expect(() => new ProblemDiagram(element, lines)).toThrow()
    })

    it('validates all marks exist in board', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        problem

        . . .
        . . .
        . . .

        ---
        solutions: a
      `)

      // Mark 'a' doesn't exist in board
      expect(() => new ProblemDiagram(element, lines)).toThrow()
    })

    it('requires at least one solution', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        problem

        a . .
        . . .
        . . .
      `)

      // No solutions defined
      expect(() => new ProblemDiagram(element, lines)).toThrow()
    })
  })

  describe('Wildcard Support', () => {
    it('accepts wildcard in solution', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        problem

        a b c
        . . .
        . . .

        ---
        solutions: .>b>c
      `)

      expect(() => new ProblemDiagram(element, lines)).not.toThrow()
    })

    it('accepts wildcard at root', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        problem

        a b c
        . . .
        . . .

        ---
        solutions: .>a
      `)

      expect(() => new ProblemDiagram(element, lines)).not.toThrow()
    })

    it('accepts multiple wildcards in sequence', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        problem

        a b c d
        . . . .
        . . . .
        . . . .

        ---
        solutions: .>a>.>b
      `)

      expect(() => new ProblemDiagram(element, lines)).not.toThrow()
    })

    it('validates wildcards only for player moves', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        problem

        a b .
        . . .
        . . .

        ---
        solutions: a>.
      `)

      // Wildcard at position 1 (computer response) should throw
      expect(() => new ProblemDiagram(element, lines)).toThrow()
    })
  })

  describe('Sequence Tree Building', () => {
    it('builds tree from simple sequence', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        problem

        a b .
        . . .
        . . .

        ---
        solutions: a>b
      `)

      const diagram = new ProblemDiagram(element, lines)
      expect(diagram.sequenceTree).toBeDefined()
      expect(diagram.sequenceTree.size).toBeGreaterThan(0)
    })

    it('builds tree with branching solutions', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        problem

        a b c
        . . .
        . . .

        ---
        solutions: [a>b, a>c]
      `)

      const diagram = new ProblemDiagram(element, lines)
      expect(diagram.sequenceTree).toBeDefined()
      // Tree should have 'a' as root with two children
      expect(diagram.sequenceTree.size).toBeGreaterThan(0)
    })

    it('merges overlapping sequences', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        problem

        a b c d
        . . . .
        . . . .
        . . . .

        ---
        solutions: [a>b>c, a>b>d]
      `)

      const diagram = new ProblemDiagram(element, lines)
      expect(diagram.sequenceTree).toBeDefined()
      // Both sequences share a>b prefix
      expect(diagram.sequenceTree.size).toBeGreaterThan(0)
    })

    it('handles mixed solutions and failures', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        problem

        a b c
        . . .
        . . .

        ---
        solutions: a>b
        sequences: c>a
      `)

      const diagram = new ProblemDiagram(element, lines)
      expect(diagram.sequenceTree).toBeDefined()
      expect(diagram.sequenceTree.size).toBeGreaterThan(0)
    })
  })

  describe('Shape Annotations', () => {
    it('supports triangle annotations on marks', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        problem

        a . .
        . . .
        . . .

        ---
        triangle: a
        solutions: a
      `)

      const diagram = new ProblemDiagram(element, lines)
      diagram.render()

      expect(element.innerHTML).toContain('<polygon')
    })

    it('supports square annotations on marks', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        problem

        a . .
        . . .
        . . .

        ---
        square: a
        solutions: a
      `)

      const diagram = new ProblemDiagram(element, lines)
      diagram.render()

      expect(element.innerHTML).toContain('<rect')
    })

    it('supports circle annotations on marks', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        problem

        a . .
        . . .
        . . .

        ---
        circle: a
        solutions: a
      `)

      const diagram = new ProblemDiagram(element, lines)
      diagram.render()

      expect(element.innerHTML).toContain('fill="none"')
    })

    it('supports x annotations on marks', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        problem

        a . .
        . . .
        . . .

        ---
        x: a
        solutions: a
      `)

      const diagram = new ProblemDiagram(element, lines)
      diagram.render()

      expect(element.innerHTML).toContain('<line')
    })
  })

  describe('Edge Cases', () => {
    it('handles empty initial board', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        problem

        a . .
        . . .
        . . .

        ---
        solutions: a
      `)

      expect(() => new ProblemDiagram(element, lines)).not.toThrow()
    })

    it('handles complex initial position', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        problem

        X a O
        . . .
        . . .

        ---
        solutions: a
      `)

      const diagram = new ProblemDiagram(element, lines)
      diagram.render()

      expect(element.innerHTML).toContain('fill="#000"')
      expect(element.innerHTML).toContain('fill="#fff"')
    })

    it('handles single move solution', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        problem

        a . .
        . . .
        . . .

        ---
        solutions: a
      `)

      expect(() => new ProblemDiagram(element, lines)).not.toThrow()
    })

    it('handles long sequence', () => {
      const element = createMockElement()
      const lines = createBoardLines(`
        problem

        a b c d e
        . . . . .
        . . . . .
        . . . . .
        . . . . .

        ---
        solutions: a>b>c>d>e
      `)

      expect(() => new ProblemDiagram(element, lines)).not.toThrow()
    })
  })
})
