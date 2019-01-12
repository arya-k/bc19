
export CONSTANTS {
  // attacking troops:
  DEFENSE = 0,
  OFFENSE = 1,
  ESCORT = 2,

  ELIMINATED_ENEMY = 100,
  ABANDON_ESCORT = 101,

}

export COMM8 {
  BUILT_PILGRIM: 1,
  BUILT_CRUSADER: 2,
  BUILT_PREACHER: 3,
}

export COMM16 {
  // signalling communications
  ATTACK_HEADER: whatever 4 bit thing you want
  ATTACK: function(x, y) attack header + coords
  DECODE_ATTACK: function(signal) -> x, y
}