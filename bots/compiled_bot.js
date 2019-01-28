'use strict';

var SPECS = {"COMMUNICATION_BITS":16,"CASTLE_TALK_BITS":8,"MAX_ROUNDS":1000,"TRICKLE_FUEL":25,"INITIAL_KARBONITE":100,"INITIAL_FUEL":500,"MINE_FUEL_COST":1,"KARBONITE_YIELD":2,"FUEL_YIELD":10,"MAX_TRADE":1024,"MAX_BOARD_SIZE":64,"MAX_ID":4096,"CASTLE":0,"CHURCH":1,"PILGRIM":2,"CRUSADER":3,"PROPHET":4,"PREACHER":5,"RED":0,"BLUE":1,"CHESS_INITIAL":100,"CHESS_EXTRA":20,"TURN_MAX_TIME":200,"MAX_MEMORY":50000000,"UNITS":[{"CONSTRUCTION_KARBONITE":null,"CONSTRUCTION_FUEL":null,"KARBONITE_CAPACITY":null,"FUEL_CAPACITY":null,"SPEED":0,"FUEL_PER_MOVE":null,"STARTING_HP":200,"VISION_RADIUS":100,"ATTACK_DAMAGE":10,"ATTACK_RADIUS":[1,64],"ATTACK_FUEL_COST":10,"DAMAGE_SPREAD":0},{"CONSTRUCTION_KARBONITE":50,"CONSTRUCTION_FUEL":200,"KARBONITE_CAPACITY":null,"FUEL_CAPACITY":null,"SPEED":0,"FUEL_PER_MOVE":null,"STARTING_HP":100,"VISION_RADIUS":100,"ATTACK_DAMAGE":0,"ATTACK_RADIUS":0,"ATTACK_FUEL_COST":0,"DAMAGE_SPREAD":0},{"CONSTRUCTION_KARBONITE":10,"CONSTRUCTION_FUEL":50,"KARBONITE_CAPACITY":20,"FUEL_CAPACITY":100,"SPEED":4,"FUEL_PER_MOVE":1,"STARTING_HP":10,"VISION_RADIUS":100,"ATTACK_DAMAGE":null,"ATTACK_RADIUS":null,"ATTACK_FUEL_COST":null,"DAMAGE_SPREAD":null},{"CONSTRUCTION_KARBONITE":15,"CONSTRUCTION_FUEL":50,"KARBONITE_CAPACITY":20,"FUEL_CAPACITY":100,"SPEED":9,"FUEL_PER_MOVE":1,"STARTING_HP":40,"VISION_RADIUS":49,"ATTACK_DAMAGE":10,"ATTACK_RADIUS":[1,16],"ATTACK_FUEL_COST":10,"DAMAGE_SPREAD":0},{"CONSTRUCTION_KARBONITE":25,"CONSTRUCTION_FUEL":50,"KARBONITE_CAPACITY":20,"FUEL_CAPACITY":100,"SPEED":4,"FUEL_PER_MOVE":2,"STARTING_HP":20,"VISION_RADIUS":64,"ATTACK_DAMAGE":10,"ATTACK_RADIUS":[16,64],"ATTACK_FUEL_COST":25,"DAMAGE_SPREAD":0},{"CONSTRUCTION_KARBONITE":30,"CONSTRUCTION_FUEL":50,"KARBONITE_CAPACITY":20,"FUEL_CAPACITY":100,"SPEED":4,"FUEL_PER_MOVE":3,"STARTING_HP":60,"VISION_RADIUS":16,"ATTACK_DAMAGE":20,"ATTACK_RADIUS":[1,16],"ATTACK_FUEL_COST":15,"DAMAGE_SPREAD":3}]};

function insulate(content) {
    return JSON.parse(JSON.stringify(content));
}

class BCAbstractRobot {
    constructor() {
        this._bc_reset_state();
    }

    // Hook called by runtime, sets state and calls turn.
    _do_turn(game_state) {
        this._bc_game_state = game_state;
        this.id = game_state.id;
        this.karbonite = game_state.karbonite;
        this.fuel = game_state.fuel;
        this.last_offer = game_state.last_offer;

        this.me = this.getRobot(this.id);

        if (this.me.turn === 1) {
            this.map = game_state.map;
            this.karbonite_map = game_state.karbonite_map;
            this.fuel_map = game_state.fuel_map;
        }

        try {
            var t = this.turn();
        } catch (e) {
            t = this._bc_error_action(e);
        }

        if (!t) t = this._bc_null_action();

        t.signal = this._bc_signal;
        t.signal_radius = this._bc_signal_radius;
        t.logs = this._bc_logs;
        t.castle_talk = this._bc_castle_talk;

        this._bc_reset_state();

        return t;
    }

    _bc_reset_state() {
        // Internal robot state representation
        this._bc_logs = [];
        this._bc_signal = 0;
        this._bc_signal_radius = 0;
        this._bc_game_state = null;
        this._bc_castle_talk = 0;
        this.me = null;
        this.id = null;
        this.fuel = null;
        this.karbonite = null;
        this.last_offer = null;
    }

    // Action template
    _bc_null_action() {
        return {
            'signal': this._bc_signal,
            'signal_radius': this._bc_signal_radius,
            'logs': this._bc_logs,
            'castle_talk': this._bc_castle_talk
        };
    }

    _bc_error_action(e) {
        var a = this._bc_null_action();
        
        if (e.stack) a.error = e.stack;
        else a.error = e.toString();

        return a;
    }

    _bc_action(action, properties) {
        var a = this._bc_null_action();
        if (properties) for (var key in properties) { a[key] = properties[key]; }
        a['action'] = action;
        return a;
    }

    _bc_check_on_map(x, y) {
        return x >= 0 && x < this._bc_game_state.shadow[0].length && y >= 0 && y < this._bc_game_state.shadow.length;
    }
    
    log(message) {
        this._bc_logs.push(JSON.stringify(message));
    }

    // Set signal value.
    signal(value, radius) {
        // Check if enough fuel to signal, and that valid value.
        
        var fuelNeeded = Math.ceil(Math.sqrt(radius));
        if (this.fuel < fuelNeeded) throw "Not enough fuel to signal given radius.";
        if (!Number.isInteger(value) || value < 0 || value >= Math.pow(2,SPECS.COMMUNICATION_BITS)) throw "Invalid signal, must be int within bit range.";
        if (radius > 2*Math.pow(SPECS.MAX_BOARD_SIZE-1,2)) throw "Signal radius is too big.";

        this._bc_signal = value;
        this._bc_signal_radius = radius;

        this.fuel -= fuelNeeded;
    }

    // Set castle talk value.
    castleTalk(value) {
        // Check if enough fuel to signal, and that valid value.

        if (!Number.isInteger(value) || value < 0 || value >= Math.pow(2,SPECS.CASTLE_TALK_BITS)) throw "Invalid castle talk, must be between 0 and 2^8.";

        this._bc_castle_talk = value;
    }

    proposeTrade(karbonite, fuel) {
        if (this.me.unit !== SPECS.CASTLE) throw "Only castles can trade.";
        if (!Number.isInteger(karbonite) || !Number.isInteger(fuel)) throw "Must propose integer valued trade."
        if (Math.abs(karbonite) >= SPECS.MAX_TRADE || Math.abs(fuel) >= SPECS.MAX_TRADE) throw "Cannot trade over " + SPECS.MAX_TRADE + " in a given turn.";

        return this._bc_action('trade', {
            trade_fuel: fuel,
            trade_karbonite: karbonite
        });
    }

    buildUnit(unit, dx, dy) {
        if (this.me.unit !== SPECS.PILGRIM && this.me.unit !== SPECS.CASTLE && this.me.unit !== SPECS.CHURCH) throw "This unit type cannot build.";
        if (this.me.unit === SPECS.PILGRIM && unit !== SPECS.CHURCH) throw "Pilgrims can only build churches.";
        if (this.me.unit !== SPECS.PILGRIM && unit === SPECS.CHURCH) throw "Only pilgrims can build churches.";
        
        if (!Number.isInteger(dx) || !Number.isInteger(dx) || dx < -1 || dy < -1 || dx > 1 || dy > 1) throw "Can only build in adjacent squares.";
        if (!this._bc_check_on_map(this.me.x+dx,this.me.y+dy)) throw "Can't build units off of map.";
        if (this._bc_game_state.shadow[this.me.y+dy][this.me.x+dx] > 0) throw "Cannot build on occupied tile.";
        if (!this.map[this.me.y+dy][this.me.x+dx]) throw "Cannot build onto impassable terrain.";
        if (this.karbonite < SPECS.UNITS[unit].CONSTRUCTION_KARBONITE || this.fuel < SPECS.UNITS[unit].CONSTRUCTION_FUEL) throw "Cannot afford to build specified unit.";

        return this._bc_action('build', {
            dx: dx, dy: dy,
            build_unit: unit
        });
    }

    move(dx, dy) {
        if (this.me.unit === SPECS.CASTLE || this.me.unit === SPECS.CHURCH) throw "Churches and Castles cannot move.";
        if (!this._bc_check_on_map(this.me.x+dx,this.me.y+dy)) throw "Can't move off of map.";
        if (this._bc_game_state.shadow[this.me.y+dy][this.me.x+dx] === -1) throw "Cannot move outside of vision range.";
        if (this._bc_game_state.shadow[this.me.y+dy][this.me.x+dx] !== 0) throw "Cannot move onto occupied tile.";
        if (!this.map[this.me.y+dy][this.me.x+dx]) throw "Cannot move onto impassable terrain.";

        var r = Math.pow(dx,2) + Math.pow(dy,2);  // Squared radius
        if (r > SPECS.UNITS[this.me.unit]['SPEED']) throw "Slow down, cowboy.  Tried to move faster than unit can.";
        if (this.fuel < r*SPECS.UNITS[this.me.unit]['FUEL_PER_MOVE']) throw "Not enough fuel to move at given speed.";

        return this._bc_action('move', {
            dx: dx, dy: dy
        });
    }

    mine() {
        if (this.me.unit !== SPECS.PILGRIM) throw "Only Pilgrims can mine.";
        if (this.fuel < SPECS.MINE_FUEL_COST) throw "Not enough fuel to mine.";
        
        if (this.karbonite_map[this.me.y][this.me.x]) {
            if (this.me.karbonite >= SPECS.UNITS[SPECS.PILGRIM].KARBONITE_CAPACITY) throw "Cannot mine, as at karbonite capacity.";
        } else if (this.fuel_map[this.me.y][this.me.x]) {
            if (this.me.fuel >= SPECS.UNITS[SPECS.PILGRIM].FUEL_CAPACITY) throw "Cannot mine, as at fuel capacity.";
        } else throw "Cannot mine square without fuel or karbonite.";

        return this._bc_action('mine');
    }

    give(dx, dy, karbonite, fuel) {
        if (dx > 1 || dx < -1 || dy > 1 || dy < -1 || (dx === 0 && dy === 0)) throw "Can only give to adjacent squares.";
        if (!this._bc_check_on_map(this.me.x+dx,this.me.y+dy)) throw "Can't give off of map.";
        if (this._bc_game_state.shadow[this.me.y+dy][this.me.x+dx] <= 0) throw "Cannot give to empty square.";
        if (karbonite < 0 || fuel < 0 || this.me.karbonite < karbonite || this.me.fuel < fuel) throw "Do not have specified amount to give.";

        return this._bc_action('give', {
            dx:dx, dy:dy,
            give_karbonite:karbonite,
            give_fuel:fuel
        });
    }

    attack(dx, dy) {
        if (this.me.unit === SPECS.CHURCH) throw "Churches cannot attack.";
        if (this.fuel < SPECS.UNITS[this.me.unit].ATTACK_FUEL_COST) throw "Not enough fuel to attack.";
        if (!this._bc_check_on_map(this.me.x+dx,this.me.y+dy)) throw "Can't attack off of map.";
        if (this._bc_game_state.shadow[this.me.y+dy][this.me.x+dx] === -1) throw "Cannot attack outside of vision range.";

        var r = Math.pow(dx,2) + Math.pow(dy,2);
        if (r > SPECS.UNITS[this.me.unit]['ATTACK_RADIUS'][1] || r < SPECS.UNITS[this.me.unit]['ATTACK_RADIUS'][0]) throw "Cannot attack outside of attack range.";

        return this._bc_action('attack', {
            dx:dx, dy:dy
        });
        
    }


    // Get robot of a given ID
    getRobot(id) {
        if (id <= 0) return null;
        for (var i=0; i<this._bc_game_state.visible.length; i++) {
            if (this._bc_game_state.visible[i].id === id) {
                return insulate(this._bc_game_state.visible[i]);
            }
        } return null;
    }

    // Check if a given robot is visible.
    isVisible(robot) {
        return ('unit' in robot);
    }

    // Check if a given robot is sending you radio.
    isRadioing(robot) {
        return robot.signal >= 0;
    }

    // Get map of visible robot IDs.
    getVisibleRobotMap() {
        return this._bc_game_state.shadow;
    }

    // Get boolean map of passable terrain.
    getPassableMap() {
        return this.map;
    }

    // Get boolean map of karbonite points.
    getKarboniteMap() {
        return this.karbonite_map;
    }

    // Get boolean map of impassable terrain.
    getFuelMap() {
        return this.fuel_map;
    }

    // Get a list of robots visible to you.
    getVisibleRobots() {
        return this._bc_game_state.visible;
    }

    turn() {
        return null;
    }
}

let CONSTANTS = {
  // attacking troops:
  DEFENSE: 100,
  OFFENSE: 101,
  ESCORT: 102,
  LATTICE: 103,
  PURSUING_BASE: 104,
  BASE_PURSUED: 105,

  // pilgrims:
  MINE: 125,
  DEPOSIT: 126,
  BUILD: 127,
  FOUND_NEARBY_BASE: 128,

  // scouts
  SCOUT: 129,
  CHILLIN: 130,
  RETURN: 131,

  // stages:
  EXPLORATION: 149,
  BUILDUP: 150,
  ATTACK: 151,

  ELIMINATED_ENEMY: 200,
  ABANDON_ESCORT: 201,
  LOST_ESCORT: 202,

};

let CIRCLES = {};

