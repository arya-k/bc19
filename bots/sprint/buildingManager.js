import {SPECS} from 'battlecode';
import {CONSTANTS, CIRCLES, COMM8, COMM16} from './constants.js'
import {move_to} from './path.js'
// church, castle

function determine_enemy_location(pass_map, fuel_map, karb_map, my_location) {
  // given my_location: [x, y] and the two maps, determine the map symmetry (vertical or horizontal).
  // from there, return the location of the enemy based on your location, and the map symmetry.
  // it's important that we do this in a DETERMINISTIC way (so no random point sampling.)
  // We need this function to return the same result, every time.
  let horizontalSymmetry = true; // y = len - y - 1
  let N = pass_map.length;

  outer: for (let i = 0; i < N; i++) {
    for (let j = 0; j < Math.floor(N/2); j++) {
      if (pass_map[j][i] != pass_map[N - j - 1][i] ||
          fuel_map[j][i] != fuel_map[N - j - 1][i] ||
          karb_map[j][i] != karb_map[N - j - 1][i]) {
        horizontalSymmetry = false;
        break outer;
      }
    }
  }

  if (horizontalSymmetry) {
    return [my_location[0], N - my_location[1] - 1];
  } else {
    return [N - my_location[0] - 1, my_location[1]];
  }

}

function Point(x, y){
  this.x = x;
  this.y = y;
}

function bfs_resources(pass_map, fuel_map, karbonite_map, my_location) {
  // copy paste (almost) of arya's code. returns the fuel spots and the karbonite spots.
  // for fuel/karbonite spots, it's a list of points
  // each point is a list [x_coord, y_coord]

  var resource_map = {fuel: [], karbonite: []};

    // Generate the visited set:
    let visited = new Set()
    let queue = [new Point(my_location[0], my_location[1])]

    while (queue.length > 0) {
        let current = queue.shift()

        if (visited.has((current.y<<6) + current.x)) { continue; } // seen before.
        visited.add((current.y<<6) + current.x) // mark as visited

        // check for fuel + karbonite:
        if (fuel_map[current.y][current.x]) {
            resource_map.fuel.push([current.x, current.y])
        } else if (karbonite_map[current.y][current.x]) {
            resource_map.karbonite.push([current.x, current.y])
        }

        for (const dir of CIRCLES[SPECS.UNITS[SPECS.PREACHER].SPEED]){ // add nbrs
            if ((current.x + dir[0]) >= 0 && (current.x + dir[0]) < pass_map[0].length) {
                if ((current.y + dir[1]) >= 0 && (current.y + dir[1]) < pass_map.length) { // in map range
                    if (pass_map[current.y + dir[1]][current.x + dir[0]]) { // can go here
                        queue.push(new Point(current.x + dir[0], current.y + dir[1]))
                    }
                }
            }
        }
    }
    return resource_map;
}

function dist(a, b){ // returns the squared distance
  return (a[0]-b[0])**2+(a[1]-b[1])**2
}

