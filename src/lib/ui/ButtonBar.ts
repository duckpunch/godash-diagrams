import { COLORS, SHADOWS, SPACING, SIZES } from './styles'

/**
 * Button configuration
 */
export interface ButtonConfig {
  /** Unique ID for the button element */
  id: string
  /** SVG icon HTML to display in button */
  icon: string
  /** Tooltip text for the button */
  title: string
  /** Whether the button is disabled */
  disabled?: boolean
}

/**
 * Button bar styling options
 */
export interface ButtonBarStyle {
  /** Background color of the bar */
  background?: string
  /** Border color of the bar */
  borderColor?: string
  /** Button background color (when enabled) */
  buttonBackground?: string
  /** Button text color */
  buttonColor?: string
}

/**
 * Options for rendering a button bar
 */
export interface ButtonBarOptions {
  /** Content to display on the left side (e.g., turn indicator, result icon) */
  leftContent?: string
  /** Buttons to display on the right side */
  buttons: ButtonConfig[]
  /** Custom styling for the bar and buttons */
  style?: ButtonBarStyle
  /** Margin direction: 'top' or 'bottom' */
  marginDirection?: 'top' | 'bottom'
}

/**
 * Renders a single button with Material Design styling
 *
 * @example
 * const html = renderButton({
 *   id: 'reset-btn',
 *   icon: ICONS.reset,
 *   title: 'Reset',
 *   disabled: false
 * })
 */
export function renderButton(config: ButtonConfig, style?: ButtonBarStyle): string {
  const { id, icon, title, disabled = false } = config

  const buttonBg = style?.buttonBackground || COLORS.buttonNormal
  const buttonTxt = style?.buttonColor || COLORS.buttonText

  const buttonStyle = disabled
    ? [
        `padding: ${SPACING.medium}`,
        `border: none`,
        `border-radius: ${SIZES.borderRadius}`,
        `background: ${COLORS.buttonDisabled}`,
        `color: ${COLORS.buttonTextDisabled}`,
        `cursor: not-allowed`,
        `display: flex`,
        `align-items: center`,
        `justify-content: center`,
        `min-width: 36px`,
        `height: 36px`,
      ].join('; ')
    : [
        `padding: ${SPACING.medium}`,
        `border: none`,
        `border-radius: ${SIZES.borderRadius}`,
        `background: ${buttonBg}`,
        `color: ${buttonTxt}`,
        `cursor: pointer`,
        `display: flex`,
        `align-items: center`,
        `justify-content: center`,
        `box-shadow: ${SHADOWS.button}`,
        `transition: background 0.2s`,
        `min-width: 36px`,
        `height: 36px`,
      ].join('; ')

  return `<button id="${id}" style="${buttonStyle}" ${disabled ? 'disabled' : ''} title="${title}">${icon}</button>`
}

/**
 * Renders a group of buttons with proper spacing
 *
 * @example
 * const html = renderButtonGroup([
 *   { id: 'undo', icon: ICONS.undo, title: 'Undo', disabled: true },
 *   { id: 'redo', icon: ICONS.redo, title: 'Redo', disabled: false }
 * ])
 */
export function renderButtonGroup(buttons: ButtonConfig[], style?: ButtonBarStyle): string {
  const groupStyle = [
    `display: flex`,
    `gap: ${SPACING.medium}`,
    `align-items: center`,
  ].join('; ')

  let html = `<div style="${groupStyle}">`
  for (const button of buttons) {
    html += renderButton(button, style)
  }
  html += `</div>`

  return html
}

/**
 * Renders a complete button bar with optional left content and buttons
 *
 * @example
 * // Problem diagram - single button
 * const html = renderButtonBar({
 *   leftContent: turnIndicator,
 *   buttons: [{ id: 'reset', icon: ICONS.reset, title: 'Reset' }],
 *   marginDirection: 'bottom'
 * })
 *
 * @example
 * // Freeplay diagram - multiple buttons
 * const html = renderButtonBar({
 *   leftContent: turnIndicator,
 *   buttons: [
 *     { id: 'undo', icon: ICONS.undo, title: 'Undo', disabled: true },
 *     { id: 'redo', icon: ICONS.redo, title: 'Redo', disabled: false },
 *     { id: 'pass', icon: ICONS.pass, title: 'Pass' },
 *     { id: 'reset', icon: ICONS.reset, title: 'Reset' }
 *   ],
 *   marginDirection: 'bottom'
 * })
 *
 * @example
 * // With custom styling (for success/failure states)
 * const html = renderButtonBar({
 *   leftContent: checkIcon,
 *   buttons: [{ id: 'reset', icon: ICONS.reset, title: 'Reset' }],
 *   style: {
 *     background: '#e8f5e9',
 *     borderColor: '#2e7d32',
 *     buttonBackground: '#a5d6a7',
 *     buttonColor: '#1b5e20'
 *   },
 *   marginDirection: 'bottom'
 * })
 */
export function renderButtonBar(options: ButtonBarOptions): string {
  const { leftContent, buttons, style, marginDirection = 'bottom' } = options

  const barBg = style?.background || COLORS.background
  const barBorder = style?.borderColor || COLORS.border

  const barStyle = [
    `background: ${barBg}`,
    `border: 1px solid ${barBorder}`,
    `border-radius: ${SIZES.borderRadius}`,
    `padding: ${SPACING.large}`,
    `margin-${marginDirection}: ${SPACING.medium}`,
    `display: flex`,
    `justify-content: space-between`,
    `align-items: center`,
    `max-width: ${SIZES.maxWidth}`,
    `width: 100%`,
  ].join('; ')

  let html = `<div style="${barStyle}">`

  // Left content (turn indicator, result icon, etc.)
  if (leftContent) {
    html += leftContent
  }

  // Right side: buttons
  if (buttons.length === 1) {
    // Single button - render directly
    html += renderButton(buttons[0], style)
  } else if (buttons.length > 1) {
    // Multiple buttons - render as group
    html += renderButtonGroup(buttons, style)
  }

  html += `</div>`

  return html
}
