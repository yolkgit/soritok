/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// GTP uses letters A-T (skipping I) for X coordinate, and numbers 1-19 for Y coordinate (from bottom to top).
const LETTERS = "ABCDEFGHJKLMNOPQRST";

export function toGtpVertex(x: number, y: number, boardSize: number): string {
  if (x < 0 || x >= boardSize || y < 0 || y >= boardSize) return 'pass';
  const letter = LETTERS[x];
  const number = boardSize - y;
  return `${letter}${number}`;
}

export function toScreenXY(vertex: string, boardSize: number): { x: number, y: number } | 'pass' | 'resign' {
  const v = vertex.toLowerCase().trim();
  if (v === 'pass' || v === '') return 'pass';
  if (v === 'resign') return 'resign';

  const letter = v.charAt(0).toUpperCase();
  const number = parseInt(v.substring(1), 10);

  const x = LETTERS.indexOf(letter);
  const y = boardSize - number;

  if (x === -1 || isNaN(number) || y < 0 || y >= boardSize) {
    return 'pass'; // Fallback for invalid
  }

  return { x, y };
}
