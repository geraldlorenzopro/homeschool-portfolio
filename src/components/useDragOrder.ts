import { useRef, useState } from 'react'

/**
 * Drag a row onto another to put it there. Native HTML drag-and-drop rather
 * than a library: the lists are short, and this keeps the bundle honest.
 *
 * `onReorder` receives the full id list in its new order.
 */
export function useDragOrder(ids: string[], onReorder: (orderedIds: string[]) => void) {
  const dragging = useRef<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  function move(fromId: string, toId: string) {
    if (fromId === toId) return
    const next = [...ids]
    const from = next.indexOf(fromId)
    const to = next.indexOf(toId)
    if (from < 0 || to < 0) return
    next.splice(to, 0, ...next.splice(from, 1))
    onReorder(next)
  }

  return {
    /** Spread onto each row. */
    handlers(id: string) {
      return {
        draggable: true,
        onDragStart: (e: React.DragEvent) => {
          dragging.current = id
          e.dataTransfer.effectAllowed = 'move'
        },
        onDragOver: (e: React.DragEvent) => {
          e.preventDefault()
          if (dragging.current && dragging.current !== id) setOverId(id)
        },
        onDragLeave: () => setOverId((current) => (current === id ? null : current)),
        onDrop: (e: React.DragEvent) => {
          e.preventDefault()
          if (dragging.current) move(dragging.current, id)
          dragging.current = null
          setOverId(null)
        },
        onDragEnd: () => {
          dragging.current = null
          setOverId(null)
        },
        'data-drop-target': overId === id ? 'true' : undefined,
      }
    },
  }
}
