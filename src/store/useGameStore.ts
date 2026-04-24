import { create } from "zustand";
import { persist } from "zustand/middleware";

// 1. Define the exact types for our V1 MVP
export type ItemType =
  | "Rubble"
  | "FloorTileFragment"
  | "CrackedFloorTile"
  | "FloorTile"
  | null;

export interface Cell {
  id: string; // e.g., "cell-0-0"
  x: number;
  y: number;
  isLocked: boolean;
  content: ItemType;
  actuationCount: number; // To track the 5 uses of Rubble
}

interface GameState {
  grid: Cell[];
  draggedCellId: string | null; // <-- NEW: Tracks what we are dragging

  // Actions
  initializeBoard: () => void;
  actuateCell: (x: number, y: number) => void;
  setDraggedCell: (id: string | null) => void; // <-- NEW
  mergeCells: (sourceId: string, targetId: string) => void; // <-- NEW
}

// 2. Create the Store
export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      grid: [],

      initializeBoard: () => {
        const { grid } = get();
        // If the grid already has cells (because it loaded from storage),
        // do absolutely nothing and let the player continue their game!
        if (grid.length > 0) return;

        const newGrid: Cell[] = [];
        // Build the 7x9 Grid (63 cells)
        for (let y = 0; y < 9; y++) {
          for (let x = 0; x < 7; x++) {
            const index = y * 7 + x;

            // V1 Logic: First 10 cells are free and empty.
            const isFreeArea = index < 10;

            // V1 Logic: Exactly ONE Rubble tile starts unlocked so the player can start playing!
            const isTheFirstRubble = index === 10;

            newGrid.push({
              id: `cell-${x}-${y}`,
              x,
              y,
              // It is unlocked if it's in the free area, OR if it's our first Rubble
              isLocked: !(isFreeArea || isTheFirstRubble),
              content: isFreeArea ? null : "Rubble",
              actuationCount: 0,
            });
          }
        }
        set({ grid: newGrid });
      },

      actuateCell: (x, y) => {
        // We finally use 'get()' to read the current state of the board!
        const { grid } = get();

        // Find the exact cell we clicked
        const targetCellIndex = grid.findIndex((c) => c.x === x && c.y === y);
        if (targetCellIndex === -1) return; // Safety check

        const cell = grid[targetCellIndex];

        // --- GENERATOR LOGIC: The Rubble ---
        if (cell.content === "Rubble") {
          // Find the first available empty, unlocked cell to spawn our loot
          const emptyCellIndex = grid.findIndex(
            (c) => !c.isLocked && c.content === null,
          );

          if (emptyCellIndex !== -1) {
            // Create a copy of the grid so React knows it's time to re-render
            const newGrid = [...grid];

            // 1. Update the Rubble's durability
            const updatedActuationCount = cell.actuationCount + 1;
            const isDepleted = updatedActuationCount >= 5;

            newGrid[targetCellIndex] = {
              ...cell,
              actuationCount: updatedActuationCount,
              // If it hits 5 uses, the Rubble is destroyed (turns to null)
              content: isDepleted ? null : "Rubble",
            };

            // 2. Spawn the Floor Tile Fragment
            newGrid[emptyCellIndex] = {
              ...newGrid[emptyCellIndex],
              content: "FloorTileFragment",
            };

            // Save the new grid to our global state!
            set({ grid: newGrid });
          } else {
            console.log("The board is full! No room for loot.");
          }
        }

        // --- CONSUME LOGIC: The Max-Level Floor Tile ---
        if (cell.content === "FloorTile") {
          // Find the first locked cell on the board
          const lockedCellIndex = grid.findIndex((c) => c.isLocked);

          if (lockedCellIndex !== -1) {
            const newGrid = [...grid];

            // 1. Consume the Floor Tile (set content to null)
            newGrid[targetCellIndex] = {
              ...cell,
              content: null,
            };

            // 2. Unlock the new cell! (Keep its content as Rubble, but make it playable)
            newGrid[lockedCellIndex] = {
              ...newGrid[lockedCellIndex],
              isLocked: false,
            };

            set({ grid: newGrid });
          } else {
            console.log("BOARD CLEARED! V1 COMPLETE!");
          }
        }
      },

      // --- NEW MERGE LOGIC ---
      draggedCellId: null,

      setDraggedCell: (id) => set({ draggedCellId: id }),

      mergeCells: (sourceId, targetId) => {
        if (sourceId === targetId) return; // Can't interact with itself!

        const { grid } = get();
        const sourceIndex = grid.findIndex((c) => c.id === sourceId);
        const targetIndex = grid.findIndex((c) => c.id === targetId);

        if (sourceIndex === -1 || targetIndex === -1) return;

        const source = grid[sourceIndex];
        const target = grid[targetIndex];

        // Safety check: We cannot drop items onto locked tiles
        if (target.isLocked) return;

        // The Merge Recipe Book
        const mergeRules: Record<string, ItemType> = {
          FloorTileFragment: "CrackedFloorTile",
          CrackedFloorTile: "FloorTile",
        };

        // SCENARIO 1: The Merge (Target has identical, mergeable content)
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
          set({ grid: newGrid });
        }
        // SCENARIO 2: The Move (Target is completely empty)
        else if (source.content && target.content === null) {
          const newGrid = [...grid];
          // Move the content to the new tile
          newGrid[targetIndex] = { ...target, content: source.content };
          // Empty the old tile
          newGrid[sourceIndex] = { ...source, content: null };
          set({ grid: newGrid });
        }
      },
    }),
    {
      name: "merge-game-storage", // This is the secret key saved in your browser
    },
  ),
);
