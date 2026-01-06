/**
 * Auto-init build for Godash Diagrams
 * This file automatically initializes diagrams when the DOM is ready
 */

import { init } from './index'

// Auto-initialize when DOM is ready
// Don't throw errors if no diagrams found (it's ok for pages without diagrams)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    init(undefined, { throwOnNotFound: false })
  })
} else {
  // DOM is already ready
  init(undefined, { throwOnNotFound: false })
}
