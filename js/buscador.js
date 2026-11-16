// Buscador por ingredientes. Sin dependencias: corre igual en el navegador y en
// las pruebas (node --test).
//
// Una "clave" es el nombre de un ingrediente en su forma canónica: minúsculas,
// sin tildes (la ñ se conserva) y en singular. Las recetas listan sus
// ingredientes principales como claves; lo que escribe la persona se pasa a
// claves con `leerIngredientes`.

// Frase o palabra (ya limpia) → clave canónica.
const SINONIMOS = {
  patata: "papa",
  "carne molida": "carne",
  "carne de res": "carne",
  "carne de vaca": "carne",
  res: "carne",
  bife: "carne",
  bistec: "carne",
  lomo: "carne",
  pechuga: "pollo",
  muslo: "pollo",
  jitomate: "tomate",
  "cebolla morada": "cebolla",
  "cebolla blanca": "cebolla",
  maiz: "choclo",
  elote: "choclo",
  guisante: "arveja",
  alverja: "arveja",
  frejol: "frijol",
  poroto: "frijol",
  banana: "platano",
  guineo: "platano",
  aguacate: "palta",
  calabaza: "zapallo",
  pasta: "fideo",
  tallarin: "fideo",
  espagueti: "fideo",
  spaghetti: "fideo",
  macarron: "fideo",
  chancho: "cerdo",
  puerco: "cerdo",
  lima: "limon",
  quesillo: "queso",
  "queso fresco": "queso",
  "queso criollo": "queso",
  margarina: "mantequilla",
  "crema de leche": "crema",
  nata: "crema",
  "pan rallado": "pan molido",
  remolacha: "beterraga",
  betarraga: "beterraga",
  pimiento: "pimenton",
  morron: "pimenton",
  culantro: "cilantro",
  cacahuate: "mani",
  cacahuete: "mani",
  quinoa: "quinua",
  "salsa de soya": "sillao",
  "salsa de soja": "sillao",
  soya: "sillao",
  maracuya: "maracuya",
  parchita: "maracuya",
  durazno: "durazno",
  melocoton: "durazno",
  fresa: "frutilla",
  anana: "piña",
  vainita: "vainita",
  ejote: "vainita",
  "vino tinto": "vino",
  "harina de trigo": "harina",
  hielos: "hielo",
};

// Palabras que no dicen qué ingrediente es.
const RELLENO = new Set([
  "de", "del", "la", "el", "los", "las", "un", "una", "unos", "unas", "al",
  "poco", "poca", "pocos", "pocas", "algo", "mucho", "mucha", "medio", "media",
  "kilo", "kilos", "gramo", "gramos", "taza", "tazas", "litro", "litros",
  "con", "para", "y", "o", "tengo", "hay", "queda", "quedan", "sobra", "sobran",
  // Medidas y adjetivos de una lista de ingredientes ("2 papas grandes").
  "g", "kg", "ml", "l", "cucharada", "cucharadas", "cucharadita", "cucharaditas",
  "lata", "latas", "vaso", "vasos", "rama", "ramas", "diente", "dientes",
  "puñado", "pizca", "trozo", "trozos", "presa", "presas", "hoja", "hojas",
  "grande", "grandes", "mediano", "mediana", "medianos", "medianas",
  "pequeño", "pequeña", "pequeños", "pequeñas", "maduro", "maduros", "madura",
  "maduras", "picado", "picada", "picados", "picadas", "cocido", "cocida",
  "cocidos", "cocidas", "fresco", "fresca", "frescos", "frescas",
]);

// Claves cuyo nombre para mostrar lleva tilde.
const CON_TILDE = {
  limon: "limón", aji: "ají", platano: "plátano", azucar: "azúcar",
  mani: "maní", pimenton: "pimentón", atun: "atún", jamon: "jamón",
  maracuya: "maracuyá", oregano: "orégano", te: "té", cafe: "café",
  "leche de coco": "leche de coco", jengibre: "jengibre", brocoli: "brócoli",
  champiñon: "champiñón", "maiz morado": "maíz morado", linaza: "linaza",
  "agua con gas": "agua con gas", "limon sutil": "limón sutil",
  corazon: "corazón", "almidon de yuca": "almidón de yuca",
  "maiz partido": "maíz partido",
};

