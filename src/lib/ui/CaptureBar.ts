import { COLORS, SPACING, SIZES } from './styles'

/**
 * SVG icons for captured stones (white/black stone with red X)
 */
const CAPTURE_ICONS = {
  white: '<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="8" fill="white" stroke="black" stroke-width="1.5"/><line x1="3" y1="3" x2="21" y2="21" stroke="red" stroke-width="2" stroke-linecap="round"/><line x1="21" y1="3" x2="3" y2="21" stroke="red" stroke-width="2" stroke-linecap="round"/></svg>',
  black: '<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="8" fill="black" stroke="black" stroke-width="1.5"/><line x1="3" y1="3" x2="21" y2="21" stroke="red" stroke-width="2" stroke-linecap="round"/><line x1="21" y1="3" x2="3" y2="21" stroke="red" stroke-width="2" stroke-linecap="round"/></svg>',
} as const

export interface CaptureBarOptions {
  /** Number of white stones captured */
  whiteCaptured: number
  /** Number of black stones captured */
  blackCaptured: number
  /** Optional content to display on the right side (e.g., move counter) */
  rightContent?: string
  /** Margin direction: 'top' or 'bottom' */
  marginDirection?: 'top' | 'bottom'
}

/**
 * Renders a capture count bar showing how many stones have been captured.
 * Optionally displays additional content on the right (like a move counter).
 *
 * @example
 * // Simple capture bar (Problem diagram)
 * const html = renderCaptureBar({
 *   whiteCaptured: 2,
 *   blackCaptured: 1,
 *   marginDirection: 'bottom'
 * })
 *
 * @example
 * // With move counter (Freeplay/Replay diagrams)
 * const html = renderCaptureBar({
 *   whiteCaptured: 3,
 *   blackCaptured: 2,
 *   rightContent: '<div style="color: #616161;">5 / 10</div>',
 *   marginDirection: 'top'
 * })
 */
export function renderCaptureBar(options: CaptureBarOptions): string {
  const { whiteCaptured, blackCaptured, rightContent, marginDirection = 'bottom' } = options

  // Determine layout based on whether we have right content
  const justifyContent = rightContent ? 'space-between' : 'flex-start'

  // Bar container style
  const barStyle = [
    `background: ${COLORS.background}`,
    `border: 1px solid ${COLORS.border}`,
    `border-radius: ${SIZES.borderRadius}`,
    `padding: ${SPACING.large}`,
    `margin-${marginDirection}: ${SPACING.medium}`,
    `display: flex`,
    `justify-content: ${justifyContent}`,
    `align-items: center`,
    `max-width: ${SIZES.maxWidth}`,
    `width: 100%`,
  ].join('; ')

  // Group style for capture items (when we have right content)
  const groupStyle = [
    `display: flex`,
    `gap: ${SPACING.extraLarge}`,
    `align-items: center`,
  ].join('; ')

  // Individual capture item style (icon + number)
  const itemStyle = [
    `display: flex`,
    `gap: ${SPACING.small}`,
    `align-items: center`,
  ].join('; ')

  // Number style
  const numberStyle = [
    `font-size: 0.9rem`,
    `font-weight: 500`,
    `color: ${COLORS.textPrimary}`,
  ].join('; ')

  let html = `<div style="${barStyle}">`

  // Always wrap capture items in a group for consistent spacing
  html += `<div style="${groupStyle}">`

  // White captures
  html += `<div style="${itemStyle}">`
  html += CAPTURE_ICONS.white
  html += `<span style="${numberStyle}">${whiteCaptured}</span>`
  html += `</div>`

  // Black captures
  html += `<div style="${itemStyle}">`
  html += CAPTURE_ICONS.black
  html += `<span style="${numberStyle}">${blackCaptured}</span>`
  html += `</div>`

  html += `</div>` // Close group

  // Add right content if provided
  if (rightContent) {
    html += rightContent
  }

  html += `</div>` // Close bar

  return html
}

/**
 * Helper to create a move counter element (commonly used with CaptureBar)
 */
export function renderMoveCounter(current: number, total?: number): string {
  const text = total !== undefined ? `${current} / ${total}` : `${current}`
  return `<div style="color: ${COLORS.textSecondary}; font-size: 0.9rem; font-weight: 500;">${text}</div>`
}
