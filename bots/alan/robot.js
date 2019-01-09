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
        /*var i;
        for(i =0; i<visibleRobotMap.length; i++)
            this.log(visibleRobotMap[i]);*/
        if (map === null){
            map = this.getPassableMap();
            kMap = this.getKarboniteMap();
            fMap = this.getFuelMap();
        }
        this.log("Current location: (" + this.me.x + ", " + this.me.y + ")")

        if (this.me.unit === SPECS.PILGRIM) {
            this.log("Pilgrim health: " + this.me.health);
            const choices = [[0,-1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
            var choice = choices[Math.floor(Math.random()*choices.length)];

            while ([this.me.x + choice[0]] < 0 || [this.me.x + choice[0]] >= map[0].length ||
                [this.me.y + choice[1]] < 0 || [this.me.y + choice[1]] >= map.length ||
                !map[this.me.y + choice[1]][this.me.x + choice[0]] ||
                visibleRobotMap[this.me.y + choice[1]][this.me.x + choice[0]] != 0)
                choice = choices[Math.floor(Math.random()*choices.length)];

            return this.move(...choice);
        }

        else if (this.me.unit === SPECS.CRUSADER) {
            this.log("Crusader health: " + this.me.health);
            const choices = [[0,-1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
            var choice = choices[Math.floor(Math.random()*choices.length)];

            while ([this.me.x + choice[0]] < 0 || [this.me.x + choice[0]] >= map[0].length ||
                [this.me.y + choice[1]] < 0 || [this.me.y + choice[1]] >= map.length ||
                !map[this.me.y + choice[1]][this.me.x + choice[0]] ||
                visibleRobotMap[this.me.y + choice[1]][this.me.x + choice[0]] != 0)
                choice = choices[Math.floor(Math.random()*choices.length)];

            return this.move(...choice);
        }

        else if (this.me.unit === SPECS.PROPHET) {
            this.log("Prophet health: " + this.me.health);
            const choices = [[0,-1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
            var choice = choices[Math.floor(Math.random()*choices.length)];

            while ([this.me.x + choice[0]] < 0 || [this.me.x + choice[0]] >= map[0].length ||
                [this.me.y + choice[1]] < 0 || [this.me.y + choice[1]] >= map.length ||
                !map[this.me.y + choice[1]][this.me.x + choice[0]] ||
                visibleRobotMap[this.me.y + choice[1]][this.me.x + choice[0]] != 0)
                choice = choices[Math.floor(Math.random()*choices.length)];

            return this.move(...choice);
        }

        else if (this.me.unit === SPECS.PREACHER) {
            this.log("Preacher health: " + this.me.health);
            const choices = [[0,-1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
            var choice = choices[Math.floor(Math.random()*choices.length)];

            while ([this.me.x + choice[0]] < 0 || [this.me.x + choice[0]] >= map[0].length ||
                [this.me.y + choice[1]] < 0 || [this.me.y + choice[1]] >= map.length ||
                !map[this.me.y + choice[1]][this.me.x + choice[0]] ||
                visibleRobotMap[this.me.y + choice[1]][this.me.x + choice[0]] != 0)
                choice = choices[Math.floor(Math.random()*choices.length)];

            return this.move(...choice);
        }

        else if (this.me.unit === SPECS.CASTLE) {
            if (step % 10 === 0) {
                this.log("Castle health: " + this.me.health);
                //this.log("Building a crusader at " + (this.me.x+1) + ", " + (this.me.y+1));
                const choices = [[0,-1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
                const choice = Math.floor(Math.random()*4+2);
                var loc = [1,1]
                while ([this.me.x + loc[0]] < 0 || [this.me.x + loc[0]] >= map[0].length ||
                    [this.me.y + loc[1]] < 0 || [this.me.y + loc[1]] >= map.length ||
                    !map[this.me.y + loc[1]][this.me.x + loc[0]]||
                    visibleRobotMap[this.me.y + loc[1]][this.me.x + loc[0]] != 0)
                    loc = choices[Math.floor(Math.random()*choices.length)];

                if (this.karbonite < SPECS.UNITS[choice].CONSTRUCTION_KARBONITE || 
                    this.fuel < SPECS.UNITS[choice].CONSTRUCTION_FUEL)
                    return
                return this.buildUnit(choice, ...loc);
            } else {
                return // this.log("Castle health: " + this.me.health);
            }
        }

        else if (this.me.unit === SPECS.CHURCH) {
            if (step % 10 === 0) {
                this.log("Church health: " + this.me.health);
                //this.log("Building a crusader at " + (this.me.x+1) + ", " + (this.me.y+1));
                const choices = [[0,-1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
                const choice = Math.floor(Math.random()*4+2);
                var loc = [1,1]
                while ([this.me.x + loc[0]] < 0 || [this.me.x + loc[0]] >= map[0].length ||
                    [this.me.y + loc[1]] < 0 || [this.me.y + loc[1]] >= map.length ||
                    !map[this.me.y + loc[1]][this.me.x + loc[0]]||
                    visibleRobotMap[this.me.y + loc[1]][this.me.x + loc[0]] != 0)
                    loc = choices[Math.floor(Math.random()*choices.length)];
                if (this.karbonite < SPECS.UNITS[choice].CONSTRUCTION_KARBONITE || 
                    this.fuel < SPECS.UNITS[choice].CONSTRUCTION_FUEL)
                    return
                return this.buildUnit(choice, ...loc);
            } else {
                return // this.log("Castle health: " + this.me.health);
            }
        }

    }
}

var robot = new MyRobot();
