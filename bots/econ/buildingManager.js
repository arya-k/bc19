import {SPECS} from 'battlecode';
import {CIRCLES} from './constants.js'
import {COMM8, COMM16} from './comm.js'
import {num_moves} from './path.js'
import {getNearbyRobots, canAfford, getClearLocations, getAttackOrder, dist, isHorizontalSymmetry} from './utils.js'
import {find_resource_clusters, local_cluster_info, determine_cluster_plan, get_best_cluster_castle} from './clusters.js'

const CHURCH_BUILD_PILGRIM_THRESHOLD = 500; // we have to have this much fuel before we build a pilgrim for a church.
const CASTLE_BUILD_PILGRIM_THRESHOLD = 200; // we have to have this much fuel before we build a pilgrim for a castle
const BUILD_PILGRIM_KARB_THRESHOLD = 50; // we need this much karb to build a pilgrim
const LATTICE_BUILD_FUEL_THRESHOLD = 1000; // we have to have this much fuel before we add to a lattice.
const LATTICE_BUILD_KARB_THRESHOLD = 100; // we have to have this much karbonite before we add to a lattice.
const NONESSENTIAL_LATTICE_FUEL_THRESHOLD = 2000; // if we have this much fuel, we can build a lattice beyond whats necessary
const NONESSENTIAL_LATTICE_KARB_THRESHOLD = 200; // if we have this much karb, we can build a lattice beyond whats necessary
const CRUSADER_SPAM_ROUND = 900; // after this round, we spam crusaders to win on unit health.

const LATTICE_RATIO = { // these HAVE to add up to 1
  prophet: 7/10,
  preacher: 1/10,
  crusader: 2/10,
}

function determine_enemy_locations(horiSym, castle_locs, N) {
  let ret = [];
  for (const loc of castle_locs)
    ret.push(horiSym ? [loc[0], N - loc[1] - 1] : [N - loc[0] - 1, loc[1]]);
  return ret;
}


function determine_attack_plan(self, c_locs, e_locs) {
  let timed_pairs = [];
  let empty_vis_map = [...Array(self.map.length)].map(e => Array(self.map.length).fill(-1));

  for (let i=0; i<c_locs.length; i++) {
    let dist = num_moves(self.map, empty_vis_map, SPECS.UNITS[SPECS.PROPHET].SPEED, c_locs[i], e_locs[i]);
    timed_pairs.push([c_locs[i], e_locs[i], dist]) 
  }

  timed_pairs.sort(function (a,b) { return a[2] - b[2] })

  let to_ret = []
  for (const tp of timed_pairs) {
    to_ret.push({me:tp[0], enemy:tp[1], lattice:(tp[2] <= 12), cluster:false});
  }
  return to_ret;
}

function getRelevantAttackPlan(self, attack_plan) {
  let cluster_plan = null;
  for (const ap of attack_plan)
    if (dist(ap.me, [self.me.x, self.me.y]) == 0) {
      if (ap.lattice)
        return ap
      else if (ap.cluster)
        cluster_plan = ap;
    }
  return cluster_plan;
}

function getToBuild(lattices, self) {
  let numUnitsToBuild = Math.min(((self.fuel - LATTICE_BUILD_FUEL_THRESHOLD) / SPECS.UNITS[SPECS.PROPHET].CONSTRUCTION_FUEL),
                                 ((self.karbonite - LATTICE_BUILD_KARB_THRESHOLD) / SPECS.UNITS[SPECS.PROPHET].CONSTRUCTION_KARBONITE));
  // now, sort the lattices:
  let ordered_lattices = []
  for (const ll in lattices)
    if (lattices[ll].built < lattices[ll].needed)
      ordered_lattices.push(lattices[ll])

  ordered_lattices.sort(function(a,b) {
    return (a.built - a.needed) - (b.built - b.needed);
  })

  let myIndex = null;
  for (let i = 0; i < ordered_lattices.length; i++)
    if (ordered_lattices[i].loc[0] == self.me.x && ordered_lattices[i].loc[1] == self.me.y)
      myIndex = i;

  return (myIndex !== null && (myIndex <= numUnitsToBuild));
}

