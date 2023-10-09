const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyC5d4WwcPNe8kHoYurl5qBm9HBF3hRTPMU',
  authDomain: 'ligamx-b16f7.firebaseapp.com',
  databaseURL: 'https://ligamx-b16f7-default-rtdb.firebaseio.com',
  projectId: 'ligamx-b16f7',
  storageBucket: 'ligamx-b16f7.appspot.com',
  messagingSenderId: '363875455177',
  appId: '1:363875455177:web:f96a1cd9f9863cac967d18',
  measurementId: 'G-VKRRB5SGHD',
};

const LIGUILLA = {
  playIn1: {
    id: 153,
    local: 6,
    visitante: 7,
  },
  playIn2: {
    id: 154,
    local: 8,
    visitante: 9,
  },
  playOff3: {
    id: 155,
  },
  quarter1: {
    ida: {
      id: 156,
    },
    vuelta: {
      id: 160,
    },
  },
  quarter2: {
    ida: {
      id: 157,
    },
    vuelta: {
      id: 161,
    },
  },
  quarter3: {
    ida: {
      id: 158,
    },
    vuelta: {
      id: 162,
    },
  },
  quarter4: {
    ida: {
      id: 159,
    },
    vuelta: {
      id: 163,
    },
    semi1: {
      ida: {
        id: 164,
      },
      vuelta: {
        id: 166,
      },
    },
    semi2: {
      ida: {
        id: 165,
      },
      vuelta: {
        id: 167,
      },
    },
    final: {
      ida: {
        id: 168,
      },
      vuelta: {
        id: 169,
      },
    },
  },
};

const LOGOS = [
  { equipo: 'América', img: 'america' },
  { equipo: 'Atlas', img: 'atlas' },
  { equipo: 'Club Atlético de San Luis', img: 'clubAtleticoDeSanLuis' },
  { equipo: 'Cruz Azul', img: 'cruzAzul' },
  { equipo: 'FC Juárez', img: 'fcJuarez' },
  { equipo: 'Gallos Blancos de Querétaro', img: 'gallosBlancosDeQueretaro' },
  { equipo: 'Guadalajara', img: 'guadalajara' },
  { equipo: 'León', img: 'leon' },
  { equipo: 'Mazatlán FC', img: 'mazatlanFc' },
  { equipo: 'Monterrey', img: 'monterrey' },
  { equipo: 'Necaxa', img: 'necaxa' },
  { equipo: 'Pachuca', img: 'pachuca' },
  { equipo: 'Puebla F.C.', img: 'pueblaFc' },
  { equipo: 'Universidad Nacional', img: 'universidadNacional' },
  { equipo: 'Santos Laguna', img: 'santosLaguna' },
  { equipo: 'Tijuana', img: 'tijuana' },
  { equipo: 'Toluca', img: 'toluca' },
  { equipo: 'Tigres de la U.A.N.L.', img: 'tigresDeLaUanl' },
];

const JORNADA_LIGUILLA = [
  {id: 18, descripcion: "Playin 1"},
  {id: 19, descripcion: "Playin 2"},
  {id: 20, descripcion: "Cuartos de final"},
  {id: 21, descripcion: "Semifinal"},
  {id: 22, descripcion: "Final"},
]

export { FIREBASE_CONFIG, LIGUILLA, LOGOS };
