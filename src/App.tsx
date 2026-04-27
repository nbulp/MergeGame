import { useState } from "react";
import { useGameStore, type ItemType } from "./store/useGameStore";
import { Settings, Trash2, Wrench, Hand, MousePointer2 } from "lucide-react";
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
    inventory,
    boardWidth,
    boardHeight,
    colorA,
    colorB,
    boardGridColor,
    invCapacity,
    invColorA,
    invColorB,
    invGridColor,
    appBgColor,
    uiBgColor,
    isPanMode, // V8: Pulled new settings out
    resetBoardToDefault,
    updateSettings,
    togglePanMode,
    actuateCell,
    draggedCellId,
    setDraggedCell,
    hoveredCellId,
    setHoveredCell,
    selectedCellId,
    setSelectedCell,
    mergeCells,
    destroyItem,
    updateGeneratorConfig,
    exportSaveCode,
    importSaveCode,
  } = useGameStore();

  const [tempConfigSelection, setTempConfigSelection] =
    useState<ItemType | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tempWidth, setTempWidth] = useState(boardWidth);
  const [tempHeight, setTempHeight] = useState(boardHeight);
  const [tempColorA, setTempColorA] = useState(colorA);
  const [tempColorB, setTempColorB] = useState(colorB);

  // V8: Temp settings for Inventory
  const [tempInvCap, setTempInvCap] = useState(invCapacity);
  const [tempInvA, setTempInvA] = useState(invColorA);
  const [tempInvB, setTempInvB] = useState(invColorB);

  const [tempAppBg, setTempAppBg] = useState(appBgColor);
  const [tempUiBg, setTempUiBg] = useState(uiBgColor);

  const [tempBoardGrid, setTempBoardGrid] = useState(boardGridColor);
  const [tempInvGrid, setTempInvGrid] = useState(invGridColor);

  const handleOpenSettings = (open: boolean) => {
    setIsSettingsOpen(open);
    if (open) {
      setTempWidth(boardWidth);
      setTempHeight(boardHeight);
      setTempColorA(colorA);
      setTempColorB(colorB);
      setTempInvCap(invCapacity);
      setTempInvA(invColorA);
      setTempInvB(invColorB);
      setTempAppBg(appBgColor);
      setTempUiBg(uiBgColor);
      setTempBoardGrid(boardGridColor);
      setTempInvGrid(invGridColor);
    }
  };

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
    <div
      className="flex flex-col h-[100dvh] text-neutral-100 font-mono overflow-hidden"
      style={{ backgroundColor: appBgColor }}
    >
      {/* --- TOP BAR (HUD) --- */}
      <header
        className="h-16 border-b border-neutral-800 flex items-center justify-between px-4"
        style={{ backgroundColor: uiBgColor }}
      >
        {/* LEFT: Telemetry */}
        <div className="text-sm font-bold text-emerald-500 tracking-widest transition-all duration-300">
          {telemetryText}
        </div>

        {/* RIGHT: Item Actions Section */}
        <div className="flex items-center gap-3">
          {/* V6: PAN MODE TOGGLE */}
          <button
            onClick={togglePanMode}
            className={`flex items-center justify-center p-2 rounded-md transition-colors ${isPanMode ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50" : "hover:bg-neutral-800 text-neutral-400"}`}
            title="Toggle Pan Mode"
          >
            {isPanMode ? (
              <Hand className="w-5 h-5" />
            ) : (
              <MousePointer2 className="w-5 h-5" />
            )}
          </button>
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
          <Dialog open={isSettingsOpen} onOpenChange={handleOpenSettings}>
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

              <div className="space-y-4 py-4 max-h-[70vh] overflow-auto px-1">
                <div className="grid grid-cols-2 gap-x-4 gap-y-6">
                  {/* BOARD SETTINGS */}
                  <div className="col-span-2 text-emerald-500 font-bold text-xs uppercase tracking-widest border-b border-neutral-800 pb-1">
                    Board Parameters
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-neutral-400">
                      WIDTH (Max 30)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={tempWidth}
                      onChange={(e) =>
                        setTempWidth(
                          Math.min(30, Math.max(1, Number(e.target.value))),
                        )
                      }
                      className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-neutral-400">
                      HEIGHT (Max 30)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={tempHeight}
                      onChange={(e) =>
                        setTempHeight(
                          Math.min(30, Math.max(1, Number(e.target.value))),
                        )
                      }
                      className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-neutral-400">
                      COLOR A
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={tempColorA}
                        onChange={(e) => setTempColorA(e.target.value)}
                        className="w-10 h-10 rounded cursor-pointer bg-transparent border-0 p-0"
                      />
                      <input
                        type="text"
                        value={tempColorA}
                        onChange={(e) => setTempColorA(e.target.value)}
                        className="flex-1 bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white text-xs uppercase"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-neutral-400">
                      COLOR B
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={tempColorB}
                        onChange={(e) => setTempColorB(e.target.value)}
                        className="w-10 h-10 rounded cursor-pointer bg-transparent border-0 p-0"
                      />
                      <input
                        type="text"
                        value={tempColorB}
                        onChange={(e) => setTempColorB(e.target.value)}
                        className="flex-1 bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white text-xs uppercase"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-neutral-400">
                      GRID GROUT
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={tempBoardGrid}
                        onChange={(e) => setTempBoardGrid(e.target.value)}
                        className="w-10 h-10 rounded cursor-pointer bg-transparent border-0 p-0"
                      />
                      <input
                        type="text"
                        value={tempBoardGrid}
                        onChange={(e) => setTempBoardGrid(e.target.value)}
                        className="flex-1 bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white text-xs uppercase"
                      />
                    </div>
                  </div>

                  {/* INVENTORY SETTINGS */}
                  <div className="col-span-2 text-emerald-500 font-bold text-xs uppercase tracking-widest border-b border-neutral-800 pb-1 mt-2">
                    Dock Parameters
                  </div>

                  <div className="col-span-2 space-y-2">
                    <label className="text-xs font-bold text-neutral-400">
                      SLOT CAPACITY (1-7)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="7"
                      value={tempInvCap}
                      onChange={(e) =>
                        setTempInvCap(
                          Math.min(7, Math.max(1, Number(e.target.value))),
                        )
                      }
                      className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-neutral-400">
                      SLOT COLOR A
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={tempInvA}
                        onChange={(e) => setTempInvA(e.target.value)}
                        className="w-10 h-10 rounded cursor-pointer bg-transparent border-0 p-0"
                      />
                      <input
                        type="text"
                        value={tempInvA}
                        onChange={(e) => setTempInvA(e.target.value)}
                        className="flex-1 bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white text-xs uppercase"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-neutral-400">
                      SLOT COLOR B
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={tempInvB}
                        onChange={(e) => setTempInvB(e.target.value)}
                        className="w-10 h-10 rounded cursor-pointer bg-transparent border-0 p-0"
                      />
                      <input
                        type="text"
                        value={tempInvB}
                        onChange={(e) => setTempInvB(e.target.value)}
                        className="flex-1 bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white text-xs uppercase"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-neutral-400">
                      DOCK GROUT
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={tempInvGrid}
                        onChange={(e) => setTempInvGrid(e.target.value)}
                        className="w-10 h-10 rounded cursor-pointer bg-transparent border-0 p-0"
                      />
                      <input
                        type="text"
                        value={tempInvGrid}
                        onChange={(e) => setTempInvGrid(e.target.value)}
                        className="flex-1 bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white text-xs uppercase"
                      />
                    </div>
                  </div>
                </div>

                {/* TERMINAL THEME SETTINGS */}
                <div className="col-span-2 text-emerald-500 font-bold text-xs uppercase tracking-widest border-b border-neutral-800 pb-1 mt-2">
                  Terminal Theme
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-400">
                    APP BACKGROUND
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={tempAppBg}
                      onChange={(e) => setTempAppBg(e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer bg-transparent border-0 p-0"
                    />
                    <input
                      type="text"
                      value={tempAppBg}
                      onChange={(e) => setTempAppBg(e.target.value)}
                      className="flex-1 bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white text-xs uppercase"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-400">
                    UI PANELS
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={tempUiBg}
                      onChange={(e) => setTempUiBg(e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer bg-transparent border-0 p-0"
                    />
                    <input
                      type="text"
                      value={tempUiBg}
                      onChange={(e) => setTempUiBg(e.target.value)}
                      className="flex-1 bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white text-xs uppercase"
                    />
                  </div>
                </div>

                {/* --- SETTINGS MODAL FOOTER --- */}
                <div className="flex flex-col gap-3 pt-4 border-t border-neutral-800 mt-4">
                  {/* DATA MANAGEMENT ROW */}
                  <div className="flex justify-between gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 border-neutral-700 text-neutral-300 hover:bg-neutral-800"
                      onClick={() => {
                        const code = exportSaveCode();
                        navigator.clipboard.writeText(code);
                        alert(
                          "SAVE CODE COPIED TO CLIPBOARD!\n\nSave this text somewhere safe, or send it to another device.",
                        );
                      }}
                    >
                      EXPORT SAVE CODE
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 border-neutral-700 text-neutral-300 hover:bg-neutral-800"
                      onClick={() => {
                        const code = prompt("PASTE YOUR SAVE CODE HERE:");
                        if (code) {
                          const success = importSaveCode(code);
                          if (success) {
                            alert("SAVE RESTORED SUCCESSFULLY!");
                            setIsSettingsOpen(false); // Close modal to show the restored board
                          } else {
                            alert("ERROR: INVALID SAVE CODE.");
                          }
                        }
                      }}
                    >
                      IMPORT SAVE CODE
                    </Button>
                  </div>

                  {/* APPLY / RESET ROW */}
                  <div className="flex justify-between gap-2">
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => {
                        resetBoardToDefault();
                        setIsSettingsOpen(false);
                      }}
                    >
                      V1 FACTORY RESET
                    </Button>
                    <Button
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => {
                        updateSettings(
                          tempWidth,
                          tempHeight,
                          tempColorA,
                          tempColorB,
                          tempBoardGrid,
                          tempInvCap,
                          tempInvA,
                          tempInvB,
                          tempInvGrid,
                          tempAppBg,
                          tempUiBg,
                        );
                        setIsSettingsOpen(false);
                      }}
                    >
                      APPLY CHANGES
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* --- CENTER STAGE (THE GAME) --- */}
      {/* V6: If Pan Mode is on, we allow overflow and scrolling. Otherwise, we hide it. */}
      {/* V6: Removed dangerous flex centering */}
      <main
        className={`flex-1 flex p-4 ${isPanMode ? "overflow-auto" : "overflow-hidden"}`}
      >
        {/* GAME BOARD CONTAINER */}
        <div
          className="m-auto grid p-3 rounded-xl border shadow-2xl transition-all duration-300"
          style={{
            gridTemplateColumns: `repeat(${boardWidth}, max-content)`,
            gap: "6px",
            backgroundColor: boardGridColor, // NEW
            borderColor: boardGridColor, // NEW
          }}
        >
          {grid.map((cell) => {
            const isSelected = selectedCellId === cell.id;

            // V6 Checkered Math
            const isColorA = (cell.x + cell.y) % 2 === 0;
            const cellBgColor = cell.isLocked
              ? "#000000"
              : isColorA
                ? colorA
                : colorB;

            return (
              <button
                key={cell.id}
                style={{ backgroundColor: cellBgColor }}
                onClick={() => {
                  if (isPanMode) return; // Do nothing if panning
                  if (isSelected && !cell.isLocked) actuateCell(cell.x, cell.y);
                  else setSelectedCell(cell.id);
                }}
                draggable={!isPanMode && !!cell.content && !cell.isLocked}
                onDragStart={() => {
                  if (isPanMode) return;
                  setDraggedCell(cell.id);
                  setSelectedCell(cell.id);
                }}
                onDragEnter={(e) => e.preventDefault()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  if (isPanMode) return;
                  e.preventDefault();
                  if (draggedCellId) {
                    mergeCells(draggedCellId, cell.id);
                    setDraggedCell(null);
                  }
                }}
                onMouseEnter={() => !isPanMode && setHoveredCell(cell.id)}
                onMouseLeave={() => !isPanMode && setHoveredCell(null)}
                className={`
                  w-14 h-14 flex items-center justify-center text-xl rounded-md transition-all duration-200 shadow-sm
                  ${isPanMode ? "cursor-grab" : "touch-none select-none"}
                  ${cell.isLocked ? "border border-neutral-800/50 text-neutral-800 opacity-50" : "border border-neutral-800/50 text-white"}
                  ${!isPanMode && !!cell.content && !cell.isLocked ? "active:cursor-grabbing hover:brightness-110" : ""}
                  ${isSelected && !isPanMode ? "ring-2 ring-offset-2 ring-offset-neutral-900 ring-emerald-500 scale-105 z-10" : ""}
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
      <footer
        className="h-24 border-t border-neutral-800 flex"
        style={{ backgroundColor: uiBgColor }}
      >
        {/* LEFT: Functional Inventory */}
        <div className="flex-1 flex items-center p-4 overflow-x-auto">
          {/* INVENTORY DOCK CONTAINER */}
          <div
            className="flex gap-2 p-2 rounded-xl border shadow-inner m-auto transition-all"
            style={{
              backgroundColor: invGridColor, // NEW
              borderColor: invGridColor, // NEW
            }}
          >
            {inventory.map((cell) => {
              const isSelected = selectedCellId === cell.id;
              const isColorA = cell.x % 2 === 0; // Simple horizontal alternating math
              const slotBgColor = isColorA ? invColorA : invColorB;

              return (
                <button
                  key={cell.id}
                  style={{ backgroundColor: slotBgColor }}
                  onClick={() => setSelectedCell(cell.id)} // V8: Selection ONLY. No Actuation.
                  draggable={!!cell.content}
                  onDragStart={() => {
                    setDraggedCell(cell.id);
                    setSelectedCell(cell.id);
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
                    w-12 h-12 flex items-center justify-center text-lg rounded-md transition-all duration-200 shadow-sm
                    border border-neutral-800/50 text-white flex-shrink-0
                    ${cell.content ? "active:cursor-grabbing hover:brightness-110 cursor-grab" : ""}
                    ${isSelected ? "ring-2 ring-offset-2 ring-offset-neutral-900 ring-emerald-500 scale-110 z-10" : ""}
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
