/* =====================================================================
   PREPARACIÓN DE REACTIVOS · datos
   Fuente: LP-AC-I-01.21 «Instructivo de preparación de reactivos para
   análisis», Versión 12 (06/05/2024). Registro: LP-AC-F-01.25.

   Cómo se lee cada reactivo
   ─────────────────────────
   vb      volumen (o masa) base del instructivo
   uf      unidad del producto final: 'ml' (solución) o 'g' (mezcla sólida)
   items   cantidades. Tipos:
             s  sólido que se pesa            → se escala y se revisa la balanza
             l  líquido que se mide exacto    → se escala y se revisa el instrumento
             w  agua o solvente aproximado    → se escala, sin control de precisión
             a  aforo (c.s.p. hasta el volumen final)
             x  texto (gotas, «hasta precipitado»…) → no se escala
           fijo:true  = parte de una solución madre que no cambia al escalar
   pasos   texto; {0},{1}… se reemplazan por la cantidad escalada del item,
           {V} por el volumen final elegido.
   val     cómo se valora (estandariza) la solución
   corr    con qué se puede corregir si la concentración real no es la ideal,
           en orden de preferencia (primero lo más seguro y fácil de medir)
   req     reactivos que deben estar preparados y vigentes antes
   obs     observaciones encontradas al revisar el instructivo
   ===================================================================== */
'use strict';

const INSTRUCTIVO = {
  codigo: 'LP-AC-I-01.21', version: '12', fecha: '06/05/2024',
  registro: 'LP-AC-F-01.25', epp: 'LP-SG-P-01.05', ambiental: 'LP-GA-G-01.00',
  vigenciaDias: 180, verifDias: 60
};

const CATS = {
  acidos:      { n: 'Ácidos',                  c: '#C2000B' },
  bases:       { n: 'Bases',                   c: '#0A6FCB' },
  titulantes:  { n: 'Titulantes',              c: '#0096A0' },
  indicadores: { n: 'Indicadores',             c: '#7B3FA0' },
  tampones:    { n: 'Tampones',                c: '#0E8F4E' },
  soluciones:  { n: 'Soluciones especiales',   c: '#D67400' },
  sales:       { n: 'Sales y otros',           c: '#4B5563' }
};

/* ── atajos para escribir los items ── */
const _S = (n, q, tol, x = {}) => Object.assign({ n, q, u: 'g', tol, t: 's' }, x);
const _L = (n, q, x = {}) => Object.assign({ n, q, u: 'ml', t: 'l' }, x);
const _W = (n, q, x = {}) => Object.assign({ n, q, u: 'ml', t: 'w' }, x);
const _A = (n = 'Agua destilada') => ({ n, t: 'a' });
const _X = (n, txt) => ({ n, txt, t: 'x' });

/* ── reactivos concentrados de partida (editables en Ajustes) ── */
const CONCENTRADOS = {
  hcl:   { n: 'HCl concentrado',   pct: 37, rho: 1.19, peq: 36.461 },
  h2so4: { n: 'H₂SO₄ concentrado', pct: 96, rho: 1.84, peq: 49.040 }
};

