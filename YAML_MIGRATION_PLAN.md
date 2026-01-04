# YAML Migration Plan (Direct Migration)

## Overview

Since the library isn't publicized yet, we can do a **direct migration** to YAML without backward compatibility. This is much simpler and cleaner.

## Current vs YAML Format

### Current Format
```
static

. . . X O
. X O . .
X O . . .

black: A,B
white: D
triangle: C
area-colors: r=red, b=blue
```

### New YAML Format
```yaml
static

. . . X O
. X O . .
X O . . .

---
black: [A, B]
white: [D]
triangle: [C]
area-colors:
  r: red
  b: blue
```

## Recommended Library: `yaml`

**Package**: `yaml` (by Eemeli Aro)
- npm: https://www.npmjs.com/package/yaml
- Excellent TypeScript support
- Modern, actively maintained
- ~20KB bundle size
- Better error messages than js-yaml
- YAML 1.2 spec compliant

Install:
```bash
npm install yaml
```

## Simple Implementation Plan

### 1. Install Dependency
```bash
npm install yaml
```

### 2. Create YAML Parser

**File**: `src/lib/parseYaml.ts`

```typescript
import YAML from 'yaml'

export function parseYaml(
  yamlContent: string
): Record<string, string | string[] | Record<string, string>> {
  try {
    const parsed = YAML.parse(yamlContent)

    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error('Configuration must be a YAML object')
    }

    // Normalize values
    const normalized: Record<string, string | string[] | Record<string, string>> = {}

    for (const [key, value] of Object.entries(parsed)) {
      if (Array.isArray(value)) {
        // Keep arrays, convert elements to strings
        normalized[key] = value.map(v => String(v))
      } else if (typeof value === 'object' && value !== null) {
        // For nested objects (e.g., area-colors)
        const nested: Record<string, string> = {}
        for (const [k, v] of Object.entries(value)) {
          nested[k] = String(v)
        }
        normalized[key] = nested
      } else {
        // Scalar values
        normalized[key] = String(value)
      }
    }

    return normalized
  } catch (error) {
    if (error instanceof YAML.YAMLParseError) {
      throw new Error(`YAML error at line ${error.linePos?.[0]?.line}: ${error.message}`)
    }
    throw error
  }
}

export function extractYamlSection(lines: string[], startIndex: number): string {
  // Find the --- separator
  let yamlStartIndex = -1
  for (let i = startIndex; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      yamlStartIndex = i + 1
      break
    }
  }

  if (yamlStartIndex === -1) {
    // No YAML config
    return ''
  }

  // Extract all lines after ---
  return lines.slice(yamlStartIndex).join('\n')
}
```

### 3. Replace parseOptions Usage

**In each diagram file**, replace:

**Before:**
```typescript
const parsedOptions = parseOptions(lines, configStartIndex)
const blackOption = parsedOptions.black
```

**After:**
```typescript
const yamlContent = extractYamlSection(lines, configStartIndex)
const config = yamlContent ? parseYaml(yamlContent) : {}
const blackOption = config.black
```

### 4. Update Each Diagram

#### StaticDiagram.ts
```typescript
import { parseYaml, extractYamlSection } from '../parseYaml'

// In constructor:
const yamlContent = extractYamlSection(lines, configStartIndex)
const config = yamlContent ? parseYaml(yamlContent) : {}

// Use config instead of parsedOptions
const ignoreRulesOption = config['ignore-rules']
const areaColorsOption = config['area-colors']  // Now an object!

// For area-colors, it's already an object:
if (areaColorsOption && typeof areaColorsOption === 'object') {
  for (const [prefix, color] of Object.entries(areaColorsOption)) {
    if (prefix.length === 1 && /^[a-z]$/.test(prefix)) {
      this.areaColors.set(prefix, color)
    } else {
      throw new Error(`Invalid area prefix '${prefix}'`)
    }
  }
}
```

#### ProblemDiagram.ts
Problem sequences stay as arrays of strings (no change):
```yaml
---
to-play: black
problem:
  - "1:correct"
  - "2:*:wrong"
```

#### FreeplayDiagram.ts
```typescript
const yamlContent = extractYamlSection(lines, configStartIndex)
const config = yamlContent ? parseYaml(yamlContent) : {}

const colorValue = config.color || 'alternate'
const ignoreKoOption = config['ignore-ko']
```

#### ReplayDiagram.ts
```typescript
const yamlContent = extractYamlSection(lines, configStartIndex)
const config = yamlContent ? parseYaml(yamlContent) : {}

const startColorOption = config.start
```

### 5. Delete Legacy Parser

**Remove from `validate.ts`:**
```typescript
export function parseOptions(...) { ... }  // DELETE THIS (~30 lines)
```

**Remove imports:**
```typescript
import { parseOptions } from '../validate'  // DELETE from all diagrams
```

### 6. Update Examples

Update `src/main.ts`:

**Before:**
```typescript
const examples = {
  static: `static

. X O .

black: A,B
white: D
`,
  // ...
}
```

**After:**
```typescript
const examples = {
  static: `static

. X O .

---
black: [A, B]
white: [D]
`,
  // ...
}
```

### 7. Write Tests

