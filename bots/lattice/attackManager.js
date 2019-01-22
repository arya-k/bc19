import {SPECS} from 'battlecode';
import {CONSTANTS, CIRCLES} from './constants.js'
import {move_towards, move_to, no_swarm, move_away} from './path.js'
import {COMM8,COMM16} from './comm.js'
import {getAttackOrder, has_adjacent_castle, getNearbyRobots, dist, is_valid, is_passable} from './utils.js'

function Point(x, y, p) {
  this.x = x,
  this.y = y,
  this.p = p
}

function is_nono(self,x,y,base_loc){
  //Ret, base_locationurns true if this x and y is a nuisance; false if not
  let nono_map = [...Array(self.map.length)].map(e => Array(self.map.length).fill(false));
  nono_map[base_loc[1]][base_loc[0]] = true;
  for (const r of self.getVisibleRobots()) {
    if (r.team == self.me.team) {
      if (r.unit == SPECS.CHURCH || r.unit == SPECS.CASTLE) { // castle or church
        nono_map[r.y][r.x] = true;
        for (const dir of CIRCLES[2])
          if (is_valid(r.x + dir[0], r.y + dir[1], self.map.length))
            nono_map[r.y + dir[1]][r.x + dir[0]] = true;
      } else if (r.id !== self.me.id) {
        nono_map[r.y][r.x] = true;
        for (const dir of CIRCLES[1])
          if (is_valid(r.x + dir[0], r.y + dir[1], self.map.length))
            nono_map[r.y + dir[1]][r.x + dir[0]] = true;
      }
    }
  }
  return (nono_map[y][x] && ((x+y)%2 == 0));
}

function local_cluster_info(self, base_loc) {
  let minicurrent, minix, miniy;

  let maxr = 0
  let visited = new Set()
  let miniqueue = [(base_loc[1]<<6)|base_loc[0]];

  while (miniqueue.length > 0) {
    minicurrent = miniqueue.shift();
    minix = minicurrent&63
    miniy = (minicurrent&4032)>>6

    if (visited.has(minicurrent)){ continue; }

    if (self.fuel_map[miniy][minix] || self.karbonite_map[miniy][minix]) {
      maxr = Math.max(maxr, dist(base_loc, [minix, miniy]))
    } else if (miniy !== base_loc[1] || minix !== base_loc[0]) {
      continue; // don't continue exploring a non-fuel or karb. spot
    }

    visited.add(minicurrent);
    for (const dir of CIRCLES[8]) {
      if (is_valid(minix+dir[0], miniy+dir[1], self.map.length)) {
        miniqueue.push(((miniy+dir[1])<<6)|(minix+dir[0]));
      }
    }
  }

  return maxr;
}

function nonNuisanceBehavior(self, base_loc, waffle = true) {
  // first find resource_r, the r^2 of the resource that is furthest from base,
  // within the cluster.

  let r_sq = local_cluster_info(self, base_loc)

  let current;
  let visited = new Set()
  let queue = [new Point(self.me.x, self.me.y, null)];
  let path_end_point = null;

  while (queue.length > 0) {
    current = queue.shift();

    if (visited.has((current.y<<6)|current.x)){ continue; }

    if (self.map[current.y][current.x] && is_passable(self,current.x,current.y) &&
        dist(base_loc, [current.x, current.y]) > r_sq && 
        (current.x + current.y) % 2 == 0) {
      path_end_point = current;
      break;
    }

    visited.add((current.y<<6)|current.x);
    for (const dir of CIRCLES[SPECS.UNITS[self.me.unit].SPEED]) {
      if (is_valid(current.x+dir[0], current.y+dir[1], self.map.length)) {
        if (is_passable(self,current.x,current.y) && self.map[current.y + dir[1]][current.x + dir[0]]) {
          queue.push(new Point(current.x + dir[0], current.y + dir[1], current));
        }
      }
    }
  }

  if (path_end_point === null || path_end_point.p === null) { // you already good. Move towards the base if you're too far.
    return null;
  } else {
    while (path_end_point.p.p !== null){
      path_end_point = path_end_point.p;
    }
    return [path_end_point.x - self.me.x, path_end_point.y - self.me.y];
  }

}

