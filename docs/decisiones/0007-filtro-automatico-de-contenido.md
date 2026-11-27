# 0007 — Filtro automático de contenido

**Fecha:** 2026-11-29 · **Estado:** aceptada

## Contexto

Queríamos que el contenido que viola los Términos se retire solo, sin esperar a una denuncia. Tenía que ir a la
papelera normal (7 días, restaurable por la moderación) y funcionar con el plan Free de Supabase, sin mandar el
contenido de los estudiantes a terceros.

## Opciones evaluadas

| Opción | Por qué no o por qué sí |
|---|---|
| **Modelos de toxicidad en el navegador** (Transformers.js / ONNX) | Ninguno es liviano: el multilingüe más chico pesa unos 100 MB (int4) y el BERT multilingüe entre 179 y 712 MB. Es inviable descargarlo en cada celular, y además corre en el cliente, así que se puede esquivar llamando a la API a mano. |
| **Esos mismos modelos en la Edge Function** | El plan Free da 256 MB de memoria y entre 200 ms y 2 s de CPU por pedido. No entra. |
| **APIs externas** (Perspective, OpenAI Moderation, etc.) | No son locales: mandan las publicaciones a un tercero. Perspective además cierra el 31/12/2026 y no acepta proyectos nuevos desde febrero de 2026. |
| **Librerías de malas palabras** (`obscenity`, `bad-words`, listas como LDNOOBW o `cuss`) | Están pensadas para inglés o son listas genéricas de malas palabras en español. En rioplatense «boludo» o «la puta madre» son habla común: retirarían muchísimo contenido legítimo, y no distinguen un insulto dirigido de uno al aire. |
| **Reglas propias en la API (elegida)** | Sin dependencias, en microsegundos y sin datos que salgan de Supabase. Hechas para el rioplatense y para un sitio de medicina. |

## Decisión

**Texto.** `supabase/functions/api/filtro.ts`, con tests en `supabase/tests/filtro.test.ts`. Antes de comparar,
el texto se normaliza: minúsculas, sin tildes, «leet» (`p3l0tud0`), letras estiradas y letras separadas.

Se retira solo lo que es claramente una infracción:

- insultos **dirigidos** a una persona («sos un…», «…de mierda», «hijo de puta», «andate a la…»);
- expresiones discriminatorias;
- amenazas e incitación a autolesionarse;
- acoso sexual;
- DNI, CUIL o número de historia clínica (pueden identificar a un paciente).

**Qué se permite a propósito:**

- las malas palabras sueltas;
- mails y teléfonos;
- el vocabulario médico: «pene», «violación» o «ideación suicida» nunca se filtran solos.

Ante la duda no se retira: el resto lo cubren las denuncias.

**Dónde se aplica:**

- **Foro y Compra venta.** La publicación se guarda directo en la papelera (`eliminado_por = null`, motivo
  «Filtro automático: …»). A la persona le aparece el motivo al instante y le llega una notificación. La
  moderación recibe un aviso agrupado (campana y mail) y la puede restaurar desde la Papelera durante 7 días.
- **Seudónimos.** Se rechazan al guardarlos (`pseudonimo_no_permitido`).
- **Fotos de perfil.** Las revisa **NSFWJS** (MobileNetV2, 2,6 MB), alojado en `web/vendor/nsfwjs` y cargado
  solo cuando alguien cambia la foto. Se rechaza si Porn + Hentai suman al menos 0,6. Si el modelo no carga, se deja
  subir la foto.
  - Corre en el navegador porque la Edge Function no puede correr un modelo de imágenes.
  - Por eso alguien que llame a la API a mano lo esquiva: es un primer filtro y la denuncia sigue siendo la red.

**Qué no hace:**

- No aplica strikes: la sanción la decide siempre una persona.
- No revisa los chats privados.

## Consecuencias

- Las reglas hay que mantenerlas. Si aparecen falsos positivos o formas nuevas de insultar, se ajustan los patrones
  y los tests. La Papelera muestra «Filtro automático» como autor de la quita, así que es fácil auditar.
- Si algún día hay un modelo multilingüe chico, o un plan con más CPU, se puede sumar como segunda capa detrás de
  estas reglas.
