import {SPECS} from 'battlecode';
import {CONSTANTS, CIRCLES} from './constants.js'
import {move_towards, move_to} from './path.js'
import {COMM8,COMM16} from './comm.js'
import {getAttackOrder} from './utils.js'

function nonNuisanceBehavior(self) {
  // - if it's sitting on a resource spot, don't
  // - if the castle you are closest to has <2 free spots available, and you are adjacent to the castle, move (i.e. move if the castle has <2 building spots) use get clear locations here
  // - if you are adjacent to other units, WAFFLE
  const vis_map = self.getVisibleRobotMap(), fuel_map = self.fuel_map, karbonite_map = self.karbonite_map;
  const x = self.me.x, y = self.me.y;
  if (fuel_map[y][x] || karbonite_map[y][x] || has_adjacent_castle(self, [self.me.x, self.me.y])){
    return emptySpaceMove(self);
  }
  const nearbyRobots = getNearbyRobots(self, [self.me.x, self.me.y], 1)
  if (nearbyRobots.length != 0){
    let best = [null, CIRCLES[1].length + 1]
    for (let dir in CIRCLES[SPECS.UNITS[self.me.unit].SPEED]){
      let p = [self.me.x + dir[0], self.me.y + dir[1]];
      let temp = getNearbyRobots(self, p, 1);
      if (temp.length == 0) {
        if (!fuel_map[p[1]][p[0]] && !karbonite_map[p[1]][p[0]] && !has_adjacent_castle(self, p)){
          return dir;
        }
      }
    }
    return null;
  }
}


function dist(a, b) {
  return (a[0]-b[0])**2 + (a[1]-b[1])**2
}

