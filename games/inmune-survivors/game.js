  /* Inmune Survivors — v3.7
 * Phaser 3.90.0. Microbe sprites are simplified, cached procedural textures.
 * The question bank is provisional and must be cross-checked against the approved course bibliography
 * before this game is used as a formal educational resource.
 */
(function () {
  'use strict';

  // W y H son el tamaño LÓGICO del área de juego en píxeles CSS (HUD y distancias de spawn se calculan con esto).
  // RENDER_RES es cuántos píxeles reales se dibujan por píxel CSS: el canvas mide W·RENDER_RES × H·RENDER_RES y
  // se muestra con zoom 1/RENDER_RES, así se ve nítido en pantallas HiDPI (Phaser 3.60+ ya no tiene `resolution`).
  let W = 480, H = 800, RENDER_RES = 1;
  const WORLD = 3000, CENTER = WORLD / 2, ARENA_RADIUS = 1110;
  const BOSS_SPAWN_GRACE_MS = 1600;
  const PHAGO_LARGE_TIER = 2;
  const PHAGO_SWARM_LIMIT = 4; // fagocitables cerca a partir de los cuales los proyectiles también les disparan
  const PHAGO_SEEK_RANGE = 220; // más allá del alcance, distancia a la que los pseudópodos ya apuntan a un fagocitable // sizeTier de los arquetipos bruto y élite (los comunes son 0)
  const INFECTIONS = {
    bacteriana: {
      label: 'Infección bacteriana', bg: 0x071724, field: 0x0e2d3b, border: 0x63b8ba, accent: 0x8cf2c9,
      weights: { bacteria: 0.68, virus: 0.13, fungus: 0.12, parasite: 0.07 },
      maps: [{ id: 'endothelium', label: 'Endotelio vascular' }, { id: 'mucosa', label: 'Mucosa epitelial' }]
    },
    viral: {
      label: 'Infección viral', bg: 0x10162d, field: 0x1b2b50, border: 0x898be0, accent: 0xa4baff,
      weights: { bacteria: 0.12, virus: 0.67, fungus: 0.10, parasite: 0.11 },
      maps: [{ id: 'epithelium', label: 'Epitelio respiratorio' }, { id: 'neural', label: 'Tejido nervioso' }]
    },
    fungica: {
      label: 'Infección fúngica', bg: 0x10231f, field: 0x193d32, border: 0x73bd8c, accent: 0xb7f0a6,
      weights: { bacteria: 0.13, virus: 0.12, fungus: 0.65, parasite: 0.10 },
      maps: [{ id: 'dermis', label: 'Dermis y tejido conectivo' }, { id: 'alveolar', label: 'Epitelio alveolar' }]
    },
    parasitaria: {
      label: 'Infección parasitaria', bg: 0x241728, field: 0x42263b, border: 0xc77e9e, accent: 0xffb5c4,
      weights: { bacteria: 0.12, virus: 0.12, fungus: 0.11, parasite: 0.65 },
      maps: [{ id: 'muscle', label: 'Tejido muscular' }, { id: 'intestinal', label: 'Epitelio intestinal' }, { id: 'neural', label: 'Tejido nervioso' }]
    }
  };
  // The scene palette follows the tissue being represented, not the dominant pathogen family.
  const TISSUE_VISUALS = {
    endothelium: { label:'Endotelio vascular', bg:0x111d2b, field:0x243f53, border:0x6fc4d0, accent:0xb1f2f0 },
    mucosa:      { label:'Mucosa epitelial', bg:0x2b1729, field:0x613348, border:0xf0a1b2, accent:0xffd0dc },
    epithelium:  { label:'Epitelio respiratorio', bg:0x1e203b, field:0x393b60, border:0xa7b8fa, accent:0xd8e2ff },
    dermis:      { label:'Dermis y tejido conectivo', bg:0x2c1b2a, field:0x60404b, border:0xe5a0ad, accent:0xffd1d7 },
    alveolar:    { label:'Epitelio alveolar', bg:0x112a31, field:0x1d4a51, border:0x81d5ca, accent:0xc5fff1 },
    muscle:      { label:'Tejido muscular', bg:0x301724, field:0x672b43, border:0xf28aa5, accent:0xffbfd0 },
    intestinal:  { label:'Epitelio intestinal', bg:0x301d2c, field:0x694052, border:0xf1b0b7, accent:0xffd8d4 },
    neural:      { label:'Tejido nervioso', bg:0x111b35, field:0x26365a, border:0x879fe1, accent:0xc4d1ff }
  };

  const INFECTION_DIFFICULTIES = {
    ambulatorio: { label:'Ambulatorio', multiplier:0.75, hp:0.60, damage:0.72, speed:0.86, spawn:1.38, waves:0.70, startTier:0, description:'Modo accesible: enemigos frágiles, golpes menos duros y oleadas más espaciadas.' },
    internado: { label:'Internado', multiplier:1, hp:0.94, damage:0.94, speed:1, spawn:1.22, waves:0.82, startTier:0, description:'Presión gradual para dar tiempo a desarrollar la primera respuesta.' },
    inmunosuprimido: { label:'Inmunosuprimido', multiplier:1.5, hp:1.48, damage:1.28, speed:1.08, spawn:0.82, waves:1.22, startTier:0, description:'Más densidad, resistencia y daño enemigo.' }
  };
  const EVOLUTION_DIFFICULTIES = {
    no_curse: { label:'No cursé', multiplier:0.75, category:'facil', description:'Inmunología y microbiología básicas, nivel secundario y sin conocimientos previos.' },
    estudiante: { label:'Estudiante', multiplier:1, category:'normal', description:'Preguntas de dificultad normal, mecanismos y aplicación.' },
    infectologo: { label:'Infectólogo', multiplier:1.5, category:'dificil', description:'Preguntas difíciles, detalles finos y razonamiento diagnóstico.' }
  };

  // Variantes visuales inspiradas en morfologías clásicas. Son representaciones estilizadas, no microfotografías diagnósticas.
  const MORPHOLOGY = {
    bacteria: [
      { id:'cocci', texture:'bacteria_cocci', label:'cocos en racimo', radius:22, color:0xb333f2, outline:0x20103b },
      { id:'bacillus', texture:'bacteria_flagellated_bacillus', label:'bacilo flagelado', radius:24, color:0x76df37, outline:0x162f26 },
      { id:'vibrio', texture:'bacteria_vibrio', label:'vibrio curvo', radius:22, color:0xffa51d, outline:0x3a183b },
      { id:'spirochete', texture:'bacteria_spirochete', label:'espiroqueta', radius:21, color:0x18d5d4, outline:0x103044 },
      { id:'capsulated', texture:'bacteria_capsule', label:'bacilo encapsulado', radius:24, color:0x76df37, outline:0x162f26, capsule:true }
    ],
    virus: [
      { id:'enveloped', texture:'virus_enveloped', label:'virión envuelto con espículas', radius:24, color:0xf128a3, outline:0x27103f },
      { id:'icosahedral', texture:'virus_icosahedral', label:'cápside icosaédrica', radius:23, color:0x27c8ff, outline:0x122c55 },
      { id:'spiked', texture:'virus_spiked', label:'partícula con espículas', radius:24, color:0xed258e, outline:0x28103f },
      { id:'crosssection', texture:'virus_capsid_cross_section', label:'virión en corte', radius:24, color:0xf14ca8, outline:0x28103f }
    ],
    fungus: [
      { id:'yeast', texture:'fungus_budding_yeast', label:'levadura en gemación', radius:22, color:0xffae27, outline:0x402044 },
      { id:'hyphae', texture:'fungus_hyphae', label:'hifas ramificadas', radius:24, color:0x8bdf3b, outline:0x173c29 },
      { id:'conidiophore', texture:'fungus_conidiophore', label:'conidióforo y conidios', radius:23, color:0xb0f22c, outline:0x173c29 },
      { id:'encapsulated', texture:'fungus_encapsulated_yeast', label:'levadura encapsulada', radius:24, color:0x35d9e9, outline:0x17284f }
    ],
    parasite: [
      { id:'nematode', label:'nematodo serpenteante', radius:31, color:0xf04d82, outline:0x27103f, worm:true, wormKind:'nematode', headTexture:'helminth_nematode_head', cruiseSpeed:210, bodyLength:720 },
      { id:'cestode', label:'cestodo segmentado', radius:29, color:0xff8c9d, outline:0x27103f, worm:true, wormKind:'cestode', headTexture:'helminth_tapeworm_scolex', cruiseSpeed:192, bodyLength:980 },
      { id:'giardia', texture:'parasite_giardia', label:'Giardia · trofozoíto flagelado', radius:23, color:0x45dfe2, outline:0x17284f },
      { id:'amoeba', texture:'parasite_amoeba', label:'ameba · forma ameboide', radius:26, color:0xb78aff, outline:0x27103f },
      { id:'trypanosome', texture:'parasite_trypanosome', label:'tripanosoma · membrana ondulante', radius:24, color:0x4cd8d8, outline:0x17284f },
      { id:'ciliate', texture:'parasite_ciliate', label:'protozoo ciliado', radius:24, color:0x55d9b4, outline:0x17284f },
      { id:'fluke', texture:'helminth_fluke_head', label:'trematodo aplanado', radius:25, color:0xff9270, outline:0x402044 }
    ]
  };
  const BOSS_MORPHOLOGIES = [
    { id:'colonia-primordial', type:'bacteria', texture:'boss_bacteria', label:'Colonia primordial', radius:55, color:0xffa52f, outline:0x26103e, boss:true },
    { id:'virion-titan', type:'virus', texture:'boss_virus', label:'Virión titánico', radius:52, color:0x36ddf6, outline:0x24103f, boss:true },
    { id:'micelio-ancestral', type:'fungus', texture:'boss_fungus', label:'Micelio ancestral', radius:56, color:0x9fe735, outline:0x173c29, boss:true, stationary:true },
    { id:'helminto-colosal', type:'parasite', texture:'boss_helminth', label:'Helminto colosal', radius:58, color:0xf04f88, outline:0x30103d, boss:true, worm:true, wormKind:'nematode', headTexture:'helminth_nematode_head', cruiseSpeed:245, bodyLength:1500 }
  ];
  const MICROBE_TEXTURES = [
    'bacteria_cocci','bacteria_flagellated_bacillus','bacteria_vibrio','bacteria_spirochete','bacteria_capsule',
    'virus_enveloped','virus_icosahedral','virus_spiked','virus_capsid_cross_section',
    'fungus_budding_yeast','fungus_hyphae','fungus_conidiophore','fungus_encapsulated_yeast',
    'parasite_giardia','parasite_amoeba','parasite_flagellate','parasite_trypanosome','parasite_ciliate','helminth_fluke_head'
  ];
  const TISSUE_TEXTURES = {
    endothelium:'tissue_vascular', mucosa:'tissue_epithelium', epithelium:'tissue_epithelium',
    dermis:'tissue_connective', alveolar:'tissue_alveolar', muscle:'tissue_muscle',
    intestinal:'tissue_epithelium', neural:'tissue_neural'
  };

  // Preguntas más específicas que las de v0.1. No se repiten dentro de una partida.
  // El contenido debe validarse con capítulos/páginas de la bibliografía autorizada.
  const QUESTION_BANK = [
    // FÁCIL · nivel secundario: defensas, microbios y prevención.
    { id:'easy-basic-01', difficulty:'facil', topic:'Inmunología básica', q:'¿Cuál es una función general del sistema inmunitario?', a:['Ayudar al cuerpo a defenderse de infecciones','Transportar oxígeno en lugar de la sangre','Digerir todos los alimentos','Producir energía con la luz solar'], c:0, exp:'El sistema inmunitario reúne defensas que ayudan a reconocer y combatir agentes que pueden causar enfermedades.', source:'CDC · conceptos básicos de inmunidad, vacunación, prevención y antibióticos' },
    { id:'easy-basic-02', difficulty:'facil', topic:'Inmunología básica', q:'¿Qué células de la sangre ayudan a defender al cuerpo frente a microbios?', a:['Los glóbulos blancos','Los glóbulos rojos','Las plaquetas','Las células del cabello'], c:0, exp:'Los glóbulos blancos participan en distintas respuestas de defensa del organismo.', source:'CDC · conceptos básicos de inmunidad, vacunación, prevención y antibióticos' },
    { id:'easy-basic-03', difficulty:'facil', topic:'Inmunología básica', q:'¿Qué son los anticuerpos, explicado de forma sencilla?', a:['Proteínas que ayudan a reconocer objetivos específicos','Células que transportan oxígeno','Una clase de bacteria beneficiosa','Partes de los huesos'], c:0, exp:'Los anticuerpos son proteínas que pueden reconocer objetivos concretos y colaborar en la defensa.', source:'CDC · conceptos básicos de inmunidad, vacunación, prevención y antibióticos' },
    { id:'easy-basic-04', difficulty:'facil', topic:'Inmunología básica', q:'¿Cuál es una barrera que ayuda a impedir que los microbios entren al cuerpo?', a:['La piel','El pelo de la cabeza únicamente','Las uñas por dentro','El esmalte de los dientes'], c:0, exp:'La piel sana actúa como una barrera física; las mucosas también ayudan a proteger entradas del cuerpo.', source:'CDC · conceptos básicos de inmunidad, vacunación, prevención y antibióticos' },
    { id:'easy-basic-05', difficulty:'facil', topic:'Inmunología básica', q:'¿Qué pueden hacer las mucosas de la nariz y la boca?', a:['Atrapar algunas partículas y microbios en el moco','Convertir los virus en glóbulos rojos','Reemplazar por completo a la piel','Producir antibióticos para todas las infecciones'], c:0, exp:'El moco puede atrapar partículas, y otras defensas de las mucosas ayudan a proteger el cuerpo.', source:'CDC · conceptos básicos de inmunidad, vacunación, prevención y antibióticos' },
    { id:'easy-basic-06', difficulty:'facil', topic:'Inmunología básica', q:'¿Qué significa que el sistema inmunitario tenga memoria?', a:['Que puede reconocer más rápidamente algo que ya encontró','Que recuerda nombres y fechas como una persona','Que deja de funcionar después de una infección','Que solo actúa durante el sueño'], c:0, exp:'Algunas defensas pueden reconocer de nuevo ciertos agentes y responder con mayor rapidez.', source:'CDC · conceptos básicos de inmunidad, vacunación, prevención y antibióticos' },
    { id:'easy-basic-07', difficulty:'facil', topic:'Inmunología básica', q:'¿Para qué sirve la inflamación alrededor de una herida?', a:['Es parte de la respuesta del cuerpo ante una lesión o infección','Demuestra siempre que la herida está curada','Impide que llegue sangre a la zona','Es causada únicamente por virus'], c:0, exp:'La inflamación forma parte de la respuesta del organismo a lesiones e infecciones, aunque no indica por sí sola cuál es la causa.', source:'CDC · conceptos básicos de inmunidad, vacunación, prevención y antibióticos' },
    { id:'easy-basic-08', difficulty:'facil', topic:'Inmunología básica', q:'¿Qué describe mejor una vacuna?', a:['Una preparación que ayuda al sistema inmunitario a aprender a reconocer una enfermedad','Un medicamento que elimina cualquier microbio de inmediato','Una vitamina que evita todas las enfermedades','Un tipo de glóbulo blanco'], c:0, exp:'Las vacunas preparan las defensas para reconocer enfermedades específicas y ayudar a prevenirlas.', source:'CDC · conceptos básicos de inmunidad, vacunación, prevención y antibióticos' },
    { id:'easy-basic-09', difficulty:'facil', topic:'Microorganismos', q:'¿Cuál afirmación sobre las bacterias es correcta?', a:['Son microorganismos formados por una célula','Son siempre virus muy grandes','Son órganos del cuerpo','Son todas dañinas para las personas'], c:0, exp:'Muchas bacterias son inofensivas o útiles; algunas pueden causar infecciones.', source:'CDC · conceptos básicos de inmunidad, vacunación, prevención y antibióticos' },
    { id:'easy-basic-10', difficulty:'facil', topic:'Microorganismos', q:'¿Qué necesitan los virus para multiplicarse?', a:['Entrar en células y usar parte de su funcionamiento','Crecer en cualquier superficie sin células','Convertirse en bacterias','Alimentarse de antibióticos'], c:0, exp:'Los virus necesitan células para hacer copias de sí mismos.', source:'CDC · conceptos básicos de inmunidad, vacunación, prevención y antibióticos' },
    { id:'easy-basic-11', difficulty:'facil', topic:'Microorganismos', q:'¿Cuál de estos puede ser un hongo?', a:['Una levadura usada para hacer crecer la masa del pan','Un glóbulo rojo','Un virus de la gripe','Una plaqueta'], c:0, exp:'Las levaduras son hongos microscópicos; otros hongos incluyen los mohos.', source:'CDC · conceptos básicos de inmunidad, vacunación, prevención y antibióticos' },
    { id:'easy-basic-12', difficulty:'facil', topic:'Microorganismos', q:'¿Qué es un parásito en términos generales?', a:['Un organismo que vive en o sobre otro organismo y obtiene recursos de él','Una célula que siempre ayuda al cuerpo','Un tipo de vacuna','Una proteína de la sangre'], c:0, exp:'Los parásitos viven en o sobre un hospedador; algunos pueden causar enfermedades.', source:'CDC · conceptos básicos de inmunidad, vacunación, prevención y antibióticos' },
    { id:'easy-basic-13', difficulty:'facil', topic:'Microorganismos', q:'¿Todos los microorganismos causan enfermedades?', a:['No; muchos no hacen daño y algunos son útiles','Sí; todos causan infecciones graves','Sí, pero solo en verano','No; ninguno puede causar enfermedades'], c:0, exp:'Hay microorganismos inofensivos y beneficiosos, y otros que sí pueden causar enfermedad.', source:'CDC · conceptos básicos de inmunidad, vacunación, prevención y antibióticos' },
    { id:'easy-basic-14', difficulty:'facil', topic:'Contagio y prevención', q:'¿Qué práctica ayuda a reducir la transmisión de microbios al preparar comida?', a:['Lavarse las manos y mantener limpios los alimentos y utensilios','Dejar la comida destapada todo el día','Compartir siempre los cubiertos sin lavarlos','Enjuagarse las manos solo con agua una vez por semana'], c:0, exp:'La higiene de manos y de los utensilios ayuda a reducir la contaminación de los alimentos.', source:'CDC · conceptos básicos de inmunidad, vacunación, prevención y antibióticos' },
    { id:'easy-basic-15', difficulty:'facil', topic:'Contagio y prevención', q:'¿Cómo pueden transmitirse algunos microbios que causan resfríos?', a:['Por gotitas o partículas respiratorias que salen al respirar, hablar, toser o estornudar','Solo por picaduras de mosquitos','Únicamente por alimentos congelados','Por mirar a una persona enferma'], c:0, exp:'Algunos virus respiratorios se transmiten a través de partículas que se expulsan al respirar, hablar, toser o estornudar.', source:'CDC · conceptos básicos de inmunidad, vacunación, prevención y antibióticos' },
    { id:'easy-basic-16', difficulty:'facil', topic:'Contagio y prevención', q:'¿Qué medida es útil al toser o estornudar?', a:['Cubrirse con el codo o un pañuelo y lavarse las manos','Toser en las manos y tocar objetos','Compartir el pañuelo usado','Acercarse a otras personas para hablar'], c:0, exp:'Cubrir tos y estornudos y mantener las manos limpias ayuda a limitar la propagación de partículas.', source:'CDC · conceptos básicos de inmunidad, vacunación, prevención y antibióticos' },
    { id:'easy-basic-17', difficulty:'facil', topic:'Contagio y prevención', q:'¿Qué puede ayudar a disminuir la acumulación de partículas respiratorias en un espacio cerrado?', a:['Ventilar el ambiente con aire fresco','Cerrar todas las ventanas siempre','Apagar las luces','Compartir vasos'], c:0, exp:'La ventilación renueva el aire interior y puede reducir la acumulación de partículas respiratorias.', source:'CDC · conceptos básicos de inmunidad, vacunación, prevención y antibióticos' },
    { id:'easy-basic-18', difficulty:'facil', topic:'Contagio y prevención', q:'¿Qué significa que una enfermedad sea contagiosa?', a:['Que puede pasar de una persona o fuente a otra por alguna vía de transmisión','Que siempre se transmite por la sangre','Que solo afecta a personas mayores','Que se cura con antibióticos'], c:0, exp:'Las enfermedades contagiosas pueden transmitirse por distintas vías; no todas usan la misma.', source:'CDC · conceptos básicos de inmunidad, vacunación, prevención y antibióticos' },
    { id:'easy-basic-19', difficulty:'facil', topic:'Vacunas y prevención', q:'¿Qué busca lograr una vacuna?', a:['Preparar las defensas para reconocer una enfermedad específica','Tratar cualquier infección que ya está presente','Reemplazar todos los glóbulos blancos','Evitar para siempre cualquier enfermedad'], c:0, exp:'Las vacunas preparan la respuesta inmunitaria frente a enfermedades específicas; la protección no es idéntica para todas.', source:'CDC · conceptos básicos de inmunidad, vacunación, prevención y antibióticos' },
    { id:'easy-basic-20', difficulty:'facil', topic:'Vacunas y prevención', q:'¿Una vacuna protege necesariamente contra todas las enfermedades?', a:['No; cada vacuna se dirige a enfermedades o microbios determinados','Sí; una sola vacuna protege contra todo','Sí, pero solo durante el primer día','No; las vacunas no se relacionan con las defensas'], c:0, exp:'Las vacunas son específicas: una vacuna no protege automáticamente contra cualquier infección.', source:'CDC · conceptos básicos de inmunidad, vacunación, prevención y antibióticos' },
    { id:'easy-basic-21', difficulty:'facil', topic:'Vacunas y prevención', q:'¿Por qué la vacunación también puede ayudar a proteger a otras personas?', a:['Porque reduce la posibilidad de que ciertas infecciones se propaguen','Porque convierte a todas las personas en médicos','Porque elimina todos los microbios del ambiente','Porque evita la necesidad de lavarse las manos'], c:0, exp:'Al reducir el riesgo de ciertas infecciones, la vacunación puede ayudar a limitar su circulación en la comunidad.', source:'CDC · conceptos básicos de inmunidad, vacunación, prevención y antibióticos' },
    { id:'easy-basic-22', difficulty:'facil', topic:'Antibióticos', q:'¿Contra qué tipo de microorganismos actúan los antibióticos?', a:['Contra ciertas bacterias','Contra todos los virus','Contra todos los hongos y parásitos','Contra cualquier microbio por igual'], c:0, exp:'Los antibióticos sirven contra ciertas infecciones bacterianas; no son útiles contra virus.', source:'CDC · conceptos básicos de inmunidad, vacunación, prevención y antibióticos' },
    { id:'easy-basic-23', difficulty:'facil', topic:'Antibióticos', q:'¿Los antibióticos curan un resfrío causado por un virus?', a:['No; los antibióticos no actúan contra los virus','Sí; todos los resfríos se curan con antibióticos','Sí, pero solo si se toman una vez','No, porque los resfríos son causados por hongos'], c:0, exp:'Los antibióticos no tratan infecciones virales como muchos resfríos.', source:'CDC · conceptos básicos de inmunidad, vacunación, prevención y antibióticos' },
    { id:'easy-basic-24', difficulty:'facil', topic:'Antibióticos', q:'¿Por qué no conviene tomar antibióticos por cuenta propia?', a:['Porque no sirven para todas las infecciones y su uso innecesario puede causar problemas','Porque debilitan siempre los huesos','Porque solo funcionan con alimentos dulces','Porque reemplazan a las vacunas'], c:0, exp:'Los antibióticos deben utilizarse cuando son necesarios; el uso innecesario puede causar efectos adversos y favorecer resistencia.', source:'CDC · conceptos básicos de inmunidad, vacunación, prevención y antibióticos' },
    { id:'easy-basic-25', difficulty:'facil', topic:'Inmunología básica', q:'¿Qué puede indicar la fiebre durante una infección?', a:['Que el cuerpo está respondiendo a un problema, aunque no revela por sí sola la causa','Que la infección siempre es bacteriana','Que el sistema inmunitario dejó de funcionar','Que los antibióticos son siempre necesarios'], c:0, exp:'La fiebre puede acompañar distintas infecciones y otras condiciones; por sí sola no permite saber qué microbio la causó.', source:'MedlinePlus · fiebre y respuesta del organismo' },
    // NORMAL · mecanismos y primeras interpretaciones.
    { id:'b-spn-01', difficulty:'normal', topic:'Bacteriología', q:'¿Qué factor de Streptococcus pneumoniae contribuye especialmente a evitar la fagocitosis?', a:['La cápsula polisacárida','La proteína M de Streptococcus pyogenes','La neuraminidasa de influenza','La pared de quitina'], c:0, exp:'La cápsula polisacárida es un importante factor antifagocítico del neumococo.', source:'Cuadernillo ADN 2026 · p. 17, morfología bacteriana y agentes asociados' },
    { id:'b-spy-01', difficulty:'normal', topic:'Bacteriología', q:'¿Qué factor de Streptococcus pyogenes se relaciona clásicamente con evasión de la fagocitosis?', a:['Proteína M','Proteína M2 de influenza','Disco adhesivo ventral','Ergosterol'], c:0, exp:'La proteína M contribuye a la evasión de mecanismos opsónicos y fagocíticos.', source:'Cuadernillo ADN 2026 · factores de virulencia bacteriana; validar con la bibliografía principal' },
    { id:'b-endotoxin-01', difficulty:'normal', topic:'Bacteriología', q:'Una bacteria Gram negativa libera componentes de su membrana externa. ¿Qué componente se asocia con la actividad endotóxica clásica?', a:['Lipopolisacárido, especialmente su lípido A','Ergosterol','Hemaglutinina','Ácido micólico como componente universal de Gram negativas'], c:0, exp:'El LPS de la membrana externa de bacterias Gram negativas contiene el lípido A, relacionado con la actividad endotóxica.', source:'Cuadernillo ADN 2026 · TP 1, LPS y envolturas bacterianas' },
    { id:'b-tetanus-01', difficulty:'normal', topic:'Bacteriología', q:'¿Qué efecto produce la toxina tetánica sobre la neurotransmisión?', a:['Disminuye la liberación de neurotransmisores inhibitorios y favorece rigidez/espasmos','Bloquea la liberación de acetilcolina en la unión neuromuscular y causa parálisis flácida','Escinde ácido siálico para liberar viriones','Forma hifas ramificadas en tejido'], c:0, exp:'La tetanospasmina altera la liberación de neurotransmisores inhibitorios, lo que produce desinhibición motora.', source:'Cuadernillo ADN 2026 · p. 8, toxinas bacterianas' },
    { id:'b-botulinum-01', difficulty:'normal', topic:'Bacteriología', q:'¿Qué mecanismo explica la parálisis flácida causada por la toxina botulínica?', a:['Inhibe la liberación de acetilcolina en la terminal presináptica','Aumenta la liberación de GABA y glicina','Bloquea la neuraminidasa de influenza','Inhibe la síntesis de ergosterol'], c:0, exp:'La toxina botulínica interfiere con la liberación de acetilcolina y produce debilidad/parálisis flácida.', source:'Cuadernillo ADN 2026 · p. 8, toxinas bacterianas; validar con la bibliografía principal' },
    { id:'v-drift-01', difficulty:'normal', topic:'Virología', q:'¿Qué describe mejor la deriva antigénica (antigenic drift) de influenza?', a:['Acumulación de cambios menores en antígenos como HA y NA','Reasortamiento de segmentos de dos virus coinfectantes como único mecanismo','Pérdida obligatoria de la envoltura','Conversión del ARN viral en peptidoglucano'], c:0, exp:'La deriva antigénica se relaciona con cambios menores acumulados que alteran la antigenicidad de HA y NA.', source:'Cuadernillo ADN 2026 · bloque de influenza y variación antigénica' },
    { id:'v-shift-01', difficulty:'normal', topic:'Virología', q:'¿Qué proceso se asocia con el cambio antigénico mayor (antigenic shift) de influenza A?', a:['Reasortamiento de segmentos genómicos cuando virus compatibles coinfectan una célula','Mutación puntual aislada en cualquier bacteria','Escisión de ácido siálico por neuraminidasa','Formación de hifas dentro del epitelio'], c:0, exp:'El genoma segmentado de influenza permite reasortamiento durante coinfección; el resultado viable depende de compatibilidad entre los segmentos.', source:'Cuadernillo ADN 2026 · bloque de influenza y variación antigénica' },
    { id:'v-tropism-01', difficulty:'normal', topic:'Virología', q:'¿Qué explicación describe mejor el tropismo tisular de un virus?', a:['La susceptibilidad depende, entre otros factores, de receptores celulares y condiciones que permiten la replicación','Todos los virus infectan por igual cualquier tejido','Depende solo de la forma geométrica de la cápside','Se define exclusivamente por la temperatura del ambiente externo'], c:0, exp:'El tropismo refleja la capacidad diferencial de infectar ciertos tipos celulares; intervienen receptores y factores celulares.', source:'Cuadernillo ADN 2026 · Núcleo 1, actividad sobre tropismo viral' },
    { id:'v-replication-01', difficulty:'normal', topic:'Virología', q:'¿Cuál secuencia resume de forma más adecuada las etapas generales de replicación viral?', a:['Adhesión, entrada, desencapsidamiento, síntesis, ensamblaje y liberación','Tinción de Gram, germinación, mitosis y fagocitosis','Adherencia, formación de hifas, micelio y esporulación en todos los virus','Esporulación, conjugación bacteriana y formación de una cápsula'], c:0, exp:'El material del curso pide reconocer las etapas generales de entrada, expresión/replicación del genoma, ensamblaje y liberación.', source:'Cuadernillo ADN 2026 · Núcleo 1, actividad sobre replicación viral' },
    { id:'p-ent-01', difficulty:'normal', topic:'Parasitología', q:'¿Qué hallazgo microscópico en un trofozoíto apoya clásicamente una amebiasis invasora por Entamoeba histolytica?', a:['Eritrocitos ingeridos en su citoplasma','Cápside con ocho segmentos de ARN','Hifas septadas con ramificación aguda','Flagelo bacteriano peritrico'], c:0, exp:'La eritrofagocitosis es un hallazgo clásico asociado con trofozoítos invasores de E. histolytica.', source:'Cuadernillo ADN 2026 · bloque de parasitología; comparar giardosis y entamoebosis' },
    { id:'f-asper-01', difficulty:'normal', topic:'Micología', q:'¿Qué morfología microscópica orienta clásicamente a Aspergillus en un tejido?', a:['Hifas septadas con ramificación aproximadamente en ángulo agudo','Cocos en racimo','Trofozoítos con disco ventral','Viriones desnudos con ARN segmentado'], c:0, exp:'Aspergillus se asocia clásicamente con hifas septadas y ramificación en ángulo agudo; la identificación completa requiere integrar otros datos.', source:'Cuadernillo ADN 2026 · TP de micología, formas de mohos' },

    // NORMAL · aplicación en casos y relación entre estructura, transmisión y patogenia.
    { id:'case-pneumonia-01', difficulty:'normal', topic:'Bacteriología', q:'Un paciente presenta fiebre alta, tos productiva y esputo herrumbroso. En el examen se observan diplococos Gram positivos. ¿Qué agente del cuadro comparativo del cuadernillo resulta más compatible?', a:['Streptococcus pneumoniae','Staphylococcus aureus en racimos','Vibrio cholerae','Candida albicans'], c:0, exp:'El cuadernillo asocia S. pneumoniae con neumonía y plantea un caso respiratorio con esputo herrumbroso para interpretar la morfología bacteriana.', source:'Cuadernillo ADN 2026 · pp. 17–18, caso clínico y tabla de morfología' },
    { id:'case-gram-02', difficulty:'normal', topic:'Bacteriología', q:'En una tinción de Gram, una bacteria aparece rosada luego de la decoloración y la contratiñón. ¿Cuál interpretación inicial es la más adecuada?', a:['Es compatible con Gram negativa; debe correlacionarse con morfología y otros datos','Es Gram positiva porque retuvo intensamente cristal violeta','Es necesariamente un hongo levaduriforme','La tinción identifica por sí sola y sin contexto la especie'], c:0, exp:'Las Gram negativas pierden el complejo cristal violeta-yodo durante la decoloración y toman la contratiñón; esto orienta, pero no identifica por sí solo la especie.', source:'Cuadernillo ADN 2026 · TP 1, pasos de la tinción de Gram' },
    { id:'case-influenza-01', difficulty:'normal', topic:'Virología', q:'En un caso de gripe, ¿qué combinación de proteína y función explica mejor la entrada y la liberación de nuevas partículas?', a:['HA participa en unión/entrada; NA favorece liberación al escindir ácido siálico','NA reconoce primero el receptor y HA corta ácido siálico para la salida','M1 integra el genoma y NP forma el receptor CD4','M2 es una toxina que degrada el LPS bacteriano'], c:0, exp:'HA y NA son dos proteínas de superficie centrales de influenza, pero cumplen funciones diferentes: entrada y liberación, respectivamente.', source:'Cuadernillo ADN 2026 · bloque de influenza' },
    { id:'case-flu-vaccine-01', difficulty:'normal', topic:'Virología', q:'¿Por qué la composición de la vacuna antigripal puede necesitar actualizarse entre temporadas?', a:['Porque la variación antigénica de influenza puede cambiar la correspondencia entre cepas circulantes y antígenos vacunales','Porque influenza cambia siempre su genoma de ARN a ADN','Porque la neuraminidasa desaparece en todas las cepas al invierno','Porque todas las bacterias respiratorias intercambian sus cápsides con influenza'], c:0, exp:'La variación antigénica de HA y NA, especialmente por cambios graduales, contribuye a la necesidad de actualizar la composición de la vacuna.', source:'Cuadernillo ADN 2026 · bloque de influenza, variación antigénica y vacuna' },
    { id:'case-influenza-envelope-01', difficulty:'normal', topic:'Virología', q:'¿Qué predicción general es coherente con que influenza sea un virus envuelto?', a:['Su envoltura lipídica participa en entrada y salida y puede ser vulnerable a condiciones que alteran lípidos','Tiene una pared de peptidoglucano como una bacteria','Se reproduce por fisión binaria fuera de la célula','Posee hifas y se multiplica por conidios'], c:0, exp:'El material del curso compara la replicación de virus envueltos y desnudos; la envoltura lipídica influye en su estabilidad y en la entrada/salida.', source:'Cuadernillo ADN 2026 · Núcleo 1, diferencias entre virus envueltos y desnudos' },
    { id:'case-malaria-01', difficulty:'normal', topic:'Parasitología', q:'En una gota gruesa se reconocen eritrocitos parasitados con trofozoítos y algunos gametocitos. ¿Qué grupo de agentes resulta más compatible?', a:['Plasmodium spp., protozoos Apicomplexa','Giardia, protozoos flagelados del intestino','Dermatofitos, hongos filamentosos','Influenza A, virus envuelto de ARN segmentado'], c:0, exp:'El cuadernillo utiliza un caso de malaria con trofozoítos y gametocitos dentro de eritrocitos para trabajar el ciclo de Plasmodium.', source:'Cuadernillo ADN 2026 · bloque de parasitosis vectoriales, malaria' },
    { id:'case-trichinella-01', difficulty:'normal', topic:'Parasitología', q:'¿Qué forma de Trichinella spiralis se relaciona con la localización en músculo estriado?', a:['Larva enquistada','Virión con envoltura','Hifa vegetativa','Coco Gram positivo'], c:0, exp:'En la triquinelosis, las larvas se localizan en músculo estriado; el material pide reconocer ciclos y estructuras parasitarias.', source:'Cuadernillo ADN 2026 · bloque de parásitos y ciclos de vida' },
    { id:'case-dimorphic-01', difficulty:'normal', topic:'Micología', q:'Un hongo presenta crecimiento filamentoso a temperatura ambiental y forma levaduriforme a 37 °C. ¿Qué propiedad describe?', a:['Dimorfismo térmico','Tinción ácido-alcohol resistente','Reasortamiento genómico','Fagocitosis obligatoria'], c:0, exp:'Algunos hongos dimórficos cambian entre forma de moho y levadura en función de las condiciones, incluida la temperatura.', source:'Cuadernillo ADN 2026 · p. 20, dimorfismo fúngico' },
    { id:'case-giardia-amoeba-01', difficulty:'normal', topic:'Parasitología', q:'¿Qué comparación es más consistente entre Giardia y Entamoeba histolytica?', a:['Giardia se adhiere a la mucosa mediante disco ventral; E. histolytica puede producir invasión tisular','Ambas son bacterias Gram negativas con LPS','Giardia forma hifas y Entamoeba es un virus desnudo','Ambas se transmiten solo por la picadura de un mosquito'], c:0, exp:'El cuadernillo propone comparar giardosis y entamoebosis, incluyendo forma parasitaria, tropismo, síntomas y diagnóstico.', source:'Cuadernillo ADN 2026 · bloque de parasitosis por protozoos' },
    { id:'case-dengue-01', difficulty:'normal', topic:'Epidemiología y transmisión', q:'Al estudiar una infección transmitida por un vector, ¿qué conjunto de datos es más útil para describir la cadena epidemiológica?', a:['Agente, reservorio, salida, transmisión, entrada y susceptibilidad del hospedador','Solo el color del microorganismo y la puntuación del paciente','Únicamente si el agente presenta hifas','Solo la presencia de una cápside o de una cápsula'], c:0, exp:'El cuadernillo organiza la cadena epidemiológica en agente, reservorio, puerta de salida, modo de transmisión, puerta de entrada y susceptibilidad.', source:'Cuadernillo ADN 2026 · bloque de enfermedades transmitidas por vectores' },
    { id:'case-virus-size-01', difficulty:'normal', topic:'Virología', q:'¿Por qué la visualización directa de partículas virales requiere habitualmente microscopía electrónica y no un microscopio óptico convencional?', a:['Porque las partículas virales son, en general, menores que el poder de resolución del microscopio óptico','Porque los virus no tienen ninguna estructura física','Porque los virus solo son visibles si tienen flagelos','Porque la microscopía electrónica identifica automáticamente todos los genomas'], c:0, exp:'El cuadernillo señala que, a diferencia de bacterias y hongos, los virus requieren microscopía electrónica para observar sus partículas directamente.', source:'Cuadernillo ADN 2026 · pp. 23–24, diagnóstico viral y microscopía' },
    { id:'case-hiv-01', difficulty:'normal', topic:'Virología', q:'¿Qué característica de los retrovirus, como el VIH, explica que se estudien aparte de virus con genoma de ARN de sentido positivo?', a:['Utilizan transcriptasa inversa para generar ADN a partir de ARN viral','Poseen una pared de quitina','Se dividen por fisión binaria como bacterias','Su genoma está formado siempre por ocho segmentos de ARN negativo'], c:0, exp:'El cuadernillo pide diferenciar la expresión y replicación de genomas de ADN, ARN y retrovirus como VIH; la transcriptasa inversa es el rasgo clave de estos últimos.', source:'Cuadernillo ADN 2026 · Núcleo 1, actividad sobre genomas virales' },

    // DIFÍCIL · integración diagnóstica y detalles finos.
    { id:'integrate-gram-case-01', difficulty:'dificil', topic:'Bacteriología', q:'Se observan cocos en racimos, Gram positivos. ¿Cuál es la interpretación más prudente a partir de la morfología sola?', a:['Orienta hacia Staphylococcus, pero la identificación de especie requiere integrar otras pruebas','Confirma por sí sola Streptococcus pneumoniae','Demuestra que se trata de un virus envuelto','Permite concluir que el aislamiento es siempre contaminante'], c:0, exp:'La forma y disposición orientan la identificación preliminar, pero no sustituyen el cultivo y las pruebas complementarias.', source:'Cuadernillo ADN 2026 · pp. 13–17, identificación y morfología bacteriana' },
    { id:'integrate-lps-01', difficulty:'dificil', topic:'Bacteriología', q:'Una bacteria presenta membrana externa, LPS y tiñe rosado con Gram. ¿Qué pareja de conceptos se integra mejor?', a:['Envoltura compatible con Gram negativa y potencial actividad endotóxica del LPS','Pared de quitina y reproducción por gemación','Envoltura viral con HA y NA','Pared rica en ácidos micólicos y tinción ácido-alcohol resistente como regla general'], c:0, exp:'La estructura de la envoltura y la reacción a Gram se relacionan: en Gram negativas, el LPS está en la membrana externa.', source:'Cuadernillo ADN 2026 · TP 1, estructura bacteriana y Gram' },
    { id:'integrate-virus-vs-bacteria-01', difficulty:'dificil', topic:'Virología', q:'¿Cuál diferencia biológica explica mejor por qué un virus no se multiplica en un medio de cultivo bacteriano convencional como una bacteria?', a:['El virus depende de la maquinaria de una célula hospedadora para producir nuevas partículas','El virus posee más ribosomas que una bacteria','El virus se reproduce por hifas','La bacteria necesita siempre integrar su genoma al humano'], c:0, exp:'Los virus son entidades acelulares y dependen de una célula hospedadora; las bacterias sí pueden multiplicarse en medios apropiados si las condiciones son adecuadas.', source:'Cuadernillo ADN 2026 · pp. 5–6 y 23, introducción a microbiología y virología' },
    { id:'integrate-parasite-cycle-01', difficulty:'dificil', topic:'Parasitología', q:'¿Qué distingue de manera general un ciclo parasitario indirecto (heteroxénico) de uno directo?', a:['El indirecto requiere más de un hospedador para completar su ciclo; el directo no necesita hospedador intermediario','El indirecto ocurre solo en virus envueltos','El directo requiere siempre un mosquito','El indirecto carece de formas infectantes'], c:0, exp:'La distinción entre ciclo directo e indirecto se basa en los hospedadores necesarios; el intermediario aloja una etapa del ciclo.', source:'Cuadernillo ADN 2026 · bloque de parasitología, ciclos de vida y hospedador intermediario' },
    { id:'integrate-plasmodium-01', difficulty:'dificil', topic:'Parasitología', q:'En malaria, ¿qué afirmación relaciona mejor el hallazgo en sangre con el ciclo parasitario?', a:['Las formas eritrocíticas de Plasmodium participan en la fase sanguínea y se relacionan con la clínica','Los trofozoítos se transforman en hifas dentro de los eritrocitos','Los gametocitos son segmentos del genoma de influenza','El vector es una bacteria Gram positiva'], c:0, exp:'El cuadernillo trabaja el ciclo de Plasmodium y relaciona trofozoítos/gametocitos en eritrocitos con las manifestaciones clínicas.', source:'Cuadernillo ADN 2026 · bloque de malaria' },
    { id:'integrate-influenza-m2-01', difficulty:'dificil', topic:'Virología', q:'¿Qué función se atribuye a M2 en influenza A, a diferencia de HA y NA?', a:['M2 actúa como canal iónico de protones; HA participa en unión/entrada y NA en liberación','M2 es la proteína que reconoce ácido siálico y NA es el canal de protones','M2 forma el LPS y HA constituye la pared de peptidoglucano','M2 es una inmunoglobulina y NA una citocina'], c:0, exp:'M2 es un canal iónico; HA y NA son proteínas de superficie con funciones diferentes. Este detalle fino debe cotejarse con la bibliografía principal antes de publicar el banco definitivo.', source:'Cuadernillo ADN 2026 · bloque de influenza; validar detalle con Carballal y Oubiña' },
    { id:'integrate-pili-capsule-01', difficulty:'dificil', topic:'Bacteriología', q:'Un aislamiento bacteriano muestra estructuras de adhesión y una cápsula. ¿Qué interpretación funcional es la más adecuada?', a:['Las estructuras de adhesión pueden favorecer la colonización y la cápsula puede contribuir a evadir la fagocitosis','Ambas estructuras son organelas para la síntesis de ATP','La cápsula realiza la transcripción del ARN viral','Los pili forman el micelio fúngico'], c:0, exp:'Adhesión y evasión son etapas distintas del proceso infeccioso; distintas estructuras pueden contribuir a cada una.', source:'Cuadernillo ADN 2026 · p. 8, mecanismos de patogenicidad y factores de virulencia' },
    { id:'integrate-fungal-forms-01', difficulty:'dificil', topic:'Micología', q:'En un preparado se observan filamentos ramificados y, en otra muestra, células ovales con gemación. ¿Qué interpretación es más consistente?', a:['Pueden representar formas de hongos filamentosos y levaduriformes, respectivamente','La primera es necesariamente una espiroqueta y la segunda un virión','Ambas son formas de bacterias Gram negativas','Las dos estructuras son parásitos metazoos'], c:0, exp:'El cuadernillo diferencia levaduras y mohos por su organización: células ovales con gemación frente a hifas y micelio.', source:'Cuadernillo ADN 2026 · pp. 18–20, micología' },
    { id:'integrate-giardia-01', difficulty:'dificil', topic:'Parasitología', q:'En una muestra intestinal se observa un protozoo con simetría bilateral aparente, dos núcleos y varios flagelos. ¿Qué agente de la lista es el más compatible?', a:['Giardia lamblia','Entamoeba histolytica','Plasmodium falciparum','Leishmania infantum en fase amastigote'], c:0, exp:'El trofozoíto de Giardia se reconoce por su morfología característica, incluidos sus dos núcleos y flagelos; la identificación clínica requiere el contexto diagnóstico.', source:'Cuadernillo ADN 2026 · bloque de giardosis y observación parasitológica' },
    { id:'integrate-adhesion-invasion-01', difficulty:'dificil', topic:'Patogenia e infección', q:'¿Cuál orden representa mejor una secuencia general del proceso infeccioso que trabaja el cuadernillo?', a:['Colonización de la puerta de entrada, evasión, diseminación, superación de defensas, adaptación y daño','Esporulación, tinción de Gram, fotosíntesis y muerte celular','Traducción, gemación, tinción y conjugación como secuencia universal','Daño, desaparición del agente y luego ingreso al hospedador'], c:0, exp:'El cuadernillo enumera etapas del proceso infeccioso como colonización, evasión, diseminación, adaptación y daño.', source:'Cuadernillo ADN 2026 · p. 9, etapas del proceso infeccioso' },
    { id:'integrate-mycoplasma-01', difficulty:'dificil', topic:'Bacteriología', q:'¿Qué característica diferencia a Mycoplasma de muchas otras bacterias en relación con la pared celular?', a:['Carece de pared celular típica, por lo que la tinción de Gram y los fármacos dirigidos a pared no se interpretan como en bacterias con peptidoglucano','Tiene una pared de quitina y membrana con ergosterol','Posee cápside de ocho segmentos','Forma siempre endosporas resistentes'], c:0, exp:'El cuadernillo incluye Mycoplasma en la comparación de bacterias que no se comportan con la tinción de Gram como los grupos clásicos; la ausencia de pared típica es su diferencia clave.', source:'Cuadernillo ADN 2026 · TP 1, tabla comparativa de envolturas bacterianas' },
    { id:'integrate-fecal-route-01', difficulty:'dificil', topic:'Parasitología', q:'Para analizar una parasitosis asociada con agua o alimentos contaminados, ¿qué conjunto de datos es más pertinente?', a:['Forma infectante, vía de transmisión, ciclo, hospedadores y factores ambientales','Solo el color del trofozoíto','Solo el tipo de tinción de Gram','Únicamente si el microorganismo tiene envoltura lipídica'], c:0, exp:'El cuadernillo insiste en relacionar formas parasitarias, transmisión, hospedadores, ciclo biológico y determinantes ambientales.', source:'Cuadernillo ADN 2026 · parasitología, cadena epidemiológica y ciclos' },
    { id:'normal-b-catalase-case-01', difficulty:'normal', topic:'Bacteriología', q:'Un coco grampositivo produce burbujas al mezclarse con peróxido de hidrógeno. ¿Qué orientación inicial es más consistente?', a:['Staphylococcus, con identificación posterior mediante pruebas adicionales','Streptococcus, confirmado a nivel de especie por la catalasa','Enterococcus, porque todos sus aislamientos son catalasa fuertemente positivos','Neumococo, porque la catalasa detecta su cápsula'], c:0, exp:'La catalasa positiva orienta a Staphylococcus frente a estreptococos y enterococos, pero no identifica por sí sola la especie.', source:'CDC · guía de identificación de cocos grampositivos' },
    { id:'normal-v-molecular-01', difficulty:'normal', topic:'Virología', q:'¿Qué detecta principalmente una RT-PCR usada para influenza en una muestra respiratoria?', a:['Ácido nucleico viral, luego de convertir el ARN para su amplificación','Anticuerpos neutralizantes producidos por el paciente','Proteína de matriz viral exclusivamente','Virus viable mediante observación directa de cada virión'], c:0, exp:'Los ensayos moleculares como RT-PCR detectan ARN o ácidos nucleicos de influenza; detectar material genético no demuestra por sí solo que haya virus viable.', source:'CDC · pruebas moleculares para influenza' },
    { id:'normal-f-polyene-01', difficulty:'normal', topic:'Micología', q:'¿Cuál es el blanco de membrana clásico al que se unen los antifúngicos poliénicos?', a:['Ergosterol','Peptidoglucano','Lipopolisacárido','Ácido siálico'], c:0, exp:'Los poliénicos interactúan con ergosterol de la membrana fúngica y alteran su permeabilidad.', source:'CDC Emerging Infectious Diseases · dianas de antifúngicos' },
    { id:'normal-p-malaria-smear-01', difficulty:'normal', topic:'Parasitología', q:'En el examen microscópico de malaria, ¿qué combinación de uso de gota gruesa y frotis delgado es correcta?', a:['La gota gruesa favorece detectar parásitos; el frotis delgado ayuda a identificar especie','El frotis delgado detecta siempre mejor cargas bajas; la gota gruesa identifica especie con mayor precisión','Ambos métodos sirven solo para estimar anticuerpos','La gota gruesa se usa para hongos y el frotis para bacterias'], c:0, exp:'La gota gruesa concentra más sangre y facilita detectar parásitos; el frotis delgado conserva mejor la morfología y ayuda a determinar especie.', source:'CDC DPDx · malaria y procesamiento de muestras sanguíneas' },
    { id:'normal-parasite-giardia-dx-01', difficulty:'normal', topic:'Parasitología', q:'¿Qué hallazgo puede servir para diagnosticar giardiasis en materia fecal?', a:['Quistes o trofozoítos, también detectables por métodos de antígeno','Únicamente huevos con opérculo','Solo larvas migratorias en sangre periférica','Exclusivamente trofozoítos en una biopsia hepática'], c:0, exp:'La identificación de quistes o trofozoítos en heces y los ensayos de detección de antígeno son métodos utilizados para Giardia.', source:'CDC DPDx · giardiasis' },
    { id:'hard-malaria-thickthin-01', difficulty:'dificil', topic:'Laboratorio y diagnóstico', q:'En una sospecha de malaria, ¿por qué se solicitan tanto gota gruesa como frotis delgado?', a:['La gota gruesa aumenta la detección al concentrar parásitos y el frotis delgado conserva mejor la morfología para identificar especie','La gota gruesa identifica especie con mayor precisión y el frotis delgado se utiliza solo para anticuerpos','La gota gruesa detecta gametocitos, mientras que el frotis delgado detecta únicamente formas hepáticas','Ambos se preparan para distinguir bacteriemia de fungemia'], c:0, exp:'La gota gruesa es más sensible para detectar parásitos; el frotis delgado es más útil para identificar especie y estimar parasitemia.', source:'CDC · guía de diagnóstico de malaria' },
    { id:'hard-falciparum-smear-01', difficulty:'dificil', topic:'Laboratorio y diagnóstico', q:'En un frotis delgado, ¿qué patrón apoya Plasmodium falciparum sin ser por sí solo una identificación definitiva?', a:['Eritrocitos de tamaño generalmente normal, con anillos delicados y posibilidad de más de un parásito por eritrocito','Eritrocitos aumentados de tamaño con esquizontes abundantes como hallazgo constante','Eritrocitos normales con formas en banda como presentación más característica','Eritrocitos ovalados y siempre aumentados, con gametocitos redondos que llenan la célula'], c:0, exp:'P. falciparum suele mostrar anillos delicados, puede infectar múltiples veces un eritrocito y no suele agrandarlo; la interpretación debe integrar otros rasgos y contexto.', source:'CDC DPDx · malaria, frotis de P. falciparum' },
    { id:'hard-malaria-repeat-01', difficulty:'dificil', topic:'Laboratorio y diagnóstico', q:'Si persiste una sospecha clínica de malaria tras un primer frotis negativo, ¿qué estrategia diagnóstica recomienda CDC antes de descartarla?', a:['Repetir los frotis cada 12–24 horas hasta completar tres series','Repetir un único frotis al mes siguiente','Cambiar directamente a una prueba serológica y no volver a examinar sangre','Descartar malaria si la primera gota gruesa fue negativa'], c:0, exp:'Las parasitemias bajas pueden no detectarse inicialmente; CDC recomienda repetir frotis cada 12–24 horas hasta obtener tres series antes de descartar malaria.', source:'CDC · evaluación y diagnóstico de malaria' },
    { id:'hard-malaria-gametocyte-01', difficulty:'dificil', topic:'Parasitología', q:'¿Qué interpretación de los gametocitos de Plasmodium en sangre es correcta?', a:['Son formas sexuales que pueden persistir y ser ingeridas por el mosquito; no son la fase asexual que explica los síntomas','Son la forma hepática que invade hepatocitos y causa directamente la fiebre','Son la única forma que debe contarse para estimar parasitemia clínica','Su presencia demuestra siempre que el tratamiento fracasó'], c:0, exp:'Los gametocitos son formas sexuales; pueden estar presentes después de que las formas asexuales hayan disminuido y son relevantes para transmisión al mosquito.', source:'CDC · evaluación y diagnóstico de malaria' },
    { id:'hard-pvivax-hypnozoite-01', difficulty:'dificil', topic:'Parasitología', q:'¿Qué explica las recaídas meses o años después de una infección por P. vivax o P. ovale?', a:['Hipnozoítos latentes en el hígado que pueden reactivarse e invadir eritrocitos','Quistes intestinales que persisten en el colon','Gametocitos que permanecen viables dentro de eritrocitos por años','Esquizontes que se mantienen latentes en los pulmones'], c:0, exp:'P. vivax y P. ovale pueden dejar hipnozoítos hepáticos latentes que se reactivan y producen recaídas.', source:'CDC DPDx · malaria; CDC Clinical Features of Malaria' },
    { id:'hard-giardia-dfa-01', difficulty:'dificil', topic:'Laboratorio y diagnóstico', q:'Según CDC, ¿qué prueba microscópica se considera estándar de referencia para diagnosticar Giardia?', a:['Inmunofluorescencia directa (DFA) en materia fecal','Tinción de Gram de un hemocultivo','Gota gruesa con Giemsa','Prueba de catalasa del aspirado duodenal'], c:0, exp:'CDC señala la inmunofluorescencia directa como estándar de referencia; también se usan métodos moleculares, antígenos y microscopía convencional.', source:'CDC · pruebas y diagnóstico de Giardia' },
    { id:'hard-giardia-sampling-01', difficulty:'dificil', topic:'Laboratorio y diagnóstico', q:'¿Por qué puede solicitarse más de una muestra de materia fecal para buscar Giardia?', a:['La eliminación de quistes puede variar entre muestras y el muestreo seriado mejora la recuperación diagnóstica','El parásito aparece solo en la tercera muestra por un ciclo de tres días','Las muestras repetidas son necesarias para inducir la formación de trofozoítos','La primera muestra debe usarse para cultivo y las siguientes para tinción de Gram'], c:0, exp:'La eliminación puede ser intermitente; las muestras seriadas y los métodos apropiados aumentan la posibilidad de detectar Giardia.', source:'CDC · pruebas y diagnóstico de Giardia; CDC DPDx' },
    { id:'hard-leish-stage-01', difficulty:'dificil', topic:'Parasitología', q:'¿Qué forma de Leishmania se encuentra habitualmente en tejido humano en el examen microscópico?', a:['Amastigotes dentro de células del sistema fagocítico mononuclear','Promastigotes flagelados libres como forma tisular predominante','Tripomastigotes en cadenas dentro de eritrocitos','Quistes con cuatro núcleos en la luz intestinal'], c:0, exp:'En tejido humano se observan amastigotes; los promastigotes se desarrollan en el flebótomo y en ciertos cultivos.', source:'CDC DPDx · leishmaniasis' },
    { id:'hard-leish-differential-01', difficulty:'dificil', topic:'Laboratorio y diagnóstico', q:'En una biopsia, ¿qué precaución diagnóstica aplica al observar amastigotes con núcleo y cinetoplasto?', a:['La morfología no diferencia por sí sola Leishmania de Trypanosoma cruzi; puede requerirse otra técnica','La forma demuestra Leishmania major a nivel de especie','El cinetoplasto confirma que se trata de un hongo dimórfico','La presencia de amastigotes descarta una infección parasitaria'], c:0, exp:'Los amastigotes de Leishmania y T. cruzi son morfológicamente indistinguibles en microscopía; el contexto y otras técnicas son necesarios.', source:'CDC DPDx · leishmaniasis' },
    { id:'hard-entamoeba-caveat-01', difficulty:'dificil', topic:'Parasitología', q:'¿Cuál es la interpretación más prudente de eritrocitos ingeridos por un trofozoíto compatible con E. histolytica?', a:['Es un hallazgo clásicamente asociado, pero no distingue de manera infalible E. histolytica de E. dispar','Confirma E. histolytica y excluye cualquier otra especie','Indica que el preparado contiene gametocitos de Plasmodium','Es un hallazgo exclusivo de amebas no patógenas'], c:0, exp:'La eritrofagocitosis se asocia clásicamente con E. histolytica, aunque rara vez puede observarse también en E. dispar; no es un criterio infalible.', source:'CDC DPDx · amebiasis' },
    { id:'hard-asper-galactomannan-01', difficulty:'dificil', topic:'Laboratorio y diagnóstico', q:'¿Qué detecta el ensayo de galactomanano utilizado en la evaluación de aspergilosis?', a:['Un polisacárido de la pared celular de Aspergillus','Anticuerpos contra ergosterol de la membrana','ARN ribosomal de todos los hongos filamentosos','Lipopolisacárido liberado por Aspergillus'], c:0, exp:'El galactomanano es un polisacárido de la pared de Aspergillus; el resultado debe interpretarse junto con el cuadro y otras pruebas.', source:'CDC · diagnóstico de aspergilosis' },
    { id:'hard-candida-culture-01', difficulty:'dificil', topic:'Micología', q:'¿Qué limitación debe considerarse al interpretar un cultivo positivo para Candida?', a:['Puede reflejar colonización y no demostrar por sí solo que Candida cause los síntomas','Confirma siempre candidiasis invasiva, aun sin correlación clínica','Distingue de forma definitiva todas las especies por el aspecto macroscópico','Descarta infección si la muestra no contiene levaduras gemantes'], c:0, exp:'Candida puede colonizar sitios del cuerpo; el resultado del cultivo requiere correlación con el sitio, síntomas y contexto clínico.', source:'CDC · pruebas y diagnóstico de candidiasis' },
    { id:'hard-influenza-shift-01', difficulty:'dificil', topic:'Virología', q:'¿Qué mecanismo se asocia con el cambio antigénico mayor de influenza A?', a:['Intercambio o reasortamiento de segmentos genómicos entre virus compatibles que coinfectan una célula','Acumulación lenta de mutaciones puntuales en una única proteína de superficie','Pérdida progresiva de la envoltura lipídica durante la replicación','Conversión del ARN viral en ADN por una transcriptasa inversa'], c:0, exp:'El cambio antigénico mayor se asocia con reasortamiento de segmentos; se distingue de la deriva antigénica, que acumula cambios menores.', source:'CDC · drift y shift antigénicos de influenza' },
    { id:'hard-influenza-rna-01', difficulty:'dificil', topic:'Virología', q:'Un ensayo molecular de influenza detecta ARN viral en una muestra respiratoria. ¿Qué conclusión no puede establecerse solo con ese resultado?', a:['Que todo el material detectado provenga necesariamente de virus viable con replicación activa','Que había ácido nucleico viral en la muestra analizada','Que el método detectó material genético del virus','Que el resultado debe interpretarse en el contexto clínico'], c:0, exp:'La detección de ARN o ácidos nucleicos no demuestra por sí sola que haya virus viable o replicación activa en ese momento.', source:'CDC · pruebas moleculares para influenza' },
    { id:'hard-malaria-falciparum-01', difficulty:'dificil', topic:'Parasitología', q:'¿Qué combinación describe mejor la ruta de formas asexuales de Plasmodium en el hospedador humano?', a:['Esporozoitos infectan hígado; luego merozoitos pasan a eritrocitos y las formas asexuales se multiplican en sangre','Merozoitos infectan primero el hígado; después los esporozoitos invaden eritrocitos','Gametocitos se multiplican en hepatocitos y producen quistes intestinales','Los ooquistes sanguíneos migran del intestino a los eritrocitos'], c:0, exp:'Los esporozoitos inoculados por el mosquito infectan hepatocitos; los merozoitos liberados inician la fase eritrocítica.', source:'CDC DPDx · biología de Plasmodium' },
    { id:'hard-asper-interpretation-01', difficulty:'dificil', topic:'Micología', q:'¿Qué interpretación es más adecuada ante hifas compatibles con Aspergillus y un galactomanano positivo?', a:['Los hallazgos apoyan la evaluación diagnóstica, pero deben integrarse con cultivo, histopatología y contexto clínico','La combinación identifica por sí sola la especie y confirma enfermedad invasiva en cualquier paciente','El galactomanano demuestra que las hifas son viables y sensibles a todos los antifúngicos','La microscopía excluye la necesidad de valorar muestras y factores clínicos'], c:0, exp:'Microscopía, histopatología, cultivo y biomarcadores aportan evidencia complementaria; ninguna lectura aislada reemplaza la integración diagnóstica.', source:'CDC · diagnóstico de aspergilosis' },
    { id:'hard-blood-smear-quant-01', difficulty:'dificil', topic:'Laboratorio y diagnóstico', q:'¿Qué uso principal tiene el frotis delgado una vez detectados parásitos en una gota gruesa para malaria?', a:['Apoyar la identificación de especie y la cuantificación de parasitemia','Confirmar anticuerpos y determinar si hay inmunidad protectora','Detectar exclusivamente formas hepáticas latentes','Distinguir bacterias Gram positivas de Gram negativas'], c:0, exp:'El frotis delgado conserva la morfología eritrocitaria y es útil para identificar la especie y cuantificar la parasitemia (% de eritrocitos parasitados); la gota gruesa es más sensible para detectar.', source:'CDC · diagnóstico de malaria' },
    { id:'hard-giardia-stages-01', difficulty:'dificil', topic:'Parasitología', q:'¿Qué secuencia del ciclo de Giardia es correcta tras ingerir quistes infectantes?', a:['La excistación en intestino delgado libera trofozoítos, que se multiplican y luego pueden enquistarse durante el tránsito intestinal','Los trofozoítos ingeridos forman primero ooquistes sanguíneos y luego invaden el hígado','Los quistes se multiplican en sangre y liberan esporozoítos en el colon','Los trofozoítos forman huevos embrionados que maduran en un vector'], c:0, exp:'Tras ingerir quistes, la excistación libera trofozoítos en el intestino delgado; al avanzar por el intestino puede ocurrir enquistamiento.', source:'CDC DPDx · giardiasis' },
  ];

  const PLAUSIBLE_OPTIONS = {
    'b-spn-01':['La cápsula polisacárida','Proteína A y coagulasa','Neumolisina y autolisina','Proteína M y estreptolisina O'],
    'b-endotoxin-01':['Lipopolisacárido, especialmente su lípido A','Porinas de la membrana externa','Peptidoglucano de la pared','Ácidos teicoicos de la pared'],
    'b-tetanus-01':['Disminuye la liberación de neurotransmisores inhibitorios y favorece rigidez/espasmos','Inhibe la liberación de acetilcolina y causa parálisis flácida','Bloquea receptores nicotínicos postsinápticos','Aumenta la liberación de glicina en la médula espinal'],
    'b-botulinum-01':['Inhibe la liberación de acetilcolina en la terminal presináptica','Inhibe la liberación de glicina y GABA en interneuronas inhibitorias','Bloquea receptores nicotínicos postsinápticos','Aumenta la degradación de acetilcolina en la hendidura sináptica'],
    'v-drift-01':['Acumulación de cambios menores en antígenos como HA y NA','Reasortamiento de segmentos entre virus coinfectantes','Adquisición de una nueva envoltura por recombinación','Pérdida progresiva de la neuraminidasa de superficie'],
    'v-shift-01':['Reasortamiento de segmentos genómicos cuando virus compatibles coinfectan una célula','Acumulación gradual de mutaciones puntuales en HA y NA','Selección de variantes por cambios en la neuraminidasa','Integración estable del genoma viral en el cromosoma humano'],
    'v-tropism-01':['La susceptibilidad depende, entre otros factores, de receptores celulares y condiciones que permiten la replicación','La distribución tisular depende solo de la presencia de un receptor específico','El tropismo se explica principalmente por la estabilidad de la cápside fuera del hospedador','La temperatura del tejido determina por sí sola qué virus puede replicar'],
    'v-replication-01':['Adhesión, entrada, desencapsidamiento, síntesis, ensamblaje y liberación','Adhesión, entrada, síntesis, desencapsidamiento, ensamblaje y liberación','Entrada, adhesión, desencapsidamiento, síntesis, liberación y ensamblaje','Adhesión, entrada, ensamblaje, síntesis, desencapsidamiento y liberación'],
    'p-ent-01':['Eritrocitos ingeridos en su citoplasma','Quistes con cuatro núcleos en la luz intestinal','Trofozoítos adheridos por un disco ventral','Ooquistes con esporozoítos en materia fecal'],
    'f-asper-01':['Hifas septadas con ramificación aproximadamente en ángulo agudo','Hifas anchas paucitabicadas con ramificación irregular','Hifas septadas con ramificación cercana a 90 grados','Levaduras encapsuladas con gemación de base estrecha'],
    'integrate-gram-case-01':['Orienta hacia Staphylococcus, pero la identificación de especie requiere integrar otras pruebas','Confirma Staphylococcus aureus sin necesidad de pruebas adicionales','Orienta a Streptococcus, aunque la disposición no es concluyente','Permite diferenciar especies solo por el diámetro de los cocos'],
    'integrate-lps-01':['Envoltura compatible con Gram negativa y potencial actividad endotóxica del LPS','Envoltura compatible con Gram positiva y actividad endotóxica del peptidoglucano','Envoltura compatible con bacteria ácido-alcohol resistente y LPS en su membrana','Envoltura compatible con bacteria sin pared y membrana externa rica en LPS'],
    'integrate-virus-vs-bacteria-01':['El virus depende de la maquinaria de una célula hospedadora para producir nuevas partículas','El virus necesita un medio con nutrientes más complejo que el bacteriano','El virus carece de metabolismo propio, pero puede dividirse en medios acelulares','La bacteria necesita una célula eucariota para completar su ciclo replicativo'],
    'integrate-influenza-m2-01':['M2 actúa como canal iónico de protones; HA participa en unión/entrada y NA en liberación','M2 participa en la unión al receptor; HA facilita la liberación y NA desencapsida el virión','M2 facilita la fusión de membranas; HA forma el canal iónico y NA reconoce ácido siálico','M2 y NA son canales iónicos; HA participa principalmente en la gemación viral']
,
    'normal-b-catalase-case-01':['Staphylococcus, con identificación posterior mediante pruebas adicionales','Streptococcus, con identificación posterior mediante pruebas adicionales','Enterococcus, con identificación posterior mediante pruebas adicionales','Staphylococcus aureus confirmado por la catalasa sola'],
    'normal-v-molecular-01':['Ácido nucleico viral, luego de convertir el ARN para su amplificación','Antígeno viral detectado por unión de anticuerpos específicos','Anticuerpos del paciente contra proteínas virales','Virus viable cuantificado por crecimiento en cultivo'],
    'normal-f-polyene-01':['Ergosterol','1,3-β-D-glucano de la pared','Quitina de la pared','Colesterol de la membrana humana'],
    'normal-p-malaria-smear-01':['La gota gruesa favorece detectar parásitos; el frotis delgado ayuda a identificar especie','El frotis delgado favorece detectar cargas bajas; la gota gruesa conserva mejor la morfología eritrocitaria','Ambas preparaciones tienen igual sensibilidad y se diferencian solo por el colorante','La gota gruesa identifica especie; el frotis delgado se reserva para contar leucocitos'],
    'normal-parasite-giardia-dx-01':['Quistes o trofozoítos, también detectables por métodos de antígeno','Quistes exclusivamente, porque los trofozoítos no se eliminan en heces','Trofozoítos exclusivamente, porque los quistes no son diagnósticos','Huevos y larvas en sangre periférica'],
    'hard-malaria-thickthin-01':['La gota gruesa aumenta la detección al concentrar parásitos y el frotis delgado conserva mejor la morfología para especie','La gota gruesa identifica especie con mayor precisión y el frotis delgado ofrece mayor sensibilidad a cargas bajas','Ambos detectan parásitos con igual sensibilidad, pero solo la gota gruesa permite cuantificar parasitemia','La gota gruesa evalúa anticuerpos y el frotis delgado determina si el parásito es viable'],
    'hard-falciparum-smear-01':['Eritrocitos de tamaño generalmente normal, con anillos delicados y posibilidad de más de un parásito por eritrocito','Eritrocitos aumentados con puntos de Schüffner y formas ameboides predominantes','Eritrocitos de tamaño reducido con trofozoítos en banda como rasgo típico','Eritrocitos normales con esquizontes en roseta como hallazgo predominante'],
    'hard-malaria-repeat-01':['Repetir los frotis cada 12–24 horas hasta completar tres series','Repetir una sola vez después de 48 horas y descartar si vuelve a ser negativo','Solicitar únicamente serología y considerar descartada la infección aguda','Esperar una semana antes de repetir el examen microscópico'],
    'hard-malaria-gametocyte-01':['Son formas sexuales que pueden persistir y ser ingeridas por el mosquito; no son la fase asexual responsable de los síntomas','Son formas asexuales que invaden eritrocitos y explican la mayor parte de las manifestaciones clínicas','Son formas hepáticas que pueden permanecer latentes y causar recaídas','Son formas sexuales que se desarrollan únicamente después de ingresar al mosquito'],
    'hard-pvivax-hypnozoite-01':['Hipnozoítos latentes en el hígado que pueden reactivarse e invadir eritrocitos','Persistencia de gametocitos maduros en sangre periférica durante años','Recrudescencia por formas asexuales que nunca fueron eliminadas del torrente sanguíneo','Reinfección por esporozoítos inoculados por un nuevo mosquito'],
    'hard-giardia-dfa-01':['Inmunofluorescencia directa (DFA) en materia fecal','Inmunoensayo enzimático (EIA) de antígeno en materia fecal','PCR de una muestra fecal concentrada','Microscopía con tinción tricrómica de materia fecal'],
    'hard-giardia-sampling-01':['La eliminación de quistes puede variar entre muestras y el muestreo seriado mejora la recuperación diagnóstica','La sensibilidad de la microscopía depende de observar un trofozoíto en cada muestra recolectada','Los quistes solo se eliminan después de varios días consecutivos de infección','Las muestras seriadas permiten distinguir Giardia de otros flagelados solo por serología'],
    'hard-leish-stage-01':['Amastigotes dentro de células del sistema fagocítico mononuclear','Promastigotes flagelados libres como forma tisular predominante','Promastigotes que permanecen en el tejido humano sin transformarse','Epimastigotes como forma intracelular habitual de los macrófagos'],
    'hard-leish-differential-01':['La morfología no diferencia por sí sola Leishmania de Trypanosoma cruzi; puede requerirse otra técnica','La presencia de cinetoplasto permite distinguir de forma definitiva ambos géneros','El tamaño del amastigote permite identificar de forma definitiva la especie de Leishmania','La tinción de Giemsa diferencia siempre las dos especies sin pruebas adicionales'],
    'hard-entamoeba-caveat-01':['Es un hallazgo clásicamente asociado, pero no distingue de manera infalible E. histolytica de E. dispar','Su ausencia descarta E. histolytica en cualquier muestra intestinal','Su presencia excluye E. dispar y confirma por sí sola la especie','Es un hallazgo característico de E. coli y no se observa en E. histolytica'],
    'hard-asper-galactomannan-01':['Un polisacárido de la pared celular de Aspergillus','Un componente de pared fúngica detectado por β-D-glucano','ADN de Aspergillus amplificado por PCR','Anticuerpos específicos del hospedador contra Aspergillus'],
    'hard-candida-culture-01':['Puede reflejar colonización y no demostrar por sí solo que Candida cause los síntomas','En una muestra mucosa demuestra siempre candidiasis invasiva','La cantidad de colonias identifica por sí sola la especie y su sensibilidad','Un cultivo positivo descarta que Candida forme parte de la microbiota'],
    'hard-influenza-shift-01':['Intercambio o reasortamiento de segmentos genómicos entre virus compatibles que coinfectan una célula','Acumulación de mutaciones puntuales en HA y NA durante la replicación','Recombinación de un fragmento dentro de un único segmento sin intercambio entre virus','Selección de una variante con cambios menores en una sola proteína de superficie'],
    'hard-influenza-rna-01':['Que todo el material detectado provenga necesariamente de virus viable con replicación activa','Que se detectó ácido nucleico viral en la muestra analizada','Que el resultado molecular deba interpretarse junto con el contexto clínico','Que una señal molecular positiva pueda corresponder a material viral no viable'],
    'hard-malaria-falciparum-01':['Esporozoitos infectan hígado; luego merozoitos pasan a eritrocitos y las formas asexuales se multiplican en sangre','Merozoitos infectan primero el hígado; luego esporozoitos invaden eritrocitos','Los gametocitos se multiplican en hepatocitos y liberan merozoitos a sangre','Los esporozoitos completan el ciclo sexual en eritrocitos antes de llegar al hígado'],
    'hard-asper-interpretation-01':['Los hallazgos apoyan la evaluación, pero deben integrarse con cultivo, histopatología y contexto clínico','La combinación determina siempre la especie y confirma enfermedad invasiva por sí sola','Un galactomanano negativo excluye aspergilosis invasiva en cualquier contexto','La morfología tisular diferencia de forma definitiva Aspergillus de todos los mohos'],
    'hard-blood-smear-quant-01':['Identificar la especie y estimar el porcentaje de eritrocitos parasitados','Examinar un mayor volumen de sangre para aumentar la sensibilidad de detección','Detectar antígenos del parásito sin necesidad de evaluar su morfología','Medir anticuerpos para saber si hubo exposición previa al parásito'],
    'hard-giardia-stages-01':['La excistación en intestino delgado libera trofozoítos, que se multiplican y luego pueden enquistarse durante el tránsito intestinal','Los quistes liberan trofozoítos en el estómago, que migran al hígado y luego se enquistan en sangre','Los trofozoítos son la forma infectante ingerida y forman ooquistes en el intestino delgado','Los quistes liberan merozoítos que invaden eritrocitos antes de regresar al intestino']
  };

  const EVOLUTION_STRATEGIES = [
    { id:'homeostasis', name:'Homeostasis tisular', role:'SUPERVIVENCIA', icon:'✚', color:'#63e6bd', desc:'Aguantá el frente y aprovechá la fagocitosis.', basics:[
      {name:'Membrana robusta',desc:'+32 de vida máxima y actual; el progenitor hematopoyético gana volumen.',apply:r=>{r.stats.maxHealth+=32;r.stats.health=Math.min(r.stats.maxHealth,r.stats.health+32);}},
      {name:'Fagocitosis eficaz',requires:'phagocytosis',desc:'+18% de radio de captura.',apply:r=>{r.stats.phagoRadius*=1.18;}},
      {name:'Reserva celular',desc:'Reduce 3,5% el daño recibido.',apply:r=>{r.stats.defenseLevel++;}},
      {name:'Asimilación reparadora',requires:'phagocytosis',desc:'+2 de curación instantánea por fagocitosis.',apply:r=>{r.stats.phagoHeal+=2;}},
      {name:'Ritmo fagocítico',requires:'phagocytosis',desc:'La fagocitosis se activa 8% más seguido.',apply:r=>{r.stats.phagoInterval=Math.max(GAME_BALANCE.LIMITS.minimumPhagocytosisIntervalMs,r.stats.phagoInterval*.92);}}
    ], advanced:[
      {name:'Fagocitosis expansiva',requires:'phagocytosis',desc:'Permite englobar patógenos grandes (brutos y élite) y +18% de radio.',apply:r=>{r.stats.phagoMaxTier=Math.max(r.stats.phagoMaxTier,PHAGO_LARGE_TIER);r.stats.phagoRadius*=1.18;}},
      {name:'Respuesta reparadora',requires:['phagocytosis','polarization'],desc:'La curación recibida aumenta 30%.',apply:r=>{r.stats.healingReceivedMultiplier*=1.30;}},
      {name:'Barrera reforzada',desc:'Reduce 7% adicional el daño recibido (máximo total 28%).',apply:r=>{r.stats.defenseLevel+=2;}},
      {name:'Devorador de patógenos',requires:'phagocytosis',desc:'La fagocitosis es 18% más rápida y restaura +5 de vida.',apply:r=>{r.stats.phagoInterval=Math.max(GAME_BALANCE.LIMITS.minimumPhagocytosisIntervalMs,r.stats.phagoInterval*.82);r.stats.phagoHeal+=5;}}
    ]},
    { id:'cytotoxicity', name:'Citotoxicidad', role:'CITOTOXICIDAD', icon:'✹', color:'#ffbd52', desc:'Convertí cada descarga en una salva más potente.', basics:[
      {name:'Gránulos densos',desc:'+30% de daño; los proyectiles crecen y cambian de color.',apply:r=>{r.stats.attackDamage*=1.30;r.stats.granuleLevel++;}},
      {name:'Lisis focal',desc:'+15% de daño de desgranulación.',apply:r=>{r.stats.attackDamage*=1.15;r.stats.granuleLevel++;}},
      {name:'Impulso de eyección',desc:'+8% de velocidad de los gránulos.',apply:r=>{r.stats.projectileSpeed*=1.08;r.stats.granuleLevel++;}},
      {name:'Lisis concentrada',desc:'+15% de daño.',apply:r=>{r.stats.attackDamage*=1.15;r.stats.granuleLevel++;}},
      {name:'Gránulos reforzados',desc:'+9% de daño de desgranulación.',apply:r=>{r.stats.attackDamage*=1.09;r.stats.granuleLevel++;}}
    ], advanced:[
      {name:'Salva alveolar',desc:'+2 gránulos por disparo; la salva se abre en abanico.',apply:r=>{r.stats.projectileCount=Math.min(10,r.stats.projectileCount+2);r.stats.granuleLevel++;}},
      {name:'Membrana perforante',desc:'Cada gránulo atraviesa un patógeno adicional.',apply:r=>{r.stats.projectilePierce=Math.min(8,r.stats.projectilePierce+1);}},
      {name:'Lisis en cadena',desc:'Las bajas explotan con más radio y daño.',apply:r=>{r.stats.blastRadius+=28;r.stats.blastDamage+=11;}},
      {name:'Descarga hipertrófica',desc:'+2 proyectiles y gránulos de aspecto más intenso.',apply:r=>{r.stats.projectileCount=Math.min(10,r.stats.projectileCount+2);r.stats.granuleLevel+=2;}}
    ]},
    { id:'chemotaxis', name:'Quimiotaxis', role:'AGILIDAD', icon:'➤', color:'#80caff', desc:'Reposicionate, reuní recursos y extendé las NETosis.', basics:[
      {name:'Gradiente quimiotáctico',desc:'+15% de velocidad; estelas más visibles.',apply:r=>{r.stats.moveSpeed*=1.15;r.stats.agilityLevel++;}},
      {name:'Rastreo celular',desc:'+32 al radio de recolección de ADN/ARN.',apply:r=>{r.stats.xpPickupRadius+=32;}},
      {name:'NETosis precisa',requires:'netosis',desc:'+15% de radio de red.',apply:r=>{r.stats.netRadius*=1.15;r.stats.agilityLevel++;}},
      {name:'Despliegue rápido',requires:'netosis',desc:'La NETosis se prepara 7% más rápido.',apply:r=>{r.stats.netCooldown=Math.max(GAME_BALANCE.LIMITS.minimumNetCooldownMs,r.stats.netCooldown*.93);}},
      {name:'Pulso extracelular',requires:'netosis',desc:'+1 de daño por pulso de NETosis.',apply:r=>{r.stats.netDamage+=1;}}
    ], advanced:[
      {name:'Redes simultáneas',requires:'netosis',desc:'+1 NETosis auxiliar simultánea.',apply:r=>{r.stats.maxNetHelpers=Math.min(GAME_BALANCE.LIMITS.maximumNetHelpers,r.stats.maxNetHelpers+1);}},
      {name:'Tormenta de NETosis',requires:'netosis',desc:'La red aparece más seguido y cubre un área mayor.',apply:r=>{r.stats.netCooldown=Math.max(GAME_BALANCE.LIMITS.minimumNetCooldownMs,r.stats.netCooldown*.82);r.stats.netRadius*=1.22;}},
      {name:'Quimiotaxis voraz',desc:'+55 al radio de recolección y +10% de velocidad.',apply:r=>{r.stats.xpPickupRadius+=55;r.stats.moveSpeed*=1.10;r.stats.agilityLevel++;}},
      {name:'Malla citotóxica',requires:'netosis',desc:'+35% de daño y +25% de duración de NETosis.',apply:r=>{r.stats.netDamage*=1.35;r.stats.netDuration*=1.25;r.stats.netTickInterval=Math.max(230,r.stats.netTickInterval*.88);}}
    ]}
  ];

  const fmtTime = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
  const GAME_BALANCE = InmuneGameBalance;
  const LAB_ACTIONS = InmuneLabActions;
  // Catálogo de agentes por núcleo y sus fichas validadas (src/data). Si no cargaron, el juego sigue con las
  // morfologías genéricas de antes.
  const AGENTES_DATA = globalThis.InmuneAgentes || null;
  const FICHAS_DATA = globalThis.InmuneFichas || null;
  const MODOS_API = globalThis.InmuneModos || null;
  const GAME_VERSION = '3.9.1';
  // Arte propio de los jefes de núcleo (assets/boss_*.webp, recortados de docs/arte/jefes-nucleo-3x3.png).
  const BOSS_ART = {
    'escherichia-coli':'boss_stec', 'mycobacterium-tuberculosis':'boss_granuloma', 'neisseria-meningitidis':'boss_meningococo',
    'vih':'boss_vih', 'toxoplasma-gondii':'boss_toxoplasma', 'plasmodium':'boss_plasmodium',
    'echinococcus-granulosus':'boss_hidatidico', 'clostridium-perfringens':'boss_perfringens', 'pneumocystis-jirovecii':'boss_pneumocystis'
  };
  // Mecánica propia de cada jefe de núcleo (implementadas en updateBossMechanic). firstMs: primer uso tras aparecer.
  const BOSS_MECHANICS = {
    'escherichia-coli':{color:'#ffb36b'},
    'mycobacterium-tuberculosis':{color:'#d9d2ff',ring:{color:0xb9a8e0,fill:0.03},firstMs:5000},
    'neisseria-meningitidis':{color:'#9fdcff',ring:{color:0x6fd2ff,fill:0.05}},
    'vih':{color:'#ff9ec4',firstMs:5000},
    'toxoplasma-gondii':{color:'#ffe2a0'},
    'plasmodium':{color:'#ff8fa0',firstMs:5000},
    'echinococcus-granulosus':{color:'#ffe7b5',firstMs:3500},
    'clostridium-perfringens':{color:'#e6dcff',firstMs:1500},
    'pneumocystis-jirovecii':{color:'#cfe6ff',ring:{color:0x9fc8ff,radius:230,fill:0.07,stroke:2,depth:16}}
  };
  const SPECIES_TEXTURE_SIZE = 256;
  const randomItem = (rng, list) => rng.pick(list);
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const dist2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
  const wrapAngle = a => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
  const clampAngle = (a, max) => clamp(a, -max, max);
  const easeOutBack = t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
  function pointSegmentDistanceSq(px,py,ax,ay,bx,by) {
    const vx=bx-ax,vy=by-ay,wx=px-ax,wy=py-ay,len=vx*vx+vy*vy;
    const t=len?clamp((wx*vx+wy*vy)/len,0,1):0;
    const dx=px-(ax+t*vx),dy=py-(ay+t*vy);
    return dx*dx+dy*dy;
  }

  class Arena extends Phaser.Scene {
    constructor() { super({ key: 'Arena' }); }

    sharpText(x,y,text,style) { return this.add.text(x,y,text,style).setResolution(2); }

    preload() {
      // Todos los assets son WebP (sprites calidad 90 con alfa al 100 %, tejidos calidad 95, resolución original):
      // ~2,5 MB en vez de ~15,6 MB en PNG. Para regenerarlos ver assets/README.md.
      for (const key of MICROBE_TEXTURES) this.load.image(key, `assets/${key}.webp`);
      for (const key of ['helminth_nematode_head','helminth_tapeworm_scolex']) this.load.image(key, `assets/${key}.webp`);
      for (const boss of BOSS_MORPHOLOGIES) this.load.image(boss.texture, `assets/${boss.texture}.webp`);
      this.load.image('boss_spore','assets/boss_spore.webp');
      for (const spec of this.bossSpecs||[]) if (spec.art) this.load.image(spec.art, `assets/${spec.art}.webp`);
      for (const key of ['focus_viral','focus_bacterial','focus_fungal','focus_parasitic']) this.load.image(key, `assets/${key}.webp`);
      const tissueKey=TISSUE_TEXTURES[this.map.id]||'tissue_vascular';
      this.load.image(tissueKey,`assets/${tissueKey}.webp`);
      this.load.image('phago_mark_1','assets/skills/phagocytosis_frame1.webp');
      this.load.image('phago_mark_2','assets/skills/phagocytosis_frame2.webp');
    }

    init(data) {
      this.settings = data && (data.modo || data.infection) ? { ...data } : { modo:'sandbox', infectionDifficulty:'internado', evolutionDifficulty:'estudiante' };
      this.runtime=data?.runtime||InmuneRuntime.createRuntime();this.rng=this.runtime.rng;this.clock=this.runtime.clock;this.storage=this.runtime.storage;
      this.ui=data?.uiBridge||{emit:()=>{},setActions:()=>{},clearActions:()=>{},isHidden:()=>false,getDeviceProfile:()=>({cores:4,memory:0,coarse:false})};
      const device=this.ui.getDeviceProfile(),cores=Number(device.cores||4),memory=Number(device.memory||0),coarse=!!device.coarse;
      this.lowPerformanceDevice=cores<=4||(memory>0&&memory<=4);
      this.maxEnemyCount=this.settings.debugMode?180:(coarse?(this.lowPerformanceDevice?42:52):(this.lowPerformanceDevice?52:68));
      this.maxXpDrops=this.lowPerformanceDevice?64:96;
      this.maxFloatingTexts=this.lowPerformanceDevice?14:24;
      this.settings.infection = this.settings.infection || 'bacteriana';
      this.settings.infectionDifficulty = INFECTION_DIFFICULTIES[this.settings.infectionDifficulty] ? this.settings.infectionDifficulty : 'internado';
      this.settings.evolutionDifficulty = EVOLUTION_DIFFICULTIES[this.settings.evolutionDifficulty] ? this.settings.evolutionDifficulty : 'estudiante';
      this.debugMode=!!this.settings.debugMode;
      // Modos v3.8 (Sandbox infinito / Foco por núcleo). Sin `modo` (arnés de tests viejo) queda el perfil de
      // infección clásico de INFECTIONS.
      this.modo=this.settings.modo&&MODOS_API?MODOS_API.crearModo({modo:this.settings.modo,nucleo:this.settings.nucleo},AGENTES_DATA):null;
      if(this.modo){
        this.theme={label:this.modo.etiqueta,weights:this.modo.pesos,maps:this.modo.mapas.map(id=>({id,label:(TISSUE_VISUALS[id]||TISSUE_VISUALS.endothelium).label}))};
      }else this.theme = INFECTIONS[this.settings.infection] || INFECTIONS.bacteriana;
      this.infectionDiff = INFECTION_DIFFICULTIES[this.settings.infectionDifficulty];
      this.evolutionDiff = {id:this.settings.evolutionDifficulty,...EVOLUTION_DIFFICULTIES[this.settings.evolutionDifficulty]};
      this.map = randomItem(this.rng,this.theme.maps);
      this.tissueVisual = TISSUE_VISUALS[this.map.id] || TISSUE_VISUALS.endothelium;
      if(this.modo)this.theme.accent=this.tissueVisual.accent;
      this.bossSpecs=this.buildBossSequence();
    }

    create() {
      this.gameEnded = false; this.questionPaused = false; this.manualPaused = false; this.time.paused=false; this.pendingQuestionOutcome = null;
      this.elapsed = 0; this.kills = 0; this.correctAnswers = 0; this.questionCount = 0;
      this.damageTotal=0;this.bossKills=0;this.fociHealed=0;this.upgradeHistory=[];this.floatingTexts=[];this.activeEnemyCount=0;
      this.xp = 0; this.xpNeed = 150; this.spawnClock = 0; this.attackClock = 0; this.xpDrops=[]; this.bossClock=240000; this.bossCount=0; this.bossSequenceIndex=0; this.biofilmZones=[]; this.multiResistance=false; this.resistanceBossClock=0; this.evolutionChoiceCount=0; this.defeatedBossIds=new Set();
      this.phagoClock = 0; this.netClock = 8000; this.invulnerable = 0; this.colonyShelter=false; this.waveExtra = 0; this.focusBreaches=0; this.directorPressure=0;
      this.hudClock = 0; this.repulsionClock = 0; this.joystickClock = 0; this.colonyClock=38000; this.colonySerial=0; this.colonies=[]; this.colonyProgress=0; this.swarmVolley=0;
      this.waveClock=65000; this.burstDepth=0; this.toastQueue=[]; this.playerTrailClock=0;
      this.evolutionCounts={homeostasis:0,cytotoxicity:0,chemotaxis:0};
      this.activeSkills=new Set(['granules']);this.skillLevels={granules:1};this.skillEvolution={};this.skillTimers={};this.bMinions=[];this.macrophages=[];this.skillProjectiles=[];this.differentiationSpecies=null;this.differentiationStreak=0;this.patternBonus=0;this.minionMode='M1';this.debugSpawnLimit=140;
      this.lastStrategy=null;
      this.speciesLog={};this.speciesOrder=[];
      this.phagoHintsLeft=3;this.lastPhagoHintAt=-99;this.pseudopods=null;this.phagoEngulf=null;this.pseudopodLast=null;this.playerSlow=1;this.auraSlowUntil=-1;this.forcedSpawnAgente=null;
      this.progressionMilestone = 0;
      this.enemies = []; this.playerBullets = []; this.enemyProjectiles = []; this.helpers = []; this.nets = [];this.activeEnemyCount=0;
      this.usedQuestionIds = new Set(); this.currentQuestion = null; this.currentUpgrades = []; this.questionTopicCounts={}; this.lastQuestionTopic=null;
      this.stats = { health:100, maxHealth:100, moveSpeed:190, attackDamage:21, attackInterval:520, attackRange:260, projectileSpeed:470, projectileCount:1, projectilePierce:0, blastRadius:0, blastDamage:0, swarmLevel:0, granuleLevel:0, defenseLevel:0, agilityLevel:0, dodgeWindow:620, phagoRadius:50, phagoInterval:800, phagoHeal:0, healingReceivedMultiplier:1, phagoMaxTier:0, xpPickupRadius:82, netCooldown:10800, netRadius:88, netDuration:7600, netDamage:5.5, netTickInterval:430, maxNetHelpers:2, netHelperDuration:4400, antibodyDamage:10, antibodyInterval:1900, antibodyCount:2, regulationDamage:4, regulationInterval:15000, cytokineDamage:6, cytokineInterval:5400, xpMultiplier:1 };
      this.createXpTexture(); this.createBackdrop(); this.createPlayer(); this.createCamera(); this.createHud(); this.createControls(); this.setupHudCamera();
      this.updateHud();
      this.events.once('shutdown', () => this.destroyTransientObjects());
      this.ui.setActions({
        answerQuestion: index => this.answerQuestion(index),
        continueAfterQuestion: () => this.continueAfterQuestion(),
        chooseUpgrade: id => this.chooseUpgrade(id),
        chooseFocusEvolution: id => this.chooseFocusEvolution(id),
        pauseGame: () => this.pauseGame(),
        resumeGame: () => this.resumeGame(),
        debug: action => this.debugAction(action)
      });
      this.emit('is:run-start', { modo:this.modo?.corto||null, infection:this.theme.label, map:this.map.label, infectionDifficulty:this.infectionDiff.label, evolutionDifficulty:this.evolutionDiff.label, multiplier:this.infectionDiff.multiplier*this.evolutionDiff.multiplier, debug:this.debugMode });
    }

    emit(name, detail) { this.ui.emit(name,detail); }

    isInsideArena(x, y, padding = 0) { return Math.hypot(x - CENTER, y - CENTER) <= ARENA_RADIUS - padding; }
    randomPointInArena(margin = 50) {
      const a = this.rng.float(0,Math.PI*2), r = Math.sqrt(this.rng.next()) * (ARENA_RADIUS - margin);
      return { x:CENTER + Math.cos(a) * r, y:CENTER + Math.sin(a) * r };
    }

    createBackdrop() {
      // One large tissue illustration fills the arena; no repeated tile edges cross the play field.
      this.add.rectangle(CENTER, CENTER, WORLD, WORLD, this.tissueVisual.bg).setDepth(-3);
      const textureKey = TISSUE_TEXTURES[this.map.id] || 'tissue_vascular';
      const tissue = this.add.image(CENTER, CENTER, textureKey)
        .setDisplaySize(ARENA_RADIUS * 2, ARENA_RADIUS * 2).setDepth(0);
      const maskShape = this.make.graphics({ x: 0, y: 0, add: false });
      maskShape.fillStyle(0xffffff, 1); maskShape.fillCircle(CENTER, CENTER, ARENA_RADIUS - 3);
      tissue.setMask(maskShape.createGeometryMask());
      this.tissueMaskShape = maskShape;

      // Small darkening overlay preserves the bright tissue art while keeping silhouettes and attacks readable.
      this.add.circle(CENTER, CENTER, ARENA_RADIUS - 2, 0x11132d, 0.12).setDepth(1);
      this.add.circle(CENTER, CENTER, ARENA_RADIUS - 8, 0x000000, 0).setStrokeStyle(15, 0x27123f, 0.9).setDepth(2);
      this.add.circle(CENTER, CENTER, ARENA_RADIUS - 17, 0x000000, 0).setStrokeStyle(4, this.tissueVisual.accent, 0.92).setDepth(3);
      this.add.circle(CENTER, CENTER, ARENA_RADIUS - 29, 0x000000, 0).setStrokeStyle(2, 0xffffff, 0.22).setDepth(3);
      this.createAmbientLayers();
    }

    // Parallax: capas que se desplazan a distinta velocidad que la cámara (y fluyen solas) para dar
    // profundidad al tejido. Son tileSprites del tamaño de la pantalla con texturas generadas una sola vez,
    // así cuestan un solo dibujo por capa. En equipos de gama baja va solo la capa lejana.
    makeAmbientTexture(key,size,blobs,rMin,rMax,alphaMax,rng){
      if(this.textures.exists(key))return;
      const tex=this.textures.createCanvas(key,size,size),ctx=tex.context;
      for(let i=0;i<blobs;i++){
        const x=rng.float(0,size),y=rng.float(0,size),r=rng.float(rMin,rMax),a=rng.float(alphaMax*0.4,alphaMax);
        // Se dibuja también envuelto en los bordes para que el mosaico no tenga costuras.
        for(const ox of [-size,0,size])for(const oy of [-size,0,size]){
          const g=ctx.createRadialGradient(x+ox,y+oy,0,x+ox,y+oy,r);
          g.addColorStop(0,`rgba(255,255,255,${a})`);g.addColorStop(0.55,`rgba(255,255,255,${a*0.45})`);g.addColorStop(1,'rgba(255,255,255,0)');
          ctx.fillStyle=g;ctx.beginPath();ctx.arc(x+ox,y+oy,r,0,Math.PI*2);ctx.fill();
        }
      }
      tex.refresh();
    }

    createAmbientLayers(){
      const rng=this.rng,accent=this.tissueVisual.accent||0x8cf2c9;
      this.makeAmbientTexture('amb_far',512,26,40,120,0.20,rng);
      this.makeAmbientTexture('amb_mid',512,22,10,34,0.34,rng);
      this.makeAmbientTexture('amb_near',256,14,2.5,7,0.85,rng);
      const layer=(key,depth,factor,alpha,drift,tint)=>({obj:this.add.tileSprite(0,0,64,64,key).setOrigin(0.5).setScrollFactor(0).setDepth(depth).setAlpha(alpha).setTint(tint),factor,drift});
      this.ambientLayers=[layer('amb_far',-2,0.35,1,{x:4,y:-2},0x6a5cc4)];
      if(!this.lowPerformanceDevice){
        this.ambientLayers.push(layer('amb_mid',1.5,0.82,0.5,{x:-7,y:5},accent));
        this.ambientLayers.push(layer('amb_near',4,1.28,0.38,{x:10,y:-13},0xd8fff0));
      }
      this.layoutAmbientLayers();
    }

    layoutAmbientLayers(){
      const cam=this.cameras.main;if(!this.ambientLayers||!cam)return;
      for(const l of this.ambientLayers)l.obj.setPosition(cam.width/2,cam.height/2).setSize(cam.width/cam.zoom+8,cam.height/cam.zoom+8);
    }

    updateAmbientLayers(){
      if(!this.ambientLayers)return;
      const cam=this.cameras.main,t=this.elapsed;
      for(const l of this.ambientLayers){l.obj.tilePositionX=cam.scrollX*l.factor+t*l.drift.x;l.obj.tilePositionY=cam.scrollY*l.factor+t*l.drift.y;}
    }

    makeCell(x, y, scale = 1, small = false) {
      // Neutrophil icon: flat saturated cell body, thick dark outline, protrusions and blue lobed nucleus.
      const c = this.add.container(x, y).setDepth(25);
      const g = this.add.graphics();
      const r = small ? 10 : 21;
      const dark = 0x24113d, membrane = small ? 0xf3449e : 0xf02f93;
      const protrusion = small ? 0xffb52e : 0xffae2c;
      const count = small ? 8 : 11;
      for (let i=0;i<count;i++) {
        const a = i*Math.PI*2/count + 0.12;
        const x1=Math.cos(a)*r*0.72, y1=Math.sin(a)*r*0.72;
        const x2=Math.cos(a)*r*1.24, y2=Math.sin(a)*r*1.24;
        g.lineStyle(small?5:7,dark,1); g.lineBetween(x1,y1,x2,y2);
        g.lineStyle(small?3:4,protrusion,1); g.lineBetween(x1,y1,x2,y2);
        g.fillStyle(protrusion,1); g.fillCircle(x2,y2,small?2.2:3.1);
      }
      g.fillStyle(dark,1); g.fillCircle(0,0,r+4);
      g.fillStyle(membrane,1); g.fillCircle(0,0,r+1);
      g.fillStyle(small?0xff709f:0xff5da5,1); g.fillCircle(-1,0,r*0.82);
      g.lineStyle(small?2:3,0xffb5d4,0.9); g.strokeCircle(0,0,r*0.88);
      // Bilobed/segmented nucleus, simplified but recognizably neutrophilic.
      g.fillStyle(0x183e94,1); g.fillEllipse(-3,1,r*1.14,r*0.78);
      g.fillStyle(0x37b9f4,1); g.fillEllipse(-7,-2,r*0.55,r*0.47);
      g.fillStyle(0x75ddff,1); g.fillEllipse(3,-4,r*0.49,r*0.48);
      g.fillStyle(0x37b9f4,1); g.fillEllipse(5,6,r*0.48,r*0.42);
      g.fillStyle(0xb7f3ff,0.95); g.fillCircle(-9,-5,small?2:3);
      g.fillStyle(0xffd7e8,0.95); g.fillCircle(-r*0.42,-r*0.49,small?1.8:2.6);
      c.add(g); c.setScale(scale); return c;
    }

    makePhagoMarker(e){
      return this.add.image(e.x,e.y,'phago_mark_1').setDisplaySize(32,32).setDepth(38).setAlpha(0.45).setVisible(false);
    }

    makeImmuneSprite(kind,x,y,scale=1){
      const c=this.add.container(x,y).setDepth(38),g=this.add.graphics();
      const ink=0x24113d;
      if(kind==='antibody'){
        g.lineStyle(7,ink,1);g.beginPath();g.moveTo(0,13);g.lineTo(0,3);g.lineTo(-8,-7);g.moveTo(0,3);g.lineTo(8,-7);g.strokePath();g.lineStyle(3.5,0xffdf81,1);g.beginPath();g.moveTo(0,12);g.lineTo(0,3);g.lineTo(-8,-7);g.moveTo(0,3);g.lineTo(8,-7);g.strokePath();g.fillStyle(0xfff5cf,1);g.fillCircle(-8,-7,2.8);g.fillCircle(8,-7,2.8);
      }else if(kind==='complement'){
        g.fillStyle(ink,1);g.fillEllipse(0,0,23,19);g.fillStyle(0x63d9ca,1);g.fillEllipse(0,0,18,14);g.fillStyle(0xa4f0dc,1);g.fillEllipse(-3,-2,8,5);g.fillStyle(0x347f91,1);g.fillCircle(4,2,3);
      }else if(kind==='macrophage'){
        g.fillStyle(ink,1);g.fillEllipse(0,0,29,25);g.fillStyle(0x71c6a0,1);g.fillEllipse(0,0,24,20);
        g.fillStyle(0x375d76,1);g.fillEllipse(2,1,13,9);g.fillStyle(0x8ee9c2,1);g.fillCircle(-6,-5,3);
        for(let i=0;i<5;i++){const a=i*Math.PI*2/5;g.lineStyle(2.5,ink,1);g.lineBetween(Math.cos(a)*10,Math.sin(a)*8,Math.cos(a)*16,Math.sin(a)*13);}
      }else{
        g.fillStyle(ink,1);g.fillCircle(0,0,11);g.fillStyle(kind==='bcell'?0xffd875:0x8bd7ff,1);g.fillCircle(0,0,8);g.fillStyle(0x7354a8,1);g.fillEllipse(1,1,7,5);g.fillStyle(0xffffff,.95);g.fillCircle(-3,-4,2);
      }
      c.add(g);c.setScale(scale);if(kind==='complement')this.tweens.add({targets:c,alpha:0,scale:1.25,duration:420,onComplete:()=>c.destroy()});return c;
    }

    createPlayer() {
      this.player = this.makeCell(CENTER, CENTER, 1, false).setDepth(40);
      this.playerRadius = 27;
      this.playerHalo = this.add.circle(CENTER, CENTER, 35, this.theme.accent, 0.045).setStrokeStyle(2, this.theme.accent, 0.30).setDepth(24);
      this.phagoAura = this.add.circle(CENTER, CENTER, this.stats.phagoRadius + 18, 0x74ffd0, 0.025).setStrokeStyle(2, 0x9bffdc, 0.38).setDepth(27).setVisible(false);
      this.phagoTendrils=this.add.graphics().setDepth(38);
      this.xpMagnetAura = this.add.circle(CENTER,CENTER,this.stats.xpPickupRadius,0x80caff,0.025).setStrokeStyle(1.5,0x9bdcff,0.24).setDepth(25).setVisible(false);
      this.playerOutline = this.add.circle(CENTER, CENTER, 30, 0x000000, 0).setStrokeStyle(2.6, 0xa8ffe0, 0.95).setDepth(39);
      this.playerOutlineTween = null;
      this.playerHealthBar = this.add.container(this.player.x, this.player.y).setDepth(80);
      this.playerHealthBarGraphic = this.add.graphics();
      this.playerHealthBar.add(this.playerHealthBarGraphic);
      this.playerHurtGlow = this.add.circle(CENTER, CENTER, 35, 0xff5d7c, 0.14).setStrokeStyle(3, 0xff718c, 0.85).setDepth(42).setAlpha(0);
    }

    createCamera() {
      const cam = this.cameras.main;
      cam.setBounds(0, 0, WORLD, WORLD);
      cam.startFollow(this.player, true, 1, 1);
      cam.setZoom(this.baseZoom()*RENDER_RES);
      cam.setRoundPixels(false);
      // El ScaleManager es global (sobrevive a la escena): el listener se saca en 'shutdown'
      // (destroyTransientObjects); si no, cada "Jugar otra vez" sumaba uno que retenía la escena anterior.
      this.onScaleResize = gameSize => {
        const pw = Math.round(gameSize.width || this.scale.gameSize.width), ph = Math.round(gameSize.height || this.scale.gameSize.height);
        W = Math.max(280, Math.round(pw / RENDER_RES)); H = Math.max(480, Math.round(ph / RENDER_RES));
        cam.setViewport(0, 0, pw, ph);
        cam.setZoom(this.baseZoom()*RENDER_RES);
        if (this.hudCam) this.hudCam.setViewport(0, 0, pw, ph).setZoom(RENDER_RES);
        this.layoutAmbientLayers();
        this.layoutHud();
      };
      this.scale.on(Phaser.Scale.Events.RESIZE, this.onScaleResize);
      this.layoutAmbientLayers();
    }

    // Zoom de juego en píxeles CSS: en celular se aleja un poco para ver más arena alrededor.
    baseZoom() { return mobileViewport() ? 0.90 : 1; }

    // El HUD va en su propia cámara con origen arriba a la izquierda y zoom RENDER_RES: así sus coordenadas
    // siguen siendo píxeles CSS (W×H) aunque el canvas tenga más resolución. La cámara principal no lo dibuja
    // y la de HUD ignora todo lo demás, incluidos los objetos que se crean después.
    setupHudCamera() {
      const hud = [this.hudPanel,this.hudTitle,this.hudTime,this.hudScore,this.focusArrow,this.focusArrowLabel,this.bossArrow,this.bossArrowLabel,this.hudBuild,this.hudBarGraphics,this.hudToast,this.joyGraphic].filter(Boolean);
      const main = this.cameras.main;
      this.hudCam = this.cameras.add(0, 0, main.width, main.height, false, 'hud').setOrigin(0, 0).setZoom(RENDER_RES).setScroll(0, 0);
      main.ignore(hud);
      const hudSet = new Set(hud);
      this.hudCam.ignore(this.children.list.filter(o => !hudSet.has(o)));
      this.onAddedToScene = go => { if (!hudSet.has(go)) this.hudCam.ignore(go); };
      this.events.on('addedtoscene', this.onAddedToScene);
    }

    layoutHud() {
      if (!this.hudPanel?.active) return;
      const panelWidth = Math.max(250,Math.min(300,W-20));
      this.hudPanel.clear();
      this.hudPanel.fillStyle(0x071321, 0.84); this.hudPanel.fillRoundedRect(10, 9, panelWidth, 74, 12);
      this.hudPanel.lineStyle(1, this.theme.accent, 0.30); this.hudPanel.strokeRoundedRect(10, 9, panelWidth, 74, 12);
      this.hudTime.setPosition(panelWidth - 12, 13);
      this.hudBarWidth=panelWidth-40;
      this.hudToast.setPosition(W / 2, Math.max(100,Math.min(116,H*0.145))).setWordWrapWidth(Math.max(220, W - 30), true);
    }

    createHud() {
      this.hudPanel = this.add.graphics().setDepth(1000).setScrollFactor(0);
      this.hudPanel.fillStyle(0x071321, 0.84); this.hudPanel.fillRoundedRect(10, 9, 300, 74, 12);
      this.hudPanel.lineStyle(1, this.theme.accent, 0.30); this.hudPanel.strokeRoundedRect(10, 9, 300, 74, 12);
      this.hudTitle = this.sharpText(20, 15, 'PROGENITOR', { fontFamily:'system-ui, sans-serif', fontSize:'9px', fontStyle:'bold', color:'#9df2ce', letterSpacing:1.2 }).setDepth(1001).setScrollFactor(0);
      this.hudTime = this.sharpText(298, 13, '0:00', { fontFamily:'system-ui, sans-serif', fontSize:'15px', fontStyle:'bold', color:'#f3f7ff' }).setOrigin(1, 0).setDepth(1001).setScrollFactor(0);
      this.hudScore = this.sharpText(20, 33, 'PUNTOS 0', { fontFamily:'system-ui, sans-serif', fontSize:'11px', fontStyle:'bold', color:'#f3f7ff' }).setDepth(1001).setScrollFactor(0);
      this.focusArrow = this.add.graphics().setDepth(1190).setScrollFactor(0);
      this.focusArrowLabel = this.sharpText(0,0,'',{fontFamily:'system-ui, sans-serif',fontSize:'11px',fontStyle:'bold',color:'#d7fff0',backgroundColor:'#071321f2',padding:{x:7,y:4},stroke:'#06111c',strokeThickness:2}).setOrigin(0.5).setDepth(1191).setScrollFactor(0).setVisible(false);
      this.bossArrow = this.add.graphics().setDepth(1192).setScrollFactor(0);
      this.bossArrowLabel = this.sharpText(0,0,'',{fontFamily:'system-ui, sans-serif',fontSize:'11px',fontStyle:'bold',color:'#fff0c5',backgroundColor:'#29101bf5',padding:{x:7,y:4},stroke:'#160b16',strokeThickness:2}).setOrigin(0.5).setDepth(1193).setScrollFactor(0).setVisible(false);
      this.hudBuild = this.sharpText(20, 66, 'HOM 0 · CIT 0 · QUI 0', { fontFamily:'system-ui, sans-serif', fontSize:'8px', fontStyle:'bold', color:'#c3d6e9' }).setDepth(1001).setScrollFactor(0);
      this.hudBarGraphics = this.add.graphics().setDepth(1002).setScrollFactor(0);
      this.hudToast = this.sharpText(W / 2, 101, '', { fontFamily:'system-ui, sans-serif', fontSize:'13px', fontStyle:'bold', color:'#e2fff3', align:'center', backgroundColor:'#071321ee', padding:{ x:12, y:6 }, stroke:'#071321', strokeThickness:2 }).setOrigin(0.5).setDepth(1200).setScrollFactor(0).setAlpha(0).setWordWrapWidth(400, true);
      this.toastUntil = 0;
      this.layoutHud();
      this.updateHud();
    }

    createControls() {
      this.keys = this.input.keyboard ? this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT') : {};
      // PC: ESC o P pausan y reanudan.
      if (this.input.keyboard) {
        const togglePause = () => { if (this.manualPaused) this.resumeGame(); else this.pauseGame(); };
        this.input.keyboard.on('keydown-ESC', togglePause);
        this.input.keyboard.on('keydown-P', togglePause);
      }
      // PC: mantener apretado el botón izquierdo mueve la célula hacia el puntero (para trackpad o sin teclado).
      this.mouseSteer = false;
      this.joyActive = false; this.joyPointerId = null; this.joyOrigin = { x:0, y:0 }; this.joyVector = { x:0, y:0 };
      this.joyGraphic = this.add.graphics().setDepth(1200).setScrollFactor(0);
      this.input.on('pointerdown', p => {
        if (this.questionPaused || this.gameEnded || this.joyActive) return;
        const eventType = String(p.event?.type || '');
        const isTouch = p.wasTouch || p.event?.pointerType === 'touch' || eventType.startsWith('touch');
        if (!isTouch) { if (!p.leftButtonDown || p.leftButtonDown()) this.mouseSteer = true; return; }
        this.joyActive = true; this.joyPointerId = p.id; this.joyOrigin = { x:p.x/RENDER_RES, y:p.y/RENDER_RES };
        this.setJoyVector(p.x/RENDER_RES, p.y/RENDER_RES); this.drawJoystick();
      });
      this.input.on('pointermove', p => { if (this.joyActive && p.id === this.joyPointerId) { this.setJoyVector(p.x/RENDER_RES, p.y/RENDER_RES); this.drawJoystick(); } });
      const releaseJoystick = p => {
        if (!p || !p.wasTouch) this.mouseSteer = false;
        if (this.joyActive && (!p || p.id === this.joyPointerId)) {
          this.joyActive = false; this.joyPointerId = null; this.joyVector.x = 0; this.joyVector.y = 0; this.drawJoystick();
        }
      };
      this.input.on('pointerup', releaseJoystick);
      this.input.on('pointerupoutside', releaseJoystick);
      this.input.on('gameout', () => releaseJoystick());
    }

    setJoyVector(x, y) {
      let dx = x - this.joyOrigin.x, dy = y - this.joyOrigin.y; const d = Math.hypot(dx, dy), max = 52;
      if (d > max) { dx = dx / d * max; dy = dy / d * max; }
      this.joyVector.x = dx / max; this.joyVector.y = dy / max;
    }

    drawJoystick() {
      if (!this.joyGraphic || !this.joyGraphic.active) return;
      const g = this.joyGraphic; g.clear();
      if (!this.joyActive) return;
      const x = this.joyOrigin.x, y = this.joyOrigin.y;
      g.fillStyle(0x071321, 0.42); g.fillCircle(x, y, 54);
      g.lineStyle(2, this.theme.accent, 0.74); g.strokeCircle(x, y, 54);
      g.fillStyle(this.theme.accent, 0.35); g.fillCircle(x + this.joyVector.x * 40, y + this.joyVector.y * 40, 22);
      g.lineStyle(1.5, this.theme.accent, 0.7); g.strokeCircle(x + this.joyVector.x * 40, y + this.joyVector.y * 40, 22);
    }

    getScore() {
      // Misma fórmula que el servidor (InmuneModos.calcularPuntaje y la acción guardarPuntaje de la API).
      if(MODOS_API)return MODOS_API.calcularPuntaje({kills:this.kills,segundos:this.elapsed,correctas:this.correctAnswers,dificultadInfeccion:this.settings.infectionDifficulty,dificultadEvolucion:this.evolutionDiff.id});
      const raw = this.kills * 10 + Math.floor(this.elapsed) * 2 + this.correctAnswers * 25;
      return Math.floor(raw * this.infectionDiff.multiplier * this.evolutionDiff.multiplier);
    }

    updateHud() {
      if (!this.hudBarGraphics || !this.stats) return;
      this.hudScore.setText(`PUNTOS ${this.getScore().toLocaleString('es-AR')}`);
      this.hudTime.setText(fmtTime(this.elapsed));
      if(this.hudBuild)this.hudBuild.setText(`HOM ${this.evolutionCounts.homeostasis} · CIT ${this.evolutionCounts.cytotoxicity} · QUI ${this.evolutionCounts.chemotaxis}`);
      const g = this.hudBarGraphics; g.clear();
      const ratio = clamp(this.xp / this.xpNeed, 0, 1),barWidth=this.hudBarWidth||260;
      g.fillStyle(0x243548, 1); g.fillRoundedRect(20, 52, barWidth, 5, 2.5);
      if (ratio > 0) { g.fillStyle(this.theme.accent, 1); g.fillRoundedRect(20, 52, Math.max(4, barWidth * ratio), 5, 2.5); }
      g.lineStyle(1, 0x071321, 0.5); for (let i = 1; i < 10; i++) g.lineBetween(20 + i * (barWidth / 10), 52, 20 + i * (barWidth / 10), 57);
      const healthRatio = clamp(this.stats.health / this.stats.maxHealth, 0, 1);
      const pg = this.playerHealthBarGraphic;
      pg.clear();
      pg.fillStyle(0x24113d, 0.98); pg.fillRoundedRect(-27, -36, 54, 7, 3.5);
      pg.lineStyle(1.5, 0xffd0e4, 0.9); pg.strokeRoundedRect(-27, -36, 54, 7, 3.5);
      pg.fillStyle(healthRatio > 0.45 ? 0x47e9c0 : 0xff477d, 1);
      pg.fillRoundedRect(-25, -34, 50 * healthRatio, 3, 1.5);
    }

    redrawEnemyHealthBar(e) {
      if (!e?.isBoss || !e.healthBarGraphic?.active) return;
      const g = e.healthBarGraphic; g.clear();
      const w = 156;
      const y = -(e.visualSize*0.55)-16;
      const ratio = clamp(e.hp / e.maxHp, 0, 1);
      g.fillStyle(0x24113d, 0.98); g.fillRoundedRect(-w/2, y, w, 8, 4);
      g.lineStyle(1.6, 0xffe2ef, 0.95); g.strokeRoundedRect(-w/2, y, w, 8, 4);
      g.fillStyle(0xffce5a, 1);
      g.fillRoundedRect(-w/2+2, y+2, Math.max(0,(w-4)*ratio), 6, 3);
    }

    showEnemyHealthBar(e) {
      if (!e?.isBoss || !e.healthBar?.active) return;
      e.healthBar.setPosition(e.x, e.y).setAlpha(1);
      this.redrawEnemyHealthBar(e);
      e.healthBarVisibleUntil = Infinity;
    }

    pickEnemyType() {
      const weights = this.theme.weights, roll = this.rng.next(); let sum = 0;
      for (const key of ['bacteria','virus','fungus','parasite']) { sum += weights[key]; if (roll <= sum) return key; }
      return 'bacteria';
    }

    randomSpawnPoint(buffer = 70, maxBuffer = 205) {
      const cam = this.cameras.main;
      const halfDiag = Math.hypot(W / 2, H / 2);
      for (let i = 0; i < 36; i++) {
        const a = this.rng.float(0,Math.PI*2), d = this.rng.integer(Math.ceil(halfDiag + buffer),Math.ceil(halfDiag + maxBuffer));
        const x = this.player.x + Math.cos(a) * d, y = this.player.y + Math.sin(a) * d;
        if (this.isInsideArena(x, y, 60)) return { x, y };
      }
      // Near the edge, spawn safely inside the arena but still outside the current view where possible.
      const a = this.rng.float(0,Math.PI*2);
      let x = this.player.x + Math.cos(a) * (halfDiag + buffer + 50), y = this.player.y + Math.sin(a) * (halfDiag + buffer + 50);
      const r = Math.hypot(x - CENTER, y - CENTER);
      if (r > ARENA_RADIUS - 70) { x = CENTER + (x - CENTER) / r * (ARENA_RADIUS - 70); y = CENTER + (y - CENTER) / r * (ARENA_RADIUS - 70); }
      return { x, y };
    }

    enemyBaseVisualSize(type) {
      return ({ bacteria:88, virus:64, fungus:82, parasite:112 })[type] || 80;
    }

    makeEnemyArt(type, morphology, x, y, size) {
      if (morphology.worm) return this.add.graphics().setDepth(20);
      // Preserve each sprite's aspect ratio; generated sources have varied native dimensions.
      const visual = this.enemyBaseVisualSize(type) * size;
      const source=this.textures.get(morphology.texture).getSourceImage();
      const maxSide=Math.max(source.width||source.naturalWidth,source.height||source.naturalHeight);
      return this.add.image(x, y, morphology.texture).setOrigin(0.5).setDepth(20).setScale(visual/maxSide);
    }

    // Copia de la imagen con alfa binarizado (umbral ~16 %). Sin canvas 2D disponible devuelve la imagen original.
    makeSolidMask(source,width,height){
      const mask=typeof document!=='undefined'?document.createElement('canvas'):null;
      const mctx=mask&&typeof mask.getContext==='function'?mask.getContext('2d',{willReadFrequently:true}):null;
      if(!mctx)return source;
      mask.width=width;mask.height=height;mctx.drawImage(source,0,0,width,height);
      const img=mctx.getImageData(0,0,width,height),d=img.data;
      for(let i=0;i<d.length;i+=4){const on=d[i+3]>40;d[i]=d[i+1]=d[i+2]=255;d[i+3]=on?255:0;}
      mctx.putImageData(img,0,0);
      return mask;
    }

    getEnemyOutlineTexture(textureKey) {
      const key=`enemy-silhouette-${textureKey}`;
      if(this.textures.exists(key))return key;
      const source=this.textures.get(textureKey)?.getSourceImage();
      if(!source)return textureKey;
      const width=source.width||source.naturalWidth||256,height=source.height||source.naturalHeight||256;
      const pad=Math.max(7,Math.ceil(Math.max(width,height)*0.018));
      const texture=this.textures.createCanvas(key,width+pad*2,height+pad*2);
      if(!texture)return textureKey;
      const ctx=texture.context,cx=width/2+pad,cy=height/2+pad;
      ctx.clearRect(0,0,width+pad*2,height+pad*2);
      // Máscara sólida (alfa 0 o 1): con la transparencia tal cual, las zonas semitransparentes (halo de cápsula,
      // bordes suaves) dejaban un disco relleno en vez de un anillo de contorno.
      const shape=this.makeSolidMask(source,width,height);
      for(let i=0;i<16;i++){const a=Math.PI*2*i/16;ctx.drawImage(shape,cx-width/2+Math.cos(a)*pad,cy-height/2+Math.sin(a)*pad,width,height);}
      ctx.globalCompositeOperation='source-in';ctx.fillStyle='#ffffff';ctx.fillRect(0,0,width+pad*2,height+pad*2);
      ctx.globalCompositeOperation='destination-out';ctx.drawImage(shape,pad,pad,width,height);
      ctx.globalCompositeOperation='source-over';texture.refresh();
      return key;
    }

    chooseEnemyArchetype(forcedLarge = false) {
      if (forcedLarge) return 'brute';
      const t = this.elapsed;
      const choices = [{ id:'standard', weight:t < 25 ? 1 : 0.48 }];
      if (t >= 25) choices.push({ id:'runner', weight:t < 55 ? 0.36 : 0.22 });
      if (t >= 55) choices.push({ id:'brute', weight:t < 95 ? 0.22 : 0.24 });
      if (t >= 95) choices.push({ id:'elite', weight:t < 150 ? 0.14 : 0.20 });
      let roll = this.rng.next() * choices.reduce((sum,c)=>sum+c.weight,0);
      for (const choice of choices) { roll -= choice.weight; if (roll <= 0) return choice.id; }
      return choices[0].id;
    }

    updateProgressionMilestones() {
      const milestones = [
        { time:25, id:1, text:'NUEVAS VARIANTES: PATÓGENOS RÁPIDOS' },
        { time:55, id:2, text:'APARECEN PATÓGENOS GRANDES Y RESISTENTES' },
        { time:95, id:3, text:'ALERTA: VARIANTES ÉLITE' },
        { time:150, id:4, text:'INFECCIÓN AVANZADA: HORDAS COMBINADAS' }
      ];
      for (const m of milestones) {
        if (this.elapsed >= m.time && this.progressionMilestone < m.id) {
          this.progressionMilestone = m.id;
          this.showToast(m.text);
        }
      }
    }

    getBuildPressure() {
      const s=this.stats;
      const offense=(s.attackDamage/21)*(s.projectileCount)*(520/s.attackInterval)*(1+s.projectilePierce*0.13)+(s.blastDamage/18)+(s.swarmLevel*0.22);
      const sustain=(s.maxHealth/100)*(1+s.defenseLevel*0.11);
      const mobility=(s.moveSpeed/190)*(1+s.agilityLevel*0.06);
      return clamp(Math.log2(Math.max(1,offense)*0.55+Math.max(1,sustain)*0.28+Math.max(1,mobility)*0.17)*0.32,0,1.45);
    }

    // ---------- Especies (catálogo ADN 2026) ----------

    // Elige una especie de la familia del enemigo entre los agentes del modo (todos los núcleos en Sandbox, solo los
    // del núcleo en Foco por núcleo). allowWorm=false descarta las especies con forma de gusano (tope de gusanos).
    pickAgente(type,allowWorm=true){
      if(!AGENTES_DATA)return null;
      if(!this.speciesPool){
        this.speciesPool={};
        const ids=this.modo?new Set(this.modo.agentes):null;
        for(const a of AGENTES_DATA.AGENTES){
          if(!a.nucleos.length||(ids&&!ids.has(a.id)))continue;
          (this.speciesPool[a.familia]||(this.speciesPool[a.familia]=[])).push(a);
        }
      }
      let pool=this.speciesPool[type]||[];
      if(!allowWorm)pool=pool.filter(a=>!AGENTES_DATA.MORFOLOGIAS[a.morfologia]?.gusano);
      return pool.length?randomItem(this.rng,pool):null;
    }

    // Morfología base del motor para un agente: los gusanos usan el nematodo o el cestodo; el resto, la pieza
    // con la misma textura o una de su familia.
    baseMorphologyForAgente(type,agente){
      const gusano=AGENTES_DATA.MORFOLOGIAS[agente.morfologia]?.gusano;
      if(gusano){const kind=gusano==='tapeworm'?'cestode':'nematode';return MORPHOLOGY.parasite.find(m=>m.worm&&m.wormKind===kind);}
      const textura=AGENTES_DATA.MORFOLOGIAS[agente.morfologia]?.textura;
      const options=(MORPHOLOGY[type]||[]).filter(m=>!m.worm);
      return options.find(m=>m.texture===textura)||randomItem(this.rng,options);
    }

    // Morfología del motor para una especie: misma forma de moverse (id de la morfología base), textura horneada
    // de la especie, su color y su nombre.
    morphologyForAgente(type,agente,fallback){
      const morf=AGENTES_DATA.MORFOLOGIAS[agente.morfologia];
      if(fallback.worm)return {...fallback,label:agente.nombre,color:agente.tinte??fallback.color,agente:agente.id};
      const base=(MORPHOLOGY[type]||[]).find(m=>m.texture===morf.textura)||fallback;
      return {...base,texture:this.getSpeciesTexture(agente),label:agente.nombre,color:agente.tinte??base.color,agente:agente.id};
    }

    // Hornea una vez la textura de la especie: pieza base + variación por código (tinte, estiramiento, copias en
    // par/cadena/racimo/inclusión, espora). Queda cacheada: cada enemigo sigue siendo una sola imagen.
    getSpeciesTexture(agente){
      const key=`species-${agente.id}`;
      if(this.textures.exists(key))return key;
      const morf=AGENTES_DATA.MORFOLOGIAS[agente.morfologia],v=morf.variacion||{};
      const src=this.textures.get(morf.textura)?.getSourceImage?.();
      const probe=typeof document!=='undefined'?document.createElement('canvas'):null;
      if(!src||!probe||typeof probe.getContext!=='function')return morf.textura;
      const sw=src.width||src.naturalWidth||256,sh=src.height||src.naturalHeight||256;
      // 1) copia teñida de la pieza base (el tinte solo cae sobre los píxeles opacos)
      const tinted=probe;tinted.width=sw;tinted.height=sh;
      const tc=tinted.getContext('2d');tc.drawImage(src,0,0);
      if(agente.tinte!=null){
        const r=(agente.tinte>>16)&255,g=(agente.tinte>>8)&255,b=agente.tinte&255;
        tc.globalCompositeOperation='source-atop';tc.fillStyle=`rgba(${r},${g},${b},0.38)`;tc.fillRect(0,0,sw,sh);tc.globalCompositeOperation='source-over';
      }
      // 2) composición en la textura final
      const S=SPECIES_TEXTURE_SIZE,tex=this.textures.createCanvas(key,S,S),ctx=tex.context;
      const estirar=v.estirar||1,escala=v.escala||1,copias=v.copias||1,aspect=sh/sw;
      const fit=S*0.86/Math.max(estirar,1)/Math.max(1,aspect);
      const drawCopy=(cx,cy,size,rot=0)=>{ctx.save();ctx.translate(cx,cy);ctx.rotate(rot);ctx.scale(estirar,1);ctx.drawImage(tinted,-size/2,-size*aspect/2,size,size*aspect);ctx.restore();};
      // Sin halos ni burbujas alrededor (cápsula, membrana de inclusión): cada especie lleva solo el contorno de su forma.
      const c=S/2,d=v.disposicion;
      if(d==='par'){const sz=fit*(v.escala||0.55);drawCopy(c-sz*0.36,c,sz,-0.25);drawCopy(c+sz*0.36,c,sz,0.25);}
      else if(d==='cadena'){const n=Math.max(2,copias),span=S*0.62,sz=Math.min(fit*(v.escala||0.42),span/(n-1)*1.15);for(let i=0;i<n;i++){const t=i/(n-1)-0.5;drawCopy(c+t*span,c+Math.sin(t*Math.PI*1.6)*S*0.09,sz,t*0.5);}}
      else if(d==='racimo'){const sz=fit*(v.escala||0.45),n=Math.max(3,copias);for(let i=0;i<n;i++){const a=i/n*Math.PI*2+0.4;drawCopy(c+Math.cos(a)*sz*0.42,c+Math.sin(a)*sz*0.42,sz,a);}}
      else if(d==='polimorfo'){[[0,0,0.62],[-0.28,0.22,0.4],[0.3,-0.2,0.34]].forEach(([dx,dy,k],i)=>drawCopy(c+dx*S,c+dy*S,fit*k,i*0.9));}
      else if(d==='inclusion'){[[0,0],[-0.17,-0.12],[0.16,-0.1],[-0.1,0.17],[0.14,0.15]].forEach(([dx,dy],i)=>drawCopy(c+dx*S,c+dy*S,fit*0.3,i));}
      else drawCopy(c,c,fit*escala);
      if(v.espora==='terminal'){const ex=c+fit*escala*estirar*0.42;ctx.beginPath();ctx.ellipse(ex,c,S*0.07,S*0.055,0,0,Math.PI*2);ctx.fillStyle='rgba(255,252,225,0.95)';ctx.fill();ctx.lineWidth=2.5;ctx.strokeStyle='rgba(60,40,70,0.85)';ctx.stroke();}
      tex.refresh();
      return key;
    }

    // Primera vez que aparece una especie en la partida: se nombra (aviso + etiqueta sobre el enemigo).
    registerSpecies(e){
      const id=e.agente;let log=this.speciesLog[id];
      if(!log){
        log=this.speciesLog[id]={vistos:0,eliminados:0};this.speciesOrder.push(id);
        const nombre=AGENTES_DATA?.agente(id)?.nombre||e.morphology.label;
        this.showFloatingText(e.x,e.y-(e.visualSize||40)*0.7,nombre,'#e8fff6',11);
        if(this.toastQueue.length<2)this.showToast(`NUEVO AGENTE · ${nombre}`);
      }
      log.vistos++;
    }

    // Agentes que aparecieron en la partida, con su ficha, en el orden en que se vieron.
    getBestiary(){
      if(!AGENTES_DATA||!this.speciesOrder)return [];
      return this.speciesOrder.map(id=>{const a=AGENTES_DATA.agente(id),l=this.speciesLog[id];return a&&{id,nombre:a.nombre,familia:a.familia,vistos:l.vistos,eliminados:l.eliminados,ficha:FICHAS_DATA?.ficha(id)||null};}).filter(Boolean);
    }

    getRunSummary() {
      return {score:this.getScore(),elapsed:this.elapsed,damage:Math.round(this.damageTotal),dps:Math.round(this.damageTotal/Math.max(1,this.elapsed)),estimatedDps:Math.round(this.getPlayerDpsEstimate()),kills:this.kills,bossKills:this.bossKills,fociHealed:this.fociHealed,focusBreaches:this.focusBreaches,questionCount:this.questionCount,correctAnswers:this.correctAnswers,upgrades:this.upgradeHistory.slice(),bestiario:this.getBestiary()};
    }

    pauseGame() {
      if(this.gameEnded||this.manualPaused||this.questionPaused)return;
      this.manualPaused=true;this.time.paused=true;this.tweens.pauseAll();
      this.emit('is:pause',this.getRunSummary());
    }

    resumeGame() {
      if(!this.manualPaused)return;
      this.manualPaused=false;this.time.paused=false;this.tweens.resumeAll();
      this.emit('is:resume',{});
    }

    getPlayerDpsEstimate() {
      const s=this.stats;
      const granuleDps=s.attackDamage*s.projectileCount*1000/Math.max(180,s.attackInterval)*0.86;
      const netDps=s.netDamage*1000/Math.max(180,s.netTickInterval)*Math.min(2.0,s.maxNetHelpers*0.30);
      const swarmDps=s.swarmLevel?s.attackDamage*s.swarmLevel*0.15:0;
      return Math.max(12,granuleDps+netDps+swarmDps+s.blastDamage*0.20);
    }

    // Secuencia de jefes del modo: en Foco por núcleo, el jefe del núcleo; en Sandbox, los clásicos alternados con
    // los de todos los núcleos (orden aleatorio por partida). Sin modo, los cuatro clásicos.
    buildBossSequence(){
      if(!this.modo||!AGENTES_DATA)return BOSS_MORPHOLOGIES;
      const propios=this.modo.jefes.map(j=>this.bossSpecFromAgente(j)).filter(Boolean);
      if(this.modo.id==='nucleo')return propios.length?propios:BOSS_MORPHOLOGIES;
      const clasicos=this.rng.shuffle([...BOSS_MORPHOLOGIES]),deNucleo=this.rng.shuffle(propios),out=[];
      for(let i=0;i<Math.max(clasicos.length,deNucleo.length);i++){if(clasicos[i])out.push(clasicos[i]);if(deNucleo[i])out.push(deNucleo[i]);}
      return out;
    }

    // Jefe a partir de una especie del catálogo: mismo comportamiento que el jefe clásico de su familia (los
    // hongos quedan fijos, los gusanos serpentean) con la textura horneada de la especie, más grande.
    bossSpecFromAgente(jefe){
      const a=AGENTES_DATA.agente(jefe.agente);if(!a)return null;
      const gusano=AGENTES_DATA.MORFOLOGIAS[a.morfologia]?.gusano;
      const art=BOSS_ART[a.id]||null;
      const spec={id:`jefe-${a.id}`,type:a.familia,label:gusano&&!art?a.nombre:jefe.titulo,radius:55,color:a.tinte??0xffa52f,outline:0x26103e,boss:true,agente:a.id,agenteJefe:a.id,stationary:a.familia==='fungus'||a.id==='echinococcus-granulosus',art,mechanic:BOSS_MECHANICS[a.id]?a.id:null};
      // Todos los jefes con arte propio miden lo mismo en pantalla (~300 px), sea cual sea su familia.
      if(art)spec.sizeScale=82/this.enemyBaseVisualSize(a.familia);
      else if(gusano)Object.assign(spec,{texture:'boss_helminth',worm:true,wormKind:gusano==='tapeworm'?'cestode':'nematode',headTexture:gusano==='tapeworm'?'helminth_tapeworm_scolex':'helminth_nematode_head',cruiseSpeed:245,bodyLength:1500});
      return spec;
    }

    requiredBossIds(){
      const seq=this.bossSpecs||BOSS_MORPHOLOGIES;
      return (this.modo?.id==='sandbox'?seq.slice(0,4):seq).map(b=>b.id);
    }

    // Laboratorio: jefe elegido por id (los clásicos por su id; los de núcleo como `jefe-<agente>`).
    spawnBossById(id){
      let spec=(this.bossSpecs||[]).concat(BOSS_MORPHOLOGIES).find(b=>b.id===id);
      if(!spec&&String(id).startsWith('jefe-')){const n=AGENTES_DATA?.NUCLEOS.find(x=>x.jefe.agente===id.slice(5));if(n)spec=this.bossSpecFromAgente({agente:n.jefe.agente,titulo:n.jefe.titulo});}
      if(spec)this.spawnBoss(spec);
    }

    spawnBoss(chosen=null) {
      const seq=this.bossSpecs||BOSS_MORPHOLOGIES;
      let spec=chosen||seq[this.bossSequenceIndex%seq.length];
      // Arte propio si está cargado; si no, la textura de la especie se hornea acá (en init no hay piezas base).
      if(spec.art&&this.textures.exists(spec.art))spec={...spec,texture:spec.art};
      else if(spec.agenteJefe&&!spec.worm)spec={...spec,texture:this.getSpeciesTexture(AGENTES_DATA.agente(spec.agenteJefe))};
      const spawnAt={x:CENTER,y:CENTER};
      const boss=this.spawnEnemy(spec.type,true,spawnAt,spec);
      if(!boss)return;
      // Los jefes emergen en el centro de la arena (decisión de diseño). Como el jugador puede estar ahí,
      // durante la entrada no hacen daño por contacto y aparecen semitransparentes.
      boss.spawnGrace=BOSS_SPAWN_GRACE_MS;
      if(boss.obj)this.tweens.add({targets:boss.obj,alpha:{from:0.35,to:1},duration:BOSS_SPAWN_GRACE_MS,ease:'Sine.Out'});
      this.bossCount++;if(!chosen)this.bossSequenceIndex++;
      this.cameras.main.shake(260,0.0045);
      this.flashPlayerOutline(0xffd875,650);
      this.showToast(`ALERTA · ${spec.label.toUpperCase()} EMERGE EN EL CENTRO DE LA ARENA`);
    }

    spawnEnemy(forceType = null, forcedLarge = false, spawnAt = null, bossSpec = null) {
      const enemyLimit=this.debugMode?Math.min(220,this.debugSpawnLimit||180):(this.multiResistance?Math.min(96,this.maxEnemyCount+24):this.maxEnemyCount);
      if ((!bossSpec&&this.activeEnemyCount>=enemyLimit) || (bossSpec&&this.activeEnemyCount>=enemyLimit+2) || this.gameEnded || this.questionPaused) return;
      let type = bossSpec?.type || forceType || this.pickEnemyType();
      let morphology = bossSpec;
      if(!bossSpec){
        // Identidad: cada enemigo común es una especie concreta del catálogo del modo. Primero la especie y después
        // la forma, así un núcleo sin gusanos no los genera. Los gusanos tienen tope y no nacen junto a otro enemigo.
        const allowWorm=type==='parasite'&&!spawnAt&&this.enemies.reduce((n,e)=>n+(!e.dead&&e.isWorm?1:0),0)<(this.lowPerformanceDevice?2:3);
        let agente=this.forcedSpawnAgente?AGENTES_DATA?.agente(this.forcedSpawnAgente):this.pickAgente(type,allowWorm);
        if(agente&&this.forcedSpawnAgente)type=agente.familia;
        // Núcleo cuyos parásitos son todos gusanos (p. ej. zoonosis) con el tope lleno: sale otra familia del núcleo.
        if(!agente&&this.modo&&!forceType){for(const t of ['bacteria','virus','fungus']){agente=this.pickAgente(t,false);if(agente){type=t;break;}}}
        if(agente)morphology=this.morphologyForAgente(type,agente,this.baseMorphologyForAgente(type,agente));
        else{const options=(MORPHOLOGY[type]||MORPHOLOGY.bacteria).filter(m=>allowWorm||!m.worm);morphology=randomItem(this.rng,options);}
      }
      const isWorm=morphology.worm===true;
      const p=spawnAt?this.constrainToArena(spawnAt.x,spawnAt.y,bossSpec?Math.max(160,this.playerRadius+20):150):(bossSpec?this.randomSpawnPoint(560,760):(isWorm?this.randomSpawnPoint(235,390):this.randomSpawnPoint()));

      const archetype = this.chooseEnemyArchetype(forcedLarge);
      const archetypes = {
        standard: { size:1.00, hp:1.00, speed:1.00, damage:1.00, tier:0 },
        runner:   { size:0.82, hp:0.56, speed:1.58, damage:0.72, tier:0 },
        brute:    { size:1.43, hp:2.35, speed:0.72, damage:1.35, tier:2 },
        elite:    { size:1.17, hp:1.90, speed:1.20, damage:1.48, tier:2 }
      };
      const variant = archetypes[archetype] || archetypes.standard;
      const stage = Math.floor(this.elapsed / 45);
      let size = bossSpec?2.45*1.5*(bossSpec.sizeScale||1):variant.size;
      const data = {
        bacteria: { hp:28, speed:54, damage:10, radius:morphology.radius },
        virus:    { hp:19, speed:83, damage:8, radius:morphology.radius },
        fungus:   { hp:42, speed:35, damage:10, radius:morphology.radius },
        parasite: { hp:78, speed:morphology.worm?(morphology.cruiseSpeed||195):78, damage:14, radius:morphology.radius }
      }[type];
      const timeScale = 1 + Math.pow(this.elapsed/115,1.22)*0.52;
      const buildPressure=this.getBuildPressure();
      const crisisHp=this.multiResistance?1+Math.min(4.2,0.34+(this.elapsed-this.multiResistanceAt)/105):1;
      const crisisDamage=this.multiResistance?1+Math.min(2.1,0.24+(this.elapsed-this.multiResistanceAt)/190):1;
      const hpScale=timeScale*(1+buildPressure*0.31)*crisisHp;
      if(!bossSpec){const hpDrivenSize=clamp(1+Math.log2(Math.max(1,variant.hp*hpScale))*0.13,1,1.34);size*=hpDrivenSize;
        // Preserve the broad biological visual hierarchy while retaining archetype variation.
        const taxonomySize={parasite:1.30,bacteria:1.00,fungus:0.91,virus:0.72}[type]||1; size*=taxonomySize;}
      if(!bossSpec) size=Math.min(size,1.55);
      const bossPhaseScale=this.multiResistance?Math.min(4.2,1.5+0.22*(this.elapsed-this.multiResistanceAt)/90):1;
      const bossHp=bossSpec?Math.max(500,this.getPlayerDpsEstimate()*38*(1+buildPressure*0.12)*crisisHp*bossPhaseScale*this.infectionDiff.hp):0;
      const heading = (isWorm||bossSpec) ? Math.atan2(this.player.y-p.y,this.player.x-p.x)+this.rng.float(-0.35,0.35) : this.rng.float(0,Math.PI*2);
      const e = {
        id:`${this.clock.now()}-${this.rng.next()}`, type, morphology, archetype, isBoss:!!bossSpec, x:p.x, y:p.y,
        obj:this.makeEnemyArt(type, morphology, p.x, p.y, size),
        hp:bossSpec?bossHp:data.hp * variant.hp * hpScale*this.infectionDiff.hp, maxHp:bossSpec?bossHp:data.hp * variant.hp * hpScale*this.infectionDiff.hp,
        speed:bossSpec?(bossSpec.stationary?0:Math.max(58,data.speed*1.02*this.infectionDiff.speed)):data.speed * variant.speed * (1 + Math.min(1.10, stage * 0.065)) * this.infectionDiff.speed * this.rng.float(0.87,1.13) * clamp(1.12-(size-1)*0.24,0.72,1.25),
        damage:(bossSpec?data.damage*5.2:data.damage * variant.damage)*(1+Math.pow(this.elapsed/240,0.72)*0.45)*(1+buildPressure*0.18)*this.infectionDiff.damage*crisisDamage, radius:bossSpec?Math.max(data.radius*1.55,this.enemyBaseVisualSize(type)*0.42*size):(morphology.worm ? (archetype==='brute'?34:archetype==='elite'?31:archetype==='runner'?24:28) : Math.max(data.radius * size, this.enemyBaseVisualSize(type) * 0.40 * size)),
        sizeTier:bossSpec?2:variant.tier, size, visualSize:bossSpec ? this.enemyBaseVisualSize(type)*size : Math.min(morphology.worm ? (archetype==='brute'?86:archetype==='elite'?78:archetype==='runner'?66:74) : this.enemyBaseVisualSize(type) * size, 42),
        visualScale:morphology.worm?1:this.enemyBaseVisualSize(type) * size / Math.max((this.textures.get(morphology.texture)?.getSourceImage()?.width||256),(this.textures.get(morphology.texture)?.getSourceImage()?.height||256)),
        color:morphology.color, outlineColor:archetype==='elite'?0xffdf75:morphology.outline, healthOutlineColor:0x55f0ba, healthOutlineBand:3,
        sporeCooldown:this.rng.float(1300,3100), dead:false, hitFlash:0, heading, bossAttackClock:this.rng.float(2500,3500), biofilmClock:300, stationary:!!bossSpec?.stationary, minion:!!bossSpec?.minion,
        spawnAge:0, animPhase:this.rng.float(0,Math.PI*2), animFrequency:this.rng.float(2.2,4.7), animSquash:archetype==='runner'?0.13:archetype==='brute'?0.045:0.075, animBob:0,
        wanderClock:this.rng.float(400,1700), trail:[], trailAccumulator:0,
        isWorm:morphology.worm === true, agente:morphology.agente||null,
        wormWidth:morphology.worm?(archetype==='brute'?38:archetype==='runner'?26:archetype==='elite'?34:30)*(bossSpec?1.5:0.72):0,
        wormLength:morphology.worm?(bossSpec?(morphology.bodyLength||1500)*1.5:Math.min((morphology.bodyLength||720)*Math.sqrt(size),560)):0,
        wormMomentum:isWorm?0.40:0, wormDrift:0, wormHeadTexture:morphology.headTexture||null, wormEntryUntil:this.elapsed+(isWorm?1.35:0), wormEntryAnnounced:false,
        trailStep:10, wormRenderClock:0, barClock:0
      };
      if(e.stationary)e.stationaryAnchor={x:p.x,y:p.y};
      e.obj.setDepth(e.isBoss?22:(type === 'parasite' ? 22 : 20 + variant.tier));
      e.outlineSprite=null;
      if(!e.isWorm){const outlineTexture=this.getEnemyOutlineTexture(morphology.texture);e.outlineSprite=this.add.image(e.x,e.y,outlineTexture).setOrigin(0.5).setScale(e.visualScale).setTint(e.healthOutlineColor).setAlpha(0.92).setDepth(e.obj.depth-0.5);}
      e.phagoEligible=!e.isBoss&&(type==='bacteria'||type==='fungus');
      e.phagoMarker=e.phagoEligible?this.makePhagoMarker(e):null;
      e.bossRing=e.isBoss?this.add.circle(e.x,e.y,e.visualSize*0.56,0xffd875,0.07).setStrokeStyle(4,0xffd875,0.82).setDepth(18):null;
      e.healthBar = null;
      e.healthBarGraphic = null;
      e.healthBarVisibleUntil = 0;
      if(e.isBoss){
        e.healthBar = this.add.container(e.x, e.y).setDepth(34);
        e.healthBarGraphic = this.add.graphics();
        e.healthBar.add(e.healthBarGraphic);
        this.redrawEnemyHealthBar(e);
        e.bossLabel=this.sharpText(e.x,e.y-e.visualSize*0.72,morphology.label.toUpperCase(),{fontFamily:'system-ui,sans-serif',fontSize:'12px',fontStyle:'bold',color:'#ffe39a',stroke:'#28123b',strokeThickness:4,align:'center'}).setOrigin(0.5).setDepth(36);
        this.showEnemyHealthBar(e);
      }
      if (e.isWorm) {
        const headSource=this.textures.get(e.wormHeadTexture).getSourceImage();
        const headWidth=e.wormWidth*2.05, headScale=headWidth/Math.max(headSource.width||headSource.naturalWidth,headSource.height||headSource.naturalHeight);
        e.headSprite=this.add.image(e.x,e.y,e.wormHeadTexture).setScale(headScale).setRotation(heading+Math.PI/2).setDepth(24);
        const samples = Math.max(22, Math.floor(e.wormLength/e.trailStep));
        for (let i=0; i<samples; i++) e.trail.push({ x:e.x-Math.cos(heading)*i*e.trailStep, y:e.y-Math.sin(heading)*i*e.trailStep });
        this.drawWorm(e);
      }
      if(bossSpec)this.initBossMechanic(e,bossSpec);
      this.enemies.push(e);if(e.agente)this.registerSpecies(e);this.activeEnemyCount++;
      return e;
    }

    // ---------- Jefes de núcleo: mecánicas propias ----------
    // Cada jefe de núcleo tiene una mecánica ligada a su biología (ver BOSS_MECHANICS). Usan piezas comunes:
    // zonas de peligro (las mismas del biofilm), ráfagas radiales de proyectiles, súbditos de una especie y
    // modificadores de daño recibido (cápsula, encapsulamiento, invulnerabilidad breve).
    initBossMechanic(e,spec){
      const id=spec.mechanic;if(!id||!BOSS_MECHANICS[id])return;
      e.mechanic=id;e.mech={clock:BOSS_MECHANICS[id].firstMs||2600,clock2:4200,count:0,damageTaken:1,invulnUntil:-1,pulse:1};
      if(id==='neisseria-meningitidis'){e.mech.shieldMax=e.maxHp*0.28;e.mech.shield=e.mech.shieldMax;e.mech.phase='capsula';e.mech.clock=9000;}
      if(id==='mycobacterium-tuberculosis')e.mech.phase='abierto';
      const ring=BOSS_MECHANICS[id].ring;
      if(ring){e.mechRing=this.add.circle(e.x,e.y,ring.radius||e.visualSize*0.6,ring.color,ring.fill??0.06).setStrokeStyle(ring.stroke??4,ring.color,0.8).setDepth(ring.depth??23);}
    }

    // Neisseria suelta la cápsula (por tiempo o porque se la rompieron) y libera endotoxina.
    releaseCapsule(e,broken=false){
      const m=e.mech;m.shield=0;m.phase='expuesta1';m.clock=5000;
      this.spawnBossBurst(e,14,{color:0xff6f6f,speed:170,damage:10+this.elapsed*0.01});
      this.bossMechanicText(e,broken?'CÁPSULA ROTA · ENDOTOXINA':'SUELTA LA CÁPSULA · ENDOTOXINA','#ffb0b0');
    }

    bossMechanicText(e,text,color){this.showFloatingText(e.x,e.y-e.visualSize*0.55,text,color||BOSS_MECHANICS[e.mechanic]?.color||'#ffe39a',12);}

    // Zona de peligro en el piso (comparte la lista y el dibujo con el biofilm). mine: explota al terminar la cuenta.
    spawnHazard(x,y,o){
      if(this.biofilmZones.length>=16)return null;
      const g=this.add.graphics().setDepth(17);
      g.fillStyle(o.color,o.mine?0.30:0.20);g.fillCircle(0,0,o.radius);g.lineStyle(3,o.color,0.65);g.strokeCircle(0,0,o.radius);
      if(o.mine){g.lineStyle(2,o.color,0.35);g.strokeCircle(0,0,o.mine.radius/1.6);}
      const obj=this.add.container(x,y,[g]).setAlpha(0.92);
      const z={x,y,obj,radius:o.radius,life:o.life||9000,tick:0,damage:o.damage,slow:o.slow||0,label:o.label||'',labelColor:o.labelColor||'#ffd0a0',mine:o.mine?{t:o.mine.t,radius:o.mine.radius,total:o.mine.t}:null};
      this.biofilmZones.push(z);return z;
    }

    // Ráfaga radial de proyectiles (merozoítos, endotoxina, protoescólices…). Usa el mismo ciclo que las esporas.
    spawnBossBurst(e,count,o){
      const off=this.rng.float(0,Math.PI*2),speed=o.speed||150;
      for(let i=0;i<count&&this.enemyProjectiles.length<70;i++){
        const a=off+Math.PI*2*i/count,obj=this.add.container(e.x+Math.cos(a)*e.radius*0.6,e.y+Math.sin(a)*e.radius*0.6).setDepth(30);
        obj.add([this.add.circle(0,0,(o.size||6)+3,o.color,0.18),this.add.circle(0,0,o.size||6,o.color,1).setStrokeStyle(1.8,0x24113d,0.95),this.add.circle(-1.5,-1.5,1.6,0xffffff,0.9)]);
        this.enemyProjectiles.push({obj,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,damage:o.damage,life:o.life||4200,radius:o.size||6,homing:!!o.homing});
      }
      this.burstEffect(e.x,e.y,o.color,Math.min(140,e.visualSize*0.5));
    }

    // Burbuja lanzada: viaja hasta un punto y ahí queda como mina (no daña en el camino).
    spawnBossLob(e,tx,ty,o){
      if(this.enemyProjectiles.length>=70)return;
      const a=Math.atan2(ty-e.y,tx-e.x),obj=this.add.container(e.x,e.y).setDepth(30);
      obj.add([this.add.circle(0,0,15,o.color,0.22).setStrokeStyle(2,0xffffff,0.7),this.add.circle(-4,-4,4,0xffffff,0.75)]);
      this.enemyProjectiles.push({obj,vx:Math.cos(a)*o.speed,vy:Math.sin(a)*o.speed,damage:0,life:6000,radius:12,landAt:{x:tx,y:ty},landMine:o.mine});
    }

    // Súbditos de una especie concreta alrededor del jefe (más chicos y frágiles que un enemigo común).
    spawnBossMinions(e,agenteId,count,o={}){
      const agente=AGENTES_DATA?.agente(agenteId);if(!agente)return;
      this.forcedSpawnAgente=agenteId;
      try{
        for(let i=0;i<count;i++){
          const a=Math.PI*2*i/count+this.rng.float(0,0.5),p={x:e.x+Math.cos(a)*(e.radius+50),y:e.y+Math.sin(a)*(e.radius+50)};
          const m=this.spawnEnemy(agente.familia,false,p);if(!m)continue;
          m.minion=true;
          if(o.strong){
            // bacilos de élite: varias veces la vida de un enemigo común, más rápidos y demasiado grandes para fagocitar
            m.hp=m.maxHp=m.maxHp*(o.hpMul||6);m.speed*=o.speedMul||1.9;m.damage*=o.damageMul||1.4;m.sizeTier=2;
            m.outlineColor=0xffdf75;m.visualScale*=1.15;m.obj.setScale(m.visualScale);
          }else{m.hp=m.maxHp=Math.max(24,e.maxHp*0.006);m.damage=Math.max(6,e.damage*0.12);}
        }
      }finally{this.forcedSpawnAgente=null;}
    }

    updateBossMechanic(e,dtMs,dt,dx,dy,d){
      const m=e.mech,t=this.elapsed,crisis=this.multiResistance?0.7:1;
      m.clock-=dtMs;m.clock2-=dtMs;
      switch(e.mechanic){
        case 'escherichia-coli': // toxina Shiga + embestidas con flagelos
          if(m.clock<=0){m.clock=4200*crisis;this.spawnHazard(e.x,e.y,{radius:120,color:0xff8a2a,damage:6+t*0.01,slow:0.72,life:16000,label:'TOXINA SHIGA',labelColor:'#ffb36b'});this.bossMechanicText(e,'TOXINA SHIGA');}
          if(m.clock2<=0){m.clock2=6200*crisis;m.dashUntil=t+0.9;this.bossMechanicText(e,'FLAGELOS: EMBESTIDA','#ffd27a');}
          e.mechSpeed=t<(m.dashUntil||0)?2.7:1;break;
        case 'mycobacterium-tuberculosis': // granuloma: se encapsula y después se abre por necrosis caseosa
          e.mechSpeed=0.45;
          if(m.clock<=0&&m.phase==='abierto'){m.phase='cerrado';m.clock=4500;m.damageTaken=0.15;this.bossMechanicText(e,'GRANULOMA: CÁPSULA FIBROSA','#d9d2ff');}
          else if(m.clock<=0){m.phase='abierto';m.clock=9500*crisis;m.damageTaken=1;this.spawnBossMinions(e,'mycobacterium-tuberculosis',this.multiResistance?3:2,{hpMul:6,speedMul:1.9,damageMul:1.4,strong:true});this.bossMechanicText(e,'NECROSIS CASEOSA: LIBERA BACILOS','#ffb0c8');}
          break;
        case 'neisseria-meningitidis': // ciclo: cápsula → endotoxina y la suelta → endotoxina → cápsula de nuevo
          e.mechSpeed=1.2;
          if(m.clock<=0){
            if(m.phase==='capsula')this.releaseCapsule(e);
            else if(m.phase==='expuesta1'){m.phase='expuesta2';m.clock=5000;this.spawnBossBurst(e,14,{color:0xff6f6f,speed:170,damage:10+t*0.01});this.bossMechanicText(e,'ENDOTOXINA','#ffb0b0');}
            else{m.phase='capsula';m.shield=m.shieldMax;m.clock=9000*crisis;this.bossMechanicText(e,'CÁPSULA REGENERADA','#9fdcff');}
          }
          break;
        case 'vih': // variación antigénica (inmune un momento, cambia de color, suelta viriones) y una latencia
          if(m.clock<=0){m.clock=7000*crisis;m.count++;m.invulnUntil=t+1.4;m.tint=[0xffffff,0x9fffe0,0xffc36b,0xc59bff][m.count%4];this.spawnVirusMinions(e);this.bossMechanicText(e,'VARIACIÓN ANTIGÉNICA','#ff9ec4');}
          if(!m.latencyUsed&&e.hp<e.maxHp*0.35){m.latencyUsed=true;m.invulnUntil=t+3;e.hp=Math.min(e.maxHp,e.hp+e.maxHp*0.08);this.bossMechanicText(e,'LATENCIA: SE OCULTA EN EL RESERVORIO','#ffd0e4');}
          e.mechSpeed=t<m.invulnUntil?0.5:1;break;
        case 'toxoplasma-gondii': // motilidad por deslizamiento e invasión celular
          if(m.clock<=0){
            m.clock=3600*crisis;m.count++;
            if(m.count%3===0){m.invulnUntil=t+1.5;m.invadeAt=t+1.5;this.bossMechanicText(e,'INVASIÓN CELULAR','#ffd27a');}
            else{m.dashUntil=t+1;m.dashAngle=Math.atan2(dy,dx);this.bossMechanicText(e,'DESLIZAMIENTO','#ffe2a0');}
          }
          if(m.invadeAt&&t>=m.invadeAt){m.invadeAt=0;this.spawnBossMinions(e,'toxoplasma-gondii',this.multiResistance?4:3);}
          if(t<(m.dashUntil||0)){e.x+=Math.cos(m.dashAngle)*e.speed*3.2*dt;e.y+=Math.sin(m.dashAngle)*e.speed*3.2*dt;e.heading=m.dashAngle;e.mechSpeed=0;}
          else e.mechSpeed=t<m.invulnUntil?0.3:1;
          break;
        case 'plasmodium': { // ciclo eritrocítico: el glóbulo rojo se hincha y estalla en merozoítos
          const cycle=7000*crisis,swell=1600;
          m.pulse=m.clock<swell?1+0.14*(1-Math.max(0,m.clock)/swell):1;
          if(m.clock<=0){m.clock=cycle;this.spawnBossBurst(e,this.multiResistance?20:16,{color:0xff5a6e,speed:175,damage:9+t*0.01,size:10,life:7500});this.bossMechanicText(e,'ESQUIZOGONIA · FIEBRE','#ff8fa0');}
          break;
        }
        case 'echinococcus-granulosus': // quiste fijo: protoescólices y rotura a mitad de vida
          if(m.clock<=0){m.clock=6000*crisis;this.spawnBossBurst(e,8,{color:0xffe2a6,speed:85,damage:10+t*0.01,size:7,homing:true,life:12000});this.bossMechanicText(e,'PROTOESCÓLICES','#ffe7b5');}
          if(!m.ruptured&&e.hp<e.maxHp*0.5){
            m.ruptured=true;const radius=300;
            const wave=this.add.circle(e.x,e.y,20,0xffe2a6,0.12).setStrokeStyle(6,0xfff0c8,0.9).setDepth(29);
            this.tweens.add({targets:wave,radius,alpha:0,duration:520,ease:'Cubic.Out',onComplete:()=>wave.destroy()});
            if(Math.hypot(this.player.x-e.x,this.player.y-e.y)<radius+this.playerRadius)this.damagePlayer(e.damage*0.55);
            this.spawnBossBurst(e,18,{color:0xffe2a6,speed:140,damage:10+t*0.01,size:6});
            this.cameras.main.shake(320,0.008);this.bossMechanicText(e,'ROTURA DEL QUISTE · ANAFILAXIA','#fff0c8');
          }
          break;
        case 'clostridium-perfringens': // gangrena gaseosa: burbujas de gas que explotan
          if(m.clock<=0){
            // deja una burbuja en un punto al azar alrededor suyo
            m.clock=2600*crisis;m.count++;const a=this.rng.float(0,Math.PI*2),r=this.rng.float(e.radius+20,e.radius+170);
            this.spawnHazard(e.x+Math.cos(a)*r,e.y+Math.sin(a)*r,{radius:34,color:0xd9c8ff,damage:13+t*0.012,life:4000,mine:{t:2700,radius:135},label:'GAS',labelColor:'#e6dcff'});
            if(m.count%4===1)this.bossMechanicText(e,'GANGRENA GASEOSA','#e6dcff');
          }
          if(m.clock2<=0){
            // y lanza burbujas hacia donde estás: caen y explotan al rato
            m.clock2=3600*crisis;
            for(let i=0;i<2;i++)this.spawnBossLob(e,this.player.x+this.rng.float(-70,70),this.player.y+this.rng.float(-70,70),{color:0xd9c8ff,speed:230,mine:{radius:34,color:0xd9c8ff,damage:13+t*0.012,life:2500,mine:{t:1100,radius:120},label:'GAS',labelColor:'#e6dcff'}});
            this.bossMechanicText(e,'LANZA GAS','#e6dcff');
          }
          break;
        case 'pneumocystis-jirovecii': { // fijo: aura que frena y, si tenés poca vida, ataca más (oportunista)
          if(d<230)this.auraSlowUntil=t+0.12;
          const oportunista=this.stats.health<this.stats.maxHealth*0.45;
          if(m.clock<=0){m.clock=(oportunista?1600:2850)*crisis;for(let i=0;i<(oportunista?5:3);i++)this.spawnBossSpore(e);this.bossMechanicText(e,oportunista?'OPORTUNISTA: TU INMUNIDAD CAE':'QUISTES Y TROFOZOÍTOS',oportunista?'#ff9ec4':'#cfe6ff');}
          break;
        }
      }
    }

    // Lo visual de cada mecánica, en el mismo paso que el resto del dibujo del enemigo.
    renderBossMechanic(e){
      const m=e.mech,t=this.elapsed,invuln=t<m.invulnUntil;
      if(e.spawnGrace<=0)e.obj.setAlpha(invuln?0.38+0.12*Math.sin(t*14):1);
      if(e.outlineSprite?.active&&invuln)e.outlineSprite.setTint(0xffffff).setAlpha(0.5);
      if(m.tint&&!e.tintActive&&e.hitFlash<=0)e.obj.setTint(m.tint);
      if(!e.mechRing?.active)return;
      e.mechRing.setPosition(e.x,e.y);
      if(e.mechanic==='neisseria-meningitidis'){const r=clamp(m.shield/m.shieldMax,0,1);e.mechRing.setVisible(r>0).setStrokeStyle(3+4*r,0x6fd2ff,0.35+0.55*r).setScale(1+0.03*Math.sin(t*3));}
      else if(e.mechanic==='mycobacterium-tuberculosis'){const closed=m.phase==='cerrado';e.mechRing.setStrokeStyle(closed?9:3,closed?0xd9d2ff:0xb9a8e0,closed?0.95:0.35).setFillStyle(0xd9d2ff,closed?0.16:0.03);}
      else if(e.mechanic==='pneumocystis-jirovecii')e.mechRing.setAlpha(0.55+0.2*Math.sin(t*1.6));
    }

    spawnEnemyProjectile(enemy) {
      const d = Math.hypot(this.player.x - enemy.x, this.player.y - enemy.y) || 1;
      const obj=this.add.container(enemy.x,enemy.y+7).setDepth(28);
      const halo=this.add.circle(0,0,8,0xcaff62,0.16).setStrokeStyle(1.2,0xeaffb1,0.55);
      const core=this.add.circle(0,0,5,0xb0f22c,1).setStrokeStyle(1.8,0x24113d,0.96);
      const glint=this.add.circle(-1.5,-1.5,1.6,0xffffff,0.95);obj.add([halo,core,glint]);
      this.enemyProjectiles.push({ obj, vx:(this.player.x-enemy.x)/d*132, vy:(this.player.y-enemy.y)/d*132, damage:8, life:3600, radius:5 });
    }

    spawnBossSpore(enemy) {
      if(this.enemyProjectiles.filter(p=>p.kind==='spore').length>=28)return;
      const angle=Math.atan2(this.player.y-enemy.y,this.player.x-enemy.x)+this.rng.float(-0.42,0.42),speed=105+Math.min(55,this.elapsed*0.025);
      const obj=this.add.image(enemy.x,enemy.y,'boss_spore').setScale(0.025).setRotation(angle+Math.PI/2).setDepth(30);
      this.enemyProjectiles.push({obj,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,damage:13+this.elapsed*0.014,life:9000,radius:13,hp:1,kind:'spore',homing:true});
      this.burstEffect(enemy.x,enemy.y,0xbaff49,16);
    }

    spawnVirusMinions(enemy) {
      const count=this.multiResistance?5:3;
      for(let i=0;i<count;i++){
        const angle=Math.PI*2*i/count+this.rng.float(0,0.35),p={x:enemy.x+Math.cos(angle)*100,y:enemy.y+Math.sin(angle)*100};
        const minion=this.spawnEnemy('virus',false,p);
        if(!minion)continue;
        minion.minion=true;minion.archetype='runner';minion.size=0.74;minion.visualSize*=0.74;minion.visualScale*=0.74;minion.radius*=0.76;minion.speed*=2.05;minion.damage=Math.max(7,enemy.damage*0.11);minion.hp=minion.maxHp=Math.max(28,enemy.maxHp*0.0075);
        minion.obj.setScale(minion.visualScale);
      }
      this.burstEffect(enemy.x,enemy.y,0x53e5ff,60);this.showFloatingText(enemy.x,enemy.y-enemy.visualSize*0.55,'GEMACIÓN VIRAL','#a4f4ff',12);
    }

    leaveBiofilm(enemy) {
      const radius=this.rng.float(58,76),g=this.add.graphics().setDepth(17);
      g.fillStyle(0x9ccc39,0.20);g.fillCircle(0,0,radius);g.lineStyle(3,0xd0ee56,0.55);g.strokeCircle(0,0,radius);
      const obj=this.add.container(enemy.x,enemy.y,[g]).setAlpha(0.92);
      this.biofilmZones.push({x:enemy.x,y:enemy.y,obj,radius,life:26000,tick:0});
    }

    updateBiofilm(dtMs) {
      this.playerSlow=1;
      for(let i=this.biofilmZones.length-1;i>=0;i--){const z=this.biofilmZones[i];z.life-=dtMs;z.tick-=dtMs;
        const near=Math.hypot(this.player.x-z.x,this.player.y-z.y);
        if(z.mine){
          // burbuja de gas: se hincha y titila hasta explotar
          z.mine.t-=dtMs;const k=1-Math.max(0,z.mine.t)/z.mine.total;z.obj.setScale(1+k*0.6).setAlpha(0.55+0.45*Math.abs(Math.sin(k*k*16)));
          if(z.mine.t<=0){
            this.burstEffect(z.x,z.y,0xd9c8ff,z.mine.radius);z.obj.destroy();this.biofilmZones.splice(i,1);
            if(near<z.mine.radius+this.playerRadius){this.damagePlayer(z.damage);this.showFloatingText(this.player.x,this.player.y-35,z.label||'EXPLOSIÓN',z.labelColor,11);if(this.gameEnded)return;}
          }
          continue;
        }
        z.obj.setAlpha(Math.min(0.92,z.life/1200));
        const inside=near<z.radius+this.playerRadius;
        if(inside&&z.slow)this.playerSlow=Math.min(this.playerSlow,z.slow);
        if(inside&&z.tick<=0){z.tick=960;this.damagePlayer(z.damage??(7+this.elapsed*0.012));this.showFloatingText(this.player.x,this.player.y-35,z.label||'BIOFILM TÓXICO',z.labelColor||'#def579',11);if(this.gameEnded)return;}
        if(z.life<=0){z.obj.destroy();this.biofilmZones.splice(i,1);}
      }
    }

    // Freno del jugador por zonas (toxina Shiga) o auras (exudado de Pneumocystis).
    playerSpeedFactor(){return Math.min(this.playerSlow??1,(this.auraSlowUntil??-1)>this.elapsed?0.72:1);}

    spawnPlayerProjectile(target) {
      const angle=Math.atan2(target.y-this.player.y,target.x-this.player.x), count=this.stats.projectileCount;
      const granuleRadius=5+Math.min(3,this.stats.granuleLevel*0.65);
      const granuleColors=[0xffb52e,0xff6d42,0xf44cc5,0x78edff,0xd2ff70];
      const granuleColor=granuleColors[Math.min(granuleColors.length-1,this.stats.granuleLevel)];
      for(let i=0;i<count;i++){
        const offset=(i-(count-1)/2)*0.14, a=angle+offset;
        const obj = this.add.ellipse(this.player.x,this.player.y,granuleRadius*2.5,granuleRadius*1.7,granuleColor,1).setStrokeStyle(2,0x24113d,0.98).setDepth(50).setRotation(a);
        this.playerBullets.push({ obj, vx:Math.cos(a)*this.stats.projectileSpeed, vy:Math.sin(a)*this.stats.projectileSpeed, damage:this.stats.attackDamage, life:1500, radius:granuleRadius, pierce:this.stats.projectilePierce });
      }
      if(this.stats.swarmLevel&&Math.floor(this.kills/5)>this.swarmVolley){this.swarmVolley=Math.floor(this.kills/5);for(let i=0;i<3;i++){const a=angle+(i-1)*0.30,obj=this.add.ellipse(this.player.x,this.player.y,14,9,0x78f2d1,0.95).setStrokeStyle(1.5,0x123d38,1).setDepth(50).setRotation(a);this.playerBullets.push({obj,vx:Math.cos(a)*this.stats.projectileSpeed*0.88,vy:Math.sin(a)*this.stats.projectileSpeed*0.88,damage:this.stats.attackDamage*0.62,life:1400,radius:4,pierce:this.stats.projectilePierce});}}
      const muzzle=this.add.circle(this.player.x,this.player.y,5+this.stats.granuleLevel,granuleColor,0.32).setDepth(49);
      this.tweens.add({targets:muzzle,scale:1.45,alpha:0,duration:105,onComplete:()=>muzzle.destroy()});
      this.flashPlayerOutline(0xa6ffdf, 125);
    }

    flashPlayerOutline(color, duration = 190) {
      if (!this.playerOutline || !this.playerOutline.active) return;
      if (this.playerOutlineTween) this.playerOutlineTween.stop();
      this.playerOutline.setStrokeStyle(3.5, color, 1).setAlpha(1).setScale(1.08);
      this.playerOutlineTween = this.tweens.add({
        targets:this.playerOutline, alpha:0.62, scale:1, duration, ease:'Cubic.Out',
        onComplete:() => {
          if (this.playerOutline?.active && !this.gameEnded) this.playerOutline.setStrokeStyle(2.6, 0xa8ffe0, 0.95).setAlpha(1).setScale(1);
          this.playerOutlineTween = null;
        }
      });
    }

    distanceToEnemy(point, e) {
      if (!e.isWorm || e.trail.length < 2) return Math.max(0, Math.sqrt(dist2(point,e)) - e.radius);
      let best = dist2(point, e);
      for (let i=0; i<e.trail.length-1; i++) {
        const a=e.trail[i], b=e.trail[i+1];
        best=Math.min(best, pointSegmentDistanceSq(point.x,point.y,a.x,a.y,b.x,b.y));
      }
      return Math.max(0, Math.sqrt(best) - e.wormWidth/2);
    }

    projectileHitsEnemy(projectile, e) {
      if (!e.isWorm || e.trail.length < 2) return dist2(projectile.obj,e) < (e.radius+projectile.radius)**2;
      const threshold=e.wormWidth*0.66+projectile.radius;
      if (dist2(projectile.obj, e) < (e.wormWidth*1.02 + projectile.radius)**2) return true;
      for (let i=0; i<e.trail.length-1; i++) {
        const a=e.trail[i], b=e.trail[i+1];
        if (pointSegmentDistanceSq(projectile.obj.x,projectile.obj.y,a.x,a.y,b.x,b.y) < threshold*threshold) return true;
      }
      return false;
    }

    enemyTouchesPlayer(e) {
      if (e.isWorm) return this.distanceToEnemy(this.player,e) < this.playerRadius*0.88;
      return dist2(e,this.player) < (this.playerRadius*0.95+e.radius*0.85)**2;
    }

    closestEnemy(maxRange = Infinity, filter = null) {
      let best=null, bestD=maxRange;
      for (const e of this.enemies) {
        if (e.dead || (filter && !filter(e))) continue;
        const d=this.distanceToEnemy(this.player,e);
        if (d < bestD) { best=e; bestD=d; }
      }
      return best;
    }

    closestAttackTarget(maxRange = Infinity) {
      let best=null,bestDistance=maxRange;
      // Con Fagocitosis, los proyectiles no gastan daño en patógenos que podés englobar: se los dejan a los
      // pseudópodos. Excepción: si se juntan demasiados cerca (la fagocitosis engloba de a uno), se les dispara.
      const phago=this.activeSkills.has('phagocytosis');
      const canEngulf=e=>phago&&!e.isBoss&&e.phagoEligible&&e.sizeTier<=this.stats.phagoMaxTier;
      let crowd=0;
      if(phago){const r2=(this.stats.phagoRadius+60)**2;for(const e of this.enemies)if(!e.dead&&canEngulf(e)&&dist2(e,this.player)<r2)crowd++;}
      const spareEngulfable=crowd<PHAGO_SWARM_LIMIT;
      for(const e of this.enemies){
        if(e.dead)continue;
        if(spareEngulfable&&canEngulf(e))continue;
        let aimX=e.x,aimY=e.y,distance;
        if(e.isWorm&&e.trail.length>1){
          let nearestSq=Infinity;
          for(let i=0;i<e.trail.length-1;i++){
            const a=e.trail[i],b=e.trail[i+1],vx=b.x-a.x,vy=b.y-a.y,len=vx*vx+vy*vy;
            const t=len?clamp(((this.player.x-a.x)*vx+(this.player.y-a.y)*vy)/len,0,1):0,px=a.x+vx*t,py=a.y+vy*t,sq=(this.player.x-px)**2+(this.player.y-py)**2;
            if(sq<nearestSq){nearestSq=sq;aimX=px;aimY=py;}
          }
          distance=Math.max(0,Math.sqrt(nearestSq)-e.wormWidth*0.5);
        }else distance=Math.max(0,Math.sqrt(dist2(this.player,e))-e.radius);
        if(distance<bestDistance){bestDistance=distance;best={x:aimX,y:aimY,target:e,kind:'enemy'};}
      }
      for(const spore of this.enemyProjectiles){
        if(spore.kind!=='spore'||!spore.obj?.active)continue;
        const dx=spore.obj.x-this.player.x,dy=spore.obj.y-this.player.y,d=Math.hypot(dx,dy),distance=Math.max(0,d-spore.radius);
        if(distance<bestDistance){const flight=Math.min(0.85,d/Math.max(1,this.stats.projectileSpeed));bestDistance=distance;best={x:spore.obj.x+spore.vx*flight,y:spore.obj.y+spore.vy*flight,target:spore,kind:'spore'};}
      }
      return best;
    }

    // ---------- Pseudópodos de fagocitosis ----------
    // Modelo inspirado en la fagocitosis real: dos prolongaciones de membrana anchas en la base y de punta roma
    // (lamelipodios, no tentáculos finos) que salen del lado de la célula que mira al blanco. Cada punta es un
    // resorte amortiguado con un poco de rebote, como una membrana elástica:
    //  - sin blanco: dos lóbulos cortos que respiran hacia donde avanza la célula;
    //  - fagocitable cerca (hasta PHAGO_SEEK_RANGE más allá del alcance): se estiran hacia él;
    //  - al alcance: lo abrazan por los costados (copa fagocítica);
    //  - al englobar: se cierran por detrás del patógeno y después se retraen.
    // Todo usa los MISMOS dos pseudópodos (antes el englobamiento dibujaba otros aparte y se veía un tercero).

    // Dibuja un pseudópodo como una curva de Bézier cuadrática con ancho variable: polígono relleno, borde claro
    // en los costados y punta redondeada. Sin ondas viajeras: solo una leve respiración del ancho.
    drawPseudopod(g,base,ctrl,tip,opts={}){
      const alpha=opts.alpha??0.9,w0=opts.baseWidth??11,w1=opts.tipWidth??4.6,n=14,t=this.elapsed,phase=opts.phase||0;
      const left=[],right=[];let tx=1,ty=0;
      for(let i=0;i<=n;i++){
        const u=i/n,iu=1-u;
        const x=iu*iu*base.x+2*iu*u*ctrl.x+u*u*tip.x,y=iu*iu*base.y+2*iu*u*ctrl.y+u*u*tip.y;
        tx=2*iu*(ctrl.x-base.x)+2*u*(tip.x-ctrl.x);ty=2*iu*(ctrl.y-base.y)+2*u*(tip.y-ctrl.y);
        const tl=Math.hypot(tx,ty)||1,nx=-ty/tl,ny=tx/tl;
        const w=(w1+(w0-w1)*Math.pow(iu,1.3))*(1+0.05*Math.sin(u*5-t*2.4+phase));
        left.push({x:x+nx*w,y:y+ny*w});right.push({x:x-nx*w,y:y-ny*w});
      }
      const shape=left.concat(right.slice().reverse()),tipAngle=Math.atan2(ty,tx);
      g.lineStyle(7,opts.glow??0x75f5c5,0.13*alpha);g.strokePoints(shape,true,true);
      g.fillStyle(opts.color??0x8ff6d2,0.72*alpha);g.fillPoints(shape,true,true);g.fillCircle(tip.x,tip.y,w1);
      g.lineStyle(1.7,0xeafff8,0.78*alpha);g.strokePoints(left,false,false);g.strokePoints(right,false,false);
      g.beginPath();g.arc(tip.x,tip.y,w1,tipAngle-Math.PI/2,tipAngle+Math.PI/2);g.strokePath();
      // brillo interno a lo largo del eje (citoplasma)
      g.fillStyle(0xf2fffa,0.32*alpha);
      for(let i=2;i<=n-2;i+=3){const a=left[i],b=right[i];g.fillCircle(a.x*0.62+b.x*0.38,a.y*0.62+b.y*0.38,Math.max(1.2,Math.hypot(a.x-b.x,a.y-b.y)*0.13));}
    }

    // Mira sobre el patógeno que los pseudópodos tienen "fijado": deja claro qué se va a englobar.
    drawPhagoLock(g,target,ready){
      const t=this.elapsed,r=Math.max(18,(target.visualSize||40)*0.42),spin=t*2.2;
      g.lineStyle(2.2,0x8fffd9,ready?0.95:0.55);
      for(let k=0;k<4;k++){const a=spin+k*Math.PI/2;g.beginPath();g.arc(target.x,target.y,r+4+Math.sin(t*6)*2,a,a+0.85);g.strokePath();}
      g.fillStyle(0x8fffd9,ready?0.12:0.06);g.fillCircle(target.x,target.y,r);
    }

    updatePhagoTendrils(dt=1/60){
      if(!this.phagoTendrils?.active)return;
      const g=this.phagoTendrils;g.clear();
      if(!this.activeSkills.has('phagocytosis'))return;
      dt=clamp(dt,0,0.05);
      const px=this.player.x,py=this.player.y,t=this.elapsed,R=(this.playerRadius||27)*0.72;
      // Hacia dónde avanza la célula (para los lóbulos en reposo), suavizado.
      if(this.pseudopodLast){const mx=px-this.pseudopodLast.x,my=py-this.pseudopodLast.y;if(mx*mx+my*my>0.04){const a=Math.atan2(my,mx);this.pseudopodFacing+=Math.atan2(Math.sin(a-this.pseudopodFacing),Math.cos(a-this.pseudopodFacing))*(1-Math.exp(-dt*4));}}
      else this.pseudopodFacing=-Math.PI/2;
      this.pseudopodLast={x:px,y:py};
      const engulf=this.phagoEngulf&&!this.phagoEngulf.target.dead?this.phagoEngulf:null;
      const reachRange=this.stats.phagoRadius+45,seekRange=reachRange+PHAGO_SEEK_RANGE;
      const target=engulf?engulf.target:this.closestEnemy(seekRange,e=>!e.isBoss&&e.phagoEligible&&e.sizeTier<=this.stats.phagoMaxTier);
      const ready=this.phagoClock<=0&&!this.phagoPending;
      const dist=target?Math.hypot(target.x-px,target.y-py):Infinity,inReach=!!engulf||dist<=reachRange;
      if(!this.pseudopods)this.pseudopods=[-1,1].map(side=>{const a=this.pseudopodFacing+side*0.9;return {side,ox:Math.cos(a)*(R+23),oy:Math.sin(a)*(R+23),vx:0,vy:0,ba:a};});
      const k=engulf?260:(target?(inReach?120:70):38),c=2*Math.sqrt(k)*(engulf?0.95:0.68);
      const ux=target?(target.x-px)/(dist||1):Math.cos(this.pseudopodFacing),uy=target?(target.y-py)/(dist||1):Math.sin(this.pseudopodFacing);
      const qx=-uy,qy=ux,tr=target?Math.max(10,(target.visualSize||40)*0.36):0;
      for(const p of this.pseudopods){
        const side=p.side;let gx,gy,bow;
        if(engulf){
          // se cierran por detrás del patógeno
          const e=engulf.p||0,rx=target.x-px,ry=target.y-py;
          gx=rx+ux*tr*(0.2+0.75*e)+qx*side*tr*(1.1*(1-e)+0.06);gy=ry+uy*tr*(0.2+0.75*e)+qy*side*tr*(1.1*(1-e)+0.06);bow=tr*(0.65-0.35*e);
        }else if(target&&inReach){
          // copa fagocítica: una punta a cada lado, un poco más allá del centro
          const rx=target.x-px,ry=target.y-py,b=0.92+0.08*Math.sin(t*2.6+side);
          gx=rx+ux*tr*0.18+qx*side*tr*1.15*b;gy=ry+uy*tr*0.18+qy*side*tr*1.15*b;bow=tr*0.6;
        }else if(target){
          // se estiran hacia el fagocitable a medida que se acerca
          const close=clamp(1-(dist-reachRange)/PHAGO_SEEK_RANGE,0,1),L=R+26+Math.max(0,Math.min(dist-tr,reachRange)-R-26)*close*0.85;
          gx=ux*L+qx*side*(7+5*close);gy=uy*L+qy*side*(7+5*close);bow=5+4*close;
        }else{
          // reposo: dos lóbulos cortos que respiran hacia donde avanza la célula
          const a=this.pseudopodFacing+side*(0.85+0.12*Math.sin(t*0.8+side*1.7)),L=R+23+3.5*Math.sin(t*1.25+side*2.1);
          gx=Math.cos(a)*L;gy=Math.sin(a)*L;bow=2.5;
        }
        p.vx+=(k*(gx-p.ox)-c*p.vx)*dt;p.vy+=(k*(gy-p.oy)-c*p.vy)*dt;
        p.ox+=p.vx*dt;p.oy+=p.vy*dt;
        // La base se apoya en la membrana del lado de su punta y se desliza despacio (no gira alrededor de la célula).
        const ta=Math.atan2(p.oy,p.ox)-side*0.12;
        p.ba+=Math.atan2(Math.sin(ta-p.ba),Math.cos(ta-p.ba))*(1-Math.exp(-dt*6));
        const base={x:px+Math.cos(p.ba)*R,y:py+Math.sin(p.ba)*R},tip={x:px+p.ox,y:py+p.oy};
        const cx=tip.x-base.x,cy=tip.y-base.y,cl=Math.hypot(cx,cy)||1;
        const ctrl={x:(base.x+tip.x)/2-cy/cl*side*bow,y:(base.y+tip.y)/2+cx/cl*side*bow};
        const len=Math.min(cl,140);
        this.drawPseudopod(g,base,ctrl,tip,{phase:side*1.7,baseWidth:clamp(7+len*0.09,8,13),tipWidth:engulf?5.4:4.6,alpha:engulf?1:(target?(inReach?(ready?1:0.82):0.78):0.6)});
      }
      if(target&&inReach&&!engulf){
        this.drawPhagoLock(g,target,ready);
        // Las primeras veces se nombra lo que pasa: el jugador aprende qué buscan los pseudópodos.
        if(this.phagoHintsLeft>0&&this.elapsed-(this.lastPhagoHintAt??-99)>4){
          this.lastPhagoHintAt=this.elapsed;this.phagoHintsLeft--;
          this.showFloatingText(target.x,target.y-(target.visualSize||40)*0.75,'FAGOCITABLE · ACERCATE','#a6ffe0',11);
        }
      }
    }

    doPhagocytosis() {
      if (!this.activeSkills.has('phagocytosis') || this.phagoClock > 0 || this.phagoPending) return;
      const target = this.closestEnemy(this.stats.phagoRadius + 23, e => !e.isBoss&&e.phagoEligible&&e.sizeTier<=this.stats.phagoMaxTier);
      if (!target) return;
      this.phagoClock=this.stats.phagoInterval;this.phagoPending=true;
      // El englobamiento lo dibujan los mismos dos pseudópodos (updatePhagoTendrils): se cierran detrás del blanco.
      this.phagoEngulf={target,p:0};
      const progress={value:0};
      this.tweens.add({targets:progress,value:1,duration:260,ease:'Sine.InOut',onUpdate:()=>{if(this.phagoEngulf)this.phagoEngulf.p=progress.value;},onComplete:()=>{
        this.phagoEngulf=null;this.phagoPending=false;
        if(!target.dead&&this.enemies.includes(target)&&this.distanceToEnemy(this.player,target)<=this.stats.phagoRadius+35){
          const ring=this.add.circle(target.x,target.y,5,0x8fffd9,0.20).setStrokeStyle(3,0xcaffed,1).setDepth(62);
          this.tweens.add({targets:ring,scale:4,alpha:0,duration:360,onComplete:()=>ring.destroy()});
          this.player.setScale(1.18);this.tweens.add({targets:this.player,scale:1,duration:220,ease:'Back.Out'});this.flashPlayerOutline(0x70ffc4,310);
          this.showFloatingText(target.x,target.y-24,'FAGOCITOSIS  +XP','#baffdf',13);this.showToast('FAGOCITOSIS: patógeno englobado');this.killEnemy(target,true);
          if(this.activeSkills.has('respiratory_burst')){const burstLevel=this.skillLevels.respiratory_burst||1,radius=95+burstLevel*17;this.burstEffect(target.x,target.y,0xffae68,radius);for(const e of this.enemies){if(!e.dead&&dist2(e,target)<radius*radius){this.damageEnemy(e,7+burstLevel*4,false);if(e.hp<=0)this.killEnemy(e,false);}}}
          if(this.stats.phagoHeal>0){const healAmount=this.stats.phagoHeal*this.stats.healingReceivedMultiplier,healed=Math.min(healAmount,this.stats.maxHealth-this.stats.health);this.stats.health=Math.min(this.stats.maxHealth,this.stats.health+healAmount);if(healed>0)this.showFloatingText(this.player.x,this.player.y-38,`+${Math.round(healed)} SALUD`,'#8dffd0',11);}
        }
      }});
    }

    openFocusEvolution() {
      if(this.questionPaused||this.gameEnded)return;
      this.questionPaused=true;this.tweens.pauseAll();
      const hasAlliedCells=this.activeSkills.has('tb_collaboration')||this.activeSkills.has('macrophage_activation');
      const pool=['phagocytosis','netosis','immunoregulation','differentiation','antibodies','complement','tb_collaboration','macrophage_activation','differential_profile','pattern','cytokines','polarization'].filter(id=>id==='polarization'?this.activeSkills.has('macrophage_activation'):id==='differential_profile'?hasAlliedCells:true);
      const candidates=pool.map(id=>{const upgrade=this.activeSkills.has(id);return {id:`${id}:${upgrade?'upgrade':'unlock'}`,skill:id,upgrade,level:upgrade?(this.skillLevels[id]||1)+1:1,label:this.skillOptionLabel(id,upgrade)};});
      const weighted=[...candidates.filter(o=>o.upgrade),...candidates.filter(o=>!o.upgrade)],selected=[];
      while(weighted.length&&selected.length<3){selected.push(weighted.splice(this.rng.integer(0,weighted.length-1),1)[0]);}
      this.pendingFocusOptions=selected;this.emit('is:focus-evolution',{options:selected});
    }

    skillOptionLabel(id,upgrade){
      const names={respiratory_burst:'Estallido respiratorio · mejora de fagocitosis',phagocytosis:'Fagocitosis',netosis:'NETosis',immunoregulation:'Inmunorregulación',differentiation:'Diferenciación celular',antibodies:'Secreción de anticuerpos',complement:'Activación del complemento',tb_collaboration:'Colaboración T‑B',macrophage_activation:'Activación de macrófagos',differential_profile:'Perfil diferencial',pattern:'Reconocimiento de patrones',cytokines:'Señalización por citocinas',polarization:'Polarización funcional'};
      const desc={respiratory_burst:'Cada fagocitosis libera un pulso de daño en área.',phagocytosis:'Englobá patógenos pequeños y recuperá recursos.',netosis:'Desplegá redes que dañan y frenan patógenos.',immunoregulation:'Un pulso periódico alcanza a todos los enemigos.',differentiation:'Encadená bajas de la misma familia para especializar daño.',antibodies:'Sumá proyectiles autónomos de anticuerpos.',complement:'Los impactos pueden encadenarse a otro agente cercano.',tb_collaboration:'Un linfocito B te sigue; más bajas suman células amigas.',macrophage_activation:'Convocá macrófagos que persiguen y atacan.',differential_profile:'Aumenta el daño de tus células amigas.',pattern:'Ganá potencia cuando se agrupan agentes de una familia.',cytokines:'Liberá proyectiles citocinéticos periódicos de bajo daño.',polarization:'Alterná el perfil de tus células amigas entre M1 y M2.'};
      const detail={respiratory_burst:'Aumenta el radio y daño del estallido al fagocitar.',phagocytosis:'Más radio, frecuencia y curación; la evolución avanzada habilita estallido respiratorio.',netosis:'Más redes simultáneas, radio, duración o daño.',immunoregulation:'Mayor daño global y menor intervalo entre pulsos.',differentiation:'Acumulación más rápida y mayor daño contra la familia encadenada.',antibodies:'Mejora daño, cadencia y luego cantidad de proyectiles.',complement:'Más probabilidad y alcance de cadenas.',tb_collaboration:'Más linfocitos B y mayor cadencia de anticuerpos.',macrophage_activation:'Más macrófagos, velocidad y daño de contacto.',differential_profile:'Amplifica exclusivamente el daño de las células amigas.',pattern:'Amplía el radio de reconocimiento y el beneficio por agrupación.',cytokines:'Mejora daño, velocidad y frecuencia de la descarga.',polarization:'M1 prioriza daño; M2 apoya curación y control.'};
      const next=(this.skillLevels[id]||0)+1;
      return {name:names[id]||id,desc:upgrade?this.skillEvolutionDelta(id,next):desc[id]};
    }

    skillEvolutionDelta(id,level){
      const s=this.stats,fmt=(n,d=0)=>Number(n).toLocaleString('es-AR',{maximumFractionDigits:d});
      const pct=(before,after)=>before?`${after<before?'−':'+'}${fmt(Math.abs((1-after/before)*100),0)}%`:'';
      const rows={
        phagocytosis:`Radio +9 (${fmt(s.phagoRadius)}→${fmt(s.phagoRadius+9)}); recarga −10% (${fmt(s.phagoInterval/1000,1)}→${fmt(Math.max(GAME_BALANCE.LIMITS.minimumPhagocytosisIntervalMs,s.phagoInterval*.90)/1000,1)} s)${level>=2?'; curación +1 por captura':''}${level>=3?' · habilita Estallido respiratorio':''}`,
        netosis:`Radio +10%; daño +2,2/pulso; recarga −10%; redes simultáneas +1${s.maxNetHelpers>=GAME_BALANCE.LIMITS.maximumNetHelpers?' (límite alcanzado)':''}`,
        immunoregulation:`Daño global +3 (${fmt(s.regulationDamage||4)}→${fmt((s.regulationDamage||4)+3)}); intervalo −12%`,
        differentiation:`Daño extra por baja en racha: ${fmt((this.differentiationBonus||.055)*(level-1)*100,1)}% → ${fmt(((this.differentiationBonus||.055)+.02)*level*100,1)}% (tope +90%)`,
        antibodies:`Daño +4 (${fmt(s.antibodyDamage||10)}→${fmt((s.antibodyDamage||10)+4)}); intervalo −15%${level>=2?`; +${(s.antibodyCount||2)<5?1:0} proyectil(es) (${fmt(s.antibodyCount||2)}→${fmt(Math.min(5,(s.antibodyCount||2)+((s.antibodyCount||2)<5?1:0)))})`:''}`,
        complement:`Probabilidad de cadena +7 puntos (${fmt((this.complementChance||.18)*100,0)}→${fmt(Math.min(.7,(this.complementChance||.18)+.07)*100,0)}%)`,
        tb_collaboration:`Capacidad de linfocitos B: ${fmt(Math.max(2,this.bCellCap||2))} → ${Math.min(8,Math.max(2,this.bCellCap||2)+1)} (+1 acompañante; máximo 8)`,
        macrophage_activation:`+1 macrófago acompañante (máximo 5)`,
        differential_profile:`Daño de células amigas +25 puntos porcentuales (${fmt((this.minionDamageBonus||.25)*100,0)}→${fmt(((this.minionDamageBonus||.25)+.25)*100,0)}%)`,
        pattern:`Radio de reconocimiento +45 (${fmt(this.patternRadius||220)}→${fmt((this.patternRadius||220)+45)} px) · daño por agente agrupado ${fmt(4.5*(level-1),1)}% → ${fmt(4.5*level,1)}% (tope +45%)`,
        cytokines:`Daño +3 (${fmt(s.cytokineDamage||6)}→${fmt((s.cytokineDamage||6)+3)}); intervalo −16%${level>=2?`; +${(s.cytokineCount||1)<4?1:0} proyectil(es) (${fmt(s.cytokineCount||1)}→${fmt(Math.min(4,(s.cytokineCount||1)+((s.cytokineCount||1)<4?1:0)))})`:''}`,
        polarization:`Cambio de perfil de las células amigas ${this.minionMode||'M1'}→${(this.minionMode||'M1')==='M1'?'M2':'M1'}`
      };
      return rows[id]||'Mejora funcional de esta habilidad';
    }

    formatAbilityCurrent(id){
      const s=this.stats,fmt=(n,d=0)=>Number(n||0).toLocaleString('es-AR',{maximumFractionDigits:d});
      const rows={granules:`Daño ${fmt(s.attackDamage)} por gránulo · cadencia ${fmt(1000/s.attackInterval,2)}/s · ${fmt(s.projectileCount)} proyectil(es) por descarga`,
        phagocytosis:`Radio ${fmt(s.phagoRadius)} px · recarga ${fmt(s.phagoInterval/1000,1)} s · curación ${fmt(s.phagoHeal)} PV`,
        netosis:`Radio ${fmt(s.netRadius)} px · daño ${fmt(s.netDamage,1)}/pulso · recarga ${fmt(s.netCooldown/1000,1)} s · ${fmt(s.maxNetHelpers)} redes simultáneas`,
        antibodies:`Daño ${fmt(s.antibodyDamage||10)} · cadencia ${fmt(1000/(s.antibodyInterval||1900),2)}/s · ${fmt(s.antibodyCount||2)} proyectil(es)`,
        complement:`Cadenas en ${fmt((this.complementChance||.18)*100,0)}% de los impactos · daño secundario 35% del gránulo`,
        immunoregulation:`Daño global ${fmt(s.regulationDamage||4)} · intervalo ${fmt((s.regulationInterval||15000)/1000,1)} s`,
        differentiation:`Daño extra por baja consecutiva ${fmt((this.differentiationBonus||.055)*100,1)}% por etapa`,
        tb_collaboration:`Hasta ${fmt(Math.max(2,this.bCellCap||2))} linfocitos B · 2 activos desde el desbloqueo · +1 cada 8 bajas hasta el límite`,
        macrophage_activation:`Hasta ${fmt(this.macrophageCap||1)} macrófago(s) · daño de contacto ${fmt(16+(this.skillLevels.macrophage_activation||1)*5)}`,
        differential_profile:`Daño de células amigas +${fmt((this.minionDamageBonus||.25)*100,0)}%`,
        pattern:`Radio ${fmt(this.patternRadius||220)} px · bonificación por agrupación ${fmt((this.patternCount||0)*4.5,0)}%`,
        cytokines:`Daño ${fmt(s.cytokineDamage||6)} · intervalo ${fmt((s.cytokineInterval||5400)/1000,1)} s · ${fmt(s.cytokineCount||1)} proyectil(es)`,
        polarization:`Células amigas · perfil ${this.minionMode||'M1'}: ${this.minionMode==='M2'?'apoyo y curación':'prioridad de daño'}`};
      return rows[id]||'';
    }

    getPathSkillPreview(strategy){
      return GAME_BALANCE.getActivePathEffects(this,strategy).map(effect=>({
        id:effect.ability,
        name:GAME_BALANCE.ABILITY_NAMES[effect.ability]||effect.ability,
        current:this.formatAbilityCurrent(effect.ability),
        change:effect.describe(this)
      }));
    }

    chooseFocusEvolution(optionId){
      const o=this.pendingFocusOptions?.find(x=>x.id===optionId);if(!o)return;
      if(!this.activeSkills.has(o.skill)){this.activeSkills.add(o.skill);this.skillLevels[o.skill]=1;this.upgradeHistory.push({time:fmtTime(this.elapsed),type:'Habilidad desbloqueada',name:this.skillOptionLabel(o.skill,false).name,detail:'Nuevo mecanismo activo'});this.showToast(`HABILIDAD DESBLOQUEADA · ${this.skillOptionLabel(o.skill,false).name}`);if(o.skill==='phagocytosis'){this.phagoHintsLeft=3;this.showToast('PSEUDÓPODOS · buscan patógenos con el ícono verde: acercate y los englobás');}}
      else {const nextLevel=(this.skillLevels[o.skill]||1)+1,delta=this.skillEvolutionDelta(o.skill,nextLevel);this.skillLevels[o.skill]=nextLevel;this.applySkillEvolution(o.skill,nextLevel);this.upgradeHistory.push({time:fmtTime(this.elapsed),type:'Evolución celular',name:this.skillOptionLabel(o.skill,true).name,detail:delta});this.showToast(`EVOLUCIÓN · ${this.skillOptionLabel(o.skill,true).name} · NIVEL ${this.skillLevels[o.skill]} · ${delta}`);}
      if(this.upgradeHistory.length>80)this.upgradeHistory.shift();
      
      this.pendingFocusOptions=null;this.questionPaused=false;this.tweens.resumeAll();this.emit('is:close-focus-evolution',{});this.updateHud();if(!this.debugMode&&this.xp>=this.xpNeed)this.openQuestion();
    }

    applySkillEvolution(id,level){
      const s=this.stats, n=level;
      if(id==='respiratory_burst'){this.activeSkills.add('respiratory_burst');this.skillLevels.respiratory_burst=n;}
      if(id==='phagocytosis'){s.phagoRadius+=9;s.phagoInterval=Math.max(GAME_BALANCE.LIMITS.minimumPhagocytosisIntervalMs,s.phagoInterval*.90);s.phagoHeal+=n>=2?1:0;if(n>=3){this.activeSkills.add('respiratory_burst');this.skillLevels.respiratory_burst=this.skillLevels.respiratory_burst||1;}}
      if(id==='netosis'){s.maxNetHelpers=Math.min(GAME_BALANCE.LIMITS.maximumNetHelpers,s.maxNetHelpers+1);s.netRadius*=1.10;s.netDamage+=2.2;s.netCooldown=Math.max(GAME_BALANCE.LIMITS.minimumNetCooldownMs,s.netCooldown*.90);}
      if(id==='antibodies'){s.antibodyDamage=(s.antibodyDamage||10)+4;s.antibodyInterval=Math.max(500,(s.antibodyInterval||1900)*.85);s.antibodyCount=Math.min(5,(s.antibodyCount||2)+(n>=2?1:0));}
      if(id==='immunoregulation'){s.regulationDamage=(s.regulationDamage||4)+3;s.regulationInterval=Math.max(5500,(s.regulationInterval||15000)*.88);}
      if(id==='differentiation')this.differentiationBonus=(this.differentiationBonus||.055)+.02;
      if(id==='complement')this.complementChance=Math.min(.7,(this.complementChance||.18)+.07);
      if(id==='tb_collaboration')GAME_BALANCE.increaseBCellCap(this);
      if(id==='macrophage_activation')this.macrophageCap=Math.min(5,(this.macrophageCap||1)+1);
      if(id==='differential_profile')this.minionDamageBonus=(this.minionDamageBonus||.25)+.25;
      if(id==='pattern')this.patternRadius=(this.patternRadius||220)+45;
      if(id==='cytokines'){s.cytokineDamage=(s.cytokineDamage||6)+3;s.cytokineInterval=Math.max(750,(s.cytokineInterval||5400)*.84);s.cytokineCount=Math.min(4,(s.cytokineCount||1)+(n>=2?1:0));}
    }

    spawnSkillShot(target,source,color,damage,speed=340,radius=6,origin=this.player){
      if(!target)return;
      const dx=target.x-origin.x,dy=target.y-origin.y,d=Math.hypot(dx,dy)||1;
      const obj=(source==='antibodies'||source==='minion'||source==='complement')?this.makeImmuneSprite(source==='antibodies'?'antibody':source==='minion'?'bcell':'complement',origin.x,origin.y,source==='minion'?.72:.62):this.add.circle(origin.x,origin.y,radius,color,1).setStrokeStyle(2,0xffffff,.86).setDepth(39);
      if(obj.setDepth)obj.setDepth(39);if(source==='antibodies')obj.setRotation(Math.atan2(dy,dx)+Math.PI/2);this.playerBullets.push({obj,vx:dx/d*speed,vy:dy/d*speed,damage,life:source==='antibodies'?5200:2600,radius,pierce:0,source,target:source==='antibodies'?(target.target||null):null,homing:source==='antibodies',latched:false});
    }

    updateSpecialSkills(dtMs,dt){
      const tick=(id,interval,fn)=>{this.skillTimers[id]=(this.skillTimers[id]||0)-dtMs;if(this.skillTimers[id]<=0){fn();this.skillTimers[id]=interval;}};
      if(this.activeSkills.has('immunoregulation'))tick('regulation',this.stats.regulationInterval||15000,()=>{this.flashPlayerOutline(0x72cfff,540);this.burstEffect(this.player.x,this.player.y,0x9cdbff,140);this.burstEffect(this.player.x,this.player.y,0x72cfff,92);this.showFloatingText(this.player.x,this.player.y-68,'PULSO REGULADOR','#b7e7ff',13);for(const e of this.enemies){if(!e.dead){this.damageEnemy(e,this.stats.regulationDamage||4,false);if(e.hp<=0)this.killEnemy(e,false);}}this.showFloatingText(this.player.x,this.player.y-52,'INMUNORREGULACIÓN','#a8ddff',10);});
      if(this.activeSkills.has('antibodies'))tick('antibodies',this.stats.antibodyInterval||1900,()=>{const t=this.closestAttackTarget(this.stats.attackRange+90);for(let i=0;i<(this.stats.antibodyCount||2);i++)this.spawnSkillShot(t,'antibodies',0xffdd82,this.stats.antibodyDamage||10,390,6);});
      if(this.activeSkills.has('cytokines'))tick('cytokines',this.stats.cytokineInterval||5400,()=>{const t=this.closestAttackTarget(this.stats.attackRange+150);for(let i=0;i<(this.stats.cytokineCount||1);i++)this.spawnSkillShot(t,'cytokines',0xa8f5db,this.stats.cytokineDamage||6,320,5);});
      if(this.activeSkills.has('tb_collaboration'))this.updateBMinions(dtMs,dt);
      if(this.activeSkills.has('macrophage_activation'))this.updateMacrophages(dtMs,dt);
      if(this.activeSkills.has('pattern')){const counts={};for(const e of this.enemies)if(!e.dead&&dist2(e,this.player)<(this.patternRadius||220)**2)counts[e.type]=(counts[e.type]||0)+1;const ranked=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];this.patternSpecies=ranked?.[0]||null;this.patternCount=ranked?.[1]||0;}
    }

    updateBMinions(dtMs,dt){
      const cap=Math.max(2,this.bCellCap||2),desired=Math.min(cap,2+Math.floor(this.kills/8));
      while(this.bMinions.length<desired){const i=this.bMinions.length,a=i*2.4,ob=this.makeImmuneSprite('bcell',this.player.x+Math.cos(a)*32,this.player.y+Math.sin(a)*32,.70);this.bMinions.push({obj:ob,angle:a,clock:0});}
      while(this.bMinions.length>desired)this.bMinions.pop().obj.destroy();
      for(let i=0;i<this.bMinions.length;i++){const m=this.bMinions[i];m.angle+=dt*(i%2?-.6:.6);m.obj.setPosition(this.player.x+Math.cos(m.angle)*76,this.player.y+Math.sin(m.angle)*64);m.clock-=dtMs;if(m.clock<=0){const target=this.closestAttackTarget(this.stats.attackRange+150);if(target)this.spawnSkillShot(target,'antibodies',0xffd875,7+(this.skillLevels.tb_collaboration||1)*2,340,5,m.obj);m.clock=Math.max(700,1750-(this.skillLevels.tb_collaboration||1)*150);}}
    }

    updateMacrophages(dtMs,dt){
      this.macrophageAttackSince??=this.elapsed;
      const cap=this.macrophageCap||1;while(this.macrophages.length<cap){const ob=this.makeImmuneSprite('macrophage',this.player.x,this.player.y,.9);this.macrophages.push({obj:ob,clock:0,dash:0,heading:this.rng.float(0,Math.PI*2),hitIds:new Set()});}
      while(this.macrophages.length>cap)this.macrophages.pop().obj.destroy();
      if(this.minionMode==='M2'){
        if(this.elapsed>=this.macrophageM2Until){this.minionMode='M1';this.macrophageM2Charge=0;this.macrophageAttackSince=this.elapsed;this.showToast('MACRÓFAGOS · PERFIL M1');this.burstEffect(this.player.x,this.player.y,0x71c6a0,34);}
        else{this.macrophageM2HealClock=(this.macrophageM2HealClock||0)-dtMs;for(let i=0;i<this.macrophages.length;i++){const m=this.macrophages[i];m.angle=(m.angle||i*Math.PI*2/this.macrophages.length)+dt*1.25;m.obj.setPosition(this.player.x+Math.cos(m.angle)*76,this.player.y+Math.sin(m.angle)*58);m.obj.setAlpha(.76+.18*Math.sin(this.elapsed*4+m.angle));}if(this.macrophageM2HealClock<=0){this.macrophageM2HealClock=850;this.stats.health=Math.min(this.stats.maxHealth,this.stats.health+Math.max(1,this.stats.maxHealth*.006));this.updateHud();this.burstEffect(this.player.x,this.player.y,0x86e5bf,23);}return;}
      }
      for(const m of this.macrophages){m.clock-=dtMs;m.dash=Math.max(0,m.dash-dtMs);let t=this.closestEnemy(440);if(!t){const a=this.elapsed*1.1+(m.heading||0);m.obj.setPosition(this.player.x+Math.cos(a)*48,this.player.y+Math.sin(a)*38);continue;}let dx=t.x-m.obj.x,dy=t.y-m.obj.y,d=Math.hypot(dx,dy)||1;if(m.dash>0){const q=this.constrainToArena(m.obj.x+Math.cos(m.heading)*330*dt,m.obj.y+Math.sin(m.heading)*330*dt,26);m.obj.setPosition(q.x,q.y);continue;}m.heading=Math.atan2(dy,dx);m.obj.x+=dx/d*210*dt;m.obj.y+=dy/d*210*dt;if(d<t.radius+20&&m.clock<=0){if(this.minionMode==='M2'){const heal=Math.min(2,this.stats.maxHealth-this.stats.health);this.stats.health+=heal;this.burstEffect(this.player.x,this.player.y,0x92e9c7,18);}else{this.damageEnemy(t,16+(this.skillLevels.macrophage_activation||1)*5,false,'minion');if(t.hp<=0)this.killEnemy(t,false);}this.burstEffect(m.obj.x,m.obj.y,0x91e0b5,20);m.dash=330;m.clock=500;m.heading+=this.rng.float(-.55,.55);}}
    }

    removeDebugSkill(id){
      this.activeSkills.delete(id);delete this.skillLevels[id];
      if(id==='netosis'){for(const h of this.helpers)h.obj?.destroy();this.helpers=[];for(const n of this.nets)n.obj?.destroy();this.nets=[];}
      if(id==='tb_collaboration'){for(const m of this.bMinions)m.obj?.destroy();this.bMinions=[];}
      if(id==='macrophage_activation'){for(const m of this.macrophages)m.obj?.destroy();this.macrophages=[];}
      const removeSources=new Set(id==='antibodies'?['antibodies']:id==='cytokines'?['cytokines']:[]);
      for(let i=this.playerBullets.length-1;i>=0;i--)if(removeSources.has(this.playerBullets[i].source)){this.playerBullets[i].obj?.destroy();this.playerBullets.splice(i,1);}
    }

    debugAction(action){
      if(!this.debugMode)return;
      if(action.startsWith('spawn-count:'))this.debugSpawnCount=clamp(Number(action.split(':')[1])||1,1,100);
      else if(action==='invincible'){this.debugInvincible=!this.debugInvincible;this.showToast(this.debugInvincible?'INMORTALIDAD ACTIVADA':'INMORTALIDAD DESACTIVADA');}
      else if(action==='granules'){this.activeSkills.has('granules')?this.activeSkills.delete('granules'):this.activeSkills.add('granules');}
      else if(action==='enemy')for(let i=0;i<(this.debugSpawnCount||1);i++)this.spawnEnemy(this.debugType==='mixed'?null:this.debugType||null,false);
      else if(action==='large')for(let i=0;i<(this.debugSpawnCount||1);i++)this.spawnEnemy(this.debugType==='mixed'?null:this.debugType||null,true);
      else if(action==='boss')this.spawnBoss();
      else if(action.startsWith('boss:'))this.spawnBossById(action.slice(5));
      else if(action==='focus')this.spawnColony();
      else if(action==='primary-menu'){
        this.questionPaused=true;
        this.pendingQuestionOutcome='correct';
        this.currentUpgrades=EVOLUTION_STRATEGIES;
        this.tweens.pauseAll();
        this.emit('is:upgrades',{upgrades:this.getEvolutionOptions(),noQuestion:true});
      }
      else if(action==='evolution-menu')this.openFocusEvolution();
      else if(action.startsWith('question:'))this.debugOpenQuestion(action.slice(9));
      else if(action==='spawn-count')this.debugSpawnCount=clamp(Number(action.split(':')[1])||1,1,100);
      else if(action==='heal'){this.stats.health=this.stats.maxHealth;this.updateHud();}
      else if(action==='clear'){for(const e of [...this.enemies])this.killEnemy(e,false);}
      else if(action==='pause')this.pauseGame();
      else if(action.startsWith('skill:')){const [,id,op]=action.split(':');if(op==='remove')this.removeDebugSkill(id);else LAB_ACTIONS.changeSkillLevel(this,id,op);this.updateHud();this.emit('is:debug-status',{skills:[...this.activeSkills],levels:this.skillLevels});}
      else if(action.startsWith('stat:')){const [,key,dir]=action.split(':');const steps={attackDamage:3,attackInterval:-70,moveSpeed:18,maxHealth:20,xpPickupRadius:20,projectileCount:1,projectilePierce:1,phagoHeal:1,netDamage:1};const n=steps[key]||1;this.stats[key]=Math.max(key==='attackInterval'?160:key==='maxHealth'?10:0,(this.stats[key]||0)+n*(dir==='down'?-1:1));if(key==='health')this.stats.health=clamp(this.stats.health,1,this.stats.maxHealth);if(key==='maxHealth')this.stats.health=Math.min(this.stats.maxHealth,this.stats.health);this.updateHud();}
      else if(action.startsWith('type:'))this.debugType=action.slice(5);
      else if(action.startsWith('skillstat:')){const [,key,dir]=action.split(':');const step={phagoRadius:8,phagoInterval:-80,phagoHeal:1,netRadius:10,netCooldown:-500,netDamage:1,netDuration:500,antibodyDamage:2,antibodyInterval:-150,antibodyCount:1,complementChance:.05,macrophageCap:1,bCellCap:1,regulationDamage:1,regulationInterval:-800,cytokineDamage:1,cytokineInterval:-300,patternRadius:15,differentiationBonus:.02}[key]||1;const minimum=key.toLowerCase().includes('interval')||key.toLowerCase().includes('cooldown')?500:0;LAB_ACTIONS.changeSkillStat(this,key,dir,step,minimum);this.updateHud();this.emit('is:debug-status',{skills:[...this.activeSkills],levels:this.skillLevels});}
    }

    createXpTexture() {
      if(this.textures.exists('xp_dna'))return;
      const g=this.make.graphics({x:0,y:0,add:false});
      g.lineStyle(4,0x7cf1cb,1);g.beginPath();
      for(let i=0;i<=12;i++){const y=5+i*3,x=24+Math.sin(i/12*Math.PI*2)*7;if(i===0)g.moveTo(x,y);else g.lineTo(x,y);}g.strokePath();
      g.lineStyle(4,0x63cce0,1);g.beginPath();
      for(let i=0;i<=12;i++){const y=5+i*3,x=24-Math.sin(i/12*Math.PI*2)*7;if(i===0)g.moveTo(x,y);else g.lineTo(x,y);}g.strokePath();
      g.lineStyle(2,0xd4fff1,0.9);for(let i=1;i<7;i++){const y=5+i*6,x=24+Math.sin(i/6*Math.PI*2)*7;g.lineBetween(x,y,48-x,y);}
      g.generateTexture('xp_dna',48,48);g.destroy();
    }

    showFloatingText(x,y,text,color='#ffffff',size=13) {
      this.floatingTexts=this.floatingTexts.filter(item=>item?.active);
      if(this.floatingTexts.length>=this.maxFloatingTexts)return;
      const t=this.sharpText(x,y,text,{fontFamily:'system-ui,sans-serif',fontSize:`${size}px`,fontStyle:'bold',color,stroke:'#08111d',strokeThickness:3}).setOrigin(0.5).setDepth(90);
      this.floatingTexts.push(t);
      this.tweens.add({targets:t,y:y-28,alpha:0,duration:760,ease:'Cubic.Out',onComplete:()=>{this.floatingTexts=this.floatingTexts.filter(item=>item!==t);t.destroy();}});
    }

    showToast(text) {
      if (!this.hudToast) return;
      const duration=4.0;
      const priority=/^(HOMEOSTASIS|DESGRANULACIÓN|QUIMIOTAXIS|SUPERVIVENCIA|ATAQUE|AGILIDAD|Colonia saneada)/.test(text);
      if(this.elapsed<this.toastUntil){
        if(this.hudToast.text===text||this.toastQueue.includes(text))return;
        if(priority){this.hudToast.setText(text).setAlpha(1);this.toastUntil=this.elapsed+duration;return;}
        if(this.toastQueue.length>=3)this.toastQueue.shift();
        this.toastQueue.push(text);return;
      }
      this.hudToast.setText(text).setAlpha(1);this.toastUntil=this.elapsed+duration;
      this.tweens.add({targets:this.hudToast,scale:1,duration:180,ease:'Back.Out'});
    }

    updateEvolutionAppearance() {
      const defense=this.stats.defenseLevel||0, agility=this.stats.agilityLevel||0;
      this.player.setScale(Math.min(1.22,1+defense*0.035+agility*0.014));
      const outline=agility?0x80caff:defense?0x63e6bd:0xa8ffe0;
      this.playerOutline.setStrokeStyle(2.6+Math.min(2,defense*0.3),outline,0.98);
      this.playerHalo.setStrokeStyle(2+Math.min(2,agility*0.25),agility?0x80caff:defense?0x63e6bd:this.theme.accent,0.58);
      this.playerHalo.setRadius(35+Math.min(12,defense*2));
    }

    constrainToArena(x,y,padding=24) {
      const dx=x-CENTER, dy=y-CENTER, d=Math.hypot(dx,dy), max=ARENA_RADIUS-padding;
      if (d<=max || d===0) return {x,y};
      return {x:CENTER+dx/d*max,y:CENTER+dy/d*max};
    }

    update(time, delta) {
      if (this.gameEnded || this.questionPaused || this.manualPaused || this.ui.isHidden()) return;
      const dtMs=Math.min(delta,42), dt=dtMs/1000;
      this.elapsed+=dt;
      this.invulnerable=Math.max(0,this.invulnerable-dtMs); this.phagoClock=Math.max(0,this.phagoClock-dtMs);
      this.attackClock-=dtMs; this.netClock-=dtMs;
      this.directorPressure+=(this.getBuildPressure()-this.directorPressure)*Math.min(1,dt*0.20);

      let dx=0,dy=0;
      if(this.keys.A?.isDown||this.keys.LEFT?.isDown)dx-=1;
      if(this.keys.D?.isDown||this.keys.RIGHT?.isDown)dx+=1;
      if(this.keys.W?.isDown||this.keys.UP?.isDown)dy-=1;
      if(this.keys.S?.isDown||this.keys.DOWN?.isDown)dy+=1;
      if(dx===0&&dy===0&&this.joyActive){dx=this.joyVector.x;dy=this.joyVector.y;}
      if(dx===0&&dy===0&&this.mouseSteer){
        const pointer=this.input.activePointer;
        if(pointer?.isDown&&pointer.positionToCamera){
          // positionToCamera usa el scroll actual: sigue funcionando aunque el mouse no se mueva y la cámara sí.
          const target=pointer.positionToCamera(this.cameras.main),mx=target.x-this.player.x,my=target.y-this.player.y,md=Math.hypot(mx,my);
          if(md>14){dx=mx/md;dy=my/md;}
        }else this.mouseSteer=false;
      }
      const len=Math.hypot(dx,dy);if(len>1){dx/=len;dy/=len;}
      const speedNow=this.stats.moveSpeed*this.playerSpeedFactor(),next=this.constrainToArena(this.player.x+dx*speedNow*dt,this.player.y+dy*speedNow*dt,this.playerRadius+10);
      this.player.setPosition(next.x,next.y);
      this.playerTrailClock-=dtMs;
      if(this.stats.agilityLevel>0&&len>0.15&&this.playerTrailClock<=0){
        this.playerTrailClock=Math.max(75,190-this.stats.agilityLevel*18);
        const trail=this.add.circle(this.player.x-dx*13,this.player.y-dy*13,9+this.stats.agilityLevel,0x80caff,0.38).setStrokeStyle(1.5,0xc4efff,0.72).setDepth(23);
        this.tweens.add({targets:trail,scale:0.22,alpha:0,duration:370,onComplete:()=>trail.destroy()});
      }
      this.playerHealthBar.setPosition(this.player.x, this.player.y);
      this.player.rotation+=(dx*0.38-this.player.rotation)*Math.min(1,dt*3);
      this.playerHalo.setPosition(this.player.x,this.player.y).setScale(1+Math.sin(this.elapsed*3)*0.05).setAlpha(this.colonyShelter?0.24:0.045);
      this.playerOutline.setPosition(this.player.x,this.player.y);
      this.phagoAura.setPosition(this.player.x,this.player.y).setRadius(this.stats.phagoRadius+18).setVisible(this.activeSkills.has('phagocytosis')).setAlpha(this.phagoClock<80?0.44:0.20);
      this.updatePhagoTendrils(dt);
      this.xpMagnetAura.setPosition(this.player.x,this.player.y).setRadius(this.stats.xpPickupRadius).setVisible(this.stats.xpPickupRadius>82);
      this.playerHurtGlow.setPosition(this.player.x,this.player.y).setAlpha(this.invulnerable>0?0.65:0);
      this.joystickClock -= dtMs;
      if(this.joystickClock <= 0){ this.joystickClock = 55; this.drawJoystick(); }
      if(this.toastUntil>0&&this.elapsed>=this.toastUntil){
        if(this.toastQueue.length){this.hudToast.setText(this.toastQueue.shift()).setAlpha(1);this.toastUntil=this.elapsed+4.0;}
        else{this.hudToast.setAlpha(0);this.toastUntil=0;}
      }
      this.updateColonies(dtMs,dt);
      this.updateAmbientLayers();

      // Gameplay difficulty rises with survival time. Quiz difficulty does not affect combat.
      if(!this.debugMode)this.updateProgressionMilestones();
      if(!this.debugMode){this.bossClock-=dtMs;if(this.bossClock<=0){this.spawnBoss();this.bossClock=this.multiResistance?28000:240000;}
      if(this.multiResistance){this.resistanceBossClock-=dtMs;if(this.resistanceBossClock<=0){this.spawnBoss();if(this.rng.next()<0.42)this.spawnBoss();this.resistanceBossClock=34000;}}
      this.waveClock-=dtMs;if(this.waveClock<=0){const baseWave=this.multiResistance?Math.min(34,12+Math.floor((this.elapsed-this.multiResistanceAt)/18)):Math.min(12,3+Math.floor(this.elapsed/90)+Math.floor(this.directorPressure*1.2));const wave=Math.max(2,Math.round(baseWave*this.infectionDiff.waves));for(let i=0;i<wave;i++)this.spawnEnemy(null,i<Math.floor(wave/3));this.waveClock=(this.multiResistance?Math.max(9500,19000-(this.elapsed-this.multiResistanceAt)*8):Math.max(44000,68000-this.elapsed*12))*this.infectionDiff.spawn;this.showToast(this.multiResistance?`MULTIRRESISTENCIA · BROTE ${wave}×`:`BROTE ${wave}× · oleada mixta`);}}
      const interval = Math.max(this.multiResistance?180:470, (1380 - this.elapsed * 2.75)/(1+this.directorPressure*0.20)*(this.multiResistance?0.47:1)*this.infectionDiff.spawn);
      if(!this.debugMode)this.spawnClock += dtMs;
      if (!this.debugMode&&this.spawnClock >= interval) {
        this.spawnClock -= interval;
        const count = this.multiResistance?Math.min(10,5+Math.floor((this.elapsed-this.multiResistanceAt)/70)):Math.min(4,(this.elapsed < 55 ? 1 : this.elapsed < 145 ? 2 : 3)+Math.floor(this.directorPressure*0.72));
        for (let i=0; i<count; i++) this.spawnEnemy();
      }
      if(this.attackClock<=0){const target=this.closestAttackTarget(this.stats.attackRange);if(target){this.spawnPlayerProjectile(target);this.attackClock=this.stats.attackInterval;}else this.attackClock=Math.min(this.attackClock,85);}
      if(this.activeSkills.has('netosis')&&this.netClock<=0&&this.helpers.length<this.stats.maxNetHelpers){this.spawnNetHelper();this.netClock=this.stats.netCooldown;}
      this.updateBullets(dtMs);
      if(this.questionPaused||this.gameEnded)return;
      this.updateXpDrops(dtMs,dt);if(this.questionPaused||this.gameEnded)return;
      this.doPhagocytosis();if(this.questionPaused||this.gameEnded)return;
      this.updateEnemies(dtMs,dt);if(this.questionPaused||this.gameEnded)return;
      this.updateBiofilm(dtMs);if(this.questionPaused||this.gameEnded)return;
      this.updateHelpers(dtMs,dt);this.updateNets(dtMs,dt);this.updateSpecialSkills(dtMs,dt);
      this.hudClock -= dtMs;
      if(this.hudClock <= 0){ this.hudClock = 140; this.updateHud(); }
      if(this.stats.health<=0)this.finishGame();
    }

    updateBullets(dtMs) {
      const dt=dtMs/1000;
      for(let i=this.playerBullets.length-1;i>=0;i--){
        const b=this.playerBullets[i];b.life-=dtMs;
        if(b.source==='antibodies'&&b.homing&&!b.latched){
          if(!b.target||b.target.dead){b.target=this.closestEnemy(950);if(b.target?.target)b.target=b.target.target;}
          if(b.target&&!b.target.dead){const tx=b.target.x,ty=b.target.y,dx=tx-b.obj.x,dy=ty-b.obj.y,d=Math.hypot(dx,dy)||1,desired=Math.atan2(dy,dx),current=Math.atan2(b.vy,b.vx),turn=wrapAngle(desired-current);const a=current+clamp(turn,-5.5*dt,5.5*dt),speed=430;b.vx=Math.cos(a)*speed;b.vy=Math.sin(a)*speed;b.obj.rotation=a+Math.PI/2;}
        }
        b.obj.x+=b.vx*dt;b.obj.y+=b.vy*dt;
        const sporeIndex=this.enemyProjectiles.findIndex(p=>p.kind==='spore'&&dist2(b.obj,p.obj)<(b.radius+p.radius)**2);
        if(sporeIndex>=0){const spore=this.enemyProjectiles[sporeIndex],sx=b.obj.x,sy=b.obj.y;spore.hp-=1;this.burstEffect(spore.obj.x,spore.obj.y,0xc8ff52,17);spore.obj.destroy();this.enemyProjectiles.splice(sporeIndex,1);b.obj.destroy();this.playerBullets.splice(i,1);this.showFloatingText(sx,sy,'ESPORA ROTA','#d7ff84',10);continue;}
        let hit=null;for(const e of this.enemies){if(!e.dead&&this.projectileHitsEnemy(b,e)){hit=e;break;}}
        if(hit){if(b.source==='antibodies'){this.attachAntibody(hit,b);this.burstEffect(b.obj.x,b.obj.y,0xffdf91,14);b.obj.destroy();this.playerBullets.splice(i,1);continue;}this.burstEffect(b.obj.x,b.obj.y,hit.color||0x9df2ce,11);this.damageEnemy(hit,b.damage,true,b.source||'player');if(this.activeSkills.has('complement')&&this.rng.next()<(this.complementChance||.18)){const near=this.enemies.filter(e=>e!==hit&&!e.dead&&dist2(e,hit)<125*125).sort((a,b)=>dist2(a,hit)-dist2(b,hit))[0];if(near){this.makeImmuneSprite('complement',near.x,near.y,.72);this.burstEffect(near.x,near.y,0x9de8ff,24);this.damageEnemy(near,b.damage*.35,false,b.source||'player');if(near.hp<=0)this.killEnemy(near,false);}}if(hit.hp<=0)this.killEnemy(hit,false);if(b.pierce>0){b.pierce--;b.damage*=0.78;}else{b.obj.destroy();this.playerBullets.splice(i,1);}if(this.questionPaused)return;}
        else if(b.life<=0||dist2(b.obj,this.player)>800*800){this.fadeOutProjectile(b);this.playerBullets.splice(i,1);}
      }
      for(let i=this.enemyProjectiles.length-1;i>=0;i--){
        const b=this.enemyProjectiles[i];b.life-=dtMs;
        if(b.homing){const desired=Math.atan2(this.player.y-b.obj.y,this.player.x-b.obj.x),current=Math.atan2(b.vy,b.vx),angle=current+clampAngle(wrapAngle(desired-current),1.25*dt),speed=Math.hypot(b.vx,b.vy);b.vx=Math.cos(angle)*speed;b.vy=Math.sin(angle)*speed;b.obj.rotation=angle+Math.PI/2;}
        b.obj.x+=b.vx*dt;b.obj.y+=b.vy*dt;
        if(b.landAt){
          if(Math.hypot(b.landAt.x-b.obj.x,b.landAt.y-b.obj.y)<Math.hypot(b.vx,b.vy)*dt+4||b.life<=0){this.spawnHazard(b.obj.x,b.obj.y,b.landMine);this.fadeOutProjectile(b,140);this.enemyProjectiles.splice(i,1);}
          continue;
        }
        if(dist2(b.obj,this.player)<(this.playerRadius+b.radius)**2){this.damagePlayer(b.damage);this.fadeOutProjectile(b,110);this.enemyProjectiles.splice(i,1);}
        else if(b.life<=0||dist2(b.obj,this.player)>900*900){this.fadeOutProjectile(b);this.enemyProjectiles.splice(i,1);}
      }
    }

    // Los proyectiles que vencen o impactan se desvanecen (achicándose y siguiendo un poco su trayectoria)
    // en vez de desaparecer de golpe. Ya salieron de la lista: no dañan ni chocan durante el fundido.
    fadeOutProjectile(b,ms=240){
      const o=b.obj;if(!o?.active)return;
      this.tweens.add({targets:o,alpha:0,scaleX:(o.scaleX||1)*0.55,scaleY:(o.scaleY||1)*0.55,x:o.x+(b.vx||0)*ms/2000,y:o.y+(b.vy||0)*ms/2000,duration:ms,ease:'Quad.Out',onComplete:()=>o.destroy()});
    }

    attachAntibody(e,bullet){
      if(!e.antibodyDots)e.antibodyDots=[];
      const angle=Math.atan2(-bullet.vy,-bullet.vx),level=this.skillLevels.antibodies||1;
      let dot=e.antibodyDots.find(d=>d.angle===angle);
      if(!dot){const obj=this.makeImmuneSprite('antibody',e.x,e.y,.38);dot={obj,angle,life:0,tick:0};e.antibodyDots.push(dot);}
      dot.life=5200+level*1500;dot.tick=430;dot.angle=Math.atan2(bullet.obj.y-e.y,bullet.obj.x-e.x);
      const offset=Math.max(8,e.radius*.82);dot.obj.setPosition(e.x+Math.cos(angle)*offset,e.y+Math.sin(angle)*offset).setDepth(39);
    }

    spawnXpDrop(x,y,amount) {
      if(amount<=0)return;
      if(this.xpDrops.length>=this.maxXpDrops){
        let nearest=this.xpDrops[0],best=Infinity;for(const drop of this.xpDrops){const d=dist2(drop,{x,y});if(d<best){best=d;nearest=drop;}}
        if(nearest){nearest.amount+=amount;nearest.life=Math.max(nearest.life,18000);nearest.obj.setDisplaySize(Math.min(42,nearest.size*2.5+Math.sqrt(nearest.amount)*0.25),Math.min(42,nearest.size*2.5+Math.sqrt(nearest.amount)*0.25));return;}
      }
      const size=9+Math.min(13,Math.sqrt(amount)*0.9),obj=this.add.image(x,y,'xp_dna').setDisplaySize(size*2.8,size*2.8).setDepth(57);
      this.xpDrops.push({x,y,obj,amount,size,baseSize:size*2.8,baseScale:size*2.8/48,phase:this.rng.float(0,Math.PI*2),pulseClock:0,life:30000,collected:false});
    }

    updateXpDrops(dtMs,dt) {
      const devourer=this.enemies.find(e=>e.isBoss&&e.morphology.id==='helminto-colosal'&&!e.dead);
      for(let i=this.xpDrops.length-1;i>=0;i--){
        const drop=this.xpDrops[i];if(drop.collected)continue;
        drop.life-=dtMs;drop.pulseClock-=dtMs;if(drop.pulseClock<=0){drop.pulseClock=120;drop.obj.setScale(drop.baseScale*(1+Math.sin(this.elapsed*3.2+drop.phase)*0.045));}
        if(devourer&&!drop.parasitized&&this.distanceToEnemy({x:drop.x,y:drop.y},devourer)<drop.size+18){const stolen=drop.amount*0.32;drop.amount-=stolen;drop.parasitized=true;devourer.hp=Math.min(devourer.maxHp,devourer.hp+stolen*0.18);this.showFloatingText(drop.x,drop.y-16,'ADN PARASITADO −32%','#ff9cb8',10);this.showEnemyHealthBar(devourer);}
        const dx=this.player.x-drop.x,dy=this.player.y-drop.y,d=Math.hypot(dx,dy)||1;
        if(d<=this.stats.xpPickupRadius){
          const speed=180+260*(1-d/this.stats.xpPickupRadius),step=Math.min(d, speed*dt);
          drop.x+=dx/d*step;drop.y+=dy/d*step;drop.obj.setPosition(drop.x,drop.y);
        }
        if(d<=this.playerRadius+drop.size+4){
          this.xp+=drop.amount;drop.collected=true;drop.obj.destroy();
          this.burstEffect(this.player.x,this.player.y,0x82ffda,18);
          this.showFloatingText(this.player.x,this.player.y-40,`+${Math.round(drop.amount)} XP`,'#aaffdf',12);
          this.updateHud();
        }else if(drop.life<=0){
          drop.obj.destroy();drop.collected=true;
        }
        if(this.xpDrops[i]===drop&&drop.collected)this.xpDrops.splice(i,1);
      }
      if(this.xp>=this.xpNeed)this.openQuestion();
    }

    spawnColony() {
      if(this.colonies.length>=2)return;
      let p=this.debugMode?this.constrainToArena(this.player.x+90,this.player.y,115):this.randomPointInArena(115);
      if(!this.debugMode)for(let i=0;i<12&&Math.hypot(p.x-this.player.x,p.y-this.player.y)<250;i++)p=this.randomPointInArena(115);
      const art={bacteriana:{key:'focus_bacterial',name:'BACTERIANO',color:0x65f0c0},viral:{key:'focus_viral',name:'VIRAL',color:0x72cfff},fungica:{key:'focus_fungal',name:'MICÓTICO',color:0xc5a0ff},parasitaria:{key:'focus_parasitic',name:'PARASITARIO',color:0xffa5bb}}[this.modo?({bacteria:'bacteriana',virus:'viral',fungus:'fungica',parasite:'parasitaria'})[this.pickEnemyType()]:this.settings.infection]||{key:'focus_bacterial',name:'BACTERIANO',color:0x65f0c0};
      const safeZone=this.add.circle(p.x,p.y,71,art.color,0.035).setStrokeStyle(2,art.color,0.78).setDepth(7);
      const graphic=this.add.graphics().setDepth(10);
      const core=this.add.image(p.x,p.y,art.key).setDisplaySize(144,144).setDepth(9);
      const safeLabel=this.sharpText(p.x,p.y-79,'ZONA SEGURA',{fontFamily:'system-ui',fontSize:'10px',fontStyle:'bold',color:'#eafff4',backgroundColor:'#075542eF',padding:{x:7,y:4},stroke:'#052b29',strokeThickness:2}).setOrigin(0.5).setDepth(11);
      const label=this.sharpText(p.x,p.y+76,`FOCO ${art.name} · PISÁ PARA SANAR`,{fontFamily:'system-ui',fontSize:'9px',fontStyle:'bold',color:'#f1fff9',backgroundColor:'#071321eF',padding:{x:7,y:4},stroke:'#071321',strokeThickness:2}).setOrigin(0.5).setDepth(11);
      const colony={x:p.x,y:p.y,life:65000,graphic,core,label,safeLabel,safeZone,color:art.color,progress:0};this.colonies.push(colony);
      this.showToast('Nuevo foco infeccioso · pisá el centro para sanarlo automáticamente');
    }

    updateColonies(dtMs,dt) {
      if(!this.debugMode){this.colonyClock-=dtMs;if(this.colonyClock<=0){this.spawnColony();this.colonyClock=52000;}}
      let nearest=null,nearDist=Infinity;
      for(const c of this.colonies){c.life-=dtMs;const pulse=0.5+0.5*Math.sin(this.elapsed*3+c.x*0.01);c.safeZone.setAlpha(0.12+pulse*0.14);c.core.setPosition(c.x,c.y);const d=Math.hypot(c.x-this.player.x,c.y-this.player.y);if(d<nearDist){nearDist=d;nearest=c;}}
      const interacting=!!nearest&&nearDist<72;this.colonyShelter=interacting;
      if(interacting){nearest.progress+=dtMs;this.colonyProgress=nearest.progress/1400;nearest.graphic.clear();nearest.graphic.lineStyle(7,0x062b2b,0.92);nearest.graphic.beginPath();nearest.graphic.arc(nearest.x,nearest.y,68,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.min(1,this.colonyProgress),false);nearest.graphic.strokePath();nearest.graphic.lineStyle(4,0xcaffdf,1);nearest.graphic.beginPath();nearest.graphic.arc(nearest.x,nearest.y,68,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.min(1,this.colonyProgress),false);nearest.graphic.strokePath();}
      else {if(nearest)nearest.progress=Math.max(0,nearest.progress-dtMs*0.7);this.colonyProgress=0;}
      if(nearest&&nearest.progress>=1400){const c=nearest;this.fociHealed++;const heal=Math.round(18*this.stats.healingReceivedMultiplier);this.stats.health=Math.min(this.stats.maxHealth,this.stats.health+heal);this.xp+=Math.ceil(this.xpNeed*0.32);this.kills+=0;this.burstEffect(c.x,c.y,0x59ffc2,64);c.graphic.destroy();c.core.destroy();c.label.destroy();c.safeLabel.destroy();c.safeZone.destroy();this.colonies=this.colonies.filter(v=>v!==c);this.showToast(`Colonia saneada · +${heal} salud · +32% de experiencia`);this.updateHud();this.openFocusEvolution();return;}
      for(const c of [...this.colonies])if(!this.debugMode&&c.life<=0){const amount=Math.min(13,5+Math.floor(this.elapsed/85)+Math.floor(this.directorPressure*2))*this.infectionDiff.waves|0;this.focusBreaches++;this.burstEffect(c.x,c.y,0xff6589,72);c.graphic.destroy();c.core.destroy();c.label.destroy();c.safeLabel.destroy();c.safeZone.destroy();this.colonies=this.colonies.filter(v=>v!==c);for(let i=0;i<amount;i++){const a=this.rng.float(0,Math.PI*2),d=this.rng.float(45,190);this.spawnEnemy(null,i<Math.floor(amount/4),{x:c.x+Math.cos(a)*d,y:c.y+Math.sin(a)*d});}this.cameras.main.shake(180,0.0025);this.showToast(`Foco desatendido · brote de ${amount} patógenos`);}
      this.updateFocusArrow();
    }

    updateFocusArrow() {
      if(!this.focusArrow?.active||!this.bossArrow?.active)return;
      const view=this.cameras.main.worldView;
      const boss=this.enemies.filter(e=>e.isBoss&&!e.dead&&!view.contains(e.x,e.y)).sort((a,b)=>Math.hypot(a.x-this.player.x,a.y-this.player.y)-Math.hypot(b.x-this.player.x,b.y-this.player.y))[0]||null;
      const colony=this.colonies.filter(c=>c.core?.active&&!view.contains(c.x,c.y)).sort((a,b)=>Math.hypot(a.x-this.player.x,a.y-this.player.y)-Math.hypot(b.x-this.player.x,b.y-this.player.y))[0]||null;
      this.drawEdgeMarker(this.focusArrow,this.focusArrowLabel,colony,'focus',boss?-38:0);
      this.drawEdgeMarker(this.bossArrow,this.bossArrowLabel,boss,'boss',colony?38:0);
    }

    drawEdgeMarker(graphic,label,target,kind,offset=0) {
      graphic.clear();if(!target){label.setVisible(false);return;}
      const dx=target.x-this.player.x,dy=target.y-this.player.y,angle=Math.atan2(dy,dx),margin=30;
      const sx=W/2+Math.cos(angle)*(W/2-margin)-Math.sin(angle)*offset,sy=H/2+Math.sin(angle)*(H/2-margin)+Math.cos(angle)*offset;
      const x=clamp(sx,margin,W-margin),y=clamp(sy,Math.max(99,margin),H-margin),a=Math.atan2(y-H/2,x-W/2);
      const phase=this.elapsed*5.6+(kind==='boss'?1.45:0),pulse=0.76+0.24*(0.5+0.5*Math.sin(phase));
      const bob=Math.sin(phase*0.7)*3,ax=x+Math.cos(a)*bob,ay=y+Math.sin(a)*bob;
      const boss=kind==='boss',fill=boss?0xff365e:0x27e6a7,stroke=boss?0xffcf68:0x9bffe1;
      graphic.lineStyle(3,stroke,0.26*pulse);graphic.strokeCircle(ax,ay,31+Math.sin(phase)*5);
      graphic.fillStyle(boss?0x6b142d:0x07523f,0.88);graphic.fillCircle(ax,ay,24);
      const tip=28,back=22,wing=0.82;
      const pts=[[ax+Math.cos(a)*tip,ay+Math.sin(a)*tip],[ax+Math.cos(a+Math.PI-wing)*back,ay+Math.sin(a+Math.PI-wing)*back],[ax+Math.cos(a+Math.PI+wing)*back,ay+Math.sin(a+Math.PI+wing)*back]];
      graphic.lineStyle(9,0x101322,0.94);graphic.beginPath();graphic.moveTo(pts[0][0]+1,pts[0][1]+2);graphic.lineTo(pts[1][0]+1,pts[1][1]+2);graphic.lineTo(pts[2][0]+1,pts[2][1]+2);graphic.closePath();graphic.strokePath();
      graphic.fillStyle(fill,0.96);graphic.lineStyle(4,0xf5fff8,pulse);graphic.beginPath();graphic.moveTo(...pts[0]);graphic.lineTo(...pts[1]);graphic.lineTo(...pts[2]);graphic.closePath();graphic.fillPath();graphic.strokePath();
      label.setPosition(clamp(ax-Math.cos(a)*48,52,W-52),clamp(ay-Math.sin(a)*48,103,H-26)).setText(`${boss?'JEFE':'FOCO'} · ${Math.round(Math.hypot(dx,dy))}`).setVisible(true).setAlpha(0.86+pulse*0.14);
    }

    damageEnemy(e, amount, showNumber = true, source = 'player') {
      if(!e||e.dead)return;
      let dealt=amount;
      if(this.activeSkills.has('differentiation')&&this.differentiationSpecies===e.type)dealt*=1+Math.min(.9,this.differentiationStreak*(this.differentiationBonus||.055)*(this.skillLevels.differentiation||1));
      if(this.activeSkills.has('pattern')&&this.patternSpecies===e.type)dealt*=1+Math.min(.45,(this.patternCount||0)*.045*(this.skillLevels.pattern||1));
      if(source==='minion'&&this.activeSkills.has('differential_profile'))dealt*=1+(this.minionDamageBonus||.25);
      if(e.mech){
        if(this.elapsed<e.mech.invulnUntil){if(this.elapsed-(e.mech.lastImmuneText??-9)>0.8){e.mech.lastImmuneText=this.elapsed;this.showFloatingText(e.x,e.y-e.visualSize*0.4,'INMUNE','#ffffff',11);}return;}
        dealt*=e.mech.damageTaken;
        if(e.mech.shield>0){
          const absorbed=Math.min(e.mech.shield,dealt);e.mech.shield-=absorbed;dealt-=absorbed;
          if(e.mech.shield<=0&&e.mech.phase==='capsula')this.releaseCapsule(e,true);
        }
      }
      e.hp-=dealt;e.hitFlash=155;
      if(e.outlineSprite?.active)e.outlineSprite.setTint(0xffedb1).setAlpha(1);
      if(!e.isWorm){ e.obj.setTintFill(0xfff0b5); e.obj.setScale(e.visualScale*1.07); e.tintActive=true; }
      else this.drawWorm(e);
      this.showEnemyHealthBar(e);
      this.damageTotal+=Math.max(0,dealt);
      const textGap=e.isBoss?0.18:0.38;
      if(showNumber&&(this.elapsed-(e.lastDamageTextAt??-Infinity)>=textGap)){e.lastDamageTextAt=this.elapsed;this.showFloatingText(e.x,e.y-(e.isWorm?e.wormWidth:e.radius)-10,`${Math.round(dealt)}`,'#fff3cb',10);}
    }

    updateEnemies(dtMs,dt) {
      for(const e of this.enemies){
        if(e.dead)continue;
        if(e.antibodyDots?.length){for(let i=e.antibodyDots.length-1;i>=0;i--){const d=e.antibodyDots[i];d.life-=dtMs;d.tick-=dtMs;const offset=Math.max(8,e.radius*.82);d.obj.setPosition(e.x+Math.cos(d.angle)*offset,e.y+Math.sin(d.angle)*offset);if(d.tick<=0){d.tick=430;this.damageEnemy(e,(this.stats.antibodyDamage||10)*0.42,false,'antibodies');if(e.hp<=0)this.killEnemy(e,false);}if(d.life<=0){d.obj.destroy();e.antibodyDots.splice(i,1);}}}
        if(e.stationary&&e.stationaryAnchor){e.x=e.stationaryAnchor.x;e.y=e.stationaryAnchor.y;}
        const dx=this.player.x-e.x,dy=this.player.y-e.y,d=Math.hypot(dx,dy)||1;
        const gait=1+Math.sin(this.elapsed*e.animFrequency+e.animPhase)*e.animSquash;
        e.speedNow=e.speed*gait*(e.mechSpeed??1);
        if(e.mechanic&&e.spawnGrace<=0)this.updateBossMechanic(e,dtMs,dt,dx,dy,d);
        if(e.type==='parasite') this.updateParasite(e,dt,dtMs,dx,dy,d);
        else if(e.type==='fungus'){
          if(!e.stationary&&d>145){e.x+=dx/d*e.speedNow*dt;e.y+=dy/d*e.speedNow*dt;}
          if(e.isBoss&&!e.mechanic){e.bossAttackClock-=dtMs;if(e.bossAttackClock<=0){for(let i=0;i<(this.multiResistance?5:3);i++)this.spawnBossSpore(e);e.bossAttackClock=this.multiResistance?1850:2850;this.showFloatingText(e.x,e.y-e.visualSize*0.50,'LIBERACIÓN DE CONIDIOS','#dcff7e',11);}}
          else{e.sporeCooldown-=dtMs;if(e.sporeCooldown<=0&&d<340&&this.enemyProjectiles.length<12){this.spawnEnemyProjectile(e);e.sporeCooldown=Math.max(1150,2600-this.elapsed*1.6);this.showFloatingText(e.x,e.y-e.radius-8,'ESPORAS','#c8ff9c',10);}}
        }else if(e.type==='virus'){
          const weave=Math.sin(this.elapsed*3.4+(e.x*0.01))*0.26;
          e.x+=(dx/d+(-dy/d)*weave)*e.speedNow*dt;e.y+=(dy/d+(dx/d)*weave)*e.speedNow*dt;
          if(e.isBoss&&!e.mechanic){e.bossAttackClock-=dtMs;if(e.bossAttackClock<=0){this.spawnVirusMinions(e);e.bossAttackClock=this.multiResistance?7200:10200;}}
        }else{
          const weave=Math.sin(this.elapsed*2.3+e.x*0.013)*0.08;
          e.x+=(dx/d+(-dy/d)*weave)*e.speedNow*dt;e.y+=(dy/d+(dx/d)*weave)*e.speedNow*dt;
          if(e.isBoss&&e.type==='bacteria'&&!e.mechanic){e.biofilmClock-=dtMs;if(e.biofilmClock<=0){this.leaveBiofilm(e);e.biofilmClock=this.multiResistance?1050:1550;}}
        }
        const bounded=this.constrainToArena(e.x,e.y,e.isWorm?e.wormWidth+8:e.radius+4);e.x=bounded.x;e.y=bounded.y;
        if(e.hitFlash>0)e.hitFlash=Math.max(0,e.hitFlash-dtMs);
      }

      // Spatial crowd correction runs at 12.5 Hz instead of every frame.
      this.repulsionClock -= dtMs;
      if(this.repulsionClock <= 0){ this.repulsionClock = 80; this.separateEnemies(); }

      for(const e of this.enemies){
        if(e.dead)continue;
        const gait=1+Math.sin(this.elapsed*e.animFrequency+e.animPhase)*e.animSquash;
        if(e.isWorm){
          e.wormRenderClock -= dtMs;
          if(e.wormRenderClock <= 0){
            e.wormRenderClock = 36;
            if(e.trail.length)e.trail[0]={x:e.x,y:e.y};
            this.drawWorm(e);
          }
        }else{
          e.animBob=Math.sin(this.elapsed*e.animFrequency+e.animPhase)*2.2;
          e.obj.setPosition(e.x,e.y+e.animBob);
          // Animación por familia (todo con senos sobre el tiempo: sin tweens ni texturas extra por enemigo).
          const ph=this.elapsed*e.animFrequency+e.animPhase;
          let pulse=1;
          if(e.spawnAge<1){e.spawnAge=Math.min(1,e.spawnAge+dtMs/340);pulse*=Math.max(0.05,easeOutBack(e.spawnAge));}
          if(e.type==='virus'){
            if(!e.isBoss)e.obj.rotation+=dt*(0.35+0.25*Math.sin(ph*0.4));
            pulse*=1+Math.sin(ph*1.7)*0.06; // la cápside "late"
          }else if(e.type==='parasite'){
            // Protozoos: avanzan ondulando hacia los lados de su rumbo.
            e.obj.rotation=e.heading+(e.morphology.id==='giardia'?Math.PI/2:e.morphology.id==='trypanosome'?Math.PI*0.75:0)+Math.sin(ph*1.3)*0.16;
          }else{
            if(!e.isBoss){
              const targetAngle=Math.atan2(this.player.y-e.y,this.player.x-e.x);
              e.faceRot=(e.faceRot??e.obj.rotation)+wrapAngle(targetAngle-(e.faceRot??e.obj.rotation))*Math.min(1,dt*1.8);
              e.obj.rotation=e.faceRot+Math.sin(ph*0.9)*(e.type==='bacteria'?0.12:0.07); // tambaleo
            }
            if(e.type==='fungus'){
              pulse*=1+Math.sin(ph*0.5)*0.045; // respiración lenta
              if(!e.isBoss&&e.sporeCooldown<450)pulse*=1+0.16*(1-Math.max(0,e.sporeCooldown)/450); // se hincha antes de soltar esporas
            }
          }
          if(e.isBoss)pulse*=(1+Math.sin(this.elapsed*1.8)*0.03)*(e.mech?.pulse||1);
          if(e.hitFlash<=0&&!e.tintActive)e.obj.setScale(e.visualScale*(1+Math.max(0,gait-1))*pulse,e.visualScale*(1-Math.max(0,gait-1)*0.55)*pulse);
          if(e.outlineSprite?.active){e.outlineSprite.setPosition(e.x,e.y+e.animBob).setRotation(e.obj.rotation).setScale(e.obj.scaleX,e.obj.scaleY).setTint(e.hitFlash>0?0xffedb1:e.healthOutlineColor).setAlpha(e.hitFlash>0?1:0.88);}
        }
      if(e.phagoMarker?.active){
          const eligible=this.activeSkills.has('phagocytosis')&&e.phagoEligible&&e.sizeTier<=this.stats.phagoMaxTier;
          const frame=((this.elapsed*2)|0)%2?'phago_mark_2':'phago_mark_1';
          const inReach=eligible&&dist2(e,this.player)<(this.stats.phagoRadius+45)**2;e.phagoMarker.setVisible(eligible).setDisplaySize(inReach?42:32,inReach?42:32).setAlpha(inReach?1:0.60+0.20*Math.sin(this.elapsed*1.6+e.animPhase)).setPosition(e.x,e.y-e.visualSize*0.62+e.animBob+Math.sin(this.elapsed*4+e.animPhase)*2);
          if(eligible&&e.phagoMarker.texture.key!==frame)e.phagoMarker.setTexture(frame);
        }
        if(e.bossRing?.active)e.bossRing.setPosition(e.x,e.y).setScale(1+Math.sin(this.elapsed*3.4)*0.035).setAlpha(0.58+Math.sin(this.elapsed*3.4)*0.20);
        if(e.mech)this.renderBossMechanic(e);
        if(e.bossLabel?.active)e.bossLabel.setPosition(e.x,e.y-e.visualSize*0.72);
        if (e.healthBar?.active) e.healthBar.setPosition(e.x, e.y);
        const healthRatio=clamp(e.hp/e.maxHp,0,1),healthBand=healthRatio>0.66?3:healthRatio>0.33?2:1;
        if(healthBand!==e.healthOutlineBand){
          e.healthOutlineBand=healthBand;
          e.healthOutlineColor=healthBand===3?0x55f0ba:healthBand===2?0xffc857:0xff5578;
          if(e.outlineSprite?.active)e.outlineSprite.setTint(e.healthOutlineColor);
          if(e.isWorm)this.drawWorm(e);
        }
        if(e.outlineSprite?.active)e.outlineSprite.setTint(e.hitFlash>0?0xfff2bb:e.healthOutlineColor).setAlpha(e.hitFlash>0?1:0.88);
        if(e.hitFlash<=0 && e.tintActive && !e.isWorm){ e.obj.clearTint(); e.obj.setScale(e.visualScale); e.tintActive=false; }
        if(e.spawnGrace>0)e.spawnGrace-=dtMs;
        else if(this.enemyTouchesPlayer(e)&&this.invulnerable<=0){
          const dx=this.player.x-e.x,dy=this.player.y-e.y,d=Math.hypot(dx,dy)||1;
          const contactDamage=(e.isBoss&&e.morphology?.id==='helminto-colosal')?Math.min(e.damage,Math.max(12,this.stats.maxHealth*0.22)):e.damage;
          this.damagePlayer(contactDamage);
          const k=this.constrainToArena(this.player.x+dx/d*12,this.player.y+dy/d*12,this.playerRadius+10);this.player.setPosition(k.x,k.y);
        }
      }
      this.enemies=this.enemies.filter(e=>!e.dead);
    }

    separateEnemies() {
      for(let i=0;i<this.enemies.length;i++){
        const a=this.enemies[i];if(a.dead)continue;
        for(let j=i+1;j<this.enemies.length;j++){
          const b=this.enemies[j];if(b.dead)continue;
          let dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);
          const fasterCanPass=Math.max(a.speedNow||a.speed,b.speedNow||b.speed)>Math.min(a.speedNow||a.speed,b.speedNow||b.speed)*1.25;
          const minDist=(a.radius+b.radius)*(fasterCanPass?0.28:(a.isBoss||b.isBoss||a.isWorm||b.isWorm?0.56:0.74));
          if(d>=minDist)continue;
          if(d<0.01){const ang=((i*37+j*19)%360)*Math.PI/180;dx=Math.cos(ang);dy=Math.sin(ang);d=1;}
          const push=Math.min(fasterCanPass?1.2:4,(minDist-d)*(fasterCanPass?0.08:0.20)),nx=dx/d,ny=dy/d;
          a.x-=nx*push;a.y-=ny*push;b.x+=nx*push;b.y+=ny*push;
        }
      }
      for(const e of this.enemies){
        if(e.dead)continue;
        if(e.stationary&&e.stationaryAnchor){e.x=e.stationaryAnchor.x;e.y=e.stationaryAnchor.y;}
        const p=this.constrainToArena(e.x,e.y,e.isWorm?e.wormWidth+8:e.radius+4);e.x=p.x;e.y=p.y;
        if(e.isWorm&&e.trail.length)e.trail[0]={x:e.x,y:e.y};
      }
    }

    updateParasite(e,dt,dtMs,dx,dy,d) {
      if(!e.isWorm&&!e.isBoss){e.wanderClock-=dtMs;if(e.wanderClock<=0){e.heading+=this.rng.float(-0.72,0.72);e.wanderClock=this.rng.float(700,1950);}}
      // Parasites drift along a preferred heading. They can approach the player, but turn gradually.
        if(e.isWorm){
          let desired=e.heading;
          if(d<880)desired=Math.atan2(dy,dx);
          // Jefe gusano: embiste en línea recta (casi sin girar, así se pasa de largo), se aleja y acecha antes
          // de volver a embestir. Antes giraba siempre hacia el jugador y terminaba orbitándolo.
          let bossTurn=1.3,bossAccel=0.34,bossMax=1.95;
          if(e.isBoss){
            const c=e.charge||(e.charge={phase:'acecho',t:1.2,announced:false});c.t-=dt;
            if(c.phase==='acecho'){
              desired=Math.atan2(dy,dx);bossTurn=2.4;bossAccel=-0.9;bossMax=0.7;
              if(!c.announced){c.announced=true;this.showFloatingText(e.x,e.y-60,'SE PREPARA PARA EMBESTIR','#ffb0c8',11);}
              if(c.t<=0&&Math.abs(wrapAngle(desired-e.heading))<0.35){c.phase='embestida';c.t=2.6;c.lock=desired;}
            }else if(c.phase==='embestida'){
              desired=c.lock;bossTurn=0.22;bossAccel=1.6;bossMax=2.5;
              const passed=(dx*Math.cos(e.heading)+dy*Math.sin(e.heading))<0&&d>240;
              if(c.t<=0||passed){c.phase='retirada';c.t=3.2;}
            }else{
              desired=Math.atan2(-dy,-dx);bossTurn=1.1;bossAccel=0.2;bossMax=1.25;
              if(c.t<=0||d>760){c.phase='acecho';c.t=0.9;c.announced=false;}
            }
          }
          const fromCenter=Math.hypot(e.x-CENTER,e.y-CENTER);
          if(fromCenter>ARENA_RADIUS-310&&!(e.isBoss&&e.charge?.phase==='acecho'))desired=Math.atan2(CENTER-e.y,CENTER-e.x);
          const difference=wrapAngle(desired-e.heading),turnLoad=clamp(Math.abs(difference)/1.55,0,1);
          if(this.elapsed<e.wormEntryUntil)e.wormMomentum=0.38;
          const turnRate=e.isBoss?bossTurn:clamp(0.82/(0.58+e.wormMomentum*0.82),0.30,0.86);
          e.heading+=clampAngle(difference,turnRate*dt);
          e.wormMomentum=clamp(e.wormMomentum+(e.isBoss?bossAccel:0.22-turnLoad*0.68)*dt,0.38,e.isBoss?bossMax:1.55);
          e.speedNow=e.speed*e.wormMomentum;
          const wave=Math.sin(this.elapsed*5.1+e.animPhase)*0.10;
          e.x+=(Math.cos(e.heading)-Math.sin(e.heading)*wave)*e.speedNow*dt;
          e.y+=(Math.sin(e.heading)+Math.cos(e.heading)*wave)*e.speedNow*dt;
          if(e.trail.length){e.trail[0].x=e.x;e.trail[0].y=e.y;const followStep=Math.max(95,e.speedNow*1.18)*dt,spacing=e.trailStep*0.88;
            for(let i=1;i<e.trail.length;i++){const lead=e.trail[i-1],segment=e.trail[i],sx=lead.x-segment.x,sy=lead.y-segment.y,sd=Math.hypot(sx,sy)||0.001,excess=Math.max(0,sd-spacing);if(excess>0.02){const move=Math.min(excess,followStep);segment.x+=sx/sd*move;segment.y+=sy/sd*move;}}
          }
          return;
        }
        if(d<500||e.isBoss){const desired=Math.atan2(dy,dx),difference=wrapAngle(desired-e.heading);e.heading+=clampAngle(difference,0.72*dt);}
      const fromCenter=Math.hypot(e.x-CENTER,e.y-CENTER);
      if(fromCenter>ARENA_RADIUS-(e.isWorm?190:90)){const inward=Math.atan2(CENTER-e.y,CENTER-e.x);e.heading+=clampAngle(wrapAngle(inward-e.heading),1.25*dt);}
      const wiggle=Math.sin(this.elapsed*(e.isWorm?3.3:2.1)+e.x*0.018)*(e.isWorm?0.18:0.06);
      e.x+=(Math.cos(e.heading)-Math.sin(e.heading)*wiggle)*(e.speedNow??e.speed)*dt;
      e.y+=(Math.sin(e.heading)+Math.cos(e.heading)*wiggle)*(e.speedNow??e.speed)*dt;
    }

    drawWorm(e) {
      if (!e?.obj?.active || !e.trail || e.trail.length < 2) return;
      const g = e.obj; g.clear();
      const pts = e.trail;
      const outline = e.hitFlash > 0 ? 0xfff5c4 : (e.healthOutlineColor||0x29123f);
      const body = e.hitFlash > 0 ? 0xffd3df : (e.morphology.color || 0xf34298);
      const highlight = e.hitFlash > 0 ? 0xffffff : 0xffb5d7;
      const baseR = e.wormWidth * 0.59;
      // Closely spaced round segments overlap into one continuous silhouette.
      // Tres pasadas: todos los bordes, después todos los cuerpos y por último los brillos. Así el contorno queda
      // solo en la silueta (antes cada segmento dibujaba su borde encima del cuerpo del anterior).
      const radius = i => baseR * (0.72 + 0.28 * (1 - i / (pts.length - 1)));
      g.fillStyle(outline, 1);
      for (let i = pts.length - 1; i >= 0; i--) g.fillCircle(pts[i].x, pts[i].y, radius(i) + 2.6);
      g.fillStyle(body, 1);
      for (let i = pts.length - 1; i >= 0; i--) g.fillCircle(pts[i].x, pts[i].y, radius(i));
      g.fillStyle(highlight, 0.72);
      for (let i = pts.length - 1; i >= 0; i -= 2) { const r = radius(i); g.fillCircle(pts[i].x - r*0.22, pts[i].y - r*0.28, Math.max(2,r*0.24)); }
      const headSource=e.headSprite;
      if(headSource?.active){
        headSource.setPosition(e.x,e.y).setRotation(e.heading+Math.PI/2);
        if(e.hitFlash>0)headSource.setTintFill(0xfff0b5);else headSource.clearTint();
      }
      // Distinct transverse bands make the cestode read as a chain; nematodes stay smoothly tapered.
      if(e.morphology.wormKind==='cestode')for(let i=5;i<pts.length-1;i+=8){const p=pts[i],a=pts[i-1],b=pts[i+1],d=Math.hypot(b.x-a.x,b.y-a.y)||1,nx=-(b.y-a.y)/d,ny=(b.x-a.x)/d;g.lineStyle(Math.max(2,e.wormWidth*0.12),0xa9436e,0.9);g.lineBetween(p.x-nx*e.wormWidth*0.45,p.y-ny*e.wormWidth*0.45,p.x+nx*e.wormWidth*0.45,p.y+ny*e.wormWidth*0.45);}
    }

    damagePlayer(amount) {
      if(this.invulnerable>0||this.gameEnded||(this.debugMode&&this.debugInvincible))return;
      const actual=amount*(this.colonyShelter?0.55:1)*(1-Math.min(0.28,this.stats.defenseLevel*0.035));
      this.stats.health-=actual;this.invulnerable=this.stats.dodgeWindow||620;
      this.player.setAlpha(0.42);this.playerHurtGlow.setAlpha(0.82);this.flashPlayerOutline(0xff5578,420);this.cameras.main.shake(135,0.004);
      this.showFloatingText(this.player.x,this.player.y-40,`−${Math.round(actual)}`,'#ff8298',15);
      this.time.delayedCall(115,()=>{if(this.player?.active&&!this.gameEnded)this.player.setAlpha(1);});
      this.time.delayedCall(450,()=>{if(this.playerHurtGlow?.active&&!this.gameEnded)this.playerHurtGlow.setAlpha(0.14);});
      this.updateHud();if(this.stats.health<=0)this.finishGame();
    }

    killEnemy(e,phagocytosed) {
      if(!e||e.dead)return;e.dead=true;
      if(e.agente&&this.speciesLog?.[e.agente])this.speciesLog[e.agente].eliminados++;
      if(e.antibodyDots)for(const dot of e.antibodyDots)dot.obj?.destroy();
      if(e.outlineSprite?.active)e.outlineSprite.destroy();if(e.healthBar?.active)e.healthBar.destroy();
      if(e.phagoMarker?.active)e.phagoMarker.destroy();if(e.bossRing?.active)e.bossRing.destroy();if(e.mechRing?.active)e.mechRing.destroy();
      if(e.bossLabel?.active)this.tweens.add({targets:e.bossLabel,alpha:0,y:e.bossLabel.y-18,duration:190,onComplete:()=>e.bossLabel?.destroy()});
      this.kills+=1;if(this.activeSkills.has('macrophage_activation')&&this.activeSkills.has('polarization')&&this.minionMode==='M1'){this.macrophageM2Charge=(this.macrophageM2Charge||0)+1;const requiredKills=Math.min(180,Math.round(34+this.elapsed*0.11));const attackDuration=this.elapsed-(this.macrophageAttackSince??0);if(this.macrophageM2Charge>=requiredKills&&attackDuration>=90){this.minionMode='M2';this.macrophageM2Until=this.elapsed+24;this.macrophageM2HealClock=0;this.showToast(`POLARIZACIÓN M2 · ${requiredKills} BAJAS / 90 s`);this.burstEffect(this.player.x,this.player.y,0x80caff,58);}}if(e.isBoss){this.bossKills++;this.defeatedBossIds.add(e.morphology?.id||'');}this.activeEnemyCount=Math.max(0,this.activeEnemyCount-1);
      if(this.activeSkills.has('differentiation')){if(this.differentiationSpecies===e.type)this.differentiationStreak++;else{this.differentiationSpecies=e.type;this.differentiationStreak=1;}if(this.differentiationStreak%4===0)this.showFloatingText(this.player.x,this.player.y-56,`ADAPTACIÓN ${e.type.toUpperCase()} ×${this.differentiationStreak}`,'#ffc8ff',10);}
      const base=e.isBoss?160+Math.max(0,this.bossCount-1)*80:(phagocytosed?27:12), gain=Math.ceil(base*this.stats.xpMultiplier);
      const instantXp=gain*0.25;this.xp+=instantXp;this.spawnXpDrop(e.x,e.y,gain*0.75);
      const color=e.morphology?.color || (e.type==='bacteria'?0xffc96e:e.type==='virus'?0xb69cff:e.type==='fungus'?0x72cf91:0xff91a9);
      this.burstEffect(e.x,e.y,color,e.sizeTier===2?34:23);
      const pop=this.add.circle(e.x,e.y,Math.max(5,e.radius*0.24),color,0.72).setStrokeStyle(2,color,0.95).setDepth(63);
      this.tweens.add({targets:pop,scale:2.6,alpha:0,duration:230,ease:'Cubic.Out',onComplete:()=>pop.destroy()});
      if(e.isWorm){
        this.tweens.add({targets:e.obj,alpha:0,duration:240,ease:'Quad.Out',onComplete:()=>e.obj?.destroy()});
        if(e.headSprite?.active)this.tweens.add({targets:e.headSprite,scale:e.headSprite.scale*1.28,alpha:0,duration:210,ease:'Back.Out',onComplete:()=>e.headSprite?.destroy()});
      }else if(e.obj?.active){
        e.obj.clearTint();this.tweens.add({targets:e.obj,scale:e.visualScale*1.3,alpha:0,angle:e.obj.angle+18,duration:185,ease:'Back.Out',onComplete:()=>e.obj?.destroy()});
      }
      if(this.stats.blastRadius>0&&this.burstDepth<3){this.burstDepth++;this.burstEffect(e.x,e.y,0xffb54a,this.stats.blastRadius);for(const other of this.enemies){if(other!==e&&!other.dead&&dist2(e,other)<this.stats.blastRadius**2){this.damageEnemy(other,this.stats.blastDamage,false);if(other.hp<=0)this.killEnemy(other,false);}}this.burstDepth--;}
      this.showFloatingText(e.x,e.y-12,`+${Math.round(instantXp)} XP`,'#baffdf',10);
      for(const net of this.nets)if(net.active&&this.distanceToEnemy(net,e)<net.radius)net.kills+=1;
      if(this.xp>=this.xpNeed)this.openQuestion();this.updateHud();
    }

    burstEffect(x,y,color,radius) {
      // A single expanding ring plus two tiny particles keeps feedback crisp without spawning a swarm of tweens.
      const ring=this.add.circle(x,y,4,color,0.16).setStrokeStyle(2,color,0.92).setDepth(60);
      this.tweens.add({targets:ring,scale:Math.max(1.5,radius/4),alpha:0,duration:260,ease:'Cubic.Out',onComplete:()=>ring.destroy()});
      const particleCount=this.lowPerformanceDevice?0:1;
      for(let i=0;i<particleCount;i++){
        const a=this.rng.float(0,Math.PI*2),d=this.rng.integer(5,Math.max(8,Math.floor(radius*0.48)));
        const p=this.add.circle(x,y,2.1,color,0.9).setDepth(61);
        this.tweens.add({targets:p,x:x+Math.cos(a)*d,y:y+Math.sin(a)*d,alpha:0,duration:190,onComplete:()=>p.destroy()});
      }
    }

    spawnNetHelper() {
      // NETosis helper cells bud from the player, then rush toward the nearest pathogen.
      const a=this.rng.float(0,Math.PI*2), distance=this.playerRadius+13;
      const p={x:this.player.x+Math.cos(a)*distance,y:this.player.y+Math.sin(a)*distance};
      const obj=this.makeCell(p.x,p.y,0.82,true).setDepth(35);
      this.helpers.push({x:p.x,y:p.y,obj,life:this.stats.netHelperDuration,speed:190,dead:false});
      this.burstEffect(p.x,p.y,0xff65ae,24);
      this.flashPlayerOutline(0xff7fbd,220);
    }

    updateHelpers(dtMs,dt) {
      for(const h of this.helpers){if(h.dead)continue;h.life-=dtMs;let target=null,best=Infinity;
        for(const e of this.enemies){if(!e.dead){const d=dist2(h,e);if(d<best){best=d;target=e;}}}
        if(!target)target=this.player;
        const dx=target.x-h.x,dy=target.y-h.y,d=Math.hypot(dx,dy)||1;
        h.x+=dx/d*h.speed*dt;h.y+=dy/d*h.speed*dt;h.obj.setPosition(h.x,h.y);
        if(target!==this.player&&d<target.radius+14){this.deployNet(h.x,h.y);h.dead=true;h.obj.destroy();}
        else if(h.life<=0){this.deployNet(h.x,h.y);h.dead=true;h.obj.destroy();}
      }
      this.helpers=this.helpers.filter(h=>!h.dead);
    }

    deployNet(x,y) {
      const radius=this.stats.netRadius,g=this.add.graphics().setDepth(18);
      g.lineStyle(2, this.theme.accent,0.62);g.strokeCircle(x,y,radius);g.lineStyle(1.4,this.theme.accent,0.35);
      for(let i=0;i<10;i++){const a=i*Math.PI/5;g.lineBetween(x+Math.cos(a)*8,y+Math.sin(a)*8,x+Math.cos(a)*radius,y+Math.sin(a)*radius);}
      g.strokeCircle(x,y,radius*0.52);
      g.fillStyle(this.theme.accent,0.075);g.fillCircle(x,y,radius);
      const net={x,y,obj:g,radius,life:this.stats.netDuration,tick:0,kills:0,active:true};this.nets.push(net);
      this.burstEffect(x,y,this.theme.accent,radius*0.35);this.showToast('NETosis: red extracelular desplegada');
    }

    updateNets(dtMs,dt) {
      for(const net of this.nets){if(!net.active)continue;net.life-=dtMs;net.tick-=dtMs;net.obj.setAlpha(0.58+Math.sin(this.elapsed*6)*0.15);
        if(net.tick<=0){net.tick=this.stats.netTickInterval;for(const e of this.enemies){if(!e.dead&&this.distanceToEnemy(net,e)<net.radius){this.damageEnemy(e,this.stats.netDamage,false);if(e.hp<=0)this.killEnemy(e,false);if(this.questionPaused)return;}}}
        if(net.life<=0||net.kills>=8){net.active=false;net.obj.destroy();}
      }
      this.nets=this.nets.filter(n=>n.active);
    }

    selectUnusedQuestion() {
      const category=this.evolutionDiff.category;
      const candidates=QUESTION_BANK.filter(q=>!this.usedQuestionIds.has(q.id)&&q.difficulty===category);
      if(!candidates.length)return null;
      const topics=[...new Set(candidates.map(q=>q.topic))];
      const leastSeen=Math.min(...topics.map(topic=>this.questionTopicCounts[topic]||0));
      let balanced=topics.filter(topic=>(this.questionTopicCounts[topic]||0)===leastSeen);
      if(balanced.length>1&&balanced.includes(this.lastQuestionTopic))balanced=balanced.filter(topic=>topic!==this.lastQuestionTopic);
      return randomItem(this.rng,candidates.filter(q=>balanced.includes(q.topic)));
    }

    getEvolutionOptions() {
      return EVOLUTION_STRATEGIES.map(strategy=>{
        const count=this.evolutionCounts[strategy.id]||0,advancedNow=(count+1)%3===0;
        const basic=GAME_BALANCE.pickPathUpgrade(this,strategy.basics,count),elite=GAME_BALANCE.pickPathUpgrade(this,strategy.advanced,Math.floor(count/3));
        const details=this.getPathSkillPreview(strategy.id);
        return {id:strategy.id,name:strategy.name,role:strategy.role,icon:strategy.icon,color:strategy.color,progress:count%3,affects:details.map(d=>d.name),affectDetails:details,
          nextName:advancedNow?elite.name:basic.name,nextDesc:advancedNow?elite.desc:basic.desc,
          nextLevel:advancedNow?'EVOLUCIÓN AVANZADA':'MEJORA DE PARÁMETRO',
          hint:advancedNow?'Esta elección completa tres mejoras de esta vía y añade una evolución avanzada.':'Cada tercera elección de esta vía suma una evolución avanzada.'};
      });
    }

    applyPrincipalSkillScaling(route){
      GAME_BALANCE.getActivePathEffects(this,route).forEach(effect=>effect.apply(this));
    }

    applyAlternationBonus(id) {
      if(id==='homeostasis'){this.stats.phagoRadius*=1.04;this.stats.phagoInterval=Math.max(GAME_BALANCE.LIMITS.minimumPhagocytosisIntervalMs,this.stats.phagoInterval*0.98);}
      else if(id==='cytotoxicity'){this.stats.attackDamage*=1.04;this.stats.granuleLevel++;}
      else {this.stats.netDamage+=0.5;this.stats.netRadius*=1.03;}
    }

    debugOpenQuestion(category){if(!this.debugMode)return;const choices=QUESTION_BANK.filter(q=>q.difficulty===category);if(!choices.length)return;this.debugMode=false;this.evolutionDiff={...this.evolutionDiff,category};this.questionPaused=false;this.openQuestion();this.debugMode=true;}

    openQuestion() {
      if(this.debugMode||this.questionPaused||this.gameEnded||this.multiResistance)return;
      this.questionPaused=true;this.tweens.pauseAll();this.questionCount+=1;this.xp-=this.xpNeed;
      // The XP cost grows nonlinearly so upgrades become progressively less frequent.
      this.xpNeed=Math.round(260+this.questionCount*65+Math.pow(this.questionCount,1.35)*12);
      let question=this.selectUnusedQuestion();
      if(!question){
        const requiredBosses=this.requiredBossIds(),allBossesDefeated=requiredBosses.every(id=>this.defeatedBossIds?.has(id));
        if(!allBossesDefeated){this.usedQuestionIds.clear();question=this.selectUnusedQuestion();if(!question){this.questionPaused=false;this.pendingQuestionOutcome=null;this.tweens.resumeAll();return;}}
        else {this.questionPaused=false;this.pendingQuestionOutcome=null;this.multiResistance=true;this.multiResistanceAt=this.elapsed;this.resistanceBossClock=26000;this.tweens.resumeAll();
        this.emit('is:close-question',{});this.emit('is:multiresistance',{time:this.elapsed});
        this.cameras.main.shake(950,0.012);this.cameras.main.flash(550,95,16,60,false);
        this.showToast('MULTIRRESISTENCIA · EL TEJIDO ENTRA EN CRISIS');
        for(let i=0;i<3;i++)this.spawnBoss();
        this.updateHud();return;}
      }
      this.usedQuestionIds.add(question.id);
      this.lastQuestionTopic=question.topic;this.questionTopicCounts[question.topic]=(this.questionTopicCounts[question.topic]||0)+1;
      if(this.evolutionDiff.id!=='no_curse'&&PLAUSIBLE_OPTIONS[question.id])question={...question,a:PLAUSIBLE_OPTIONS[question.id],c:0};
      const shuffled=this.rng.shuffle(question.a.map((text,index)=>({text,correct:index===question.c})));
      question={...question,a:shuffled.map(v=>v.text),c:shuffled.findIndex(v=>v.correct)};
      this.currentQuestion=question;this.pendingQuestionOutcome=null;
      this.emit('is:question',{question,number:this.questionCount,difficulty:this.evolutionDiff.label,difficultyCategory:this.evolutionDiff.category,topic:question.topic,bibliographyNote:'Pregunta provisional: verificar contra la bibliografía autorizada.'});
      this.updateHud();
    }

    answerQuestion(index) {
      if(!this.questionPaused||this.pendingQuestionOutcome)return;
      const q=this.currentQuestion,correct=index===q.c;this.pendingQuestionOutcome=correct?'correct':'wrong';
      if(correct)this.correctAnswers+=1;
      this.emit('is:answer-result',{correct,explanation:q.exp,correctAnswer:q.a[q.c],source:q.source||'Cuadernillo de estudiantes ADN 2026',outcome:this.pendingQuestionOutcome});this.updateHud();
    }

    continueAfterQuestion() {
      if(!this.questionPaused||!this.pendingQuestionOutcome)return;
      if(this.pendingQuestionOutcome==='correct'){
        this.currentUpgrades=EVOLUTION_STRATEGIES;
        this.emit('is:upgrades',{upgrades:this.getEvolutionOptions(),noQuestion:false});
      }else if(this.pendingQuestionOutcome==='wrong'){
        this.emit('is:close-question',{});this.questionPaused=false;this.pendingQuestionOutcome=null;this.tweens.resumeAll();
        const waveCount=Math.min(12,6+Math.floor(this.elapsed/80));
        for(let i=0;i<waveCount;i++)this.spawnEnemy(null,i<Math.floor(waveCount/3));
        this.waveExtra+=waveCount;this.showToast(`Respuesta incorrecta · Oleada extra: +${waveCount}`);
      }
    }

    chooseUpgrade(id) {
      if(!this.questionPaused||this.pendingQuestionOutcome!=='correct')return;
      const strategy=this.currentUpgrades.find(s=>s.id===id);if(!strategy)return;
      const count=this.evolutionCounts[strategy.id]||0;
      const advancedNow=(count+1)%3===0;
      // Solo se ofrecen mejoras que afectan habilidades que el jugador tiene (las generales siempre).
      const basic=GAME_BALANCE.pickPathUpgrade(this,strategy.basics,count);
      const advanced=GAME_BALANCE.pickPathUpgrade(this,strategy.advanced,Math.floor(count/3));
      basic.apply(this);
      this.applyPrincipalSkillScaling(strategy.id);
      if(advancedNow)advanced.apply(this);
      const alternated=this.lastStrategy!==null&&this.lastStrategy!==strategy.id;
      if(alternated)this.applyAlternationBonus(strategy.id);
      this.evolutionCounts[strategy.id]++;this.evolutionChoiceCount++;this.lastStrategy=strategy.id;
      this.upgradeHistory.push({time:fmtTime(this.elapsed),type:'Vía principal',name:strategy.name,detail:`${basic.name}${advancedNow?` + ${advanced.name}`:''}`});if(this.upgradeHistory.length>80)this.upgradeHistory.shift();
      this.updateEvolutionAppearance();
      this.questionPaused=false;this.pendingQuestionOutcome=null;this.tweens.resumeAll();this.emit('is:close-upgrades',{});
      const accent=strategy.id==='homeostasis'?0x63e6bd:strategy.id==='cytotoxicity'?0xffbd52:0x80caff;
      this.flashPlayerOutline(accent,560);this.burstEffect(this.player.x,this.player.y,accent,advancedNow?76:52);this.cameras.main.flash(advancedNow?150:90,Math.floor((accent>>16)&255),Math.floor((accent>>8)&255),Math.floor(accent&255),false);
      this.showToast(`${strategy.role} · ${basic.name}${advancedNow?` + EVOLUCIÓN: ${advanced.name}`:''}${alternated?' · SINERGIA':''}`);this.updateHud();
    }

    finishGame() {
      if(this.gameEnded)return;this.gameEnded=true;this.stats.health=Math.max(0,this.stats.health);
      const score=this.getScore(),key=`is_best_${this.modo?this.modo.rankingModo:this.settings.infection}_${this.settings.infectionDifficulty}_${this.settings.evolutionDifficulty}`;
      const previous=this.storage.getNumber(key),best=Math.max(score,previous);this.storage.setNumber(key,best);
      this.emit('is:game-over',{...this.getRunSummary(),best,isRecord:score>previous,ranking:this.getRankingPayload(score),infection:this.theme.label,map:this.map.label,infectionDifficulty:this.infectionDiff.label,evolutionDifficulty:this.evolutionDiff.label,multiplier:this.infectionDiff.multiplier*this.evolutionDiff.multiplier});
    }

    // Datos que el juego manda a la API (acción guardarPuntaje). El servidor recalcula el puntaje con la misma
    // fórmula y valida que sea plausible. El Laboratorio y el modo clásico de los tests no envían nada.
    getRankingPayload(score){
      if(this.settings.debugMode||!this.modo)return null;
      return {juego:'inmune-survivors',modo:this.modo.rankingModo,puntaje:score,kills:this.kills,segundos:Math.floor(this.elapsed),correctas:this.correctAnswers,preguntas:this.questionCount,jefes:this.bossKills,dificultadInfeccion:this.settings.infectionDifficulty,dificultadEvolucion:this.evolutionDiff.id,version:GAME_VERSION};
    }

    destroyTransientObjects() {
      if(this.onScaleResize){this.scale.off(Phaser.Scale.Events.RESIZE,this.onScaleResize);this.onScaleResize=null;}
      if(this.onAddedToScene){this.events.off('addedtoscene',this.onAddedToScene);this.onAddedToScene=null;}
      this.enemies=[];this.playerBullets=[];this.enemyProjectiles=[];this.helpers=[];this.nets=[];this.xpDrops=[];this.activeEnemyCount=0;this.floatingTexts=[];
      this.ui.clearActions();
    }
  }

  let game=null,selectedMode='sandbox',selectedNucleo='6',selectedInfectionDifficulty='internado',selectedEvolutionDifficulty='estudiante';
  const uiBridge={
    emit:(name,detail)=>window.dispatchEvent(new CustomEvent(name,{detail})),
    setActions:(actions)=>{window.IS_ACTIONS=actions;},
    clearActions:()=>{window.IS_ACTIONS=null;},
    isHidden:()=>document.hidden,
    getDeviceProfile:()=>({cores:navigator.hardwareConcurrency||4,memory:navigator.deviceMemory||0,coarse:window.matchMedia?.('(pointer: coarse)').matches||navigator.maxTouchPoints>0})
  };
  const gameRuntime=InmuneRuntime.createRuntime({storage:new InmuneRuntime.Storage(window.localStorage)});
  let currentSettings={modo:selectedMode,nucleo:selectedNucleo,infectionDifficulty:selectedInfectionDifficulty,evolutionDifficulty:selectedEvolutionDifficulty};
  const $=id=>document.getElementById(id);
  const menuScreen=$('menuScreen'),gameScreen=$('gameScreen');
  const questionLayer=$('questionLayer'),upgradeLayer=$('upgradeLayer'),gameOverLayer=$('gameOverLayer'),pauseLayer=$('pauseLayer'),focusEvolutionLayer=$('focusEvolutionLayer');
  function openLayer(el){el.classList.add('open');}
  function closeLayer(el){el.classList.remove('open');}

  // ---- Menú: modo (Sandbox / Foco por núcleo), núcleo y dificultades. La elección se recuerda. ----
  const NUCLEOS=globalThis.InmuneAgentes?.NUCLEOS||[];
  const MENU_KEY='is_menu_v38';
  try{const m=JSON.parse(localStorage.getItem(MENU_KEY)||'null');if(m){
    if(m.modo==='nucleo'||m.modo==='sandbox')selectedMode=m.modo;
    if(NUCLEOS.some(n=>n.id===m.nucleo))selectedNucleo=m.nucleo;
    if(INFECTION_DIFFICULTIES[m.inf])selectedInfectionDifficulty=m.inf;
    if(EVOLUTION_DIFFICULTIES[m.evo])selectedEvolutionDifficulty=m.evo;
  }}catch(_){}
  const saveMenu=()=>{try{localStorage.setItem(MENU_KEY,JSON.stringify({modo:selectedMode,nucleo:selectedNucleo,inf:selectedInfectionDifficulty,evo:selectedEvolutionDifficulty}));}catch(_){}};
  const rankingKey=()=>selectedMode==='nucleo'?`nucleo-${selectedNucleo}`:'sandbox';
  const modeLabel=key=>key==='sandbox'?'Sandbox infinito':`Núcleo ${String(key).replace('nucleo-','')}`;
  const shortName=n=>n.nombre.replace(/^Agentes (con|que) /,'').replace(/^ingreso /,'Ingreso ').replace(/^./,c=>c.toUpperCase());
  $('nucleoChoices').innerHTML='';
  for(const n of NUCLEOS){
    const b=document.createElement('button');b.type='button';b.className='nucleo-choice';b.dataset.nucleo=n.id;b.setAttribute('role','radio');
    const cantidad=globalThis.InmuneAgentes.agentesDeNucleo(n.id).length;
    const tag=document.createElement('b');tag.textContent=`Núcleo ${n.id}`;
    const name=document.createElement('span');name.textContent=shortName(n);
    const meta=document.createElement('small');meta.textContent=`Jefe: ${n.jefe.titulo} · ${cantidad} agentes`;
    b.append(tag,name,meta);$('nucleoChoices').appendChild(b);
  }
  function syncMenu(){
    document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('selected',b.dataset.mode===selectedMode));
    document.querySelectorAll('[data-nucleo]').forEach(b=>{const on=b.dataset.nucleo===selectedNucleo;b.classList.toggle('selected',on);b.setAttribute('aria-checked',on?'true':'false');});
    document.querySelectorAll('[data-infection-difficulty]').forEach(b=>b.classList.toggle('selected',b.dataset.infectionDifficulty===selectedInfectionDifficulty));
    document.querySelectorAll('[data-evolution-difficulty]').forEach(b=>b.classList.toggle('selected',b.dataset.evolutionDifficulty===selectedEvolutionDifficulty));
    $('nucleoPicker').hidden=selectedMode!=='nucleo';
    $('startButton').textContent=selectedMode==='nucleo'?`JUGAR NÚCLEO ${selectedNucleo} ↗`:'JUGAR SANDBOX ↗';
    $('rankingLink').href=`/?vista=juegos&ranking=${encodeURIComponent(rankingKey())}`;
    renderLocalRecords();saveMenu();
  }
  document.querySelectorAll('[data-mode]').forEach(btn=>btn.addEventListener('click',()=>{selectedMode=btn.dataset.mode;syncMenu();}));
  $('nucleoChoices').addEventListener('click',e=>{const b=e.target.closest('[data-nucleo]');if(!b)return;selectedNucleo=b.dataset.nucleo;syncMenu();});
  document.querySelectorAll('[data-infection-difficulty]').forEach(btn=>btn.addEventListener('click',()=>{selectedInfectionDifficulty=btn.dataset.infectionDifficulty;syncMenu();}));
  document.querySelectorAll('[data-evolution-difficulty]').forEach(btn=>btn.addEventListener('click',()=>{selectedEvolutionDifficulty=btn.dataset.evolutionDifficulty;syncMenu();}));
  // Récords locales: el mejor de cada modo (cualquier dificultad) y el de la configuración elegida.
  function bestLocal(key,inf=null,evo=null){
    let best=0;
    for(const i of inf?[inf]:Object.keys(INFECTION_DIFFICULTIES))for(const v of evo?[evo]:Object.keys(EVOLUTION_DIFFICULTIES))best=Math.max(best,gameRuntime.storage.getNumber(`is_best_${key}_${i}_${v}`));
    return best;
  }
  function renderLocalRecords(){
    const box=$('localRecords');box.innerHTML='';
    const row=(label,value,current)=>{const r=document.createElement('div');r.className='record-row'+(current?' actual':'');const l=document.createElement('span');l.textContent=label;const v=document.createElement('strong');v.textContent=value?value.toLocaleString('es-AR'):'—';r.append(l,v);box.appendChild(r);};
    const key=rankingKey();
    row(`${modeLabel(key)} · esta dificultad`,bestLocal(key,selectedInfectionDifficulty,selectedEvolutionDifficulty),true);
    const others=['sandbox',...NUCLEOS.map(n=>`nucleo-${n.id}`)].map(k=>[k,bestLocal(k)]).filter(([,v])=>v>0);
    for(const [k,v] of others)row(modeLabel(k),v,false);
    if(!others.length){const p=document.createElement('p');p.className='muted';p.style.margin='2px 0 0';p.textContent='Todavía no jugaste: tu primer récord te espera.';box.appendChild(p);}
  }

  const mobileViewport=()=>window.matchMedia('(max-width: 760px), (pointer: coarse)').matches;
  // Píxeles reales por píxel CSS: hasta ×2 en PC y ×1,5 en celular (pantallas chicas con DPR 3 no lo notan y
  // cuesta mucho rendimiento); equipos de pocos núcleos o poca memoria quedan en ×1.
  function computeRenderResolution(){
    const dpr=window.devicePixelRatio||1,cores=navigator.hardwareConcurrency||4,memory=navigator.deviceMemory||0;
    const lowEnd=cores<=4||(memory>0&&memory<=4),cap=mobileViewport()?(lowEnd?1:1.5):(lowEnd?1.5:2);
    return Math.round(Math.min(cap,Math.max(1,dpr))*4)/4;
  }
  function fitLogicalViewport(){
    const bounds=$('gameContainer').getBoundingClientRect();
    W=Math.max(280,Math.round(bounds.width||window.innerWidth||480));
    H=Math.max(480,Math.round(bounds.height||window.innerHeight||800));
    RENDER_RES=computeRenderResolution();
  }
  // Ajusta el canvas al contenedor. Con el juego oculto (menú) el contenedor mide 0: no se toca nada (ese
  // redimensionado a 0×0 era el que dejaba la siguiente partida en negro).
  function fitGameToContainer(){
    if(!game?.scale)return;
    const bounds=$('gameContainer').getBoundingClientRect();
    if(bounds.width<2||bounds.height<2)return;
    fitLogicalViewport();
    // Tamaño destino calculado antes de setZoom: setZoom dispara el RESIZE de la escena, que recalcula W y H
    // con el tamaño viejo (por eso al entrar en pantalla completa en PC el lienzo no se agrandaba).
    const pw=Math.round(W*RENDER_RES),ph=Math.round(H*RENDER_RES);
    game.scale.setZoom(1/RENDER_RES);
    game.scale.resize(pw,ph);
  }
  let fitQueued=false;
  const queueFit=()=>{if(fitQueued)return;fitQueued=true;requestAnimationFrame(()=>{fitQueued=false;fitGameToContainer();});};
  if(window.ResizeObserver)new ResizeObserver(queueFit).observe($('gameContainer'));
  window.addEventListener('resize',queueFit);
  window.addEventListener('orientationchange',queueFit);
  // Pantalla completa: Fullscreen API estándar o con prefijo webkit (Safari en Mac/iPad). Safari de iPhone no
  // permite pantalla completa de elementos que no sean video: ahí se usa el modo CSS (body.mobile-game-fullscreen)
  // y se explica cómo agregarlo a la pantalla de inicio, desde donde abre sin barras (manifest + meta apple).
  const fullscreenElement=()=>document.fullscreenElement||document.webkitFullscreenElement||null;
  const standalone=()=>window.navigator.standalone===true||window.matchMedia?.('(display-mode: fullscreen), (display-mode: standalone)').matches;
  const fullscreenSupported=()=>{const r=document.documentElement;return !!(r.requestFullscreen||r.webkitRequestFullscreen)&&(document.fullscreenEnabled!==false||document.webkitFullscreenEnabled===true);};
  function requestElementFullscreen(el){
    try{
      if(el.requestFullscreen){const r=el.requestFullscreen({navigationUI:'hide'});if(r?.catch)r.catch(()=>{});return true;}
      if(el.webkitRequestFullscreen){el.webkitRequestFullscreen();return true;}
    }catch(_){}
    return false;
  }
  // En PC la pantalla completa es opcional (botón o tecla F); en celular se entra sola al jugar.
  const isGameFullscreen=()=>document.body.classList.contains('game-fullscreen');
  function enterGameFullscreen(){
    document.body.classList.add('game-fullscreen');
    if(!fullscreenElement()&&!standalone())requestElementFullscreen(document.documentElement);
    queueFit();
  }
  function exitGameFullscreen(){
    document.body.classList.remove('game-fullscreen');
    if(fullscreenElement()){if(document.exitFullscreen)document.exitFullscreen().catch(()=>{});else if(document.webkitExitFullscreen)document.webkitExitFullscreen();}
    $('fullscreenButton')?.classList.remove('recovery-visible');
    queueFit();
  }
  function toggleGameFullscreen(){
    if(gameScreen.style.display==='none')return;
    if(isGameFullscreen()&&(fullscreenElement()||!mobileViewport()))exitGameFullscreen();
    else if(!fullscreenSupported()&&mobileViewport())$('installHint').classList.add('open');
    else enterGameFullscreen();
    setTimeout(refreshFullscreenRecovery,350);
  }
  function refreshFullscreenRecovery(){
    const button=$('fullscreenButton');
    if(!button)return;
    const playing=gameScreen.style.display!=='none';
    if(!mobileViewport()){
      button.textContent=isGameFullscreen()?'Salir de pantalla completa':'Pantalla completa';
      button.classList.remove('recovery-visible');button.classList.toggle('pc-visible',playing);
      if(playing)requestAnimationFrame(fitGameToContainer);
      return;
    }
    button.classList.remove('pc-visible');
    // En iPhone (sin API) el botón explica cómo instalarlo; si ya se abrió desde el inicio, no hace falta.
    button.textContent=fullscreenSupported()?'Pantalla completa':'Ver a pantalla completa';
    button.classList.toggle('recovery-visible',playing&&!fullscreenElement()&&!standalone());
    if(playing)requestAnimationFrame(fitGameToContainer);
  }
  $('fullscreenButton').addEventListener('click',toggleGameFullscreen);
  // PC: al salir de la pantalla completa del navegador (Esc) el marco vuelve a su lugar. Si el navegador no
  // la concede (iframe, permisos), el juego igual ocupa toda la ventana.
  let hadBrowserFullscreen=false;
  const onFullscreenChange=()=>{
    if(fullscreenElement())hadBrowserFullscreen=true;
    else if(hadBrowserFullscreen){hadBrowserFullscreen=false;if(!mobileViewport())document.body.classList.remove('game-fullscreen');}
    queueFit();
  };
  document.addEventListener('fullscreenchange',onFullscreenChange);
  document.addEventListener('webkitfullscreenchange',onFullscreenChange);
  document.addEventListener('keydown',e=>{
    if((e.key!=='f'&&e.key!=='F')||e.ctrlKey||e.metaKey||e.altKey||e.repeat)return;
    if(e.target?.closest?.('input,textarea,select')||document.querySelector('.modal-layer.open'))return;
    e.preventDefault();toggleGameFullscreen();
  });
  $('installHintClose')?.addEventListener('click',()=>$('installHint').classList.remove('open'));
  document.addEventListener('webkitfullscreenchange',refreshFullscreenRecovery);
  document.addEventListener('fullscreenchange',refreshFullscreenRecovery);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(refreshFullscreenRecovery,180);});
  // Pausa automática: al volver de otra app o pestaña, la partida espera en el menú de pausa en vez de seguir sola.
  const pauseIfPlaying=()=>{if(gameScreen.style.display!=='none')window.IS_ACTIONS?.pauseGame?.();};
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseIfPlaying();});
  window.addEventListener('blur',pauseIfPlaying);
  window.addEventListener('pagehide',pauseIfPlaying);
  window.addEventListener('focus',()=>setTimeout(refreshFullscreenRecovery,180));
  window.addEventListener('pageshow',()=>setTimeout(refreshFullscreenRecovery,180));
  function showGame(){
    menuScreen.style.display='none';gameScreen.style.display='block';
    const combat=INFECTION_DIFFICULTIES[currentSettings.infectionDifficulty],quiz=EVOLUTION_DIFFICULTIES[currentSettings.evolutionDifficulty];
    $('runTitle').textContent=`${currentSettings.debugMode?'LABORATORIO · ':''}${currentSettings.modo==='nucleo'?`Núcleo ${currentSettings.nucleo}`:'Sandbox infinito'} · Progenitor hematopoyético`;
    $('runSubtitle').textContent=currentSettings.debugMode?'Modo libre · oleadas y preguntas automáticas desactivadas':`${combat.label} · ${quiz.label} · ×${(combat.multiplier*quiz.multiplier).toFixed(2).replace('.',',')} puntos · arena circular`;
  }
  function launchGame(debugMode=false){
    currentSettings={modo:debugMode?'sandbox':selectedMode,nucleo:selectedNucleo,infectionDifficulty:selectedInfectionDifficulty,evolutionDifficulty:selectedEvolutionDifficulty,debugMode,runtime:gameRuntime,uiBridge};
    $('rankResult').textContent='';startRankingTicket(currentSettings);
    closeLayer(questionLayer);closeLayer(upgradeLayer);closeLayer(focusEvolutionLayer);closeLayer(gameOverLayer);closeLayer(pauseLayer);$('debugPanel').classList.toggle('open',debugMode);showGame();
    if(mobileViewport())enterGameFullscreen();
    else requestAnimationFrame(()=>gameScreen.scrollIntoView({behavior:'smooth',block:'center',inline:'nearest'}));
    if(!game){
      fitLogicalViewport();
      // Escala manual (NONE + zoom) en vez de RESIZE: RESIZE siempre usa 1 píxel real por píxel CSS.
      game=new Phaser.Game({type:Phaser.AUTO,parent:'gameContainer',width:Math.round(W*RENDER_RES),height:Math.round(H*RENDER_RES),backgroundColor:'#09192a',antialias:true,roundPixels:false,
        scale:{mode:Phaser.Scale.NONE,parent:'gameContainer',width:Math.round(W*RENDER_RES),height:Math.round(H*RENDER_RES),zoom:1/RENDER_RES},fps:{target:60,forceSetTimeOut:false},
        render:{antialias:true,pixelArt:false,powerPreference:'low-power'},scene:[]});
      game.scene.add('Arena',Arena,true,currentSettings);
    }else{
      // En el menú el loop duerme: con el contenedor oculto (0×0), un resize (p. ej. al salir de pantalla
      // completa en el celular) hacía que Phaser creara un framebuffer vacío y la siguiente partida se veía negra.
      game.loop.wake(); // no hace nada si el loop ya está corriendo
      fitGameToContainer();
      game.scene.start('Arena',currentSettings);
    }
    setTimeout(refreshFullscreenRecovery,220);
  }

  // ---- Reportes anónimos (bugs, sugerencias, correcciones) → planilla de Drive vía Apps Script ----
  // Misma URL que web/js/app.js (ver tools/reportes-apps-script/README.md). Vacía = no se muestran los botones.
  const REPORTES_URL='';
  const reportLayer=$('reportLayer');
  let lastRunInfo='';
  if(REPORTES_URL)document.querySelectorAll('.report-open').forEach(b=>{b.hidden=false;b.addEventListener('click',()=>{$('reportStatus').textContent='';reportLayer.classList.add('open');setTimeout(()=>$('reportMessage').focus(),60);});});
  $('reportClose').addEventListener('click',()=>reportLayer.classList.remove('open'));
  window.addEventListener('is:run-start',e=>{const d=e.detail||{};lastRunInfo=`${d.modo||d.infection||''} · ${d.map||''} · ${d.infectionDifficulty||''} · ${d.evolutionDifficulty||''}${d.debug?' · laboratorio':''}`;});
  $('reportForm').addEventListener('submit',async ev=>{
    ev.preventDefault();
    const status=$('reportStatus'),mensaje=$('reportMessage').value.trim();
    if(mensaje.length<10){status.textContent='Contanos un poco más (al menos 10 caracteres).';return;}
    const hoy=new Date().toISOString().slice(0,10);let reg={dia:hoy,cantidad:0,ultimo:0};
    try{const r=JSON.parse(localStorage.getItem('medmar:reportes')||'null');if(r&&r.dia===hoy)reg=r;}catch(_){}
    if(reg.cantidad>=10){status.textContent='Por hoy ya mandaste varios reportes. ¡Gracias!';return;}
    if(Date.now()-reg.ultimo<30000){status.textContent='Esperá unos segundos antes de mandar otro.';return;}
    const button=$('reportForm').querySelector('button[type="submit"]');button.disabled=true;status.textContent='Enviando…';
    const datos={tipo:$('reportType').value,seccion:'Juego · Inmune Survivors',mensaje,website:$('reportWebsite').value,origen:'juego',
      version:document.querySelector('script[src*="game.js"]')?.src.split('build=')[1]||'',detalle:lastRunInfo,
      dispositivo:`${mobileViewport()?'táctil':'mouse'} · ${window.innerWidth}×${window.innerHeight} · ${navigator.userAgent.slice(0,110)}`};
    try{
      await fetch(REPORTES_URL,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(datos)});
      reg.cantidad++;reg.ultimo=Date.now();try{localStorage.setItem('medmar:reportes',JSON.stringify(reg));}catch(_){}
      $('reportForm').reset();status.textContent='¡Gracias! Lo recibimos.';
    }catch(_){status.textContent='No se pudo enviar. Revisá la conexión y probá de nuevo.';}
    finally{button.disabled=false;}
  });

  // ---- Ranking de MedMar ----
  // El juego comparte origen con la web (medmar.com.ar/juegos/…): supabase-js lee la misma sesión del
  // localStorage. Se carga recién al terminar una partida (no pesa en la carga del juego). El puntaje lo
  // valida y recalcula el servidor (acción guardarPuntaje); nunca se escribe directo en la base.
  const MEDMAR_SUPABASE_URL='https://ekfwdrsehhmrqxxlefyx.supabase.co';
  const MEDMAR_PUBLISHABLE_KEY='sb_publishable_ZZQREdrsOfFn8vIOaO3S0w_S7NKP9KS';
  const SUPABASE_JS_URL='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/dist/umd/supabase.js';
  const SUPABASE_JS_SRI='sha384-TcHRA3zBbn+Lexh5n+Oil4guNPOS3rjNDpGRAN46u/s/mB2IZ50ceC6TYDU2yvgK';
  const MEDMAR_SESSION_KEY='sb-ekfwdrsehhmrqxxlefyx-auth-token';
  function storedSession(){try{const v=JSON.parse(localStorage.getItem(MEDMAR_SESSION_KEY)||'null');return v&&v.refresh_token?v:null;}catch(_){return null;}}
  function cachedPseudonym(session){try{const email=String(session?.user?.email||'').toLowerCase();const c=JSON.parse(localStorage.getItem('medmar:perfil:'+email)||'null');return String(c?.data?.perfil?.pseudonimo||'');}catch(_){return '';}}
  let supabaseLoading=null,medmarClient=null;
  function loadSupabase(){
    if(window.supabase?.createClient)return Promise.resolve(window.supabase);
    if(!supabaseLoading)supabaseLoading=new Promise((resolve,reject)=>{const sc=document.createElement('script');sc.src=SUPABASE_JS_URL;sc.integrity=SUPABASE_JS_SRI;sc.crossOrigin='anonymous';sc.onload=()=>resolve(window.supabase);sc.onerror=()=>{supabaseLoading=null;reject(new Error('supabase-js'));};document.head.appendChild(sc);});
    return supabaseLoading;
  }
  async function medmarApi(accion,params){
    const lib=await loadSupabase();
    if(!medmarClient)medmarClient=lib.createClient(MEDMAR_SUPABASE_URL,MEDMAR_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
    const {data}=await medmarClient.auth.getSession();
    if(!data?.session)return {ok:false,error:'sesion_invalida'};
    const r=await medmarClient.functions.invoke('api',{body:{accion,...params}});
    if(r.error)return {ok:false,error:'conexion'};
    return r.data||{ok:false,error:'servidor'};
  }
  function setRich(el,parts){el.textContent='';for(const p of parts){if(typeof p==='string'){el.appendChild(document.createTextNode(p));continue;}const n=document.createElement(p.tag);n.textContent=p.text;if(p.href)n.href=p.href;el.appendChild(n);}}
  function renderRankingStatus(){
    const box=$('rankingStatus'),session=storedSession();
    box.classList.toggle('ok',!!session);
    if(session){const name=cachedPseudonym(session);setRich(box,name?['Jugás como ',{tag:'strong',text:name},': tus puntajes entran al ranking de MedMar.']:['Sesión de MedMar activa: tus puntajes entran al ranking.']);}
    else setRich(box,['Sin sesión de MedMar: tus récords quedan solo en este dispositivo. ',{tag:'a',text:'Iniciá sesión',href:'/'},' para entrar al ranking.']);
  }
  // Entrada de partida firmada por el servidor (iniciarPartida): sin ella no se puede guardar el puntaje.
  let rankingTicket=null;
  function startRankingTicket(settings){
    rankingTicket=null;
    if(settings.debugMode||!storedSession())return;
    const modo=settings.modo==='nucleo'?`nucleo-${settings.nucleo}`:'sandbox';
    rankingTicket=medmarApi('iniciarPartida',{juego:'inmune-survivors',modo}).then(r=>r.ok?{modo,partida:r.partida}:{modo,error:r.error||'servidor'}).catch(()=>null);
  }
  async function submitRanking(payload){
    const box=$('rankResult');box.textContent='';
    if(!payload)return;
    const link={tag:'a',text:'Ver ranking',href:`/?vista=juegos&ranking=${encodeURIComponent(payload.modo)}`};
    if(!storedSession()){setRich(box,['Para aparecer en el ranking de MedMar, ',{tag:'a',text:'iniciá sesión',href:'/'},' y volvé a jugar.']);return;}
    box.textContent='Guardando tu puntaje en el ranking…';
    try{
      const ticket=rankingTicket?await rankingTicket:null;rankingTicket=null;
      if(ticket?.error==='accion_invalida'){box.textContent='El ranking de MedMar todavía no está activo. Tu récord local quedó guardado.';return;}
      if(ticket?.error==='sesion_invalida'){setRich(box,['Tu sesión de MedMar venció. ',{tag:'a',text:'Volvé a iniciar sesión',href:'/'},' para guardar los próximos puntajes.']);return;}
      if(!ticket||!ticket.partida||ticket.modo!==payload.modo){box.textContent='No se pudo registrar el inicio de esta partida en MedMar (¿sin conexión?), así que no entra al ranking.';return;}
      const r=await medmarApi('guardarPuntaje',{...payload,partida:ticket.partida});
      if(r.ok){
        const pos=Number(r.posicion)||0,total=Number(r.total)||0,best=Number(r.mejor)||0;
        setRich(box,[r.record?'🏆 ¡Nuevo récord en el ranking! ':'Puntaje guardado. ','Estás ',{tag:'strong',text:`#${pos}`},` de ${total} en ${modeLabel(payload.modo)} (tu mejor: ${best.toLocaleString('es-AR')}). `,link]);
      }else if(r.error==='sesion_invalida')setRich(box,['Tu sesión de MedMar venció. ',{tag:'a',text:'Volvé a iniciar sesión',href:'/'},' para guardar los próximos puntajes.']);
      else if(r.error==='rate_limit')box.textContent='Guardaste muchas partidas seguidas: esta no entró al ranking. Probá de nuevo en un rato.';
      else if(r.error==='partida_invalida'||r.error==='partida_sin_inicio')box.textContent='El servidor no pudo validar esta partida, así que no entró al ranking.';
      else box.textContent='No se pudo guardar en el ranking. Tu récord local quedó guardado.';
    }catch(_){box.textContent='No se pudo conectar con MedMar. Tu récord local quedó guardado.';}
  }
  window.addEventListener('storage',e=>{if(e.key===MEDMAR_SESSION_KEY||String(e.key||'').startsWith('medmar:perfil:'))renderRankingStatus();});
  renderRankingStatus();syncMenu();
  $('startButton').addEventListener('click',()=>launchGame(false));
  $('debugStartButton').addEventListener('click',()=>launchGame(true));
  $('restartButton').addEventListener('click',()=>launchGame(false));
  $('menuButton').addEventListener('click',()=>{exitGameFullscreen();closeLayer(questionLayer);closeLayer(upgradeLayer);closeLayer(focusEvolutionLayer);closeLayer(gameOverLayer);closeLayer(pauseLayer);$('debugPanel').classList.remove('open');if(game){game.scene.stop('Arena');game.loop.sleep();}gameScreen.style.display='none';menuScreen.style.display='block';window.scrollTo({top:0,behavior:'smooth'});});
  $('pauseButton').addEventListener('click',()=>window.IS_ACTIONS?.pauseGame?.());
  $('resumeButton').addEventListener('click',()=>window.IS_ACTIONS?.resumeGame?.());
  $('pauseMenuButton').addEventListener('click',()=>{window.IS_ACTIONS?.resumeGame?.();$('menuButton').click();});
  $('quitButton').addEventListener('click',()=>{if(confirm('¿Salir de esta partida? Se perderá la puntuación actual.'))$('menuButton').click();});
  const debugSkillNames={phagocytosis:'Fagocitosis',respiratory_burst:'Estallido respiratorio · mejora de fagocitosis',netosis:'NETosis',immunoregulation:'Inmunorregulación',differentiation:'Diferenciación celular',antibodies:'Secreción de anticuerpos',complement:'Activación del complemento',tb_collaboration:'Colaboración T‑B',macrophage_activation:'Activación de macrófagos',differential_profile:'Perfil diferencial',pattern:'Reconocimiento de patrones',cytokines:'Señalización por citocinas',polarization:'Polarización funcional'};
  $('debugSkillSelect').innerHTML=Object.entries(debugSkillNames).map(([id,name])=>`<option value="${id}">${name}</option>`).join('');
  const debugStatList=[['attackDamage','Daño de gránulos'],['attackInterval','Cadencia de gránulos'],['projectileCount','Cantidad de gránulos'],['projectilePierce','Perforación'],['moveSpeed','Velocidad'],['maxHealth','Vida máxima'],['xpPickupRadius','Radio de recolección'],['phagoHeal','Curación por fagocitosis'],['netDamage','Daño NETosis']];
  $('debugStats').innerHTML=debugStatList.map(([id,label])=>`<div class="debug-row"><span style="flex:2">${label}</span><button data-stat="${id}" data-dir="down">−</button><button data-stat="${id}" data-dir="up">+</button></div>`).join('');
  const debugSkillProps={phagocytosis:['phagoRadius','phagoInterval','phagoHeal'],netosis:['netRadius','netCooldown','netDamage','netDuration'],antibodies:['antibodyDamage','antibodyInterval','antibodyCount'],complement:['complementChance'],macrophage_activation:['macrophageCap'],tb_collaboration:['bCellCap'],immunoregulation:['regulationDamage','regulationInterval'],cytokines:['cytokineDamage','cytokineInterval','cytokineCount'],pattern:['patternRadius'],differentiation:['differentiationBonus']};
  function renderSkillProps(){const id=$('debugSkillSelect').value,keys=debugSkillProps[id]||['nivel'];$('debugSkillStats').innerHTML=keys.map(k=>`<div class=\"debug-row\"><span style=\"flex:2\">${k}</span><button data-skillstat=\"${k}\" data-dir=\"down\">−</button><button data-skillstat=\"${k}\" data-dir=\"up\">+</button></div>`).join('');}
  renderSkillProps();$('debugSkillSelect').addEventListener('change',renderSkillProps);$('debugSpawnCount').addEventListener('change',e=>window.IS_ACTIONS?.debug?.(`spawn-count:${e.target.value}`));$('debugQuestion').addEventListener('change',e=>window.debugQuestionCategory=e.target.value);
  const props={phagocytosis:['phagoRadius','phagoInterval','phagoHeal'],netosis:['netRadius','netCooldown','netDamage'],antibodies:['antibodyDamage','antibodyInterval','antibodyCount'],complement:['complementChance'],macrophage_activation:['macrophageCap'],tb_collaboration:['bCellCap'],immunoregulation:['regulationDamage','regulationInterval'],cytokines:['cytokineDamage','cytokineInterval','cytokineCount']};function renderProps(){const a=$('debugSkillSelect').value;$('debugSkillStats').innerHTML=(props[a]||['nivel']).map(k=>`<div class=\"debug-row\"><span>${k}</span><button data-skillstat=\"${k}\" data-dir=\"down\">−</button><button data-skillstat=\"${k}\" data-dir=\"up\">+</button></div>`).join('');}renderProps();$('debugSkillSelect').addEventListener('change',renderProps);$('debugSpawnCount').addEventListener('change',e=>window.IS_ACTIONS?.debug?.(`spawn-count:${e.target.value}`));$('debugToggle').addEventListener('click',()=>{const panel=$('debugPanel');panel.classList.toggle('compact');$('debugToggle').textContent=panel.classList.contains('compact')?'Abrir':'Cerrar';});
  $('debugPanel').addEventListener('click',e=>{const btn=e.target.closest('button');if(!btn)return;if(btn.dataset.debug){const selected=$('debugSkillSelect').value,op=btn.dataset.debug;if(op==='skill-add')window.IS_ACTIONS?.debug?.(`skill:${selected}:up`);else if(op==='question')window.IS_ACTIONS?.debug?.(`question:${$('debugQuestion').value}`);else if(op==='skill-remove')window.IS_ACTIONS?.debug?.(`skill:${selected}:remove`);else if(op==='boss'&&$('debugBossSelect').value)window.IS_ACTIONS?.debug?.(`boss:${$('debugBossSelect').value}`);else window.IS_ACTIONS?.debug?.(op);}else if(btn.dataset.stat)window.IS_ACTIONS?.debug?.(`stat:${btn.dataset.stat}:${btn.dataset.dir}`);else if(btn.dataset.skillstat)window.IS_ACTIONS?.debug?.(`skillstat:${btn.dataset.skillstat}:${btn.dataset.dir}`);else if(btn.dataset.debug==='question')window.IS_ACTIONS?.debug?.(`question:${$('debugQuestion').value}`);else if(btn.dataset.skillstat)window.IS_ACTIONS?.debug?.(`skillstat:${btn.dataset.skillstat}:${btn.dataset.dir}`);else if(btn.dataset.debug==='question')window.IS_ACTIONS?.debug?.(`question:${$('debugQuestion').value}`);});
  $('debugTypeSelect').addEventListener('change',e=>window.IS_ACTIONS?.debug?.(`type:${e.target.value}`));
  // Laboratorio: elegir qué jefe aparece (vacío = el siguiente de la secuencia).
  {const sel=$('debugBossSelect'),opt=(value,text)=>{const o=document.createElement('option');o.value=value;o.textContent=text;sel.appendChild(o);};
    opt('','Jefe: siguiente de la secuencia');
    for(const b of BOSS_MORPHOLOGIES)opt(b.id,`Clásico · ${b.label}`);
    for(const n of (globalThis.InmuneAgentes?.NUCLEOS||[]))opt(`jefe-${n.jefe.agente}`,`Núcleo ${n.id} · ${n.jefe.titulo}`);}
  window.addEventListener('is:focus-evolution',e=>{const box=$('focusEvolutionButtons');box.innerHTML='';for(const option of e.detail.options){const b=document.createElement('button');b.className='upgrade-btn skill-evolution-card';const sprite=document.createElement('span');sprite.className='evolution-sprite';const image=document.createElement('img');image.src=`assets/skills/${option.skill}.svg`;image.alt='';sprite.appendChild(image);const strong=document.createElement('strong');strong.textContent=`${option.label.name} · ${option.upgrade?`EVOLUCIÓN N${option.level}`:'NUEVA HABILIDAD'}`;const span=document.createElement('span');span.className='evolution-impact';span.textContent=option.label.desc;b.append(sprite,strong,span);b.addEventListener('click',()=>window.IS_ACTIONS?.chooseFocusEvolution?.(option.id));box.appendChild(b);}openLayer(focusEvolutionLayer);});
  window.addEventListener('is:close-focus-evolution',()=>closeLayer(focusEvolutionLayer));
  window.addEventListener('is:debug-status',e=>{const levels=e.detail.levels||{};$('debugStatus').textContent=e.detail.skills.map(id=>`${debugSkillNames[id]||'Desgranulación'} N${levels[id]||1}`).join(' · ');
    $('runSubtitle').textContent='Modo libre · controles manuales activos';});

  window.addEventListener('is:run-start',e=>{
    const d=e.detail;
    $('runTitle').textContent=`${d.debug?'LABORATORIO · ':''}${d.infection} · ${d.map} · Progenitor hematopoyético`;
    $('runSubtitle').textContent=d.debug?'Modo libre · oleadas y preguntas automáticas desactivadas':`Infección: ${d.infectionDifficulty} · Evolución: ${d.evolutionDifficulty} · ×${d.multiplier.toFixed(2).replace('.',',')} puntos`;
  });

  window.addEventListener('is:question',e=>{
    const d=e.detail,q=d.question;
    const categoryLabel={facil:'FÁCIL',normal:'NORMAL',dificil:'DIFÍCIL'}[d.difficultyCategory]||'PREGUNTA';
    $('questionKicker').textContent=`${categoryLabel} · ${d.topic||'Microbiología'} · Pregunta ${d.number}`;
    $('questionHeading').textContent='Respondé para evolucionar';
    $('questionMeta').textContent=`Perfil: ${d.difficulty} · categoría ${categoryLabel.toLowerCase()} · La partida está completamente pausada.`;
    $('questionText').textContent=q.q;
    const box=$('answerButtons');box.innerHTML='';
    q.a.forEach((answer,i)=>{const b=document.createElement('button');b.className='answer-btn';b.textContent=`${String.fromCharCode(65+i)}. ${answer}`;b.addEventListener('click',()=>{box.querySelectorAll('button').forEach(btn=>btn.disabled=true);if(window.IS_ACTIONS?.answerQuestion)window.IS_ACTIONS.answerQuestion(i);});box.appendChild(b);});
    const fb=$('questionFeedback');fb.className='feedback';fb.textContent='';$('continueQuestion').style.display='none';$('continueQuestion').textContent='CONTINUAR';
    openLayer(questionLayer);setTimeout(()=>{const first=box.querySelector('button');if(first)first.focus();},60);
  });

  window.addEventListener('is:answer-result',e=>{
    const d=e.detail,fb=$('questionFeedback');fb.className=`feedback open ${d.correct?'correct':'wrong'}`;
    fb.textContent=`${d.correct?'¡Correcto!':`Incorrecto. Respuesta: ${d.correctAnswer}.`} ${d.explanation}${d.source?' Referencia temática: '+d.source+'.':''}`;
    $('continueQuestion').style.display='block';$('continueQuestion').textContent=d.correct?'ELEGIR ESTRATEGIA':'ENFRENTAR OLEADA';
  });
  $('continueQuestion').addEventListener('click',()=>{if(window.IS_ACTIONS?.continueAfterQuestion)window.IS_ACTIONS.continueAfterQuestion();});

  window.addEventListener('is:upgrades',e=>{
    closeLayer(questionLayer);const noQuestion=!!e.detail.noQuestion;
    $('upgradeHeading').textContent='Elegí una estrategia';
    $('upgradeLayer').querySelector('.modal-kicker').textContent=noQuestion?'EVOLUCIÓN CELULAR':'RESPUESTA CORRECTA · EVOLUCIÓN';
    $('upgradeLayer').querySelector('p').textContent='Elegí una mejora básica de parámetro. Cada tercera elección en la misma vía añade una evolución avanzada; alternar también da una pequeña sinergia.';
    const box=$('upgradeButtons');box.innerHTML='';const skillDetails=$('upgradeSkillDetails');skillDetails.classList.remove('open');skillDetails.textContent='';
    e.detail.upgrades.forEach(strategy=>{
      const b=document.createElement('button');b.className='upgrade-btn strategy-btn';b.style.setProperty('--strategy-color',strategy.color||'#8cebc9');
      const icon=document.createElement('span');icon.className='strategy-icon';const pathMarks={homeostasis:'<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 5 40 11v11c0 10-7 17-16 21C15 39 8 32 8 22V11Z" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linejoin="round"/><path d="M24 15v15m-7-7h14" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>',cytotoxicity:'<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 4 28 17 41 11 34 23 46 27 33 30 38 43 26 35 19 47 18 33 4 36 14 26 4 17 18 19Z" fill="currentColor"/><circle cx="24" cy="25" r="6" fill="#102238"/><circle cx="24" cy="25" r="2.5" fill="#fff1bd"/></svg>',chemotaxis:'<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M5 24h27" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><path d="m25 12 12 12-12 12" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9" cy="15" r="2.3" fill="currentColor"/><circle cx="15" cy="33" r="2" fill="currentColor"/></svg>'};icon.innerHTML=pathMarks[strategy.id]||'';// Lo que mejora en cada habilidad que tenés va siempre visible en la tarjeta (antes estaba escondido
      // detrás de íconos superpuestos que había que descubrir tocándolos).
      const affected=document.createElement('span');affected.className='affected-skills';
      if((strategy.affectDetails||[]).length){const head=document.createElement('small');head.className='affected-head';head.textContent='También mejora tus habilidades:';affected.appendChild(head);}
      for(const skill of (strategy.affectDetails||[])){const row=document.createElement('span');row.className='affected-row';const img=document.createElement('img');img.src=`assets/skills/${skill.id}.svg`;img.alt='';const txt=document.createElement('span');const nm=document.createElement('b');nm.textContent=skill.name;const ch=document.createElement('span');ch.className='affected-change';ch.textContent=skill.change;txt.append(nm,ch);row.append(img,txt);affected.appendChild(row);}
      const copy=document.createElement('span');copy.className='strategy-copy';
      const role=document.createElement('small');role.textContent=`${strategy.role||'ESTRATEGIA'} · ${strategy.nextLevel||''}`;
      const strong=document.createElement('strong');strong.textContent=strategy.name;
      const desc=document.createElement('span');desc.textContent=`${strategy.nextName}: ${strategy.nextDesc}`;
      const hint=document.createElement('em');hint.textContent=strategy.hint||'';
      const progress=document.createElement('span');progress.className='strategy-progress';progress.setAttribute('aria-label',`${strategy.progress||0} de 3 mejoras hacia la evolución avanzada`);for(let i=0;i<3;i++){const mark=document.createElement('i');if(i<(strategy.progress||0))mark.className='on';progress.appendChild(mark);}
      copy.append(role,strong,desc,hint,progress);if(affected.childElementCount)copy.append(affected);b.append(icon,copy);
      b.addEventListener('click',()=>{if(window.IS_ACTIONS?.chooseUpgrade)window.IS_ACTIONS.chooseUpgrade(strategy.id);});box.appendChild(b);
    });
    openLayer(upgradeLayer);
  });
  window.addEventListener('is:close-question',()=>closeLayer(questionLayer));
  window.addEventListener('is:close-upgrades',()=>closeLayer(upgradeLayer));
  const FAMILIA_LABEL={bacteria:'Bacteria',virus:'Virus',parasite:'Parásito',fungus:'Hongo'};
  function renderBestiary(box,count,items){
    if(!box)return;box.replaceChildren();if(count)count.textContent=String(items.length);
    if(!items.length){const p=document.createElement('p');p.className='bestiary-empty';p.textContent='Todavía no apareció ningún agente.';box.appendChild(p);return;}
    for(const it of items){
      const card=document.createElement('article');card.className='bestiary-card';
      const head=document.createElement('div');head.className='bestiary-head';
      const name=document.createElement('strong');name.className='bestiary-name';name.textContent=it.nombre;
      const meta=document.createElement('span');meta.className=`bestiary-meta fam-${it.familia}`;meta.textContent=`${FAMILIA_LABEL[it.familia]||''} · ${it.eliminados}/${it.vistos} eliminados`;
      head.append(name,meta);card.appendChild(head);
      if(it.ficha){for(const [label,txt] of [['Qué es',it.ficha.clase],['Qué produce',it.ficha.cuadro],['Dato clave',it.ficha.clave]]){const p=document.createElement('p');const b=document.createElement('b');b.textContent=label+': ';p.append(b,document.createTextNode(txt));card.appendChild(p);}}
      box.appendChild(card);
    }
  }
  function renderRunReport(prefix,d){
    const map=prefix==='pause'?{score:'pauseScore',time:'pauseTime',damage:'pauseDamage',dps:'pauseDps',kills:'pauseKills',boss:'pauseBossKills',foci:'pauseFoci',breaches:'pauseBreaches',correct:'pauseCorrect',list:'pauseUpgradeList'}:{score:'finalScore',time:'finalTime',damage:'finalDamage',dps:'finalDps',kills:'finalKills',boss:'finalBossKills',foci:'finalFoci',breaches:'finalBreaches',correct:'finalCorrect',list:'finalUpgradeList'};
    $(map.score).textContent=Number(d.score||0).toLocaleString('es-AR');$(map.time).textContent=fmtTime(d.elapsed||0);$(map.damage).textContent=Number(d.damage||0).toLocaleString('es-AR');$(map.dps).textContent=`${Number(d.dps||0).toLocaleString('es-AR')} / ${Number(d.estimatedDps||0).toLocaleString('es-AR')}`;
    $(map.kills).textContent=Number(d.kills||0).toLocaleString('es-AR');$(map.boss).textContent=Number(d.bossKills||0).toLocaleString('es-AR');$(map.foci).textContent=Number(d.fociHealed||0).toLocaleString('es-AR');$(map.breaches).textContent=Number(d.focusBreaches||0).toLocaleString('es-AR');$(map.correct).textContent=`${Number(d.correctAnswers||0).toLocaleString('es-AR')} / ${Number(d.questionCount||0).toLocaleString('es-AR')}`;
    renderBestiary($(prefix==='pause'?'pauseBestiary':'finalBestiary'),$(prefix==='pause'?'pauseBestiaryCount':'finalBestiaryCount'),d.bestiario||[]);
    const list=$(map.list);list.replaceChildren();const records=d.upgrades||[];
    if(!records.length){const li=document.createElement('li');li.textContent='Todavía no hubo mejoras.';list.appendChild(li);}
    for(const item of records){const li=document.createElement('li'),strong=document.createElement('strong'),span=document.createElement('span');strong.textContent=`${item.time} · ${item.type}: ${item.name}`;span.textContent=` · ${item.detail||''}`;li.append(strong,span);list.appendChild(li);}
  }
  window.addEventListener('is:pause',e=>{renderRunReport('pause',e.detail);openLayer(pauseLayer);});
  window.addEventListener('is:resume',()=>closeLayer(pauseLayer));
  window.addEventListener('is:toast',e=>{if(gameScreen.style.display!=='none')$('runSubtitle').textContent=e.detail.text;});
  let crisisBannerTimer=null;
  window.addEventListener('is:multiresistance',()=>{
    const banner=$('crisisBanner');banner.style.display='block';banner.style.animation='none';void banner.offsetWidth;banner.style.animation='';
    $('runSubtitle').textContent='MULTIRRESISTENCIA · LA INFECCIÓN SE ADAPTA';
    if(crisisBannerTimer)clearTimeout(crisisBannerTimer);
    crisisBannerTimer=setTimeout(()=>{banner.style.display='none';},7200);
  });
  window.addEventListener('is:game-over',e=>{
    const d=e.detail;renderLocalRecords();$('gameOverText').textContent=`${d.infection} · ${d.map} · Infección ${d.infectionDifficulty} · Evolución ${d.evolutionDifficulty} · ×${d.multiplier.toFixed(2).replace('.',',')}`;
    renderRunReport('gameover',d);
    $('bestScoreText').textContent=d.isRecord?`¡Nuevo récord en este dispositivo! Tu mejor puntuación con esta configuración es ${d.best.toLocaleString('es-AR')}.`:`Tu mejor puntuación en este dispositivo con esta configuración: ${d.best.toLocaleString('es-AR')}.`;
    openLayer(gameOverLayer);
    submitRanking(d.ranking);
  });
})();
