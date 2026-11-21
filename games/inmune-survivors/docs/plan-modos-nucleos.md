# Plan: modo Sandbox y focos por núcleo de ADN

Estado: **etapa 1 hecha** (2026-11-21). El catálogo de núcleos y agentes está en `src/data/agentes.js`, con
tests en `tests/agentes-datos.test.cjs`. El juego todavía no lo usa.

## Decisiones tomadas

1. **Núcleos 1 a 5: afuera.** A lo sumo se usan sus preguntas sobre defensa contra virus, bacterias, parásitos y
   hongos (inmunidad antiviral, antibacteriana, antiparasitaria y antifúngica) como banco general.
2. **Un jefe por núcleo, bien distintivo y sin repetirse entre núcleos.** Urinario pasa a *Proteus mirabilis*
   (antes *E. coli* repetía con Digestivo). Piel pasa a *Clostridium perfringens* (gangrena gaseosa):
   *S. aureus* aparece en cuatro núcleos y no se distinguía.
3. **Artrópodos grandes: ninguno.** Quedan afuera los vectores, los ponzoñosos y los insectos ectoparásitos
   (piojos, *Tunga*, *Dermatobia*). Se mantiene *Sarcoptes*, que es microscópico. El núcleo de vectores se juega con
   los agentes que transmiten (rasgo `vector`: entran en oleadas desde el borde).
4. **Sandbox totalmente libre**, como el Laboratorio: mezcla agentes de todos los núcleos y no guarda nada.
5. **Sprites por morfología con variación por código**, horneados en una textura por especie (ver más abajo).

**Pendiente**: el núcleo 6.1 (urinario) solo tiene bacterias en el material (5 confirmadas, más 4 nosocomiales y el
adenovirus "a confirmar"). ¿Se juega solo o como variante del 6 (Digestivo y urinario)?

**Fuentes** (material del usuario, carpeta ADN 2.º año; no se copian en el repo):
- *2026 PTD ADN*: núcleos y su numeración vigente.
- Cuadernillos 2026 de los núcleos 6 a 13.
- Índice de agentes del *Compendio ADN*: usa la numeración anterior, donde Respiratorio es el 6 y Digestivo el 7.
- Índice de *Agentes del tercer parcial*.

Los agentes marcados con *(a confirmar)* aparecen solo en una fuente o como mención secundaria.

## Objetivo

Dos formas de jugar desde el menú:

1. **Foco por núcleo** (con puntaje): elegís un núcleo y aparecen **solo los agentes de ese núcleo**, con preguntas
   de ese núcleo, el tejido que corresponde y un jefe emblemático.
2. **Sandbox** (sin puntaje): el Laboratorio rediseñado para jugadores. Elegís núcleo, agentes, ritmo y habilidades
   para experimentar y estudiar.

Los núcleos 1 a 5 (microbiología general, inmunidad, inmunizaciones, nutrición e inmunonutrición) no tienen una
lista de agentes propia. Quedan como modo **Fundamentos**: el juego actual, con enemigos genéricos y preguntas de
esos núcleos.

## Núcleos con agentes (PTD 2026)

| Núcleo | Tejido / escenario | Jefe propuesto |
|---|---|---|
| 6 · Agentes con ingreso digestivo | epitelio intestinal | *E. coli* productora de toxina Shiga (SUH) |
| 6.1 · Agentes urinarios | epitelio urinario (nuevo fondo) | *Proteus mirabilis* |
| 7 · Agentes con ingreso respiratorio | epitelio alveolar | *Mycobacterium tuberculosis* (granuloma) |
| 7.1 · Agentes que afectan al SNC | tejido neural | *Neisseria meningitidis* |
| 8 · Infecciones de transmisión sexual | mucosa | VIH |
| 9 · Transmisión vertical | vascular / placenta (nuevo fondo) | *Toxoplasma gondii* |
| 10 · Transmitidas por vectores | vascular | *Plasmodium* |
| 11 · Zoonosis | tejido conectivo / hepático | *Echinococcus granulosus* (quiste hidatídico) |
| 12 · Agentes que ingresan por la piel | dermis | *Clostridium perfringens* (gangrena gaseosa) |
| 13-14 · Oportunistas | alveolar con inmunodepresión | *Pneumocystis jirovecii* o *Aspergillus* |