function attack_behaviour_aggressive(self, mode_location, base_location){
  //Always pursue mode_location, and kill anyone seen
  let targets = getAttackOrder(self)
  if (targets.length>0){
    return self.attack(targets[0].x-self.me.x,targets[0].y-self.me.y)
  }
  for (const r of self.getVisibleRobots()) {
    if (r.unit !== null && r.team != self.me.team) {
      let move = no_swarm(self,[self.me.x,self.me.y],[r.x,r.y])
      if (move !== null) {
        return self.move(move.x - self.me.x, move.y - self.me.y);
      }
      else{
        return null;
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
  }
  return null
}

function attack_behaviour_passive(self, mode_location, base_location){
  //Pursue mode_location, but strategically move away when engaging enemies. Try to hit without getting hit
  //This method is only effective with prophets
  let targets = getAttackOrder(self)
  if (targets.length != 0){
    let crusaders = []
    let enemies = []
    //if there is a single enemy robot without a crusader in front, move away
    for (const p of self.getVisibleRobots()){
      if (p.unit == SPECS.UNITS[SPECS.CRUSADER]){
        crusaders.push([p.x,p.y])
      }
      if (p.team != self.me.team){
        enemies.push(p)
      }
    }
    for (const r of targets){
      for (const c of crusaders){
        if (dist(c,[r.x,r.y])>dist([r.x,r.y,self.me.x,self.me.y])){
          let move = move_away(self,enemies)
          if (move !== null) {
            return self.move(move.x - self.me.x, move.y - self.me.y);
          } else {
            return null;
          }
        }
      }
    }
    return self.attack(targets[0].x-self.me.x,targets[0].y-self.me.y)
  }
  else if (dist([self.me.x,self.me.y],[mode_location[0],mode_location[1]])>SPECS.UNITS[self.me.unit].VISION_RADIUS){
    let move = no_swarm(self,[self.me.x,self.me.y],[mode_location[0],mode_location[1]])
    if (move !== null) {
      return self.move(mode_location[0] - self.me.x, mode_location[1] - self.me.y);
    }
    else{
      return null;
    }
  }
  else if (dist([self.me.x,self.me.y],[mode_location[0],mode_location[1]])<=SPECS.UNITS[self.me.unit].VISION_RADIUS){
    return CONSTANTS.ELIMINATED_ENEMY
  }
  return null;
}

function defensive_behaviour_aggressive(self, mode_location, base_location) {
  //If the robot sees an enemy, it will chase it, kill it, and come back to base

  // If you see the enemy, engage (moving towards if you need to).
  // Once you've killed the enemy, return to castle/church and deposit resources.
  let targets = getAttackOrder(self)

  if (targets.length>0){
    return self.attack(targets[0].x-self.me.x,targets[0].y-self.me.y)
  }

  for (const r of self.getVisibleRobots()) {
    if (r.unit !== null && r.team != self.me.team) {
      let move = move_towards(self.map, self.getVisibleRobotMap(), [self.me.x, self.me.y], [r.x, r.y], SPECS.UNITS[self.me.unit].SPEED,
                              SPECS.UNITS[self.me.unit].ATTACK_RADIUS[0], SPECS.UNITS[self.me.unit].ATTACK_RADIUS[1])
      if (move !== null) {
        return self.move(move.x - self.me.x, move.y - self.me.y);
      }
      else{
        return null;
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
      let n = nonNuisanceBehavior(self);
      if (n !== null){
        return self.move(n[0]-self.me.x,n[1]-self.me.y);
      }
      else{
        return null;
      }
     }
  }
}

function defensive_behaviour_passive(self, mode_location, base_location) {
  //If the robot sees an enemy, wait for the enemy to come so the enemy will get hit first. Never leave base

  let targets = getAttackOrder(self)
  //self.log('here1')
  if (targets.length>0){
    return self.attack(targets[0].x-self.me.x,targets[0].y-self.me.y)
  }
  //self.log('here2')
  if (Math.abs(self.me.x - base_location[0]) > 1 || Math.abs(self.me.y - base_location[1]) > 1) {
    let move = move_towards(self.map, self.getVisibleRobotMap(), [self.me.x, self.me.y], base_location, SPECS.UNITS[self.me.unit].SPEED, 1, 2)
    if (move !== null) {
      return self.move(move[0] - self.me.x, move[1] - self.me.y);
    } else {
      return null;
    }
  } 

  else if (self.me.karbonite > 0 || self.me.fuel > 0) {
    return self.give(base_location[0] - self.me.x, base_location[1] - self.me.y, self.me.karbonite, self.me.fuel);
  } 

  else {
    let n = nonNuisanceBehavior(self);
    if (n !== null){
      return self.move(n[0]-self.me.x,n[1]-self.me.y);
    }
    else{
      return null;
    }
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
      if (COMM16.type(r.signal) == COMM16.ATTACK_HEADER) {
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

    if (this.mode == CONSTANTS.DEFENSE) {
      let action = defensive_behaviour_passive(self, this.mode_location, this.base_location)
      return action;
    }

    if (this.mode == CONSTANTS.ATTACK && this.mode_location !== null) {
      let action = attack_behaviour_aggressive(self, this.mode_location);
      if (action == CONSTANTS.ELIMINATED_ENEMY) {
        self.castleTalk(COMM8.ENEMY_CASTLE_DEAD);
        this.mode_location = null;
      } else {
        return action
      }
    }
  }
}


export class ProphetManager {
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
      if (COMM16.type(r.signal) == COMM16.ATTACK_HEADER) {
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

    if (this.mode == CONSTANTS.DEFENSE) {
      let action = defensive_behaviour_passive(self, this.mode_location, this.base_location)
      return action;
    }

    if (this.mode == CONSTANTS.ATTACK && this.mode_location !== null) {
      let action = attack_behaviour_passive(self, this.mode_location);
      if (action == CONSTANTS.ELIMINATED_ENEMY) {
        this.mode_location = null;
        self.castleTalk(COMM8.ENEMY_CASTLE_DEAD);
      } else {
        return action
      }
    }
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
    let action = defensive_behaviour_aggressive(self, this.mode_location, this.base_location)
    if (action == CONSTANTS.ELIMINATED_ENEMY) {
      self.castleTalk(COMM8.ENEMY_CASTLE_DEAD);
      this.mode_location = null;
      action = defensive_behaviour_aggressive(self, this.mode_location, this.base_location)
    }
    return action;
  }
}