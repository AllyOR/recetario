// Las pantallas del recetario. Sin dependencias ni paso de compilación: el
// navegador carga este módulo tal cual.
//
// Rutas (en el hash): #/  #/menu  #/comidas  #/bebidas  #/postres
// #/sugerencias  #/receta/<id>. Todo lo que escribe la persona se pinta con textContent
// (función `h`), nunca como HTML.

import { RECETAS, BASICOS } from "./recetas.js";
import {
  normalizar,
  leerIngredientes,
  clavesConocidas,
  nombreBonito,
  buscarPorIngredientes,
  ingredientesFrecuentes,
} from "./buscador.js";
import {
  DIAS, armarMenu, cambiarDia, menuValido, listaDeCompras, textoDeLista, escalarLinea,
} from "./menu.js";

const CONOCIDOS = clavesConocidas(RECETAS);

const SECCIONES = {
  comida: {
    ruta: "comidas", titulo: "Comidas", ejemplo: "Ej.: silpancho, quinua…",
    icono: "🍽️", una: "Comida", varias: "comidas",
    paraQue: "Escribe lo que tienes para cocinar", ejemploTengo: "Ej.: papas, carne, tomate",
    intro: "Platos bolivianos y del mundo. Filtra por los simples o los más nutritivos.",
    filtros: [
      ["todas", "Todas"], ["bolivianas", "Bolivianas"], ["internacionales", "Internacionales"],
      ["simples", "Simples"], ["nutritivas", "Nutritivas"],
    ],
  },
  bebida: {
    ruta: "bebidas", titulo: "Bebidas", ejemplo: "Ej.: mocochinchi, limón…",
    icono: "🥤", una: "Bebida", varias: "bebidas",
    paraQue: "Escribe lo que tienes para una bebida", ejemploTengo: "Ej.: leche, plátano, limón",
    intro: "Refrescos, jugos y bebidas calientes, y también tragos para los mayores.",
    filtros: [
      ["todas", "Todas"], ["sin-alcohol", "Sin alcohol"], ["con-alcohol", "Con alcohol"],
      ["bolivianas", "Bolivianas"],
    ],
  },
  postre: {
    ruta: "postres", titulo: "Postres", ejemplo: "Ej.: buñuelos, leche…",
    icono: "🍮", una: "Postre", varias: "postres",
    paraQue: "Escribe lo que tienes para un postre", ejemploTengo: "Ej.: leche, huevo, harina",
    intro: "Dulces de casa: de los buñuelos al budín de pan.",
    filtros: [
      ["todas", "Todos"], ["bolivianas", "Bolivianos"], ["internacionales", "Internacionales"],
      ["simples", "Simples"],
    ],
  },
};

const PRUEBAS = {
  todas: () => true,
  bolivianas: (r) => r.origen === "boliviana",
  internacionales: (r) => r.origen === "internacional",
  simples: (r) => r.etiquetas.includes("simple"),
  nutritivas: (r) => r.etiquetas.includes("nutritiva"),
  "sin-alcohol": (r) => r.alcohol === false,
  "con-alcohol": (r) => r.alcohol === true,
};

// ───────────── Lo que se guarda en este dispositivo ─────────────

function leerGuardado(clave, porDefecto) {
  try {
    const valor = localStorage.getItem(clave);
    return valor ? JSON.parse(valor) : porDefecto;
  } catch {
    return porDefecto;
  }
}

function guardar(clave, valor) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
    return true;
  } catch {
    return false;
  }
}

const esLista = (x) => Array.isArray(x) && x.every((s) => typeof s === "string");

function esRecetaPropia(r) {
  return (
    r && typeof r.id === "string" && typeof r.nombre === "string" &&
    Object.hasOwn(SECCIONES, r.seccion) &&
    esLista(r.claves) && esLista(r.ingredientes) && esLista(r.pasos)
  );
}

/** Los ingredientes anotados, una lista por sección. */
function leerTengo(guardado) {
  const tengo = { comida: [], bebida: [], postre: [] };
  // Antes había una sola lista para todo: pasa a ser la de comidas.
  if (esLista(guardado)) return { ...tengo, comida: guardado };
  if (guardado && typeof guardado === "object") {
    for (const s of Object.keys(tengo)) if (esLista(guardado[s])) tengo[s] = guardado[s];
  }
  return tengo;
}

const guardadoMias = leerGuardado("recetario.mias", []);
const guardadoBuscarEn = leerGuardado("recetario.buscarEn", "comida");
const guardadoMenu = leerGuardado("recetario.menu", null);
const guardadoCompras = leerGuardado("recetario.compras", []);
const guardadoPersonas = leerGuardado("recetario.personas", null);
// Para cuántas personas se puede armar el menú de la semana.
const OPCIONES_PERSONAS = [1, 2, 3, 4, 5, 6, 12];
const PERSONAS_SI_NO_ELIGE = 4;

