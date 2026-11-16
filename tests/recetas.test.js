import { test } from "node:test";
import assert from "node:assert/strict";

import { RECETAS, BASICOS } from "../js/recetas.js";
import {
  normalizar,
  leerIngredientes,
  clavesConocidas,
  buscarPorIngredientes,
} from "../js/buscador.js";

const CONOCIDOS = clavesConocidas(RECETAS);

test("cada receta está completa y bien formada", () => {
  for (const r of RECETAS) {
    const donde = `receta ${r.id}`;
    assert.match(r.id, /^[a-z0-9-]+$/, donde);
    assert.ok(r.nombre && r.descripcion && r.emoji, donde);
    assert.ok(["comida", "bebida", "postre"].includes(r.seccion), donde);
    assert.ok(["boliviana", "internacional"].includes(r.origen), donde);
    assert.ok(Array.isArray(r.etiquetas), donde);
    for (const e of r.etiquetas) assert.ok(["simple", "nutritiva"].includes(e), donde);
    assert.ok(Number.isInteger(r.minutos) && r.minutos > 0, donde);
    assert.ok(Number.isInteger(r.porciones) && r.porciones > 0, donde);
    assert.ok(r.claves.length >= 1, donde);
    assert.ok(r.ingredientes.length >= 2, donde);
    assert.ok(r.pasos.length >= 2, donde);
    if (r.seccion === "bebida") assert.equal(typeof r.alcohol, "boolean", donde);
  }
});

