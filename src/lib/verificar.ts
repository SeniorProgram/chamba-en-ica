/**
 * Verificador de avisos de empleo: tipos compartidos y revisión básica sin IA.
 * La revisión básica corre en el navegador con las señales de la guía de ofertas falsas;
 * el análisis con IA (src/app/api/verificar/route.ts) devuelve el mismo formato.
 */

export type Nivel = "bajo" | "medio" | "alto";
export type Gravedad = "alta" | "media" | "baja";

export type Senal = { titulo: string; detalle: string; gravedad: Gravedad };

export type ResultadoVerificacion = {
  /** false si el texto no parece un aviso de trabajo */
  esOferta: boolean;
  nivel: Nivel;
  resumen: string;
  senales: Senal[];
  /** Cosas que dan confianza (RUC, correo de la empresa, web oficial...) */
  positivas: string[];
  recomendaciones: string[];
};

export const LIMITE_TEXTO = 6000;
export const MINIMO_TEXTO = 40;

const normal = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

type Regla = { prueba: RegExp; senal: Senal; peso: number };

// Señales de alerta (las 8 de la guía y otras comunes en grupos de Facebook y WhatsApp)
const REGLAS: Regla[] = [
  {
    prueba: /(pag(o|ar|as|ue)|deposit|yape|plin|abon|cuota|costo|derecho de|cobr).{0,60}(inscripcion|capacitacion|curso|uniforme|fotocheck|examen|tramite|materiales|kit|carnet|reserva|cupo|s\/|soles)|(inscripcion|capacitacion|uniforme|fotocheck|examen medico|kit).{0,40}(s\/ ?\d|\d+ soles|tiene (un )?costo|se paga|pagar)/,
    senal: { titulo: "Te piden dinero", detalle: "Menciona pagos por inscripción, capacitación, uniforme, examen u otro trámite. Una empresa formal nunca cobra por contratarte.", gravedad: "alta" },
    peso: 5,
  },
  {
    prueba: /(gana|ganar|ganaras|ingresos?|pago)( de)?( hasta)? (s\/ ?)?\d{3,}.{0,25}(diario|al dia|por dia|semanal|a la semana)|(sin experiencia|no se requiere experiencia).{0,80}(s\/ ?(3,?[5-9]\d{2}|[4-9],?\d{3}|\d{2},?\d{3}))|ganancias? (garantizad|asegurad)/,
    senal: { titulo: "Sueldo demasiado bueno", detalle: "Promete ganancias altas, por día o semana, o muy por encima de lo normal sin pedir experiencia.", gravedad: "media" },
    peso: 3,
  },
  {
    prueba: /(dni|documento).{0,30}(ambos lados|foto|selfie)|selfie|contrasena|clave (de|del|web|bancaria)|numero de (tarjeta|cuenta)|codigo (de )?(verificacion|6 digitos|sms)|cvv/,
    senal: { titulo: "Pide datos sensibles", detalle: "Pide fotos del DNI, selfies, claves, números de tarjeta o códigos de verificación. Así roban cuentas o sacan préstamos a tu nombre.", gravedad: "alta" },
    peso: 5,
  },
  {
    prueba: /urgente|hoy mismo|solo por hoy|ultimos cupos|cupos limitados|plazas limitadas|no pierdas|responde (ya|rapido)|inmediato sin/,
    senal: { titulo: "Te apuran a decidir", detalle: "Usa urgencia (\"últimos cupos\", \"solo hoy\") para que no tengas tiempo de verificar.", gravedad: "baja" },
    peso: 1,
  },
  {
    prueba: /desde (tu |la )?casa.{0,40}(gana|celular|facil|sin experiencia)|solo con tu celular|dar likes|likes|resenas|calificar (productos|hoteles)|tareas (en|por) (la |una )?app|trabajo facil/,
    senal: { titulo: "\"Trabajo fácil desde casa\"", detalle: "Las ofertas de ganar dinero con likes, reseñas o tareas en una app son una de las estafas más comunes.", gravedad: "alta" },
    peso: 4,
  },
  {
    prueba: /invert|inversion|multinivel|recluta (a |personas)|afiliados?|bono por referido|trae (a )?(\d|tus|amigos)|cripto|trading|forex/,
    senal: { titulo: "Invertir o reclutar personas", detalle: "Pide invertir dinero o ganar trayendo a otras personas: no es un empleo, suele ser una estafa piramidal.", gravedad: "alta" },
    peso: 4,
  },
  {
    prueba: /t\.me\/|telegram|bit\.ly|wa\.me\/|escribeme (al|por) (interno|privado)|solo (por )?whatsapp/,
    senal: { titulo: "Contacto solo por chat o enlaces acortados", detalle: "Te lleva a Telegram, a un WhatsApp sin nombre o a enlaces acortados en vez de a la empresa.", gravedad: "media" },
    peso: 2,
  },
  {
    prueba: /hotel|te recogemos|cafeteria|en un parque|direccion (te la )?(daremos|enviamos) (por|al) (interno|privado)/,
    senal: { titulo: "Lugar de entrevista extraño", detalle: "Cita en un hotel, cafetería o un lugar que no te dicen hasta el final. Las entrevistas serias son en la empresa o por videollamada oficial.", gravedad: "media" },
    peso: 2,
  },
];

