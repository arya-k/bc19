import {BCAbstractRobot, SPECS} from 'battlecode';

var built = false;
var step = -1;
var visibleRobots = null
var visibleRobotMap = null
var map = null
var kMap = null
var fMap = null
//Resource bot, hog resource depots 

class MyRobot extends BCAbstractRobot {
    turn() {
        step++;
        visibleRobots = this.getVisibleRobots();
        visibleRobotMap = this.getVisibleRobotMap();
        map = this.getPassableMap();
        kMap = this.getKarboniteMap();
        fMap = this.getFuelMap();

        if (this.me.unit === SPECS.PILGRIM) {
            // this.log("Pilgrim health: " + this.me.health);
            const choices = [[0,-1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
            const choice = choices[Math.floor(Math.random()*choices.length)]
            return this.move(...choice);
        }

        else if (this.me.unit === SPECS.CRUSADER) {
            // this.log("Crusader health: " + this.me.health);
            const choices = [[0,-1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
            const choice = choices[Math.floor(Math.random()*choices.length)]
            return this.move(...choice);
        }

        else if (this.me.unit === SPECS.PROPHET) {
            // this.log("Prophet health: " + this.me.health);
            const choices = [[0,-1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
            const choice = choices[Math.floor(Math.random()*choices.length)]
            return this.move(...choice);
        }

        else if (this.me.unit === SPECS.PREACHER) {
            // this.log("Preacher health: " + this.me.health);
            const choices = [[0,-1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
            const choice = choices[Math.floor(Math.random()*choices.length)]
            return this.move(...choice);
        }

        else if (this.me.unit === SPECS.CASTLE) {
            if (step % 10 === 0) {
                //this.log("Building a crusader at " + (this.me.x+1) + ", " + (this.me.y+1));
                const choice = Math.floor(Math.random()*choices.length)
                return this.buildUnit(SPECS.CRUSADER, 1, 1);
            } else {
                return // this.log("Castle health: " + this.me.health);
            }
        }

        else if (this.me.unit === SPECS.CHURCH) {
            if (step % 10 === 0) {
                //this.log("Building a crusader at " + (this.me.x+1) + ", " + (this.me.y+1));
                const choice = choices[Math.floor(Math.random()*choices.length)]
                return this.buildUnit(SPECS.CRUSADER, 1, 1);
            } else {
                return // this.log("Castle health: " + this.me.health);
            }
        }

    }
}

var robot = new MyRobot();
