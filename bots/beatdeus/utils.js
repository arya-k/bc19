import {SPECS} from 'battlecode';
import {CIRCLES} from './constants.js'

export function dist(a, b) {
  return ((a[0]-b[0])**2) + ((a[1]-b[1])**2) // return the r^2 distance
}

export function is_valid(x, y, dim) {
  // return whether the x,y point is within the map range
  return (x >=0 && x < dim && y >= 0 && y < dim);
}

export function getNearbyRobots(self, p, r_squared) {
  // returns the ids of all the robots within the range r_squared
  let ret = []
  const vis_map = self.getVisibleRobotMap()
  let x = p[0], y = p[1];

  for (const dir of CIRCLES[r_squared]) {
    if (is_valid(x + dir[0], y + dir[1], self.map.length)) {
      if (vis_map[y + dir[1]][x + dir[0]] > 0) {
        ret.push(vis_map[y + dir[1]][x + dir[0]])
      }
    }
  }

  return ret;
}

export function getClearLocations(self, r_squared) {
  // returns the locations with no obstructions or robots:
  let ret = []
  const vis_map = self.getVisibleRobotMap()

  for (const dir of CIRCLES[r_squared]) {
    if (self.map[self.me.y + dir[1]] && self.map[self.me.y + dir[1]][self.me.x + dir[0]]) { // valid + passable
      if (vis_map[self.me.y + dir[1]][self.me.x + dir[0]] < 1) {
        ret.push([self.me.x + dir[0], self.me.y + dir[1]])
      }
    }
  }

  return ret;
}


function unitRank(r) {
  // utility for sorting by when to attack them. higher number is higher priority
  if (r.unit == SPECS.PREACHER) // it hurts the most
    return 0;
  else if (r.unit == SPECS.PROPHET) // you can kill it sooner
    return 1;
  else if (r.unit == SPECS.CRUSADER) // its an attacking unit
    return 2;
  else if (r.unit == SPECS.PILGRIM) // you can kill it fast
    return 3;
  else if (r.unit == SPECS.CASTLE) // to win... a duh.
    return 4;
  else if (r.unit == SPECS.CHURCH) // It's there. you should kill it.
    return 5;
}


export function getAttackOrder(self) {
  // returns robot objects, in the order you should attack them.

  const my_loc = [self.me.x, self.me.y]

  let units = self.getVisibleRobots().filter(function(r) {
    if (self.isVisible(r) && r.team !== self.me.team) {
      let d = dist(my_loc, [r.x, r.y]);
      if (d <= SPECS.UNITS[self.me.unit].ATTACK_RADIUS[1] &&
          d >= SPECS.UNITS[self.me.unit].ATTACK_RADIUS[0]) {
        return true;
      }
    }
    return false;
  })

  // sort them:
  units.sort(function (a, b) {
    if (unitRank(a) != unitRank(b))
      return unitRank(a) - unitRank(b); // high priority first
    return dist(my_loc, [a.x, a.y]) - dist(my_loc, [b.x, b.y]); // closer ones first
  })

  return units;
}

export function has_adjacent_attacker(self, p) {
  const vis_map = self.getVisibleRobotMap();
  for (const dir of CIRCLES[2]) {
    let x = p[0] + dir[0]; 
    let y = p[1] + dir[1];
    if (is_valid(x, y, self.map.length)) {
      if (vis_map[y][x] > 0){
        let temp = SPECS.UNITS[self.getRobot(vis_map[y][x]).unit];
        if (temp.ATTACK_DAMAGE !== null && temp.SPEED != 0)
          return true;
      }
    }
  }
  return false;
}

export function has_adjacent_castle(self, p) {
  const vis_map = self.getVisibleRobotMap();
  for (const dir of CIRCLES[2]) {
    let x = p[0] + dir[0]; 
    let y = p[1] + dir[1];
    if (is_valid(x, y, self.map.length)) {
      if (vis_map[y][x] > 0){
        if (self.getRobot(vis_map[y][x]).unit == SPECS.CASTLE)
          return true;
      }
    }   
  }
  return false;
}
