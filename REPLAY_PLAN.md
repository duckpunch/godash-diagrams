# Replay Diagram Implementation Plan

## Overview
A replay diagram displays a sequence of numbered moves that users can step through. Based on the format in IDEAS.md:

```
replay

.  .  .  .  .  .  .  .  .
.  .  1  .  .  .  3  .  .
.  .  .  .  .  .  .  .  .
.  . 10  8  6  .  .  .  .
.  .  4  7  5  .  2  .  .
. 11  9  .  .  .  .  .  .
.  .  .  .  .  .  .  .  .
```

## Features

### Core Functionality
1. **Parse numbered positions**: Extract move numbers (1, 2, 3...) from board
2. **Build move sequence**: Create ordered list of moves based on numbers
3. **Navigate through moves**: Step forward/backward through the sequence
4. **Display current position**: Show board state up to current move
5. **Move annotations**: Show move numbers on stones (optionally)
6. **Last move marker**: Circle on the most recent move

### UI Components
- Board display showing current position
- Move counter: "Move 5 / 11" or "Move 5 (Black)"
- Navigation buttons:
  - `|<` First move (go to beginning)
  - `<` Previous move (step back)
  - `>` Next move (step forward)
  - `>|` Last move (go to end)
- Optional: Play/Pause button for auto-advance
- Optional: Speed control for auto-play

### Options
```
replay

<board with numbered moves>

size: 19                  # Board size (default: inferred from board)
start-color: black        # Which color plays move 1 (default: black)
show-numbers: true        # Show move numbers on stones (default: false)
initial-move: 5           # Start at move 5 (default: 0 = start position)
```

## Implementation Details

### 1. Parsing
**File**: `src/lib/validate.ts`

- Numbers (1-999+) are valid tokens when `validateCharacters: false`
- Extract all numbered positions into `otherMarks` (e.g., `{"1": [coord], "2": [coord], ...}`)
- Validate:
  - All numbers are positive integers
  - Numbers form a consecutive sequence (1, 2, 3... no gaps)
  - No duplicate numbers
  - Each number appears exactly once

**Data structure**:
```typescript
interface ParsedMove {
  moveNumber: number
  coordinate: Coordinate
  color: Color  // Determined by odd/even (1=black, 2=white, etc.)
}
```

### 2. ReplayDiagram Class
**File**: `src/lib/model.ts`

```typescript
export class ReplayDiagram implements IDiagram {
  private parsedBoard: ParsedBoard
  private element: Element
  private moveSequence: ParsedMove[]  // Ordered list of moves
  private currentMoveIndex: number    // -1 = starting position, 0 = after move 1, etc.
  private currentBoard: Board
  private initialBoard: Board
  private showNumbers: boolean

  constructor(element: Element, lines: string[])
  private buildMoveSequence(): void
  private rebuildBoard(): void
  private goToMove(index: number): void
  private next(): void
  private previous(): void
  private first(): void
  private last(): void
  render(): void
}
```

### 3. Building Move Sequence
```typescript
private buildMoveSequence(): void {
  // Parse otherMarks to extract numbered positions
  // Sort by move number
  // Determine color based on start-color and odd/even
  // Validate sequence is consecutive
  // Return ordered array of ParsedMove
}
```

### 4. Board Reconstruction
Similar to FreeplayDiagram:
```typescript
private rebuildBoard(): void {
  let board = this.initialBoard

  // Apply moves up to currentMoveIndex
  for (let i = 0; i <= this.currentMoveIndex; i++) {
    const move = this.moveSequence[i]
    board = addMove(board, Move(move.coordinate, move.color))
  }

  this.currentBoard = board
}
```

### 5. Rendering
```typescript
render(): void {
  // Determine which move numbers to show (if show-numbers is true)
  const annotations = new Map<string, AnnotationInfo>()

  if (this.showNumbers) {
    // Add move numbers as text annotations for visible moves
    for (let i = 0; i <= this.currentMoveIndex; i++) {
      const move = this.moveSequence[i]
      const key = `${move.coordinate.x},${move.coordinate.y}`
      annotations.set(key, {
        label: String(move.moveNumber),
        shape: 'text'
      })
    }
  }

  // Get last move for marker
  let lastMove: Coordinate | undefined
  if (this.currentMoveIndex >= 0) {
    lastMove = this.moveSequence[this.currentMoveIndex].coordinate
  }

  // Generate SVG
  const boardSvg = boardToSvg(this.currentBoard, rowCount, columnCount, annotations, lastMove)

  // Add move counter and navigation buttons
  // Similar to FreeplayDiagram UI
}
```

### 6. Navigation Buttons
```html
<div>
  <span>Move {currentMoveIndex + 1} / {totalMoves} ({currentColor})</span>
</div>
<div>
  <button id="first">|<</button>
  <button id="prev"><</button>
  <button id="next">></button>
  <button id="last">>|</button>
</div>
```

## Edge Cases

1. **Empty board at start**: `currentMoveIndex = -1` shows initial position
2. **Initial stones**: Support X/O tokens for stones present before move 1
   ```
   replay

   .  .  X  .  .
   .  1  O  2  .
   .  .  3  .  .
   ```
3. **Non-consecutive numbers**: Throw validation error
4. **Duplicate numbers**: Throw validation error
5. **Illegal moves**: Handle with error message (similar to freeplay)

## Future Enhancements (v2)

1. **Auto-play**: Automatically advance moves with timer
2. **Speed control**: Adjust auto-play speed
3. **Comments**: Support move comments/annotations
   ```
   1: Great opening!
   5: Interesting choice
   ```
4. **Variations**: Support branching move sequences (complex)
5. **SGF import**: Parse SGF files directly

## Testing Strategy

1. **Basic sequence**: Simple 1-5 move sequence
2. **Full game**: 50+ moves
3. **With initial stones**: X/O mixed with numbers
4. **Navigation**: Test all button combinations
5. **Edge cases**: Empty board, single move, illegal moves
6. **Options**: Test all configuration options

## Integration Points

### model.ts
- Add `ReplayDiagram` class
- Export type for move sequence

### index.ts
- Add 'replay' to `DIAGRAM_TYPES`
- Add case in `renderDiagram` switch statement

### validate.ts
- Update to recognize numbers as valid tokens when `validateCharacters: false`

## Estimated Complexity
- **Parsing**: Medium (similar to problem diagram)
- **UI**: Medium (similar to freeplay with different controls)
- **Overall**: ~2-3 hours for basic implementation

## Open Questions

1. Should move numbers always be shown, or only as an option?
2. Should we support range notation (e.g., "1-5" shows only those moves)?
3. How to handle passes? Use "P" token or special notation?
4. Should we support keyboard shortcuts (arrow keys)?
5. Support for move comments in the initial version?
