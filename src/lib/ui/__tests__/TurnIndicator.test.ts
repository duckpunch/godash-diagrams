import { describe, it, expect } from 'vitest'
import { renderTurnIndicator, renderResultIcon } from '../TurnIndicator'
import { ICONS } from '../icons'

describe('TurnIndicator', () => {
  describe('renderTurnIndicator', () => {
    it('renders black turn indicator', () => {
      const html = renderTurnIndicator(true)

      expect(html).toContain('width: 28px')
      expect(html).toContain('height: 28px')
      expect(html).toContain('border-radius: 50%')
      expect(html).toContain('background: #000000')
      expect(html).toContain('border: 2px solid var(--godash-black-stone-border, #424242)')
      expect(html).toContain('title="Black to play"')
    })

    it('renders white turn indicator', () => {
      const html = renderTurnIndicator(false)

      expect(html).toContain('width: 28px')
      expect(html).toContain('height: 28px')
      expect(html).toContain('border-radius: 50%')
      expect(html).toContain('background: #ffffff')
      expect(html).toContain('border: 2px solid #424242')
      expect(html).toContain('title="White to play"')
    })

    it('renders as a circular element', () => {
      const html = renderTurnIndicator(true)

      // Check for circular styling
      expect(html).toContain('border-radius: 50%')
    })

    it('has consistent size regardless of color', () => {
      const blackHtml = renderTurnIndicator(true)
      const whiteHtml = renderTurnIndicator(false)

      expect(blackHtml).toContain('width: 28px; height: 28px')
      expect(whiteHtml).toContain('width: 28px; height: 28px')
    })

    it('renders as a div element', () => {
      const html = renderTurnIndicator(true)

      expect(html).toMatch(/^<div/)
      expect(html).toMatch(/<\/div>$/)
    })
  })

  describe('renderResultIcon', () => {
    it('renders success icon with check mark', () => {
      const html = renderResultIcon('success')

      expect(html).toContain(ICONS.check)
      expect(html).toContain('display: flex')
      expect(html).toContain('align-items: center')
      expect(html).toContain('justify-content: center')
      expect(html).toContain('min-width: 28px')
      expect(html).toContain('height: 28px')
    })

    it('renders failure icon with X mark', () => {
      const html = renderResultIcon('failure')

      expect(html).toContain(ICONS.x)
      expect(html).toContain('display: flex')
      expect(html).toContain('align-items: center')
      expect(html).toContain('justify-content: center')
      expect(html).toContain('min-width: 28px')
      expect(html).toContain('height: 28px')
    })

    it('has consistent styling for both icon types', () => {
      const successHtml = renderResultIcon('success')
      const failureHtml = renderResultIcon('failure')

      const commonStyle = 'display: flex; align-items: center; justify-content: center; min-width: 28px; height: 28px;'
      expect(successHtml).toContain(commonStyle)
      expect(failureHtml).toContain(commonStyle)
    })

    it('renders different icons for success vs failure', () => {
      const successHtml = renderResultIcon('success')
      const failureHtml = renderResultIcon('failure')

      expect(successHtml).not.toEqual(failureHtml)
      expect(successHtml).toContain(ICONS.check)
      expect(successHtml).not.toContain(ICONS.x)
      expect(failureHtml).toContain(ICONS.x)
      expect(failureHtml).not.toContain(ICONS.check)
    })

    it('renders as a div element', () => {
      const html = renderResultIcon('success')

      expect(html).toMatch(/^<div/)
      expect(html).toMatch(/<\/div>$/)
    })
  })

  describe('Integration scenarios', () => {
    it('renders turn indicator for ProblemDiagram (incomplete state)', () => {
      const isBlackTurn = true
      const html = renderTurnIndicator(isBlackTurn)

      expect(html).toContain('Black to play')
      expect(html).toContain('background: #000000')
    })

    it('renders turn indicator for FreeplayDiagram', () => {
      const isBlackTurn = false
      const html = renderTurnIndicator(isBlackTurn)

      expect(html).toContain('White to play')
      expect(html).toContain('background: #ffffff')
    })

    it('renders turn indicator for ReplayDiagram', () => {
      // Simulate replay showing next player's turn
      const nextToPlayIsBlack = true
      const html = renderTurnIndicator(nextToPlayIsBlack)

      expect(html).toContain('Black to play')
    })

    it('renders success icon for ProblemDiagram (success state)', () => {
      const html = renderResultIcon('success')

      expect(html).toContain(ICONS.check)
      expect(html).toContain('stroke="#2e7d32"') // Green check mark
    })

    it('renders failure icon for ProblemDiagram (failure state)', () => {
      const html = renderResultIcon('failure')

      expect(html).toContain(ICONS.x)
      expect(html).toContain('stroke: var(--godash-icon-failure, #c62828)') // Red X mark with CSS variable
    })
  })
})
