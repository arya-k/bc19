import {SPECS} from 'battlecode';
import {CONSTANTS,COMM8,COMM16,CIRCLES} from './constants.js'
import {move_towards, move_to} from './path.js'

function dist(a, b) {
  return (a[0]-b[0])**2 + (a[1]-b[1])**2
}

// PSEUDOCODE
function defensiveBehavior(self, mode_location, base_location) {
  // If you see the enemy, engage (moving towards if you need to).
  // Once you've killed the enemy, return to castle/church and deposit resources.
  const vis_map = self.getVisibleRobotMap()

  for (const r of self.getVisibleRobots()) {
    if (r.unit !== null && r.team != self.me.team) {
      if (dist([r.x, r.y], [self.me.x, self.me.y]) <= SPECS.UNITS[self.me.unit].ATTACK_RADIUS[1]) {
        return self.attack(r.x - self.me.x, r.y - self.me.y)
      }
    }
  }

  for (const r of self.getVisibleRobots()) {
    if (r.unit !== null && r.team != self.me.team) {
      let move = move_towards(self.map, self.getVisibleRobotMap(), [self.me.x, self.me.y], [r.x, r.y], SPECS.UNITS[self.me.unit].SPEED,
                              SPECS.UNITS[self.me.unit].ATTACK_RADIUS[0], SPECS.UNITS[self.me.unit].ATTACK_RADIUS[1])
      if (move !== null) {
        return self.move(move.x - self.me.x, move.y - self.me.y);
      }
    }
  }

  if (mode_location !== null) {
    if (vis_map[mode_location[1]][mode_location[0]] == -1) {
      let move = move_towards(self.map, self.getVisibleRobotMap(), [self.me.x, self.me.y], mode_location, SPECS.UNITS[self.me.unit].SPEED,
                            SPECS.UNITS[self.me.unit].ATTACK_RADIUS[0], SPECS.UNITS[self.me.unit].ATTACK_RADIUS[1])
      if (move !== null) {
        return self.move(move.x - self.me.x, move.y - self.me.y);
      } else {
        return null;
      }
    } else {
      return CONSTANTS.ELIMINATED_ENEMY;
    }
  } else {
    if (Math.abs(self.me.x - base_location[0]) > 1 || Math.abs(self.me.y - base_location[1]) > 1) {
      let move = move_towards(self.map, self.getVisibleRobotMap(), [self.me.x, self.me.y], base_location, SPECS.UNITS[self.me.unit].SPEED, 1, 2)
      if (move !== null) {
        return self.move(move.x - self.me.x, move.y - self.me.y);
      } else {
        return null;
      }
    } else if (self.me.karbonite > 0 || self.me.fuel > 0) {
      return self.give(base_location[0] - self.me.x, base_location[1] - self.me.y, self.me.karbonite, self.me.fuel);
    } else {
      return null; // nothing to do, just camp out.
    }
  }
}