const estado = {
  tengo: leerTengo(leerGuardado("recetario.tengo", null)),
  // La sección en la que busca la pantalla "Qué tengo".
  buscarEn: Object.hasOwn(SECCIONES, guardadoBuscarEn) ? guardadoBuscarEn : "comida",
  mias: Array.isArray(guardadoMias) ? guardadoMias.filter(esRecetaPropia) : [],
  // El menú de la semana (siete ids de receta) y lo ya marcado en su lista
  // de compras. Si el menú guardado dejó de servir, se arma otro al entrar.
  menu: menuValido(RECETAS, guardadoMenu) ? guardadoMenu : null,
  compras: esLista(guardadoCompras) ? guardadoCompras : [],
  // Para cuántas personas se cocina el menú de la semana.
  personas: OPCIONES_PERSONAS.includes(guardadoPersonas) ? guardadoPersonas : PERSONAS_SI_NO_ELIGE,
  // Si quedó abierta la lista de "recetas que necesitan más cosas".
  verMas: { comida: false, bebida: false, postre: false },
  filtro: { comida: "todas", bebida: "todas", postre: "todas" },
  texto: { comida: "", bebida: "", postre: "" },
};

const todas = () => [...RECETAS, ...estado.mias];

// ───────────── Ayudas para pintar ─────────────

/** Crea un elemento. Los hijos de texto entran como texto, nunca como HTML. */
function h(etiqueta, atributos = {}, ...hijos) {
  const el = document.createElement(etiqueta);
  for (const [nombre, valor] of Object.entries(atributos)) {
    if (valor === false || valor == null) continue;
    if (nombre === "class") el.className = valor;
    else if (nombre.startsWith("on")) el.addEventListener(nombre.slice(2), valor);
    else if (valor === true) el.setAttribute(nombre, "");
    else el.setAttribute(nombre, valor);
  }
  for (const hijo of hijos.flat(Infinity)) {
    if (hijo == null || hijo === false) continue;
    el.append(hijo instanceof Node ? hijo : String(hijo));
  }
  return el;
}

const mayuscula = (t) => t.charAt(0).toUpperCase() + t.slice(1);

const sinTildes = (t) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Cambia de pantalla desde el código, empezando arriba como con un enlace. */
function ir(hash) {
  vinoPorEnlace = true;
  location.hash = hash;
}

function enLista(claves) {
  const nombres = claves.map(nombreBonito);
  if (nombres.length <= 1) return nombres.join("");
  return `${nombres.slice(0, -1).join(", ")} y ${nombres.at(-1)}`;
}

function distintivos(r) {
  const lista = [];
  if (r.propia) lista.push(["Tuya", "tuya"]);
  else lista.push([r.origen === "boliviana" ? "Boliviana" : "Internacional", r.origen]);
  if (r.etiquetas.includes("simple")) lista.push(["Simple", "simple"]);
  if (r.etiquetas.includes("nutritiva")) lista.push(["Nutritiva", "nutritiva"]);
  if (r.alcohol === true) lista.push(["Con alcohol", "alcohol"]);
  if (r.alcohol === false) lista.push(["Sin alcohol", "sin-alcohol"]);
  return h("span", { class: "distintivos" },
    lista.map(([texto, clase]) => h("span", { class: `distintivo distintivo-${clase}` }, texto)));
}

function tarjeta(r, extra) {
  return h("li", {},
    h("a", { class: "tarjeta", href: `#/receta/${encodeURIComponent(r.id)}` },
      h("span", { class: "tarjeta-emoji", "aria-hidden": "true" }, r.emoji),
      h("span", { class: "tarjeta-cuerpo" },
        h("span", { class: "tarjeta-nombre" }, r.nombre),
        r.minutos ? h("span", { class: "tarjeta-meta" }, `${r.minutos} min`) : null,
        distintivos(r),
        extra,
      ),
    ),
  );
}

const rejilla = (tarjetas) => h("ul", { class: "rejilla" }, tarjetas);

// ───────────── Pantalla: ¿Qué tengo? ─────────────

// Los ingredientes para tocar, los más usados de cada sección.
const FRECUENTES = Object.fromEntries(
  Object.keys(SECCIONES).map((s) => [
    s, ingredientesFrecuentes(RECETAS.filter((r) => r.seccion === s), { cuantos: 18 }),
  ]),
);

