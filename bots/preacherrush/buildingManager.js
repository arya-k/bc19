import {SPECS} from 'battlecode';
import {CIRCLES} from './constants.js'
import {dist, is_valid, getNearbyRobots, getClearLocations, getAttackOrder} from './utils.js'
import {COMM8, COMM16} from './comm.js'
import {num_moves} from './path.js'


export class CastleManager {
  constructor(self) {
  }

  turn(step, self) {
    let building_locations = getClearLocations(self, 2);

    if (self.karbonite > SPECS.UNITS[SPECS.PREACHER].CONSTRUCTION_KARBONITE && self.fuel > SPECS.UNITS[SPECS.PREACHER].CONSTRUCTION_FUEL)
      return self.buildUnit(SPECS.PREACHER, building_locations[0][0] - self.me.x, building_locations[0][1] - self.me.y)
  }
}