function offensiveBehavior(self, mode_location) {
  const vis_map = self.getVisibleRobotMap()

  for (const r of self.getVisibleRobots()) {
    if (r.unit !== null && r.team != self.me.team) {
      if (dist([r.x, r.y], [self.me.x, self.me.y]) <= SPECS.UNITS[self.me.unit].ATTACK_RADIUS[1]) {
        return self.attack(r.x - self.me.x, r.y - self.me.y)
      }
    }
  }

  for (const r of self.getVisibleRobots()) {
    if (r.unit !== null && r.team != self.me.team) {
      let move = move_towards(self.map, self.getVisibleRobotMap(), [self.me.x, self.me.y], [r.x, r.y], SPECS.UNITS[self.me.unit].SPEED,
                              SPECS.UNITS[self.me.unit].ATTACK_RADIUS[0], SPECS.UNITS[self.me.unit].ATTACK_RADIUS[1])
      if (move !== null) {
        return self.move(move.x - self.me.x, move.y - self.me.y);
      }
    }
  }

  if (vis_map[mode_location[1]][mode_location[0]] == -1) {
    let move = move_towards(self.map, self.getVisibleRobotMap(), [self.me.x, self.me.y], mode_location, SPECS.UNITS[self.me.unit].SPEED,
                            SPECS.UNITS[self.me.unit].ATTACK_RADIUS[0], SPECS.UNITS[self.me.unit].ATTACK_RADIUS[1])
    if (move !== null) {
      return self.move(move.x - self.me.x, move.y - self.me.y);
    } else {
      return null;
    }
  } else {
    return CONSTANTS.ELIMINATED_ENEMY;
  }
}

  
function escortBehavior(self, pilgrim_id) {
  let pilgrim = self.getRobot(pilgrim_id);
  const vis_map = self.getVisibleRobotMap();

  if (pilgrim == null) { // we lost our pilgrim!
    return [CONSTANTS.LOST_ESCORT]
  }

  for (const dir of CIRCLES[2]) {
    if (self.map[pilgrim.y + dir[1]] && self.map[pilgrim.y + dir[1]][pilgrim.x + dir[0]]) {
      if (vis_map[pilgrim.y + dir[1]][pilgrim.x + dir[0]] > 0) {
        let r = self.getRobot(vis_map[pilgrim.y + dir[1]][pilgrim.x + dir[0]]);
        if (r.unit == SPECS.CHURCH && r.team == self.me.team) {
          return [CONSTANTS.ABANDON_ESCORT, [r.x, r.y]]
        } 
      }
    }
  }

  for (const r of self.getVisibleRobots()) {
    if (r.unit !== null && r.team != self.me.team) {
      if (dist([r.x, r.y], [self.me.x, self.me.y]) <= SPECS.UNITS[self.me.unit].ATTACK_RADIUS[1]) {
        return [0, self.attack(r.x - self.me.x, r.y - self.me.y)]
      }
    }
  }

  let move = move_towards(self.map, vis_map, [self.me.x, self.me.y], [pilgrim.x, pilgrim.y], SPECS.UNITS[self.me.unit].SPEED, 1, 2);
  if (move !== null) {
    return [0, self.move(move.x - self.me.x, move.y - self.me.y)];
  } else {
    return [0, null];
  }
}

// Random move huh... maybe you should call me RANDOM EXPLORATION :))

