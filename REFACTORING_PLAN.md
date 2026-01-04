# Refactoring Plan for godash-diagrams

## Current State Analysis

### File Structure
```
src/lib/
├── model.ts          (1475 lines - HUGE!)
├── validate.ts       (264 lines)
├── render.ts         (182 lines)
├── index.ts          (74 lines)
├── auto.ts           (16 lines)
└── version.ts        (1 line)
```

### What We Have

#### 1. **Diagram Types** (4 total)
- **StaticDiagram** (60-225): Display-only board with annotations
- **ProblemDiagram** (226-819): Interactive Go problems with solution trees
- **FreeplayDiagram** (828-1169): Free play with undo/redo
- **ReplayDiagram** (1170-1465): Navigate through a move sequence

#### 2. **Common Config Structure**
Every diagram follows this pattern:
```
type: <diagram-type>
<board-representation>
<option>: <value>
<option>: <value>
```

**Example:**
```
type: problem
X O .
O . O
. O .
black: A
white: B,C
solutions: A>B>C
to-play: black
ignore-ko: false
```

#### 3. **Shared Concerns** (Mixed in model.ts)

**Parsing:**
- Board parsing (validateBoard in validate.ts)
- Options parsing (parseOptions in validate.ts)
- Move sequence parsing (in ProblemDiagram, ReplayDiagram)
- Mark resolution (otherMarks)

**Rendering:**
- SVG generation (boardToSvg in render.ts)
- Button bars (inline in each diagram)
- Turn indicators (inline in each diagram)
- Capture count displays (duplicated 3x)

**Game Logic:**
- Ko rule enforcement (duplicated in Problem + Freeplay)
- Capture counting (duplicated in Problem + Freeplay + Replay)
- Move validation (scattered)
- Turn tracking (duplicated)

**State Management:**
- Board history (different approaches in each diagram)
- Current board state
- UI state (button enable/disable)

## Problems Identified

### 1. **Code Duplication**
- Capture count bars rendered identically in 3 places
- Turn indicators rendered identically in 3 places
- Ko rule logic duplicated in Problem + Freeplay
- Capture counting logic duplicated in all interactive diagrams
- Button styling constants duplicated

### 2. **Low Cohesion**
- model.ts contains: parsing, validation, game logic, rendering, state management
- Difficult to test individual concerns
- Hard to understand what each class is responsible for

### 3. **Tight Coupling**
- Diagram classes directly generate HTML strings
- Can't test rendering without full diagram instantiation
- Can't test game logic without DOM

### 4. **Poor Testability**
- 1475-line file is intimidating
- No clear boundaries for unit tests
- Side effects mixed with logic (render() does everything)

## Proposed Refactoring

### Phase 1: Extract Common UI Components

**Goal:** DRY up the duplicated UI rendering

**New files:**
```
src/lib/ui/
├── ButtonBar.ts       - Reusable button bar component
├── TurnIndicator.ts   - Turn indicator circle
├── CaptureBar.ts      - Capture count display
└── styles.ts          - Shared Material Design styles
```

**Benefits:**
- Single source of truth for UI components
- Easy to test rendering logic
- Consistent styling across diagrams

### Phase 2: Extract Game Logic

**Goal:** Separate pure game logic from UI

**New files:**
```
src/lib/game/
├── KoRule.ts          - Ko rule enforcement logic
├── CaptureCounter.ts  - Capture counting logic
├── MoveValidator.ts   - Move validation logic
└── TurnTracker.ts     - Turn tracking logic
```

**Benefits:**
- Pure functions, easy to test
- Reusable across diagram types
- Clear separation of concerns

### Phase 3: Split Diagram Types

**Goal:** One class per file

**New structure:**
```
src/lib/diagrams/
├── BaseDiagram.ts         - Shared base class/interface
├── StaticDiagram.ts       - ~150 lines
├── ProblemDiagram.ts      - ~300 lines
├── FreeplayDiagram.ts     - ~200 lines
└── ReplayDiagram.ts       - ~200 lines
```

**Benefits:**
- Easier to navigate
- Easier to test in isolation
- Clear boundaries

