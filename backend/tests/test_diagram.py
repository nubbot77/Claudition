from __future__ import annotations

from typing import Any

from app.diagram import describe


def _shape(id_: str, x: float, y: float, type_: str = "rectangle", w: float = 100, h: float = 60) -> dict[str, Any]:
    return {"id": id_, "type": type_, "x": x, "y": y, "width": w, "height": h}


def _label(container: str, text: str) -> dict[str, Any]:
    return {"id": f"t-{container}", "type": "text", "text": text, "containerId": container, "x": 0, "y": 0}


def _arrow(id_: str, start: str | None, end: str | None, **extra: Any) -> dict[str, Any]:
    return {
        "id": id_, "type": "arrow", "x": 0, "y": 0, "points": [[0, 0], [10, 0]],
        "startBinding": {"elementId": start} if start else None,
        "endBinding": {"elementId": end} if end else None,
        "startArrowhead": None, "endArrowhead": "arrow", **extra,
    }


def test_empty_or_invalid_board_gives_nothing() -> None:
    assert describe([]) == ""
    assert describe(None) == ""
    assert describe([{"id": "x", "type": "rectangle", "isDeleted": True}]) == ""


def test_labelled_components_and_bound_arrows() -> None:
    board = [
        _shape("lb", 0, 0), _label("lb", "Load\nBalancer"),
        _shape("api", 300, 0), _label("api", "API servers"),
        _shape("db", 600, 0, "ellipse"), _label("db", "Postgres"),
        _arrow("a1", "lb", "api"),
        _arrow("a2", "api", "db"), _label("a2", "writes"),
        {"id": "n", "type": "text", "text": "read heavy 100:1", "x": 0, "y": 300},
    ]
    text = describe(board)
    assert "Whiteboard: 3 components, 2 connections." in text
    assert "Load Balancer; API servers; Postgres" in text
    assert "Load Balancer -> API servers" in text
    assert "API servers -> Postgres (writes)" in text
    assert '"read heavy 100:1"' in text


def test_unbound_arrow_snaps_to_nearest_shape_and_reversed_head() -> None:
    board = [
        _shape("c", 0, 0), _label("c", "Cache"),
        _shape("s", 300, 0), _label("s", "Service"),
        # drawn from Cache toward Service but with only a start arrowhead: Service -> Cache
        {"id": "a", "type": "arrow", "x": 110, "y": 30, "points": [[0, 0], [185, 0]],
         "startArrowhead": "arrow", "endArrowhead": None},
    ]
    assert "Service -> Cache" in describe(board)


def test_unlabelled_shapes_and_freehand_are_reported() -> None:
    text = describe([_shape("r", 0, 0), {"id": "f", "type": "freedraw", "x": 0, "y": 0}])
    assert "unlabelled rectangle" in text
    assert "1 freehand strokes" in text
