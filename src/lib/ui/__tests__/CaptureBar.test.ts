import { describe, it, expect } from 'vitest'
import { renderCaptureBar, renderMoveCounter } from '../CaptureBar'

describe('CaptureBar', () => {
  describe('renderCaptureBar', () => {
    it('renders a simple capture bar with zero captures', () => {
      const html = renderCaptureBar({
        whiteCaptured: 0,
        blackCaptured: 0,
      })

      expect(html).toContain('<div style="')
      expect(html).toContain('<span')
      expect(html).toContain('>0</span>')
      // Should appear twice (once for white, once for black)
      expect(html.match(/>0</g)?.length).toBe(2)
    })

    it('renders capture counts correctly', () => {
      const html = renderCaptureBar({
        whiteCaptured: 3,
        blackCaptured: 2,
      })

      expect(html).toContain('>3</span>')
      expect(html).toContain('>2</span>')
    })

    it('includes white stone SVG icon', () => {
      const html = renderCaptureBar({
        whiteCaptured: 1,
        blackCaptured: 0,
      })

      expect(html).toContain('<svg')
      expect(html).toContain('fill="white"')
      expect(html).toContain('stroke="red"')
    })

    it('includes black stone SVG icon', () => {
      const html = renderCaptureBar({
        whiteCaptured: 0,
        blackCaptured: 1,
      })

      expect(html).toContain('<svg')
      expect(html).toContain('fill="black"')
      expect(html).toContain('stroke="red"')
    })

    it('uses margin-bottom by default', () => {
      const html = renderCaptureBar({
        whiteCaptured: 0,
        blackCaptured: 0,
      })

      expect(html).toContain('margin-bottom')
      expect(html).not.toContain('margin-top')
    })

    it('uses margin-top when specified', () => {
      const html = renderCaptureBar({
        whiteCaptured: 0,
        blackCaptured: 0,
        marginDirection: 'top',
      })

      expect(html).toContain('margin-top')
      expect(html).not.toContain('margin-bottom')
    })

    it('renders without right content using flex-start layout', () => {
      const html = renderCaptureBar({
        whiteCaptured: 1,
        blackCaptured: 2,
      })

      expect(html).toContain('justify-content: flex-start')
      expect(html).not.toContain('justify-content: space-between')
    })

    it('renders with right content using space-between layout', () => {
      const html = renderCaptureBar({
        whiteCaptured: 1,
        blackCaptured: 2,
        rightContent: '<div>Extra</div>',
      })

      expect(html).toContain('justify-content: space-between')
      expect(html).toContain('<div>Extra</div>')
    })

    it('includes Material Design styles', () => {
      const html = renderCaptureBar({
        whiteCaptured: 0,
        blackCaptured: 0,
      })

      expect(html).toContain('background: #f8f8f8')
      expect(html).toContain('border: 1px solid #9e9e9e')
      expect(html).toContain('border-radius:') // Has conditional border radius
      expect(html).toContain('max-width: 500px')
    })

    it('applies custom background color from style', () => {
      const html = renderCaptureBar({
        whiteCaptured: 0,
        blackCaptured: 0,
        style: {
          background: '#e8f5e9',
          borderColor: '#2e7d32',
        },
      })

      expect(html).toContain('background: #e8f5e9')
      expect(html).toContain('border: 1px solid #2e7d32')
    })

    it('applies success styling (green)', () => {
      const html = renderCaptureBar({
        whiteCaptured: 1,
        blackCaptured: 2,
        style: {
          background: '#e8f5e9',  // Light green
          borderColor: '#2e7d32',  // Green
        },
      })

      expect(html).toContain('background: #e8f5e9')
      expect(html).toContain('border: 1px solid #2e7d32')
    })

    it('applies failure styling (red)', () => {
      const html = renderCaptureBar({
        whiteCaptured: 0,
        blackCaptured: 0,
        style: {
          background: '#ffebee',  // Light red
          borderColor: '#c62828',  // Red
        },
      })

      expect(html).toContain('background: #ffebee')
      expect(html).toContain('border: 1px solid #c62828')
    })

    it('handles large capture counts', () => {
      const html = renderCaptureBar({
        whiteCaptured: 99,
        blackCaptured: 123,
      })

      expect(html).toContain('>99</span>')
      expect(html).toContain('>123</span>')
    })
  })

  describe('renderMoveCounter', () => {
    it('renders current move only', () => {
      const html = renderMoveCounter(5)

      expect(html).toContain('>5</div>')
      expect(html).not.toContain(' / ')
    })

    it('renders current / total format', () => {
      const html = renderMoveCounter(5, 10)

      expect(html).toContain('>5 / 10</div>')
    })

    it('handles zero values', () => {
      const html = renderMoveCounter(0, 0)

      expect(html).toContain('>0 / 0</div>')
    })

    it('includes secondary text color', () => {
      const html = renderMoveCounter(1, 2)

      expect(html).toContain('color: #616161')
    })
  })

  describe('Integration scenarios', () => {
    it('renders Problem diagram style (no move counter)', () => {
      const html = renderCaptureBar({
        whiteCaptured: 2,
        blackCaptured: 1,
        marginDirection: 'bottom',
      })

      expect(html).toContain('margin-bottom')
      expect(html).toContain('>2</span>')
      expect(html).toContain('>1</span>')
      expect(html).not.toContain('space-between')
    })

    it('renders Freeplay/Replay diagram style (with move counter)', () => {
      const moveCounter = renderMoveCounter(5, 10)
      const html = renderCaptureBar({
        whiteCaptured: 3,
        blackCaptured: 2,
        rightContent: moveCounter,
        marginDirection: 'top',
      })

      expect(html).toContain('margin-top')
      expect(html).toContain('>3</span>')
      expect(html).toContain('>2</span>')
      expect(html).toContain('>5 / 10</div>')
      expect(html).toContain('space-between')
    })
  })
})
