import {SPECS} from 'battlecode';
import {CONSTANTS,CIRCLES} from './constants.js'
import {COMM8, COMM16} from './comm.js'
import {move_towards, move_to, move_away, num_moves} from './path.js'

function dist(a, b) { // returns the squared distance
  return (a[0]-b[0])**2+(a[1]-b[1])**2
}

function find_depots(self, church_loc) {
  var split_resource_map = {fuel: [], karbonite: []};
  var resource_map = []
  const pass_map = self.map, fuel_map = self.fuel_map, karbonite_map = self.karbonite_map;

  // Generate the visited set:
  let visited = new Set()
  let queue = [[church_loc[0], church_loc[1]]]

  while (queue.length > 0) {
    let current = queue.shift()

    if (visited.has((current[1]<<6) + current[0])) { continue; } // seen before.
    visited.add((current[1]<<6) + current[0]) // mark as visited

    // check for fuel + karbonite:
    if (fuel_map[current[1]][current[0]]) {
      split_resource_map.fuel.push([current[0], current[1]]);
      resource_map.push([current[0], current[1]]);
    } else if (karbonite_map[current[1]][current[0]]) {
      split_resource_map.karbonite.push([current[0], current[1]]);
      resource_map.push([current[0], current[1]]);
    }
    
    for (const dir of CIRCLES[SPECS.UNITS[self.me.unit].SPEED]){ // add nbrs
      if ((current[0] + dir[0]) >= 0 && (current[0] + dir[0]) < pass_map[0].length) {
        if ((current[1] + dir[1]) >= 0 && (current[1] + dir[1]) < pass_map.length) { // in map range
          if (pass_map[current[1] + dir[1]][current[0] + dir[0]]) { // can go here
            if (dist([current[1] + dir[1],current[0] + dir[0]], church_loc) > 8){ // search radius
              queue.push([current[0] + dir[0], current[1] + dir[1]]);
            }
          }
        }
      }
    }
  }
  return [split_resource_map, resource_map];
}

function find_mine(self, all_resources, priority = null) {
  let resources = null;
  if (priority == null)
    resources = all_resources[1];
  else if (priority.toLowerCase().includes('f'))
    resources = all_resources[0].fuel;
  else if (priority.toLowerCase().includes('k'))
    resources = all_resources[0].karbonite;
  else
    self.log("SOMETHING WONG");

  let closest_visible = [2**12, null];
  let closest_invisible = [2**12, null];
  for (const depot of resources){
    let d = dist([self.me.x, self.me.y], depot);
    if (self.getVisibleRobotMap()[depot[1]][depot[0]] == 0){
      if (d < closest_visible[0]){
        closest_visible = [d, depot];
      }
    }
    else if (self.getVisibleRobotMap()[depot[1]][depot[0]] == -1) {
      if (d < closest_invisible[0]){
        closest_invisible = [d, depot];
      }
    }
  }

  if (closest_visible[1] !== null)
    return closest_visible[1];
  return closest_invisible[1];

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
    this.resources = null;

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
          this.church_loc = COMM16.DECODE_BASELOC(r.signal);
          this.resources = find_depots(self, this.church_loc);
          this.mine_loc = find_mine(self, this.resources);
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

    var enemies = [];
    for (const r of self.getVisibleRobots()){
      if (r.team !== null && r.team != self.me.team && r.unit != SPECS.PILGRIM){
        self.log(r)
        enemies.push(r)
      }
    }
    if (enemies.length > 0){
      const move = move_away(self, enemies);
      if (move != null)
        return self.move(move);
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
        this.mine_loc = find_mine(self, this.resources);
        let move_node = move_to(self.map, self.getVisibleRobotMap(), SPECS.UNITS[SPECS.PILGRIM].SPEED, [self.me.x, self.me.y], this.mine_loc)
        if (move_node !== null) {
          return self.move(move_node.x - self.me.x, move_node.y - self.me.y)
        }
      }
      return null; // nothing to do, just camp out.
    }

  }
}