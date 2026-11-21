/* Inmune Survivors — catálogo de agentes y núcleos (ADN 2026).
 *
 * Fuente: PTD ADN 2026 (núcleos y numeración), cuadernillos de los núcleos 6 a 13-14, índice del Compendio ADN
 * y agentes del tercer parcial. Ver docs/plan-modos-nucleos.md.
 *
 * - Cada agente se define UNA vez y declara sus núcleos. `nucleosAConfirmar`: aparece en una sola fuente o como
 *   mención secundaria; no entra al modo núcleo hasta confirmarlo.
 * - `morfologia` elige la pieza visual base (MORFOLOGIAS). La identidad de cada especie sale de variaciones por
 *   código (tinte, estiramiento, disposición, cápsula, flagelos, espora) que se "hornean" una vez en una textura
 *   cacheada: en pantalla cada enemigo sigue siendo una sola imagen (ver docs/plan-modos-nucleos.md).
 * - `rasgos`: comportamientos reutilizables del motor (RASGOS).
 * - Las fichas médicas (`ficha`) se agregan en la etapa 2, revisadas con `revisor-contenido-medico`.
 * - Fuera de alcance por decisión de diseño: núcleos 1-5 (sin agentes propios) y artrópodos grandes
 *   (vectores, ponzoñosos, insectos ectoparásitos): ver EXCLUIDOS.
 */
