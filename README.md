# Godash Diagrams

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

## License

ISC
