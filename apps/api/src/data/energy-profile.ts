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
  energyNumber: number;
  energyStone: string;
  ritual: string;
  affirmation: string;
  focusArea: string;
  energyTheme: string;
}

const zodiacRules: Record<
  string,
  Omit<EnergyProfile, "energyNumber" | "focusArea" | "affirmation">
> = {
  Aries: {
    sign: "Aries",
    element: "Fuego",
    modality: "Cardinal",
    rulingPlanet: "Marte",
    powerColorName: "Rojo ritual",
    powerColorHex: "#B63A3A",
    energyStone: "Cornalina",
    ritual: "Respiración activa, intención concreta y una acción valiente antes del mediodía.",
    energyTheme: "Iniciativa y coraje enfocado.",
  },
  Tauro: {
    sign: "Tauro",
    element: "Tierra",
    modality: "Fijo",
    rulingPlanet: "Venus",
    powerColorName: "Verde musgo",
    powerColorHex: "#5E7C57",
    energyStone: "Cuarzo verde",
    ritual: "Contacto con el cuerpo, pausa sensorial y orden suave de tu espacio.",
    energyTheme: "Estabilidad, placer y arraigo.",
  },
  Géminis: {
    sign: "Géminis",
    element: "Aire",
    modality: "Mutable",
    rulingPlanet: "Mercurio",
    powerColorName: "Amarillo aura",
    powerColorHex: "#D0A13B",
    energyStone: "Citrino",
    ritual: "Escribe tres ideas clave y elige una sola dirección para hoy.",
    energyTheme: "Claridad mental y movimiento inteligente.",
  },
  Cáncer: {
    sign: "Cáncer",
    element: "Agua",
    modality: "Cardinal",
    rulingPlanet: "Luna",
    powerColorName: "Perla lunar",
    powerColorHex: "#A8B8D8",
    energyStone: "Piedra luna",
    ritual: "Agua, silencio breve y cuidado emocional antes de responder a todo.",
    energyTheme: "Contención, intuición y hogar interno.",
  },
  Leo: {
    sign: "Leo",
    element: "Fuego",
    modality: "Fijo",
    rulingPlanet: "Sol",
    powerColorName: "Dorado solar",
    powerColorHex: "#D99A2B",
    energyStone: "Ojo de tigre",
    ritual: "Enciende una luz, endereza tu postura y recuerda qué quieres irradiar.",
    energyTheme: "Presencia, expresión y confianza.",
  },
  Virgo: {
    sign: "Virgo",
    element: "Tierra",
    modality: "Mutable",
    rulingPlanet: "Mercurio",
    powerColorName: "Oliva sagrada",
    powerColorHex: "#7A8C5A",
    energyStone: "Ágata musgo",
    ritual: "Limpieza ligera, lista corta y una mejora concreta en tu rutina.",
    energyTheme: "Orden útil y servicio consciente.",
  },
  Libra: {
    sign: "Libra",
    element: "Aire",
    modality: "Cardinal",
    rulingPlanet: "Venus",
    powerColorName: "Rosa templo",
    powerColorHex: "#C98095",
    energyStone: "Cuarzo rosa",
    ritual: "Busca armonía visual, regula el tono de tus vínculos y decide sin postergar.",
    energyTheme: "Armonía, belleza y equilibrio relacional.",
  },
  Escorpio: {
    sign: "Escorpio",
    element: "Agua",
    modality: "Fijo",
    rulingPlanet: "Plutón",
    powerColorName: "Borgoña profundo",
    powerColorHex: "#6E2C4D",
    energyStone: "Obsidiana",
    ritual: "Escritura íntima, corte de ruido y una decisión transformadora.",
    energyTheme: "Transformación, magnetismo e intensidad consciente.",
  },
  Sagitario: {
    sign: "Sagitario",
    element: "Fuego",
    modality: "Mutable",
    rulingPlanet: "Júpiter",
    powerColorName: "Violeta viajero",
    powerColorHex: "#6759AA",
    energyStone: "Amatista",
    ritual: "Expande tu mirada, define una verdad guía y da un paso con fe.",
    energyTheme: "Expansión, sentido y visión.",
  },
  Capricornio: {
    sign: "Capricornio",
    element: "Tierra",
    modality: "Cardinal",
    rulingPlanet: "Saturno",
    powerColorName: "Grafito místico",
    powerColorHex: "#4B5563",
    energyStone: "Onix",
    ritual: "Prioriza, estructura y honra el avance lento pero sólido.",
    energyTheme: "Disciplina, estructura y maestría.",
  },
  Acuario: {
    sign: "Acuario",
    element: "Aire",
    modality: "Fijo",
    rulingPlanet: "Urano",
    powerColorName: "Turquesa eléctrico",
    powerColorHex: "#3D8FA1",
    energyStone: "Aguamarina",
    ritual: "Despega de la inercia, cambia un patrón y comparte una idea nueva.",
    energyTheme: "Originalidad, libertad y visión colectiva.",
  },
  Piscis: {
    sign: "Piscis",
    element: "Agua",
    modality: "Mutable",
    rulingPlanet: "Neptuno",
    powerColorName: "Lavanda oceánica",
    powerColorHex: "#8D88C7",
    energyStone: "Amatista",
    ritual: "Música suave, pausa contemplativa y escucha de tu intuición.",
    energyTheme: "Sensibilidad, compasión e inspiración.",
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

function normalizeBirthDate(value?: string): string {
  const trimmed = value?.trim() ?? "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  return "";
}

function inferLifePathNumber(birthDate?: string): number {
  const normalized = normalizeBirthDate(birthDate);
  if (!normalized) {
    return 7;
  }

  const digits = normalized.replaceAll("-", "").split("").map(Number);
  let total = digits.reduce((sum, item) => sum + item, 0);
  while (total > 9 && total !== 11 && total !== 22 && total !== 33) {
    total = String(total)
      .split("")
      .map(Number)
      .reduce((sum, item) => sum + item, 0);
  }

  if (total > 9) {
    return total % 9 === 0 ? 9 : total % 9;
  }

  return Math.max(1, total);
}

function normalizeSign(value?: string): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return "";
  }

  const match = signOrder.find(
    (item) => item.toLowerCase() === trimmed.toLowerCase(),
  );
  return match ?? trimmed;
}

function buildAffirmation(
  sign: string,
  focusArea: string,
  lifePathNumber: number,
): string {
  const focusFragment =
    focusArea.length > 0 ? ` en ${focusArea.toLowerCase()}` : "";
  return `Canalizo lo mejor de ${sign.toLowerCase()} con claridad${focusFragment} y sostengo mi camino ${lifePathNumber}.`;
}

export function buildEnergyProfile(seed: EnergySeed): EnergyProfile {
  const sign = normalizeSign(seed.zodiacSign) || "Sagitario";
  const rule = zodiacRules[sign] ?? zodiacRules.Sagitario;
  const focusArea = seed.focusAreas?.find((item) => item.trim().length > 0)?.trim() || "tu proceso actual";
  const energyNumber = inferLifePathNumber(seed.birthDate);

  return {
    ...rule,
    energyNumber,
    focusArea,
    affirmation: buildAffirmation(rule.sign, focusArea, energyNumber),
  };
}