**File**: `src/lib/__tests__/parseYaml.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { parseYaml, extractYamlSection } from '../parseYaml'

describe('parseYaml', () => {
  it('parses simple key-value pairs', () => {
    const yaml = 'black: A\nwhite: B'
    expect(parseYaml(yaml)).toEqual({ black: 'A', white: 'B' })
  })

  it('parses arrays', () => {
    const yaml = 'black: [A, B, C]'
    expect(parseYaml(yaml)).toEqual({ black: ['A', 'B', 'C'] })
  })

  it('parses multi-line arrays', () => {
    const yaml = `black:
  - A
  - B
  - C`
    expect(parseYaml(yaml)).toEqual({ black: ['A', 'B', 'C'] })
  })

  it('parses nested objects', () => {
    const yaml = `area-colors:
  r: red
  b: blue`
    expect(parseYaml(yaml)).toEqual({
      'area-colors': { r: 'red', b: 'blue' }
    })
  })

  it('parses nested objects (flow style)', () => {
    const yaml = 'area-colors: {r: red, b: blue}'
    expect(parseYaml(yaml)).toEqual({
      'area-colors': { r: 'red', b: 'blue' }
    })
  })

  it('throws helpful error on invalid YAML', () => {
    const yaml = 'black: [A, B'  // Missing ]
    expect(() => parseYaml(yaml)).toThrow('YAML error')
  })

  it('handles empty YAML', () => {
    expect(parseYaml('')).toEqual({})
  })
})

describe('extractYamlSection', () => {
  it('extracts YAML after --- separator', () => {
    const lines = ['board', '---', 'black: A', 'white: B']
    expect(extractYamlSection(lines, 0)).toBe('black: A\nwhite: B')
  })

  it('returns empty string if no --- found', () => {
    const lines = ['board', 'black: A']
    expect(extractYamlSection(lines, 0)).toBe('')
  })

  it('handles --- with leading whitespace', () => {
    const lines = ['board', '  ---  ', 'black: A']
    expect(extractYamlSection(lines, 0)).toBe('black: A')
  })
})
```

### 8. Update Documentation

Update README with YAML examples:

```markdown
## Examples

### Static Diagram
\`\`\`yaml
static

. X O .
. . . .

---
black: [A, B]
white: [C]
triangle: [D]
area-colors:
  r: red
  b: blue
\`\`\`

### Problem Diagram
\`\`\`yaml
problem

. X . .
X . O .

---
to-play: black
problem:
  - "A:correct"
  - "B:wrong"
\`\`\`

### Freeplay Diagram
\`\`\`yaml
freeplay

. . . .
. . . .

---
color: black  # or: white, alternate
ignore-ko: true
\`\`\`

### Replay Diagram
\`\`\`yaml
replay

. 1 2 .

---
start: black
\`\`\`
```

## Implementation Checklist

- [ ] Install `yaml` package
- [ ] Create `src/lib/parseYaml.ts`
  - [ ] `parseYaml()` function
  - [ ] `extractYamlSection()` function
  - [ ] Handle nested objects
  - [ ] Error handling with line numbers
- [ ] Update StaticDiagram
  - [ ] Replace parseOptions with parseYaml
  - [ ] Update area-colors handling
  - [ ] Remove parseOptions import
- [ ] Update ProblemDiagram
  - [ ] Replace parseOptions with parseYaml
  - [ ] Remove parseOptions import
- [ ] Update FreeplayDiagram
  - [ ] Replace parseOptions with parseYaml
  - [ ] Remove parseOptions import
- [ ] Update ReplayDiagram
  - [ ] Replace parseOptions with parseYaml
  - [ ] Remove parseOptions import
- [ ] Delete `parseOptions` from validate.ts
- [ ] Update examples in `src/main.ts`
- [ ] Write tests for parseYaml
- [ ] Update README with YAML examples
- [ ] Test all diagram types work
- [ ] Build and verify

## Benefits of Direct Migration

1. **No complexity** - No dual-format support needed
2. **Cleaner code** - No format detection logic
3. **Faster** - Single implementation path
4. **Better UX** - One format to learn
5. **Less code** - ~150 lines deleted, ~80 new lines
6. **Net reduction**: ~70 lines of code

## YAML Examples by Diagram Type

### Static
```yaml
---
black: [A, B, C]
white: [D, E]
triangle: [F]
square: [G]
circle: [H]
x: [I]
area-colors:
  r: red
  b: "#0000ff"
ignore-rules: true
```

### Problem
```yaml
---
to-play: black
problem:
  - "1:correct"
  - "2:*:wrong"
  - "3:4:wrong"
  - "3:5:correct"
```

### Freeplay
```yaml
---
color: alternate  # black, white, or alternate
ignore-ko: false
```

### Replay
```yaml
---
start: black
```

## Timeline

**Total estimated time**: 3-4 hours
- parseYaml implementation: 1 hour
- Update diagrams: 1.5 hours
- Tests: 1 hour
- Examples & docs: 0.5 hours

Much faster than the phased approach!

## Special Handling Notes

### area-colors
Now properly structured:
```yaml
# Old format (string parsing):
area-colors: r=red, b=blue

# New format (YAML object):
area-colors:
  r: red
  b: blue
```

In code, this is simpler:
```typescript
// Before: string parsing of "r=red, b=blue"
const pairs = entry.split(',')...

// After: already an object
for (const [prefix, color] of Object.entries(areaColorsOption)) {
  this.areaColors.set(prefix, color)
}
```

### Arrays
```yaml
# Compact form
black: [A, B, C]

# Multi-line form
black:
  - A
  - B
  - C

# Both parse to same array
```

### Booleans
```yaml
# YAML recognizes booleans
ignore-rules: true

# No need for 'true' or '1' string checking
const ignoreRules = config['ignore-rules'] === true
```

### Comments
```yaml
# This is a comment
black: [A, B]  # End-line comment

# Multi-line comments
# are supported
# naturally
```

## Error Handling Improvements

YAML parser provides better errors:

**Before:**
```
Error: Invalid configuration
```

**After:**
```
YAML error at line 3: Unexpected token, expected ']'
```

The `yaml` library gives line numbers and specific error messages automatically.
