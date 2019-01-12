import {SPECS} from 'battlecode';
// church, castle

function determine_enemy_location(pass_map, fuel_map, my_location) {
  // given my_location: [x, y] and the two maps, determine the map symmetry (vertical or horizontal).
  // from there, return the location of the enemy based on your location, and the map symmetry.
  // it's important that we do this in a DETERMINISTIC way (so no random point sampling.)
  // We need this function to return the same result, every time.
}

function bfs_resources(pass_map, fuel_map, karbonite_map, my_location) {
  // copy paste (almost) of arya's code. returns the fuel spots and the karbonite spots.
  // for fuel/karbonite spots, it's a list of points
  // each point is a list [x_coord, y_coord]
}

class ChurchManager(){
  function init(self) {
    self.castleTalk(COMM8.BUILDUP_STAGE); // let castles know that the buildup stage has started.

    this.stage = CONSTANTS.BUILDUP
    // every time kryptonite > 70, we increment to_attack. 
    // If kryptonite <70, we set to_attack to 0. 
    // if to_attack >= 3, switch stage to ATTACK
    this.to_attack = 0; 

    // Every time a church is created, the pilgrim that created it will tell it where enemy castles are.
    if (signal & COMM16.HEADER_MASK == COMM16.ENEMYLOC_HEADER) {
      this.enemy_loc = COMM16.DECODE_ENEMYLOC(signal);
    }

  }
  function step(step, self) {
    // check if stage can change:
    if (this.stage == CONSTANTS.BUILDUP) { // check if we need to change the stage
      if (this.kryptonite > 70) {
        this.to_attack++;
      } else {
        this.to_attack = 0
      }

      if (this.to_attack >= 3) {
        this.stage = CONSTANTS.ATTACK
      }
    }

    if (this.stage == CONSTANTS.BUILDUP) {
      if (see any enemies) { // Look through arya's code -> he loops through visibleRobots to basically do this.
        if (see my crusader and have the fuel to message it) {
          self.signal(COMM16.DISTRESS(nearest enemy))
        }
      }
      return null;
    } else if (this.stage == CONSTANTS.ATTACK) {
      if (have resources to build crusader) {
        if (have room to build a crusader) {
          self.signal(COMM16.ATTACK(this.enemy_loc[0], this.enemy_loc[1])) // That way the crusader will attack the enemy
          return build crusader;
        }
      }
    }

  }
}

class CastleManager() {
  function init(self) {
    this.enemy_loc = determine_enemy_location(<whatever the args are>)
    this.canReachEnemy = move_to(<args>, [self.me.x, self.me.y], this.enemy_loc) !== null // move_to comes from path.js

    res = bfs_resources(pass_map, fuel_map, karbonite_map, [self.me.x, self.me.y])
    this.fuel_spots = [first third of res[0] (round up) ]
    this.karbonite_spots = [first third of res[1] (round up) ]

    this.preacher_built = false;

    this.partial_point = {}; // r_id of castle: x_coord of the points (they haven't told us the y coord yet.)
    this.stage = CONSTANTS.EXPLORATION; // first stage

    this.build_queue = [] // fairly self-explanatory lol
    this.signal_queue = [] // fairly self-explanatory lol
  }

  function step(step, self) {

    available_fuel = self.fuel
    available_karbonite = self.karbonite

    for each r which has a r.castle_talk {
      if (castle_talk == COMM8.BUILDUP_STAGE) {
        this.stage = CONSTANTS.BUILDUP
      } else if (castle_talk == COMM8.BUILT_PREACHER) {
        this.preacher_built = true;
      } else if (castle_talk & COMM8.HEADER_MASK == X_HEADER) {
        this.partial_point[r.id] = COMM8.DECODE_X(castle_talk)
        // someone just built a pilgrim: we need to make sure we don't use up their crusader fund:
        available_fuel -= fuel cost of a crusader // use SPECS.UNITS[SPECS.CRUSADER]... DON'T HARDCODE THE VALUES.
        available_karbonite -= karbonite cost of a crusader // use SPECS.UNITS[SPECS.CRUSADER]... DON'T HARDCODE THE VALUES.
      } else if (castle_talk & COMM8.HEADER_MASK == Y_HEADER) {
        resource_point = [this.partial_point[r.id], COMM8.DECODE_Y(castle_talk)]
        this.partial_point[r.id] = null;
        if (resource_point is one of our fuel or karbonite spots) {
          remove that point // we no longer need to send a pilgrim there - someone else already did!
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
      if (sig.length > 2) { // then there's a castleTalk too
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
      if (no preacher in visible range) {
        if (have resources to build a preacher in self.karbonite and self.fuel) { // no more paired units, so we don't need to watch for others building crusaders.
          if (have room to build a preacher) {
            build a preacher (our defensive preacher)
          }
        }
      }
    }



  }
}