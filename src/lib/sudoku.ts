/**
 * Sudoku solver using backtracking.
 */

export type SudokuGrid = number[][];

export function solveSudoku(grid: SudokuGrid): SudokuGrid | null {
  const result = grid.map(row => [...row]);
  if (solve(result)) {
    return result;
  }
  return null;
}

function solve(grid: SudokuGrid): boolean {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (grid[row][col] === 0) {
        for (let num = 1; num <= 9; num++) {
          if (isValid(grid, row, col, num)) {
            grid[row][col] = num;
            if (solve(grid)) {
              return true;
            }
            grid[row][col] = 0; // Backtrack
          }
        }
        return false;
      }
    }
  }
  return true;
}

function isValid(grid: SudokuGrid, row: number, col: number, num: number): boolean {
  // Check row
  for (let x = 0; x < 9; x++) {
    if (grid[row][x] === num) return false;
  }

  // Check column
  for (let x = 0; x < 9; x++) {
    if (grid[x][col] === num) return false;
  }

  // Check 3x3 box
  const startRow = row - (row % 3);
  const startCol = col - (col % 3);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (grid[i + startRow][j + startCol] === num) return false;
    }
  }

  return true;
}

export function isValidInitialGrid(grid: SudokuGrid): boolean {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const num = grid[row][col];
      if (num !== 0) {
        grid[row][col] = 0;
        if (!isValid(grid, row, col, num)) {
          grid[row][col] = num;
          return false;
        }
        grid[row][col] = num;
      }
    }
  }
  return true;
}
