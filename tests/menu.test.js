import { test } from "node:test";
import assert from "node:assert/strict";

import { RECETAS } from "../js/recetas.js";
import {
  DIAS,
  sirveParaMenu,
  grupoDe,
  baseDe,
  armarMenu,
  cambiarDia,
  menuValido,
  listaDeCompras,
  textoDeLista,
} from "../js/menu.js";

const porId = (id) => {
  const r = RECETAS.find((x) => x.id === id);
  assert.ok(r, `no existe la receta ${id}`);
  return r;
};

/** Azar repetible: la misma semilla da siempre la misma semana. */
function azarCon(semilla) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const todosLosItems = (lista) => lista.puestos.flatMap((p) => p.items);
const item = (lista, clave) => todosLosItems(lista).find((i) => i.clave === clave);

/** Una receta de mentira, para probar las sumas. */
const plato = (id, claves, ingredientes) => ({
  id, nombre: id, seccion: "comida", origen: "boliviana", etiquetas: ["simple"],
  minutos: 20, porciones: 4, emoji: "🍲", descripcion: "x", claves, ingredientes, pasos: ["a", "b"],
});

test("la semana tiene siete días", () => {
  assert.equal(DIAS.length, 7);
  assert.equal(DIAS[0], "Lunes");
  assert.equal(DIAS[6], "Domingo");
});

test("al menú solo entran comidas simples, de plato y con ingredientes de mercado", () => {
  const sirven = RECETAS.filter(sirveParaMenu);
  assert.ok(sirven.length >= 35, `solo ${sirven.length} recetas sirven para el menú`);
  for (const r of sirven) {
    assert.equal(r.seccion, "comida", r.id);
    assert.ok(r.etiquetas.includes("simple"), `${r.id} no es simple`);
    assert.ok(r.minutos <= 60, `${r.id} tarda ${r.minutos} min`);
    assert.ok(r.porciones >= 2, `${r.id} rinde ${r.porciones}`);
  }

  assert.ok(sirveParaMenu(porId("filete-encebollado")));
  assert.ok(sirveParaMenu(porId("sopa-de-quinua")));
  // Salsas, acompañamientos y bocados no son un almuerzo.
  for (const id of ["llajua", "sarza", "guacamole", "arroz-graneado", "cunape"]) {
    assert.ok(!sirveParaMenu(porId(id)), `${id} no es un plato de almuerzo`);
  }
  // Largas o no simples.
  assert.ok(!sirveParaMenu(porId("pollo-al-horno")), "el pollo al horno tarda 70 minutos");
  assert.ok(!sirveParaMenu(porId("silpancho")), "el silpancho no está marcado como simple");
  // Ingredientes que no hay en cualquier mercado de Bolivia.
  assert.ok(!sirveParaMenu(porId("quesadillas")), "las tortillas de trigo no se consiguen fácil");
  // Bebidas y postres no entran.
  assert.ok(RECETAS.filter((r) => r.seccion !== "comida").every((r) => !sirveParaMenu(r)));
});

test("armarMenu da siete platos distintos, variados y con días nutritivos", () => {
  for (let semilla = 1; semilla <= 300; semilla++) {
    const menu = armarMenu(RECETAS, { azar: azarCon(semilla) });
    const donde = `semilla ${semilla}: ${menu.join(", ")}`;
    assert.equal(menu.length, 7, donde);
    assert.equal(new Set(menu).size, 7, `repite un plato, ${donde}`);

    const platos = menu.map(porId);
    for (const r of platos) assert.ok(sirveParaMenu(r), `${r.id} no sirve, ${donde}`);

    const grupos = platos.map(grupoDe);
    for (let i = 1; i < grupos.length; i++) {
      assert.notEqual(grupos[i], grupos[i - 1], `dos días seguidos de ${grupos[i]}, ${donde}`);
    }
    for (const g of new Set(grupos)) {
      const veces = grupos.filter((x) => x === g).length;
      assert.ok(veces <= 2, `${g} sale ${veces} veces, ${donde}`);
    }

    // Tampoco la misma base (arroz, fideo, quinua, pan) seguida.
    const bases = platos.map(baseDe);
    for (let i = 1; i < bases.length; i++) {
      assert.notEqual(bases[i], bases[i - 1], `dos días seguidos de ${bases[i]}, ${donde}`);
    }
    for (const b of new Set(bases)) {
      const veces = bases.filter((x) => x === b).length;
      assert.ok(veces <= 2, `${b} es la base ${veces} veces, ${donde}`);
    }

    const nutritivos = platos.filter((r) => r.etiquetas.includes("nutritiva")).length;
    assert.ok(nutritivos >= 3, `solo ${nutritivos} días nutritivos, ${donde}`);
  }
});

test("armarMenu repite la semana con el mismo azar y la cambia con otro", () => {
  assert.deepEqual(
    armarMenu(RECETAS, { azar: azarCon(7) }),
    armarMenu(RECETAS, { azar: azarCon(7) }),
  );
  const distintas = new Set();
  for (let s = 1; s <= 20; s++) distintas.add(armarMenu(RECETAS, { azar: azarCon(s) }).join());
  assert.ok(distintas.size >= 15, `solo ${distintas.size} semanas distintas de 20`);
});

