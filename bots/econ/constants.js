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

  // scouts
  SCOUT: 129,

  // stages:
  EXPLORATION: 149,
  BUILDUP: 150,
  ATTACK: 151,

  ELIMINATED_ENEMY: 200,
  ABANDON_ESCORT: 201,
  LOST_ESCORT: 202,

}

let CIRCLES = {};

CIRCLES[1] = [[1, 0], [0, 1], [0, -1], [-1, 0]];
CIRCLES[2] = [[1, 1], [1, -1], [-1, 1], [-1, -1]].concat(CIRCLES[1]);
CIRCLES[3] = CIRCLES[2];
CIRCLES[4] = [[2, 0], [0, 2], [0, -2], [-2, 0]].concat(CIRCLES[2]);
CIRCLES[5] = [[2, 1], [2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2], [-2, 1], [-2, -1]].concat(CIRCLES[4]);
CIRCLES[6] = CIRCLES[5];
CIRCLES[7] = CIRCLES[5];
CIRCLES[8] = [[2, 2], [2, -2], [-2, 2], [-2, -2]].concat(CIRCLES[5]);
CIRCLES[9] = [[3, 0], [0, 3], [0, -3], [-3, 0]].concat(CIRCLES[8]);
CIRCLES[10] = [[3, 1], [3, -1], [1, 3], [1, -3], [-1, 3], [-1, -3], [-3, 1], [-3, -1]].concat(CIRCLES[9]);
CIRCLES[11] = CIRCLES[10];
CIRCLES[12] = CIRCLES[10];
CIRCLES[13] = [[3, 2], [3, -2], [2, 3], [2, -3], [-2, 3], [-2, -3], [-3, 2], [-3, -2]].concat(CIRCLES[10]);
CIRCLES[14] = CIRCLES[13];
CIRCLES[15] = CIRCLES[13];
CIRCLES[16] = [[4, 0], [0, 4], [0, -4], [-4, 0]].concat(CIRCLES[13]);
CIRCLES[17] = [[4, 1], [4, -1], [1, 4], [1, -4], [-1, 4], [-1, -4], [-4, 1], [-4, -1]].concat(CIRCLES[16]);
CIRCLES[18] = [[3, 3], [3, -3], [-3, 3], [-3, -3]].concat(CIRCLES[17]);
CIRCLES[19] = CIRCLES[18];
CIRCLES[20] = [[4, 2], [4, -2], [2, 4], [2, -4], [-2, 4], [-2, -4], [-4, 2], [-4, -2]].concat(CIRCLES[18]);
CIRCLES[21] = CIRCLES[20];
CIRCLES[22] = CIRCLES[20];
CIRCLES[23] = CIRCLES[20];
CIRCLES[24] = CIRCLES[20];
CIRCLES[25] = [[5, 0], [4, 3], [4, -3], [3, 4], [3, -4], [0, 5], [0, -5], [-3, 4], [-3, -4], [-4, 3], [-4, -3], [-5, 0]].concat(CIRCLES[20]);
CIRCLES[26] = [[5, 1], [5, -1], [1, 5], [1, -5], [-1, 5], [-1, -5], [-5, 1], [-5, -1]].concat(CIRCLES[25]);
CIRCLES[27] = CIRCLES[26];
CIRCLES[28] = CIRCLES[26];
CIRCLES[29] = [[5, 2], [5, -2], [2, 5], [2, -5], [-2, 5], [-2, -5], [-5, 2], [-5, -2]].concat(CIRCLES[26]);
CIRCLES[30] = CIRCLES[29];
CIRCLES[31] = CIRCLES[29];
CIRCLES[32] = [[4, 4], [4, -4], [-4, 4], [-4, -4]].concat(CIRCLES[29]);
CIRCLES[33] = CIRCLES[32];
CIRCLES[34] = [[5, 3], [5, -3], [3, 5], [3, -5], [-3, 5], [-3, -5], [-5, 3], [-5, -3]].concat(CIRCLES[32]);
CIRCLES[35] = CIRCLES[34];
CIRCLES[36] = [[6, 0], [0, 6], [0, -6], [-6, 0]].concat(CIRCLES[34]);
CIRCLES[37] = [[6, 1], [6, -1], [1, 6], [1, -6], [-1, 6], [-1, -6], [-6, 1], [-6, -1]].concat(CIRCLES[36]);
CIRCLES[38] = CIRCLES[37];
CIRCLES[39] = CIRCLES[37];
CIRCLES[40] = [[6, 2], [6, -2], [2, 6], [2, -6], [-2, 6], [-2, -6], [-6, 2], [-6, -2]].concat(CIRCLES[37]);
CIRCLES[41] = [[5, 4], [5, -4], [4, 5], [4, -5], [-4, 5], [-4, -5], [-5, 4], [-5, -4]].concat(CIRCLES[40]);
CIRCLES[42] = CIRCLES[41];
CIRCLES[43] = CIRCLES[41];
CIRCLES[44] = CIRCLES[41];
CIRCLES[45] = [[6, 3], [6, -3], [3, 6], [3, -6], [-3, 6], [-3, -6], [-6, 3], [-6, -3]].concat(CIRCLES[41]);
CIRCLES[46] = CIRCLES[45];
CIRCLES[47] = CIRCLES[45];
CIRCLES[48] = CIRCLES[45];
CIRCLES[49] = [[7, 0], [0, 7], [0, -7], [-7, 0]].concat(CIRCLES[45]);
CIRCLES[50] = [[7, 1], [7, -1], [5, 5], [5, -5], [1, 7], [1, -7], [-1, 7], [-1, -7], [-5, 5], [-5, -5], [-7, 1], [-7, -1]].concat(CIRCLES[49]);
CIRCLES[51] = CIRCLES[50];
CIRCLES[52] = [[6, 4], [6, -4], [4, 6], [4, -6], [-4, 6], [-4, -6], [-6, 4], [-6, -4]].concat(CIRCLES[50]);
CIRCLES[53] = [[7, 2], [7, -2], [2, 7], [2, -7], [-2, 7], [-2, -7], [-7, 2], [-7, -2]].concat(CIRCLES[52]);
CIRCLES[54] = CIRCLES[53];
CIRCLES[55] = CIRCLES[53];
CIRCLES[56] = CIRCLES[53];
CIRCLES[57] = CIRCLES[53];
CIRCLES[58] = [[7, 3], [7, -3], [3, 7], [3, -7], [-3, 7], [-3, -7], [-7, 3], [-7, -3]].concat(CIRCLES[53]);
CIRCLES[59] = CIRCLES[58];
CIRCLES[60] = CIRCLES[58];
CIRCLES[61] = [[6, 5], [6, -5], [5, 6], [5, -6], [-5, 6], [-5, -6], [-6, 5], [-6, -5]].concat(CIRCLES[58]);
CIRCLES[62] = CIRCLES[61];
CIRCLES[63] = CIRCLES[61];
CIRCLES[64] = [[8, 0], [0, 8], [0, -8], [-8, 0]].concat(CIRCLES[61]);
CIRCLES[65] = [[8, 1], [8, -1], [7, 4], [7, -4], [4, 7], [4, -7], [1, 8], [1, -8], [-1, 8], [-1, -8], [-4, 7], [-4, -7], [-7, 4], [-7, -4], [-8, 1], [-8, -1]].concat(CIRCLES[64]);
CIRCLES[66] = CIRCLES[65];
CIRCLES[67] = CIRCLES[65];
CIRCLES[68] = [[8, 2], [8, -2], [2, 8], [2, -8], [-2, 8], [-2, -8], [-8, 2], [-8, -2]].concat(CIRCLES[65]);
CIRCLES[69] = CIRCLES[68];
CIRCLES[70] = CIRCLES[68];
CIRCLES[71] = CIRCLES[68];
CIRCLES[72] = [[6, 6], [6, -6], [-6, 6], [-6, -6]].concat(CIRCLES[68]);
CIRCLES[73] = [[8, 3], [8, -3], [3, 8], [3, -8], [-3, 8], [-3, -8], [-8, 3], [-8, -3]].concat(CIRCLES[72]);
CIRCLES[74] = [[7, 5], [7, -5], [5, 7], [5, -7], [-5, 7], [-5, -7], [-7, 5], [-7, -5]].concat(CIRCLES[73]);
CIRCLES[75] = CIRCLES[74];
CIRCLES[76] = CIRCLES[74];
CIRCLES[77] = CIRCLES[74];
CIRCLES[78] = CIRCLES[74];
CIRCLES[79] = CIRCLES[74];
CIRCLES[80] = [[8, 4], [8, -4], [4, 8], [4, -8], [-4, 8], [-4, -8], [-8, 4], [-8, -4]].concat(CIRCLES[74]);
CIRCLES[81] = [[9, 0], [0, 9], [0, -9], [-9, 0]].concat(CIRCLES[80]);
CIRCLES[82] = [[9, 1], [9, -1], [1, 9], [1, -9], [-1, 9], [-1, -9], [-9, 1], [-9, -1]].concat(CIRCLES[81]);
CIRCLES[83] = CIRCLES[82];
CIRCLES[84] = CIRCLES[82];
CIRCLES[85] = [[9, 2], [9, -2], [7, 6], [7, -6], [6, 7], [6, -7], [2, 9], [2, -9], [-2, 9], [-2, -9], [-6, 7], [-6, -7], [-7, 6], [-7, -6], [-9, 2], [-9, -2]].concat(CIRCLES[82]);
CIRCLES[86] = CIRCLES[85];
CIRCLES[87] = CIRCLES[85];
CIRCLES[88] = CIRCLES[85];
CIRCLES[89] = [[8, 5], [8, -5], [5, 8], [5, -8], [-5, 8], [-5, -8], [-8, 5], [-8, -5]].concat(CIRCLES[85]);
CIRCLES[90] = [[9, 3], [9, -3], [3, 9], [3, -9], [-3, 9], [-3, -9], [-9, 3], [-9, -3]].concat(CIRCLES[89]);
CIRCLES[91] = CIRCLES[90];
CIRCLES[92] = CIRCLES[90];
CIRCLES[93] = CIRCLES[90];
CIRCLES[94] = CIRCLES[90];
CIRCLES[95] = CIRCLES[90];
CIRCLES[96] = CIRCLES[90];
CIRCLES[97] = [[9, 4], [9, -4], [4, 9], [4, -9], [-4, 9], [-4, -9], [-9, 4], [-9, -4]].concat(CIRCLES[90]);
CIRCLES[98] = [[7, 7], [7, -7], [-7, 7], [-7, -7]].concat(CIRCLES[97]);
CIRCLES[99] = CIRCLES[98];
CIRCLES[100] = [[10, 0], [8, 6], [8, -6], [6, 8], [6, -8], [0, 10], [0, -10], [-6, 8], [-6, -8], [-8, 6], [-8, -6], [-10, 0]].concat(CIRCLES[98]);

export {CIRCLES};

/* EFFICIENT CIRCLES CREATION SCRIPT

lastChange = 0;
for r in range(1, 101):
  a = []
  for i in range(-r, r+1):
    for j in range(-r, r+1):
      if [i,j] != [0,0]:
        if (i*i) + (j*j) == r:
          a.append([i, j])
  a.sort(key=lambda x: x[0]**2 + x[1]**2)
  a.reverse()

  if r == 1:
    print("CIRCLES[{}] = {};".format(r, a))
  elif a:
    print("CIRCLES[{}] = {}.concat(CIRCLES[{}]);".format(r, a, lastChange))
  else:
    print("CIRCLES[{}] = CIRCLES[{}];".format(r, lastChange))

  if a:
    lastChange = r

*/