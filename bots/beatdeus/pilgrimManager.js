import {SPECS} from 'battlecode';
import {CONSTANTS,CIRCLES,COMM16} from './constants.js'
import {move_towards, move_to, num_moves} from './path.js'

function dist(a, b){ // returns the squared distance
  return (a[0]-b[0])**2+(a[1]-b[1])**2
}

// pilgrim
export class PilgrimManager {
  constructor(self) {
    // this is the init function
    this.stage = CONSTANTS.MINE
    this.castle_loc = null; // the castle that spawned it.
    this.church_loc = null;
    this.churchid = null;
    this.mine_loc = null;
    for (const r of self.getVisibleRobots()) {
      if (r.team === self.me.team){
        if (r.unit == SPECS.CASTLE) {
          this.castle_loc = [r.x, r.y];
        } else if (r.unit == SPECS.CHURCH){
          this.church_loc = [r.x, r.y];
          this.churchid = r.id;
        }
      }
    }
    if (this.church_loc != null)
      this.base_loc = this.church_loc;
    else
      this.base_loc = this.castle_loc;
  }

  turn(step, self) {
    if (this.church_loc === null) {
      for (const r of self.getVisibleRobots()) {
        if (COMM16.type(r.signal) == COMM16.BASELOC_HEADER) {
          this.church_loc = COMM16.DECODE_BASELOC(r.signal) 
          //set mine_loc somewhere near the church
        }
      }
    }

    if (this.church_loc === null) {
      return null; // there's nothing to do.
    }

    if (this.stage == CONSTANTS.MINE) {
      if (self.karbonite >= SPECS.UNITS[SPECS.CHURCH].CONSTRUCTION_KARBONITE &&
          self.fuel >= SPECS.UNITS[SPECS.CHURCH].CONSTRUCTION_FUEL) {
        this.stage = CONSTANTS.BUILD;
      } else if ((self.me.karbonite >= SPECS.UNITS[SPECS.PILGRIM].KARBONITE_CAPACITY ||
                  self.me.fuel >= SPECS.UNITS[SPECS.PILGRIM].FUEL_CAPACITY)) {
        this.stage = CONSTANTS.DEPOSIT;
      }
    }

    if (this.stage == CONSTANTS.BUILD) {
      if (self.karbonite < SPECS.UNITS[SPECS.CHURCH].CONSTRUCTION_KARBONITE ||
          self.fuel < SPECS.UNITS[SPECS.CHURCH].CONSTRUCTION_FUEL + 2) { // account for signal, too.
        this.stage = CONSTANTS.MINE; // can no longer afford church
      }
    }

    for (const r of self.getVisibleRobots()){
      if (r.team !== null && r.team != self.me.team && r.unit != SPECS.PILGRIM){
        //move away from attack radius
        const radius = SPECS.UNITS[r.unit].ATTACK_RADIUS;
        return self.move(move_away(stuff iN hereeeeeeeeeeeeee))
      }
    }

    if (this.stage == CONSTANTS.BUILD) {
      if (Math.abs(self.me.x - this.church_loc[0]) > 1 ||
          Math.abs(self.me.y - this.church_loc[1]) > 1) {
        let move_node = move_towards(self.map, self.getVisibleRobotMap(), [self.me.x, self.me.y], this.church_loc, SPECS.UNITS[SPECS.PILGRIM].SPEED, 1, 2)
        if (move_node !== null) {
          return self.move(move_node.x - self.me.x, move_node.y - self.me.y);
        } else {
          return null;
        }
      } else {
        self.signal(COMM16.ENEMYLOC(this.base_loc[0], this.base_loc[1]), dist([self.me.x, self.me.y], this.church_loc))
        this.base_loc = this.church_loc;
        this.stage = CONSTANTS.MINE;
        return self.buildUnit(SPECS.CHURCH, this.base_loc[0]-self.me.x, this.base_loc[1]-self.me.y);
      }
    }

    if (this.stage == CONSTANTS.DEPOSIT) {
      let homesick = true;
      if (Math.abs(self.me.x - this.base_loc[0]) <= 1 &&
          Math.abs(self.me.y - this.base_loc[1]) <= 1) {
        homesick = false;
        this.stage = CONSTANTS.MINE;
        let r = self.getRobot(self.getVisibleRobotMap()[this.base_loc[1]][this.base_loc[0]])
        if (r !== null && r.team == self.me.team && (r.unit == SPECS.CASTLE || r.unit == SPECS.CHURCH)) {
          return self.give(this.base_loc[0]-self.me.x, this.base_loc[1]-self.me.y, self.me.karbonite, self.me.fuel);
        } else {
          if (base_loc == church_loc){
            this.church_loc = null;
            this.churchid = null;
            this.base_loc = this.castle_loc;
          }
          homesick = true; // our base has disappeared :( go to castle
        }
      } 
      if (homesick){
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

  }
}