(function registerAgentes(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.InmuneAgentes = api;
})(typeof globalThis !== 'undefined' ? globalThis : null, function createAgentes() {
  'use strict';

  const FAMILIAS = Object.freeze(['bacteria', 'virus', 'fungus', 'parasite']);

  // Comportamientos reutilizables (se implementan de a uno, con tests, en la etapa 6).
  const RASGOS = Object.freeze({
    capsula: 'Resiste la fagocitosis hasta perder parte de su vida.',
    toxina: 'Daño en área o ralentización al contacto.',
    esporas: 'Lanza o deja esporas resistentes.',
    biofilm: 'Deja zonas que frenan.',
    intracelular: 'Se esconde un rato dentro de células (invulnerable).',
    latencia: 'Desaparece y reaparece más adelante en la partida.',
    variacion: 'Cambia de color y de resistencia (variación antigénica).',
    flagelos: 'Rápido y errático.',
    vector: 'Entra en oleadas desde el borde, como si lo trajera un vector.',
    oportunista: 'Más fuerte cuando tu vida está baja.'
  });

  // Pieza visual base + variación por código. `textura`: asset existente en assets/*.webp.
  // `estado`: 'existe' (se usa tal cual), 'variacion' (se compone por código desde `textura`),
  // 'nuevo' (necesita una pieza nueva; mientras tanto usa `textura` como suplente).
  const MORFOLOGIAS = Object.freeze({
    'cocos-racimo':        { textura: 'bacteria_cocci', estado: 'existe' },
    'cocos-cadena':        { textura: 'bacteria_cocci', estado: 'variacion', variacion: { disposicion: 'cadena', copias: 4, escala: 0.42 } },
    'diplococos':          { textura: 'bacteria_cocci', estado: 'variacion', variacion: { disposicion: 'par', copias: 2, escala: 0.55 } },
    'bacilo':              { textura: 'bacteria_flagellated_bacillus', estado: 'variacion', variacion: { flagelos: 0 } },
    'bacilo-flagelado':    { textura: 'bacteria_flagellated_bacillus', estado: 'existe' },
    'cocobacilo':          { textura: 'bacteria_flagellated_bacillus', estado: 'variacion', variacion: { estirar: 0.6, flagelos: 0 } },
    'bacilo-encapsulado':  { textura: 'bacteria_capsule', estado: 'existe' },
    'bacilo-esporulado':   { textura: 'bacteria_flagellated_bacillus', estado: 'variacion', variacion: { espora: 'terminal', flagelos: 0 } },
    'bacilo-aar':          { textura: 'bacteria_flagellated_bacillus', estado: 'nuevo', variacion: { estirar: 1.25, flagelos: 0 } },
    'bacilo-ramificado':   { textura: 'fungus_hyphae', estado: 'variacion', variacion: { escala: 0.7 } },
    'bacilo-curvo':        { textura: 'bacteria_vibrio', estado: 'existe' },
    'espiroqueta':         { textura: 'bacteria_spirochete', estado: 'existe' },
    'sin-pared':           { textura: 'bacteria_cocci', estado: 'nuevo', variacion: { disposicion: 'polimorfo' } },
    'chlamydia':           { textura: 'bacteria_cocci', estado: 'nuevo', variacion: { disposicion: 'inclusion' } },
    'envuelto-espiculas':  { textura: 'virus_enveloped', estado: 'existe' },
    'envuelto-pequeno':    { textura: 'virus_spiked', estado: 'variacion', variacion: { escala: 0.8 } },
    'capside':             { textura: 'virus_icosahedral', estado: 'existe' },
    'herpesvirus':         { textura: 'virus_capsid_cross_section', estado: 'existe' },
    'retrovirus':          { textura: 'virus_spiked', estado: 'nuevo' },
    'hepadnavirus':        { textura: 'virus_enveloped', estado: 'variacion', variacion: { capsula: true } },
    'arbovirus':           { textura: 'virus_spiked', estado: 'variacion', variacion: { escala: 0.7 } },
    'bala':                { textura: 'virus_enveloped', estado: 'nuevo', variacion: { estirar: 1.8 } },
    'poxvirus':            { textura: 'virus_capsid_cross_section', estado: 'nuevo', variacion: { estirar: 1.3 } },
    'giardia':             { textura: 'parasite_giardia', estado: 'existe' },
    'ameba':               { textura: 'parasite_amoeba', estado: 'existe' },
    'tripanosoma':         { textura: 'parasite_trypanosome', estado: 'existe' },
    'leishmania':          { textura: 'parasite_trypanosome', estado: 'nuevo', variacion: { estirar: 0.7 } },
    'trichomonas':         { textura: 'parasite_giardia', estado: 'nuevo' },
    'apicomplexa':         { textura: 'parasite_amoeba', estado: 'nuevo', variacion: { estirar: 1.5 } },
    'plasmodium':          { textura: 'parasite_amoeba', estado: 'nuevo' },
    'nematodo':            { textura: 'helminth_nematode_head', estado: 'existe', gusano: 'nematode' },
    'nematodo-larva':      { textura: 'helminth_nematode_head', estado: 'variacion', gusano: 'nematode', variacion: { escala: 0.55 } },
    'cestodo':             { textura: 'helminth_tapeworm_scolex', estado: 'existe', gusano: 'tapeworm' },
    'acaro':               { textura: 'parasite_ciliate', estado: 'nuevo' },
    'levadura':            { textura: 'fungus_budding_yeast', estado: 'existe' },
    'levadura-encapsulada':{ textura: 'fungus_encapsulated_yeast', estado: 'existe' },
    'hifas':               { textura: 'fungus_hyphae', estado: 'existe' },
    'conidioforo':         { textura: 'fungus_conidiophore', estado: 'existe' },
    'pneumocystis':        { textura: 'fungus_encapsulated_yeast', estado: 'nuevo', variacion: { disposicion: 'racimo', copias: 4, escala: 0.45 } }
  });

  // Helper: a(id, nombre, familia, morfologia, nucleos, opciones)
  const a = (id, nombre, familia, morfologia, nucleos, op = {}) => Object.freeze({
    id, nombre, familia, morfologia, nucleos: Object.freeze(nucleos),
    nucleosAConfirmar: Object.freeze(op.aConfirmar || []), rasgos: Object.freeze(op.rasgos || []),
    tinte: op.tinte ?? null, nota: op.nota || ''
  });

  const AGENTES = Object.freeze([
    // ---------- Bacterias ----------
    a('staphylococcus-aureus', 'Staphylococcus aureus', 'bacteria', 'cocos-racimo', ['6', '7', '12', '13-14'], { rasgos: ['toxina', 'biofilm'], tinte: 0xffc24a }),
    a('streptococcus-pyogenes', 'Streptococcus pyogenes', 'bacteria', 'cocos-cadena', ['7', '12'], { rasgos: ['toxina'], tinte: 0xff6f6f }),
    a('streptococcus-pneumoniae', 'Streptococcus pneumoniae', 'bacteria', 'diplococos', ['7', '7.1'], { rasgos: ['capsula'], tinte: 0x9fd2ff }),
    a('streptococcus-agalactiae', 'Streptococcus agalactiae (EGB)', 'bacteria', 'cocos-cadena', ['7.1', '9'], { rasgos: ['capsula'], tinte: 0xd9a3ff }),
    a('enterococcus-faecalis', 'Enterococcus faecalis', 'bacteria', 'cocos-cadena', ['6'], { tinte: 0x9be37a }),
    a('neisseria-meningitidis', 'Neisseria meningitidis', 'bacteria', 'diplococos', ['7.1'], { rasgos: ['capsula', 'toxina'], tinte: 0xffa07a }),
    a('neisseria-gonorrhoeae', 'Neisseria gonorrhoeae', 'bacteria', 'diplococos', ['8'], { rasgos: ['intracelular'], tinte: 0xf6e27a }),
    a('moraxella-catarrhalis', 'Moraxella catarrhalis', 'bacteria', 'diplococos', ['7'], { tinte: 0xb5f0e0 }),
    a('escherichia-coli', 'Escherichia coli', 'bacteria', 'bacilo-flagelado', ['6'], { rasgos: ['flagelos', 'toxina'], tinte: 0x76df37, nota: 'EPEC, ETEC, EIEC, STEC/EHEC (SUH) y uropatógena' }),
    a('shigella', 'Shigella spp.', 'bacteria', 'bacilo', ['6'], { rasgos: ['toxina', 'intracelular'], tinte: 0xe7a35c }),
    a('salmonella', 'Salmonella spp.', 'bacteria', 'bacilo-flagelado', ['6'], { rasgos: ['flagelos', 'intracelular'], tinte: 0xff9fc6, nota: 'incluye Salmonella Typhi' }),
    a('campylobacter', 'Campylobacter spp.', 'bacteria', 'bacilo-curvo', ['6'], { rasgos: ['flagelos'], tinte: 0xffd37a }),
    a('helicobacter-pylori', 'Helicobacter pylori', 'bacteria', 'bacilo-curvo', ['6'], { rasgos: ['flagelos'], tinte: 0x7ad6ff }),
    a('yersinia-enterocolitica', 'Yersinia enterocolitica', 'bacteria', 'cocobacilo', ['6'], { tinte: 0xc0a0ff }),
    a('vibrio-cholerae', 'Vibrio cholerae', 'bacteria', 'bacilo-curvo', ['6'], { rasgos: ['toxina', 'flagelos'], tinte: 0xffa51d }),
    a('bacillus-cereus', 'Bacillus cereus', 'bacteria', 'bacilo-esporulado', ['6'], { rasgos: ['toxina', 'esporas'], tinte: 0xe8c57a }),
    a('clostridium-botulinum', 'Clostridium botulinum', 'bacteria', 'bacilo-esporulado', ['6', '7.1'], { rasgos: ['toxina', 'esporas'], tinte: 0xb0b8ff }),
    a('clostridium-tetani', 'Clostridium tetani', 'bacteria', 'bacilo-esporulado', ['7.1', '12'], { rasgos: ['toxina', 'esporas'], tinte: 0x8fb5c9, nota: 'espora terminal ("palillo de tambor")' }),
    a('clostridium-perfringens', 'Clostridium perfringens', 'bacteria', 'bacilo-esporulado', ['12'], { rasgos: ['toxina', 'esporas'], tinte: 0xd77a6a }),
    a('clostridioides-difficile', 'Clostridioides difficile', 'bacteria', 'bacilo-esporulado', ['13-14'], { rasgos: ['toxina', 'esporas', 'oportunista'], tinte: 0xa6c87a }),
    a('proteus-mirabilis', 'Proteus mirabilis', 'bacteria', 'bacilo-flagelado', ['6'], { rasgos: ['flagelos', 'biofilm'], tinte: 0x5fe0c0 }),
    a('klebsiella', 'Klebsiella spp.', 'bacteria', 'bacilo-encapsulado', ['6', '7', '13-14'], { rasgos: ['capsula'], tinte: 0x9de07a }),
    a('klebsiella-granulomatis', 'Klebsiella granulomatis', 'bacteria', 'bacilo-encapsulado', ['8'], { rasgos: ['intracelular'], tinte: 0xc7e07a }),
    a('haemophilus-influenzae', 'Haemophilus influenzae', 'bacteria', 'cocobacilo', ['7', '7.1'], { rasgos: ['capsula'], tinte: 0xff8fd0, nota: 'tipo b en SNC' }),
    a('haemophilus-ducreyi', 'Haemophilus ducreyi', 'bacteria', 'cocobacilo', ['8'], { tinte: 0xe0a0b0 }),
    a('bordetella-pertussis', 'Bordetella pertussis', 'bacteria', 'cocobacilo', ['7'], { rasgos: ['toxina'], tinte: 0xa0e0ff }),
    a('corynebacterium-diphtheriae', 'Corynebacterium diphtheriae', 'bacteria', 'bacilo', ['7'], { rasgos: ['toxina'], tinte: 0xc9b07a }),
    a('mycoplasma-pneumoniae', 'Mycoplasma pneumoniae', 'bacteria', 'sin-pared', ['7'], { tinte: 0xe0c8ff }),
    a('micoplasmas-genitales', 'Micoplasmas genitales', 'bacteria', 'sin-pared', ['6', '8'], { tinte: 0xffc8e0 }),
    a('chlamydophila-pneumoniae', 'Chlamydophila pneumoniae', 'bacteria', 'chlamydia', ['7'], { rasgos: ['intracelular'], tinte: 0x8fe0b0 }),
    a('chlamydia-trachomatis', 'Chlamydia trachomatis', 'bacteria', 'chlamydia', ['8'], { rasgos: ['intracelular'], tinte: 0xb08fe0 }),
    a('chlamydophila-psittaci', 'Chlamydophila psittaci', 'bacteria', 'chlamydia', ['11'], { rasgos: ['intracelular'], tinte: 0x7ae0d0 }),
    a('treponema-pallidum', 'Treponema pallidum', 'bacteria', 'espiroqueta', ['8', '9'], { rasgos: ['latencia'], tinte: 0x18d5d4 }),
    a('leptospira-interrogans', 'Leptospira interrogans', 'bacteria', 'espiroqueta', ['11'], { tinte: 0x7affa0 }),
    a('brucella', 'Brucella spp.', 'bacteria', 'cocobacilo', ['11'], { rasgos: ['intracelular'], tinte: 0xf0d0a0 }),
    a('mycobacterium-tuberculosis', 'Mycobacterium tuberculosis', 'bacteria', 'bacilo-aar', ['7', '7.1', '13-14'], { rasgos: ['intracelular', 'latencia'], tinte: 0xff5f7a }),
    a('mycobacterium-leprae', 'Mycobacterium leprae', 'bacteria', 'bacilo-aar', ['7', '12'], { rasgos: ['intracelular'], tinte: 0xff9f9f }),
    a('micobacterias-atipicas', 'Micobacterias atípicas (MAC)', 'bacteria', 'bacilo-aar', ['13-14'], { rasgos: ['oportunista'], tinte: 0xd07a9a }),
    a('nocardia', 'Nocardia spp.', 'bacteria', 'bacilo-ramificado', ['13-14'], { rasgos: ['oportunista'], tinte: 0xe0b07a }),
    a('actinomyces', 'Actinomyces spp.', 'bacteria', 'bacilo-ramificado', ['13-14'], { tinte: 0xd0a0d0 }),
    a('pseudomonas-aeruginosa', 'Pseudomonas aeruginosa', 'bacteria', 'bacilo-flagelado', ['13-14'], { aConfirmar: ['6'], rasgos: ['biofilm', 'oportunista'], tinte: 0x5fd0a0 }),
    a('acinetobacter-baumannii', 'Acinetobacter baumannii', 'bacteria', 'cocobacilo', ['13-14'], { aConfirmar: ['6'], rasgos: ['oportunista'], tinte: 0xa0a0e0 }),
    a('stenotrophomonas-maltophilia', 'Stenotrophomonas maltophilia', 'bacteria', 'bacilo-flagelado', ['13-14'], { rasgos: ['oportunista'], tinte: 0x9ad0ff }),
    a('burkholderia-cepacia', 'Burkholderia cepacia (complejo)', 'bacteria', 'bacilo', ['13-14'], { rasgos: ['oportunista'], tinte: 0xc0e09a }),
    a('enterobacter', 'Enterobacter spp.', 'bacteria', 'bacilo-flagelado', [], { aConfirmar: ['6'], tinte: 0x8ae09a }),
    a('serratia', 'Serratia spp.', 'bacteria', 'bacilo-flagelado', [], { aConfirmar: ['6'], tinte: 0xff7a5f }),

    // ---------- Virus ----------
    a('rotavirus', 'Rotavirus', 'virus', 'capside', ['6'], { tinte: 0xffb07a }),
    a('norovirus', 'Norovirus', 'virus', 'capside', ['6'], { tinte: 0x9fe0ff }),
    a('adenovirus', 'Adenovirus', 'virus', 'capside', ['6', '7'], { tinte: 0x27c8ff }),
    a('astrovirus', 'Astrovirus', 'virus', 'capside', ['6'], { tinte: 0xe0d07a }),
    a('enterovirus', 'Enterovirus (polio, Coxsackie, echovirus)', 'virus', 'capside', ['6', '7', '7.1'], { tinte: 0xd07aff }),
    a('hepatitis-a', 'Virus de la hepatitis A', 'virus', 'capside', ['6'], { tinte: 0xffe07a }),
    a('hepatitis-e', 'Virus de la hepatitis E', 'virus', 'capside', ['6'], { tinte: 0xe0ff7a }),
    a('hepatitis-b', 'Virus de la hepatitis B', 'virus', 'hepadnavirus', ['6', '8', '9'], { rasgos: ['latencia'], tinte: 0xffa0c0 }),
    a('hepatitis-c', 'Virus de la hepatitis C', 'virus', 'envuelto-pequeno', ['6', '8'], { rasgos: ['latencia', 'variacion'], tinte: 0xff7ab0 }),
    a('hepatitis-d', 'Virus de la hepatitis D', 'virus', 'envuelto-pequeno', ['6'], { tinte: 0xc07aff, nota: 'defectivo: necesita al VHB' }),
    a('influenza', 'Virus de la influenza', 'virus', 'envuelto-espiculas', ['7', '11'], { rasgos: ['variacion'], tinte: 0xf128a3 }),
    a('vsr', 'Virus sincicial respiratorio', 'virus', 'envuelto-espiculas', ['7'], { tinte: 0x7ab0ff }),
    a('rinovirus', 'Rinovirus', 'virus', 'capside', ['7'], { tinte: 0x7affe0 }),
    a('coronavirus', 'Coronavirus (SARS-CoV-2)', 'virus', 'envuelto-espiculas', ['7'], { tinte: 0xff5f5f }),
    a('parainfluenza', 'Virus parainfluenza', 'virus', 'envuelto-espiculas', ['7'], { tinte: 0xc0a0ff }),
    a('epstein-barr', 'Virus de Epstein-Barr', 'virus', 'herpesvirus', ['7', '12', '13-14'], { rasgos: ['latencia'], tinte: 0xa0ffd0 }),
    a('arbovirus-snc', 'Arbovirus (encefalitis)', 'virus', 'arbovirus', ['7.1'], { rasgos: ['vector'], tinte: 0xffd07a }),
    a('vih', 'Virus de la inmunodeficiencia humana (VIH)', 'virus', 'retrovirus', ['8', '9', '13-14'], { rasgos: ['latencia', 'variacion'], tinte: 0xff4f7a }),
    a('vph', 'Virus del papiloma humano (VPH)', 'virus', 'capside', ['8', '12'], { rasgos: ['latencia'], tinte: 0xffb0e0 }),
    a('herpes-simple', 'Virus herpes simple 1 y 2', 'virus', 'herpesvirus', ['8', '9', '12', '13-14'], { rasgos: ['latencia'], tinte: 0xf14ca8 }),
    a('citomegalovirus', 'Citomegalovirus (CMV)', 'virus', 'herpesvirus', ['9', '13-14'], { rasgos: ['latencia', 'oportunista'], tinte: 0x7a9fff }),
    a('varicela-zoster', 'Virus varicela-zóster', 'virus', 'herpesvirus', ['9', '12', '13-14'], { rasgos: ['latencia'], tinte: 0xffd0a0 }),
    a('rubeola', 'Virus de la rubéola', 'virus', 'envuelto-pequeno', ['9', '12'], { tinte: 0xffa0a0 }),
    a('sarampion', 'Virus del sarampión', 'virus', 'envuelto-espiculas', ['12'], { tinte: 0xff7a7a }),
    a('hhv-6-7', 'Herpesvirus humanos 6 y 7', 'virus', 'herpesvirus', ['12'], { rasgos: ['latencia'], tinte: 0xd0b0ff }),
    a('hhv-8', 'Herpesvirus humano 8', 'virus', 'herpesvirus', ['12', '13-14'], { rasgos: ['latencia', 'oportunista'], tinte: 0xb07aff }),
    a('parvovirus-b19', 'Parvovirus B19', 'virus', 'capside', ['12'], { tinte: 0xffc0d0 }),
    a('molusco-contagioso', 'Virus del molusco contagioso', 'virus', 'poxvirus', ['12'], { tinte: 0xe0e0b0 }),
    a('dengue', 'Virus del dengue', 'virus', 'arbovirus', ['10'], { rasgos: ['vector'], tinte: 0xff6f9f }),
    a('fiebre-amarilla', 'Virus de la fiebre amarilla', 'virus', 'arbovirus', ['10'], { rasgos: ['vector'], tinte: 0xffe05f }),
    a('zika', 'Virus del Zika', 'virus', 'arbovirus', ['10'], { aConfirmar: ['9'], rasgos: ['vector'], tinte: 0x9f7aff }),
    a('chikungunya', 'Virus chikungunya', 'virus', 'arbovirus', ['10'], { rasgos: ['vector'], tinte: 0xffa05f }),
    a('oropouche', 'Virus Oropouche', 'virus', 'arbovirus', [], { aConfirmar: ['10'], rasgos: ['vector'], tinte: 0xd0ff7a }),
    a('encefalitis-equina', 'Virus de la encefalitis equina del oeste', 'virus', 'arbovirus', [], { aConfirmar: ['10'], rasgos: ['vector'], tinte: 0x7ad0ff }),
    a('rabia', 'Virus de la rabia (Lyssavirus)', 'virus', 'bala', ['11'], { tinte: 0xb0c0d0 }),
    a('hantavirus', 'Hantavirus', 'virus', 'envuelto-pequeno', ['11'], { tinte: 0xc0d07a }),
    a('junin', 'Virus Junín (fiebre hemorrágica argentina)', 'virus', 'envuelto-pequeno', ['11'], { tinte: 0xd08f6a }),
    a('mpox', 'Virus mpox', 'virus', 'poxvirus', [], { aConfirmar: ['11'], tinte: 0xd0b08f }),

    // ---------- Parásitos ----------
    a('giardia-lamblia', 'Giardia lamblia', 'parasite', 'giardia', ['6', '13-14'], { rasgos: ['flagelos'] }),
    a('entamoeba-histolytica', 'Entamoeba histolytica', 'parasite', 'ameba', ['6']),
    a('cryptosporidium', 'Cryptosporidium spp.', 'parasite', 'apicomplexa', ['6', '13-14'], { rasgos: ['oportunista'], tinte: 0xe0a0ff }),
    a('ascaris-lumbricoides', 'Ascaris lumbricoides', 'parasite', 'nematodo', ['6'], { tinte: 0xffd0c0 }),
    a('enterobius-vermicularis', 'Enterobius vermicularis', 'parasite', 'nematodo-larva', ['6'], { tinte: 0xf0f0f0 }),
    a('trichinella-spiralis', 'Trichinella spiralis', 'parasite', 'nematodo-larva', ['6', '11'], { rasgos: ['intracelular'], tinte: 0xffb0b0 }),
    a('taenia', 'Taenia solium / T. saginata', 'parasite', 'cestodo', ['6']),
    a('echinococcus-granulosus', 'Echinococcus granulosus', 'parasite', 'cestodo', ['6', '11'], { tinte: 0xfff0c0 }),
    a('strongyloides-stercoralis', 'Strongyloides stercoralis', 'parasite', 'nematodo-larva', ['13-14'], { aConfirmar: ['6'], rasgos: ['oportunista'], tinte: 0xe0c0a0 }),
    a('uncinarias', 'Ancylostoma duodenale / Necator americanus', 'parasite', 'nematodo', [], { aConfirmar: ['6'], tinte: 0xe0a0a0 }),
    a('larva-migrans', 'Ancylostoma braziliense / caninum (larva migrans)', 'parasite', 'nematodo-larva', ['12'], { tinte: 0xffc0a0 }),
    a('toxocara-canis', 'Toxocara canis', 'parasite', 'nematodo', ['11'], { tinte: 0xf0d0b0 }),
    a('trichomonas-vaginalis', 'Trichomonas vaginalis', 'parasite', 'trichomonas', ['8'], { rasgos: ['flagelos'], tinte: 0x9fe0c0 }),
    a('toxoplasma-gondii', 'Toxoplasma gondii', 'parasite', 'apicomplexa', ['9', '13-14'], { rasgos: ['intracelular', 'latencia'], tinte: 0xffa0d0 }),
    a('trypanosoma-cruzi', 'Trypanosoma cruzi', 'parasite', 'tripanosoma', ['9', '10', '13-14'], { rasgos: ['vector', 'intracelular'] }),
    a('plasmodium', 'Plasmodium spp.', 'parasite', 'plasmodium', ['10'], { rasgos: ['vector', 'variacion'], tinte: 0xff7a9f }),
    a('leishmania', 'Leishmania spp.', 'parasite', 'leishmania', ['10'], { rasgos: ['vector', 'intracelular'], tinte: 0xa0d0ff }),
    a('sarcoptes-scabiei', 'Sarcoptes scabiei', 'parasite', 'acaro', ['12', '13-14'], { tinte: 0xf0e0d0, nota: 'ácaro microscópico (sarna; sarna noruega en inmunodeprimidos)' }),

    // ---------- Hongos ----------
    a('candida', 'Candida spp.', 'fungus', 'levadura', ['8', '12', '13-14'], { rasgos: ['oportunista'], tinte: 0xffae27 }),
    a('cryptococcus-neoformans', 'Cryptococcus neoformans', 'fungus', 'levadura-encapsulada', ['13-14'], { rasgos: ['capsula', 'oportunista'] }),
    a('malassezia-furfur', 'Malassezia furfur', 'fungus', 'levadura', ['12'], { tinte: 0xe0d0a0 }),
    a('histoplasma-capsulatum', 'Histoplasma capsulatum', 'fungus', 'levadura', ['12', '13-14'], { rasgos: ['intracelular'], tinte: 0xd0a07a }),
    a('coccidioides', 'Coccidioides spp.', 'fungus', 'levadura-encapsulada', ['12'], { tinte: 0xe0b0a0 }),
    a('paracoccidioides-brasiliensis', 'Paracoccidioides brasiliensis', 'fungus', 'levadura', ['12'], { tinte: 0xc0e0a0, nota: 'gemación múltiple ("timón")' }),
    a('sporothrix-schenckii', 'Sporothrix schenckii', 'fungus', 'levadura', [], { aConfirmar: ['12'], tinte: 0xa0c0e0 }),
    a('dermatofitos', 'Dermatofitos (Trichophyton, Microsporum, Epidermophyton)', 'fungus', 'hifas', ['12'], { tinte: 0xd0e07a }),
    a('aspergillus', 'Aspergillus spp.', 'fungus', 'conidioforo', ['13-14'], { rasgos: ['esporas', 'oportunista'] }),
    a('mucorales', 'Mucorales', 'fungus', 'hifas', ['13-14'], { rasgos: ['oportunista'], tinte: 0x9fa0a0 }),
    a('fusarium', 'Fusarium spp.', 'fungus', 'hifas', ['13-14'], { rasgos: ['oportunista'], tinte: 0xffa0e0 }),
    a('pneumocystis-jirovecii', 'Pneumocystis jirovecii', 'fungus', 'pneumocystis', ['13-14'], { rasgos: ['oportunista'], tinte: 0x9fd0ff })
  ]);

  // Un jefe por núcleo, distinto en cada uno (decisión de diseño). `agente` es un id de AGENTES.
  const NUCLEOS = Object.freeze([
    { id: '6',     nombre: 'Agentes con ingreso digestivo y urinarios', tejido: 'tissue_epithelium', jefe: { agente: 'escherichia-coli', titulo: 'E. coli productora de toxina Shiga', rasgos: ['toxina'] } },
    { id: '7',     nombre: 'Agentes con ingreso respiratorio', tejido: 'tissue_alveolar', jefe: { agente: 'mycobacterium-tuberculosis', titulo: 'Granuloma tuberculoso', rasgos: ['intracelular'] } },
    { id: '7.1',   nombre: 'Agentes que afectan al SNC',    tejido: 'tissue_neural',     jefe: { agente: 'neisseria-meningitidis', titulo: 'Neisseria meningitidis', rasgos: ['capsula', 'toxina'] } },
    { id: '8',     nombre: 'Infecciones de transmisión sexual', tejido: 'tissue_epithelium', jefe: { agente: 'vih', titulo: 'VIH', rasgos: ['variacion'] } },
    { id: '9',     nombre: 'Transmisión vertical',          tejido: 'tissue_vascular',   jefe: { agente: 'toxoplasma-gondii', titulo: 'Toxoplasma gondii', rasgos: ['intracelular'] } },
    { id: '10',    nombre: 'Transmitidas por vectores',     tejido: 'tissue_vascular',   jefe: { agente: 'plasmodium', titulo: 'Plasmodium', rasgos: ['variacion'] } },
    { id: '11',    nombre: 'Zoonosis',                      tejido: 'tissue_connective', jefe: { agente: 'echinococcus-granulosus', titulo: 'Quiste hidatídico', rasgos: [] } },
    { id: '12',    nombre: 'Agentes que ingresan por la piel', tejido: 'tissue_connective', jefe: { agente: 'clostridium-perfringens', titulo: 'Clostridium perfringens (gangrena gaseosa)', rasgos: ['toxina'] } },
    { id: '13-14', nombre: 'Infecciones oportunistas',      tejido: 'tissue_alveolar',   jefe: { agente: 'pneumocystis-jirovecii', titulo: 'Pneumocystis jirovecii', rasgos: ['oportunista'] } }
  ].map(Object.freeze));

  // Fuera del juego por decisión de diseño (no se agregan como enemigos).
  const EXCLUIDOS = Object.freeze({
    nucleos: ['1', '2', '3', '4', '5'],
    agentes: [
      'Pediculus humanus', 'Phthirus pubis', 'Tunga penetrans', 'Dermatobia hominis', // insectos ectoparásitos
      'Aedes aegypti', 'Anopheles', 'Lutzomyia', 'Triatoma infestans',               // vectores
      'Tityus trivittatus', 'Bothriurus bonariensis', 'Latrodectus mactans', 'Loxosceles laeta' // ponzoñosos
    ],
    motivo: 'Artrópodos grandes: rompen la escala microscópica del juego.'
  });

  const porId = new Map(AGENTES.map((x) => [x.id, x]));
  const agente = (id) => porId.get(id) || null;
  const agentesDeNucleo = (nucleoId) => AGENTES.filter((x) => x.nucleos.includes(nucleoId));
  const nucleo = (id) => NUCLEOS.find((n) => n.id === id) || null;

  return Object.freeze({ FAMILIAS, RASGOS, MORFOLOGIAS, AGENTES, NUCLEOS, EXCLUIDOS, agente, agentesDeNucleo, nucleo });
});
