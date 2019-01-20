import {SPECS} from 'battlecode';
import {CONSTANTS,CIRCLES} from './constants.js'
import {COMM8, COMM16} from './comm.js'
import {move_towards, move_to, move_away, num_moves} from './path.js'
import {dist, is_valid} from './utils.js'

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
    else if (current[0] != church_loc[0] || current[1] != church_loc[1])
      continue;
    
    for (const dir of CIRCLES[8]){ // add nbrs
      if ((current[0] + dir[0]) >= 0 && (current[0] + dir[0]) < pass_map[0].length) {
        if ((current[1] + dir[1]) >= 0 && (current[1] + dir[1]) < pass_map.length) { // in map range
          if (pass_map[current[1] + dir[1]][current[0] + dir[0]]) { // can go here
            queue.push([current[0] + dir[0], current[1] + dir[1]]);
          }
        }
      }
    }
  }
  return [split_resource_map, resource_map];
}

function find_mine(self, all_resources, priority = null, strict = false) {
  let resources = null;

  if (priority === null){
    strict = true;
    resources = all_resources[1];
  }
  else if (priority.toLowerCase().includes('k')) {
    resources = all_resources[0].karbonite;
  }
  else if (priority.toLowerCase().includes('f')) {
    resources = all_resources[0].fuel;
  }
  else
    self.log("SOMETHING WONG");

  let closest_visible = [1<<14, null];
  let closest_invisible = [1<<14, null];

  for (const depot of resources){
    let d = dist([self.me.x, self.me.y], depot);
    // let d = num_moves(self.map, self.getVisibleRobotMap(), SPECS.UNITS[self.me.unit].SPEED, [self.me.x, self.me.y], depot);
    if (d == 0)
      return depot;
    else if (self.getVisibleRobotMap()[depot[1]][depot[0]] == 0){
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
  if (closest_invisible[1] !== null)
    return closest_invisible[1];
  if (strict)
    return null;
  else {
    if (priority.toLowerCase().includes('k')) {
      resources = all_resources[0].fuel;
    }
    else if (priority.toLowerCase().includes('f')) {
      resources = all_resources[0].karbonite;
    }
    closest_visible = [1<<14, null];
    closest_invisible = [1<<14, null];

    for (const depot of resources){
      let d = dist([self.me.x, self.me.y], depot);
      // let d = num_moves(self.map, self.getVisibleRobotMap(), SPECS.UNITS[self.me.unit].SPEED, [self.me.x, self.me.y], depot);
      if (d == 0)
        return depot;
      else if (self.getVisibleRobotMap()[depot[1]][depot[0]] == 0) {
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
    if (closest_invisible[1] !== null)
      return closest_invisible[1];
  }
  return null;
}

// pilgrim
export class PilgrimManager {
  constructor(self) {
    // this is the init function
    this.stage = CONSTANTS.MINE
    this.base_loc = null;
    this.castle_loc = null; // the castle that spawned it.
    this.church_loc = null;
    this.mine_loc = null;
    this.resources = null;
    this.new_mine = null;

    for (const r of self.getVisibleRobots()) {
      if (r.team === self.me.team){
        if (dist([self.me.x, self.me.y], [r.x, r.y]) <= 2) {
          if (r.unit == SPECS.CASTLE) {
            this.castle_loc = [r.x, r.y];
          } else if (r.unit == SPECS.CHURCH){
            this.church_loc = [r.x, r.y];
          }
        }
      }
    }
    if (this.church_loc != null){
      this.base_loc = this.church_loc;
      this.castle_loc = this.church_loc;
      this.resources = find_depots(self, this.church_loc);
      this.mine_loc = find_mine(self, this.resources, choosePriority(self));
    }
    else
      this.base_loc = this.castle_loc;
  }

  turn(step, self) {
    if (this.church_loc === null) {
      for (const r of self.getVisibleRobots()) {
        if (COMM16.type(r.signal) == COMM16.BASELOC_HEADER) {
          this.church_loc = COMM16.DECODE_BASELOC(r.signal);
          this.resources = find_depots(self, this.church_loc);
          this.mine_loc = find_mine(self, this.resources, choosePriority(self));
        }
      }
    }

    if (this.mine_loc === null) {
      this.church_loc = this.castle_loc;
      this.base_loc = this.castle_loc;
      this.resources = find_depots(self, this.church_loc);
      this.mine_loc = find_mine(self, this.resources, choosePriority(self));
    }

    if (this.mine_loc === null) {
      return null; // there's nothing to do.
    }


    if (this.base_loc !== null && dist(this.church_loc, this.base_loc) <= 8){// if church_loc is close to castle, no point building it
      this.church_loc = this.castle_loc;
      this.base_loc = this.castle_loc;
    }

    if (self.getVisibleRobotMap()[this.church_loc[1]][this.church_loc[0]] > 0){ // if you see a church where your church should be, it is built.
      let r = self.getRobot(self.getVisibleRobotMap()[this.church_loc[1]][this.church_loc[0]]);
      if (this.church_loc != this.base_loc && r.team != null && r.team == self.me.team && r.unit == SPECS.CHURCH)
        this.base_loc = this.church_loc; // set new base location if a church is visible at church_loc
    }
    
    if (this.base_loc != this.church_loc) { //if there's a church that's closer to the castle that's not your own, make that new base location
      for (let r of self.getVisibleRobots()) {
        if (r.team !== null && r.team == self.me.team && r.unit == SPECS.CHURCH &&
            dist(this.church_loc, [r.x, r.y]) < dist(this.church_loc, this.base_loc)){
          self.base_loc = [r.x, r.y];
        }
      }
    }


    if (this.stage == CONSTANTS.DEPOSIT){
      if (self.me.karbonite == 0 && self.me.fuel == 0) {
        this.stage = CONSTANTS.MINE;
        this.mine_loc = find_mine(self, this.resources, choosePriority(self));
      }
    }

    if (this.stage == CONSTANTS.MINE) {
      if (self.karbonite >= SPECS.UNITS[SPECS.CHURCH].CONSTRUCTION_KARBONITE &&
          self.fuel >= SPECS.UNITS[SPECS.CHURCH].CONSTRUCTION_FUEL && this.base_loc != this.church_loc) {
        this.stage = CONSTANTS.BUILD;
      } else if ((self.me.karbonite >= SPECS.UNITS[SPECS.PILGRIM].KARBONITE_CAPACITY &&
                  self.me.fuel >= SPECS.UNITS[SPECS.PILGRIM].FUEL_CAPACITY)) {
        this.stage = CONSTANTS.DEPOSIT;
      } else if (self.me.karbonite >= SPECS.UNITS[SPECS.PILGRIM].KARBONITE_CAPACITY && 
                  self.me.fuel < SPECS.UNITS[SPECS.PILGRIM].FUEL_CAPACITY) {
        /*if (this.new_mine !== null && self.getVisibleRobotMap()[this.new_mine[1]][this.new_mine[0]] > 0) {
          this.stage = CONSTANTS.DEPOSIT;
        }*/
        if (this.new_mine == null /*&& !self.fuel_map[self.me.y][self.me.x]*/){
          this.new_mine = find_mine(self, this.resources, 'fuel', true);
          if (this.new_mine !== null && !self.fuel_map[this.new_mine[1]][this.new_mine[0]]){
            this.new_mine = null;
            this.stage = CONSTANTS.DEPOSIT;
          }
          if (this.new_mine !== null && this.new_mine != this.mine_loc &&
              num_moves(self.map, self.getVisibleRobotMap(), SPECS.UNITS[self.me.unit].SPEED, [self.me.x, self.me.y], this.new_mine) <=
              num_moves(self.map, self.getVisibleRobotMap(), SPECS.UNITS[self.me.unit].SPEED, [self.me.x, self.me.y], this.base_loc)){
            this.stage = CONSTANTS.MINE;
            this.mine_loc = this.new_mine;
          } else {
            this.stage = CONSTANTS.DEPOSIT;
          }
        }
      } else if (self.me.fuel >= SPECS.UNITS[SPECS.PILGRIM].FUEL_CAPACITY && 
                  self.me.karbonite < SPECS.UNITS[SPECS.PILGRIM].KARBONITE_CAPACITY){
        /*if (this.new_mine !== null && self.getVisibleRobotMap()[this.new_mine[1]][this.new_mine[0]] > 0) {
          this.stage = CONSTANTS.DEPOSIT;
        }*/
        if (this.new_mine == null /*&& !self.karbonite_map[self.me.y][self.me.x]*/){
          this.new_mine = find_mine(self, this.resources, 'karbonite', true);
          if (this.new_mine !== null && !self.karbonite_map[this.new_mine[1]][this.new_mine[0]]) {
            this.new_mine = null;
            this.stage = CONSTANTS.DEPOSIT;
          }
          if (this.new_mine !== null && this.new_mine != this.mine_loc &&
              num_moves(self.map, self.getVisibleRobotMap(), SPECS.UNITS[self.me.unit].SPEED, [self.me.x, self.me.y], this.new_mine) <=
              num_moves(self.map, self.getVisibleRobotMap(), SPECS.UNITS[self.me.unit].SPEED, [self.me.x, self.me.y], this.base_loc)){
            this.stage = CONSTANTS.MINE;
            this.mine_loc = this.new_mine;
          } else {
            this.stage = CONSTANTS.DEPOSIT;
          }
        }
      }
    }

    if (this.stage == CONSTANTS.BUILD) {
      if (self.karbonite < SPECS.UNITS[SPECS.CHURCH].CONSTRUCTION_KARBONITE ||
          self.fuel < SPECS.UNITS[SPECS.CHURCH].CONSTRUCTION_FUEL) {
        this.stage = CONSTANTS.MINE; // can no longer afford church
        this.mine_loc = find_mine(self, this.resources, choosePriority(self));
      }
    }

    var closest_enemy = [1<<14, null]; // get our closest enemy, and the distance to our nearest ally.
    var enemies = [];
    var max_ally = 0;
    for (const r of self.getVisibleRobots()){
      let d = dist([self.me.x, self.me.y], [r.x, r.y]);
      if (r.team !== null && r.team != self.me.team){
        if (d < closest_enemy[0])
          closest_enemy = [d, r];
        if (SPECS.UNITS[r.unit].ATTACK_DAMAGE != null && SPECS.UNITS[r.unit].ATTACK_DAMAGE > 0)
          enemies.push(r);
      } else if (r.team !== null && r.team == self.me.team && d > max_ally){
        max_ally = d;
      }
    }

    if (closest_enemy[1] !== null){
      self.signal(COMM16.ENCODE_ENEMYSIGHTING(closest_enemy[1].x, closest_enemy[1].y), max_ally);
      if (SPECS.UNITS[closest_enemy[1].unit].ATTACK_DAMAGE !== null){
        const move = move_away(self, enemies);
        if (move != null){
          return self.move(...move);
        }
      }
    }

    if (this.stage == CONSTANTS.BUILD) {
      if (Math.abs(self.me.x - this.church_loc[0]) > 1 ||
          Math.abs(self.me.y - this.church_loc[1]) > 1) {
        let move_node = move_towards(self, [self.me.x, self.me.y], this.church_loc)
        if (move_node !== null) {
          if (isDangerous(self, [move_node.x, move_node.y])){
            return null; // that move will make you vulnerable, do nothing.
          }
          return self.move(move_node.x - self.me.x, move_node.y - self.me.y);
        } else {
          return null;
        }
      } else if (self.getVisibleRobotMap()[this.church_loc[1]][this.church_loc[0]] > 0) {
        return null;
      } else {
        this.base_loc = this.church_loc;
        this.castle_loc = this.church_loc;
        this.stage = CONSTANTS.DEPOSIT;
        this.new_mine = null;
        return self.buildUnit(SPECS.CHURCH, this.base_loc[0]-self.me.x, this.base_loc[1]-self.me.y);
      }
    }

    if (this.stage == CONSTANTS.DEPOSIT) {
      let homesick = true;
      if (Math.abs(self.me.x - this.base_loc[0]) <= 1 &&
          Math.abs(self.me.y - this.base_loc[1]) <= 1) {
        homesick = false;
        this.stage = CONSTANTS.MINE;
        this.mine_loc = find_mine(self, this.resources, choosePriority(self));
        let r = self.getRobot(self.getVisibleRobotMap()[this.base_loc[1]][this.base_loc[0]])
        if (r !== null && r.team == self.me.team && (r.unit == SPECS.CASTLE || r.unit == SPECS.CHURCH) && r.x == this.base_loc[0] && r.y == this.base_loc[1]) {
          this.new_mine = null;
          return self.give(this.base_loc[0]-self.me.x, this.base_loc[1]-self.me.y, self.me.karbonite, self.me.fuel);
        } else {
          if (this.base_loc == this.church_loc){ // our base has disappeared :( go to castle
            this.church_loc = null;
            this.base_loc = this.castle_loc;
            if (this.base_loc === null)
              return null;
          }
          homesick = true; 
        }
      } 
      if (homesick){
        let move_node = move_towards(self, [self.me.x, self.me.y], this.base_loc); // get adjacent
        if (move_node !== null) {
          if (isDangerous(self, [move_node.x, move_node.y])){
            return null; // that move will make you vulnerable, do nothing.
          }
          return self.move(move_node.x - self.me.x, move_node.y - self.me.y);
        }
        return null; // nothing to do, just camp out.
      }
    }

    if (this.stage == CONSTANTS.MINE) {
      if (self.me.x == this.mine_loc[0] && self.me.y == this.mine_loc[1]) {
        if ((self.fuel_map[self.me.y][self.me.x] && self.me.fuel >= SPECS.UNITS[self.me.unit].FUEL_CAPACITY) || 
            (self.karbonite_map[self.me.y][self.me.x] && self.me.karbonite >= SPECS.UNITS[self.me.unit].KARBONITE_CAPACITY)) {
          self.stage = CONSTANTS.DEPOSIT;
        }
        else
          return self.mine();
      } else if (this.mine_loc !== null) {
        if (this.new_mine !== null) {
          if (self.fuel_map[this.new_mine[1]][this.new_mine[0]])
            this.mine_loc = find_mine(self, this.resources, 'fuel', true);
          else if (self.karbonite_map[this.new_mine[1]][this.new_mine[0]])
            this.mine_loc = find_mine(self, this.resources, 'karbonite', true);
          this.new_mine = this.mine_loc;
        } else {
          this.mine_loc = find_mine(self, this.resources, choosePriority(self));
        }

        if (this.mine_loc === null)
          return null;
        let move_node = move_to(self, [self.me.x, self.me.y], this.mine_loc)
        if (move_node !== null) {
          if (isDangerous(self, [move_node.x, move_node.y])){
            return null; // that move will make you vulnerable, do nothing.
          }
          return self.move(move_node.x - self.me.x, move_node.y - self.me.y)
        }
      }
      return null; // nothing to do, just camp out.
    }
  }
}

function choosePriority(self) {
  let priority = null;
  if (self.fuel > 300 || self.karbonite < 60)
    priority = 'karbonite';
  else
    priority = 'fuel';
  return priority;
}

function isDangerous(self, p) {
  for (const r of self.getVisibleRobots()){
    if (r.team !== null && r.team != self.me.team && SPECS.UNITS[r.unit].ATTACK_DAMAGE !== null && SPECS.UNITS[r.unit].ATTACK_DAMAGE != 0){
      let d = dist([r.x, r.y], [p[0], p[1]]);
      let radius = SPECS.UNITS[r.unit].ATTACK_RADIUS;
      if (r.unit == SPECS.PREACHER)
        radius[1] = 50;
      if (d <= radius[1] && d >= radius[0])
        return true;
    }
  }
  return false;
}