### Phase 4: Extract Parsing Logic

**Goal:** Separate parsing from diagram classes

**New files:**
```
src/lib/parsers/
├── DiagramParser.ts       - Main parser coordination
├── BoardParser.ts         - Board ASCII parsing (already in validate.ts)
├── OptionsParser.ts       - Options parsing (already in validate.ts)
├── SequenceParser.ts      - Move sequence parsing
└── MarkResolver.ts        - Resolve marks to coordinates
```

**Benefits:**
- Testable parsing logic
- Can validate diagrams without instantiating
- Better error messages

### Phase 5: Improve Type Safety

**New files:**
```
src/lib/types/
├── Board.ts              - Board-related types
├── Diagram.ts            - Diagram interfaces
├── Options.ts            - Config option types
├── Move.ts               - Move-related types
└── UI.ts                 - UI component types
```

**Benefits:**
- Better IDE autocomplete
- Catch errors at compile time
- Self-documenting code

## Proposed File Structure (After Refactoring)

```
src/lib/
├── diagrams/
│   ├── BaseDiagram.ts
│   ├── StaticDiagram.ts
│   ├── ProblemDiagram.ts
│   ├── FreeplayDiagram.ts
│   └── ReplayDiagram.ts
├── game/
│   ├── KoRule.ts
│   ├── CaptureCounter.ts
│   ├── MoveValidator.ts
│   └── TurnTracker.ts
├── parsers/
│   ├── DiagramParser.ts
│   ├── BoardParser.ts
│   ├── OptionsParser.ts
│   ├── SequenceParser.ts
│   └── MarkResolver.ts
├── ui/
│   ├── ButtonBar.ts
│   ├── TurnIndicator.ts
│   ├── CaptureBar.ts
│   └── styles.ts
├── types/
│   ├── Board.ts
│   ├── Diagram.ts
│   ├── Options.ts
│   ├── Move.ts
│   └── UI.ts
├── __tests__/
│   ├── diagrams/
│   ├── game/
│   ├── parsers/
│   └── ui/
├── index.ts
├── auto.ts
└── version.ts
```

## Testing Strategy

### Unit Tests (Pure Functions)
- `game/KoRule.test.ts` - Test ko detection logic
- `game/CaptureCounter.test.ts` - Test capture counting
- `parsers/BoardParser.test.ts` - Test board parsing
- `parsers/SequenceParser.test.ts` - Test sequence parsing
- `ui/ButtonBar.test.ts` - Test button bar rendering

### Integration Tests (Diagram Classes)
- `diagrams/StaticDiagram.test.ts` - Test static diagram rendering
- `diagrams/ProblemDiagram.test.ts` - Test problem solving flow
- `diagrams/FreeplayDiagram.test.ts` - Test free play interactions
- `diagrams/ReplayDiagram.test.ts` - Test replay navigation

### Snapshot Tests
- Test SVG output for consistency
- Test HTML structure for UI components

## Migration Strategy

1. **Start with extraction, not rewrite**
   - Extract one component at a time
   - Keep old code working
   - Write tests for extracted code

2. **Test-driven refactoring**
   - Write test for current behavior
   - Extract/refactor code
   - Ensure test still passes
   - Add more tests

3. **Incremental migration**
   - Phase 1: Extract UI components (low risk)
   - Phase 2: Extract game logic (medium risk)
   - Phase 3: Split files (low risk)
   - Phase 4: Extract parsers (medium risk)
   - Phase 5: Improve types (low risk)

## Success Criteria

- [ ] No file over 300 lines
- [ ] >80% test coverage on game logic
- [ ] Clear separation: parsing → logic → rendering
- [ ] Each component testable in isolation
- [ ] Duplicate code eliminated
- [ ] All existing functionality preserved

## Next Steps

1. Create `src/lib/ui/styles.ts` with shared constants
2. Extract `CaptureBar` component with tests
3. Update all 3 diagrams to use `CaptureBar`
4. Repeat for `TurnIndicator` and `ButtonBar`
5. Continue with game logic extraction