function vistaInicio() {
  const etiqueta = h("label", { for: "ingrediente" });
  const entrada = h("input", {
    id: "ingrediente", type: "text", autocomplete: "off", autocapitalize: "none",
    enterkeyhint: "done", "aria-describedby": "ayuda-ingrediente",
  });
  const zonaSelector = h("div", { class: "selector", role: "group", "aria-labelledby": "titulo-selector" });
  const zonaTengo = h("div", { class: "zona-tengo" });
  const zonaFrecuentes = h("div", { class: "fichas" });
  const zonaResultados = h("div", { class: "resultados", "aria-live": "polite" });

  const mios = () => estado.tengo[estado.buscarEn];

  function cambiar(lista) {
    estado.tengo = { ...estado.tengo, [estado.buscarEn]: lista };
    guardar("recetario.tengo", estado.tengo);
    pintar();
  }

  function elegir(seccion) {
    estado.buscarEn = seccion;
    guardar("recetario.buscarEn", seccion);
    pintar();
  }

  function agregar(texto) {
    const nuevas = leerIngredientes(texto, CONOCIDOS)
      .filter((c) => !BASICOS.includes(c) && !mios().includes(c));
    if (nuevas.length) cambiar([...mios(), ...nuevas]);
  }

  const quitar = (clave) => cambiar(mios().filter((c) => c !== clave));

  function pintar() {
    const def = SECCIONES[estado.buscarEn];

    zonaSelector.replaceChildren(
      ...Object.entries(SECCIONES).map(([seccion, d]) =>
        h("button", {
          type: "button", class: "opcion",
          "aria-pressed": String(seccion === estado.buscarEn),
          onclick: () => elegir(seccion),
        }, h("span", { class: "opcion-icono", "aria-hidden": "true" }, d.icono), d.una)),
    );

    etiqueta.textContent = def.paraQue;
    entrada.placeholder = def.ejemploTengo;

    zonaTengo.replaceChildren(
      ...(mios().length === 0 ? [] : [
        h("h2", { class: "subtitulo" }, "Tengo"),
        h("div", { class: "fichas" },
          mios().map((c) =>
            h("button", {
              type: "button", class: "ficha ficha-puesta",
              "aria-label": `Quitar ${nombreBonito(c)}`, onclick: () => quitar(c),
            }, mayuscula(nombreBonito(c)), h("span", { "aria-hidden": "true", class: "ficha-x" }, "×"))),
          h("button", { type: "button", class: "enlace", onclick: () => cambiar([]) }, "Borrar todo"),
        ),
      ]),
    );

    const { nodos, total } = resultados(def);
    if (total > 0) {
      zonaTengo.append(
        h("button", {
          type: "button", class: "boton boton-ver",
          onclick: () => zonaResultados.scrollIntoView({ behavior: "smooth", block: "start" }),
        }, total === 1 ? `Ver 1 ${def.una.toLowerCase()} posible ↓` : `Ver ${total} ${def.varias} posibles ↓`),
      );
    }

    zonaFrecuentes.replaceChildren(
      ...FRECUENTES[estado.buscarEn].filter((c) => !mios().includes(c)).map((c) =>
        h("button", { type: "button", class: "ficha", onclick: () => agregar(c) },
          h("span", { "aria-hidden": "true" }, "+ "), mayuscula(nombreBonito(c)))),
    );

    zonaResultados.replaceChildren(...nodos);
  }

  function resultados(def) {
    if (mios().length === 0) {
      return {
        total: 0,
        nodos: [
          h("h2", { class: "subtitulo" }, "Mientras tanto, ideas sencillas"),
          rejilla(ideasSencillas(estado.buscarEn).map((r) => tarjeta(r))),
        ],
      };
    }

    const encontrados = buscarPorIngredientes(todas(), mios(), { seccion: estado.buscarEn });
    const conFalta = (x) =>
      h("span", { class: x.faltan.length ? "tarjeta-falta" : "tarjeta-falta tarjeta-completa" },
        x.faltan.length ? `Te falta: ${enLista(x.faltan)}` : "Tienes todo lo principal");
    const tarjetas = (lista) => rejilla(lista.map((x) => tarjeta(x.receta, conFalta(x))));

    const listas = encontrados.filter((x) => x.faltan.length === 0);
    const cerca = encontrados.filter((x) => x.faltan.length === 1);
    const lejos = encontrados.filter(
      (x) => x.faltan.length === 2 || (x.faltan.length > 2 && x.cobertura >= 0.3),
    );

    if (listas.length + cerca.length + lejos.length === 0) {
      return {
        total: 0,
        nodos: [
          h("p", { class: "aviso" },
            `No encontré ${def.varias} con eso. Prueba a agregar otro ingrediente o revisa cómo está escrito.`),
        ],
      };
    }

    const nodos = [];
    if (listas.length) {
      nodos.push(h("h2", { class: "subtitulo" }, "Puedes prepararlo ya"), tarjetas(listas));
    } else {
      nodos.push(h("p", { class: "aviso" },
        "Con solo eso todavía no sale nada completo. Agrega otro ingrediente, o mira qué le falta a cada receta."));
    }
    if (cerca.length) {
      nodos.push(h("h2", { class: "subtitulo" }, "Te falta una sola cosa"), tarjetas(cerca));
    }
    // Las que piden dos cosas o más quedan recogidas, para no tapar a las otras.
    const soloHayLejos = listas.length + cerca.length === 0;
    const seccion = estado.buscarEn;
    if (lejos.length) {
      nodos.push(
        h("details", {
          class: "mas-recetas",
          open: soloHayLejos || estado.verMas[seccion],
          // Se recuerda abierto, para encontrarlo igual al volver de una receta
          // (salvo cuando se abre solo porque no hay nada más cerca).
          ontoggle: (e) => { if (!soloHayLejos) estado.verMas[seccion] = e.currentTarget.open; },
        },
          h("summary", {}, lejos.length === 1
            ? "Ver 1 receta que necesita más cosas"
            : `Ver ${lejos.length} recetas que necesitan más cosas`),
          tarjetas(lejos)),
      );
    }

    return { total: listas.length + cerca.length || lejos.length, nodos };
  }

  pintar();

  return h("div", { class: "vista" },
    h("h1", {}, "¿Qué tienes en casa?"),
    h("p", { class: "intro" }, "Elige qué quieres preparar, dime tus ingredientes y te muestro qué puedes hacer con ellos."),
    h("h2", { class: "subtitulo", id: "titulo-selector" }, "¿Qué quieres preparar?"),
    zonaSelector,
    h("form", {
      class: "buscador",
      onsubmit: (e) => {
        e.preventDefault();
        agregar(entrada.value);
        entrada.value = "";
      },
    },
      etiqueta,
      h("div", { class: "fila" }, entrada, h("button", { type: "submit", class: "boton" }, "Agregar")),
      h("p", { id: "ayuda-ingrediente", class: "ayuda" },
        "Puedes escribir varios, separados por comas. Sal, aceite, agua, azúcar y ajo se dan por hechos."),
    ),
    zonaTengo,
    h("h2", { class: "subtitulo" }, "O toca para agregar"),
    zonaFrecuentes,
    zonaResultados,
  );
}