// Señales que dan confianza
const POSITIVAS: { prueba: RegExp; texto: string }[] = [
  { prueba: /\bruc\b.{0,10}\d{11}|\b(10|20)\d{9}\b/, texto: "Indica un RUC" },
  { prueba: /\.gob\.pe/, texto: "Menciona una web o correo del Estado (.gob.pe)" },
  { prueba: /[\w.-]+@(?!gmail|hotmail|outlook|yahoo|live)[\w-]+\.[\w.]+/, texto: "Tiene un correo de empresa (no Gmail ni Hotmail)" },
  { prueba: /(s\.?a\.?c\.?|e\.?i\.?r\.?l\.?|s\.?r\.?l\.?|s\.a\.)(\s|$|,|\.)|municipalidad|gobierno regional|hospital|universidad/, texto: "Nombra a la empresa o entidad" },
  { prueba: /(av\.|avenida|jr\.|jiron|calle|mz\.?|lote) \w+/, texto: "Da una dirección" },
];

const PALABRAS_DE_EMPLEO = /trabajo|empleo|puesto|vacante|convocatoria|requisitos|sueldo|salario|postula|contrat|personal|cv|curriculum|practicante|operari|vendedor|cajer|asistente|chamba|labor/;

/** Revisión básica sin IA: busca las señales de alerta conocidas en el texto. */
export function revisarBasico(texto: string): ResultadoVerificacion {
  const t = normal(texto);
  const encontradas = REGLAS.filter((r) => r.prueba.test(t));
  const positivas = POSITIVAS.filter((p) => p.prueba.test(t)).map((p) => p.texto);
  const puntos = encontradas.reduce((s, r) => s + r.peso, 0);
  const nivel: Nivel = puntos >= 5 ? "alto" : puntos >= 2 ? "medio" : "bajo";
  const esOferta = PALABRAS_DE_EMPLEO.test(t);

  const resumen = !esOferta
    ? "El texto no parece un aviso de trabajo. Pega el aviso completo tal como te llegó."
    : nivel === "alto"
      ? "Este aviso tiene señales típicas de estafa. No envíes dinero ni datos personales."
      : nivel === "medio"
        ? "Hay algunas señales que conviene revisar antes de postular."
        : "No encontramos señales de alerta conocidas, pero igual verifica a la empresa.";

  const recomendaciones = [
    "Nunca pagues por postular, capacitarte ni por el uniforme.",
    "Busca a la empresa por su nombre o RUC en la web de la SUNAT y en internet.",
    nivel !== "bajo" ? "No envíes fotos de tu DNI ni códigos que te lleguen por SMS." : "Postula por los canales oficiales de la empresa.",
  ];

  return { esOferta, nivel, resumen, senales: encontradas.map((r) => r.senal), positivas, recomendaciones };
}
