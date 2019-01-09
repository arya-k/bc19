import {BCAbstractRobot, SPECS} from 'battlecode';
import {create_resource_map} from './path.js';

// Turtling Robot. Tries to defend the castles, and always runs away.


/* INITIALIZE VARIABLES */
var step = -1;


/* MAIN CODE */
class MyRobot extends BCAbstractRobot {
    turn() {
        step++;

        // If the unit is a castle:
        /*
        if (enemyMap not created){
            CREATE ENEMY_MAP
        }
        if (resourceMap not created){
            CREATE resourceMap
        }

        status = null;
        for (each robot's signal) {
            if (DISTRESS signal) {
                update ENEMY_MAP
                update RESOURCE_MAP if resources no longer being mined
                status = DEFEND
            } else if (UPDATE signal) {
                update resourceMap
            }
        }

        if (status = null and resource spots open) {
            status = GATHER
        } else {
            status = DEFEND
        }

        if (status == GATHER) {
            SEND a pilgrim if missing pilgrims, or warrior if missing warriors
            to the futhest non-fulfilled resource.
        } else if (status == DEFEND) {
            SEND a warrior to the least defended castle.
        }



        // If the unit can move, and is newly created, wait until
        // it knows where to go. Once it knows, do the following:
        /*
        if (enemy in range){
            SEND DISTRESS SIGNAL + ACTION TAKEN
            if (can defend resources){
                DEFEND RESOURCES
            } else if (at castle){
                DEFEND ANYWAY
            } else (pilgrims always do this) {
                RUN TO NEAREST CASTLE
            }
        } else {
            if (need to go somewhere) {
                HEAD TOWARDS LOCATION (if military, slowly, if pilgrim, faster)
            } else if (just reached location) {
                TELL CASTLES WHERE U are + CLAIM RESOURCES / CASTLES
            } else if (need to build a castle nearby) {
                BUILD A CASTLE NEARBY
            } else if (need to deposit resources) {
                DEPOSIT RESOURCES TO NEAREST CHURCH/CASTLE
            } else if pilgrim, and can mine {
                MINE
            }
        }
        */

    }
}

var robot = new MyRobot();
