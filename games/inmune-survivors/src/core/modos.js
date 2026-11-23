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

  // Mismos topes que valida el servidor (guardarPuntaje): una partida que no los cumple no entra al ranking.
  function esPartidaPlausible(p) {
    const n = (v) => (Number.isInteger(v) && v >= 0 ? v : -1);
    const segundos = n(p.segundos), kills = n(p.kills), correctas = n(p.correctas), preguntas = n(p.preguntas), jefes = n(p.jefes);
    if ([segundos, kills, correctas, preguntas, jefes].some((v) => v < 0)) return false;
    if (segundos < 20 || segundos > 4 * 3600) return false;
    if (kills > segundos * 6 + 60) return false;
    if (preguntas > Math.floor(segundos / 10) + 5 || correctas > preguntas) return false;
    return jefes <= Math.floor(segundos / 25) + 3;
  }

  return Object.freeze({
    esPartidaPlausible,
    FAMILIAS, MULTIPLICADOR_INFECCION, MULTIPLICADOR_EVOLUCION, MAPA_NUCLEO, MAPAS_SANDBOX,
    pesosFamilias, claveRanking, esModoRankingValido, crearModo, calcularPuntaje
  });
});