/** Minúsculas, sin tildes (conserva la ñ), sin signos, espacios simples. */
export function limpiar(texto) {
  return String(texto ?? "")
    .toLowerCase()
    .replace(/ñ/g, "\u0001")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\u0001/g, "ñ")
    .replace(/[^a-z0-9ñ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Formas posibles en singular de una palabra, la original primero. */
function candidatos(palabra) {
  const c = [palabra];
  if (palabra.endsWith("ces")) c.push(palabra.slice(0, -3) + "z");
  if (palabra.endsWith("es")) c.push(palabra.slice(0, -2));
  if (palabra.endsWith("s")) c.push(palabra.slice(0, -1));
  return c;
}

/** La clave de una palabra o frase si es sinónimo o clave conocida; si no, null. */
function resolver(frase, conocidos) {
  for (const c of candidatos(frase)) {
    if (Object.hasOwn(SINONIMOS, c)) return SINONIMOS[c];
    if (conocidos.has(c)) return c;
  }
  return null;
}

/** Singular aproximado para lo que no está en el catálogo. */
function singularSimple(palabra) {
  if (palabra.endsWith("ces")) return palabra.slice(0, -3) + "z";
  if (palabra.endsWith("s") && palabra.length > 3) return palabra.slice(0, -1);
  return palabra;
}

/**
 * Pasa lo que escribió la persona ("Papas", "un poco de carne molida") a una
 * clave. `conocidos` es el conjunto de claves que usan las recetas.
 */
export function normalizar(texto, conocidos = new Set()) {
  const frase = limpiar(texto);
  if (!frase) return "";

  const entera = resolver(frase, conocidos);
  if (entera) return entera;

  const palabras = frase.split(" ").filter((p) => !RELLENO.has(p) && !/^\d+$/.test(p));
  if (palabras.length === 0) return "";

  const sinRelleno = palabras.join(" ");
  const junta = resolver(sinRelleno, conocidos);
  if (junta) return junta;

  // Primero pares de palabras ("leche condensada"), luego palabras sueltas.
  for (let i = 0; i + 1 < palabras.length; i++) {
    const par = resolver(`${palabras[i]} ${palabras[i + 1]}`, conocidos);
    if (par) return par;
  }
  for (const p of palabras) {
    const sola = resolver(p, conocidos);
    if (sola) return sola;
  }

  return palabras.length === 1 ? singularSimple(palabras[0]) : sinRelleno;
}

/** "papas, carne y tomate" → ["papa", "carne", "tomate"], sin repetidos. */
export function leerIngredientes(texto, conocidos = new Set()) {
  const partes = String(texto ?? "").split(/[,;\n]+|\s+[ye]\s+/i);
  const claves = [];
  for (const parte of partes) {
    const clave = normalizar(parte, conocidos);
    if (clave && !claves.includes(clave)) claves.push(clave);
  }
  return claves;
}

/** Todas las claves que usan las recetas. */
export function clavesConocidas(recetas) {
  const conocidos = new Set();
  for (const r of recetas) for (const c of r.claves ?? []) conocidos.add(c);
  return conocidos;
}

/** El nombre de una clave para mostrar: "limon" → "limón". */
export function nombreBonito(clave) {
  return CON_TILDE[clave] ?? clave;
}

/**
 * Las claves más usadas en `recetas`, de más a menos (a igualdad, por nombre).
 * Sirve para proponer ingredientes de una sección. `excluir`: claves a saltar.
 */
export function ingredientesFrecuentes(recetas, { cuantos = 18, excluir = [] } = {}) {
  const veces = new Map();
  for (const r of recetas) {
    for (const c of r.claves ?? []) {
      if (!excluir.includes(c)) veces.set(c, (veces.get(c) ?? 0) + 1);
    }
  }
  return [...veces]
    .sort(([a, na], [b, nb]) => nb - na || a.localeCompare(b, "es"))
    .slice(0, cuantos)
    .map(([clave]) => clave);
}

/**
 * Recetas que usan al menos uno de los ingredientes en `tengo` (claves).
 * Con `seccion` ("comida", "bebida" o "postre") solo mira las de esa sección.
 * Devuelve { receta, tiene, faltan, cobertura }, ordenado: primero las que
 * piden menos cosas que no hay, luego las que usan más de lo que hay, luego
 * las más rápidas, luego por nombre.
 */
export function buscarPorIngredientes(recetas, tengo, { seccion } = {}) {
  const disponibles = new Set(tengo);
  if (disponibles.size === 0) return [];

  const resultados = [];
  for (const receta of recetas) {
    if (seccion && receta.seccion !== seccion) continue;
    const claves = receta.claves ?? [];
    const tiene = claves.filter((c) => disponibles.has(c));
    if (tiene.length === 0) continue;
    const faltan = claves.filter((c) => !disponibles.has(c));
    resultados.push({ receta, tiene, faltan, cobertura: tiene.length / claves.length });
  }

  const minutos = (x) => x.receta.minutos ?? Number.MAX_SAFE_INTEGER;
  resultados.sort(
    (a, b) =>
      a.faltan.length - b.faltan.length ||
      b.tiene.length - a.tiene.length ||
      minutos(a) - minutos(b) ||
      a.receta.nombre.localeCompare(b.receta.nombre, "es"),
  );
  return resultados;
}
