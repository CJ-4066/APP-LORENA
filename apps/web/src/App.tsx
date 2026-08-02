import { useEffect, useMemo, useState } from "react";

import heroIllustration from "./assets/hero.png";
import "./App.css";

type HealthResponse = {
  status: string;
  timestamp: string;
  dependencies?: {
    database?: { status: string };
    redis?: { status: string };
    storage?: { status: string };
  };
};

type LandingResponse = {
  app: {
    name: string;
    tagline: string;
    market: string;
    timezone: string;
  };
  home: {
    welcomeTitle: string;
    welcomeSubtitle: string;
    featuredMessage: string;
    cardOfTheDay: {
      title: string;
      cardName: string;
      message: string;
      ritual: string;
      imageUrl: string;
    };
    upcomingBooking: null | {
      specialistName: string;
      serviceName: string;
      scheduledAt: string;
      status: string;
    };
  };
  services: Array<{
    id: string;
    name: string;
    category: string;
    description: string;
    durationMinutes: number;
    price: {
      amount: number;
      currency: string;
    };
  }>;
  specialists: Array<{
    id: string;
    name: string;
    headline: string;
    specialties: string[];
    featured: boolean;
    nextAvailableAt: string;
  }>;
  plans: Array<{
    id: string;
    name: string;
    tier: string;
    priceMonthly: number;
    currency: string;
    features: string[];
  }>;
  bookings: Array<{
    id: string;
    serviceName: string;
    specialistName: string;
    scheduledAt: string;
    status: string;
    mode: string;
  }>;
};

const guestLanding: LandingResponse = {
  app: {
    name: "Lo Renaciente",
    tagline: "Autoconocimiento, guía y consultas en una experiencia web clara y premium.",
    market: "Perú / Latam",
    timezone: "America/Lima",
  },
  home: {
    welcomeTitle: "Puerta de entrada",
    welcomeSubtitle:
      "Explora tarot, astrología, numerología, agenda y contenido premium antes de entrar al panel de administración.",
    featuredMessage:
      "La landing pública muestra la esencia del producto y deja el acceso operativo detrás del login de admin.",
    cardOfTheDay: {
      title: "Carta del día",
      cardName: "La Estrella",
      message:
        "Hoy conviene volver al centro, ordenar la intención y elegir un paso breve con claridad.",
      ritual: "Escribe una sola intención antes de iniciar tu jornada.",
      imageUrl: "",
    },
    upcomingBooking: {
      specialistName: "Amaya Rivas",
      serviceName: "Lectura de tarot terapéutico",
      scheduledAt: "2026-04-24T19:00:00-05:00",
      status: "confirmed",
    },
  },
  services: [
    {
      id: "service-tarot",
      name: "Lectura de tarot terapéutico",
      category: "Tarot",
      description:
        "Sesión enfocada en claridad emocional, decisiones y cierres de ciclo.",
      durationMinutes: 45,
      price: {
        amount: 32,
        currency: "USD",
      },
    },
    {
      id: "service-astro",
      name: "Astrología natal personalizada",
      category: "Astrología",
      description:
        "Lectura de carta natal con foco en identidad, relaciones y timing.",
      durationMinutes: 60,
      price: {
        amount: 48,
        currency: "USD",
      },
    },
    {
      id: "service-numerologia",
      name: "Consulta de numerología",
      category: "Numerología",
      description:
        "Interpretación de ciclos, talentos y aprendizajes por vibración numérica.",
      durationMinutes: 40,
      price: {
        amount: 29,
        currency: "USD",
      },
    },
  ],
  specialists: [
    {
      id: "spec-amaya",
      name: "Amaya Rivas",
      headline: "Tarot terapéutico y lectura intuitiva",
      specialties: ["Tarot", "Procesos emocionales", "Rituales de cierre"],
      featured: true,
      nextAvailableAt: "2026-04-24T19:00:00-05:00",
    },
    {
      id: "spec-elian",
      name: "Elian Duarte",
      headline: "Astrología natal, sinastría y ciclos",
      specialties: ["Astrología natal", "Sinastría", "Revolución solar"],
      featured: true,
      nextAvailableAt: "2026-04-26T18:30:00-05:00",
    },
  ],
  plans: [
    {
      id: "free",
      name: "Free",
      tier: "free",
      priceMonthly: 0,
      currency: "USD",
      features: [
        "Carta del día",
        "Energía astrológica básica",
        "Agenda limitada",
        "Chat con límite mensual",
      ],
    },
    {
      id: "premium",
      name: "Premium",
      tier: "premium",
      priceMonthly: 14.99,
      currency: "USD",
      features: [
        "Cursos premium",
        "Biblioteca completa",
        "Más sesiones por mes",
        "Acceso anticipado a contenidos",
      ],
    },
  ],
  bookings: [
    {
      id: "booking-guest-1",
      serviceName: "Lectura de tarot terapéutico",
      specialistName: "Amaya Rivas",
      scheduledAt: "2026-04-24T19:00:00-05:00",
      status: "confirmed",
      mode: "video",
    },
  ],
};

