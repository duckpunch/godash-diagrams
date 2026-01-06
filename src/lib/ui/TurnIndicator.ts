import { ICONS } from './icons'

/**
 * Renders a turn indicator showing which player's turn it is.
 * Displays as a circular stone (black or white) with appropriate styling.
 *
 * @param isBlack - Whether it's black's turn (true) or white's turn (false)
 * @returns HTML string for the turn indicator
 *
 * @example
 * // Black's turn
 * const html = renderTurnIndicator(true)
 * // Returns: black circle with "Black to play" tooltip
 *
 * @example
 * // White's turn
 * const html = renderTurnIndicator(false)
 * // Returns: white circle with border and "White to play" tooltip
 */
export function renderTurnIndicator(isBlack: boolean): string {
  const stoneColor = isBlack ? '#000000' : '#ffffff'
  const stoneBorder = isBlack
    ? '2px solid var(--godash-black-stone-border, #424242)'
    : '2px solid #424242'
  const playerName = isBlack ? 'Black' : 'White'

  return `<div style="width: 28px; height: 28px; border-radius: 50%; background: ${stoneColor}; border: ${stoneBorder};" title="${playerName} to play"></div>`
}

/**
 * Renders a result icon (check or X) for problem diagrams.
 * Used to show success or failure state.
 *
 * @param type - Type of result icon: 'success' or 'failure'
 * @returns HTML string for the result icon
 *
 * @example
 * // Success icon
 * const html = renderResultIcon('success')
 * // Returns: green check mark icon
 *
 * @example
 * // Failure icon
 * const html = renderResultIcon('failure')
 * // Returns: red X icon
 */
export function renderResultIcon(type: 'success' | 'failure'): string {
  const icon = type === 'success' ? ICONS.check : ICONS.x
  const iconStyle = 'display: flex; align-items: center; justify-content: center; min-width: 28px; height: 28px;'
  return `<div style="${iconStyle}">${icon}</div>`
}
