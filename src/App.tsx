import { useEffect } from "react";
import { useGameStore } from "./store/useGameStore";
import { Settings } from "lucide-react";
import { Button } from "./components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./components/ui/dialog";

function App() {
  const {
    grid,
    initializeBoard,
    actuateCell,
    draggedCellId,
    setDraggedCell,
    hoveredCellId,
    setHoveredCell,
    selectedCellId,
    setSelectedCell,
    mergeCells,
    resetGame,
  } = useGameStore();

  useEffect(() => {
    initializeBoard();
  }, [initializeBoard]);

  // Readout Priority: Selected Cell > Hovered Cell > Nothing
  const activeCellId = selectedCellId || hoveredCellId;
  const activeCell = grid.find((c) => c.id === activeCellId);

  let telemetryText = "SYSTEM STANDBY";
  if (activeCell) {
    if (activeCell.isLocked)
      telemetryText = `LOCKED SECTOR: ${activeCell.content ? activeCell.content.toUpperCase() : "UNKNOWN"}`;
    else if (activeCell.content)
      telemetryText = `ENTITY DETECTED: ${activeCell.content.toUpperCase()}`;
    else telemetryText = "EMPTY TILE";
  }

  return (
    // THE APP SHELL: Full screen, dark mode, flexbox column
    <div className="flex flex-col h-screen bg-neutral-950 text-neutral-100 font-mono">
      {/* --- TOP BAR (HUD) --- */}
      <header className="flex justify-between items-center px-6 py-4 border-b border-neutral-800 bg-neutral-900/50">
        <div className="text-sm font-bold text-emerald-500 tracking-widest transition-all duration-300">
          {telemetryText}
        </div>

        {/* SETTINGS MODAL */}
        <Dialog>
          {/* THE FIX: We style the Trigger directly and remove the inner Button entirely */}
          <DialogTrigger className="flex items-center justify-center p-2 rounded-md hover:bg-neutral-800 text-neutral-400 transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-700">
            <Settings className="w-5 h-5" />
          </DialogTrigger>

          <DialogContent className="bg-neutral-900 border-neutral-800 text-neutral-100">
            <DialogHeader>
              <DialogTitle className="tracking-widest">
                SYSTEM TERMINAL
              </DialogTitle>
              <DialogDescription className="text-neutral-400">
                Manage your expedition parameters.
              </DialogDescription>
            </DialogHeader>
            <div className="pt-4 flex justify-end">
              <Button variant="destructive" onClick={resetGame}>
                INITIATE BOARD RESET
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </header>

      {/* --- CENTER STAGE (THE GAME) --- */}
      <main className="flex-1 flex items-center justify-center p-4 overflow-hidden">
        <div
          className="grid p-3 bg-neutral-900/80 rounded-xl border border-neutral-800 shadow-2xl"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
            gap: "6px",
          }}
        >
          {grid.map((cell) => {
            const isSelected = selectedCellId === cell.id;

            return (
              <button
                key={cell.id}
                // --- THE NEW MOBILE-FIRST LOGIC ---
                onClick={() => {
                  if (isSelected && !cell.isLocked) {
                    actuateCell(cell.x, cell.y); // Click #2: Actuate
                  } else {
                    setSelectedCell(cell.id); // Click #1: Select
                  }
                }}
                // --- DRAG AND DROP ---
                draggable={!!cell.content && !cell.isLocked}
                onDragStart={() => setDraggedCell(cell.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (draggedCellId) {
                    mergeCells(draggedCellId, cell.id);
                    setDraggedCell(null);
                  }
                }}
                // --- HOVER TRACKING ---
                onMouseEnter={() => setHoveredCell(cell.id)}
                onMouseLeave={() => setHoveredCell(null)}
                // --- STYLING & VISUAL FEEDBACK ---
                className={`
                  w-14 h-14 flex items-center justify-center text-xl rounded-md
                  transition-all duration-200 shadow-sm
                  
                  /* Base Colors: Locked vs Unlocked */
                  ${
                    cell.isLocked
                      ? "bg-neutral-950/50 border border-neutral-800/50 text-neutral-800"
                      : "bg-neutral-800 border-2 border-neutral-700 hover:bg-neutral-700 hover:border-neutral-500 cursor-pointer text-white"
                  }
                  
                  /* Grab Cursor */
                  ${!!cell.content && !cell.isLocked ? "active:cursor-grabbing" : ""}

                  /* SELECTED GLOW (The green ring!) */
                  ${isSelected ? "ring-2 ring-offset-2 ring-offset-neutral-900 ring-emerald-500 scale-105 z-10" : ""}
                `}
              >
                {cell.content === "Rubble" && "🧱"}
                {cell.content === "FloorTileFragment" && "🧩"}
                {cell.content === "CrackedFloorTile" && "🪨"}
                {cell.content === "FloorTile" && "🟦"}
              </button>
            );
          })}
        </div>
      </main>

      {/* --- BOTTOM BAR (THE DOCK) --- */}
      <footer className="h-12 border-t border-neutral-800 bg-neutral-900/50 flex items-center justify-center">
        <span className="text-xs text-neutral-600 tracking-[0.2em] font-bold uppercase">
          Inventory Module Offline
        </span>
      </footer>
    </div>
  );
}

export default App;
