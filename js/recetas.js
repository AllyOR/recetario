// El catálogo completo. Para añadir una receta, agrégala al archivo de su
// sección y corre `npm test`: las pruebas revisan que esté bien formada.

import { COMIDAS } from "./recetas-comidas.js";
import { BEBIDAS } from "./recetas-bebidas.js";
import { POSTRES } from "./recetas-postres.js";

export const RECETAS = [...COMIDAS, ...BEBIDAS, ...POSTRES];

// Lo que se da por hecho que hay en cualquier cocina; nunca cuenta como "falta".
// El ajo no está: es un ingrediente más, y cuenta donde es protagonista.
export const BASICOS = ["sal", "aceite", "agua", "azucar", "pimienta", "hielo"];
