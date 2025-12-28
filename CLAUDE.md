# Project Context for Claude

## Overview
This project is **godash-diagrams** - a library that outputs a JS file for inclusion in plain HTML pages to provide diagram rendering functionality.

## Project Structure
- **Library code**: `src/lib/` - The actual library that gets built and distributed
- **Demo code**: `src/main.ts` and `index.html` - Demo/playground for development
- **Build output**: `dist/` - Contains the built library files
  - `godash-diagrams.js` (ESM)
  - `godash-diagrams.umd.cjs` (UMD for script tags)
  - Type declarations

## External References
The `external/` directory contains checked-out repos for reference:
- **godash** - The core library this project depends on
- **immutable-js** - Underlying immutability library used by godash

These are for reference purposes during development.

## Development
- `npm run dev` - Runs dev server with demo page (expected to be run by user, not Claude)
- `npm run build` - Builds library for distribution

## Library API
Currently supports:
- `GodashDiagrams.init(selector?, options?)` - Initialize diagrams
- `GodashDiagrams.version` - Library version

### Diagram Types
- **static** - Currently the only supported type (more to come, similar to Mermaid)

## Usage in Plain HTML
```html
<script src="godash-diagrams.umd.cjs"></script>
<script>
  GodashDiagrams.init('.my-diagrams')
</script>
```
