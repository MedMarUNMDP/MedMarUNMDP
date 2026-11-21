/* Inmune Survivors — fichas de los agentes (lo que lee el jugador en el bestiario y al ver un agente nuevo).
 *
 * Una por id de src/data/agentes.js. Tres líneas cortas:
 *   clase: qué es (morfología / clasificación)
 *   cuadro: qué produce (síndrome o cuadro principal)
 *   clave: un dato para recordar (diagnóstico, virulencia, transmisión o prevención)
 * Fuente: material de la cátedra ADN 2026 (cuadernillos, Compendio, agentes del tercer parcial) y bibliografía
 * estándar. Validadas el 2026-11-21: revisión de `revisor-contenido-medico` contra el material de la cátedra y
 * aprobación del autor de MedMar (las 114). Cualquier cambio vuelve a pasar por las dos.
 */
(function registerFichas(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.InmuneFichas = api;
})(typeof globalThis !== 'undefined' ? globalThis : null, function createFichas() {
  'use strict';
  const f = (clase, cuadro, clave) => Object.freeze({ clase, cuadro, clave });

  const FICHAS = Object.freeze({
    // ---------- Bacterias ----------
    'staphylococcus-aureus': f('Coco Gram (+) en racimos, catalasa y coagulasa positivo.', 'Infecciones de piel y partes blandas, intoxicación alimentaria por toxina preformada, neumonía y bacteriemia.', 'Produce toxinas (enterotoxinas, TSST-1, exfoliativas); SARM es la cepa resistente a meticilina.'),
    'streptococcus-pyogenes': f('Coco Gram (+) en cadenas, β-hemolítico del grupo A.', 'Faringitis, impétigo, erisipela, celulitis y escarlatina.', 'Secuelas no supurativas: fiebre reumática y glomerulonefritis postestreptocócica.'),
    'streptococcus-pneumoniae': f('Diplococo Gram (+) lanceolado, α-hemolítico y encapsulado.', 'Neumonía de la comunidad, otitis, sinusitis y meningitis.', 'La cápsula es su principal factor de virulencia; hay vacunas conjugada y polisacárida.'),
    'streptococcus-agalactiae': f('Coco Gram (+) en cadenas, β-hemolítico del grupo B (EGB).', 'Sepsis y meningitis neonatal.', 'Se pesquisa con hisopado vaginal y rectal entre las semanas 35 y 37 del embarazo.'),
    'enterococcus-faecalis': f('Coco Gram (+) en pares o cadenas cortas, del tracto intestinal.', 'Infección urinaria, endocarditis e infecciones intrahospitalarias.', 'Resistencia intrínseca a cefalosporinas.'),
    'neisseria-meningitidis': f('Diplococo Gram (−) encapsulado, aerobio y oxidasa positivo.', 'Meningitis y meningococcemia (sepsis con púrpura).', 'Su endotoxina (LOS) causa shock; hay vacunas para varios serogrupos.'),
    'neisseria-gonorrhoeae': f('Diplococo Gram (−) intracelular en neutrófilos.', 'Uretritis purulenta, cervicitis, enfermedad pélvica inflamatoria y conjuntivitis neonatal.', 'Se cultiva en agar chocolate o Thayer-Martin; no hay vacuna.'),
    'moraxella-catarrhalis': f('Diplococo Gram (−) de la vía aérea.', 'Otitis media, sinusitis y exacerbaciones de EPOC.', 'Suele producir β-lactamasa.'),
    'escherichia-coli': f('Bacilo Gram (−) entérico, anaerobio facultativo.', 'Diarreas (EPEC, ETEC, EIEC, STEC) e infección urinaria (uropatógena).', 'STEC (O157:H7) produce toxina Shiga y puede causar síndrome urémico hemolítico.'),
    'shigella': f('Bacilo Gram (−) inmóvil, enteroinvasivo.', 'Disentería: diarrea con sangre, moco y fiebre.', 'Dosis infectante muy baja; S. dysenteriae tipo 1 produce toxina Shiga.'),
    'salmonella': f('Bacilo Gram (−) móvil, intracelular facultativo.', 'Gastroenteritis (no tifoidea) y fiebre tifoidea (S. Typhi).', 'Se transmite por alimentos, sobre todo huevo y pollo; S. Typhi solo tiene reservorio humano.'),
    'campylobacter': f('Bacilo Gram (−) curvo, en "alas de gaviota", microaerófilo.', 'Diarrea inflamatoria transmitida por alimentos (aves).', 'Se asocia al síndrome de Guillain-Barré.'),
    'helicobacter-pylori': f('Bacilo Gram (−) curvo y flagelado, productor de ureasa.', 'Gastritis crónica y úlcera péptica.', 'Factor de riesgo de adenocarcinoma y linfoma MALT gástricos.'),
    'yersinia-enterocolitica': f('Cocobacilo Gram (−) que crece a bajas temperaturas.', 'Enterocolitis y adenitis mesentérica (puede simular apendicitis).', 'Se transmite por cerdo poco cocido; al crecer en frío puede contaminar sangre almacenada para transfusión.'),
    'vibrio-cholerae': f('Bacilo Gram (−) curvo, con un flagelo polar.', 'Cólera: diarrea acuosa profusa ("agua de arroz") con deshidratación grave.', 'La toxina colérica activa la adenilato ciclasa; el tratamiento es la rehidratación.'),
    'bacillus-cereus': f('Bacilo Gram (+) esporulado, aerobio facultativo y móvil.', 'Intoxicación alimentaria emética o diarreica.', 'Síndrome emético asociado al arroz recalentado (toxina termoestable).'),
    'clostridium-botulinum': f('Bacilo Gram (+) anaerobio esporulado.', 'Botulismo: parálisis flácida descendente.', 'La toxina botulínica bloquea la liberación de acetilcolina; existe el botulismo del lactante.'),
    'clostridium-tetani': f('Bacilo Gram (+) anaerobio con espora terminal ("palillo de tambor").', 'Tétanos: espasmos y rigidez muscular (trismus, opistótonos).', 'La tetanospasmina bloquea la liberación de GABA y glicina; se previene con la vacuna (doble/triple).'),
    'clostridium-perfringens': f('Bacilo Gram (+) grande, anaerobio e inmóvil; rara vez esporula.', 'Gangrena gaseosa (mionecrosis) e intoxicación alimentaria.', 'La toxina α (lecitinasa) destruye membranas; produce gas en los tejidos.'),
    'clostridioides-difficile': f('Bacilo Gram (+) anaerobio esporulado.', 'Diarrea asociada a antibióticos y colitis pseudomembranosa.', 'Toxinas A y B; las esporas resisten el alcohol en gel (lavado con agua y jabón).'),
    'proteus-mirabilis': f('Bacilo Gram (−) muy móvil ("swarming"), productor de ureasa.', 'Infección urinaria.', 'La ureasa alcaliniza la orina y favorece cálculos de estruvita.'),
    'klebsiella': f('Bacilo Gram (−) inmóvil con gran cápsula (colonias mucoides).', 'Neumonía (esputo "jalea de grosella"), infección urinaria e intrahospitalarias.', 'Cepas productoras de carbapenemasas (KPC) muy resistentes.'),
    'klebsiella-granulomatis': f('Bacilo Gram (−) encapsulado, intracelular en macrófagos.', 'Donovanosis (granuloma inguinal): úlcera genital indolora.', 'Cuerpos de Donovan en macrófagos; da pseudobubones, no adenopatía verdadera.'),
    'haemophilus-influenzae': f('Cocobacilo Gram (−) que requiere factores X y V.', 'Meningitis, epiglotitis, otitis y neumonía.', 'El tipo b (Hib) es encapsulado; la vacuna Hib está en el calendario.'),
    'haemophilus-ducreyi': f('Cocobacilo Gram (−) en "vías de tren".', 'Chancroide (chancro blando): úlcera genital dolorosa con adenopatía.', 'Requiere factor X para crecer; es cofactor de transmisión del VIH.'),
    'bordetella-pertussis': f('Cocobacilo Gram (−) aerobio estricto.', 'Tos convulsa (coqueluche): accesos de tos con "gallo" inspiratorio.', 'Toxina pertussis; se previene con la vacuna (triple, también en el embarazo).'),
    'corynebacterium-diphtheriae': f('Bacilo Gram (+) pleomórfico ("letras chinas").', 'Difteria: faringitis con pseudomembrana; miocarditis y neuropatía.', 'La toxina diftérica inhibe la síntesis proteica (EF-2); se previene con la vacuna.'),
    'mycoplasma-pneumoniae': f('Bacteria sin pared celular (no se tiñe con Gram).', 'Neumonía atípica ("neumonía caminante").', 'No responde a β-lactámicos por no tener pared.'),
    'micoplasmas-genitales': f('Bacterias sin pared (Mycoplasma genitalium, Ureaplasma).', 'Uretritis no gonocócica y cervicitis.', 'No se ven con Gram; el diagnóstico es por PCR.'),
    'chlamydophila-pneumoniae': f('Bacteria intracelular obligada (cuerpos elementales y reticulares).', 'Neumonía atípica, faringitis y bronquitis.', 'Ciclo bifásico; se trata con macrólidos o tetraciclinas.'),
    'chlamydia-trachomatis': f('Bacteria intracelular obligada con ciclo bifásico.', 'Uretritis, cervicitis, EPI, linfogranuloma venéreo (L1-L3) y tracoma.', 'Infección de transmisión sexual frecuente y a menudo asintomática.'),
    'chlamydophila-psittaci': f('Bacteria intracelular obligada.', 'Psitacosis: neumonía atípica.', 'Se adquiere al inhalar polvo de deyecciones de aves (loros, palomas).'),
    'treponema-pallidum': f('Espiroqueta (no se ve con Gram; microscopía de campo oscuro).', 'Sífilis primaria (chancro duro indoloro), secundaria, latente y terciaria; sífilis congénita.', 'Diagnóstico con pruebas no treponémicas (VDRL) y treponémicas.'),
    'leptospira-interrogans': f('Espiroqueta con extremos en gancho.', 'Leptospirosis: cuadro febril; formas graves con ictericia y falla renal (Weil).', 'Se contagia por agua o suelo con orina de roedores.'),
    'brucella': f('Cocobacilo Gram (−) intracelular facultativo.', 'Brucelosis: fiebre ondulante, sudoración y artralgias.', 'Zoonosis por lácteos sin pasteurizar o contacto con ganado.'),
    'mycobacterium-tuberculosis': f('Bacilo ácido-alcohol resistente (Ziehl-Neelsen); pared rica en ácidos micólicos.', 'Tuberculosis pulmonar y extrapulmonar (incluida la meningitis tuberculosa).', 'Forma granulomas y puede quedar latente; la BCG previene formas graves en niños.'),
    'mycobacterium-leprae': f('Bacilo ácido-alcohol resistente que no se cultiva in vitro.', 'Lepra (enfermedad de Hansen): lesiones de piel con pérdida de sensibilidad.', 'Afecta piel y nervios periféricos; formas tuberculoide y lepromatosa.'),
    'micobacterias-atipicas': f('Bacilos ácido-alcohol resistentes del complejo Mycobacterium avium (MAC).', 'Infección diseminada en personas con VIH avanzado.', 'Oportunista con CD4 menores de 50/µL; profilaxis o tratamiento con macrólidos.'),
    'nocardia': f('Bacilo Gram (+) ramificado, parcialmente ácido-alcohol resistente.', 'Neumonía y abscesos cerebrales en inmunodeprimidos.', 'Vive en el suelo; se adquiere por inhalación.'),
    'actinomyces': f('Bacilo Gram (+) ramificado, anaerobio.', 'Actinomicosis: abscesos con fístulas y "gránulos de azufre".', 'Es parte de la flora oral; no es ácido-alcohol resistente.'),
    'pseudomonas-aeruginosa': f('Bacilo Gram (−) aerobio, oxidasa positivo, pigmento verde.', 'Infecciones intrahospitalarias: neumonía, quemaduras, infección urinaria.', 'Forma biopelículas y tiene resistencia natural a muchos antibióticos.'),
    'acinetobacter-baumannii': f('Cocobacilo Gram (−) no fermentador.', 'Neumonía asociada a ventilación y bacteriemia intrahospitalaria.', 'Multirresistente; persiste mucho tiempo en superficies.'),
    'stenotrophomonas-maltophilia': f('Bacilo Gram (−) no fermentador.', 'Infecciones intrahospitalarias en pacientes graves.', 'Resistente de forma natural a los carbapenémicos.'),
    'burkholderia-cepacia': f('Bacilo Gram (−) no fermentador (complejo B. cepacia).', 'Neumonía en fibrosis quística y en inmunodeprimidos.', 'Muy resistente a antibióticos y antisépticos.'),
    'enterobacter': f('Bacilo Gram (−) entérico.', 'Infección urinaria e infecciones intrahospitalarias.', 'Tiene β-lactamasa AmpC inducible.'),
    'serratia': f('Bacilo Gram (−) entérico; algunas cepas dan pigmento rojo.', 'Infecciones intrahospitalarias (urinarias y respiratorias).', 'Oportunista en pacientes internados.'),

    // ---------- Virus ----------
    'rotavirus': f('Virus ARN de doble cadena segmentado, desnudo (Reoviridae).', 'Diarrea aguda grave en lactantes y niños pequeños.', 'Hay vacuna oral en el calendario.'),
    'norovirus': f('Virus ARN (+), desnudo (Caliciviridae).', 'Gastroenteritis aguda con vómitos, en brotes.', 'Muy contagioso y resistente en superficies; dosis infectante baja.'),
    'adenovirus': f('Virus ADN de doble cadena, desnudo e icosaédrico con fibras.', 'Infecciones respiratorias, conjuntivitis y diarrea (serotipos 40 y 41); cistitis hemorrágica.', 'Muy estable en el ambiente.'),
    'astrovirus': f('Virus ARN (+), desnudo, con forma de estrella.', 'Diarrea leve en niños.', 'Transmisión fecal-oral.'),
    'enterovirus': f('Virus ARN (+), desnudos (Picornaviridae): poliovirus, Coxsackie y echovirus.', 'Meningitis viral, poliomielitis, herpangina, mano-pie-boca y miocarditis.', 'Transmisión fecal-oral; la vacuna (IPV) previene la polio.'),
    'hepatitis-a': f('Virus ARN (+), desnudo (Picornaviridae).', 'Hepatitis aguda; no se cronifica.', 'Transmisión fecal-oral; hay vacuna en el calendario.'),
    'hepatitis-e': f('Virus ARN (+), desnudo (Hepeviridae).', 'Hepatitis aguda.', 'Transmisión fecal-oral; puede ser grave en embarazadas.'),
    'hepatitis-b': f('Virus ADN parcialmente bicatenario, envuelto (Hepadnaviridae).', 'Hepatitis aguda y crónica; cirrosis y carcinoma hepatocelular.', 'Transmisión sexual, sanguínea y vertical; vacuna al nacer en el calendario.'),
    'hepatitis-c': f('Virus ARN (+), envuelto (Flaviviridae).', 'Hepatitis crónica, cirrosis y carcinoma hepatocelular.', 'Transmisión sobre todo sanguínea; no hay vacuna pero tiene tratamiento curativo.'),
    'hepatitis-d': f('Virus ARN (−) circular defectivo (deltavirus) que usa el HBsAg como envoltura.', 'Hepatitis grave por coinfección o sobreinfección con VHB.', 'Solo se replica con el VHB: la vacuna contra la hepatitis B también lo previene.'),
    'influenza': f('Virus ARN (−) segmentado, envuelto (Orthomyxoviridae).', 'Gripe: fiebre, mialgias y tos; neumonía en grupos de riesgo.', 'Deriva y cambio antigénico (hemaglutinina y neuraminidasa); vacuna anual.'),
    'vsr': f('Virus ARN (−), envuelto (Pneumoviridae).', 'Bronquiolitis en lactantes.', 'Principal causa de internación respiratoria en menores de un año.'),
    'rinovirus': f('Virus ARN (+), desnudo (Picornaviridae).', 'Resfrío común.', 'Replica mejor a 33 °C, la temperatura de la nariz.'),
    'coronavirus': f('Virus ARN (+), envuelto, con espículas en "corona" (Coronaviridae).', 'Desde resfrío común hasta COVID-19 (SARS-CoV-2) con neumonía.', 'En SARS-CoV-2, la proteína S se une al receptor ACE2.'),
    'parainfluenza': f('Virus ARN (−), envuelto (Paramyxoviridae).', 'Laringotraqueítis (crup) en niños.', 'Tos "perruna" y estridor.'),
    'epstein-barr': f('Herpesvirus ADN de doble cadena (HHV-4).', 'Mononucleosis infecciosa (fiebre, faringitis, adenopatías).', 'Latencia en linfocitos B; asociado a linfomas y carcinoma nasofaríngeo.'),
    'arbovirus-snc': f('Virus ARN transmitidos por artrópodos.', 'Encefalitis y meningoencefalitis.', 'La transmisión depende del vector y de la estación.'),
    'vih': f('Retrovirus ARN (+) con transcriptasa inversa (Lentivirus).', 'Infección crónica que destruye linfocitos CD4+ y lleva al SIDA.', 'Diagnóstico con tamizaje y confirmación (carga viral); prevención con preservativo, PrEP y TARV.'),
    'vph': f('Virus ADN de doble cadena circular, desnudo (Papillomaviridae).', 'Verrugas, condilomas y lesiones precursoras de cáncer de cuello uterino.', 'Tipos de alto riesgo (16 y 18); vacuna en el calendario.'),
    'herpes-simple': f('Herpesvirus ADN de doble cadena, envuelto (VHS-1 y VHS-2).', 'Herpes labial y genital; encefalitis y herpes neonatal.', 'Latencia en ganglios sensitivos con reactivaciones.'),
    'citomegalovirus': f('Herpesvirus ADN de doble cadena (HHV-5).', 'Infección congénita más frecuente; retinitis y colitis en inmunodeprimidos.', 'Células gigantes con inclusiones en "ojo de búho".'),
    'varicela-zoster': f('Herpesvirus ADN de doble cadena (HHV-3).', 'Varicela (exantema vesicular) y, al reactivarse, herpes zóster.', 'Latencia en ganglios sensitivos; hay vacuna.'),
    'rubeola': f('Virus ARN (+), envuelto (Rubivirus; antes Togaviridae, hoy Matonaviridae).', 'Exantema leve; síndrome de rubéola congénita.', 'Grave en el primer trimestre del embarazo; vacuna triple viral.'),
    'sarampion': f('Virus ARN (−), envuelto (Paramyxoviridae).', 'Fiebre, tos, conjuntivitis y exantema; manchas de Koplik.', 'Muy contagioso por vía aérea; vacuna triple viral.'),
    'hhv-6-7': f('Herpesvirus ADN de doble cadena (HHV-6 y HHV-7).', 'Exantema súbito (roséola, sexta enfermedad) en lactantes, sobre todo por HHV-6.', 'Fiebre alta que, al bajar, deja un exantema.'),
    'hhv-8': f('Herpesvirus ADN de doble cadena (HHV-8).', 'Sarcoma de Kaposi.', 'Asociado a inmunodepresión, sobre todo VIH.'),
    'parvovirus-b19': f('Virus ADN de cadena simple, desnudo (Parvoviridae).', 'Eritema infeccioso (quinta enfermedad, "cara abofeteada").', 'Afecta precursores eritroides: crisis aplásica e hidrops fetal.'),
    'molusco-contagioso': f('Poxvirus ADN de doble cadena.', 'Pápulas umbilicadas en la piel.', 'Se contagia por contacto directo; frecuente en niños.'),
    'dengue': f('Flavivirus ARN (+), envuelto; cuatro serotipos.', 'Dengue: fiebre, dolor retroocular y mialgias; formas graves con shock.', 'Lo transmite Aedes aegypti; reinfectarse con otro serotipo aumenta el riesgo de dengue grave.'),
    'fiebre-amarilla': f('Flavivirus ARN (+), envuelto.', 'Fiebre, ictericia y hemorragias.', 'Transmisión por Aedes (urbana) y Haemagogus/Sabethes (selvática); vacuna a virus atenuado.'),
    'zika': f('Flavivirus ARN (+), envuelto.', 'Cuadro febril leve con exantema; microcefalia congénita.', 'Transmisión por Aedes, también sexual y vertical.'),
    'chikungunya': f('Alfavirus ARN (+), envuelto.', 'Fiebre con artralgias intensas que pueden persistir.', 'Transmisión por Aedes.'),
    'oropouche': f('Orthobunyavirus (Peribunyaviridae), ARN (−) con 3 segmentos.', 'Cuadro febril agudo parecido al dengue.', 'Lo transmiten jejenes (Culicoides) y también algunos Culex.'),
    'encefalitis-equina': f('Alfavirus ARN (+), envuelto.', 'Encefalitis en humanos y equinos.', 'Transmisión por mosquitos; zoonosis.'),
    'rabia': f('Lyssavirus ARN (−), envuelto, con forma de bala (Rhabdoviridae).', 'Encefalitis casi siempre mortal una vez que hay síntomas.', 'Viaja por los nervios; profilaxis postexposición con vacuna y gammaglobulina.'),
    'hantavirus': f('Orthohantavirus ARN (−) con 3 segmentos, envuelto.', 'Síndrome cardiopulmonar por hantavirus.', 'Se adquiere al inhalar excretas de roedores silvestres; la cepa Andes se contagia entre personas.'),
    'junin': f('Arenavirus ARN (−), envuelto.', 'Fiebre hemorrágica argentina.', 'Reservorio: ratón maicero (Calomys musculinus); hay vacuna (Candid#1).'),
    'mpox': f('Poxvirus ADN de doble cadena (Orthopoxvirus).', 'Fiebre con adenopatías y lesiones vesiculopustulosas.', 'Contacto estrecho, incluido el sexual.'),

    // ---------- Parásitos ----------
    'giardia-lamblia': f('Protozoo flagelado; trofozoíto con forma de pera y quiste.', 'Diarrea con malabsorción (esteatorrea).', 'Se transmite por agua o alimentos con quistes; se diagnostica con coproparasitológico seriado.'),
    'entamoeba-histolytica': f('Protozoo ameboide; trofozoíto y quiste tetranucleado.', 'Amebiasis: disentería y absceso hepático.', 'El trofozoíto con eritrocitos fagocitados es característico de la forma invasiva (la distingue de E. dispar).'),
    'cryptosporidium': f('Protozoo apicomplexa; ooquistes ácido-alcohol resistentes.', 'Diarrea acuosa, grave y prolongada en inmunodeprimidos.', 'Resiste el cloro del agua.'),
    'ascaris-lumbricoides': f('Nematodo intestinal grande.', 'Ascariosis: dolor abdominal, obstrucción intestinal y síndrome de Löffler.', 'Ciclo con paso pulmonar de las larvas; huevos en heces.'),
    'enterobius-vermicularis': f('Nematodo pequeño (oxiuro).', 'Prurito anal nocturno.', 'Se diagnostica con el test de Graham; frecuente en niños.'),
    'trichinella-spiralis': f('Nematodo cuyas larvas se enquistan en el músculo.', 'Triquinosis: fiebre, mialgias, edema palpebral y eosinofilia.', 'Se adquiere al comer carne de cerdo o de caza mal cocida.'),
    'taenia': f('Cestodos intestinales (T. solium y T. saginata).', 'Teniosis intestinal; T. solium también causa cisticercosis.', 'Neurocisticercosis por ingerir huevos de T. solium.'),
    'echinococcus-granulosus': f('Cestodo pequeño; en el humano forma quistes (larva).', 'Hidatidosis: quistes en hígado y pulmón.', 'Ciclo perro–oveja; el humano es hospedador accidental.'),
    'strongyloides-stercoralis': f('Nematodo con autoinfección.', 'Estrongiloidiasis; hiperinfección grave en inmunodeprimidos (corticoides).', 'Las larvas atraviesan la piel.'),
    'uncinarias': f('Nematodos intestinales (Ancylostoma duodenale y Necator americanus).', 'Anemia ferropénica por pérdida crónica de sangre.', 'Las larvas penetran por la piel.'),
    'larva-migrans': f('Larvas de uncinarias de perro y gato (A. braziliense y A. caninum).', 'Larva migrans cutánea: lesión serpiginosa con prurito.', 'Se adquiere al caminar descalzo sobre arena o tierra contaminada.'),
    'toxocara-canis': f('Nematodo del perro.', 'Larva migrans visceral y ocular.', 'Se adquiere al ingerir huevos del suelo (geofagia en niños).'),
    'trichomonas-vaginalis': f('Protozoo flagelado; solo forma trofozoíto.', 'Vaginitis con flujo espumoso y uretritis.', 'Se transmite por vía sexual; hay que tratar a la pareja.'),
    'toxoplasma-gondii': f('Protozoo apicomplexa, intracelular obligado.', 'Toxoplasmosis congénita y encefalitis en personas con VIH.', 'El gato es hospedador definitivo; contagio por carne mal cocida o heces de gato.'),
    'trypanosoma-cruzi': f('Protozoo flagelado (tripomastigote y amastigote).', 'Enfermedad de Chagas: aguda y crónica (cardiopatía, megavísceras).', 'Lo transmite la vinchuca; también vertical, transfusional y oral.'),
    'plasmodium': f('Protozoo apicomplexa intraeritrocitario.', 'Malaria (paludismo): fiebre cíclica y anemia.', 'Lo transmite el mosquito Anopheles; diagnóstico con gota gruesa y frotis.'),
    'leishmania': f('Protozoo flagelado: amastigote en el humano, promastigote en el vector.', 'Leishmaniasis cutánea, mucocutánea y visceral.', 'La transmite el flebótomo (Lutzomyia).'),
    'sarcoptes-scabiei': f('Ácaro microscópico.', 'Escabiosis (sarna): prurito nocturno y surcos en la piel.', 'Sarna noruega (costrosa) en inmunodeprimidos, muy contagiosa.'),

    // ---------- Hongos ----------
    'candida': f('Levadura que forma seudohifas (C. albicans también hifas verdaderas), comensal.', 'Muguet, vulvovaginitis, intertrigo y candidiasis invasiva.', 'Oportunista: antibióticos, diabetes e inmunodepresión la favorecen.'),
    'cryptococcus-neoformans': f('Levadura con gran cápsula.', 'Meningitis criptocócica en personas con VIH.', 'Tinta china y antígeno capsular en el LCR; asociado a excrementos de paloma.'),
    'malassezia-furfur': f('Levadura lipofílica de la piel.', 'Pitiriasis versicolor: manchas hipo o hipercrómicas.', 'Imagen en "spaghetti con albóndigas" en el examen directo.'),
    'histoplasma-capsulatum': f('Hongo dimorfo; levadura intracelular en macrófagos.', 'Histoplasmosis pulmonar y diseminada en inmunodeprimidos.', 'Se inhala del suelo con guano de aves o murciélagos.'),
    'coccidioides': f('Hongo dimorfo; forma esférulas con endosporas en tejido.', 'Coccidioidomicosis pulmonar.', 'Endémico de zonas áridas; se inhalan artroconidios.'),
    'paracoccidioides-brasiliensis': f('Hongo dimorfo; levadura con gemación múltiple ("timón de barco").', 'Paracoccidioidomicosis: lesiones pulmonares y mucocutáneas.', 'Micosis profunda endémica de Sudamérica, en trabajadores rurales.'),
    'sporothrix-schenckii': f('Hongo dimorfo.', 'Esporotricosis linfocutánea.', 'Se inocula por espinas o astillas ("enfermedad del jardinero").'),
    'dermatofitos': f('Hongos filamentosos queratinofílicos (Trichophyton, Microsporum, Epidermophyton).', 'Tiñas de piel, pelo y uñas.', 'Viven de la queratina; examen directo con KOH.'),
    'aspergillus': f('Hongo filamentoso con hifas tabicadas y ramificación en ángulo agudo.', 'Aspergilosis invasiva, aspergiloma y aspergilosis broncopulmonar alérgica.', 'Grave en neutropénicos; se inhalan sus conidios.'),
    'mucorales': f('Hongos filamentosos con hifas anchas, sin tabiques.', 'Mucormicosis rinocerebral.', 'Asociada a cetoacidosis diabética; muy agresiva.'),
    'fusarium': f('Hongo filamentoso con hifas tabicadas.', 'Fusariosis diseminada en neutropénicos; queratitis.', 'Resistente a varios antifúngicos.'),
    'pneumocystis-jirovecii': f('Hongo atípico (no crece en cultivo); ascos (quistes) y formas tróficas.', 'Neumonía en personas con VIH con CD4 menores de 200.', 'Profilaxis con trimetoprima-sulfametoxazol.')
  });

  return Object.freeze({ FICHAS, ficha: (id) => FICHAS[id] || null });
});
