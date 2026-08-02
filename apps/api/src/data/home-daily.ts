import { buildTarotCardImagePath } from "./tarot-images.js";

export interface DailyCard {
  title: string;
  cardName: string;
  message: string;
  ritual: string;
  imageUrl: string;
}

export interface AstrologicalEnergy {
  title: string;
  summary: string;
  advice: string;
  intensity: string;
}

export interface DailyHomeContent {
  cardOfTheDay: DailyCard;
  astrologicalEnergy: AstrologicalEnergy;
}

type DailyCardSeed = Omit<DailyCard, "imageUrl">;

const dailyCards: DailyCardSeed[] = [
  {
    title: "Carta del día",
    cardName: "La Estrella",
    message:
      "Hoy conviene bajar el ruido, recuperar fe en tu proceso y tomar una acción pequeña pero coherente.",
    ritual:
      "1. Escribe una intención breve. 2. Respira 3 veces mirando esa frase. 3. Haz una acción pequeña antes del mediodía.",
  },
  {
    title: "Carta del día",
    cardName: "La Luna",
    message:
      "No todo se resuelve hoy. Observa lo que se repite y evita decidir desde la prisa.",
    ritual:
      "1. Anota una duda. 2. Deja el papel cerrado durante el día. 3. Revísalo al final y escribe la pista que apareció.",
  },
  {
    title: "Carta del día",
    cardName: "El Sol",
    message:
      "Se abre un día para mostrarte, pedir lo que quieres y actuar con más claridad.",
    ritual:
      "1. Nombra en voz alta lo que quieres mostrar. 2. Elige una acción visible de 10 minutos. 3. Hazla antes de distraerte.",
  },
  {
    title: "Carta del día",
    cardName: "La Templanza",
    message:
      "Hoy gana quien regula el ritmo. Ajusta expectativas y encuentra el punto medio.",
    ritual:
      "1. Bebe agua lentamente. 2. Inhala en 4 tiempos y exhala en 4. 3. Ajusta una expectativa antes de responder.",
  },
  {
    title: "Carta del día",
    cardName: "El Mago",
    message:
      "Tu ventaja hoy es elegir bien dónde pones la atención. Menos dispersión, más maniobra.",
    ritual:
      "1. Reúne lo necesario para una tarea. 2. Quita una distracción. 3. Trabaja 12 minutos sin cambiar de foco.",
  },
  {
    title: "Carta del día",
    cardName: "La Fuerza",
    message:
      "No necesitas empujar más fuerte; necesitas sostener lo importante con calma y firmeza.",
    ritual:
      "1. Pon una mano en el pecho. 2. Respira 3 veces sin apurar. 3. Responde desde calma a una decisión exigente.",
  },
  {
    title: "Carta del día",
    cardName: "El Mundo",
    message:
      "Hay cierres y completitudes disponibles. Ordena lo pendiente para pasar al siguiente nivel.",
    ritual:
      "1. Elige una tarea antigua. 2. Ciérrala o define su último paso. 3. Limpia tu espacio al terminar.",
  },
  {
    title: "Carta del día",
    cardName: "La Sacerdotisa",
    message:
      "Hoy vale más observar que explicar. La respuesta madura si le das espacio.",
    ritual:
      "1. Guarda silencio 2 minutos. 2. Escribe la primera intuición que aparezca. 3. Léela al final del día antes de actuar.",
  },
];

const astrologicalEnergies: AstrologicalEnergy[] = [
  {
    title: "Energía astrológica",
    summary:
      "La Luna favorece conversaciones honestas, cierre emocional y orden interno.",
    advice: "No fuerces definiciones si todavía necesitas más contexto.",
    intensity: "media-alta",
  },
  {
    title: "Energía astrológica",
    summary:
      "El día empuja a moverte con iniciativa, pero sin perder tacto en el trato.",
    advice: "Ve paso a paso y evita decidir solo por impulso.",
    intensity: "media",
  },
  {
    title: "Energía astrológica",
    summary:
      "Hay claridad para ordenar pendientes, redefinir prioridades y simplificar ruido.",
    advice: "Saca de en medio una sola cosa que ya no aporte.",
    intensity: "media-alta",
  },
  {
    title: "Energía astrológica",
    summary:
      "Se suavizan los bordes y se vuelve más fácil escuchar antes de reaccionar.",
    advice: "Toma una pausa real antes de responder mensajes importantes.",
    intensity: "suave",
  },
  {
    title: "Energía astrológica",
    summary:
      "La energía favorece foco y ejecución, sobre todo si conviertes ideas en una acción concreta.",
    advice: "Haz primero lo útil, luego lo bonito.",
    intensity: "alta",
  },
  {
    title: "Energía astrológica",
    summary:
      "El momento pide estructura: si ordenas tu agenda, tu mente baja la fricción.",
    advice: "Cierra una ventana abierta antes de abrir otra nueva.",
    intensity: "media",
  },
  {
    title: "Energía astrológica",
    summary:
      "Se activa una lectura más intuitiva del entorno; conviene observar patrones y no solo hechos sueltos.",
    advice: "No respondas al primer ruido: mira el contexto completo.",
    intensity: "media-alta",
  },
  {
    title: "Energía astrológica",
    summary:
      "La energía favorece cierres limpios y una mirada más serena hacia lo que viene.",
    advice: "Hoy vale más sostener continuidad que forzar novedades.",
    intensity: "suave",
  },
];

export function buildDailyHomeContent(timeZone?: string): DailyHomeContent {
  const seed = resolveDateSeed(timeZone);
  const cardIndex = hashSeed(`${seed}:card`) % dailyCards.length;
  const energyIndex = hashSeed(`${seed}:energy`) % astrologicalEnergies.length;

  return {
    cardOfTheDay: enrichDailyCard(dailyCards[cardIndex]),
    astrologicalEnergy: astrologicalEnergies[energyIndex],
  };
}

function enrichDailyCard(card: DailyCardSeed): DailyCard {
  return {
    ...card,
    imageUrl: buildTarotCardImagePath(card.cardName) ?? "",
  };
}

function resolveDateSeed(timeZone?: string): string {
  const zones = [timeZone, "America/Lima", "UTC"].filter(
    (item): item is string => Boolean(item && item.trim().length > 0),
  );
  const now = new Date();

  for (const zone of zones) {
    try {
      const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: zone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      const parts = formatter.formatToParts(now);
      const year = parts.find((part) => part.type === "year")?.value;
      const month = parts.find((part) => part.type === "month")?.value;
      const day = parts.find((part) => part.type === "day")?.value;

      if (year && month && day) {
        return `${year}-${month}-${day}`;
      }
    } catch (_) {
      // Fallback below.
    }
  }

  return now.toISOString().slice(0, 10);
}

function hashSeed(value: string): number {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}
