We will support a few diagram types.

- Static diagrams that render an effective image.
    - vNext
        - Annotations
        - Heatmaps
- Freeplay that allows user to play what they like.
    - vNext
        - Downloading SGFs.
- Auto-response that allows puzzles to be rendered.
    - vNext
        - Rendering the tree and allowing tree node browsing.
- Replay that allows full game SGFs to be played.
    - vNext
        - Rendering the tree, allowing variations.

## Formats ideas

### Static

```godash-diagram
static

. . . . . . . . .
. . . . . . . . .
. . + . . . + . .
. . . O . . . . .
. . . O X X . . .
. . X X O . . . .
. . + . O . + . .
. . . . . . . . .
. . . . . . . . .
```

### Freeplay

```godash-diagram
freeplay

. . . . . . . . .
. . . . . . . . .
. . + . . . + . .
. . . O . . . . .
. . . O X X . . .
. . X X O . . . .
. . + . O . + . .
. . . . . . . . .
. . . . . . . . .
```

```godash-diagram
freeplay

size: 19
```

### Auto-response

```godash-diagram
auto-response

. . . . . . . . .
. . . . . . . . .
. . + . . . + . .
. . . A . . . . .
. . . B C D . . .
. . E F G . . . .
. . + . H . + . .
. . . . . . . . .
. . . . . . . . .

start: black

C: Tengen opening
C->G: Attach
C->G->F: Hane
C->G->F->B: Cross-cut
```
