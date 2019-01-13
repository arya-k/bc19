import {SPECS} from 'battlecode';
import {CONSTANTS,COMM16} from './constants.js'
import {move_towards, move_to} from './path.js'

function find_valid_base_locations() {
  // TODO: PSEUDOCODE + CODE FOR THIS
}

function dist(my_location, other_location){ // returns the squared distance
  return (my_location[0]-other_location[0])**2+(mylocation[1]-other_location[1])**2
}

// pilgrim
class PilgrimManager {
  contructor(self) {
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
        if (r.signal & COMM16.HEADER_MASK == COMM16.GOTO_HEADER) {
          this.mine_loc = COMM16.DECODE_GOTO(r.signal)
        }
      }
    }

    if (this.stage == CONSTANTS.MINE) {
      if (self.me.karbinite * 2 > SPECS.UNITS[SPECS.PILGRIM].KARBONITE_CAPACITY &&
          self.me.fuel * 2 > SPECS.UNITS[SPECS.PILGRIM].FUEL_CAPACITY) {
        this.stage = CONSTANTS.DEPOSIT;
      } else if (!this.base_near_mine && self.me.x == this.mine_loc[0] && self.me.y == this.mine_loc[1]) {
        let possible_base_loc = find_valid_base_locations();
        if (possible_base_loc[0] == CONSTANTS.FOUND_NEARBY_BASE ) {
          this.base_loc = possible_base_loc[1];
          this.base_near_mine = true;
        } else if (self.karbonite >= SPECS.UNITS[SPECS.CHURCH].CONSTRUCTION_KARBONITE &&
                   self.fuel >= SPECS.UNITS[SPECS.CHURCH].CONSTRUCTION_FUEL) {
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
        self.stage = CONSTANTS.MINE;
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
      } else if (mine_loc !== null) {
        let move_node = move_to(self.map, self.getVisibleRobotMap(), [self.me.x, self.me.y], this.mine_loc, SPECS.UNITS[SPECS.PILGRIM].SPEED)
        if (move_node !== null) {
          return self.move(move_node.x - self.me.x, move_node.y - self.me.y)
        }
      }
      return null; // nothing to do, just camp out.
    }

    if (this.stage == CONSTANTS.BUILD) {
      if (Math.abs(self.me.x - this.new_base_loc[0]) <= 1 &&
          Math.abs(self.me.y - this.new_base_loc[1]) <= 1) {
        let move_node = move_towards(self.map, self.getVisibleRobotMap(), [self.me.x, self.me.y], this.new_base_loc, SPECS.UNITS[SPECS.PILGRIM].SPEED, 1, 2)
        if (move_node !== null) {
          return self.move(move_node.x - self.me.x, move_node.y - self.me.y);
        }
        return null;
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