function attack_behaviour_aggressive(self, mode_location, base_location){
  //Always pursue mode_location, and kill anyone seen

  //attack enemy if possible
  let targets = getAttackOrder(self)
  if (targets.length>0){
    return self.attack(targets[0].x-self.me.x,targets[0].y-self.me.y)
  }

  //pursue visible enemies without swarming
  for (const r of self.getVisibleRobots()) {
    if (self.isVisible(r) && r.unit !== null && r.team != self.me.team) {
      let move = no_swarm(self,[self.me.x,self.me.y],[r.x,r.y])
      if (move !== null) {
        return self.move(move.x - self.me.x, move.y - self.me.y);
      }
    }
  }

  //If nobody is visible, just pursue the mode_location (which in this case would be the enemy)
  if (mode_location !== null) {
    let vis_map = self.getVisibleRobotMap()
    if (vis_map[mode_location[1]][mode_location[0]] != 0) {
      let move = move_towards(self, [self.me.x, self.me.y], [mode_location[0], mode_location[1]])
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

  let vis_map = self.getVisibleRobotMap()
  //attack enemy, but MAKE SURE crusader is between prophet and enemy
  let targets = getAttackOrder(self)
  if (targets.length != 0){
    let crusaders = []
    let enemies = []
    //if there is a single enemy robot without a crusader in front, move away
    //since this method is called by prophets, it must be certain that they are protected by crusaders
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
        if (dist(c,[r.x,r.y])<dist([r.x,r.y,self.me.x,self.me.y])){
          let move = move_away(self,enemies)
          if (move !== null) {
            return self.move(move[0],move[1]);
          } else {
            return null;
          }
        }
      }
    }
    return self.attack(targets[0].x-self.me.x,targets[0].y-self.me.y)
  }

  //Pursue the enemy without swarming
  else if (vis_map[mode_location[1]][mode_location[0]]!=0){
    let move = no_swarm(self,[self.me.x,self.me.y],[mode_location[0],mode_location[1]])
    // let move = null;
    if (move !== null) {
      return self.move(move.x - self.me.x, move.y - self.me.y);
    }
  }

  //Enemy has been killed
  else {
    return CONSTANTS.ELIMINATED_ENEMY
  }
}

function defensive_behaviour_aggressive(self, mode_location, base_location) {
  //If the robot sees an enemy, it will chase it, kill it, and come back to base

  //attack enemy if possible
  let targets = getAttackOrder(self)
  if (targets.length>0){
    return self.attack(targets[0].x-self.me.x,targets[0].y-self.me.y)
  }

  //pursue any visible enemy robots
  for (const r of self.getVisibleRobots()) {
    if (self.isVisible(r) && r.unit !== null && r.team !== null && r.team != self.me.team) {
      let move = move_towards(self, [self.me.x, self.me.y], [r.x, r.y])
      if (move !== null) {
        // self.log(move.x, move.y)
        return self.move(move.x - self.me.x, move.y - self.me.y);
      }
      else{
        return null;
      }
    }
  }

  //Pursue mode_location 
  if (mode_location !== null) {
    // self.log(self.getVisibleRobotMap()[mode_location[1]][mode_location[0]])
    let vis_map = self.getVisibleRobotMap()
    if (vis_map[mode_location[1]][mode_location[0]] == -1) {
      // self.log('move_towards2')
      let move = move_towards(self, [self.me.x, self.me.y], [mode_location[0], mode_location[1]])
      if (move !== null) {
        // self.log("go from " + [self.me.x,self.me.y] + " to " + [move.x, move.y])
        return self.move(move.x - self.me.x, move.y - self.me.y);
      } else {
        return null;
      }
    }

    else {
      return CONSTANTS.ELIMINATED_ENEMY;
    }
  } 

  //move back to base; give resources if you have them; Otherwise, move away if you're sitting on resources or waffle
  else {
    if ((self.me.karbonite > 0 || self.me.fuel > 0) && (Math.abs(self.me.x - base_location[0]) <= 1 && Math.abs(self.me.y - base_location[1]) <= 1)) {
      return self.give(base_location[0] - self.me.x, base_location[1] - self.me.y, self.me.karbonite, self.me.fuel);
    } else {
      // self.log("nonNuisanceBehavior")
      let n = nonNuisanceBehavior(self,base_location, false);
      if (n !== null){
        return self.move(n[0],n[1]);
      }
      else{
        return null;
      }
     }
  }
}

