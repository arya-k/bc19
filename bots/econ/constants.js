export let CONSTANTS = {
  // attacking troops:
  DEFENSE: 100,
  OFFENSE: 101,
  ESCORT: 102,

  // pilgrims:
  MINE: 125,
  DEPOSIT: 126,
  BUILD: 127,
  FOUND_NEARBY_BASE: 128,

  // stages:
  EXPLORATION: 149,
  BUILDUP: 150,
  ATTACK: 151,

  ELIMINATED_ENEMY: 200,
  ABANDON_ESCORT: 201,
  LOST_ESCORT: 202,

}

export const CIRCLES = { // all directions within R^2 of a point
  1: [[1, 0], [0, 1], [0, -1], [-1, 0]],
  2: [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [0, 1], [0, -1], [-1, 0]],
  3: [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [0, 1], [0, -1], [-1, 0]],
  4: [[2, 0], [0, 2], [0, -2], [-2, 0], [1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [0, 1], [0, -1], [-1, 0]],
  5: [[2, 1], [2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2], [-2, 1], [-2, -1], [2, 0], [0, 2], [0, -2], [-2, 0], [1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [0, 1], [0, -1], [-1, 0]],
  6: [[2, 1], [2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2], [-2, 1], [-2, -1], [2, 0], [0, 2], [0, -2], [-2, 0], [1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [0, 1], [0, -1], [-1, 0]],
  7: [[2, 1], [2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2], [-2, 1], [-2, -1], [2, 0], [0, 2], [0, -2], [-2, 0], [1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [0, 1], [0, -1], [-1, 0]],
  8: [[2, 2], [2, -2], [-2, 2], [-2, -2], [2, 1], [2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2], [-2, 1], [-2, -1], [2, 0], [0, 2], [0, -2], [-2, 0], [1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [0, 1], [0, -1], [-1, 0]],
  9: [[3, 0], [0, 3], [0, -3], [-3, 0], [2, 2], [2, -2], [-2, 2], [-2, -2], [2, 1], [2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2], [-2, 1], [-2, -1], [2, 0], [0, 2], [0, -2], [-2, 0], [1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [0, 1], [0, -1], [-1, 0]],
  10: [[3, 1], [3, -1], [1, 3], [1, -3], [-1, 3], [-1, -3], [-3, 1], [-3, -1], [3, 0], [0, 3], [0, -3], [-3, 0], [2, 2], [2, -2], [-2, 2], [-2, -2], [2, 1], [2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2], [-2, 1], [-2, -1], [2, 0], [0, 2], [0, -2], [-2, 0], [1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [0, 1], [0, -1], [-1, 0]],
  11: [[3, 1], [3, -1], [1, 3], [1, -3], [-1, 3], [-1, -3], [-3, 1], [-3, -1], [3, 0], [0, 3], [0, -3], [-3, 0], [2, 2], [2, -2], [-2, 2], [-2, -2], [2, 1], [2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2], [-2, 1], [-2, -1], [2, 0], [0, 2], [0, -2], [-2, 0], [1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [0, 1], [0, -1], [-1, 0]],
  12: [[3, 1], [3, -1], [1, 3], [1, -3], [-1, 3], [-1, -3], [-3, 1], [-3, -1], [3, 0], [0, 3], [0, -3], [-3, 0], [2, 2], [2, -2], [-2, 2], [-2, -2], [2, 1], [2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2], [-2, 1], [-2, -1], [2, 0], [0, 2], [0, -2], [-2, 0], [1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [0, 1], [0, -1], [-1, 0]],
  13: [[3, 2], [3, -2], [2, 3], [2, -3], [-2, 3], [-2, -3], [-3, 2], [-3, -2], [3, 1], [3, -1], [1, 3], [1, -3], [-1, 3], [-1, -3], [-3, 1], [-3, -1], [3, 0], [0, 3], [0, -3], [-3, 0], [2, 2], [2, -2], [-2, 2], [-2, -2], [2, 1], [2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2], [-2, 1], [-2, -1], [2, 0], [0, 2], [0, -2], [-2, 0], [1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [0, 1], [0, -1], [-1, 0]],
  14: [[3, 2], [3, -2], [2, 3], [2, -3], [-2, 3], [-2, -3], [-3, 2], [-3, -2], [3, 1], [3, -1], [1, 3], [1, -3], [-1, 3], [-1, -3], [-3, 1], [-3, -1], [3, 0], [0, 3], [0, -3], [-3, 0], [2, 2], [2, -2], [-2, 2], [-2, -2], [2, 1], [2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2], [-2, 1], [-2, -1], [2, 0], [0, 2], [0, -2], [-2, 0], [1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [0, 1], [0, -1], [-1, 0]],
  15: [[3, 2], [3, -2], [2, 3], [2, -3], [-2, 3], [-2, -3], [-3, 2], [-3, -2], [3, 1], [3, -1], [1, 3], [1, -3], [-1, 3], [-1, -3], [-3, 1], [-3, -1], [3, 0], [0, 3], [0, -3], [-3, 0], [2, 2], [2, -2], [-2, 2], [-2, -2], [2, 1], [2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2], [-2, 1], [-2, -1], [2, 0], [0, 2], [0, -2], [-2, 0], [1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [0, 1], [0, -1], [-1, 0]],
  16: [[4, 0], [0, 4], [0, -4], [-4, 0], [3, 2], [3, -2], [2, 3], [2, -3], [-2, 3], [-2, -3], [-3, 2], [-3, -2], [3, 1], [3, -1], [1, 3], [1, -3], [-1, 3], [-1, -3], [-3, 1], [-3, -1], [3, 0], [0, 3], [0, -3], [-3, 0], [2, 2], [2, -2], [-2, 2], [-2, -2], [2, 1], [2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2], [-2, 1], [-2, -1], [2, 0], [0, 2], [0, -2], [-2, 0], [1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [0, 1], [0, -1], [-1, 0]],
  25: [[5, 0], [4, 3], [4, -3], [3, 4], [3, -4], [0, 5], [0, -5], [-3, 4], [-3, -4], [-4, 3], [-4, -3], [-5, 0], [4, 2], [4, -2], [2, 4], [2, -4], [-2, 4], [-2, -4], [-4, 2], [-4, -2], [3, 3], [3, -3], [-3, 3], [-3, -3], [4, 1], [4, -1], [1, 4], [1, -4], [-1, 4], [-1, -4], [-4, 1], [-4, -1], [4, 0], [0, 4], [0, -4], [-4, 0], [3, 2], [3, -2], [2, 3], [2, -3], [-2, 3], [-2, -3], [-3, 2], [-3, -2], [3, 1], [3, -1], [1, 3], [1, -3], [-1, 3], [-1, -3], [-3, 1], [-3, -1], [3, 0], [0, 3], [0, -3], [-3, 0], [2, 2], [2, -2], [-2, 2], [-2, -2], [2, 1], [2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2], [-2, 1], [-2, -1], [2, 0], [0, 2], [0, -2], [-2, 0], [1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [0, 1], [0, -1], [-1, 0]],
  36: [[6, 0], [0, 6], [0, -6], [-6, 0], [5, 3], [5, -3], [3, 5], [3, -5], [-3, 5], [-3, -5], [-5, 3], [-5, -3], [4, 4], [4, -4], [-4, 4], [-4, -4], [5, 2], [5, -2], [2, 5], [2, -5], [-2, 5], [-2, -5], [-5, 2], [-5, -2], [5, 1], [5, -1], [1, 5], [1, -5], [-1, 5], [-1, -5], [-5, 1], [-5, -1], [5, 0], [4, 3], [4, -3], [3, 4], [3, -4], [0, 5], [0, -5], [-3, 4], [-3, -4], [-4, 3], [-4, -3], [-5, 0], [4, 2], [4, -2], [2, 4], [2, -4], [-2, 4], [-2, -4], [-4, 2], [-4, -2], [3, 3], [3, -3], [-3, 3], [-3, -3], [4, 1], [4, -1], [1, 4], [1, -4], [-1, 4], [-1, -4], [-4, 1], [-4, -1], [4, 0], [0, 4], [0, -4], [-4, 0], [3, 2], [3, -2], [2, 3], [2, -3], [-2, 3], [-2, -3], [-3, 2], [-3, -2], [3, 1], [3, -1], [1, 3], [1, -3], [-1, 3], [-1, -3], [-3, 1], [-3, -1], [3, 0], [0, 3], [0, -3], [-3, 0], [2, 2], [2, -2], [-2, 2], [-2, -2], [2, 1], [2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2], [-2, 1], [-2, -1], [2, 0], [0, 2], [0, -2], [-2, 0], [1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [0, 1], [0, -1], [-1, 0]],
  49: [[7, 0], [0, 7], [0, -7], [-7, 0], [6, 3], [6, -3], [3, 6], [3, -6], [-3, 6], [-3, -6], [-6, 3], [-6, -3], [5, 4], [5, -4], [4, 5], [4, -5], [-4, 5], [-4, -5], [-5, 4], [-5, -4], [6, 2], [6, -2], [2, 6], [2, -6], [-2, 6], [-2, -6], [-6, 2], [-6, -2], [6, 1], [6, -1], [1, 6], [1, -6], [-1, 6], [-1, -6], [-6, 1], [-6, -1], [6, 0], [0, 6], [0, -6], [-6, 0], [5, 3], [5, -3], [3, 5], [3, -5], [-3, 5], [-3, -5], [-5, 3], [-5, -3], [4, 4], [4, -4], [-4, 4], [-4, -4], [5, 2], [5, -2], [2, 5], [2, -5], [-2, 5], [-2, -5], [-5, 2], [-5, -2], [5, 1], [5, -1], [1, 5], [1, -5], [-1, 5], [-1, -5], [-5, 1], [-5, -1], [5, 0], [4, 3], [4, -3], [3, 4], [3, -4], [0, 5], [0, -5], [-3, 4], [-3, -4], [-4, 3], [-4, -3], [-5, 0], [4, 2], [4, -2], [2, 4], [2, -4], [-2, 4], [-2, -4], [-4, 2], [-4, -2], [3, 3], [3, -3], [-3, 3], [-3, -3], [4, 1], [4, -1], [1, 4], [1, -4], [-1, 4], [-1, -4], [-4, 1], [-4, -1], [4, 0], [0, 4], [0, -4], [-4, 0], [3, 2], [3, -2], [2, 3], [2, -3], [-2, 3], [-2, -3], [-3, 2], [-3, -2], [3, 1], [3, -1], [1, 3], [1, -3], [-1, 3], [-1, -3], [-3, 1], [-3, -1], [3, 0], [0, 3], [0, -3], [-3, 0], [2, 2], [2, -2], [-2, 2], [-2, -2], [2, 1], [2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2], [-2, 1], [-2, -1], [2, 0], [0, 2], [0, -2], [-2, 0], [1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [0, 1], [0, -1], [-1, 0]],
  64: [[8, 0], [0, 8], [0, -8], [-8, 0], [6, 5], [6, -5], [5, 6], [5, -6], [-5, 6], [-5, -6], [-6, 5], [-6, -5], [7, 3], [7, -3], [3, 7], [3, -7], [-3, 7], [-3, -7], [-7, 3], [-7, -3], [7, 2], [7, -2], [2, 7], [2, -7], [-2, 7], [-2, -7], [-7, 2], [-7, -2], [6, 4], [6, -4], [4, 6], [4, -6], [-4, 6], [-4, -6], [-6, 4], [-6, -4], [7, 1], [7, -1], [5, 5], [5, -5], [1, 7], [1, -7], [-1, 7], [-1, -7], [-5, 5], [-5, -5], [-7, 1], [-7, -1], [7, 0], [0, 7], [0, -7], [-7, 0], [6, 3], [6, -3], [3, 6], [3, -6], [-3, 6], [-3, -6], [-6, 3], [-6, -3], [5, 4], [5, -4], [4, 5], [4, -5], [-4, 5], [-4, -5], [-5, 4], [-5, -4], [6, 2], [6, -2], [2, 6], [2, -6], [-2, 6], [-2, -6], [-6, 2], [-6, -2], [6, 1], [6, -1], [1, 6], [1, -6], [-1, 6], [-1, -6], [-6, 1], [-6, -1], [6, 0], [0, 6], [0, -6], [-6, 0], [5, 3], [5, -3], [3, 5], [3, -5], [-3, 5], [-3, -5], [-5, 3], [-5, -3], [4, 4], [4, -4], [-4, 4], [-4, -4], [5, 2], [5, -2], [2, 5], [2, -5], [-2, 5], [-2, -5], [-5, 2], [-5, -2], [5, 1], [5, -1], [1, 5], [1, -5], [-1, 5], [-1, -5], [-5, 1], [-5, -1], [5, 0], [4, 3], [4, -3], [3, 4], [3, -4], [0, 5], [0, -5], [-3, 4], [-3, -4], [-4, 3], [-4, -3], [-5, 0], [4, 2], [4, -2], [2, 4], [2, -4], [-2, 4], [-2, -4], [-4, 2], [-4, -2], [3, 3], [3, -3], [-3, 3], [-3, -3], [4, 1], [4, -1], [1, 4], [1, -4], [-1, 4], [-1, -4], [-4, 1], [-4, -1], [4, 0], [0, 4], [0, -4], [-4, 0], [3, 2], [3, -2], [2, 3], [2, -3], [-2, 3], [-2, -3], [-3, 2], [-3, -2], [3, 1], [3, -1], [1, 3], [1, -3], [-1, 3], [-1, -3], [-3, 1], [-3, -1], [3, 0], [0, 3], [0, -3], [-3, 0], [2, 2], [2, -2], [-2, 2], [-2, -2], [2, 1], [2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2], [-2, 1], [-2, -1], [2, 0], [0, 2], [0, -2], [-2, 0], [1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [0, 1], [0, -1], [-1, 0]],
  81: [[9, 0], [0, 9], [0, -9], [-9, 0], [8, 4], [8, -4], [4, 8], [4, -8], [-4, 8], [-4, -8], [-8, 4], [-8, -4], [7, 5], [7, -5], [5, 7], [5, -7], [-5, 7], [-5, -7], [-7, 5], [-7, -5], [8, 3], [8, -3], [3, 8], [3, -8], [-3, 8], [-3, -8], [-8, 3], [-8, -3], [6, 6], [6, -6], [-6, 6], [-6, -6], [8, 2], [8, -2], [2, 8], [2, -8], [-2, 8], [-2, -8], [-8, 2], [-8, -2], [8, 1], [8, -1], [7, 4], [7, -4], [4, 7], [4, -7], [1, 8], [1, -8], [-1, 8], [-1, -8], [-4, 7], [-4, -7], [-7, 4], [-7, -4], [-8, 1], [-8, -1], [8, 0], [0, 8], [0, -8], [-8, 0], [6, 5], [6, -5], [5, 6], [5, -6], [-5, 6], [-5, -6], [-6, 5], [-6, -5], [7, 3], [7, -3], [3, 7], [3, -7], [-3, 7], [-3, -7], [-7, 3], [-7, -3], [7, 2], [7, -2], [2, 7], [2, -7], [-2, 7], [-2, -7], [-7, 2], [-7, -2], [6, 4], [6, -4], [4, 6], [4, -6], [-4, 6], [-4, -6], [-6, 4], [-6, -4], [7, 1], [7, -1], [5, 5], [5, -5], [1, 7], [1, -7], [-1, 7], [-1, -7], [-5, 5], [-5, -5], [-7, 1], [-7, -1], [7, 0], [0, 7], [0, -7], [-7, 0], [6, 3], [6, -3], [3, 6], [3, -6], [-3, 6], [-3, -6], [-6, 3], [-6, -3], [5, 4], [5, -4], [4, 5], [4, -5], [-4, 5], [-4, -5], [-5, 4], [-5, -4], [6, 2], [6, -2], [2, 6], [2, -6], [-2, 6], [-2, -6], [-6, 2], [-6, -2], [6, 1], [6, -1], [1, 6], [1, -6], [-1, 6], [-1, -6], [-6, 1], [-6, -1], [6, 0], [0, 6], [0, -6], [-6, 0], [5, 3], [5, -3], [3, 5], [3, -5], [-3, 5], [-3, -5], [-5, 3], [-5, -3], [4, 4], [4, -4], [-4, 4], [-4, -4], [5, 2], [5, -2], [2, 5], [2, -5], [-2, 5], [-2, -5], [-5, 2], [-5, -2], [5, 1], [5, -1], [1, 5], [1, -5], [-1, 5], [-1, -5], [-5, 1], [-5, -1], [5, 0], [4, 3], [4, -3], [3, 4], [3, -4], [0, 5], [0, -5], [-3, 4], [-3, -4], [-4, 3], [-4, -3], [-5, 0], [4, 2], [4, -2], [2, 4], [2, -4], [-2, 4], [-2, -4], [-4, 2], [-4, -2], [3, 3], [3, -3], [-3, 3], [-3, -3], [4, 1], [4, -1], [1, 4], [1, -4], [-1, 4], [-1, -4], [-4, 1], [-4, -1], [4, 0], [0, 4], [0, -4], [-4, 0], [3, 2], [3, -2], [2, 3], [2, -3], [-2, 3], [-2, -3], [-3, 2], [-3, -2], [3, 1], [3, -1], [1, 3], [1, -3], [-1, 3], [-1, -3], [-3, 1], [-3, -1], [3, 0], [0, 3], [0, -3], [-3, 0], [2, 2], [2, -2], [-2, 2], [-2, -2], [2, 1], [2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2], [-2, 1], [-2, -1], [2, 0], [0, 2], [0, -2], [-2, 0], [1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [0, 1], [0, -1], [-1, 0]],
  100: [[10, 0], [8, 6], [8, -6], [6, 8], [6, -8], [0, 10], [0, -10], [-6, 8], [-6, -8], [-8, 6], [-8, -6], [-10, 0], [7, 7], [7, -7], [-7, 7], [-7, -7], [9, 4], [9, -4], [4, 9], [4, -9], [-4, 9], [-4, -9], [-9, 4], [-9, -4], [9, 3], [9, -3], [3, 9], [3, -9], [-3, 9], [-3, -9], [-9, 3], [-9, -3], [8, 5], [8, -5], [5, 8], [5, -8], [-5, 8], [-5, -8], [-8, 5], [-8, -5], [9, 2], [9, -2], [7, 6], [7, -6], [6, 7], [6, -7], [2, 9], [2, -9], [-2, 9], [-2, -9], [-6, 7], [-6, -7], [-7, 6], [-7, -6], [-9, 2], [-9, -2], [9, 1], [9, -1], [1, 9], [1, -9], [-1, 9], [-1, -9], [-9, 1], [-9, -1], [9, 0], [0, 9], [0, -9], [-9, 0], [8, 4], [8, -4], [4, 8], [4, -8], [-4, 8], [-4, -8], [-8, 4], [-8, -4], [7, 5], [7, -5], [5, 7], [5, -7], [-5, 7], [-5, -7], [-7, 5], [-7, -5], [8, 3], [8, -3], [3, 8], [3, -8], [-3, 8], [-3, -8], [-8, 3], [-8, -3], [6, 6], [6, -6], [-6, 6], [-6, -6], [8, 2], [8, -2], [2, 8], [2, -8], [-2, 8], [-2, -8], [-8, 2], [-8, -2], [8, 1], [8, -1], [7, 4], [7, -4], [4, 7], [4, -7], [1, 8], [1, -8], [-1, 8], [-1, -8], [-4, 7], [-4, -7], [-7, 4], [-7, -4], [-8, 1], [-8, -1], [8, 0], [0, 8], [0, -8], [-8, 0], [6, 5], [6, -5], [5, 6], [5, -6], [-5, 6], [-5, -6], [-6, 5], [-6, -5], [7, 3], [7, -3], [3, 7], [3, -7], [-3, 7], [-3, -7], [-7, 3], [-7, -3], [7, 2], [7, -2], [2, 7], [2, -7], [-2, 7], [-2, -7], [-7, 2], [-7, -2], [6, 4], [6, -4], [4, 6], [4, -6], [-4, 6], [-4, -6], [-6, 4], [-6, -4], [7, 1], [7, -1], [5, 5], [5, -5], [1, 7], [1, -7], [-1, 7], [-1, -7], [-5, 5], [-5, -5], [-7, 1], [-7, -1], [7, 0], [0, 7], [0, -7], [-7, 0], [6, 3], [6, -3], [3, 6], [3, -6], [-3, 6], [-3, -6], [-6, 3], [-6, -3], [5, 4], [5, -4], [4, 5], [4, -5], [-4, 5], [-4, -5], [-5, 4], [-5, -4], [6, 2], [6, -2], [2, 6], [2, -6], [-2, 6], [-2, -6], [-6, 2], [-6, -2], [6, 1], [6, -1], [1, 6], [1, -6], [-1, 6], [-1, -6], [-6, 1], [-6, -1], [6, 0], [0, 6], [0, -6], [-6, 0], [5, 3], [5, -3], [3, 5], [3, -5], [-3, 5], [-3, -5], [-5, 3], [-5, -3], [4, 4], [4, -4], [-4, 4], [-4, -4], [5, 2], [5, -2], [2, 5], [2, -5], [-2, 5], [-2, -5], [-5, 2], [-5, -2], [5, 1], [5, -1], [1, 5], [1, -5], [-1, 5], [-1, -5], [-5, 1], [-5, -1], [5, 0], [4, 3], [4, -3], [3, 4], [3, -4], [0, 5], [0, -5], [-3, 4], [-3, -4], [-4, 3], [-4, -3], [-5, 0], [4, 2], [4, -2], [2, 4], [2, -4], [-2, 4], [-2, -4], [-4, 2], [-4, -2], [3, 3], [3, -3], [-3, 3], [-3, -3], [4, 1], [4, -1], [1, 4], [1, -4], [-1, 4], [-1, -4], [-4, 1], [-4, -1], [4, 0], [0, 4], [0, -4], [-4, 0], [3, 2], [3, -2], [2, 3], [2, -3], [-2, 3], [-2, -3], [-3, 2], [-3, -2], [3, 1], [3, -1], [1, 3], [1, -3], [-1, 3], [-1, -3], [-3, 1], [-3, -1], [3, 0], [0, 3], [0, -3], [-3, 0], [2, 2], [2, -2], [-2, 2], [-2, -2], [2, 1], [2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2], [-2, 1], [-2, -1], [2, 0], [0, 2], [0, -2], [-2, 0], [1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [0, 1], [0, -1], [-1, 0]],
}