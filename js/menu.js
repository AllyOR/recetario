// Menú de la semana y su lista de compras. Sin dependencias: corre igual en el
// navegador y en las pruebas (node --test).
//
// El menú son siete ids de receta, uno por día. La lista de compras sale de los
// ingredientes de esas recetas, tal como están escritos ("4 papas medianas").

import { limpiar, normalizar, nombreBonito } from "./buscador.js";

export const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

// Dónde se compra cada ingrediente en un mercado de Bolivia. Un ingrediente
// que no está aquí (leche de coco, tortillas de trigo) no se consigue en
// cualquier mercado, y las recetas que lo piden no entran al menú.
const PUESTOS = [
  ["Verduras y frutas", [
    "papa", "cebolla", "tomate", "zanahoria", "arveja", "haba", "choclo", "zapallo",
    "lechuga", "pepino", "espinaca", "apio", "brocoli", "pimenton", "cebolla verde",
    "locoto", "papalisa", "yuca", "palta", "limon", "platano",
  ]],
  ["Carnes, pollo y pescado", [
    "carne", "pollo", "cerdo", "pescado", "salchicha", "charque", "corazon",
  ]],
  ["Lácteos y huevos", ["huevo", "queso", "leche", "mantequilla", "crema"]],
  ["Abarrotes", [
    "arroz", "fideo", "quinua", "lenteja", "garbanzo", "frijol", "harina", "pan molido",
    "atun", "sillao", "mayonesa", "mani", "mote", "chuño", "almidon de yuca", "levadura",
  ]],
  ["Panadería", ["pan"]],
];

const PUESTO_DE = new Map(PUESTOS.flatMap(([puesto, claves]) => claves.map((c) => [c, puesto])));

// Aclaraciones para comprar en Bolivia.
const NOTAS = {
  pescado: "trucha, pejerrey, sábalo o surubí, el que haya fresco",
};

// Salsas, acompañamientos y bocados: simples, pero no son un almuerzo.
const NO_ES_ALMUERZO = new Set([
  "llajua", "guacamole", "sarza", "pan-con-palta", "arroz-graneado", "papas-doradas",
  "papas-con-cebolla", "ensalada-de-pepino", "ensalada-de-zanahoria", "zanahorias-glaseadas",
  "pure-de-papa", "cunape", "zonzo", "huevos-revueltos", "pan-con-queso", "sandwich-de-huevo",
]);

const MINUTOS_MAXIMOS = 60;

// De qué es un plato, para no repetir lo mismo dos días seguidos. Gana el
// primer grupo que tenga alguno de los ingredientes principales.
const GRUPOS = [
  ["carne", ["carne", "cerdo", "salchicha", "charque", "corazon"]],
  ["pollo", ["pollo"]],
  ["pescado", ["pescado", "atun"]],
  ["legumbre", ["lenteja", "garbanzo", "frijol", "quinua"]],
  ["huevo", ["huevo"]],
  ["queso", ["queso"]],
];

// Con qué se llena el plato. Tampoco se repite dos días seguidos.
const BASES = ["arroz", "fideo", "quinua", "pan"];

const VECES_POR_GRUPO = 2;
const VECES_POR_BASE = 2;
// Lunes, miércoles y viernes se busca primero un plato nutritivo.
const DIAS_NUTRITIVOS = [0, 2, 4];

/** ¿Puede ir en el menú? Comida simple, de plato, con ingredientes de mercado. */
export function sirveParaMenu(receta) {
  return (
    receta.seccion === "comida" &&
    receta.etiquetas.includes("simple") &&
    receta.minutos <= MINUTOS_MAXIMOS &&
    receta.porciones >= 2 &&
    !NO_ES_ALMUERZO.has(receta.id) &&
    receta.claves.every((c) => PUESTO_DE.has(c))
  );
}

/** "carne", "pollo", "pescado", "legumbre", "huevo", "queso" o "verdura". */
export function grupoDe(receta) {
  const grupo = GRUPOS.find(([, claves]) => claves.some((c) => receta.claves.includes(c)));
  return grupo ? grupo[0] : "verdura";
}

/** "arroz", "fideo", "quinua" o "pan" si el plato lo lleva; si no, su primer ingrediente. */
export function baseDe(receta) {
  return BASES.find((b) => receta.claves.includes(b)) ?? receta.claves[0];
}

function barajar(lista, azar) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/**
 * Siete ids de receta, uno por día: platos distintos, nunca el mismo grupo ni
 * la misma base dos días seguidos ni más de dos veces en la semana, y al
 * menos tres nutritivos.
 * `azar` es una función como Math.random; con el mismo azar da la misma semana.
 */
