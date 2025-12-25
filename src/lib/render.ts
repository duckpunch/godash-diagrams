import { Board, Coordinate, BLACK, WHITE, EMPTY } from 'godash'

export function toError(message: string): string {
  return `
    <div style="background: #fee2e2; color: #991b1b; padding: 1rem; border-radius: 4px;">${message}</div>
  `
}

export function boardToSvg(board: Board): string {
  const dimensions = board.dimensions
  const cellSize = 30
  const margin = 20
  const stoneRadius = cellSize * 0.4
  const svgSize = (dimensions - 1) * cellSize + margin * 2

  let svg = `<svg width="${svgSize}" height="${svgSize}" xmlns="http://www.w3.org/2000/svg">`

  // Background
  svg += `<rect width="${svgSize}" height="${svgSize}" fill="#dcb35c"/>`

  // Grid lines
  const gridEnd = margin + (dimensions - 1) * cellSize
  for (let i = 0; i < dimensions; i++) {
    const pos = margin + i * cellSize
    // Vertical lines
    svg += `<line x1="${pos}" y1="${margin}" x2="${pos}" y2="${gridEnd}" stroke="#000" stroke-width="1"/>`
    // Horizontal lines
    svg += `<line x1="${margin}" y1="${pos}" x2="${gridEnd}" y2="${pos}" stroke="#000" stroke-width="1"/>`
  }

  // Star points (for standard sizes)
  const starPoints: [number, number][] = []
  if (dimensions === 9) {
    starPoints.push([2, 2], [2, 6], [4, 4], [6, 2], [6, 6])
  } else if (dimensions === 13) {
    starPoints.push([3, 3], [3, 9], [6, 6], [9, 3], [9, 9])
  } else if (dimensions === 19) {
    starPoints.push([3, 3], [3, 9], [3, 15], [9, 3], [9, 9], [9, 15], [15, 3], [15, 9], [15, 15])
  }

  for (const [row, col] of starPoints) {
    const x = margin + col * cellSize
    const y = margin + row * cellSize
    svg += `<circle cx="${x}" cy="${y}" r="3" fill="#000"/>`
  }

  // Stones
  for (let row = 0; row < dimensions; row++) {
    for (let col = 0; col < dimensions; col++) {
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
