import { create } from "zustand";

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
  // Actions
  initializeBoard: () => void;
  actuateCell: (x: number, y: number) => void;
}

// 2. Create the Store
export const useGameStore = create<GameState>((set, get) => ({
  grid: [],

  initializeBoard: () => {
    const newGrid: Cell[] = [];
    // Build the 7x9 Grid (63 cells)
    for (let y = 0; y < 9; y++) {
      for (let x = 0; x < 7; x++) {
        // V1 Logic: First 10 cells (roughly the top row and a bit) are free and empty.
        // The rest are locked and contain Rubble.
        const isFreeArea = y * 7 + x < 10;

        newGrid.push({
          id: `cell-${x}-${y}`,
          x,
          y,
          isLocked: !isFreeArea,
          content: isFreeArea ? null : "Rubble",
          actuationCount: 0,
        });
      }
    }
    set({ grid: newGrid });
  },

  actuateCell: (x, y) => {
    // This is where our beautiful "Merge/Consume" logic will live!
    // For now, we just log it to prove the wiring works.
    console.log(`Actuator triggered at X:${x}, Y:${y}`);
  },
}));
