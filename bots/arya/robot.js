import {BCAbstractRobot, SPECS} from 'battlecode';
import {create_resource_map, get_viable_church_loc, move_towards} from './path.js';
import {CONSTANTS, CIRCLES, COMM8, COMM16} from './constants.js'

// Turtling

/* SHARED VARIABLES */
var step = -1;

/* CASTLE VARIABLES */
var resourceMap = null;
var pilgrimStatus = {};

var status;
var target_x = null;
var target_y = null;

var enemyCooldown = 500; // never revisit if you've seen enemies

/* PILGRIM VARIABLES */
var p_target = null;
var p_mineloc = null;
var p_castleloc = null;

/* MAIN CODE */
class MyRobot extends BCAbstractRobot {
    turn() {
        step++;
        let self = this; // Otherwise, can't call log inside anonymous functions.

        if (self.me.unit === SPECS.CASTLE || self.me.unit === SPECS.CHURCH) {
            if (resourceMap == null) {
                resourceMap = create_resource_map(self.me.x, self.me.y, self.map, self.fuel_map, self.karbonite_map);
                self.log("created resource_map")
            }

            status = null;
            for (const r of self.getVisibleRobots()) {
                if (r.castle_talk == COMM8.PILGRIM_DISTRESS) {
                    status = CONSTANTS.DEFEND; // Someone's under attack: defending is priority.
                    for (let i = 0; i < resourceMap.fuel.length; i++){
                        if(resourceMap.fuel[i][2] == r.id){
                            resourceMap.fuel[i][2] = 0;
                            resourceMap.fuel[i][3] = CONSTANTS.NO_ROBOT_ASSIGNED;
                            resourceMap.fuel[i][4] = step;
                            break;
                        }
                    }
                    for (let i = 0; i < resourceMap.karbonite.length; i++){
                        if(resourceMap.karbonite[i][2] == r.id){
                            resourceMap.karbonite[i][2] = 0;
                            resourceMap.karbonite[i][3] = CONSTANTS.NO_ROBOT_ASSIGNED;
                            resourceMap.karbonite[i][4] = step;
                            break;
                        }
                    }
                    pilgrimStatus[r.id] = CONSTANTS.FLEEING
                } else if (r.castle_talk == COMM8.PREACHER_DISTRESS) {
                    status = CONSTANTS.DEFEND; // Same thing: we have to defend.

                } else if (r.castle_talk == COMM8.PILGRIM_REACHED) {
                    for (let i = 0; i < resourceMap.fuel.length; i++){
                        if(resourceMap.fuel[i][2] == r.id){
                            resourceMap.fuel[i][3] = CONSTANTS.ROBOT_MINING;
                            break;
                        }
                    }
                    for (let i = 0; i < resourceMap.karbonite.length; i++){
                        if(resourceMap.karbonite[i][2] == r.id){
                            resourceMap.karbonite[i][3] = CONSTANTS.ROBOT_MINING;
                            break;
                        }
                    }
                    pilgrimStatus[r.id] = CONSTANTS.IDLE;
                } else if (r.castle_talk == COMM8.NEWPILGRIM) {
                    pilgrimStatus[r.id] = CONSTANTS.IDLE; // new unit, not doing anything.
                }
            }

            if (status == null) {
                status = CONSTANTS.DEFEND;
                for(let i = 0; i < resourceMap.fuel.length; i++) {
                    let r = resourceMap.fuel[i];
                    if (r[3] == CONSTANTS.NO_ROBOT_ASSIGNED && step - r[4] > enemyCooldown) {
                        status = CONSTANTS.GATHER;
                        break;
                    }
                }
                for(let i = 0; i < resourceMap.karbonite.length; i++) {
                    let r = resourceMap.karbonite[i];
                    if (r[3] == CONSTANTS.NO_ROBOT_ASSIGNED && step - r[4] > enemyCooldown) {
                        status = CONSTANTS.GATHER;
                        break;
                    }
                }
            }

            let vis_map = self.getVisibleRobotMap()
            let pass_map = self.getPassableMap()

            if (status == CONSTANTS.GATHER) { // send a pilgrim to a resource deposit.
                for (const r of self.getVisibleRobots()) { // Search for nearby, unassigned pilgrims:
                    if (r.x !== undefined && pilgrimStatus[r.id] == CONSTANTS.IDLE) { // found a pilgrim in range, doing nothing.
                        let resource = null; // find a resource for the pilgrim
                        for (let i = 0; i < resourceMap.fuel.length; i++){
                            if(resourceMap.fuel[i][3] == CONSTANTS.NO_ROBOT_ASSIGNED && step - resourceMap.fuel[i][4] > enemyCooldown){
                                resourceMap.fuel[i][2] = r.id;
                                resourceMap.fuel[i][3] = CONSTANTS.ROBOT_EN_ROUTE;
                                resource = resourceMap.fuel[i];
                                break;
                            }
                        }
                        for (let i = 0; i < resourceMap.karbonite.length; i++){
                            if(resourceMap.karbonite[i][3] == CONSTANTS.NO_ROBOT_ASSIGNED && step - resourceMap.karbonite[i][4] > enemyCooldown){
                                resourceMap.karbonite[i][2] = r.id;
                                resourceMap.karbonite[i][3] = CONSTANTS.ROBOT_EN_ROUTE;
                                resource = resourceMap.karbonite[i];
                                break;
                            }
                        }
                        pilgrimStatus[r.id] = CONSTANTS.EN_ROUTE;
                        self.log("ASSIGNING PILGRIM @ " + r.x + ", " + r.y + " to " + resource);
                        self.signal(COMM16.GOTO(resource[0], resource[1]), (r.x-self.me.x)**2 + (r.y-self.me.y)**2);
                        return;
                    }
                }

                if (self.karbonite > SPECS.UNITS[SPECS.PILGRIM].CONSTRUCTION_KARBONITE &&
                    self.fuel > SPECS.UNITS[SPECS.PILGRIM].CONSTRUCTION_FUEL) {
                    for (const dir of CIRCLES[2]) {
                        if (self.me.x + dir[0] >= vis_map.length || self.me.x + dir[0] < 0 ||
                            self.me.y + dir[1] >= vis_map.length || self.me.y + dir[1] < 0) {
                            continue; // out of bounds
                        }
                        if (vis_map[self.me.y + dir[1]][self.me.x + dir[0]] == 0) {
                            if (pass_map[self.me.y + dir[1]][self.me.x + dir[0]]) {
                                self.log(self.me.x + ", " + self.me.y + " - BUILDING PILGRIM @ " + dir[0] + ", " + dir[1])
                                return self.buildUnit(SPECS.PILGRIM, dir[0], dir[1]);
                            }
                        }
                    }
                }
            } else if (status == CONSTANTS.DEFEND) { // defend with a preacher lol
                if (self.karbonite > SPECS.UNITS[SPECS.PREACHER].CONSTRUCTION_KARBONITE &&
                    self.fuel > SPECS.UNITS[SPECS.PREACHER].CONSTRUCTION_FUEL) {
                    for (const dir of CIRCLES[2]) {
                        if (self.me.x + dir[0] >= vis_map.length || self.me.x + dir[0] < 0 ||
                            self.me.y + dir[1] >= vis_map.length || self.me.y + dir[1] < 0) {
                            continue; // out of bounds
                        }
                        if (vis_map[self.me.y + dir[1]][self.me.x + dir[0]] == 0) {
                            if (pass_map[self.me.y + dir[1]][self.me.x + dir[0]]) {
                                self.log(self.me.x + ", " + self.me.y + " - BUILDING PREACHER @ " + dir[0] + ", " + dir[1])
                                return self.buildUnit(SPECS.PREACHER, dir[0], dir[1]);
                            }
                        }
                    }
                }
            }
            return;

        } else if (self.me.unit === SPECS.PREACHER) {
            let attackable_enemy = null;
            let close_enemy = null;
            let in_the_way = false;

            if (step == 0) { // first move!
                self.castleTalk(COMM8.NEWPREACHER);
                self.log("NEW PREACHER @ " + self.me.x + ", " + self.me.y);
            } else {
                for (const r of self.getVisibleRobots()) {
                    if (r.team !== undefined && r.team != self.me.team) { // enemy sighting!
                        self.castleTalk(COMM8.PREACHER_DISTRESS);
                        if ((r.x - self.me.x)**2 + (r.y - self.me.y)**2 <= SPECS.UNITS[SPECS.PREACHER].ATTACK_RADIUS[1]) { // in attack range
                            if (attackable_enemy === null || attackable_enemy.health > r.health){
                                attackable_enemy = r;
                            }
                        } else { // you have to move towards the enemy.
                            if (close_enemy === null || close_enemy.health > r.health){
                                close_enemy = r;
                            }
                        }
                    } else if (r.team == self.me.team && (r.unit === SPECS.CASTLE || r.unit == SPECS.CHURCH)) {
                        if (((self.me.x - r.x) < 2 && (self.me.x - r.x) > -2) && 
                            ((self.me.y - r.y) < 2 && (self.me.y - r.y) > -2)) { // too close:
                            in_the_way = r;
                        }
                    }
                }
            }

            let vis_map = self.getVisibleRobotMap()
            let pass_map = self.getPassableMap()

            if (attackable_enemy !== null) { // ATTACK!!!!
                self.log("ATTACKING: " + attackable_enemy.x + ", " + attackable_enemy.y);
                return self.attack(attackable_enemy.x - self.me.x, attackable_enemy.y - self.me.y)
            } else if (close_enemy !== null) { // Move towards the enemy.
                let min_dist = (close_enemy.x - self.me.x)**2 + (close_enemy.y - self.me.y)**2
                let min_dir = [0,0];
                for (const dir of CIRCLES[SPECS.UNITS[SPECS.PREACHER].SPEED]) {
                    if (self.me.x + dir[0] >= vis_map.length || self.me.x + dir[0] < 0 ||
                        self.me.y + dir[1] >= vis_map.length || self.me.y + dir[1] < 0) {
                        continue; // out of bounds
                    }
                    if (vis_map[self.me.y + dir[1]][self.me.x + dir[0]] == 0) { // no robots there
                        if (pass_map[self.me.y + dir[1]][self.me.x + dir[0]]) { // it's a passable location
                            if ((self.me.x - close_enemy.x + dir[0])**2 + (self.me.y - close_enemy.y + dir[1])**2 < min_dist) {
                                min_dist = (self.me.x - close_enemy.x + dir[0])**2 + (self.me.y - close_enemy.y + dir[1])**2
                                min_dir = dir;
                            }
                        }
                    }
                }
                if (min_dir[0] != 0 || min_dir[1] != 0) { // we can move closer
                    return self.move(min_dir[0], min_dir[1])
                }
            }

            if (in_the_way !== false) {
                for (const dir of CIRCLES[SPECS.UNITS[SPECS.PREACHER].SPEED]) {
                    if (self.me.x + dir[0] >= vis_map.length || self.me.x + dir[0] < 0 ||
                        self.me.y + dir[1] >= vis_map.length || self.me.y + dir[1] < 0) {
                        continue; // out of bounds
                    }
                    if (vis_map[self.me.y + dir[1]][self.me.x + dir[0]] == 0) { // no robots there
                        if (pass_map[self.me.y + dir[1]][self.me.x + dir[0]]) { // it's a passable location
                            if (((self.me.x - in_the_way.x + dir[0]) > 1 || (self.me.x - in_the_way.x + dir[0]) < -1) && 
                                ((self.me.y - in_the_way.y + dir[1]) > 1 || (self.me.y - in_the_way.y + dir[1]) < -1)) { // that isn't too close:
                                return self.move(dir[0], dir[1]);
                            }
                        }
                    }
                }
            }

        } else if (self.me.unit === SPECS.PILGRIM) {
            if (step == 0) {
                self.castleTalk(COMM8.NEWPILGRIM);
                p_target = [null];
                p_mineloc = null;

                // find the castle:
                for (const r of self.getVisibleRobots()) {
                    if (r.team === self.me.team && (r.unit == SPECS.CASTLE || r.unit == SPECS.CHURCH) ) {
                        p_castleloc = [r.x, r.y];
                        break;
                    }
                }
            }

            for (const r of self.getVisibleRobots()) {
                if (r.signal !== undefined && r.signal>>12 == COMM16.GOTO_BITS) {
                    p_mineloc = COMM16.UNDO_GOTO(r.signal);
                    p_target = [CONSTANTS.MINE, p_mineloc];
                }
            }

            let enemySighting = null; // check if there are any enemies.
            for (const r of self.getVisibleRobots()) {
                if (r.team !== undefined && r.team != self.me.team) { // enemy sighting!
                    let dist = (r.x - self.me.x)**2 + (r.y - self.me.y)**2;
                    if (dist >= SPECS.UNITS[r.unit].ATTACK_RADIUS[0] && 
                        dist <= SPECS.UNITS[r.unit].ATTACK_RADIUS[1]) {
                        enemySighting = [r, dist];
                    }
                }
            }

            if (enemySighting !== null) {
                self.castleTalk(COMM8.PILGRIM_DISTRESS);
                p_target = [CONSTANTS.FLEE, p_castleloc]
                p_mineloc = null;
            } else if (p_target[0] != CONSTANTS.FLEE && (self.me.karbonite > 10 || self.me.fuel > 50)) {
                if ((self.me.x - p_castleloc[0])**2 + (self.me.y - p_castleloc[1])**2 < 25) {
                    p_target = [CONSTANTS.DEPOSIT, p_castleloc];
                } else {
                    p_target = [CONSTANTS.BUILD, get_viable_church_loc(self.me.x, self.me.y, self.map, self.fuel_map, self.karbonite_map, self.getVisibleRobotMap())];
                }
            }

            let needToMove = false;
            if (p_target[0] == CONSTANTS.MINE &&
                (self.me.x != p_target[0] || self.me.y != p_target[1])) {
                needToMove = true;
                for (const dir of CIRCLES[2]) {
                    if (self.me.x + dir[0] == p_target[0] && self.me.y + dir[1] == p_target[0]) {
                        if (self.getVisibleRobotMap()[p_target[1]][p_target[0]] < 1) {
                            self.castleTalk(COMM8.PILGRIM_REACHED)
                        }
                    }
                }
            } else if ((p_target[0] == CONSTANTS.BUILD || p_target[0] == CONSTANTS.DEPOSIT) &&
                (self.me.x - p_target[0])**2 + (self.me.y - p_target[1])**2 > 2) {
                needToMove = true;
            } else if (p_target[0] == CONSTANTS.FLEE &&
                (self.me.x - p_target[0])**2 + (self.me.y - p_target[1])**2 > 9) {
                needToMove = true;
                for (const dir of CIRCLES[2]) {
                    if (self.me.x + dir[0] == p_target[0] && self.me.y + dir[1] == p_target[0]) {
                        if (self.getVisibleRobotMap()[p_target[1]][p_target[0]] < 1) {
                            self.castleTalk(COMM8.PILGRIM_REACHED)
                        }
                    }
                }
            }

            if (needToMove) {
                move_towards(); // TODO: MOVE TOWARDS DESTINATION
            } else {
                if (p_target[0] == CONSTANTS.MINE) {
                    self.mine()
                } else if (p_target[0] == CONSTANTS.FLEE) {
                    p_target = [null];
                } else if (p_target[0] == CONSTANTS.DEPOSIT) {
                    if (minelocation !== null) {
                        p_target = [CONSTANTS.MINE, minelocation]
                    } else {
                        p_target = [null];
                    }
                    self.give(p_target[0]-self.me.x, p_target[1]-self.me.y, self.karbonite, self.fuel)
                } else if (p_target[0] == CONSTANTS.BUILD) {
                    if (self.getVisibleRobotMap()[p_target[1]][p_target[0]] < 1) { // location is free
                        if (self.karbonite > SPECS.UNITS[SPECS.PILGRIM].CONSTRUCTION_KARBONITE &&
                            self.fuel > SPECS.UNITS[SPECS.PILGRIM].CONSTRUCTION_FUEL) { // we have the resources
                            p_target = [CONSTANTS.DEPOSIT, p_target[1]];
                            self.buildUnit(SPECS.CHURCH, p_target[0]-self.me.x, p_target[1]-self.me.y);
                        }
                    }
                }
            }



        }

        // If the unit is a Pilgrim
        /*
        */


        // If the unit can move, and is newly created, wait until
        // it knows where to go. Once it knows, do the following:
        /*
        if (enemy in range){
            SEND DISTRESS SIGNAL
            } if (at castle) {
                DEFEND
            } else {
                RUN TO NEAREST CASTLE
            }
        } else {
            if (can or must deposit resources) {
                deposit resources
            }
            if (need to go somewhere) {
                HEAD TOWARDS LOCATION (if military, slowly, if pilgrim, faster)
            } else if (just reached location) {
                TELL CASTLES WHERE U are + CLAIM RESOURCES / CASTLES
            } else if (need to build a castle nearby) {
                BUILD A CASTLE NEARBY
            } else if pilgrim, and can mine {
                MINE
            }
        }
        */

    }
}

