import { Board, Coordinate, BLACK, WHITE, EMPTY } from 'godash'

export function toError(message: string): string {
  return `
    <div style="background: #fee2e2; color: #991b1b; padding: 1rem; border-radius: 4px;">${message}</div>
  `
}

export function boardToSvg(board: Board, rowCount: number, columnCount: number): string {
  const boardSize = board.dimensions
  const cellSize = 30
  const margin = cellSize  // Full cell margin on each side
  const stoneRadius = cellSize * 0.4
  const fullColumns = boardSize === columnCount
  const fullRows = boardSize === rowCount
  const svgWidth = (fullColumns ? columnCount - 1 : columnCount) * cellSize + margin * 2
  const svgHeight = (fullRows ? rowCount - 1 : rowCount) * cellSize + margin * 2

  let svg = `<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">`

  // Background
  svg += `<rect width="${svgWidth}" height="${svgHeight}" fill="#dcb35c"/>`

  // Grid lines
  // Determine if board continues beyond visible area
  const continuesRight = columnCount < boardSize
  const continuesDown = rowCount < boardSize

  // Grid end points - extend to next position if board continues
  const gridEndX = margin + (continuesRight ? columnCount : columnCount - 1) * cellSize
  const gridEndY = margin + (continuesDown ? rowCount : rowCount - 1) * cellSize

  // Vertical lines - draw for all visible columns
  for (let i = 0; i < columnCount; i++) {
    const x = margin + i * cellSize
    svg += `<line x1="${x}" y1="${margin}" x2="${x}" y2="${gridEndY}" stroke="#000" stroke-width="1"/>`
  }

  // Horizontal lines - draw for all visible rows
  for (let i = 0; i < rowCount; i++) {
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
    if (row < rowCount && col < columnCount) {
      const x = margin + col * cellSize
      const y = margin + row * cellSize
      svg += `<circle cx="${x}" cy="${y}" r="3" fill="#000"/>`
    }
  }

  // Stones
  for (let row = 0; row < rowCount; row++) {
    for (let col = 0; col < columnCount; col++) {
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

  svg += '</svg>'
  return svg
}
