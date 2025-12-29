/**
 * Auto-init build for Godash Diagrams
 * This file automatically initializes diagrams when the DOM is ready
 */

import { init } from './index'

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    init()
  })
} else {
  // DOM is already ready
  init()
}
