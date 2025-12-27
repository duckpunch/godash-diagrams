/**
 * Godash Diagrams - Main library entry point
 * This file exports all public APIs that will be available when users include your library
 */

import { boardToSvg, toError } from './render'
import { validateBoard, ValidationError } from './validate'

const DEFAULT_DIAGRAM_CLASS = '.godash-diagram'

const DIAGRAM_TYPES = {
  static: true,
  freeplay: true,
} as const

type DiagramType = keyof typeof DIAGRAM_TYPES

interface DiagramOptions {
  diagramSource?: string
}

function renderStaticDiagram(element: Element, lines: string[]): void {
  // Validate and parse board
  let parsedBoard
  try {
    parsedBoard = validateBoard(lines)
  } catch (error) {
    if (error instanceof ValidationError) {
      element.innerHTML = toError(error.message)
    } else {
      element.innerHTML = toError(error instanceof Error ? error.message : String(error))
    }
    return
  }

  const { board, rowCount, columnCount, configStartIndex } = parsedBoard

  // Parse options for display (YAML-like syntax after board definition)
  const parsedOptions: Record<string, string> = {}
  for (let i = configStartIndex; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line === '') continue

    const colonIndex = line.indexOf(':')
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim()
      const value = line.substring(colonIndex + 1).trim()
      parsedOptions[key] = value
    }
  }

  // Generate SVG
  const boardSvg = boardToSvg(board, rowCount, columnCount)

  // Render
  let output = boardSvg

  // Display parsed options (for debugging)
  if (Object.keys(parsedOptions).length > 0) {
    output += `<div style="margin-top: 1rem;">Parsed Options:</div>`
    output += `<pre style="background: #f4f4f4; padding: 1rem; border-radius: 4px; margin-top: 0.5rem; overflow-x: auto;">${JSON.stringify(parsedOptions, null, 2)}</pre>`
  }

  element.innerHTML = output
}

function renderFreeplayDiagram(element: Element, lines: string[]): void {
  // Validate and parse board (allow empty boards with size option)
  let parsedBoard
  try {
    parsedBoard = validateBoard(lines, true)
  } catch (error) {
    if (error instanceof ValidationError) {
      element.innerHTML = toError(error.message)
    } else {
      element.innerHTML = toError(error instanceof Error ? error.message : String(error))
    }
    return
  }

  const { board, rowCount, columnCount, configStartIndex } = parsedBoard

  // Parse options for display (YAML-like syntax after board definition)
  const parsedOptions: Record<string, string> = {}
  for (let i = configStartIndex; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line === '') continue

    const colonIndex = line.indexOf(':')
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim()
      const value = line.substring(colonIndex + 1).trim()
      parsedOptions[key] = value
    }
  }

  // Generate SVG
  const boardSvg = boardToSvg(board, rowCount, columnCount)

  // Create container with turn indicator, SVG, and click info
  const turnInfoId = `turn-info-${Math.random().toString(36).substr(2, 9)}`
  const clickInfoId = `click-info-${Math.random().toString(36).substr(2, 9)}`
  let output = `<div class="freeplay-container">`
  output += `<div id="${turnInfoId}" style="margin-bottom: 1rem; padding: 0.5rem; font-weight: 600; font-size: 1.1rem;">Black to play</div>`
  output += boardSvg
  output += `<div id="${clickInfoId}" style="margin-top: 1rem; padding: 0.5rem; background: #f9f9f9; border-radius: 4px;">Click on the board to see coordinates</div>`
  output += `</div>`

  // Display parsed options (for debugging)
  if (Object.keys(parsedOptions).length > 0) {
    output += `<div style="margin-top: 1rem;">Parsed Options:</div>`
    output += `<pre style="background: #f4f4f4; padding: 1rem; border-radius: 4px; margin-top: 0.5rem; overflow-x: auto;">${JSON.stringify(parsedOptions, null, 2)}</pre>`
  }

  element.innerHTML = output

  // Add click handler to SVG
  const svg = element.querySelector('svg')
  const clickInfo = document.getElementById(clickInfoId)
  const turnInfo = document.getElementById(turnInfoId)

  if (svg && clickInfo && turnInfo) {
    svg.style.cursor = 'pointer'

    // Track whose turn it is
    let isBlackTurn = true

    svg.addEventListener('click', (event: Event) => {
      const mouseEvent = event as MouseEvent
      const rect = svg.getBoundingClientRect()
      const x = mouseEvent.clientX - rect.left
      const y = mouseEvent.clientY - rect.top

      // Convert to board coordinates
      const cellSize = 30
      const margin = cellSize
      const col = Math.round((x - margin) / cellSize)
      const row = Math.round((y - margin) / cellSize)

      // Validate coordinates are within board bounds
      if (row >= 0 && row < rowCount && col >= 0 && col < columnCount) {
        clickInfo.innerHTML = `Clicked coordinate: Row ${row}, Column ${col} (${row}, ${col})`

        // Toggle turn
        isBlackTurn = !isBlackTurn
        turnInfo.innerHTML = isBlackTurn ? 'Black to play' : 'White to play'
      } else {
        clickInfo.innerHTML = `Clicked outside board bounds`
      }
    })
  }
}

function renderDiagram(element: Element, source: string): void {
  const lines = source.split('\n')

  if (lines.length === 0) {
    element.innerHTML = toError('Empty diagram source')
    return
  }

  // Parse first line - must be diagram type
  const diagramType = lines[0].trim()

  // Dispatch to appropriate renderer based on diagram type
  switch (diagramType as DiagramType) {
    case 'static':
      renderStaticDiagram(element, lines)
      break
    case 'freeplay':
      renderFreeplayDiagram(element, lines)
      break
    default:
      element.innerHTML = toError(`Unsupported diagram type "${diagramType}". Supported types: ${Object.keys(DIAGRAM_TYPES).join(', ')}`)
      return
  }
}

export function init(selector?: string, options?: DiagramOptions): void {
  const query = selector ?? DEFAULT_DIAGRAM_CLASS
  const elements = document.querySelectorAll(query)

  if (elements.length === 0) {
    throw new Error(`No elements found for selector: ${query}`)
  }

  elements.forEach((element) => {
    const source = options?.diagramSource ?? element.textContent ?? ''
    renderDiagram(element, source)
  })
}

// Export any other public functions/classes here
export { version } from './version'