// ───────────── Pantallas: Comidas, Bebidas, Postres ─────────────

function vistaSeccion(seccion) {
  const def = SECCIONES[seccion];
  const zonaFiltros = h("div", { class: "fichas", role: "group", "aria-label": "Filtrar" });
  const zonaLista = h("div", { "aria-live": "polite" });

  function pintar() {
    zonaFiltros.replaceChildren(
      ...def.filtros.map(([clave, texto]) =>
        h("button", {
          type: "button",
          class: estado.filtro[seccion] === clave ? "ficha ficha-activa" : "ficha",
          "aria-pressed": String(estado.filtro[seccion] === clave),
          onclick: () => { estado.filtro[seccion] = clave; pintar(); },
        }, texto)),
    );

    const buscado = sinTildes(estado.texto[seccion].trim());
    const clave = normalizar(buscado, CONOCIDOS);
    const lista = todas()
      .filter((r) => r.seccion === seccion)
      .filter(PRUEBAS[estado.filtro[seccion]])
      .filter((r) => !buscado || sinTildes(r.nombre).includes(buscado) || r.claves.includes(clave))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

    zonaLista.replaceChildren(
      h("p", { class: "cuenta" }, lista.length === 1 ? "1 receta" : `${lista.length} recetas`),
      lista.length
        ? rejilla(lista.map((r) => tarjeta(r)))
        : h("p", { class: "aviso" }, "No hay recetas con ese filtro. Prueba con otro."),
    );
  }

  const busca = h("input", {
    id: "busca-nombre", type: "search", autocomplete: "off",
    placeholder: def.ejemplo, value: estado.texto[seccion],
    oninput: (e) => { estado.texto[seccion] = e.target.value; pintar(); },
  });

  pintar();

  return h("div", { class: "vista" },
    h("h1", {}, def.titulo),
    h("p", { class: "intro" }, def.intro),
    zonaFiltros,
    h("div", { class: "buscador buscador-nombre" },
      h("label", { for: "busca-nombre" }, "Buscar por nombre o ingrediente"),
      busca,
    ),
    zonaLista,
  );
}

// ───────────── Pantalla: una receta ─────────────

function textoParaCompartir(r) {
  return [
    r.nombre,
    "",
    "Ingredientes:",
    ...r.ingredientes.map((i) => `- ${i}`),
    "",
    "Preparación:",
    ...r.pasos.map((p, n) => `${n + 1}. ${p}`),
  ].join("\n");
}

/** Abre el menú de compartir del teléfono; si no hay, WhatsApp. */
async function compartirDatos(datos) {
  if (navigator.share) {
    try {
      await navigator.share(datos);
    } catch {
      // La persona cerró el menú de compartir: no hay nada que hacer.
    }
    return;
  }
  const mensaje = datos.url ? `${datos.text} ${datos.url}` : datos.text;
  window.open(`https://wa.me/?text=${encodeURIComponent(mensaje)}`, "_blank", "noopener");
}

function compartir(r) {
  return compartirDatos(
    r.propia
      ? { title: r.nombre, text: textoParaCompartir(r) }
      : { title: r.nombre, text: `${r.nombre}: receta del Recetario`, url: location.href },
  );
}

