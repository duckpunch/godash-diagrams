# Godash Diagrams

[![npm](https://img.shields.io/npm/v/godash-diagrams)](https://www.npmjs.com/package/godash-diagrams)
[![CI](https://github.com/duckpunch/godash-diagrams/actions/workflows/ci.yml/badge.svg)](https://github.com/duckpunch/godash-diagrams/actions/workflows/ci.yml)

A diagramming library for [Go](https://en.wikipedia.org/wiki/Go_(game)), inspired by [Mermaid](https://mermaid.js.org/), and built on [Godash](https://duckpunch.github.io/godash/).

[**Try it live →**](https://duckpunch.github.io/godash-diagrams/)

## Installation

```bash
npm install godash-diagrams
```

## Usage

```javascript
import { init } from 'godash-diagrams'

init('#app', {
  diagramSource: `static

. . . . . . . . .
. . . . . . . . .
. . + . . . + . .
. . . O . . . . .
. . . O X X . . .
. . X X O . . . .
. . + . O . + . .
. . . . . . . . .
. . . . . . . . .
`
})
```

### Plain HTML

```html
<script src="https://unpkg.com/godash-diagrams"></script>
<div id="app"></div>
<script>
  GodashDiagrams.init('#app', {
    diagramSource: `static

O .
. X
`
  })
</script>
```

### Auto-init (no JavaScript required)

```html
<script src="https://unpkg.com/godash-diagrams/dist/godash-diagrams.auto.iife.js"></script>
<div class="godash-diagram">
static

O .
. X
</div>
```

## License

ISC