### Agentes por núcleo

**6 · Digestivo**
- *Virus*: rotavirus, norovirus, adenovirus entérico, astrovirus, enterovirus (poliovirus, Coxsackie, echovirus) y
  hepatitis virales (A y E de ingreso digestivo; B, C y D se ven en la misma sección).
- *Bacterias*: *Escherichia coli* (EPEC, ETEC, EIEC, STEC/EHEC → SUH), *Shigella* spp., *Salmonella* spp.
  (incluida Typhi), *Campylobacter* spp., *Yersinia enterocolitica*, *Vibrio cholerae*, *Bacillus cereus*,
  *Staphylococcus aureus* (toxina alimentaria), *Clostridium botulinum*, *Helicobacter pylori*.
- *Parásitos*: *Giardia lamblia*, *Entamoeba histolytica*, *Cryptosporidium* spp., *Ascaris lumbricoides*,
  *Enterobius vermicularis*, *Trichinella spiralis*, *Taenia solium* / *T. saginata*, *Echinococcus granulosus*.
  *(a confirmar)*: *Strongyloides*, *Ancylostoma* / *Necator*, *Diphyllobothrium*, *Hymenolepis*, *Trichuris*.

**6.1 · Urinario**
- *Bacterias*: *E. coli* uropatógena, *Proteus mirabilis*, *Klebsiella* spp., *Enterococcus faecalis*, micoplasmas.
- Nosocomiales *(a confirmar)*: *Enterobacter*, *Pseudomonas*, *Serratia*, *Acinetobacter*.

**7 · Respiratorio**
- *Virus*: influenza, virus sincicial respiratorio, adenovirus, rinovirus, coronavirus (SARS-CoV-2), parainfluenza,
  Coxsackie, Epstein-Barr.
- *Bacterias*: *Streptococcus pyogenes*, *S. pneumoniae*, *Haemophilus influenzae*, *Bordetella pertussis*,
  *Mycoplasma pneumoniae*, *Chlamydophila pneumoniae*, *Corynebacterium diphtheriae*, *Moraxella catarrhalis*,
  *Staphylococcus aureus*.
- *Micobacterias*: *Mycobacterium tuberculosis*, *M. leprae*.

**7.1 · SNC**
- *Bacterias*: *M. tuberculosis*, *Haemophilus influenzae* tipo b, *S. pneumoniae*, *S. agalactiae*,
  *Neisseria meningitidis*, *Clostridium botulinum*, *C. tetani*.
- *Virus*: enterovirus y arbovirus.
- *(a confirmar)*: "otros agentes que afectan al SN" del Compendio.

**8 · ITS**
- *Virus*: VIH, VPH, VHS-2, VHB, VHC.
- *Bacterias*: *Treponema pallidum*, *Chlamydia trachomatis*, *Neisseria gonorrhoeae*, micoplasmas genitales,
  *Haemophilus ducreyi*, *Klebsiella granulomatis*.
- *Parásitos*: *Trichomonas vaginalis*, *Phthirus pubis*.
- *Hongos*: *Candida* spp.

**9 · Transmisión vertical**
- *Virus*: rubéola, citomegalovirus, VIH, varicela-zóster, VHB, VHS.
- *Bacterias*: *Streptococcus agalactiae* (EGB), *Treponema pallidum*.
- *Parásitos*: *Toxoplasma gondii*, *Trypanosoma cruzi*.

**10 · Vectores**
- *Virus*: dengue, fiebre amarilla, zika, chikungunya. *(a confirmar)*: Oropouche, encefalitis equina del oeste.
- *Parásitos*: *Plasmodium* spp., *Leishmania* spp., *Trypanosoma cruzi*.
- *Vectores*: **no entran** (artrópodos grandes). La transmisión se representa con el rasgo `vector`.

