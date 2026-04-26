import { create } from "zustand";
import { persist } from "zustand/middleware";

// 1. Added the AnythingGenerator
export type ItemType =
  | "Rubble"
  | "FloorTileFragment"
  | "CrackedFloorTile"
  | "FloorTile"
  | "AnythingGenerator"
  | null;

export interface Cell {
  id: string;
  x: number;
  y: number;
  isLocked: boolean;
  content: ItemType;
  actuationCount: number;
  // 2. The configuration memory for our generator
  generatorOutput?: ItemType;
}

interface GameState {
  grid: Cell[];
  draggedCellId: string | null;
  hoveredCellId: string | null;
  selectedCellId: string | null;

  initializeBoard: () => void;
  actuateCell: (x: number, y: number) => void;
  setDraggedCell: (id: string | null) => void;
  setHoveredCell: (id: string | null) => void;
  setSelectedCell: (id: string | null) => void;
  mergeCells: (sourceId: string, targetId: string) => void;
  resetGame: () => void;

  // 3. New Actions for V4
  destroyItem: (cellId: string) => void;
  updateGeneratorConfig: (cellId: string, output: ItemType) => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      grid: [],

      initializeBoard: () => {
        const { grid } = get();
        if (grid.length > 0) return;

        const newGrid: Cell[] = [];
        for (let y = 0; y < 9; y++) {
          for (let x = 0; x < 7; x++) {
            const index = y * 7 + x;
            const isFreeArea = index < 10;
            const isTheFirstRubble = index === 10;
            const isTheDevGenerator = index === 11; // Place Dev Tool right next to Rubble

            newGrid.push({
              id: `cell-${x}-${y}`,
              x,
              y,
              isLocked: !(isFreeArea || isTheFirstRubble || isTheDevGenerator),
              content: isFreeArea
                ? null
                : isTheDevGenerator
                  ? "AnythingGenerator"
                  : "Rubble",
              actuationCount: 0,
              // Default it to generating Floor Tiles
              generatorOutput: isTheDevGenerator ? "FloorTile" : undefined,
            });
          }
        }
        set({ grid: newGrid });
      },

      actuateCell: (x, y) => {
        const { grid } = get();
        const targetCellIndex = grid.findIndex((c) => c.x === x && c.y === y);
        if (targetCellIndex === -1) return;

        const cell = grid[targetCellIndex];

        // --- DEV TOOL LOGIC: The Anything Generator ---
        if (cell.content === "AnythingGenerator") {
          const emptyCellIndex = grid.findIndex(
            (c) => !c.isLocked && c.content === null,
          );
          if (emptyCellIndex !== -1 && cell.generatorOutput) {
            const newGrid = [...grid];
            newGrid[emptyCellIndex] = {
              ...newGrid[emptyCellIndex],
              content: cell.generatorOutput,
            };
            set({ grid: newGrid });
          } else {
            console.log("Board full or Generator not configured!");
          }
          return; // Stop here, don't run the rest of the logic
        }

        // --- NORMAL GENERATOR LOGIC ---
        if (cell.content === "Rubble") {
          const emptyCellIndex = grid.findIndex(
            (c) => !c.isLocked && c.content === null,
          );
          if (emptyCellIndex !== -1) {
            const newGrid = [...grid];
            const updatedActuationCount = cell.actuationCount + 1;
            const isDepleted = updatedActuationCount >= 5;

            newGrid[targetCellIndex] = {
              ...cell,
              actuationCount: updatedActuationCount,
              content: isDepleted ? null : "Rubble",
            };

            newGrid[emptyCellIndex] = {
              ...newGrid[emptyCellIndex],
              content: "FloorTileFragment",
            };
            set({ grid: newGrid });
          }
        }

        // --- CONSUME LOGIC ---
        if (cell.content === "FloorTile") {
          const lockedCellIndex = grid.findIndex((c) => c.isLocked);
          if (lockedCellIndex !== -1) {
            const newGrid = [...grid];
            newGrid[targetCellIndex] = { ...cell, content: null };
            newGrid[lockedCellIndex] = {
              ...newGrid[lockedCellIndex],
              isLocked: false,
            };
            set({ grid: newGrid });
          }
        }
      },

      draggedCellId: null,
      hoveredCellId: null,
      selectedCellId: null,

      setDraggedCell: (id) => set({ draggedCellId: id }),
      setHoveredCell: (id) => set({ hoveredCellId: id }),
      setSelectedCell: (id) => set({ selectedCellId: id }),

      mergeCells: (sourceId, targetId) => {
        if (sourceId === targetId) return;

        const { grid } = get();
        const sourceIndex = grid.findIndex((c) => c.id === sourceId);
        const targetIndex = grid.findIndex((c) => c.id === targetId);

        if (sourceIndex === -1 || targetIndex === -1) return;

        const source = grid[sourceIndex];
        const target = grid[targetIndex];

        if (target.isLocked) return;

        // Safety: The Dev Tool cannot be merged, but it CAN be moved to an empty tile.
        if (
          target.content !== null &&
          (source.content === "AnythingGenerator" ||
            target.content === "AnythingGenerator")
        ) {
          return;
        }

        const mergeRules: Record<string, ItemType> = {
          FloorTileFragment: "CrackedFloorTile",
          CrackedFloorTile: "FloorTile",
        };

        if (
          source.content &&
          source.content === target.content &&
          mergeRules[source.content]
        ) {
          const newGrid = [...grid];
          newGrid[targetIndex] = {
            ...target,
            content: mergeRules[source.content],
          };
          newGrid[sourceIndex] = { ...source, content: null };
          // THE FIX: Move the selection to the new target cell!
          set({ grid: newGrid, selectedCellId: targetId });
        } else if (source.content && target.content === null) {
          const newGrid = [...grid];
          newGrid[targetIndex] = { ...target, content: source.content };
          newGrid[sourceIndex] = { ...source, content: null };
          // THE FIX: Move the selection to the new target cell!
          set({ grid: newGrid, selectedCellId: targetId });
        }
      },

      // --- NEW DESTRUCTION LOGIC ---
      destroyItem: (cellId) => {
        const { grid } = get();
        const targetIndex = grid.findIndex((c) => c.id === cellId);
        if (targetIndex !== -1) {
          const newGrid = [...grid];
          newGrid[targetIndex] = { ...newGrid[targetIndex], content: null };
          // If we destroyed the selected/hovered item, clear the selection
          if (get().selectedCellId === cellId) set({ selectedCellId: null });
          set({ grid: newGrid });
        }
      },

      updateGeneratorConfig: (cellId, output) => {
        const { grid } = get();
        const targetIndex = grid.findIndex((c) => c.id === cellId);
        if (targetIndex !== -1) {
          const newGrid = [...grid];
          newGrid[targetIndex] = {
            ...newGrid[targetIndex],
            generatorOutput: output,
          };
          set({ grid: newGrid });
        }
      },

      resetGame: () => {
        set({
          grid: [],
          draggedCellId: null,
          hoveredCellId: null,
          selectedCellId: null,
        });
        get().initializeBoard();
      },
    }),
    { name: "merge-game-storage" },
  ),
);
