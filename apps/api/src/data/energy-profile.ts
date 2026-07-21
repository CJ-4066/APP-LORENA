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
  Omit<EnergyProfile, "focusArea" | "affirmation">
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
    ritual: "Fuerza, valentía, liderazgo y protección.",
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
    ritual: "Prosperidad, estabilidad, abundancia y bienestar.",
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
    ritual: "Comunicación, creatividad y aprendizaje.",
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
    ritual: "Sanación emocional y protección familiar.",
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
    ritual: "Éxito, autoestima, liderazgo y reconocimiento.",
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
    ritual: "Organización, limpieza energética y salud.",
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
    ritual: "Amor, armonía y equilibrio.",
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
    ritual: "Transformación, protección y renacimiento.",
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
    ritual: "Expansión, sabiduría y prosperidad.",
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
    ritual: "Disciplina, estabilidad y éxito profesional.",
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
    ritual: "Innovación, creatividad e inspiración.",
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
    ritual: "Espiritualidad, intuición y conexión interior.",
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
  const focusFragment =
    focusArea.length > 0 ? ` en ${focusArea.toLowerCase()}` : "";
  return `Canalizo la energía de ${sign.toLowerCase()} con claridad${focusFragment} y activo mi número ${energyNumber}.`;
}

export function buildEnergyProfile(seed: EnergySeed): EnergyProfile {
  const sign = normalizeSign(seed.zodiacSign) || "Sagitario";
  const rule = zodiacRules[sign] ?? zodiacRules.Sagitario;
  const focusArea = seed.focusAreas?.find((item) => item.trim().length > 0)?.trim() || rule.ritual;

  return {
    ...rule,
    focusArea,
    affirmation: buildAffirmation(rule.sign, focusArea, rule.energyNumber),
  };
}
