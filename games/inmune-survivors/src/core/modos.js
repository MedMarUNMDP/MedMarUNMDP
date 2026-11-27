// Modos de juego de Inmune Survivors (v3.8): Sandbox infinito y Foco por núcleo.
// Lógica pura (sin Phaser) para poder testearla. El puntaje se recalcula igual en el servidor
// (supabase/functions/api, acción guardarPuntaje): si cambiás la fórmula, cambiala en los dos lados.
(function registerModos(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.InmuneModos = api;
})(typeof globalThis !== 'undefined' ? globalThis : null, function createModos() {
  'use strict';

  const FAMILIAS = Object.freeze(['bacteria', 'virus', 'fungus', 'parasite']);

  const MULTIPLICADOR_INFECCION = Object.freeze({ ambulatorio: 0.75, internado: 1, inmunosuprimido: 1.5 });
  const MULTIPLICADOR_EVOLUCION = Object.freeze({ no_curse: 0.75, estudiante: 1, infectologo: 1.5 });

  // Tejido (id de mapa del motor) donde se juega cada núcleo.
  const MAPA_NUCLEO = Object.freeze({
    '6': 'intestinal', '7': 'alveolar', '7.1': 'neural', '8': 'mucosa', '9': 'endothelium',
    '10': 'endothelium', '11': 'dermis', '12': 'dermis', '13-14': 'alveolar'
  });
  const MAPAS_SANDBOX = Object.freeze(['endothelium', 'mucosa', 'epithelium', 'dermis', 'alveolar', 'muscle', 'intestinal', 'neural']);

  // Proporción de cada familia según cuántos agentes tiene el modo. La raíz cuadrada evita que una familia
  // muy numerosa tape a las demás; una familia sin agentes no aparece.
  function pesosFamilias(agentes) {
    const cuenta = Object.fromEntries(FAMILIAS.map((f) => [f, 0]));
    for (const a of agentes) if (a && cuenta[a.familia] !== undefined) cuenta[a.familia] += 1;
    const crudos = FAMILIAS.map((f) => Math.sqrt(cuenta[f]));
    const total = crudos.reduce((s, v) => s + v, 0) || 1;
    return Object.fromEntries(FAMILIAS.map((f, i) => [f, crudos[i] / total]));
  }

  function claveRanking(modo, nucleoId) {
    return modo === 'nucleo' && nucleoId ? `nucleo-${nucleoId}` : 'sandbox';
  }

  const MODO_RANKING_VALIDO = /^(sandbox|nucleo-(6|7|7\.1|8|9|10|11|12|13-14))$/;
  function esModoRankingValido(clave) { return MODO_RANKING_VALIDO.test(String(clave || '')); }

  // datos: el catálogo (InmuneAgentes). Un núcleo inexistente cae en Sandbox.
  function crearModo(opciones, datos) {
    const op = opciones || {};
    const nucleo = op.modo === 'nucleo' && datos ? datos.nucleo(op.nucleo) : null;
    if (nucleo) {
      const agentes = datos.agentesDeNucleo(nucleo.id);
      return Object.freeze({
        id: 'nucleo', nucleoId: nucleo.id, rankingModo: claveRanking('nucleo', nucleo.id),
        etiqueta: `Núcleo ${nucleo.id} · ${nucleo.nombre}`, corto: `Núcleo ${nucleo.id}`,
        agentes: Object.freeze(agentes.map((a) => a.id)), pesos: Object.freeze(pesosFamilias(agentes)),
        mapas: Object.freeze([MAPA_NUCLEO[nucleo.id] || 'endothelium']),
        jefes: Object.freeze([Object.freeze({ agente: nucleo.jefe.agente, titulo: nucleo.jefe.titulo, nucleo: nucleo.id })])
      });
    }
    const agentes = datos ? datos.AGENTES.filter((a) => a.nucleos.length > 0) : [];
    return Object.freeze({
      id: 'sandbox', nucleoId: null, rankingModo: 'sandbox',
      etiqueta: 'Sandbox infinito · todos los núcleos', corto: 'Sandbox',
      agentes: Object.freeze(agentes.map((a) => a.id)),
      pesos: Object.freeze(agentes.length ? pesosFamilias(agentes) : { bacteria: 0.3, virus: 0.25, fungus: 0.2, parasite: 0.25 }),
      mapas: MAPAS_SANDBOX,
      // El Sandbox mezcla los jefes de todos los núcleos (el juego los alterna con los cuatro jefes clásicos).
      jefes: Object.freeze(datos ? datos.NUCLEOS.map((n) => Object.freeze({ agente: n.jefe.agente, titulo: n.jefe.titulo, nucleo: n.id })) : [])
    });
  }

  function calcularPuntaje(r) {
    const kills = Math.max(0, Math.floor(Number(r.kills) || 0));
    const segundos = Math.max(0, Math.floor(Number(r.segundos) || 0));
    const correctas = Math.max(0, Math.floor(Number(r.correctas) || 0));
    const mi = MULTIPLICADOR_INFECCION[r.dificultadInfeccion] ?? 1;
    const me = MULTIPLICADOR_EVOLUCION[r.dificultadEvolucion] ?? 1;
    return Math.floor((kills * 10 + segundos * 2 + correctas * 25) * mi * me);
  }

  // ---------- Tope de apariciones ----------
  // Cuántos patógenos pueden haber aparecido como máximo en los primeros `segundos` de una partida: no se puede
  // eliminar más de lo que apareció, así que las eliminaciones por segundo siguen al ritmo de aparición, que cambia
  // con el tiempo (sube con los minutos y se dispara en la multirresistencia).
  // Recorre el peor caso de cada fuente de la escena Arena (game.js): goteo continuo (spawnClock), brotes
  // (waveClock), focos desatendidos, oleadas por respuesta incorrecta, jefes y sus súbditos, y la multirresistencia
  // desde `multirresistencia` (segundo en que empezó, o null). Usa la presión máxima del director (1,45), el primer
  // jefe a los 120 s, todos los jefes vivos hasta el final soltando súbditos al ritmo del más rápido (VIH) y no
  // descuenta el tope de enemigos vivos: nunca da menos que una partida real.
  // **Duplicada en supabase/functions/api (guardarPuntaje)**: si cambian los ritmos de aparición en game.js,
  // cambiá las dos y corré tests/modos.test.cjs (compara el tope con partidas simuladas).
  const APARICION_DIFICULTAD = Object.freeze({
    ambulatorio: Object.freeze({ spawn: 1.38, waves: 0.70 }),
    internado: Object.freeze({ spawn: 1.22, waves: 0.82 }),
    inmunosuprimido: Object.freeze({ spawn: 0.82, waves: 1.22 })
  });
  const PRESION_MAXIMA = 1.45;
  function maxApariciones(p) {
    const T = Math.max(0, Math.floor(Number(p && p.segundos) || 0));
    const d = APARICION_DIFICULTAD[p && p.dificultadInfeccion] || APARICION_DIFICULTAD.inmunosuprimido;
    // La multirresistencia llega después de vencer a los jefes del modo (el primero aparece a los 120 s como pronto):
    // si se declara antes o sin jefes vencidos, no cuenta.
    const md = p && p.multirresistencia;
    const tm = Number.isInteger(md) && md >= 120 && md <= T && Number(p.jefes) >= 1 ? md : Infinity;
    const P = PRESION_MAXIMA, DT = 0.1;
    let total = 0, subditos = 0, jefesVivos = 0, multiIniciada = false;
    let goteo = 0, brote = 65, foco = 38, jefe = 120, resistencia = Infinity;
    const brotesFoco = [];
    const sumarJefes = (n) => { jefesVivos += n; total += n * 5; }; // el jefe + hasta 4 súbditos de una vez (toxoplasma)
    for (let i = 0, pasos = Math.round(T / DT); i < pasos; i++) {
      const t = i * DT, multi = t >= tm;
      if (multi && !multiIniciada) { multiIniciada = true; sumarJefes(3); resistencia = 26; }
      const intervalo = Math.max(multi ? 0.18 : 0.47, (1.38 - t * 0.00275) / (1 + P * 0.2) * (multi ? 0.47 : 1) * d.spawn);
      goteo += DT;
      while (goteo >= intervalo) {
        goteo -= intervalo;
        total += multi ? Math.min(10, 5 + Math.floor((t - tm) / 70)) : Math.min(4, (t < 55 ? 1 : t < 145 ? 2 : 3) + Math.floor(P * 0.72));
      }
      brote -= DT;
      if (brote <= 0) {
        const base = multi ? Math.min(34, 12 + Math.floor((t - tm) / 18)) : Math.min(12, 3 + Math.floor(t / 90) + Math.floor(P * 1.2));
        total += Math.max(2, Math.round(base * d.waves));
        brote = (multi ? Math.max(9.5, 19 - (t - tm) * 0.008) : Math.max(44, 68 - t * 0.012)) * d.spawn;
      }
      foco -= DT;
      if (foco <= 0) { brotesFoco.push(t + 65); foco = 52; }
      while (brotesFoco.length && brotesFoco[0] <= t) {
        brotesFoco.shift();
        total += Math.floor(Math.min(13, 5 + Math.floor(t / 85) + Math.floor(P * 2)) * d.waves);
      }
      jefe -= DT;
      if (jefe <= 0) { sumarJefes(1); jefe = multi ? 28 : 120; }
      if (multi) { resistencia -= DT; if (resistencia <= 0) { sumarJefes(2); resistencia = 34; } }
      const ritmo = Math.pow(Math.min(3.2, 1 + t / 600), 0.6);
      subditos += jefesVivos * (multi ? 5 / (4.9 / ritmo) : 3 / (7 / ritmo)) * DT;
    }
    const incorrectas = Math.max(0, Math.floor(Number(p && p.preguntas) || 0) - Math.floor(Number(p && p.correctas) || 0));
    total += incorrectas * Math.min(12, 6 + Math.floor(T / 80));
    // Margen por el redondeo de los cuadros (el juego avanza de a ~16 ms y este cálculo de a 100 ms).
    return Math.ceil((total + subditos) * 1.05) + 10;
  }

  // Mismos topes que valida el servidor (guardarPuntaje): una partida que no los cumple no entra al ranking.
  // Las eliminaciones no pueden superar a los patógenos aparecidos ni el máximo que pudo aparecer en ese tiempo
  // (maxApariciones).
  function esPartidaPlausible(p) {
    const n = (v) => (Number.isInteger(v) && v >= 0 ? v : -1);
    const segundos = n(p.segundos), kills = n(p.kills), correctas = n(p.correctas), preguntas = n(p.preguntas), jefes = n(p.jefes);
    if ([segundos, kills, correctas, preguntas, jefes].some((v) => v < 0)) return false;
    if (segundos < 20 || segundos > 4 * 3600) return false;
    if (preguntas > Math.floor(segundos / 10) + 5 || correctas > preguntas) return false;
    if (jefes > Math.floor(segundos / 25) + 3) return false;
    const tope = maxApariciones(p);
    if (p.aparecidos !== undefined && (!Number.isInteger(p.aparecidos) || kills > p.aparecidos || p.aparecidos > tope)) return false;
    return kills <= tope;
  }

  return Object.freeze({
    esPartidaPlausible, maxApariciones,
    FAMILIAS, MULTIPLICADOR_INFECCION, MULTIPLICADOR_EVOLUCION, MAPA_NUCLEO, MAPAS_SANDBOX,
    pesosFamilias, claveRanking, esModoRankingValido, crearModo, calcularPuntaje
  });
});
