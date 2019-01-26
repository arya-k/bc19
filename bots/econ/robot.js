import {BCAbstractRobot, SPECS} from 'battlecode';
import {CastleManager, ChurchManager} from './buildingManager.js';
import {PilgrimManager} from './pilgrimManager.js';
import {ScoutManager} from './scoutManager.js';
import {COMM16} from './comm.js';
import {CrusaderManager, ProphetManager, PreacherManager} from './attackManager.js'

class NoneManager {turn(step, self){return null}}

let step = -1;
let robotManager = null;

class MyRobot extends BCAbstractRobot {
  turn() {
    step++;
    let self = this; // use self instead of this, since this gets overridden inside functions.

    if (robotManager === null) { // When we don't have an existing manager
      if (self.me.unit === SPECS.CASTLE) {
        robotManager = new CastleManager(self);
        // robotManager = new NoneManager();

      } else if (self.me.unit === SPECS.CHURCH) {
        robotManager = new ChurchManager(self);
        // robotManager = new NoneManager();

      } else if (self.me.unit === SPECS.PILGRIM) {
        for (const r of self.getVisibleRobots()) {
          if (COMM16.type(r.signal) == COMM16.SCOUT_HEADER) {
            robotManager = new ScoutManager(self);
          }
        }
        if (robotManager === null)
          robotManager = new PilgrimManager(self);
        // robotManager = new NoneManager();

      } else if (self.me.unit === SPECS.CRUSADER) {
        robotManager = new CrusaderManager(self);
        // robotManager = new NoneManager();

      } else if (self.me.unit === SPECS.PROPHET) {
        robotManager = new ProphetManager(self);
        // robotManager = new NoneManager();

      } else if (self.me.unit === SPECS.PREACHER) {
        robotManager = new PreacherManager(self);
        // robotManager = new NoneManager();

      }
    }

    // now, just obey the manager;
    let action = robotManager.turn(step, self);
    if (action === null) {
      return;
    } else {
      return action;
    }
  }
}

var robot = new MyRobot();