export function armarMenu(recetas, { azar = Math.random } = {}) {
  const candidatas = barajar(recetas.filter(sirveParaMenu), azar);
  const menu = [];
  const veces = new Map();

  for (let dia = 0; dia < DIAS.length; dia++) {
    const libres = candidatas.filter((r) => !menu.includes(r));
    const ayer = menu.at(-1);
    const variada = (r) =>
      (!ayer || (grupoDe(r) !== grupoDe(ayer) && baseDe(r) !== baseDe(ayer))) &&
      (veces.get(`grupo ${grupoDe(r)}`) ?? 0) < VECES_POR_GRUPO &&
      (veces.get(`base ${baseDe(r)}`) ?? 0) < VECES_POR_BASE;
    const nutritiva = (r) => r.etiquetas.includes("nutritiva");

    const elegida =
      (DIAS_NUTRITIVOS.includes(dia) && libres.find((r) => variada(r) && nutritiva(r))) ||
      libres.find(variada) ||
      libres[0];
    if (!elegida) break;

    menu.push(elegida);
    for (const cuenta of [`grupo ${grupoDe(elegida)}`, `base ${baseDe(elegida)}`]) {
      veces.set(cuenta, (veces.get(cuenta) ?? 0) + 1);
    }
  }
  return menu.map((r) => r.id);
}

/**
 * Un menú igual a `menu` pero con otro plato en el día `dia` (0 = lunes): uno
 * que no estaba en la semana y que no repite el grupo ni la base del día
 * anterior ni del siguiente.
 */
export function cambiarDia(recetas, menu, dia, { azar = Math.random } = {}) {
  const porId = new Map(recetas.map((r) => [r.id, r]));
  const vecinos = [menu[dia - 1], menu[dia + 1]].map((id) => porId.get(id)).filter(Boolean);
  const variada = (r) =>
    vecinos.every((v) => grupoDe(v) !== grupoDe(r) && baseDe(v) !== baseDe(r));
  const libres = barajar(
    recetas.filter((r) => sirveParaMenu(r) && !menu.includes(r.id)),
    azar,
  );
  const elegida = libres.find(variada) ?? libres[0];

  const nuevo = [...menu];
  if (elegida) nuevo[dia] = elegida.id;
  return nuevo;
}

/** ¿Sigue sirviendo un menú guardado? Siete platos distintos que existen y sirven. */
export function menuValido(recetas, ids) {
  if (!Array.isArray(ids) || ids.length !== DIAS.length) return false;
  if (new Set(ids).size !== ids.length) return false;
  return ids.every((id) => {
    const receta = typeof id === "string" ? recetas.find((r) => r.id === id) : null;
    return Boolean(receta) && sirveParaMenu(receta);
  });
}

// ───────────── Lista de compras ─────────────

// Lo que casi siempre hay en casa: va aparte, como recordatorio. Frase ya
// limpia (sin tildes) → nombre para mostrar.
const DESPENSA = [
  ["aceite", "aceite"], ["sal", "sal"], ["ajo", "ajo"], ["pimienta", "pimienta"],
  ["azucar", "azúcar"], ["comino", "comino"], ["oregano", "orégano"], ["perejil", "perejil"],
  ["laurel", "laurel"], ["vinagre", "vinagre"], ["mostaza", "mostaza"],
  ["pimenton dulce", "pimentón dulce"], ["aji", "ají molido"], ["urucu", "urucú"],
  ["cilantro", "cilantro"], ["quirquiña", "quirquiña"], ["huacataya", "huacataya"],
  ["nuez moscada", "nuez moscada"], ["anis", "anís"], ["romero", "romero"],
  ["jengibre", "jengibre"], ["ketchup", "kétchup"],
];

// Un ingrediente con estas palabras no hace falta comprarlo.
const OPCIONAL = /opcional|si hay|si quieres|para acompañar|para servir/;

// Las palabras sueltas de las claves, para pasar "cebollas verdes" a
// "cebolla verde" palabra por palabra.
const VOCABULARIO = new Set([...PUESTO_DE.keys()].flatMap((c) => c.split(" ")));

const palabras = (texto) =>
  texto.split(" ").map((p) => normalizar(p, VOCABULARIO)).filter(Boolean);

// Otras formas de nombrar una clave que, palabra por palabra, parecerían dos.
const OTRAS_FORMAS = [["crema", "crema de leche"]];

// Las más largas primero: "cebolla verde" antes que "cebolla".
const CLAVES_EN_PALABRAS = [...[...PUESTO_DE.keys()].map((c) => [c, c]), ...OTRAS_FORMAS]
  .map(([clave, frase]) => [clave, palabras(frase)])
  .sort(([, a], [, b]) => b.length - a.length);

const tieneFrase = (texto, frase) => ` ${texto} `.includes(` ${frase} `);

const despensaEn = (texto) =>
  DESPENSA.filter(([frase]) => tieneFrase(texto, frase)).map(([, nombre]) => nombre);

