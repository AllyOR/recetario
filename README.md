# Recetario

Recetas caseras de Bolivia y del mundo, pensadas para usarse desde el celular
en la cocina. Sitio: <https://allyor.github.io/recetario/>

## Qué hace

- **Qué tengo:** escribes o tocas los ingredientes que hay en casa (papas,
  carne, tomate, cebolla) y muestra qué se puede cocinar (silpancho, pique
  macho, filete encebollado), ordenado por lo que menos falta.
- **Comidas:** bolivianas e internacionales, con filtros de simples y nutritivas.
- **Bebidas:** sin alcohol y con alcohol.
- **Postres.**
- **Ideas:** tres sugerencias que cambian cada día, un botón de sorpresa y un
  formulario para guardar recetas propias.

Las recetas propias se guardan solo en el navegador de quien las escribe
(`localStorage`); no se envían a ningún lado.

## Cómo está hecho

Sitio estático: HTML, CSS y JavaScript sin dependencias ni paso de compilación.
GitHub Pages lo sirve tal cual desde la rama `main`.

| Archivo | Qué contiene |
|---|---|
| `index.html`, `css/estilos.css` | La página y su aspecto |
| `js/app.js` | Las pantallas y la navegación |
| `js/buscador.js` | La búsqueda por ingredientes |
| `js/recetas-comidas.js`, `js/recetas-bebidas.js`, `js/recetas-postres.js` | El catálogo |
| `tests/` | Pruebas del buscador y del catálogo |

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
`limon`), sin lo básico (sal, aceite, agua, azúcar, ajo). Corre `node --test`:
las pruebas avisan si falta algo o una clave está mal escrita.