function vistaReceta(id) {
  const r = todas().find((x) => x.id === id);
  if (!r) return vistaNoEncontrada();

  const def = SECCIONES[r.seccion];

  // Un plato del menú de la semana se muestra para las personas elegidas ahí.
  const ajustada =
    r.porciones && estado.personas !== r.porciones && estado.menu?.includes(r.id);
  const porciones = ajustada ? estado.personas : r.porciones;
  const factor = ajustada ? estado.personas / r.porciones : 1;

  const datos = [
    r.minutos ? `⏱ ${r.minutos} min` : null,
    porciones ? `🍽 ${porciones} ${porciones === 1 ? "porción" : "porciones"}` : null,
  ].filter(Boolean);

  const mios = estado.tengo[r.seccion] ?? [];
  const faltan = mios.length ? r.claves.filter((c) => !mios.includes(c)) : null;

  return h("article", { class: "vista receta" },
    // Si se llegó desde otra pantalla del recetario, se vuelve a ella tal como
    // estaba; si se abrió el enlace directo, a la sección de la receta.
    pasoEnHistorial > 0
      ? h("button", { type: "button", class: "volver", onclick: () => history.back() }, "← Volver")
      : h("a", { class: "volver", href: `#/${def.ruta}` }, `← ${def.titulo}`),
    h("div", { class: "receta-cabeza" },
      h("span", { class: "receta-emoji", "aria-hidden": "true" }, r.emoji),
      h("div", {},
        h("h1", {}, r.nombre),
        distintivos(r),
      ),
    ),
    r.descripcion ? h("p", { class: "intro" }, r.descripcion) : null,
    datos.length ? h("p", { class: "receta-datos" }, datos.join("   ·   ")) : null,
    r.alcohol === true
      ? h("p", { class: "aviso aviso-alcohol" }, "Lleva alcohol: solo para mayores de 18 años y con moderación.")
      : null,
    faltan && r.claves.length
      ? h("p", { class: faltan.length ? "aviso" : "aviso aviso-bien" },
          faltan.length
            ? `Según lo que tienes, te falta: ${enLista(faltan)}.`
            : "Según lo que tienes, ya cuentas con todo lo principal.")
      : null,

    h("h2", {}, "Ingredientes"),
    ajustada
      ? h("p", { class: "aviso" },
          `Está en tu menú de la semana: las cantidades van ajustadas para ${porciones} ` +
          `${porciones === 1 ? "persona" : "personas"} (la receta es para ${r.porciones}). ` +
          "En la preparación, ajusta igual el agua y lo demás que se mencione.")
      : null,
    h("ul", { class: "marcables" },
      r.ingredientes.map((texto) =>
        h("li", {}, h("label", {}, h("input", { type: "checkbox" }), h("span", {}, escalarLinea(texto, factor)))))),

    h("h2", {}, "Preparación"),
    h("ol", { class: "pasos" }, r.pasos.map((texto) => h("li", {}, texto))),

    h("div", { class: "acciones" },
      h("button", { type: "button", class: "boton", onclick: () => compartir(r) }, "Compartir receta"),
      r.propia
        ? h("button", {
            type: "button", class: "boton boton-suave",
            onclick: () => {
              if (!confirm(`¿Borrar tu receta "${r.nombre}"? No se puede deshacer.`)) return;
              estado.mias = estado.mias.filter((x) => x.id !== r.id);
              guardar("recetario.mias", estado.mias);
              ir("#/sugerencias");
            },
          }, "Borrar mi receta")
        : null,
    ),
  );
}

function vistaNoEncontrada() {
  return h("div", { class: "vista" },
    h("h1", {}, "No encontré esa página"),
    h("p", { class: "intro" }, "Puede que la receta ya no exista o que el enlace esté incompleto."),
    h("a", { class: "boton", href: "#/" }, "Ir al inicio"),
  );
}

// ───────────── Pantalla: Menú de la semana y lista de compras ─────────────