const R = [
/* ════════════════════════ ÁCIDOS ════════════════════════ */
{ id: 1, cat: 'acidos', nombre: 'Ácido Cítrico 6%', conc: { txt: '6 % p/v' }, vb: 1000, uf: 'ml',
  materiales: ['Balanza', 'Matraz aforado de {V} ml', 'Vaso para disolver', 'Botella de polietileno o vidrio'],
  items: [_S('Ácido cítrico', 60, 0.1), _W('Agua destilada para disolver', 500), _A()],
  pasos: ['Pese {0} de ácido cítrico en una balanza.', 'Disuelva en alrededor de {1} de agua destilada.',
          'Transfiera a un matraz aforado de {V}.', 'Afore con agua destilada hasta la marca de {V}.'],
  almacen: 'Botellas de polietileno o vidrio.' },

{ id: 2, cat: 'acidos', nombre: 'Ácido Clorhídrico (HCl) 0.04N', conc: { v: 0.04, u: 'N', txt: '0.04 N' }, vb: 1000, uf: 'ml',
  materiales: ['Pipeta graduada', 'Matraz aforado de {V} ml', 'Balanza analítica', 'Pipeta aforada clase A de 10 ml',
               'Matraz erlenmeyer de 50 ml', 'Micro bureta', 'Hornilla', 'Baño de agua'],
  items: [_L('HCl concentrado (37%)', 3.32), _A()],
  pasos: ['Con una pipeta graduada mida {0} de ácido clorhídrico concentrado (37%) y transfiera a un matraz aforado de {V}.',
          'Afore con agua destilada hasta la marca de {V}.'],
  estand: ['Pese 1.0 ± 0.001 g de carbonato de sodio en balanza analítica y registre el peso exacto al 0.001 g.',
           'Nota: el Na₂CO₃ anhidro bien almacenado puede desecarse a 120 °C por una hora; si absorbió humedad, a 270 °C por una hora.',
           'Transfiera el carbonato pesado a un matraz aforado de 1000 ml y afore con agua destilada.',
           'Mida 10 ml de esa solución con pipeta aforada clase A y transfiera a un erlenmeyer de 50 ml. Añada 5 gotas de púrpura de metilo.',
           'Titule con la solución de HCl hasta el primer cambio permanente a rosado (o púrpura). Use micro buretas para normalidades menores a 0.5 N.',
           'Hierva la solución 2 minutos en la hornilla.',
           'Enfríe en baño de agua y continúe la titulación hasta rosado permanente (pH 4.8): al añadir HCl ya no cambia el color.'],
  val: { tipo: 'patron', patron: 'Na₂CO₃', k: 0.18870, alicBase: 10, blanco: 0, mDef: 1.0, purDef: 100,
         directo: 1000 / 52.995,
         formula: 'N = (g Na₂CO₃ × pureza × 0.18870) / ml HCl',
         lblM: 'Na₂CO₃ pesado para el matraz de 1000 ml', lblV: 'HCl gastado' },
  corr: [{ tipo: 'agua' }, { tipo: 'sol', ref: 3, n: 'HCl 6N (reactivo 3)', N: 6 }, { tipo: 'conc', ref: 'hcl' }],
  req: [27],
  almacen: 'Botellas de polietileno o vidrio.' },

{ id: 3, cat: 'acidos', nombre: 'Ácido Clorhídrico (HCl) 6N', conc: { v: 6, u: 'N', txt: '6 N' }, vb: 1000, uf: 'ml',
  materiales: ['Probeta graduada de vidrio', 'Matraz aforado de {V} ml', 'Botella ámbar de polietileno o vidrio'],
  items: [_L('HCl concentrado (37%)', 500), _A()],
  pasos: ['Con una probeta graduada de vidrio mida {0} de HCl concentrado (37%) y transfiera a un matraz aforado de {V}.',
          'Añada agua destilada hasta casi la marca de aforo, mezcle y deje enfriar.',
          'Afore el matraz con agua destilada una vez que la solución esté fría.'],
  estand: ['Estandarice de la misma manera que el HCl 0.04N (patrón carbonato de sodio).'],
  val: { tipo: 'patron', patron: 'Na₂CO₃', k: 0.18870, alicBase: 10, blanco: 0, mDef: 1.0, purDef: 100,
         directo: 1000 / 52.995,
         formula: 'N = (g Na₂CO₃ × pureza × 0.18870) / ml HCl',
         lblM: 'Na₂CO₃ pesado para el matraz de 1000 ml', lblV: 'HCl gastado' },
  corr: [{ tipo: 'agua' }, { tipo: 'conc', ref: 'hcl' }],
  req: [27],
  seguridad: 'Trabaje en campana o zona ventilada: el HCl concentrado desprende vapores corrosivos. La dilución calienta la solución, deje enfriar antes de aforar.',
  obs: ['Con la alícuota de 10 ml del patrón (1 g/L de Na₂CO₃) el gasto esperado de HCl 6N es ≈0.03 ml, que no se puede medir bien. La app permite valorar por pesada directa de Na₂CO₃ en el erlenmeyer para que el gasto sea medible.'],
  almacen: 'Botellas de polietileno o vidrio de color ámbar.' },

{ id: 4, cat: 'acidos', nombre: 'Ácido Fosfórico (H₃PO₄) al 75%', conc: { txt: '75 %' }, vb: 100, uf: 'ml',
  materiales: ['Matraz aforado de {V} ml', 'Balanza', 'Vaso de precipitados', 'Botella de vidrio ámbar'],
  items: [_W('Agua destilada inicial', 10), _S('Ácido fosfórico 85% (o 93.8 g del 80% por 100 ml)', 88.2, null), _A()],
  pasos: ['Vierta alrededor de {0} de agua destilada en un matraz aforado de {V} y colóquelo sobre la balanza. Tare la balanza.',
          'Vierta ácido fosfórico en un vaso de precipitados.',
          'Pese {1} de ácido fosfórico del 85% directamente en el matraz.',
          'Afore con agua destilada hasta la marca de {V} y mezcle agitando.'],
  seguridad: 'Ácido corrosivo. Use guantes y protección ocular.',
  almacen: 'Botella de vidrio de color ámbar.' },

{ id: 5, cat: 'acidos', nombre: 'Ácido Sulfúrico (H₂SO₄) 0.02N', conc: { v: 0.02, u: 'N', txt: '0.02 N' }, vb: 1000, uf: 'ml',
  materiales: ['Probeta', 'Pipeta graduada', 'Matraz aforado de {V} ml clase A'],
  items: [_L('H₂SO₄ concentrado (densidad 1.84 g/ml)', 0.54), _W('Agua destilada inicial', 400), _A()],
  pasos: ['Mida {0} de ácido sulfúrico de densidad 1.84 g/ml con ayuda de una pipeta graduada.',
          'Vierta alrededor de {1} de agua a un matraz aforado de {V}, clase A.',
          'Vierta el ácido dentro del matraz cuidando que se deslice por las paredes.',
          'Añada agua destilada hasta casi la marca de aforo. Agite y deje enfriar a temperatura ambiente.',
          'Una vez fría, afore con agua destilada.'],
  estand: ['Utilice una solución estandarizada de NaOH para estandarizar la solución de ácido sulfúrico.'],
  val: { tipo: 'contra', titulante: 'NaOH 0.1N', refTit: 16, alicDef: 25, ntDef: 0.1,
         formula: 'N ácido = (N NaOH real × ml NaOH) / ml de ácido' },
  corr: [{ tipo: 'agua' }, { tipo: 'sol', ref: 6, n: 'H₂SO₄ 1.25N (reactivo 6)', N: 1.25 }, { tipo: 'conc', ref: 'h2so4' }],
  req: [16, 15],
  seguridad: 'Siempre añada el ácido sobre el agua, nunca al revés. Deje que se deslice por las paredes.',
  almacen: 'Botellas de vidrio o polietileno.' },

{ id: 6, cat: 'acidos', nombre: 'Ácido Sulfúrico (H₂SO₄) 1.25N', conc: { v: 1.25, u: 'N', txt: '1.25 N' }, vb: 1000, uf: 'ml',
  materiales: ['Probeta', 'Pipeta graduada', 'Matraz aforado de {V} ml clase A', 'Botella de vidrio o polietileno'],
  items: [_L('H₂SO₄ concentrado (densidad 1.84 g/ml)', 33.90), _W('Agua destilada inicial', 400), _A()],
  pasos: ['Mida {0} de ácido sulfúrico de densidad 1.84 g/ml con ayuda de una probeta y una pipeta graduada.',
          'Vierta alrededor de {1} de agua a un matraz aforado de {V}, clase A.',
          'Vierta el ácido dentro del matraz cuidando que se deslice por las paredes.',
          'Añada agua destilada hasta casi la marca de aforo. Agite y deje enfriar a temperatura ambiente.',
          'Una vez fría, afore con agua destilada.'],
  estand: ['Utilice una solución estandarizada de NaOH para estandarizar la solución de ácido sulfúrico.'],
  val: { tipo: 'contra', titulante: 'NaOH 1N', refTit: 17, alicDef: 10, ntDef: 1,
         formula: 'N ácido = (N NaOH real × ml NaOH) / ml de ácido' },
  corr: [{ tipo: 'agua' }, { tipo: 'conc', ref: 'h2so4' }],
  req: [17, 15],
  seguridad: 'Siempre añada el ácido sobre el agua, nunca al revés. Reacción muy exotérmica: deje enfriar antes de aforar.',
  almacen: 'Botellas de vidrio o polietileno.' },

/* ════════════════════════ INDICADORES ════════════════════════ */
{ id: 7, cat: 'indicadores', nombre: 'Azul de Bromofenol', conc: { txt: '0.04 % p/v' }, vb: 250, uf: 'ml',
  materiales: ['Balanza analítica', 'Matraz aforado clase A de {V} ml', 'Botella ámbar de polietileno o vidrio'],
  items: [_S('Sal sódica de azul de bromofenol', 0.1, 0.0001), _W('Agua destilada para disolver', 100), _A()],
  pasos: ['En balanza analítica pese {0} de sal sódica de azul de bromofenol.',
          'Disuelva en aproximadamente {1} de agua destilada y transfiera a un matraz aforado clase A de {V}.',
          'Afore con agua destilada hasta la marca de {V}.'],
  almacen: 'Botellas de polietileno o vidrio color ámbar.' },

{ id: 8, cat: 'indicadores', nombre: 'Azul de Metileno al 0.1%', conc: { txt: '0.1 % p/v' }, vb: 1000, uf: 'ml',
  materiales: ['Balanza analítica', 'Matraz aforado clase A de {V} ml', 'Probeta', 'Botella ámbar'],
  items: [_S('Azul de metileno en polvo', 1, 0.01), _L('Etanol al 95%', 300), _A()],
  pasos: ['Pese en balanza analítica {0} de azul de metileno en polvo.',
          'Disuelva en {1} de etanol al 95% y transfiera a un matraz aforado clase A de {V}.',
          'Afore con agua destilada hasta la marca de {V}.'],
  seguridad: 'El etanol es inflamable: lejos de fuentes de calor.',
  almacen: 'Botellas de polietileno o vidrio color ámbar.' },

{ id: 9, cat: 'sales', nombre: 'Cloruro de Amonio (NH₄Cl) 80 ppm', conc: { txt: '80 ppm (madre 2000 ppm)' }, vb: 500, uf: 'ml', vigencia: 7,
  materiales: ['Balanza analítica', 'Matraz volumétrico de 500 ml (madre)', 'Matraz volumétrico de {V} ml', 'Pipeta o probeta', 'Botella marrón (ámbar)'],
  items: [_S('NH₄Cl grado analítico (solución madre 500 ml)', 1.0, 0.01, { fijo: true }), _A('Agua destilada (madre, c.s.p. 500 ml)'),
          _L('Solución madre NH₄Cl 2000 ppm', 20), _A()],
  pasos: ['En balanza analítica pese {0} de NH₄Cl grado analítico.',
          'Diluya hasta la marca de 500 ml con agua destilada y mezcle bien. Esta es la solución madre de 2000 ppm.',
          'Agregue {2} de la solución madre de 2000 ppm a un matraz volumétrico de {V}.',
          'Diluya hasta la marca de {V} con agua destilada y mezcle bien. Esta es la solución de prueba de 80 ppm.',
          'Se utiliza para botellas de prueba del canal 1 del equipo ENOS.'],
  obs: ['En la lista inicial del instructivo figura «30 ppm», pero el procedimiento prepara 80 ppm. La app usa 80 ppm.',
        'Al escalar solo cambia la dilución final; la solución madre se prepara siempre en 500 ml.'],
  almacen: 'Estable una semana en botella marrón (ámbar).' },

{ id: 10, cat: 'sales', nombre: 'Cloruro de Bario (BaCl₂) al 10%', conc: { txt: '10 % p/v' }, vb: 100, uf: 'ml',
  materiales: ['Balanza analítica', 'Matraz aforado de {V} ml clase A', 'Botella de polietileno o vidrio'],
  items: [_S('Cloruro de bario dihidratado grado analítico', 10.9, 0.01), _A()],
  pasos: ['En balanza analítica pese {0} de cloruro de bario dihidratado de grado analítico.',
          'Transfiera a un matraz aforado de {V} clase A.',
          'Disuelva y lleve hasta la marca de {V} con agua destilada.'],
  seguridad: 'El cloruro de bario es tóxico. Manipule con guantes y evite contacto e ingestión.',
  almacen: 'Botellas de polietileno o vidrio.' },

{ id: 11, cat: 'indicadores', nombre: 'Cromato de Potasio (K₂CrO₄)', conc: { txt: '5 % p/v' }, vb: 100, uf: 'ml',
  materiales: ['Balanza analítica', 'Vaso de precipitados', 'Membrana de filtración de 0.8 µm', 'Matraz aforado clase A de {V} ml', 'Botella ámbar'],
  items: [_S('Cromato de potasio', 5, 0.005), _X('Nitrato de plata 0.02N', 'hasta precipitado rojo'), _A()],
  pasos: ['Pese {0} de cromato de potasio en balanza analítica y transfiera a un vaso de precipitados.',
          'Añada nitrato de plata (AgNO₃) 0.02N hasta que se forme un precipitado claramente rojo.',
          'Deje reposar la solución por 12 horas.',
          'Filtre a través de una membrana de 0.8 micras.',
          'Diluya el líquido filtrado hasta {V} en matraz aforado clase A.'],
  req: [24],
  seguridad: 'Los cromatos son tóxicos y cancerígenos. Use guantes y evite inhalar el polvo.',
  almacen: 'Botellas de polietileno o vidrio color ámbar.' },

/* ════════════════════════ TITULANTES ════════════════════════ */
{ id: 12, cat: 'titulantes', nombre: 'EDTA 0.01M (titulación de dureza)', conc: { v: 0.01, u: 'M', txt: '0.01 M' }, vb: 1000, uf: 'ml',
  materiales: ['Balanza analítica', 'Matraz aforado clase A de {V} ml', 'Matraz erlenmeyer de 500 ml', 'Embudo', 'Matraz aforado de 100 ml',
               'Matraz erlenmeyer de 250 ml', 'Bureta', 'Hornilla', 'Botellas de polietileno o Pirex'],
  items: [_S('EDTA (sal disódica dihidratada)', 3.723, 0.004), _A()],
  pasos: ['En balanza analítica pese {0} de EDTA.', 'Transfiera a un matraz aforado clase A de {V}.',
          'Disuelva con agua destilada y afore a {V}.'],
  estand: ['Pese 0.1 ± 0.001 g de carbonato de calcio anhidro (estándar primario, reducido en metales pesados, alcalinidad y magnesio).',
           'Transfiera a un erlenmeyer de 500 ml.',
           'Con un embudo en la boca del matraz añada cuidadosamente HCl 6N hasta disolver totalmente el carbonato.',
           'Añada 20 ml de agua destilada y lleve a ebullición durante 3 minutos.',
           'Enfríe y añada gotas de rojo de metilo; ajuste a anaranjado con NH₄OH 3N (si se torna roja) o HCl 6N (si se torna amarilla).',
           'Lleve a un matraz aforado clase A de 100 ml y afore con agua destilada.',
           'Transfiera los 100 ml a un erlenmeyer de 250 ml y titule con EDTA hasta viraje de anaranjado a rojo.'],
  val: { tipo: 'patron', patron: 'CaCO₃', k: 0.395239, alicBase: null, blanco: 0, mDef: 0.1, purDef: 100,
         formula: 'N = (m CaCO₃ × pureza × 0.395239) / V EDTA',
         lblM: 'CaCO₃ pesado', lblV: 'EDTA gastado' },
  corr: [{ tipo: 'agua' }, { tipo: 'solido', n: 'EDTA (Na₂EDTA·2H₂O)', peq: 372.24, pur: 99 }],
  req: [3, 28],
  obs: ['Con la constante 0.395239 del instructivo, 0.1 g de CaCO₃ corresponde a ≈3.95 ml de EDTA con fc = 1. Si se titulan los 100 ml completos, estequiométricamente se esperan ≈100 ml de EDTA 0.01 M. Conviene confirmar la constante o la alícuota antes de liberar el factor.'],
  almacen: 'Preferentemente botellas de polietileno o de Pirex.' },

{ id: 13, cat: 'soluciones', nombre: 'Estándar de Coca-Cola Light', conc: { v: 0.481, u: 'Abs', txt: '0.71 g/L KH₂PO₄ · Abs 0.479–0.483' }, vb: 1000, uf: 'ml',
  materiales: ['Estufa', 'Balanza analítica', 'Matraz aforado de {V} ml', 'Espectrofotómetro', 'Botella de vidrio ámbar'],
  items: [_S('Fosfato KH₂PO₄ desecado', 0.71, null), _A()],
  pasos: ['Deseque el fosfato (KH₂PO₄) en estufa a 120 °C por 2 horas.',
          'Una vez frío, pese {0} del fosfato y afore con agua destilada a {V} en matraz aforado de esa capacidad.',
          'Use la solución dentro de 6 meses. Almacene evitando evaporación y contaminación.'],
  estand: ['La absorbancia del análisis del estándar debe estar entre 0.479 y 0.483 unidades de absorbancia.'],
  val: { tipo: 'abs', min: 0.479, max: 0.483, obj: 0.481, formula: 'Absorbancia dentro de 0.479 – 0.483' },
  corr: [{ tipo: 'agua' }, { tipo: 'solido', n: 'KH₂PO₄ desecado', cpg: 0.481 / 0.71, pur: 100 }],
  obs: ['El instructivo lo llama «fosfato ácido de sodio», pero la fórmula indicada (KH₂PO₄) es fosfato diácido de potasio.'],
  almacen: 'Botella de vidrio color ámbar.' },

{ id: 14, cat: 'sales', nombre: 'Etanol al 55%', conc: { txt: '55 % v/v' }, vb: 100, uf: 'ml',
  materiales: ['Probeta graduada', 'Matraz aforado de {V} ml', 'Botella de polietileno o vidrio'],
  items: [_L('Alcohol al 95% (comercial)', 57.9), _A()],
  pasos: ['Mida en probeta graduada {0} de alcohol al 95% (alcohol comercial).', 'Afore a {V} en matraz aforado de esa capacidad.'],
  seguridad: 'Inflamable: lejos de fuentes de calor.',
  almacen: 'Botellas de polietileno o vidrio.' },

{ id: 15, cat: 'indicadores', nombre: 'Fenolftaleína (Indicador P)', conc: { txt: '0.5 % p/v' }, vb: 100, uf: 'ml',
  materiales: ['Balanza analítica', 'Matraz aforado de {V} ml', 'Botella ámbar'],
  items: [_S('Fenolftaleína', 0.5, 0.0001), _W('Alcohol para disolver', 30), _A('Alcohol')],
  pasos: ['Pese {0} de fenolftaleína en una balanza analítica.', 'Transfiera a un matraz aforado de {V}.',
          'Añada {1} de alcohol y agite hasta que se disuelva totalmente.', 'Afore hasta la marca de {V} con alcohol.'],
  seguridad: 'Inflamable: lejos de fuentes de calor.',
  almacen: 'Botellas de polietileno o vidrio color ámbar.' },

/* ════════════════════════ BASES ════════════════════════ */
{ id: 16, cat: 'bases', nombre: 'Hidróxido de Sodio (NaOH) 0.1N', conc: { v: 0.1, u: 'N', txt: '0.1 N' }, vb: 1000, uf: 'ml',
  materiales: ['Balanza analítica', 'Matraz aforado clase A de {V} ml a prueba de choques térmicos', 'Bureta', 'Estufa'],
  items: [_S('NaOH en pellets', 4, 0.01), _W('Agua destilada libre de CO₂ inicial', 400), _A('Agua destilada libre de CO₂')],
  pasos: ['Pese en balanza analítica {0} de hidróxido de sodio en pellets.',
          'Añada {1} de agua destilada libre de CO₂ a un matraz aforado clase A de {V} a prueba de choques térmicos.',
          'Transfiera los pellets al matraz aforado.', 'Agite suavemente hasta que los pellets se disuelvan totalmente.',
          'Diluya con agua destilada hasta la marca de {V} y mezcle completamente.'],
  estand: ['Muela (no pulverice) biftalato ácido de potasio (KHC₈H₄O₄) y deséquelo a 120 °C por 2 horas.',
           'En balanza analítica pese, al 0.0001 g, suficiente biftalato para gastar de 38 a 42 ml de NaOH (la app calcula la masa sugerida).',
           'Añada 50 ml de agua destilada libre de CO₂ y disuelva.',
           'Añada 3 gotas de fenolftaleína y titule agitando hasta un rosado suave (pH 8.6) que se mantenga 20 segundos.'],
  val: { tipo: 'patron', patron: 'Biftalato ácido de potasio', k: 1000 / 204.23, alicBase: null, blanco: 0, mDef: null, purDef: 100,
         vObj: 40, pm: 204.23,
         formula: 'N = (m biftalato × pureza × 1000) / (204.23 × V NaOH)',
         lblM: 'Biftalato pesado', lblV: 'NaOH gastado' },
  corr: [{ tipo: 'agua', n: 'Agua destilada libre de CO₂' }, { tipo: 'sol', ref: 17, n: 'NaOH 1N (reactivo 17)', N: 1 },
         { tipo: 'sol', ref: 39, n: 'NaOH 20% (reactivo 39, ≈5 N)', N: 5 }, { tipo: 'solido', n: 'NaOH en pellets', peq: 40.00, pur: 98, minG: 0.2, minTxt: 'un pellet pesa ≈0.1–0.2 g' }],
  req: [15],
  seguridad: 'El NaOH es corrosivo y su disolución es exotérmica. Use guantes y protección ocular.',
  almacen: 'Botellas de polietileno.' },

{ id: 17, cat: 'bases', nombre: 'Hidróxido de Sodio (NaOH) 1N', conc: { v: 1, u: 'N', txt: '1 N' }, vb: 500, uf: 'ml',
  materiales: ['Balanza analítica', 'Matraz aforado clase A de {V} ml a prueba de choques térmicos', 'Bureta'],
  items: [_S('NaOH en pellets', 20, 0.01), _W('Agua destilada libre de CO₂ inicial', 400), _A('Agua destilada libre de CO₂')],
  pasos: ['Pese en balanza analítica {0} de hidróxido de sodio en pellets.',
          'Añada {1} de agua destilada libre de CO₂ a un matraz aforado clase A de {V} a prueba de choques térmicos.',
          'Transfiera los pellets al matraz aforado.', 'Agite suavemente hasta que los pellets se disuelvan totalmente.',
          'Diluya con agua destilada hasta la marca de {V} y mezcle completamente.'],
  estand: ['Estandarice igual que la solución de NaOH 0.1N (patrón biftalato ácido de potasio).'],
  val: { tipo: 'patron', patron: 'Biftalato ácido de potasio', k: 1000 / 204.23, alicBase: null, blanco: 0, mDef: null, purDef: 100,
         vObj: 10, pm: 204.23,
         formula: 'N = (m biftalato × pureza × 1000) / (204.23 × V NaOH)',
         lblM: 'Biftalato pesado', lblV: 'NaOH gastado' },
  corr: [{ tipo: 'agua', n: 'Agua destilada libre de CO₂' }, { tipo: 'sol', ref: 39, n: 'NaOH 20% (reactivo 39, ≈5 N)', N: 5 },
         { tipo: 'solido', n: 'NaOH en pellets', peq: 40.00, pur: 98, minG: 0.2, minTxt: 'un pellet pesa ≈0.1–0.2 g' }],
  req: [15],
  obs: ['El instructivo indica un matraz de 1000 ml pero diluir hasta 500 ml. La app usa 500 ml como volumen base (20 g en 500 ml = 1 N).'],
  seguridad: 'Corrosivo y exotérmico al disolver. Use guantes y protección ocular.',
  almacen: 'Botellas de polietileno.' },

{ id: 18, cat: 'bases', nombre: 'Hidróxido de Sodio (NaOH) 10% p/p', conc: { txt: '10 %' }, vb: 100, uf: 'ml',
  materiales: ['Balanza', 'Matraz aforado de {V} ml'],
  items: [_W('Agua destilada inicial', 50), _S('NaOH en gránulos', 10, null), _A()],
  pasos: ['Vierta {0} de agua destilada en un matraz aforado de {V}.', 'Añada {1} de gránulos de NaOH al matraz y deje que se disuelvan.',
          'Diluya hasta la marca de {V} con agua destilada y mezcle bien.',
          'Esta solución se usa para la preparación de la botella de prueba del canal 1 del equipo ENOS.'],
  seguridad: 'NaOH corrosivo y exotérmico al disolver: use guantes y protección ocular.',
  almacen: 'Botella cerrada de polietileno.' },

/* ════════════════════════ INDICADORES ════════════════════════ */
{ id: 19, cat: 'indicadores', nombre: 'Indicador para Proxitane 1512', conc: { txt: 'KI 1 % + almidón 0.5 %' }, vb: 200, uf: 'ml',
  materiales: ['Balanza analítica', 'Recipiente para la suspensión', 'Botella de polietileno'],
  items: [_S('Yoduro de potasio', 2.00, 0.001), _L('Agua destilada para el KI (exacto)', 20), _S('Almidón', 1.00, 0.001),
          _W('Agua destilada fría', 10), _L('Agua destilada hirviente (exacto)', 170)],
  pasos: ['Pese {0} de yoduro de potasio en balanza analítica.', 'Disuelva en exactamente {1} de agua destilada. Reserve esta solución.',
          'Pese {2} de almidón en balanza analítica.', 'Añada {3} de agua destilada fría al almidón y forme una suspensión.',
          'Añada a la suspensión exactamente {4} de agua destilada hirviente.', 'Homogenice y deje enfriar.',
          'Mezcle la solución de almidón con la solución de yoduro de potasio preparada antes.', 'Agite la solución antes de utilizarla.'],
  almacen: 'Botella de polietileno.' },

{ id: 20, cat: 'indicadores', nombre: 'Indicador NET (Negro de Eriocromo T)', conc: { txt: '0.2 % en NaCl' }, vb: 100, uf: 'g',
  materiales: ['Balanza analítica', 'Mortero de porcelana grande', 'Envase hermético de polietileno ámbar'],
  items: [_S('Negro de Eriocromo T (NET)', 0.2, 0.001), _S('Cloruro de sodio (NaCl)', 99.8, 0.001)],
  pasos: ['Pese {0} de Negro de Eriocromo T en balanza analítica.', 'Pese {1} de cloruro de sodio en balanza analítica.',
          'Mezcle ambos compuestos en un mortero de porcelana grande y muela hasta un polvo fino (40 a 50 mallas) uniformemente mezclado.',
          'Guarde en envase herméticamente cerrado.'],
  almacen: 'Envases de polietileno de color ámbar.' },

{ id: 21, cat: 'indicadores', nombre: 'Indicador Murexida', conc: { txt: '0.2 % en NaCl' }, vb: 100, uf: 'g',
  materiales: ['Balanza analítica', 'Mortero de porcelana grande', 'Envase hermético de polietileno ámbar'],
  items: [_S('Murexida (purpurato de amonio)', 0.2, 0.001), _S('Cloruro de sodio (NaCl)', 99.8, 0.001)],
  pasos: ['Pese {0} de Murexida en balanza analítica.', 'Pese {1} de cloruro de sodio en balanza analítica.',
          'Mezcle ambos compuestos en un mortero de porcelana grande y muela hasta un polvo fino (40 a 50 mallas) uniformemente mezclado.',
          'Guarde en envase herméticamente cerrado.'],
  almacen: 'Envases de polietileno de color ámbar.' },

{ id: 22, cat: 'indicadores', nombre: 'Indicador Almidón al 5%', conc: { txt: 'según instructivo' }, vb: 100, uf: 'ml',
  materiales: ['Balanza analítica', 'Recipiente para la suspensión', 'Matraz aforado de {V} ml', 'Envase de vidrio ámbar'],
  items: [_S('Almidón', 0.5, 0.001), _W('Agua destilada fría', 5), _L('Agua hirviente (exacto)', 70), _A()],
  pasos: ['Pese {0} de almidón en balanza analítica.', 'Añada {1} de agua destilada fría y forme una suspensión.',
          'Añada a la suspensión exactamente {2} de agua hirviente.', 'Homogenice la solución y deje enfriar.',
          'Transfiera a un matraz de {V} y afore con agua destilada hasta la marca.'],
  obs: ['El nombre dice 5 %, pero 0.5 g en 100 ml equivale a 0.5 % p/v. Se mantiene la cantidad del instructivo.'],
  almacen: 'Envase de vidrio color ámbar. Agite antes de usar.' },

{ id: 23, cat: 'indicadores', nombre: 'Naranja de Metilo (Indicador M)', conc: { txt: '0.1 % p/v' }, vb: 250, uf: 'ml',
  materiales: ['Balanza analítica', 'Matraz aforado de {V} ml clase A', 'Botella ámbar'],
  items: [_S('Naranja de metilo', 0.25, 0.0003), _W('Agua destilada para disolver', 100), _A()],
  pasos: ['Pese {0} de naranja de metilo en balanza analítica y transfiera a un matraz aforado de {V} clase A.',
          'Añada {1} de agua destilada y agite hasta que se disuelva totalmente.',
          'Afore con agua destilada hasta la marca de {V} y mezcle.'],
  almacen: 'Botellas de polietileno o vidrio color ámbar.' },

/* ════════════════════════ TITULANTES ════════════════════════ */
{ id: 24, cat: 'titulantes', nombre: 'Nitrato de Plata (AgNO₃) 0.02N', conc: { v: 0.02, u: 'N', txt: '0.02 N' }, vb: 1000, uf: 'ml',
  materiales: ['Balanza analítica', 'Matraz aforado de {V} ml clase A', 'Matraz aforado de 1000 ml (patrón)', 'Pipeta de 20 ml',
               'Erlenmeyer o vaso de precipitados', 'Bureta', 'Estufa', 'Envase ámbar'],
  items: [_S('Nitrato de plata', 3.40, 0.003), _W('Agua destilada para disolver', 500), _A()],
  pasos: ['En balanza analítica pese {0} de nitrato de plata.', 'Disuelva en alrededor de {1} de agua destilada.',
          'Transfiera a un matraz aforado de {V}, clase A.', 'Afore hasta la línea de {V}.'],
  estand: ['Deseque cloruro de sodio grado analítico a 140 °C por 2 horas.',
           'Pese 1.20 ± 0.001 g de NaCl y transfiéralo a un matraz aforado de 1000 ml.',
           'Disuelva en alrededor de 500 ml de agua destilada y afore hasta la marca.',
           'Pipetee 20 ml dentro de un erlenmeyer o vaso de precipitados.',
           'Añada 5 gotas de cromato de potasio y titule con AgNO₃ hasta un color rojo-café que permanezca 30 segundos.'],
  val: { tipo: 'patron', patron: 'NaCl', k: 0.34223, alicBase: 20, blanco: 0.2, mDef: 1.20, purDef: 100,
         formula: 'N = (m NaCl × pureza × 0.34223) / (V AgNO₃ − 0.2)',
         lblM: 'NaCl pesado para el matraz de 1000 ml', lblV: 'AgNO₃ gastado' },
  corr: [{ tipo: 'agua' }, { tipo: 'solido', n: 'Nitrato de plata', peq: 169.87, pur: 99.8 }],
  req: [11],
  seguridad: 'El nitrato de plata es corrosivo y mancha la piel. Use guantes.',
  almacen: 'Envase color ámbar fuertemente cerrado para evitar su degradación.' },

{ id: 25, cat: 'indicadores', nombre: 'Ortotolidina (Solución «O»)', conc: { txt: 'según instructivo' }, vb: 1000, uf: 'ml', noEscala: true,
  materiales: ['Balanza analítica', 'Mortero grande con mazo', 'Probeta graduada de 500 ml', 'Matraz aforado de 1000 ml', 'Frascos ámbar'],
  items: [_S('Ortotolidina (o 1.343 ± 0.001 g de clorhidrato)', 0.5, 0.001), _W('Agua para HCl 1:4', 400), _L('HCl concentrado para HCl 1:4', 100),
          _W('Solución HCl 1:4 para la pasta', 5), _W('Agua destilada para disolver la pasta', 200), _A()],
  pasos: ['En balanza analítica pese {0} de ortotolidina y transfiera a un mortero grande.',
          'En probeta de 500 ml mida {1} de agua y complete a 500 ml con {2} de HCl concentrado. Esta es la solución HCl 1:4 (añada el ácido sobre el agua, nunca al revés).',
          'Añada {3} de la solución HCl 1:4 al mortero y con el mazo forme una pasta delgada.',
          'Disuelva la pasta en {4} de agua destilada y transfiera enjuagando a un matraz aforado de 1000 ml.',
          'Añada el restante de la solución HCl 1:4 al matraz aforado.',
          'Afore el matraz con agua destilada (el instructivo indica «hasta la marca de los 500 ml»).'],
  obs: ['El instructivo usa un matraz de 1000 ml pero dice aforar a 500 ml, y el líquido agregado (≈700 ml) ya supera esa marca. Confirme el volumen final. Por eso esta receta no se escala.'],
  seguridad: '⚠ La ortotolidina es un agente CANCERÍGENO. No salpique ropa ni manos y lávese las manos inmediatamente después de usarla. Al preparar el HCl 1:4 añada siempre el ácido sobre el agua.',
  almacen: 'Frascos ámbar por no más de 6 meses.' },

{ id: 26, cat: 'titulantes', nombre: 'Permanganato de Potasio (KMnO₄) 0.2N', conc: { txt: '0.2 N' }, vb: 500, uf: 'ml',
  materiales: ['Balanza analítica', 'Matraz aforado clase A de {V} ml', 'Botella ámbar'],
  items: [_S('Permanganato de potasio grado analítico', 3.16, 0.001), _W('Agua destilada para disolver', 250), _A()],
  pasos: ['En balanza analítica pese {0} de permanganato de potasio grado analítico.',
          'Disuelva en aproximadamente {1} de agua destilada.',
          'Transfiera a un matraz aforado clase A de {V}.', 'Afore hasta la marca con agua destilada y mezcle perfectamente.'],
  obs: ['El instructivo dice disolver en «aproximadamente 500 ml» y luego llevar a un matraz de 500 ml; la app sugiere disolver en la mitad del volumen final.'],
  seguridad: 'Oxidante fuerte. Manténgalo lejos de material orgánico y combustible.',
  almacen: 'Botellas de polietileno o vidrio color ámbar.' },

{ id: 27, cat: 'indicadores', nombre: 'Púrpura de Metilo (Indicador M preferente)', conc: { txt: 'mezcla de indicadores' }, vb: 100, uf: 'ml',
  materiales: ['Balanza analítica', 'Matraz aforado de {V} ml', 'Botella ámbar'],
  items: [_S('Azul de bromocresol', 0.033, 0.0001), _S('Rojo de metilo', 0.066, 0.0001), _W('Etanol o isopropanol para disolver', 50), _A('Alcohol utilizado')],
  pasos: ['Pese {0} de azul de bromocresol y {1} de rojo de metilo en una balanza analítica.',
          'Transfiera los cristales a un matraz aforado de {V}.',
          'Añada alrededor de {2} de etanol o isopropanol y agite hasta disolver totalmente.',
          'Afore con el alcohol utilizado hasta la marca de {V} y mezcle.'],
  seguridad: 'Alcohol inflamable: lejos de fuentes de calor.',
  almacen: 'Botellas de polietileno o vidrio color ámbar.' },

{ id: 28, cat: 'indicadores', nombre: 'Rojo de Metilo', conc: { txt: '0.1 % p/v' }, vb: 100, uf: 'ml',
  materiales: ['Balanza analítica', 'Matraz aforado clase A de {V} ml', 'Membrana de 0.8 µm', 'Frascos ámbar'],
  items: [_S('Rojo de metilo', 0.100, 0.0001), _W('Etanol al 95% para disolver', 50), _A('Etanol')],
  pasos: ['En balanza analítica pese {0} de rojo de metilo.',
          'Disuelva en aproximadamente {1} de etanol al 95% y transfiera a un matraz aforado clase A de {V}.',
          'Diluya hasta la marca de {V} con etanol.',
          'Filtre a través de una membrana de 0.8 micras si observa partículas sin disolver.'],
  seguridad: 'Etanol inflamable: lejos de fuentes de calor.',
  almacen: 'Frascos de color ámbar.' },

/* ════════════════════════ SOLUCIONES ESPECIALES ════════════════════════ */
{ id: 29, cat: 'soluciones', nombre: 'Solución N#2 (bisulfito 8% + hidroquinona 0.5%)', conc: { txt: '8 % + 0.5 % p/v' }, vb: 1000, uf: 'ml',
  materiales: ['Balanza', 'Matraz aforado de {V} ml', 'Botellas de vidrio ámbar'],
  items: [_S('Hidroquinona', 5, null), _S('Bisulfito de sodio (Na₂S₂O₅)', 80, null), _A()],
  pasos: ['Pese {0} de hidroquinona y {1} de bisulfito de sodio (Na₂S₂O₅).', 'Disuelva y afore a {V} con agua destilada.',
          'Opcional: como la hidroquinona es inestable, puede preparar por separado la solución de bisulfito y la de hidroquinona y mezclarlas bien momentos antes de aforar.'],
  seguridad: 'La hidroquinona es tóxica y sensibilizante. Use guantes y evite el polvo.',
  almacen: 'Botellas de vidrio color ámbar.' },

{ id: 30, cat: 'soluciones', nombre: 'Solución N#3 (molibdato de amonio)', conc: { txt: 'según instructivo' }, vb: 1000, uf: 'ml',
  materiales: ['Probeta graduada', 'Vasos de precipitados', 'Matraz aforado de {V} ml', 'Botella de vidrio ámbar'],
  items: [_W('Agua destilada', 500), _L('H₂SO₄ concentrado', 57), _S('Molibdato de amonio·4H₂O', 31.1, null), _W('Agua para disolver el molibdato', 250), _A()],
  pasos: ['Mida {0} de agua destilada en una probeta y transfiera a un vaso de precipitados.',
          'Añada con extremo cuidado al agua {1} de ácido sulfúrico concentrado. Mezcle bien y deje enfriar a temperatura ambiente.',
          'En otro vaso disuelva {2} de molibdato de amonio·4H₂O con {3} de agua destilada.',
          'Agregue lentamente la solución de molibdato a la de ácido sulfúrico y mezcle hasta una solución homogénea.',
          'Trasvase a un matraz aforado de {V} y afore con agua destilada.'],
  seguridad: 'Añada siempre el ácido sulfúrico sobre el agua, con extremo cuidado (muy exotérmico).',
  almacen: 'Botellas de vidrio color ámbar.' },

{ id: 31, cat: 'soluciones', nombre: 'Solución N#4 (acetato de sodio 34% p/v)', conc: { txt: '34 % p/v' }, vb: 1000, uf: 'ml',
  materiales: ['Balanza', 'Matraz aforado de {V} ml', 'Botella de polietileno o vidrio ámbar'],
  items: [_S('Acetato de sodio·3H₂O', 340, null), _A()],
  pasos: ['Pese {0} de acetato de sodio·3H₂O.', 'Disuelva la sal con un volumen adecuado de agua destilada.',
          'Trasvase a un matraz aforado de {V} y afore con agua destilada.'],
  almacen: 'Botellas de polietileno o vidrio color ámbar, protegidas de la luz. Úsela en un máximo de 6 meses.' },

/* ════════════════════════ TAMPONES ════════════════════════ */
{ id: 32, cat: 'tampones', nombre: 'Solución Tampón para Dureza Parcial (pH 12)', conc: { txt: '= NaOH 1N' }, vb: 500, uf: 'ml', noEscala: true, alias: 17,
  materiales: ['Ver NaOH 1N (reactivo 17)'],
  items: [_X('Hidróxido de sodio 1N', 'según reactivo 17')],
  pasos: ['La solución tampón de pH 12 es hidróxido de sodio (NaOH) 1N.', 'Prepárela y estandarícela con la receta del reactivo 17.'],
  req: [17],
  almacen: 'Igual que el NaOH 1N: botellas de polietileno.' },

{ id: 33, cat: 'tampones', nombre: 'Solución Tampón para Dureza Total (pH 10)', conc: { txt: 'pH 10' }, vb: 500, uf: 'ml',
  materiales: ['Balanza', 'Matraz aforado de {V} ml', 'Probeta graduada', 'pH-metro', 'Envase opaco de plástico o vidrio'],
  items: [_S('Cloruro de amonio', 27.00, null), _W('Agua destilada para disolver', 200), _L('Amoniaco (hidróxido de amonio)', 175), _A()],
  pasos: ['Pese {0} de cloruro de amonio y disuélvalos en {1} de agua destilada.',
          'Vierta la solución a un matraz aforado de {V}. Enjuague el envase en el que disolvió el cloruro de amonio.',
          'Mida {2} de amoniaco (hidróxido de amonio) en probeta graduada y viértalos al matraz aforado.',
          'Afore el matraz con agua destilada.',
          'Verifique el pH final. Puede ajustarlo añadiendo hidróxido de amonio gota a gota.'],
  seguridad: 'El amoniaco desprende vapores irritantes. Trabaje en campana o zona ventilada.',
  almacen: 'Envase opaco de plástico o vidrio.' },

{ id: 34, cat: 'sales', nombre: 'Sulfato de Cobre (CuSO₄) 2.5%', conc: { txt: '2.5 % p/v' }, vb: 500, uf: 'ml',
  materiales: ['Balanza analítica', 'Matraz aforado de {V} ml', 'Botella ámbar'],
  items: [_S('Sulfato de cobre', 12.5, 0.005), _W('Agua destilada para disolver', 250), _A()],
  pasos: ['Pese {0} de sulfato de cobre en balanza analítica.', 'Disuelva en aproximadamente {1} de agua destilada y transfiera a un matraz aforado de {V}.',
          'Afore hasta la marca de {V} con agua destilada.'],
  almacen: 'Botella color ámbar.' },

{ id: 35, cat: 'titulantes', nombre: 'Sulfato de Magnesio (titulante aditivo LE)', conc: { txt: '0.2 N según instructivo' }, vb: 1000, uf: 'ml',
  materiales: ['Balanza analítica', 'Matraz aforado de {V} ml clase A', 'Envase opaco de plástico o vidrio'],
  items: [_S('MgSO₄·7H₂O', 0.8010, 0.001), _W('Agua destilada para disolver', 300), _A()],
  pasos: ['Pese {0} de MgSO₄·7H₂O al 0.001 g.', 'Disuelva en {1} de agua destilada y transfiera a un matraz aforado de {V}, clase A.',
          'Afore el matraz con agua destilada.'],
  obs: ['El instructivo indica que la solución es 0.2 N, pero 0.8010 g/L de MgSO₄·7H₂O equivale a ≈0.0065 N (0.00325 M). Conviene confirmar la masa o la concentración.'],
  almacen: 'Envase opaco de plástico o vidrio.' },

{ id: 36, cat: 'sales', nombre: 'Tiocianato de Potasio (KSCN) 2%', conc: { txt: '2 % p/v' }, vb: 500, uf: 'ml',
  materiales: ['Balanza analítica', 'Matraz aforado clase A de {V} ml', 'Botella ámbar'],
  items: [_S('Tiocianato de potasio grado analítico', 10, 0.02), _W('Agua destilada para disolver', 250), _A()],
  pasos: ['En balanza analítica pese {0} de tiocianato de potasio de grado analítico.', 'Disuelva en aproximadamente {1} de agua destilada.',
          'Transfiera a un matraz aforado clase A de {V}.', 'Afore hasta la marca con agua destilada y mezcle perfectamente.'],
  almacen: 'Botellas de polietileno o vidrio color ámbar.' },

{ id: 37, cat: 'titulantes', nombre: 'Tiosulfato de Sodio (Solución T)', conc: { txt: '2.5 % p/v' }, vb: 500, uf: 'ml',
  materiales: ['Balanza analítica', 'Matraz aforado de {V} ml clase A', 'Botella ámbar'],
  items: [_S('Tiosulfato de sodio (Na₂S₂O₃·5H₂O)', 12.5, 0.02), _W('Agua destilada para disolver', 250), _A()],
  pasos: ['En balanza analítica pese {0} de tiosulfato de sodio.', 'Transfiera a un matraz aforado de {V}, clase A.',
          'Disuelva con alrededor de {1} de agua destilada.', 'Afore con agua destilada.'],
  almacen: 'Botellas de polietileno o vidrio color ámbar.' },

{ id: 38, cat: 'titulantes', nombre: 'Yoduro de Potasio (KI) 0.2N', conc: { txt: '0.2 N' }, vb: 100, uf: 'ml',
  materiales: ['Balanza analítica', 'Matraz aforado de {V} ml', 'Botella de vidrio ámbar'],
  items: [_S('Yoduro de potasio', 3.337, 0.005), _W('Agua destilada para disolver', 25), _A()],
  pasos: ['Pese {0} de yoduro de potasio en balanza analítica.', 'Disuelva en aproximadamente {1} de agua destilada y transfiera a un matraz aforado de {V}.',
          'Afore con agua destilada hasta la marca.'],
  obs: ['El instructivo no escribe el paso de aforo; se asume aforo a 100 ml (3.337 g en 100 ml = 0.2 N).'],
  almacen: 'Botella de vidrio color ámbar.' },

{ id: 39, cat: 'bases', nombre: 'Hidróxido de Sodio (NaOH) 20%', conc: { txt: '20 % p/v (≈5 N)' }, vb: 1000, uf: 'ml',
  materiales: ['Balanza', 'Matraz aforado clase A de {V} ml a prueba de choques térmicos', 'Botellas de polietileno'],
  items: [_S('NaOH en pellets', 200, 0.01), _W('Agua destilada libre de CO₂ inicial', 400), _A('Agua destilada libre de CO₂')],
  pasos: ['Pese en balanza {0} de hidróxido de sodio en pellets.',
          'Añada {1} de agua destilada libre de CO₂ a un matraz aforado clase A de {V} a prueba de choques térmicos.',
          'Transfiera los pellets al matraz aforado, poco a poco.', 'Agite suavemente hasta que los pellets se disuelvan totalmente.',
          'Diluya con agua destilada hasta la marca de {V} y mezcle completamente.'],
  seguridad: 'Solución muy concentrada, corrosiva y fuertemente exotérmica. Añada los pellets lentamente. Use guantes, protección ocular y facial.',
  almacen: 'Botellas de polietileno.' },

{ id: 40, cat: 'sales', nombre: 'Tolueno / Etanol 280 ppm', conc: { txt: '280 ppm (madre 0.7 %)' }, vb: 500, uf: 'ml', vigencia: 7,
  materiales: ['Pipeta volumétrica', 'Matraz volumétrico de 500 ml (madre)', 'Probeta graduada de 50 ml', 'Matraz volumétrico de {V} ml', 'Botella marrón (ámbar)'],
  items: [_L('Tolueno (solución madre 500 ml)', 3.5, { fijo: true }), _A('Etanol al 95% (madre, c.s.p. 500 ml)'),
          _L('Solución madre tolueno/etanol 0.7%', 20.0), _A()],
  pasos: ['Con una pipeta volumétrica añada {0} de tolueno a un matraz volumétrico de 500 ml.',
          'Diluya hasta la marca de 500 ml con etanol al 95% y mezcle bien. Esta es la solución madre de tolueno 0.7 %.',
          'Agregue {2} de la solución madre 0.7 % a un matraz volumétrico limpio y seco de {V}.',
          'Diluya hasta la marca de {V} con agua destilada y mezcle bien. Esta es la solución de prueba de 280 ppm.'],
  obs: ['Al escalar solo cambia la dilución final; la solución madre se prepara siempre en 500 ml.'],
  seguridad: 'El tolueno es inflamable y sus vapores son tóxicos. Trabaje en zona ventilada, lejos de fuentes de ignición.',
  almacen: 'Estable una semana en botella marrón (ámbar).' }
];

