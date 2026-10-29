// Configuración general del sitio. Cambia aquí los datos y se actualiza todo el portal.
export const site = {
  name: "Chamba en Ica",
  tagline: "Convocatorias y ofertas de trabajo en Ica, verificadas y explicadas",
  // Cambia esta URL cuando compres tu dominio (por ejemplo, https://chambaenica.pe)
  url: "https://chambaenica.vercel.app",
  // ⚠️ Pon aquí el correo donde quieres recibir mensajes del formulario de contacto
  contactEmail: "contacto@ejemplo.com",
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