test("los id no se repiten", () => {
  const ids = RECETAS.map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("las claves están en forma canónica y no incluyen básicos", () => {
  for (const r of RECETAS) {
    for (const clave of r.claves) {
      assert.equal(normalizar(clave, CONOCIDOS), clave, `${r.id}: ${clave}`);
      assert.ok(!BASICOS.includes(clave), `${r.id}: ${clave} es un básico`);
    }
    assert.equal(new Set(r.claves).size, r.claves.length, `${r.id}: clave repetida`);
  }
});

test("hay recetas de cada tipo que pide el recetario", () => {
  const cuenta = (f) => RECETAS.filter(f).length;
  assert.ok(cuenta((r) => r.seccion === "comida" && r.origen === "boliviana") >= 10);
  assert.ok(cuenta((r) => r.seccion === "comida" && r.origen === "internacional") >= 10);
  assert.ok(cuenta((r) => r.etiquetas.includes("simple")) >= 10);
  assert.ok(cuenta((r) => r.etiquetas.includes("nutritiva")) >= 10);
  assert.ok(cuenta((r) => r.seccion === "bebida" && r.alcohol === false) >= 5);
  assert.ok(cuenta((r) => r.seccion === "bebida" && r.alcohol === true) >= 5);
  assert.ok(cuenta((r) => r.seccion === "postre") >= 10);
});

test("el ejemplo del pedido: papas, carne, tomate y cebolla", () => {
  const tengo = leerIngredientes("papas, carne , tomate, cebolla", CONOCIDOS);
  assert.deepEqual(tengo, ["papa", "carne", "tomate", "cebolla"]);

  const resultados = buscarPorIngredientes(RECETAS, tengo);
  // Los tres platos del pedido salen: el filete completo, y al silpancho y al
  // pique les faltan dos cosas (en pantalla, bajo "necesitan más cosas").
  // No se mira la posición exacta, que cambia cuando crece el catálogo.
  for (const id of ["silpancho", "pique-macho", "filete-encebollado"]) {
    const encontrado = resultados.find((x) => x.receta.id === id);
    assert.ok(encontrado, `${id} no aparece en los resultados`);
    assert.ok(encontrado.faltan.length <= 2, `${id}: faltan ${encontrado.faltan}`);
  }
  assert.equal(resultados[0].receta.id, "filete-encebollado");
  assert.deepEqual(resultados[0].faltan, []);
});

const enSeccion = (texto, seccion) =>
  buscarPorIngredientes(RECETAS, leerIngredientes(texto, CONOCIDOS), { seccion });

test("pedir comida con zanahoria no trae bebidas ni postres", () => {
  const resultados = enSeccion("zanahoria", "comida");
  assert.ok(resultados.length > 0);
  for (const x of resultados) assert.equal(x.receta.seccion, "comida", x.receta.id);
  assert.ok(enSeccion("zanahoria", "bebida").some((x) => x.receta.id === "jugo-zanahoria-naranja"));
});

test("hay bastantes recetas de pocos ingredientes en cada sección", () => {
  const pocas = (seccion) =>
    RECETAS.filter((r) => r.seccion === seccion && r.claves.length <= 3).length;
  assert.ok(pocas("comida") >= 40, `comidas: ${pocas("comida")}`);
  assert.ok(pocas("bebida") >= 25, `bebidas: ${pocas("bebida")}`);
  assert.ok(pocas("postre") >= 18, `postres: ${pocas("postre")}`);
});

test("con un solo ingrediente común ya salen comidas cercanas", () => {
  const comunes = [
    "zanahoria", "papa", "huevo", "arroz", "pollo", "carne", "tomate",
    "fideo", "queso", "cebolla", "pan",
  ];
  for (const ingrediente of comunes) {
    const cerca = enSeccion(ingrediente, "comida").filter((x) => x.faltan.length <= 1);
    assert.ok(cerca.length >= 3, `${ingrediente}: solo ${cerca.map((x) => x.receta.id)}`);
  }
});

test("con dos o tres ingredientes comunes hay algo para preparar ya", () => {
  const casos = [
    ["papa, huevo", "comida"], ["arroz, huevo", "comida"], ["tomate, cebolla", "comida"],
    ["fideo, tomate", "comida"], ["carne, arroz", "comida"], ["pollo, papa, cebolla", "comida"],
    ["zanahoria, papa, cebolla", "comida"], ["pan, queso", "comida"],
    ["leche, plátano", "bebida"], ["limón", "bebida"], ["naranja", "bebida"],
    ["pan, huevo, leche", "postre"], ["manzana, canela", "postre"], ["harina, huevo, leche", "postre"],
  ];
  for (const [texto, seccion] of casos) {
    const listas = enSeccion(texto, seccion).filter((x) => x.faltan.length === 0);
    assert.ok(listas.length >= 1, `${seccion} con ${texto}: nada completo`);
  }
});

// Ingredientes que se pidieron como opción, con recetas que los usen.
const PEDIDOS = [
  ["vainitas", "vainita"], ["ajo", "ajo"], ["perejil", "perejil"], ["cilantro", "cilantro"],
  ["brócoli", "brocoli"], ["pimentón", "pimenton"], ["camote", "camote"], ["yuca", "yuca"],
  ["plátano de freír", "platano"], ["cerdo", "cerdo"], ["salchicha", "salchicha"],
];

test("los ingredientes pedidos se reconocen y tienen comidas que los usan", () => {
  for (const [texto, clave] of PEDIDOS) {
    assert.deepEqual(leerIngredientes(texto, CONOCIDOS), [clave], texto);
    assert.ok(CONOCIDOS.has(clave), `${clave} no es un ingrediente del catálogo`);

    const comidas = RECETAS.filter((r) => r.seccion === "comida" && r.claves.includes(clave));
    assert.ok(comidas.length >= 3, `${clave}: solo ${comidas.map((r) => r.id)}`);
    const simples = comidas.filter((r) => r.etiquetas.includes("simple"));
    assert.ok(simples.length >= 2, `${clave}: solo ${simples.length} comidas simples`);

    // Con ese ingrediente y uno más ya sale algo cercano.
    const cerca = enSeccion(texto, "comida").filter((x) => x.faltan.length <= 1);
    assert.ok(cerca.length >= 2, `${clave}: solo ${cerca.map((x) => x.receta.id)}`);
  }
});

test("el ajo es un ingrediente más, no algo que se da por hecho", () => {
  assert.ok(!BASICOS.includes("ajo"));
  const conAjo = (id) => RECETAS.find((r) => r.id === id).claves.includes("ajo");
  assert.ok(conAjo("fideos-al-ajo"));
  assert.ok(conAjo("pollo-dorado"));
  // Solo donde es protagonista: al filete no le "falta" ajo.
  assert.ok(!conAjo("filete-encebollado"));
});

test("otros nombres de los ingredientes nuevos", () => {
  const clave = (texto) => normalizar(texto, CONOCIDOS);
  assert.equal(clave("batata"), "camote");
  assert.equal(clave("boniatos"), "camote");
  assert.equal(clave("mandioca"), "yuca");
  assert.equal(clave("plátano macho"), "platano");
  assert.equal(clave("plátanos verdes"), "platano");
  assert.equal(clave("plátano para freír"), "platano");
  assert.equal(clave("chauchas"), "vainita");
  assert.equal(clave("dientes de ajo"), "ajo");
  assert.equal(clave("un atado de perejil"), "perejil");
});

test("hay un postre con camote", () => {
  assert.ok(RECETAS.some((r) => r.seccion === "postre" && r.claves.includes("camote")));
});
