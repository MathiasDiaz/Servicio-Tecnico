
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabase'

const estadosTimeline = [
  'Pendiente',
  'En diagnóstico',
  'En reparación',
  'Esperando repuestos',
  'Reparado',
  'Entregado'
]

// Bucket de Supabase Storage
const BUCKET = 'imagenes'

// Obtiene la URL de la fotografía
const urlImagen = (valor) => {
  if (!valor) return null

  if (/^https?:\/\//i.test(valor)) return valor

  return supabase.storage
    .from(BUCKET)
    .getPublicUrl(valor).data.publicUrl
}

// Componente para mostrar fotografías
function Foto({ src, alt, etiqueta, chica = false }) {
  const [fallo, setFallo] = useState(false)
  const hayFoto = src && !fallo

  return (
    <div className={`vc-foto ${chica ? 'vc-foto-chica' : 'vc-foto-grande'}`}>
      {hayFoto && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setFallo(true)}
        />
      )}

      {!hayFoto && (
        <span className="vc-foto-vacia">
          Sin fotografía
        </span>
      )}

      {etiqueta && (
        <span className="vc-foto-etiqueta">
          {etiqueta}
        </span>
      )}
    </div>
  )
}

// Normaliza textos para realizar búsquedas
const normalizar = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

// Formatea fechas
const formatearFecha = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'long'
      })
    : 'Sin fecha estimada'

// Convierte los datos de Supabase al formato de la interfaz
const filaAOrden = (r) => {
  const disp = r.dispositivos ?? {}
  const cli = disp.clientes ?? {}

  const estadoTexto = String(r.estado ?? '').trim()

  const estados = {
    'Pendiente': 0,
    'En diagnóstico': 1,
    'En reparación': 2,
    'Esperando repuestos': 3,
    'Reparado': 4,
    'Entregado': 5
  }

  const estado = estados[estadoTexto] ?? -1

  return {
    orden: r.id_orden,
    idDispositivo: disp.id_dispositivo,

    nombre:
      [disp.marca, disp.modelo].filter(Boolean).join(' ') ||
      'Dispositivo',

    estado,
    estadoTexto,

    fecha: formatearFecha(r.fecha_entrega_estimada),

    entrega: `Entrega estimada ${
      r.fecha_entrega_estimada
        ? new Date(r.fecha_entrega_estimada).toLocaleDateString(
            'es-AR',
            {
              day: '2-digit',
              month: '2-digit'
            }
          )
        : '—'
    }`,

    cliente: `${cli.nombre ?? ''} ${cli.apellido ?? ''}`.trim(),
    dni: String(cli.DNI ?? ''),

    imgEntrada: urlImagen(disp.img_entrada),
    imgSalida: urlImagen(r.img_salida)
  }
}