function sinDespensa(texto) {
  let resto = ` ${texto} `;
  for (const [frase] of DESPENSA) resto = resto.replaceAll(` ${frase} `, " ");
  return resto.trim();
}

/** Las claves de mercado que nombra un texto ya limpio, en el orden en que salen. */
function clavesEn(texto) {
  const lista = palabras(sinDespensa(texto));
  const usada = lista.map(() => false);
  const halladas = [];
  for (const [clave, secuencia] of CLAVES_EN_PALABRAS) {
    for (let i = 0; i + secuencia.length <= lista.length; i++) {
      const calza = secuencia.every((p, j) => lista[i + j] === p && !usada[i + j]);
      if (!calza) continue;
      for (let j = 0; j < secuencia.length; j++) usada[i + j] = true;
      if (!halladas.some(([c]) => c === clave)) halladas.push([clave, i]);
    }
  }
  return halladas.sort(([, a], [, b]) => a - b).map(([clave]) => clave);
}

/**
 * Lo que dice una línea de ingredientes:
 * - `nombradas`: todas las claves de mercado que nombra;
 * - `hayQueComprar`: las que hay que conseguir sí o sí. Nada si la línea es
 *   opcional; de "arvejas o habas" solo la primera;
 * - `despensa`: condimentos y básicos que pide (con la misma regla).
 */
function leerLinea(linea) {
  const texto = limpiar(linea);
  const nombradas = clavesEn(texto);
  if (OPCIONAL.test(texto)) return { nombradas, hayQueComprar: [], despensa: [] };

  const corte = texto.indexOf(" o ");
  if (corte === -1) return { nombradas, hayQueComprar: nombradas, despensa: despensaEn(texto) };

  const antes = texto.slice(0, corte);
  const despues = texto.slice(corte + 3);
  const clavesAntes = clavesEn(antes);
  const despensaAntes = despensaEn(antes);
  if (clavesAntes.length || despensaAntes.length) {
    return { nombradas, hayQueComprar: clavesAntes, despensa: despensaAntes };
  }
  // "acelga o espinaca": lo primero no es de la lista, queda lo segundo.
  return { nombradas, hayQueComprar: clavesEn(despues).slice(0, 1), despensa: despensaEn(despues) };
}

// Medidas que se pueden sumar entre recetas. Palabra limpia → medida.
const MEDIDAS = Object.fromEntries(
  [
    ["g", "g", "gramo", "gramos"], ["kg", "kg", "kilo", "kilos"],
    ["ml", "ml"], ["litro", "l", "litro", "litros"],
    ["taza", "taza", "tazas"], ["lata", "lata", "latas"],
    ["cucharada", "cucharada", "cucharadas"], ["cucharadita", "cucharadita", "cucharaditas"],
    ["presa", "presa", "presas"], ["pechuga", "pechuga", "pechugas"],
    ["filete", "filete", "filetes"], ["bistec", "bistec", "bistecs"],
    ["tajada", "tajada", "tajadas"], ["rebanada", "rebanada", "rebanadas"],
    ["atado", "atado", "atados"], ["rama", "rama", "ramas"], ["diente", "diente", "dientes"],
  ].flatMap(([medida, ...formas]) => formas.map((f) => [f, medida])),
);

const FRACCIONES = { "¼": 0.25, "½": 0.5, "¾": 0.75 };

/**
 * La cantidad con que empieza una línea: { n, medida }. `medida` es "" cuando
 * cuenta el ingrediente mismo ("4 papas"). Null si no empieza así.
 */
function cantidadDe(linea, clave) {
  const partes = /^\s*(\d+(?:[.,]\d+)?)?\s*([¼½¾])?\s+(.+)$/u.exec(linea);
  if (!partes || (!partes[1] && !partes[2])) return null;
  const n = Number((partes[1] ?? "0").replace(",", ".")) + (FRACCIONES[partes[2]] ?? 0);

  const resto = limpiar(partes[3]).split(" ");
  if (resto[0] === "de") resto.shift();
  const primera = resto[0] ?? "";
  if (Object.hasOwn(MEDIDAS, primera)) {
    const medida = MEDIDAS[primera];
    if (medida === "kg") return { n: n * 1000, medida: "g" };
    if (medida === "litro") return { n: n * 1000, medida: "ml" };
    return { n, medida };
  }
  const nombre = clave.split(" ")[0];
  if ([nombre, `${nombre}s`, `${nombre}es`].includes(primera)) return { n, medida: "" };
  return null;
}

const conComa = (x) => String(Number(x.toFixed(1))).replace(".", ",");

function numeroBonito(n) {
  const entero = Math.floor(n);
  const fraccion = Object.keys(FRACCIONES).find((f) => Math.abs(FRACCIONES[f] - (n - entero)) < 1e-9);
  if (Math.abs(n - entero) < 1e-9) return String(entero);
  return fraccion ? `${entero || ""}${fraccion}` : conComa(n);
}

