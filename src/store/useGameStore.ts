import { create } from "zustand";
import { persist } from "zustand/middleware";

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
  generatorOutput?: ItemType;
}

interface GameState {
  grid: Cell[];

  // V6 Settings
  boardWidth: number;
  boardHeight: number;
  colorA: string;
  colorB: string;
  isPanMode: boolean;

  draggedCellId: string | null;
  hoveredCellId: string | null;
  selectedCellId: string | null;

  // Actions
  initializeBoard: () => void;
  resetBoardToDefault: () => void; // The new V1 legacy reset
  updateSettings: (
    width: number,
    height: number,
    cA: string,
    cB: string,
  ) => void;
  togglePanMode: () => void;

  actuateCell: (x: number, y: number) => void;
  setDraggedCell: (id: string | null) => void;
  setHoveredCell: (id: string | null) => void;
  setSelectedCell: (id: string | null) => void;
  mergeCells: (sourceId: string, targetId: string) => void;
  destroyItem: (cellId: string) => void;
  updateGeneratorConfig: (cellId: string, output: ItemType) => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      grid: [],

      // Default V6 Settings
      boardWidth: 7,
      boardHeight: 9,
      colorA: "#262626", // Tailwind neutral-800
      colorB: "#171717", // Tailwind neutral-900
      isPanMode: false,

      // NEW BEHAVIOR: Clears the board and drops 1 Dev Tool at 0,0 based on current W/H settings
      initializeBoard: () => {
        const { boardWidth, boardHeight } = get();
        const newGrid: Cell[] = [];

        for (let y = 0; y < boardHeight; y++) {
          for (let x = 0; x < boardWidth; x++) {
            const isFirstCell = x === 0 && y === 0;
            newGrid.push({
              id: `cell-${x}-${y}`,
              x,
              y,
              isLocked: false,
              content: isFirstCell ? "AnythingGenerator" : null,
              actuationCount: 0,
              generatorOutput: isFirstCell ? "FloorTile" : undefined,
            });
          }
        }
        set({ grid: newGrid });
      },

      // OLD BEHAVIOR: Forces a 7x9 board with the V1 starter layout
      resetBoardToDefault: () => {
        const newGrid: Cell[] = [];
        for (let y = 0; y < 9; y++) {
          for (let x = 0; x < 7; x++) {
            const index = y * 7 + x;
            const isFreeArea = index < 10;
            const isTheFirstRubble = index === 10;
            const isTheDevGenerator = index === 11;

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
              generatorOutput: isTheDevGenerator ? "FloorTile" : undefined,
            });
          }
        }
        set({
          grid: newGrid,
          boardWidth: 7,
          boardHeight: 9,
          draggedCellId: null,
          hoveredCellId: null,
          selectedCellId: null,
        });
      },

      updateSettings: (width, height, cA, cB) => {
        set({ boardWidth: width, boardHeight: height, colorA: cA, colorB: cB });
        get().initializeBoard(); // Rebuild the board immediately with new dimensions
      },

      togglePanMode: () => set((state) => ({ isPanMode: !state.isPanMode })),

      actuateCell: (x, y) => {
        const { grid } = get();
        const targetCellIndex = grid.findIndex((c) => c.x === x && c.y === y);
        if (targetCellIndex === -1) return;

        const cell = grid[targetCellIndex];

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
          }
          return;
        }

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
          set({ grid: newGrid, selectedCellId: targetId });
        } else if (source.content && target.content === null) {
          const newGrid = [...grid];
          newGrid[targetIndex] = { ...target, content: source.content };
          newGrid[sourceIndex] = { ...source, content: null };
          set({ grid: newGrid, selectedCellId: targetId });
        }
      },

      destroyItem: (cellId) => {
        const { grid } = get();
        const targetIndex = grid.findIndex((c) => c.id === cellId);
        if (targetIndex !== -1) {
          const newGrid = [...grid];
          newGrid[targetIndex] = { ...newGrid[targetIndex], content: null };
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
    }),
    { name: "merge-game-storage" },
  ),
);