function getToBuildNonEssential(lattices, self) {
  let numUnitsToBuild = Math.min(((self.fuel - LATTICE_BUILD_FUEL_THRESHOLD) / SPECS.UNITS[SPECS.PROPHET].CONSTRUCTION_FUEL),
                                 ((self.karbonite - LATTICE_BUILD_KARB_THRESHOLD) / SPECS.UNITS[SPECS.PROPHET].CONSTRUCTION_KARBONITE));
  // now, sort the lattices:
  let ordered_lattices = []
  for (const ll in lattices)
    ordered_lattices.push(lattices[ll])

  ordered_lattices.sort(function(a,b) {
    return (a.built - a.needed) - (b.built - b.needed);
  })

  let myIndex = null;
  for (let i = 0; i < ordered_lattices.length; i++)
    if (ordered_lattices[i].loc[0] == self.me.x && ordered_lattices[i].loc[1] == self.me.y)
      myIndex = i;

  return (myIndex !== null && (myIndex <= numUnitsToBuild));
}

function allHaveMinimumLattice(lattices) {
  for (const l in lattices)
    if (lattices[l].built < lattices[l].needed)
      return false;
  return true;
}

function calculate_lattice_dir(horiSym, attack_plan, maplen) {
  if (horiSym && attack_plan[0].me[1] <= (Math.ceil(maplen / 2) + 1)) // top
    return 4; // attack the bottom
  else if (horiSym && attack_plan[0].me[1] >= (Math.ceil(maplen / 2) - 1)) // bottom
    return 2; // attack the top
  else if (!horiSym && attack_plan[0].me[0] <= (Math.ceil(maplen / 2) + 1)) // left
    return 1; // attack the right
  else if (!horiSym && attack_plan[0].me[0] >= (Math.ceil(maplen / 2) - 1)) // right
    return 3; // attack the left
}

export class CastleManager {
  constructor(self) {
    self.log("CASTLE @ " + [self.me.x, self.me.y])
    this.isHori = isHorizontalSymmetry(self.map, self.fuel_map, self.karbonite_map);

    this.castle_locations = [];
    this.enemy_castle_locations = [];
    this.partial_points = [];

    this.church_locations = [];

    this.all_lattices = {};

    this.horiSym = isHorizontalSymmetry(self.map, self.fuel_map, self.karbonite_map)

    this.castle_talk_queue = [COMM8.ENCODE_Y(self.me.y), COMM8.ENCODE_X(self.me.x)];
    this.build_signal_queue = [];

    this.resource_clusters = find_resource_clusters(self, self.map, self.fuel_map, self.karbonite_map)
    this.nearby_numresources = local_cluster_info(self)[0];

    this.pioneer_pilgrims = {};
    this.pioneer_ids = [];

    this.cluster_plan = [];
    this.attack_plan = [];
  }

