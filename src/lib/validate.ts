export function validateBoardRows(lines: string[], startIndex: number): [number, number] {
  // Collect consecutive non-empty board rows
  const boardRows: string[] = []
  let endIndex = startIndex

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i]
    if (line.trim() === '') {
      // Empty line ends board definition
      endIndex = i
      break
    }
    boardRows.push(line)
    endIndex = i + 1
  }

  if (boardRows.length === 0) {
    throw new Error('Board definition is empty')
  }

  // Validate all rows have same number of non-space characters (rectangle)
  const columnCounts = boardRows.map(row => row.replace(/\s/g, '').length)
  const firstColumnCount = columnCounts[0]

  if (!columnCounts.every(count => count === firstColumnCount)) {
    throw new Error('All board rows must have the same number of non-space characters')
  }

  return [startIndex, endIndex]
}