function defensive_behaviour_passive(self, mode_location, base_location) {
  //If the robot sees an enemy, wait for the enemy to come so the enemy will get hit first. Never leave base
  // self.log("here1")

  //attack if possible
  let vis_map = self.getVisibleRobotMap()
  //attack enemy, but MAKE SURE crusader is between prophet and enemy
  let targets = getAttackOrder(self)
  if (targets.length != 0){
    let crusaders = []
    let enemies = []
    //if there is a single enemy robot without a crusader in front, move away
    //since this method is called by prophets, it must be certain that they are protected by crusaders
    for (const p of self.getVisibleRobots()){
      if (p.unit == SPECS.UNITS[SPECS.CRUSADER] || p.unit == SPECS.UNITS[SPECS.PREACHER]){
        crusaders.push([p.x,p.y])
      }
      if (self.isVisible(p) && p.team != self.me.team){
        enemies.push(p)
      }
    }
    // self.log([self.me.x,self.me.y])
    // self.log(crusaders)
    for (const r of targets){
      for (const c of crusaders){
        if (dist(c,[r.x,r.y])>dist([r.x,r.y,self.me.x,self.me.y])){
          let move = move_away(self,enemies)
          if (move !== null) {
            // self.log(move)
            return self.move(move[0],move[1]);
          } else {
            return null;
          }
        }
      }
    }
    return self.attack(targets[0].x-self.me.x,targets[0].y-self.me.y)
  }

  //give resources if possible (given that you are already at base)
  else if ((self.me.karbonite > 0 || self.me.fuel > 0) && (Math.abs(self.me.x - base_location[0]) <= 1 && Math.abs(self.me.y - base_location[1]) <= 1)) {
    return self.give(base_location[0] - self.me.x, base_location[1] - self.me.y, self.me.karbonite, self.me.fuel);
  } 

  //Don't be annoying; get off resources spots and waffle
  else {
    // self.log('no nuis');
    // self.log(self.me.x)
    // self.log(self.me.y)
    let n = nonNuisanceBehavior(self,base_location);
    if (n !== null){
      return self.move(n[0],n[1]);
    }
    else{
      return null;
    }
  }
}

export class CrusaderManager {
  constructor(self) {
    self.log("CRUSADER @ " + [self.me.x, self.me.y]);
  }

  turn(step, self) {
    return null;
  }
}


export class ProphetManager {
  constructor(self) {
    // self.log("PROPHET @ " + [self.me.x, self.me.y]);

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

  }

  turn(step, self) {
    for (const r of self.getVisibleRobots()) {
      if (COMM16.type(r.signal) == COMM16.BASELOC_HEADER && step < 3){
        this.mode = CONSTANTS.DEFENSE
        this.base_location = COMM16.DECODE_BASELOC(r.signal)
        this.mode_location = null
      }
    }

    if (this.mode == CONSTANTS.DEFENSE) {
      let action = defensive_behaviour_passive(self, this.mode_location, this.base_location)
      return action;
    }
  }
}

// PREACHER BEHAVIOR is just CRUSADER - the escort stuff
export class PreacherManager {
  constructor(self) {
    self.log("PREACHER @ " + [self.me.x, self.me.y])
  }

  turn(step, self) {
    return null;
  }
}