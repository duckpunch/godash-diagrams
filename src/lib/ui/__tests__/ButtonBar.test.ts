import { describe, it, expect } from 'vitest'
import { renderButton, renderButtonGroup, renderButtonBar } from '../ButtonBar'
import { ICONS } from '../icons'

describe('ButtonBar', () => {
  describe('renderButton', () => {
    it('renders an enabled button with default styling', () => {
      const html = renderButton({
        id: 'test-btn',
        icon: ICONS.reset,
        title: 'Reset',
      })

      expect(html).toContain('id="test-btn"')
      expect(html).toContain('title="Reset"')
      expect(html).toContain(ICONS.reset)
      expect(html).toContain('cursor: pointer')
      expect(html).toContain('background: var(--godash-button-bg, #e0e0e0)')
      expect(html).not.toContain('disabled')
    })

    it('renders a disabled button with correct styling', () => {
      const html = renderButton({
        id: 'test-btn',
        icon: ICONS.undo,
        title: 'Undo',
        disabled: true,
      })

      expect(html).toContain('disabled')
      expect(html).toContain('cursor: not-allowed')
      expect(html).toContain('background: var(--godash-button-bg-disabled, #f0f0f0)')
      expect(html).toContain('color: var(--godash-button-text-disabled, #9e9e9e)')
    })

    it('applies custom button styling', () => {
      const html = renderButton(
        {
          id: 'custom-btn',
          icon: ICONS.reset,
          title: 'Reset',
        },
        {
          buttonBackground: '#a5d6a7',
          buttonColor: '#1b5e20',
        }
      )

      expect(html).toContain('background: #a5d6a7')
      expect(html).toContain('color: #1b5e20')
    })

    it('includes Material Design styles', () => {
      const html = renderButton({
        id: 'test-btn',
        icon: ICONS.reset,
        title: 'Reset',
      })

      expect(html).toContain('border-radius: 4px')
      expect(html).toContain('box-shadow: 0 1px 3px rgba(0,0,0,0.1)')
      expect(html).toContain('min-width: 36px')
      expect(html).toContain('height: 36px')
    })

    it('renders all icon types correctly', () => {
      const icons = [
        ICONS.undo,
        ICONS.redo,
        ICONS.reset,
        ICONS.pass,
        ICONS.first,
        ICONS.previous,
        ICONS.next,
        ICONS.last,
      ]

      icons.forEach((icon) => {
        const html = renderButton({
          id: 'test',
          icon,
          title: 'Test',
        })
        expect(html).toContain(icon)
      })
    })
  })

  describe('renderButtonGroup', () => {
    it('renders multiple buttons with spacing', () => {
      const html = renderButtonGroup([
        { id: 'btn1', icon: ICONS.undo, title: 'Undo' },
        { id: 'btn2', icon: ICONS.redo, title: 'Redo' },
      ])

      expect(html).toContain('id="btn1"')
      expect(html).toContain('id="btn2"')
      expect(html).toContain('display: flex')
      expect(html).toContain('gap: 0.5rem')
    })

    it('renders group with mixed enabled/disabled buttons', () => {
      const html = renderButtonGroup([
        { id: 'btn1', icon: ICONS.undo, title: 'Undo', disabled: true },
        { id: 'btn2', icon: ICONS.redo, title: 'Redo', disabled: false },
      ])

      expect(html).toContain('id="btn1"')
      expect(html).toContain('id="btn2"')
      // Check for disabled and enabled states
      const btn1Match = html.match(/id="btn1"[^>]*>/)
      const btn2Match = html.match(/id="btn2"[^>]*>/)
      expect(btn1Match?.[0]).toContain('disabled')
      expect(btn2Match?.[0]).not.toContain('disabled')
    })

    it('applies custom styling to all buttons in group', () => {
      const html = renderButtonGroup(
        [
          { id: 'btn1', icon: ICONS.reset, title: 'Reset' },
          { id: 'btn2', icon: ICONS.pass, title: 'Pass' },
        ],
        {
          buttonBackground: '#ffcdd2',
          buttonColor: '#c62828',
        }
      )

      expect(html).toContain('background: #ffcdd2')
      expect(html).toContain('color: #c62828')
    })

    it('renders 4 buttons correctly (freeplay scenario)', () => {
      const html = renderButtonGroup([
        { id: 'undo', icon: ICONS.undo, title: 'Undo' },
        { id: 'redo', icon: ICONS.redo, title: 'Redo' },
        { id: 'pass', icon: ICONS.pass, title: 'Pass' },
        { id: 'reset', icon: ICONS.reset, title: 'Reset' },
      ])

      expect(html).toContain('id="undo"')
      expect(html).toContain('id="redo"')
      expect(html).toContain('id="pass"')
      expect(html).toContain('id="reset"')
    })
  })

  describe('renderButtonBar', () => {
    it('renders bar with single button and no left content', () => {
      const html = renderButtonBar({
        buttons: [{ id: 'reset', icon: ICONS.reset, title: 'Reset' }],
      })

      expect(html).toContain('display: flex')
      expect(html).toContain('justify-content: space-between')
      expect(html).toContain('id="reset"')
    })

    it('renders bar with left content and single button', () => {
      const turnIndicator = '<div>Turn</div>'
      const html = renderButtonBar({
        leftContent: turnIndicator,
        buttons: [{ id: 'reset', icon: ICONS.reset, title: 'Reset' }],
      })

      expect(html).toContain('<div>Turn</div>')
      expect(html).toContain('id="reset"')
    })

    it('renders bar with multiple buttons as a group', () => {
      const html = renderButtonBar({
        buttons: [
          { id: 'undo', icon: ICONS.undo, title: 'Undo' },
          { id: 'redo', icon: ICONS.redo, title: 'Redo' },
        ],
      })

      expect(html).toContain('id="undo"')
      expect(html).toContain('id="redo"')
      // Should contain button group wrapper
      expect(html).toContain('gap: 0.5rem')
    })

    it('uses margin-bottom by default', () => {
      const html = renderButtonBar({
        buttons: [{ id: 'reset', icon: ICONS.reset, title: 'Reset' }],
      })

      expect(html).toContain('margin-bottom')
      expect(html).not.toContain('margin-top')
    })

    it('uses margin-top when specified', () => {
      const html = renderButtonBar({
        buttons: [{ id: 'reset', icon: ICONS.reset, title: 'Reset' }],
        marginDirection: 'top',
      })

      expect(html).toContain('margin-top')
      expect(html).not.toContain('margin-bottom')
    })

    it('applies default Material Design styles', () => {
      const html = renderButtonBar({
        buttons: [{ id: 'reset', icon: ICONS.reset, title: 'Reset' }],
      })

      expect(html).toContain('background: var(--godash-bar-bg, #f8f8f8)')
      expect(html).toContain('border: 1px solid var(--godash-bar-border, #9e9e9e)')
      expect(html).toContain('border-radius: 4px')
      expect(html).toContain('max-width: 500px')
    })

    it('applies custom bar styling', () => {
      const html = renderButtonBar({
        buttons: [{ id: 'reset', icon: ICONS.reset, title: 'Reset' }],
        style: {
          background: '#e8f5e9',
          borderColor: '#2e7d32',
        },
      })

      expect(html).toContain('background: #e8f5e9')
      expect(html).toContain('border: 1px solid #2e7d32')
    })

    it('applies custom button styling through bar options', () => {
      const html = renderButtonBar({
        buttons: [{ id: 'reset', icon: ICONS.reset, title: 'Reset' }],
        style: {
          buttonBackground: '#a5d6a7',
          buttonColor: '#1b5e20',
        },
      })

      expect(html).toContain('background: #a5d6a7')
      expect(html).toContain('color: #1b5e20')
    })
  })

  describe('Integration scenarios', () => {
    it('renders ProblemDiagram style (single button with result indicator)', () => {
      const checkIcon = '<div class="check">✓</div>'
      const html = renderButtonBar({
        leftContent: checkIcon,
        buttons: [{ id: 'reset', icon: ICONS.reset, title: 'Reset' }],
        style: {
          background: '#e8f5e9',
          borderColor: '#2e7d32',
          buttonBackground: '#a5d6a7',
          buttonColor: '#1b5e20',
        },
        marginDirection: 'bottom',
      })

      expect(html).toContain('margin-bottom')
      expect(html).toContain('<div class="check">✓</div>')
      expect(html).toContain('background: #e8f5e9')
      expect(html).toContain('border: 1px solid #2e7d32')
    })

    it('renders FreeplayDiagram style (turn indicator + 4 buttons)', () => {
      const turnIndicator = '<div class="turn">⚫</div>'
      const html = renderButtonBar({
        leftContent: turnIndicator,
        buttons: [
          { id: 'undo', icon: ICONS.undo, title: 'Undo', disabled: true },
          { id: 'redo', icon: ICONS.redo, title: 'Redo', disabled: true },
          { id: 'pass', icon: ICONS.pass, title: 'Pass' },
          { id: 'reset', icon: ICONS.reset, title: 'Reset' },
        ],
        marginDirection: 'bottom',
      })

      expect(html).toContain('<div class="turn">⚫</div>')
      expect(html).toContain('id="undo"')
      expect(html).toContain('id="redo"')
      expect(html).toContain('id="pass"')
      expect(html).toContain('id="reset"')
    })

    it('renders ReplayDiagram style (turn indicator + 4 navigation buttons)', () => {
      const turnIndicator = '<div class="turn">⚪</div>'
      const html = renderButtonBar({
        leftContent: turnIndicator,
        buttons: [
          { id: 'first', icon: ICONS.first, title: 'First', disabled: true },
          { id: 'prev', icon: ICONS.previous, title: 'Previous', disabled: true },
          { id: 'next', icon: ICONS.next, title: 'Next', disabled: false },
          { id: 'last', icon: ICONS.last, title: 'Last', disabled: false },
        ],
        marginDirection: 'bottom',
      })

      expect(html).toContain('<div class="turn">⚪</div>')
      expect(html).toContain('id="first"')
      expect(html).toContain('id="prev"')
      expect(html).toContain('id="next"')
      expect(html).toContain('id="last"')
    })
  })
})