export class ChurchManager {
  constructor(self) {
    self.castleTalk(COMM8.BUILDUP_STAGE); // let castles know that the buildup stage has started.

    this.stage = CONSTANTS.BUILDUP
    // every time karbonite > 70, we increment to_attack. 
    // If karbonite <70, we set to_attack to 0. 
    // if to_attack >= 3, switch stage to ATTACK

    // Every time a church is created, the pilgrim that created it will tell it where enemy castles are.
    /*if (signal & COMM16.HEADER_MASK == COMM16.ENEMYLOC_HEADER) {
      this.enemy_loc = COMM16.DECODE_ENEMYLOC(signal);
    }*/
    this.enemy_loc = null;
    for (const r of self.getVisibleRobots()) {
      if (r.signal & COMM16.HEADER_MASK == COMM16.ENEMYLOC_HEADER) {
        let my_loc = COMM16.DECODE_ENEMYLOC(r.signal);
        this.enemy_loc = determine_enemy_location(self.map, self.fuel_map, self.karbonite_map, my_loc);
      }
    }

  }
  turn(step, self) {
    // check if stage can change:
    if (this.stage == CONSTANTS.BUILDUP) { // check if we need to change the stage
      if (self.karbonite > SPECS.UNITS[SPECS.CHURCH].CONSTRUCTION_KARBONITE) {
        this.to_attack++;
      } else {
        this.to_attack = 0
      }

      if (this.to_attack >= 3) {
        this.stage = CONSTANTS.ATTACK
      }
    }

    if (this.stage == CONSTANTS.BUILDUP) { // buildup stage
      let mycrusader = null;
      for (const dir of CIRCLES[2]) {
        let r_id = self.getVisibleRobotMap()[self.me.y + dir[1]][self.me.x + dir[0]];
        if (r_id > 0) {
          let r = self.getRobot(r_id);
          if (r.team == self.me.team && r.unit == SPECS.CRUSADER) {
            let mycrusader = r;
            break;
          }
        }
      }

      if (mycrusader !== null) { // then look for enemies.
        let enemy = null;
        for (const r of self.getVisibleRobots()) {
          if (r.team !== undefined && r.team != self.me.team) { // enemy sighting!
            let r_dist = dist([r.x, r.y], [self.me.x, self.me.y])
            if (enemy == null || r_dist < enemy[1]) {
              enemy = [r, r_dist];
            }
          }
        }

        if (enemy !== null) {
          let fuel_required = dist([mycrusader.x, mycrusader.y], [self.me.x, self.me.y]);
          if (self.fuel >= fuel_required) {
            self.signal(COMM16.DISTRESS(enemy[0].x, enemy[0].y), fuel_required);
          }
        }
      }

    } else if (this.stage == CONSTANTS.ATTACK) { // attack stage
      self.log("ATTACK STAGEEEEEEEEE")
      let signalled_crusader = false; // the adjacent crusader
      let built_robot; // adjacent empty point
      let open = [false, null]
      let visibleRobotMap = self.getVisibleRobotMap()
      self.log("HERE1")
      for (const dir of CIRCLES[2]) { //check each cardinal direction
        self.log("HERE2")
        if (!(self.map[self.me.y + dir[1]] && self.map[self.me.y + dir[1]][self.me.x + dir[0]]))
          continue;
        let id = visibleRobotMap[self.me.y + dir[1]][self.me.x + dir[0]];
        if (id > 0) {// if there's a robot there
          let r = self.getRobot(id);
          if (r.unit == SPECS.CRUSADER && r.team == self.me.team && !signalled_crusader){
            self.signal(COMM16.ATTACK(...this.enemy_loc), dist([self.me.x, self.me.y], [r.x, r.y]))
            signalled_crusader = true;
          }
        } else if (id == 0){
          open = [true, [dir[0], dir[1]]];
        }
      }
      self.log("HERE3")
      if (self.karbonite > SPECS.UNITS[SPECS.CRUSADER].CONSTRUCTION_KARBONITE &&
        self.fuel > SPECS.UNITS[SPECS.CRUSADER].CONSTRUCTION_FUEL) { // if we are able to build a crusader, build it
        if (open[0]) {
          return self.buildUnit(SPECS.CRUSADER, open[1][0], open[1][1]);
        }
      }
      self.log("HERE4")
    }

  }
}

export class CastleManager {
  constructor(self) {
    this.enemy_loc = determine_enemy_location(self.map, self.fuel_map, self.karbonite_map, [self.me.x, self.me.y])
    this.canReachEnemy = move_to(self.map, self.getVisibleRobotMap(), SPECS.UNITS[SPECS.PREACHER].SPEED, [self.me.x, self.me.y], this.enemy_loc) !== null // move_to comes from path.js

    let res = bfs_resources(self.map, self.fuel_map, self.karbonite_map, [self.me.x, self.me.y])
    this.fuel_spots = res.fuel.slice(0, Math.ceil(res.fuel.length/3) + 1)
    this.karbonite_spots = res.karbonite.slice(0, Math.ceil(res.karbonite.length/3) + 1)

    this.preacher_built = false;

    this.partial_points = {}; // r_id of castle: x_coord of the points (they haven't told us the y coord yet.)
    this.stage = CONSTANTS.EXPLORATION; // first stage

    this.build_queue = [] // fairly self-explanatory lol
    this.signal_queue = [] // fairly self-explanatory lol
  }

