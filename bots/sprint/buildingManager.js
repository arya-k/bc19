import {SPECS} from 'battlecode';
import {CONSTANTS, CIRCLES, COMM8, COMM16} from './constants.js'
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
  return (my_location[0]-other_location[1])**2+(mylocation[1]-other_location[1])**2
}

class ChurchManager(){
  function constructor(self) {
    self.castleTalk(COMM8.BUILDUP_STAGE); // let castles know that the buildup stage has started.

    this.stage = CONSTANTS.BUILDUP
    // every time karbonite > 70, we increment to_attack. 
    // If karbonite <70, we set to_attack to 0. 
    // if to_attack >= 3, switch stage to ATTACK

    // Every time a church is created, the pilgrim that created it will tell it where enemy castles are.
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
    const pass_map, fuel_map, karbonite_map = self.map, self.fuel_map, self.karbonite_map;
    this.enemy_loc = determine_enemy_location(pass_map, fuel_map, karbonite_map, [self.me.x, self.me.y])
    this.canReachEnemy = move_to(<args>, [self.me.x, self.me.y], this.enemy_loc) !== null // move_to comes from path.js

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

    for (const r of self.getVisibleRobots()){
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
          if (this.fuel_spots.includes() {
            remove that point // we no longer need to send a pilgrim there - someone else already did!
          }
        }
      }
    }

    if (i see an enemy) {
      if (there is a preacher adjacent) {
        self.signal(COMM16.DISTRESS(enemy_loc), r^2 of adjacent preacher (1 or 2))
      }
    } else if (this.signal_queue.length > 0){
      let sig = this.signal_queue.shift()
      self.signal(sig[0], sig[1]);
      if (sig.length > 2) { // when we're building a crusader, we have to queue the pilgrimSignal, and the Y coord castleTalk.
        self.castleTalk(sig[2])
      }
    }

    if (this.build_queue.length > 0){
      let unit = this.build_queue.shift()
      if (have resources to build unit) {
        if (have room to build unit) {
          if (the unit is a crusader) {
            let pilgrim_id = (find id of the nearby pilgrim)
            add [COMM16.ESCORT(pilgrim_id), r^2 of crusader youre about to build (1 or 2)] to this.signal_queue
          }
          return build_unit(unit, available_spot)
        }
      }
      return null; // we have to wait until we can build the unit
    }

    if (this.stage == CONSTANTS.EXPLORATION) {
      if (!this.preacher_built && this.canReachEnemy) {
        if (have resources to build a preacher in available_fuel and available_karbonite) {
          if (have room to build a preacher) {
            castleTalk(CONSTANTS.BUILT_PREACHER)
            add [COMM16.ATTACK(this.enemy_loc), r^2 of built preacher (1 or 2)] to this.signal_queue
            return build a preacher
          }
        }
      } else if (this.fuel_spots.length + this.karbonite_spots.length > 0) {
        for each karbonite spot {
          if (the x value of the karbonite spot is not in any this.partial_points) { // no other units MIGHT be trying to build at that spot.
            if (we have the resources in available_fuel + available_karbonite to build a pilgrim AND crusader) {
              if (we have the space to build a pilgrim) {
                castleTalk(COMM8.X(the x coord of the karbonite spot we are sending the pilgrim to))
                add [COMM16.GOTO(karbonite spot), r^2 of pilgrim to be built (1 or 2), COMM8.Y(y coord of the karbonite spot)] to this.signal_queue
                add SPECS.CRUSADER to this.build_queue
                return build a pilgrim
              }
            }
          }
        }
        <repeat the for loop above, but replace all karbonites with fuels>
      }
    } else { // buildup or attack stage
      if (no preacher in visible range) { // we're missing our defensive preacher.
        if (have resources to build a preacher in self.karbonite and self.fuel) { // no more paired units, so we don't need to watch for others building crusaders.
          if (have room to build a preacher) {
            build a preacher (our defensive preacher)
          }
        }
      }
    }



  }
}