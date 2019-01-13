import {SPECS} from 'battlecode';
import {CONSTANTS, CIRCLES, COMM8, COMM16} from './constants.js'
import {move_to} from './path.js'
// church, castle

function determine_enemy_location(pass_map, fuel_map, karbonite_map, my_location) {
  // given my_location: [x, y] and the two maps, determine the map symmetry (vertical or horizontal).
  // from there, return the location of the enemy based on your location, and the map symmetry.
  // it's important that we do this in a DETERMINISTIC way (so no random point sampling.)
  // We need this function to return the same result, every time.
}


function bfs_resources(pass_map, fuel_map, karbonite_map, my_location) {
  // copy paste (almost) of arya's code. returns the fuel spots and the karbonite spots.
  // for fuel/karbonite spots, it's a list of points
  // each point is a list [x_coord, y_coord]
  const x, y = my_location[0], my_location[1]
  var resource_map = {fuel: [], karbonite: []};

    // Generate the visited set:
    let visited = new Set()
    let queue = [[x,y]]

    while (queue.length > 0) {
        let current = queue.shift()

        if (visited.has((current.y*64) + current.x)) { continue; } // seen before.
        visited.add((current.y*64) + current.x) // mark as visited

        // check for fuel + karbonite:
        if (fuel_map[current.y][current.x]) {
            resource_map.fuel.push([current.x, current.y, 0, CONSTANTS.NO_ROBOT_ASSIGNED, -1000])
        } else if (karbonite_map[current.y][current.x]) {
            resource_map.karbonite.push([current.x, current.y, 0, CONSTANTS.NO_ROBOT_ASSIGNED, -1000])
        }

        for (dir of CIRCLES[SPECS.UNITS[SPECS.PREACHER].SPEED]){ // add nbrs
            if ((current.x + dir[0]) >= 0 && (current.x + dir[0]) < pass_map[0].length) {
                if ((current.y + dir[1]) >= 0 && (current.y + dir[1]) < pass_map.length) { // in map range
                    if (pass_map[current.y + dir[1]][current.x + dir[0]]) { // can go here
                        queue.push([current.x + dir[0], current.y + dir[1]])
                    }
                }
            }
        }
    }
    return resource_map;
}

function dist(my_location, other_location){ // returns the squared distance
  return (my_location[0]-other_location[0])**2+(mylocation[1]-other_location[1])**2
}

