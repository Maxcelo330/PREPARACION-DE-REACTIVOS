# Preparación de Reactivos

App del laboratorio para **preparar, valorar y corregir** las soluciones del
instructivo **LP-AC-I-01.21 (Versión 12, 06/05/2024)**, con el registro
**LP-AC-F-01.25**.

**Calidad · Embol S.A.**

---

## Qué hace

**Reactivos.** Los 40 reactivos del instructivo, con buscador y filtros. Al
abrir uno eliges el volumen a preparar (matraz de 25 a 2000 ml u otro) y la app
recalcula todas las cantidades **con la misma concentración**. Para cada pesada
o medición indica la balanza o pipeta que conviene usar y su error (verde,
ámbar o rojo). Los pasos se pueden ir marcando.

**Tengo poco reactivo.** Si te queda poco de algo, escribes cuánto tienes y la
app te dice el volumen máximo que puedes preparar sin cambiar la concentración y
el matraz que conviene usar.

**Valorar.** Para las 10 soluciones que se estandarizan (HCl 0.04N y 6N,
H₂SO₄ 0.02N y 1.25N, EDTA, NaOH 0.1N y 1N, AgNO₃, estándar Coca-Cola Light) la
app calcula la normalidad real y el factor **fc = N real / N ideal** con las
fórmulas del instructivo. Acepta hasta 3 réplicas y muestra cuánto se debería
gastar con fc = 1, así un error de pesada salta a la vista.

**Corregir.** Si el fc queda fuera de rango, calcula qué agregar para volver a
fc = 1,000:

- **más concentrada** → agua a agregar;
- **más diluida** → solución más concentrada ya preparada (HCl 6N, NaOH 1N…),
  ácido concentrado del frasco o sólido.

Para cada opción calcula cuánto movería el fc el error de medir esa cantidad.
Cuando la cantidad es tan pequeña que el error cambiaría la concentración (por
ejemplo, 0,01 ml de HCl concentrado), propone una **solución intermedia de
corrección**: cuánto medir, en qué matraz aforar y cuántos ml agregar.

**Registros (LP-AC-F-01.25).** Cada preparación queda como un lote con código,
cantidades reales, analista, lote del insumo, valoraciones y correcciones. La
app calcula el vencimiento (6 meses; 1 semana para NH₄Cl y tolueno/etanol) y la
próxima verificación (cada 2 meses), y avisa cuando algo vence o le toca
verificar. Exporta a Excel, imprime o guarda en PDF, imprime la **etiqueta del
frasco** y agrega vencimientos al calendario del celular (.ics).

**Ajustes.** Rango aceptado del fc (por defecto 0,980–1,020), límites de error de
medición, pureza y densidad de los ácidos concentrados, y los instrumentos y
matraces que realmente hay en el laboratorio.

---

## Observaciones encontradas en el instructivo

La app las muestra en cada reactivo. Conviene revisarlas con el responsable del
documento:

1. **NH₄Cl (9):** la lista dice 30 ppm y el procedimiento 80 ppm.
2. **EDTA (12):** con la constante 0.395239, 0,1 g de CaCO₃ corresponde a ≈3,95 ml de
   EDTA con fc = 1, pero titulando los 100 ml completos se esperan ≈100 ml.
3. **NaOH 1N (17):** matraz de 1000 ml pero diluir a 500 ml.
4. **Almidón (22):** el nombre dice 5 % y la receta da 0,5 %.
5. **Ortotolidina (25):** matraz de 1000 ml, aforo a 500 ml, y el líquido agregado ya
   supera 500 ml. No se escala hasta confirmar.
6. **MgSO₄ (35):** dice 0,2 N, pero 0,8010 g/L equivale a ≈0,0065 N.
7. **HCl 6N (3):** con la alícuota de 10 ml el gasto sería ≈0,03 ml. La app ofrece
   valorar por pesada directa de Na₂CO₃.
8. **Estándar Coca-Cola Light (13):** dice «fosfato ácido de sodio», pero la fórmula
   KH₂PO₄ es de potasio.

---

## Publicarla en GitHub Pages

Son **7 archivos sueltos** (los íconos van dentro de `index.html` y
`manifest.webmanifest`):

```
index.html   app.js   data.js   styles.css
sw.js        manifest.webmanifest        .nojekyll
```

1. Crea un repositorio nuevo **público**.
2. **Add file → Upload files** y arrastra los 7 archivos. El `.nojekyll` empieza con
   punto: activa *Vista → Elementos ocultos* en Windows para verlo.
3. **Settings → Pages**, *Branch* `main`, carpeta `/ (root)`, guardar.
4. Queda en `https://<usuario>.github.io/<repositorio>/`.

La carpeta `icons/` no hace falta subirla; es solo respaldo.
`_version_anterior/` es la versión previa de la app.

## Instalarla en el celular

- **Android (Chrome):** menú ⋮ → *Instalar aplicación*.
- **iPhone (Safari):** Compartir → *Agregar a inicio*.

Después funciona sin internet.

## Actualizarla

Al cambiar cualquier archivo, sube la versión en la primera línea útil de `sw.js`:

```js
const VERSION = 'reactivos-v2';   // v3, v4…
```

Cuando salga una revisión nueva del instructivo, los datos están en `data.js`.

## Dónde se guardan los datos

En el dispositivo de cada analista, no en un servidor. Descarga el **respaldo**
(pestaña Registros) al terminar el turno; con *Restaurar* se recupera en otro
equipo.

---

Desarrollado por Marcelo Herrera · Calidad · Embol S.A.