**11 · Zoonosis**
- *Virus*: rabia (*Lyssavirus*), hantavirus, fiebre hemorrágica argentina (Junín), influenza zoonótica.
  *(a confirmar)*: mpox.
- *Bacterias*: *Leptospira interrogans*, *Brucella* spp., *Chlamydophila psittaci*.
- *Parásitos*: *Echinococcus granulosus*, *Trichinella spiralis*, *Toxocara canis*.

**12 · Piel**
- *Virus*: varicela-zóster, VHS-1 y 2, VPH cutáneo, molusco contagioso, HHV-6 y 7, parvovirus B19, sarampión,
  rubéola, Epstein-Barr, HHV-8.
- *Bacterias*: *Staphylococcus aureus*, *Streptococcus pyogenes*, *Clostridium perfringens*, *C. tetani*,
  *Mycobacterium leprae*.
- *Ectoparásitos y larvas*: *Sarcoptes scabiei* y *Ancylostoma braziliense* / *caninum* (larva migrans). Los insectos
  (*Pediculus*, *Tunga*, *Dermatobia*) no entran.
- *Hongos*:
  - superficiales: dermatofitos (*Trichophyton*, *Microsporum*, *Epidermophyton*), *Candida*, *Malassezia furfur*;
  - profundos: *Histoplasma capsulatum*, *Coccidioides*, *Paracoccidioides brasiliensis*, *Sporothrix schenckii*.
- *Artrópodos ponzoñosos*: **no entran**.

**13-14 · Oportunistas**
- *Virus*: citomegalovirus, VHS-1 y 2, varicela-zóster, Epstein-Barr, HHV-8 (en el contexto de VIH/SIDA y
  neutropenia).
- *Bacterias*: *M. tuberculosis*, micobacterias atípicas (MAC), *Pseudomonas aeruginosa*,
  *Clostridioides difficile*, *Acinetobacter baumannii*, *Nocardia*, *Actinomyces*, *Stenotrophomonas maltophilia*,
  *Burkholderia cepacia*.
- *Parásitos*: *Toxoplasma gondii*, *Strongyloides stercoralis* (hiperinfección), *Cryptosporidium*,
  *Trypanosoma cruzi* (reactivación), *Giardia lamblia*, *Sarcoptes scabiei* (sarna noruega).
- *Hongos*: *Candida albicans*, *Pneumocystis jirovecii*, *Cryptococcus neoformans*, *Aspergillus* spp.,
  *Histoplasma capsulatum*, mucorales, *Fusarium*.

En total son **114 agentes únicos** en `src/data/agentes.js`. Muchos aparecen en varios núcleos: *S. aureus*, *S. pyogenes*,
*T. pallidum*, *T. cruzi*, *Toxoplasma*, herpesvirus y *M. tuberculosis*. Por eso cada agente se define **una vez**
y declara a qué núcleos pertenece.

## Sprites: por morfología, no por especie

**Técnica liviana elegida: horneado por especie.** La primera vez que aparece una especie, se dibuja una sola vez
en una textura chica (192 px) a partir de la pieza base:
- tinte;
- estiramiento;
- copias en par, cadena o racimo;
- y, según la especie, cápsula, flagelos o espora.

La textura queda cacheada. Desde ahí cada enemigo es **una sola imagen**, igual que hoy: no suma objetos ni dibujos
por frame. Solo se hornean las especies que salen en la partida (un núcleo tiene 5 a 30), así que en memoria son
unos pocos MB. Es la misma técnica que ya usa el juego para las siluetas de contorno.

Se descartó armar cada enemigo con varias imágenes por frame: multiplica objetos y dibujos (68 enemigos × 3-4
piezas) y en celulares de gama baja se nota.

Hacer ~120 sprites únicos no es viable ni hace falta: lo que se ve al microscopio es la morfología. Propuesta:
**un sprite por morfología** (~35) y la identidad de cada especie dada por:
- el nombre al aparecer;
- un color o tinte propio;
- su rasgo de comportamiento;
- su ficha en el bestiario.