class ChurchManager(){
  function constructor(self) {
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
  function step(step, self) {
    // check if stage can change:
    if (this.stage == CONSTANTS.BUILDUP) { // check if we need to change the stage
      if (this.karbonite > 70) {
        this.to_attack++;
      } else {
        this.to_attack = 0
      }

      if (this.to_attack >= 3) {
        this.stage = CONSTANTS.ATTACK
      }
    }

    if (this.stage == CONSTANTS.BUILDUP) { // buildup stage
      let close_crusader = null;
      let enemySighting = null; // check if there are any enemies.
      for (const r of self.getVisibleRobots()) {
        if (r.team !== undefined) { 
          let dist = dist([r.x, r.y], [self.me.x, self.me.y]); 
          if (r.team != self.me.team) { // enemy sighting!
            if (SPECS.UNITS[r.unit].SPEED != null) { // not castle/church
              if (enemySighting != null && enemySighting[1] > dist) 
                enemySighting = [r, dist]; //will end up being the closest enemy
            }
          }
          else { // ally sighting!
            if (r.unit == SPECS.CRUSADER)
              close_crusader = [r, dist];
          }
        }
      }

      if (enemySighting != null){ // if see an enemy and ally crusader, signal distress to ally if fuel is sufficient
        if (close_crusader != null && self.fuel > Math.ceil(Math.sqrt(close_crusader[1])))
          self.signal(COMM16.DISTRESS(nearest enemy), Math.ceil(Math.sqrt(close_crusader[1])));
      }
      return null;

    } else if (this.stage == CONSTANTS.ATTACK) { // attack stage
      let adjacent_crusader = null; // the adjacent crusader
      let open = [false, null]; // adjacent empty point
      let visibleRobotMap = self.getVisibleRobotMap()
      for (const dir of CIRCLES[2]){ //check each cardinal direction
        let id = visibleRobotMap[self.me.y + dir[0]][self.me.x + dir[1]];
        if (id > 0) {// if there's a robot there
          let r = this.getRobot(id);
          if (r.unit == SPECS.CRUSADER && r.team != self.me.team){
            adjacent_crusader = r;
            if (open[0])
              break;
          }
        }
        else if (id == 0){
          open = [true, [self.me.x + dir[0], self.me.y + dir[1]];
          if (adjacent_crusader != null)
            break;
        }
      }
      if (adjacent_crusader != null) {
        self.signal(COMM16.ATTACK(this.enemy_loc[0], this.enemy_loc[1]), 
        Math.ceil(Math.sqrt(dist([adjacent_crusader.x, adjacent_crusader.y], [self.me.x, self.me.y])))) // That way the crusader will attack the enemy
      }
      if (self.karbonite > SPECS.UNITS[SPECS.CRUSADER].CONSTRUCTION_KARBONITE &&
        self.fuel > SPECS.UNITS[SPECS.CRUSADER].CONSTRUCTION_FUEL) { // if we are able to build a crusader, build it
        if (open) {
          return self.build_unit(SPECS.CRUSADER, open[1][0], open[1][1]);
        }
      }
    }

  }
}

class CastleManager() {
  function constructor(self) {
    const pass_map, fuel_map, karbonite_map, vis_map = self.map, self.fuel_map, self.karbonite_map, self.getVisibleRobotMap();
    this.enemy_loc = determine_enemy_location(pass_map, fuel_map, karbonite_map, [self.me.x, self.me.y])
    this.canReachEnemy = move_to(pass_map, vis_map, SPECS.UNITS[SPECS.PREACHER].SPEED, [self.me.x, self.me.y], this.enemy_loc) !== null // move_to comes from path.js

    res = bfs_resources(pass_map, fuel_map, karbonite_map, [self.me.x, self.me.y])
    this.fuel_spots = [res.fuel[:Math.ceil(res.fuel.length/3)]]
    this.karbonite_spots = [res.karbonite[:Math.ceil(res.karbonite.length/3)]]

    this.preacher_built = false;

    this.partial_point = {}; // r_id of castle: x_coord of the points (they haven't told us the y coord yet.)
    this.stage = CONSTANTS.EXPLORATION; // first stage

    this.build_queue = [] // fairly self-explanatory lol
    this.signal_queue = [] // fairly self-explanatory lol
  }

  function step(step, self) {

    let available_fuel = self.fuel
    let available_karbonite = self.karbonite
    let adjacent_preacher = null;
    let enemy_loc = null;
    let adjacent_count = 0;
    let available_spots = CIRCLES[2];
    let near_pilgrim = null;
    let preacher_visible = false;

    for (const r of self.getVisibleRobots()){
      let dist = dist([self.me.x, self.me.y], [r.x, r.y]);
      if (dist <= 2){
        adjacent_count++;
        let temp = available_spots.indexOf([r.x-self.me.x, r.y-self.me.y]);
        available_spots.splice(temp, 1);
      }

      if (r.team != null && r.team == self.me.team){ // ally!
        const castle_talk = r.castle_talk;
        if (castle_talk != null) {
          if (castle_talk == COMM8.BUILDUP_STAGE) {
            this.stage = CONSTANTS.BUILDUP
          
          } else if (castle_talk == COMM8.BUILT_PREACHER) {
            this.preacher_built = true;
          
          } else if (castle_talk & COMM8.HEADER_MASK == X_HEADER) {
            this.partial_point[r.id] = COMM8.DECODE_X(castle_talk)
            // someone just built a pilgrim: we need to make sure we don't use up their crusader fund:
            available_fuel -= SPECS.UNITS[SPECS.CRUSADER].CONSTRUCTION_FUEL;
            available_karbonite -= SPECS.UNITS[SPECS.CRUSADER].CONSTRUCTION_KARBONITE
          
          } else if (castle_talk & COMM8.HEADER_MASK == Y_HEADER) {
            let resource_point = [this.partial_point[r.id], COMM8.DECODE_Y(castle_talk)]
            this.partial_point[r.id] = null;
            if (this.fuel_spots.includes(resource_point)) {
              let index = this.fuel_spots.indexOf(resource_point)// we no longer need to send a pilgrim there - someone else already did!
              this.fuel_spots.splice(index, 1);
            }else if (this.karbonite_spots.includes(resource_point)){
              let index = this.karbonite_spots.indexOf(resource_point)// we no longer need to send a pilgrim there - someone else already did!
              this.karbonite_spots.splice(index, 1);
            }
          }
        }
        if (r.unit == SPECS.PREACHER) {
          preacher_visible = true;
          if (dist <= 2){
            adjacent_preacher = [r, dist];
            if (enemy_loc != null)
              self.signal(COMM16.DISTRESS(...enemy_loc), dist([self.me.x, self.me.y], [adjacent_preacher.x, adjacent_preacher.y])) 
          }
        } else if (r.unit == SPECS.PILGRIM) {
          if (near_pilgrim == null || near_pilgrim[1] > dist){
            near_pilgrim = [r, dist]
          }
        }
      }
      else { //enemy!
        enemy_loc = [r.x, r.y]
        if (adjacent_preacher != null)
          self.signal(COMM16.DISTRESS(enemy_loc), dist([self.me.x, self.me.y], [adjacent_preacher.x, adjacent_preacher.y]))
      }
    }

    if (enemy_loc == null && this.signal_queue.length > 0){ // no visible enemies
      let sig = this.signal_queue.shift()
      self.signal(sig[0], sig[1]);
      if (sig.length > 2) { // when we're building a crusader, we have to queue the pilgrimSignal, and the Y coord castleTalk.
        self.castleTalk(sig[2])
      }
    }

    if (this.build_queue.length > 0){
      let unit = this.build_queue.shift()
      if (self.fuel > SPECS.UNITS[unit].CONSTRUCTION_FUEL && self.karbonite > SPECS.UNITS[unit].CONSTRUCTION_KARBONITE) {
        if (available_spots != []) {
          if (unit == SPECS) {
            let pilgrim_id = near_pilgrim.id;
            this.signal_queue.push([COMM16.ESCORT(pilgrim_id), dist([0,0], available_spots[0])])
          }
          return build_unit(unit, ...available_spots[0]);
        }
      }
      return null; // we have to wait until we can build the unit
    }

    if (this.stage == CONSTANTS.EXPLORATION) { // if in exploration stage
      if (!this.preacher_built && this.canReachEnemy) {
        if (this.available_fuel > SPECS.UNITS[SPECS.PREACHER].CONSTRUCTION_FUEL && this.available_karbonite > SPECS.UNITS[SPECS.PREACHER].CONSTRUCTION_KARBONITE) {
          if (available_spots != []) {
            castleTalk(CONSTANTS.BUILT_PREACHER);
            this.signal_queue([COMM16.ATTACK(this.enemy_loc), dist([0,0], available_spots[0])]);
            return build_unit(SPECS.PREACHER, ...available_spots[0]);
          }
        }
      } else if (this.fuel_spots.length + this.karbonite_spots.length > 0) {
        let bool = false;
        let spot = null;
        for (const k_spot of this.karbonite_spots){
          spot = k_spot;
          if (Object.values(this.partial_points).includes(k_spot[0])) { // no other units MIGHT be trying to build at that spot.
            if (this.available_fuel > SPECS.UNITS[SPECS.PILGRIM].CONSTRUCTION_FUEL + SPECS.UNITS[SPECS.CRUSADER].CONSTRUCTION_FUEL && 
              this.available_karbonite > SPECS.UNITS[SPECS.PILGRIM].CONSTRUCTION_KARBONITE + SPECS.UNITS[SPECS.CRUSADER].CONSTRUCTION_KARBONITE) {
              if (available_spots != []) {
                bool = true;
              }
            }
          }
        }
        if (bool){
          castleTalk(COMM8.X(spot[0]));
          this.signal_queue.push([COMM16.GOTO(spot), dist([0,0], available_spots[0]), COMM8.Y(spot[1])]);
          this.build_queue.push(SPECS.CRUSADER);
          let index = this.karbonite_spots.indexOf(spot);
          this.karbonite_spots.splice(index, 1)
          return build_unit(SPECS.PILGRIM, ...available_spots[0]);
        }

        for (const f_spot of this.fuel_spots){
          spot = f_spot;
          if (Object.values(this.partial_points).includes(f_spot[0])) { // no other units MIGHT be trying to build at that spot.
            if (this.available_fuel > SPECS.UNITS[SPECS.PILGRIM].CONSTRUCTION_FUEL + SPECS.UNITS[SPECS.CRUSADER].CONSTRUCTION_FUEL && 
              this.available_karbonite > SPECS.UNITS[SPECS.PILGRIM].CONSTRUCTION_KARBONITE + SPECS.UNITS[SPECS.CRUSADER].CONSTRUCTION_KARBONITE) {
              if (available_spots != []) {
                bool = true;
              }
            }
          }
        }
        if (bool){
          castleTalk(COMM8.X(spot[0]));
          this.signal_queue.push([COMM16.GOTO(spot), dist([0,0], available_spots[0]), COMM8.Y(spot[1])]);
          this.build_queue.push(SPECS.CRUSADER);
          let index = this.fuel_spots.indexOf(spot);
          this.fuel_spots.splice(index, 1)
          return build_unit(SPECS.PILGRIM, ...available_spots[0]);
        }
      }
    } else { // buildup or attack stage
      if (!preacher_visible) { // we're missing our defensive preacher.
        if (self.fuel > SPECS.UNITS[SPECS.PREACHER].CONSTRUCTION_FUEL && 
        self.karbonite > SPECS.UNITS[SPECS.PREACHER].CONSTRUCTION_KARBONITE) { // no more paired units, so we don't need to watch for others building crusaders.
          if (available_spots != []) {
            return build_unit(SPECS.PREACHER, ...available_spots[0]);
          }
        }
      }
    }
  }
}