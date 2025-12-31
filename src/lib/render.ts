import { Board, Coordinate, BLACK, WHITE, EMPTY } from 'godash'
import type { AnnotationInfo } from './model'

export function toError(message: string): string {
  return `
    <div style="background: #fee2e2; color: #991b1b; padding: 1rem; border-radius: 4px;">${message}</div>
  `
}

export function boardToSvg(board: Board, rowCount?: number, columnCount?: number, annotations?: Map<string, AnnotationInfo>, lastMove?: Coordinate): string {
  const boardSize = board.dimensions
  const actualRowCount = rowCount ?? boardSize
  const actualColumnCount = columnCount ?? boardSize

  const cellSize = 30
  const margin = cellSize  // Full cell margin on each side
  const stoneRadius = cellSize * 0.4
  const fullColumns = boardSize === actualColumnCount
  const fullRows = boardSize === actualRowCount
  const svgWidth = (fullColumns ? actualColumnCount - 1 : actualColumnCount) * cellSize + margin * 2
  const svgHeight = (fullRows ? actualRowCount - 1 : actualRowCount) * cellSize + margin * 2

  let svg = `<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">`

  // Background
  svg += `<rect width="${svgWidth}" height="${svgHeight}" fill="#dcb35c"/>`

  // Grid lines
  // Determine if board continues beyond visible area
  const continuesRight = actualColumnCount < boardSize
  const continuesDown = actualRowCount < boardSize

  // Grid end points - extend to next position if board continues
  const gridEndX = margin + (continuesRight ? actualColumnCount : actualColumnCount - 1) * cellSize
  const gridEndY = margin + (continuesDown ? actualRowCount : actualRowCount - 1) * cellSize

  // Vertical lines - draw for all visible columns
  for (let i = 0; i < actualColumnCount; i++) {
    const x = margin + i * cellSize
    svg += `<line x1="${x}" y1="${margin}" x2="${x}" y2="${gridEndY}" stroke="#000" stroke-width="1"/>`
  }

  // Horizontal lines - draw for all visible rows
  for (let i = 0; i < actualRowCount; i++) {
    const y = margin + i * cellSize
    svg += `<line x1="${margin}" y1="${y}" x2="${gridEndX}" y2="${y}" stroke="#000" stroke-width="1"/>`
  }

  // Star points based on board size
  const allStarPoints: [number, number][] = []
  if (boardSize === 9) {
    allStarPoints.push([2, 2], [2, 6], [4, 4], [6, 2], [6, 6])
  } else if (boardSize === 13) {
    allStarPoints.push([3, 3], [3, 9], [6, 6], [9, 3], [9, 9])
  } else if (boardSize === 19) {
    allStarPoints.push([3, 3], [3, 9], [3, 15], [9, 3], [9, 9], [9, 15], [15, 3], [15, 9], [15, 15])
  }

  // Only draw star points that are visible in our view
  for (const [row, col] of allStarPoints) {
    if (row < actualRowCount && col < actualColumnCount) {
      const x = margin + col * cellSize
      const y = margin + row * cellSize
      svg += `<circle cx="${x}" cy="${y}" r="3" fill="#000"/>`
    }
  }

  // Stones
  for (let row = 0; row < actualRowCount; row++) {
    for (let col = 0; col < actualColumnCount; col++) {
      const color = board.moves.get(Coordinate(row, col), EMPTY)
      if (color !== EMPTY) {
        const x = margin + col * cellSize
        const y = margin + row * cellSize

        if (color === BLACK) {
          // Black stone
          svg += `<circle cx="${x}" cy="${y}" r="${stoneRadius}" fill="#000" stroke="#000" stroke-width="1"/>`
        } else if (color === WHITE) {
          // White stone
          svg += `<circle cx="${x}" cy="${y}" r="${stoneRadius}" fill="#fff" stroke="#000" stroke-width="1"/>`
        }
      }
    }
  }

  // Annotations (text labels or shapes)
  if (annotations) {
    for (let row = 0; row < actualRowCount; row++) {
      for (let col = 0; col < actualColumnCount; col++) {
        const key = `${row},${col}`
        const annotation = annotations.get(key)
        if (annotation) {
          const x = margin + col * cellSize
          const y = margin + row * cellSize
          const color = board.moves.get(Coordinate(row, col), EMPTY)

          // Choose color based on stone color (or black for empty intersections)
          const drawColor = color === BLACK ? '#fff' : '#000'

          if (annotation.shape === 'text') {
            // Render as text
            svg += `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="${drawColor}">${annotation.label}</text>`
          } else if (annotation.shape === 'triangle') {
            // Render as triangle (pointing up)
            const size = stoneRadius * 0.8
            const x1 = x
            const y1 = y - size
            const x2 = x - size * 0.866 // cos(30°) * size
            const y2 = y + size * 0.5
            const x3 = x + size * 0.866
            const y3 = y + size * 0.5
            svg += `<polygon points="${x1},${y1} ${x2},${y2} ${x3},${y3}" fill="none" stroke="${drawColor}" stroke-width="2"/>`
          } else if (annotation.shape === 'square') {
            // Render as square
            const size = stoneRadius * 0.7
            svg += `<rect x="${x - size}" y="${y - size}" width="${size * 2}" height="${size * 2}" fill="none" stroke="${drawColor}" stroke-width="2"/>`
          } else if (annotation.shape === 'circle') {
            // Render as circle
            const radius = stoneRadius * 0.6
            svg += `<circle cx="${x}" cy="${y}" r="${radius}" fill="none" stroke="${drawColor}" stroke-width="2"/>`
          } else if (annotation.shape === 'x') {
            // Render as X
            const size = stoneRadius * 0.7
            svg += `<line x1="${x - size}" y1="${y - size}" x2="${x + size}" y2="${y + size}" stroke="${drawColor}" stroke-width="2"/>`
            svg += `<line x1="${x - size}" y1="${y + size}" x2="${x + size}" y2="${y - size}" stroke="${drawColor}" stroke-width="2"/>`
          }
        }
      }
    }
  }

  // Last move marker (circle)
  if (lastMove) {
    const row = lastMove.x
    const col = lastMove.y
    if (row >= 0 && row < actualRowCount && col >= 0 && col < actualColumnCount) {
      const x = margin + col * cellSize
      const y = margin + row * cellSize
      const color = board.moves.get(lastMove, EMPTY)

      // Choose color based on stone color
      const drawColor = color === BLACK ? '#fff' : '#000'
      const radius = stoneRadius * 0.5

      svg += `<circle cx="${x}" cy="${y}" r="${radius}" fill="none" stroke="${drawColor}" stroke-width="2.5"/>`
    }
  }

  svg += '</svg>'
  return svg
}
