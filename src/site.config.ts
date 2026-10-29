// Configuración general del sitio. Cambia aquí los datos y se actualiza todo el portal.
export const site = {
  name: "Chamba en Ica",
  tagline: "Convocatorias y ofertas de trabajo en Ica, verificadas y explicadas",
  // Cambia esta URL cuando compres tu dominio (por ejemplo, https://chambaenica.pe)
  url: "https://chamba-en-ica.vercel.app",
  // ⚠️ Pon aquí el correo donde quieres recibir mensajes del formulario de contacto
  contactEmail: "victorquichica@gmail.com",
  locale: "es_PE",
};

export const provincias = [
  { slug: "ica", nombre: "Ica" },
  { slug: "chincha", nombre: "Chincha" },
  { slug: "pisco", nombre: "Pisco" },
  { slug: "nasca", nombre: "Nasca" },
  { slug: "palpa", nombre: "Palpa" },
] as const;

export const categorias = [
  {
    slug: "convocatorias-del-estado",
    nombre: "Convocatorias del Estado",
    icono: "🏛️",
    descripcion: "CAS y concursos públicos de municipalidades, Gobierno Regional, hospitales y otras entidades.",
    corta: "CAS y concursos públicos de la región.",
  },
  {
    slug: "empleos-en-empresas",
    nombre: "Empleos en empresas",
    icono: "🏢",
    descripcion: "Ofertas en empresas privadas de Ica: comercio, servicios, retail, logística y más.",
    corta: "Comercio, ventas, servicios y logística.",
  },
  {
    slug: "agroexportacion",
    nombre: "Agroexportación",
    icono: "🍇",
    descripcion: "Trabajos en fundos y agroexportadoras: campo, packing, operarios, supervisores y técnicos.",
    corta: "Campo, packing y técnicos en fundos.",
  },
  {
    slug: "practicas",
    nombre: "Prácticas",
    icono: "🎓",
    descripcion: "Prácticas preprofesionales y profesionales para estudiantes y egresados.",
    corta: "Para estudiantes y recién egresados.",
  },
  {
    slug: "part-time-y-temporada",
    nombre: "Part time y temporada",
    icono: "⏰",
    descripcion: "Trabajos de medio tiempo, por horas y por temporada.",
    corta: "Medio tiempo, por horas y campañas.",
  },
] as const;

export type CategoriaSlug = (typeof categorias)[number]["slug"];
export type ProvinciaSlug = (typeof provincias)[number]["slug"];

/* ---------- Datos opcionales de cada oferta (sirven para los filtros de búsqueda) ---------- */

export const jornadas = [
  { slug: "tiempo-completo", nombre: "Tiempo completo" },
  { slug: "medio-tiempo", nombre: "Medio tiempo" },
  { slug: "por-horas", nombre: "Por horas" },
  { slug: "temporal", nombre: "Temporal / campaña" },
] as const;

export const modalidades = [
  { slug: "presencial", nombre: "Presencial" },
  { slug: "remoto", nombre: "Remoto" },
  { slug: "hibrido", nombre: "Híbrido" },
] as const;

export const experiencias = [
  { slug: "sin-experiencia", nombre: "Sin experiencia" },
  { slug: "menos-1", nombre: "Menos de 1 año" },
  { slug: "1-2", nombre: "1 a 2 años" },
  { slug: "3-mas", nombre: "3 años a más" },
] as const;

export const educaciones = [
  { slug: "sin-requisito", nombre: "Sin requisito" },
  { slug: "secundaria", nombre: "Secundaria completa" },
  { slug: "tecnico", nombre: "Técnico" },
  { slug: "universitario", nombre: "Universitario" },
] as const;

// Filtro "Sueldo desde" (en soles)
export const rangosSueldo = [1130, 1500, 2000, 3000, 5000] as const;

// Filtro "Publicado" (días hacia atrás)
export const fechasPublicacion = [
  { dias: 1, nombre: "Últimas 24 horas" },
  { dias: 3, nombre: "Últimos 3 días" },
  { dias: 7, nombre: "Última semana" },
  { dias: 30, nombre: "Último mes" },
] as const;

export type JornadaSlug = (typeof jornadas)[number]["slug"];
export type ModalidadSlug = (typeof modalidades)[number]["slug"];
export type ExperienciaSlug = (typeof experiencias)[number]["slug"];
export type EducacionSlug = (typeof educaciones)[number]["slug"];
