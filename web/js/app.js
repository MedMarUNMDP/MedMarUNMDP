
        const FRONTEND_VERSION = "MedMar-frontend-2026-11-23-selectores"
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
// Dónde se muestra el chat abierto: "intercambios" (chat de un intercambio) o "clasificados" (Compra venta).
let chatVista = "intercambios"
// Rol propio según bootstrap (incluye el vencimiento del período de moderación).
let rolPropio = null
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
        const vistaClasificados = document.getElementById("vistaClasificados")
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
        // Moderadores vigentes y administradores ven las mismas opciones de moderación en el sitio.
        function puedeModerar() { return !!(esModeradorActual || esAdminActual) }
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
        // Se aplica a TODOS los <select> del sitio, también a los que se crean después (mejorarSelectsEn +
        // MutationObserver). Las opciones se leen al abrir, y los cambios por código (select.value = …, opciones
        // nuevas, form.reset()) se reflejan solos. Para dejar uno nativo: atributo data-nativo.

        // La opción con valor "" es el placeholder si el campo es obligatorio; si no, se puede elegir («Todas las materias»).
        function extraerOpciones(select) {
            const vacioElegible = !select.required

            const grupos = []
            let grupoSuelto = null

            Array.from(select.children).forEach(function (nodo) {

                if (nodo.tagName === "OPTGROUP") {

                    const items = Array.from(nodo.children)
                        .filter(function (op) { return (op.value || vacioElegible) && !op.disabled && !op.hidden })
                        .map(function (op) { return { valor: op.value, texto: op.textContent } })

                    grupos.push({ nombre: nodo.label, items })

                } else if (nodo.tagName === "OPTION") {

                    if ((!nodo.value && !vacioElegible) || nodo.disabled || nodo.hidden) return

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

            if (select.dataset.mejorado) return
            select.dataset.mejorado = "1"
            let grupos = extraerOpciones(select)
            function placeholderActual() {
                const op = select.querySelector("option[value='']")
                return op ? op.textContent : (config.placeholder || "Seleccionar")
            }

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

            if (!etiqueta && select.getAttribute("aria-label")) trigger.setAttribute("aria-label", select.getAttribute("aria-label"))

            const panel = document.createElement("div")
            panel.className = "selectorPanel"
            panel.setAttribute("role", "listbox")

            let inputBusqueda = null

            if (config.conBusqueda) {

                const contBusqueda = document.createElement("div")
                contBusqueda.className = "selectorBusqueda"

                inputBusqueda = document.createElement("input")
                inputBusqueda.type = "text"
                inputBusqueda.placeholder = config.textoBusqueda || "Buscar..."

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

                grupos = extraerOpciones(select)
                trigger.disabled = select.disabled
                let actual = null

                grupos.forEach(function (g) {
                    g.items.forEach(function (op) {
                        if (op.valor === select.value) actual = op
                    })
                })

                trigger.innerHTML = ""

                if (actual && actual.valor !== "") {
                    const texto = document.createElement("span")
                    texto.className = "selectorTexto"
                    texto.textContent = actual.texto
                    trigger.appendChild(texto)
                } else {
                    const span = document.createElement("span")
                    span.className = "placeholder selectorTexto"
                    span.textContent = actual ? actual.texto : placeholderActual()
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
                            select.dispatchEvent(new Event("change", { bubbles: true }))
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

                grupos = extraerOpciones(select)
                wrapper.classList.add("abierto")
                renderOpciones("")
                // Si no entra abajo (celular, final de la página), se abre hacia arriba.
                const caja = trigger.getBoundingClientRect()
                wrapper.classList.toggle("haciaArriba", window.innerHeight - caja.bottom < 300 && caja.top > window.innerHeight - caja.bottom)
                const marcada = contenedorOpciones.querySelector(".seleccionada")
                if (marcada) marcada.scrollIntoView({ block: "nearest" })

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

            wrapper.addEventListener("keydown", function (e) {
                if (e.key === "Escape" && wrapper.classList.contains("abierto")) { e.stopPropagation(); cerrarPanel(); trigger.focus() }
            })

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

            // Cambios por código: value/selectedIndex, opciones nuevas, reset del formulario y eventos change.
            ;["value", "selectedIndex"].forEach(function (prop) {
                const desc = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, prop)
                Object.defineProperty(select, prop, {
                    configurable: true,
                    get: function () { return desc.get.call(this) },
                    set: function (v) { desc.set.call(this, v); actualizarTrigger() }
                })
            })
            new MutationObserver(actualizarTrigger).observe(select, { childList: true, subtree: true, attributes: true, attributeFilter: ["disabled"] })
            select.addEventListener("change", actualizarTrigger)
            if (select.form) select.form.addEventListener("reset", function () { setTimeout(actualizarTrigger, 0) })

        }

        mejorarSelect(form.materia, { conBusqueda: true, placeholder: "Seleccionar materia", textoBusqueda: "Buscar materia..." })
        mejorarSelect(tengo, { placeholder: "Seleccionar comisión" })
        mejorarSelect(busco, { placeholder: "Seleccionar comisión" })

        // El resto de los <select> (formularios, filtros, moderación…), incluidos los que se agregan después.
        function mejorarSelectsEn(raiz) {
            if (!raiz || !raiz.querySelectorAll) return
            const lista = raiz.tagName === "SELECT" ? [raiz] : raiz.querySelectorAll("select")
            Array.prototype.forEach.call(lista, function (sel) {
                if (sel.dataset.mejorado || sel.hasAttribute("data-nativo") || sel.multiple) return
                // Las listas de materias se llenan después: llevan buscador aunque al principio estén vacías.
                const muchas = sel.options.length > 12 || sel.classList.contains("selectMaterias")
                mejorarSelect(sel, { conBusqueda: muchas, textoBusqueda: sel.classList.contains("selectMaterias") ? "Buscar materia..." : "Buscar..." })
            })
        }
        mejorarSelectsEn(document.body)
        new MutationObserver(function (cambios) {
            cambios.forEach(function (c) { c.addedNodes.forEach(function (n) { if (n.nodeType === 1) mejorarSelectsEn(n) }) })
        }).observe(document.body, { childList: true, subtree: true })

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
                    const vistaChat = estadoNormalizado.vista === "clasificados" ? "clasificados" : "intercambios"
                    mostrarSeccion(vistaChat, null, false)
                    if (chatAbiertoId !== estadoNormalizado.id) {
                        await abrirChat(estadoNormalizado.id, false, vistaChat)
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
                confirmacion_baja: "Escribí BORRAR para confirmar.",
                confirmacion_renuncia: "Escribí RENUNCIO para confirmar.",
                grupo_nombre: "El nombre del grupo tiene que tener entre 2 y 60 caracteres.",
                codigo_vencido: "El código venció o ya se usó.",
                fecha_invalida: "La fecha tiene que ser futura y de los próximos 3 años.",
                no_es_moderador: "Esa cuenta no es moderadora.",
                baja_admin: "La cuenta de administración no se puede eliminar desde la web. Escribinos por mail.",
                clasificado_titulo: "El título tiene que tener entre 3 y 100 caracteres.",
                clasificado_descripcion: "La descripción tiene que tener entre 10 y 1500 caracteres.",
                clasificado_propio: "Es tu propio aviso.",
                clasificados_maximo: "Ya tenés 5 avisos activos. Pausá o borrá alguno para publicar otro.",
                declaracion_clasificado: "Confirmá que lo ofrecés a título personal y que cumple las reglas.",
                encuesta_invalida: "Revisá la encuesta: la pregunta y cada opción tienen un largo máximo.",
                encuesta_opciones: "La encuesta necesita entre 2 y 6 opciones.",
                encuesta_opciones_repetidas: "Hay opciones repetidas en la encuesta.",
                encuesta_cerrada: "Esta encuesta ya cerró.",
                link_requerido: "Pegá el enlace del material.",
                link_invalido: "Ese enlace no es válido. Tiene que empezar con https:// y no puede ser un programa para descargar.",
                link_largo: "El enlace es demasiado largo. Probá copiarlo de nuevo con «Compartir».",
                sitio_no_permitido: "Ese sitio no está en la lista de sitios admitidos para material.",
                declaracion_requerida: "Confirmá que podés compartir este material.",
                cuenta_oficial: "La cuenta oficial de MedMar no se puede modificar desde la web.",
                no_quitarte_admin: "No podés quitarte el rol de administrador a vos mismo.",
                ultimo_admin: "Tiene que quedar al menos un administrador.",
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
                demasiados_enlaces: "Podés incluir hasta 10 enlaces por publicación.",
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
            const cacheKey = 'medmar:perfil:' + sesion.userId
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
            if (r.data && r.data.perfil) verificarTerminos(r.data.perfil)
        }

        // ==================== TÉRMINOS Y PRIVACIDAD ====================
        // La API guarda qué versión aceptó cada cuenta (aceptarTerminos) y la devuelve en bootstrap. Si no es la vigente:
        // quien acaba de registrarse marcando la casilla la acepta sola; el resto ve una ventana que no se puede cerrar.
        // Tiene que coincidir con TERMINOS_VERSION de la API (y con la fecha de versión de /terminos/ y /privacidad/).
        const TERMINOS_VERSION = "2026-11-23.2"
        const CLAVE_TERMINOS_REGISTRO = "medmar:terminosRegistro"
        const modalTerminos = document.getElementById("modalTerminos")
        const chkAceptoTerminos = document.getElementById("chkAceptoTerminos")
        const btnAceptarTerminos = document.getElementById("btnAceptarTerminos")
        const msgTerminos = document.getElementById("msgTerminos")

        // Cambia campos del perfil guardado en caché (bootstrap) para no mostrar datos viejos al volver a entrar.
        function actualizarPerfilEnCache(cambios) {
            if (!sesion) return
            try {
                const cacheKey = "medmar:perfil:" + sesion.userId
                const local = JSON.parse(localStorage.getItem(cacheKey) || "null")
                if (local && local.data && local.data.perfil) {
                    Object.assign(local.data.perfil, cambios)
                    localStorage.setItem(cacheKey, JSON.stringify(local))
                }
            } catch (_) {}
        }

        async function enviarAceptacionTerminos() {
            const r = await llamar("aceptarTerminos", { version: TERMINOS_VERSION })
            if (r.ok) actualizarPerfilEnCache({ terminosVersion: TERMINOS_VERSION })
            return r
        }

        // ==================== BAJA DE CUENTA (30 DÍAS PARA ARREPENTIRSE) ====================
        // solicitarBaja programa el borrado para dentro de 30 días; mientras tanto la cuenta funciona igual y un aviso
        // en todas las secciones ofrece cancelarlo (cancelarBaja). El borrado lo hace la función maintenance.
        let bajaProgramadaActual = null
        const avisoBaja = document.getElementById("avisoBaja")
        function fechaLargaBaja(iso) {
            return new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })
        }
        function renderizarEstadoBaja() {
            const pedida = !!bajaProgramadaActual
            document.getElementById("bajaSinPedir").hidden = pedida
            document.getElementById("bajaPedida").hidden = !pedida
            avisoBaja.hidden = !pedida
            if (pedida) {
                const fecha = fechaLargaBaja(bajaProgramadaActual)
                document.getElementById("textoAvisoBaja").textContent = "Tu cuenta y tus datos se van a eliminar el " + fecha + "."
                document.getElementById("textoBajaPedida").textContent = "Pediste eliminar tu cuenta. Se va a borrar el " + fecha + ". Hasta entonces podés seguir usándola y cancelar la eliminación cuando quieras."
            }
        }
        document.getElementById("btnSolicitarBaja").addEventListener("click", async function () {
            const msg = document.getElementById("msgBaja")
            const texto = document.getElementById("confirmarBaja").value.trim().toUpperCase()
            if (texto !== "BORRAR") { msg.textContent = "Escribí BORRAR para confirmar."; return }
            if (!confirm("Tu cuenta se va a eliminar en 30 días. Hasta entonces podés cancelarlo. ¿Seguir?")) return
            this.disabled = true
            msg.textContent = "Programando..."
            const r = await llamar("solicitarBaja", { confirmacion: texto })
            this.disabled = false
            if (!r.ok) { msg.textContent = mensajeError(r.error); return }
            msg.textContent = ""
            document.getElementById("confirmarBaja").value = ""
            bajaProgramadaActual = r.bajaProgramada
            actualizarPerfilEnCache({ bajaProgramada: bajaProgramadaActual })
            renderizarEstadoBaja()
            mostrarAviso("Listo: tu cuenta se elimina el " + fechaLargaBaja(bajaProgramadaActual) + ".")
        })
        document.addEventListener("click", async function (e) {
            const btn = e.target.closest("[data-cancelar-baja]")
            if (!btn) return
            btn.disabled = true
            const r = await llamar("cancelarBaja", {})
            btn.disabled = false
            if (!r.ok) { mostrarAviso(mensajeError(r.error)); return }
            bajaProgramadaActual = null
            actualizarPerfilEnCache({ bajaProgramada: null })
            renderizarEstadoBaja()
            document.getElementById("msgBaja").textContent = ""
            mostrarAviso("Cancelaste la eliminación: tu cuenta sigue activa.")
        })

        async function verificarTerminos(perfil) {
            // Sin terminosVigente la respuesta es de una API anterior (o de la caché vieja): no se pregunta nada.
            if (!sesion || !perfil || !perfil.terminosVigente) return
            if (perfil.terminosVersion === TERMINOS_VERSION) return
            let aceptadosAlRegistrarse = false
            try { aceptadosAlRegistrarse = localStorage.getItem(CLAVE_TERMINOS_REGISTRO) === TERMINOS_VERSION } catch (_) {}
            if (aceptadosAlRegistrarse) {
                const r = await enviarAceptacionTerminos()
                if (r.ok) { try { localStorage.removeItem(CLAVE_TERMINOS_REGISTRO) } catch (_) {} return }
            }
            mostrarModalTerminos()
        }

        function mostrarModalTerminos() {
            chkAceptoTerminos.checked = false
            btnAceptarTerminos.disabled = true
            msgTerminos.textContent = ""
            modalTerminos.classList.add("abierto")
            modalTerminos.style.display = "flex"
            document.body.style.overflow = "hidden"
        }
        function ocultarModalTerminos() {
            modalTerminos.classList.remove("abierto")
            modalTerminos.style.display = "none"
            if (!modalSetupPerfil.classList.contains("abierto")) document.body.style.overflow = ""
        }
        chkAceptoTerminos.addEventListener("change", function () { btnAceptarTerminos.disabled = !chkAceptoTerminos.checked })
        btnAceptarTerminos.addEventListener("click", async function () {
            if (!chkAceptoTerminos.checked) return
            btnAceptarTerminos.disabled = true
            msgTerminos.textContent = "Guardando..."
            const r = await enviarAceptacionTerminos()
            if (r.ok) { ocultarModalTerminos(); return }
            btnAceptarTerminos.disabled = false
            msgTerminos.textContent = r.error === "version_invalida"
                ? "Hay una versión nueva de los términos. Recargá la página para verla."
                : mensajeError(r.error)
        })
        document.getElementById("btnRechazarTerminos").addEventListener("click", function () {
            msgTerminos.textContent = "Sin aceptar los términos no podés usar MedMar. Si querés que borremos tu cuenta y tus datos, escribinos a MedMarUNMDP@gmail.com desde el email de la cuenta."
            setTimeout(function () { ocultarModalTerminos(); logoutBtn.click() }, 4500)
        })

        function aplicarBootstrap(data) {
            if (!data) return
            if (data.perfil) {
                inputPseudonimo.value = data.perfil.pseudonimo || ''
                fotoActual = data.perfil.foto || ''
                emailConfig.innerText = sesion.email
                actualizarAvataresEnPantalla(data.perfil.pseudonimo || 'Vos')
                if ("bajaProgramada" in data.perfil) { bajaProgramadaActual = data.perfil.bajaProgramada || null; renderizarEstadoBaja() }
            }
            solicitudesUI = Array.isArray(data.solicitudes) ? data.solicitudes.slice() : []
            intercambiosUI = Array.isArray(data.intercambios) ? data.intercambios.slice() : []
            ultimaActualizacionUsuario = Date.now()
            renderizarSolicitudes(solicitudesUI)
            renderizarIntercambios(intercambiosUI)
            esModeradorActual = !!(data.rol && data.rol.esModerador)
            esAdminActual = !!(data.rol && data.rol.esAdmin)
            rolPropio = data.rol || null
            const conPassword = cuentaTienePassword()
            ayudaSeguridadCuenta.textContent = conPassword
                ? 'Para cambiar tu contraseña, confirmá primero la actual.'
                : 'Tu cuenta entra con Google. Si querés, podés definir una contraseña para entrar también con email.'
            campoPasswordActual.style.display = conPassword ? 'block' : 'none'
            formCambiarPassword.style.display = 'block'
            btnIrModeracion.style.display = puedeModerar() ? 'inline-block' : 'none'; actualizarAccesosModeracion()
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
            btnIrModeracion.style.display = puedeModerar() ? 'inline-block' : 'none'; actualizarAccesosModeracion()
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
            const captchaReset = await tokenCaptcha('captchaReset')
            const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + window.location.pathname,
                captchaToken: captchaReset || undefined
            })
            reiniciarCaptcha('captchaReset')
            if (error) {
                msgReset.innerText = esErrorCaptcha(error) ? MENSAJE_CAPTCHA : 'No se pudo enviar el enlace. Probá de nuevo en un momento.'
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

        // ==================== CAPTCHA (CLOUDFLARE TURNSTILE) ====================
        // Supabase Auth exige un token de Turnstile en login, registro y recuperación cuando el CAPTCHA está activo
        // (Authentication → Attack Protection). Cada formulario tiene su widget; se dibuja recién cuando la persona
        // empieza a usar el formulario y el token es de un solo uso, así que se reinicia después de cada intento.
        // Si el script no carga, se sigue sin token: si el CAPTCHA está activo, Supabase lo rechaza con un error claro.

        const TURNSTILE_SITE_KEY = "0x4AAAAAAGPE99ujGdAzKcDA"
        const widgetsCaptcha = {}

        function alCargarTurnstile() {
            document.querySelectorAll("[data-captcha]").forEach(function (el) {
                const form = el.closest("form")
                if (!form) return
                form.addEventListener("focusin", function () { dibujarCaptcha(el.id) })
                if (form.contains(document.activeElement)) dibujarCaptcha(el.id)
            })
        }

        function dibujarCaptcha(id) {
            if (!window.turnstile || widgetsCaptcha[id] !== undefined) return
            const el = document.getElementById(id)
            if (!el) return
            widgetsCaptcha[id] = window.turnstile.render(el, {
                sitekey: TURNSTILE_SITE_KEY,
                language: "es",
                theme: document.body.classList.contains("temaOscuro") ? "dark" : "light",
                size: "flexible",
                action: id
            })
        }

        // Devuelve el token (esperando hasta ~12 s a que Turnstile termine) o null si no hay CAPTCHA disponible.
        async function tokenCaptcha(id) {
            if (!window.turnstile) return null
            dibujarCaptcha(id)
            const widget = widgetsCaptcha[id]
            if (widget === undefined) return null
            for (let i = 0; i < 48; i++) {
                const token = window.turnstile.getResponse(widget)
                if (token) return token
                await new Promise(function (r) { setTimeout(r, 250) })
            }
            return null
        }

        function reiniciarCaptcha(id) {
            try { if (window.turnstile && widgetsCaptcha[id] !== undefined) window.turnstile.reset(widgetsCaptcha[id]) } catch (_) {}
        }

        function esErrorCaptcha(error) {
            return !!error && /captcha/i.test(String(error.message || "") + " " + String(error.code || ""))
        }

        const MENSAJE_CAPTCHA = "No pudimos verificar que no seas un bot. Esperá a que aparezca el tilde de verificación o recargá la página."

        async function iniciarSesionConSupabase(email, password, idCaptcha) {
            const captchaToken = await tokenCaptcha(idCaptcha || "captchaLogin")
            const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password, options: captchaToken ? { captchaToken } : undefined })
            reiniciarCaptcha(idCaptcha || "captchaLogin")
            return { data, error }
        }

        formLogin.addEventListener("submit", async function (e) {
            e.preventDefault()
            authMsg.innerText = "Ingresando..."
            const email = document.getElementById("loginEmail").value.trim()
            const password = document.getElementById("loginPassword").value

            const login = await iniciarSesionConSupabase(email, password)

            if (login.error || !login.data?.session) {
                const message = login.error?.message || ''
                if (esErrorCaptcha(login.error)) { authMsg.innerText = MENSAJE_CAPTCHA; return }
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

            if (!document.getElementById("regAceptoTerminos").checked) {
                authMsg.innerText = 'Para crear la cuenta tenés que aceptar los Términos y la Política de Privacidad.'
                return
            }
            // La aceptación se guarda en la cuenta al primer ingreso (verificarTerminos), que puede ser después de confirmar el email.
            try { localStorage.setItem(CLAVE_TERMINOS_REGISTRO, TERMINOS_VERSION) } catch (_) {}

            authMsg.innerText = "Creando cuenta..."

            const captchaRegistro = await tokenCaptcha('captchaRegistro')
            const { data, error } = await supabaseClient.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: window.location.origin + window.location.pathname,
                    captchaToken: captchaRegistro || undefined
                }
            })
            reiniciarCaptcha('captchaRegistro')

            if (error && esErrorCaptcha(error)) {
                authMsg.innerText = MENSAJE_CAPTCHA
                return
            }

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
            const cacheKey = 'medmar:perfil:' + sesion.userId
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

        // Moderación: motivo opcional que le llega a quien publicó (notificación «moderacion»). null = canceló.
        function pedirMotivoModeracion(que) {
            const motivo = prompt("Vas a quitar " + que + ". Escribí el motivo para la persona que lo publicó (opcional, le llega como notificación):", "")
            return motivo === null ? null : motivo.trim().slice(0, 200)
        }

        async function borrarPublicacion(tipo, id) {

            if (!confirm("¿Seguro que querés borrar esto?")) return

            const accion = tipo === "hilo" ? "borrarHilo" : "borrarRespuesta"
            let r = await llamar(accion, { id })
            // Contenido de otra persona: el servidor pide la llave de moderación.
            if (!r.ok && r.error === "llave_requerida") {
                const motivo = pedirMotivoModeracion(tipo === "hilo" ? "esta publicación" : "esta respuesta")
                if (motivo === null) return
                r = await llamarModeracion(accion, { id, motivo })
            }
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
                    (h.encuesta ? "<span class='chipEncuesta'>📊 Encuesta</span>" : "") +
                    (h.isSensitive ? "<div class='avisoSensibleFeed'>⚠️ Contenido sensible · Abrí la publicación para visualizarlo</div>" :
                        (h.resumen ? "<p class='hiloResumen'>" + escapeHtml(quitarFormato(h.resumen)) + "</p>" : "")) +
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
            const encuesta = leerEncuestaCompose()
            if (encuesta && encuesta.error) { msgHilo.innerText = encuesta.error; return }
            if (!titulo || (!contenido && !encuesta)) { msgHilo.innerText = "Completá el título y el texto (o agregá una encuesta)."; return }
            const isSensitive = !!inputContenidoSensible.checked
            const tags = etiquetasTexto.split(",").map(function (x) { return x.trim() }).filter(Boolean).slice(0, 5)
            const tempId = "tmp-" + Date.now() + "-" + Math.random().toString(36).slice(2)
            const operacionId = (crypto && crypto.randomUUID) ? crypto.randomUUID() : ("op-" + Date.now() + "-" + Math.random().toString(36).slice(2))

            const hOptimista = {
                id: tempId,
                autor: inputPseudonimo.value || "Vos",
                autorFoto: fotoActual,
                titulo: titulo,
                resumen: (contenido || (encuesta && (encuesta.pregunta || titulo)) || "").slice(0, 180),
                encuesta: !!encuesta,
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

            const paramsHilo = {
                titulo: titulo,
                contenido: contenido,
                etiquetas: etiquetasTexto,
                isSensitive: isSensitive,
                operacionId: operacionId,
                encuesta: encuesta || undefined
            }
            const r = await llamarMutacionResiliente("crearHilo", paramsHilo, 3)

            if (r.ok) {
                hiloPublicacionEnCurso = false
                if (btnAbrirCompose) btnAbrirCompose.disabled = false
                if (btnSubmitHilo) btnSubmitHilo.disabled = false
                hilosPendientesConfirmacion.delete(tempId)
                msgHilo.innerText = ""
                formHilo.reset()
                reiniciarEncuestaCompose()
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
                    const rr = await llamarMutacionResiliente("crearHilo", paramsHilo, 2)
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

        // ==================== FORMATO DE PUBLICACIONES ====================
        // Markdown liviano para el foro: títulos (# y ##), negrita, cursiva, tachado, `código`, listas con viñetas o
        // numeradas (con un nivel de sangría), citas, cuadros destacados (> [!nota] / [!importante] / [!consejo]),
        // tablas y separadores. Se guarda como texto plano; esto solo lo dibuja. Seguridad: el texto SIEMPRE se escapa
        // primero y después se insertan etiquetas propias; nunca se pasa HTML del usuario (ver escapeHtml).

        const CUADROS_FORMATO = {
            nota: { icono: "ⓘ", titulo: "Nota" },
            importante: { icono: "!", titulo: "Importante" },
            consejo: { icono: "✓", titulo: "Consejo" }
        }
        const MAX_COLUMNAS_TABLA = 8
        const MAX_FILAS_TABLA = 60

        // Negrita, cursiva, tachado y código sobre texto YA escapado.
        function formatoEnLinea(escapado) {
            return escapado.split(/(`[^`\n]+`)/g).map(function (parte, i) {
                if (i % 2 === 1) return "<code class='mdCodigoLinea'>" + parte.slice(1, -1) + "</code>"
                return parte
                    .replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, "<strong>$1</strong>")
                    .replace(/(^|[^*\w])\*(?=\S)([^*\n]*?\S)\*(?![*\w])/g, "$1<em>$2</em>")
                    .replace(/~~(?=\S)([\s\S]*?\S)~~/g, "<s>$1</s>")
            }).join("")
        }

        // Una línea de texto: enlaces seguros (con vista previa de imágenes) + formato en línea en el resto.
        function htmlEnLineaForo(texto) {
            const raw = String(texto || '')
            const urlRegex = /https?:\/\/[^\s<>\"'|]+/gi
            let html = ''
            let last = 0
            let match
            while ((match = urlRegex.exec(raw)) !== null) {
                const original = match[0]
                const url = original.replace(/[),.;!?*~]+$/g, '')
                const suffix = original.slice(url.length)
                html += formatoEnLinea(escapeHtml(raw.slice(last, match.index)))
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
                html += formatoEnLinea(escapeHtml(suffix))
                last = match.index + original.length
            }
            html += formatoEnLinea(escapeHtml(raw.slice(last)))
            return html
        }

        // Línea separadora de una tabla (|---|:--:|). Sin regex con cuantificadores ambiguos: una línea armada a
        // propósito colgaba la pestaña varios segundos (ReDoS).
        function esSeparadorTabla(linea) {
            let t = String(linea || "").trim()
            if (!t || t.length > 600 || t.indexOf("-") < 0) return false
            if (t.charAt(0) === "|") t = t.slice(1)
            if (t.charAt(t.length - 1) === "|") t = t.slice(0, -1)
            return t.split("|").every(function (c) { return /^:?-{2,}:?$/.test(c.trim()) })
        }

        function celdasTabla(linea) {
            let s = linea.trim()
            if (s.charAt(0) === "|") s = s.slice(1)
            if (s.charAt(s.length - 1) === "|") s = s.slice(0, -1)
            return s.split("|").map(function (c) { return c.trim() }).slice(0, MAX_COLUMNAS_TABLA)
        }

        function listaFormatoHtml(items) {
            let html = ""
            const pila = []
            items.forEach(function (it) {
                const nivel = Math.min(it.nivel, pila.length)
                while (pila.length > nivel + 1) html += "</li></" + pila.pop() + ">"
                if (pila.length === nivel + 1 && pila[nivel] !== it.tipo) html += "</li></" + pila.pop() + ">"
                if (pila.length < nivel + 1) {
                    html += "<" + it.tipo + " class='mdLista'>"
                    pila.push(it.tipo)
                    html += "<li>" + htmlEnLineaForo(it.texto)
                } else {
                    html += "</li><li>" + htmlEnLineaForo(it.texto)
                }
            })
            while (pila.length) html += "</li></" + pila.pop() + ">"
            return html
        }

        function renderizarFormato(texto, profundidad) {
            profundidad = profundidad || 0
            const lineas = String(texto || "").replace(/\r\n?/g, "\n").split("\n")
            if (profundidad > 2) return "<p>" + lineas.map(htmlEnLineaForo).join("<br>") + "</p>"
            let html = ""
            let parrafo = []
            let i = 0
            function cerrarParrafo() {
                if (parrafo.length) html += "<p>" + parrafo.map(htmlEnLineaForo).join("<br>") + "</p>"
                parrafo = []
            }
            while (i < lineas.length) {
                const l = lineas[i]
                let m
                if (/^\s*```/.test(l)) {
                    cerrarParrafo()
                    const codigo = []
                    i++
                    while (i < lineas.length && !/^\s*```/.test(lineas[i])) { codigo.push(lineas[i]); i++ }
                    i++
                    html += "<pre class='mdCodigo'><code>" + escapeHtml(codigo.join("\n")) + "</code></pre>"
                    continue
                }
                if (!l.trim()) { cerrarParrafo(); i++; continue }
                if ((m = /^\s*(#{1,3})\s+(.+)$/.exec(l))) {
                    cerrarParrafo()
                    html += m[1].length === 1
                        ? "<h3 class='mdTitulo'>" + htmlEnLineaForo(m[2]) + "</h3>"
                        : "<h4 class='mdSubtitulo'>" + htmlEnLineaForo(m[2]) + "</h4>"
                    i++
                    continue
                }
                if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(l)) { cerrarParrafo(); html += "<hr class='mdSeparador'>"; i++; continue }
                if (/^\s*>/.test(l)) {
                    cerrarParrafo()
                    const bloque = []
                    while (i < lineas.length && /^\s*>/.test(lineas[i])) { bloque.push(lineas[i].replace(/^\s*>\s?/, "")); i++ }
                    const c = /^\[!(nota|importante|consejo)\]\s*(.*)$/i.exec(bloque[0] || "")
                    if (c) {
                        const tipo = c[1].toLowerCase(), info = CUADROS_FORMATO[tipo]
                        const resto = [c[2]].concat(bloque.slice(1)).join("\n").trim()
                        html += "<div class='mdCuadro mdCuadro-" + tipo + "' role='note'><span class='mdCuadroTitulo'><span class='mdCuadroIcono' aria-hidden='true'>" + info.icono + "</span>" + info.titulo + "</span>" +
                            renderizarFormato(resto, profundidad + 1) + "</div>"
                    } else {
                        html += "<blockquote class='mdCita'>" + renderizarFormato(bloque.join("\n"), profundidad + 1) + "</blockquote>"
                    }
                    continue
                }
                if (/^\s*\|/.test(l) && i + 1 < lineas.length && esSeparadorTabla(lineas[i + 1])) {
                    cerrarParrafo()
                    const cabecera = celdasTabla(l)
                    const filas = []
                    i += 2
                    while (i < lineas.length && /^\s*\|/.test(lineas[i]) && filas.length < MAX_FILAS_TABLA) { filas.push(celdasTabla(lineas[i])); i++ }
                    html += "<div class='mdTablaScroll'><table class='mdTabla'><thead><tr>" +
                        cabecera.map(function (c) { return "<th>" + htmlEnLineaForo(c) + "</th>" }).join("") + "</tr></thead><tbody>" +
                        filas.map(function (f) {
                            return "<tr>" + cabecera.map(function (_, j) { return "<td>" + htmlEnLineaForo(f[j] || "") + "</td>" }).join("") + "</tr>"
                        }).join("") + "</tbody></table></div>"
                    continue
                }
                if (/^\s*([-*•+]|\d{1,3}[.)])\s+\S/.test(l)) {
                    cerrarParrafo()
                    const items = []
                    while (i < lineas.length && (m = /^(\s*)([-*•+]|\d{1,3}[.)])\s+(.*)$/.exec(lineas[i]))) {
                        items.push({ nivel: Math.min(2, Math.floor(m[1].replace(/\t/g, "  ").length / 2)), tipo: /\d/.test(m[2]) ? "ol" : "ul", texto: m[3] })
                        i++
                    }
                    html += listaFormatoHtml(items)
                    continue
                }
                parrafo.push(l)
                i++
            }
            cerrarParrafo()
            return html
        }

        // Para resúmenes (listado, Inicio): el texto sin los símbolos de formato.
        function quitarFormato(texto) {
            return String(texto || "").split("\n").filter(function (l) { return !esSeparadorTabla(l) }).join("\n")
                .replace(/^\s*```.*$/gm, "")
                .replace(/^\s*>\s?\[!(nota|importante|consejo)\]\s*/gim, "")
                .replace(/^\s*>\s?/gm, "")
                .replace(/^\s*#{1,3}\s+/gm, "")
                .replace(/^\s*([-*•+]|\d{1,3}[.)])\s+/gm, "• ")
                .replace(/^\s*(-{3,}|\*{3,}|_{3,})\s*$/gm, "")
                .replace(/\|/g, " ")
                .replace(/\*\*|~~|`/g, "")
                .replace(/(^|[^*\w])\*(?=\S)([^*\n]*?\S)\*(?![*\w])/g, "$1$2")
                .replace(/[ \t]+/g, " ")
                .replace(/\n{2,}/g, "\n")
                .trim()
        }

        function renderizarContenidoForo(texto, sensible, id) {
            const html = renderizarFormato(texto)
            const body = "<div class='contenidoForoRich'>" + html + "</div>"
            if (!sensible) return body
            return "<div class='bloqueSensible ocultoSensible' data-sensible-id='" + escapeAttr(id) + "'><button type='button' class='revelarSensible'>⚠️ Contenido sensible · Mostrar contenido</button>" + body + "</div>"
        }

        // Cada previsualización es una invocación de la Edge Function: se limitan por publicación y se piden al verse.
        const MAX_PREVIEWS_POR_PUBLICACION = 3
        const MAX_PREVIEWS_POR_VISTA = 15

        function cuandoSeaVisible(elemento, accion) {
            if (!("IntersectionObserver" in window)) { accion(); return }
            const observador = new IntersectionObserver(function (entradas) {
                if (!entradas.some(function (e) { return e.isIntersecting })) return
                observador.disconnect()
                accion()
            }, { rootMargin: "200px" })
            observador.observe(elemento)
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
                const bloque = link.closest('.contenidoForoRich') || root
                const posicion = Array.prototype.indexOf.call(bloque.querySelectorAll('.externalImageLink[data-preview-url]'), link)
                if (posicion >= MAX_PREVIEWS_POR_PUBLICACION) return
                if (root.querySelectorAll('.externalImageLink[data-preview-requested]').length >= MAX_PREVIEWS_POR_VISTA) return
                link.dataset.previewRequested = '1'
                cuandoSeaVisible(link, function() { resolverPreview(link) })
            })
            function resolverPreview(link) {
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
            }
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

            let acciones = "<button type='button' class='accionDenunciar' data-tipo='hilo' data-id='" + escapeAttr(h.id) + "'>Denunciar</button>"

            if (h.esPropio || puedeModerar()) {
                acciones += "<button type='button' class='accionBorrar' data-tipo='hilo' data-id='" + escapeAttr(h.id) + "'>" + (h.esPropio ? "Borrar" : "Quitar (moderación)") + "</button>"
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
                // Con encuesta y sin texto propio, el contenido guardado es la pregunta: no se repite.
                // En un hilo sensible, la encuesta aparece recién al revelar el contenido.
                (h.encuesta && !h.isSensitive && String(h.contenido || "").trim() === String(h.encuesta.pregunta || "").trim() ? "" : renderizarContenidoForo(h.contenido, !!h.isSensitive, "hilo-" + h.id)) +
                (h.encuesta && !h.isSensitive ? renderizarEncuesta(h.encuesta) : "") +
                // Si es sensible, la vista previa (embed de YouTube/Spotify) se agrega recién al revelar.
                (h.isSensitive ? "" : renderizarLinkPreview(h.link)) +
                "<div class='hiloLikeBar'>" + likeButtonHtml('hilo', h.id, h.likes, h.meGusta) + "</div>" +
                "<div class='hiloAcciones'>" + acciones + "</div>"

            activarAccionesPublicacion(detalleHiloContenido)
            activarBotonLike(detalleHiloContenido)

            const btnRevelar = detalleHiloContenido.querySelector(".revelarSensible")
            if (btnRevelar && h.encuesta) {
                btnRevelar.addEventListener("click", function () {
                    const bloque = detalleHiloContenido.querySelector(".bloqueSensible")
                    if (bloque && !detalleHiloContenido.querySelector(".encuestaForo")) bloque.insertAdjacentHTML("afterend", renderizarEncuesta(hiloActualUI && hiloActualUI.encuesta || h.encuesta))
                }, { once: true })
            }
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
            if (!r._optimista && (r.esPropio || puedeModerar())) {
                acciones += "<button type='button' class='accionBorrar' data-tipo='respuesta' data-id='" + escapeAttr(r.id) + "'>" + (r.esPropio ? "Borrar" : "Quitar (moderación)") + "</button>"
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

            btnIrModeracion.style.display = puedeModerar() ? "inline-block" : "none"; actualizarAccesosModeracion()

        }

        menuInicio.addEventListener("click", function (e) {

            const btn = e.target.closest(".tarjetaInicio")
            if (!btn) return

            mostrarSeccion(btn.dataset.vista, "down")

        })

        // Accesos rápidos de la portada de Inicio.
        const portadaInicio = document.getElementById("saludoInicio")
        if (portadaInicio) portadaInicio.addEventListener("click", function (e) {
            const btn = e.target.closest("[data-accion-inicio]")
            if (!btn) return
            const accion = btn.dataset.accionInicio
            if (accion === "preguntar") {
                mostrarSeccion("foro", "up")
                btnAbrirCompose.click()
                return
            }
            mostrarSeccion(accion, "down")
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

            if (nombre === "moderacion" && !(esModeradorActual || esAdminActual)) nombre = "inicio"

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
            vistaClasificados.style.display = nombre === "clasificados" ? "block" : "none"
            vistaConfiguracion.style.display = nombre === "configuracion" ? "block" : "none"
            vistaReportes.style.display = nombre === "reportes" ? "block" : "none"
            vistaModeracion.style.display = nombre === "moderacion" ? "block" : "none"

            btnIrInicio.style.display = nombre === "inicio" ? "none" : "flex"
            // En Inicio la barra superior quedaba vacía y se veía como una cápsula de color.
            userBar.style.display = nombre === "inicio" ? "none" : "flex"
            marcarNavActiva(nombre)
            if (pieInicio) pieInicio.classList.toggle("oculto", nombre !== "inicio")

            if (nombre !== chatVista && chatAbiertoId) cerrarChat()

            if (nombre === "foro") {
                cargarForoBootstrap()
            }

            if (nombre === "juegos") cargarRankingJuego(false)
            if (nombre === "material") entrarAMaterial()
            if (nombre === "clasificados") cargarClasificados(false)

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
                    nombre === "clasificados" ? vistaClasificados :
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
                    "<div class='hiloMeta'>Denuncia sobre " + (d.tipo === "material" ? "un material" : d.tipo === "clasificado" ? "un aviso de Compra venta" : "un " + escapeHtml(d.tipo)) + " · " + formatearFecha(d.fecha) + "</div>" +
                    (d.motivo ? "<div class='hiloMeta'>Motivo: " + escapeHtml(d.motivo) + "</div>" : "") +
                    "<div class='contenidoDenunciado'>" + contenidoTexto + "</div>" +
                    autorHtml +
                    "<div class='denunciaAcciones'>" +
                    "<button type='button' class='btnDescartar'>Descartar</button>" +
                    (d.publicacion.existe ? "<button type='button' class='btnEliminarPublicacion'>" + (d.tipo === "material" ? "Quitar material" : d.tipo === "clasificado" ? "Borrar aviso" : "Eliminar publicación") + "</button>" : "") +
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

            let motivo = ""
            if (accion === "eliminar") {
                motivo = pedirMotivoModeracion("lo denunciado")
                if (motivo === null) return
            }

            const r = await llamarModeracion("resolverDenuncia", { id, decision: accion, motivo })

            if (r.ok) {
                cargarDenuncias()
            } else {
                alert(mensajeError(r.error) + (r.detalle ? "\n\nDetalle técnico: " + r.detalle : "") )
            }

        }

        // ---- Períodos de moderación: por grupo o individuales (ver migración 20261127170000) ----
        let gruposModeracion = []

        function fechaDia(iso) {
            return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Argentina/Buenos_Aires" })
        }
        // ISO → «AAAA-MM-DD» en hora de Argentina, para los <input type="date">.
        function fechaInput(iso) {
            return iso ? new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date(iso)) : ""
        }
        function opcionesPeriodo(seleccion) {
            return "<option value='sin'" + (seleccion === "sin" ? " selected" : "") + ">Sin vencimiento</option>" +
                gruposModeracion.map(function (g) {
                    return "<option value='g:" + escapeAttr(g.id) + "'" + (seleccion === "g:" + g.id ? " selected" : "") + ">Grupo «" + escapeHtml(g.nombre) + "» (vence el " + escapeHtml(fechaDia(g.fechaCorte)) + ")</option>"
                }).join("") +
                "<option value='fecha'" + (seleccion === "fecha" ? " selected" : "") + ">Fecha individual…</option>"
        }
        // Convierte la elección de un <select> de período en los parámetros de la API.
        function parametrosPeriodo(valor, fecha) {
            if (valor === "sin") return { sinVencimiento: true }
            if (valor.indexOf("g:") === 0) return { grupoId: valor.slice(2) }
            return fecha ? { fecha: fecha } : null
        }

        async function cargarModeradores() {

            const r = await llamarModeracion("listarModeradores", {})

            if (!r.ok) return

            gruposModeracion = Array.isArray(r.grupos) ? r.grupos : []
            renderizarGrupos()
            const selNuevo = document.getElementById("periodoNuevoModerador")
            selNuevo.innerHTML = opcionesPeriodo(gruposModeracion.length ? "g:" + gruposModeracion[0].id : "sin")
            renderizarModeradores(r.moderadores)

        }

        document.getElementById("periodoNuevoModerador").addEventListener("change", function () {
            document.getElementById("fechaNuevoModerador").hidden = this.value !== "fecha"
        })

        function renderizarGrupos() {
            const cont = document.getElementById("listaGrupos")
            cont.innerHTML = gruposModeracion.length ? "<ul class='listaGrupos'>" + gruposModeracion.map(function (g) {
                const vencido = new Date(g.fechaCorte) <= new Date()
                return "<li data-grupo='" + escapeAttr(g.id) + "'><span class='novedadFilaTexto'><b>" + escapeHtml(g.nombre) + "</b><span>" +
                    (vencido ? "Venció el " : "Vence el ") + escapeHtml(fechaDia(g.fechaCorte)) + " · " + g.miembros + (g.miembros === 1 ? " integrante" : " integrantes") + "</span></span>" +
                    "<input type='date' class='fechaGrupoEdit' value='" + escapeAttr(fechaInput(g.fechaCorte)) + "' aria-label='Nueva fecha de " + escapeAttr(g.nombre) + "'>" +
                    "<button type='button' class='novedadAccion' data-renovar-grupo>Guardar fecha y renovar</button>" +
                    "<button type='button' class='panelNotifAccion' data-borrar-grupo>Borrar grupo</button></li>"
            }).join("") + "</ul>" : "<p class='ayudaPerfil'>Todavía no hay grupos. Sin grupo ni fecha, los moderadores no vencen.</p>"
        }

        document.getElementById("listaGrupos").addEventListener("click", async function (e) {
            const li = e.target.closest("[data-grupo]")
            if (!li) return
            const g = gruposModeracion.find(function (x) { return x.id === li.dataset.grupo })
            if (!g) return
            if (e.target.closest("[data-renovar-grupo]")) {
                const fecha = li.querySelector(".fechaGrupoEdit").value
                if (!fecha) return
                if (!confirm("¿Renovar el grupo «" + g.nombre + "» hasta el " + fecha.split("-").reverse().join("/") + "?\n\nSus " + g.miembros + " integrantes siguen moderando hasta esa fecha. Si alguien ya no sigue, sacalo antes del grupo.")) return
                const r = await llamarModeracion("guardarGrupoModeracion", { id: g.id, nombre: g.nombre, fecha: fecha })
                if (!r.ok) { if (r.error !== "moderacion_bloqueada") alert(mensajeError(r.error)); return }
                mostrarAviso("Grupo renovado.")
                cargarModeradores()
            } else if (e.target.closest("[data-borrar-grupo]")) {
                if (!confirm("¿Borrar el grupo «" + g.nombre + "»? Sus integrantes conservan la fecha que tenían, como período individual.")) return
                const r = await llamarModeracion("borrarGrupoModeracion", { id: g.id })
                if (!r.ok) { if (r.error !== "moderacion_bloqueada") alert(mensajeError(r.error)); return }
                cargarModeradores()
            }
        })

        document.getElementById("formGrupo").addEventListener("submit", async function (e) {
            e.preventDefault()
            const msg = document.getElementById("msgGrupo")
            const r = await llamarModeracion("guardarGrupoModeracion", { nombre: document.getElementById("nombreGrupo").value.trim(), fecha: document.getElementById("fechaGrupo").value })
            if (!r.ok) { if (r.error !== "moderacion_bloqueada") msg.textContent = mensajeError(r.error); return }
            msg.textContent = ""
            this.reset()
            mostrarAviso("Grupo creado. Ahora asignale integrantes en la lista de moderadores.")
            cargarModeradores()
        })

        function renderizarModeradores(moderadores) {

            listaModeradores.innerHTML = ""

            if (moderadores.length === 0) {
                listaModeradores.innerHTML = "<p class='vacio'>Todavía no hay nadie en el equipo.</p>"
                return
            }

            moderadores.forEach(function (m) {

                const div = document.createElement("div")
                div.className = "moderadorItem"

                const etiquetaRol = m.rol === "admin" ? "Administrador" : "Moderador"
                const grupo = m.grupoId ? gruposModeracion.find(function (g) { return g.id === m.grupoId }) : null
                const seleccion = grupo ? "g:" + grupo.id : m.venceAt ? "fecha" : "sin"
                div.innerHTML =
                    "<span class='novedadFilaTexto'><b>" + escapeHtml(m.pseudonimo || m.email) + (m.vos ? " (vos)" : "") + "</b>" +
                    "<span>" + escapeHtml(m.email) +
                    (m.rol === "moderador" ? " · " + (grupo ? "grupo «" + escapeHtml(grupo.nombre) + "» · " : "") +
                        (m.vencido ? "venció el " + escapeHtml(fechaDia(m.venceAt)) : m.venceAt ? "vence el " + escapeHtml(fechaDia(m.venceAt)) : "sin vencimiento") : "") +
                    "</span></span>" +
                    "<span class='estadoChip " + (m.vencido ? "estado-rechazado" : m.rol === "admin" ? "estado-pendiente" : "estado-aprobado") + "'>" + (m.oficial ? "Cuenta oficial" : m.vencido ? "Vencido" : etiquetaRol) + "</span>" +
                    (m.rol === "moderador"
                        ? "<span class='periodoModerador'><select aria-label='Período de " + escapeAttr(m.pseudonimo || m.email) + "'>" + opcionesPeriodo(seleccion) + "</select>" +
                          "<input type='date' value='" + escapeAttr(fechaInput(m.venceAt)) + "'" + (seleccion === "fecha" ? "" : " hidden") + " aria-label='Fecha individual'>" +
                          "<button type='button' data-aplicar-periodo>Aplicar</button></span>"
                        : "") +
                    (m.oficial || m.vos ? "" : "<button type='button' data-quitar-rol>Quitar rol</button>")

                const sel = div.querySelector(".periodoModerador select")
                if (sel) sel.addEventListener("change", function () { div.querySelector(".periodoModerador input").hidden = sel.value !== "fecha" })
                const btnAplicar = div.querySelector("[data-aplicar-periodo]")
                if (btnAplicar) btnAplicar.addEventListener("click", async function () {
                    const params = parametrosPeriodo(sel.value, div.querySelector(".periodoModerador input").value)
                    if (!params) { alert("Elegí la fecha."); return }
                    const r = await llamarModeracion("asignarPeriodoModerador", Object.assign({ email: m.email }, params))
                    if (!r.ok) { if (r.error !== "moderacion_bloqueada") alert(mensajeError(r.error)); return }
                    mostrarAviso("Período actualizado.")
                    cargarModeradores()
                })

                const btnQuitar = div.querySelector("[data-quitar-rol]")
                if (btnQuitar) btnQuitar.addEventListener("click", async function () {

                    if (!confirm("¿Quitarle a " + m.email + " el rol de " + etiquetaRol.toLowerCase() + "? Sus llaves de ese rol dejan de funcionar.")) return

                    const r = await llamarModeracion("quitarModerador", { email: m.email, rol: m.rol })

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

            const rol = document.getElementById("rolNuevoModerador").value
            if (rol === "admin" && !confirm("¿Dar rol de ADMINISTRADOR a " + inputNuevoModerador.value.trim() + "?\n\nVa a poder ver el panel. Para administrar va a necesitar además una llave de administrador, que solo vos podés activar desde el SQL Editor de Supabase.")) { msgModerador.innerText = ""; return }
            const periodo = rol === "moderador" ? parametrosPeriodo(document.getElementById("periodoNuevoModerador").value, document.getElementById("fechaNuevoModerador").value) : {}
            if (!periodo) { msgModerador.innerText = "Elegí la fecha del período."; return }
            const r = await llamarModeracion("asignarModerador", Object.assign({ email: inputNuevoModerador.value.trim(), rol: rol }, periodo.sinVencimiento ? {} : periodo))

            if (r.ok) {
                msgModerador.innerText = rol === "admin"
                    ? "Listo. Esa persona crea su llave en «Mi llave» y te pasa el SQL (o la huella) para que la actives desde Supabase."
                    : "Listo. Esa persona crea su llave en «Mi llave» y te pasa la huella para que la apruebes arriba."
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
        // Preferencias del dispositivo (no de la cuenta): sobreviven al cierre de sesión.
        const CLAVES_LOCALES_DEL_DISPOSITIVO = ["medmar:tema", "medmar:rankingModo", "medmar:reportes"]
        // Lo visto en el foro (para avisar «respuestas nuevas» en Inicio) se conserva: va por id de usuario, sin email.
        // Las claves viejas que tenían el email sí se borran.
        const RE_CLAVE_FORO_POR_ID = /^medmar:(foroResumen|foroVistos):[0-9a-f-]{36}$/

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
                        if (clave && clave.indexOf("medmar:") === 0 && !CLAVES_LOCALES_DEL_DISPOSITIVO.includes(clave) && !RE_CLAVE_FORO_POR_ID.test(clave)) claves.push(clave)
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

        // ==================== ENCUESTAS DEL FORO ====================
        // Una publicación puede llevar una encuesta (API: crearHilo con `encuesta`, verHilo y votarEncuesta).
        // Anónima: solo totales. Pública: además, quién eligió cada opción.

        const btnAgregarEncuesta = document.getElementById("btnAgregarEncuesta")
        const camposEncuesta = document.getElementById("camposEncuesta")
        const encuestaOpciones = document.getElementById("encuestaOpciones")
        const MAX_OPCIONES_ENCUESTA = 6
        let encuestaEnEdicion = false // en el detalle: mostrar las opciones para cambiar el voto

        function agregarOpcionEncuesta(valor) {
            if (!encuestaOpciones || encuestaOpciones.children.length >= MAX_OPCIONES_ENCUESTA) return
            const n = encuestaOpciones.children.length + 1
            const input = document.createElement("input")
            input.type = "text"
            input.maxLength = 80
            input.className = "encuestaOpcionInput"
            input.placeholder = "Opción " + n
            input.setAttribute("aria-label", "Opción " + n)
            input.value = valor || ""
            encuestaOpciones.appendChild(input)
            const btn = document.getElementById("btnAgregarOpcion")
            if (btn) btn.hidden = encuestaOpciones.children.length >= MAX_OPCIONES_ENCUESTA
        }

        function mostrarCamposEncuesta(visible) {
            if (!camposEncuesta) return
            camposEncuesta.hidden = !visible
            btnAgregarEncuesta.hidden = visible
            btnAgregarEncuesta.setAttribute("aria-expanded", visible ? "true" : "false")
            // Con encuesta, el texto de la publicación es opcional.
            inputContenido.required = !visible
            inputContenido.placeholder = visible ? "Texto (opcional): contexto de la encuesta" : "¿Qué querés compartir?"
            if (visible && !encuestaOpciones.children.length) { agregarOpcionEncuesta(); agregarOpcionEncuesta() }
            if (visible) setTimeout(function () { document.getElementById("encuestaPregunta").focus() }, 50)
        }

        function reiniciarEncuestaCompose() {
            if (!camposEncuesta) return
            encuestaOpciones.innerHTML = ""
            document.getElementById("encuestaPregunta").value = ""
            document.getElementById("encuestaAnonima").checked = true
            document.getElementById("encuestaMultiple").checked = false
            document.getElementById("encuestaDuracion").value = "168"
            mostrarCamposEncuesta(false)
        }

        // null = sin encuesta; { error } = algo para corregir; si no, el objeto que espera la API.
        function leerEncuestaCompose() {
            if (!camposEncuesta || camposEncuesta.hidden) return null
            const opciones = Array.from(encuestaOpciones.querySelectorAll("input")).map(function (x) { return x.value.trim() }).filter(Boolean)
            if (opciones.length < 2) return { error: "La encuesta necesita al menos 2 opciones." }
            const minusculas = opciones.map(function (o) { return o.toLowerCase() })
            if (new Set(minusculas).size !== opciones.length) return { error: "Hay opciones repetidas en la encuesta." }
            return {
                pregunta: document.getElementById("encuestaPregunta").value.trim(),
                opciones: opciones,
                anonima: document.getElementById("encuestaAnonima").checked,
                multiple: document.getElementById("encuestaMultiple").checked,
                duracionHoras: Number(document.getElementById("encuestaDuracion").value)
            }
        }

        if (btnAgregarEncuesta) {
            btnAgregarEncuesta.addEventListener("click", function () { mostrarCamposEncuesta(true) })
            document.getElementById("btnQuitarEncuesta").addEventListener("click", reiniciarEncuestaCompose)
            document.getElementById("btnAgregarOpcion").addEventListener("click", function () {
                agregarOpcionEncuesta()
                const ultimo = encuestaOpciones.lastElementChild
                if (ultimo) ultimo.focus()
            })
        }

        function textoCierreEncuesta(e) {
            if (e.cerrada) return "Encuesta cerrada"
            if (!e.cierra) return "Sin fecha de cierre"
            const ms = new Date(e.cierra).getTime() - Date.now()
            const horas = Math.max(1, Math.round(ms / 3600000))
            return horas < 48 ? "Cierra en " + horas + (horas === 1 ? " hora" : " horas") : "Cierra en " + Math.round(horas / 24) + " días"
        }

        // Pregunta y opciones: formato en línea, pero sin enlaces ni imágenes (no pasan la validación de enlaces del
        // servidor y un enlace dentro del botón de voto votaría al hacerle clic).
        function textoEncuestaHtml(t) { return formatoEnLinea(escapeHtml(String(t || ""))) }

        function renderizarEncuesta(e) {
            const yaVoto = (e.misVotos || []).length > 0
            const votando = !e.cerrada && (!yaVoto || encuestaEnEdicion)
            const total = Number(e.totalVotantes || 0)
            let cuerpo = ""
            if (votando) {
                cuerpo = "<div class='encuestaOpcionesVoto' role='group' aria-label='Opciones de la encuesta'>" +
                    (e.opciones || []).map(function (o, i) {
                        const marcada = (e.misVotos || []).indexOf(i) >= 0
                        return e.multiple
                            ? "<label class='encuestaOpcionVoto'><input type='checkbox' data-opcion-multiple='" + i + "'" + (marcada ? " checked" : "") + "> <span>" + textoEncuestaHtml(o.texto) + "</span></label>"
                            : "<button type='button' class='encuestaOpcionVoto' data-votar-opcion='" + i + "'>" + textoEncuestaHtml(o.texto) + "</button>"
                    }).join("") + "</div>" +
                    (e.multiple ? "<button type='button' class='btn-primario encuestaVotar' data-votar-multiple>Votar</button>" : "") +
                    (yaVoto ? "<button type='button' class='encuestaLink' data-cancelar-cambio>Cancelar</button>" : "")
            } else {
                const max = Math.max.apply(null, (e.opciones || []).map(function (o) { return o.votos }).concat([0]))
                cuerpo = "<ul class='encuestaResultados'>" + (e.opciones || []).map(function (o, i) {
                    const pct = total ? Math.round(o.votos / total * 100) : 0
                    const mio = (e.misVotos || []).indexOf(i) >= 0
                    const quienes = !e.anonima && o.votantes && o.votantes.length
                        ? "<details class='encuestaVotantes'><summary>Ver quiénes (" + o.votos + ")</summary><p>" + o.votantes.map(escapeHtml).join(", ") + (o.votos > o.votantes.length ? " y " + (o.votos - o.votantes.length) + " más" : "") + "</p></details>"
                        : ""
                    return "<li class='encuestaResultado" + (mio ? " mio" : "") + (o.votos === max && max > 0 ? " ganadora" : "") + "'>" +
                        "<div class='encuestaBarra' style='--pct:" + pct + "%'><span class='encuestaTexto'>" + (mio ? "✓ " : "") + textoEncuestaHtml(o.texto) + "</span><span class='encuestaPct'>" + pct + "%</span></div>" +
                        quienes + "</li>"
                }).join("") + "</ul>"
            }
            const pie = total + (total === 1 ? " voto" : " votos") + " · " + (e.anonima ? "Anónima" : "Pública: se ve quién votó") +
                (e.multiple ? " · Varias respuestas" : "") + " · " + textoCierreEncuesta(e)
            return "<section class='encuestaForo' data-encuesta-id='" + escapeAttr(e.id) + "' aria-label='Encuesta'>" +
                "<h4 class='encuestaPregunta'>📊 " + textoEncuestaHtml(e.pregunta) + "</h4>" + cuerpo +
                "<p class='encuestaPie'>" + escapeHtml(pie) +
                (yaVoto && !e.cerrada && !votando ? " · <button type='button' class='encuestaLink' data-cambiar-voto>Cambiar voto</button>" : "") +
                (!yaVoto && !e.cerrada && !votando ? "" : "") + "</p>" +
                "<p class='encuestaMsg' aria-live='polite'></p></section>"
        }

        function redibujarEncuesta() {
            const actual = detalleHiloContenido.querySelector(".encuestaForo")
            if (!actual || !hiloActualUI || !hiloActualUI.encuesta) return
            actual.outerHTML = renderizarEncuesta(hiloActualUI.encuesta)
        }

        async function votarEncuestaUI(opciones) {
            const e = hiloActualUI && hiloActualUI.encuesta
            if (!e) return
            const caja = detalleHiloContenido.querySelector(".encuestaForo")
            if (caja) caja.querySelectorAll("button,input").forEach(function (b) { b.disabled = true })
            const r = await llamar("votarEncuesta", { encuestaId: e.id, opciones: opciones })
            if (!r.ok) {
                if (caja) {
                    caja.querySelectorAll("button,input").forEach(function (b) { b.disabled = false })
                    const msg = caja.querySelector(".encuestaMsg")
                    if (msg) msg.textContent = mensajeError(r.error)
                }
                return
            }
            encuestaEnEdicion = false
            hiloActualUI.encuesta = r.encuesta
            const cache = hiloCacheCliente.get(String(hiloActualUI.id))
            if (cache && cache.data && cache.data.hilo) { cache.data.hilo.encuesta = r.encuesta; cache.actualizadoEn = Date.now() }
            redibujarEncuesta()
        }

        detalleHiloContenido.addEventListener("click", function (ev) {
            const t = ev.target
            if (!t.closest(".encuestaForo")) return
            const unica = t.closest("[data-votar-opcion]")
            if (unica) { votarEncuestaUI([Number(unica.dataset.votarOpcion)]); return }
            if (t.closest("[data-votar-multiple]")) {
                const elegidas = Array.from(detalleHiloContenido.querySelectorAll("[data-opcion-multiple]:checked")).map(function (x) { return Number(x.dataset.opcionMultiple) })
                if (!elegidas.length) { const msg = detalleHiloContenido.querySelector(".encuestaMsg"); if (msg) msg.textContent = "Elegí al menos una opción."; return }
                votarEncuestaUI(elegidas)
                return
            }
            if (t.closest("[data-cambiar-voto]")) { encuestaEnEdicion = true; redibujarEncuesta(); return }
            if (t.closest("[data-cancelar-cambio]")) { encuestaEnEdicion = false; redibujarEncuesta() }
        })

        // ==================== BARRA DE FORMATO Y VISTA PREVIA ====================
        // Botones que insertan la sintaxis (no hace falta saber Markdown) y una vista previa con el mismo renderizador.

        const ACCIONES_FORMATO = [
            { id: "negrita", etiqueta: "<b>B</b>", titulo: "Negrita", envolver: ["**", "**"], ejemplo: "texto" },
            { id: "cursiva", etiqueta: "<i>I</i>", titulo: "Cursiva", envolver: ["*", "*"], ejemplo: "texto" },
            { id: "titulo", etiqueta: "T", titulo: "Título", prefijo: "# ", ejemplo: "Título" },
            { id: "subtitulo", etiqueta: "t", titulo: "Subtítulo", prefijo: "## ", ejemplo: "Subtítulo" },
            { id: "lista", etiqueta: "•", titulo: "Lista con viñetas", prefijo: "- ", ejemplo: "Elemento" },
            { id: "numerada", etiqueta: "1.", titulo: "Lista numerada", prefijo: "1. ", ejemplo: "Paso", numerar: true },
            { id: "cita", etiqueta: "❝", titulo: "Cita", prefijo: "> ", ejemplo: "Cita" },
            { id: "nota", etiqueta: "ⓘ", titulo: "Cuadro: nota", prefijo: "> [!nota] ", ejemplo: "Texto de la nota", bloque: true },
            { id: "importante", etiqueta: "!", titulo: "Cuadro: importante", prefijo: "> [!importante] ", ejemplo: "Texto importante", bloque: true },
            { id: "consejo", etiqueta: "✓", titulo: "Cuadro: consejo", prefijo: "> [!consejo] ", ejemplo: "Un consejo", bloque: true },
            { id: "tabla", etiqueta: "▦", titulo: "Tabla", insertar: "| Columna 1 | Columna 2 |\n|---|---|\n| Dato | Dato |" },
            { id: "separador", etiqueta: "―", titulo: "Separador", insertar: "---" }
        ]

        function aplicarFormato(textarea, accion) {
            const v = textarea.value, ini = textarea.selectionStart, fin = textarea.selectionEnd
            const sel = v.slice(ini, fin)
            let nuevo, selIni, selFin
            if (accion.envolver) {
                const t = sel || accion.ejemplo
                nuevo = v.slice(0, ini) + accion.envolver[0] + t + accion.envolver[1] + v.slice(fin)
                selIni = ini + accion.envolver[0].length
                selFin = selIni + t.length
            } else {
                // Las líneas seleccionadas (o la línea del cursor) reciben el prefijo; si ya tenían otro, se reemplaza.
                const inicioLinea = v.lastIndexOf("\n", ini - 1) + 1
                let finLinea = v.indexOf("\n", fin)
                if (finLinea < 0) finLinea = v.length
                const actual = v.slice(inicioLinea, finLinea)
                if (accion.insertar) {
                    // Tabla o separador: después de la línea actual, separado por una línea en blanco.
                    const pos = actual.trim() ? finLinea : inicioLinea
                    const antes = v.slice(0, pos)
                    const pre = !antes.trim() ? "" : /\n\n$/.test(antes) ? "" : /\n$/.test(antes) ? "\n" : "\n\n"
                    nuevo = antes + pre + accion.insertar + "\n" + v.slice(pos).replace(/^\n/, "")
                    selIni = (antes + pre).length
                    selFin = selIni + accion.insertar.length
                } else {
                    const limpiar = function (l) { return l.replace(/^\s*(>\s?(\[!\w+\]\s*)?|#{1,3}\s+|[-*•+]\s+|\d{1,3}[.)]\s+)/, "") }
                    const lineas = actual.trim() ? actual.split("\n") : [""]
                    const bloque = lineas.map(function (l, i) {
                        return (accion.numerar ? (i + 1) + ". " : accion.prefijo) + (limpiar(l) || accion.ejemplo)
                    }).join("\n")
                    nuevo = v.slice(0, inicioLinea) + bloque + v.slice(finLinea)
                    const prefijo = accion.numerar ? "1. " : accion.prefijo
                    selIni = inicioLinea + prefijo.length
                    selFin = lineas.length === 1 ? inicioLinea + bloque.length : selIni
                }
            }
            if (nuevo.length > (textarea.maxLength > 0 ? textarea.maxLength : 5000)) return
            textarea.value = nuevo
            textarea.focus()
            textarea.setSelectionRange(selIni, selFin)
            textarea.dispatchEvent(new Event("input", { bubbles: true }))
        }

        function montarBarraFormato(textarea, antesDe) {
            if (!textarea) return
            const barra = document.createElement("div")
            barra.className = "barraFormato"
            barra.setAttribute("role", "toolbar")
            barra.setAttribute("aria-label", "Formato del texto")
            barra.innerHTML = ACCIONES_FORMATO.map(function (a) {
                return "<button type='button' class='botonFormato' data-formato='" + a.id + "' title='" + escapeAttr(a.titulo) + "' aria-label='" + escapeAttr(a.titulo) + "'>" + a.etiqueta + "</button>"
            }).join("") +
                "<button type='button' class='botonFormato botonVistaPrevia' data-vista-previa aria-pressed='false'>Vista previa</button>"
            ;(antesDe || textarea).insertAdjacentElement("beforebegin", barra)
            const previa = document.createElement("div")
            previa.className = "vistaPreviaFormato"
            previa.hidden = true
            textarea.insertAdjacentElement("afterend", previa)
            // mousedown: el botón no le saca el foco (ni la selección) al textarea.
            barra.addEventListener("mousedown", function (e) { if (e.target.closest(".botonFormato")) e.preventDefault() })
            barra.addEventListener("click", function (e) {
                const b = e.target.closest(".botonFormato")
                if (!b) return
                if (b.hasAttribute("data-vista-previa")) {
                    const mostrando = previa.hidden
                    previa.hidden = !mostrando
                    textarea.hidden = mostrando
                    b.setAttribute("aria-pressed", mostrando ? "true" : "false")
                    b.textContent = mostrando ? "Editar" : "Vista previa"
                    barra.classList.toggle("enVistaPrevia", mostrando)
                    if (mostrando) {
                        previa.innerHTML = textarea.value.trim() ? renderizarContenidoForo(textarea.value, false, "previa") : "<p class='vacio'>Escribí algo para ver cómo queda.</p>"
                        hidratarImagenesExternas(previa)
                    } else textarea.focus()
                    return
                }
                if (!previa.hidden) return
                const accion = ACCIONES_FORMATO.find(function (a) { return a.id === b.dataset.formato })
                if (accion) aplicarFormato(textarea, accion)
            })
            // Al enviar o vaciar el formulario, vuelve al modo edición.
            const form = textarea.closest("form")
            if (form) form.addEventListener("reset", function () {
                previa.hidden = true; textarea.hidden = false
                const bp = barra.querySelector("[data-vista-previa]")
                bp.textContent = "Vista previa"; bp.setAttribute("aria-pressed", "false"); barra.classList.remove("enVistaPrevia")
            })
            form && form.addEventListener("submit", function () {
                if (!previa.hidden) barra.querySelector("[data-vista-previa]").click()
            }, true)
        }

        montarBarraFormato(inputContenido)
        montarBarraFormato(inputRespuesta, document.querySelector("#formRespuesta .respuestaComposerFila"))

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
            // Celular que llegó escaneando un QR de autorización (/?emparejar=…): se completa con la sesión y el rol listos.
            completarEmparejamientoPendiente()
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
            try { cerrarSesionModeracion(false); actualizarAccesosModeracion() } catch (_) {}
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

        // Portada de Inicio: "Buen día / Buenas tardes / Buenas noches" y la fecha de hoy.
        function saludoSegunHora() {
            const h = new Date().getHours()
            return h >= 6 && h < 13 ? "Buen día" : h >= 13 && h < 20 ? "Buenas tardes" : "Buenas noches"
        }

        function actualizarFechaInicio() {
            const el = document.getElementById("fechaInicio")
            if (!el) return
            const texto = new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })
            el.textContent = texto.charAt(0).toUpperCase() + texto.slice(1)
        }

        function actualizarAvataresEnPantalla(nombre) {

            avatarUserBar.innerHTML = avatarHtml(nombre, fotoActual, "avatarMediano")
            if (tituloSaludo) tituloSaludo.textContent = saludoSegunHora() + (nombre && nombre !== "Vos" ? ", " + nombre : "")
            actualizarFechaInicio()
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
            try { localStorage.setItem("medmar:perfil:optimista:" + sesion.userId, JSON.stringify({ pseudonimo: nuevo, foto: fotoActual })) } catch (_) {}

            const r = await llamar("actualizarPseudonimo", { pseudonimo: nuevo })
            if (r.ok) {
                inputPseudonimo.value = r.pseudonimo
                msgPerfil.innerText = ""
                mostrarAviso("Pseudónimo actualizado.")
                try {
                    const key = 'medmar:perfil:' + sesion.userId
                    const cached = JSON.parse(localStorage.getItem(key) || 'null') || { data: {} }
                    cached.data.perfil = cached.data.perfil || {}
                    cached.data.perfil.pseudonimo = r.pseudonimo
                    cached.data.perfil.foto = fotoActual
                    localStorage.setItem(key, JSON.stringify(cached))
                    localStorage.removeItem("medmar:perfil:optimista:" + sesion.userId)
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

        // El mismo panel de chat sirve para intercambios y para Compra venta: se mueve a la vista que corresponda.
        function ubicarPanelChat(vista) {
            const contenidoCV = document.getElementById("contenidoClasificados")
            if (vista === "clasificados") {
                document.getElementById("zonaChatClasificados").appendChild(panelChat)
                contenidoCV.hidden = true
                listaIntercambios.style.display = 'block'
                btnCerrarChat.textContent = '← Volver a Compra venta'
            } else {
                listaIntercambios.after(panelChat)
                contenidoCV.hidden = false
                listaIntercambios.style.display = 'none'
                btnCerrarChat.textContent = '← Volver a intercambios'
            }
        }

        async function abrirChat(conversacionId, actualizarHistorial, vista) {
            if (!conversacionId) return
            chatVista = vista === "clasificados" ? "clasificados" : "intercambios"
            if (actualizarHistorial !== false) {
                navegarHistorial(crearEstadoNavegacion(chatVista, "chat", conversacionId), false)
            }
            chatAbiertoId = conversacionId
            mensajesChatUI = []
            chatCantidadServidor = 0
            chatDatosServidorCargados = false
            ubicarPanelChat(chatVista)
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
                if (!chatAbiertoId || chatAbiertoId !== idChat || seccionActual !== chatVista) return
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
            document.getElementById("contenidoClasificados").hidden = false
            if (chatVista === "clasificados") { listaIntercambios.after(panelChat); chatVista = "intercambios"; cargarClasificados(true) }
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
            try { localStorage.removeItem("medmar:perfil:" + sesion.userId) } catch (_) {}
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
                const verificacion = await iniciarSesionConSupabase(sesion.email, actual, 'captchaPerfil')
                if (verificacion.error) {
                    msgPasswordPerfil.innerText = esErrorCaptcha(verificacion.error) ? MENSAJE_CAPTCHA : mensajeError('password_actual_incorrecta')
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
                "<span class='rankingPuntos'>" + escapeHtml(Number(f.puntaje).toLocaleString("es-AR")) + "</span>" +
                // Moderación: esconder (reversible) o anular (borra) un puntaje que parezca trampa. Piden la llave y quedan
                // en la auditoría.
                ((esModeradorActual || esAdminActual) && !f.esPropio
                    ? "<span class='rankingMod'>" +
                        "<button type='button' class='rankingQuitar' data-ocultar-puntaje='" + escapeAttr(f.pseudonimo) + "' aria-label='Esconder del ranking el puntaje de " + escapeAttr(f.pseudonimo) + "'>Esconder</button>" +
                        "<button type='button' class='rankingQuitar peligro' data-quitar-puntaje='" + escapeAttr(f.pseudonimo) + "' aria-label='Anular el puntaje de " + escapeAttr(f.pseudonimo) + "'>Anular</button>" +
                      "</span>"
                    : "") +
                "</li>"
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
            return sesion && sesion.userId ? "medmar:" + nombre + ":" + sesion.userId : null
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
            const cantidad = Math.max(0, Math.floor(Number(n.cantidad) || 0))
            const varias = cantidad > 1
            switch (n.tipo) {
                case "respuesta":
                    return varias ? "<b>" + cantidad + " respuestas nuevas</b> en " + contexto : actor + " respondió en " + contexto
                case "respuesta_a_respuesta":
                    return varias ? "<b>" + cantidad + " respuestas</b> a tu comentario en " + contexto : actor + " respondió tu comentario en " + contexto
                case "mensaje":
                    return varias
                        ? "<b>" + cantidad + " mensajes nuevos</b> de " + escapeHtml(n.actor || "tu compañero") + " · " + escapeHtml(n.contexto || "chat")
                        : actor + " te escribió · " + escapeHtml(n.contexto || "chat")
                case "intercambio":
                    return "<b>¡Encontramos un intercambio!</b> " + escapeHtml(n.contexto || "")
                case "aporte":
                    if (n.ref_id === REF_AVISO_APORTES) return "<b>" + escapeHtml(n.contexto || "Hay aportes para revisar") + "</b>" +
                        (n.cuerpo ? "<span class='notifCuerpo'>" + escapeHtml(n.cuerpo) + "</span>" : "")
                    return "<b>Tu aporte «" + escapeHtml(n.contexto || "") + "»</b>" +
                        (n.cuerpo ? "<span class='notifCuerpo'>" + escapeHtml(n.cuerpo) + "</span>" : "")
                case "moderacion":
                    return "<b>Moderación · «" + escapeHtml(n.contexto || "") + "»</b>" +
                        (n.cuerpo ? "<span class='notifCuerpo'>" + escapeHtml(n.cuerpo) + "</span>" : "")
                case "denuncia":
                case "recordatorio":
                    return "<b>" + escapeHtml(n.contexto || "") + "</b>" +
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
                // Los chats de Compra venta tienen como contexto «Compra venta · <título del aviso>».
                const vistaChat = /^Compra venta · /.test(String(n.contexto || "")) ? "clasificados" : "intercambios"
                mostrarSeccion(vistaChat, "down")
                if (n.ref_id) abrirChat(n.ref_id, true, vistaChat)
            } else if (n.tipo === "intercambio") {
                mostrarSeccion("intercambios", "down")
            } else if (n.tipo === "aporte" && n.ref_id === REF_AVISO_APORTES) {
                mostrarSeccion("moderacion", "up")
                elegirPestaniaModeracion("aportes")
            } else if (n.tipo === "aporte") {
                mostrarSeccion("material", "up")
            } else if (n.tipo === "denuncia") {
                mostrarSeccion("moderacion", "up")
                elegirPestaniaModeracion("denuncias")
            } else if ((n.tipo === "noticia" || n.tipo === "recordatorio") && n.link) {
                const vistaInterna = /^\/\?vista=(juegos|material|moderacion|foro|intercambios|clasificados|configuracion)$/.exec(n.link)
                if (vistaInterna) mostrarSeccion(vistaInterna[1], "up")
                else if (/^\/(?!\/)/.test(n.link) && n.link.indexOf("\\") < 0) location.href = n.link
                else if (/^https:\/\//i.test(n.link)) window.open(n.link, "_blank", "noopener")
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
        // * Dispositivos autorizados (ADR 0005): con el archivo se autoriza este navegador, que crea su PROPIA llave
        //   (CryptoKey NO exportable en IndexedDB, ligada a la cuenta) firmada por la del archivo. Desde ahí el
        //   desbloqueo es automático con esa cuenta. Las acciones críticas de admin piden el archivo igual.

        const LLAVE_FORMATO = "medmar-llave"
        const LLAVE_ITERACIONES = 600000
        const LLAVE_MENSAJE = "medmar-moderacion-v1|"
        const LLAVE_MENSAJE_DISPOSITIVO = "medmar-dispositivo-v1|"

        let modSesion = null        // { token, rol, expira, tipo: "archivo" | "dispositivo" }
        let modLlave = null         // { huella, privada: CryptoKey } con la que se renueva la sesión
        let modLlaveArchivo = null  // llave del archivo abierta en esta pestaña (solo en memoria)
        let modDispositivo = null   // llave de este dispositivo autorizado, si hay
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

        // Se guarda por cuenta (clave = userId): con otra cuenta en este navegador no se usa.
        async function guardarLlaveDispositivo(llave) {
            try {
                const db = await abrirBaseLlaves()
                await new Promise(function (ok, mal) {
                    const tx = db.transaction("llaves", "readwrite")
                    tx.objectStore("llaves").put({ tipo: "dispositivo", huella: llave.huella, privada: llave.privada, userId: sesion.userId, creada: Date.now() }, sesion.userId)
                    tx.oncomplete = ok; tx.onerror = function () { mal(tx.error) }
                })
            } catch (e) { console.warn("[MedMarUNMDP] No se pudo guardar la llave del dispositivo", e) }
        }

        async function leerLlaveDispositivo() {
            try {
                const db = await abrirBaseLlaves()
                const dato = await new Promise(function (ok, mal) {
                    const pedido = db.transaction("llaves", "readonly").objectStore("llaves").get(sesion.userId)
                    pedido.onsuccess = function () { ok(pedido.result) }
                    pedido.onerror = function () { mal(pedido.error) }
                })
                // Formato viejo («mantener 2 h», con la llave del archivo): se descarta.
                if (!dato || !dato.privada || dato.tipo !== "dispositivo" || dato.userId !== sesion.userId) { if (dato) borrarLlaveDispositivo(); return null }
                return { huella: dato.huella, privada: dato.privada, tipo: "dispositivo" }
            } catch (_) { return null }
        }

        async function borrarLlaveDispositivo() {
            modDispositivo = null
            try {
                const db = await abrirBaseLlaves()
                db.transaction("llaves", "readwrite").objectStore("llaves").delete(sesion.userId)
            } catch (_) {}
        }

        function nombreDispositivo() {
            const ua = navigator.userAgent || ""
            const nav = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Navegador"
            const so = /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iPhone/iPad" : /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : "otro sistema"
            return nav + " en " + so
        }

        // Autoriza este navegador: crea su llave (no exportable), la firma con la del archivo y la registra.
        async function autorizarEsteDispositivo(llaveArchivo) {
            const par = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, false, ["sign", "verify"])
            const pub = await crypto.subtle.exportKey("jwk", par.publicKey)
            const publica = { kty: "EC", crv: "P-256", x: pub.x, y: pub.y }
            const huella = await huellaLlave(publica)
            const d = await llamar("desafioModeracion", {})
            if (!d.ok) throw errorLlave(d.error)
            const firma = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, llaveArchivo.privada,
                textoUtf8.encode(LLAVE_MENSAJE_DISPOSITIVO + d.desafio + "|" + huella))
            const r = await llamar("autorizarDispositivo", {
                desafio: d.desafio, huellaArchivo: llaveArchivo.huella, firma: bytesABase64url(firma),
                publicaDispositivo: publica, nombre: nombreDispositivo()
            })
            if (!r.ok) throw errorLlave(r.error)
            modDispositivo = { huella: huella, privada: par.privateKey, tipo: "dispositivo" }
            await guardarLlaveDispositivo(modDispositivo)
            modSesion = { token: r.token, rol: r.rol, expira: Number(r.expira), tipo: "archivo" }
            modLlaveArchivo = llaveArchivo
            modLlave = modDispositivo
            actualizarEstadoModeracion()
        }

        // ---- Sesión de moderación ----
        const ERRORES_LLAVE = {
            desafio_vencido: "Se venció el desafío. Probá de nuevo.",
            firma_invalida: "La llave no coincide con la registrada en tu cuenta.",
            llave_desconocida: "Esta llave no está registrada para tu cuenta.",
            llave_pendiente: "Tu llave todavía no fue aprobada por un administrador.",
            llave_revocada: "Esta llave fue revocada. Creá una nueva en «Mi llave».",
            dispositivo_vencido: "Este dispositivo dejó de estar autorizado (60 días sin usarlo o se revocó su archivo). Autorizalo de nuevo con tu archivo.",
            no_autorizado: "Tu cuenta no tiene permiso de moderación."
        }

        function errorLlave(codigo) {
            const err = new Error(ERRORES_LLAVE[codigo] || mensajeError(codigo))
            err.codigo = codigo
            return err
        }

        async function firmarSesionModeracion(llave) {
            const d = await llamar("desafioModeracion", {})
            if (!d.ok) throw errorLlave(d.error)
            const firma = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, llave.privada, textoUtf8.encode(LLAVE_MENSAJE + d.desafio))
            const r = await llamar("abrirSesionModeracion", { desafio: d.desafio, huella: llave.huella, firma: bytesABase64url(firma) })
            if (!r.ok) throw errorLlave(r.error)
            modSesion = { token: r.token, rol: r.rol, expira: Number(r.expira), tipo: r.tipo || "archivo" }
            modLlave = llave
            if (modSesion.tipo === "archivo") modLlaveArchivo = llave
            actualizarEstadoModeracion()
        }

        // Errores que significan que la llave guardada en este dispositivo ya no sirve (no los de red).
        const ERRORES_LLAVE_INVALIDA = ["llave_revocada", "dispositivo_vencido", "llave_desconocida", "firma_invalida", "no_autorizado"]

        function sesionModeracionVigente() {
            return !!(modSesion && Date.now() < modSesion.expira - 60000)
        }

        // Devuelve true si hay sesión de moderación (renovándola en silencio si se puede) o pide desbloquear.
        // requiereArchivo: acciones críticas de admin, que solo aceptan una sesión abierta con la llave del archivo.
        async function asegurarSesionModeracion(sinPedir, requiereArchivo) {
            if (requiereArchivo) {
                if (sesionModeracionVigente() && modSesion.tipo === "archivo") return true
                if (modLlaveArchivo) {
                    try { await firmarSesionModeracion(modLlaveArchivo); return true } catch (_) { modLlaveArchivo = null }
                }
                if (sinPedir) return false
                return pedirDesbloqueo(true)
            }
            if (sesionModeracionVigente()) return true
            if (!modLlave && !modDispositivo) modDispositivo = await leerLlaveDispositivo()
            const llave = modLlave || modDispositivo
            if (llave) {
                try { await firmarSesionModeracion(llave); return true } catch (e) {
                    modLlave = null
                    if (llave.tipo === "dispositivo" && ERRORES_LLAVE_INVALIDA.indexOf(e.codigo) >= 0) {
                        borrarLlaveDispositivo()
                        if (e.codigo === "dispositivo_vencido") mostrarAviso(ERRORES_LLAVE.dispositivo_vencido)
                    } else if (llave.tipo === "dispositivo") {
                        return false   // error de red u otro: no se borra la autorización
                    }
                }
            }
            if (sinPedir) return false
            return pedirDesbloqueo(false)
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
            if (!r.ok && r.error === "archivo_requerido") {
                if (!(await asegurarSesionModeracion(false, true))) return { ok: false, error: "moderacion_bloqueada" }
                r = await llamar(accion, Object.assign({}, params, { tokenModeracion: modSesion.token }))
            }
            return r
        }

        function pedirDesbloqueo(soloArchivo) {
            const modal = document.getElementById("modalLlave")
            document.getElementById("msgDesbloqueo").textContent = ""
            document.getElementById("passLlave").value = ""
            document.getElementById("avisoArchivoRequerido").hidden = !soloArchivo
            // Si este dispositivo ya está autorizado no se ofrece autorizarlo de nuevo.
            document.getElementById("campoAutorizarDispositivo").hidden = !!modDispositivo
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
                const autorizar = !modDispositivo && document.getElementById("autorizarDispositivo").checked
                if (autorizar) await autorizarEsteDispositivo(llave)
                else await firmarSesionModeracion(llave)
                msg.textContent = ""
                terminarDesbloqueo(true)
                mostrarAviso(autorizar ? "Dispositivo autorizado: desde acá ya no te va a pedir el archivo."
                    : modSesion.rol === "admin" ? "Moderación desbloqueada como administrador." : "Moderación desbloqueada.")
                if (seccionActual === "moderacion") cargarPestaniaModeracion()
            } catch (err) {
                msg.textContent = err && err.message ? err.message : "No se pudo desbloquear."
            }
        })

        function cerrarSesionModeracion(olvidarDispositivo) {
            modSesion = null
            modLlave = null
            modLlaveArchivo = null
            if (olvidarDispositivo) borrarLlaveDispositivo()
            else modDispositivo = null   // al cerrar sesión de la cuenta: queda guardada para la próxima vez
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
                    (modSesion.rol === "admin" ? "como administrador" : "como moderador") +
                    (modDispositivo ? " · dispositivo autorizado: se desbloquea solo" : " · se renueva sola mientras uses esta pestaña (hasta las " + escapeHtml(hora) + ")")
            } else {
                estado.innerHTML = "<span class='estadoChip estado-rechazado'>Bloqueada</span> Necesitás tu llave para moderar."
            }
            document.getElementById("btnDesbloquearMod").hidden = abierta
            const btnBloquear = document.getElementById("btnBloquearMod")
            btnBloquear.hidden = !abierta && !modDispositivo
            btnBloquear.textContent = modDispositivo ? "Olvidar este dispositivo" : "Bloquear"
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
            else if (modPestania === "papelera") cargarPapelera()
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
        document.getElementById("btnBloquearMod").addEventListener("click", async function () {
            if (modDispositivo) {
                if (!confirm("¿Olvidar este dispositivo? Para volver a moderar acá vas a necesitar tu archivo de llave.")) return
                // Se revoca también en el servidor: aunque alguien copie el navegador, esa llave ya no sirve.
                const r = await llamar("misLlaves", {})
                const propia = r.ok && (r.llaves || []).find(function (l) { return l.huella === modDispositivo.huella })
                if (propia) await llamar("revocarLlave", { id: propia.id })
            }
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
            if (!modDispositivo) modDispositivo = await leerLlaveDispositivo()
            const archivos = llaves.filter(function (l) { return l.tipo !== "dispositivo" })
            const dispositivos = llaves.filter(function (l) { return l.tipo === "dispositivo" })
            const fila = function (l) {
                const esEste = modDispositivo && l.huella === modDispositivo.huella
                return "<li><span class='novedadFilaTexto'><b" + (l.tipo === "dispositivo" ? "" : " class='huella'") + ">" +
                    escapeHtml(l.tipo === "dispositivo" ? (l.nombre || "Dispositivo") + (esEste ? " (este)" : "") : l.huella) + "</b><span>" +
                    (l.tipo === "dispositivo" ? "Autorizado " + escapeHtml(tiempoRelativo(l.created_at)) : escapeHtml(l.nombre || "Sin nombre") + " · " + (l.rol === "admin" ? "Administrador" : "Moderador")) +
                    (l.ultimo_uso ? " · usado " + escapeHtml(tiempoRelativo(l.ultimo_uso)) : "") + "</span></span>" +
                    "<span class='estadoChip estado-" + (l.estado === "activa" ? "aprobado" : l.estado === "pendiente" ? "pendiente" : "rechazado") + "'>" + escapeHtml(ESTADOS_LLAVE[l.estado] || l.estado) + "</span>" +
                    "<button type='button' class='panelNotifAccion' data-revocar-propia='" + escapeAttr(l.id) + "' data-tipo-llave='" + escapeAttr(l.tipo || "archivo") + "'>Revocar</button></li>"
            }
            const estadoRol = document.getElementById("estadoRolPropio")
            if (rolPropio && rolPropio.moderadorVencido) {
                estadoRol.hidden = false
                estadoRol.textContent = "Tu rol de moderación venció el " + fechaDia(rolPropio.moderadorVence) + ". Si seguís en el equipo, pedile a un administrador que te confirme."
            } else if (rolPropio && rolPropio.moderadorVence) {
                estadoRol.hidden = false
                estadoRol.textContent = "Tu rol de moderación vale hasta el " + fechaDia(rolPropio.moderadorVence) + ". Después un administrador tiene que confirmarte para seguir."
            } else estadoRol.hidden = true
            const renuncia = "<h3>Dejar de moderar</h3><p class='ayudaPerfil'>Si ya no vas a moderar, podés dejar el rol ahora. Se revocan tus llaves y dispositivos al instante y se avisa a los administradores. Para volver, un administrador te tiene que dar el rol de nuevo.</p>" +
                "<button type='button' class='btn-secundario btnPeligro' data-renunciar>Dejar de moderar</button>"
            cont.innerHTML = (archivos.length
                ? "<h3>Tus archivos de llave</h3><ul class='listaLlaves'>" + archivos.map(fila).join("") + "</ul>"
                : "<p class='ayudaPerfil'>Todavía no tenés ninguna llave.</p>") +
                "<h3>Dispositivos autorizados</h3>" + (dispositivos.length
                    ? "<p class='ayudaPerfil'>En estos navegadores moderás sin el archivo. Si no reconocés alguno, revocalo y cambiá tu contraseña.</p><ul class='listaLlaves'>" + dispositivos.map(fila).join("") + "</ul>"
                    : "<p class='ayudaPerfil'>Ninguno todavía. Al desbloquear con tu archivo podés autorizar el dispositivo para no tener que usarlo cada vez.</p>") +
                ((esModeradorActual || esAdminActual || (rolPropio && rolPropio.moderadorVencido)) ? renuncia : "")
        }

        document.getElementById("misLlaves").addEventListener("click", async function (e) {
            if (e.target.closest("[data-renunciar]")) {
                const texto = prompt("Vas a dejar tu rol de " + (esAdminActual ? "administrador" : "moderador") + " ahora mismo. Para confirmar, escribí RENUNCIO:")
                if (texto === null) return
                const r = await llamar("renunciarModeracion", { confirmacion: texto })
                if (!r.ok) { alert(mensajeError(r.error)); return }
                esModeradorActual = false
                esAdminActual = false
                rolPropio = null
                cerrarSesionModeracion(true)
                actualizarAccesosModeracion()
                try { localStorage.removeItem("medmar:perfil:" + sesion.userId) } catch (_) {}
                mostrarSeccion("inicio", "up")
                mostrarAviso("Dejaste la moderación. ¡Gracias por tu tiempo!")
                return
            }
            const btn = e.target.closest("[data-revocar-propia]")
            if (!btn) return
            const esDispositivo = btn.dataset.tipoLlave === "dispositivo"
            if (!confirm(esDispositivo ? "¿Revocar este dispositivo? Ahí ya no se va a poder moderar sin el archivo."
                : "¿Revocar esta llave? Ya no vas a poder moderar con ese archivo, y se revocan los dispositivos que autorizó.")) return
            const r = await llamar("revocarLlave", { id: btn.dataset.revocarPropia })
            if (!r.ok) { alert(mensajeError(r.error)); return }
            cerrarSesionModeracion(true)
            cargarMisLlaves()
            mostrarAviso(esDispositivo ? "Dispositivo revocado." : "Llave revocada.")
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
                    (l.rol === "admin" ? "Administrador" : "Moderador") + (l.tipo === "dispositivo" ? " · dispositivo" : " · archivo") + (l.nombre ? " · " + escapeHtml(l.nombre) : "") +
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

        // ---- Papelera (7 días para restaurar lo que quitó la moderación) ----
        const TIPOS_PAPELERA = { hilo: "Publicación del foro", respuesta: "Respuesta del foro", material: "Material", clasificado: "Aviso de Compra venta" }
        async function cargarPapelera() {
            const cont = document.getElementById("listaPapelera")
            cont.innerHTML = esqueletoTarjetas(1)
            const r = await llamarModeracion("listarPapelera", {})
            if (!r.ok) { cont.innerHTML = "<p class='vacio'>" + escapeHtml(mensajeError(r.error)) + "</p>"; return }
            const items = r.papelera || []
            cont.innerHTML = items.length ? items.map(function (i) {
                const dias = Math.max(0, Math.ceil((new Date(i.borraAt) - Date.now()) / 86400000))
                return "<article class='aporteItem itemPapelera'>" +
                    "<div class='tarjetaMaterialMeta'><span class='chipTipo'>" + escapeHtml(TIPOS_PAPELERA[i.tipo] || i.tipo) + "</span>" +
                    "<span class='materiaMaterial'>" + (i.autor ? "de " + escapeHtml(i.autor) + " · " : "") + "quitado por " + escapeHtml(i.quitadoPor) + " " + escapeHtml(tiempoRelativo(i.quitadoAt)) + "</span></div>" +
                    "<h3>" + escapeHtml(i.titulo) + "</h3>" +
                    (i.detalle ? "<p class='descMaterial'>" + escapeHtml(i.detalle) + "</p>" : "") +
                    (i.motivo ? "<p class='dominioAporte'>Motivo: " + escapeHtml(i.motivo) + "</p>" : "") +
                    "<p class='dominioAporte'>Se borra definitivamente " + (dias <= 1 ? "en menos de un día" : "en " + dias + " días") + ".</p>" +
                    "<div class='accionesMaterial'><button type='button' class='novedadAccion' data-restaurar='" + escapeAttr(i.id) + "' data-tipo='" + escapeAttr(i.tipo) + "'>Restaurar</button></div>" +
                    "</article>"
            }).join("") : "<p class='vacio'>La papelera está vacía.</p>"
        }
        document.getElementById("listaPapelera").addEventListener("click", async function (e) {
            const btn = e.target.closest("[data-restaurar]")
            if (!btn) return
            if (!confirm("¿Restaurar? Vuelve a verse para todos y se le avisa a quien lo publicó.")) return
            btn.disabled = true
            const r = await llamarModeracion("restaurarPapelera", { tipo: btn.dataset.tipo, id: btn.dataset.restaurar })
            if (!r.ok) { btn.disabled = false; alert(mensajeError(r.error)); return }
            mostrarAviso("Restaurado.")
            invalidarCacheForo()
            materialesCargadosEn = 0
            clasificadosCargadosEn = 0
            cargarPapelera()
        })

        // ---- Autorizar un celular con QR (desde un dispositivo con la moderación desbloqueada) ----
        let temporizadorQR = null
        function cargarLibreriaQR() {
            if (window.qrcode) return Promise.resolve()
            return new Promise(function (ok, mal) {
                const s = document.createElement("script")
                s.src = "/js/vendor/qrcode-generator-1.4.4.js"
                s.onload = ok; s.onerror = function () { mal(new Error("No se pudo cargar el generador de QR.")) }
                document.head.appendChild(s)
            })
        }
        document.getElementById("btnGenerarQR").addEventListener("click", async function () {
            const caja = document.getElementById("cajaQR"), estado = document.getElementById("estadoQR")
            const r = await llamarModeracion("crearEmparejamiento", {})
            if (!r.ok) { if (r.error !== "moderacion_bloqueada") alert(mensajeError(r.error)); return }
            try { await cargarLibreriaQR() } catch (err) { alert(err.message); return }
            const enlace = location.origin + "/?emparejar=" + encodeURIComponent(r.codigo)
            const qr = window.qrcode(0, "M")
            qr.addData(enlace)
            qr.make()
            // El SVG lo arma la librería con datos propios (no hay texto de usuarios).
            document.getElementById("imagenQR").innerHTML = qr.createSvgTag(6, 12)
            document.getElementById("enlaceQR").textContent = enlace
            caja.hidden = false
            const inicio = Date.now(), vence = new Date(r.expira).getTime()
            clearInterval(temporizadorQR)
            let revisando = false
            temporizadorQR = setInterval(async function () {
                const quedan = Math.max(0, Math.round((vence - Date.now()) / 1000))
                if (!quedan) {
                    clearInterval(temporizadorQR)
                    estado.textContent = "El código venció. Generá otro si lo necesitás."
                    document.getElementById("imagenQR").innerHTML = ""
                    return
                }
                estado.textContent = "Escanealo con el celular · vence en " + Math.floor(quedan / 60) + ":" + String(quedan % 60).padStart(2, "0")
                // Cada 5 s se mira si apareció el dispositivo nuevo.
                if (revisando || (Date.now() - inicio) % 5000 > 1000) return
                revisando = true
                const l = await llamar("misLlaves", {})
                revisando = false
                const nuevo = l.ok && (l.llaves || []).find(function (x) { return x.tipo === "dispositivo" && new Date(x.created_at).getTime() >= inicio - 5000 })
                if (nuevo) {
                    clearInterval(temporizadorQR)
                    document.getElementById("imagenQR").innerHTML = ""
                    estado.textContent = "¡Listo! «" + nuevo.nombre + "» quedó autorizado."
                    cargarMisLlaves()
                }
            }, 1000)
        })

        // El celular abre /?emparejar=<código>: se guarda hasta tener la sesión y el rol, y se completa ahí.
        const CLAVE_EMPAREJAR = "medmar:emparejar"
        ;(function () {
            const codigo = new URLSearchParams(location.search).get("emparejar")
            if (!codigo) return
            try { sessionStorage.setItem(CLAVE_EMPAREJAR, codigo) } catch (_) {}
            try { history.replaceState(history.state, "", location.pathname + location.hash) } catch (_) {}
        })()

        async function completarEmparejamientoPendiente() {
            let codigo = null
            try { codigo = sessionStorage.getItem(CLAVE_EMPAREJAR) } catch (_) {}
            if (!codigo || !sesion) return
            try { sessionStorage.removeItem(CLAVE_EMPAREJAR) } catch (_) {}
            if (!puedeModerar()) { alert("Esta cuenta no tiene rol de moderación. Iniciá sesión con la misma cuenta que en el otro dispositivo y escaneá de nuevo."); return }
            if (!confirm("¿Autorizar este dispositivo para moderar con tu cuenta? Hacelo solo si vos generaste el código en tu otro dispositivo.")) return
            try {
                const par = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, false, ["sign", "verify"])
                const pub = await crypto.subtle.exportKey("jwk", par.publicKey)
                const publica = { kty: "EC", crv: "P-256", x: pub.x, y: pub.y }
                const r = await llamar("completarEmparejamiento", { codigo: codigo, publicaDispositivo: publica, nombre: nombreDispositivo() })
                if (!r.ok) { alert(r.error === "codigo_vencido" ? "El código venció o ya se usó. Generá otro en tu dispositivo autorizado." : (ERRORES_LLAVE[r.error] || mensajeError(r.error))); return }
                modDispositivo = { huella: await huellaLlave(publica), privada: par.privateKey, tipo: "dispositivo" }
                await guardarLlaveDispositivo(modDispositivo)
                modSesion = { token: r.token, rol: r.rol, expira: Number(r.expira), tipo: "dispositivo" }
                modLlave = modDispositivo
                mostrarAviso("Este dispositivo quedó autorizado para moderar.")
                mostrarSeccion("moderacion", "up")
            } catch (err) {
                console.error(err)
                alert("No se pudo autorizar este dispositivo.")
            }
        }

        // ---- Registro de auditoría (admin) ----
        const ACCIONES_REGISTRO = {
            abrir_sesion: "desbloqueó la moderación", firma_invalida: "intentó desbloquear con una firma inválida",
            registrar_llave: "registró una llave", aprobar_llave: "aprobó una llave", revocar_llave: "revocó una llave",
            borrar_hilo: "borró una publicación", borrar_respuesta: "borró una respuesta", resolver_denuncia: "resolvió una denuncia",
            resolver_aporte: "resolvió un aporte", agregar_material: "agregó material", quitar_material: "quitó material",
            publicar_noticia: "publicó una noticia", asignar_moderador: "dio rol de moderador", quitar_moderador: "quitó un moderador",
            asignar_admin: "dio rol de administrador", quitar_admin: "quitó un administrador",
            quitar_puntaje: "anuló un puntaje del ranking",
            ocultar_puntaje: "escondió un puntaje del ranking",
            mostrar_puntaje: "volvió a mostrar un puntaje del ranking",
            autorizar_dispositivo: "autorizó un dispositivo para moderar", revocar_dispositivo: "revocó un dispositivo",
            dispositivo_vencido: "tenía un dispositivo vencido (se revocó solo)",
            guardar_grupo: "creó o renovó un grupo de moderación", borrar_grupo: "borró un grupo de moderación",
            periodo_moderador: "cambió el período de un moderador", restaurar: "restauró algo de la papelera",
            crear_emparejamiento: "generó un QR para autorizar un celular",
            renunciar_moderacion: "dejó la moderación", quitar_clasificado: "quitó un aviso de Compra venta"
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
        // Catálogo de enlaces a sitios admitidos (Drive, Canva, Notion, YouTube, revistas…). Se pide al entrar (máx. 1
        // vez cada 5 min) y se filtra en el cliente. La lista de sitios la manda la API con el catálogo (única fuente:
        // SITIOS_MATERIAL en supabase/functions/api); la web la usa para avisar antes de enviar y para los nombres.

        const TIPOS_MATERIAL = {
            resumen: "Resumen", apunte: "Apunte", guia: "Guía", presentacion: "Presentación", video: "Video",
            flashcards: "Tarjetas", mapa: "Mapa conceptual", web: "Sitio web", examen: "Examen", libro: "Libro", otro: "Otro"
        }
        const MATERIAL_FRESCURA_MS = 5 * 60 * 1000
        // Mismo ref_id que usa la API para el aviso agrupado de aportes a moderadores.
        const REF_AVISO_APORTES = "00000000-0000-4000-8000-00000a9047e5"
        let sitiosMaterial = []

        // Sitio admitido de un enlace (el dominio más largo que coincide), o null.
        function sitioDeEnlace(link) {
            let host
            try { const u = new URL(String(link || "")); if (u.protocol !== "https:") return null; host = u.hostname.toLowerCase() } catch (_) { return null }
            let mejor = null
            sitiosMaterial.forEach(function (s) {
                if ((host === s.dominio || host.slice(-(s.dominio.length + 1)) === "." + s.dominio) && (!mejor || s.dominio.length > mejor.dominio.length)) mejor = s
            })
            return mejor
        }

        // Chequeo previo al envío (el servidor valida igual). "" si está bien; si no, el mensaje.
        function problemaEnlaceMaterial(link) {
            if (!/^https:\/\/\S+$/i.test(link)) return "Pegá un enlace que empiece con https://"
            if (sitiosMaterial.length && !sitioDeEnlace(link)) return "Ese sitio no está en la lista de sitios admitidos. Mirá «Ver todos los sitios admitidos»."
            return ""
        }

        function renderizarSitiosAdmitidos() {
            const cont = document.getElementById("listaSitiosAdmitidos")
            if (!cont || !sitiosMaterial.length) return
            const grupos = {}
            sitiosMaterial.forEach(function (s) {
                grupos[s.categoria] = grupos[s.categoria] || []
                if (grupos[s.categoria].indexOf(s.nombre) < 0) grupos[s.categoria].push(s.nombre)
            })
            cont.innerHTML = Object.keys(grupos).map(function (c) {
                return "<p class='sitiosGrupo'><b>" + escapeHtml(c) + ":</b> " + grupos[c].map(escapeHtml).join(", ") + "</p>"
            }).join("") + "<p class='ayudaPerfil'>¿Falta un sitio que usás para estudiar? Mandalo como «Sugerir contenido».</p>"
        }

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
            if (Array.isArray(r.sitios) && r.sitios.length) { sitiosMaterial = r.sitios; renderizarSitiosAdmitidos() }
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
                const sitio = sitioDeEnlace(m.link)
                // Para dominios genéricos (.gob.ar, .edu.ar) se muestra el sitio real: «argentina.gob.ar».
                const nombreSitio = !sitio ? "el sitio" : (sitio.dominio === "gob.ar" || sitio.dominio === "edu.ar")
                    ? (function () { try { return new URL(m.link).hostname.replace(/^www\./, "") } catch (_) { return sitio.dominio } })()
                    : sitio.nombre.replace(/ \(.*\)$/, "")
                return "<article class='tarjetaMaterial'>" +
                    "<div class='tarjetaMaterialMeta'><span class='chipTipo tipo-" + escapeAttr(m.tipo) + "'>" + escapeHtml(TIPOS_MATERIAL[m.tipo] || "Material") + "</span>" +
                    "<span class='materiaMaterial'>" + escapeHtml(m.materia) + "</span>" +
                    (sitio ? "<span class='chipSitio'>" + escapeHtml(nombreSitio) + "</span>" : "") + "</div>" +
                    "<h3>" + escapeHtml(m.titulo) + "</h3>" +
                    (m.descripcion ? "<p class='descMaterial'>" + escapeHtml(m.descripcion) + "</p>" : "") +
                    (m.credito ? "<p class='creditoMaterial'>Aportado por " + escapeHtml(m.credito) + "</p>" : "") +
                    (sitio && sitio.libre ? "<p class='avisoExterno'>Página externa: MedMar no la controla y puede cambiar. Nunca pongas tu contraseña ahí.</p>" : "") +
                    "<div class='accionesMaterial'>" +
                    (descarga ? "<a class='novedadAccion' href='" + escapeAttr(descarga) + "' target='_blank' rel='noopener noreferrer'>Descargar</a>" : "") +
                    "<a class='novedadAccion" + (descarga ? " secundaria" : "") + "' href='" + escapeAttr(m.link) + "' target='_blank' rel='noopener noreferrer'>" + (descarga ? "Ver en " : "Abrir en ") + escapeHtml(nombreSitio) + "</a>" +
                    (puedeModerar() ? "<button type='button' class='novedadAccion secundaria quitarMaterial' data-quitar='" + escapeAttr(m.id) + "'>Quitar</button>" : "") +
                    "<button type='button' class='denunciarMaterial' data-denunciar-material='" + escapeAttr(m.id) + "'>Reportar</button>" +
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
            const reportar = e.target.closest("[data-denunciar-material]")
            if (reportar) {
                const motivo = prompt("¿Qué pasa con este material? (por ejemplo: el enlace no abre, no es de esa materia, tiene derechos de autor o datos de pacientes)")
                if (motivo === null) return
                const r = await llamar("denunciar", { tipo: "material", id: reportar.dataset.denunciarMaterial, motivo: motivo })
                mostrarAviso(r.ok ? "Gracias, un moderador lo va a revisar." : mensajeError(r.error))
                return
            }
            const quitar = e.target.closest("[data-quitar]")
            if (quitar) {
                const motivo = pedirMotivoModeracion("este material del catálogo (deja de verse para todos)")
                if (motivo === null) return
                const r = await llamarModeracion("quitarMaterial", { id: quitar.dataset.quitar, motivo })
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
            document.getElementById("campoAporteDeclaracion").hidden = !archivo
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
        document.getElementById("aporteLink").addEventListener("input", function () {
            const v = this.value.trim(), out = document.getElementById("aporteSitio")
            if (!v) { out.textContent = ""; out.className = "aporteSitio"; return }
            const sitio = sitioDeEnlace(v), problema = problemaEnlaceMaterial(v)
            out.className = "aporteSitio" + (problema ? " mal" : " bien")
            out.textContent = problema || ("✓ " + (sitio ? sitio.nombre : "Enlace") + ". Revisá que esté compartido como público.")
        })

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
                ms: Date.now() - aporteAbiertoEn,
                declaracion: document.getElementById("aporteDeclaracion").checked
            }
            if (datos.titulo.length < 3) { msgAporte.textContent = "Poné un título de al menos 3 letras."; return }
            if (clase === "archivo") {
                const problema = problemaEnlaceMaterial(datos.link)
                if (problema) { msgAporte.textContent = problema; return }
                if (!datos.declaracion) { msgAporte.textContent = mensajeError("declaracion_requerida"); return }
            }
            if (clase === "sugerencia" && datos.descripcion.length < 10) { msgAporte.textContent = "Contanos un poco más qué contenido te gustaría (al menos 10 letras)."; return }

            msgAporte.textContent = "Enviando…"
            const r = await llamar("enviarAporte", datos)
            if (!r.ok) { msgAporte.textContent = mensajeError(r.error) + (r.error === "sitio_no_permitido" && r.dominio ? " (" + r.dominio + ")" : ""); return }
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
                          "<p class='etiquetaLinkAporte'>Enlace" + (a.sitio ? " (" + escapeHtml(a.sitio) + ")" : "") + ":</p>" +
                          "<a class='linkAporte linkAporteCompleto' href='" + escapeAttr(a.link) + "' target='_blank' rel='noopener noreferrer'>" + escapeHtml(a.link) + " ↗</a>" +
                          "<p class='dominioAporte'>Dominio: <b>" + escapeHtml(a.dominio || "") + "</b>. Revisá que abra, que sea público y que sea material de estudio legal.</p>" +
                          (a.libre ? "<p class='dominioAporte avisoExterno'>Es una página que cualquiera puede crear y cambiar después de aprobada: aprobala solo si confiás en el contenido y en quien la manda.</p>" : "")
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
                const problemaLink = problemaEnlaceMaterial(datos.link)
                if (datos.titulo.length < 3 || !datos.materia || problemaLink) {
                    msg.textContent = problemaLink || "Completá título y materia."
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
            actualizarModeracionRanking()
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

        // ---- Moderación del ranking: esconder (reversible), mostrar de nuevo y anular (borra) ----

        const rankingOcultos = document.getElementById("rankingOcultos")

        function actualizarModeracionRanking() {
            const caja = document.getElementById("rankingModeracion")
            if (caja) caja.hidden = !(esModeradorActual || esAdminActual)
        }

        async function cargarPuntajesOcultos() {
            if (!rankingOcultos) return
            rankingOcultos.innerHTML = "<p class='rankingSubtitulo'>Cargando…</p>"
            const modo = rankingModo.value
            const r = await llamarModeracion("puntajesOcultos", { juego: JUEGO_RANKING, modo: modo })
            if (!r.ok) { rankingOcultos.innerHTML = "<p class='rankingSubtitulo'>" + escapeHtml(mensajeError(r.error)) + "</p>"; return }
            const ocultos = Array.isArray(r.ocultos) ? r.ocultos : []
            rankingOcultos.innerHTML = ocultos.length
                ? "<ul class='rankingOcultosLista'>" + ocultos.map(function (o) {
                    const ritmo = o.segundos > 0 ? (Number(o.kills) / o.segundos).toFixed(1) : "0"
                    return "<li><span><b>" + escapeHtml(o.pseudonimo) + "</b> · " + escapeHtml(Number(o.puntaje).toLocaleString("es-AR")) + " pts · " +
                        escapeHtml(formatearDuracion(o.segundos)) + " · " + escapeHtml(ritmo) + " elim./s</span>" +
                        "<span class='rankingMod'><button type='button' class='rankingQuitar' data-mostrar-puntaje='" + escapeAttr(o.pseudonimo) + "'>Mostrar</button>" +
                        "<button type='button' class='rankingQuitar peligro' data-quitar-puntaje='" + escapeAttr(o.pseudonimo) + "'>Anular</button></span></li>"
                }).join("") + "</ul>"
                : "<p class='rankingSubtitulo'>No hay puntajes escondidos en " + escapeHtml(etiquetaModoRanking(modo)) + ".</p>"
        }

        async function moderarPuntajeRanking(e) {
            const boton = e.target.closest("[data-quitar-puntaje],[data-ocultar-puntaje],[data-mostrar-puntaje]")
            if (!boton) return
            const modo = rankingModo.value
            const d = boton.dataset
            let accion, params, aviso
            if (d.quitarPuntaje !== undefined) {
                if (!confirm("¿Anular el puntaje de " + d.quitarPuntaje + " en " + etiquetaModoRanking(modo) + "?\n\nSe borra y no se puede deshacer (si querés poder revertirlo, usá Esconder). Queda en el registro de moderación.")) return
                accion = "quitarPuntaje"; params = { pseudonimo: d.quitarPuntaje }; aviso = "Puntaje anulado."
            } else if (d.ocultarPuntaje !== undefined) {
                accion = "ocultarPuntaje"; params = { pseudonimo: d.ocultarPuntaje, oculto: true }; aviso = "Puntaje escondido. Lo podés volver a mostrar desde «Puntajes escondidos»."
            } else {
                accion = "ocultarPuntaje"; params = { pseudonimo: d.mostrarPuntaje, oculto: false }; aviso = "Puntaje visible de nuevo."
            }
            boton.disabled = true
            const r = await llamarModeracion(accion, Object.assign({ juego: JUEGO_RANKING, modo: modo }, params))
            if (!r.ok) { boton.disabled = false; mostrarAviso(mensajeError(r.error)); return }
            mostrarAviso(aviso)
            rankingCache.clear()
            cargarRankingJuego(true)
            if (rankingOcultos && rankingOcultos.innerHTML) cargarPuntajesOcultos()
        }

        if (rankingLista) rankingLista.addEventListener("click", moderarPuntajeRanking)
        if (rankingResultados) rankingResultados.addEventListener("click", moderarPuntajeRanking)
        if (rankingOcultos) rankingOcultos.addEventListener("click", moderarPuntajeRanking)
        // Estadísticas para moderadores: ritmo de eliminaciones típico por duración y el detalle de los mejores
        // puntajes, con los fuera de lo común marcados. No hay tope automático: esto ayuda a decidir a mano.
        const rankingEstadisticas = document.getElementById("rankingEstadisticas")

        function numeroCorto(n, dec) {
            return n === null || n === undefined ? "—" : Number(n).toLocaleString("es-AR", { maximumFractionDigits: dec === undefined ? 2 : dec })
        }

        async function cargarEstadisticasRanking() {
            if (!rankingEstadisticas) return
            rankingEstadisticas.innerHTML = "<p class='rankingSubtitulo'>Calculando…</p>"
            const modo = rankingModo.value
            const r = await llamarModeracion("estadisticasRanking", { juego: JUEGO_RANKING, modo: modo })
            if (!r.ok) { rankingEstadisticas.innerHTML = "<p class='rankingSubtitulo'>" + escapeHtml(mensajeError(r.error)) + "</p>"; return }
            const g = r.general || {}
            const tramos = (r.tramos || []).filter(function (t) { return t.partidas > 0 })
            const resumen = "<p class='rankingSubtitulo'>" + escapeHtml(numeroCorto(g.partidas, 0)) + " partidas registradas en " + escapeHtml(etiquetaModoRanking(modo)) +
                (g.partidas ? " · eliminaciones por segundo: mediana " + escapeHtml(numeroCorto(g.mediana)) + ", 9 de cada 10 por debajo de " + escapeHtml(numeroCorto(g.p90)) + ", máximo " + escapeHtml(numeroCorto(g.maximo)) : "") +
                ".</p>"
            const tablaTramos = tramos.length
                ? "<div class='rankingTablaScroll'><table class='rankingTabla'><caption>Ritmo típico por duración (eliminaciones/s)</caption><thead><tr><th>Duración</th><th>Partidas</th><th>Mediana</th><th>p90</th><th>p99</th></tr></thead><tbody>" +
                    tramos.map(function (t) {
                        return "<tr><td>" + escapeHtml(t.etiqueta) + "</td><td>" + escapeHtml(numeroCorto(t.partidas, 0)) + "</td><td>" + escapeHtml(numeroCorto(t.mediana)) + "</td><td>" + escapeHtml(numeroCorto(t.p90)) + "</td><td>" + escapeHtml(numeroCorto(t.p99)) + "</td></tr>"
                    }).join("") + "</tbody></table></div>"
                : ""
            const top = Array.isArray(r.top) ? r.top : []
            const tablaTop = top.length
                ? "<div class='rankingTablaScroll'><table class='rankingTabla rankingTablaAncha'><caption>Mejores puntajes con el detalle de la partida</caption><thead><tr><th>Jugador</th><th>Puntos</th><th>Duración</th><th>Elim.</th><th>Elim./s</th><th>Preguntas</th><th>Jefes</th><th>Dificultad</th></tr></thead><tbody>" +
                    top.map(function (f) {
                        const marca = f.inusual ? " <span class='estadoChip estadoAviso' title='Muy por encima de lo habitual para partidas de duración parecida'>Inusual</span>" : ""
                        const oculto = f.oculto ? " <span class='estadoChip'>Escondido</span>" : ""
                        return "<tr" + (f.inusual ? " class='filaInusual'" : "") + "><td><b>" + escapeHtml(f.pseudonimo) + "</b>" + marca + oculto + "</td><td>" + escapeHtml(numeroCorto(f.puntaje, 0)) +
                            "</td><td>" + escapeHtml(formatearDuracion(f.segundos)) + "</td><td>" + escapeHtml(numeroCorto(f.kills, 0)) + "</td><td>" + escapeHtml(numeroCorto(f.ritmo)) +
                            "</td><td>" + escapeHtml(f.correctas + "/" + f.preguntas) + "</td><td>" + escapeHtml(numeroCorto(f.jefes, 0)) + "</td><td>" + escapeHtml(f.dificultad) + "</td></tr>"
                    }).join("") + "</tbody></table></div>"
                : "<p class='rankingSubtitulo'>Todavía no hay puntajes en este modo.</p>"
            const nota = g.partidas < (r.minimoReferencia || 15)
                ? "<p class='ayudaPerfil'>Con menos de " + escapeHtml(String(r.minimoReferencia || 15)) + " partidas todavía no se marcan puntajes inusuales: hacen falta más datos para saber qué es normal.</p>"
                : "<p class='ayudaPerfil'>«Inusual» = ritmo de eliminaciones muy por encima de lo habitual para partidas de duración parecida. Es una pista, no una prueba: mirá el resto del detalle antes de esconder o anular.</p>"
            rankingEstadisticas.innerHTML = resumen + tablaTramos + tablaTop + nota
        }

        const botonVerEstadisticas = document.getElementById("rankingVerEstadisticas")
        if (botonVerEstadisticas) botonVerEstadisticas.addEventListener("click", cargarEstadisticasRanking)
        const botonVerOcultos = document.getElementById("rankingVerOcultos")
        if (botonVerOcultos) botonVerOcultos.addEventListener("click", cargarPuntajesOcultos)

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

        // ==================== CLASIFICADOS ====================
        // Ventas y servicios entre estudiantes, aparte del foro (API: listarClasificados, publicarClasificado,
        // gestionarClasificado; denuncias con tipo "clasificado"). Todo texto se escapa y no se convierte en enlace.
        const CATEGORIAS_CLASIFICADOS = {
            resumenes: "Resúmenes y apuntes", clases: "Clases particulares", equipo: "Equipo e instrumental",
            libros: "Libros usados", servicios: "Servicios", otros: "Otros"
        }
        const CLASIFICADOS_FRESCURA_MS = 60 * 1000
        let clasificadosUI = [], misClasificadosUI = [], chatsClasificadosUI = [], clasificadosCargadosEn = 0, filtroCategoriaClasificado = ""
        const listaClasificados = document.getElementById("listaClasificados")
        const buscarClasificado = document.getElementById("buscarClasificado")
        const panelClasificado = document.getElementById("panelClasificado")
        const btnPublicarClasificado = document.getElementById("btnPublicarClasificado")
        const formClasificado = document.getElementById("formClasificado")
        const msgClasificado = document.getElementById("msgClasificado")
        let operacionClasificado = null

        async function cargarClasificados(forzar) {
            if (!sesion) return
            if (!forzar && clasificadosCargadosEn && Date.now() - clasificadosCargadosEn < CLASIFICADOS_FRESCURA_MS) { renderizarClasificados(); return }
            if (!clasificadosUI.length) listaClasificados.innerHTML = esqueletoTarjetas(2)
            const r = await llamar("listarClasificados", {})
            if (!r.ok) {
                if (!clasificadosUI.length) listaClasificados.innerHTML = "<p class='vacio'>" + escapeHtml(r.error === "accion_invalida" ? "Compra venta se está activando. Probá de nuevo en un rato." : mensajeError(r.error)) + "</p>"
                return
            }
            clasificadosUI = Array.isArray(r.clasificados) ? r.clasificados : []
            misClasificadosUI = Array.isArray(r.misClasificados) ? r.misClasificados : []
            chatsClasificadosUI = Array.isArray(r.chats) ? r.chats : []
            clasificadosCargadosEn = Date.now()
            renderizarClasificados()
        }

        function textoConSaltos(texto) {
            return escapeHtml(texto).replace(/\n/g, "<br>")
        }

        function tarjetaClasificado(c, propio) {
            const estado = propio ? (c.vencido ? "Vencido" : (c.activo ? "Activo hasta el " + fechaLargaBaja(c.expira_at) : "Pausado")) : ""
            return "<article class='tarjetaMaterial tarjetaClasificado'>" +
                "<div class='tarjetaMaterialMeta'><span class='chipTipo'>" + escapeHtml(CATEGORIAS_CLASIFICADOS[c.categoria] || "Otros") + "</span>" +
                (c.precio ? "<span class='precioClasificado'>" + escapeHtml(c.precio) + "</span>" : "") +
                (propio ? "<span class='materiaMaterial'>" + escapeHtml(estado) + "</span>" : "") + "</div>" +
                "<h3>" + escapeHtml(c.titulo) + "</h3>" +
                "<p class='descMaterial'>" + textoConSaltos(c.descripcion) + "</p>" +
                (c.contacto ? "<p class='contactoClasificado'><b>Contacto:</b> " + escapeHtml(c.contacto) + "</p>" : "") +
                (propio ? "" : "<p class='autorClasificado'>" + avatarHtml(c.autor, c.foto, "avatarMini") + "<span>" + escapeHtml(c.autor) + " · " + formatearFecha(c.created_at) + "</span></p>") +
                "<div class='accionesMaterial'>" +
                (propio
                    ? (c.activo && !c.vencido
                        ? "<button type='button' class='novedadAccion secundaria' data-gestionar-clasificado='pausar' data-id='" + escapeAttr(c.id) + "'>Pausar o vendido</button>"
                        : "<button type='button' class='novedadAccion secundaria' data-gestionar-clasificado='activar' data-id='" + escapeAttr(c.id) + "'>Volver a publicar</button>") +
                      (c.activo && !c.vencido ? "<button type='button' class='novedadAccion secundaria' data-gestionar-clasificado='renovar' data-id='" + escapeAttr(c.id) + "'>Renovar 60 días</button>" : "") +
                      "<button type='button' class='novedadAccion secundaria quitarMaterial' data-gestionar-clasificado='borrar' data-id='" + escapeAttr(c.id) + "'>Borrar</button>"
                    : (c.esMio ? "" : "<button type='button' class='novedadAccion' data-contactar-clasificado='" + escapeAttr(c.id) + "'>Escribir por chat</button>" +
                        (puedeModerar() ? "<button type='button' class='novedadAccion secundaria quitarMaterial' data-quitar-clasificado='" + escapeAttr(c.id) + "'>Quitar (moderación)</button>" : "") +
                        "<button type='button' class='denunciarMaterial' data-denunciar-clasificado='" + escapeAttr(c.id) + "'>Denunciar</button>")) +
                "</div></article>"
        }

        function renderizarClasificados() {
            const q = normalizarTexto(buscarClasificado.value.trim())
            const lista = clasificadosUI.filter(function (c) {
                if (filtroCategoriaClasificado && c.categoria !== filtroCategoriaClasificado) return false
                if (q && normalizarTexto(c.titulo + " " + c.descripcion + " " + (c.precio || "")).indexOf(q) === -1) return false
                return true
            })
            listaClasificados.innerHTML = lista.length
                ? lista.map(function (c) { return tarjetaClasificado(c, false) }).join("")
                : "<div class='materialVacio'><b>" + (clasificadosUI.length ? "No hay avisos con ese filtro" : "Todavía no hay avisos") + "</b>" +
                  "<span>¿Tenés algo para vender u ofrecer? Publicá el primero.</span></div>"
            document.getElementById("seccionChatsClasificados").hidden = !chatsClasificadosUI.length
            document.getElementById("listaChatsClasificados").innerHTML = chatsClasificadosUI.map(function (ch) {
                return "<li><button type='button' class='chatCV' data-abrir-chat-cv='" + escapeAttr(ch.id) + "'>" +
                    avatarHtml(ch.con, ch.foto, "") +
                    "<span class='chatCVTexto'><b>" + escapeHtml(ch.titulo) + "</b>" +
                    "<small>" + (ch.soyVendedor ? "Te escribió " : "Con ") + escapeHtml(ch.con) +
                    (ch.cantidadMensajes ? " · " + ch.cantidadMensajes + (ch.cantidadMensajes === 1 ? " mensaje" : " mensajes") : " · sin mensajes") +
                    (ch.avisoActivo ? "" : " · aviso cerrado") + "</small></span></button></li>"
            }).join("")
            const seccion = document.getElementById("seccionMisClasificados")
            seccion.hidden = !misClasificadosUI.length
            document.getElementById("listaMisClasificados").innerHTML = misClasificadosUI.map(function (c) { return tarjetaClasificado(c, true) }).join("")
        }

        buscarClasificado.addEventListener("input", renderizarClasificados)

        function abrirPanelClasificado(abrir) {
            panelClasificado.hidden = !abrir
            btnPublicarClasificado.setAttribute("aria-expanded", String(abrir))
            if (abrir) { msgClasificado.textContent = ""; document.getElementById("clasificadoTitulo").focus() }
        }
        btnPublicarClasificado.addEventListener("click", function () { abrirPanelClasificado(panelClasificado.hidden) })
        document.getElementById("btnCancelarClasificado").addEventListener("click", function () { abrirPanelClasificado(false) })

        formClasificado.addEventListener("submit", async function (e) {
            e.preventDefault()
            const datos = {
                categoria: document.getElementById("clasificadoCategoria").value,
                titulo: document.getElementById("clasificadoTitulo").value.trim(),
                descripcion: document.getElementById("clasificadoDescripcion").value.trim(),
                precio: document.getElementById("clasificadoPrecio").value.trim(),
                contacto: document.getElementById("clasificadoContacto").value.trim(),
                declaracion: document.getElementById("clasificadoDeclaracion").checked
            }
            if (datos.titulo.length < 3) { msgClasificado.textContent = mensajeError("clasificado_titulo"); return }
            if (datos.descripcion.length < 10) { msgClasificado.textContent = mensajeError("clasificado_descripcion"); return }
            if (!datos.declaracion) { msgClasificado.textContent = mensajeError("declaracion_clasificado"); return }
            // El mismo id de operación en los reintentos evita avisos duplicados.
            if (!operacionClasificado) operacionClasificado = (crypto && crypto.randomUUID) ? crypto.randomUUID() : ("op-" + Date.now() + "-" + Math.random().toString(36).slice(2))
            datos.operationId = operacionClasificado
            const boton = formClasificado.querySelector("button[type=submit]")
            boton.disabled = true
            msgClasificado.textContent = "Publicando..."
            const r = await llamar("publicarClasificado", datos)
            boton.disabled = false
            if (!r.ok) { msgClasificado.textContent = mensajeError(r.error); return }
            operacionClasificado = null
            formClasificado.reset()
            abrirPanelClasificado(false)
            mostrarAviso("Aviso publicado.")
            cargarClasificados(true)
        })

        vistaClasificados.addEventListener("click", async function (e) {
            const chip = e.target.closest("[data-cat-clasificado]")
            if (chip) {
                filtroCategoriaClasificado = chip.dataset.catClasificado
                document.querySelectorAll("[data-cat-clasificado]").forEach(function (c) { c.setAttribute("aria-pressed", String(c === chip)) })
                renderizarClasificados()
                return
            }
            const contactar = e.target.closest("[data-contactar-clasificado]")
            if (contactar) {
                contactar.disabled = true
                const r = await llamar("contactarClasificado", { id: contactar.dataset.contactarClasificado })
                contactar.disabled = false
                if (!r.ok) { mostrarAviso(mensajeError(r.error)); return }
                abrirChat(r.conversacionId, true, "clasificados")
                return
            }
            const quitarCV = e.target.closest("[data-quitar-clasificado]")
            if (quitarCV) {
                const motivo = pedirMotivoModeracion("este aviso de Compra venta")
                if (motivo === null) return
                const r = await llamarModeracion("quitarClasificado", { id: quitarCV.dataset.quitarClasificado, motivo })
                if (!r.ok) { if (r.error !== "moderacion_bloqueada") alert(mensajeError(r.error)); return }
                mostrarAviso("Aviso quitado. Se le avisó a quien lo publicó.")
                cargarClasificados(true)
                return
            }
            const chatCV = e.target.closest("[data-abrir-chat-cv]")
            if (chatCV) { abrirChat(chatCV.dataset.abrirChatCv, true, "clasificados"); return }
            const denunciar = e.target.closest("[data-denunciar-clasificado]")
            if (denunciar) {
                const motivo = prompt("¿Qué pasa con este aviso? (por ejemplo: es una empresa o academia, vende copias de libros o medicamentos, es una estafa)")
                if (motivo === null) return
                const r = await llamar("denunciar", { tipo: "clasificado", id: denunciar.dataset.denunciarClasificado, motivo: motivo })
                mostrarAviso(r.ok ? "Gracias, un moderador lo va a revisar." : mensajeError(r.error))
                return
            }
            const gestionar = e.target.closest("[data-gestionar-clasificado]")
            if (gestionar) {
                const accion = gestionar.dataset.gestionarClasificado
                if (accion === "borrar" && !confirm("¿Borrar este aviso? No se puede deshacer.")) return
                gestionar.disabled = true
                const r = await llamar("gestionarClasificado", { id: gestionar.dataset.id, accion: accion })
                gestionar.disabled = false
                if (!r.ok) { mostrarAviso(mensajeError(r.error)); return }
                mostrarAviso(accion === "borrar" ? "Aviso borrado." : accion === "pausar" ? "Aviso pausado." : accion === "renovar" ? "Aviso renovado por 60 días." : "Aviso publicado de nuevo.")
                cargarClasificados(true)
            }
        })

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

