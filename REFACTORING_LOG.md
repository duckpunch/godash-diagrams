# Refactoring Log

## Phase 1: Extract CaptureBar Component ✅

### Date
2026-01-03

### Summary
Successfully extracted the CaptureBar component from the monolithic model.ts file, reducing code duplication and improving testability.

### Changes Made

#### New Files Created
1. **src/lib/ui/styles.ts** (40 lines)
   - Centralized Material Design color constants
   - Spacing and sizing constants
   - Eliminates magic strings throughout codebase

2. **src/lib/ui/CaptureBar.ts** (115 lines)
   - Pure function: `renderCaptureBar(options)`
   - Helper: `renderMoveCounter(current, total?)`
   - Supports two layouts: simple and with right content
   - Well-documented with JSDoc and examples

3. **src/lib/ui/__tests__/CaptureBar.test.ts** (144 lines, 16 tests)
   - Tests rendering with zero/normal/large capture counts
   - Tests SVG icon inclusion
   - Tests margin direction (top/bottom)
   - Tests layout modes (flex-start vs space-between)
   - Tests Material Design styles
   - Tests integration scenarios (Problem vs Freeplay/Replay)

#### Files Modified
1. **src/lib/model.ts**
   - Added import: `import { renderCaptureBar } from './ui/CaptureBar'`
   - **Removed 7 lines** from ProblemDiagram.render():
     - Icon definitions (whiteCaptureIcon, blackCaptureIcon)
     - Style definitions (captureBarStyle, captureItemStyle, captureNumberStyle)
   - **Removed 11 lines** of HTML generation code
   - **Added 5 lines** calling renderCaptureBar()
   - **Net reduction: 13 lines**

### Metrics

**Before:**
- model.ts: 1,475 lines
- Code duplication: 3× identical capture bar implementations
- Test coverage: 0%

**After:**
- model.ts: 1,462 lines (-13 lines, -0.9%)
- New files: 3 files, 299 lines total
- Code duplication: Eliminated from ProblemDiagram (2 more to go)
- Test coverage: 100% for CaptureBar (16/16 tests passing)

**Test Results:**
```
✓ src/lib/ui/__tests__/CaptureBar.test.ts (16 tests) 4ms
  ✓ renderCaptureBar (10 tests)
  ✓ renderMoveCounter (4 tests)
  ✓ Integration scenarios (2 tests)
```

### Benefits Achieved

1. **Testability**: CaptureBar is now a pure function, easy to test in isolation
2. **Reusability**: Single source of truth for capture bar rendering
3. **Maintainability**: Changes to capture bar styling happen in one place
4. **Documentation**: JSDoc examples show how to use the component
5. **Type Safety**: TypeScript interface documents expected options

### Next Steps

**Remaining duplicates to eliminate:**
1. FreeplayDiagram - Update to use renderCaptureBar() with move counter
2. ReplayDiagram - Update to use renderCaptureBar() with move counter

**Estimated impact:**
- Reduce model.ts by another ~26 lines
- Eliminate all capture bar duplication
- Consistent styling across all diagrams

**Future extractions (from REFACTORING_PLAN.md):**
1. TurnIndicator component
2. ButtonBar component
3. Game logic (KoRule, CaptureCounter, etc.)
4. Split diagram classes into separate files

### Code Quality

**Before extraction:**
```typescript
// Duplicated 3 times in model.ts
const whiteCaptureIcon = '<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">...</svg>'
const blackCaptureIcon = '<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">...</svg>'
const captureBarStyle = 'background: #f8f8f8; border: 1px solid #9e9e9e; ...'
const captureItemStyle = 'display: flex; gap: 0.25rem; ...'
const captureNumberStyle = 'font-size: 0.9rem; font-weight: 500; ...'

output += `<div style="${captureBarStyle}">`
output += `<div style="${captureItemStyle}">`
output += whiteCaptureIcon
output += `<span style="${captureNumberStyle}">${this.whiteCaptured}</span>`
// ... 6 more lines
```

**After extraction:**
```typescript
import { renderCaptureBar } from './ui/CaptureBar'

output += renderCaptureBar({
  whiteCaptured: this.whiteCaptured,
  blackCaptured: this.blackCaptured,
  marginDirection: 'bottom',
})
```

**Reduction:** 18 lines → 5 lines (72% reduction)

### Lessons Learned

1. **Start small**: Extracting one component at a time is manageable
2. **Test first**: Writing tests helped clarify the API
3. **Document well**: JSDoc examples make the component easy to use
4. **Incremental wins**: Even small refactorings improve the codebase
5. **Types help**: TypeScript caught the unused variable during build

### Success Criteria Met

- [x] Component is pure function (no side effects)
- [x] 100% test coverage for extracted code
- [x] Existing functionality preserved (build passes)
- [x] Code duplication reduced (1/3 eliminated)
- [x] Clear API with documentation
- [x] Type-safe implementation