function vistaMenu() {
  if (!estado.menu) {
    estado.menu = armarMenu(RECETAS);
    guardar("recetario.menu", estado.menu);
  }

  const zonaDias = h("ol", { class: "semana" });
  const zonaLista = h("div", {});
  const cuenta = h("p", { class: "cuenta", role: "status" });
  const novedad = h("p", { class: "ayuda", role: "status" });
  const botonDesmarcar = h("button", { type: "button", class: "enlace", onclick: desmarcarTodo }, "Desmarcar todo");

  const ayudaLista = h("p", { class: "ayuda" });

  const platos = () => estado.menu.map((id) => RECETAS.find((r) => r.id === id));
  const laLista = () => listaDeCompras(platos(), { personas: estado.personas });
  const corto = (dia) => DIAS[dia].slice(0, 3).toLowerCase();

  const personas = h("select", { id: "menu-personas" },
    OPCIONES_PERSONAS.map((n) => h("option", { value: String(n) }, n === 1 ? "1 persona" : `${n} personas`)));
  personas.value = String(estado.personas);
  personas.addEventListener("change", () => {
    estado.personas = Number(personas.value);
    guardar("recetario.personas", estado.personas);
    pintar();
    novedad.textContent =
      `Cantidades ajustadas para ${estado.personas} ${estado.personas === 1 ? "persona" : "personas"}.`;
  });

  function guardarMenu(menu, lista) {
    estado.menu = menu;
    guardar("recetario.menu", menu);
    // Lo marcado solo vale mientras el ingrediente siga en la lista.
    const siguen = lista.puestos.flatMap((p) => p.items.map((i) => i.clave));
    estado.compras = estado.compras.filter((c) => siguen.includes(c));
    guardar("recetario.compras", estado.compras);
  }

  function pintarCuenta(lista) {
    const todos = lista.puestos.flatMap((p) => p.items);
    const faltan = todos.filter((i) => !estado.compras.includes(i.clave)).length;
    cuenta.textContent = faltan === 0
      ? `Ya tienes las ${todos.length} cosas de la lista.`
      : `Te falta conseguir ${faltan} de ${todos.length} cosas.`;
    botonDesmarcar.hidden = estado.compras.length === 0;
  }

  function desmarcarTodo() {
    estado.compras = [];
    guardar("recetario.compras", estado.compras);
    pintarLista();
  }

  function pintarDias() {
    zonaDias.replaceChildren(...platos().map((r, dia) =>
      h("li", { class: "dia" },
        h("span", { class: "dia-nombre" }, DIAS[dia]),
        h("a", { class: "dia-plato", href: `#/receta/${encodeURIComponent(r.id)}` },
          h("span", { class: "dia-emoji", "aria-hidden": "true" }, r.emoji),
          h("span", {},
            h("span", { class: "tarjeta-nombre" }, r.nombre),
            h("span", { class: "tarjeta-meta" },
              `${r.minutos} min · para ${estado.personas}${r.etiquetas.includes("nutritiva") ? " · nutritiva" : ""}`),
          ),
        ),
        h("button", {
          type: "button", class: "boton boton-suave boton-chico",
          "aria-label": `Cambiar el plato del ${DIAS[dia].toLowerCase()}`,
          onclick: () => {
            const menu = cambiarDia(RECETAS, estado.menu, dia);
            const nuevos = menu.map((id) => RECETAS.find((x) => x.id === id));
            guardarMenu(menu, listaDeCompras(nuevos));
            pintar();
            novedad.textContent = `${DIAS[dia]}: ahora toca ${nuevos[dia].nombre}.`;
            zonaDias.children[dia]?.querySelector("button")?.focus();
          },
        }, "Cambiar"),
      )));
  }

  function pintarLista() {
    const lista = laLista();
    const enCasa = estado.tengo.comida;
    ayudaLista.textContent =
      `Junta lo que piden los siete platos, con las cantidades ajustadas para ${lista.personas} ` +
      `${lista.personas === 1 ? "persona" : "personas"} y redondeadas. Marca lo que ya tienes o ya compraste.`;

    const renglon = (item) => {
      const casilla = h("input", { type: "checkbox", checked: estado.compras.includes(item.clave) });
      casilla.addEventListener("change", () => {
        estado.compras = casilla.checked
          ? [...estado.compras, item.clave]
          : estado.compras.filter((c) => c !== item.clave);
        guardar("recetario.compras", estado.compras);
        pintarCuenta(lista);
      });
      const detalle = item.usos
        .map((u) => `${u.lineas.join(" + ") || u.receta.nombre} (${corto(u.dia)})`)
        .join(" · ");
      return h("li", {}, h("label", {}, casilla,
        h("span", {},
          h("strong", {}, mayuscula(item.nombre)),
          item.total ? ` · ${item.total} en total` : null,
          h("span", { class: "compra-detalle" }, detalle),
          item.nota ? h("span", { class: "compra-detalle" }, `En Bolivia: ${item.nota}.`) : null,
          enCasa.includes(item.clave)
            ? h("span", { class: "compra-detalle compra-en-casa" }, "La anotaste en «Qué tengo»: mira si alcanza.")
            : null,
        )));
    };

    zonaLista.replaceChildren(
      ...lista.puestos.flatMap((puesto) => [
        h("h3", { class: "subtitulo" }, puesto.nombre),
        h("ul", { class: "marcables" }, puesto.items.map(renglon)),
      ]),
      lista.despensa.length
        ? h("p", { class: "aviso" }, `Revisa que no falte en casa: ${lista.despensa.join(", ")}.`)
        : null,
    );
    pintarCuenta(lista);
  }

  function pintar() {
    pintarDias();
    pintarLista();
  }

  const tituloLista = h("h2", { class: "resultados", tabindex: "-1" }, "Lista de compras");
  pintar();

  return h("div", { class: "vista menu-semana" },
    h("h1", {}, "Menú de la semana"),
    h("p", { class: "intro" },
      "Siete almuerzos sencillos, con ingredientes que se consiguen en cualquier mercado de Bolivia. " +
      "Cambia el plato que no te convenza; abajo está la lista de compras."),
    h("div", { class: "campo campo-personas" },
      h("label", { for: "menu-personas" }, "¿Para cuántas personas cocinas?"),
      personas),
    zonaDias,
    novedad,
    h("div", { class: "acciones" },
      h("button", {
        type: "button", class: "boton",
        onclick: () => {
          tituloLista.scrollIntoView({ behavior: "smooth", block: "start" });
          tituloLista.focus({ preventScroll: true });
        },
      }, "Ver lista de compras ↓"),
      h("button", {
        type: "button", class: "boton boton-suave",
        onclick: () => {
          if (!confirm("¿Armar otra semana? Se cambian los siete platos y se desmarca la lista.")) return;
          const menu = armarMenu(RECETAS);
          estado.compras = [];
          guardarMenu(menu, listaDeCompras(menu.map((id) => RECETAS.find((r) => r.id === id))));
          pintar();
          novedad.textContent = "Listo: hay un menú nuevo para toda la semana.";
        },
      }, "Armar otra semana"),
    ),

    tituloLista,
    ayudaLista,
    cuenta,
    zonaLista,
    h("div", { class: "acciones" },
      h("button", {
        type: "button", class: "boton",
        onclick: () => compartirDatos({
          title: "Lista de compras",
          text: textoDeLista(laLista(), platos(), { yaTengo: estado.compras }),
        }),
      }, "Compartir lista"),
      botonDesmarcar,
    ),
  );
}

// ───────────── Pantalla: Ideas (sugerencias y recetas propias) ─────────────

/** Los días pasados desde el 1 de enero de 2026: cambia las ideas cada día. */
function numeroDeDia() {
  const hoy = new Date();
  return Math.floor(
    (Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()) - Date.UTC(2026, 0, 1)) / 86400000,
  );
}

const resto = (n, largo) => ((n % largo) + largo) % largo;

/** Tres recetas simples de una sección (sin alcohol), distintas cada día. */
function ideasSencillas(seccion) {
  const lista = RECETAS.filter(
    (r) => r.seccion === seccion && r.etiquetas.includes("simple") && r.alcohol !== true,
  );
  const paso = Math.max(1, Math.floor(lista.length / 3));
  const elegidas = [0, 1, 2].map((i) => lista[resto(numeroDeDia() * 2 + i * paso, lista.length)]);
  return [...new Set(elegidas)];
}

