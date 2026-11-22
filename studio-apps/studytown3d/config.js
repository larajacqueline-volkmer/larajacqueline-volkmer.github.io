
window.CONFIG = (function(){
  const AVATARS = {
    robot:          'assets/avatars/Robot.png',
    girlAvatar:     'assets/avatars/GirlAvatar.png',
    penguin:        'assets/avatars/Penguin.png',
    car:            'assets/avatars/Car.png',
    princessPeach:  'assets/avatars/PrincessPeach.png',
    trophyPinkBall: 'assets/avatars/TrophyPinkball.png',
    goldenTrophy:   'assets/avatars/GoldenTrophy.png',
  };

  const TEX = {
    glass: 'assets/textures/glass_facade.png',
    grass: 'assets/textures/grassland_panorama.png',
    neon:  'assets/textures/neon_room.png',
    pave:  'assets/textures/paving_herringbone.png',
    roof:  'assets/textures/roof.png',
  };

  // Fallback module list to avoid CORS issues when opening file://
  const MODULES_FALLBACK = [
  {
    "name": "Grundlagen der industriellen Softwaretechnik",
    "status": "todo"
  },
  {
    "name": "Medienpsychologie",
    "status": "todo"
  },
  {
    "name": "Projekt: Design Thinking",
    "status": "todo"
  },
  {
    "name": "Objektorientierte Programmierung",
    "status": "todo"
  },
  {
    "name": "Digitale Medienformate",
    "status": "todo"
  },
  {
    "name": "Mathematik Grundlagen I",
    "status": "todo"
  },
  {
    "name": "Einführung in das wissenschaftliche Arbeiten für IT und Technik",
    "status": "todo"
  },
  {
    "name": "Requirements Engineering",
    "status": "todo"
  },
  {
    "name": "Einführung in das Internet of Things",
    "status": "todo"
  },
  {
    "name": "Gestaltung und Ergonomie von User Interfaces",
    "status": "todo"
  },
  {
    "name": "Medienplattformen und -systeme",
    "status": "todo"
  },
  {
    "name": "Designgrundlagen: Sehen und Verstehen",
    "status": "todo"
  },
  {
    "name": "Datenmodellierung und Datenbanksysteme",
    "status": "todo"
  },
  {
    "name": "Betriebssysteme, Rechnernetze und verteilte Systeme",
    "status": "todo"
  },
  {
    "name": "Qualitätssicherung im Softwareprozess",
    "status": "todo"
  },
  {
    "name": "Data Analytics und Big Data",
    "status": "todo"
  },
  {
    "name": "Digitale Medienproduktion",
    "status": "todo"
  },
  {
    "name": "Wahlpflichtmodule B: Marktpsychologie, Werbepsychologie",
    "status": "todo"
  },
  {
    "name": "Gestaltung interaktiver Medien",
    "status": "todo"
  },
  {
    "name": "Statistik 1",
    "status": "todo"
  },
  {
    "name": "Statistik 2",
    "status": "todo"
  },
  {
    "name": "Programmierung von industriellen Informationssystemen mit Java EE",
    "status": "todo"
  },
  {
    "name": "Programmierung von Webanwendungsoberflächen",
    "status": "todo"
  },
  {
    "name": "IT-Recht",
    "status": "todo"
  },
  {
    "name": "Medienrecht",
    "status": "todo"
  },
  {
    "name": "Seminar: Gesellschaft und Digitale Medien",
    "status": "todo"
  },
  {
    "name": "Projekt Medieninformatik",
    "status": "todo"
  },
  {
    "name": "Digitale Business-Modelle",
    "status": "todo"
  },
  {
    "name": "Digital Publishing",
    "status": "todo"
  },
  {
    "name": "IT-Projektmanagement",
    "status": "todo"
  },
  {
    "name": "Wahlpflichtmodule A",
    "status": "todo"
  },
  {
    "name": "Media Engineering",
    "status": "todo"
  },
  {
    "name": "Bachelorarbeit",
    "status": "todo"
  },
  {
    "name": "Erfolgreiche Bachelorette",
    "status": "todo"
  }
];

  return {
    CAMERA_START: {x: 160, y: 140, z: 220},
    CAMERA_HOME:  {x: 0,   y: 180, z: 280},
    CONTROLS: {
      damping: 0.08,
      maxPolar: Math.PI*0.49,
      minDistance: 40,
      maxDistance: 400,
    },
    RING: {
      width:  320,
      height: 220,
      road:   26,   // Straßenbreite
      sidewalk: 10, // Gehweg mit Spielplättchen
      zebraEverySide: 1,
    },
    BUILDING: {
      w: 16, d: 16, minH: 16, maxH: 46
    },
    COLORS: {
      pink: 0xff69c7,
      purple: 0x9b6bff,
      blue: 0x7bbcff,
      gold: 0xffc94d
    },
    AVATARS, TEX, MODULES_FALLBACK
  };
})();