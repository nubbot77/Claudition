"""Turn an Excalidraw whiteboard into a short text description for the interviewer.

The browser sends the raw Excalidraw elements with a system-design answer. Raw elements are
verbose (coordinates, styles, seeds), so the model gets only what a human interviewer would read
off the board: the labelled components, who connects to whom, and free-floating notes.
"""

from __future__ import annotations

from typing import Any

SHAPES = {"rectangle", "ellipse", "diamond", "frame", "image"}
CONNECTORS = {"arrow", "line"}
MAX_ELEMENTS = 400
MAX_LABEL = 80
SNAP_PX = 40  # an unbound arrow end this close to a shape counts as touching it


def _clean(text: Any) -> str:
    return " ".join(str(text or "").split())[:MAX_LABEL]


def _bbox_contains(el: dict[str, Any], x: float, y: float, pad: float) -> bool:
    left, top = float(el.get("x", 0)), float(el.get("y", 0))
    right, bottom = left + float(el.get("width", 0)), top + float(el.get("height", 0))
    return left - pad <= x <= right + pad and top - pad <= y <= bottom + pad


def describe(elements: Any) -> str:
    """Plain-text summary of the board; empty string when nothing meaningful is drawn."""
    if not isinstance(elements, list):
        return ""
    live = [e for e in elements[:MAX_ELEMENTS] if isinstance(e, dict) and not e.get("isDeleted")]
    by_id = {e.get("id"): e for e in live}

    # text bound to a shape or arrow is that element's label; other text is a free note
    labels: dict[str, list[str]] = {}
    notes: list[str] = []
    for e in live:
        if e.get("type") != "text" or not _clean(e.get("text")):
            continue
        container = e.get("containerId")
        if container in by_id:
            labels.setdefault(container, []).append(_clean(e.get("text")))
        else:
            notes.append(_clean(e.get("text")))

    shapes = [e for e in live if e.get("type") in SHAPES]

    def name(el: dict[str, Any] | None) -> str:
        if el is None:
            return "(unconnected end)"
        label = " ".join(labels.get(el.get("id"), [])) or _clean(el.get("name"))
        return label or f"unlabelled {el.get('type')}"

    def endpoint(arrow: dict[str, Any], which: str) -> dict[str, Any] | None:
        binding = arrow.get(f"{which}Binding") or {}
        if binding.get("elementId") in by_id:
            return by_id[binding["elementId"]]
        points = arrow.get("points") or [[0, 0]]
        px, py = points[0] if which == "start" else points[-1]
        x, y = float(arrow.get("x", 0)) + float(px), float(arrow.get("y", 0)) + float(py)
        hits = [s for s in shapes if _bbox_contains(s, x, y, SNAP_PX)]
        # the smallest box wins, so a component inside a frame beats the frame
        return min(hits, key=lambda s: float(s.get("width", 0)) * float(s.get("height", 0)), default=None)

    connections: list[str] = []
    for e in live:
        if e.get("type") not in CONNECTORS:
            continue
        a, b = endpoint(e, "start"), endpoint(e, "end")
        if a is None and b is None:
            continue
        head_start, head_end = bool(e.get("startArrowhead")), bool(e.get("endArrowhead"))
        if e.get("type") == "arrow" and not head_start and e.get("endArrowhead", "arrow") is not None:
            head_end = True  # Excalidraw arrows default to an end arrowhead
        if head_start and not head_end:
            a, b, head_start, head_end = b, a, False, True
        sign = "<->" if head_start and head_end else "->" if head_end else "--"
        label = " ".join(labels.get(e.get("id"), []))
        connections.append(f"{name(a)} {sign} {name(b)}" + (f" ({label})" if label else ""))

    components = [name(s) for s in shapes]
    freehand = sum(1 for e in live if e.get("type") == "freedraw")
    if not components and not connections and not notes:
        return ""

    lines = [f"Whiteboard: {len(components)} components, {len(connections)} connections."]
    if components:
        lines.append("Components: " + "; ".join(components))
    if connections:
        lines.append("Connections: " + "; ".join(connections))
    if notes:
        lines.append("Notes on the board: " + "; ".join(f'"{n}"' for n in notes))
    if freehand:
        lines.append(f"Also {freehand} freehand strokes (not readable as text).")
    return "\n".join(lines)
