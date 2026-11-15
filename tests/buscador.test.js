import { test } from "node:test";
import assert from "node:assert/strict";

import {
  normalizar,
  leerIngredientes,
  buscarPorIngredientes,
  ingredientesFrecuentes,
} from "../js/buscador.js";

const CONOCIDOS = new Set([
  "papa", "carne", "tomate", "cebolla", "limon", "aji", "nuez", "arroz",
  "huevo", "pan molido", "salchicha", "locoto", "pollo", "fideo",
]);

test("normalizar quita mayúsculas, tildes y espacios", () => {
  assert.equal(normalizar("  Limón ", CONOCIDOS), "limon");
  assert.equal(normalizar("AJÍ", CONOCIDOS), "aji");
});

test("normalizar pasa los plurales al singular conocido", () => {
  assert.equal(normalizar("papas", CONOCIDOS), "papa");
  assert.equal(normalizar("tomates", CONOCIDOS), "tomate");
  assert.equal(normalizar("limones", CONOCIDOS), "limon");
  assert.equal(normalizar("ajíes", CONOCIDOS), "aji");
  assert.equal(normalizar("nueces", CONOCIDOS), "nuez");
  assert.equal(normalizar("arroz", CONOCIDOS), "arroz");
});

test("normalizar entiende sinónimos y frases", () => {
  assert.equal(normalizar("patatas", CONOCIDOS), "papa");
  assert.equal(normalizar("carne molida", CONOCIDOS), "carne");
  assert.equal(normalizar("carne de res", CONOCIDOS), "carne");
  assert.equal(normalizar("pechuga de pollo", CONOCIDOS), "pollo");
  assert.equal(normalizar("un poco de cebolla morada", CONOCIDOS), "cebolla");
  assert.equal(normalizar("tallarines", CONOCIDOS), "fideo");
});

test("normalizar conserva lo que no conoce, en singular simple", () => {
  assert.equal(normalizar("Alcachofas", CONOCIDOS), "alcachofa");
});

test("normalizar ignora cantidades, medidas y adjetivos", () => {
  assert.equal(normalizar("2 papas grandes", CONOCIDOS), "papa");
  assert.equal(normalizar("½ kg de carne molida", CONOCIDOS), "carne");
  assert.equal(normalizar("3 alcachofas", CONOCIDOS), "alcachofa");
  assert.equal(normalizar("1 taza de pan molido", CONOCIDOS), "pan molido");
  assert.equal(normalizar("2 tazas", CONOCIDOS), "");
});

test("leerIngredientes separa por comas, saltos de línea e 'y'", () => {
  assert.deepEqual(
    leerIngredientes("papas, carne , tomate y cebolla", CONOCIDOS),
    ["papa", "carne", "tomate", "cebolla"],
  );
  assert.deepEqual(
    leerIngredientes("Papas\nHuevos; papas", CONOCIDOS),
    ["papa", "huevo"],
  );
  assert.deepEqual(leerIngredientes("  ,  ", CONOCIDOS), []);
});

const RECETAS = [
  { id: "silpancho", nombre: "Silpancho", claves: ["carne", "papa", "arroz", "huevo", "tomate", "cebolla"] },
  { id: "pique", nombre: "Pique macho", claves: ["carne", "papa", "salchicha", "tomate", "cebolla", "locoto"] },
  { id: "filete", nombre: "Filete encebollado", claves: ["carne", "cebolla", "tomate", "papa"] },
  { id: "arroz-con-pollo", nombre: "Arroz con pollo", claves: ["pollo", "arroz"] },
  { id: "papas-fritas", nombre: "Papas fritas", claves: ["papa"] },
];

test("buscar: papas, carne, tomate y cebolla dan silpancho, pique y filete", () => {
  const r = buscarPorIngredientes(RECETAS, ["papa", "carne", "tomate", "cebolla"]);
  const ids = r.map((x) => x.receta.id);
  assert.deepEqual(ids, ["filete", "papas-fritas", "pique", "silpancho"]);
});

test("buscar: dice qué se tiene y qué falta", () => {
  const r = buscarPorIngredientes(RECETAS, ["papa", "carne", "tomate", "cebolla"]);
  const silpancho = r.find((x) => x.receta.id === "silpancho");
  assert.deepEqual(silpancho.tiene, ["carne", "papa", "tomate", "cebolla"]);
  assert.deepEqual(silpancho.faltan, ["arroz", "huevo"]);
  const filete = r.find((x) => x.receta.id === "filete");
  assert.deepEqual(filete.faltan, []);
});

test("buscar: primero lo que se puede hacer completo y con más coincidencias", () => {
  const r = buscarPorIngredientes(RECETAS, ["papa", "carne", "tomate", "cebolla"]);
  assert.equal(r[0].receta.id, "filete");
  assert.equal(r[1].receta.id, "papas-fritas");
});

test("buscar: deja fuera las recetas sin ninguna coincidencia", () => {
  const r = buscarPorIngredientes(RECETAS, ["papa"]);
  assert.ok(!r.some((x) => x.receta.id === "arroz-con-pollo"));
  assert.deepEqual(buscarPorIngredientes(RECETAS, []), []);
});

test("buscar: primero las recetas a las que les faltan menos cosas", () => {
  const r = buscarPorIngredientes(RECETAS, ["papa", "arroz"]);
  assert.deepEqual(
    r.map((x) => x.receta.id),
    ["papas-fritas", "arroz-con-pollo", "filete", "silpancho", "pique"],
  );
});

test("buscar: a igualdad de ingredientes, primero la más rápida", () => {
  const recetas = [
    { id: "lenta", nombre: "Asado", minutos: 90, claves: ["carne", "papa"] },
    { id: "rapida", nombre: "Bistec", minutos: 15, claves: ["carne", "papa"] },
  ];
  const r = buscarPorIngredientes(recetas, ["carne", "papa"]);
  assert.deepEqual(r.map((x) => x.receta.id), ["rapida", "lenta"]);
});

test("buscar: con una sección, solo salen recetas de esa sección", () => {
  const recetas = [
    { id: "crema", nombre: "Crema de zanahoria", seccion: "comida", claves: ["zanahoria", "papa"] },
    { id: "jugo", nombre: "Jugo de zanahoria", seccion: "bebida", claves: ["zanahoria", "naranja"] },
    { id: "torta", nombre: "Torta de zanahoria", seccion: "postre", claves: ["zanahoria", "harina"] },
  ];
  const ids = (seccion) =>
    buscarPorIngredientes(recetas, ["zanahoria"], { seccion }).map((x) => x.receta.id);
  assert.deepEqual(ids("comida"), ["crema"]);
  assert.deepEqual(ids("bebida"), ["jugo"]);
  assert.deepEqual(ids("postre"), ["torta"]);
  assert.equal(buscarPorIngredientes(recetas, ["zanahoria"]).length, 3);
});

test("ingredientesFrecuentes: los más usados primero, sin básicos", () => {
  const frecuentes = ingredientesFrecuentes(RECETAS, { cuantos: 3 });
  assert.deepEqual(frecuentes, ["papa", "carne", "cebolla"]);
  assert.deepEqual(
    ingredientesFrecuentes(RECETAS, { cuantos: 2, excluir: ["papa"] }),
    ["carne", "cebolla"],
  );
});
