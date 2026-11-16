# Recetario

Recetas caseras de Bolivia y del mundo, pensadas para usarse desde el celular
en la cocina. Sitio: <https://allyor.github.io/recetario/>

## Qué hace

- **Qué tengo:** eliges si quieres una comida, una bebida o un postre,
  escribes o tocas los ingredientes que hay en casa (papas, carne, tomate,
  cebolla) y muestra qué se puede preparar de esa sección (silpancho, pique
  macho, filete encebollado), ordenado por lo que menos falta. Cada sección
  guarda su propia lista de ingredientes. Al abrir una receta, «Volver»
  regresa a la pantalla anterior tal como estaba.
- **Menú de la semana:** arma siete almuerzos simples (hasta una hora, con
  ingredientes de cualquier mercado de Bolivia), sin repetir carne, pollo,
  arroz o fideo dos días seguidos. Cada día se puede cambiar. Debajo sale la
  lista de compras por puesto del mercado, con las cantidades de cada receta,
  casillas para marcar lo que ya hay y un botón para compartirla. Si se
  elige para cuántas personas se cocina (1 a 6, o 12; si no, 4), las
  cantidades de la lista y de las recetas del menú se ajustan y se redondean.
- **Modo día y modo noche:** el botón de la cabecera cambia entre los dos y
  recuerda la elección; hasta entonces sigue al sistema.
- **Comidas:** bolivianas e internacionales, con filtros de simples y nutritivas.
- **Bebidas:** sin alcohol y con alcohol.
- **Postres.**
- **Ideas:** tres sugerencias que cambian cada día, un botón de sorpresa y un
  formulario para guardar recetas propias.

Las recetas propias se guardan solo en el navegador de quien las escribe
(`localStorage`); no se envían a ningún lado.

## Cómo está hecho

Sitio estático: HTML, CSS y JavaScript sin dependencias ni paso de compilación.
GitHub Pages lo sirve tal cual desde la rama `gh-pages`, que es la única rama:
lo que se sube ahí queda publicado en un par de minutos.

| Archivo | Qué contiene |
|---|---|
| `index.html`, `css/estilos.css` | La página y su aspecto |
| `js/app.js` | Las pantallas y la navegación |
| `js/buscador.js` | La búsqueda por ingredientes |
| `js/menu.js` | El menú de la semana y la lista de compras |
| `js/recetas-comidas.js`, `js/recetas-bebidas.js`, `js/recetas-postres.js` | El catálogo |
| `tests/` | Pruebas del buscador, del menú y del catálogo |

## Probar en tu computadora

```bash
python3 -m http.server 8123
```

Luego abre <http://localhost:8123>. Las pruebas necesitan Node 20 o más nuevo:

```bash
node --test
```

## Agregar una receta al catálogo

Copia una receta del archivo de su sección y cambia los datos. En `claves` van
los ingredientes principales en minúsculas, singular y sin tildes (`papa`,
`limon`), sin lo básico (sal, aceite, agua, azúcar, pimienta). El ajo solo va
cuando es protagonista del plato. Corre `node --test`:
las pruebas avisan si falta algo o una clave está mal escrita.

Para que una comida pueda salir en el menú de la semana tiene que llevar la
etiqueta `simple`, tardar una hora o menos, rendir para dos o más, y cada
clave tiene que estar en la lista de puestos de `js/menu.js` (`PUESTOS`). Si
es una salsa o un acompañamiento, anótala en `NO_ES_ALMUERZO`.