/** Una comida, una bebida sin alcohol y un postre que cambian cada día. */
function ideasDeHoy() {
  const dia = numeroDeDia();
  const elegir = (lista, salto) => lista[resto(dia * salto, lista.length)];
  return [
    elegir(RECETAS.filter((r) => r.seccion === "comida"), 7),
    elegir(RECETAS.filter((r) => r.seccion === "bebida" && r.alcohol === false), 3),
    elegir(RECETAS.filter((r) => r.seccion === "postre"), 5),
  ];
}

function vistaSugerencias() {
  const error = h("p", { class: "aviso aviso-error", role: "alert", hidden: true });
  const campo = (id, etiqueta, control, ayuda) =>
    h("div", { class: "campo" },
      h("label", { for: id }, etiqueta),
      control,
      ayuda ? h("p", { class: "ayuda", id: `${id}-ayuda` }, ayuda) : null);

  const nombre = h("input", { id: "r-nombre", type: "text", autocomplete: "off", maxlength: "80" });
  const seccion = h("select", { id: "r-seccion" },
    h("option", { value: "comida" }, "Comida"),
    h("option", { value: "bebida" }, "Bebida"),
    h("option", { value: "postre" }, "Postre"));
  const alcohol = h("input", { id: "r-alcohol", type: "checkbox" });
  const filaAlcohol = h("label", { class: "casilla", hidden: true }, alcohol, h("span", {}, "Lleva alcohol"));
  seccion.addEventListener("change", () => { filaAlcohol.hidden = seccion.value !== "bebida"; });
  const minutos = h("input", { id: "r-minutos", type: "number", min: "1", max: "600", inputmode: "numeric" });
  const ingredientes = h("textarea", { id: "r-ingredientes", rows: "5", "aria-describedby": "r-ingredientes-ayuda" });
  const pasos = h("textarea", { id: "r-pasos", rows: "6", "aria-describedby": "r-pasos-ayuda" });

  const lineas = (t) => t.split("\n").map((l) => l.trim()).filter(Boolean);

  function alGuardar(e) {
    e.preventDefault();
    const listaIngredientes = lineas(ingredientes.value);
    const listaPasos = lineas(pasos.value);
    const faltas = [];
    if (!nombre.value.trim()) faltas.push("el nombre");
    if (listaIngredientes.length === 0) faltas.push("al menos un ingrediente");
    if (listaPasos.length === 0) faltas.push("al menos un paso");
    if (faltas.length) {
      error.textContent = `Falta ${faltas.join(", ")}.`;
      error.hidden = false;
      return;
    }

    const claves = [];
    for (const linea of listaIngredientes) {
      const clave = normalizar(linea, CONOCIDOS);
      const util = clave && (CONOCIDOS.has(clave) || !clave.includes(" "));
      if (util && !BASICOS.includes(clave) && !claves.includes(clave)) claves.push(clave);
    }

    const tiempo = Number.parseInt(minutos.value, 10);
    const receta = {
      id: `mia-${Date.now().toString(36)}`,
      propia: true,
      nombre: nombre.value.trim(),
      seccion: seccion.value,
      origen: "propia",
      etiquetas: [],
      emoji: "📝",
      descripcion: "",
      minutos: Number.isFinite(tiempo) && tiempo > 0 ? tiempo : null,
      porciones: null,
      claves,
      ingredientes: listaIngredientes,
      pasos: listaPasos,
    };
    if (receta.seccion === "bebida") receta.alcohol = alcohol.checked;

    const nuevas = [...estado.mias, receta];
    if (!guardar("recetario.mias", nuevas)) {
      error.textContent = "No pude guardar la receta en este dispositivo. Revisa que el navegador no esté en modo privado.";
      error.hidden = false;
      return;
    }
    estado.mias = nuevas;
    ir(`#/receta/${receta.id}`);
  }

  const sorpresa = () => {
    const lista = todas();
    const r = lista[Math.floor(Math.random() * lista.length)];
    ir(`#/receta/${encodeURIComponent(r.id)}`);
  };

  return h("div", { class: "vista" },
    h("h1", {}, "Ideas y recetas nuevas"),
    h("p", { class: "intro" }, "Sugerencias que cambian cada día, y un lugar para guardar tus propias recetas."),

    h("h2", { class: "subtitulo" }, "Para probar hoy"),
    rejilla(ideasDeHoy().map((r) => tarjeta(r))),
    h("div", { class: "acciones" },
      h("button", { type: "button", class: "boton", onclick: sorpresa }, "🎲 Sorpréndeme con otra")),

    h("h2", { class: "subtitulo" }, "Tus recetas"),
    estado.mias.length
      ? rejilla(estado.mias.map((r) => tarjeta(r)))
      : h("p", { class: "ayuda" }, "Todavía no agregaste ninguna. Usa el formulario de abajo."),

    h("h2", { class: "subtitulo" }, "Agregar una receta nueva"),
    h("form", { class: "formulario", novalidate: true, onsubmit: alGuardar },
      campo("r-nombre", "Nombre de la receta", nombre),
      h("div", { class: "campos-fila" },
        campo("r-seccion", "Sección", seccion),
        campo("r-minutos", "Minutos (opcional)", minutos)),
      filaAlcohol,
      campo("r-ingredientes", "Ingredientes", ingredientes, "Uno por línea. Ej.: 2 papas grandes"),
      campo("r-pasos", "Preparación", pasos, "Un paso por línea."),
      error,
      h("button", { type: "submit", class: "boton" }, "Guardar receta"),
      h("p", { class: "ayuda" },
        "Se guarda solo en este teléfono o computadora. Aparece en su sección y en la búsqueda por ingredientes, y puedes enviarla con «Compartir receta»."),
    ),
  );
}

