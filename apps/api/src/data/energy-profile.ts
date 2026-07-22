type EnergySeed = {
  firstName?: string;
  lastName?: string;
  zodiacSign?: string;
  birthDate?: string;
  focusAreas?: string[];
};

export interface EnergyProfile {
  sign: string;
  element: string;
  modality: string;
  rulingPlanet: string;
  powerColorName: string;
  powerColorHex: string;
  powerDay: string;
  energyNumber: number;
  energyStone: string;
  chakra: string;
  ritual: string;
  affirmation: string;
  focusArea: string;
  energyTheme: string;
}

const zodiacRules: Record<
  string,
  Omit<EnergyProfile, "affirmation">
> = {
  Aries: {
    sign: "Aries",
    element: "Fuego",
    modality: "Cardinal",
    rulingPlanet: "Marte",
    powerColorName: "Rojo",
    powerColorHex: "#B63A3A",
    powerDay: "Martes",
    energyNumber: 9,
    energyStone: "Jaspe Rojo",
    chakra: "Raíz",
    ritual:
      "1. Enciende una vela roja o toca un objeto rojo. 2. Respira 3 veces con los pies firmes. 3. Escribe una acción valiente y hazla hoy.",
    focusArea: "Fuerza, valentía, liderazgo y protección.",
    energyTheme: "Hoy tu energía se activa con Fuego, Marte y el chakra Raíz.",
  },
  Tauro: {
    sign: "Tauro",
    element: "Tierra",
    modality: "Fijo",
    rulingPlanet: "Venus",
    powerColorName: "Verde",
    powerColorHex: "#5E7C57",
    powerDay: "Viernes",
    energyNumber: 6,
    energyStone: "Cuarzo Rosa",
    chakra: "Corazón",
    ritual:
      "1. Coloca una moneda, semilla o piedra verde frente a ti. 2. Agradece 3 cosas concretas. 3. Ordena un pequeño espacio para abrir prosperidad.",
    focusArea: "Prosperidad, estabilidad, abundancia y bienestar.",
    energyTheme: "Hoy tu energía se sostiene con Tierra, Venus y el chakra Corazón.",
  },
  Géminis: {
    sign: "Géminis",
    element: "Aire",
    modality: "Mutable",
    rulingPlanet: "Mercurio",
    powerColorName: "Amarillo",
    powerColorHex: "#D0A13B",
    powerDay: "Miércoles",
    energyNumber: 5,
    energyStone: "Ágata",
    chakra: "Garganta",
    ritual:
      "1. Escribe la pregunta que te dispersa. 2. Respira 3 veces. 3. Respóndela con una sola frase y convierte esa claridad en un mensaje o apunte.",
    focusArea: "Comunicación, creatividad y aprendizaje.",
    energyTheme: "Hoy tu energía se mueve con Aire, Mercurio y el chakra Garganta.",
  },
  Cáncer: {
    sign: "Cáncer",
    element: "Agua",
    modality: "Cardinal",
    rulingPlanet: "Luna",
    powerColorName: "Blanco",
    powerColorHex: "#F7F2E8",
    powerDay: "Lunes",
    energyNumber: 2,
    energyStone: "Piedra Luna",
    chakra: "Corazón",
    ritual:
      "1. Llena un vaso con agua. 2. Sosténlo junto al pecho y nombra lo que necesitas soltar. 3. Vacía el agua y abraza tu cuerpo 30 segundos.",
    focusArea: "Sanación emocional y protección familiar.",
    energyTheme: "Hoy tu energía se sensibiliza con Agua, la Luna y el chakra Corazón.",
  },
  Leo: {
    sign: "Leo",
    element: "Fuego",
    modality: "Fijo",
    rulingPlanet: "Sol",
    powerColorName: "Dorado",
    powerColorHex: "#D99A2B",
    powerDay: "Domingo",
    energyNumber: 1,
    energyStone: "Ojo de tigre",
    chakra: "Plexo Solar",
    ritual:
      "1. Mira una luz cálida o el sol indirecto. 2. Di en voz alta una cualidad tuya. 3. Haz una acción visible sin pedir permiso.",
    focusArea: "Éxito, autoestima, liderazgo y reconocimiento.",
    energyTheme: "Hoy tu energía irradia con Fuego, el Sol y el chakra Plexo Solar.",
  },
  Virgo: {
    sign: "Virgo",
    element: "Tierra",
    modality: "Mutable",
    rulingPlanet: "Mercurio",
    powerColorName: "Verde Oliva",
    powerColorHex: "#7A8C5A",
    powerDay: "Miércoles",
    energyNumber: 5,
    energyStone: "Amazonita",
    chakra: "Garganta",
    ritual:
      "1. Limpia una superficie pequeña. 2. Coloca allí tu piedra o un objeto claro. 3. Escribe tres pendientes y termina el más simple.",
    focusArea: "Organización, limpieza energética y salud.",
    energyTheme: "Hoy tu energía se ordena con Tierra, Mercurio y el chakra Garganta.",
  },
  Libra: {
    sign: "Libra",
    element: "Aire",
    modality: "Cardinal",
    rulingPlanet: "Venus",
    powerColorName: "Rosa",
    powerColorHex: "#C98095",
    powerDay: "Viernes",
    energyNumber: 6,
    energyStone: "Cuarzo rosa",
    chakra: "Corazón",
    ritual:
      "1. Enciende una vela rosa o mira un objeto bello. 2. Respira equilibrando inhalación y exhalación. 3. Envía un mensaje amable o define un límite.",
    focusArea: "Amor, armonía y equilibrio.",
    energyTheme: "Hoy tu energía armoniza con Aire, Venus y el chakra Corazón.",
  },
  Escorpio: {
    sign: "Escorpio",
    element: "Agua",
    modality: "Fijo",
    rulingPlanet: "Plutón",
    powerColorName: "Negro",
    powerColorHex: "#1F1D2B",
    powerDay: "Martes",
    energyNumber: 8,
    energyStone: "Obsidiana",
    chakra: "Sacro",
    ritual:
      "1. Escribe lo que ya terminó. 2. Dobla el papel y guárdalo fuera de vista. 3. Lava tus manos imaginando cierre y protección.",
    focusArea: "Transformación, protección y renacimiento.",
    energyTheme: "Hoy tu energía transforma con Agua, Plutón y el chakra Sacro.",
  },
  Sagitario: {
    sign: "Sagitario",
    element: "Fuego",
    modality: "Mutable",
    rulingPlanet: "Júpiter",
    powerColorName: "Morado",
    powerColorHex: "#6759AA",
    powerDay: "Jueves",
    energyNumber: 3,
    energyStone: "Amatista",
    chakra: "Tercer Ojo",
    ritual:
      "1. Coloca una vela morada o una amatista. 2. Escribe una intención de expansión. 3. Da un paso concreto: estudiar, preguntar o planear una ruta.",
    focusArea: "Expansión, sabiduría y prosperidad.",
    energyTheme: "Hoy tu energía expande con Fuego, Júpiter y el chakra Tercer Ojo.",
  },
  Capricornio: {
    sign: "Capricornio",
    element: "Tierra",
    modality: "Cardinal",
    rulingPlanet: "Saturno",
    powerColorName: "Gris",
    powerColorHex: "#4B5563",
    powerDay: "Sábado",
    energyNumber: 4,
    energyStone: "Ónix",
    chakra: "Raíz",
    ritual:
      "1. Ordena tu mesa por 3 minutos. 2. Escribe una meta y el primer paso medible. 3. Cierra con una respiración lenta tocando el suelo.",
    focusArea: "Disciplina, estabilidad y éxito profesional.",
    energyTheme: "Hoy tu energía se estructura con Tierra, Saturno y el chakra Raíz.",
  },
  Acuario: {
    sign: "Acuario",
    element: "Aire",
    modality: "Fijo",
    rulingPlanet: "Urano",
    powerColorName: "Azul Eléctrico",
    powerColorHex: "#2677C9",
    powerDay: "Sábado",
    energyNumber: 7,
    energyStone: "Fluorita",
    chakra: "Corona",
    ritual:
      "1. Apaga una distracción por 5 minutos. 2. Escribe una idea distinta sin corregirla. 3. Compártela o conviértela en una miniacción.",
    focusArea: "Innovación, creatividad e inspiración.",
    energyTheme: "Hoy tu energía innova con Aire, Urano y el chakra Corona.",
  },
  Piscis: {
    sign: "Piscis",
    element: "Agua",
    modality: "Mutable",
    rulingPlanet: "Neptuno",
    powerColorName: "Turquesa",
    powerColorHex: "#35B7B2",
    powerDay: "Jueves",
    energyNumber: 12,
    energyStone: "Aguamarina",
    chakra: "Corona",
    ritual:
      "1. Pon música suave o silencio. 2. Respira con una mano en el pecho. 3. Anota un sueño, señal o intuición y elige una acción compasiva.",
    focusArea: "Espiritualidad, intuición y conexión interior.",
    energyTheme: "Hoy tu energía conecta con Agua, Neptuno y el chakra Corona.",
  },
};