function shuffleArray(array) {
  for (var i = array.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
}

function createVisitedMap(self, obj) {
  let dim = self.map.length;
  obj.visitedMap = [...Array(dim)].map(e => Array(dim).fill(false)); // create a 2d array (dim x dim)
}

function updateVisitedMap(self, obj) {
  for (const dir of CIRCLES[SPECS.UNITS[self.me.unit].VISION_RADIUS]) {
    if (self.map[self.me.y + dir[1]] && (self.map[self.me.y + dir[1]][self.me.x + dir[0]] !== undefined)) {
      obj.visitedMap[self.me.y + dir[1]][self.me.x + dir[0]] = true;
    }
  }
}

function Point(x, y, p){
  this.x = x;
  this.y = y;
  this.p = p;
}

function bfs(map, occ_map, vis_map, a, speed) {
  let visited = new Set()
  let queue = [new Point(a[0], a[1], null)]

  while (queue.length > 0) {
    let current = queue.shift()

    if (visited.has((current.y<<6) + current.x)) { continue; } // seen before.
    visited.add((current.y<<6) + current.x) // mark as visited

    // if the spot has not yet been visited.
    if (!vis_map[current.y][current.x]) {
      if (current.p === null) { return null; }
      while (current.p.p !== null) { current = current.p; }
      return current;
    }

    for (let i = CIRCLES[speed].length - 1; i >= 0; i--) {
      const dir = CIRCLES[speed][i];
      if (map[current.y + dir[1]] && map[current.y + dir[1]][current.x + dir[0]]) {
        if (occ_map[current.y + dir[1]][current.x + dir[0]] < 1) {
          queue.push(new Point(current.x + dir[0], current.y + dir[1], current))
        }
      }
    }
  }
  return null;
}

function randomMoveBehavior(self, obj) {
  for (const r of self.getVisibleRobots()) {
    if (r.unit !== null && r.team != self.me.team) {
      if (dist([r.x, r.y], [self.me.x, self.me.y]) <= SPECS.UNITS[self.me.unit].ATTACK_RADIUS[1]) {
        return self.attack(r.x - self.me.x, r.y - self.me.y)
      }
    }
  }

  for (const r of self.getVisibleRobots()) {
    if (r.unit !== null && r.team != self.me.team) {
      let move = move_towards(self.map, self.getVisibleRobotMap(), [self.me.x, self.me.y], [r.x, r.y], SPECS.UNITS[self.me.unit].SPEED,
                              SPECS.UNITS[self.me.unit].ATTACK_RADIUS[0], SPECS.UNITS[self.me.unit].ATTACK_RADIUS[1])
      if (move !== null) {
        return self.move(move.x - self.me.x, move.y - self.me.y);
      }
    }
  }

  // BFS towards an unseen spot:
  let move = bfs(self.map, self.getVisibleRobotMap(), obj.visitedMap, [self.me.x, self.me.y], SPECS.UNITS[self.me.unit].SPEED);
  if (move !== null) {
    return self.move(move.x - self.me.x, move.y - self.me.y)
  }

  let possible_moves = CIRCLES[SPECS.UNITS[self.me.unit].SPEED].slice(0)
  shuffleArray(possible_moves)

  for (const dir of possible_moves) {
    if (self.map[self.me.y + dir[1]] && self.map[self.me.y + dir[1]][self.me.x + dir[0]]) {
      if (self.getVisibleRobotMap()[self.me.y + dir[1]][self.me.x + dir[0]] < 1) {
        return self.move(dir[0], dir[1])
      }
    }
  }
}


export class CrusaderManager {
  constructor(self) {
    this.mode = CONSTANTS.DEFENSE
    this.mode_location = null;
    this.base_location = null;

    const vis_map = self.getVisibleRobotMap()
    for (const dir of CIRCLES[2]) {
      if (self.map[self.me.y + dir[1]] && self.map[self.me.y + dir[1]][self.me.x + dir[0]]) {
        if (vis_map[self.me.y + dir[1]][self.me.x + dir[0]] > 0) {
          let r = self.getRobot(vis_map[self.me.y + dir[1]][self.me.x + dir[0]]);
          if (r.team == self.me.team && SPECS.UNITS[r.unit].SPEED == 0) { // castle or church
            this.base_location = [r.x, r.y];
            break;
          }
        }
      }
    }
    createVisitedMap(self, this);
  }

  turn(step, self) {
    updateVisitedMap(self, this);
    for (const r of self.getVisibleRobots()) {
      if ((r.signal & COMM16.HEADER_MASK) == COMM16.ESCORT_HEADER) {
        if (this.mode != CONSTANTS.ESCORT) {
          this.mode = CONSTANTS.ESCORT
          this.mode_location = null;
          this.base_location = COMM16.DECODE_ESCORT(r.signal)
        }
      } else if ((r.signal & COMM16.HEADER_MASK) == COMM16.ATTACK_HEADER) {
        this.mode = CONSTANTS.ATTACK
        this.mode_location = COMM16.DECODE_ATTACK(r.signal)
      } else if ((r.signal & COMM16.HEADER_MASK) == COMM16.DISTRESS_HEADER) {
        this.mode = CONSTANTS.DEFENSE
        this.mode_location = COMM16.DECODE_DISTRESS(r.signal)
      }
    }

    if (this.base_location == null) {
      this.mode = CONSTANTS.ATTACK
    }

    if (this.mode == CONSTANTS.ESCORT) {
      let action = escortBehavior(self, this.base_location);
      if (action[0] == CONSTANTS.ABANDON_ESCORT) {
        this.mode = CONSTANTS.DEFENSE;
        this.mode_location = null;
        this.base_location = action[1];
      } else if (action[0] == CONSTANTS.LOST_ESCORT) {
        this.mode = CONSTANTS.ATTACK;
        this.mode_location = null;
      } else {
        return action[1];
      }
    }

    if (this.mode == CONSTANTS.DEFENSE) {
      let action = defensiveBehavior(self, this.mode_location, this.base_location)
      if (action == CONSTANTS.ELIMINATED_ENEMY) {
        this.mode_location = null;
        action = defensiveBehavior(self, this.mode_location, this.base_location)
      }
      return action;
    }

    if (this.mode == CONSTANTS.ATTACK && this.mode_location !== null) {
      let action = offensiveBehavior(self, this.mode_location);
      if (action == CONSTANTS.ELIMINATED_ENEMY) {
        this.mode_location = null;
      } else {
        return action
      }
    }

    return randomMoveBehavior(self, this);
  }
}

// NOT USING THIS, SO DON'T WRITE IT
class ProphetManager {
  constructor(self) {
  }

  turn(step, self) {
  }
}

// PREACHER BEHAVIOR is just CRUSADER - the escort stuff
export class PreacherManager {
  constructor(self) {
    this.mode = CONSTANTS.DEFENSE
    this.mode_location = null;
    this.base_location = null;

    const vis_map = self.getVisibleRobotMap()
    for (const dir of CIRCLES[2]) {
      if (self.map[self.me.y + dir[1]] && self.map[self.me.y + dir[1]][self.me.x + dir[0]]) {
        if (vis_map[self.me.y + dir[1]][self.me.x + dir[0]] > 0) {
          let r = self.getRobot(vis_map[self.me.y + dir[1]][self.me.x + dir[0]]);
          if (r.team == self.me.team && SPECS.UNITS[r.unit].SPEED == 0) { // castle or church
            this.base_location = [r.x, r.y];
            break;
          }
        }
      }
    }
    createVisitedMap(self, this);
  }

  turn(step, self) {
    updateVisitedMap(self, this);
    for (const r of self.getVisibleRobots()) {
      if ((r.signal & COMM16.HEADER_MASK) == COMM16.ATTACK_HEADER) {
        this.mode = CONSTANTS.ATTACK
        this.mode_location = COMM16.DECODE_ATTACK(r.signal)
      } else if ((r.signal & COMM16.HEADER_MASK) == COMM16.DISTRESS_HEADER) {
        this.mode = CONSTANTS.DEFENSE
        this.mode_location = COMM16.DECODE_DISTRESS(r.signal)
      }
    }

    if (this.mode == CONSTANTS.ESCORT) {
      let action = escortBehavior(self, this.base_location);
      if (action[0] == CONSTANTS.ABANDON_ESCORT) {
        this.mode = CONSTANTS.DEFENSE;
        this.mode_location = null;
        this.base_location = action[1];
      } else if (action[0] == CONSTANTS.LOST_ESCORT) {
        this.mode = CONSTANTS.ATTACK;
        this.mode_location = null;
      } else {
        return action[1];
      }
    }

    if (this.mode == CONSTANTS.DEFENSE) {
      let action = defensiveBehavior(self, this.mode_location, this.base_location)
      if (action == CONSTANTS.ELIMINATED_ENEMY) {
        this.mode_location = null;
        action = defensiveBehavior(self, this.mode_location, this.base_location)
      }
      return action;
    }

    if (this.mode == CONSTANTS.ATTACK && this.mode_location !== null) {
      let action = offensiveBehavior(self, this.mode_location);
      if (action == CONSTANTS.ELIMINATED_ENEMY) {
        this.mode_location = null;
      } else {
        return action
      }
    }
    return randomMoveBehavior(self, this);
  }
}