test("grupoDe dice de qué es el plato", () => {
  assert.equal(grupoDe(porId("filete-encebollado")), "carne");
  assert.equal(grupoDe(porId("pollo-guisado")), "pollo");
  assert.equal(grupoDe(porId("arroz-con-atun")), "pescado");
  assert.equal(grupoDe(porId("lentejas-con-arroz")), "legumbre");
  assert.equal(grupoDe(porId("tortilla-de-papa")), "huevo");
  assert.equal(grupoDe(porId("papa-wayku")), "queso");
  assert.equal(grupoDe(porId("sopa-de-fideo")), "verdura");
});

test("baseDe dice con qué se llena el plato", () => {
  assert.equal(baseDe(porId("lentejas-con-arroz")), "arroz");
  assert.equal(baseDe(porId("arroz-chaufa")), "arroz");
  assert.equal(baseDe(porId("aji-de-fideo")), "fideo");
  assert.equal(baseDe(porId("sopa-de-quinua")), "quinua");
  assert.equal(baseDe(porId("hamburguesa-casera")), "pan");
  // Sin arroz, fideo, quinua ni pan, cuenta el primer ingrediente principal.
  assert.equal(baseDe(porId("papa-wayku")), "papa");
  assert.equal(baseDe(porId("filete-encebollado")), "carne");
});

test("cambiarDia cambia solo ese día, por un plato que no estaba", () => {
  for (let semilla = 1; semilla <= 60; semilla++) {
    const azar = azarCon(semilla);
    const menu = armarMenu(RECETAS, { azar });
    const dia = semilla % 7;
    const nuevo = cambiarDia(RECETAS, menu, dia, { azar });
    assert.equal(nuevo.length, 7);
    for (let i = 0; i < 7; i++) {
      if (i === dia) continue;
      assert.equal(nuevo[i], menu[i], `cambió el día ${i} (semilla ${semilla})`);
    }
    assert.ok(!menu.includes(nuevo[dia]), `puso ${nuevo[dia]}, que ya estaba (semilla ${semilla})`);
    assert.ok(sirveParaMenu(porId(nuevo[dia])));
    // El plato nuevo no repite lo del día anterior ni lo del siguiente.
    const grupos = nuevo.map((id) => grupoDe(porId(id)));
    if (dia > 0) assert.notEqual(grupos[dia], grupos[dia - 1], `semilla ${semilla}`);
    if (dia < 6) assert.notEqual(grupos[dia], grupos[dia + 1], `semilla ${semilla}`);
    const bases = nuevo.map((id) => baseDe(porId(id)));
    if (dia > 0) assert.notEqual(bases[dia], bases[dia - 1], `semilla ${semilla}`);
    if (dia < 6) assert.notEqual(bases[dia], bases[dia + 1], `semilla ${semilla}`);
    assert.deepEqual(menu, armarMenu(RECETAS, { azar: azarCon(semilla) }), "no toca el menú original");
  }
});

test("menuValido reconoce un menú guardado que ya no sirve", () => {
  const menu = armarMenu(RECETAS, { azar: azarCon(3) });
  assert.ok(menuValido(RECETAS, menu));
  assert.ok(!menuValido(RECETAS, null));
  assert.ok(!menuValido(RECETAS, "lunes"));
  assert.ok(!menuValido(RECETAS, menu.slice(0, 6)));
  assert.ok(!menuValido(RECETAS, [...menu.slice(0, 6), "receta-que-no-existe"]));
  assert.ok(!menuValido(RECETAS, [...menu.slice(0, 6), "llajua"]));
  assert.ok(!menuValido(RECETAS, [...menu.slice(0, 6), menu[0]]));
  assert.ok(!menuValido(RECETAS, [...menu.slice(0, 6), 5]));
});

test("la lista de compras junta lo que piden los platos, por puesto del mercado", () => {
  const platos = ["filete-encebollado", "sopa-de-quinua", "arroz-con-atun"].map(porId);
  const lista = listaDeCompras(platos);

  assert.deepEqual(
    lista.puestos.map((p) => p.nombre),
    ["Verduras y frutas", "Carnes, pollo y pescado", "Abarrotes"],
  );

  // Cada ingrediente sale una sola vez, con los platos que lo usan.
  const claves = todosLosItems(lista).map((i) => i.clave);
  assert.equal(new Set(claves).size, claves.length, `repetidos: ${claves}`);
  for (const r of platos) {
    for (const c of r.claves) assert.ok(claves.includes(c), `falta ${c}, de ${r.id}`);
  }

  const papa = item(lista, "papa");
  assert.deepEqual(papa.usos.map((u) => u.dia), [0, 1]);
  assert.deepEqual(papa.usos.map((u) => u.receta.id), ["filete-encebollado", "sopa-de-quinua"]);
  for (const u of papa.usos) {
    assert.ok(u.lineas.length >= 1, `sin cantidad en ${u.receta.id}`);
    for (const l of u.lineas) assert.ok(u.receta.ingredientes.includes(l));
    assert.match(u.lineas.join(" "), /papa/);
  }

  assert.equal(lista.puestos[1].items.map((i) => i.clave).join(), "carne");
  assert.ok(lista.puestos[2].items.some((i) => i.clave === "atun"));

  // Lo que casi siempre hay en casa va aparte, sin repetirse.
  assert.ok(lista.despensa.includes("aceite"));
  assert.ok(lista.despensa.includes("sal"));
  assert.equal(new Set(lista.despensa).size, lista.despensa.length);
  assert.ok(!claves.includes("sal") && !claves.includes("aceite"));
});

