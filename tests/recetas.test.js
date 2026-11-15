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
    assert.ok(r.claves.length >= 2, donde);
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
  // Los tres platos del pedido salen en los grupos de arriba de la pantalla
  // ("Puedes prepararlo ya" y "Te falta poco"): les faltan dos cosas o menos.
  // No se mira la posición exacta, que cambia cuando crece el catálogo.
  for (const id of ["silpancho", "pique-macho", "filete-encebollado"]) {
    const encontrado = resultados.find((x) => x.receta.id === id);
    assert.ok(encontrado, `${id} no aparece en los resultados`);
    assert.ok(encontrado.faltan.length <= 2, `${id}: faltan ${encontrado.faltan}`);
  }
  assert.equal(resultados[0].receta.id, "filete-encebollado");
  assert.deepEqual(resultados[0].faltan, []);
});
