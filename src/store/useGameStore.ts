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

function findNearestEmptyCell(
  grid: Cell[],
  startX: number,
  startY: number,
  boardWidth: number,
  boardHeight: number,
): number {
  if (!grid.some((c) => !c.isLocked && c.content === null)) return -1;
  const maxRadius = Math.max(boardWidth, boardHeight);
  for (let r = 1; r <= maxRadius; r++) {
    const candidates: { x: number; y: number }[] = [];
    for (let dy = -r + 1; dy <= r; dy++)
      candidates.push({ x: startX + r, y: startY + dy });
    for (let dx = r - 1; dx >= -r; dx--)
      candidates.push({ x: startX + dx, y: startY + r });
    for (let dy = r - 1; dy >= -r; dy--)
      candidates.push({ x: startX - r, y: startY + dy });
    for (let dx = -r + 1; dx <= r; dx++)
      candidates.push({ x: startX + dx, y: startY - r });
    for (const pos of candidates) {
      if (pos.x < 0 || pos.x >= boardWidth || pos.y < 0 || pos.y >= boardHeight)
        continue;
      const index = grid.findIndex((c) => c.x === pos.x && c.y === pos.y);
      if (index !== -1 && !grid[index].isLocked && grid[index].content === null)
        return index;
    }
  }
  return -1;
}

interface GameState {
  grid: Cell[];
  inventory: Cell[]; // V8: The new container

  // Settings
  boardWidth: number;
  boardHeight: number;
  colorA: string;
  colorB: string;
  invCapacity: number; // V8 Setting
  invColorA: string; // V8 Setting
  invColorB: string; // V8 Setting
  isPanMode: boolean;

  draggedCellId: string | null;
  hoveredCellId: string | null;
  selectedCellId: string | null;

  initializeBoard: () => void;
  resetBoardToDefault: () => void;
  updateSettings: (
    w: number,
    h: number,
    cA: string,
    cB: string,
    invCap: number,
    invA: string,
    invB: string,
  ) => void;
  togglePanMode: () => void;
  actuateCell: (x: number, y: number) => void;
  setDraggedCell: (id: string | null) => void;
  setHoveredCell: (id: string | null) => void;
  setSelectedCell: (id: string | null) => void;
  mergeCells: (sourceId: string, targetId: string) => void;
  destroyItem: (cellId: string) => void;
  updateGeneratorConfig: (cellId: string, output: ItemType) => void;

  exportSaveCode: () => string;
  importSaveCode: (code: string) => boolean;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      grid: [],
      inventory: [],

      boardWidth: 7,
      boardHeight: 9,
      colorA: "#262626",
      colorB: "#171717",
      invCapacity: 5,
      invColorA: "#1e3a8a", // Default to dark blue hues to separate it from the board
      invColorB: "#172554",
      isPanMode: false,

      initializeBoard: () => {
        const { boardWidth, boardHeight, invCapacity } = get();
        const newGrid: Cell[] = [];
        const newInventory: Cell[] = [];

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

        // V8: Initialize Inventory Slots
        for (let i = 0; i < invCapacity; i++) {
          newInventory.push({
            id: `inv-${i}`,
            x: i,
            y: 0,
            isLocked: false,
            content: null,
            actuationCount: 0,
          });
        }

        set({ grid: newGrid, inventory: newInventory });
      },

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

        // Build 5 default slots for factory reset
        const newInventory: Cell[] = Array.from({ length: 5 }).map((_, i) => ({
          id: `inv-${i}`,
          x: i,
          y: 0,
          isLocked: false,
          content: null,
          actuationCount: 0,
        }));

