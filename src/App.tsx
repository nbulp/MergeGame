import { useEffect, useState } from "react";
import { useGameStore, type ItemType } from "./store/useGameStore";
import { Settings, Trash2, Wrench } from "lucide-react";
import { Button } from "./components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select";

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
    destroyItem,
    updateGeneratorConfig,
  } = useGameStore();

  const [tempConfigSelection, setTempConfigSelection] =
    useState<ItemType | null>(null);

  const [isConfigOpen, setIsConfigOpen] = useState(false);

  useEffect(() => {
    initializeBoard();
  }, [initializeBoard]);

  const activeCellId = selectedCellId || hoveredCellId;
  const activeCell = grid.find((c) => c.id === activeCellId);

  let telemetryText = "SYSTEM STANDBY";
  if (activeCell) {
    if (activeCell.isLocked)
      telemetryText = `LOCKED: ${activeCell.content || "UNKNOWN"}`;
    else if (activeCell.content === "AnythingGenerator")
      telemetryText = `GENERATOR [${activeCell.generatorOutput?.toUpperCase() || "EMPTY"}]`;
    else if (activeCell.content)
      telemetryText = `ENTITY: ${activeCell.content.toUpperCase()}`;
    else telemetryText = "EMPTY TILE";
  }

  // Pre-load the current configuration into the temp state when opening the dialog
  const handleOpenConfig = (open: boolean) => {
    if (open && activeCell)
      setTempConfigSelection(activeCell.generatorOutput || "FloorTile");
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-neutral-950 text-neutral-100 font-mono overflow-hidden">
      {/* --- TOP BAR (HUD) --- */}
      <header className="flex justify-between items-center px-6 py-4 border-b border-neutral-800 bg-neutral-900/50">
        {/* LEFT: Telemetry */}
        <div className="text-sm font-bold text-emerald-500 tracking-widest transition-all duration-300">
          {telemetryText}
        </div>

        {/* RIGHT: Item Actions Section */}
        <div className="flex items-center gap-3">
          {/* CONFIG MODAL (Only shows if AnythingGenerator is selected) */}
          {selectedCellId && activeCell?.content === "AnythingGenerator" && (
            <Dialog
              open={isConfigOpen}
              onOpenChange={(open) => {
                setIsConfigOpen(open);
                handleOpenConfig(open);
              }}
            >
              <DialogTrigger className="flex items-center justify-center px-3 py-2 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors border border-neutral-700 font-bold text-xs tracking-wider">
                <Wrench className="w-4 h-4 mr-2" />
                CONFIG
              </DialogTrigger>
              <DialogContent className="bg-neutral-900 border-neutral-800 text-neutral-100">
                <DialogHeader>
                  <DialogTitle>GENERATOR MATRIX</DialogTitle>
                  <DialogDescription className="text-neutral-400">
                    Select the entity this module will fabricate.
                  </DialogDescription>
                </DialogHeader>
                <div className="pt-4 space-y-4">
                  <Select
                    value={tempConfigSelection || ""}
                    onValueChange={(val) =>
                      setTempConfigSelection(val as ItemType)
                    }
                  >
                    <SelectTrigger className="w-full bg-neutral-950 border-neutral-800">
                      <SelectValue placeholder="Select entity..." />
                    </SelectTrigger>
                    <SelectContent className="bg-neutral-950 border-neutral-800 text-white">
                      <SelectItem value="Rubble">Rubble</SelectItem>
                      <SelectItem value="FloorTileFragment">
                        FloorTileFragment
                      </SelectItem>
                      <SelectItem value="CrackedFloorTile">
                        CrackedFloorTile
                      </SelectItem>
                      <SelectItem value="FloorTile">FloorTile</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex justify-end gap-2">
                    <button
                      className="bg-neutral-100 text-neutral-950 hover:bg-neutral-200 px-4 py-2 rounded-md font-medium text-sm transition-colors disabled:opacity-50"
                      onClick={() => {
                        if (selectedCellId && tempConfigSelection) {
                          updateGeneratorConfig(
                            selectedCellId,
                            tempConfigSelection,
                          );
                          setIsConfigOpen(false); // <--- BOOM. CLOSE THE MODAL.
                        }
                      }}
                    >
                      CONFIRM PROTOCOL
                    </button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* MAIN SETTINGS MODAL */}
          <Dialog>
            <DialogTrigger className="flex items-center justify-center p-2 rounded-md hover:bg-neutral-800 text-neutral-400 transition-colors">
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
        </div>
      </header>

      {/* --- CENTER STAGE (THE GAME) --- */}
      <main className="flex-1 flex items-center justify-center p-4 overflow-hidden">
        <div
          className="grid p-3 bg-neutral-900/80 rounded-xl border border-neutral-800 shadow-2xl"
          style={{
            gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
            gap: "6px",
          }}
        >
          {grid.map((cell) => {
            const isSelected = selectedCellId === cell.id;
            return (
              <button
                key={cell.id}
                onClick={() => {
                  if (isSelected && !cell.isLocked) actuateCell(cell.x, cell.y);
                  else setSelectedCell(cell.id);
                }}
                draggable={!!cell.content && !cell.isLocked}
                onDragStart={() => {
                  setDraggedCell(cell.id);
                  setSelectedCell(cell.id); // <-- THE FIX: Auto-select on grab!
                }}
                onDragEnter={(e) => e.preventDefault()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (draggedCellId) {
                    mergeCells(draggedCellId, cell.id);
                    setDraggedCell(null);
                  }
                }}
                onMouseEnter={() => setHoveredCell(cell.id)}
                onMouseLeave={() => setHoveredCell(null)}
                className={`
                  w-14 h-14 flex items-center justify-center text-xl rounded-md transition-all duration-200 shadow-sm touch-none select-none
                  ${cell.isLocked ? "bg-neutral-950/50 border border-neutral-800/50 text-neutral-800" : "bg-neutral-800 border-2 border-neutral-700 hover:bg-neutral-700 text-white"}
                  ${!!cell.content && !cell.isLocked ? "active:cursor-grabbing" : ""}
                  ${isSelected ? "ring-2 ring-offset-2 ring-offset-neutral-900 ring-emerald-500 scale-105 z-10" : ""}
                `}
              >
                {cell.content === "Rubble" && "🧱"}
                {cell.content === "FloorTileFragment" && "🧩"}
                {cell.content === "CrackedFloorTile" && "🪨"}
                {cell.content === "FloorTile" && "🟦"}
                {cell.content === "AnythingGenerator" && "⚙️"}
              </button>
            );
          })}
        </div>
      </main>

      {/* --- BOTTOM BAR (THE DOCK) --- */}
      <footer className="h-24 border-t border-neutral-800 bg-neutral-900/50 flex">
        {/* LEFT: Inventory */}
        <div className="flex-1 flex items-center justify-center">
          <span className="text-xs text-neutral-600 tracking-[0.2em] font-bold uppercase">
            Inventory Module Offline
          </span>
        </div>

        {/* RIGHT: Destruction Section */}
        <div
          onDragEnter={(e) => e.preventDefault()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (draggedCellId) {
              destroyItem(draggedCellId);
              setDraggedCell(null);
            }
          }}
          className="w-32 border-l border-neutral-800 flex flex-col items-center justify-center text-neutral-500 hover:text-red-500 hover:bg-red-950/20 transition-all duration-300"
        >
          <Trash2 className="w-6 h-6 mb-2" />
          <span className="text-[10px] font-bold tracking-[0.2em] uppercase">
            Incinerator
          </span>
        </div>
      </footer>
    </div>
  );
}

export default App;