CIRCLES[1] = [[1, 0], [0, 1], [0, -1], [-1, 0]];
CIRCLES[2] = [[1, 1], [1, -1], [-1, 1], [-1, -1]].concat(CIRCLES[1]);
CIRCLES[3] = CIRCLES[2];
CIRCLES[4] = [[2, 0], [0, 2], [0, -2], [-2, 0]].concat(CIRCLES[2]);
CIRCLES[5] = [[2, 1], [2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2], [-2, 1], [-2, -1]].concat(CIRCLES[4]);
CIRCLES[6] = CIRCLES[5];
CIRCLES[7] = CIRCLES[5];
CIRCLES[8] = [[2, 2], [2, -2], [-2, 2], [-2, -2]].concat(CIRCLES[5]);
CIRCLES[9] = [[3, 0], [0, 3], [0, -3], [-3, 0]].concat(CIRCLES[8]);
CIRCLES[10] = [[3, 1], [3, -1], [1, 3], [1, -3], [-1, 3], [-1, -3], [-3, 1], [-3, -1]].concat(CIRCLES[9]);
CIRCLES[11] = CIRCLES[10];
CIRCLES[12] = CIRCLES[10];
CIRCLES[13] = [[3, 2], [3, -2], [2, 3], [2, -3], [-2, 3], [-2, -3], [-3, 2], [-3, -2]].concat(CIRCLES[10]);
CIRCLES[14] = CIRCLES[13];
CIRCLES[15] = CIRCLES[13];
CIRCLES[16] = [[4, 0], [0, 4], [0, -4], [-4, 0]].concat(CIRCLES[13]);
CIRCLES[17] = [[4, 1], [4, -1], [1, 4], [1, -4], [-1, 4], [-1, -4], [-4, 1], [-4, -1]].concat(CIRCLES[16]);
CIRCLES[18] = [[3, 3], [3, -3], [-3, 3], [-3, -3]].concat(CIRCLES[17]);
CIRCLES[19] = CIRCLES[18];
CIRCLES[20] = [[4, 2], [4, -2], [2, 4], [2, -4], [-2, 4], [-2, -4], [-4, 2], [-4, -2]].concat(CIRCLES[18]);
CIRCLES[21] = CIRCLES[20];
CIRCLES[22] = CIRCLES[20];
CIRCLES[23] = CIRCLES[20];
CIRCLES[24] = CIRCLES[20];
CIRCLES[25] = [[5, 0], [4, 3], [4, -3], [3, 4], [3, -4], [0, 5], [0, -5], [-3, 4], [-3, -4], [-4, 3], [-4, -3], [-5, 0]].concat(CIRCLES[20]);
CIRCLES[26] = [[5, 1], [5, -1], [1, 5], [1, -5], [-1, 5], [-1, -5], [-5, 1], [-5, -1]].concat(CIRCLES[25]);
CIRCLES[27] = CIRCLES[26];
CIRCLES[28] = CIRCLES[26];
CIRCLES[29] = [[5, 2], [5, -2], [2, 5], [2, -5], [-2, 5], [-2, -5], [-5, 2], [-5, -2]].concat(CIRCLES[26]);
CIRCLES[30] = CIRCLES[29];
CIRCLES[31] = CIRCLES[29];
CIRCLES[32] = [[4, 4], [4, -4], [-4, 4], [-4, -4]].concat(CIRCLES[29]);
CIRCLES[33] = CIRCLES[32];
CIRCLES[34] = [[5, 3], [5, -3], [3, 5], [3, -5], [-3, 5], [-3, -5], [-5, 3], [-5, -3]].concat(CIRCLES[32]);
CIRCLES[35] = CIRCLES[34];
CIRCLES[36] = [[6, 0], [0, 6], [0, -6], [-6, 0]].concat(CIRCLES[34]);
CIRCLES[37] = [[6, 1], [6, -1], [1, 6], [1, -6], [-1, 6], [-1, -6], [-6, 1], [-6, -1]].concat(CIRCLES[36]);
CIRCLES[38] = CIRCLES[37];
CIRCLES[39] = CIRCLES[37];
CIRCLES[40] = [[6, 2], [6, -2], [2, 6], [2, -6], [-2, 6], [-2, -6], [-6, 2], [-6, -2]].concat(CIRCLES[37]);
CIRCLES[41] = [[5, 4], [5, -4], [4, 5], [4, -5], [-4, 5], [-4, -5], [-5, 4], [-5, -4]].concat(CIRCLES[40]);
CIRCLES[42] = CIRCLES[41];
CIRCLES[43] = CIRCLES[41];
CIRCLES[44] = CIRCLES[41];
CIRCLES[45] = [[6, 3], [6, -3], [3, 6], [3, -6], [-3, 6], [-3, -6], [-6, 3], [-6, -3]].concat(CIRCLES[41]);
CIRCLES[46] = CIRCLES[45];
CIRCLES[47] = CIRCLES[45];
CIRCLES[48] = CIRCLES[45];
CIRCLES[49] = [[7, 0], [0, 7], [0, -7], [-7, 0]].concat(CIRCLES[45]);
CIRCLES[50] = [[7, 1], [7, -1], [5, 5], [5, -5], [1, 7], [1, -7], [-1, 7], [-1, -7], [-5, 5], [-5, -5], [-7, 1], [-7, -1]].concat(CIRCLES[49]);
CIRCLES[51] = CIRCLES[50];
CIRCLES[52] = [[6, 4], [6, -4], [4, 6], [4, -6], [-4, 6], [-4, -6], [-6, 4], [-6, -4]].concat(CIRCLES[50]);
CIRCLES[53] = [[7, 2], [7, -2], [2, 7], [2, -7], [-2, 7], [-2, -7], [-7, 2], [-7, -2]].concat(CIRCLES[52]);
CIRCLES[54] = CIRCLES[53];
CIRCLES[55] = CIRCLES[53];
CIRCLES[56] = CIRCLES[53];
CIRCLES[57] = CIRCLES[53];
CIRCLES[58] = [[7, 3], [7, -3], [3, 7], [3, -7], [-3, 7], [-3, -7], [-7, 3], [-7, -3]].concat(CIRCLES[53]);
CIRCLES[59] = CIRCLES[58];
CIRCLES[60] = CIRCLES[58];
CIRCLES[61] = [[6, 5], [6, -5], [5, 6], [5, -6], [-5, 6], [-5, -6], [-6, 5], [-6, -5]].concat(CIRCLES[58]);
CIRCLES[62] = CIRCLES[61];
CIRCLES[63] = CIRCLES[61];
CIRCLES[64] = [[8, 0], [0, 8], [0, -8], [-8, 0]].concat(CIRCLES[61]);
CIRCLES[65] = [[8, 1], [8, -1], [7, 4], [7, -4], [4, 7], [4, -7], [1, 8], [1, -8], [-1, 8], [-1, -8], [-4, 7], [-4, -7], [-7, 4], [-7, -4], [-8, 1], [-8, -1]].concat(CIRCLES[64]);
CIRCLES[66] = CIRCLES[65];
CIRCLES[67] = CIRCLES[65];
CIRCLES[68] = [[8, 2], [8, -2], [2, 8], [2, -8], [-2, 8], [-2, -8], [-8, 2], [-8, -2]].concat(CIRCLES[65]);
CIRCLES[69] = CIRCLES[68];
CIRCLES[70] = CIRCLES[68];
CIRCLES[71] = CIRCLES[68];
CIRCLES[72] = [[6, 6], [6, -6], [-6, 6], [-6, -6]].concat(CIRCLES[68]);
CIRCLES[73] = [[8, 3], [8, -3], [3, 8], [3, -8], [-3, 8], [-3, -8], [-8, 3], [-8, -3]].concat(CIRCLES[72]);
CIRCLES[74] = [[7, 5], [7, -5], [5, 7], [5, -7], [-5, 7], [-5, -7], [-7, 5], [-7, -5]].concat(CIRCLES[73]);
CIRCLES[75] = CIRCLES[74];
CIRCLES[76] = CIRCLES[74];
CIRCLES[77] = CIRCLES[74];
CIRCLES[78] = CIRCLES[74];
CIRCLES[79] = CIRCLES[74];
CIRCLES[80] = [[8, 4], [8, -4], [4, 8], [4, -8], [-4, 8], [-4, -8], [-8, 4], [-8, -4]].concat(CIRCLES[74]);
CIRCLES[81] = [[9, 0], [0, 9], [0, -9], [-9, 0]].concat(CIRCLES[80]);
CIRCLES[82] = [[9, 1], [9, -1], [1, 9], [1, -9], [-1, 9], [-1, -9], [-9, 1], [-9, -1]].concat(CIRCLES[81]);
CIRCLES[83] = CIRCLES[82];
CIRCLES[84] = CIRCLES[82];
CIRCLES[85] = [[9, 2], [9, -2], [7, 6], [7, -6], [6, 7], [6, -7], [2, 9], [2, -9], [-2, 9], [-2, -9], [-6, 7], [-6, -7], [-7, 6], [-7, -6], [-9, 2], [-9, -2]].concat(CIRCLES[82]);
CIRCLES[86] = CIRCLES[85];
CIRCLES[87] = CIRCLES[85];
CIRCLES[88] = CIRCLES[85];
CIRCLES[89] = [[8, 5], [8, -5], [5, 8], [5, -8], [-5, 8], [-5, -8], [-8, 5], [-8, -5]].concat(CIRCLES[85]);
CIRCLES[90] = [[9, 3], [9, -3], [3, 9], [3, -9], [-3, 9], [-3, -9], [-9, 3], [-9, -3]].concat(CIRCLES[89]);
CIRCLES[91] = CIRCLES[90];
CIRCLES[92] = CIRCLES[90];
CIRCLES[93] = CIRCLES[90];
CIRCLES[94] = CIRCLES[90];
CIRCLES[95] = CIRCLES[90];
CIRCLES[96] = CIRCLES[90];
CIRCLES[97] = [[9, 4], [9, -4], [4, 9], [4, -9], [-4, 9], [-4, -9], [-9, 4], [-9, -4]].concat(CIRCLES[90]);
CIRCLES[98] = [[7, 7], [7, -7], [-7, 7], [-7, -7]].concat(CIRCLES[97]);
CIRCLES[99] = CIRCLES[98];
CIRCLES[100] = [[10, 0], [8, 6], [8, -6], [6, 8], [6, -8], [0, 10], [0, -10], [-6, 8], [-6, -8], [-8, 6], [-8, -6], [-10, 0]].concat(CIRCLES[98]);

/* EFFICIENT CIRCLES CREATION SCRIPT

lastChange = 0;
for r in range(1, 101):
  a = []
  for i in range(-r, r+1):
    for j in range(-r, r+1):
      if [i,j] != [0,0]:
        if (i*i) + (j*j) == r:
          a.append([i, j])
  a.sort(key=lambda x: x[0]**2 + x[1]**2)
  a.reverse()

  if r == 1:
    print("CIRCLES[{}] = {};".format(r, a))
  elif a:
    print("CIRCLES[{}] = {}.concat(CIRCLES[{}]);".format(r, a, lastChange))
  else:
    print("CIRCLES[{}] = CIRCLES[{}];".format(r, lastChange))

  if a:
    lastChange = r

*/

// responsible for all signalling

const MASK16 = 0b1110110101011100;

const COMM8 = {
    ENEMY_DEAD: 10,
    ENEMY_CASTLE_DEAD: 11,

    NOT_AGGRO: 12,
    AGGRO: 13,
    ADDED_LATTICE: 14,
    REMOVED_LATTICE: 15,
    SENT_HORDE: 16,

    NEW_PILGRIM: 17,
    IM_ALIVE: 18,
    HINDERED: 19,

    // message type declarations
    X_HEADER: 0b10<<6,
    Y_HEADER: 0b11<<6,

    // check header:
    type: function(s) { return s&(0b11<<6); },

    // encode and decodes:
    ENCODE_X: function(x) {return (0b10<<6) + x; },
    ENCODE_Y: function(y) {return (0b11<<6) + y; },

    DECODE_X: function (s) { return s&63; },
    DECODE_Y: function (s) { return s&63; },

};

const COMM16 = {
    // message type declarations:
    BASELOC_HEADER: 0b1000<<12,
    ENEMYSIGHTING_HEADER: 0b1001<<12,
    HORDE_HEADER: 0b1010<<12,
    LATTICE_HEADER: 0b1011<<12,
    SCOUT_HEADER: 0b1100<<12,
    ENEMYDEAD_HEADER: 0b1101<<12,

    // check header:
    type: function(s) { return s === -1 ? 0 : (s^MASK16) & (0b1111<<12); },

    // encode and decodes:
    ENCODE_BASELOC: function(x, y) { return ((0b1000<<12) + (y<<6) + x) ^ MASK16; }, // new base location for our units
    ENCODE_ENEMYSIGHTING: function(x, y) { return ((0b1001<<12) + (y<<6) + x) ^ MASK16; }, // enemy sighted, that tells attack units what to do to better defend.
    ENCODE_HORDE: function(x, y) { return ((0b1010<<12) + (y<<6) + x) ^ MASK16; }, // this tells our units to go into rush mode, and attack an HORDE;
    ENCODE_LATTICE: function(region) { return ((0b1011<<12) + region) ^ MASK16; }, // this tells our units to lattice between a theta 1 and 2. If both are set to 0, then generic lattice,
    ENCODE_SCOUT: function(x, y) { return ((0b1100<<12) + (y<<6) + x) ^ MASK16; }, // tells pilgrims to act as scouts and provides an enemy location
    ENCODE_ENEMYDEAD: function(x, y) { return ((0b1101<<12) + (y<<6) + x) ^ MASK16; }, // this is signalled whenever an enemy is killed


    DECODE_BASELOC: function(s) { return [(s^MASK16)&63,((s^MASK16)&4032)>>6]; },
    DECODE_ENEMYSIGHTING: function(s) { return [(s^MASK16)&63,((s^MASK16)&4032)>>6]; },
    DECODE_HORDE: function(s) { return [(s^MASK16)&63,((s^MASK16)&4032)>>6]; },
    DECODE_LATTICE: function(s) { return (s^MASK16)&4095; },
    DECODE_SCOUT: function(s) { return [(s^MASK16)&63,((s^MASK16)&4032)>>6]; },
    DECODE_ENEMYDEAD: function(s) { return [(s^MASK16)&63,((s^MASK16)&4032)>>6]; },
};

function is_passable(self, x, y){
  return (self.me.x == x && self.me.y == y) || self.getVisibleRobotMap()[y][x] == 0
}
function dist(a, b) {
  return ((a[0]-b[0])**2) + ((a[1]-b[1])**2) // return the r^2 distance
}

function is_valid(x, y, dim) {
  // return whether the x,y point is within the map range
  return (x >=0 && x < dim && y >= 0 && y < dim);
}

function getNearbyRobots(self, p, r_squared) {
  // returns the ids of all the robots within the range r_squared
  let ret = [];
  const vis_map = self.getVisibleRobotMap();
  let x = p[0], y = p[1];

  for (const dir of CIRCLES[r_squared]) {
    if (is_valid(x + dir[0], y + dir[1], self.map.length)) {
      if (vis_map[y + dir[1]][x + dir[0]] > 0) {
        ret.push(vis_map[y + dir[1]][x + dir[0]]);
      }
    }
  }

  return ret;
}