function resolveApiBaseUrl(): string {
  const envOverride = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
  if (envOverride) {
    return envOverride.replace(/\/+$/, "");
  }

  if (typeof window === "undefined") {
    return "http://127.0.0.1:4000";
  }

  const protocol = window.location.protocol === "https:" ? "https:" : "http:";
  const hostname =
    window.location.hostname === "0.0.0.0" ? "127.0.0.1" : window.location.hostname;
  if (hostname === "127.0.0.1" || hostname === "localhost") {
    return `${protocol}//${hostname}:4000`;
  }

  return window.location.origin.replace(/\/+$/u, "");
}

function resolveAdminUrl(): string {
  const envOverride = (import.meta.env.VITE_ADMIN_BASE_URL as string | undefined)?.trim();
  if (envOverride) {
    return envOverride.replace(/\/+$/, "");
  }

  if (typeof window === "undefined") {
    return "http://127.0.0.1:5174";
  }

  const hostname = window.location.hostname;
  if (
    hostname === "127.0.0.1" ||
    hostname === "localhost" ||
    hostname === "0.0.0.0"
  ) {
    const protocol = window.location.protocol === "https:" ? "https:" : "http:";
    return `${protocol}//127.0.0.1:5174`;
  }

  return `${window.location.origin.replace(/\/+$/u, "")}/admin`;
}

const apiBaseUrl = resolveApiBaseUrl();
const adminBaseUrl = resolveAdminUrl();

function resolveAssetUrl(value: string | undefined): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed || trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  if (trimmed.startsWith("/uploads/")) {
    return new URL(`/api${trimmed}`, `${apiBaseUrl}/`).toString();
  }

  return new URL(trimmed, `${apiBaseUrl}/`).toString();
}