  turn(step, self) {
    /* GATHERING CASTLE LOCATIONS */
    for (const r of self.getVisibleRobots()) {
      if (COMM8.type(r.castle_talk) == COMM8.X_HEADER) {
        this.partial_points[r.id] = COMM8.DECODE_X(r.castle_talk);
      } else if (COMM8.type(r.castle_talk) == COMM8.Y_HEADER) {
        if (step <= 2) {
          this.castle_locations.push([this.partial_points[r.id], COMM8.DECODE_Y(r.castle_talk)])
          this.all_lattices[r.id] = {built:0, needed:10, aggro:false, loc:[this.partial_points[r.id], COMM8.DECODE_Y(r.castle_talk)]}
        } else {
          this.church_locations.push([this.partial_points[r.id], COMM8.DECODE_Y(r.castle_talk)])
          this.all_lattices[r.id] = {built:0, needed:10, aggro:false, loc:[this.partial_points[r.id], COMM8.DECODE_Y(r.castle_talk)]}
          let obj = this;
          this.attack_plan = this.attack_plan.filter(function (ap) { // remove the church if you built there successfully.
            if (dist(ap.enemy, [obj.partial_points[r.id], COMM8.DECODE_Y(r.castle_talk)]) == 0) {
              obj.castle_talk_queue.unshift(COMM8.NOT_AGGRO)
              return false;
            }
            return true;
          })
        }
      } else if (r.castle_talk == COMM8.ADDED_LATTICE) {
        this.all_lattices[r.id].built++;
      } else if (r.castle_talk == COMM8.REMOVED_LATTICE) {
        this.all_lattices[r.id].built--;
      } else if (self.isVisible(r) && r.castle_talk == COMM8.NEW_PILGRIM) {
        this.pioneer_pilgrims[r.id] = this.last_cluster;
        this.pioneer_ids.push(r.id);
      } else if (r.castle_talk == COMM8.NOT_AGGRO) {
        this.all_lattices[r.id].aggro = false;
      } else if (r.castle_talk == COMM8.AGGRO) {
        this.all_lattices[r.id].aggro = true;
      }

      if (COMM16.type(r.signal) == COMM16.ENEMYDEAD_HEADER) {
        if (this.castle_talk_queue.length == 0 ||
            this.castle_talk_queue[this.castle_talk_queue.length - 1 ] !== COMM8.NOT_AGGRO) {
          let obj = this; // remove it from the attack plan.
          this.attack_plan = this.attack_plan.filter(function (ap) {
            return dist(ap.me, obj.all_lattices[self.me.id].loc) > 0 || !ap.lattice;
          });
          self.log("KILLED ENEMY @ " + COMM16.DECODE_ENEMYDEAD(r.signal))

          this.build_signal_queue.unshift([SPECS.PILGRIM, COMM16.ENCODE_BASELOC(...COMM16.DECODE_ENEMYDEAD(r.signal))])

          if (getRelevantAttackPlan(self, this.attack_plan) == null)
            this.castle_talk_queue.unshift(COMM8.NOT_AGGRO); // there are no more reasons for you to be aggressive.
        }
      }
    }

    /* UPDATE ATTACK_TARGETS */
    let obj = this;
    this.pioneer_ids = this.pioneer_ids.filter(function (pid) {
      const r = self.getRobot(pid);
      if (r === null || r == undefined || r.castle_talk < 1 || r.castle_talk == COMM8.HINDERED) {
        self.log("CREATING AN ATTACK TARGET + PILGRIM @ " + [obj.pioneer_pilgrims[pid].x, obj.pioneer_pilgrims[pid].y])
        obj.castle_talk_queue.unshift(COMM8.AGGRO)
        obj.attack_plan.unshift({me:[self.me.x, self.me.y], enemy:[obj.pioneer_pilgrims[pid].x, obj.pioneer_pilgrims[pid].y], lattice:false, cluster:true})
        return false;
      }
      return true; // nothing is wrong :)
    })

    if (step == 2) { // we've just gotten castle location information.
      this.castle_locations.sort(function(a,b) { return dist(a, [0,0]) - dist(b, [0,0])}); // make sure they're all the same
      this.enemy_castle_locations = determine_enemy_locations(this.horiSym, this.castle_locations, self.map.length);
      this.attack_plan = determine_attack_plan(self, this.castle_locations, this.enemy_castle_locations);
      this.cluster_plan = determine_cluster_plan(this.resource_clusters, this.attack_plan, this.horiSym, self.map.length, self);
      this.attack_index = 0; // we attack the closest enemy first
      this.attack_party = new Set(); // keep track of my robot_ids
      this.attacked = 0;

      for (const ap of this.attack_plan) // the ones that need to lattice to the enemy are in aggro lattice mode.
        if (ap.lattice) // we are going to lattice to the enemy to attack them:
          for (const ll in this.all_lattices) {
            let l = this.all_lattices[ll];
            if (l.loc[0] == ap.me[0] && l.loc[1] == ap.me[1])
              l.aggro = true;
          }
    }

    // Count up units, build_locations, etc.
    let building_locations = getClearLocations(self, 2);
    let myRobots = {preacher:[], prophet:[], crusader:[], pilgrim:[]};
    let enemyRobots = {preacher:false, prophet:false, crusader:false}
    for (const r_id of getNearbyRobots(self, [self.me.x, self.me.y], SPECS.UNITS[SPECS.CASTLE].VISION_RADIUS)) {
      let r = self.getRobot(r_id);
      if (r.team == self.me.team) {
        if (r.unit == SPECS.CRUSADER)
          myRobots.crusader.push(r);
        else if (r.unit == SPECS.PREACHER)
          myRobots.preacher.push(r);
        else if (r.unit == SPECS.PROPHET)
          myRobots.prophet.push(r)
        else if (r.unit == SPECS.PILGRIM)
          myRobots.pilgrim.push(r);
      } else if (r.team !== self.me.team) {
        if (r.unit == SPECS.CRUSADER)
          enemyRobots.crusader = r;
        else if (r.unit == SPECS.PREACHER)
          enemyRobots.preacher = r;
        else if (r.unit == SPECS.PROPHET)
          enemyRobots.prophet = r;
      }
    }

    /* ACTIVE DEFENSE */
    // if we see an enemy crusader, build a preacher if possible:
    if (enemyRobots.crusader !== false && myRobots.preacher.length < 2 && 
        canAfford(SPECS.PREACHER, self) && building_locations.length > 0) {
      self.signal(COMM16.ENCODE_ENEMYSIGHTING(enemyRobots.crusader.x, enemyRobots.crusader.y),
                  dist([self.me.x, self.me.y], building_locations[0]))
      self.castleTalk(COMM8.ADDED_LATTICE);
      return self.buildUnit(SPECS.PREACHER, building_locations[0][0] - self.me.x, building_locations[0][1] - self.me.y);
    }

    // otherwise if they're close enough to whack, then whack them.
    let attackableEnemy = getAttackOrder(self);
    if (attackableEnemy.length > 0) {
      return self.attack(attackableEnemy[0].x - self.me.x, attackableEnemy[0].y - self.me.y)
    }

    // otherwise if we see an enemy prophet, build a crusader
    if (enemyRobots.prophet !== false && myRobots.crusader.length < 3 && 
        canAfford(SPECS.CRUSADER, self) && building_locations.length > 0) {
      self.signal(COMM16.ENCODE_ENEMYSIGHTING(enemyRobots.prophet.x, enemyRobots.prophet.y),
                  dist([self.me.x, self.me.y], building_locations[0]))
      self.castleTalk(COMM8.ADDED_LATTICE);
      return self.buildUnit(SPECS.CRUSADER, building_locations[0][0] - self.me.x, building_locations[0][1] - self.me.y);
    }

    // otherwise if we see an enemy preacher, build a prophet:
    if (enemyRobots.preacher !== false && myRobots.prophet.length < 3 && 
        canAfford(SPECS.PROPHET, self) && building_locations.length > 0) {
      self.signal(COMM16.ENCODE_ENEMYSIGHTING(enemyRobots.preacher.x, enemyRobots.preacher.y),
                  dist([self.me.x, self.me.y], building_locations[0]))
      self.castleTalk(COMM8.ADDED_LATTICE);
      return self.buildUnit(SPECS.PROPHET, building_locations[0][0] - self.me.x, building_locations[0][1] - self.me.y);
    }

    /* BUILDING PILGRIMS FOR THINGS */
    if (canAfford(SPECS.PILGRIM, self) && self.fuel > CASTLE_BUILD_PILGRIM_THRESHOLD &&
        self.karbonite > BUILD_PILGRIM_KARB_THRESHOLD && this.build_signal_queue.length == 0) {
      let pilgrimCount = 0;
      for (const r of myRobots.pilgrim)
        if (dist([r.x, r.y], [self.me.x, self.me.y]) <= 50)
          pilgrimCount++;

      if (pilgrimCount < this.nearby_numresources) {
        this.build_signal_queue.unshift([SPECS.PILGRIM, null]);
      } else if (step >= 2 && this.cluster_plan.length > 0) {
        if (this.cluster_plan[this.cluster_plan.length - 1].defend) {
          if (self.fuel > (SPECS.UNITS[SPECS.PILGRIM].CONSTRUCTION_FUEL + SPECS.UNITS[SPECS.PROPHET].CONSTRUCTION_FUEL) &&
              self.karbonite > (SPECS.UNITS[SPECS.PILGRIM].CONSTRUCTION_KARBONITE + SPECS.UNITS[SPECS.PROPHET].CONSTRUCTION_KARBONITE)) {
            let best_cluster = this.cluster_plan.pop();
            let best_castle = get_best_cluster_castle(self, best_cluster.x, best_cluster.y, this.castle_locations)
            if (best_castle[0] == self.me.x && best_castle[1] == self.me.y) {
              self.log("SENDING PILGRIM TO CLUSTER: " + [best_cluster.x, best_cluster.y]);
              this.last_cluster = best_cluster
              this.build_signal_queue.unshift([SPECS.PROPHET, COMM16.ENCODE_BASELOC(best_cluster.x, best_cluster.y)])
              this.build_signal_queue.unshift([SPECS.PILGRIM, COMM16.ENCODE_BASELOC(best_cluster.x, best_cluster.y)])
            }
          }
        } else {
          let best_cluster = this.cluster_plan.pop();
          let best_castle = get_best_cluster_castle(self, best_cluster.x, best_cluster.y, this.castle_locations)
          if (best_castle[0] == self.me.x && best_castle[1] == self.me.y) {
            self.log("SENDING PILGRIM TO CLUSTER: " + [best_cluster.x, best_cluster.y]);
            this.last_cluster = best_cluster
            this.build_signal_queue.unshift([SPECS.PILGRIM, COMM16.ENCODE_BASELOC(best_cluster.x, best_cluster.y)])
          }
        }
      }
    }

    /* LATTICE PLANNING */
    if (step >= 2 && self.fuel >= LATTICE_BUILD_FUEL_THRESHOLD && building_locations.length > 0 &&
        self.karbonite > LATTICE_BUILD_KARB_THRESHOLD && this.build_signal_queue.length == 0) {
      let totalLatticeCount = myRobots.preacher.length + myRobots.prophet.length + myRobots.crusader.length;

      let latticeUnit = SPECS.PROPHET;
      if (myRobots.prophet.length < totalLatticeCount * LATTICE_RATIO.prophet)
        latticeUnit = SPECS.PROPHET;
      else if (myRobots.preacher.length < totalLatticeCount * LATTICE_RATIO.preacher)
        latticeUnit = SPECS.PREACHER;
      else if (myRobots.crusader.length < totalLatticeCount * LATTICE_RATIO.crusader)
        latticeUnit = SPECS.CRUSADER;

      if (step > CRUSADER_SPAM_ROUND)
        latticeUnit = SPECS.CRUSADER;

      if (getToBuild(this.all_lattices, self)) {
        this.castle_talk_queue.unshift(COMM8.ADDED_LATTICE);
        this.build_signal_queue.unshift([latticeUnit, COMM16.ENCODE_LATTICE(0)]);
      } else if (allHaveMinimumLattice(this.all_lattices)){
        let agro_lattice = null; // check if anything is aggro:
        for (const ll in this.all_lattices)
          if (this.all_lattices[ll].aggro)
            agro_lattice = this.all_lattices[ll];

        if (agro_lattice !== null) { // a castle is trying to lattice to the enemy
          if (agro_lattice.loc[0] == self.me.x && agro_lattice.loc[1] == self.me.y) {
            let relevantPlan = getRelevantAttackPlan(self, this.attack_plan)
            if (relevantPlan.lattice) {
              if (this.lattice_dir === undefined) // determine which way the lattice should point.
                this.lattice_dir = calculate_lattice_dir(this.horiSym, this.attack_plan, self.map.length);
              this.castle_talk_queue.unshift(COMM8.ADDED_LATTICE); // aggro lattices are prophet only.
              this.build_signal_queue.unshift([SPECS.PROPHET, COMM16.ENCODE_LATTICE(this.lattice_dir)]);
            } else if (relevantPlan.cluster) {
              self.log("THIS IS WHERE I WORK TOWARDS A HORDE FOR: " + relevantPlan)
            }
          }
        } else if (getToBuildNonEssential(this.all_lattices, self) && 
                   self.fuel > NONESSENTIAL_LATTICE_FUEL_THRESHOLD &&
                   self.karbonite > NONESSENTIAL_LATTICE_KARB_THRESHOLD) { // just generically expand the lattice
          this.castle_talk_queue.unshift(COMM8.ADDED_LATTICE);
          this.build_signal_queue.unshift([latticeUnit, COMM16.ENCODE_LATTICE(0)]);
        }
      }

      if (totalLatticeCount < this.all_lattices[self.me.id].built && this.castle_talk_queue.length == 0) {
        if (this.castle_talk_queue[this.castle_talk_queue.length - 1] == COMM8.ADDED_LATTICE)
          this.castle_talk_queue.pop() // just pretend we didn't add a troop - that achieves the same thing.
        else
          this.castle_talk_queue.unshift(COMM8.REMOVED_LATTICE); // we lost a troop somewhere along the way.
      }
    }

    // now, do any cached activities.
    if (this.castle_talk_queue.length > 0)
      self.castleTalk(this.castle_talk_queue.pop()); // not performant: doesn't matter

    if (this.build_signal_queue.length > 0) {
      if (building_locations.length > 0) {
        if (self.karbonite > SPECS.UNITS[this.build_signal_queue[this.build_signal_queue.length - 1][0]].CONSTRUCTION_KARBONITE &&
            self.fuel > (SPECS.UNITS[this.build_signal_queue[this.build_signal_queue.length - 1][0]].CONSTRUCTION_FUEL + 2)) {
          let bs = this.build_signal_queue.pop();

          if (bs[1] !== null && COMM16.type(bs[1]) == COMM16.BASELOC_HEADER) { // pick the closest building spot you can.
            let goal_pos = COMM16.DECODE_BASELOC(bs[1])
            building_locations.sort(function (a, b) { return dist(a, goal_pos) - dist(b, goal_pos) });
          } else if (bs[0] === SPECS.PILGRIM && bs[1] === null) { // spawn local pilgrims on resource spots if possible
            building_locations.sort(function (a,b) {
              let a_good = self.fuel_map[a[1]][a[0]] || self.karbonite_map[a[1]][a[0]];
              let b_good = self.fuel_map[b[1]][b[0]] || self.karbonite_map[b[1]][b[0]];
              return a_good ? -1 : b_good ? 1 : 0;
            })
          }

          if (bs[1] !== null)
            self.signal(bs[1], dist([self.me.x, self.me.y], building_locations[0]));
          if (bs[0] !== null)
            return self.buildUnit(bs[0], building_locations[0][0] - self.me.x, building_locations[0][1] - self.me.y);
        }
      }
    }
  }
}


