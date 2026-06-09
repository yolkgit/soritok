/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Player = 'black' | 'white';
export type CellState = Player | null;

export interface Position {
  x: number;
  y: number;
}

export function getNeighbors(pos: Position, boardSize: number): Position[] {
  const neighbors: Position[] = [];
  if (pos.x > 0) neighbors.push({ x: pos.x - 1, y: pos.y });
  if (pos.x < boardSize - 1) neighbors.push({ x: pos.x + 1, y: pos.y });
  if (pos.y > 0) neighbors.push({ x: pos.x, y: pos.y - 1 });
  if (pos.y < boardSize - 1) neighbors.push({ x: pos.x, y: pos.y + 1 });
  return neighbors;
}

export function findGroup(board: CellState[][], pos: Position, boardSize: number): { group: Position[], liberties: Position[] } {
  const color = board[pos.y][pos.x];
  if (!color) return { group: [], liberties: [] };

  const group: Position[] = [];
  const liberties = new Set<string>();
  const visited = new Set<string>();
  const stack: Position[] = [pos];

  while (stack.length > 0) {
    const current = stack.pop()!;
    const key = `${current.x},${current.y}`;
    if (visited.has(key)) continue;
    visited.add(key);
    group.push(current);

    for (const neighbor of getNeighbors(current, boardSize)) {
      const neighborColor = board[neighbor.y][neighbor.x];
      if (neighborColor === color) {
        stack.push(neighbor);
      } else if (neighborColor === null) {
        liberties.add(`${neighbor.x},${neighbor.y}`);
      }
    }
  }

  return {
    group,
    liberties: Array.from(liberties).map(k => {
      const [x, y] = k.split(',').map(Number);
      return { x, y };
    })
  };
}

export function calculateTerritory(board: CellState[][], boardSize: number): { black: number, white: number, territory: CellState[][] } {
  const territory: CellState[][] = Array(boardSize).fill(null).map(() => Array(boardSize).fill(null));
  const visited = new Set<string>();

  for (let y = 0; y < boardSize; y++) {
    for (let x = 0; x < boardSize; x++) {
      const key = `${x},${y}`;
      if (board[y][x] !== null || visited.has(key)) continue;

      const area: Position[] = [];
      const stack: Position[] = [{ x, y }];
      const borders = new Set<Player>();
      
      const areaVisited = new Set<string>();
      
      while (stack.length > 0) {
        const current = stack.pop()!;
        const currKey = `${current.x},${current.y}`;
        if (areaVisited.has(currKey)) continue;
        areaVisited.add(currKey);
        visited.add(currKey);
        area.push(current);

        for (const neighbor of getNeighbors(current, boardSize)) {
          const color = board[neighbor.y][neighbor.x];
          if (color === null) {
            stack.push(neighbor);
          } else {
            borders.add(color);
          }
        }
      }

      if (borders.size === 1) {
        const owner = Array.from(borders)[0];
        for (const p of area) {
          territory[p.y][p.x] = owner;
        }
      }
    }
  }

  let blackScore = 0;
  let whiteScore = 0;
  for (let y = 0; y < boardSize; y++) {
    for (let x = 0; x < boardSize; x++) {
      if (territory[y][x] === 'black') blackScore++;
      if (territory[y][x] === 'white') whiteScore++;
    }
  }

  return { black: blackScore, white: whiteScore, territory };
}