| Sprite | Estado | Especies que lo usan (ejemplos) |
|---|---|---|
| cocos en racimo | ✅ existe | *S. aureus* |
| cocos en cadena | ➕ nuevo | *S. pyogenes*, *S. agalactiae*, *Enterococcus* |
| diplococos | ➕ nuevo | *S. pneumoniae* (lanceolados), *N. meningitidis*, *N. gonorrhoeae*, *Moraxella* |
| bacilo flagelado | ✅ existe | *E. coli*, *Salmonella*, *Proteus*, *Pseudomonas* |
| bacilo encapsulado | ✅ existe | *Klebsiella*, *H. influenzae* (cocobacilo) |
| bacilo esporulado | ➕ nuevo | *Clostridium* (tetani "en palillo de tambor", perfringens, botulinum, difficile), *Bacillus cereus* |
| bacilo ácido-alcohol resistente | ➕ nuevo | *M. tuberculosis*, *M. leprae*, MAC, *Nocardia* |
| bacilo curvo / espiral | ✅ vibrio | *Vibrio cholerae*, *Campylobacter*, *Helicobacter* |
| espiroqueta | ✅ existe | *T. pallidum*, *Leptospira* |
| bacterias sin pared / intracelulares | ➕ nuevo | *Mycoplasma*, *Chlamydia* (cuerpos elementales) |
| virus envuelto con espículas | ✅ existe | influenza, SARS-CoV-2, VSR, sarampión |
| cápside icosaédrica desnuda | ✅ existe | adenovirus, rotavirus, norovirus, enterovirus, VPH |
| herpesvirus (cápside + tegumento) | ✅ "virión en corte" | VHS, VZV, CMV, EBV, HHV-6/7/8 |
| retrovirus | ➕ nuevo | VIH, HTLV |
| virus en bala | ➕ nuevo | rabia |
| arbovirus pequeños envueltos | ➕ nuevo | dengue, zika, fiebre amarilla, chikungunya |
| hepadnavirus | ➕ nuevo | VHB (partícula de Dane) |
| *Giardia*, ameba, tripanosoma, ciliado | ✅ existen | *Giardia*, *Entamoeba*, *T. cruzi*, *Balantidium* |
| *Trichomonas* | ➕ nuevo | *T. vaginalis* |
| apicomplexa (taquizoíto, ooquiste) | ➕ nuevo | *Toxoplasma*, *Cryptosporidium* |
| *Plasmodium* en glóbulo rojo | ➕ nuevo | *Plasmodium* spp. |
| *Leishmania* (promastigote) | ➕ nuevo | *Leishmania* spp. |
| nematodos (gusano) | ✅ gusano | *Ascaris*, *Enterobius*, *Strongyloides*, *Toxocara*, *Trichinella* (larva) |
| cestodos (escólex) | ✅ existe | *Taenia*, *Echinococcus* |
| quiste hidatídico | ➕ nuevo (jefe) | *Echinococcus granulosus* |
| levadura en gemación / encapsulada | ✅ existen | *Candida*, *Cryptococcus*, *Malassezia*, *Histoplasma* |
| hifas / conidióforo | ✅ existen | *Aspergillus*, dermatofitos, *Fusarium*, mucorales |
| *Pneumocystis* (quistes) | ➕ nuevo | *P. jirovecii* |
| ácaro | ➕ nuevo | *Sarcoptes scabiei* |

En `src/data/agentes.js` quedaron **39 morfologías**:
- **17** usan un sprite existente tal cual.
- **10** se arman por código desde un sprite existente (variación).
- **12** necesitan una pieza nueva. Mientras tanto usan un suplente: bacilo ácido-alcohol resistente, sin pared,
  *Chlamydia*, retrovirus, virus en bala, poxvirus, *Leishmania*, *Trichomonas*, apicomplexa, *Plasmodium*, ácaro y
  *Pneumocystis*.

