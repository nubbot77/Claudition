/** Minimal view of an Excalidraw element: only the fields the backend reads to describe the board. */
export interface BoardElement {
  id: string;
  type: string;
  version?: number;
  isDeleted?: boolean;
  [key: string]: unknown;
}

const SENT_FIELDS = [
  "id",
  "type",
  "x",
  "y",
  "width",
  "height",
  "text",
  "name",
  "containerId",
  "points",
  "startBinding",
  "endBinding",
  "startArrowhead",
  "endArrowhead",
] as const;

/** Changes whenever an element is added, edited or deleted; ignores selection, scroll and zoom. */
export function boardSignature(elements: readonly BoardElement[]): string {
  return elements
    .filter((e) => !e.isDeleted)
    .map((e) => `${e.id}:${e.version ?? 0}`)
    .join(",");
}

/** Strip styling, seeds and other noise before sending the board with an answer (about 5x smaller). */
export function slimBoard(elements: readonly BoardElement[]): BoardElement[] {
  return elements
    .filter((e) => !e.isDeleted)
    .map((e) => {
      const out: Record<string, unknown> = {};
      for (const key of SENT_FIELDS) if (e[key] !== undefined && e[key] !== null) out[key] = e[key];
      return out as BoardElement;
    });
}
