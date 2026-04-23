import { useEffect } from "react";
import { useGameStore } from "./store/useGameStore";

export default function App() {
  // Grab our new drag-and-drop tools from the store
  const {
    grid,
    initializeBoard,
    actuateCell,
    draggedCellId,
    setDraggedCell,
    mergeCells,
  } = useGameStore();

  // 2. Initialize the board when the game first loads
  useEffect(() => {
    initializeBoard();
  }, [initializeBoard]);

  return (
    // We use Tailwind classes here for a quick, dark, sci-fi layout
    <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-4">
      {/* The Game Board Container */}
      <div
        className="grid gap-1 p-2 bg-neutral-800 rounded-lg border-2 border-neutral-700"
        style={{
          // Force exactly 7 columns
          gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
        }}
      >
        {/* Loop through our 63 cells and render them */}
        {grid.map((cell) => (
          <button
            key={cell.id}
            onClick={() => actuateCell(cell.x, cell.y)}
            disabled={cell.isLocked}
            // --- NEW: DRAG AND DROP EVENTS ---
            // Only allow dragging if it has content, isn't locked, and isn't Rubble
            draggable={
              !!cell.content && !cell.isLocked && cell.content !== "Rubble"
            }
            onDragStart={() => setDraggedCell(cell.id)}
            onDragOver={(e) => {
              e.preventDefault(); // This is required by HTML5 to allow a "drop"
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (draggedCellId) {
                mergeCells(draggedCellId, cell.id);
                setDraggedCell(null); // Clear the drag state
              }
            }}
            // ---------------------------------

            className={`
              w-12 h-12 flex items-center justify-center text-xs font-bold rounded
              transition-colors duration-200
              ${
                cell.isLocked
                  ? "bg-neutral-950 border border-neutral-800/50 cursor-not-allowed text-neutral-700"
                  : "bg-neutral-700 border-2 border-neutral-600 hover:bg-neutral-600 cursor-pointer text-white"
              }
              
              /* Give a visual cue when an item is draggable */
              ${!!cell.content && cell.content !== "Rubble" && !cell.isLocked ? "cursor-grab active:cursor-grabbing" : ""}
            `}
          >
            {/* Our V1 Emoji Dictionary */}
            {cell.content === "Rubble" && "🧱"}
            {cell.content === "FloorTileFragment" && "🧩"}
            {cell.content === "CrackedFloorTile" && "🪨"}
            {cell.content === "FloorTile" && "🟦"}
          </button>
        ))}
      </div>
    </div>
  );
}
