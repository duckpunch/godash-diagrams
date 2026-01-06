/**
 * Shared Material Design-inspired styles for UI components
 * Uses CSS variables for dark/light mode support
 */

export const COLORS: Record<string, string> = {
  // Neutral grays - now using CSS variables
  background: 'var(--godash-bar-bg, #f8f8f8)',
  backgroundLight: 'var(--godash-bar-bg-light, #f0f0f0)',
  border: 'var(--godash-bar-border, #9e9e9e)',
  textPrimary: 'var(--godash-text-primary, #424242)',
  textSecondary: 'var(--godash-text-secondary, #616161)',

  // Success/failure states
  successLight: 'var(--godash-success-light, #e8f5e9)',
  successMain: 'var(--godash-success-main, #2e7d32)',
  successButton: 'var(--godash-success-button, #a5d6a7)',
  successDark: 'var(--godash-success-dark, #1b5e20)',

  failureLight: 'var(--godash-failure-light, #ffebee)',
  failureMain: 'var(--godash-failure-main, #c62828)',
  failureButton: 'var(--godash-failure-button, #ffcdd2)',

  // Button states
  buttonNormal: 'var(--godash-button-bg, #e0e0e0)',
  buttonDisabled: 'var(--godash-button-bg-disabled, #f0f0f0)',
  buttonText: 'var(--godash-button-text, #424242)',
  buttonTextDisabled: 'var(--godash-button-text-disabled, #9e9e9e)',
}

export const SHADOWS = {
  button: '0 1px 3px rgba(0,0,0,0.1)',
} as const

export const SPACING = {
  small: '0.25rem',
  medium: '0.5rem',
  large: '0.75rem',
  extraLarge: '1rem',
} as const

export const SIZES = {
  borderRadius: '4px',
  maxWidth: '500px',
} as const