function getClearLocations(self, r_squared) {
  // returns the locations with no obstructions or robots:
  let ret = [];
  const vis_map = self.getVisibleRobotMap();

  for (const dir of CIRCLES[r_squared]) {
    if (self.map[self.me.y + dir[1]] && self.map[self.me.y + dir[1]][self.me.x + dir[0]]) { // valid + passable
      if (vis_map[self.me.y + dir[1]][self.me.x + dir[0]] < 1) {
        ret.push([self.me.x + dir[0], self.me.y + dir[1]]);
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


function getAttackOrder(self) {
  // returns robot objects, in the order you should attack them.

  const my_loc = [self.me.x, self.me.y];


  let max_radius = null;
  let min_radius = null;

  if (self.me.unit == SPECS.CHURCH) {
    max_radius = SPECS.UNITS[self.me.unit].VISION_RADIUS;
    min_radius = 1;
  } else {
    max_radius = SPECS.UNITS[self.me.unit].ATTACK_RADIUS[1];
    min_radius = SPECS.UNITS[self.me.unit].ATTACK_RADIUS[0];
  }

  let units = self.getVisibleRobots().filter(function(r) {
    if (self.isVisible(r) && r.team !== self.me.team) {
      let d = dist(my_loc, [r.x, r.y]);
      if (d <= max_radius && d >= min_radius) {
        return true;
      }
    }
    return false;
  });

  // sort them:
  units.sort(function (a, b) {
    if (unitRank(a) != unitRank(b))
      return unitRank(a) - unitRank(b); // high priority first
    return dist(my_loc, [a.x, a.y]) - dist(my_loc, [b.x, b.y]); // closer ones first
  });

  return units;
}

function canAfford(unit, self) {
  return (self.fuel >= SPECS.UNITS[unit].CONSTRUCTION_FUEL &&
          self.karbonite >= SPECS.UNITS[unit].CONSTRUCTION_KARBONITE);
}

function isHorizontalSymmetry(pass_map, fuel_map, karb_map) {
  let N = pass_map.length;
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < Math.floor(N/2); j++) {
      if (pass_map[j][i] != pass_map[N - j - 1][i] ||
          fuel_map[j][i] != fuel_map[N - j - 1][i] ||
          karb_map[j][i] != karb_map[N - j - 1][i]) {
        return false;
      }
    }
  }
  return true;
}

function pathTo(node) {
  var curr = node;
  var path = [];
  while (curr.parent) {
    path.push(curr);
    curr = curr.parent;
  }
  return path;
}

function getHeap() {
  return new BinaryHeap(function(node) {
    return node.f;
  });
}

function heuristic(pos0, pos1) {
  var D = 1;
  var D2 = Math.sqrt(2);
  var d1 = Math.abs(pos1.x - pos0.x);
  var d2 = Math.abs(pos1.y - pos0.y);
  return (D * (d1 + d2)) + ((D2 - (2 * D)) * Math.min(d1, d2));
}

function BinaryHeap(scoreFunction) {
  this.content = [];
  this.scoreFunction = scoreFunction;
}

BinaryHeap.prototype = {
  push: function(element) {
    this.content.push(element);
    this.sinkDown(this.content.length - 1);
  },
  pop: function() {
    var result = this.content[0];
    var end = this.content.pop();
    if (this.content.length > 0) {
      this.content[0] = end;
      this.bubbleUp(0);
    }
    return result;
  },
  remove: function(node) {
    var i = this.content.indexOf(node);
    var end = this.content.pop();
    if (i !== this.content.length - 1) {
      this.content[i] = end;
      if (this.scoreFunction(end) < this.scoreFunction(node)) {
        this.sinkDown(i);
      } else {
        this.bubbleUp(i);
      }
    }
  },
  size: function() {
    return this.content.length;
  },
  rescoreElement: function(node) {
    this.sinkDown(this.content.indexOf(node));
  },
  sinkDown: function(n) {
    var element = this.content[n];
    while (n > 0) {
      var parentN = ((n + 1) >> 1) - 1;
      var parent = this.content[parentN];
      if (this.scoreFunction(element) < this.scoreFunction(parent)) {
        this.content[parentN] = element;
        this.content[n] = parent;
        n = parentN;
      }
      else {
        break;
      }
    }
  },
  bubbleUp: function(n) {
    var length = this.content.length;
    var element = this.content[n];
    var elemScore = this.scoreFunction(element);
    while (true) {
      var child2N = (n + 1) << 1;
      var child1N = child2N - 1;
      var swap = null;
      var child1Score;
      if (child1N < length) {
        var child1 = this.content[child1N];
        child1Score = this.scoreFunction(child1);
        if (child1Score < elemScore) {
          swap = child1N;
        }
      }
      if (child2N < length) {
        var child2 = this.content[child2N];
        var child2Score = this.scoreFunction(child2);
        if (child2Score < (swap === null ? elemScore : child1Score)) {
          swap = child2N;
        }
      }
      if (swap !== null) {
        this.content[n] = this.content[swap];
        this.content[swap] = element;
        n = swap;
      }
      else {
        break;
      }
    }
  }
};

function GridNode(x, y, isWall) {
  this.x = x;
  this.y = y;
  this.isWall = isWall;
}

GridNode.prototype.getCost = function(nbr) {
  let dx = Math.abs(this.x - nbr.x);
  let dy = Math.abs(this.y - nbr.y);
  if (dx == 2 && dy == 0) {
    return 2;
  } else if (dx == 1 && dy == 0) {
    return 1;
  } else if (dx == 1 && dy == 1) {
    return 1.41421;
  } else if (dx == 0 && dy == 1) {
    return 1;
  } else if (dx == 0 && dy == 2) {
    return 2;
  } else {
    return Math.sqrt((dx*dx) + (dy*dy));
  }
};

function Graph(pass_map, vis_map, speed) {
  this.nodes = [];
  this.grid = [];
  this.speed = speed;
  for (var y = 0; y < pass_map.length; y++) {
    this.grid[y] = [];
    for (var x = 0; x < pass_map.length; x++) {
      let isWall = !pass_map[y][x] || vis_map[y][x] > 0;
      var node = new GridNode(x, y, isWall);
      this.grid[y][x] = node;
      this.nodes.push(node);
    }
  }
  this.dirtyNodes = [];
  for (var i = 0; i < this.nodes.length; i++) {
    this.nodes[i].f = 0;
    this.nodes[i].g = 0;
    this.nodes[i].h = 0;
    this.nodes[i].visited = false;
    this.nodes[i].closed = false;
    this.nodes[i].parent = null;
  }
}

Graph.prototype.markDirty = function(node) {
  this.dirtyNodes.push(node);
};

Graph.prototype.neighbors = function(node) {
  var ret = [];
  for (const dir of CIRCLES[this.speed]) {
    if (this.grid[node.y + dir[1]] &&
        this.grid[node.y + dir[1]][node.x + dir[0]]) {
        ret.push(this.grid[node.y + dir[1]][node.x + dir[0]]);
    }
  }
  return ret;
};

function move_towards(self, a, b, adjacent=false) {
  // given getPassableLocations(), getVisibleRobotMap(), [start_x, start_y], [end_x, end_y], 
  // minimum_radius (1 for PREACHER), maximum_radius (16 for PREACHER)
  // This function will run A*, and just try to position you so that you are within attack range of
  // The enemy. It will NOT try to bring you exactly to the enemy
  // This is the function you use if you want to A* towards an enemy (so all the attack behavior)


  const pass_map = self.map;
  const vis_map = self.getVisibleRobotMap();
  const speed = SPECS.UNITS[self.me.unit].SPEED;
  let attack_radius_min = null;
  let attack_radius_max = null;

  if (self.me.unit == SPECS.PILGRIM || adjacent) {
    attack_radius_max = 2;
    attack_radius_min = 1;
  } else {
    attack_radius_min = SPECS.UNITS[self.me.unit].ATTACK_RADIUS[0];
    attack_radius_max = SPECS.UNITS[self.me.unit].ATTACK_RADIUS[1];
  }


  var graph = new Graph(pass_map, vis_map, speed);
  var openHeap = getHeap();

  var start = graph.grid[a[1]][a[0]];
  var end = graph.grid[b[1]][b[0]];


  start.h = heuristic(start, end);
  graph.markDirty(start);
  openHeap.push(start);

  while (openHeap.size() > 0) {
    var currentNode = openHeap.pop();

    var dist$$1 = (currentNode.x-end.x)**2 + (currentNode.y-end.y)**2;

    if (dist$$1 >= attack_radius_min && dist$$1 <= attack_radius_max) {
      let path = pathTo(currentNode);
      if (path.length > 0) {
        return path[path.length - 1]; // the first step along the way
      } else {
        return null; // you were already at the goal node
      }
    }

    currentNode.closed = true;
    var neighbors = graph.neighbors(currentNode);

    for (var i = 0; i < neighbors.length; i++) {
      var neighbor = neighbors[i];
      if (neighbor.closed || neighbor.isWall) { continue; }

      var gScore = currentNode.g + neighbor.getCost(currentNode);
      var beenVisited = neighbor.visited;

      if (!beenVisited || gScore < neighbor.g) {
        neighbor.visited = true;
        neighbor.parent = currentNode;
        neighbor.h = neighbor.h || heuristic(neighbor, end);
        neighbor.g = gScore;
        neighbor.f = neighbor.g + neighbor.h;
        graph.markDirty(neighbor);

        if (!beenVisited) {
          openHeap.push(neighbor);
        } else {
          openHeap.rescoreElement(neighbor);
        }
      }
    }
  }
  return null; // no path found.
}


function move_to(self, a, b) {
  // given getPassableLocations(), getVisibleRobotMap(), [start_x, start_y], [end_x, end_y]
  // runs a standard A*. ~3ms if path exists, ~20-30ms if path does not exist.
  // if no path exists, it'll return null;
  // If a path exists, it'll return a single point, the ABSOLUTE coordinates of the move

  // If we can see the end point, and there's someone else on it, return null:
  const pass_map = self.map;
  const vis_map = self.getVisibleRobotMap();
  const speed = SPECS.UNITS[self.me.unit].SPEED;

  if (vis_map[b[1]][b[0]] > 0) {
    return null;
  }

  var graph = new Graph(pass_map, vis_map, speed);
  var openHeap = getHeap();

  var start = graph.grid[a[1]][a[0]];
  var end = graph.grid[b[1]][b[0]];

  start.h = heuristic(start, end);
  graph.markDirty(start);
  openHeap.push(start);


  while (openHeap.size() > 0) {
    var currentNode = openHeap.pop();

    if (currentNode.x == end.x && currentNode.y == end.y) {
      let path = pathTo(currentNode);
      if (path.length > 0) {
        return path[path.length - 1]; // the first step along the way
      } else {
        return null; // you were already at the goal node
      }
    }

    currentNode.closed = true;
    var neighbors = graph.neighbors(currentNode);

    for (var i = 0; i < neighbors.length; i++) {
      var neighbor = neighbors[i];
      if (neighbor.closed || neighbor.isWall) { continue; }

      var gScore = currentNode.g + neighbor.getCost(currentNode);
      var beenVisited = neighbor.visited;

      if (!beenVisited || gScore < neighbor.g) {
        neighbor.visited = true;
        neighbor.parent = currentNode;
        neighbor.h = neighbor.h || heuristic(neighbor, end);
        neighbor.g = gScore;
        neighbor.f = neighbor.g + neighbor.h;
        graph.markDirty(neighbor);


        if (!beenVisited) {
          openHeap.push(neighbor);
        } else {
          openHeap.rescoreElement(neighbor);
        }
      }
    }
  }
  return null; // no path found.
}

function move_away(self, enemies) {
  let threat_points = new Set();

  let p, d;
  for (let enemy of enemies) {
    threat_points.add((enemy.y<<6) + enemy.x);
    let max_radius = enemy.unit == SPECS.PREACHER ? 50 : enemy.unit == SPECS.CASTLE ? 64 : SPECS.UNITS[enemy.unit].VISION_RADIUS;
    for (let dir of CIRCLES[max_radius]){
      p = [enemy.x + dir[0], enemy.y + dir[1]];
      d = dist(p, [enemy.x, enemy.y]);
      if (d >= SPECS.UNITS[enemy.unit].ATTACK_RADIUS[0]) { // prophets have a min_radius too.
        if (is_valid(p[0], p[1], self.map.length)){
          if (self.map[p[1]][p[0]]){
            threat_points.add((p[1]<<6) + p[0]);
          }
        }
      }
    }
  }

  if (!threat_points.has((self.me.y<<6) + self.me.x))
    return null;


  let max = [0, null];
  let max_safe = [0, null];
  for (const dir of CIRCLES[SPECS.UNITS[self.me.unit].SPEED]){
    let point = [self.me.x + dir[0], self.me.y + dir[1]];
    if (!is_valid(point[0], point[1], self.map.length) || !self.map[point[1]][point[0]] || self.getVisibleRobotMap()[point[1]][point[0]] != 0){
      continue;
    }
    let sum = 0;
    if (!threat_points.has((point[1]<<6) + point[0])) {
      for (let enemy of enemies)
        sum += dist([enemy.x, enemy.y], point);
      if (sum > max_safe[0])
        max_safe = [sum, dir];
    }
    else {
      for (let enemy of enemies)
        sum += dist([enemy.x, enemy.y], point);
      if (sum > max[0])
        max = [sum, dir];
    }
  }

  if (max_safe[1] !== null)
    return max_safe[1];
  else
    return max[1];
}

function num_moves(pass_map, vis_map, speed, a, b) {
  if (vis_map[b[1]][b[0]] > 0) {
    return null;
  }

  var graph = new Graph(pass_map, vis_map, speed);
  var openHeap = getHeap();

  var start = graph.grid[a[1]][a[0]];
  var end = graph.grid[b[1]][b[0]];

  start.h = heuristic(start, end);
  graph.markDirty(start);
  openHeap.push(start);


  while (openHeap.size() > 0) {
    var currentNode = openHeap.pop();

    if (currentNode.x == end.x && currentNode.y == end.y) {
      return pathTo(currentNode).length;
    }

    currentNode.closed = true;
    var neighbors = graph.neighbors(currentNode);

    for (var i = 0; i < neighbors.length; i++) {
      var neighbor = neighbors[i];
      if (neighbor.closed || neighbor.isWall) { continue; }

      var gScore = currentNode.g + neighbor.getCost(currentNode);
      var beenVisited = neighbor.visited;

      if (!beenVisited || gScore < neighbor.g) {
        neighbor.visited = true;
        neighbor.parent = currentNode;
        neighbor.h = neighbor.h || heuristic(neighbor, end);
        neighbor.g = gScore;
        neighbor.f = neighbor.g + neighbor.h;
        graph.markDirty(neighbor);

        if (!beenVisited) {
          openHeap.push(neighbor);
        } else {
          openHeap.rescoreElement(neighbor);
        }
      }
    }
  }
  return null; // no path found.
}

function local_cluster_info(self) {
  let minicurrent, minix, miniy;

  let count = 0;
  let maxr = 0;
  let visited = new Set();
  let miniqueue = [(self.me.y<<6)|self.me.x];

  while (miniqueue.length > 0) {
    minicurrent = miniqueue.shift();
    minix = minicurrent&63;
    miniy = (minicurrent&4032)>>6;

    if (visited.has(minicurrent)){ continue; }

    if (self.fuel_map[miniy][minix] || self.karbonite_map[miniy][minix]) {
      maxr = Math.max(maxr, dist([self.me.x, self.me.y], [minix, miniy]));
      count++;
    } else if (miniy !== self.me.y || minix !== self.me.x) {
      continue; // don't continue exploring a non-fuel or karb. spot
    }

    visited.add(minicurrent);
    for (const dir of CIRCLES[10]) {
      if (is_valid(minix+dir[0], miniy+dir[1], self.map.length)) {
        miniqueue.push(((miniy+dir[1])<<6)|(minix+dir[0]));
      }
    }
  }

  return [count, maxr];
}

function pick_church_location(new_f, new_k, map, fuel_map, karb_map, self) {
  // now that you've found the cluster, find the best spot to put a church:
  let churchx = 0;
  let churchy = 0;
  for (const spot of new_f) {
    churchx += (spot&63);
    churchy += ((spot&4032)>>6);
  }
  for (const spot of new_k) {
    churchx += (spot&63);
    churchy += ((spot&4032)>>6);
  }

  churchx = Math.floor(churchx / (new_f.length + new_k.length));
  churchy = Math.floor(churchy / (new_f.length + new_k.length));

  // consider the point at the center.
  let best_point = [churchx, churchy];
  let best_score = 0;
  if (!fuel_map[churchy][churchx] && 
      !karb_map[churchy][churchx] &&
      map[churchy][churchx]) {
    for (const spot of new_f)
      best_score += dist([churchx, churchy], [spot&63, (spot&4032)>>6]);
    for (const spot of new_k)
      best_score += dist([churchx, churchy], [spot&63, (spot&4032)>>6]);
  } else {
    best_score = 1<<12; // infinity
  }

  // now, consider other points
  for (const dir of CIRCLES[16]) {
    if (is_valid(churchx+dir[0], churchy+dir[1], map.length) && 
        !fuel_map[churchy+dir[1]][churchx+dir[0]] &&
        !karb_map[churchy+dir[1]][churchx+dir[0]] &&
        map[churchy+dir[1]][churchx+dir[0]]) {
      let score = 0;
      for (const spot of new_f)
        score += dist([churchx+dir[0], churchy+dir[1]], [spot&63, (spot&4032)>>6]);
      for (const spot of new_k)
        score += dist([churchx+dir[0], churchy+dir[1]], [spot&63, (spot&4032)>>6]);
      
      if (score < best_score) {
        best_score = score;
        best_point = [churchx+dir[0], churchy+dir[1]];
      }
    }
  }

  return best_point
}

function find_resource_clusters(self, map, fuel_map, karb_map) {
  // returns [{x: [], y: [], fuel: [], karb: []}, ...] where (x,y) is ideal church location
  // and fuel and karb return the counts of fuel and karbonite.

  let clusters = [];

  let visited = new Set();
  let queue = [0]; // start at the top left
  let current, x, y, new_k, new_f, miniqueue, minicurrent, minix, miniy, churchx, churchy;

  while (queue.length > 0) {
    current = queue.shift();
    x = current&63;
    y = (current&4032)>>6;

    if (visited.has(current)){ continue; } // seen before.

    if (fuel_map[y][x] || karb_map[y][x]) { // bfs to find the entire cluster
      new_k = [];
      new_f = [];
      miniqueue = [current];
      while (miniqueue.length > 0) {
        minicurrent = miniqueue.shift();
        minix = minicurrent&63;
        miniy = (minicurrent&4032)>>6;

        if (visited.has(minicurrent)){ continue; }

        if (fuel_map[miniy][minix]) {
          new_f.push(minicurrent);
        } else if (karb_map[miniy][minix]){
          new_k.push(minicurrent);
        } else {
          continue; // don't continue exploring a non-fuel or karb. spot
        }

        visited.add(minicurrent);
        for (const dir of CIRCLES[10]) {
          if (is_valid(minix+dir[0], miniy+dir[1], map.length)) {
            miniqueue.push(((miniy+dir[1])<<6)|(minix+dir[0]));
          }
        }
      }
      [churchx, churchy] = pick_church_location(new_f, new_k, map, fuel_map, karb_map, self);
      clusters.push({x:churchx, y:churchy, fuel:new_f.length, karbonite:new_k.length});
    }

    visited.add(current); // mark as visited

    for (const dir of CIRCLES[1] ) {
      if (is_valid(x+dir[0], y+dir[1], map.length)) {
        queue.push(((y+dir[1])<<6)|(x+dir[0]));
      }
    }
  }

  return clusters;
}

function get_best_cluster_castle(self, x, y, castle_locations) {
  let best_dist = null;
  let best_castle = null;
  let empty_vis_map = [...Array(self.map.length)].map(e => Array(self.map.length).fill(-1));

  for (const c of castle_locations) {
    let dist$$1 = num_moves(self.map, empty_vis_map, SPECS.UNITS[SPECS.PILGRIM].SPEED, [x,y], c);
    if (dist$$1 !== null) {
      if (best_dist === null || dist$$1 < best_dist) {
        best_dist = dist$$1;
        best_castle = c;
      }
    }
  }

  return best_castle;
}

function determine_cluster_plan(clusters_in, attack_plan, horiSym, maplen, self) {
  // get the mean location of all our castles:
  let mean_x = 0;
  let mean_y = 0;
  for (const ap of attack_plan){
    mean_x += ap.me[0];
    mean_y += ap.me[1];
  }
  mean_x = Math.floor(mean_x / attack_plan.length);
  mean_y = Math.floor(mean_y / attack_plan.length);

  // clusters at castles are not considered:
  let valid_clusters = clusters_in.filter(function (cl) {
    for (const ap of attack_plan) {
      if (dist([cl.x, cl.y], ap.me) <= 10 || dist([cl.x, cl.y], ap.enemy) <= 10)
        return false;
    }
    return true;
  });

  // first we need to figure out if there are any clusters that we should fight over, near the center:
  let clusters_on_our_side = valid_clusters.filter(function (cl) {
    if (horiSym && attack_plan[0].me[1] <= (Math.ceil(maplen / 2) + 1)) // top
      return cl.y <= (Math.ceil(maplen / 2) + 1);
    else if (horiSym && attack_plan[0].me[1] >= (Math.ceil(maplen / 2) - 1)) // bottom
      return cl.y >= (Math.ceil(maplen / 2) - 1);
    else if (!horiSym && attack_plan[0].me[0] <= (Math.ceil(maplen / 2) + 1)) // left
      return cl.x <= (Math.ceil(maplen / 2) + 1);
    else if (!horiSym && attack_plan[0].me[0] >= (Math.ceil(maplen / 2) - 1)) // right
      return cl.x >= (Math.ceil(maplen / 2) - 1);
  });

  // protect the clusters near the center (if any).
  for (let cl of clusters_on_our_side) {
    if ((horiSym && (Math.abs(cl.y - (maplen/2)) <= 6)) ||
        (!horiSym && (Math.abs(cl.x - (maplen/2)) <= 6))) { // cluster near center:
      cl.defend = true;
    } else {
      cl.defend = false;
    }
  }

  // sort the array:
  clusters_on_our_side.sort(function(a, b) {
    if (a.defend && !b.defend) {
      return 1; // the ones that have to be defended are priority (a has to be defended)
    } else if (!a.defend && b.defend) {
      return -1; // b has do be defended
    } else if (a.fuel + a.karbonite > b.fuel + b.karbonite) {
      return 1; // a comes first;
    } else if (a.fuel + a.karbonite < b.fuel + b.karbonite) {
      return -1; // b comes first;
    } else if (Math.abs(a.fuel - a.karbonite) < Math.abs(b.fuel - b.karbonite)){
      return 1; // a has a batter ratio
    } else if (Math.abs(a.fuel - a.karbonite) < Math.abs(b.fuel - b.karbonite)){
      return -1; // b has a better ratio
    } else {
      return dist([a.x, a.y], [mean_x, mean_y]) > dist([b.x, b.y], [mean_x, mean_y]) ? 1 : -1;
    }
  });

  // now we add on the enemy clusters:
  let enemy_clusters = valid_clusters.filter(function (cl) {
    if (horiSym && attack_plan[0].me[1] <= (Math.ceil(maplen / 2) + 1)) // top
      return cl.y > (Math.ceil(maplen / 2) + 1);
    else if (horiSym && attack_plan[0].me[1] >= (Math.ceil(maplen / 2) - 1)) // bottom
      return cl.y < (Math.ceil(maplen / 2) - 1);
    else if (!horiSym && attack_plan[0].me[0] <= (Math.ceil(maplen / 2) + 1)) // left
      return cl.x > (Math.ceil(maplen / 2) + 1);
    else if (!horiSym && attack_plan[0].me[0] >= (Math.ceil(maplen / 2) - 1)) // right
      return cl.x < (Math.ceil(maplen / 2) - 1);
  });

  // all enemy clusters will have to be defended.
  for (let cl of enemy_clusters)
    cl.defend = true;

  enemy_clusters.sort((a,b) => dist([a.x, a.y], [mean_x, mean_y]) - dist([b.x, b.y], [mean_x, mean_y])); // closest first.

  // then return the clusters:
  return enemy_clusters.concat(clusters_on_our_side);
}

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
};

const HORDE_RATIO = {
  prophet: 7/15,
  preacher: 1/15,
  crusader: 7/15
};
const HORDE_SIZE = 15;
const SEND_HORDE_FUEL_THRESHOLD = 4000; // after we have this much fuel, we let the horde go.

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
    let dist$$1 = num_moves(self.map, empty_vis_map, SPECS.UNITS[SPECS.PROPHET].SPEED, c_locs[i], e_locs[i]);
    timed_pairs.push([c_locs[i], e_locs[i], dist$$1]); 
  }

  timed_pairs.sort(function (a,b) { return a[2] - b[2] });

  let to_ret = [];
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
      else if (ap.cluster) {
        if (cluster_plan == null ||
            dist(ap.enemy, [self.me.x, self.me.y]) < dist(cluster_plan.enemy, [self.me.x, self.me.y]))
          cluster_plan = ap;
      }
    }
  return cluster_plan;
}

