
        const FRONTEND_VERSION = "MedMar-frontend-2026-11-24-llaves"
        // Configurá estos dos valores desde Supabase Dashboard > Project Settings > API.
        // La publishable key SÍ puede ir en el frontend. La secret key NUNCA debe aparecer acá.
        // La seguridad de las tablas descansa en RLS + las políticas del schema.sql.
        const SUPABASE_URL = "https://ekfwdrsehhmrqxxlefyx.supabase.co"
        const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_ZZQREdrsOfFn8vIOaO3S0w_S7NKP9KS"
        const SUPABASE_FUNCTION_NAME = "api"
        // URL de la aplicación web de Apps Script que guarda los reportes anónimos en una planilla de Drive
        // (ver tools/reportes-apps-script/README.md). Vacía = la sección de reportes no se muestra.
        const REPORTES_URL = ""
        const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
            auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
        })

        let sesion = null
        let idEditando = null
let foroCargado = false
const foroCacheCliente = new Map()
// Caché del foro por filtro: clave "<etiqueta|_todos>::<búsqueda>". Usar siempre estas funciones
// (antes se borraba "_todos" a mano, una clave que no existía, y la caché nunca se invalidaba).
function claveForo(etiqueta, busqueda) {
    return (etiqueta || '_todos') + '::' + (busqueda || '')
}
function claveForoActual() {
    return claveForo(etiquetaFiltroActual, busquedaForoActual)
}
// Marca todas las entradas como viejas (se pintan al instante pero se vuelven a pedir) y,
// opcionalmente, ajusta la lista de hilos de cada una.
function invalidarCacheForo(ajustarHilos) {
    foroCacheCliente.forEach(function (cache) {
        if (!cache) return
        if (typeof ajustarHilos === 'function' && Array.isArray(cache.hilos)) cache.hilos = ajustarHilos(cache.hilos)
        cache.actualizadoEn = 0
    })
}
const chatCacheCliente = new Map()
const hiloCacheCliente = new Map()
const ACCIONES_LECTURA_DEDUPE = new Set([
    "bootstrap", "foroBootstrap", "listarEtiquetas", "listarHilos", "verHilo",
    "misSolicitudes", "misIntercambios", "miPerfil", "obtenerChat", "listarDenuncias",
    "listarModeradores", "soyModerador", "rankingJuego", "notificaciones"
])
const FRESCURA_FORO_CLIENTE_MS = 20000
const FRESCURA_USUARIO_CLIENTE_MS = 20000
let solicitudesUI = []
let respuestasUI = []
let hiloActualUI = null
let intercambiosUI = []
let ultimaActualizacionUsuario = 0
let datosUsuarioRefreshEnCurso = null
let chatAbiertoId = null
let chatCantidadServidor = 0
let chatDatosServidorCargados = false
let chatPollingTimer = null
let chatPollingEnCurso = false
let chatRealtimeChannel = null
let chatRealtimeEstado = ''
let usuarioRealtimeChannel = null
let usuarioRealtimeEstado = ''
const imagenesResueltasCliente = new Map()
let mensajesChatUI = []
let chatEnvioEnCurso = false
let hiloPublicacionEnCurso = false
const hilosPendientesConfirmacion = new Map()

        const loginScreen = document.getElementById("loginScreen")
        const app = document.getElementById("app")

        const tabLogin = document.getElementById("tabLogin")
        const tabRegistro = document.getElementById("tabRegistro")
        const btnGoogleLogin = document.getElementById("btnGoogleLogin")
        const formLogin = document.getElementById("formLogin")
        const formRegistro = document.getElementById("formRegistro")
        const authMsg = document.getElementById("authMsg")
        const btnOlvidePassword = document.getElementById("btnOlvidePassword")
        const panelRecuperarPassword = document.getElementById("panelRecuperarPassword")
        const formRecuperarPassword = document.getElementById("formRecuperarPassword")
        const resetEmail = document.getElementById("resetEmail")
        const pasoCodigoReset = document.getElementById("pasoCodigoReset")
        const resetCodigo = document.getElementById("resetCodigo")
        const resetNuevaPassword = document.getElementById("resetNuevaPassword")
        const btnRestablecerPassword = document.getElementById("btnRestablecerPassword")
        const btnVolverLoginDesdeReset = document.getElementById("btnVolverLoginDesdeReset")
        const msgReset = document.getElementById("msgReset")

        const userEmail = document.getElementById("userEmail")
        const logoutBtn = document.getElementById("logoutBtn")

        const form = document.getElementById("form")
        const tengo = document.getElementById("tengo")
        const busco = document.getElementById("busco")
        const msg = document.getElementById("msg")
        const submitBtn = document.getElementById("submitBtn")
        const cancelarEdicionBtn = document.getElementById("cancelarEdicionBtn")
        const seccionFormulario = document.getElementById("seccionFormulario")
        const tituloFormulario = document.getElementById("tituloFormulario")
        const listaSolicitudes = document.getElementById("listaSolicitudes")
        const listaIntercambios = document.getElementById("listaIntercambios")
        const panelChat = document.getElementById("panelChat")
        const btnCerrarChat = document.getElementById("btnCerrarChat")
        const chatTitulo = document.getElementById("chatTitulo")
        const chatParticipantes = document.getElementById("chatParticipantes")
        const chatEstado = document.getElementById("chatEstado")
        const listaMensajesChat = document.getElementById("listaMensajesChat")
        const formChat = document.getElementById("formChat")
        const inputMensajeChat = document.getElementById("inputMensajeChat")
        const msgChat = document.getElementById("msgChat")
        const formPerfil = document.getElementById("formPerfil")
        const inputPseudonimo = document.getElementById("inputPseudonimo")
        const msgPerfil = document.getElementById("msgPerfil")
        const ayudaSeguridadCuenta = document.getElementById("ayudaSeguridadCuenta")
        const formCambiarPassword = document.getElementById("formCambiarPassword")
        const passwordActualPerfil = document.getElementById("passwordActualPerfil")
        const campoPasswordActual = document.getElementById("campoPasswordActual")
        const nuevaPasswordPerfil = document.getElementById("nuevaPasswordPerfil")
        const msgPasswordPerfil = document.getElementById("msgPasswordPerfil")

        // --- navegación por secciones ---
        const btnIrInicio = document.getElementById("btnIrInicio")
        const menuInicio = document.querySelector(".menuInicio")
        const vistaInicio = document.getElementById("vistaInicio")
        const vistaIntercambios = document.getElementById("vistaIntercambios")
        const vistaForo = document.getElementById("vistaForo")
        const vistaJuegos = document.getElementById("vistaJuegos")
        const vistaMaterial = document.getElementById("vistaMaterial")
        const vistaConfiguracion = document.getElementById("vistaConfiguracion")
        const vistaReportes = document.getElementById("vistaReportes")
        const vistaModeracion = document.getElementById("vistaModeracion")
        const btnIrModeracion = document.getElementById("btnIrModeracion")
        const btnVolverForoDesdeModeracion = document.getElementById("btnVolverForoDesdeModeracion")

        const foroLista = document.getElementById("foroLista")
        const foroDetalle = document.getElementById("foroDetalle")

        const formHilo = document.getElementById("formHilo")
        const inputTitulo = document.getElementById("inputTitulo")
        const inputContenido = document.getElementById("inputContenido")
        const inputEtiquetas = document.getElementById("inputEtiquetas")
        const inputContenidoSensible = document.getElementById("inputContenidoSensible")
        const modalSetupPerfil = document.getElementById("modalSetupPerfil")
        const formSetupPerfil = document.getElementById("formSetupPerfil")
        const setupPseudonimo = document.getElementById("setupPseudonimo")
        const setupAvatares = document.getElementById("setupAvatares")
        const setupFotoArchivo = document.getElementById("setupFotoArchivo")
        const msgSetupPerfil = document.getElementById("msgSetupPerfil")
        let setupAvatarSeleccionado = '' 
        const msgHilo = document.getElementById("msgHilo")
        const avatarCompose = document.getElementById("avatarCompose")
        const nombreCompose = document.getElementById("nombreCompose")
        const contadorContenido = document.getElementById("contadorContenido")

        const inputFiltroEtiqueta = document.getElementById("inputBuscarForo")
        const listaEtiquetasDisponibles = document.getElementById("listaEtiquetasDisponibles")
        const ayudaFiltroEtiqueta = document.getElementById("ayudaFiltroEtiqueta")
        const btnFiltrar = document.getElementById("btnBuscarForo")
        const btnQuitarFiltro = document.getElementById("btnQuitarFiltro")
        const selectorTemaGlobal = document.getElementById("selectorTemaGlobal")
        const formBusquedaForo = document.getElementById("busquedaForo")
        let busquedaForoActual = '' 
        const listaHilos = document.getElementById("listaHilos")
        const btnCargarMas = document.getElementById("btnCargarMas")

        const btnVolverHilos = document.getElementById("btnVolverHilos")
        const detalleHiloContenido = document.getElementById("detalleHiloContenido")
        const listaRespuestas = document.getElementById("listaRespuestas")
        const formRespuesta = document.getElementById("formRespuesta")
        const inputRespuesta = document.getElementById("inputRespuesta")
        const msgRespuesta = document.getElementById("msgRespuesta")
        const respuestaContexto = document.getElementById("respuestaContexto")
        const respuestaContextoTexto = document.getElementById("respuestaContextoTexto")
        const btnCancelarRespuesta = document.getElementById("btnCancelarRespuesta")
        const avatarComposeRespuesta = document.getElementById("avatarComposeRespuesta")

        const listaDenuncias = document.getElementById("listaDenuncias")
        const seccionModeradores = document.getElementById("seccionModeradores")
        const formModerador = document.getElementById("formModerador")
        const inputNuevoModerador = document.getElementById("inputNuevoModerador")
        const msgModerador = document.getElementById("msgModerador")
        const listaModeradores = document.getElementById("listaModeradores")

        // --- avatares y configuración de cuenta ---
        const emailConfig = document.getElementById("emailConfig")
        const avatarUserBar = document.getElementById("avatarUserBar")
        const avatarBarraApp = document.getElementById("avatarBarraApp")
        const tituloSaludo = document.getElementById("tituloSaludo")
        const avatarConfigPreview = document.getElementById("avatarConfigPreview")
        const btnCambiarFoto = document.getElementById("btnCambiarFoto")
        const inputArchivoFoto = document.getElementById("inputArchivoFoto")
        const msgFoto = document.getElementById("msgFoto")

        const btnAbrirCompose = document.getElementById("btnAbrirCompose")
        const btnCerrarCompose = document.getElementById("btnCerrarCompose")
        const modalCompose = document.getElementById("modalCompose")
        const pieInicio = document.getElementById("pieInicio")

        let fotoActual = ""
        let seccionActual = "inicio"

        // ==================== HISTORIAL DE NAVEGACIÓN ====================
        // El botón físico "Atrás" del celular navega dentro de la SPA.
        // Cada vista/overlay importante tiene un estado propio en history.
        const HISTORIAL_MEDMAR = "medmar-nav-v1"
        let historialMedmarInicializado = false
        let aplicandoEstadoHistorial = false

        let etiquetaFiltroActual = ""
        let paginaHilosActual = 0
        let hiloAbiertoId = null
        let respuestaObjetivoActual = null
        let esModeradorActual = false
        let esAdminActual = false

        for (let i = 1; i <= 40; i++) {

            let o1 = document.createElement("option")
            o1.value = i
            o1.text = "Comisión " + i
            tengo.appendChild(o1)

            let o2 = document.createElement("option")
            o2.value = i
            o2.text = "Comisión " + i
            busco.appendChild(o2)

        }

        // ==================== SELECTOR PERSONALIZADO ====================
        // Reemplaza visualmente un <select> nativo por un menú desplegable propio,
        // más prolijo en celular. El <select> original queda oculto pero sigue
        // existiendo y sigue siendo la fuente de verdad (form.materia.value, etc.)
        // así el resto del código no necesita cambiar.

        function extraerOpciones(select) {

            const grupos = []
            let grupoSuelto = null

            Array.from(select.children).forEach(function (nodo) {

                if (nodo.tagName === "OPTGROUP") {

                    const items = Array.from(nodo.children)
                        .filter(function (op) { return op.value })
                        .map(function (op) { return { valor: op.value, texto: op.textContent } })

                    grupos.push({ nombre: nodo.label, items })

                } else if (nodo.tagName === "OPTION") {

                    if (!nodo.value) return

                    if (!grupoSuelto) {
                        grupoSuelto = { nombre: null, items: [] }
                        grupos.push(grupoSuelto)
                    }

                    grupoSuelto.items.push({ valor: nodo.value, texto: nodo.textContent })

                }

            })

            return grupos

        }

        function mejorarSelect(select, config) {

            config = config || {}

            const placeholderOption = select.querySelector("option[value='']")
            const placeholder = placeholderOption ? placeholderOption.textContent : (config.placeholder || "Seleccionar")
            const grupos = extraerOpciones(select)

            select.style.display = "none"

            const wrapper = document.createElement("div")
            wrapper.className = "selectPersonalizado"

            const trigger = document.createElement("button")
            trigger.type = "button"
            trigger.className = "selectorTrigger"
            trigger.setAttribute("aria-haspopup", "listbox")

            // El <select> real queda oculto: su etiqueta nombra al botón y, al tocarla, lo enfoca.
            const etiqueta = select.id ? document.querySelector("label[for='" + select.id + "']") : null
            if (etiqueta) {
                // Se lee «Materia, Seleccionar materia»: nombre del campo + valor elegido.
                if (!etiqueta.id) etiqueta.id = select.id + "Etiqueta"
                trigger.id = select.id + "Selector"
                trigger.setAttribute("aria-labelledby", etiqueta.id + " " + trigger.id)
                etiqueta.addEventListener("click", function (e) {
                    e.preventDefault()
                    trigger.focus()
                })
            }

            const panel = document.createElement("div")
            panel.className = "selectorPanel"
            panel.setAttribute("role", "listbox")

            let inputBusqueda = null

            if (config.conBusqueda) {

                const contBusqueda = document.createElement("div")
                contBusqueda.className = "selectorBusqueda"

                inputBusqueda = document.createElement("input")
                inputBusqueda.type = "text"
                inputBusqueda.placeholder = "Buscar materia..."

                contBusqueda.appendChild(inputBusqueda)
                panel.appendChild(contBusqueda)

            }

            const contenedorOpciones = document.createElement("div")
            panel.appendChild(contenedorOpciones)

            function iconoChevron() {
                const span = document.createElement("span")
                span.style.display = "inline-flex"
                span.innerHTML = "<svg width='16' height='16' viewBox='0 0 24 24' fill='none'><path d='M6 9l6 6 6-6' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/></svg>"
                return span.firstChild
            }

            function actualizarTrigger() {

                let actual = null

                grupos.forEach(function (g) {
                    g.items.forEach(function (op) {
                        if (op.valor === select.value) actual = op
                    })
                })

                trigger.innerHTML = ""

                if (actual) {
                    trigger.appendChild(document.createTextNode(actual.texto))
                } else {
                    const span = document.createElement("span")
                    span.className = "placeholder"
                    span.textContent = placeholder
                    trigger.appendChild(span)
                }

                trigger.appendChild(iconoChevron())

            }

            function renderOpciones(filtro) {

                contenedorOpciones.innerHTML = ""
                const filtroNorm = (filtro || "").trim().toLowerCase()
                let hayResultados = false

                grupos.forEach(function (grupo) {

                    const itemsFiltrados = grupo.items.filter(function (op) {
                        return !filtroNorm || op.texto.toLowerCase().includes(filtroNorm)
                    })

                    if (itemsFiltrados.length === 0) return

                    hayResultados = true

                    if (grupo.nombre) {
                        const h = document.createElement("div")
                        h.className = "selectorGrupo"
                        h.textContent = grupo.nombre
                        contenedorOpciones.appendChild(h)
                    }

                    itemsFiltrados.forEach(function (op) {

                        const div = document.createElement("div")
                        div.className = "selectorOpcion" + (op.valor === select.value ? " seleccionada" : "")
                        div.textContent = op.texto
                        div.setAttribute("role", "option")

                        div.addEventListener("click", function () {
                            select.value = op.valor
                            select.dispatchEvent(new Event("change"))
                            actualizarTrigger()
                            cerrarPanel()
                        })

                        contenedorOpciones.appendChild(div)

                    })

                })

                if (!hayResultados) {
                    const vacio = document.createElement("div")
                    vacio.className = "selectorOpcion"
                    vacio.style.color = "var(--ink-soft)"
                    vacio.textContent = "Sin resultados"
                    contenedorOpciones.appendChild(vacio)
                }

            }

            function abrirPanel() {

                wrapper.classList.add("abierto")
                renderOpciones("")

                if (inputBusqueda) {
                    inputBusqueda.value = ""
                    setTimeout(function () { inputBusqueda.focus() }, 50)
                }

                document.addEventListener("click", manejarClickAfuera)

            }

            function cerrarPanel() {
                wrapper.classList.remove("abierto")
                document.removeEventListener("click", manejarClickAfuera)
            }

            function manejarClickAfuera(e) {
                if (!wrapper.contains(e.target)) cerrarPanel()
            }

            trigger.addEventListener("click", function () {
                if (wrapper.classList.contains("abierto")) {
                    cerrarPanel()
                } else {
                    abrirPanel()
                }
            })

            if (inputBusqueda) {

                inputBusqueda.addEventListener("input", function () {
                    renderOpciones(inputBusqueda.value)
                })

                inputBusqueda.addEventListener("click", function (e) {
                    e.stopPropagation()
                })

            }

            wrapper.appendChild(trigger)
            wrapper.appendChild(panel)
            select.insertAdjacentElement("afterend", wrapper)

            actualizarTrigger()

            // Permite que el resto del código avise a este selector que refleje
            // un cambio hecho directamente sobre select.value (ver iniciarEdicion, etc.)
            select.refrescarSelector = actualizarTrigger

        }

        mejorarSelect(form.materia, { conBusqueda: true, placeholder: "Seleccionar materia" })
        mejorarSelect(tengo, { placeholder: "Seleccionar comisión" })
        mejorarSelect(busco, { placeholder: "Seleccionar comisión" })

        function refrescarSelectoresFormulario() {
            if (form.materia.refrescarSelector) form.materia.refrescarSelector()
            if (tengo.refrescarSelector) tengo.refrescarSelector()
            if (busco.refrescarSelector) busco.refrescarSelector()
        }

        // ==================== MENSAJES DE ERROR ====================

        // Escapa texto de usuarios antes de insertarlo con innerHTML (evita HTML/JS injection)
        // Escapa los 5 caracteres significativos de HTML (OWASP XSS Prevention, regla 1 y 2).
        // Antes no se escapaban las comillas simples y los atributos de este archivo usan '...':
        // una foto_url con ' podía cerrar el atributo e inyectar un handler (XSS almacenado).
        const ESCAPES_HTML = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }
        function escapeHtml(str) {
            return (str == null ? "" : String(str)).replace(/[&<>"']/g, function (c) { return ESCAPES_HTML[c] })
        }

        // Para valores dentro de atributos ('...' o "...").
        function escapeAttr(str) {
            return escapeHtml(str)
        }

        // Devuelve el HTML de un avatar: la foto si tiene, si no un círculo con la inicial
        function avatarHtml(nombre, foto, claseExtra) {

            const clase = "avatar" + (claseExtra ? " " + claseExtra : "")

            if (foto) {
                return "<img class='" + clase + "' src='" + escapeAttr(foto) + "' alt='' loading='lazy'>"
            }

            const inicial = (nombre || "?").trim().charAt(0).toUpperCase() || "?"
            return "<span class='" + clase + " avatarInicial'>" + escapeHtml(inicial) + "</span>"

        }

        // ==================== HISTORIAL DE NAVEGACIÓN ====================

        function crearEstadoNavegacion(vista, overlay, id) {
            const estado = {
                medmar: HISTORIAL_MEDMAR,
                vista: vista || "inicio",
                overlay: overlay || null
            }
            if (id) estado.id = id
            return estado
        }

        function esEstadoMedmar(estado) {
            return !!estado && estado.medmar === HISTORIAL_MEDMAR
        }

        function navegarHistorial(estado, reemplazar) {
            if (!historialMedmarInicializado || aplicandoEstadoHistorial) return
            if (reemplazar) {
                history.replaceState(estado, "", location.href)
            } else {
                history.pushState(estado, "", location.href)
            }
        }

        function estadoActualSeguro() {
            return esEstadoMedmar(history.state) ? history.state : null
        }

        function volverHistorialOverlay(overlayEsperado, fallback) {
            const estado = estadoActualSeguro()
            if (estado && estado.overlay === overlayEsperado) {
                history.back()
                return
            }
            if (typeof fallback === "function") fallback()
        }

        async function aplicarEstadoHistorial(estado) {
            if (!sesion) {
                mostrarLogin()
                return
            }

            const estadoNormalizado = esEstadoMedmar(estado)
                ? estado
                : crearEstadoNavegacion("inicio", null)

            aplicandoEstadoHistorial = true
            try {
                if (estadoNormalizado.overlay === "compose") {
                    mostrarSeccion(estadoNormalizado.vista || "foro", null, false)
                    if (!modalCompose.classList.contains("abierto")) {
                        abrirModal(modalCompose)
                        actualizarComposeCabecera()
                    }
                    return
                }

                if (estadoNormalizado.overlay === "hilo") {
                    mostrarSeccion("foro", null, false)
                    if (hiloAbiertoId !== estadoNormalizado.id) {
                        await abrirHilo(estadoNormalizado.id, false)
                    } else {
                        mostrarDetalleHilo()
                    }
                    return
                }

                if (estadoNormalizado.overlay === "chat") {
                    mostrarSeccion("intercambios", null, false)
                    if (chatAbiertoId !== estadoNormalizado.id) {
                        await abrirChat(estadoNormalizado.id, false)
                    }
                    return
                }

                cerrarModal(modalCompose)
                if (hiloAbiertoId) mostrarListaHilos(false)
                if (chatAbiertoId) cerrarChat(false)
                mostrarSeccion(estadoNormalizado.vista || "inicio", null, false)
            } finally {
                aplicandoEstadoHistorial = false
            }
        }

        function manejarPopState(evento) {
            if (!historialMedmarInicializado) return

            // Si el navegador salió hacia una entrada externa, dejamos que
            // el navegador continúe su navegación normal.
            if (!esEstadoMedmar(evento.state)) return

            const estado = evento.state

            // Entrada centinela: el primer "Atrás" desde Inicio se consume
            // dentro de la app. Luego reemplazamos el centinela por Inicio,
            // de modo que un segundo "Atrás" sí pueda salir de la página.
            if (estado.guard) {
                const inicio = crearEstadoNavegacion("inicio", null)
                history.replaceState(inicio, "", location.href)
                aplicarEstadoHistorial(inicio)
                return
            }

            aplicarEstadoHistorial(estado)
        }

        function inicializarHistorialMedmar() {
            if (historialMedmarInicializado) return

            historialMedmarInicializado = true
            const actual = history.state

            if (esEstadoMedmar(actual)) {
                window.addEventListener("popstate", manejarPopState)
                return
            }

            const inicio = crearEstadoNavegacion("inicio", null)
            history.replaceState(inicio, "", location.href)
            history.pushState(Object.assign({}, inicio, { guard: true }), "", location.href)
            window.addEventListener("popstate", manejarPopState)
        }

        function resetearHistorialPorLogout() {
            if (!historialMedmarInicializado) return
            history.replaceState({ medmarAuth: "login" }, "", location.href)
        }

        // ==================== MODALES ====================

        // Al abrir un modal el foco entra en él; al cerrarlo vuelve al control que lo abrió.
        let focoAntesDelModal = null

        function abrirModal(modal) {
            focoAntesDelModal = document.activeElement
            modal.classList.add("abierto")
            document.addEventListener("keydown", cerrarModalConEscape)
            requestAnimationFrame(function () {
                const primero = modal.querySelector("textarea, input:not([type=hidden]), select, button:not(.modalCerrar)")
                if (primero && !modal.contains(document.activeElement)) primero.focus()
            })
        }

        function cerrarModal(modal) {
            modal.classList.remove("abierto")
            document.removeEventListener("keydown", cerrarModalConEscape)
            if (focoAntesDelModal && document.contains(focoAntesDelModal)) focoAntesDelModal.focus()
            focoAntesDelModal = null
        }

        // El modal de bienvenida es obligatorio: no se cierra con Escape ni tocando afuera
        // (antes se cerraba y dejaba el body con overflow:hidden, sin scroll).
        function cerrarModalConEscape(e) {
            if (e.key === "Escape") {
                document.querySelectorAll(".modalFondo.abierto").forEach(function (modal) {
                    if (modal !== modalSetupPerfil) cerrarModal(modal)
                })
            }
        }

        document.querySelectorAll(".modalFondo").forEach(function (fondo) {
            fondo.addEventListener("click", function (e) {
                if (e.target !== fondo || fondo === modalSetupPerfil) return
                if (fondo === modalCompose) {
                    volverHistorialOverlay("compose", function () { cerrarModal(fondo) })
                } else {
                    cerrarModal(fondo)
                }
            })
        })

        function mensajeError(codigo) {

            const mensajes = {
                email_invalido: "El email no es válido.",
                link_requerido: "Pegá el enlace de Google Drive del archivo.",
                huella_no_coincide: "La huella no coincide. No apruebes la llave y hablá con esa persona.",
                llave_requerida: "Necesitás desbloquear la moderación con tu llave.",
                moderacion_bloqueada: "La moderación está bloqueada.",
                no_es_moderador: "Esa persona ya no tiene rol de moderador.",
                llave_duplicada: "Esa llave ya está registrada.",
                aportes_limite_dia: "Ya mandaste varios aportes hoy. ¡Gracias! Probá de nuevo mañana.",
                aportes_limite_pendientes: "Tenés varios aportes esperando revisión. Cuando los revisemos vas a poder mandar más.",
                aportes_bandeja_llena: "Hay muchos aportes esperando revisión. Probá de nuevo en unos días.",
                aporte_duplicado: "Ese enlace ya fue enviado o ya está publicado.",
                material_duplicado: "Ese enlace ya está publicado en Material.",
                datos_material_incompletos: "Para publicarlo falta la materia o el tipo de material.",
                ya_resuelto: "Ese aporte ya fue revisado.",
                password_corta: "La contraseña debe tener al menos 8 caracteres.",
                password_no_coincide: "Las contraseñas no coinciden.",
                email_ya_registrado: "Ese email ya tiene una cuenta creada.",
                credenciales_invalidas: "Email o contraseña incorrectos.",
                password_actual_incorrecta: "La contraseña actual no es correcta.",
                cuenta_google: "Esta cuenta está configurada para ingresar con Google.",
                codigo_recuperacion_invalido: "El código no es válido o ya venció.",
                chat_no_encontrado: "No se encontró ese chat o no tenés acceso.",
                chat_expirado: "Este chat venció por inactividad y ya fue cerrado.",
                chat_lleno: "Este chat alcanzó el límite de mensajes.",
                mensaje_invalido: "El mensaje está vacío, es demasiado largo o contiene caracteres no permitidos.",
                token_invalido: "No se pudo verificar tu cuenta de Google.",
                sesion_invalida: "Tu sesión expiró, iniciá sesión de nuevo.",
                misma_comision: "No podés buscar la misma comisión que tenés.",
                no_autorizado: "No podés modificar una solicitud que no es tuya.",
                no_encontrado: "No se encontró la solicitud.",
                datos_invalidos: "Los datos ingresados no son válidos.",
                conexion: "No se pudo conectar con el servidor. Probá de nuevo en un momento.",
                mensaje_en_verificacion: "La operación quedó en verificación. No la reenvíes; MedMar está confirmando si se guardó.",
                servidor_ocupado: "Hay otra operación en curso. Probá de nuevo en unos segundos.",
                servidor: "El servidor tuvo un problema. Probá de nuevo en un momento.",
                ya_tenes_otra: "Ya tenés una solicitud activa para esa materia. Editala en lugar de crear otra.",
                imagen_invalida: "La imagen no es válida. Probá con otra foto.",
                foto_invalida: "Esa foto no se puede usar. Elegí un avatar o subí una imagen.",
                metodo_no_permitido: "La operación no está permitida.",
                titulo_invalido: "El título no puede estar vacío ni superar los 140 caracteres.",
                contenido_invalido: "El contenido no puede estar vacío ni superar los 5000 caracteres.",
                respuesta_invalida: "No se encontró esa respuesta para este hilo. Actualizá la conversación e intentá de nuevo.",
                link_invalido: "El enlace no tiene un formato HTTPS válido.",
                link_no_permitido: "Ese sitio no está permitido. Solo aceptamos dominios seguros de YouTube, Google, UNMDP, sitios académicos autorizados, Spotify y Steam.",
                servidor_ocupado: "El servidor está ocupado en este momento. Probá de nuevo.",
                rate_limit: "Hiciste demasiadas solicitudes en poco tiempo. Esperá un momento y probá de nuevo.",
                pseudonimo_invalido: "El pseudónimo debe tener entre 3 y 24 caracteres.",
                pseudonimo_en_uso: "Ese pseudónimo ya lo está usando otra persona.",
                enlace_no_permitido: "El texto contiene un enlace a un dominio que MedMar no admite.",
                ya_es_moderador: "Esa persona ya es moderadora.",
                imagen_muy_grande: "La imagen es muy pesada. Probá con otra o recortala un poco."
            }

            return mensajes[codigo] || "Ocurrió un error inesperado."

        }

        // ==================== SESIÓN LOCAL ====================

        function guardarSesionLocal(s) {
            // Supabase Auth mantiene la sesión de forma persistente.
            sesion = s || null
        }

        function borrarSesionLocal() {
            sesion = null
        }

        function cargarSesionLocal() {
            return null
        }

        // ==================== LLAMADAS AL SERVIDOR ====================

        const llamadasEnCurso = new Map()

        async function llamarServidor(accion, params, incluirToken) {
            const dedupeKey = incluirToken && sesion && ACCIONES_LECTURA_DEDUPE.has(accion)
                ? accion + "|" + JSON.stringify(params || {}) + "|" + sesion.email
                : null

            if (dedupeKey && llamadasEnCurso.has(dedupeKey)) return llamadasEnCurso.get(dedupeKey)

            const tarea = (async function () {
                const inicioRequest = performance.now()
                const body = Object.assign({ accion: accion }, params || {})

                try {
                    const resultado = await supabaseClient.functions.invoke(SUPABASE_FUNCTION_NAME, { body: body })
                    if (resultado.error) {
                        console.error("[MedMarUNMDP] Edge Function", accion, resultado.error)
                        return { ok: false, error: "conexion", ambiguo: true, detalle: resultado.error.message || String(resultado.error) }
                    }
                    const data = resultado.data || { ok: false, error: "servidor", ambiguo: true }
                    console.debug("[MedMarUNMDP]", accion, Math.round(performance.now() - inicioRequest) + "ms")
                    return data
                } catch (err) {
                    console.error("[MedMarUNMDP] Error de red", accion, err)
                    return { ok: false, error: "conexion", ambiguo: true, detalle: err && err.message ? err.message : String(err) }
                }
            })()

            if (dedupeKey) {
                llamadasEnCurso.set(dedupeKey, tarea)
                try { return await tarea } finally { llamadasEnCurso.delete(dedupeKey) }
            }
            return tarea
        }

        function llamarSinSesion(accion, params) {
            return llamarServidor(accion, params, false)
        }

        function llamar(accion, params) {
            return llamarServidor(accion, params, true)
        }

        function esErrorAmbiguo(accion, resultado) {
            if (!resultado || resultado.ok) return false
            return resultado.ambiguo === true || ["conexion", "servidor", "servidor_ocupado"].includes(resultado.error)
        }

        function esperar(ms) {
            return new Promise(function(resolve) { setTimeout(resolve, ms) })
        }

        async function llamarMutacionResiliente(accion, params, intentos) {
            const maxIntentos = Math.max(1, intentos || 3)
            let ultimo = { ok: false, error: "conexion", ambiguo: true }
            for (let i = 0; i < maxIntentos; i++) {
                if (i > 0) await esperar(i === 1 ? 1000 : 2500)
                ultimo = await llamar(accion, params)
                if (ultimo.ok) return ultimo
                if (!esErrorAmbiguo(accion, ultimo)) return ultimo
            }
            return ultimo
        }

        function esErrorDefinitivo(resultado) {
            return !!resultado && !resultado.ok && !esErrorAmbiguo("", resultado)
        }

async function cargarBootstrap() {
            const cacheKey = 'medmar:perfil:' + sesion.email.toLowerCase()
            try {
                const local = JSON.parse(localStorage.getItem(cacheKey) || 'null')
                if (local && local.data) {
                    aplicarBootstrap(local.data)
                    if (local.data.perfil && local.data.perfil.profileCompleted === false) mostrarSetupPerfil(local.data.perfil)
                    if (local.ts && Date.now() - Number(local.ts) < FRESCURA_USUARIO_CLIENTE_MS) return
                }
            } catch (_) {}

            const r = await llamar('bootstrap', {})
            if (!r.ok) {
                if (r.error === 'sesion_invalida') {
                    sesion = null
                    borrarSesionLocal()
                    mostrarLogin()
                }
                return
            }
            aplicarBootstrap(r.data)
            try { localStorage.setItem(cacheKey, JSON.stringify({ data: r.data, ts: Date.now() })) } catch (_) {}
            if (r.data && r.data.perfil && r.data.perfil.profileCompleted === false) mostrarSetupPerfil(r.data.perfil)
        }

        function aplicarBootstrap(data) {
            if (!data) return
            if (data.perfil) {
                inputPseudonimo.value = data.perfil.pseudonimo || ''
                fotoActual = data.perfil.foto || ''
                emailConfig.innerText = sesion.email
                actualizarAvataresEnPantalla(data.perfil.pseudonimo || 'Vos')
            }
            solicitudesUI = Array.isArray(data.solicitudes) ? data.solicitudes.slice() : []
            intercambiosUI = Array.isArray(data.intercambios) ? data.intercambios.slice() : []
            ultimaActualizacionUsuario = Date.now()
            renderizarSolicitudes(solicitudesUI)
            renderizarIntercambios(intercambiosUI)
            esModeradorActual = !!(data.rol && data.rol.esModerador)
            esAdminActual = !!(data.rol && data.rol.esAdmin)
            const conPassword = cuentaTienePassword()
            ayudaSeguridadCuenta.textContent = conPassword
                ? 'Para cambiar tu contraseña, confirmá primero la actual.'
                : 'Tu cuenta entra con Google. Si querés, podés definir una contraseña para entrar también con email.'
            campoPasswordActual.style.display = conPassword ? 'block' : 'none'
            formCambiarPassword.style.display = 'block'
            btnIrModeracion.style.display = esModeradorActual ? 'inline-block' : 'none'; actualizarAccesosModeracion()
        }

        async function cargarForoBootstrap() {
            const key = claveForoActual()
            const cached = foroCacheCliente.get(key)
            const age = cached && cached.actualizadoEn ? Date.now() - cached.actualizadoEn : Infinity

            if (cached) {
                renderizarEtiquetasCliente(cached.etiquetas || [])
                renderizarHilos(cached.hilos || [], true)
                paginaHilosActual = (cached.hilos || []).length
                btnCargarMas.style.display = cached.hayMas ? 'block' : 'none'
                if (age < FRESCURA_FORO_CLIENTE_MS) {
                    foroCargado = true
                    return
                }
            }

            if (!cached) listaHilos.innerHTML = esqueletoTarjetas(3)

            const r = busquedaForoActual
                ? await llamar('listarHilos', { etiqueta: etiquetaFiltroActual, busqueda: busquedaForoActual, desde: 0 })
                : await llamar('foroBootstrap', { etiqueta: etiquetaFiltroActual })
            if (!r.ok) {
                if (!cached) {
                    listaHilos.innerHTML = "<p class='vacio'>" + escapeHtml(mensajeError(r.error)) + "</p>"
                    btnCargarMas.style.display = 'none'
                }
                if (r.error === 'sesion_invalida') {
                    sesion = null
                    borrarSesionLocal()
                    mostrarLogin()
                }
                return
            }
            esModeradorActual = !!r.esModerador
            btnIrModeracion.style.display = esModeradorActual ? 'inline-block' : 'none'; actualizarAccesosModeracion()
            const data = busquedaForoActual ? r : (r.data || {})
            const item = { etiquetas: data.etiquetas || [], hilos: data.hilos || [], hayMas: !!data.hayMas, actualizadoEn: Date.now() }
            foroCacheCliente.set(key, item)
            if (key === claveForo("", "")) guardarResumenForo(item.hilos)
            renderizarEtiquetasCliente(item.etiquetas)
            renderizarHilos(item.hilos, true)
            paginaHilosActual = item.hilos.length
            btnCargarMas.style.display = item.hayMas ? 'block' : 'none'
            foroCargado = true
        }

        function renderizarEtiquetasCliente(etiquetas) {
            listaEtiquetasDisponibles.innerHTML = ''
            mapaEtiquetasDisponibles = new Map()
            etiquetas.forEach(function (etiqueta) {
                mapaEtiquetasDisponibles.set(normalizarEtiqueta(etiqueta), etiqueta)
                const option = document.createElement('option')
                option.value = etiqueta
                listaEtiquetasDisponibles.appendChild(option)
            })
            if (ayudaFiltroEtiqueta) {
                ayudaFiltroEtiqueta.textContent = etiquetas.length
                    ? 'Elegí una de las etiquetas existentes para filtrar.'
                    : 'Todavía no hay etiquetas publicadas.'
            }
        }

        // ==================== CONTRASEÑAS / AUTENTICACIÓN SUPABASE ====================

        // ==================== AVISOS BREVES Y CARGA ====================

        // Aviso breve (toast) para confirmar acciones que salieron bien. #zonaAvisos es role="status",
        // así que los lectores de pantalla lo anuncian. Los errores siguen junto al formulario.
        let temporizadorAviso = null

        function mostrarAviso(texto) {
            const zona = document.getElementById("zonaAvisos")
            if (!zona) return
            zona.textContent = texto
            zona.classList.add("visible")
            clearTimeout(temporizadorAviso)
            temporizadorAviso = setTimeout(function () { zona.classList.remove("visible") }, 4500)
        }

        // Tarjetas grises que ocupan el lugar del contenido mientras carga.
        function esqueletoTarjetas(cantidad) {
            let html = "<div class='esqueletoLista' role='status'><span class='sr-only'>Cargando…</span>"
            for (let i = 0; i < cantidad; i++) {
                html += "<div class='esqueletoTarjeta' aria-hidden='true'>" +
                    "<span class='esqueletoLinea' style='width:35%'></span>" +
                    "<span class='esqueletoLinea esqueletoTitulo' style='width:80%'></span>" +
                    "<span class='esqueletoLinea' style='width:95%'></span>" +
                    "<span class='esqueletoLinea' style='width:60%'></span></div>"
            }
            return html + "</div>"
        }

        const ICONO_MOSTRAR_PASSWORD = '<svg class="iconoOjo" viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/></svg>'
        const ICONO_OCULTAR_PASSWORD = '<svg class="iconoOjo" viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/><path d="M4 4l16 16"/></svg>'

        document.querySelectorAll('.btnMostrarPassword').forEach(function(btn) {
            btn.addEventListener('click', function() {
                const input = document.getElementById(btn.dataset.target)
                if (!input) return
                const mostrar = input.type === 'password'
                input.type = mostrar ? 'text' : 'password'
                btn.setAttribute('aria-label', mostrar ? 'Ocultar contraseña' : 'Mostrar contraseña')
                btn.innerHTML = mostrar ? ICONO_OCULTAR_PASSWORD : ICONO_MOSTRAR_PASSWORD
            })
        })

        function sincronizarSesionSupabase(authSession) {
            if (!authSession || !authSession.user) {
                sesion = null
                return null
            }
            sesion = {
                token: authSession.access_token,
                email: String(authSession.user.email || '').toLowerCase(),
                userId: authSession.user.id,
                authSession: authSession
            }
            return sesion
        }

        // ¿La cuenta tiene contraseña propia? (registro por email). Las cuentas solo de Google no
        // tienen una contraseña actual que verificar.
        function cuentaTienePassword() {
            const usuario = sesion && sesion.authSession && sesion.authSession.user
            if (!usuario) return true
            const identidades = Array.isArray(usuario.identities) ? usuario.identities : []
            const proveedores = (usuario.app_metadata && Array.isArray(usuario.app_metadata.providers)) ? usuario.app_metadata.providers : []
            return identidades.some(function (i) { return i && i.provider === 'email' }) || proveedores.indexOf('email') !== -1
        }

        async function mostrarLoginSupabase() {
            sesion = null
            mostrarLogin()
            formLogin.style.display = 'block'
            formRegistro.style.display = 'none'
            panelRecuperarPassword.style.display = 'none'
        }

        // Recuperación por enlace seguro de Supabase Auth.
        btnOlvidePassword.addEventListener('click', function() {
            formLogin.style.display = 'none'
            panelRecuperarPassword.style.display = 'block'
            resetEmail.value = document.getElementById('loginEmail').value.trim()
            pasoCodigoReset.style.display = 'none'
            msgReset.innerText = ''
        })

        btnVolverLoginDesdeReset.addEventListener('click', function() {
            panelRecuperarPassword.style.display = 'none'
            formLogin.style.display = 'block'
            msgReset.innerText = ''
            pasoCodigoReset.style.display = 'none'
            formRecuperarPassword.reset()
            resetNuevaPassword.value = ''
        })

        formRecuperarPassword.addEventListener('submit', async function(e) {
            e.preventDefault()
            const email = resetEmail.value.trim()
            msgReset.innerText = 'Enviando enlace…'
            const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + window.location.pathname
            })
            if (error) {
                msgReset.innerText = 'No se pudo enviar el enlace. Probá de nuevo en un momento.'
                console.error(error)
                return
            }
            msgReset.innerText = 'Si la cuenta existe, vas a recibir un enlace para cambiar la contraseña.'
        })

        btnRestablecerPassword.addEventListener('click', async function() {
            const nuevaPassword = resetNuevaPassword.value
            if (nuevaPassword.length < 8) {
                msgReset.innerText = mensajeError('password_corta')
                return
            }
            msgReset.innerText = 'Guardando contraseña…'
            const { error } = await supabaseClient.auth.updateUser({ password: nuevaPassword })
            if (error) {
                msgReset.innerText = 'No se pudo cambiar la contraseña. Volvé a abrir el enlace de recuperación.'
                console.error(error)
                return
            }
            msgReset.innerText = 'Contraseña actualizada correctamente.'
            resetNuevaPassword.value = ''
            pasoCodigoReset.style.display = 'none'
            formLogin.style.display = 'block'
            panelRecuperarPassword.style.display = 'none'
        })

        // Google OAuth: Supabase maneja el redirect, callback y sesión.
        btnGoogleLogin.addEventListener('click', async function() {
            authMsg.innerText = 'Ingresando con Google…'
            const { error } = await supabaseClient.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: window.location.origin + window.location.pathname }
            })
            if (error) {
                authMsg.innerText = 'No se pudo iniciar sesión con Google.'
                console.error(error)
            }
        })

        tabLogin.addEventListener("click", function () {
            tabLogin.classList.add("tabActiva")
            tabRegistro.classList.remove("tabActiva")
            tabLogin.setAttribute("aria-pressed", "true")
            tabRegistro.setAttribute("aria-pressed", "false")
            formLogin.style.display = "block"
            formRegistro.style.display = "none"
            panelRecuperarPassword.style.display = "none"
            authMsg.innerText = ""
        })

        tabRegistro.addEventListener("click", function () {
            tabRegistro.classList.add("tabActiva")
            tabLogin.classList.remove("tabActiva")
            tabRegistro.setAttribute("aria-pressed", "true")
            tabLogin.setAttribute("aria-pressed", "false")
            formRegistro.style.display = "block"
            formLogin.style.display = "none"
            panelRecuperarPassword.style.display = "none"
            authMsg.innerText = ""
        })

        async function iniciarSesionConSupabase(email, password) {
            const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password })
            return { data, error }
        }

        formLogin.addEventListener("submit", async function (e) {
            e.preventDefault()
            authMsg.innerText = "Ingresando..."
            const email = document.getElementById("loginEmail").value.trim()
            const password = document.getElementById("loginPassword").value

            // Primero usamos Supabase Auth normal. Solo si falla, intentamos una
            // vez la comprobación del hash legacy para migrar silenciosamente las
            // cuentas que todavía no hicieron su primer login después del corte.
            let login = await iniciarSesionConSupabase(email, password)
            if (login.error) {
                const legacy = await llamarSinSesion('legacyLogin', { email, password })
                if (legacy && legacy.ok && legacy.handled) {
                    login = await iniciarSesionConSupabase(email, password)
                } else if (legacy && legacy.ok === false && legacy.error === 'credenciales_invalidas') {
                    authMsg.innerText = 'Email o contraseña incorrectos.'
                    return
                }
            }

            if (login.error || !login.data?.session) {
                const message = login.error?.message || ''
                authMsg.innerText = /confirm|verified/i.test(message)
                    ? 'Tenés que confirmar tu correo antes de iniciar sesión.'
                    : 'Email o contraseña incorrectos.'
                return
            }

            sincronizarSesionSupabase(login.data.session)
            formLogin.reset()
            authMsg.innerText = ''
            mostrarApp()
        })

        formRegistro.addEventListener("submit", async function (e) {
            e.preventDefault()

            const email = document.getElementById("regEmail").value.trim()
            const password = document.getElementById("regPassword").value
            const passwordConfirm = document.getElementById("regPasswordConfirm").value

            if (password.length < 8) {
                authMsg.innerText = mensajeError('password_corta')
                return
            }

            if (password !== passwordConfirm) {
                authMsg.innerText = 'Las contraseñas no coinciden.'
                return
            }

            authMsg.innerText = "Creando cuenta..."

            const { data, error } = await supabaseClient.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: window.location.origin + window.location.pathname
                }
            })

            if (error) {
                const message = String(error.message || '')
                const code = String(error.code || '')
                const status = Number(error.status || 0)

                if (status === 429 || /rate limit|too many|email rate limit/i.test(message)) {
                    authMsg.innerText = 'Se alcanzó temporalmente el límite de emails de registro. Probá nuevamente más tarde.'
                } else if (/already registered|already been registered|user already exists|email_exists/i.test(message + ' ' + code)) {
                    authMsg.innerText = 'Esa cuenta ya está registrada. Probá iniciar sesión.'
                } else if (/invalid.*email|email.*invalid|email_address_invalid/i.test(message + ' ' + code)) {
                    authMsg.innerText = 'El email no es válido.'
                } else if (/weak.*password|password.*weak/i.test(message + ' ' + code)) {
                    authMsg.innerText = 'La contraseña no cumple los requisitos de seguridad.'
                } else if (/database error saving new user|database error|unexpected failure/i.test(message)) {
                    authMsg.innerText = 'Supabase no pudo completar la creación de la cuenta. Revisá Authentication → Logs para ver el error del registro.'
                } else if (/error sending.*(email|confirmation)|smtp|mail provider/i.test(message)) {
                    authMsg.innerText = 'La cuenta no pudo terminar de crearse porque falló el envío del correo de confirmación. Hay que revisar la configuración de emails de Supabase.'
                } else {
                    authMsg.innerText = 'No se pudo crear la cuenta. Revisá los datos e intentá nuevamente.'
                }

                console.error('[MedMarUNMDP] Error al registrar', { message, code, status, error })
                return
            }

            formRegistro.reset()

            if (data.session) {
                sincronizarSesionSupabase(data.session)
                authMsg.innerText = ''
                await mostrarApp()
            } else {
                authMsg.innerText = 'Cuenta creada. Revisá tu email para confirmar la cuenta.'
                console.debug('[MedMarUNMDP] Registro creado sin sesión; requiere confirmación de email.', data.user?.id || '')
            }
        })

        const AVATAR_BASE_URL = 'https://medmar.com.ar/assets/avatars/'
        function mostrarSetupPerfil(perfil) {
            if (!sesion) return
            modalSetupPerfil.classList.add('abierto')
            modalSetupPerfil.style.display = 'flex'
            setupPseudonimo.value = perfil && perfil.profileCompleted === false ? '' : (perfil?.pseudonimo || '')
            msgSetupPerfil.textContent = ''
            document.body.style.overflow = 'hidden'
        }
        function ocultarSetupPerfil() {
            modalSetupPerfil.classList.remove('abierto')
            modalSetupPerfil.style.display = 'none'
            document.body.style.overflow = ''
        }
        setupFotoArchivo.addEventListener('change', function() {
            if (setupFotoArchivo.files && setupFotoArchivo.files[0]) {
                setupAvatarSeleccionado = ''
                setupAvatares.querySelectorAll('[data-avatar]').forEach(x => { x.classList.remove('seleccionado'); x.setAttribute('aria-pressed','false') })
            }
        })
        setupAvatares.querySelectorAll('[data-avatar]').forEach(function(btn) {
            btn.addEventListener('click', function() {
                setupFotoArchivo.value = '' 
                setupAvatares.querySelectorAll('[data-avatar]').forEach(x => { x.classList.remove('seleccionado'); x.setAttribute('aria-pressed','false') })
                btn.classList.add('seleccionado'); btn.setAttribute('aria-pressed','true')
                setupAvatarSeleccionado = btn.dataset.avatar || ''
            })
        })
        formSetupPerfil.addEventListener('submit', async function(e) {
            e.preventDefault()
            const pseudonimo = setupPseudonimo.value.trim()
            if (!/^[A-Za-zÀ-ÿ0-9 _.-]{3,24}$/.test(pseudonimo)) { msgSetupPerfil.textContent = 'Usá entre 3 y 24 caracteres: letras, números, espacios, punto, guion o guion bajo.'; return }
            const btn = formSetupPerfil.querySelector('button[type="submit"]')
            btn.disabled = true; msgSetupPerfil.textContent = 'Guardando perfil…'
            let foto = setupAvatarSeleccionado ? AVATAR_BASE_URL + setupAvatarSeleccionado + '.svg' : ''
            const archivo = setupFotoArchivo.files && setupFotoArchivo.files[0]
            if (archivo) {
                if (!archivo.type.startsWith('image/')) { btn.disabled = false; msgSetupPerfil.textContent = 'Elegí un archivo de imagen válido.'; return }
                try {
                    msgSetupPerfil.textContent = 'Procesando y subiendo la foto…'
                    const base64 = await recortarYComprimirImagen(archivo, 256)
                    const upload = await llamarMutacionResiliente('actualizarFoto', { imagen: base64, mimeType: 'image/jpeg' }, 2)
                    if (!upload.ok) { btn.disabled = false; msgSetupPerfil.textContent = 'No se pudo subir la foto. Probá con un archivo más pequeño.'; return }
                    foto = upload.foto
                } catch (_) { btn.disabled = false; msgSetupPerfil.textContent = 'No se pudo procesar la imagen.'; return }
            }
            const result = await llamarMutacionResiliente('completarPerfil', { pseudonimo, foto }, 3)
            btn.disabled = false
            if (!result.ok) { msgSetupPerfil.textContent = result.error === 'pseudonimo_en_uso' ? 'Ese pseudónimo ya está ocupado. Elegí otro.' : (result.error === 'pseudonimo_invalido' ? 'El pseudónimo no cumple el formato.' : 'No se pudo guardar. Intentá nuevamente.'); return }
            inputPseudonimo.value = result.perfil.pseudonimo
            fotoActual = result.perfil.foto || ''
            actualizarAvataresEnPantalla(result.perfil.pseudonimo)
            const cacheKey = 'medmar:perfil:' + sesion.email.toLowerCase()
            try {
                const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null')
                if (cached?.data?.perfil) { cached.data.perfil.pseudonimo = result.perfil.pseudonimo; cached.data.perfil.foto = result.perfil.foto; cached.data.perfil.profileCompleted = true; cached.ts = Date.now(); localStorage.setItem(cacheKey, JSON.stringify(cached)) }
            } catch (_) {}
            ocultarSetupPerfil()
        })

        // Rehidrata la sesión y atiende el callback de recuperación.
        supabaseClient.auth.onAuthStateChange(function(event, authSession) {
            sincronizarSesionSupabase(authSession)
            if (event === 'PASSWORD_RECOVERY') {
                mostrarLogin()
                formLogin.style.display = 'none'
                formRegistro.style.display = 'none'
                panelRecuperarPassword.style.display = 'block'
                pasoCodigoReset.style.display = 'block'
                msgReset.innerText = 'Elegí tu nueva contraseña.'
                return
            }
            if (event === 'SIGNED_OUT') {
                // También llega cuando se cierra sesión en otra pestaña o vence el refresh token.
                limpiarDatosDeSesion(true)
                mostrarLoginSupabase()
            }
        })

        // ==================== FORO ====================


        function mostrarListaHilos(actualizarHistorial) {
            if (actualizarHistorial === true) {
                navegarHistorial(crearEstadoNavegacion("foro", null), false)
            }
            foroLista.style.display = "block"
            foroDetalle.style.display = "none"
            hiloAbiertoId = null
            hiloActualUI = null
            respuestasUI = []
            limpiarRespuestaObjetivo()
            requestAnimationFrame(function () { foroLista.scrollIntoView({ behavior: "smooth", block: "start" }) })
        }

        function mostrarDetalleHilo() {
            foroLista.style.display = "none"
            foroDetalle.style.display = "block"
            actualizarAvatarComposerRespuesta()
            requestAnimationFrame(function () { foroDetalle.scrollIntoView({ behavior: "smooth", block: "start" }) })
        }

        function formatearFecha(fecha) {
            if (!fecha) return ""
            return new Date(fecha).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })
        }

        function activarAccionesPublicacion(contenedor) {

            contenedor.querySelectorAll(".accionDenunciar").forEach(function (btn) {
                btn.addEventListener("click", function () {
                    denunciarPublicacion(btn.dataset.tipo, btn.dataset.id)
                })
            })

            contenedor.querySelectorAll(".accionBorrar").forEach(function (btn) {
                btn.addEventListener("click", function () {
                    borrarPublicacion(btn.dataset.tipo, btn.dataset.id)
                })
            })

        }

        async function denunciarPublicacion(tipo, id) {

            const motivoRaw = prompt("¿Por qué querés denunciar esto? (opcional, podés dejarlo vacío)")
            if (motivoRaw === null) return

            const r = await llamar("denunciar", { tipo, id, motivo: motivoRaw })

            if (r.ok) {
                alert("Gracias, un moderador va a revisarlo.")
            } else {
                alert(mensajeError(r.error) + (r.detalle ? "\n\nDetalle técnico: " + r.detalle : "") )
            }

        }

        async function borrarPublicacion(tipo, id) {

            if (!confirm("¿Seguro que querés borrar esto?")) return

            const accion = tipo === "hilo" ? "borrarHilo" : "borrarRespuesta"
            let r = await llamar(accion, { id })
            // Contenido de otra persona: el servidor pide la llave de moderación.
            if (!r.ok && r.error === "llave_requerida") r = await llamarModeracion(accion, { id })
            if (!r.ok && r.error === "moderacion_bloqueada") return

            if (r.ok) {
                if (tipo === "hilo") {
                    navegarHistorial(crearEstadoNavegacion("foro", null), true)
                    mostrarListaHilos(false)
                    invalidarCacheForo(function (hilos) { return hilos.filter(function (h) { return String(h.id) !== String(id) }) })
                    hiloCacheCliente.delete(String(id))
                    cargarHilos(true)
                } else {
                    const hiloId = String(hiloAbiertoId)

                    // La respuesta ya fue borrada en el servidor.
                    // Invalidamos el caché para no volver a mostrarla.
                    hiloCacheCliente.delete(hiloId)
                    invalidarCacheForo()

                    // Fuerza una lectura fresca desde Supabase.
                    await abrirHilo(hiloId, false)
                }
            } else {
                alert(mensajeError(r.error) + (r.detalle ? "\n\nDetalle técnico: " + r.detalle : "") )
            }

        }

        const DOMINIOS_LINK_PERMITIDOS = [
            "youtube.com",
            "youtu.be",
            "youtube-nocookie.com",
            "docs.google.com",
            "drive.google.com",
            "forms.google.com",
            "sheets.google.com",
            "slides.google.com",
            "classroom.google.com",
            "sites.google.com",
            "scholar.google.com",
            "unmdp.edu.ar",
            "doi.org",
            "pubmed.ncbi.nlm.nih.gov",
            "pmc.ncbi.nlm.nih.gov",
            "scielo.org",
            "sciencedirect.com",
            "springer.com",
            "link.springer.com",
            "nature.com",
            "wiley.com",
            "bmj.com",
            "jamanetwork.com",
            "plos.org",
            "frontiersin.org",
            "cochranelibrary.com",
            "thelancet.com",
            "arxiv.org",
            "biorxiv.org",
            "medrxiv.org",
            "acs.org",
            "ieeexplore.ieee.org",
            "open.spotify.com",
            "spotify.com",
            "steampowered.com",
            "steamcommunity.com",
            "prnt.sc", "lightshot.com", "pinetools.com", "screenapp.io", "imgur.com", "ibb.co", "postimg.cc", "imgbb.com", "imageshack.com", "imgbox.com"
        ]

        let mapaEtiquetasDisponibles = new Map()

        function hostPermitidoLocal(hostname) {
            const host = (hostname || "").toLowerCase().replace(/\.$/, "")
            return DOMINIOS_LINK_PERMITIDOS.some(function (dominio) {
                return host === dominio || host.endsWith("." + dominio)
            })
        }

        function enlaceSeguroLocal(link) {
            try {
                const u = new URL(link)
                return u.protocol === "https:" && !u.username && !u.password && hostPermitidoLocal(u.hostname)
            } catch (err) {
                return false
            }
        }

        function normalizarEtiqueta(texto) {
            return (texto || "").trim().toLowerCase()
        }

        async function cargarEtiquetasDisponibles() {
            const cache = foroCacheCliente.get(claveForo('', ''))
            if (cache && cache.actualizadoEn && Date.now() - cache.actualizadoEn < FRESCURA_FORO_CLIENTE_MS && Array.isArray(cache.etiquetas)) {
                renderizarEtiquetasCliente(cache.etiquetas)
                return
            }
            const r = await llamar("listarEtiquetas", {})
            if (!r.ok) return
            renderizarEtiquetasCliente(r.etiquetas || [])
        }

        function aplicarFiltroEtiqueta() {
            busquedaForoActual = String(inputFiltroEtiqueta.value || '').trim().slice(0, 80)
            etiquetaFiltroActual = ''
            btnQuitarFiltro.style.display = busquedaForoActual ? 'inline-flex' : 'none'
            if (ayudaFiltroEtiqueta) ayudaFiltroEtiqueta.textContent = busquedaForoActual ? 'Resultados para: ' + busquedaForoActual : ''
            cargarHilos(true)
            return true
        }

        function hiloCoincideConPendiente(h, pendiente) {
            if (!h || !pendiente) return false
            if (String(h.titulo || '') !== String(pendiente.titulo || '')) return false
            if (String(h.autor || '') !== String(pendiente.autor || '')) return false
            const resumenA = String(h.resumen || '').slice(0, 180)
            const resumenB = String(pendiente.resumen || '').slice(0, 180)
            if (resumenA !== resumenB) return false
            const tA = new Date(h.fecha || 0).getTime()
            const tB = new Date(pendiente.fecha || 0).getTime()
            return tA && tB && Math.abs(tA - tB) < 10 * 60 * 1000
        }

        function combinarHilosConPendientes(hilos, key) {
            const salida = Array.isArray(hilos) ? hilos.slice() : []
            hilosPendientesConfirmacion.forEach(function(pendiente, tempId) {
                const coincide = salida.some(function(h) { return hiloCoincideConPendiente(h, pendiente) })
                if (coincide) {
                    hilosPendientesConfirmacion.delete(tempId)
                    return
                }
                const partesFiltro = key.split('::')
                const filtroBase = partesFiltro[0]
                const terminoBusqueda = String(partesFiltro.slice(1).join('::') || '').toLowerCase()
                const coincideEtiqueta = filtroBase === '_todos' || (pendiente.etiquetas || []).some(function(t) { return String(t).toLowerCase() === filtroBase })
                const textoPendiente = [pendiente.titulo, pendiente.resumen].concat(pendiente.etiquetas || []).join(' ').toLowerCase()
                const coincideBusqueda = !terminoBusqueda || textoPendiente.includes(terminoBusqueda)
                if (coincideEtiqueta && coincideBusqueda) salida.unshift(pendiente)
            })
            return salida
        }

        async function cargarHilos(reiniciar) {
            const key = claveForoActual()

            // No vaciamos la lista al comenzar una petición. Así un retraso o
            // fallo de red nunca transforma una interfaz válida en una pantalla vacía.
            // Cuando hay caché, se muestra de inmediato mientras llega la actualización.
            if (reiniciar) {
                paginaHilosActual = 0
                const cached = foroCacheCliente.get(key)
                if (cached) {
                    renderizarHilos(cached.hilos || [], true)
                    paginaHilosActual = (cached.hilos || []).length
                    btnCargarMas.style.display = cached.hayMas ? 'block' : 'none'
                    foroCargado = true
                }
                listaHilos.style.opacity = '0.72'
                listaHilos.setAttribute('aria-busy', 'true')
            }

            const r = await llamar("listarHilos", { etiqueta: etiquetaFiltroActual, busqueda: busquedaForoActual, desde: reiniciar ? 0 : paginaHilosActual })

            if (!r.ok) {
                listaHilos.style.opacity = ''
                listaHilos.removeAttribute('aria-busy')

                if (!foroCacheCliente.has(key) && !listaHilos.querySelector('.hiloItem')) {
                    listaHilos.innerHTML = "<p class='vacio'>" + escapeHtml(mensajeError(r.error)) + "</p>"
                    btnCargarMas.style.display = 'none'
                }

                if (r.error === "sesion_invalida") {
                    sesion = null
                    borrarSesionLocal()
                    mostrarLogin()
                }

                console.warn("No se pudo actualizar el foro; se conserva la vista actual.", r)
                return false
            }

            if (reiniciar) {
                const hilosConfirmados = combinarHilosConPendientes(r.hilos || [], key)
                const item = {
                    hilos: hilosConfirmados,
                    hayMas: !!r.hayMas,
                    etiquetas: foroCacheCliente.get(key)?.etiquetas || [],
                    actualizadoEn: Date.now()
                }
                foroCacheCliente.set(key, item)
                renderizarHilos(item.hilos, true)
                paginaHilosActual = item.hilos.length
            } else {
                const nuevosHilos = combinarHilosConPendientes(r.hilos || [], key)
                renderizarHilos(nuevosHilos, false)
                paginaHilosActual += (r.hilos || []).length
            }

            btnCargarMas.style.display = r.hayMas ? "block" : "none"
            foroCargado = true
            listaHilos.style.opacity = ''
            listaHilos.removeAttribute('aria-busy')
            return true
        }

        // Actualización silenciosa: nunca limpia ni sustituye la interfaz antes
        // de recibir una respuesta válida del servidor.
        async function sincronizarHilosEnSegundoPlano() {
            const key = claveForoActual()
            const r = await llamar("listarHilos", { etiqueta: etiquetaFiltroActual, busqueda: busquedaForoActual, desde: 0 })
            if (!r.ok) {
                console.warn("No se pudo sincronizar el foro en segundo plano; se conserva la vista.", r)
                return false
            }

            const hilosConfirmados = combinarHilosConPendientes(r.hilos || [], key)
            const item = {
                hilos: hilosConfirmados,
                hayMas: !!r.hayMas,
                etiquetas: foroCacheCliente.get(key)?.etiquetas || [],
                actualizadoEn: Date.now()
            }
            foroCacheCliente.set(key, item)

            // Solo renderizamos si seguimos viendo el mismo filtro.
            if (key === claveForoActual()) {
                renderizarHilos(item.hilos, true)
                paginaHilosActual = item.hilos.length
                btnCargarMas.style.display = r.hayMas ? "block" : "none"
            }

            return true
        }

        // Clasifica un enlace permitido para elegir la vista previa (embed de YouTube/Spotify o tarjeta).
        // Se había borrado por error en f05ebaa y renderizarLinkPreview fallaba con cualquier hilo con link.
        function detectarTipoLink(link) {
            try {
                const u = new URL(link)
                const host = u.hostname.replace(/^www\./, "").toLowerCase()
                const path = u.pathname

                if (host === "youtu.be" || host === "youtube.com" || host === "youtube-nocookie.com") {
                    let id = ""

                    if (host === "youtu.be") {
                        id = path.split("/").filter(Boolean)[0] || ""
                    } else {
                        const matchWatch = u.searchParams.get("v")
                        const matchPath = path.match(/^\/(?:shorts|embed|live)\/([^/?#]+)/i)
                        id = matchWatch || (matchPath ? matchPath[1] : "")
                    }

                    return { tipo: "youtube", id: id }
                }

                if (host === "open.spotify.com" || host === "spotify.com") {
                    const segmentos = path.split("/").filter(Boolean)
                    const tiposSpotify = ["track", "album", "playlist", "episode", "show"]
                    const indiceTipo = segmentos.findIndex(function (s) { return tiposSpotify.includes(s) })

                    if (indiceTipo !== -1 && segmentos[indiceTipo + 1]) {
                        return {
                            tipo: "spotify",
                            subtipo: segmentos[indiceTipo],
                            id: segmentos[indiceTipo + 1]
                        }
                    }

                    return { tipo: "spotify", subtipo: "", id: "" }
                }

                if (host === "docs.google.com" || host === "drive.google.com" || host === "forms.google.com" ||
                    host === "sheets.google.com" || host === "slides.google.com" || host === "classroom.google.com" ||
                    host === "sites.google.com" || host === "scholar.google.com") {
                    return { tipo: "google" }
                }

                if (host === "unmdp.edu.ar" || host.endsWith(".unmdp.edu.ar")) {
                    return { tipo: "unmdp" }
                }

                if (host === "steampowered.com" || host.endsWith(".steampowered.com") ||
                    host === "steamcommunity.com" || host.endsWith(".steamcommunity.com")) {
                    return { tipo: "steam" }
                }

                return { tipo: "academico" }
            } catch (err) {
                return { tipo: "otro" }
            }
        }

        function renderizarLinkPreview(link, compacto) {
            if (!link || !enlaceSeguroLocal(link)) return ""

            let u

            try {
                u = new URL(link)
            } catch (err) {
                return ""
            }

            const host = u.hostname.replace(/^www\./, "")
            const info = detectarTipoLink(link)

            if (info.tipo === "youtube" && info.id) {
                const thumb = "https://i.ytimg.com/vi/" + encodeURIComponent(info.id) + "/hqdefault.jpg"

                if (compacto) {
                    return "<a href='" + escapeAttr(link) + "' target='_blank' rel='noopener noreferrer' class='linkPreview linkPreviewCompact'>" +
                        "<div class='linkPreviewBody'>" +
                        "<img class='linkPreviewThumb' src='" + escapeAttr(thumb) + "' alt='Vista previa de YouTube' loading='lazy'>" +
                        "<div class='linkPreviewInfo'>" +
                        "<span class='linkPreviewTitle'>Video de YouTube</span>" +
                        "<span class='linkPreviewHost'>" + escapeHtml(host) + "</span>" +
                        "</div>" +
                        "</div>" +
                        "</a>"
                }

                let embed = "https://www.youtube.com/embed/" + encodeURIComponent(info.id) + "?rel=0"
                if (location.protocol === "http:" || location.protocol === "https:") {
                    embed += "&origin=" + encodeURIComponent(location.origin)
                }

                return "<div class='linkPreview'>" +
                    "<iframe class='linkPreviewEmbed' src='" + escapeAttr(embed) + "' title='Vista previa de YouTube' loading='lazy' allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share' allowfullscreen referrerpolicy='strict-origin-when-cross-origin'></iframe>" +
                    "<a href='" + escapeAttr(link) + "' target='_blank' rel='noopener noreferrer' class='linkPreviewPlay'>Abrir en YouTube ↗</a>" +
                    "</div>"
            }

            if (info.tipo === "spotify" && info.subtipo && info.id && !compacto) {
                const embed = "https://open.spotify.com/embed/" + encodeURIComponent(info.subtipo) + "/" + encodeURIComponent(info.id)

                return "<div class='linkPreview'>" +
                    "<iframe class='linkPreviewEmbed spotify' src='" + escapeAttr(embed) + "' title='Vista previa de Spotify' loading='lazy' allow='autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture' referrerpolicy='strict-origin-when-cross-origin'></iframe>" +
                    "<a href='" + escapeAttr(link) + "' target='_blank' rel='noopener noreferrer' class='linkPreviewPlay'>Abrir en Spotify ↗</a>" +
                    "</div>"
            }

            const subtitulo = info.tipo === "google"
                ? "Contenido de Google"
                : info.tipo === "unmdp"
                    ? "Contenido de la UNMDP"
                    : info.tipo === "steam"
                        ? "Contenido de Steam"
                        : info.tipo === "spotify"
                            ? "Contenido de Spotify"
                            : "Recurso académico"

            return "<a href='" + escapeAttr(link) + "' target='_blank' rel='noopener noreferrer' class='linkPreview'>" +
                "<div class='linkPreviewBody'>" +
                "<div class='linkPreviewInfo'>" +
                "<span class='linkPreviewTitle'>" + escapeHtml(subtitulo) + "</span>" +
                "<span class='linkPreviewHost'>" + escapeHtml(host) + "</span>" +
                "</div>" +
                "</div>" +
                "<span class='linkPreviewPlay'>Abrir enlace ↗</span>" +
                "</a>"
        }

        function likeButtonHtml(tipo, id, likes, meGusta) {
            const activo = meGusta ? " activo" : ""
            const etiqueta = meGusta ? "Quitar me gusta" : "Me gusta"
            return "<button type='button' class='likeButton" + activo + "' data-like-tipo='" + escapeAttr(tipo) + "' data-like-id='" + escapeAttr(id) + "' aria-label='" + etiqueta + "' aria-pressed='" + (meGusta ? 'true' : 'false') + "'>" +
                "<svg class='corazonLike' viewBox='0 0 24 24' aria-hidden='true'><path d='M20.8 8.8c0 4.2-8.8 10-8.8 10S3.2 13 3.2 8.8A4.7 4.7 0 0 1 12 6.1a4.7 4.7 0 0 1 8.8 2.7Z'></path></svg>" +
                "<span class='likeCount'>" + Number(likes || 0) + "</span>" +
                "</button>"
        }

        function activarBotonLike(contenedor) {
            const btn = contenedor.querySelector('.likeButton')
            if (!btn) return
            btn.addEventListener('click', function (e) {
                e.preventDefault()
                e.stopPropagation()
                toggleLikeUI(btn.dataset.likeTipo, btn.dataset.likeId, btn)
            })
        }

        function actualizarLikeEnCachesCliente(tipo, id, liked, likes) {
            if (tipo === 'hilo') {
                foroCacheCliente.forEach(function (cache) {
                    if (!cache || !Array.isArray(cache.hilos)) return
                    cache.hilos.forEach(function (h) {
                        if (String(h.id) === String(id)) {
                            h.meGusta = liked
                            h.likes = likes
                        }
                    })
                })
            }
        }

        async function toggleLikeUI(tipo, id, btn) {
            if (!sesion) return
            const root = btn.closest('.hiloItem, #detalleHiloContenido, .respuestaItem') || btn.parentElement
            const wasLiked = btn.classList.contains('activo')
            const countEl = btn.querySelector('.likeCount')
            const heartEl = btn.querySelector('.corazonLike')
            const oldLikes = Number(countEl ? countEl.textContent : 0)
            const optimisticLiked = !wasLiked
            const optimisticLikes = Math.max(0, oldLikes + (optimisticLiked ? 1 : -1))

            btn.classList.toggle('activo', optimisticLiked)
            btn.setAttribute('aria-label', optimisticLiked ? 'Quitar me gusta' : 'Me gusta'); btn.setAttribute('aria-pressed', optimisticLiked ? 'true' : 'false')
            if (heartEl) heartEl.classList.toggle('relleno', optimisticLiked)
            if (countEl) countEl.textContent = optimisticLikes
            if (optimisticLiked) {
                btn.classList.remove('pulsando')
                void btn.offsetWidth
                btn.classList.add('pulsando')
            }

            if (tipo === 'respuesta') {
                const item = respuestasUI.find(function (r) { return String(r.id) === String(id) })
                if (item) { item.meGusta = optimisticLiked; item.likes = optimisticLikes }
            }

            const r = await llamar('toggleLike', { tipo: tipo, id: id })
            if (r.ok) {
                btn.classList.toggle('activo', !!r.liked)
                btn.setAttribute('aria-label', r.liked ? 'Quitar me gusta' : 'Me gusta'); btn.setAttribute('aria-pressed', r.liked ? 'true' : 'false')
                if (heartEl) heartEl.classList.toggle('relleno', !!r.liked)
                if (countEl) countEl.textContent = Number(r.likes || 0)
                if (tipo === 'respuesta') {
                    const item = respuestasUI.find(function (x) { return String(x.id) === String(id) })
                    if (item) { item.meGusta = !!r.liked; item.likes = Number(r.likes || 0) }
                } else {
                    if (hiloActualUI && String(hiloActualUI.id) === String(id)) {
                        hiloActualUI.meGusta = !!r.liked
                        hiloActualUI.likes = Number(r.likes || 0)
                    }
                    const cacheHiloLike = hiloCacheCliente.get(String(id))
                    if (cacheHiloLike && cacheHiloLike.data && cacheHiloLike.data.hilo) {
                        cacheHiloLike.data.hilo.meGusta = !!r.liked
                        cacheHiloLike.data.hilo.likes = Number(r.likes || 0)
                        cacheHiloLike.actualizadoEn = Date.now()
                    }
                    actualizarLikeEnCachesCliente(tipo, id, !!r.liked, Number(r.likes || 0))
                }
                return
            }

            // Rollback optimistic state.
            btn.classList.toggle('activo', wasLiked)
            btn.setAttribute('aria-label', wasLiked ? 'Quitar me gusta' : 'Me gusta'); btn.setAttribute('aria-pressed', wasLiked ? 'true' : 'false')
            if (heartEl) heartEl.classList.toggle('relleno', wasLiked)
            if (countEl) countEl.textContent = oldLikes
            alert(mensajeError(r.error) + (r.detalle ? "\n\nDetalle técnico: " + r.detalle : ""))
        }

        function renderizarHilos(hilos, reiniciar) {

            if (reiniciar) listaHilos.innerHTML = ""

            if (reiniciar && hilos.length === 0) {
                listaHilos.innerHTML = "<p class='vacio'>" + (busquedaForoActual ? 'No encontramos publicaciones que coincidan con esa búsqueda.' : (etiquetaFiltroActual ? 'Todavía no hay hilos con esa etiqueta.' : 'Todavía no hay publicaciones.')) + "</p>"
                return
            }

            hilos.forEach(function (h) {

                const div = document.createElement("div")
                div.className = "hiloItem" + (h._optimista ? " hiloOptimista" : "")
                if (h._optimista) div.dataset.tempHilo = h.id
                div.tabIndex = 0
                div.setAttribute("role", "button")

                const chips = (h.etiquetas || []).map(function (t) {
                    return "<button type='button' class='etiquetaChip' data-etiqueta=\"" + escapeAttr(t) + "\">" + escapeHtml(t) + "</button>"
                }).join("")

                div.innerHTML =
                    (chips ? "<div class='etiquetas'>" + chips + "</div>" : "") +
                    "<h3 class='hiloTitulo'>" + escapeHtml(h.titulo) + "</h3>" +
                    (h.isSensitive ? "<div class='avisoSensibleFeed'>⚠️ Contenido sensible · Abrí la publicación para visualizarlo</div>" :
                        (h.resumen ? "<p class='hiloResumen'>" + escapeHtml(h.resumen) + "</p>" : "")) +
                    // En un hilo sensible tampoco mostramos la miniatura del enlace en el listado.
                    (h.isSensitive ? "" : renderizarLinkPreview(h.link, true)) +
                    (h._optimista ? "<div class='estadoOptimista'>" + escapeHtml(h._estadoOptimista === "pendiente" ? "Confirmando publicación… No la vuelvas a publicar." : "Publicando…") + "</div>" : "") +
                    "<div class='hiloPie'>" +
                    avatarHtml(h.autor, h.autorFoto, "avatarChico") +
                    "<span class='hiloAutor'>" + escapeHtml(h.autor) + "</span>" +
                    "<span class='puntoSeparador'>·</span>" +
                    "<span class='hiloFecha'>" + formatearFecha(h.fecha) + "</span>" +
                    "<span class='hiloRespuestasCount' aria-label='" + Number(h.respuestas || 0) + " comentarios'><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M20 11.5a7.5 7.5 0 0 1-7.5 7.5H6l-3 2v-5.5A7.5 7.5 0 1 1 20 11.5Z'></path><path d='M8 11.5h.01M12 11.5h.01M16 11.5h.01'></path></svg><span>" + Number(h.respuestas || 0) + "</span></span>" +
                    "</div>" +
                    "<div class='hiloLikeBar'>" + likeButtonHtml('hilo', h.id, h.likes, h.meGusta) + "</div>"

                div.addEventListener("click", function () {
                    if (h._optimista) return
                    abrirHilo(h.id)
                })

                div.addEventListener("keydown", function (e) {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        if (!h._optimista) abrirHilo(h.id)
                    }
                })

                div.querySelectorAll(".etiquetaChip").forEach(function (chip) {
                    chip.addEventListener("click", function (e) {
                        e.stopPropagation()
                        etiquetaFiltroActual = chip.dataset.etiqueta.toLowerCase()
                        busquedaForoActual = ''
                        inputFiltroEtiqueta.value = ''
                        btnQuitarFiltro.style.display = "inline-flex"
                        if (ayudaFiltroEtiqueta) ayudaFiltroEtiqueta.textContent = 'Etiqueta: ' + chip.dataset.etiqueta
                        cargarHilos(true)
                    })
                })

                const linkEl = div.querySelector(".linkPreview")
                if (linkEl) linkEl.addEventListener("click", function (e) { e.stopPropagation() })
                activarBotonLike(div)

                listaHilos.appendChild(div)

            })

        }

        btnCargarMas.addEventListener("click", function () {
            cargarHilos(false)
        })

        if (formBusquedaForo) formBusquedaForo.addEventListener('submit', function (e) {
            e.preventDefault()
            aplicarFiltroEtiqueta()
        })
        inputFiltroEtiqueta.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                inputFiltroEtiqueta.value = ''
                aplicarFiltroEtiqueta()
            }
        })
        btnQuitarFiltro.addEventListener('click', function () {
            etiquetaFiltroActual = ''
            busquedaForoActual = ''
            inputFiltroEtiqueta.value = ''
            btnQuitarFiltro.style.display = 'none'
            if (ayudaFiltroEtiqueta) ayudaFiltroEtiqueta.textContent = ''
            cargarHilos(true)
        })

        function aplicarTemaGlobal(preferencia, guardar) {
            const sistemaOscuro = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
            const temaReal = preferencia === 'sistema' ? (sistemaOscuro ? 'oscuro' : 'claro') : preferencia
            document.body.classList.toggle('temaOscuro', temaReal === 'oscuro')
            document.documentElement.setAttribute('data-theme', temaReal)
            if (selectorTemaGlobal && selectorTemaGlobal.value !== preferencia) selectorTemaGlobal.value = preferencia
            if (guardar) localStorage.setItem('medmar:tema', preferencia)
        }
        const temaGuardado = localStorage.getItem('medmar:tema') || 'claro'
        aplicarTemaGlobal(temaGuardado, false)
        if (selectorTemaGlobal) selectorTemaGlobal.addEventListener('change', function () {
            aplicarTemaGlobal(selectorTemaGlobal.value, true)
        })
        if (window.matchMedia) {
            const mediaTema = window.matchMedia('(prefers-color-scheme: dark)')
            if (mediaTema.addEventListener) mediaTema.addEventListener('change', function () {
                if ((localStorage.getItem('medmar:tema') || 'claro') === 'sistema') aplicarTemaGlobal('sistema', false)
            })
        }

        function autoAjustarTextarea(el) {
            el.style.height = "auto"
            el.style.height = el.scrollHeight + "px"
        }

        function actualizarComposeCabecera() {
            avatarCompose.innerHTML = avatarHtml(inputPseudonimo.value || "Vos", fotoActual, "avatarChico")
            nombreCompose.textContent = inputPseudonimo.value || "Vos"
        }

        inputContenido.addEventListener("input", function () {
            autoAjustarTextarea(inputContenido)
            contadorContenido.textContent = inputContenido.value.length + " / 5000"
        })

        inputRespuesta.addEventListener("input", function () {
            autoAjustarTextarea(inputRespuesta)
            ajustarComposerTeclado()
        })

        // El viewport visual se reduce al abrir el teclado virtual en móviles.
        // Ajustamos el bottom del compositor a ese viewport sin alterar el scroll
        // general de la página ni intervenir en la autenticación o el envío.
        const viewportVisual = window.visualViewport || null
        let rafComposerTeclado = 0

        function ajustarComposerTeclado() {
            if (rafComposerTeclado) cancelAnimationFrame(rafComposerTeclado)
            rafComposerTeclado = requestAnimationFrame(function () {
                rafComposerTeclado = 0
                if (!formRespuesta || !inputRespuesta) return

                const enfocado = document.activeElement === inputRespuesta
                const alturaViewport = viewportVisual ? viewportVisual.height : window.innerHeight
                const offsetViewport = viewportVisual ? viewportVisual.offsetTop : 0
                const tecladoVisible = enfocado && (window.innerHeight - alturaViewport > 100)

                if (tecladoVisible) {
                    const espacioInferior = Math.max(0, window.innerHeight - alturaViewport - offsetViewport)
                    formRespuesta.style.setProperty("--medmar-composer-keyboard-bottom", espacioInferior + "px")
                    formRespuesta.style.setProperty("--medmar-visual-height", alturaViewport + "px")
                    formRespuesta.classList.add("tecladoAbierto")
                } else {
                    formRespuesta.style.removeProperty("--medmar-composer-keyboard-bottom")
                    formRespuesta.style.removeProperty("--medmar-visual-height")
                    formRespuesta.classList.remove("tecladoAbierto")
                }
            })
        }

        inputRespuesta.addEventListener("focus", function () {
            ajustarComposerTeclado()
            // Segunda medición tras el inicio de la animación del teclado.
            requestAnimationFrame(ajustarComposerTeclado)
        })
        inputRespuesta.addEventListener("blur", function () {
            // Espera a que el navegador actualice el foco al cerrar el teclado.
            setTimeout(ajustarComposerTeclado, 120)
        })
        if (viewportVisual) {
            viewportVisual.addEventListener("resize", ajustarComposerTeclado)
            viewportVisual.addEventListener("scroll", ajustarComposerTeclado)
        }
        window.addEventListener("resize", ajustarComposerTeclado)

        btnAbrirCompose.addEventListener("click", function () {

            navegarHistorial(crearEstadoNavegacion("foro", "compose"), false)
            abrirModal(modalCompose)
            actualizarComposeCabecera()
            inputContenido.style.height = ""
            contadorContenido.textContent = inputContenido.value.length + " / 5000"

            setTimeout(function () { inputTitulo.focus() }, 200)

        })

        btnCerrarCompose.addEventListener("click", function () {
            volverHistorialOverlay("compose", function () {
                cerrarModal(modalCompose)
            })
        })

        formHilo.addEventListener("submit", async function (e) {

            e.preventDefault()
            if (hiloPublicacionEnCurso) return

            const titulo = inputTitulo.value.trim()
            const contenido = inputContenido.value.trim()
            const etiquetasTexto = inputEtiquetas.value.trim()
            const isSensitive = !!inputContenidoSensible.checked
            const tags = etiquetasTexto.split(",").map(function (x) { return x.trim() }).filter(Boolean).slice(0, 5)
            const tempId = "tmp-" + Date.now() + "-" + Math.random().toString(36).slice(2)
            const operacionId = (crypto && crypto.randomUUID) ? crypto.randomUUID() : ("op-" + Date.now() + "-" + Math.random().toString(36).slice(2))

            const hOptimista = {
                id: tempId,
                autor: inputPseudonimo.value || "Vos",
                autorFoto: fotoActual,
                titulo: titulo,
                resumen: contenido.length > 180 ? contenido.slice(0, 180) + "…" : contenido,
                etiquetas: tags,
                link: "",
                isSensitive: isSensitive,
                fecha: new Date().toISOString(),
                respuestas: 0,
                _optimista: true,
                _estadoOptimista: "confirmando"
            }

            hiloPublicacionEnCurso = true
            if (btnAbrirCompose) btnAbrirCompose.disabled = true
            const btnSubmitHilo = formHilo.querySelector("button[type='submit']")
            if (btnSubmitHilo) btnSubmitHilo.disabled = true
            msgHilo.innerText = "Publicando…"
            hilosPendientesConfirmacion.set(tempId, hOptimista)

            if (estadoActualSeguro() && estadoActualSeguro().overlay === "compose") {
                navegarHistorial(crearEstadoNavegacion("foro", null), true)
            }
            cerrarModal(modalCompose)
            renderizarHilos([hOptimista], false)
            const tempEl = [...listaHilos.querySelectorAll("[data-temp-hilo]")].find(function (x) { return x.dataset.tempHilo === tempId })
            if (tempEl) tempEl.classList.add("hiloOptimista")

            const r = await llamarMutacionResiliente("crearHilo", {
                titulo: titulo,
                contenido: contenido,
                etiquetas: etiquetasTexto,
                isSensitive: isSensitive,
                operacionId: operacionId
            }, 3)

            if (r.ok) {
                hiloPublicacionEnCurso = false
                if (btnAbrirCompose) btnAbrirCompose.disabled = false
                if (btnSubmitHilo) btnSubmitHilo.disabled = false
                hilosPendientesConfirmacion.delete(tempId)
                msgHilo.innerText = ""
                formHilo.reset()
                inputContenido.style.height = ""
                contadorContenido.textContent = "0 / 5000"

                const temp = [...listaHilos.querySelectorAll("[data-temp-hilo]")].find(function (x) { return x.dataset.tempHilo === tempId })
                const hReal = Object.assign({}, hOptimista, {
                    id: String(r.id || tempId),
                    likes: 0,
                    meGusta: false,
                    _optimista: false,
                    _estadoOptimista: ""
                })

                if (temp) {
                    temp.remove()
                    const cantidadAntes = listaHilos.children.length
                    renderizarHilos([hReal], false)
                    const nuevo = listaHilos.children[cantidadAntes]
                    if (nuevo) listaHilos.insertBefore(nuevo, listaHilos.firstChild)
                }

                invalidarCacheForo()
                const keyForo = claveForoActual()
                const cacheActual = foroCacheCliente.get(keyForo)
                if (cacheActual && Array.isArray(cacheActual.hilos)) {
                    cacheActual.hilos = [hReal, ...cacheActual.hilos.filter(function (h) {
                        return String(h.id) !== String(hReal.id)
                    })]
                    cacheActual.actualizadoEn = Date.now()
                    foroCacheCliente.set(keyForo, cacheActual)
                }

                setTimeout(function() {
                    sincronizarHilosEnSegundoPlano()
                    cargarEtiquetasDisponibles()
                }, 250)
                return
            }

            if (esErrorAmbiguo("crearHilo", r)) {
                hOptimista._estadoOptimista = "pendiente"
                hilosPendientesConfirmacion.set(tempId, hOptimista)
                const temp = [...listaHilos.querySelectorAll("[data-temp-hilo]")].find(function (x) { return x.dataset.tempHilo === tempId })
                if (temp) {
                    const estado = temp.querySelector(".estadoOptimista")
                    if (estado) estado.textContent = "Confirmando publicación… No la vuelvas a publicar."
                }
                msgHilo.innerText = "La publicación quedó en verificación. No la vuelvas a publicar."
                // Reintento de fondo con la misma operación: el backend es idempotente.
                setTimeout(async function() {
                    const rr = await llamarMutacionResiliente("crearHilo", {
                        titulo: titulo,
                        contenido: contenido,
                        etiquetas: etiquetasTexto,
                        isSensitive: isSensitive,
                        operacionId: operacionId
                    }, 2)
                    if (rr.ok) {
                        hilosPendientesConfirmacion.delete(tempId)
                        hiloPublicacionEnCurso = false
                        if (btnAbrirCompose) btnAbrirCompose.disabled = false
                        if (btnSubmitHilo) btnSubmitHilo.disabled = false
                        const temp2 = [...listaHilos.querySelectorAll("[data-temp-hilo]")].find(function (x) { return x.dataset.tempHilo === tempId })
                        if (temp2) {
                            temp2.remove()
                            const hReal2 = Object.assign({}, hOptimista, { id: String(rr.id || tempId), _optimista: false, _estadoOptimista: "", likes: 0, meGusta: false })
                            const cantidadAntes2 = listaHilos.children.length
                            renderizarHilos([hReal2], false)
                            const nuevo2 = listaHilos.children[cantidadAntes2]
                            if (nuevo2) listaHilos.insertBefore(nuevo2, listaHilos.firstChild)
                        }
                        msgHilo.innerText = ""
                    }
                }, 15000)
                return
            }

            hiloPublicacionEnCurso = false
            if (btnAbrirCompose) btnAbrirCompose.disabled = false
            if (btnSubmitHilo) btnSubmitHilo.disabled = false
            hilosPendientesConfirmacion.delete(tempId)
            const temp = [...listaHilos.querySelectorAll("[data-temp-hilo]")].find(function (x) { return x.dataset.tempHilo === tempId })
            if (temp) temp.remove()
            msgHilo.innerText = ""

            if (r.error === "sesion_invalida") {
                sesion = null
                borrarSesionLocal()
                mostrarLogin()
            } else {
                alert(mensajeError(r.error) + (r.detalle ? "\n\nDetalle técnico: " + r.detalle : ""))
            }

        })

        function combinarRespuestasConPendientes(respuestasServidor) {
            const servidor = Array.isArray(respuestasServidor) ? respuestasServidor.slice() : []
            const pendientes = respuestasUI.filter(function(r) { return r && r._optimista && r._operacionId })

            pendientes.forEach(function(pendiente) {
                const encontrado = servidor.some(function(r) {
                    if (!r || !r.esPropio) return false
                    if (pendiente._operacionId && r.operacionId) return String(r.operacionId) === String(pendiente._operacionId)
                    if (String(r.contenido || '') !== String(pendiente.contenido || '')) return false
                    const a = new Date(r.fecha || 0).getTime()
                    const b = new Date(pendiente.fecha || 0).getTime()
                    return a && b && Math.abs(a - b) < 10 * 60 * 1000
                })
                if (!encontrado) servidor.push(pendiente)
            })

            servidor.sort(function(a, b) { return new Date(a.fecha || 0) - new Date(b.fecha || 0) })
            return servidor
        }

        async function abrirHilo(id, actualizarHistorial) {

            if (actualizarHistorial !== false) {
                navegarHistorial(crearEstadoNavegacion("foro", "hilo", id), false)
            }

            hiloAbiertoId = id
            mostrarDetalleHilo()

            const cache = hiloCacheCliente.get(String(id))
            const cacheFresco = cache && cache.actualizadoEn && Date.now() - cache.actualizadoEn < 20000
            if (cache && cache.data) {
                hiloActualUI = Object.assign({}, cache.data.hilo)
                renderizarDetalleHilo(hiloActualUI)
                marcarHiloVisto(cache.data.hilo)
                respuestasUI = combinarRespuestasConPendientes(cache.data.respuestas || [])
                renderizarRespuestas(respuestasUI)
                if (cacheFresco) {
                    llamar("verHilo", { id }).then(function(r) {
                        if (r.ok) hiloCacheCliente.set(String(id), { data: { hilo: r.hilo, respuestas: r.respuestas }, actualizadoEn: Date.now() })
                    })
                    return
                }
            } else {
                detalleHiloContenido.innerHTML = esqueletoTarjetas(1)
                listaRespuestas.innerHTML = ""
            }

            const r = await llamar("verHilo", { id })

            if (!r.ok) {

                if (r.error === "sesion_invalida") {
                    sesion = null
                    borrarSesionLocal()
                    mostrarLogin()
                    return
                }

                detalleHiloContenido.innerHTML = "<p class='vacio'>" + mensajeError(r.error) + "</p>"
                return

            }

            hiloActualUI = Object.assign({}, r.hilo)
            renderizarDetalleHilo(hiloActualUI)
            renderizarRespuestas(r.respuestas)
            marcarHiloVisto(r.hilo)
            hiloCacheCliente.set(String(id), { data: { hilo: r.hilo, respuestas: r.respuestas }, actualizadoEn: Date.now() })

        }

        function esHostPreviewImagen(url) {
            try {
                const host = new URL(url).hostname.toLowerCase()
                return ['prnt.sc','lightshot.com','pinetools.com','screenapp.io','imgur.com','ibb.co','postimg.cc','imgbb.com','imageshack.com'].some(d => host === d || host.endsWith('.' + d))
            } catch (_) { return false }
        }

        function renderizarContenidoForo(texto, sensible, id) {
            const raw = String(texto || '')
            const urlRegex = /https?:\/\/[^\s<>\"']+/gi
            let html = ''
            let last = 0
            let match
            while ((match = urlRegex.exec(raw)) !== null) {
                const original = match[0]
                const url = original.replace(/[),.;!?]+$/g, '')
                const suffix = original.slice(url.length)
                html += escapeHtml(raw.slice(last, match.index)).replace(/\n/g, '<br>')
                let safe = false
                try { safe = enlaceSeguroLocal(url) } catch (_) {}
                if (safe) {
                    const imageDirect = /\.(?:png|jpe?g|gif|webp)(?:\?.*)?$/i.test(url)
                    if (imageDirect) {
                        html += "<a class='enlaceForo' href='" + escapeAttr(url) + "' target='_blank' rel='noopener noreferrer'>" + escapeHtml(url) + "</a><img class='imagenExternaForo' src='" + escapeAttr(url) + "' alt='Imagen externa' loading='lazy' referrerpolicy='no-referrer'>"
                    } else {
                        const previewClass = esHostPreviewImagen(url) ? " externalImageLink" : ""
                        const previewData = esHostPreviewImagen(url) ? " data-preview-url='" + escapeAttr(url) + "'" : ""
                        html += "<a class='enlaceForo" + previewClass + "'" + previewData + " href='" + escapeAttr(url) + "' target='_blank' rel='noopener noreferrer'>" + escapeHtml(url) + "</a>"
                    }
                } else {
                    html += escapeHtml(url)
                }
                html += escapeHtml(suffix)
                last = match.index + original.length
            }
            html += escapeHtml(raw.slice(last)).replace(/\n/g, '<br>')
            const body = "<div class='contenidoForoRich'>" + html + "</div>"
            if (!sensible) return body
            return "<div class='bloqueSensible ocultoSensible' data-sensible-id='" + escapeAttr(id) + "'><button type='button' class='revelarSensible'>⚠️ Contenido sensible · Mostrar contenido</button>" + body + "</div>"
        }

        function hidratarImagenesExternas(root) {
            if (!root) return
            function mostrarImagenNoDisponible(img, despuesDe) {
                if (!img || !img.isConnected) return
                const aviso = document.createElement('div')
                aviso.className = 'imagenExternaNoDisponible'
                aviso.setAttribute('role', 'img')
                aviso.setAttribute('aria-label', 'La imagen ya no está disponible')
                aviso.textContent = '▧  La imagen ya no está disponible.'
                if (despuesDe) despuesDe.insertAdjacentElement('afterend', aviso)
                else img.insertAdjacentElement('afterend', aviso)
                img.remove()
            }
            root.querySelectorAll('img.imagenExternaForo').forEach(function(img) {
                if (img.dataset.fallbackBound) return
                img.dataset.fallbackBound = '1'
                img.onerror = function() { mostrarImagenNoDisponible(img) }
            })
            root.querySelectorAll('.externalImageLink[data-preview-url]').forEach(function(link) {
                if (link.dataset.previewRequested) return
                link.dataset.previewRequested = '1'
                const url = link.dataset.previewUrl
                // Cache por sesión: re-renderizar el hilo no vuelve a invocar la Edge Function por cada enlace.
                if (!imagenesResueltasCliente.has(url)) {
                    imagenesResueltasCliente.set(url, llamar('resolverImagen', { url: url }).then(function(r) {
                        if (!r || (!r.ok && esErrorAmbiguo('resolverImagen', r))) imagenesResueltasCliente.delete(url)
                        return r
                    }))
                }
                imagenesResueltasCliente.get(url).then(function(result) {
                    if (!link.isConnected) return
                    if (!result || !result.ok || !result.imagen) {
                        const aviso = document.createElement('div')
                        aviso.className = 'imagenExternaNoDisponible'
                        aviso.setAttribute('role', 'img')
                        aviso.setAttribute('aria-label', 'La imagen ya no está disponible')
                        aviso.textContent = '▧  La imagen ya no está disponible.'
                        link.insertAdjacentElement('afterend', aviso)
                        return
                    }
                    const img = document.createElement('img')
                    img.className = 'imagenExternaForo'
                    img.src = result.imagen
                    img.alt = 'Imagen externa'
                    img.loading = 'lazy'
                    img.referrerPolicy = 'no-referrer'
                    img.onerror = function() { mostrarImagenNoDisponible(img) }
                    link.insertAdjacentElement('afterend', img)
                }).catch(function(){})
            })
            root.querySelectorAll('.revelarSensible').forEach(function(button) {
                if (button.dataset.bound) return
                button.dataset.bound = '1'
                button.addEventListener('click', function() {
                    const block = button.closest('.bloqueSensible')
                    if (!block) return
                    block.classList.remove('ocultoSensible')
                    button.remove()
                })
            })
        }

        function renderizarDetalleHilo(h) {

            const chips = (h.etiquetas || []).map(function (t) {
                return "<span class='etiquetaChip'>" + escapeHtml(t) + "</span>"
            }).join("")

            let acciones = "<button type='button' class='accionDenunciar' data-tipo='hilo' data-id='" + h.id + "'>Denunciar</button>"

            if (h.esPropio || esModeradorActual) {
                acciones += "<button type='button' class='accionBorrar' data-tipo='hilo' data-id='" + h.id + "'>Borrar</button>"
            }

            detalleHiloContenido.innerHTML =
                (chips ? "<div class='etiquetas'>" + chips + "</div>" : "") +
                "<h3>" + escapeHtml(h.titulo) + "</h3>" +
                "<div class='hiloPie'>" +
                avatarHtml(h.autor, h.autorFoto, "avatarChico") +
                "<span class='hiloAutor'>" + escapeHtml(h.autor) + "</span>" +
                "<span class='puntoSeparador'>·</span>" +
                "<span class='hiloFecha'>" + formatearFecha(h.fecha) + "</span>" +
                "</div>" +
                renderizarContenidoForo(h.contenido, !!h.isSensitive, "hilo-" + h.id) +
                // Si es sensible, la vista previa (embed de YouTube/Spotify) se agrega recién al revelar.
                (h.isSensitive ? "" : renderizarLinkPreview(h.link)) +
                "<div class='hiloLikeBar'>" + likeButtonHtml('hilo', h.id, h.likes, h.meGusta) + "</div>" +
                "<div class='hiloAcciones'>" + acciones + "</div>"

            activarAccionesPublicacion(detalleHiloContenido)
            activarBotonLike(detalleHiloContenido)

            const btnRevelar = detalleHiloContenido.querySelector(".revelarSensible")
            if (btnRevelar && h.link) {
                btnRevelar.addEventListener("click", function () {
                    const bloque = detalleHiloContenido.querySelector(".bloqueSensible")
                    if (bloque) bloque.insertAdjacentHTML("afterend", renderizarLinkPreview(h.link))
                }, { once: true })
            }
            hidratarImagenesExternas(detalleHiloContenido)

            const linkEl = detalleHiloContenido.querySelector(".linkPreview")
            if (linkEl) linkEl.addEventListener("click", function (e) { e.stopPropagation() })

        }

        function actualizarAvatarComposerRespuesta() {
            if (avatarComposeRespuesta) {
                avatarComposeRespuesta.innerHTML = avatarHtml(inputPseudonimo.value || "Vos", fotoActual, "avatarChico")
            }
        }

        function seleccionarRespuestaObjetivo(respuesta) {
            if (!respuesta || respuesta._optimista) return
            respuestaObjetivoActual = String(respuesta.id)
            respuestaContextoTexto.textContent = "Respondiendo a " + (respuesta.autor || "Estudiante")
            respuestaContexto.hidden = false
            inputRespuesta.placeholder = "Respondé a " + (respuesta.autor || "Estudiante") + "…"
            inputRespuesta.focus({ preventScroll: true })
            ajustarComposerTeclado()
        }

        function limpiarRespuestaObjetivo() {
            respuestaObjetivoActual = null
            if (respuestaContexto) respuestaContexto.hidden = true
            if (respuestaContextoTexto) respuestaContextoTexto.textContent = ""
            if (inputRespuesta) inputRespuesta.placeholder = "Escribí una respuesta..."
        }

        btnCancelarRespuesta.addEventListener("click", limpiarRespuestaObjetivo)

        listaRespuestas.addEventListener("click", function (event) {
            const boton = event.target.closest(".btnResponderRespuesta")
            if (boton) {
                const respuesta = respuestasUI.find(function (r) { return String(r.id) === String(boton.dataset.id) })
                seleccionarRespuestaObjetivo(respuesta)
                return
            }
            if (event.target.closest("button, a, input, textarea")) return
            const elemento = event.target.closest(".respuestaItem")
            if (!elemento) return
            const respuesta = respuestasUI.find(function (r) { return String(r.id) === String(elemento.dataset.respuestaId) })
            seleccionarRespuestaObjetivo(respuesta)
        })

        listaRespuestas.addEventListener("keydown", function (event) {
            if (event.key !== "Enter" && event.key !== " ") return
            const elemento = event.target.closest(".respuestaItem[tabindex='0']")
            if (!elemento || event.target !== elemento) return
            event.preventDefault()
            const respuesta = respuestasUI.find(function (r) { return String(r.id) === String(elemento.dataset.respuestaId) })
            seleccionarRespuestaObjetivo(respuesta)
        })

        function crearElementoRespuesta(r) {
            const div = document.createElement("div")
            const esAnidada = !!r.parentId
            div.className = "respuestaItem" + (r._optimista ? " respuestaOptimista" : "") + (esAnidada ? " respuestaAnidada" : " respuestaRaiz")
            div.dataset.respuestaId = r.id
            if (!r._optimista) {
                div.tabIndex = 0
                div.setAttribute("role", "group")
                div.setAttribute("aria-label", "Respuesta de " + (r.autor || "Estudiante") + ". Tocá para responder")
            }

            const padre = esAnidada ? respuestasUI.find(function (x) { return String(x.id) === String(r.parentId) }) : null

            let acciones = r._optimista ? "" : "<button type='button' class='accionDenunciar' data-tipo='respuesta' data-id='" + escapeAttr(r.id) + "'>Denunciar</button>"
            if (!r._optimista && (r.esPropio || esModeradorActual)) {
                acciones += "<button type='button' class='accionBorrar' data-tipo='respuesta' data-id='" + escapeAttr(r.id) + "'>Borrar</button>"
            }
            if (!r._optimista) {
                acciones = "<button type='button' class='btnResponderRespuesta' data-id='" + escapeAttr(r.id) + "'>Responder</button>" + acciones
            }

            div.innerHTML =
                "<div class='respuestaCabecera'>" +
                avatarHtml(r.autor, r.autorFoto, "avatarChico") +
                "<span class='hiloAutor'>" + escapeHtml(r.autor) + "</span>" +
                "<span class='puntoSeparador'>·</span>" +
                "<span class='hiloFecha'>" + formatearFecha(r.fecha) + "</span>" +
                "</div>" +
                (padre ? "<div class='respuestaAContexto'>En respuesta a " + escapeHtml(padre.autor || "Estudiante") + "</div>" : "") +
                renderizarContenidoForo(r.contenido, false, "respuesta-" + r.id) +
                "<div class='hiloLikeBar'>" + likeButtonHtml('respuesta', r.id, r.likes, r.meGusta) + "</div>" +
                (acciones ? "<div class='hiloAcciones'>" + acciones + "</div>" : "")

            activarBotonLike(div)
            activarAccionesPublicacion(div)
            hidratarImagenesExternas(div)
            return div
        }

        function renderizarRespuestas(respuestas) {
            respuestasUI = Array.isArray(respuestas) ? respuestas.slice() : []
            listaRespuestas.innerHTML = ""
            if (respuestasUI.length === 0) {
                listaRespuestas.innerHTML = "<p class='vacio'>Todavía no hay respuestas.</p>"
                return
            }

            const ids = new Set(respuestasUI.map(function (r) { return String(r.id) }))
            const hijos = new Map()
            respuestasUI.forEach(function (r) {
                if (!r.parentId) return
                const key = String(r.parentId)
                if (!hijos.has(key)) hijos.set(key, [])
                hijos.get(key).push(r)
            })
            const raices = respuestasUI.filter(function (r) { return !r.parentId || !ids.has(String(r.parentId)) })

            function crearGrupo(respuesta) {
                const grupo = document.createElement("div")
                grupo.className = "respuestaGrupo"
                grupo.appendChild(crearElementoRespuesta(respuesta))
                const respuestasHijas = hijos.get(String(respuesta.id)) || []
                if (respuestasHijas.length) {
                    const anidadas = document.createElement("div")
                    anidadas.className = "respuestasAnidadas"
                    respuestasHijas.forEach(function (hija) { anidadas.appendChild(crearGrupo(hija)) })
                    grupo.appendChild(anidadas)
                }
                return grupo
            }

            raices.forEach(function (respuesta) { listaRespuestas.appendChild(crearGrupo(respuesta)) })
        }

        btnVolverHilos.addEventListener("click", function () {
            volverHistorialOverlay("hilo", function () { mostrarListaHilos(false) })
        })

        formRespuesta.addEventListener("submit", async function (e) {

            e.preventDefault()
            if (!hiloAbiertoId) return

            const contenido = inputRespuesta.value.trim()
            if (!contenido) return
            // Fijamos el hilo al enviar: el reintento de 15 s no debe usar el hilo abierto en ese momento
            // (si el usuario cambió de hilo, la respuesta se publicaba en el equivocado).
            const hiloIdEnviado = String(hiloAbiertoId)
            const parentId = respuestaObjetivoActual
            const operacionId = (crypto && crypto.randomUUID) ? crypto.randomUUID() : ("op-" + Date.now() + "-" + Math.random().toString(36).slice(2))
            const tempId = "tmp-resp-" + Date.now() + "-" + Math.random().toString(36).slice(2)
            const optimistic = {
                id: tempId,
                autor: inputPseudonimo.value || "Vos",
                autorFoto: fotoActual,
                parentId: parentId,
                esPropio: true,
                contenido: contenido,
                fecha: new Date().toISOString(),
                _optimista: true,
                _operacionId: operacionId,
                _pendienteConfirmacion: false
            }

            respuestasUI.push(optimistic)
            renderizarRespuestas(respuestasUI)
            inputRespuesta.value = ""
            inputRespuesta.style.height = ""
            msgRespuesta.innerText = ""

            const r = await llamarMutacionResiliente("crearRespuesta", {
                hiloId: hiloIdEnviado,
                parentId: parentId,
                contenido: contenido,
                operacionId: operacionId
            }, 3)

            // Si mientras tanto se abrió otro hilo, no tocamos la pantalla actual (son otras respuestas).
            if (String(hiloAbiertoId) !== hiloIdEnviado && !esErrorAmbiguo("crearRespuesta", r)) {
                hiloCacheCliente.delete(hiloIdEnviado)
                invalidarCacheForo()
                if (!r.ok && r.error !== "sesion_invalida") alert("No se pudo publicar tu respuesta en el hilo anterior. " + mensajeError(r.error))
                return
            }

            if (r.ok) {
                const indice = respuestasUI.findIndex(function (x) { return x.id === tempId })
                const respuestaFinal = r.respuesta || {
                    id: r.id,
                    parentId: parentId,
                    autor: optimistic.autor,
                    autorFoto: optimistic.autorFoto,
                    esPropio: true,
                    contenido: contenido,
                    fecha: optimistic.fecha,
                    likes: 0,
                    meGusta: false
                }
                if (indice !== -1) respuestasUI[indice] = respuestaFinal
                const tempEl = listaRespuestas.querySelector("[data-respuesta-id='" + CSS.escape(tempId) + "']")
                if (tempEl) tempEl.replaceWith(crearElementoRespuesta(respuestaFinal))
                msgRespuesta.innerText = ""
                if (respuestaObjetivoActual === parentId) limpiarRespuestaObjetivo()
                if (hiloActualUI) hiloActualUI.respuestas = Number(hiloActualUI.respuestas || 0) + 1
                const cacheHiloRespuesta = hiloCacheCliente.get(String(hiloAbiertoId))
                if (cacheHiloRespuesta && cacheHiloRespuesta.data) {
                    cacheHiloRespuesta.data.hilo = Object.assign({}, cacheHiloRespuesta.data.hilo, { respuestas: hiloActualUI ? hiloActualUI.respuestas : cacheHiloRespuesta.data.hilo.respuestas })
                    cacheHiloRespuesta.data.respuestas = respuestasUI.filter(function(x) { return !x._optimista })
                    cacheHiloRespuesta.actualizadoEn = Date.now()
                }
                invalidarCacheForo(function (hilos) {
                    return hilos.map(function (h) {
                        return String(h.id) === hiloIdEnviado ? Object.assign({}, h, { respuestas: Number(h.respuestas || 0) + 1 }) : h
                    })
                })
                return
            }

            if (esErrorAmbiguo("crearRespuesta", r)) {
                const indicePendiente = respuestasUI.findIndex(function(x) { return x.id === tempId })
                if (indicePendiente !== -1) respuestasUI[indicePendiente]._pendienteConfirmacion = true
                renderizarRespuestas(respuestasUI)
                msgRespuesta.innerText = mensajeError("mensaje_en_verificacion")
                // No restauramos el texto: el servidor puede haberlo guardado.
                // El próximo verHilo reconciliará la respuesta gracias al contenido.
                setTimeout(async function() {
                    const rr = await llamarMutacionResiliente("crearRespuesta", {
                        hiloId: hiloIdEnviado,
                        parentId: parentId,
                        contenido: contenido,
                        operacionId: operacionId
                    }, 2)
                    hiloCacheCliente.delete(hiloIdEnviado)
                    if (String(hiloAbiertoId) !== hiloIdEnviado) return
                    if (rr.ok) {
                        const indice = respuestasUI.findIndex(function(x) { return x.id === tempId })
                        const final = rr.respuesta || { id: rr.id, parentId: parentId, autor: optimistic.autor, autorFoto: optimistic.autorFoto, esPropio: true, contenido: contenido, fecha: optimistic.fecha, likes: 0, meGusta: false }
                        if (indice !== -1) respuestasUI[indice] = final
                        const el = listaRespuestas.querySelector("[data-respuesta-id='" + CSS.escape(tempId) + "']")
                        if (el) el.replaceWith(crearElementoRespuesta(final))
                        msgRespuesta.innerText = ""
                        if (respuestaObjetivoActual === parentId) limpiarRespuestaObjetivo()
                    } else {
                        abrirHilo(hiloIdEnviado, false)
                    }
                }, 15000)
                return
            }

            respuestasUI = respuestasUI.filter(function (x) { return x.id !== tempId })
            renderizarRespuestas(respuestasUI)
            inputRespuesta.value = contenido
            if (r.error === "sesion_invalida") {
                sesion = null
                borrarSesionLocal()
                mostrarLogin()
            } else if (r.error === "no_encontrado") {
                alert("Ese hilo ya no existe.")
                mostrarListaHilos()
                cargarHilos(true)
            } else {
                alert(mensajeError(r.error) + (r.detalle ? "\n\nDetalle técnico: " + r.detalle : ""))
            }

        })

        // ==================== MODERACIÓN ====================

        async function cargarRolModerador() {

            const r = await llamar("soyModerador", {})

            if (!r.ok) return

            esModeradorActual = r.esModerador
            esAdminActual = r.esAdmin

            btnIrModeracion.style.display = esModeradorActual ? "inline-block" : "none"; actualizarAccesosModeracion()

        }

        menuInicio.addEventListener("click", function (e) {

            const btn = e.target.closest(".tarjetaInicio")
            if (!btn) return

            mostrarSeccion(btn.dataset.vista, "down")

        })

        btnIrInicio.addEventListener("click", function () {
            mostrarSeccion("inicio", "up")
        })

        // Navegación fija (barra inferior / riel lateral / barra superior): todos los [data-nav].
        const botonesNav = document.querySelectorAll("[data-nav]")

        botonesNav.forEach(function (btn) {
            btn.addEventListener("click", function () {
                const destino = btn.dataset.nav
                // Tocar «Foro» estando dentro de un hilo vuelve a la lista.
                if (destino === "foro" && seccionActual === "foro" && foroDetalle.style.display !== "none") {
                    mostrarListaHilos(true)
                    return
                }
                mostrarSeccion(destino, "up")
            })
        })

        function marcarNavActiva(nombre) {
            // Consulta directa (no botonesNav) por si se llama antes de que se declare la constante.
            document.querySelectorAll("[data-nav]").forEach(function (btn) {
                if (btn.classList.contains("navMarca") || btn.classList.contains("barraMarca")) return
                if (btn.dataset.nav === nombre) btn.setAttribute("aria-current", "page")
                else btn.removeAttribute("aria-current")
            })
        }

        btnIrModeracion.addEventListener("click", function () {
            mostrarSeccion("moderacion", "down")
        })

        btnVolverForoDesdeModeracion.addEventListener("click", function () {
            mostrarSeccion("foro", "up")
        })

        function mostrarSeccion(nombre, modoNavegacion, actualizarHistorial) {

            if (actualizarHistorial !== false && historialMedmarInicializado && !aplicandoEstadoHistorial) {
                const actual = estadoActualSeguro()
                if (!actual || actual.vista !== nombre || actual.overlay) {
                    navegarHistorial(crearEstadoNavegacion(nombre, null), false)
                }
            }

            const anterior = seccionActual
            seccionActual = nombre

            vistaInicio.style.display = nombre === "inicio" ? "block" : "none"
            vistaIntercambios.style.display = nombre === "intercambios" ? "block" : "none"
            vistaForo.style.display = nombre === "foro" ? "block" : "none"
            vistaJuegos.style.display = nombre === "juegos" ? "block" : "none"
            vistaMaterial.style.display = nombre === "material" ? "block" : "none"
            vistaConfiguracion.style.display = nombre === "configuracion" ? "block" : "none"
            vistaReportes.style.display = nombre === "reportes" ? "block" : "none"
            vistaModeracion.style.display = nombre === "moderacion" ? "block" : "none"

            btnIrInicio.style.display = nombre === "inicio" ? "none" : "flex"
            // En Inicio la barra superior quedaba vacía y se veía como una cápsula de color.
            userBar.style.display = nombre === "inicio" ? "none" : "flex"
            marcarNavActiva(nombre)
            if (pieInicio) pieInicio.classList.toggle("oculto", nombre !== "inicio")

            if (nombre !== 'intercambios' && chatAbiertoId) cerrarChat()

            if (nombre === "foro") {
                cargarForoBootstrap()
            }

            if (nombre === "juegos") cargarRankingJuego(false)
            if (nombre === "material") entrarAMaterial()

            if (nombre === "moderacion") entrarAModeracion()

            requestAnimationFrame(function () {
                if (modoNavegacion === "up" || nombre === "inicio") {
                    window.scrollTo({ top: 0, behavior: "smooth" })
                    return
                }

                const destino = nombre === "foro" ? vistaForo :
                    nombre === "intercambios" ? vistaIntercambios :
                    nombre === "juegos" ? vistaJuegos :
                    nombre === "material" ? vistaMaterial :
                    nombre === "configuracion" ? vistaConfiguracion :
                    nombre === "reportes" ? vistaReportes :
                    vistaModeracion

                if (destino) destino.scrollIntoView({ behavior: "smooth", block: "start" })
            })

        }

        async function cargarDenuncias() {

            const r = await llamarModeracion("listarDenuncias", {})

            if (!r.ok) {
                listaDenuncias.innerHTML = "<p class='vacio'>" + mensajeError(r.error) + "</p>"
                return
            }

            renderizarDenuncias(r.denuncias)

        }

        function renderizarDenuncias(denuncias) {

            listaDenuncias.innerHTML = ""

            if (denuncias.length === 0) {
                listaDenuncias.innerHTML = "<p class='vacio'>No hay denuncias pendientes.</p>"
                return
            }

            denuncias.forEach(function (d) {

                const div = document.createElement("div")
                div.className = "denunciaItem"
                d.publicacion = d.publicacion || { existe: false }

                const contenidoTexto = d.publicacion.existe
                    ? (d.publicacion.titulo ? "<b>" + escapeHtml(d.publicacion.titulo) + "</b> — " : "") + escapeHtml(d.publicacion.contenido)
                    : "(la publicación ya no existe)"

                const autorHtml = d.publicacion.existe
                    ? "<div class='autorReal'>Autor real: " + escapeHtml(d.publicacion.autorReal) + "</div>"
                    : ""

                div.innerHTML =
                    "<div class='hiloMeta'>Denuncia sobre un " + escapeHtml(d.tipo) + " · " + formatearFecha(d.fecha) + "</div>" +
                    (d.motivo ? "<div class='hiloMeta'>Motivo: " + escapeHtml(d.motivo) + "</div>" : "") +
                    "<div class='contenidoDenunciado'>" + contenidoTexto + "</div>" +
                    autorHtml +
                    "<div class='denunciaAcciones'>" +
                    "<button type='button' class='btnDescartar'>Descartar</button>" +
                    (d.publicacion.existe ? "<button type='button' class='btnEliminarPublicacion'>Eliminar publicación</button>" : "") +
                    "</div>"

                div.querySelector(".btnDescartar").addEventListener("click", function () {
                    resolverDenunciaClick(d.id, "descartar")
                })

                const btnEliminar = div.querySelector(".btnEliminarPublicacion")

                if (btnEliminar) {
                    btnEliminar.addEventListener("click", function () {
                        resolverDenunciaClick(d.id, "eliminar")
                    })
                }

                listaDenuncias.appendChild(div)

            })

        }

        async function resolverDenunciaClick(id, accion) {

            if (accion === "eliminar" && !confirm("¿Seguro que querés eliminar esta publicación?")) return

            const r = await llamarModeracion("resolverDenuncia", { id, decision: accion })

            if (r.ok) {
                cargarDenuncias()
            } else {
                alert(mensajeError(r.error) + (r.detalle ? "\n\nDetalle técnico: " + r.detalle : "") )
            }

        }

        async function cargarModeradores() {

            const r = await llamarModeracion("listarModeradores", {})

            if (!r.ok) return

            renderizarModeradores(r.moderadores)

        }

        function renderizarModeradores(moderadores) {

            listaModeradores.innerHTML = ""

            if (moderadores.length === 0) {
                listaModeradores.innerHTML = "<p class='vacio'>Todavía no asignaste moderadores.</p>"
                return
            }

            moderadores.forEach(function (m) {

                const div = document.createElement("div")
                div.className = "moderadorItem"

                div.innerHTML =
                    "<span>" + escapeHtml(m.email) + "</span>" +
                    "<button type='button'>Quitar</button>"

                div.querySelector("button").addEventListener("click", async function () {

                    if (!confirm("¿Sacar a " + m.email + " como moderador?")) return

                    const r = await llamarModeracion("quitarModerador", { email: m.email })

                    if (r.ok) {
                        cargarModeradores()
                    } else {
                        alert(mensajeError(r.error) + (r.detalle ? "\n\nDetalle técnico: " + r.detalle : "") )
                    }

                })

                listaModeradores.appendChild(div)

            })

        }

        formModerador.addEventListener("submit", async function (e) {

            e.preventDefault()
            msgModerador.innerText = "Agregando..."

            const r = await llamarModeracion("asignarModerador", { email: inputNuevoModerador.value.trim() })

            if (r.ok) {
                msgModerador.innerText = "Moderador agregado."
                formModerador.reset()
                cargarModeradores()
            } else {
                msgModerador.innerText = ""
                alert(mensajeError(r.error) + (r.detalle ? "\n\nDetalle técnico: " + r.detalle : "") )
            }

        })

        // ==================== CERRAR SESIÓN ====================

        // Vacía todo lo que quedó del usuario anterior: cachés en memoria, listas y vistas. Con
        // borrarAlmacenamiento también borra la caché de perfil de localStorage (solicitudes e
        // intercambios), para no dejarla en una compu compartida. El tema se conserva.
        function limpiarDatosDeSesion(borrarAlmacenamiento) {
            foroCacheCliente.clear()
            rankingCache.clear()
            hiloCacheCliente.clear()
            chatCacheCliente.clear()
            imagenesResueltasCliente.clear()
            hilosPendientesConfirmacion.clear()
            llamadasEnCurso.clear()

            if (chatAbiertoId) cerrarChat(false)
            if (idEditando) salirModoEdicion()
            solicitudesUI = []
            intercambiosUI = []
            respuestasUI = []
            hiloActualUI = null
            hiloAbiertoId = null
            ultimaActualizacionUsuario = 0
            foroCargado = false
            esModeradorActual = false
            esAdminActual = false
            fotoActual = ""
            etiquetaFiltroActual = ""
            busquedaForoActual = ""
            paginaHilosActual = 0

            ;[listaHilos, listaRespuestas, detalleHiloContenido, listaSolicitudes, listaIntercambios,
                listaDenuncias, listaModeradores, avatarUserBar, avatarBarraApp, avatarConfigPreview,
                document.getElementById("novedadesInicio"), document.getElementById("contextoForo")].forEach(function (el) {
                if (el) el.innerHTML = ""
            })
            ;[userEmail, emailConfig, msg, msgPerfil, msgFoto, msgPasswordPerfil, msgRespuesta, msgHilo].forEach(function (el) {
                if (el) el.innerText = ""
            })
            inputPseudonimo.value = ""
            inputFiltroEtiqueta.value = ""
            btnQuitarFiltro.style.display = "none"
            btnCargarMas.style.display = "none"
            btnIrModeracion.style.display = "none"
            seccionModeradores.style.display = "none"
            foroLista.style.display = "block"
            foroDetalle.style.display = "none"
            limpiarRespuestaObjetivo()

            if (borrarAlmacenamiento) {
                try {
                    const claves = []
                    for (let i = 0; i < localStorage.length; i++) {
                        const clave = localStorage.key(i)
                        if (clave && clave.indexOf("medmar:perfil:") === 0) claves.push(clave)
                    }
                    claves.forEach(function (clave) { localStorage.removeItem(clave) })
                } catch (_) {}
            }
        }

        logoutBtn.addEventListener("click", async function () {
            await supabaseClient.auth.signOut()
            limpiarDatosDeSesion(true)
            ocultarSetupPerfil()
            resetearHistorialPorLogout()
            mostrarLogin()
        })

        // ==================== MOSTRAR / OCULTAR PANTALLAS ====================

        async function mostrarApp() {
            loginScreen.style.display = "none"
            app.style.display = "block"
            document.body.classList.add("enApp")
            userEmail.innerText = sesion.email
            inicializarHistorialMedmar()

            const estado = esEstadoMedmar(history.state) && !history.state.guard
                ? history.state
                : crearEstadoNavegacion("inicio", null)

            if (vistaInicialPedida) {
                // Llegada desde un juego (/?vista=juegos): directo al ranking.
                mostrarSeccion(vistaInicialPedida, null, false)
                vistaInicialPedida = null
            } else if (esEstadoMedmar(history.state) && !history.state.guard) {
                await aplicarEstadoHistorial(estado)
            } else {
                mostrarSeccion("inicio", null, false)
            }

            await cargarBootstrap()
            iniciarRealtimeUsuario()
            cargarNotificaciones(true)
            iniciarActualizacionPeriodica()
        }

        function actualizarVisibilidadPie() {
            if (!pieInicio) return
            const visible = seccionActual === "inicio" || loginScreen.style.display !== "none"
            pieInicio.classList.toggle("oculto", !visible)
        }

        function mostrarLogin() {
            if (modalSetupPerfil) ocultarSetupPerfil()
            detenerRealtimeUsuario()
            // Sesión vencida o cierre: nada del usuario anterior queda en memoria ni en pantalla.
            limpiarDatosDeSesion(false)
            app.style.display = "none"
            loginScreen.style.display = "block"
            document.body.classList.remove("enApp")
            try { detenerNotificaciones() } catch (_) {}
            try { cerrarSesionModeracion(true); actualizarAccesosModeracion() } catch (_) {}
            seccionActual = "inicio"
            resetearHistorialPorLogout()
            actualizarVisibilidadPie()
            detenerActualizacionPeriodica()
        }

        // Refresco silencioso en segundo plano: así, si otra persona completa
        // un intercambio con vos, tu lista se actualiza sola sin recargar la página.
        let intervaloActualizacion = null

        function iniciarActualizacionPeriodica() {
            detenerActualizacionPeriodica()
            intervaloActualizacion = setInterval(function () {
                if (!sesion || document.visibilityState !== "visible") return
                // Con Realtime suscripto los matches llegan solos: el refresco periódico es solo respaldo.
                if (usuarioRealtimeEstado === "SUBSCRIBED") return
                if (seccionActual === "intercambios") {
                    refrescarDatosUsuario(false)
                }
            }, 60000)
        }

        async function refrescarDatosUsuario(forzar) {
            if (!sesion) return
            if (!forzar && Date.now() - ultimaActualizacionUsuario < FRESCURA_USUARIO_CLIENTE_MS) return
            if (datosUsuarioRefreshEnCurso) return datosUsuarioRefreshEnCurso

            datosUsuarioRefreshEnCurso = Promise.all([
                cargarMisSolicitudes(),
                cargarMisIntercambios()
            ]).then(function() {
                ultimaActualizacionUsuario = Date.now()
            }).finally(function() {
                datosUsuarioRefreshEnCurso = null
            })

            return datosUsuarioRefreshEnCurso
        }

        function iniciarRealtimeUsuario() {
            detenerRealtimeUsuario()
            if (!sesion || !sesion.userId) return

            const userId = String(sesion.userId)
            usuarioRealtimeChannel = supabaseClient
                .channel('usuario-' + userId)
                .on('postgres_changes', {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'solicitudes',
                    filter: 'user_id=eq.' + userId
                }, function(payload) {
                    const nuevo = payload.new || {}
                    console.debug('[MedMarUNMDP] Realtime solicitud', nuevo.id || '', nuevo.status || '')

                    // Un match cambia la solicitud propia de activa -> completada
                    // y agrega exchange_id. Reconciliamos inmediatamente ambas listas.
                    if (seccionActual === 'intercambios' || String(nuevo.status || '') === 'completada') {
                        ultimaActualizacionUsuario = 0
                        refrescarDatosUsuario(true)
                    }
                })
                .subscribe(function(status) {
                    usuarioRealtimeEstado = status
                    console.debug('[MedMarUNMDP] Realtime usuario', status)
                })
        }

        function detenerRealtimeUsuario() {
            usuarioRealtimeEstado = ''
            if (usuarioRealtimeChannel) {
                supabaseClient.removeChannel(usuarioRealtimeChannel)
                usuarioRealtimeChannel = null
            }
        }

        function detenerActualizacionPeriodica() {

            if (intervaloActualizacion) {
                clearInterval(intervaloActualizacion)
                intervaloActualizacion = null
            }

        }

        document.addEventListener("visibilitychange", function () {

            if (document.visibilityState === "visible" && sesion && seccionActual === "intercambios") {
                refrescarDatosUsuario(false)
            }

        })

        // ==================== PERFIL / PSEUDÓNIMO / FOTO ====================

        function actualizarAvataresEnPantalla(nombre) {

            avatarUserBar.innerHTML = avatarHtml(nombre, fotoActual, "avatarMediano")
            if (tituloSaludo) tituloSaludo.textContent = nombre && nombre !== "Vos" ? "Hola, " + nombre : "Hola"
            if (avatarBarraApp) avatarBarraApp.innerHTML = avatarHtml(nombre, fotoActual, "")
            avatarConfigPreview.innerHTML = avatarHtml(nombre, fotoActual, "avatarGrande")

            if (typeof actualizarComposeCabecera === "function") actualizarComposeCabecera()

        }

        async function cargarPerfil() {

            const r = await llamar("miPerfil", {})

            if (r.ok) {
                inputPseudonimo.value = r.pseudonimo || ""
                fotoActual = r.foto || ""
                emailConfig.innerText = sesion.email
                actualizarAvataresEnPantalla(r.pseudonimo || "Vos")
                msgPerfil.innerText = ""
            } else {
                msgPerfil.innerText = mensajeError(r.error) + (r.detalle ? " — " + r.detalle : "")
            }

        }

        formPerfil.addEventListener("submit", async function (e) {
            e.preventDefault()
            const anterior = inputPseudonimo.value
            const nuevo = inputPseudonimo.value.trim()
            if (!nuevo) return
            msgPerfil.innerText = "Guardando…"
            actualizarAvataresEnPantalla(nuevo)
            try { localStorage.setItem("medmar:perfil:optimista:" + sesion.email.toLowerCase(), JSON.stringify({ pseudonimo: nuevo, foto: fotoActual })) } catch (_) {}

            const r = await llamar("actualizarPseudonimo", { pseudonimo: nuevo })
            if (r.ok) {
                inputPseudonimo.value = r.pseudonimo
                msgPerfil.innerText = ""
                mostrarAviso("Pseudónimo actualizado.")
                try {
                    const key = 'medmar:perfil:' + sesion.email.toLowerCase()
                    const cached = JSON.parse(localStorage.getItem(key) || 'null') || { data: {} }
                    cached.data.perfil = cached.data.perfil || {}
                    cached.data.perfil.pseudonimo = r.pseudonimo
                    cached.data.perfil.foto = fotoActual
                    localStorage.setItem(key, JSON.stringify(cached))
                    localStorage.removeItem("medmar:perfil:optimista:" + sesion.email.toLowerCase())
                } catch (_) {}
            } else {
                inputPseudonimo.value = anterior
                actualizarAvataresEnPantalla(anterior)
                msgPerfil.innerText = ""
                alert(mensajeError(r.error))
            }
        })

        // --- foto de perfil: se recorta a cuadrado y se comprime en el navegador
        // antes de mandarla, así el archivo que viaja siempre es chico ---

        btnCambiarFoto.addEventListener("click", function () {
            inputArchivoFoto.click()
        })

        inputArchivoFoto.addEventListener("change", async function () {

            const archivo = inputArchivoFoto.files[0]
            if (!archivo) return

            if (!archivo.type.startsWith("image/")) {
                alert("Elegí un archivo de imagen.")
                return
            }

            msgFoto.innerText = "Preparando imagen..."

            try {

                const base64 = await recortarYComprimirImagen(archivo, 256)

                msgFoto.innerText = "Subiendo..."

                const r = await llamar("actualizarFoto", { imagen: base64, mimeType: "image/jpeg" })

                if (r.ok) {
                    fotoActual = r.foto
                    actualizarAvataresEnPantalla(inputPseudonimo.value)
                    msgFoto.innerText = ""
                    mostrarAviso("Foto actualizada.")
                } else {
                    msgFoto.innerText = ""
                    alert(mensajeError(r.error) + (r.detalle ? "\n\nDetalle técnico: " + r.detalle : "") )
                }

            } catch (err) {

                msgFoto.innerText = ""
                alert("No se pudo procesar la imagen. Probá con otra.")

            }

            inputArchivoFoto.value = ""

        })

        // Dibuja la imagen recortada al centro en un cuadrado y la devuelve
        // comprimida como JPEG en base64 (sin el prefijo data:...)
        function recortarYComprimirImagen(archivo, tamano) {

            return new Promise(function (resolve, reject) {

                const lector = new FileReader()

                lector.onerror = function () { reject(new Error("no se pudo leer el archivo")) }

                lector.onload = function () {

                    const img = new Image()

                    img.onerror = function () { reject(new Error("no se pudo cargar la imagen")) }

                    img.onload = function () {

                        const lado = Math.min(img.width, img.height)
                        const origenX = (img.width - lado) / 2
                        const origenY = (img.height - lado) / 2

                        const canvas = document.createElement("canvas")
                        canvas.width = tamano
                        canvas.height = tamano

                        const ctx = canvas.getContext("2d")
                        ctx.drawImage(img, origenX, origenY, lado, lado, 0, 0, tamano, tamano)

                        const dataUrl = canvas.toDataURL("image/jpeg", 0.82)
                        resolve(dataUrl.split(",")[1])

                    }

                    img.src = lector.result

                }

                lector.readAsDataURL(archivo)

            })

        }

        // ==================== MIS SOLICITUDES ====================

        async function cargarMisSolicitudes() {
            const r = await llamar("misSolicitudes", {})
            if (!r.ok) {
                if (r.error === "sesion_invalida") {
                    sesion = null
                    borrarSesionLocal()
                    mostrarLogin()
                }
                return
            }
            if (idEditando && !r.solicitudes.some(function (s) { return s.id === idEditando })) {
                salirModoEdicion()
                msg.innerText = "Esa solicitud ya no está disponible. Se canceló la edición."
            }
            solicitudesUI = r.solicitudes || []
            renderizarSolicitudes(solicitudesUI)
        }

        function renderizarSolicitudes(lista) {
            solicitudesUI = Array.isArray(lista) ? lista.slice() : []
            listaSolicitudes.innerHTML = ""
            if (solicitudesUI.length === 0) {
                listaSolicitudes.innerHTML = "<p class='vacio'>Todavía no publicaste ninguna solicitud.</p>"
                renderizarNovedades()
                return
            }
            solicitudesUI.forEach(function (s) {
                const div = document.createElement("div")
                div.className = "solicitudItem" + (s._optimista ? " solicitudOptimista" : "")
                div.innerHTML =
                    "<div class='info'>" +
                    "<b>" + escapeHtml(s.materia) + "</b>" +
                    "<span class='cambio'>Tenés comisión " + escapeHtml(String(s.tengo)) + " · buscás comisión " + escapeHtml(String(s.busco)) + "</span>" +
                    "</div>" +
                    (s._optimista ? "<div class='solicitudAcciones'><span class='estadoOptimista'>Guardando…</span></div>" :
                    "<div class='solicitudAcciones'><button type='button' class='editarBtn'>Editar</button><button type='button' class='borrarItemBtn'>Borrar</button></div>")
                if (!s._optimista) {
                    div.querySelector(".editarBtn").addEventListener("click", function () { iniciarEdicion(s) })
                    div.querySelector(".borrarItemBtn").addEventListener("click", function () { borrarSolicitudItem(s.id) })
                }
                listaSolicitudes.appendChild(div)
            })
            renderizarNovedades()
        }

        // ==================== INTERCAMBIOS COMPLETADOS ====================

        async function cargarMisIntercambios() {
            const r = await llamar("misIntercambios", {})
            if (!r.ok) return
            intercambiosUI = r.intercambios || []
            renderizarIntercambios(intercambiosUI)
        }

        function renderizarIntercambios(lista) {

            listaIntercambios.innerHTML = ""

            if (lista.length === 0) {
                listaIntercambios.innerHTML = "<p class='vacio'>Todavía no se completó ningún intercambio para tu cuenta.</p>"
                if (chatAbiertoId) cerrarChat()
                renderizarNovedades()
                return
            }

            lista.forEach(function (x) {

                const div = document.createElement("div")
                div.className = "intercambioItem"

                const fecha = x.fecha ? new Date(x.fecha).toLocaleDateString("es-AR") : ""

                const personas = (x.participantes || []).map(function (p) {
                    const nombre = p.esVos ? "Vos" : (p.pseudonimo || "Estudiante")
                    const clase = p.esVos ? " personaIntercambio esVos" : " personaIntercambio"
                    return "<div class='" + clase.trim() + "'>" +
                        "<b>" + escapeHtml(nombre) + "</b> — tenía comisión " + escapeHtml(String(p.tengo || "")) +
                        ", buscaba comisión " + escapeHtml(String(p.busco || "")) +
                        "</div>"
                }).join("")

                const tieneChat = !!x.conversacionId
                const accionChat = tieneChat
                    ? "<button type='button' class='btnChatIntercambio' data-chat-id='" + escapeAttr(x.conversacionId) + "'>Abrir chat privado</button>"
                    : "<div class='ayudaPerfil'>Este intercambio es anterior al sistema de chat.</div>"

                div.innerHTML =
                    "<div class='intercambioHeader'><b>" + escapeHtml(x.materia) + "</b><span class='fechaIntercambio'>" + fecha + "</span></div>" +
                    personas +
                    "<div class='notaPrivacidadIntercambio'>Los correos de los demás participantes se mantienen privados.</div>" +
                    "<div class='intercambioAcciones'>" + accionChat + "</div>"

                const btnChat = div.querySelector('.btnChatIntercambio')
                if (btnChat) btnChat.addEventListener('click', function() { abrirChat(x.conversacionId) })

                listaIntercambios.appendChild(div)

            })

            renderizarNovedades()

        }

        function renderizarMensajesChat(mensajes) {
            listaMensajesChat.innerHTML = ''
            if (!mensajes || !mensajes.length) {
                listaMensajesChat.innerHTML = "<p class='vacio'>Todavía no hay mensajes. Podés iniciar la conversación.</p>"
                return
            }

            mensajes.forEach(function(mensaje) {
                const fila = document.createElement('div')
                fila.className = 'mensajeChat' + (mensaje.esVos ? ' mio' : '')
                const burbuja = document.createElement('div')
                burbuja.className = 'burbujaChat'

                const autor = document.createElement('div')
                autor.className = 'autorMensajeChat'
                autor.textContent = mensaje.esVos ? 'Vos' : (mensaje.pseudonimo || 'Estudiante')

                const texto = document.createElement('div')
                texto.className = 'textoMensajeChat'
                texto.textContent = String(mensaje.texto || '')

                const fecha = document.createElement('div')
                fecha.className = 'fechaMensajeChat'
                fecha.textContent = mensaje.fecha ? new Date(mensaje.fecha).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : ''

                burbuja.appendChild(autor)
                burbuja.appendChild(texto)
                burbuja.appendChild(fecha)
                if (mensaje._pendiente) {
                    const estado = document.createElement('div')
                    estado.className = 'fechaMensajeChat'
                    estado.textContent = mensaje._pendienteConfirmacion ? 'Confirmando envío… No lo reenvíes.' : 'Enviando…'
                    burbuja.appendChild(estado)
                }
                fila.appendChild(burbuja)
                listaMensajesChat.appendChild(fila)
            })
            listaMensajesChat.scrollTop = listaMensajesChat.scrollHeight
        }

        async function cargarChatActual(silencioso) {
            if (!chatAbiertoId || chatEnvioEnCurso) return
            const r = await llamar('obtenerChat', {
                conversacionId: chatAbiertoId,
                cantidadMensajes: chatDatosServidorCargados ? Math.max(0, chatCantidadServidor) : -1
            })
            if (!r.ok) {
                if (!silencioso) msgChat.innerText = mensajeError(r.error)
                if (r.error === 'chat_expirado' || r.error === 'chat_no_encontrado') {
                    cerrarChat(false)
                    refrescarDatosUsuario(true)
                }
                return
            }

            if (r.sinCambios) {
                if (r.chat && r.chat.ultimaActividad) {
                    chatEstado.textContent = 'Última actividad: ' + new Date(r.chat.ultimaActividad).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
                }
                return
            }

            const chat = r.chat
            chatCantidadServidor = Number(chat.cantidadMensajes || 0)
            chatDatosServidorCargados = true
            chatTitulo.textContent = chat.materia || 'Chat de intercambio'
            chatParticipantes.textContent = (chat.participantes || []).map(function(p) { return p.esVos ? 'Vos' : (p.pseudonimo || 'Estudiante') }).join(' · ')
            chatEstado.textContent = chat.ultimaActividad ? 'Última actividad: ' + new Date(chat.ultimaActividad).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : ''
            const mensajesServidor = Array.isArray(chat.mensajes) ? chat.mensajes.slice() : []
            const pendientes = mensajesChatUI.filter(function(m) { return m && m._pendiente })
            const reconciliados = mensajesServidor.slice()
            pendientes.forEach(function(pendiente) {
                const encontrado = reconciliados.some(function(m) {
                    if (!m || !m.esVos) return false
                    if (pendiente._operacionId && m.operacionId) return String(m.operacionId) === String(pendiente._operacionId)
                    if (String(m.texto || '') !== String(pendiente.texto || '')) return false
                    const a = new Date(m.fecha || 0).getTime()
                    const b = new Date(pendiente.fecha || 0).getTime()
                    return a && b && Math.abs(a - b) < 10 * 60 * 1000
                })
                if (!encontrado) reconciliados.push(pendiente)
            })
            reconciliados.sort(function(a, b) { return new Date(a.fecha || 0) - new Date(b.fecha || 0) })
            mensajesChatUI = reconciliados
            if (pendientes.length && pendientes.every(function(p) {
                return reconciliados.some(function(m) {
                    if (m._pendiente || !m.esVos) return false
                    if (p._operacionId && m.operacionId) return String(m.operacionId) === String(p._operacionId)
                    return String(m.texto || '') === String(p.texto || '')
                })
            })) {
                chatEnvioEnCurso = false
                if (btnEnviarChat) btnEnviarChat.disabled = false
                msgChat.innerText = ''
            }
            renderizarMensajesChat(mensajesChatUI)
            chatCacheCliente.set(String(chatAbiertoId), { chat: Object.assign({}, chat, { mensajes: mensajesChatUI.slice() }), actualizadoEn: Date.now() })
            msgChat.innerText = ''
        }

        async function abrirChat(conversacionId, actualizarHistorial) {
            if (!conversacionId) return
            if (actualizarHistorial !== false) {
                navegarHistorial(crearEstadoNavegacion("intercambios", "chat", conversacionId), false)
            }
            chatAbiertoId = conversacionId
            mensajesChatUI = []
            chatCantidadServidor = 0
            chatDatosServidorCargados = false
            listaIntercambios.style.display = 'none'
            panelChat.style.display = 'block'

            const cache = chatCacheCliente.get(String(conversacionId))
            if (cache && cache.chat) {
                chatCantidadServidor = Number(cache.chat.cantidadMensajes || 0)
                chatDatosServidorCargados = true
                const chat = cache.chat
                chatTitulo.textContent = chat.materia || 'Chat de intercambio'
                chatParticipantes.textContent = (chat.participantes || []).map(function(p) { return p.esVos ? 'Vos' : (p.pseudonimo || 'Estudiante') }).join(' · ')
                chatEstado.textContent = chat.ultimaActividad ? 'Última actividad: ' + new Date(chat.ultimaActividad).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : ''
                mensajesChatUI = Array.isArray(chat.mensajes) ? chat.mensajes.slice() : []
                renderizarMensajesChat(mensajesChatUI)
                msgChat.innerText = ''
            } else {
                msgChat.innerText = 'Cargando chat…'
            }

            await cargarChatActual(false)
            iniciarChatPolling()
            panelChat.scrollIntoView({ behavior: 'smooth', block: 'start' })
            inputMensajeChat.focus()
        }

        function iniciarChatPolling() {
            detenerChatPolling()
            if (!chatAbiertoId) return

            const idChat = chatAbiertoId
            chatRealtimeChannel = supabaseClient
                .channel('chat-' + idChat)
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'mensajes',
                    filter: 'conversacion_id=eq.' + idChat
                }, function(payload) {
                    // El propio remitente ya ve su mensaje mediante optimistic UI.
                    // Solo pedimos datos nuevos cuando llega un mensaje de otro usuario.
                    if (!sesion || String(payload.new?.remitente_id || '') === String(sesion.userId || '')) return
                    if (chatAbiertoId !== idChat) return
                    if (chatPollingEnCurso || chatEnvioEnCurso) return
                    chatPollingEnCurso = true
                    cargarChatActual(true).finally(function() { chatPollingEnCurso = false })
                })
                .subscribe(function(status) {
                    chatRealtimeEstado = status
                    console.debug('[MedMarUNMDP] Realtime chat', idChat, status)
                })

            // Fallback muy lento: solo si Realtime NO está suscripto se reconcilia cada 30 s
            // (con Realtime activo, el polling solo gastaba invocaciones del plan Free).
            const programar = function() {
                if (!chatAbiertoId || chatAbiertoId !== idChat || seccionActual !== 'intercambios') return
                chatPollingTimer = setTimeout(async function() {
                    chatPollingTimer = null
                    if (!chatAbiertoId || chatAbiertoId !== idChat || document.visibilityState !== 'visible' || chatRealtimeEstado === 'SUBSCRIBED') {
                        programar()
                        return
                    }
                    if (!chatPollingEnCurso && !chatEnvioEnCurso) {
                        chatPollingEnCurso = true
                        try { await cargarChatActual(true) } finally { chatPollingEnCurso = false }
                    }
                    programar()
                }, 30000)
            }
            programar()
        }

        function detenerChatPolling() {
            if (chatPollingTimer) {
                clearTimeout(chatPollingTimer)
                chatPollingTimer = null
            }
            chatPollingEnCurso = false
            chatRealtimeEstado = ''
            if (chatRealtimeChannel) {
                supabaseClient.removeChannel(chatRealtimeChannel)
                chatRealtimeChannel = null
            }
        }

        function cerrarChat(actualizarHistorial) {
            if (actualizarHistorial !== false && estadoActualSeguro() && estadoActualSeguro().overlay === "chat") {
                history.back()
                return
            }
            detenerChatPolling()
            chatAbiertoId = null
            mensajesChatUI = []
            chatEnvioEnCurso = false
            panelChat.style.display = 'none'
            listaIntercambios.style.display = 'block'
            inputMensajeChat.value = ''
            msgChat.innerText = ''
        }

        btnCerrarChat.addEventListener('click', function () {
            cerrarChat(true)
        })

        const btnEnviarChat = formChat.querySelector('button[type="submit"]')

        formChat.addEventListener('submit', async function(e) {
            e.preventDefault()
            if (!chatAbiertoId || chatEnvioEnCurso) return
            const texto = inputMensajeChat.value.trim()
            if (!texto) return

            const chatIdEnviado = chatAbiertoId
            const anterior = inputMensajeChat.value
            const temporal = {
                id: 'temp-' + Date.now(),
                pseudonimo: 'Vos',
                esVos: true,
                texto: texto,
                fecha: new Date(),
                _pendiente: true
            }

            chatEnvioEnCurso = true
            if (btnEnviarChat) btnEnviarChat.disabled = true
            msgChat.innerText = ''
            inputMensajeChat.value = ''
            mensajesChatUI.push(temporal)
            renderizarMensajesChat(mensajesChatUI)

            const operacionId = (crypto && crypto.randomUUID) ? crypto.randomUUID() : ('op-' + Date.now() + '-' + Math.random().toString(36).slice(2))
            temporal._operacionId = operacionId
            const r = await llamarMutacionResiliente('enviarMensaje', { conversacionId: chatIdEnviado, texto: texto, operacionId: operacionId }, 3)

            if (!r.ok) {
                if (esErrorAmbiguo('enviarMensaje', r)) {
                    temporal._pendiente = true
                    renderizarMensajesChat(mensajesChatUI)
                    msgChat.innerText = mensajeError('mensaje_en_verificacion')
                    // Dejamos el mensaje en pantalla y NO restauramos el campo: el servidor
                    // puede haberlo guardado. El polling lo reconciliará.
                    chatEnvioEnCurso = false
                    if (btnEnviarChat) btnEnviarChat.disabled = true
                    setTimeout(async function() {
                        if (chatAbiertoId !== chatIdEnviado) return
                        const rr = await llamarMutacionResiliente('enviarMensaje', { conversacionId: chatIdEnviado, texto: texto, operacionId: operacionId }, 2)
                        if (rr.ok) {
                            const idx = mensajesChatUI.findIndex(function(m) { return m.id === temporal.id })
                            if (idx !== -1) {
                                mensajesChatUI[idx] = rr.mensaje
                                chatCantidadServidor = Number(rr.cantidadMensajes || (chatCantidadServidor + 1))
                                chatDatosServidorCargados = true
                                if (btnEnviarChat) btnEnviarChat.disabled = false
                                msgChat.innerText = ''
                                renderizarMensajesChat(mensajesChatUI)
                            }
                        } else if (rr.error && !esErrorAmbiguo('enviarMensaje', rr)) {
                            mensajesChatUI = mensajesChatUI.filter(function(m) { return m.id !== temporal.id })
                            renderizarMensajesChat(mensajesChatUI)
                            if (btnEnviarChat) btnEnviarChat.disabled = false
                            msgChat.innerText = mensajeError(rr.error)
                        }
                    }, 15000)
                    return
                }

                mensajesChatUI = mensajesChatUI.filter(function(m) { return m.id !== temporal.id })
                inputMensajeChat.value = anterior
                renderizarMensajesChat(mensajesChatUI)
                msgChat.innerText = mensajeError(r.error)
                chatEnvioEnCurso = false
                if (btnEnviarChat) btnEnviarChat.disabled = false
                if (r.error === 'sesion_invalida') {
                    sesion = null
                    borrarSesionLocal()
                    mostrarLogin()
                }
                if (r.error === 'chat_expirado' || r.error === 'chat_no_encontrado') cerrarChat(false)
                return
            }

            chatEnvioEnCurso = false
            if (btnEnviarChat) btnEnviarChat.disabled = false

            mensajesChatUI = mensajesChatUI.map(function(m) { return m.id === temporal.id ? r.mensaje : m })
            chatCantidadServidor = Number(r.cantidadMensajes || (chatCantidadServidor + 1))
            chatDatosServidorCargados = true
            renderizarMensajesChat(mensajesChatUI)
            chatEstado.textContent = 'Última actividad: ahora'
            const cacheChatActual = chatCacheCliente.get(String(chatIdEnviado))
            if (cacheChatActual && cacheChatActual.chat) {
                cacheChatActual.chat.mensajes = mensajesChatUI.slice()
                cacheChatActual.chat.cantidadMensajes = chatCantidadServidor
                cacheChatActual.chat.ultimaActividad = new Date()
                cacheChatActual.actualizadoEn = Date.now()
            }
            msgChat.innerText = ''
            inputMensajeChat.focus()
            // El remitente ya ve su mensaje al instante. Damos además una
            // oportunidad inmediata al otro lado de sincronizarse, sin crear
            // polling paralelo ni esperar hasta el próximo ciclo.
            if (chatAbiertoId === chatIdEnviado) {
                setTimeout(function() {
                    if (chatAbiertoId === chatIdEnviado && !chatEnvioEnCurso && !chatPollingEnCurso) {
                        cargarChatActual(true)
                    }
                }, 350)
            }
        })

        function iniciarEdicion(s) {

            idEditando = s.id

            form.materia.value = s.materia
            tengo.value = s.tengo
            busco.value = s.busco
            refrescarSelectoresFormulario()

            submitBtn.innerText = "Guardar cambios"
            cancelarEdicionBtn.style.display = "block"
            tituloFormulario.innerText = "Editar solicitud"
            seccionFormulario.classList.add("editando")

            seccionFormulario.scrollIntoView({ behavior: "smooth", block: "start" })

        }

        function salirModoEdicion() {
            idEditando = null
            form.reset()
            refrescarSelectoresFormulario()
            submitBtn.innerText = "Publicar solicitud"
            cancelarEdicionBtn.style.display = "none"
            tituloFormulario.innerText = "Publicar una solicitud"
            seccionFormulario.classList.remove("editando")
        }

        cancelarEdicionBtn.addEventListener("click", salirModoEdicion)

        async function cacheUserListsInvalidarCliente() {
            try { localStorage.removeItem("medmar:perfil:" + sesion.email.toLowerCase()) } catch (_) {}
        }

        async function borrarSolicitudItem(id) {
            if (!confirm("¿Seguro que querés borrar esta solicitud?")) return
            const anterior = solicitudesUI.slice()
            solicitudesUI = solicitudesUI.filter(function (s) { return s.id !== id })
            renderizarSolicitudes(solicitudesUI)

            const r = await llamar("borrar", { id })
            if (r.ok) {
                cacheUserListsInvalidarCliente()
                ultimaActualizacionUsuario = 0
                refrescarDatosUsuario(true)
                return
            }
            solicitudesUI = anterior
            renderizarSolicitudes(solicitudesUI)
            alert(mensajeError(r.error) + (r.detalle ? "\n\nDetalle técnico: " + r.detalle : ""))
            if (r.error === "no_encontrado") cargarMisSolicitudes()
        }

        // ==================== PUBLICAR / EDITAR SOLICITUD ====================

        let publicacionEnCurso = false

        function bloquearPublicacion(texto) {
            publicacionEnCurso = true
            submitBtn.disabled = true
            submitBtn.setAttribute("aria-busy", "true")
            submitBtn.innerText = texto || "Publicando…"
        }

        function desbloquearPublicacion() {
            publicacionEnCurso = false
            submitBtn.disabled = false
            submitBtn.removeAttribute("aria-busy")
            submitBtn.innerText = idEditando ? "Guardar cambios" : "Publicar solicitud"
        }

        form.addEventListener("submit", async function (e) {
            e.preventDefault()
            if (publicacionEnCurso) return

            msg.innerText = ""
            // El form es novalidate: el <select> de materia está oculto por el selector propio y el
            // navegador bloqueaba el envío sin poder mostrar el error (no pasaba nada al tocar Publicar).
            if (!form.materia.value) {
                msg.innerText = "Elegí la materia de la solicitud."
                const triggerMateria = form.materia.nextElementSibling && form.materia.nextElementSibling.querySelector(".selectorTrigger")
                if (triggerMateria) triggerMateria.focus()
                return
            }
            if (!tengo.value || !busco.value) {
                msg.innerText = "Elegí la comisión que tenés y la que buscás."
                return
            }
            if (tengo.value === busco.value) {
                msg.innerText = mensajeError("misma_comision")
                return
            }

            const datos = { materia: form.materia.value, tengo: tengo.value, busco: busco.value }
            if (!idEditando) datos.operacionId = (crypto && crypto.randomUUID) ? crypto.randomUUID() : ('op-' + Date.now() + '-' + Math.random().toString(36).slice(2))
            const accion = idEditando ? "editar" : "guardar"
            if (idEditando) datos.id = idEditando

            bloquearPublicacion(idEditando ? "Guardando…" : "Publicando…")

            try {
                if (idEditando) {
                    const anterior = solicitudesUI.slice()
                    const nuevo = { id: idEditando, materia: datos.materia, tengo: Number(datos.tengo), busco: Number(datos.busco), fecha: new Date().toISOString(), _optimista: true }
                    solicitudesUI = solicitudesUI.map(function (s) { return s.id === idEditando ? nuevo : s })
                    renderizarSolicitudes(solicitudesUI)

                    const r = await llamar(accion, datos)
                    if (r.ok) {
                        msg.innerText = r.emparejado ? "¡Encontramos un intercambio para vos! Revisá 'Intercambios completados' y abrí el chat privado." : ""
                        if (!r.emparejado) mostrarAviso("Solicitud actualizada. Te avisamos por mail si aparece un cruce.")
                        salirModoEdicion()
                        ultimaActualizacionUsuario = 0
                        refrescarDatosUsuario(true)
                    } else {
                        solicitudesUI = anterior
                        renderizarSolicitudes(solicitudesUI)
                        msg.innerText = ""
                        alert(mensajeError(r.error) + (r.detalle ? "\n\nDetalle técnico: " + r.detalle : ""))
                    }
                    return
                }

                const optimista = { id: "tmp-sol-" + Date.now(), materia: datos.materia, tengo: Number(datos.tengo), busco: Number(datos.busco), fecha: new Date().toISOString(), _optimista: true }
                solicitudesUI.push(optimista)
                renderizarSolicitudes(solicitudesUI)

                const r = await llamar("guardar", datos)
                if (r.ok) {
                    msg.innerText = r.emparejado ? "¡Encontramos un intercambio para vos! Revisá 'Intercambios completados' y abrí el chat privado." : ""
                    if (!r.emparejado) mostrarAviso("Solicitud publicada. Te avisamos por mail si aparece un cruce.")
                    salirModoEdicion()
                    ultimaActualizacionUsuario = 0
                    refrescarDatosUsuario(true)
                } else {
                    solicitudesUI = solicitudesUI.filter(function (s) { return s.id !== optimista.id })
                    renderizarSolicitudes(solicitudesUI)
                    if (r.error === "sesion_invalida") {
                        sesion = null
                        borrarSesionLocal()
                        mostrarLogin()
                    } else {
                        alert(mensajeError(r.error) + (r.detalle ? "\n\nDetalle técnico: " + r.detalle : ""))
                    }
                }
            } finally {
                desbloquearPublicacion()
            }
        })

        formCambiarPassword.addEventListener('submit', async function(e) {
            e.preventDefault()
            const nueva = nuevaPasswordPerfil.value
            const actual = passwordActualPerfil.value
            if (nueva.length < 8) {
                msgPasswordPerfil.innerText = mensajeError('password_corta')
                return
            }
            if (cuentaTienePassword() && !actual) {
                msgPasswordPerfil.innerText = 'Escribí tu contraseña actual.'
                return
            }
            // updateUser no pide la contraseña actual: la verificamos antes con un login, así una sesión
            // abierta en una compu ajena no alcanza para cambiarla. (Con "Secure password change" activo
            // en Supabase Auth, el servidor además exige reautenticación en sesiones viejas.)
            if (actual) {
                msgPasswordPerfil.innerText = 'Verificando tu contraseña actual…'
                const verificacion = await supabaseClient.auth.signInWithPassword({ email: sesion.email, password: actual })
                if (verificacion.error) {
                    msgPasswordPerfil.innerText = mensajeError('password_actual_incorrecta')
                    return
                }
            }
            msgPasswordPerfil.innerText = 'Cambiando contraseña…'
            const { error } = await supabaseClient.auth.updateUser({ password: nueva })
            if (error) {
                msgPasswordPerfil.innerText = 'No se pudo cambiar la contraseña.'
                console.error(error)
                return
            }
            formCambiarPassword.reset()
            msgPasswordPerfil.innerText = 'Contraseña cambiada correctamente.'
        })

        // ==================== SUGERENCIAS Y REPORTES ====================
        // Anónimos: no se manda email, usuario ni token, solo lo que escribe la persona y contexto técnico.
        // Apps Script no responde a preflight CORS: se manda como text/plain con mode "no-cors" (respuesta opaca).

        const formReporte = document.getElementById("formReporte")
        const msgReporte = document.getElementById("msgReporte")
        const LIMITE_REPORTES_DIA = 10
        const ESPERA_ENTRE_REPORTES_MS = 30000

        if (REPORTES_URL) document.getElementById("tarjetaReportes").hidden = false

        function registroReportes() {
            const hoy = new Date().toISOString().slice(0, 10)
            try {
                const r = JSON.parse(localStorage.getItem("medmar:reportes") || "null")
                if (r && r.dia === hoy) return r
            } catch (_) {}
            return { dia: hoy, cantidad: 0, ultimo: 0 }
        }

        formReporte.addEventListener("submit", async function (e) {
            e.preventDefault()
            const mensaje = document.getElementById("reporteMensaje").value.trim()
            if (mensaje.length < 10) { msgReporte.innerText = "Contanos un poco más (al menos 10 caracteres)."; return }
            const registro = registroReportes()
            if (registro.cantidad >= LIMITE_REPORTES_DIA) { msgReporte.innerText = "Por hoy ya mandaste varios reportes. ¡Gracias! Probá de nuevo mañana."; return }
            if (Date.now() - registro.ultimo < ESPERA_ENTRE_REPORTES_MS) { msgReporte.innerText = "Esperá unos segundos antes de mandar otro."; return }

            const boton = formReporte.querySelector("button[type='submit']")
            boton.disabled = true
            msgReporte.innerText = "Enviando…"
            const datos = {
                tipo: document.getElementById("reporteTipo").value,
                seccion: document.getElementById("reporteSeccion").value,
                mensaje,
                website: document.getElementById("reporteWebsite").value,
                origen: "web",
                version: FRONTEND_VERSION,
                dispositivo: (window.matchMedia("(pointer: coarse)").matches ? "táctil" : "mouse") + " · " + window.innerWidth + "×" + window.innerHeight + " · " + navigator.userAgent.slice(0, 110)
            }
            try {
                await fetch(REPORTES_URL, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(datos) })
                registro.cantidad += 1
                registro.ultimo = Date.now()
                try { localStorage.setItem("medmar:reportes", JSON.stringify(registro)) } catch (_) {}
                formReporte.reset()
                msgReporte.innerText = ""
                mostrarAviso("¡Gracias! Lo recibimos. Lo vamos a leer para mejorar MedMar.")
            } catch (err) {
                msgReporte.innerText = mensajeError("conexion")
            } finally {
                boton.disabled = false
            }
        })

        // ==================== JUEGOS Y RANKING ====================
        // El juego guarda el puntaje con la acción guardarPuntaje (comparte la sesión: mismo origen).
        // Acá solo se lee el ranking (acción rankingJuego), con caché corta por modo para ahorrar invocaciones.

        const JUEGO_RANKING = "inmune-survivors"
        const RANKING_FRESCURA_MS = 30000
        const rankingCache = new Map()
        const rankingModo = document.getElementById("rankingModo")
        const rankingLista = document.getElementById("rankingLista")
        const rankingPropio = document.getElementById("rankingPropio")
        const rankingResultados = document.getElementById("rankingResultados")
        const rankingMsg = document.getElementById("rankingMsg")
        const rankingBuscar = document.getElementById("rankingBuscar")
        let rankingPedido = 0

        document.querySelector(".juegoPortada img")?.addEventListener("error", function () { this.remove() })

        function etiquetaModoRanking(modo) {
            const opcion = rankingModo && Array.from(rankingModo.options).find(function (o) { return o.value === modo })
            return opcion ? opcion.textContent : modo
        }

        function formatearDuracion(segundos) {
            const s = Math.max(0, Number(segundos) || 0)
            const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60
            return h ? h + " h " + String(m).padStart(2, "0") + " min" : m + ":" + String(r).padStart(2, "0")
        }

        function filaRankingHtml(f) {
            const podio = f.posicion <= 3 ? " podio" + f.posicion : ""
            const medalla = f.posicion === 1 ? "🥇" : f.posicion === 2 ? "🥈" : f.posicion === 3 ? "🥉" : "#" + f.posicion
            return "<li class='rankingFila" + podio + (f.esPropio ? " propia" : "") + "'>" +
                "<span class='rankingPos'>" + escapeHtml(medalla) + "</span>" +
                avatarHtml(f.pseudonimo, f.foto) +
                "<span class='rankingNombre'><b>" + escapeHtml(f.pseudonimo) + (f.esPropio ? " (vos)" : "") + "</b>" +
                "<small>" + escapeHtml(formatearDuracion(f.segundos)) + " de partida</small></span>" +
                "<span class='rankingPuntos'>" + escapeHtml(Number(f.puntaje).toLocaleString("es-AR")) + "</span></li>"
        }

        function renderizarRanking(r) {
            const modo = r.modo
            const enlaceJugar = "/juegos/inmune-survivors/"
            if (r.propio) {
                rankingPropio.innerHTML = "Estás <strong>#" + escapeHtml(r.propio.posicion) + "</strong> de " + escapeHtml(r.total) +
                    " en " + escapeHtml(etiquetaModoRanking(modo)) + " con <strong>" + escapeHtml(Number(r.propio.puntaje).toLocaleString("es-AR")) + "</strong> puntos."
            } else {
                rankingPropio.innerHTML = "Todavía no jugaste " + escapeHtml(etiquetaModoRanking(modo)) + ". <a href='" + enlaceJugar + "'>¡Jugá y entrá al ranking!</a>"
            }

            const top = Array.isArray(r.top) ? r.top : []
            let html = top.map(filaRankingHtml).join("")
            // Si estás fuera del top, tu fila aparece al final separada.
            if (r.propio && !top.some(function (f) { return f.esPropio })) {
                html += "<li class='rankingSeparador' aria-hidden='true'>···</li>" + filaRankingHtml(r.propio)
            }
            rankingLista.innerHTML = html
            rankingMsg.textContent = top.length ? "" : "Nadie jugó este modo todavía. ¡El primer puesto está libre!"

            if (Array.isArray(r.busqueda)) {
                rankingResultados.innerHTML = r.busqueda.length
                    ? "<p class='rankingSubtitulo'>Resultados para “" + escapeHtml(rankingBuscar.value.trim()) + "”</p><ol class='rankingLista'>" + r.busqueda.map(filaRankingHtml).join("") + "</ol>"
                    : "<p class='rankingSubtitulo'>Nadie con ese pseudónimo jugó " + escapeHtml(etiquetaModoRanking(modo)) + ".</p>"
            } else {
                rankingResultados.innerHTML = ""
            }
        }

        // ==================== NOVEDADES (INICIO Y COLUMNA DEL FORO) ====================
        // Se arma solo con lo que ya está en memoria (solicitudesUI, intercambiosUI) y con un resumen
        // del foro guardado en localStorage la última vez que se cargó: no hace pedidos a la API.

        const DIAS_VIGENCIA_SOLICITUD = 14

        function claveLocalUsuario(nombre) {
            return sesion && sesion.email ? "medmar:" + nombre + ":" + sesion.email.toLowerCase() : null
        }

        function leerLocal(nombre) {
            const clave = claveLocalUsuario(nombre)
            if (!clave) return null
            try { return JSON.parse(localStorage.getItem(clave) || "null") } catch (_) { return null }
        }

        function guardarLocal(nombre, valor) {
            const clave = claveLocalUsuario(nombre)
            if (!clave) return
            try { localStorage.setItem(clave, JSON.stringify(valor)) } catch (_) {}
        }

        // Resumen del foro para Inicio: los hilos más recientes (sin filtro ni búsqueda) y, para los
        // propios, cuántas respuestas tenían la última vez que se vieron (para detectar respuestas nuevas).
        function guardarResumenForo(hilos) {
            if (!Array.isArray(hilos)) return
            const vistos = leerLocal("foroVistos") || {}
            const resumen = hilos.slice(0, 20).map(function (h) {
                const id = String(h.id)
                // Primera vez que se ve un hilo propio: su cuenta actual es la base (no son "nuevas").
                if (h.esPropio && vistos[id] === undefined) vistos[id] = Number(h.respuestas || 0)
                return { id: id, titulo: h.titulo, etiquetas: (h.etiquetas || []).slice(0, 2), respuestas: Number(h.respuestas || 0), esPropio: !!h.esPropio }
            })
            guardarLocal("foroResumen", resumen)
            guardarLocal("foroVistos", vistos)
            renderizarNovedades()
        }

        function marcarHiloVisto(hilo) {
            if (!hilo || !hilo.esPropio) return
            const vistos = leerLocal("foroVistos") || {}
            vistos[String(hilo.id)] = Number(hilo.respuestas || 0)
            guardarLocal("foroVistos", vistos)
            const resumen = leerLocal("foroResumen")
            if (resumen) {
                resumen.forEach(function (h) { if (h.id === String(hilo.id)) h.respuestas = Number(hilo.respuestas || 0) })
                guardarLocal("foroResumen", resumen)
            }
            renderizarNovedades()
        }

        function bloqueForoInicio() {
            const resumen = leerLocal("foroResumen")

            // C) Sin datos todavía: invitación a preguntar.
            if (!resumen || !resumen.length) {
                return "<article class='novedad'>" +
                    "<span class='novedadEtiqueta'>Foro</span>" +
                    "<b class='novedadTitulo'>¿Te trabaste con algún tema?</b>" +
                    "<span class='novedadDato'>Preguntá en el foro: otros estudiantes de la carrera te pueden dar una mano.</span>" +
                    "<button type='button' class='novedadAccion' data-compose>Crear publicación</button>" +
                    "</article>"
            }

            // A) Respuestas nuevas en hilos propios: lo más útil, va primero.
            const vistos = leerLocal("foroVistos") || {}
            const conNuevas = resumen.filter(function (h) {
                return h.esPropio && vistos[h.id] !== undefined && h.respuestas > vistos[h.id]
            })
            if (conNuevas.length) {
                const total = conNuevas.reduce(function (n, h) { return n + (h.respuestas - vistos[h.id]) }, 0)
                const hilo = conNuevas[0]
                return "<article class='novedad novedadForoNuevas'>" +
                    "<span class='novedadEtiqueta'>Foro</span>" +
                    "<b class='novedadTitulo'>" + total + (total === 1 ? " respuesta nueva" : " respuestas nuevas") + "</b>" +
                    "<span class='novedadDato'>" + (conNuevas.length === 1
                        ? "en «" + escapeHtml(hilo.titulo) + "»"
                        : "en " + conNuevas.length + " de tus publicaciones") + "</span>" +
                    "<button type='button' class='novedadAccion' data-hilo='" + escapeAttr(hilo.id) + "'>Ver respuestas</button>" +
                    "</article>"
            }

            // B) Lo último del foro: cada hilo se puede abrir.
            const filas = resumen.slice(0, 2).map(function (h) {
                const etiqueta = h.etiquetas && h.etiquetas[0] ? escapeHtml(h.etiquetas[0]) + " · " : ""
                const respuestas = h.respuestas ? h.respuestas + (h.respuestas === 1 ? " respuesta" : " respuestas") : "sin respuestas"
                return "<li><button type='button' class='novedadHilo' data-hilo='" + escapeAttr(h.id) + "'>" +
                    "<b>" + escapeHtml(h.titulo) + "</b><span>" + etiqueta + respuestas + "</span></button></li>"
            }).join("")
            return "<article class='novedad'>" +
                "<span class='novedadEtiqueta'>Lo último en el foro</span>" +
                "<ul class='novedadLista'>" + filas + "</ul>" +
                "<button type='button' class='novedadAccion secundaria' data-ir='foro'>Ir al foro</button>" +
                "</article>"
        }

        function diasParaVencer(fecha) {
            const t = new Date(fecha).getTime()
            if (!isFinite(t)) return null
            return Math.max(0, DIAS_VIGENCIA_SOLICITUD - Math.floor((Date.now() - t) / 86400000))
        }

        function renderizarNovedades() {
            const contenedores = [document.getElementById("novedadesInicio"), document.getElementById("contextoForo")]
            if (!contenedores[0] && !contenedores[1]) return

            const bloques = []

            // 1) Intercambio confirmado más reciente: lo más importante, va destacado.
            const intercambio = intercambiosUI && intercambiosUI[0]
            if (intercambio) {
                const yo = (intercambio.participantes || []).find(function (p) { return p.esVos }) || {}
                bloques.push(
                    "<article class='novedad novedadDestacada'>" +
                    "<span class='novedadEtiqueta'>Intercambio confirmado</span>" +
                    "<b class='novedadTitulo'>" + escapeHtml(intercambio.materia || "") + "</b>" +
                    (yo.tengo ? "<span class='novedadDato'>Comisión " + escapeHtml(String(yo.tengo)) + " ⇄ " + escapeHtml(String(yo.busco || "")) + "</span>" : "") +
                    (intercambio.conversacionId
                        ? "<button type='button' class='novedadAccion' data-chat='" + escapeAttr(intercambio.conversacionId) + "'>Abrir chat privado</button>"
                        : "<button type='button' class='novedadAccion' data-ir='intercambios'>Ver intercambio</button>") +
                    "</article>")
            }

            // 2) Solicitudes activas, con aviso cuando están por vencer.
            const activas = (solicitudesUI || []).filter(function (s) { return !s._optimista })
            if (activas.length) {
                const filas = activas.slice(0, 3).map(function (s) {
                    const dias = diasParaVencer(s.created_at || s.fecha)
                    const estado = dias !== null && dias <= 3
                        ? "<span class='estadoChip estadoAviso'>" + (dias === 0 ? "Vence hoy" : "Vence en " + dias + (dias === 1 ? " día" : " días")) + "</span>"
                        : ""
                    return "<li><span class='novedadFilaTexto'><b>" + escapeHtml(s.materia) + "</b>" +
                        "<span>Comisión " + escapeHtml(String(s.tengo)) + " → " + escapeHtml(String(s.busco)) + "</span></span>" + estado + "</li>"
                }).join("")
                bloques.push(
                    "<article class='novedad'>" +
                    "<span class='novedadEtiqueta'>" + (activas.length === 1 ? "Tu solicitud activa" : "Tus " + activas.length + " solicitudes activas") + "</span>" +
                    "<ul class='novedadLista'>" + filas + "</ul>" +
                    (activas.length > 3 ? "<span class='novedadDato'>y " + (activas.length - 3) + " más</span>" : "") +
                    "<button type='button' class='novedadAccion secundaria' data-ir='intercambios'>Ver o editar</button>" +
                    "</article>")
            } else if (!intercambio) {
                bloques.push(
                    "<article class='novedad'>" +
                    "<span class='novedadEtiqueta'>Intercambio de comisiones</span>" +
                    "<b class='novedadTitulo'>¿Querés cambiar de comisión?</b>" +
                    "<span class='novedadDato'>Publicá una solicitud y te avisamos por mail si aparece un cruce.</span>" +
                    "<button type='button' class='novedadAccion' data-ir='intercambios'>Publicar solicitud</button>" +
                    "</article>")
            }

            // 3) Foro (solo en Inicio: dentro del foro la columna de contexto no lo repite).
            const html = bloques.join("")
            if (contenedores[0]) contenedores[0].innerHTML = html + bloqueForoInicio()
            if (contenedores[1]) contenedores[1].innerHTML = html
        }

        ;["novedadesInicio", "contextoForo"].forEach(function (id) {
            const cont = document.getElementById(id)
            if (!cont) return
            cont.addEventListener("click", function (e) {
                const chat = e.target.closest("[data-chat]")
                if (chat) {
                    mostrarSeccion("intercambios", "down")
                    abrirChat(chat.dataset.chat)
                    return
                }
                const hilo = e.target.closest("[data-hilo]")
                if (hilo) {
                    mostrarSeccion("foro", "up")
                    abrirHilo(hilo.dataset.hilo)
                    return
                }
                if (e.target.closest("[data-compose]")) {
                    mostrarSeccion("foro", "up")
                    btnAbrirCompose.click()
                    return
                }
                const ir = e.target.closest("[data-ir]")
                if (ir) mostrarSeccion(ir.dataset.ir, "up")
            })
        })

        // ==================== NOTIFICACIONES (CAMPANA) ====================
        // Las crea la base (triggers en respuestas, mensajes e intercambios) y la acción publicarNoticia.
        // Se cargan al entrar, al volver a la pestaña (si pasó 1 min) y en vivo por Realtime.
        // Si la API todavía no tiene la acción (accion_invalida), la campana queda oculta.

        let notificacionesUI = []
        let notificacionesSinLeer = 0
        let notificacionesActivas = false
        let notificacionesCargadasEn = 0
        let notificacionesCanal = null
        let focoAntesNotif = null

        const panelNotificaciones = document.getElementById("panelNotificaciones")
        const listaNotificaciones = document.getElementById("listaNotificaciones")
        const botonesNotif = document.querySelectorAll("[data-notif]")
        const TITULO_BASE = document.title

        const ICONOS_NOTIF = {
            respuesta: '<path d="M5 6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H9l-4 3V6Z"/>',
            respuesta_a_respuesta: '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 5 5v5"/>',
            mensaje: '<path d="M4 6h16v10H8l-4 4V6Z"/><path d="M8 10h8M8 13h5"/>',
            intercambio: '<path d="M4 8h13m-4-4 4 4-4 4M20 16H7m4-4-4 4 4 4"/>',
            aporte: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Z"/><path d="M5 17a3 3 0 0 1 3-3h11M9 8h6"/>',
            noticia: '<path d="M4 6h13v12H6a2 2 0 0 1-2-2V6Z"/><path d="M17 9h3v7a2 2 0 0 1-2 2M7 9h7M7 12h7M7 15h4"/>'
        }

        function tiempoRelativo(fecha) {
            const seg = Math.max(0, (Date.now() - new Date(fecha).getTime()) / 1000)
            if (seg < 60) return "recién"
            if (seg < 3600) return "hace " + Math.floor(seg / 60) + " min"
            if (seg < 86400) return "hace " + Math.floor(seg / 3600) + " h"
            if (seg < 172800) return "ayer"
            return new Date(fecha).toLocaleDateString("es-AR", { day: "numeric", month: "short" })
        }

        function textoNotificacion(n) {
            const actor = "<b>" + escapeHtml(n.actor || "Alguien") + "</b>"
            const contexto = n.contexto ? "«" + escapeHtml(n.contexto) + "»" : ""
            const varias = n.cantidad > 1
            switch (n.tipo) {
                case "respuesta":
                    return varias ? "<b>" + n.cantidad + " respuestas nuevas</b> en " + contexto : actor + " respondió en " + contexto
                case "respuesta_a_respuesta":
                    return varias ? "<b>" + n.cantidad + " respuestas</b> a tu comentario en " + contexto : actor + " respondió tu comentario en " + contexto
                case "mensaje":
                    return varias
                        ? "<b>" + n.cantidad + " mensajes nuevos</b> de " + escapeHtml(n.actor || "tu compañero") + " · " + escapeHtml(n.contexto || "chat")
                        : actor + " te escribió · " + escapeHtml(n.contexto || "chat")
                case "intercambio":
                    return "<b>¡Encontramos un intercambio!</b> " + escapeHtml(n.contexto || "")
                case "aporte":
                    return "<b>Tu aporte «" + escapeHtml(n.contexto || "") + "»</b>" +
                        (n.cuerpo ? "<span class='notifCuerpo'>" + escapeHtml(n.cuerpo) + "</span>" : "")
                case "noticia":
                    return "<b>" + escapeHtml(n.contexto || "Novedad de MedMar") + "</b>" +
                        (n.cuerpo ? "<span class='notifCuerpo'>" + escapeHtml(n.cuerpo) + "</span>" : "")
                default:
                    return escapeHtml(n.contexto || "")
            }
        }

        function actualizarInsigniaNotif() {
            const texto = notificacionesSinLeer > 9 ? "9+" : String(notificacionesSinLeer)
            document.querySelectorAll(".insigniaNotif").forEach(function (b) {
                b.textContent = texto
                b.hidden = notificacionesSinLeer === 0
            })
            botonesNotif.forEach(function (btn) {
                btn.setAttribute("aria-label", notificacionesSinLeer
                    ? "Notificaciones, " + notificacionesSinLeer + " sin leer"
                    : "Notificaciones")
            })
            document.title = (notificacionesSinLeer ? "(" + texto + ") " : "") + TITULO_BASE
        }

        function renderizarNotificaciones() {
            if (!listaNotificaciones) return
            if (!notificacionesUI.length) {
                listaNotificaciones.innerHTML = "<li class='notifVacia'><b>Estás al día</b><span>Acá vas a ver respuestas a tus publicaciones, mensajes de chat, intercambios y novedades de MedMar.</span></li>"
            } else {
                listaNotificaciones.innerHTML = notificacionesUI.map(function (n) {
                    return "<li><button type='button' class='itemNotif" + (n.leida ? "" : " sinLeer") + "' data-id='" + escapeAttr(n.id) + "'>" +
                        "<span class='iconoNotif tipo-" + escapeAttr(n.tipo) + "' aria-hidden='true'><svg viewBox='0 0 24 24'>" + (ICONOS_NOTIF[n.tipo] || ICONOS_NOTIF.noticia) + "</svg></span>" +
                        "<span class='textoNotif'><span class='notifMensaje'>" + textoNotificacion(n) + "</span>" +
                        "<time datetime='" + escapeAttr(n.updated_at || n.created_at) + "'>" + tiempoRelativo(n.updated_at || n.created_at) + "</time></span>" +
                        (n.leida ? "" : "<span class='puntoNotif'><span class='sr-only'>Sin leer</span></span>") +
                        "</button></li>"
                }).join("")
            }
            document.getElementById("btnLeerTodas").hidden = notificacionesSinLeer === 0
            actualizarInsigniaNotif()
        }

        async function cargarNotificaciones(forzar) {
            if (!sesion) return
            if (!forzar && Date.now() - notificacionesCargadasEn < 60000) return
            notificacionesCargadasEn = Date.now()
            const r = await llamar("notificaciones", {})
            if (!r.ok) {
                // La API todavía no tiene la acción: la campana no se muestra.
                if (r.error === "accion_invalida") botonesNotif.forEach(function (b) { b.hidden = true })
                return
            }
            notificacionesActivas = true
            botonesNotif.forEach(function (b) { b.hidden = false })
            notificacionesUI = Array.isArray(r.notificaciones) ? r.notificaciones : []
            notificacionesSinLeer = Number(r.sinLeer || 0)
            renderizarNotificaciones()
            suscribirNotificaciones()
        }

        // Canal propio (no el de solicitudes): si la tabla no estuviera en Realtime, no afecta a lo demás.
        function suscribirNotificaciones() {
            if (notificacionesCanal || !sesion || !sesion.userId) return
            notificacionesCanal = supabaseClient
                .channel("notificaciones-" + sesion.userId)
                .on("postgres_changes", {
                    event: "*", schema: "public", table: "notificaciones", filter: "user_id=eq." + sesion.userId
                }, function (payload) {
                    const n = payload.new || {}
                    if (!n.id) return
                    // Si ya estás mirando ese hilo o ese chat, el aviso se da por leído.
                    const yaLoVes = !n.leida && ((n.tipo === "mensaje" && chatAbiertoId && String(chatAbiertoId) === String(n.ref_id)) ||
                        ((n.tipo === "respuesta" || n.tipo === "respuesta_a_respuesta") && hiloAbiertoId && String(hiloAbiertoId) === String(n.ref_id) && seccionActual === "foro"))
                    if (yaLoVes) { marcarNotificacionesLeidas([n.id]); return }
                    const nuevo = payload.eventType === "INSERT" || (payload.eventType === "UPDATE" && !n.leida)
                    cargarNotificaciones(true).then(function () {
                        if (nuevo && !n.leida && panelNotificaciones.hidden) {
                            const tmp = document.createElement("div")
                            tmp.innerHTML = textoNotificacion(n)
                            mostrarAviso(tmp.textContent)
                        }
                    })
                })
                .subscribe()
        }

        function detenerNotificaciones() {
            if (notificacionesCanal) { supabaseClient.removeChannel(notificacionesCanal); notificacionesCanal = null }
            notificacionesUI = []
            notificacionesSinLeer = 0
            notificacionesActivas = false
            notificacionesCargadasEn = 0
            cerrarPanelNotificaciones(false)
            renderizarNotificaciones()
        }

        function marcarNotificacionesLeidas(ids) {
            let cambio = 0
            notificacionesUI.forEach(function (n) {
                if (!n.leida && (!ids || ids.indexOf(n.id) !== -1)) { n.leida = true; cambio++ }
            })
            notificacionesSinLeer = ids ? Math.max(0, notificacionesSinLeer - cambio) : 0
            renderizarNotificaciones()
            llamar("marcarNotificacionesLeidas", ids ? { ids: ids } : {})
        }

        function abrirPanelNotificaciones() {
            focoAntesNotif = document.activeElement
            panelNotificaciones.hidden = false
            botonesNotif.forEach(function (b) { b.setAttribute("aria-expanded", "true") })
            cargarNotificaciones(true)
            requestAnimationFrame(function () {
                const primero = panelNotificaciones.querySelector(".itemNotif, #btnLeerTodas:not([hidden]), #btnCerrarNotif")
                if (primero) primero.focus()
            })
        }

        function cerrarPanelNotificaciones(devolverFoco) {
            if (!panelNotificaciones || panelNotificaciones.hidden) return
            panelNotificaciones.hidden = true
            botonesNotif.forEach(function (b) { b.setAttribute("aria-expanded", "false") })
            if (devolverFoco !== false && focoAntesNotif && document.contains(focoAntesNotif)) focoAntesNotif.focus()
        }

        function irANotificacion(n) {
            cerrarPanelNotificaciones(false)
            if (n.tipo === "respuesta" || n.tipo === "respuesta_a_respuesta") {
                mostrarSeccion("foro", "up")
                if (n.ref_id) abrirHilo(n.ref_id)
            } else if (n.tipo === "mensaje") {
                mostrarSeccion("intercambios", "down")
                if (n.ref_id) abrirChat(n.ref_id)
            } else if (n.tipo === "intercambio") {
                mostrarSeccion("intercambios", "down")
            } else if (n.tipo === "aporte") {
                mostrarSeccion("material", "up")
            } else if (n.tipo === "noticia" && n.link) {
                const vistaInterna = /^\/\?vista=(juegos|material|moderacion|foro|intercambios)$/.exec(n.link)
                if (vistaInterna) mostrarSeccion(vistaInterna[1], "up")
                else if (n.link.charAt(0) === "/") location.href = n.link
                else window.open(n.link, "_blank", "noopener")
            }
        }

        botonesNotif.forEach(function (btn) {
            btn.addEventListener("click", function () {
                if (panelNotificaciones.hidden) abrirPanelNotificaciones()
                else cerrarPanelNotificaciones()
            })
        })

        if (panelNotificaciones) {
            document.getElementById("btnCerrarNotif").addEventListener("click", function () { cerrarPanelNotificaciones() })
            document.getElementById("btnLeerTodas").addEventListener("click", function () { marcarNotificacionesLeidas(null) })
            listaNotificaciones.addEventListener("click", function (e) {
                const item = e.target.closest(".itemNotif")
                if (!item) return
                const n = notificacionesUI.find(function (x) { return x.id === item.dataset.id })
                if (!n) return
                if (!n.leida) marcarNotificacionesLeidas([n.id])
                irANotificacion(n)
            })
            document.addEventListener("keydown", function (e) {
                if (e.key === "Escape" && !panelNotificaciones.hidden) cerrarPanelNotificaciones()
            })
            document.addEventListener("click", function (e) {
                if (panelNotificaciones.hidden) return
                if (panelNotificaciones.contains(e.target) || e.target.closest("[data-notif]")) return
                cerrarPanelNotificaciones(false)
            })
            document.addEventListener("visibilitychange", function () {
                if (document.visibilityState === "visible" && sesion && notificacionesActivas) cargarNotificaciones(false)
            })
        }

        // Moderación (solo admins): publicar una noticia para todas las cuentas.
        const formNoticia = document.getElementById("formNoticia")
        if (formNoticia) {
            formNoticia.addEventListener("submit", async function (e) {
                e.preventDefault()
                const msgNoticia = document.getElementById("msgNoticia")
                const datos = {
                    titulo: document.getElementById("noticiaTitulo").value.trim(),
                    cuerpo: document.getElementById("noticiaCuerpo").value.trim(),
                    link: document.getElementById("noticiaLink").value.trim()
                }
                if (!datos.titulo) { msgNoticia.textContent = "Poné un título."; return }
                msgNoticia.textContent = "Publicando…"
                const r = await llamarModeracion("publicarNoticia", datos)
                if (!r.ok) {
                    msgNoticia.textContent = r.error === "datos_invalidos"
                        ? "Revisá los datos: el enlace tiene que empezar con / o con https://."
                        : mensajeError(r.error)
                    return
                }
                msgNoticia.textContent = ""
                formNoticia.reset()
                mostrarAviso("Noticia publicada para " + r.destinatarios + " cuentas.")
                cargarNotificaciones(true)
            })
        }

        // ==================== MODERACIÓN CON LLAVE ====================
        // Segundo factor criptográfico para moderar (ver docs/decisiones/0004-llaves-de-moderacion.md).
        // * La llave es un par ECDSA P-256 creado en este navegador. La privada se guarda en un archivo .medmarkey
        //   cifrado con PBKDF2 (600 000 iteraciones) + AES-GCM; nunca se manda al servidor.
        // * Desbloquear = abrir el archivo con la contraseña, firmar un desafío de la API y recibir un token de
        //   30 min. Mientras la pestaña siga abierta, el token se renueva solo firmando otro desafío.
        // * «Mantener desbloqueado 2 h» guarda la llave privada como CryptoKey NO exportable en IndexedDB de este
        //   dispositivo (nadie puede leer sus bytes, ni siquiera este código). Se borra al bloquear o al salir.

        const LLAVE_FORMATO = "medmar-llave"
        const LLAVE_ITERACIONES = 600000
        const LLAVE_MENSAJE = "medmar-moderacion-v1|"
        const LLAVE_RECORDAR_MS = 2 * 3600 * 1000

        let modSesion = null        // { token, rol, expira }
        let modLlave = null         // { huella, privada: CryptoKey }
        let modPestania = "denuncias"
        let resolverDesbloqueo = null

        const textoUtf8 = new TextEncoder()

        function bytesABase64url(bytes) {
            let bin = ""
            new Uint8Array(bytes).forEach(function (b) { bin += String.fromCharCode(b) })
            return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
        }

        function base64urlABytes(texto) {
            const b64 = String(texto).replace(/-/g, "+").replace(/_/g, "/") + "===".slice((String(texto).length + 3) % 4)
            const bin = atob(b64)
            const bytes = new Uint8Array(bin.length)
            for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
            return bytes
        }

        // Mismo cálculo que la API: primeros 8 bytes del SHA-256 de la llave pública canónica.
        async function huellaLlave(jwk) {
            const canonica = JSON.stringify({ crv: jwk.crv, kty: jwk.kty, x: jwk.x, y: jwk.y })
            const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", textoUtf8.encode(canonica)))
            return Array.from(hash.slice(0, 8)).map(function (b) { return b.toString(16).padStart(2, "0") }).join("").toUpperCase().match(/.{4}/g).join("-")
        }

        async function derivarClaveArchivo(pass, salt, iteraciones) {
            const base = await crypto.subtle.importKey("raw", textoUtf8.encode(pass), "PBKDF2", false, ["deriveKey"])
            return crypto.subtle.deriveKey({ name: "PBKDF2", salt: salt, iterations: iteraciones, hash: "SHA-256" },
                base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"])
        }

        async function crearArchivoLlave(pass, nombre) {
            const par = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"])
            const pub = await crypto.subtle.exportKey("jwk", par.publicKey)
            const publica = { kty: "EC", crv: "P-256", x: pub.x, y: pub.y }
            const huella = await huellaLlave(publica)
            const salt = crypto.getRandomValues(new Uint8Array(16))
            const iv = crypto.getRandomValues(new Uint8Array(12))
            const clave = await derivarClaveArchivo(pass, salt, LLAVE_ITERACIONES)
            const privada = await crypto.subtle.exportKey("pkcs8", par.privateKey)
            // La huella va como dato asociado: si alguien cambia la parte pública del archivo, no abre.
            const cifrado = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv, additionalData: textoUtf8.encode(huella) }, clave, privada)
            const archivo = {
                formato: LLAVE_FORMATO, v: 1, huella: huella, nombre: nombre || "", publica: publica,
                kdf: { alg: "PBKDF2-SHA256", iteraciones: LLAVE_ITERACIONES, salt: bytesABase64url(salt) },
                cifrado: { alg: "AES-GCM", iv: bytesABase64url(iv), datos: bytesABase64url(cifrado) },
                creada: new Date().toISOString()
            }
            return { archivo: archivo, publica: publica, huella: huella }
        }

        async function abrirArchivoLlave(texto, pass) {
            let archivo
            try { archivo = JSON.parse(texto) } catch (_) { throw new Error("Ese archivo no es una llave de MedMar.") }
            if (!archivo || archivo.formato !== LLAVE_FORMATO || archivo.v !== 1 || !archivo.cifrado || !archivo.kdf) throw new Error("Ese archivo no es una llave de MedMar.")
            if (await huellaLlave(archivo.publica || {}) !== archivo.huella) throw new Error("El archivo de llave está dañado o fue modificado.")
            let pkcs8
            try {
                const clave = await derivarClaveArchivo(pass, base64urlABytes(archivo.kdf.salt), Number(archivo.kdf.iteraciones) || LLAVE_ITERACIONES)
                pkcs8 = await crypto.subtle.decrypt({ name: "AES-GCM", iv: base64urlABytes(archivo.cifrado.iv), additionalData: textoUtf8.encode(archivo.huella) },
                    clave, base64urlABytes(archivo.cifrado.datos))
            } catch (_) { throw new Error("La contraseña no es correcta.") }
            const privada = await crypto.subtle.importKey("pkcs8", pkcs8, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"])
            return { huella: archivo.huella, privada: privada }
        }

        // ---- IndexedDB: llave no exportable por 12 h (opcional) ----
        function abrirBaseLlaves() {
            return new Promise(function (ok, mal) {
                const pedido = indexedDB.open("medmar-llaves", 1)
                pedido.onupgradeneeded = function () { pedido.result.createObjectStore("llaves") }
                pedido.onsuccess = function () { ok(pedido.result) }
                pedido.onerror = function () { mal(pedido.error) }
            })
        }

        async function guardarLlaveDispositivo(llave) {
            try {
                const db = await abrirBaseLlaves()
                await new Promise(function (ok, mal) {
                    const tx = db.transaction("llaves", "readwrite")
                    tx.objectStore("llaves").put({ huella: llave.huella, privada: llave.privada, expira: Date.now() + LLAVE_RECORDAR_MS }, sesion.userId)
                    tx.oncomplete = ok; tx.onerror = function () { mal(tx.error) }
                })
            } catch (e) { console.warn("[MedMarUNMDP] No se pudo recordar la llave", e) }
        }

        async function leerLlaveDispositivo() {
            try {
                const db = await abrirBaseLlaves()
                const dato = await new Promise(function (ok, mal) {
                    const pedido = db.transaction("llaves", "readonly").objectStore("llaves").get(sesion.userId)
                    pedido.onsuccess = function () { ok(pedido.result) }
                    pedido.onerror = function () { mal(pedido.error) }
                })
                if (!dato || !dato.privada || Date.now() > dato.expira) { if (dato) borrarLlaveDispositivo(); return null }
                return { huella: dato.huella, privada: dato.privada }
            } catch (_) { return null }
        }

        async function borrarLlaveDispositivo() {
            try {
                const db = await abrirBaseLlaves()
                db.transaction("llaves", "readwrite").objectStore("llaves").clear()
            } catch (_) {}
        }

        // ---- Sesión de moderación ----
        const ERRORES_LLAVE = {
            desafio_vencido: "Se venció el desafío. Probá de nuevo.",
            firma_invalida: "La llave no coincide con la registrada en tu cuenta.",
            llave_desconocida: "Esta llave no está registrada para tu cuenta.",
            llave_pendiente: "Tu llave todavía no fue aprobada por un administrador.",
            llave_revocada: "Esta llave fue revocada. Creá una nueva en «Mi llave».",
            no_autorizado: "Tu cuenta no tiene permiso de moderación."
        }

        async function firmarSesionModeracion(llave) {
            const d = await llamar("desafioModeracion", {})
            if (!d.ok) throw new Error(ERRORES_LLAVE[d.error] || mensajeError(d.error))
            const firma = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, llave.privada, textoUtf8.encode(LLAVE_MENSAJE + d.desafio))
            const r = await llamar("abrirSesionModeracion", { desafio: d.desafio, huella: llave.huella, firma: bytesABase64url(firma) })
            if (!r.ok) throw new Error(ERRORES_LLAVE[r.error] || mensajeError(r.error))
            modSesion = { token: r.token, rol: r.rol, expira: Number(r.expira) }
            modLlave = llave
            actualizarEstadoModeracion()
        }

        function sesionModeracionVigente() {
            return !!(modSesion && Date.now() < modSesion.expira - 60000)
        }

        // Devuelve true si hay sesión de moderación (renovándola en silencio si se puede) o pide desbloquear.
        async function asegurarSesionModeracion(sinPedir) {
            if (sesionModeracionVigente()) return true
            const llave = modLlave || await leerLlaveDispositivo()
            if (llave) {
                try { await firmarSesionModeracion(llave); return true } catch (e) { modLlave = null; borrarLlaveDispositivo() }
            }
            if (sinPedir) return false
            return pedirDesbloqueo()
        }

        // Como llamar(), pero con el token de moderación. Si el servidor lo rechaza, renueva una vez y reintenta.
        async function llamarModeracion(accion, params) {
            if (!(await asegurarSesionModeracion())) return { ok: false, error: "moderacion_bloqueada" }
            let r = await llamar(accion, Object.assign({}, params, { tokenModeracion: modSesion.token }))
            if (!r.ok && r.error === "llave_requerida") {
                modSesion = null
                if (!(await asegurarSesionModeracion())) return { ok: false, error: "moderacion_bloqueada" }
                r = await llamar(accion, Object.assign({}, params, { tokenModeracion: modSesion.token }))
            }
            return r
        }

        function pedirDesbloqueo() {
            const modal = document.getElementById("modalLlave")
            document.getElementById("msgDesbloqueo").textContent = ""
            document.getElementById("passLlave").value = ""
            abrirModal(modal)
            return new Promise(function (resolver) { resolverDesbloqueo = resolver })
        }

        function terminarDesbloqueo(exito) {
            cerrarModal(document.getElementById("modalLlave"))
            document.getElementById("passLlave").value = ""
            if (resolverDesbloqueo) { const r = resolverDesbloqueo; resolverDesbloqueo = null; r(exito) }
        }

        document.getElementById("btnCerrarModalLlave").addEventListener("click", function () { terminarDesbloqueo(false) })

        document.getElementById("formDesbloqueo").addEventListener("submit", async function (e) {
            e.preventDefault()
            const msg = document.getElementById("msgDesbloqueo")
            const archivo = document.getElementById("archivoLlave").files[0]
            const pass = document.getElementById("passLlave").value
            if (!archivo) { msg.textContent = "Elegí tu archivo de llave."; return }
            if (archivo.size > 20000) { msg.textContent = "Ese archivo no es una llave de MedMar."; return }
            if (!pass) { msg.textContent = "Escribí la contraseña de la llave."; return }
            msg.textContent = "Verificando…"
            try {
                const llave = await abrirArchivoLlave(await archivo.text(), pass)
                await firmarSesionModeracion(llave)
                if (document.getElementById("recordarLlave").checked) await guardarLlaveDispositivo(llave)
                msg.textContent = ""
                terminarDesbloqueo(true)
                mostrarAviso(modSesion.rol === "admin" ? "Moderación desbloqueada como administrador." : "Moderación desbloqueada.")
                if (seccionActual === "moderacion") cargarPestaniaModeracion()
            } catch (err) {
                msg.textContent = err && err.message ? err.message : "No se pudo desbloquear."
            }
        })

        function cerrarSesionModeracion(olvidarDispositivo) {
            modSesion = null
            modLlave = null
            if (olvidarDispositivo) borrarLlaveDispositivo()
            actualizarEstadoModeracion()
        }

        // ---- Panel de moderación ----
        function actualizarAccesosModeracion() {
            const visible = !!(esModeradorActual || esAdminActual)
            document.querySelectorAll(".soloModeracion").forEach(function (el) { el.hidden = !visible })
            document.querySelectorAll(".modPestania.soloAdmin").forEach(function (el) { el.hidden = !esAdminActual })
        }

        function actualizarEstadoModeracion() {
            const estado = document.getElementById("estadoLlave")
            if (!estado) return
            const abierta = sesionModeracionVigente()
            if (abierta) {
                const hora = new Date(modSesion.expira).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })
                estado.innerHTML = "<span class='estadoChip estado-aprobado'>Desbloqueada</span> " +
                    (modSesion.rol === "admin" ? "como administrador" : "como moderador") + " · se renueva sola mientras uses esta pestaña (token hasta las " + escapeHtml(hora) + ")"
            } else {
                estado.innerHTML = "<span class='estadoChip estado-rechazado'>Bloqueada</span> Necesitás tu llave para moderar."
            }
            document.getElementById("btnDesbloquearMod").hidden = abierta
            document.getElementById("btnBloquearMod").hidden = !abierta
            const enLlave = modPestania === "llave"
            document.getElementById("panelModBloqueado").hidden = abierta || enLlave
            document.querySelectorAll(".modPanel").forEach(function (panel) {
                panel.hidden = panel.dataset.panel !== modPestania || (!abierta && !enLlave)
            })
        }

        function elegirPestaniaModeracion(nombre) {
            modPestania = nombre
            document.querySelectorAll(".modPestania").forEach(function (t) { t.setAttribute("aria-selected", String(t.dataset.panel === nombre)) })
            actualizarEstadoModeracion()
            cargarPestaniaModeracion()
        }

        function cargarPestaniaModeracion() {
            if (modPestania === "llave") { cargarMisLlaves(); return }
            if (!sesionModeracionVigente()) return
            if (modPestania === "denuncias") cargarDenuncias()
            else if (modPestania === "aportes") cargarAportes()
            else if (modPestania === "equipo") { cargarLlaves(); cargarModeradores() }
            else if (modPestania === "registro") cargarRegistro()
        }

        async function entrarAModeracion() {
            actualizarAccesosModeracion()
            if (!esAdminActual && (modPestania === "equipo" || modPestania === "registro")) modPestania = "denuncias"
            if (seccionModeradores) seccionModeradores.style.display = esAdminActual ? "block" : "none"
            elegirPestaniaModeracion(modPestania)
            if (!sesionModeracionVigente() && await asegurarSesionModeracion(true)) cargarPestaniaModeracion()
        }

        document.querySelectorAll(".modPestania").forEach(function (t) {
            t.addEventListener("click", function () { elegirPestaniaModeracion(t.dataset.panel) })
        })
        document.getElementById("btnDesbloquearMod").addEventListener("click", async function () {
            if (await asegurarSesionModeracion()) cargarPestaniaModeracion()
        })
        document.getElementById("btnBloquearMod").addEventListener("click", function () {
            cerrarSesionModeracion(true)
            mostrarAviso("Moderación bloqueada en este dispositivo.")
        })
        document.getElementById("panelModBloqueado").addEventListener("click", async function (e) {
            if (e.target.closest("[data-ir-llave]")) { elegirPestaniaModeracion("llave"); return }
            if (e.target.closest("[data-desbloquear]") && await asegurarSesionModeracion()) cargarPestaniaModeracion()
        })
        setInterval(function () { if (seccionActual === "moderacion") actualizarEstadoModeracion() }, 30000)

        // ---- Mi llave ----
        const ESTADOS_LLAVE = { pendiente: "Esperando aprobación", activa: "Activa", revocada: "Revocada" }

        async function cargarMisLlaves() {
            const cont = document.getElementById("misLlaves")
            const r = await llamar("misLlaves", {})
            if (!r.ok) { cont.innerHTML = r.error === "accion_invalida" ? "<p class='vacio'>Las llaves se están activando.</p>" : ""; return }
            const llaves = r.llaves || []
            cont.innerHTML = llaves.length
                ? "<h3>Tus llaves</h3><ul class='listaLlaves'>" + llaves.map(function (l) {
                    return "<li><span class='novedadFilaTexto'><b class='huella'>" + escapeHtml(l.huella) + "</b><span>" +
                        escapeHtml(l.nombre || "Sin nombre") + " · " + (l.rol === "admin" ? "Administrador" : "Moderador") +
                        (l.ultimo_uso ? " · usada " + escapeHtml(tiempoRelativo(l.ultimo_uso)) : "") + "</span></span>" +
                        "<span class='estadoChip estado-" + (l.estado === "activa" ? "aprobado" : l.estado === "pendiente" ? "pendiente" : "rechazado") + "'>" + escapeHtml(ESTADOS_LLAVE[l.estado] || l.estado) + "</span>" +
                        "<button type='button' class='panelNotifAccion' data-revocar-propia='" + escapeAttr(l.id) + "'>Revocar</button></li>"
                }).join("") + "</ul>"
                : "<p class='ayudaPerfil'>Todavía no tenés ninguna llave.</p>"
        }

        document.getElementById("misLlaves").addEventListener("click", async function (e) {
            const btn = e.target.closest("[data-revocar-propia]")
            if (!btn) return
            if (!confirm("¿Revocar esta llave? Ya no vas a poder moderar con ese archivo.")) return
            const r = await llamar("revocarLlave", { id: btn.dataset.revocarPropia })
            if (!r.ok) { alert(mensajeError(r.error)); return }
            cerrarSesionModeracion(true)
            cargarMisLlaves()
            mostrarAviso("Llave revocada.")
        })

        function descargarArchivo(nombre, contenido) {
            const url = URL.createObjectURL(new Blob([contenido], { type: "application/json" }))
            const a = document.createElement("a")
            a.href = url
            a.download = nombre
            document.body.appendChild(a)
            a.click()
            a.remove()
            setTimeout(function () { URL.revokeObjectURL(url) }, 2000)
        }

        document.getElementById("formCrearLlave").addEventListener("submit", async function (e) {
            e.preventDefault()
            const msg = document.getElementById("msgCrearLlave")
            const pass = document.getElementById("passNuevaLlave").value
            const pass2 = document.getElementById("passNuevaLlave2").value
            const nombre = document.getElementById("nombreLlave").value.trim()
            if (pass.length < 12) { msg.textContent = "La contraseña tiene que tener al menos 12 caracteres."; return }
            if (pass !== pass2) { msg.textContent = "Las contraseñas no coinciden."; return }
            msg.textContent = "Creando tu llave…"
            try {
                const { archivo, publica, huella } = await crearArchivoLlave(pass, nombre)
                const contenido = JSON.stringify(archivo, null, 2)
                if (esAdminActual) {
                    // Las llaves de administrador solo se activan por SQL desde el dashboard de Supabase.
                    const nombreSql = (nombre || "Llave de administrador").replace(/'/g, "''")
                    document.getElementById("sqlLlaveAdmin").value =
                        "insert into public.llaves_moderacion (user_id, rol, nombre, public_key, huella, estado, aprobada_at)\n" +
                        "values ('" + sesion.userId + "', 'admin', '" + nombreSql + "',\n  '" + JSON.stringify(publica) + "'::jsonb,\n  '" + huella + "', 'activa', now());"
                    document.getElementById("altaLlaveAdmin").hidden = false
                } else {
                    const r = await llamar("registrarLlave", { publica: publica, nombre: nombre })
                    if (!r.ok) { msg.textContent = r.error === "llaves_limite" ? "Ya tenés el máximo de llaves. Revocá una antes de crear otra." : (ERRORES_LLAVE[r.error] || mensajeError(r.error)); return }
                }
                descargarArchivo("medmar-llave-" + huella + ".medmarkey", contenido)
                document.getElementById("formCrearLlave").reset()
                msg.innerHTML = "Listo. Se descargó tu archivo de llave. Tu huella es <b class='huella'>" + escapeHtml(huella) + "</b>" +
                    (esAdminActual ? ": ejecutá el SQL de abajo para activarla." : ": pasásela a un administrador por otro medio para que la apruebe.")
                cargarMisLlaves()
            } catch (err) {
                msg.textContent = "No se pudo crear la llave en este navegador."
                console.error(err)
            }
        })

        document.getElementById("btnCopiarSqlLlave").addEventListener("click", async function () {
            const area = document.getElementById("sqlLlaveAdmin")
            try { await navigator.clipboard.writeText(area.value); mostrarAviso("SQL copiado.") }
            catch (_) { area.select() }
        })

        // ---- Equipo: llaves de todos (admin) ----
        async function cargarLlaves() {
            const cont = document.getElementById("listaLlaves")
            const r = await llamarModeracion("listarLlaves", {})
            if (!r.ok) { cont.innerHTML = "<p class='vacio'>" + escapeHtml(mensajeError(r.error)) + "</p>"; return }
            const llaves = r.llaves || []
            cont.innerHTML = llaves.length ? "<ul class='listaLlaves'>" + llaves.map(function (l) {
                return "<li><span class='novedadFilaTexto'><b>" + escapeHtml(l.pseudonimo) + " · <span class='huella'>" + escapeHtml(l.huella) + "</span></b><span>" +
                    (l.rol === "admin" ? "Administrador" : "Moderador") + (l.nombre ? " · " + escapeHtml(l.nombre) : "") +
                    (l.ultimo_uso ? " · usada " + escapeHtml(tiempoRelativo(l.ultimo_uso)) : "") + "</span></span>" +
                    "<span class='estadoChip estado-" + (l.estado === "activa" ? "aprobado" : "pendiente") + "'>" + escapeHtml(ESTADOS_LLAVE[l.estado] || l.estado) + "</span>" +
                    (l.estado === "pendiente" ? "<button type='button' class='novedadAccion' data-aprobar-llave='" + escapeAttr(l.id) + "' data-huella='" + escapeAttr(l.huella) + "' data-quien='" + escapeAttr(l.pseudonimo) + "'>Aprobar</button>" : "") +
                    "<button type='button' class='panelNotifAccion' data-revocar-llave='" + escapeAttr(l.id) + "'>Revocar</button></li>"
            }).join("") + "</ul>" : "<p class='vacio'>No hay llaves registradas.</p>"
        }

        document.getElementById("listaLlaves").addEventListener("click", async function (e) {
            const aprobar = e.target.closest("[data-aprobar-llave]")
            const revocar = e.target.closest("[data-revocar-llave]")
            if (aprobar) {
                const escrita = prompt("Para aprobar la llave de " + aprobar.dataset.quien + ", escribí la huella que esa persona te pasó por otro medio (en persona o por mensaje).\n\nNo la copies de esta pantalla: si alguien robó su cuenta, la huella de acá sería la del atacante.")
                if (escrita === null) return
                const r = await llamarModeracion("aprobarLlave", { id: aprobar.dataset.aprobarLlave, huellaConfirmada: escrita.trim().toUpperCase() })
                if (!r.ok) { alert(mensajeError(r.error)); return }
                mostrarAviso("Llave aprobada.")
                cargarLlaves()
            } else if (revocar) {
                if (!confirm("¿Revocar esta llave? Esa persona no va a poder moderar con ese archivo.")) return
                const r = await llamarModeracion("revocarLlave", { id: revocar.dataset.revocarLlave })
                if (!r.ok) { alert(mensajeError(r.error)); return }
                mostrarAviso("Llave revocada.")
                cargarLlaves()
            }
        })

        // ---- Registro de auditoría (admin) ----
        const ACCIONES_REGISTRO = {
            abrir_sesion: "desbloqueó la moderación", firma_invalida: "intentó desbloquear con una firma inválida",
            registrar_llave: "registró una llave", aprobar_llave: "aprobó una llave", revocar_llave: "revocó una llave",
            borrar_hilo: "borró una publicación", borrar_respuesta: "borró una respuesta", resolver_denuncia: "resolvió una denuncia",
            resolver_aporte: "resolvió un aporte", agregar_material: "agregó material", quitar_material: "quitó material",
            publicar_noticia: "publicó una noticia", asignar_moderador: "dio rol de moderador", quitar_moderador: "quitó un moderador"
        }

        async function cargarRegistro() {
            const lista = document.getElementById("listaRegistro")
            const r = await llamarModeracion("registroModeracion", {})
            if (!r.ok) { lista.innerHTML = "<li class='vacio'>" + escapeHtml(mensajeError(r.error)) + "</li>"; return }
            const filas = r.registro || []
            lista.innerHTML = filas.length ? filas.map(function (f) {
                const d = f.detalle || {}
                const extra = d.titulo ? " «" + d.titulo + "»" : d.decision ? " (" + d.decision + ")" : d.accion ? " (" + d.accion + ")" : d.huella ? " " + d.huella : ""
                return "<li><time datetime='" + escapeAttr(f.created_at) + "'>" + escapeHtml(new Date(f.created_at).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })) + "</time>" +
                    "<span><b>" + escapeHtml(f.pseudonimo) + "</b> " + escapeHtml((ACCIONES_REGISTRO[f.accion] || f.accion) + extra) + "</span></li>"
            }).join("") : "<li class='vacio'>Todavía no hay acciones registradas.</li>"
        }

        // ==================== MATERIAL DE ESTUDIO ====================
        // Catálogo de enlaces a Google Drive. Se pide al entrar (máx. 1 vez cada 5 min) y se filtra en el
        // cliente. Los aportes van por link de Drive (no se suben archivos) y los revisan moderadores.

        const TIPOS_MATERIAL = {
            resumen: "Resumen", apunte: "Apunte", guia: "Guía", examen: "Examen", libro: "Libro", otro: "Otro"
        }
        const MATERIAL_FRESCURA_MS = 5 * 60 * 1000
        const RE_LINK_DRIVE = /^https:\/\/(drive|docs)\.google\.com\/\S+$/i

        let materialesUI = []
        let materialesCargadosEn = 0
        let filtroTipoMaterial = ""
        let aporteAbiertoEn = 0
        let misAportesCargados = false

        const listaMaterial = document.getElementById("listaMaterial")
        const buscarMaterial = document.getElementById("buscarMaterial")
        const filtroMateria = document.getElementById("filtroMateria")
        const panelAporte = document.getElementById("panelAporte")
        const formAporte = document.getElementById("formAporte")
        const btnAportarMaterial = document.getElementById("btnAportarMaterial")

        // Las listas de materias se copian del selector de «Publicar una solicitud» (misma fuente, con años).
        ;(function llenarSelectsMaterias() {
            const origen = document.getElementById("selectMateria")
            if (!origen) return
            document.querySelectorAll(".selectMaterias").forEach(function (sel) {
                sel.innerHTML = origen.innerHTML
                const primera = sel.querySelector("option[value='']")
                if (primera) primera.textContent = sel.id === "filtroMateria" ? "Todas las materias" : "Elegí la materia"
            })
        })()

        function normalizarTexto(t) {
            return String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
        }

        // Enlace de descarga directa de Drive/Docs. null si no se puede (por ejemplo, una carpeta).
        function enlaceDescarga(link) {
            let m = String(link).match(/drive\.google\.com\/file\/d\/([\w-]+)/) || String(link).match(/drive\.google\.com\/(?:open|uc)\?(?:.*&)?id=([\w-]+)/)
            if (m) return "https://drive.google.com/uc?export=download&id=" + m[1]
            m = String(link).match(/docs\.google\.com\/(document|presentation|spreadsheets)\/d\/([\w-]+)/)
            if (!m) return null
            if (m[1] === "document") return "https://docs.google.com/document/d/" + m[2] + "/export?format=pdf"
            if (m[1] === "presentation") return "https://docs.google.com/presentation/d/" + m[2] + "/export/pdf"
            return "https://docs.google.com/spreadsheets/d/" + m[2] + "/export?format=xlsx"
        }

        function entrarAMaterial() {
            cargarMateriales(false)
            if (!misAportesCargados) cargarMisAportes()
        }

        async function cargarMateriales(forzar) {
            if (!sesion) return
            if (!forzar && materialesCargadosEn && Date.now() - materialesCargadosEn < MATERIAL_FRESCURA_MS) { renderizarMateriales(); return }
            if (!materialesUI.length) listaMaterial.innerHTML = esqueletoTarjetas(3)
            const r = await llamar("listarMateriales", {})
            if (!r.ok) {
                if (!materialesUI.length) {
                    listaMaterial.innerHTML = "<p class='vacio'>" + escapeHtml(r.error === "accion_invalida"
                        ? "El material de estudio se está activando. Probá de nuevo en un rato."
                        : mensajeError(r.error)) + "</p>"
                }
                return
            }
            materialesUI = Array.isArray(r.materiales) ? r.materiales : []
            materialesCargadosEn = Date.now()
            renderizarMateriales()
        }

        function renderizarMateriales() {
            const q = normalizarTexto(buscarMaterial.value.trim())
            const materia = filtroMateria.value
            const lista = materialesUI.filter(function (m) {
                if (materia && m.materia !== materia) return false
                if (filtroTipoMaterial && m.tipo !== filtroTipoMaterial) return false
                if (q && normalizarTexto(m.titulo + " " + m.materia + " " + (m.descripcion || "")).indexOf(q) === -1) return false
                return true
            })
            const resumen = document.getElementById("resumenMaterial")
            const hayFiltro = q || materia || filtroTipoMaterial
            resumen.textContent = materialesUI.length
                ? (hayFiltro ? lista.length + (lista.length === 1 ? " resultado" : " resultados") : materialesUI.length + (materialesUI.length === 1 ? " recurso" : " recursos"))
                : ""

            if (!materialesUI.length) {
                listaMaterial.innerHTML = "<div class='materialVacio'><b>Todavía no hay material publicado</b>" +
                    "<span>¿Tenés un resumen o una guía que te sirvió? Compartilo y ayudá a los que vienen atrás.</span>" +
                    "<button type='button' class='novedadAccion' data-aportar>Aportar material</button></div>"
                return
            }
            if (!lista.length) {
                listaMaterial.innerHTML = "<div class='materialVacio'><b>No encontramos material con esos filtros</b>" +
                    "<span>Probá con otra materia o con menos palabras. Si falta algo, podés sugerirlo.</span>" +
                    "<button type='button' class='novedadAccion secundaria' data-limpiar-filtros>Ver todo</button></div>"
                return
            }
            listaMaterial.innerHTML = lista.map(function (m) {
                const descarga = enlaceDescarga(m.link)
                return "<article class='tarjetaMaterial'>" +
                    "<div class='tarjetaMaterialMeta'><span class='chipTipo tipo-" + escapeAttr(m.tipo) + "'>" + escapeHtml(TIPOS_MATERIAL[m.tipo] || "Material") + "</span>" +
                    "<span class='materiaMaterial'>" + escapeHtml(m.materia) + "</span></div>" +
                    "<h3>" + escapeHtml(m.titulo) + "</h3>" +
                    (m.descripcion ? "<p class='descMaterial'>" + escapeHtml(m.descripcion) + "</p>" : "") +
                    (m.credito ? "<p class='creditoMaterial'>Aportado por " + escapeHtml(m.credito) + "</p>" : "") +
                    "<div class='accionesMaterial'>" +
                    (descarga ? "<a class='novedadAccion' href='" + escapeAttr(descarga) + "' target='_blank' rel='noopener noreferrer'>Descargar</a>" : "") +
                    "<a class='novedadAccion secundaria' href='" + escapeAttr(m.link) + "' target='_blank' rel='noopener noreferrer'>" + (descarga ? "Ver en Drive" : "Abrir en Drive") + "</a>" +
                    (esModeradorActual ? "<button type='button' class='novedadAccion secundaria quitarMaterial' data-quitar='" + escapeAttr(m.id) + "'>Quitar</button>" : "") +
                    "</div></article>"
            }).join("")
        }

        buscarMaterial.addEventListener("input", renderizarMateriales)
        filtroMateria.addEventListener("change", renderizarMateriales)
        document.querySelectorAll(".chipTipoFiltro").forEach(function (chip) {
            chip.addEventListener("click", function () {
                filtroTipoMaterial = chip.dataset.tipo
                document.querySelectorAll(".chipTipoFiltro").forEach(function (c) { c.setAttribute("aria-pressed", String(c === chip)) })
                renderizarMateriales()
            })
        })

        listaMaterial.addEventListener("click", async function (e) {
            if (e.target.closest("[data-aportar]")) { abrirPanelAporte(); return }
            if (e.target.closest("[data-limpiar-filtros]")) {
                buscarMaterial.value = ""; filtroMateria.value = ""; filtroTipoMaterial = ""
                document.querySelectorAll(".chipTipoFiltro").forEach(function (c) { c.setAttribute("aria-pressed", String(c.dataset.tipo === "")) })
                renderizarMateriales()
                return
            }
            const quitar = e.target.closest("[data-quitar]")
            if (quitar) {
                if (!confirm("¿Quitar este material del catálogo? Deja de verse para todos.")) return
                const r = await llamarModeracion("quitarMaterial", { id: quitar.dataset.quitar })
                if (!r.ok) { alert(mensajeError(r.error)); return }
                materialesUI = materialesUI.filter(function (m) { return m.id !== quitar.dataset.quitar })
                renderizarMateriales()
                mostrarAviso("Material quitado del catálogo.")
            }
        })

        // ---- Aportes ----

        function claseAporteActual() {
            const marcado = document.querySelector("input[name='claseAporte']:checked")
            return marcado ? marcado.value : "archivo"
        }

        function actualizarFormAporte() {
            const archivo = claseAporteActual() === "archivo"
            document.getElementById("campoAporteLink").hidden = !archivo
            document.getElementById("etiquetaAporteDescripcion").textContent = archivo ? "Descripción (opcional)" : "¿Qué contenido te gustaría que sumemos?"
            document.getElementById("aporteTitulo").placeholder = archivo ? "Resumen del núcleo 7: agentes respiratorios" : "Guía de ejercicios de Bioquímica"
        }

        function abrirPanelAporte() {
            panelAporte.hidden = false
            btnAportarMaterial.setAttribute("aria-expanded", "true")
            aporteAbiertoEn = Date.now()
            document.getElementById("msgAporte").textContent = ""
            actualizarFormAporte()
            panelAporte.scrollIntoView({ behavior: "smooth", block: "start" })
            setTimeout(function () { document.getElementById("aporteTitulo").focus() }, 250)
        }

        function cerrarPanelAporte() {
            panelAporte.hidden = true
            btnAportarMaterial.setAttribute("aria-expanded", "false")
            btnAportarMaterial.focus()
        }

        btnAportarMaterial.addEventListener("click", function () {
            if (panelAporte.hidden) abrirPanelAporte()
            else cerrarPanelAporte()
        })
        document.getElementById("btnCancelarAporte").addEventListener("click", cerrarPanelAporte)
        document.querySelectorAll("input[name='claseAporte']").forEach(function (r) { r.addEventListener("change", actualizarFormAporte) })

        formAporte.addEventListener("submit", async function (e) {
            e.preventDefault()
            const msgAporte = document.getElementById("msgAporte")
            const clase = claseAporteActual()
            const datos = {
                clase: clase,
                titulo: document.getElementById("aporteTitulo").value.trim(),
                link: clase === "archivo" ? document.getElementById("aporteLink").value.trim() : "",
                materia: document.getElementById("aporteMateria").value,
                tipo: document.getElementById("aporteTipo").value,
                descripcion: document.getElementById("aporteDescripcion").value.trim(),
                mostrarCredito: document.getElementById("aporteCredito").checked,
                website: document.getElementById("aporteWebsite").value,
                ms: Date.now() - aporteAbiertoEn
            }
            if (datos.titulo.length < 3) { msgAporte.textContent = "Poné un título de al menos 3 letras."; return }
            if (clase === "archivo" && !RE_LINK_DRIVE.test(datos.link)) { msgAporte.textContent = "Pegá un enlace de Google Drive (empieza con https://drive.google.com o https://docs.google.com)."; return }
            if (clase === "sugerencia" && datos.descripcion.length < 10) { msgAporte.textContent = "Contanos un poco más qué contenido te gustaría (al menos 10 letras)."; return }

            msgAporte.textContent = "Enviando…"
            const r = await llamar("enviarAporte", datos)
            if (!r.ok) { msgAporte.textContent = mensajeError(r.error); return }
            msgAporte.textContent = ""
            formAporte.reset()
            cerrarPanelAporte()
            mostrarAviso(clase === "archivo"
                ? "¡Gracias! Un moderador lo va a revisar y te avisamos cuando esté publicado."
                : "¡Gracias por la sugerencia! Te avisamos cuando la revisemos.")
            cargarMisAportes()
        })

        async function cargarMisAportes() {
            if (!sesion) return
            const r = await llamar("misAportes", {})
            if (!r.ok) return
            misAportesCargados = true
            const aportes = Array.isArray(r.aportes) ? r.aportes : []
            document.getElementById("seccionMisAportes").hidden = aportes.length === 0
            const ESTADOS = { pendiente: "En revisión", aprobado: "Publicado", rechazado: "No publicado" }
            document.getElementById("listaMisAportes").innerHTML = aportes.map(function (a) {
                const estado = a.clase === "sugerencia" && a.estado === "aprobado" ? "Tenida en cuenta" : (ESTADOS[a.estado] || a.estado)
                return "<li><span class='novedadFilaTexto'><b>" + escapeHtml(a.titulo) + "</b>" +
                    "<span>" + (a.clase === "sugerencia" ? "Sugerencia" : "Archivo") + (a.materia ? " · " + escapeHtml(a.materia) : "") +
                    (a.estado === "rechazado" && a.motivo ? " · " + escapeHtml(a.motivo) : "") + "</span></span>" +
                    "<span class='estadoChip estado-" + escapeAttr(a.estado) + "'>" + escapeHtml(estado) + "</span></li>"
            }).join("")
        }

        // ---- Moderación de aportes ----

        const listaAportes = document.getElementById("listaAportes")
        let aportesUI = []

        async function cargarAportes() {
            if (!listaAportes) return
            listaAportes.innerHTML = esqueletoTarjetas(1)
            const r = await llamarModeracion("listarAportes", {})
            if (!r.ok) {
                listaAportes.innerHTML = "<p class='vacio'>" + escapeHtml(r.error === "accion_invalida" ? "Los aportes se están activando." : mensajeError(r.error)) + "</p>"
                return
            }
            aportesUI = Array.isArray(r.aportes) ? r.aportes : []
            renderizarAportes()
        }

        function renderizarAportes() {
            if (!aportesUI.length) { listaAportes.innerHTML = "<p class='vacio'>No hay aportes esperando revisión.</p>"; return }
            const opcionesMateria = (document.getElementById("selectMateria") || { innerHTML: "" }).innerHTML
            listaAportes.innerHTML = aportesUI.map(function (a) {
                const archivo = a.clase === "archivo"
                const idc = escapeAttr(a.id)
                return "<article class='aporteItem' data-aporte='" + idc + "'>" +
                    "<div class='tarjetaMaterialMeta'><span class='chipTipo'>" + (archivo ? "Archivo" : "Sugerencia") + "</span>" +
                    "<span class='materiaMaterial'>de " + escapeHtml(a.autor) + " · " + escapeHtml(tiempoRelativo(a.created_at)) + "</span></div>" +
                    (archivo
                        ? "<label for='apT-" + idc + "'>Título</label><input type='text' id='apT-" + idc + "' maxlength='120' value='" + escapeAttr(a.titulo) + "'>" +
                          "<label for='apM-" + idc + "'>Materia</label><select id='apM-" + idc + "'>" + opcionesMateria + "</select>" +
                          "<label for='apTi-" + idc + "'>Tipo</label><select id='apTi-" + idc + "'>" +
                          Object.keys(TIPOS_MATERIAL).map(function (t) { return "<option value='" + t + "'" + (t === a.tipo ? " selected" : "") + ">" + TIPOS_MATERIAL[t] + "</option>" }).join("") + "</select>" +
                          "<a class='linkAporte' href='" + escapeAttr(a.link) + "' target='_blank' rel='noopener noreferrer'>Abrir el enlace en Drive ↗</a>"
                        : "<h3>" + escapeHtml(a.titulo) + "</h3>" + (a.materia ? "<p class='materiaMaterial'>" + escapeHtml(a.materia) + "</p>" : "")) +
                    (a.descripcion ? "<p class='descMaterial'>" + escapeHtml(a.descripcion) + "</p>" : "") +
                    "<label for='apMo-" + idc + "'>Motivo si no se publica (opcional, lo ve quien lo mandó)</label>" +
                    "<input type='text' id='apMo-" + idc + "' maxlength='300' placeholder='Ya está publicado, el enlace no abre…'>" +
                    "<div class='accionesMaterial'>" +
                    "<button type='button' class='novedadAccion' data-decision='aprobar'>" + (archivo ? "Aprobar y publicar" : "Marcar como tenida en cuenta") + "</button>" +
                    "<button type='button' class='novedadAccion secundaria' data-decision='rechazar'>" + (archivo ? "Rechazar" : "Descartar") + "</button>" +
                    "</div></article>"
            }).join("")
            aportesUI.forEach(function (a) {
                const sel = document.getElementById("apM-" + a.id)
                if (sel) sel.value = a.materia || ""
            })
        }

        if (listaAportes) {
            listaAportes.addEventListener("click", async function (e) {
                const btn = e.target.closest("[data-decision]")
                if (!btn) return
                const item = btn.closest("[data-aporte]")
                const id = item.dataset.aporte
                const datos = { id: id, decision: btn.dataset.decision, motivo: (document.getElementById("apMo-" + id) || {}).value || "" }
                const titulo = document.getElementById("apT-" + id)
                if (titulo) {
                    datos.titulo = titulo.value.trim()
                    datos.materia = document.getElementById("apM-" + id).value
                    datos.tipo = document.getElementById("apTi-" + id).value
                    if (datos.decision === "aprobar" && !datos.materia) { alert("Elegí la materia antes de publicarlo."); return }
                }
                item.querySelectorAll("button").forEach(function (b) { b.disabled = true })
                const r = await llamarModeracion("resolverAporte", datos)
                if (!r.ok) {
                    item.querySelectorAll("button").forEach(function (b) { b.disabled = false })
                    alert(mensajeError(r.error))
                    return
                }
                aportesUI = aportesUI.filter(function (a) { return a.id !== id })
                renderizarAportes()
                mostrarAviso(r.publicado ? "Aporte publicado en Material." : datos.decision === "aprobar" ? "Sugerencia marcada como tenida en cuenta." : "Aporte rechazado. Le avisamos a quien lo mandó.")
                if (r.publicado) materialesCargadosEn = 0
            })
        }

        const formMaterialDirecto = document.getElementById("formMaterialDirecto")
        if (formMaterialDirecto) {
            formMaterialDirecto.addEventListener("submit", async function (e) {
                e.preventDefault()
                const msg = document.getElementById("msgMaterialDirecto")
                const datos = {
                    titulo: document.getElementById("materialTitulo").value.trim(),
                    link: document.getElementById("materialLink").value.trim(),
                    materia: document.getElementById("materialMateria").value,
                    tipo: document.getElementById("materialTipo").value,
                    descripcion: document.getElementById("materialDescripcion").value.trim(),
                    credito: document.getElementById("materialCredito").value.trim()
                }
                if (datos.titulo.length < 3 || !datos.materia || !RE_LINK_DRIVE.test(datos.link)) {
                    msg.textContent = "Completá título, materia y un enlace de Google Drive."
                    return
                }
                msg.textContent = "Publicando…"
                const r = await llamarModeracion("agregarMaterial", datos)
                if (!r.ok) { msg.textContent = mensajeError(r.error); return }
                msg.textContent = ""
                formMaterialDirecto.reset()
                materialesCargadosEn = 0
                mostrarAviso("Material publicado.")
            })
        }

        async function cargarRankingJuego(forzar) {
            if (!rankingModo || !sesion) return
            const modo = rankingModo.value
            const buscar = rankingBuscar.value.trim()
            if (buscar && buscar.length < 2) { rankingResultados.innerHTML = "<p class='rankingSubtitulo'>Escribí al menos 2 letras.</p>"; return }
            const clave = modo + "|" + buscar.toLowerCase()
            const cache = rankingCache.get(clave)
            if (cache) renderizarRanking(cache.data)
            if (cache && !forzar && Date.now() - cache.ts < RANKING_FRESCURA_MS) return
            if (!cache) { rankingLista.innerHTML = ""; rankingPropio.innerHTML = ""; rankingMsg.textContent = "Cargando ranking…" }

            const pedido = ++rankingPedido
            const r = await llamar("rankingJuego", { juego: JUEGO_RANKING, modo: modo, buscar: buscar || undefined, limite: 20 })
            if (pedido !== rankingPedido) return
            if (!r.ok) {
                if (!cache) rankingMsg.textContent = r.error === "modo_invalido" ? "Ese modo no tiene ranking." : r.error === "accion_invalida" ? "El ranking se está activando. Probá de nuevo en un rato." : mensajeError(r.error)
                return
            }
            rankingCache.set(clave, { ts: Date.now(), data: r })
            renderizarRanking(r)
        }

        if (rankingModo) {
            rankingModo.addEventListener("change", function () {
                try { localStorage.setItem("medmar:rankingModo", rankingModo.value) } catch (_) {}
                cargarRankingJuego(false)
            })
            document.getElementById("formRankingBuscar").addEventListener("submit", function (e) {
                e.preventDefault()
                cargarRankingJuego(false)
            })
            rankingBuscar.addEventListener("search", function () { if (!rankingBuscar.value) cargarRankingJuego(false) })
            try {
                const guardado = localStorage.getItem("medmar:rankingModo")
                if (guardado && Array.from(rankingModo.options).some(function (o) { return o.value === guardado })) rankingModo.value = guardado
            } catch (_) {}
        }

        // Al volver del juego (otra pestaña o el botón Atrás) el ranking se refresca.
        window.addEventListener("pageshow", function () { if (seccionActual === "juegos") cargarRankingJuego(true) })
        document.addEventListener("visibilitychange", function () { if (!document.hidden && seccionActual === "juegos") cargarRankingJuego(true) })

        // Enlaces desde el juego: /?vista=juegos&ranking=<modo>. Se leen una vez y se limpian de la URL.
        const parametrosIniciales = new URLSearchParams(location.search)
        let vistaInicialPedida = parametrosIniciales.get("vista") === "juegos" ? "juegos" : null
        if (vistaInicialPedida) {
            const modoPedido = parametrosIniciales.get("ranking")
            if (rankingModo && modoPedido && Array.from(rankingModo.options).some(function (o) { return o.value === modoPedido })) rankingModo.value = modoPedido
            try { history.replaceState(history.state, "", location.pathname + location.hash) } catch (_) {}
        }

        // ==================== INICIO ====================

        async function inicializarAuthSupabase() {
            mostrarLogin()
            try {
                const { data, error } = await supabaseClient.auth.getSession()
                if (error) throw error
                if (data.session) {
                    sincronizarSesionSupabase(data.session)
                    await mostrarApp()
                }
            } catch (err) {
                console.error('[MedMarUNMDP] No se pudo restaurar la sesión', err)
                mostrarLogin()
            }
        }

        inicializarAuthSupabase()