const signOrder = [
  "Aries",
  "Tauro",
  "Géminis",
  "Cáncer",
  "Leo",
  "Virgo",
  "Libra",
  "Escorpio",
  "Sagitario",
  "Capricornio",
  "Acuario",
  "Piscis",
];

function normalizeComparable(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function normalizeSign(value?: string): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return "";
  }

  const match = signOrder.find(
    (item) => normalizeComparable(item) === normalizeComparable(trimmed),
  );
  return match ?? trimmed;
}

function buildAffirmation(
  sign: string,
  focusArea: string,
  energyNumber: number,
): string {
  const normalizedFocus = focusArea.replace(/[.!?]+$/g, "").trim();
  const focusFragment =
    normalizedFocus.length > 0 ? ` en ${normalizedFocus.toLowerCase()}` : "";
  return `Canalizo la energía de ${sign.toLowerCase()} con claridad${focusFragment} y activo mi número ${energyNumber}.`;
}

export function buildEnergyProfile(seed: EnergySeed): EnergyProfile {
  const sign = normalizeSign(seed.zodiacSign) || "Sagitario";
  const rule = zodiacRules[sign] ?? zodiacRules.Sagitario;
  const focusArea =
    seed.focusAreas?.find((item) => item.trim().length > 0)?.trim() ||
    rule.focusArea;

  return {
    ...rule,
    focusArea,
    affirmation: buildAffirmation(rule.sign, focusArea, rule.energyNumber),
  };
}
