# Working with Excalidraw

Mermaid stays the source of truth in docs. Excalidraw is for sketching and rearranging visually.

## Mermaid → Excalidraw (user wants to edit visually)

Tell the user to open excalidraw.com (or the VS Code Excalidraw extension on a `.excalidraw` file), then use **More tools → Mermaid to Excalidraw** and paste the Mermaid block. Flowcharts convert to editable shapes; some other diagram types come in as a single image.

## Excalidraw → understanding (user shares a `.excalidraw` file)

The file is JSON, and most of it is layout noise. Extract only the meaning:

```bash
jq -r '
  [.elements[] | select(.isDeleted != true)] as $els
  | def name_of($id):
      if $id == null then "?"
      else ([$els[] | select(.containerId == $id) | .text] | first)
        // ([$els[] | select(.id == $id) | .type] | first) // "?" end;
  "NODES:", ($els[] | select(.type | IN("rectangle","ellipse","diamond")) | "- \(name_of(.id))"),
  "EDGES:", ($els[] | select(.type == "arrow")
      | "- \(name_of(.startBinding.elementId)) -> \(name_of(.endBinding.elementId))"),
  "FREE TEXT:", ($els[] | select(.type == "text" and .containerId == null) | "- \(.text)")
' diagram.excalidraw
```

Notes:
- Box labels are separate `text` elements whose `containerId` is the box's `id`.
- Arrows connect shapes through `startBinding.elementId` / `endBinding.elementId`. An arrow without bindings (`? -> ?`) was drawn freehand; ask the user what it means rather than guessing.
- Freehand drawings (`freedraw`) carry no semantics; ignore them unless the user explains them.

## Excalidraw → back to docs

When a sketch settles a decision, translate it into a Mermaid diagram in `docs/ARCHITECTURE.md` or the relevant spec. Show the user the Mermaid version to confirm nothing was lost, and record an ADR if the decision qualifies.