export class ChurchManager {
  constructor(self) {
    self.log("CHURCH @ " + [self.me.x, self.me.y])

    let cluster_info = local_cluster_info(self);
    this.resource_count = cluster_info[0];
    this.resource_radius = cluster_info[1];
    this.build_queue = []
    this.castle_talk_queue = [COMM8.ENCODE_Y(self.me.y), COMM8.ENCODE_X(self.me.x)]

    this.lattice_built = 0;
    this.lattice_needed = 10;
    this.lattice_agro = false;

    let maxDefenderRadius = 0;
    for (const r_id of getNearbyRobots(self, [self.me.x, self.me.y], SPECS.UNITS[SPECS.CASTLE].VISION_RADIUS)) {
      let r = self.getRobot(r_id);
      if (r.team == self.me.team)
        if (r.unit == SPECS.CRUSADER || r.unit == SPECS.PREACHER || r.unit == SPECS.PROPHET) {
          let d = dist([self.me.x, self.me.y], [r.x, r.y])
          if (d <= 25)
            maxDefenderRadius = Math.max(maxDefenderRadius, dist([self.me.x, self.me.y], [r.x, r.y]))
        }
    }
    self.signal(COMM16.ENCODE_LATTICE(0), maxDefenderRadius)
  }

  turn(step, self) {
    let building_locations = getClearLocations(self, 2);
    let myRobots = {preacher:[], prophet:[], crusader:[], pilgrim:[]};
    let enemyRobots = {preacher:false, prophet:false, crusader:false}
    let maxDefenderRadius = 0;

    for (const r_id of getNearbyRobots(self, [self.me.x, self.me.y], SPECS.UNITS[SPECS.CASTLE].VISION_RADIUS)) {
      let r = self.getRobot(r_id);
      if (r.team == self.me.team) {
        if (r.unit == SPECS.CRUSADER || r.unit == SPECS.PREACHER || r.unit == SPECS.PROPHET)
          maxDefenderRadius = Math.max(maxDefenderRadius, dist([self.me.x, self.me.y], [r.x, r.y]))

        if (r.unit == SPECS.CRUSADER)
          myRobots.crusader.push(r);
        else if (r.unit == SPECS.PREACHER)
          myRobots.preacher.push(r);
        else if (r.unit == SPECS.PROPHET)
          myRobots.prophet.push(r)
        else if (r.unit == SPECS.PILGRIM)
          myRobots.pilgrim.push(r);
      } else if (r.team !== self.me.team) {
        if (r.unit == SPECS.CRUSADER)
          enemyRobots.crusader = r;
        else if (r.unit == SPECS.PREACHER)
          enemyRobots.preacher = r;
        else if (r.unit == SPECS.PROPHET)
          enemyRobots.prophet = r;
      }
    }

    /* ACTIVE DEFENSE */
    // signal if necessary
    let enemies = getAttackOrder(self);
    if (enemies.length != 0)
      self.signal(COMM16.ENCODE_ENEMYSIGHTING(enemies[0].x, enemies[0].y), maxDefenderRadius) // signal most pertinent enemy

    // if we see an enemy crusader, build a preacher if possible:
    if (enemyRobots.crusader !== false && myRobots.preacher.length < 2 && 
        canAfford(SPECS.PREACHER, self) && building_locations.length > 0) {
      self.signal(COMM16.ENCODE_ENEMYSIGHTING(enemyRobots.crusader.x, enemyRobots.crusader.y),
                  dist([self.me.x, self.me.y], building_locations[0]))
      this.lattice_built++;
      if (this.castle_talk_queue.length == 0) {
        self.castleTalk(COMM8.ADDED_LATTICE)
      } else {
        this.castle_talk_queue.unshift(COMM8.ADDED_LATTICE)
        self.castleTalk(this.castle_talk_queue.pop())
      }
      return self.buildUnit(SPECS.PREACHER, building_locations[0][0] - self.me.x, building_locations[0][1] - self.me.y);
    }

    // otherwise if we see an enemy prophet, build a crusader
    if (enemyRobots.prophet !== false && myRobots.crusader.length < 3 && 
        canAfford(SPECS.CRUSADER, self) && building_locations.length > 0) {
      self.signal(COMM16.ENCODE_ENEMYSIGHTING(enemyRobots.prophet.x, enemyRobots.prophet.y),
                  dist([self.me.x, self.me.y], building_locations[0]))
      this.lattice_built++;
      if (this.castle_talk_queue.length == 0) {
        self.castleTalk(COMM8.ADDED_LATTICE)
      } else {
        this.castle_talk_queue.unshift(COMM8.ADDED_LATTICE)
        self.castleTalk(this.castle_talk_queue.pop())
      }
      return self.buildUnit(SPECS.CRUSADER, building_locations[0][0] - self.me.x, building_locations[0][1] - self.me.y);
    }

    // otherwise if we see an enemy preacher, build a prophet:
    if (enemyRobots.preacher !== false && myRobots.prophet.length < 3 && 
        canAfford(SPECS.PROPHET, self) && building_locations.length > 0) {
      self.signal(COMM16.ENCODE_ENEMYSIGHTING(enemyRobots.preacher.x, enemyRobots.preacher.y),
                  dist([self.me.x, self.me.y], building_locations[0]))
      this.lattice_built++;
      if (this.castle_talk_queue.length == 0) {
        self.castleTalk(COMM8.ADDED_LATTICE)
      } else {
        this.castle_talk_queue.unshift(COMM8.ADDED_LATTICE)
        self.castleTalk(this.castle_talk_queue.pop())
      }
      return self.buildUnit(SPECS.PROPHET, building_locations[0][0] - self.me.x, building_locations[0][1] - self.me.y);
    }

    /* BUILDING PILGRIMS */
    // if we need to build more pilgrims, do that:
    let pilgrimCount = 0;
    for (const r of myRobots.pilgrim)
      if (dist([r.x, r.y], [self.me.x, self.me.y]) <= this.resource_radius)
        pilgrimCount++;

    if (pilgrimCount < this.resource_count && canAfford(SPECS.PILGRIM, self) &&
        self.fuel > CHURCH_BUILD_PILGRIM_THRESHOLD && this.build_queue.length == 0 &&
        self.karbonite > BUILD_PILGRIM_KARB_THRESHOLD)
      this.build_queue.unshift(SPECS.PILGRIM)

    /* LATTICE */
    if (self.fuel >= (LATTICE_BUILD_FUEL_THRESHOLD + SPECS.UNITS[SPECS.PROPHET].CONSTRUCTION_FUEL) &&
        self.karbonite > (LATTICE_BUILD_KARB_THRESHOLD + SPECS.UNITS[SPECS.PROPHET].CONSTRUCTION_KARBONITE) &&
        step >= 2 && building_locations.length > 0 && this.build_queue.length == 0 ) {

      let totalLatticeCount = myRobots.preacher.length + myRobots.prophet.length + myRobots.crusader.length;
      let latticeUnit = SPECS.PROPHET;
      if (myRobots.prophet.length < totalLatticeCount * LATTICE_RATIO.prophet)
        latticeUnit = SPECS.PROPHET;
      else if (myRobots.preacher.length < totalLatticeCount * LATTICE_RATIO.preacher)
        latticeUnit = SPECS.PREACHER;
      else if (myRobots.crusader.length < totalLatticeCount * LATTICE_RATIO.crusader)
        latticeUnit = SPECS.CRUSADER;

      if (step > CRUSADER_SPAM_ROUND)
        latticeUnit = SPECS.CRUSADER;

      if (this.lattice_built < this.lattice_needed) {
        this.castle_talk_queue.unshift(COMM8.ADDED_LATTICE);
        self.signal(COMM16.ENCODE_LATTICE(0), dist([self.me.x, self.me.y], building_locations[0]));
        this.lattice_built++;
        this.build_queue.unshift(latticeUnit);
      } else if (self.fuel > NONESSENTIAL_LATTICE_FUEL_THRESHOLD &&
                 self.karbonite > NONESSENTIAL_LATTICE_KARB_THRESHOLD) {
        this.castle_talk_queue.unshift(COMM8.ADDED_LATTICE);
        self.signal(COMM16.ENCODE_LATTICE(0), dist([self.me.x, self.me.y], building_locations[0]));
        this.lattice_built++;
        this.build_queue.unshift(latticeUnit);
      }

      if (totalLatticeCount < this.lattice_built && this.castle_talk_queue.length == 0) {
        this.lattice_built--; // we lost a troop somewhere along the way.
        if (this.castle_talk_queue[this.castle_talk_queue.length - 1] == COMM8.ADDED_LATTICE)
          this.castle_talk_queue.pop()
        else
          this.castle_talk_queue.unshift(COMM8.REMOVED_LATTICE);
      }
    }


    /* CACHED ACTIVITIES */
    if (this.castle_talk_queue.length > 0)
      self.castleTalk(this.castle_talk_queue.pop()); // not performant: doesn't matter

    if (this.build_queue.length > 0) {
      if (building_locations.length > 0 && 
          self.karbonite > SPECS.UNITS[this.build_queue[this.build_queue.length - 1]].CONSTRUCTION_KARBONITE &&
          self.fuel > SPECS.UNITS[this.build_queue[this.build_queue.length - 1]].CONSTRUCTION_FUEL) {

        if (this.build_queue[this.build_queue.length - 1] == SPECS.PILGRIM) // try to build a pilgrim on a resource spot
          for (const bl of building_locations)
            if (self.fuel_map[bl[1]][bl[0]] || self.karbonite_map[bl[1]][bl[0]])
              return self.buildUnit(this.build_queue.pop(), bl[0] - self.me.x, bl[1] - self.me.y)

        return self.buildUnit(this.build_queue.pop(), building_locations[0][0] - self.me.x, building_locations[0][1] - self.me.y)
      }
    }

  }
}