var robot = new MyRobot();

/*
        /*
        if (first move){
            send NEWPILGRIM
            target = null;
            minelocation = null;

            castleloc = CASTLE LOCATION
        }

        if (signals in range) {
            if (signal == GOTO) {
                set target to MINE,minelocation
                set minelocation to location
            }
        }

        if (enemy in range) {
            SEND DISTRESS SIGNAL
            } if (can't see a castle) {
                set target to FLEE,castle
                set minelocation to null;
            }
        } else if (must deposit resources && target != FLEE) {
            if (castle/church nearby) {
                set target to DEPOSIT,castle/church
            else {
                set target to BUILD,church nearby
            }
        }

        if (target location != or adjacent to current location) {
            if (moving will make you reach your location) {
                if (target == MINE || target == FLEE) {
                    SEND PREACHER_REACHED signal.
                }
            }
            MOVE towards location.
        } else {
            if (target == MINE) {
                MINE // you're on top of the mine
            } else if (target == FLEE) {
                set target to null; // you've gotten where you need to go
            } else if (target == DEPOSIT) {
                if (minelocation !== null) {
                    set target to MINE,minelocation
                } else {
                    set target to null
                }
                DEPOSIT
            } else if (target == BUILD) {
                set target to DEPOSIT,build_location
                BUILD
            }
        }
*/
