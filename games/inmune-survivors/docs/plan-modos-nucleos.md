# Plan: modo Sandbox y focos por núcleo de ADN

Estado: **borrador de planificación**. Falta el material de los núcleos (planificación o cuadernillo ADN) para
cerrar la lista de agentes. Nada de esto está implementado todavía.

## Objetivo

Dos formas de jugar desde el menú:

1. **Sandbox**: partida libre sin presión de ranking. Elegís agentes, ritmo y habilidades para experimentar y
   estudiar. Es una evolución del Laboratorio actual, que hoy es una herramienta de prueba con botones técnicos.
2. **Foco por núcleo**: elegís un núcleo (por ejemplo *Respiratorio*) y aparecen **solo los agentes de ese
   núcleo**: bacterias, virus, hongos y parásitos. Las preguntas salen de ese mismo núcleo. Es la modalidad con
   puntaje y ranking.

Para que esto sea educativo, cada enemigo tiene que tener **identidad**: dejar de ser "coco en racimo" y pasar a
ser *Staphylococcus aureus*, con nombre, una ficha corta y un comportamiento que recuerde algo real de su biología.

## Lo que hay hoy (para reutilizar)

| Sprite actual | Morfología genérica | Agentes candidatos (a confirmar con el material) |
|---|---|---|
| `bacteria_cocci` | cocos en racimo | *Staphylococcus aureus* (racimos); con otro sprite en cadena: *Streptococcus pyogenes*, *S. pneumoniae* (diplococo) |
| `bacteria_flagellated_bacillus` | bacilo flagelado | *Escherichia coli*, *Salmonella*, *Pseudomonas aeruginosa* |
| `bacteria_vibrio` | vibrio curvo | *Vibrio cholerae*, *Campylobacter* |
| `bacteria_spirochete` | espiroqueta | *Treponema pallidum*, *Leptospira*, *Borrelia* |
| `bacteria_capsule` | bacilo encapsulado | *Klebsiella pneumoniae*, *Haemophilus influenzae* |
| `virus_enveloped` | envuelto con espículas | Influenza, SARS-CoV-2, VSR |
| `virus_icosahedral` | cápside icosaédrica | Adenovirus, rinovirus |
| `virus_spiked` | partícula con espículas | Sarampión, VIH |
| `virus_capsid_cross_section` | virión en corte | Herpesvirus (VHS, VZV) |
| `fungus_budding_yeast` | levadura en gemación | *Candida albicans* |
| `fungus_hyphae` / `fungus_conidiophore` | hifas / conidióforo | *Aspergillus fumigatus* |
| `fungus_encapsulated_yeast` | levadura encapsulada | *Cryptococcus neoformans* |
| `parasite_giardia` | trofozoíto flagelado | *Giardia lamblia* |
| `parasite_amoeba` | ameba | *Entamoeba histolytica* |
| `parasite_trypanosome` | membrana ondulante | *Trypanosoma cruzi* |
| `parasite_ciliate` | ciliado | *Balantidium coli* |
| `helminth_fluke_head` + gusanos | trematodo / nematodo / cestodo | *Fasciola*, *Ascaris*, *Taenia*, *Echinococcus* |

Faltan sprites para varios agentes que seguro aparecen en los núcleos: cocos en cadena (estreptococos),
diplococos (neumococo, *Neisseria*), bacilos ácido-alcohol resistentes (*M. tuberculosis*), *Plasmodium*
(intraeritrocitario), *Toxoplasma*, *Pneumocystis*, entre otros.

## Modelo de datos propuesto

Todo en `src/data/` (UMD, testeable), separado del motor:

```js
// src/data/agentes.js
{
  id: 'staphylococcus-aureus',
  nombre: 'Staphylococcus aureus',
  familia: 'bacteria',                 // bacteria | virus | fungus | parasite
  sprite: 'bacteria_cocci',            // textura existente o nueva
  nucleos: ['piel-partes-blandas', 'respiratorio'],
  ficha: 'Coco Gram positivo en racimos; coagulasa positivo…',  // 1–2 líneas, revisadas
  comportamiento: { arquetipo: 'standard', rasgo: 'toxinas' },  // mapea a reglas del motor
  balance: { hp: 1.0, velocidad: 1.0, dano: 1.0 },
  preguntas: ['hard-saureus-01', …]    // ids del banco relacionados
}

// src/data/nucleos.js
{ id: 'respiratorio', nombre: 'Respiratorio', tejido: 'tissue_alveolar',
  agentes: ['streptococcus-pneumoniae', 'haemophilus-influenzae', 'influenza', …],
  jefe: 'mycobacterium-tuberculosis', temasPreguntas: ['Bacteriología', …] }
```

**Rasgos de comportamiento** reutilizables (no un comportamiento a mano por especie): cápsula (resiste
fagocitosis hasta debilitarse), toxinas (daño en área), esporas (proyectiles), biofilm (zonas lentas),
intracelular (se esconde por un tiempo), latencia (reaparece), flagelos (rápido y errático). Cada rasgo se
explica en la ficha que ve el jugador.

## Etapas

1. **Material**: recibir la lista de núcleos y agentes, armar `nucleos.js` y `agentes.js` y revisar cada ficha
   con `revisor-contenido-medico`.
2. **Identidad sin sprites nuevos**: asignar especies a los sprites actuales, mostrar el nombre al aparecer
   y en el "bestiario" de fin de partida, y etiquetar las preguntas por núcleo.
3. **Modo Foco por núcleo**: selector de núcleo en el menú, enemigos y preguntas filtrados, tejido del núcleo y
   puntaje separado por núcleo.
4. **Sandbox**: rediseñar el Laboratorio como modo para jugadores (elegir agentes y ritmo, sin preguntas
   obligatorias ni puntaje).
5. **Sprites nuevos** para los agentes que falten, con el mismo estilo, en WebP (ver `assets/README.md`).
6. **Rasgos** de comportamiento, uno por vez, cada uno con tests sobre el arnés.

## Preguntas abiertas

- Lista exacta de núcleos y qué agentes entran en cada uno (**pendiente: material de ADN**).
- ¿Un agente puede estar en varios núcleos? Propuesta: sí, como en el modelo de arriba.
- ¿El jefe de cada núcleo es un agente "emblemático" (por ejemplo, TBC para Respiratorio)?
- ¿Sandbox guarda algo (récords, agentes vistos) o es totalmente libre?