function formatSchedule(value: string): string {
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [data, setData] = useState<LandingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [expandedCardImageUrl, setExpandedCardImageUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const healthResponse = await fetch(`${apiBaseUrl}/health`);
        if (!healthResponse.ok) {
          throw new Error("La web no pudo alcanzar la API local.");
        }

        const healthJson = (await healthResponse.json()) as HealthResponse;
        if (!cancelled) {
          setHealth(healthJson);
        }

        const bootstrapResponse = await fetch(`${apiBaseUrl}/api/bootstrap`);
        if (bootstrapResponse.status === 401) {
          if (!cancelled) {
            setData(guestLanding);
            setNotice("La API esta activa. Se muestra contenido público mientras el login vive en el panel admin.");
            setError(null);
          }
          return;
        }

        if (!bootstrapResponse.ok) {
          throw new Error("La API respondio, pero el bootstrap web fallo.");
        }

        const bootstrapJson = (await bootstrapResponse.json()) as LandingResponse;

        if (!cancelled) {
          setData(bootstrapJson);
          setNotice(null);
          setError(null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setData(guestLanding);
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No se pudo cargar la web principal.",
          );
          setNotice(
            "La landing sigue funcionando con contenido local mientras el backend no responde.",
          );
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const featuredSpecialists = useMemo(
    () => data?.specialists.filter((item) => item.featured).slice(0, 2) ?? [],
    [data],
  );
  const highlightedServices = data?.services.slice(0, 3) ?? [];
  const highlightedPlans = data?.plans.slice(0, 2) ?? [];
  const recentBookings = data?.bookings.slice(0, 2) ?? [];
  const dailyCardImageUrl = resolveAssetUrl(data?.home.cardOfTheDay.imageUrl);
  const heroHealthStatus = health?.status ?? "loading";
  const databaseHealth = health?.dependencies?.database?.status ?? "unknown";
  const redisHealth = health?.dependencies?.redis?.status ?? "unknown";
  const storageHealth = health?.dependencies?.storage?.status ?? "unknown";

  return (
    <main className="landing-shell">
      <div className="landing-orb landing-orb-left" />
      <div className="landing-orb landing-orb-right" />
      <div className="landing-grid-noise" />

      <header className="landing-topbar">
        <a className="landing-brand" href="#inicio" aria-label="Lo Renaciente">
          <span className="landing-brand-mark">
            <img src={heroIllustration} alt="" aria-hidden="true" />
          </span>
          <span>
            <strong>{data?.app.name ?? "Lo Renaciente"}</strong>
            <small>Web principal</small>
          </span>
        </a>

        <nav className="landing-nav" aria-label="Secciones">
          <a href="#servicios">Servicios</a>
          <a href="#especialistas">Especialistas</a>
          <a href="#planes">Planes</a>
          <a href="#carta">Carta</a>
        </nav>

        <a className="login-button" href={adminBaseUrl}>
          Iniciar sesión
        </a>
      </header>

      <section className="hero-section" id="inicio">
        <div className="hero-copy">
          <p className="eyebrow">Portal público oficial</p>
          <h1>{data?.app.name ?? "Lo Renaciente"}</h1>
          <p className="hero-text">
            {data?.app.tagline ??
              "Autoconocimiento, guía y consultas en una experiencia web clara, premium y directa."}
          </p>
          <div className="hero-meta">
            <span>{data?.app.market ?? "Perú / Latam"}</span>
            <span>{data?.app.timezone ?? "America/Lima"}</span>
            <span className={`status-pill status-${heroHealthStatus}`}>API {heroHealthStatus}</span>
          </div>
          <div className="hero-actions">
            <a className="primary-action" href="#servicios">
              Explorar la web
            </a>
            <a className="secondary-action" href={adminBaseUrl}>
              Login / Iniciar sesión
            </a>
          </div>
        </div>

        <aside className="hero-visual">
          <div className="hero-visual-card">
            <img
              className="hero-illustration"
              src={heroIllustration}
              alt="Vista ilustrativa de la experiencia de Lo Renaciente"
            />
            <div className="hero-visual-metrics">
              <div>
                <strong>{data?.services.length ?? 0}</strong>
                <span>Servicios</span>
              </div>
              <div>
                <strong>{data?.specialists.length ?? 0}</strong>
                <span>Especialistas</span>
              </div>
              <div>
                <strong>{data?.plans.length ?? 0}</strong>
                <span>Planes</span>
              </div>
            </div>
          </div>

          <div className="hero-notice">
            <p className="mini-kicker">Acceso operativo</p>
            <strong>El login de admin vive aparte.</strong>
            <p>
              Desde esta landing se presenta la marca y la oferta. El botón de acceso
              lleva directo al panel administrativo.
            </p>
          </div>
        </aside>
      </section>

      {error ? (
        <section className="status-card status-card-error">
          <p className="mini-kicker">Conexion</p>
          <strong>La web cargó en modo local</strong>
          <p>{error}</p>
        </section>
      ) : null}

      {notice ? (
        <section className="status-card">
          <p className="mini-kicker">Estado</p>
          <strong>{notice}</strong>
        </section>
      ) : null}

      <section className="feature-grid">
        <article className="feature-card feature-card-wide">
          <p className="section-kicker">Carta del día</p>
          <div className="daily-layout" id="carta">
            <div className="daily-copy">
              <h2>{data?.home.cardOfTheDay.cardName ?? "La Estrella"}</h2>
              <p>{data?.home.cardOfTheDay.message ?? "La carta del día aparecerá aquí."}</p>
              <p className="muted-copy">
                {data?.home.cardOfTheDay.ritual
                  ? `Ritual: ${data.home.cardOfTheDay.ritual}`
                  : "Un ritual breve guía la apertura de la jornada."}
              </p>
            </div>
            {dailyCardImageUrl ? (
              <button
                type="button"
                className="daily-card-button"
                onClick={() => setExpandedCardImageUrl(dailyCardImageUrl)}
              >
                <img
                  className="daily-card-image"
                  src={dailyCardImageUrl}
                  alt={data?.home.cardOfTheDay.cardName ?? "Carta del día"}
                />
              </button>
            ) : null}
          </div>
        </article>

        <article className="feature-card">
          <p className="section-kicker">Servicios</p>
          <h2 id="servicios">Oferta visible</h2>
          <div className="stack-list">
            {highlightedServices.map((service) => (
              <div key={service.id} className="stack-row">
                <div>
                  <strong>{service.name}</strong>
                  <p>{service.description}</p>
                </div>
                <div className="stack-aside">
                  <span>{service.category}</span>
                  <span>{service.durationMinutes} min</span>
                  <span>{formatMoney(service.price.amount, service.price.currency)}</span>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="feature-card" id="especialistas">
          <p className="section-kicker">Especialistas</p>
          <h2>Equipo destacado</h2>
          <div className="stack-list">
            {featuredSpecialists.map((specialist) => (
              <div key={specialist.id} className="stack-row">
                <div>
                  <strong>{specialist.name}</strong>
                  <p>{specialist.headline}</p>
                </div>
                <div className="stack-aside">
                  <span>{specialist.specialties.slice(0, 2).join(" / ")}</span>
                  <span>{formatSchedule(specialist.nextAvailableAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="feature-card" id="planes">
          <p className="section-kicker">Planes</p>
          <h2>Monetización clara</h2>
          <div className="plan-list">
            {highlightedPlans.map((plan) => (
              <div key={plan.id} className="plan-card">
                <span className="plan-tier">{plan.tier}</span>
                <strong>{plan.name}</strong>
                <p>{formatMoney(plan.priceMonthly, plan.currency)}/mes</p>
                <ul>
                  {plan.features.slice(0, 4).map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="dashboard-strip">
        <article className="strip-card">
          <p className="section-kicker">Agenda</p>
          <h2>Reservas destacadas</h2>
          {data?.home.upcomingBooking ? (
            <div className="appointment-card">
              <strong>{data.home.upcomingBooking.serviceName}</strong>
              <span>{data.home.upcomingBooking.specialistName}</span>
              <span>{formatSchedule(data.home.upcomingBooking.scheduledAt)}</span>
              <span className="micro-chip">{data.home.upcomingBooking.status}</span>
            </div>
          ) : (
            <p className="muted-copy">
              Todavía no hay una reserva destacada en la respuesta bootstrap.
            </p>
          )}
        </article>

        <article className="strip-card">
          <p className="section-kicker">Operación</p>
          <h2>Dependencias</h2>
          <div className="dependency-grid">
            <span>
              Base de datos <strong>{databaseHealth}</strong>
            </span>
            <span>
              Redis <strong>{redisHealth}</strong>
            </span>
            <span>
              Storage <strong>{storageHealth}</strong>
            </span>
          </div>
          <div className="mini-list">
            {recentBookings.map((booking) => (
              <div key={booking.id} className="mini-row">
                <div>
                  <strong>{booking.serviceName}</strong>
                  <p>{booking.specialistName}</p>
                </div>
                <div className="mini-meta">
                  <span>{formatSchedule(booking.scheduledAt)}</span>
                  <span>{booking.mode}</span>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="cta-panel">
        <div>
          <p className="section-kicker">Acceso interno</p>
          <h2>La administración se abre desde el login.</h2>
          <p>
            Si necesitas gestionar reservas, usuarios, contenido o archivos, entra al
            panel de admin desde el botón de inicio de sesión.
          </p>
        </div>
        <a className="login-button login-button-cta" href={adminBaseUrl}>
          Iniciar sesión
        </a>
      </section>

      {expandedCardImageUrl ? (
        <div
          className="card-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Vista ampliada de la carta"
          onClick={() => setExpandedCardImageUrl(null)}
        >
          <button
            type="button"
            className="card-lightbox-close"
            onClick={() => setExpandedCardImageUrl(null)}
            aria-label="Cerrar carta"
          >
            Cerrar
          </button>
          <img
            className="card-lightbox-image"
            src={expandedCardImageUrl}
            alt={data?.home.cardOfTheDay.cardName ?? "Carta del día"}
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}
    </main>
  );
}

export default App;