function totalBonito(n, medida) {
  if (medida === "g") return n >= 1000 ? `${conComa(n / 1000)} kg` : `${numeroBonito(n)} g`;
  if (medida === "ml") return n >= 1000 ? `${conComa(n / 1000)} litros` : `${numeroBonito(n)} ml`;
  if (medida === "") return numeroBonito(n);
  return `${numeroBonito(n)} ${medida}${n > 1 ? "s" : ""}`;
}

/** El total de un ingrediente, si todas sus cantidades están en la misma medida. */
function totalDe(clave, usos) {
  const lineas = usos.flatMap((u) => u.lineas);
  if (lineas.length < 2 || usos.some((u) => u.lineas.length === 0)) return null;
  const cantidades = lineas.map((l) => cantidadDe(l, clave));
  if (cantidades.some((c) => !c || c.medida !== cantidades[0].medida)) return null;
  return totalBonito(cantidades.reduce((suma, c) => suma + c.n, 0), cantidades[0].medida);
}

/**
 * La lista de compras de `platos` (recetas, una por día; el índice es el día).
 * Devuelve:
 * - `puestos`: [{ nombre, items }] en el orden del mercado, solo los que
 *   tienen algo. Cada item: { clave, nombre, nota, total, usos }, con
 *   `usos`: [{ dia, receta, lineas }] (las líneas de la receta que lo piden)
 *   y `total` solo si las cantidades se pueden sumar;
 * - `despensa`: condimentos y básicos que piden los platos, sin repetir.
 */
export function listaDeCompras(platos) {
  const usosDe = new Map();
  const despensa = new Set();

  const anotar = (clave, dia, receta, linea) => {
    if (!usosDe.has(clave)) usosDe.set(clave, []);
    const usos = usosDe.get(clave);
    let uso = usos.find((u) => u.dia === dia);
    if (!uso) usos.push((uso = { dia, receta, lineas: [] }));
    if (linea && !uso.lineas.includes(linea)) uso.lineas.push(linea);
  };

  platos.forEach((receta, dia) => {
    if (!receta) return;
    // Lo principal entra siempre, aunque ninguna línea lo nombre.
    for (const clave of receta.claves) if (PUESTO_DE.has(clave)) anotar(clave, dia, receta, null);

    for (const linea of receta.ingredientes) {
      const { nombradas, hayQueComprar, despensa: basicos } = leerLinea(linea);
      for (const clave of nombradas) {
        if (receta.claves.includes(clave) || hayQueComprar.includes(clave)) {
          anotar(clave, dia, receta, linea);
        }
      }
      for (const nombre of basicos) despensa.add(nombre);
    }
  });

  const puestos = PUESTOS.map(([nombre, claves]) => ({
    nombre,
    items: claves
      .filter((clave) => usosDe.has(clave))
      .map((clave) => {
        const usos = usosDe.get(clave);
        return {
          clave,
          nombre: nombreBonito(clave),
          nota: NOTAS[clave] ?? null,
          total: totalDe(clave, usos),
          usos,
        };
      }),
  })).filter((puesto) => puesto.items.length > 0);

  const orden = DESPENSA.map(([, nombre]) => nombre);
  return { puestos, despensa: orden.filter((nombre) => despensa.has(nombre)) };
}

const mayuscula = (t) => t.charAt(0).toUpperCase() + t.slice(1);

/** Las cantidades de un ingrediente en una línea: "6 en total: 4 papas; 2 papas en cubos". */
export function cantidadesDe(item) {
  const lineas = item.usos.flatMap((u) => u.lineas);
  const detalle = lineas.length ? lineas.join("; ") : item.usos.map((u) => u.receta.nombre).join("; ");
  return item.total ? `${item.total} en total: ${detalle}` : detalle;
}

/**
 * La lista y el menú como texto, para mandar por mensaje. `yaTengo`: claves
 * que la persona marcó y no hace falta comprar.
 */
export function textoDeLista(lista, platos, { yaTengo = [] } = {}) {
  const renglones = ["Lista de compras de la semana"];
  for (const puesto of lista.puestos) {
    const items = puesto.items.filter((i) => !yaTengo.includes(i.clave));
    if (items.length === 0) continue;
    renglones.push("", puesto.nombre);
    for (const i of items) renglones.push(`- ${mayuscula(i.nombre)}: ${cantidadesDe(i)}`);
  }
  if (lista.despensa.length) {
    renglones.push("", `Revisar que haya en casa: ${lista.despensa.join(", ")}.`);
  }
  renglones.push("", "Menú de la semana");
  platos.forEach((receta, dia) => {
    if (receta) renglones.push(`${DIAS[dia]}: ${receta.nombre}`);
  });
  return renglones.join("\n");
}