export function VerClientes() {
  const [idUsuario, setIdUsuario] = useState('')
  const [tipoUsuario, setTipoUsuario] = useState('')
  const [ordenes, setOrdenes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [sel, setSel] = useState(null)

  const esEmpleado = tipoUsuario === 'empleado'
  const esCliente = tipoUsuario === 'cliente'

  // 1. Leer sesión del usuario
  useEffect(() => {
    setIdUsuario(localStorage.getItem('usuario_id') || '')
    setTipoUsuario(localStorage.getItem('usuario_tipo') || '')
  }, [])

  // 2. Consultar datos según el tipo de usuario
  useEffect(() => {
    if (!esCliente && !esEmpleado) {
      if (tipoUsuario) {
        setCargando(false)
        setError('Tipo de usuario no reconocido.')
      }

      return
    }

    let cancelado = false

    async function cargar() {
      setCargando(true)
      setError('')

      let query = supabase
        .from('ordenes')
        .select(`
          id_orden,
          estado,
          fecha_entrega_estimada,
          img_salida,
          dispositivos!inner (
            id_dispositivo,
            id_cliente,
            marca,
            modelo,
            img_entrada,
            clientes!inner (
              id_cliente,
              nombre,
              apellido,
              DNI
            )
          )
        `)
        .order('id_orden')

      // El cliente solamente ve sus dispositivos
      if (esCliente) {
        query = query.eq('dispositivos.id_cliente', idUsuario)
      }

      const { data, error } = await query

      if (cancelado) return

      if (error) {
        console.error(error)
        setError('No pudimos cargar los dispositivos. Probá de nuevo.')
      } else {
        const lista = (data ?? []).map(filaAOrden)

        setOrdenes(lista)
        setSel(lista[0]?.orden ?? null)
      }

      setCargando(false)
    }

    cargar()

    return () => {
      cancelado = true
    }
  }, [esCliente, esEmpleado, idUsuario, tipoUsuario])

  // 3. Filtro dinámico para empleados
  const visibles = useMemo(() => {
    if (!esEmpleado || !busqueda.trim()) return ordenes

    const q = normalizar(busqueda)

    return ordenes.filter(
      (o) =>
        normalizar(o.cliente).includes(q) ||
        o.dni.includes(busqueda.trim())
    )
  }, [ordenes, busqueda, esEmpleado])

  // Dispositivo seleccionado
  const d = visibles.find((x) => x.orden === sel) ?? visibles[0]

  return (
    <div className="vc-contenedor">
      <div className="vc-contenido">

        {/* Información del usuario */}
        <p className="vc-usuario">
          Estás viendo el sistema como: {tipoUsuario} (ID: {idUsuario})
        </p>

        {/* Encabezado */}
        <header className="vc-encabezado">
          <h1 className="vc-titulo">
            {esEmpleado ? 'Dispositivos de clientes' : 'Mis dispositivos'}
          </h1>

          <p className="vc-subtitulo">
            {esEmpleado
              ? 'Buscá por nombre o DNI para ver el estado de una reparación'
              : 'Elegí un equipo para ver el estado de su reparación'}
          </p>
        </header>

        {/* Buscador */}
        {esEmpleado && (
          <div className="vc-buscador-panel">
            <label htmlFor="vc-buscador" className="vc-label">
              Buscar cliente
            </label>

            <input
              id="vc-buscador"
              className="vc-input"
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Nombre, apellido o DNI"
              autoComplete="off"
            />

            <p className="vc-resultados">
              {visibles.length}{' '}
              {visibles.length === 1 ? 'resultado' : 'resultados'}
            </p>
          </div>
        )}

        {/* Cargando */}
        {cargando && (
          <p className="vc-mensaje">
            Cargando dispositivos...
          </p>
        )}

        {/* Error */}
        {error && (
          <p role="alert" className="vc-error">
            {error}
          </p>
        )}

        {/* Sin resultados */}
        {!cargando && !error && visibles.length === 0 && (
          <p className="vc-vacio">
            {busqueda
              ? 'Ningún cliente coincide con esa búsqueda.'
              : 'Todavía no hay dispositivos registrados.'}
          </p>
        )}

        {/* Contenido principal */}
        {!cargando && !error && d && (
          <div className="vc-layout">

            {/* Lista de equipos */}
            <section className="vc-panel-equipos">
              <h2 className="vc-titulo-seccion">
                {esEmpleado ? 'Equipos' : 'Mis dispositivos'}
              </h2>

              {visibles.map((x) => (
                <button
                  key={x.orden}
                  onClick={() => setSel(x.orden)}
                  aria-pressed={x.orden === d.orden}
                  className={`vc-equipo ${
                    x.orden === d.orden
                      ? 'vc-equipo-seleccionado'
                      : ''
                  }`}
                >
                  <Foto
                    chica
                    src={x.imgEntrada}
                    alt={`Foto de ${x.nombre}`}
                  />

                  <div className="vc-equipo-info">
                    <b className="vc-equipo-nombre">
                      {x.nombre}
                    </b>

                    {esEmpleado && (
                      <small className="vc-equipo-datos">
                        {x.cliente} · DNI {x.dni}
                      </small>
                    )}

                    <small className="vc-equipo-datos">
                      {x.entrega}
                    </small>

                    {/* Estado independiente de Chip */}
                    <div className="vc-equipo-estado">
                      <span className={`vc-estado vc-estado-${x.estado}`}>
                        {x.estadoTexto || 'Estado desconocido'}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </section>

            {/* Detalle de la orden */}
            <section className="vc-panel-detalle">
              <h2 className="vc-detalle-titulo">
                Orden #{d.orden} · {d.nombre}
              </h2>

              {esEmpleado && (
                <p className="vc-cliente-info">
                  Cliente: <b>{d.cliente}</b> (DNI {d.dni})
                </p>
              )}

              {/* Fecha estimada */}
              <div className="vc-fecha-panel">
                <small className="vc-fecha-label">
                  Fecha estimada de entrega
                </small>

                <b className="vc-fecha-valor">
                  {d.fecha}
                </b>
              </div>

              {/* Estado actual */}
              <div className="vc-estado-actual">
                <span>Estado actual:</span>

                <b className={`vc-estado vc-estado-${d.estado}`}>
                  {d.estadoTexto || 'Estado desconocido'}
                </b>
              </div>

              {/* Línea de tiempo */}
              <ol className="vc-timeline">
                {estadosTimeline.map((nombre, i) => (
                  <li
                    key={nombre}
                    className={`vc-timeline-item ${
                      i < d.estado
                        ? 'vc-completado'
                        : i === d.estado
                          ? 'vc-actual'
                          : 'vc-pendiente'
                    }`}
                  >
                    {nombre}
                  </li>
                ))}
              </ol>

              {/* Fotografías */}
              <h4 className="vc-fotos-titulo">
                Fotos del equipo
              </h4>

              <div className="vc-fotos-grid">
                <Foto
                  src={d.imgEntrada}
                  alt={`${d.nombre} al ingresar`}
                  etiqueta="Al ingresar"
                />

                <Foto
                  src={d.imgSalida}
                  alt={`${d.nombre} al finalizar`}
                  etiqueta="Al finalizar"
                />
              </div>

              <small className="vc-fotos-ayuda">
                Las fotos finales aparecen cuando la reparación termina.
              </small>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}

export default VerClientes