test("la lista suma también lo que la receta pide además de lo principal", () => {
  const lista = listaDeCompras([porId("sopa-de-quinua")]);
  // "1 rama de apio" y "½ taza de arvejas o habas" no son claves de la sopa.
  assert.ok(item(lista, "apio"), "falta el apio");
  assert.ok(item(lista, "arveja"), "faltan las arvejas");
  assert.match(item(lista, "apio").usos[0].lineas.join(), /apio/);
  // De "arvejas o habas" basta una; la carne es opcional.
  assert.equal(item(lista, "haba"), undefined);
  assert.equal(item(lista, "carne"), undefined);
});

test("los condimentos no se confunden con verduras ni con lácteos", () => {
  // "1 cucharadita de comino y 1 de pimentón dulce" es un condimento.
  const garbanzos = listaDeCompras([porId("garbanzos-con-espinaca")]);
  assert.equal(item(garbanzos, "pimenton"), undefined);
  assert.ok(garbanzos.despensa.includes("comino"));
  assert.ok(garbanzos.despensa.includes("pimentón dulce"));
  // "2 cucharadas de aceite o mantequilla": con el aceite alcanza.
  const fideos = listaDeCompras([porId("fideos-con-queso")]);
  assert.equal(item(fideos, "mantequilla"), undefined);
  // "1 taza de crema de leche" es crema, no leche.
  const alfredo = listaDeCompras([porId("fideos-alfredo")]);
  assert.ok(item(alfredo, "crema"));
  assert.equal(item(alfredo, "leche"), undefined);
  // "Ajo y sal, y unas gotas de limón si hay": lo de "si hay" no se compra.
  assert.equal(item(listaDeCompras([porId("arroz-con-atun")]), "limon"), undefined);
});

test("cada ingrediente principal de un plato del menú trae su cantidad", () => {
  for (const r of RECETAS.filter(sirveParaMenu)) {
    const lista = listaDeCompras([r]);
    for (const c of r.claves) {
      const i = item(lista, c);
      assert.ok(i, `${r.id}: ${c} no sale en la lista`);
      assert.ok(i.usos[0].lineas.length >= 1, `${r.id}: ${c} no aparece en ningún ingrediente`);
    }
  }
});

test("cuando las cantidades se pueden sumar, la lista da el total", () => {
  const lista = listaDeCompras([
    plato("uno", ["papa", "arroz", "carne", "cebolla", "pollo", "queso"], [
      "4 papas medianas", "1½ tazas de arroz", "300 g de carne molida", "½ cebolla",
      "4 presas de pollo", "200 g de queso rallado",
    ]),
    plato("dos", ["papa", "arroz", "carne", "cebolla", "pollo", "queso"], [
      "2 papas en cubos", "2 tazas de arroz", "500 g de carne en cubos", "1 cebolla picada",
      "2 pechugas de pollo en tiras", "1 kg de queso",
    ]),
  ]);
  assert.equal(item(lista, "papa").total, "6");
  assert.equal(item(lista, "arroz").total, "3½ tazas");
  assert.equal(item(lista, "carne").total, "800 g");
  assert.equal(item(lista, "cebolla").total, "1½");
  assert.equal(item(lista, "queso").total, "1,2 kg");
  // Presas y pechugas no se suman entre sí.
  assert.equal(item(lista, "pollo").total, null);
});

test("no hay total si un plato da la cantidad de otra forma, ni con un solo plato", () => {
  const mezcla = listaDeCompras([
    plato("uno", ["papa", "limon"], ["4 papas", "El jugo de 1 limón"]),
    plato("dos", ["papa", "limon"], ["1 kg de papa", "2 limones"]),
  ]);
  assert.equal(item(mezcla, "papa").total, null);
  assert.equal(item(mezcla, "limon").total, null);

  const solo = listaDeCompras([plato("uno", ["papa"], ["4 papas", "Sal"])]);
  assert.equal(item(solo, "papa").total, null);
});

test("el texto para compartir trae la lista y el menú de la semana", () => {
  const menu = armarMenu(RECETAS, { azar: azarCon(11) });
  const platos = menu.map(porId);
  const lista = listaDeCompras(platos);
  const texto = textoDeLista(lista, platos);

  assert.match(texto, /^Lista de compras/);
  for (const p of lista.puestos) assert.ok(texto.includes(p.nombre), p.nombre);
  platos.forEach((r, dia) => assert.ok(texto.includes(`${DIAS[dia]}: ${r.nombre}`), r.nombre));
  assert.ok(texto.includes("aceite"));
  assert.ok(!texto.includes("undefined") && !texto.includes("null"));
});