// ───────────── Modo día y modo noche ─────────────

// index.html ya puso el tema al cargar (el guardado o, si no hay, el del
// sistema). Aquí solo se cambia con el botón y se recuerda la elección.
const botonTema = document.getElementById("tema");
const colorBarra = document.querySelector('meta[name="theme-color"]');

function ponerTema(tema) {
  const oscuro = tema === "oscuro";
  document.documentElement.dataset.tema = oscuro ? "oscuro" : "claro";
  colorBarra?.setAttribute("content", oscuro ? "#27201b" : "#a63d14");
  if (!botonTema) return;
  botonTema.replaceChildren(
    h("span", { "aria-hidden": "true" }, oscuro ? "☀️" : "🌙"),
    h("span", {}, oscuro ? "Día" : "Noche"),
  );
  botonTema.setAttribute("aria-label", oscuro ? "Cambiar a modo día" : "Cambiar a modo noche");
  botonTema.hidden = false;
}

function temaGuardado() {
  try {
    const tema = localStorage.getItem("recetario.tema");
    return tema === "claro" || tema === "oscuro" ? tema : null;
  } catch {
    return null;
  }
}

const sistemaOscuro = window.matchMedia("(prefers-color-scheme: dark)");

botonTema?.addEventListener("click", () => {
  const nuevo = document.documentElement.dataset.tema === "oscuro" ? "claro" : "oscuro";
  ponerTema(nuevo);
  try {
    localStorage.setItem("recetario.tema", nuevo);
  } catch {
    // Sin almacenamiento (modo privado): el cambio vale hasta cerrar la página.
  }
});

// Mientras la persona no elija, sigue al sistema si este cambia.
sistemaOscuro.addEventListener("change", (e) => {
  if (!temaGuardado()) ponerTema(e.matches ? "oscuro" : "claro");
});

ponerTema(temaGuardado() ?? (sistemaOscuro.matches ? "oscuro" : "claro"));

// ───────────── Rutas ─────────────

const principal = document.getElementById("contenido");
const posiciones = new Map();
let rutaPintada = null;
let vinoPorEnlace = false;

// Cada pantalla visitada lleva su número de orden en el historial del
// navegador: así una receta sabe si hay una pantalla del recetario detrás.
if (history.state?.n == null) history.replaceState({ n: 0 }, "");
let pasoEnHistorial = history.state.n;

function leerRuta() {
  const partes = location.hash.replace(/^#\/?/, "").split("/");
  let id = partes.slice(1).join("/");
  try {
    id = decodeURIComponent(id);
  } catch {
    // Un % suelto en el enlace: se usa tal cual y saldrá "no encontré".
  }
  return { parte: partes[0] || "inicio", id };
}

function pintarRuta() {
  if (rutaPintada !== null) posiciones.set(rutaPintada, window.scrollY);

  // Una pantalla nueva no trae número; al volver atrás ya lo tiene.
  if (history.state?.n == null) history.replaceState({ n: pasoEnHistorial + 1 }, "");
  pasoEnHistorial = history.state.n;

  const { parte, id } = leerRuta();
  let vista;
  let titulo;
  let activa = parte;

  const seccion = Object.keys(SECCIONES).find((s) => SECCIONES[s].ruta === parte);
  if (parte === "inicio") {
    vista = vistaInicio();
    titulo = "¿Qué tienes en casa?";
  } else if (seccion) {
    vista = vistaSeccion(seccion);
    titulo = SECCIONES[seccion].titulo;
  } else if (parte === "menu") {
    vista = vistaMenu();
    titulo = "Menú de la semana";
  } else if (parte === "sugerencias") {
    vista = vistaSugerencias();
    titulo = "Ideas y recetas nuevas";
  } else if (parte === "receta") {
    const r = todas().find((x) => x.id === id);
    vista = vistaReceta(id);
    titulo = r ? r.nombre : "No encontrada";
    activa = r ? SECCIONES[r.seccion].ruta : "";
  } else {
    vista = vistaNoEncontrada();
    titulo = "No encontrada";
  }

  principal.replaceChildren(vista);
  document.title = `${titulo} · Recetario`;

  for (const enlace of document.querySelectorAll(".menu a")) {
    if (enlace.dataset.seccion === activa) enlace.setAttribute("aria-current", "page");
    else enlace.removeAttribute("aria-current");
  }

  // Al volver atrás se recupera dónde estaba la persona; un enlace empieza arriba.
  const clave = location.hash || "#/";
  window.scrollTo(0, vinoPorEnlace ? 0 : posiciones.get(clave) ?? 0);
  if (rutaPintada !== null) principal.focus({ preventScroll: true });
  rutaPintada = clave;
  vinoPorEnlace = false;
}

document.addEventListener("click", (e) => {
  if (e.target instanceof Element && e.target.closest('a[href^="#/"]')) vinoPorEnlace = true;
});
window.addEventListener("hashchange", pintarRuta);
pintarRuta();