        set({
          grid: newGrid,
          inventory: newInventory,
          boardWidth: 7,
          boardHeight: 9,
          invCapacity: 5,
          draggedCellId: null,
          hoveredCellId: null,
          selectedCellId: null,
        });
      },

      updateSettings: (w, h, cA, cB, invCap, invA, invB) => {
        set({
          boardWidth: w,
          boardHeight: h,
          colorA: cA,
          colorB: cB,
          invCapacity: invCap,
          invColorA: invA,
          invColorB: invB,
        });
        get().initializeBoard();
      },

      // Add these right below your updateSettings function
      exportSaveCode: () => {
        const state = get();
        // Cherry-pick only the data we want to save
        const saveData = {
          grid: state.grid,
          inventory: state.inventory,
          boardWidth: state.boardWidth,
          boardHeight: state.boardHeight,
          colorA: state.colorA,
          colorB: state.colorB,
          invCapacity: state.invCapacity,
          invColorA: state.invColorA,
          invColorB: state.invColorB,
          isPanMode: state.isPanMode,
        };
        // Convert to a JSON string, then encode to Base64
        return btoa(JSON.stringify(saveData));
      },

      importSaveCode: (code) => {
        try {
          // Decode from Base64, then parse the JSON string
          const parsedData = JSON.parse(atob(code));

          // Push the parsed data directly into the global state
          set(parsedData);
          return true; // Success!
        } catch (error) {
          console.error("Failed to parse save code.", error);
          return false; // Failed
        }
      },

      togglePanMode: () => set((state) => ({ isPanMode: !state.isPanMode })),

      actuateCell: (x, y) => {
        const { grid } = get();
        const targetCellIndex = grid.findIndex((c) => c.x === x && c.y === y);
        if (targetCellIndex === -1) return;

        const cell = grid[targetCellIndex];

        if (cell.content === "AnythingGenerator") {
          const emptyCellIndex = findNearestEmptyCell(
            grid,
            cell.x,
            cell.y,
            get().boardWidth,
            get().boardHeight,
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
          const emptyCellIndex = findNearestEmptyCell(
            grid,
            cell.x,
            cell.y,
            get().boardWidth,
            get().boardHeight,
          );
          if (emptyCellIndex !== -1) {
            const newGrid = [...grid];
            const isDepleted = cell.actuationCount + 1 >= 5;
            newGrid[targetCellIndex] = {
              ...cell,
              actuationCount: cell.actuationCount + 1,
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

      // V8: The Engine Upgrade (Cross-Container Routing)
      mergeCells: (sourceId, targetId) => {
        if (sourceId === targetId) return;

        const { grid, inventory } = get();

        // Route the source and target to the correct arrays based on ID prefix
        const sourceIsInv = sourceId.startsWith("inv-");
        const targetIsInv = targetId.startsWith("inv-");

        const sourceArray = sourceIsInv ? inventory : grid;
        const targetArray = targetIsInv ? inventory : grid;

        const sourceIndex = sourceArray.findIndex((c) => c.id === sourceId);
        const targetIndex = targetArray.findIndex((c) => c.id === targetId);

        if (sourceIndex === -1 || targetIndex === -1) return;

        const source = sourceArray[sourceIndex];
        const target = targetArray[targetIndex];

        if (target.isLocked) return;
        if (
          target.content !== null &&
          (source.content === "AnythingGenerator" ||
            target.content === "AnythingGenerator")
        )
          return;

        // V8 RULE: Items cannot be merged in the inventory. If the target is in the inventory AND full, abort.
        if (targetIsInv && target.content !== null) return;

        const newGrid = [...grid];
        const newInventory = [...inventory];

        // SCENARIO 1: The Move (Target is completely empty)
        if (source.content && target.content === null) {
          const updatedTarget = {
            ...target,
            content: source.content,
            actuationCount: source.actuationCount,
            generatorOutput: source.generatorOutput,
          };
          const updatedSource = {
            ...source,
            content: null,
            actuationCount: 0,
            generatorOutput: undefined,
          };

          if (sourceIsInv) newInventory[sourceIndex] = updatedSource;
          else newGrid[sourceIndex] = updatedSource;
          if (targetIsInv) newInventory[targetIndex] = updatedTarget;
          else newGrid[targetIndex] = updatedTarget;

          set({
            grid: newGrid,
            inventory: newInventory,
            selectedCellId: targetId,
          });
        }
        // SCENARIO 2: The Merge (Requires Identical Items & Target is on Grid)
        else if (
          !targetIsInv &&
          source.content &&
          source.content === target.content
        ) {
          const mergeRules: Record<string, ItemType> = {
            FloorTileFragment: "CrackedFloorTile",
            CrackedFloorTile: "FloorTile",
          };
          if (mergeRules[source.content]) {
            const updatedTarget = {
              ...target,
              content: mergeRules[source.content],
              actuationCount: 0,
              generatorOutput: undefined,
            };
            const updatedSource = {
              ...source,
              content: null,
              actuationCount: 0,
              generatorOutput: undefined,
            };

            if (sourceIsInv) newInventory[sourceIndex] = updatedSource;
            else newGrid[sourceIndex] = updatedSource;
            newGrid[targetIndex] = updatedTarget;

            set({
              grid: newGrid,
              inventory: newInventory,
              selectedCellId: targetId,
            });
          }
        }
      },

      destroyItem: (cellId) => {
        const { grid, inventory } = get();
        const isInv = cellId.startsWith("inv-");
        const targetArray = isInv ? inventory : grid;
        const targetIndex = targetArray.findIndex((c) => c.id === cellId);

        if (targetIndex !== -1) {
          const newArray = [...targetArray];
          newArray[targetIndex] = {
            ...newArray[targetIndex],
            content: null,
            actuationCount: 0,
            generatorOutput: undefined,
          };
          if (get().selectedCellId === cellId) set({ selectedCellId: null });

          if (isInv) set({ inventory: newArray });
          else set({ grid: newArray });
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
