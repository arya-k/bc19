import {SPECS} from 'battlecode';
import {CONSTANTS,CIRCLES,COMM16} from './constants.js'
import {move_towards, move_to, num_moves} from './path.js'

function Point(x, y){
  this.x = x;
  this.y = y;
}

function find_valid_base_locations(self) {
  let map = self.getPassableMap();
  let fuel_map = self.getFuelMap();
  let karbonite_map = self.getKarboniteMap();

  // First, see if there are any churches or castles within 3 steps:
  for (const r of self.getVisibleRobots()) {
    if (r.team == self.me.team && (r.unit == SPECS.CASTLE || r.unit == SPECS.CHURCH)) {
      if (num_moves(self.map, self.getVisibleRobotMap(), SPECS.UNITS[SPECS.PILGRIM].SPEED,
          [self.me.x, self.me.y], [r.x, r.y]) <= 3) { // number of moves to get adjacent.
        return [CONSTANTS.FOUND_NEARBY_BASE, [r.x, r.y]];
      }
    }
  }

  // There aren't: BFS to find the nearest spot we can place a church/castle at:
  let visited = new Set()
  let queue = [new Point(self.me.x,self.me.y)]

  while (queue.length > 0) {
    let current = queue.shift()

    if (visited.has((current.y<<6) + current.x)) { continue; } // seen before.
    visited.add((current.y<<6) + current.x) // mark as visited

    // if any adjacent spots don't have fuel, karbonite or robots:
    for (const dir of CIRCLES[2]) {
      if (map[current.y + dir[1]] && map[current.y + dir[1]][current.x + dir[0]]) { // passable
        if (!fuel_map[current.y + dir[1]][current.x + dir[0]]) { // no fuel
          if (!karbonite_map[current.y + dir[1]][current.x + dir[0]]) { // no karbonite
            if (self.getVisibleRobotMap()[current.y + dir[1]][current.x + dir[0]] < 1) { // 
              return [current.x + dir[0], current.y + dir[1]];
            }
          }
        }
      }
    }

    for (const dir of CIRCLES[SPECS.UNITS[SPECS.PILGRIM].SPEED]) {
      if (map[current.y + dir[1]] && map[current.y + dir[1]][current.x + dir[0]]) {
        queue.push(new Point(current.x + dir[0], current.y + dir[1]))
      }
    }
  }
}

function dist(a, b){ // returns the squared distance
  return (a[0]-b[0])**2+(a[1]-b[1])**2
}

// pilgrim
export class PilgrimManager {
  constructor(self) {
    // this is the init function
    this.stage = CONSTANTS.MINE
    this.base_loc = null; // the castle that spawned it.
    for (const r of self.getVisibleRobots()) {
      if (r.team === self.me.team && r.unit == SPECS.CASTLE) {
        this.base_loc = [r.x, r.y];
        break;
      }
    }

    this.mine_loc = null; // the location we are mining at.
    this.base_near_mine = false; // we currently have a nearby church or castle.
    this.new_base_loc = null; // tentative church placement location
  }

  turn(step, self) {
    if (this.mine_loc === null) {
      for (const r of self.getVisibleRobots()) {
        if ((r.signal & COMM16.HEADER_MASK) == COMM16.GOTO_HEADER) {
          this.mine_loc = COMM16.DECODE_GOTO(r.signal)
        }
      }
    }

    if (this.mine_loc === null) {
      return null; // there's nothing to do.
    }

    if (this.stage == CONSTANTS.MINE) {
      if (self.me.karbonite * 2 > SPECS.UNITS[SPECS.PILGRIM].KARBONITE_CAPACITY ||
          self.me.fuel * 2 > SPECS.UNITS[SPECS.PILGRIM].FUEL_CAPACITY) {
        this.stage = CONSTANTS.DEPOSIT;
      } else if (!this.base_near_mine && self.me.x == this.mine_loc[0] && self.me.y == this.mine_loc[1]) {
        let possible_base_loc = find_valid_base_locations(self);
        if (possible_base_loc[0] == CONSTANTS.FOUND_NEARBY_BASE) {
          this.base_loc = possible_base_loc[1];
          this.base_near_mine = true;
        } else if (self.karbonite >= 2 * (SPECS.UNITS[SPECS.PILGRIM].CONSTRUCTION_KARBONITE + SPECS.UNITS[SPECS.CRUSADER].CONSTRUCTION_KARBONITE) &&
                   self.fuel >= 2 * (SPECS.UNITS[SPECS.PILGRIM].CONSTRUCTION_FUEL + SPECS.UNITS[SPECS.CRUSADER].CONSTRUCTION_FUEL)) {
          this.new_base_loc = possible_base_loc;
          this.stage = CONSTANTS.BUILD;
        }
      }
    } else if (this.stage == CONSTANTS.BUILD) {
      if (self.karbonite < SPECS.UNITS[SPECS.CHURCH].CONSTRUCTION_KARBONITE ||
          self.fuel < SPECS.UNITS[SPECS.CHURCH].CONSTRUCTION_FUEL + 2) { // account for signal, too.
        this.stage = CONSTANTS.MINE; // can no longer afford church
      }
    }

    if (this.stage == CONSTANTS.DEPOSIT) {
      if (Math.abs(self.me.x - this.base_loc[0]) <= 1 &&
          Math.abs(self.me.y - this.base_loc[1]) <= 1) {
        this.stage = CONSTANTS.MINE;
        return self.give(this.base_loc[0]-self.me.x, this.base_loc[1]-self.me.y, self.me.karbonite, self.me.fuel);
      } else {
        let move_node = move_towards(self.map, self.getVisibleRobotMap(), [self.me.x, self.me.y], this.base_loc, SPECS.UNITS[SPECS.PILGRIM].SPEED, 1, 2); // get adjacent
        if (move_node !== null) {
          return self.move(move_node.x - self.me.x, move_node.y - self.me.y);
        }
        return null; // nothing to do, just camp out.
      }
    }

    if (this.stage == CONSTANTS.MINE) {
      if (self.me.x == this.mine_loc[0] && self.me.y == this.mine_loc[1]) {
        return self.mine();
      } else if (this.mine_loc !== null) {
        let move_node = move_to(self.map, self.getVisibleRobotMap(), SPECS.UNITS[SPECS.PILGRIM].SPEED, [self.me.x, self.me.y], this.mine_loc)
        if (move_node !== null) {
          return self.move(move_node.x - self.me.x, move_node.y - self.me.y)
        }
      }
      return null; // nothing to do, just camp out.
    }

    if (this.stage == CONSTANTS.BUILD) {
      if (Math.abs(self.me.x - this.new_base_loc[0]) > 1 ||
          Math.abs(self.me.y - this.new_base_loc[1]) > 1) {
        let move_node = move_towards(self.map, self.getVisibleRobotMap(), [self.me.x, self.me.y], this.new_base_loc, SPECS.UNITS[SPECS.PILGRIM].SPEED, 1, 2)
        if (move_node !== null) {
          return self.move(move_node.x - self.me.x, move_node.y - self.me.y);
        } else {
          return null;
        }
      } else {
        self.signal(COMM16.ENEMYLOC(this.base_loc[0], this.base_loc[1]), dist([self.me.x, self.me.y], this.new_base_loc))
        this.base_loc = this.new_base_loc;
        this.stage = CONSTANTS.MINE;
        this.base_near_mine = true;
        return self.buildUnit(SPECS.CHURCH, this.base_loc[0]-self.me.x, this.base_loc[1]-self.me.y);
      }
    }
  }
}