  turn(step, self) {
    let available_fuel = self.fuel
    let available_karbonite = self.karbonite
    let adjacent_preacher = null;
    let enemy_loc = null;
    let available_spots = [];
    let near_pilgrim = null;
    let preacher_visible = false;

    for (const dir of CIRCLES[2]) {
      if (self.map[self.me.y + dir[1]] && self.map[self.me.y + dir[1]][self.me.x + dir[0]]) {
        if (self.getVisibleRobotMap()[self.me.y + dir[1]][self.me.x + dir[0]] < 1)
          available_spots.push(dir)
      }
    }

    for (const r of self.getVisibleRobots()){
      let d = dist([self.me.x, self.me.y], [r.x, r.y]);
      if (r.team !== null && r.team == self.me.team && r.id != self.me.id){ // ally!
        const castle_talk = r.castle_talk;
        if (castle_talk == COMM8.BUILDUP_STAGE) {
          this.stage = CONSTANTS.BUILDUP
        
        } else if (castle_talk == COMM8.BUILT_PREACHER) {
          this.preacher_built = true;
        
        } else if ((castle_talk & COMM8.HEADER_MASK) == COMM8.X_HEADER) {
          this.partial_points[r.id] = COMM8.DECODE_X(castle_talk)
          // someone just built a pilgrim: we need to make sure we don't use up their crusader fund:
          available_fuel -= SPECS.UNITS[SPECS.CRUSADER].CONSTRUCTION_FUEL;
          available_karbonite -= SPECS.UNITS[SPECS.CRUSADER].CONSTRUCTION_KARBONITE
        
        } else if ((castle_talk & COMM8.HEADER_MASK) == COMM8.Y_HEADER) {
          let resource_point = [this.partial_points[r.id], COMM8.DECODE_Y(castle_talk)]
          this.partial_points[r.id] = null;

          for (var i = 0; i < this.fuel_spots.length; i++) {
            if (this.fuel_spots[i][0] == resource_point[0] &&
                this.fuel_spots[i][1] == resource_point[1]) {
              this.fuel_spots.splice(i, 1);
            }
          }
          for (var i = 0; i < this.karbonite_spots.length; i++) {
            if (this.karbonite_spots[i][0] == resource_point[0] &&
                this.karbonite_spots[i][1] == resource_point[1]) {
              this.karbonite_spots.splice(i, 1);
            }
          }
        }
        if (r.unit == SPECS.PREACHER) {
          preacher_visible = true;
          if (d <= 2){
            adjacent_preacher = [r, d];
            if (enemy_loc !== null){
              self.signal(COMM16.DISTRESS(enemy_loc[0], enemy_loc[1]), dist([self.me.x, self.me.y], [adjacent_preacher.x, adjacent_preacher.y])) 
            }
          }
        } else if (r.unit == SPECS.PILGRIM) {
          if (near_pilgrim == null || near_pilgrim[1] > d){
            near_pilgrim = [r, d]
          }
        }
      }
      else if (r.id != self.me.id) { //enemy!
        if (adjacent_preacher !== null){
          self.signal(COMM16.DISTRESS(r.x, r.y), dist([self.me.x, self.me.y], [adjacent_preacher.x, adjacent_preacher.y]))
        }
      }
    }

    if (enemy_loc === null && this.signal_queue.length > 0){ // no visible enemies
      let sig = this.signal_queue.shift()
      self.signal(sig[0], sig[1]);
      if (sig.length > 2) { // when we're building a crusader, we have to queue the pilgrimSignal, and the Y coord castleTalk.
        self.castleTalk(sig[2])
      }
    }

    if (this.build_queue.length > 0){
      let unit = this.build_queue.shift()
      if (self.fuel > SPECS.UNITS[unit].CONSTRUCTION_FUEL && self.karbonite > SPECS.UNITS[unit].CONSTRUCTION_KARBONITE) {
        if (available_spots.length > 0) {
          if (unit == SPECS.CRUSADER) {
            let pilgrim_id = near_pilgrim[0].id;
            this.signal_queue.push([COMM16.ESCORT(pilgrim_id), dist([0,0], available_spots[0])])
          }
          return self.buildUnit(unit, ...available_spots[0]);
        }
      }
      return null; // we have to wait until we can build the unit
    }

    if (this.stage == CONSTANTS.EXPLORATION) { // if in exploration stage
      if (!this.preacher_built && this.canReachEnemy) {
        if (available_fuel > SPECS.UNITS[SPECS.PREACHER].CONSTRUCTION_FUEL && available_karbonite > SPECS.UNITS[SPECS.PREACHER].CONSTRUCTION_KARBONITE) {
          if (available_spots.length > 0) {
            self.castleTalk(COMM8.BUILT_PREACHER);
            this.signal_queue.push([COMM16.ATTACK(...this.enemy_loc), dist([0,0], available_spots[0])]);
            this.preacher_built = true;
            return self.buildUnit(SPECS.PREACHER, ...available_spots[0]);
          }
        }
      } else if ((this.fuel_spots.length + this.karbonite_spots.length) > 0) {
        let bool = false;
        let spot = null;
        for (const k_spot of this.karbonite_spots){
          spot = k_spot;
          if (Object.values(this.partial_points).indexOf(k_spot[0]) == -1) { // no other units MIGHT be trying to build at that spot.
            if (available_fuel > SPECS.UNITS[SPECS.PILGRIM].CONSTRUCTION_FUEL + SPECS.UNITS[SPECS.CRUSADER].CONSTRUCTION_FUEL && 
              available_karbonite > SPECS.UNITS[SPECS.PILGRIM].CONSTRUCTION_KARBONITE + SPECS.UNITS[SPECS.CRUSADER].CONSTRUCTION_KARBONITE) {
              if (available_spots.length > 0) {
                bool = true;
                break;
              }
            }
          }
        }
        if (bool){
          self.castleTalk(COMM8.X(spot[0]));
          this.signal_queue.push([COMM16.GOTO(...spot), dist([0,0], available_spots[0]), COMM8.Y(spot[1])]);
          this.build_queue.push(SPECS.CRUSADER);
          let index = this.karbonite_spots.indexOf(spot);
          this.karbonite_spots.splice(index, 1)
          return self.buildUnit(SPECS.PILGRIM, ...available_spots[0]);
        }
        for (const f_spot of this.fuel_spots){
          spot = f_spot;
          if (Object.values(this.partial_points).indexOf(f_spot[0]) == -1) { // no other units MIGHT be trying to build at that spot.
            if (available_fuel > SPECS.UNITS[SPECS.PILGRIM].CONSTRUCTION_FUEL + SPECS.UNITS[SPECS.CRUSADER].CONSTRUCTION_FUEL && 
              available_karbonite > SPECS.UNITS[SPECS.PILGRIM].CONSTRUCTION_KARBONITE + SPECS.UNITS[SPECS.CRUSADER].CONSTRUCTION_KARBONITE) {
              if (available_spots.length > 0) {
                bool = true;
                break;
              }
            }
          }
        }
        if (bool){
          self.castleTalk(COMM8.X(spot[0]));
          this.signal_queue.push([COMM16.GOTO(...spot), dist([0,0], available_spots[0]), COMM8.Y(spot[1])]);
          this.build_queue.push(SPECS.CRUSADER);
          let index = this.fuel_spots.indexOf(spot);
          this.fuel_spots.splice(index, 1)
          return self.buildUnit(SPECS.PILGRIM, ...available_spots[0]);
        }
      }
    } else { // buildup or attack stage
      if (!preacher_visible) { // we're missing our defensive preacher.
        if (self.fuel > SPECS.UNITS[SPECS.PREACHER].CONSTRUCTION_FUEL && 
        self.karbonite > SPECS.UNITS[SPECS.PREACHER].CONSTRUCTION_KARBONITE) { // no more paired units, so we don't need to watch for others building crusaders.
          if (available_spots.length > 0) {
            return self.buildUnit(SPECS.PREACHER, ...available_spots[0]);
          }
        }
      }
    }
  }
}