## Modelo de datos

Todo en `src/data/` (UMD, con tests), separado del motor:

```js
// src/data/agentes.js — un registro por agente
{
  id: 'neisseria-meningitidis',
  nombre: 'Neisseria meningitidis',
  familia: 'bacteria',                       // bacteria | virus | fungus | parasite
  sprite: 'bacteria_diplococcus',            // morfología
  tinte: 0xffb08a,                           // distingue especies con el mismo sprite
  nucleos: ['7.1'],
  ficha: 'Diplococo Gram (−), encapsulado…', // 1-2 líneas, revisadas con revisor-contenido-medico
  rasgos: ['capsula'],                       // comportamientos reutilizables (ver abajo)
  balance: { hp: 1.0, velocidad: 1.05, dano: 1.1 }
}

// src/data/nucleos.js
{ id: '7.1', nombre: 'Agentes que afectan al SNC', tejido: 'tissue_neural',
  agentes: ['mycobacterium-tuberculosis', 'haemophilus-influenzae-b', …],
  jefe: 'neisseria-meningitidis', preguntas: { temas: […], ids: […] } }
```

**Rasgos de comportamiento** reutilizables, en vez de un comportamiento a mano por especie:

| Rasgo | Qué hace en el juego | Agentes |
|---|---|---|
| cápsula | resiste la fagocitosis hasta perder vida | neumococo, *Klebsiella*, *Hib*, meningococo, *Cryptococcus* |
| toxina | daño en área o lentitud al contacto | *C. tetani*, *C. botulinum*, *C. diphtheriae*, STEC, *V. cholerae* |
| esporas | proyectiles o resistencia | *Clostridium*, *Bacillus*, hongos filamentosos |
| biofilm | zonas que frenan | *Pseudomonas*, *S. aureus*, *Proteus* |
| intracelular | se esconde un rato (invulnerable) | *Chlamydia*, *M. tuberculosis*, *Toxoplasma*, *Leishmania* |
| latencia | desaparece y reaparece más adelante | herpesvirus |
| variación antigénica | cambia de tinte y de resistencia | influenza, *T. cruzi*, *Plasmodium* |
| flagelos | rápido y errático | *E. coli*, *Proteus*, *Giardia*, *Trichomonas* |
| ciclo con vector | entra en oleadas desde el borde | dengue, *Plasmodium*, *Leishmania*, *T. cruzi* |
| oportunista | más fuerte si tu vida está baja | núcleo 13-14 |

## Preguntas

- Etiquetar las 83 preguntas actuales con su núcleo. Hoy tienen *topic* (Bacteriología, Virología…), no núcleo.
- Sumar preguntas por núcleo a partir de los cuadernillos, revisadas con `revisor-contenido-medico`.
  Mínimo sugerido: ~15 por núcleo y por dificultad.
- En el modo núcleo, una respuesta correcta sobre un agente puede debilitar a ese agente en la partida, para
  unir la pregunta con el juego.

## Etapas

1. ✅ **Datos**: `src/data/agentes.js` con núcleos, agentes, morfologías, rasgos y jefes, más tests de consistencia.
   Faltan las fichas médicas: van en la etapa 2, revisadas con `revisor-contenido-medico`.
2. **Identidad con los sprites actuales**: horneado por especie (tinte y variaciones), nombre al aparecer, fichas
   revisadas y bestiario al terminar la partida.
3. **Modo Foco por núcleo**: selector en el menú, enemigos y preguntas filtrados, tejido y jefe del núcleo,
   récord por núcleo.
4. **Sandbox**: Laboratorio para jugadores que mezcla todo, sin puntaje.
5. **Las 12 piezas nuevas** de sprite.
6. **Rasgos de comportamiento**, uno por vez, con tests en el arnés.
7. **Preguntas por núcleo**, más el banco general de defensa contra agentes.

## Decisiones pendientes

- Núcleo 6.1: ¿se juega solo o junto con el 6? (ver arriba).
