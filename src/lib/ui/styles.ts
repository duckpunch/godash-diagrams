/**
 * Shared Material Design-inspired styles for UI components
 */

export const COLORS = {
  // Neutral grays
  background: '#f8f8f8',
  backgroundLight: '#f0f0f0',
  border: '#9e9e9e',
  textPrimary: '#424242',
  textSecondary: '#616161',

  // Success/failure states
  successLight: '#e8f5e9',
  successMain: '#2e7d32',
  successButton: '#a5d6a7',
  successDark: '#1b5e20',

  failureLight: '#ffebee',
  failureMain: '#c62828',
  failureButton: '#ffcdd2',

  // Button states
  buttonNormal: '#e0e0e0',
  buttonDisabled: '#f0f0f0',
  buttonText: '#424242',
  buttonTextDisabled: '#9e9e9e',
} as const

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