function getToBuild(lattices, self) {
  let numUnitsToBuild = Math.min(((self.fuel - LATTICE_BUILD_FUEL_THRESHOLD) / SPECS.UNITS[SPECS.PROPHET].CONSTRUCTION_FUEL),
                                 ((self.karbonite - LATTICE_BUILD_KARB_THRESHOLD) / SPECS.UNITS[SPECS.PROPHET].CONSTRUCTION_KARBONITE));
  // now, sort the lattices:
  let ordered_lattices = [];
  for (const ll in lattices)
    if (lattices[ll].built < lattices[ll].needed)
      ordered_lattices.push(lattices[ll]);

  ordered_lattices.sort(function(a,b) {
    return (a.built - a.needed) - (b.built - b.needed);
  });

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
  let ordered_lattices = [];
  for (const ll in lattices)
    ordered_lattices.push(lattices[ll]);

  ordered_lattices.sort(function(a,b) {
    return (a.built - a.needed) - (b.built - b.needed);
  });

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

class CastleManager {
  constructor(self) {
    self.log("CASTLE @ " + [self.me.x, self.me.y]);
    this.isHori = isHorizontalSymmetry(self.map, self.fuel_map, self.karbonite_map);

    this.castle_locations = [];
    this.enemy_castle_locations = [];
    this.partial_points = [];

    this.church_locations = [];

    this.all_lattices = {};

    this.horiSym = isHorizontalSymmetry(self.map, self.fuel_map, self.karbonite_map);

    this.castle_talk_queue = [COMM8.ENCODE_Y(self.me.y), COMM8.ENCODE_X(self.me.x)];
    this.build_signal_queue = [];

    this.resource_clusters = find_resource_clusters(self, self.map, self.fuel_map, self.karbonite_map);
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
          this.castle_locations.push([this.partial_points[r.id], COMM8.DECODE_Y(r.castle_talk)]);
          this.all_lattices[r.id] = {built:0, needed:10, aggro:false, loc:[this.partial_points[r.id], COMM8.DECODE_Y(r.castle_talk)]};
        } else {
          this.church_locations.push([this.partial_points[r.id], COMM8.DECODE_Y(r.castle_talk)]);
          this.all_lattices[r.id] = {built:0, needed:10, aggro:false, loc:[this.partial_points[r.id], COMM8.DECODE_Y(r.castle_talk)]};
          let obj = this;
          this.attack_plan = this.attack_plan.filter(function (ap) { // remove the church if you built there successfully.
            if (dist(ap.enemy, [obj.partial_points[r.id], COMM8.DECODE_Y(r.castle_talk)]) == 0) {
              obj.castle_talk_queue.unshift(COMM8.NOT_AGGRO);
              return false;
            }
            return true;
          });
        }
      } else if (r.castle_talk == COMM8.ADDED_LATTICE) {
        this.all_lattices[r.id].built++;
      } else if (r.castle_talk == COMM8.REMOVED_LATTICE) {
        this.all_lattices[r.id].built--;
      } else if (r.castle_talk == COMM8.SENT_HORDE) {
        this.all_lattices[r.id].built = 0;
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
          self.log("KILLED ENEMY @ " + COMM16.DECODE_ENEMYDEAD(r.signal));

          this.build_signal_queue.unshift([SPECS.PILGRIM, COMM16.ENCODE_BASELOC(...COMM16.DECODE_ENEMYDEAD(r.signal))]);

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
        self.log("CREATING AN ATTACK TARGET + PILGRIM @ " + [obj.pioneer_pilgrims[pid].x, obj.pioneer_pilgrims[pid].y]);
        obj.castle_talk_queue.unshift(COMM8.AGGRO);
        obj.attack_plan.unshift({me:[self.me.x, self.me.y], enemy:[obj.pioneer_pilgrims[pid].x, obj.pioneer_pilgrims[pid].y], lattice:false, cluster:true});
        return false;
      }
      return true; // nothing is wrong :)
    });

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
    let enemyRobots = {preacher:false, prophet:false, crusader:false};
    for (const r_id of getNearbyRobots(self, [self.me.x, self.me.y], SPECS.UNITS[SPECS.CASTLE].VISION_RADIUS)) {
      let r = self.getRobot(r_id);
      if (r.team == self.me.team) {
        if (r.unit == SPECS.CRUSADER)
          myRobots.crusader.push(r);
        else if (r.unit == SPECS.PREACHER)
          myRobots.preacher.push(r);
        else if (r.unit == SPECS.PROPHET)
          myRobots.prophet.push(r);
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
                  dist([self.me.x, self.me.y], building_locations[0]));
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
                  dist([self.me.x, self.me.y], building_locations[0]));
      self.castleTalk(COMM8.ADDED_LATTICE);
      return self.buildUnit(SPECS.CRUSADER, building_locations[0][0] - self.me.x, building_locations[0][1] - self.me.y);
    }

    // otherwise if we see an enemy preacher, build a prophet:
    if (enemyRobots.preacher !== false && myRobots.prophet.length < 3 && 
        canAfford(SPECS.PROPHET, self) && building_locations.length > 0) {
      self.signal(COMM16.ENCODE_ENEMYSIGHTING(enemyRobots.preacher.x, enemyRobots.preacher.y),
                  dist([self.me.x, self.me.y], building_locations[0]));
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
            let best_castle = get_best_cluster_castle(self, best_cluster.x, best_cluster.y, this.castle_locations);
            if (best_castle[0] == self.me.x && best_castle[1] == self.me.y) {
              self.log("SENDING PILGRIM TO CLUSTER: " + [best_cluster.x, best_cluster.y]);
              this.last_cluster = best_cluster;
              this.build_signal_queue.unshift([SPECS.PROPHET, COMM16.ENCODE_BASELOC(best_cluster.x, best_cluster.y)]);
              this.build_signal_queue.unshift([SPECS.PILGRIM, COMM16.ENCODE_BASELOC(best_cluster.x, best_cluster.y)]);
            }
          }
        } else {
          let best_cluster = this.cluster_plan.pop();
          let best_castle = get_best_cluster_castle(self, best_cluster.x, best_cluster.y, this.castle_locations);
          if (best_castle[0] == self.me.x && best_castle[1] == self.me.y) {
            self.log("SENDING PILGRIM TO CLUSTER: " + [best_cluster.x, best_cluster.y]);
            this.last_cluster = best_cluster;
            this.build_signal_queue.unshift([SPECS.PILGRIM, COMM16.ENCODE_BASELOC(best_cluster.x, best_cluster.y)]);
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
            let relevantPlan = getRelevantAttackPlan(self, this.attack_plan);
            if (relevantPlan.lattice) {
              if (this.lattice_dir === undefined) // determine which way the lattice should point.
                this.lattice_dir = calculate_lattice_dir(this.horiSym, this.attack_plan, self.map.length);
              this.castle_talk_queue.unshift(COMM8.ADDED_LATTICE); // aggro lattices are prophet only.
              this.build_signal_queue.unshift([SPECS.PROPHET, COMM16.ENCODE_LATTICE(this.lattice_dir)]);
            } else if (relevantPlan.cluster) {
              if (this.all_lattices[self.me.id].built < HORDE_SIZE) {
                self.log("BUILDING HORDE UNITS (" + this.all_lattices[self.me.id].built + "/" + HORDE_SIZE + ")");
                if (myRobots.prophet.length < totalLatticeCount * HORDE_RATIO.prophet)
                  latticeUnit = SPECS.PROPHET;
                else if (myRobots.preacher.length < totalLatticeCount * HORDE_RATIO.preacher)
                  latticeUnit = SPECS.PREACHER;
                else if (myRobots.crusader.length < totalLatticeCount * HORDE_RATIO.crusader)
                  latticeUnit = SPECS.CRUSADER;
                this.castle_talk_queue.unshift(COMM8.ADDED_LATTICE); // aggro lattices are prophet only.
                this.build_signal_queue.unshift([latticeUnit, COMM16.ENCODE_LATTICE(0)]);
              } else if (self.fuel > SEND_HORDE_FUEL_THRESHOLD){
                self.log("SENDING HORDE TO " + relevantPlan.enemy);
                this.build_signal_queue.unshift([SPECS.PILGRIM, COMM16.ENCODE_BASELOC(relevantPlan.enemy[0], relevantPlan.enemy[1])]);
                this.castle_talk_queue.unshift(COMM8.SENT_HORDE);
                return self.signal(COMM16.ENCODE_HORDE(relevantPlan.enemy[0], relevantPlan.enemy[1]), 64) // that way it doesnt build pilgrim till the next turn
              }
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
          this.castle_talk_queue.pop(); // just pretend we didn't add a troop - that achieves the same thing.
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
            let goal_pos = COMM16.DECODE_BASELOC(bs[1]);
            building_locations.sort(function (a, b) { return dist(a, goal_pos) - dist(b, goal_pos) });
          } else if (bs[0] === SPECS.PILGRIM && bs[1] === null) { // spawn local pilgrims on resource spots if possible
            building_locations.sort(function (a,b) {
              let a_good = self.fuel_map[a[1]][a[0]] || self.karbonite_map[a[1]][a[0]];
              let b_good = self.fuel_map[b[1]][b[0]] || self.karbonite_map[b[1]][b[0]];
              return a_good ? -1 : b_good ? 1 : 0;
            });
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


class ChurchManager {
  constructor(self) {
    self.log("CHURCH @ " + [self.me.x, self.me.y]);

    let cluster_info = local_cluster_info(self);
    this.resource_count = cluster_info[0];
    this.resource_radius = cluster_info[1];
    this.build_queue = [];
    this.castle_talk_queue = [COMM8.ENCODE_Y(self.me.y), COMM8.ENCODE_X(self.me.x)];

    this.lattice_built = 0;
    this.lattice_needed = 10;
    this.lattice_agro = false;

    let maxDefenderRadius = 0;
    for (const r_id of getNearbyRobots(self, [self.me.x, self.me.y], SPECS.UNITS[SPECS.CASTLE].VISION_RADIUS)) {
      let r = self.getRobot(r_id);
      if (r.team == self.me.team)
        if (r.unit == SPECS.CRUSADER || r.unit == SPECS.PREACHER || r.unit == SPECS.PROPHET) {
          let d = dist([self.me.x, self.me.y], [r.x, r.y]);
          if (d <= 25)
            maxDefenderRadius = Math.max(maxDefenderRadius, dist([self.me.x, self.me.y], [r.x, r.y]));
        }
    }
    self.signal(COMM16.ENCODE_LATTICE(0), maxDefenderRadius);
  }

  turn(step, self) {
    let building_locations = getClearLocations(self, 2);
    let myRobots = {preacher:[], prophet:[], crusader:[], pilgrim:[]};
    let enemyRobots = {preacher:false, prophet:false, crusader:false};
    let maxDefenderRadius = 0;

    for (const r_id of getNearbyRobots(self, [self.me.x, self.me.y], SPECS.UNITS[SPECS.CASTLE].VISION_RADIUS)) {
      let r = self.getRobot(r_id);
      if (r.team == self.me.team) {
        if (r.unit == SPECS.CRUSADER || r.unit == SPECS.PREACHER || r.unit == SPECS.PROPHET)
          maxDefenderRadius = Math.max(maxDefenderRadius, dist([self.me.x, self.me.y], [r.x, r.y]));

        if (r.unit == SPECS.CRUSADER)
          myRobots.crusader.push(r);
        else if (r.unit == SPECS.PREACHER)
          myRobots.preacher.push(r);
        else if (r.unit == SPECS.PROPHET)
          myRobots.prophet.push(r);
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
      self.signal(COMM16.ENCODE_ENEMYSIGHTING(enemies[0].x, enemies[0].y), maxDefenderRadius); // signal most pertinent enemy

    // if we see an enemy crusader, build a preacher if possible:
    if (enemyRobots.crusader !== false && myRobots.preacher.length < 2 && 
        canAfford(SPECS.PREACHER, self) && building_locations.length > 0) {
      self.signal(COMM16.ENCODE_ENEMYSIGHTING(enemyRobots.crusader.x, enemyRobots.crusader.y),
                  dist([self.me.x, self.me.y], building_locations[0]));
      this.lattice_built++;
      if (this.castle_talk_queue.length == 0) {
        self.castleTalk(COMM8.ADDED_LATTICE);
      } else {
        this.castle_talk_queue.unshift(COMM8.ADDED_LATTICE);
        self.castleTalk(this.castle_talk_queue.pop());
      }
      return self.buildUnit(SPECS.PREACHER, building_locations[0][0] - self.me.x, building_locations[0][1] - self.me.y);
    }

    // otherwise if we see an enemy prophet, build a crusader
    if (enemyRobots.prophet !== false && myRobots.crusader.length < 3 && 
        canAfford(SPECS.CRUSADER, self) && building_locations.length > 0) {
      self.signal(COMM16.ENCODE_ENEMYSIGHTING(enemyRobots.prophet.x, enemyRobots.prophet.y),
                  dist([self.me.x, self.me.y], building_locations[0]));
      this.lattice_built++;
      if (this.castle_talk_queue.length == 0) {
        self.castleTalk(COMM8.ADDED_LATTICE);
      } else {
        this.castle_talk_queue.unshift(COMM8.ADDED_LATTICE);
        self.castleTalk(this.castle_talk_queue.pop());
      }
      return self.buildUnit(SPECS.CRUSADER, building_locations[0][0] - self.me.x, building_locations[0][1] - self.me.y);
    }

    // otherwise if we see an enemy preacher, build a prophet:
    if (enemyRobots.preacher !== false && myRobots.prophet.length < 3 && 
        canAfford(SPECS.PROPHET, self) && building_locations.length > 0) {
      self.signal(COMM16.ENCODE_ENEMYSIGHTING(enemyRobots.preacher.x, enemyRobots.preacher.y),
                  dist([self.me.x, self.me.y], building_locations[0]));
      this.lattice_built++;
      if (this.castle_talk_queue.length == 0) {
        self.castleTalk(COMM8.ADDED_LATTICE);
      } else {
        this.castle_talk_queue.unshift(COMM8.ADDED_LATTICE);
        self.castleTalk(this.castle_talk_queue.pop());
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
      this.build_queue.unshift(SPECS.PILGRIM);

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
          this.castle_talk_queue.pop();
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

const CHURCH_BUILD_THRESHOLD = 500; // only build a church if we have >500 fuel.

function Point$1(x, y, parent = null){
  this.x = x;
  this.y = y;
  this.parent = parent;
}

function unclog(self, base_loc) {
  const pass_map = self.map, fuel_map = self.fuel_map, karbonite_map = self.karbonite_map;

  // Generate the visited set:
  let visited = new Set();
  let queue = [new Point$1(self.me.x, self.me.y)];

  while (queue.length > 0) {
    let current = queue.shift();

    if (visited.has((current.y<<6) + current.x)) { continue; } // seen before.
    visited.add((current.y<<6) + current.x); // mark as visited

    if (dist([current.x, current.y], base_loc) > 2 && !fuel_map[current.y][current.x] && !karbonite_map[current.y][current.x]) {
      if (current.parent !== null) {
        while (current.parent.parent !== null)
          current = current.parent;
        return [current.x - self.me.x, current.y - self.me.y];
      }
      else
        return null;
    }
    for (const dir of CIRCLES[SPECS.UNITS[self.me.unit].SPEED]){ // add nbrs
      if ((current.x + dir[0]) >= 0 && (current.x + dir[0]) < pass_map[0].length) {
        if ((current.y + dir[1]) >= 0 && (current.y + dir[1]) < pass_map.length) { // in map range
          if (pass_map[current.y + dir[1]][current.x + dir[0]]) { // can go here
            if (self.getVisibleRobotMap()[current.y + dir[1]][current.x + dir[0]] <= 0) {
              queue.push(new Point$1(current.x + dir[0], current.y + dir[1], current));
            }
          }
        }
      }
    }
  }
  return null;
}

function find_depots(self, church_loc) {
  var split_resource_map = {fuel: [], karbonite: []};
  var resource_map = [];
  const pass_map = self.map, fuel_map = self.fuel_map, karbonite_map = self.karbonite_map;


  // Generate the visited set:
  let visited = new Set();
  let queue = [[church_loc[0], church_loc[1]]];

  while (queue.length > 0) {
    let current = queue.shift();

    if (visited.has((current[1]<<6) + current[0])) { continue; } // seen before.
    visited.add((current[1]<<6) + current[0]); // mark as visited

    // check for fuel + karbonite:
    if (fuel_map[current[1]][current[0]]) {
      split_resource_map.fuel.push([current[0], current[1]]);
      resource_map.push([current[0], current[1]]);
    } else if (karbonite_map[current[1]][current[0]]) {
      split_resource_map.karbonite.push([current[0], current[1]]);
      resource_map.push([current[0], current[1]]);
    }
    else if (current[0] != church_loc[0] || current[1] != church_loc[1])
      continue;
    
    for (const dir of CIRCLES[10]){ // add nbrs
      if ((current[0] + dir[0]) >= 0 && (current[0] + dir[0]) < pass_map[0].length) {
        if ((current[1] + dir[1]) >= 0 && (current[1] + dir[1]) < pass_map.length) { // in map range
          if (pass_map[current[1] + dir[1]][current[0] + dir[0]]) { // can go here
            queue.push([current[0] + dir[0], current[1] + dir[1]]);
          }
        }
      }
    }
  }
  return [split_resource_map, resource_map];
}

function find_mine(self, all_resources, priority = null, strict = false) {
  let resources = null;

  if (priority === null){
    strict = true;
    resources = all_resources[1];
  }
  else if (priority.toLowerCase().includes('k')) {
    resources = all_resources[0].karbonite;
  }
  else if (priority.toLowerCase().includes('f')) {
    resources = all_resources[0].fuel;
  }
  else
    self.log("SOMETHING WONG");

  let closest_visible = [1<<14, null];
  let closest_invisible = [1<<14, null];

  for (const depot of resources){
    let d = dist([self.me.x, self.me.y], depot);
    // let d = num_moves(self.map, self.getVisibleRobotMap(), SPECS.UNITS[self.me.unit].SPEED, [self.me.x, self.me.y], depot);
    if (d == 0)
      return depot;
    else if (self.getVisibleRobotMap()[depot[1]][depot[0]] == 0){
      if (d < closest_visible[0]){
        closest_visible = [d, depot];
      }
    }
    else if (self.getVisibleRobotMap()[depot[1]][depot[0]] == -1) {
      if (d < closest_invisible[0]){
        closest_invisible = [d, depot];
      }
    }
  }

  if (closest_visible[1] !== null)
    return closest_visible[1];
  if (closest_invisible[1] !== null)
    return closest_invisible[1];
  if (strict)
    return null;
  else {
    if (priority.toLowerCase().includes('k')) {
      resources = all_resources[0].fuel;
    }
    else if (priority.toLowerCase().includes('f')) {
      resources = all_resources[0].karbonite;
    }
    closest_visible = [1<<14, null];
    closest_invisible = [1<<14, null];

    for (const depot of resources){
      let d = dist([self.me.x, self.me.y], depot);
      // let d = num_moves(self.map, self.getVisibleRobotMap(), SPECS.UNITS[self.me.unit].SPEED, [self.me.x, self.me.y], depot);
      if (d == 0)
        return depot;
      else if (self.getVisibleRobotMap()[depot[1]][depot[0]] == 0) {
        if (d < closest_visible[0]){
          closest_visible = [d, depot];
        }
      }
      else if (self.getVisibleRobotMap()[depot[1]][depot[0]] == -1) {
        if (d < closest_invisible[0]){
          closest_invisible = [d, depot];
        }
      }
    }
    if (closest_visible[1] !== null)
      return closest_visible[1];
    if (closest_invisible[1] !== null)
      return closest_invisible[1];
  }
  return null;
}

// pilgrim
class PilgrimManager {
  constructor(self) {
    // this is the init function
    this.stage = CONSTANTS.MINE;
    this.base_loc = null;
    this.castle_loc = null; // the castle that spawned it.
    this.church_loc = null;
    this.mine_loc = null;
    this.resources = null;
    this.second_mine = null;
    this.mining = false;
    this.strict_state = false;

    for (const r of self.getVisibleRobots()) {
      if (r.team === self.me.team){
        if (r.x !== null && dist([self.me.x, self.me.y], [r.x, r.y]) <= 2) {
          if (r.unit == SPECS.CASTLE) {
            this.castle_loc = [r.x, r.y];
          } else if (r.unit == SPECS.CHURCH){
            this.church_loc = [r.x, r.y];
          }
        }
      }
    }
    if (this.church_loc !== null){
      this.base_loc = this.church_loc;
      //this.castle_loc = this.church_loc;
      this.resources = find_depots(self, this.church_loc);
      this.mine_loc = find_mine(self, this.resources, choosePriority(self));
    }
    else
      this.base_loc = this.castle_loc;
  }

  turn(step, self) {
    let signalledNew = false;
    if (this.church_loc === null) {
      for (const r of self.getVisibleRobots()) {
        if (COMM16.type(r.signal) == COMM16.BASELOC_HEADER) {
          self.castleTalk(COMM8.NEW_PILGRIM);
          signalledNew = true;
          this.church_loc = COMM16.DECODE_BASELOC(r.signal);
          this.resources = find_depots(self, this.church_loc);
          this.mine_loc = find_mine(self, this.resources, choosePriority(self));
        }
      }
      if (this.church_loc === null && this.castle_loc !== null) {
        this.church_loc = this.castle_loc;
      }
    }

    if (this.mine_loc === null) {
      if (this.castle_loc !== null) {
        this.church_loc = this.castle_loc;
        this.base_loc = this.castle_loc;
      }
      this.resources = find_depots(self, this.church_loc);
      this.mine_loc = find_mine(self, this.resources, choosePriority(self));
    }

    if (!signalledNew)
      self.castleTalk(COMM8.IM_ALIVE); // default alive

    if (this.mine_loc === null) {
      if (self.me.karbonite == 0 && self.me.fuel == 0) {
        let move = unclog(self, this.base_loc);
        if (move !== null) {
          return self.move(...move);
        }
        else
          return null; // there's nothing to do.
      }
      else {
        self.stage = CONSTANTS.DEPOSIT;
      }
    }

    if (self.getVisibleRobotMap()[this.church_loc[1]][this.church_loc[0]] > 0){ // if you see a church where your church should be, it is built.
      let r = self.getRobot(self.getVisibleRobotMap()[this.church_loc[1]][this.church_loc[0]]);
      if (this.church_loc != this.base_loc && r.team !== null && r.team == self.me.team && r.unit == SPECS.CHURCH)
        this.base_loc = this.church_loc; // set new base location if a church is visible at church_loc
    }
    
    if (this.base_loc !== null && this.base_loc != this.church_loc) { //if there's a church that's closer to the castle that's not your own, make that new base location
      let r = nearbyChurch(self, this.church_loc, this.base_loc);
      if (r !== null && [r.x, r.y] != this.base_loc) {
        this.base_loc = [r.x, r.y];
      }
    }

    if (this.stage == CONSTANTS.DEPOSIT){
      if (self.me.karbonite == 0 && self.me.fuel == 0) {
        this.stage = CONSTANTS.MINE;
        this.mine_loc = find_mine(self, this.resources, choosePriority(self));
      }
    }

    if (this.stage == CONSTANTS.MINE) {
      if (self.karbonite >= SPECS.UNITS[SPECS.CHURCH].CONSTRUCTION_KARBONITE &&
          self.fuel >= CHURCH_BUILD_THRESHOLD && this.base_loc != this.church_loc) {
        this.mining = false;
        this.stage = CONSTANTS.BUILD;
      } else if ((self.me.karbonite >= SPECS.UNITS[SPECS.PILGRIM].KARBONITE_CAPACITY &&
                  self.me.fuel >= SPECS.UNITS[SPECS.PILGRIM].FUEL_CAPACITY)) {
        this.mining = false;
        this.stage = CONSTANTS.DEPOSIT;
      } else if (self.me.karbonite >= SPECS.UNITS[SPECS.PILGRIM].KARBONITE_CAPACITY && 
                  self.me.fuel < SPECS.UNITS[SPECS.PILGRIM].FUEL_CAPACITY) {
        /*if (this.second_mine !== null && self.getVisibleRobotMap()[this.second_mine[1]][this.second_mine[0]] > 0) {
          this.stage = CONSTANTS.DEPOSIT;
        }*/
        if (this.second_mine == null /*&& !self.fuel_map[self.me.y][self.me.x]*/){
          this.second_mine = find_mine(self, this.resources, 'fuel', true);
          if (this.second_mine !== null && !self.fuel_map[this.second_mine[1]][this.second_mine[0]]){
            this.second_mine = null;
            this.stage = CONSTANTS.DEPOSIT;
          }
          if (this.second_mine !== null && this.second_mine != this.mine_loc &&
              num_moves(self.map, self.getVisibleRobotMap(), SPECS.UNITS[self.me.unit].SPEED, [self.me.x, self.me.y], this.second_mine) <=
              num_moves(self.map, self.getVisibleRobotMap(), SPECS.UNITS[self.me.unit].SPEED, [self.me.x, self.me.y], this.base_loc)){
            this.stage = CONSTANTS.MINE;
            this.mining = false;
            this.mine_loc = this.second_mine;
          } else {
            this.stage = CONSTANTS.DEPOSIT;
          }
        }
      } else if (self.me.fuel >= SPECS.UNITS[SPECS.PILGRIM].FUEL_CAPACITY && 
                  self.me.karbonite < SPECS.UNITS[SPECS.PILGRIM].KARBONITE_CAPACITY){
        /*if (this.second_mine !== null && self.getVisibleRobotMap()[this.second_mine[1]][this.second_mine[0]] > 0) {
          this.stage = CONSTANTS.DEPOSIT;
        }*/
        if (this.second_mine == null /*&& !self.karbonite_map[self.me.y][self.me.x]*/){
          this.second_mine = find_mine(self, this.resources, 'karbonite', true);
          if (this.second_mine !== null && !self.karbonite_map[this.second_mine[1]][this.second_mine[0]]) {
            this.second_mine = null;
            this.stage = CONSTANTS.DEPOSIT;
          }
          if (this.second_mine !== null && this.second_mine != this.mine_loc &&
              num_moves(self.map, self.getVisibleRobotMap(), SPECS.UNITS[self.me.unit].SPEED, [self.me.x, self.me.y], this.second_mine) <=
              num_moves(self.map, self.getVisibleRobotMap(), SPECS.UNITS[self.me.unit].SPEED, [self.me.x, self.me.y], this.base_loc)){
            this.stage = CONSTANTS.MINE;
            this.mine_loc = this.second_mine;
          } else {
            this.stage = CONSTANTS.DEPOSIT;
          }
        }
      }
    }

    if (this.stage == CONSTANTS.BUILD) {
      if (self.karbonite < SPECS.UNITS[SPECS.CHURCH].CONSTRUCTION_KARBONITE ||
          self.fuel < CHURCH_BUILD_THRESHOLD && !this.strict_state) {
        this.stage = CONSTANTS.MINE; // can no longer afford church
        this.mine_loc = find_mine(self, this.resources, choosePriority(self));
      }
    }

    var closest_enemy = [1<<14, null]; // get our closest enemy, and the distance to our nearest ally.
    var enemies = [];
    var max_ally = 0;
    let distress = false;
    for (const r of self.getVisibleRobots()){
      if (!self.isVisible(r))
        continue;
      let d = dist([self.me.x, self.me.y], [r.x, r.y]);
      if (r.team !== null && r.team != self.me.team){
        if (d < closest_enemy[0])
          closest_enemy = [d, r];
        if (SPECS.UNITS[r.unit].ATTACK_DAMAGE !== null && SPECS.UNITS[r.unit].ATTACK_DAMAGE > 0)
          enemies.push(r);
      } 
      if (r.team !== null && r.team == self.me.team && SPECS.UNITS[r.unit].SPEED > 0 && 
                  SPECS.UNITS[r.unit].ATTACK_DAMAGE !== null && d > max_ally){
        if (d <= 25)
          distress = true;
        if (d > max_ally)
          max_ally = d;
      }
    }

    if (closest_enemy[1] !== null){
      if (distress)
        self.signal(COMM16.ENCODE_ENEMYSIGHTING(closest_enemy[1].x, closest_enemy[1].y), max_ally);
      if (enemies.length != 0){
        const move = move_away(self, enemies);
        if (move !== null){
          return self.move(...move);
        }
      }
    }

    if (this.stage == CONSTANTS.BUILD) {
      if (Math.abs(self.me.x - this.church_loc[0]) > 1 ||
          Math.abs(self.me.y - this.church_loc[1]) > 1) {
        let move_node = move_towards(self, [self.me.x, self.me.y], this.church_loc);
        if (move_node !== null) {
          if (isDangerous(self, [move_node.x, move_node.y])){
            self.castleTalk(COMM8.HINDERED);
            return null; // that move will make you vulnerable, do nothing.
          }
          return self.move(move_node.x - self.me.x, move_node.y - self.me.y);
        } else {
          return null;
        }
      } else if (self.getVisibleRobotMap()[this.church_loc[1]][this.church_loc[0]] > 0) {
        return null;
      } else {
        this.strict_state = false;
        this.base_loc = this.church_loc;
        //this.castle_loc = this.church_loc;
        this.stage = CONSTANTS.DEPOSIT;
        this.second_mine = null;
        return self.buildUnit(SPECS.CHURCH, this.base_loc[0]-self.me.x, this.base_loc[1]-self.me.y);
      }
    }

    if (this.stage == CONSTANTS.DEPOSIT) {
      let homesick = true;
      if (Math.abs(self.me.x - this.base_loc[0]) <= 1 &&
          Math.abs(self.me.y - this.base_loc[1]) <= 1) {
        homesick = false;
        this.stage = CONSTANTS.MINE;
        this.mine_loc = find_mine(self, this.resources, choosePriority(self));
        let r = self.getRobot(self.getVisibleRobotMap()[this.base_loc[1]][this.base_loc[0]]);
        if (r !== null && r.team == self.me.team && (r.unit == SPECS.CASTLE || r.unit == SPECS.CHURCH) && r.x == this.base_loc[0] && r.y == this.base_loc[1]) {
          this.second_mine = null;
          this.mining = false;
          return self.give(this.base_loc[0]-self.me.x, this.base_loc[1]-self.me.y, self.me.karbonite, self.me.fuel);
        } else {
          if (this.base_loc == this.church_loc){ // our base has disappeared :( go to castle
            this.strict_state = true;
            this.state = CONSTANTS.BUILD;
            this.base_loc = this.castle_loc;
            if (this.base_loc === null)
              return null;
          }
          homesick = true; 
        }
      } 
      if (homesick){
        let move_node = move_towards(self, [self.me.x, self.me.y], this.base_loc); // get adjacent
        if (move_node !== null) {
          if (isDangerous(self, [move_node.x, move_node.y])){
            return null; // that move will make you vulnerable, do nothing.
          }
          return self.move(move_node.x - self.me.x, move_node.y - self.me.y);
        }
        return null; // nothing to do, just camp out.
      }
    }

    if (this.stage == CONSTANTS.MINE) {
      if (this.mine_loc !== null) {
        if (self.me.x == this.mine_loc[0] && self.me.y == this.mine_loc[1]) {
          if ((self.fuel_map[self.me.y][self.me.x] && self.me.fuel >= SPECS.UNITS[self.me.unit].FUEL_CAPACITY) || 
              (self.karbonite_map[self.me.y][self.me.x] && self.me.karbonite >= SPECS.UNITS[self.me.unit].KARBONITE_CAPACITY)) {
            this.mining = false;
            this.stage = CONSTANTS.DEPOSIT;
          }
          else {
            this.mining = true;
            return self.mine();
          }
        }
        if (this.second_mine !== null) {
          if (self.fuel_map[this.second_mine[1]][this.second_mine[0]])
            this.mine_loc = find_mine(self, this.resources, 'fuel', true);
          else if (self.karbonite_map[this.second_mine[1]][this.second_mine[0]])
            this.mine_loc = find_mine(self, this.resources, 'karbonite', true);
          this.second_mine = this.mine_loc;
        } else {
          if (!this.mining)
            this.mine_loc = find_mine(self, this.resources, choosePriority(self));
        }

        if (this.mine_loc === null) {
          return null;
        }
        let move_node = move_to(self, [self.me.x, self.me.y], this.mine_loc);
        if (move_node !== null) {
          if (isDangerous(self, [move_node.x, move_node.y])){
            if (this.base_loc != this.church_loc)
              self.castleTalk(COMM8.HINDERED);
            return null; // that move will make you vulnerable, do nothing.
          }
          return self.move(move_node.x - self.me.x, move_node.y - self.me.y)
        }
      }
      return null; // nothing to do, just camp out.
    }
  }
}

function choosePriority(self) {
  let priority = null;
  if (self.fuel > 500 || self.karbonite < 50)
    priority = 'karbonite';
  else
    priority = 'fuel';
  if (self.karbonite > self.fuel)
    priority = 'fuel';
  return priority;
}

function isDangerous(self, p) {
  for (const r of self.getVisibleRobots()){
    if (self.isVisible(r) && r.team != self.me.team && SPECS.UNITS[r.unit].ATTACK_DAMAGE !== null && SPECS.UNITS[r.unit].ATTACK_DAMAGE != 0){
      let d = dist([r.x, r.y], [p[0], p[1]]);
      let radius = [SPECS.UNITS[r.unit].ATTACK_RADIUS[0], SPECS.UNITS[r.unit].VISION_RADIUS]; // stay invisible
      if (r.unit == SPECS.PREACHER)
        radius[1] = 50;
      if (d <= radius[1] && d >= radius[0])
        return true;
    }
  }
  return false;
}

function nearbyChurch(self, church_loc, base_loc) {
  for (const r of self.getVisibleRobots()) {
    if (r.x !== null && r.team !== null && r.team == self.me.team && r.unit == SPECS.CHURCH &&
        dist(church_loc, [r.x, r.y]) < dist(church_loc, base_loc)) {
      return r;
    }
  }
  return null;
}

function is_lattice(self, myposition, base_loc, lattice_angle){
  if (is_valid(myposition[0], myposition[1], self.map.length) && 
  self.map[myposition[1]][myposition[0]] && 
  is_passable(self,myposition[0],myposition[1]) &&
  !self.fuel_map[myposition[1]][myposition[0]] &&
  !self.karbonite_map[myposition[1]][myposition[0]] &&
  dist(base_loc,myposition) > 2 &&
  (myposition[0] + myposition[1]) % 2 == 1 ){
    switch(lattice_angle) {
      case 1: return (myposition[0]-base_loc[0]) >= (2 * Math.abs(myposition[1]-base_loc[1]));
      case 2: return (myposition[1]-base_loc[1]) <= (-2 * Math.abs(myposition[0]-base_loc[0]));
      case 3: return (myposition[0]-base_loc[0]) <= (-2 * Math.abs(myposition[1]-base_loc[1]));
      case 4: return (myposition[1]-base_loc[1]) >= (2 * Math.abs(myposition[0]-base_loc[0]));
      default: return true;
    }
  }
  return false;
}

function is_nonResource(self, myposition, base_loc){
  return is_valid(myposition[0], myposition[1], self.map.length) && 
  self.map[myposition[1]][myposition[0]] && 
  !self.fuel_map[myposition[1]][myposition[0]] &&
  !self.karbonite_map[myposition[1]][myposition[0]] &&
  is_passable(self,myposition[0],myposition[1]) &&
  dist(myposition,base_loc) > 2
}

function is_available(self, myposition, base_loc){
  return is_valid(myposition[0], myposition[1], self.map.length) && 
  self.map[myposition[1]][myposition[0]] && 
  is_passable(self,myposition[0],myposition[1]) &&
  dist(myposition,base_loc) > 2
}

function find_lattice_point(self, base_loc, lattice_point, lattice_angle){
  let closest_lattice_point = lattice_point !== null && is_lattice(self, lattice_point, base_loc, lattice_angle) ? lattice_point : null;
  let mypos = [self.me.x, self.me.y];
  if (is_lattice(self, mypos, base_loc, lattice_angle) && (closest_lattice_point === null || dist(mypos, base_loc) < dist(closest_lattice_point,base_loc))){
    closest_lattice_point = [mypos[0], mypos[1]];
  }
  for (const dir of CIRCLES[SPECS.UNITS[self.me.unit].VISION_RADIUS]){
    let current = [self.me.x + dir[0], self.me.y + dir[1]];
    if (is_lattice(self, current, base_loc, lattice_angle)) {
      if (closest_lattice_point === null || dist(current, base_loc) < dist(base_loc,closest_lattice_point)){
        closest_lattice_point = [current[0],current[1]];
      }
    }
  }
  return closest_lattice_point
}

function lattice_movement(self, base_loc, lattice_point, lattice_angle) {
  // Since preachers have low vision, they can't reliably lattice
  // This will be a less ambitious version of nonNuisance
  //The lattice point has already been found; so just a* to it
  //If this point is null because there are no lattice points, look for a point without resources on it
  //If that's not available, look for a point that is far away from base
  let farthest_nonRes_point = null;
  let farthest_point = null;
  let counterpart = null;
  switch(lattice_angle){
    case 1:
      counterpart = [self.map.length, self.me.y];
      break;
    case 2:
      counterpart = [self.me.x, 0];
      break;
    case 3:
      counterpart = [0, self.me.y];
      break;
    case 4:
      counterpart = [self.me.x, self.map.length];
      break;
    default:
      if (isHorizontalSymmetry(self.map, self.fuel_map, self.karbonite_map)){
        counterpart = [self.map.length - self.me.x, self.me.y];
      }
      else{
        counterpart = [self.me.x, self.map.length - self.me.y];
      }
  }

  let mypos = [self.me.x, self.me.y];
  let myspeed = SPECS.UNITS[self.me.unit].SPEED;
  if (lattice_point !== null && self.me.x == lattice_point[0] && self.me.y == lattice_point[1]) {
    return null
  }
  if (lattice_point !== null && self.getVisibleRobotMap()[lattice_point[1]][lattice_point[0]] <= 0){
    if (dist(lattice_point, mypos) > myspeed){
      let move = move_to(self, mypos, lattice_point);
      if (move !== null){
        return [move.x, move.y]
      }
    }
    else{
      return lattice_point
    }
  }
  if (is_nonResource(self, mypos, base_loc)){
    farthest_nonRes_point = [mypos[0],mypos[1]];
  }
  if (is_available(self, mypos, base_loc)){
    farthest_point = [mypos[0],mypos[1]];
  }
  // self.log('here1')
  for (const dir of CIRCLES[SPECS.UNITS[self.me.unit].SPEED]){
    let current = [self.me.x + dir[0], self.me.y + dir[1]];

    if (is_nonResource(self, current, base_loc)){
      // self.log('here3')
      if (farthest_nonRes_point === null || dist(current, counterpart) < dist(counterpart,farthest_nonRes_point)){
        farthest_nonRes_point = [current[0],current[1]];
      }
    }

    if (is_available(self, current, base_loc)){
      if (farthest_point === null || dist(current, counterpart) < dist(counterpart,farthest_point)){
        farthest_point = [current[0],current[1]];
      }
    }
    // self.log('here4')
  }
  if (farthest_nonRes_point !== null){
    return farthest_nonRes_point
  }
  if (farthest_point !== null){
    return farthest_point
  }
  //If all else, fails, just go to the base
  let move = move_to(self, [self.me.x, self.me.y], [base_loc[0],base_loc[1]]);
  if (move !== null) {
    return [move.x, move.y]
  }
  else{
    return null;
  }
}

function attack_behaviour_aggressive(self, mode_location){
  //Always pursue mode_location, and kill anyone seen

  //attack enemy if possible
  let targets = getAttackOrder(self);
  if (targets.length>0){
    return self.attack(targets[0].x-self.me.x,targets[0].y-self.me.y)
  }

  //pursue visible enemies without swarming
  for (const r of self.getVisibleRobots()) {
    if (self.isVisible(r) && r.unit !== null && r.team != self.me.team) {
      let move = move_towards(self,[self.me.x,self.me.y],[r.x,r.y]);
      if (move !== null) {
        return self.move(move.x - self.me.x, move.y - self.me.y);
      }
    }
  }

  //If nobody is visible, just pursue the mode_location (which in this case would be the enemy)
  if (mode_location !== null) {
    let vis_map = self.getVisibleRobotMap();
    if (vis_map[mode_location[1]][mode_location[0]] != 0) {
      let move = move_towards(self, [self.me.x, self.me.y], [mode_location[0], mode_location[1]]);
      if (move !== null) {
        return self.move(move.x - self.me.x, move.y - self.me.y)
      } 
      else {
        return null;
      }
    } 
    else {
      return CONSTANTS.ELIMINATED_ENEMY;
    }
  }
  return null
}

function attack_behaviour_passive(self, mode_location){
  //Pursue mode_location, but strategically move away when engaging enemies. Try to hit without getting hit
  //This method is only effective with prophets

  let vis_map = self.getVisibleRobotMap();
  let targets = getAttackOrder(self);
  if (targets.length != 0){
    //attack enemy, but MAKE SURE protection is between prophet and enemy
    let crusaders = [];
    let enemies = [];
    let mypos = [self.me.x, self.me.y];
    //if there is a single enemy robot without a crusader in front, move away
    //since this method is called by prophets, it must be certain that they are protected by crusaders
    for (const p of self.getVisibleRobots()){
      let ppos = [p.x,p.y];
      if (self.isVisible(p) && p.team == self.me.team && (p.unit == SPECS.UNITS[SPECS.PREACHER] || p.unit == SPECS.UNITS[SPECS.CRUSADER])){
        crusaders.push([p.x,p.y]);
      }
      if (self.isVisible(p) && p.team != self.me.team && p.unit > 2 && dist(mypos,ppos) < SPECS.UNITS[p.unit].VISION_RADIUS){
        enemies.push(p);
      }
    }
    let escape = false;
    for (const r of enemies){
      let unsafe = true;
      for (const c of crusaders){
        if (dist(c,[r.x,r.y])<dist([r.x,r.y,self.me.x,self.me.y])){
          unsafe = false;
          break
        }
      }
      if (unsafe){
        escape = true;
        break
      }
    }
    if (escape){
      let move = move_away(self,enemies);
      if (move !== null) {
        return self.move(move[0],move[1]);
      }
      else{
        return self.attack(targets[0].x-self.me.x,targets[0].y-self.me.y)
      }
    }
    else{
      return self.attack(targets[0].x-self.me.x,targets[0].y-self.me.y)
    }
  }

  //Pursue the enemy without swarming
  if (vis_map[mode_location[1]][mode_location[0]]!=0){
    let move = move_towards(self,[self.me.x,self.me.y],[mode_location[0],mode_location[1]]);
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

function defensive_behaviour_aggressive(self, mode_location, base_location, pursuing=false) {
  let mypos = [self.me.x, self.me.y];
  //attack enemy if possible
  let targets = getAttackOrder(self);
  if (targets.length>0){
    return self.attack(targets[0].x-self.me.x,targets[0].y-self.me.y)
  }

  //pursue any visible enemy robots
  for (const r of self.getVisibleRobots()) {
    let rpos = [r.x,r.y];
    if (self.isVisible(r) && r.unit !== null && r.team !== null && r.team != self.me.team) {
      let move = move_towards(self, [self.me.x, self.me.y], [r.x, r.y]);
      if (move !== null) {
        return self.move(move.x - self.me.x, move.y - self.me.y);
      }
    }
  }

  if (pursuing){
    if (dist([self.me.x,self.me.y],base_location) > 25) {
      let move = move_to(self, [self.me.x, self.me.y], [base_location[0],base_location[1]]);
      if (move !== null) {
        return self.move(move.x - self.me.x, move.y - self.me.y);
      }
      else{
        return null;
      }
    }
    else{
      return CONSTANTS.BASE_PURSUED
    }
  }
  //Pursue mode_location 
  if (mode_location !== null) {
    // self.log(self.getVisibleRobotMap()[mode_location[1]][mode_location[0]])
    let vis_map = self.getVisibleRobotMap();
    if (vis_map[mode_location[1]][mode_location[0]] != 0) {
      // self.log('move_towards2')
      let move = move_towards(self, [self.me.x, self.me.y], [mode_location[0], mode_location[1]]);
      if (move !== null) {
        return self.move(move.x - self.me.x, move.y - self.me.y)
      } 
    }

    else {
      return CONSTANTS.ELIMINATED_ENEMY;
    }
  } 
  //move back to base; give resources if you have them; Otherwise, move away if you're sitting on resources or waffle
  else {

    if (self.me.karbonite > 0 || self.me.fuel > 0) {
      if (Math.abs(self.me.x - base_location[0]) <= 1 && Math.abs(self.me.y - base_location[1]) <= 1){
        return self.give(base_location[0] - self.me.x, base_location[1] - self.me.y, self.me.karbonite, self.me.fuel);
      }
      else {
        let move = move_towards(self, [self.me.x, self.me.y], [base_location[0], base_location[1]], true);
        if (move !== null) {
          return self.move(move.x - self.me.x, move.y - self.me.y)
        } 
        else {
          return null;
        }  
      }
    }
    else{
      return CONSTANTS.SAVE_LATTICE
    }
  }
}

function defensive_behaviour_passive(self, base_location, pursuing=false) {
  //If the robot sees an enemy, wait for the enemy to come so the enemy will get hit first. Never leave base
  // self.log("here1")

  //attack if possible
  let vis_map = self.getVisibleRobotMap();
  let help = [];
  let enemies = [];
  let receiver = null; //surrounding unit that can receive resource
  let mypos = [self.me.x, self.me.y];
  //if there is a single enemy robot without a crusader in front, move away
  //since this method is called by prophets, it must be certain that they are protected by help
  for (const p of self.getVisibleRobots()){
    let ppos = [p.x,p.y];
    if (self.isVisible(p) && p.team == self.me.team && (p.unit == SPECS.UNITS[SPECS.CRUSADER] || p.unit == SPECS.UNITS[SPECS.PREACHER])){
      help.push([p.x,p.y]);
    }
    if (self.isVisible(p) && p.team != self.me.team && p.unit > 2 && dist(mypos,ppos) < SPECS.UNITS[p.unit].VISION_RADIUS){
      enemies.push(p);
    }
    if (self.me.karbonite > 0 || self.me.fuel > 0){
      if (self.isVisible(p) && p.team == self.me.team && dist(ppos,mypos) <= 2 && dist(ppos,base_location) < dist(mypos,base_location)){
        if (p.karbonite < SPECS.UNITS[p.unit].KARBONITE_CAPACITY || p.fuel < SPECS.UNITS[p.unit].FUEL_CAPACITY){
          receiver = [p.x,p.y];
        }
      }
    }
  }
  //attack enemy, but MAKE SURE crusader is between prophet and enemy
  let targets = getAttackOrder(self);
  if (targets.length != 0){
    let escape = false;
    for (const r of enemies){
      let unsafe = r.unit !== SPECS.PROPHET; // don't run away from prophets
      for (const c of help){
        if (dist(c,[r.x,r.y])<dist([r.x,r.y,self.me.x,self.me.y])){
          unsafe = false;
          break
        }
      }
      if (unsafe){
        escape = true;
        break
      }
    }
    if (escape){
      let move = move_away(self,enemies);
      if (move !== null) {
        return self.move(move[0],move[1]);
      }
      else{
        return self.attack(targets[0].x-self.me.x,targets[0].y-self.me.y)
      }
    }
    else{
      return self.attack(targets[0].x-self.me.x,targets[0].y-self.me.y)
    }
  }

  if (pursuing){
    if (dist([self.me.x,self.me.y],base_location) > 25) {
      let move = move_to(self, [self.me.x, self.me.y], [base_location[0],base_location[1]]);
      if (move !== null) {
        return self.move(move.x - self.me.x, move.y - self.me.y);
      }
      else{
        return null;
      }
    }
    else{
      return CONSTANTS.BASE_PURSUED
    }
  }
  // //go back to base if possible
  // // self.log('here2')
  if (self.me.karbonite > 0 || self.me.fuel > 0) {
    if (Math.abs(self.me.x - base_location[0]) <= 1 && Math.abs(self.me.y - base_location[1]) <= 1){
      return self.give(base_location[0] - self.me.x, base_location[1] - self.me.y, self.me.karbonite, self.me.fuel);
    }
    else if (receiver !== null){
      return self.give(receiver[0] - self.me.x, receiver[1] - self.me.y, self.me.karbonite, self.me.fuel);
    }
    else{
      let move = move_towards(self, [self.me.x, self.me.y], [base_location[0], base_location[1]], true);
      if (move !== null) {
        return self.move(move.x - self.me.x, move.y - self.me.y);
      } else {
        return null;
      }  
    }
  }
  else{
    return CONSTANTS.SAVE_LATTICE;
  }
}

function lattice_behaviour(self){
  //attack enemy, but MAKE SURE crusader is between prophet and enemy
  let targets = getAttackOrder(self);
  if (targets.length != 0){
    return self.attack(targets[0].x-self.me.x,targets[0].y-self.me.y)
  }
  else{
    return CONSTANTS.SAVE_LATTICE
  }

}

function addCastle(self, r, lis){
  let myList = lis;
  if (self.isVisible(r) && r.team != self.me.team && r.unit == 0){
    myList.push([r.x,r.y]);
  }
  return myList
}

function signalDeadCastle(self, toSignal, loc){
  if (loc === null || !toSignal)
    return

  let N = self.map.length;
  let horiSym = isHorizontalSymmetry(self.map, self.fuel_map, self.karbonite_map);
  let enemyBaseLoc = horiSym ? [loc[0], N - loc[1] - 1] : [N - loc[0] - 1, loc[1]];

  if (self.getVisibleRobotMap()[enemyBaseLoc[1]][enemyBaseLoc[0]] == 0)
    self.signal(COMM16.ENCODE_ENEMYDEAD(...enemyBaseLoc), dist([self.me.x, self.me.y], loc));
}

class CrusaderManager {
  constructor(self) {
    this.mode = CONSTANTS.DEFENSE;
    this.mode_location = null;
    this.base_location = null;
    this.lattice_point = null;
    this.lattice_angle = 0;
    this.enemy_castles = [];
    this.toSignal = true;

    this.base_is_castle = false;
    const vis_map = self.getVisibleRobotMap();
    for (const dir of CIRCLES[2]) {
      if (self.map[self.me.y + dir[1]] && self.map[self.me.y + dir[1]][self.me.x + dir[0]]) {
        if (vis_map[self.me.y + dir[1]][self.me.x + dir[0]] > 0) {
          let r = self.getRobot(vis_map[self.me.y + dir[1]][self.me.x + dir[0]]);
          if (r.team == self.me.team && SPECS.UNITS[r.unit].SPEED == 0) { // castle or church
            this.base_location = [r.x, r.y];
            this.base_is_castle = (r.unit == SPECS.CASTLE);
            break;
          }
        }
      }
    }
  }

  turn(step, self) {
    for (const r of self.getVisibleRobots()) {
      this.enemy_castles = addCastle(self, r,this.enemy_castles);
      if (COMM16.type(r.signal) == COMM16.ENEMYCASTLE_HEADER) {
        this.mode = CONSTANTS.ATTACK;
        this.mode_location = COMM16.DECODE_ENEMYCASTLE(r.signal);
      }
      if (COMM16.type(r.signal) == COMM16.HORDE_HEADER) {
        this.mode = CONSTANTS.PURSUING_BASE;
        this.base_location = COMM16.DECODE_HORDE(r.signal);
        this.mode_location = null;
      }
      if (COMM16.type(r.signal) == COMM16.ENEMYSIGHTING_HEADER){
        this.mode = CONSTANTS.ATTACK;
        this.mode_location = COMM16.DECODE_ENEMYSIGHTING(r.signal);
      }
      if (COMM16.type(r.signal) == COMM16.LATTICE_HEADER){
        this.mode = CONSTANTS.LATTICE;
        this.lattice_angle = COMM16.DECODE_LATTICE(r.signal);
      }
      if (COMM16.type(r.signal) == COMM16.ENEMYDEAD_HEADER){
        this.mode = CONSTANTS.LATTICE;
        let tmp_loc = COMM16.DECODE_ENEMYDEAD(r.signal);
        let N = self.map.length;
        let horiSym = isHorizontalSymmetry(self.map, self.fuel_map, self.karbonite_map);
        let enemyBaseLoc = horiSym ? [this.base_location[0], N - this.base_location[1] - 1] : [N - this.base_location[0] - 1, this.base_location[1]];
        if (dist(enemyBaseLoc, tmp_loc) == 0)
          this.toSignal = false;
      }
    }
    // self.log("here1")
    if (this.base_is_castle)
      signalDeadCastle(self, this.toSignal, this.base_location);
    let needLattice = false;
    if (this.mode == CONSTANTS.PURSUING_BASE){
      let action = defensive_behaviour_aggressive(self, this.mode_location, this.base_location, true);
      if (action == CONSTANTS.BASE_PURSUED){
        this.mode = CONSTANTS.DEFENSE;
      }
      else{
        return action
      } 
    }
    if (this.mode == CONSTANTS.DEFENSE) {
      // self.log("here2")
      let action = defensive_behaviour_aggressive(self, this.mode_location, this.base_location);
      if (action == CONSTANTS.ELIMINATED_ENEMY){
        this.mode_location = null;
        needLattice = true;
      }
      if (action == CONSTANTS.SAVE_LATTICE){
        needLattice = true;
      }
      else{
        if (action !== null){
          return action
        }
        else{
          return null
        }
      }
    }

    if (this.mode == CONSTANTS.ATTACK && this.mode_location !== null) {
      let action = attack_behaviour_aggressive(self, this.mode_location);
      if (action == CONSTANTS.ELIMINATED_ENEMY) {
        // self.log("enemy castle dead")
        // self.castleTalk(COMM8.ENEMY_CASTLE_DEAD);
        this.mode = CONSTANTS.DEFENSE;
        this.mode_location = null;
        return null
      } 
      else {
        return action
      }
    }

    if (this.mode == CONSTANTS.LATTICE || needLattice){
      let action = lattice_behaviour(self);
      if (action == CONSTANTS.SAVE_LATTICE){

        this.lattice_point = find_lattice_point(self, this.base_location, this.lattice_point, this.lattice_angle);

        //if we are already at the lattice point, then simply do nothing
        if (this.lattice_point !== null && self.me.x == this.lattice_point[0] && self.me.y == this.lattice_point[1]){
          this.lattice_point = null;
          return null
        }

        let n = lattice_movement(self, this.base_location, this.lattice_point, this.lattice_angle);
        // self.log(""+n)
        if (n !== null && !(n[0] - self.me.x == 0 && n[1] - self.me.y == 0)){
          return self.move(n[0] - self.me.x,n[1] - self.me.y);
        }
        else{
          return null
        }
      }
      else{
        return action;
      }

    }
  }
}


class ProphetManager {
  constructor(self) {
    this.mode = CONSTANTS.DEFENSE;
    this.mode_location = null;
    this.base_location = null;
    this.lattice_point = null;
    this.lattice_angle = 0;
    this.enemy_castles = [];
    this.toSignal = true;

    this.base_is_castle = false;
    const vis_map = self.getVisibleRobotMap();
    for (const dir of CIRCLES[2]) {
      if (self.map[self.me.y + dir[1]] && self.map[self.me.y + dir[1]][self.me.x + dir[0]]) {
        if (vis_map[self.me.y + dir[1]][self.me.x + dir[0]] > 0) {
          let r = self.getRobot(vis_map[self.me.y + dir[1]][self.me.x + dir[0]]);
          if (r.team == self.me.team && SPECS.UNITS[r.unit].SPEED == 0) { // castle or church
            this.base_location = [r.x, r.y];
            this.base_is_castle = (r.unit == SPECS.CASTLE);
            break;
          }
        }
      }
    }
  }

  turn(step, self) {
    for (const r of self.getVisibleRobots()) {
      this.enemy_castles = addCastle(self, r,this.enemy_castles);
      if (COMM16.type(r.signal) == COMM16.ENEMYCASTLE_HEADER) {
        this.mode = CONSTANTS.DEFENSE;
        this.mode_location = COMM16.DECODE_ENEMYCASTLE(r.signal);
        self.log(this.mode_location);
      }
      else if (COMM16.type(r.signal) == COMM16.BASELOC_HEADER){
        this.base_is_castle = false;
        this.mode = CONSTANTS.DEFENSE;
        let tmpBaseloc = COMM16.DECODE_BASELOC(r.signal);
        if (tmpBaseloc[0] != this.base_location[0] || tmpBaseloc[1] != this.base_location[1]){
          this.mode = CONSTANTS.PURSUING_BASE;
        }
        this.base_location = COMM16.DECODE_BASELOC(r.signal);
      }
      else if (COMM16.type(r.signal) == COMM16.HORDE_HEADER) {
        this.base_is_castle = false;
        this.mode = CONSTANTS.DEFENSE;
        let tmpBaseloc = COMM16.DECODE_HORDE(r.signal);
        if (tmpBaseloc[0] != this.base_location[0] || tmpBaseloc[1] != this.base_location[1]){
          this.mode = CONSTANTS.PURSUING_BASE;
        }
        this.base_location = COMM16.DECODE_HORDE(r.signal);
      }
      else if (COMM16.type(r.signal) == COMM16.LATTICE_HEADER){
        this.mode = CONSTANTS.LATTICE;
        this.lattice_angle = COMM16.DECODE_LATTICE(r.signal);
      }
      else if (COMM16.type(r.signal) == COMM16.ENEMYDEAD_HEADER){
        this.mode = CONSTANTS.LATTICE;
        let tmp_loc = COMM16.DECODE_ENEMYDEAD(r.signal);
        let N = self.map.length;
        let horiSym = isHorizontalSymmetry(self.map, self.fuel_map, self.karbonite_map);
        let enemyBaseLoc = horiSym ? [this.base_location[0], N - this.base_location[1] - 1] : [N - this.base_location[0] - 1, this.base_location[1]];
        if (dist(enemyBaseLoc, tmp_loc) == 0)
          this.toSignal = false;
      }
    }
    if (this.base_is_castle)
      signalDeadCastle(self, this.toSignal, this.base_location);
    let needLattice = false;

    if (this.mode == CONSTANTS.PURSUING_BASE){
      let action = defensive_behaviour_passive(self, this.base_location, true);
      if (action == CONSTANTS.BASE_PURSUED){
        this.mode = CONSTANTS.DEFENSE;
      }
      else{
        return action
      } 
    }

    if (this.mode == CONSTANTS.DEFENSE) {
      // self.log("defense")
      let action = defensive_behaviour_passive(self, this.base_location);
      if (action == CONSTANTS.SAVE_LATTICE){
        needLattice = true;
      }
      else{
        if (action !== null){
          return action
        }
        else{
          return null
        }
      }
    }

    if (this.mode == CONSTANTS.ATTACK && this.mode_location !== null) {
      // self.log("attack")
      let action = attack_behaviour_passive(self, this.mode_location);
      if (action == CONSTANTS.ELIMINATED_ENEMY) {
        // self.log("prophet says enemy castle dead")
        // self.castleTalk(COMM8.ENEMY_CASTLE_DEAD);
        this.mode = CONSTANTS.DEFENSE;
        this.mode_location = null;
        return null
      } 
      else {
        return action
      }
    }

    if (this.mode == CONSTANTS.LATTICE || needLattice){
      // if (self.me.x == 37 && self.me.y == 0){
      //   self.log("lattice")  
      // }

      let action = lattice_behaviour(self);
      if (action == CONSTANTS.SAVE_LATTICE){

        this.lattice_point = find_lattice_point(self, this.base_location, this.lattice_point, this.lattice_angle);
        // if (self.me.x == 37 && self.me.y == 0){
        //   self.log(this.lattice_point)  
        // }
        //if we are already at the lattice point, then simply do nothing
        if (this.lattice_point !== null && self.me.x == this.lattice_point[0] && self.me.y == this.lattice_point[1]){
          this.lattice_point = null;
          return null
        }

        let n = lattice_movement(self, this.base_location, this.lattice_point, this.lattice_angle);
        // self.log(""+n)
        if (n !== null && !(n[0] - self.me.x == 0 && n[1] - self.me.y == 0)){
          return self.move(n[0] - self.me.x,n[1] - self.me.y);
        }
        else{
          return null
        }
      }
      else{
        return action;
      }
    }
  }
}

class PreacherManager {
  constructor(self) {
    this.mode_location = null;
    this.base_location = null;
    this.lattice_point = null;
    this.lattice_angle = 0;
    this.enemy_castles = [];
    this.toSignal = true;

    this.base_is_castle = false;
    const vis_map = self.getVisibleRobotMap();
    for (const dir of CIRCLES[2]) {
      if (self.map[self.me.y + dir[1]] && self.map[self.me.y + dir[1]][self.me.x + dir[0]]) {
        if (vis_map[self.me.y + dir[1]][self.me.x + dir[0]] > 0) {
          let r = self.getRobot(vis_map[self.me.y + dir[1]][self.me.x + dir[0]]);
          if (r.team == self.me.team && SPECS.UNITS[r.unit].SPEED == 0) { // castle or church
            this.base_location = [r.x, r.y];
            this.base_is_castle = (r.unit == SPECS.CASTLE);
            break;
          }
        }
      }
    }
  }

  turn(step, self) {
    for (const r of self.getVisibleRobots()) {
      this.enemy_castles = addCastle(self, r,this.enemy_castles);
      if (COMM16.type(r.signal) == COMM16.ENEMYCASTLE_HEADER) {
        this.mode = CONSTANTS.ATTACK;
        this.mode_location = COMM16.DECODE_ENEMYCASTLE(r.signal);
      }
      if (COMM16.type(r.signal) == COMM16.ENEMYSIGHTING_HEADER){
        this.mode = CONSTANTS.ATTACK;
        this.mode_location = COMM16.DECODE_ENEMYSIGHTING(r.signal);
      }
      if (COMM16.type(r.signal) == COMM16.LATTICE_HEADER){
        this.mode = CONSTANTS.LATTICE;
        this.lattice_angle = COMM16.DECODE_LATTICE(r.signal);
      }
      if (COMM16.type(r.signal) == COMM16.HORDE_HEADER){
        this.mode = CONSTANTS.DEFENSE;
        let tmpBaseloc = COMM16.DECODE_HORDE(r.signal);
        if (tmpBaseloc[0] != this.base_location[0] || tmpBaseloc[1] != this.base_location[1]){
          this.mode = CONSTANTS.PURSUING_BASE;
        }
        this.base_location = COMM16.DECODE_HORDE(r.signal);
      }
      if (COMM16.type(r.signal) == COMM16.ENEMYDEAD_HEADER){
        this.mode = CONSTANTS.LATTICE;
        let tmp_loc = COMM16.DECODE_ENEMYDEAD(r.signal);
        let N = self.map.length;
        let horiSym = isHorizontalSymmetry(self.map, self.fuel_map, self.karbonite_map);
        let enemyBaseLoc = horiSym ? [this.base_location[0], N - this.base_location[1] - 1] : [N - this.base_location[0] - 1, this.base_location[1]];
        if (dist(enemyBaseLoc, tmp_loc) == 0)
          this.toSignal = false;
      }
    }
    if (this.base_is_castle)
      signalDeadCastle(self, this.toSignal, this.base_location);
    let needLattice = false;
    if (this.mode == CONSTANTS.PURSUING_BASE){
      let action = defensive_behaviour_aggressive(self, this.mode_location, this.base_location, true);
      if (action == CONSTANTS.BASE_PURSUED){
        this.mode = CONSTANTS.DEFENSE;
      }
      else{
        return action
      } 
    }
    if (this.mode == CONSTANTS.DEFENSE) {
      // self.log("here2")
      let action = defensive_behaviour_aggressive(self, this.mode_location, this.base_location);
      if (action == CONSTANTS.ELIMINATED_ENEMY){
        this.mode_location = null;
        needLattice = true;
      }
      if (action == CONSTANTS.SAVE_LATTICE){
        needLattice = true;
      }
      else{
        if (action !== null){
          return action
        }
        else{
          return null
        }
      }
    }

    if (this.mode == CONSTANTS.ATTACK && this.mode_location !== null) {
      let action = attack_behaviour_aggressive(self, this.mode_location);
      if (action == CONSTANTS.ELIMINATED_ENEMY) {
        // self.log("enemy castle dead")
        // self.castleTalk(COMM8.ENEMY_CASTLE_DEAD);
        this.mode = CONSTANTS.DEFENSE;
        this.mode_location = null;
        return null
      } 
      else {
        return action
      }
    }

    if (this.mode == CONSTANTS.LATTICE || needLattice){
      let action = lattice_behaviour(self);
      if (action == CONSTANTS.SAVE_LATTICE){

        this.lattice_point = find_lattice_point(self, this.base_location, this.lattice_point, this.lattice_angle);

        //if we are already at the lattice point, then simply do nothing
        if (this.lattice_point !== null && self.me.x == this.lattice_point[0] && self.me.y == this.lattice_point[1]){
          this.lattice_point = null;
          return null
        }

        let n = lattice_movement(self, this.base_location, this.lattice_point, this.lattice_angle);
        // self.log(""+n)
        if (n !== null && !(n[0] - self.me.x == 0 && n[1] - self.me.y == 0)){
          return self.move(n[0] - self.me.x,n[1] - self.me.y);
        }
        else{
          return null
        }
      }
      else{
        return action;
      }

    }
  }
}

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
        // for (const r of self.getVisibleRobots()) {
        //   if (COMM16.type(r.signal) == COMM16.SCOUT_HEADER) {
        //     robotManager = new ScoutManager(self);
        //     // robotManager = new NoneManager();
        //   }
        // }
        // if (robotManager === null)
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
var robot = new MyRobot();