/* ── Instrumentos de medición por defecto (editables en Ajustes) ──
   u = incertidumbre típica (tolerancia del instrumento clase A o legibilidad).
   min/max = rango en el que se recomienda usarlo.                         */
const INSTRUMENTOS_DEF = {
  balanzas: [
    { n: 'Balanza analítica',  d: 0.0001, max: 220 },
    { n: 'Balanza de precisión', d: 0.01, max: 2000 }
  ],
  volumen: [
    { n: 'Micropipeta 10–100 µL',   min: 0.01, max: 0.1,  u: 0.0008 },
    { n: 'Micropipeta 100–1000 µL', min: 0.1,  max: 1,    u: 0.008 },
    { n: 'Pipeta graduada 1 ml',    min: 0.1,  max: 1,    u: 0.006 },
    { n: 'Pipeta graduada 5 ml',    min: 0.5,  max: 5,    u: 0.03 },
    { n: 'Pipeta graduada 10 ml',   min: 1,    max: 10,   u: 0.05 },
    { n: 'Pipeta graduada 25 ml',   min: 2.5,  max: 25,   u: 0.1 },
    { n: 'Probeta 10 ml',           min: 2,    max: 10,   u: 0.2 },
    { n: 'Probeta 50 ml',           min: 10,   max: 50,   u: 0.5 },
    { n: 'Probeta 100 ml',          min: 20,   max: 100,  u: 0.5 },
    { n: 'Probeta 500 ml',          min: 100,  max: 500,  u: 2.5 },
    { n: 'Probeta 1000 ml',         min: 200,  max: 1000, u: 5 }
  ],
  matraces: [25, 50, 100, 250, 500, 1000, 2000]
};

/* Criterios por defecto (editables en Ajustes). El instructivo solo dice
   «soluciones dentro de especificación», no fija un rango para el factor. */
const CRITERIOS_DEF = {
  fcMin: 0.98, fcMax: 1.02,        // factor de corrección aceptado
  precOk: 0.5, precMax: 1.0,       // % de error de medición: verde ≤ ok, ámbar ≤ max
  replicas: 1.0,                   // % máximo de dispersión entre réplicas
  avisoDias: 15                    // días antes del vencimiento para avisar
};
