import {SPECS} from 'battlecode';
// church, castle

function find_enemy_castle_location(self) {
  figure out symmetry using self.pass_map {
    return location of castle that is symmetric to self.me
  }
}

initialPartyPilgrims = 2;
initialPartyPreachers = 1;
class CastleManager(){
  function init() {
    this.initialPilgrims = 2;
    this.initialPreachers = 1;
    this.haveToBuildCrusader = false;
  }
  function step() {
    if (haveToBuildCrusader){
      this.haveToBuildCrusader = false;
      signal(ESCORT: pilgrim that was assigned to something)
      buildCrusader
    }
    
    for (signal in signals) {
      if castletalks tell it to subtract initial units {
        subtract from initalPilgrims or initialPreachers
      }
    }
    
    if (have to build initialPilgrims) {
      this.haveToBuildCrusader = true;
      castletalk(built_pilgrim)
      signal(preacher_location)
      build initial pilgrim
    } else if (have to build initialPreacher) {
      castletalk(built_preacher)
      signal(ATTACK: find_enemy_castle_location() to the preacher)
      build initial preacher
    }


  }

}

class ChurchManager(){

}