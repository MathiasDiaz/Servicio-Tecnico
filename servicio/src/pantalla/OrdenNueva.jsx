
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { Head } from './shared'

const ESTADOS_ORDEN = [
  'Pendiente',
  'En diagnóstico',
  'En reparación',
  'Esperando repuestos',
  'Reparado',
  'Entregado'
]

function fechaLocalHoy() {
  const hoy = new Date()
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`
}

function etiquetaCliente(cliente) {
  const nombre = `${cliente.nombre || ''} ${cliente.apellido || ''}`.trim()
  return `${nombre}${cliente.dni ? ` · DNI ${cliente.dni}` : ''}`
}

function etiquetaDispositivo(dispositivo, clientes) {
  const cliente = clientes.find(
    item => String(item.id_cliente) === String(dispositivo.id_cliente)
  )

  const equipo = [
    dispositivo.tipo,
    dispositivo.marca,
    dispositivo.modelo
  ].filter(Boolean).join(' ')

  const propietario = cliente
    ? `${cliente.nombre || ''} ${cliente.apellido || ''}`.trim()
    : 'Cliente no encontrado'

  const dni = cliente?.dni ? ` · DNI ${cliente.dni}` : ''

  return `${equipo} · ${propietario}${dni} · Equipo #${dispositivo.id_dispositivo}`
}

function mensajeError(error) {
  if (error && typeof error === 'object') {
    const partes = [
      error.message,
      error.details,
      error.hint,
      error.code
    ].filter(Boolean)

    if (partes.length) return partes.join(' · ')
  }

  return error instanceof Error ? error.message : String(error)
}

export function OrdenNueva() {
  const navigate = useNavigate()

  const [clientes, setClientes] = useState([])
  const [empleados, setEmpleados] = useState([])
  const [dispositivos, setDispositivos] = useState([])

  const [modoBusqueda, setModoBusqueda] = useState('cliente')
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null)
  const [dispositivoId, setDispositivoId] = useState('')
  const [empleadoId, setEmpleadoId] = useState('')

  const [busquedaCliente, setBusquedaCliente] = useState('')
  const [busquedaDispositivo, setBusquedaDispositivo] = useState('')
  const [mostrarClientes, setMostrarClientes] = useState(false)
  const [mostrarDispositivos, setMostrarDispositivos] = useState(false)

  // Fechas
  const [fechaIngreso, setFechaIngreso] = useState(fechaLocalHoy())
  const [fechaEntregaEstimada, setFechaEntregaEstimada] = useState('')
  const [fechaEntregaReal, setFechaEntregaReal] = useState('')

  // Información del ingreso
  const [observacionesIngreso, setObservacionesIngreso] = useState('')
  const [fallaReportada, setFallaReportada] = useState('')
  const [diagnosticoTecnico, setDiagnosticoTecnico] = useState('')
  const [estado, setEstado] = useState(ESTADOS_ORDEN[0])

  // Costos
  const [costoManoObra, setCostoManoObra] = useState('')
  const [costoRespuesto, setCostoRespuesto] = useState('')

  const [cargandoDatos, setCargandoDatos] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    let cancelado = false

    async function cargarDatos() {
      setCargandoDatos(true)
      setErrorMessage('')

      try {
        const [
          clientesResult,
          empleadosResult,
          dispositivosResult
        ] = await Promise.all([
          supabase
            .from('clientes')
            .select('id_cliente, nombre, apellido, DNI')
            .order('apellido'),

          supabase
            .from('empleados')
            .select('id_empleado, nombre, apellido'),

          supabase
            .from('dispositivos')
            .select('id_dispositivo, tipo, marca, modelo, id_cliente')
        ])

        if (clientesResult.error) throw clientesResult.error
        if (empleadosResult.error) throw empleadosResult.error
        if (dispositivosResult.error) throw dispositivosResult.error

        if (cancelado) return

        setClientes(clientesResult.data || [])
        setEmpleados(empleadosResult.data || [])
        setDispositivos(dispositivosResult.data || [])

        const usuarioId = localStorage.getItem('usuario_id')

        const empleadoActual = (empleadosResult.data || []).find(
          empleado => String(empleado.id_empleado) === usuarioId
        )

        if (empleadoActual) {
          setEmpleadoId(usuarioId)
        }
      } catch (error) {
        if (!cancelado) {
          console.error('Error al cargar los datos:', error)
          setErrorMessage(
            `No se pudieron cargar los datos: ${mensajeError(error)}`
          )
        }
      } finally {
        if (!cancelado) setCargandoDatos(false)
      }
    }

    cargarDatos()

    return () => {
      cancelado = true
    }
  }, [])

  const limpiarSeleccion = () => {
    setClienteSeleccionado(null)
    setDispositivoId('')
    setBusquedaCliente('')
    setBusquedaDispositivo('')
    setMostrarClientes(false)
    setMostrarDispositivos(false)
  }

  const cambiarModoBusqueda = (modo) => {
    setModoBusqueda(modo)
    limpiarSeleccion()
    setErrorMessage('')
    setSuccessMessage('')
  }

  const nuevaOrden = () => {
    limpiarSeleccion()

    setEmpleadoId(localStorage.getItem('usuario_id') || '')

    setFechaIngreso(fechaLocalHoy())
    setFechaEntregaEstimada('')
    setFechaEntregaReal('')

    setObservacionesIngreso('')
    setFallaReportada('')
    setDiagnosticoTecnico('')

    setEstado(ESTADOS_ORDEN[0])

    setCostoManoObra('')
    setCostoRespuesto('')

    setErrorMessage('')
    setSuccessMessage('')
  }

  const seleccionarCliente = (cliente) => {
    setClienteSeleccionado(cliente)
    setBusquedaCliente(etiquetaCliente(cliente))
    setBusquedaDispositivo('')
    setDispositivoId('')
    setMostrarClientes(false)
  }

  const seleccionarDispositivo = (dispositivo) => {
    const cliente = clientes.find(
      item => String(item.id_cliente) === String(dispositivo.id_cliente)
    ) || null

    setDispositivoId(String(dispositivo.id_dispositivo))
    setClienteSeleccionado(cliente)

    setBusquedaDispositivo(
      etiquetaDispositivo(dispositivo, clientes)
    )

    setBusquedaCliente(
      cliente ? etiquetaCliente(cliente) : ''
    )

    setMostrarDispositivos(false)
  }

  const crearOrden = async (event) => {
    event.preventDefault()

    setErrorMessage('')
    setSuccessMessage('')

    // Validar cliente
    if (!clienteSeleccionado) {
      setErrorMessage(
        modoBusqueda === 'cliente'
          ? 'Seleccioná un cliente de la lista.'
          : 'Seleccioná un dispositivo válido.'
      )
      return
    }

    // Validar dispositivo
    const dispositivoSeleccionado = dispositivos.find(
      dispositivo =>
        String(dispositivo.id_dispositivo) === dispositivoId
    )

    if (!dispositivoSeleccionado) {
      setErrorMessage(
        modoBusqueda === 'cliente'
          ? 'Seleccioná un dispositivo del cliente.'
          : 'Seleccioná un dispositivo de la lista.'
      )
      return
    }

    if (
      String(dispositivoSeleccionado.id_cliente) !==
      String(clienteSeleccionado.id_cliente)
    ) {
      setErrorMessage(
        'El dispositivo seleccionado no pertenece al cliente indicado.'
      )
      return
    }

    // Validar empleado
    if (!empleadoId) {
      setErrorMessage('Seleccioná un empleado responsable.')
      return
    }

    // Validar fechas obligatorias
    if (!fechaIngreso) {
      setErrorMessage('La fecha de ingreso es obligatoria.')
      return
    }

    if (!fechaEntregaEstimada) {
      setErrorMessage('La fecha estimada de entrega es obligatoria.')
      return
    }

    if (fechaEntregaEstimada < fechaIngreso) {
      setErrorMessage(
        'La fecha estimada de entrega no puede ser anterior a la fecha de ingreso.'
      )
      return
    }

    if (
      fechaEntregaReal &&
      fechaEntregaReal < fechaIngreso
    ) {
      setErrorMessage(
        'La fecha de entrega real no puede ser anterior a la fecha de ingreso.'
      )
      return
    }

    if (
      fechaEntregaReal &&
      fechaEntregaEstimada &&
      fechaEntregaReal < fechaIngreso
    ) {
      setErrorMessage('Revisá las fechas de la orden.')
      return
    }

    // Validar costos solamente cuando fueron ingresados
    const manoObra =
      costoManoObra.trim() === ''
        ? null
        : Number(costoManoObra)

    const repuestos =
      costoRespuesto.trim() === ''
        ? null
        : Number(costoRespuesto)

    if (
      manoObra !== null &&
      (!Number.isFinite(manoObra) || manoObra < 0)
    ) {
      setErrorMessage(
        'El costo de mano de obra debe ser un número mayor o igual a cero.'
      )
      return
    }

    if (
      repuestos !== null &&
      (!Number.isFinite(repuestos) || repuestos < 0)
    ) {
      setErrorMessage(
        'El costo de repuestos debe ser un número mayor o igual a cero.'
      )
      return
    }

    // El total queda NULL hasta conocer ambos costos
    const total =
      manoObra !== null && repuestos !== null
        ? manoObra + repuestos
        : null

    setGuardando(true)

    try {
      const ordenNueva = {
        id_dispositivo: Number(dispositivoId),
        id_empleado: Number(empleadoId),

        fecha_ingreso: fechaIngreso,
        fecha_entrega_estimada: fechaEntregaEstimada,
        fecha_entrega_real: fechaEntregaReal || null,

        observaciones_ingreso:
          observacionesIngreso.trim() || null,

        falla_reportada:
          fallaReportada.trim() || null,

        diagnostico_tecnico:
          diagnosticoTecnico.trim() || null,

        estado,

        costo_mano_obra: manoObra,
        costo_respuestos: repuestos,
        total
      }

      const { data, error } = await supabase
        .from('ordenes')
        .insert(ordenNueva)
        .select('id_orden')
        .single()

      if (error) throw error

      setSuccessMessage(
        `La orden #${data.id_orden} se creó correctamente.`
      )
    } catch (error) {
      console.error('Error al crear la orden:', error)

      setErrorMessage(
        `No se pudo crear la orden: ${mensajeError(error)}`
      )
    } finally {
      setGuardando(false)
    }
  }

  // Dispositivos del cliente seleccionado
  const dispositivosCliente = clienteSeleccionado
    ? dispositivos.filter(
        dispositivo =>
          String(dispositivo.id_cliente) ===
          String(clienteSeleccionado.id_cliente)
      )
    : []

  // Búsqueda de clientes
  const textoCliente = busquedaCliente.trim().toLowerCase()

  const clientesFiltrados = textoCliente
    ? clientes.filter(cliente =>
        etiquetaCliente(cliente).toLowerCase().includes(textoCliente)
      )
    : clientes

  // Búsqueda de dispositivos
  const textoDispositivo = busquedaDispositivo.trim().toLowerCase()

  const dispositivosFiltrados = textoDispositivo
    ? dispositivos.filter(dispositivo =>
        etiquetaDispositivo(dispositivo, clientes)
          .toLowerCase()
          .includes(textoDispositivo)
      )
    : dispositivos

  // Total visual
  const totalVisual =
    costoManoObra.trim() !== '' &&
    costoRespuesto.trim() !== '' &&
    Number.isFinite(Number(costoManoObra)) &&
    Number.isFinite(Number(costoRespuesto))
      ? Number(costoManoObra) + Number(costoRespuesto)
      : ''

  return (
    <>
      <Head
        title="Nueva orden de servicio"
        sub="Completá los datos para registrar el ingreso del equipo"
      />

      {errorMessage && (
        <p
          role="alert"
          style={{
            color: 'var(--red)',
            marginBottom: 14
          }}
        >
          {errorMessage}
        </p>
      )}

      {successMessage && (
        <div
          role="status"
          className="panel"
          style={{ marginBottom: 18 }}
        >
          <p>{successMessage}</p>

          <button
            className="btn sec sm"
            type="button"
            onClick={nuevaOrden}
          >
            Registrar otra orden
          </button>
        </div>
      )}

      {cargandoDatos ? (
        <p role="status">
          Cargando clientes, dispositivos y empleados...
        </p>
      ) : (
        <form onSubmit={crearOrden}>
          <div className="cols">

            {/* CLIENTE Y DISPOSITIVO */}
            <section className="panel">
              <h2>Cliente y dispositivo</h2>

              <div
                className="bar"
                role="group"
                aria-label="Método de búsqueda"
              >
                <button
                  className={`btn${modoBusqueda === 'cliente' ? '' : ' sec'}`}
                  type="button"
                  aria-pressed={modoBusqueda === 'cliente'}
                  onClick={() => cambiarModoBusqueda('cliente')}
                  disabled={guardando}
                >
                  Buscar por cliente
                </button>

                <button
                  className={`btn${modoBusqueda === 'dispositivo' ? '' : ' sec'}`}
                  type="button"
                  aria-pressed={modoBusqueda === 'dispositivo'}
                  onClick={() => cambiarModoBusqueda('dispositivo')}
                  disabled={guardando}
                >
                  Buscar por dispositivo
                </button>
              </div>

              {modoBusqueda === 'cliente' ? (
                <>
                  <div className="search-picker">
                    <label className="f" htmlFor="buscar-cliente">
                      Cliente
                    </label>

                    <div className="search-picker-input">
                      <span aria-hidden="true">⌕</span>

                      <input
                        id="buscar-cliente"
                        placeholder="Buscar por nombre o DNI"
                        value={busquedaCliente}
                        onFocus={() => setMostrarClientes(true)}
                        onBlur={() => setMostrarClientes(false)}
                        onChange={event => {
                          setBusquedaCliente(event.target.value)
                          setClienteSeleccionado(null)
                          setDispositivoId('')
                          setMostrarClientes(true)
                        }}
                        disabled={guardando}
                        autoComplete="off"
                        required
                      />

                      {busquedaCliente && (
                        <button
                          type="button"
                          className="search-clear"
                          aria-label="Limpiar búsqueda de cliente"
                          onClick={() => {
                            setBusquedaCliente('')
                            setClienteSeleccionado(null)
                            setDispositivoId('')
                            setMostrarClientes(true)
                          }}
                        >
                          ×
                        </button>
                      )}
                    </div>

                    {mostrarClientes && (
                      <div className="search-results">
                        {clientesFiltrados.length ? (
                          clientesFiltrados.slice(0, 8).map(cliente => (
                            <button
                              type="button"
                              className={`search-result ${
                                clienteSeleccionado?.id_cliente ===
                                cliente.id_cliente
                                  ? 'selected'
                                  : ''
                              }`}
                              key={cliente.id_cliente}
                              onMouseDown={event => event.preventDefault()}
                              onClick={() => seleccionarCliente(cliente)}
                            >
                              <span className="search-avatar">
                                {(cliente.nombre?.[0] || '?').toUpperCase()}
                              </span>

                              <span>
                                <b>
                                  {cliente.nombre} {cliente.apellido}
                                </b>

                                <small>
                                  DNI {cliente.dni || 'Sin DNI'}
                                </small>
                              </span>
                            </button>
                          ))
                        ) : (
                          <div className="search-empty">
                            No se encontraron clientes
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {clienteSeleccionado && (
                    <label className="f">
                      Dispositivo

                      <select
                        value={dispositivoId}
                        onChange={event =>
                          setDispositivoId(event.target.value)
                        }
                        disabled={
                          guardando || dispositivosCliente.length === 0
                        }
                        required
                      >
                        <option value="">
                          Seleccioná un dispositivo
                        </option>

                        {dispositivosCliente.map(dispositivo => (
                          <option
                            key={dispositivo.id_dispositivo}
                            value={dispositivo.id_dispositivo}
                          >
                            {[
                              dispositivo.tipo,
                              dispositivo.marca,
                              dispositivo.modelo
                            ].filter(Boolean).join(' ')}
                          </option>
                        ))}
                      </select>

                      {dispositivosCliente.length === 0 && (
                        <small>
                          Este cliente todavía no tiene dispositivos registrados.
                        </small>
                      )}
                    </label>
                  )}
                </>
              ) : (
                <div className="search-picker">
                  <label className="f" htmlFor="buscar-dispositivo">
                    Dispositivo
                  </label>

                  <div className="search-picker-input">
                    <span aria-hidden="true">⌕</span>

                    <input
                      id="buscar-dispositivo"
                      placeholder="Buscar por tipo, marca, modelo o cliente"
                      value={busquedaDispositivo}
                      onFocus={() => setMostrarDispositivos(true)}
                      onBlur={() => setMostrarDispositivos(false)}
                      onChange={event => {
                        setBusquedaDispositivo(event.target.value)
                        setClienteSeleccionado(null)
                        setDispositivoId('')
                        setMostrarDispositivos(true)
                      }}
                      disabled={guardando}
                      autoComplete="off"
                      required
                    />

                    {busquedaDispositivo && (
                      <button
                        type="button"
                        className="search-clear"
                        aria-label="Limpiar búsqueda de dispositivo"
                        onClick={() => {
                          setBusquedaDispositivo('')
                          setClienteSeleccionado(null)
                          setDispositivoId('')
                          setMostrarDispositivos(true)
                        }}
                      >
                        ×
                      </button>
                    )}
                  </div>

                  {mostrarDispositivos && (
                    <div className="search-results">
                      {dispositivosFiltrados.length ? (
                        dispositivosFiltrados.slice(0, 8).map(dispositivo => {
                          const cliente = clientes.find(
                            item =>
                              String(item.id_cliente) ===
                              String(dispositivo.id_cliente)
                          )

                          const equipo = [
                            dispositivo.tipo,
                            dispositivo.marca,
                            dispositivo.modelo
                          ].filter(Boolean).join(' ')

                          return (
                            <button
                              type="button"
                              className={`search-result ${
                                String(dispositivo.id_dispositivo) ===
                                dispositivoId
                                  ? 'selected'
                                  : ''
                              }`}
                              key={dispositivo.id_dispositivo}
                              onMouseDown={event => event.preventDefault()}
                              onClick={() =>
                                seleccionarDispositivo(dispositivo)
                              }
                            >
                              <span className="search-device" aria-hidden="true">
                                ▣
                              </span>

                              <span>
                                <b>
                                  {equipo ||
                                    `Dispositivo #${dispositivo.id_dispositivo}`}
                                </b>

                                <small>
                                  {cliente
                                    ? `${cliente.nombre || ''} ${cliente.apellido || ''}`.trim()
                                    : 'Cliente no encontrado'}

                                  {cliente?.dni
                                    ? ` · DNI ${cliente.dni}`
                                    : ''}
                                </small>
                              </span>
                            </button>
                          )
                        })
                      ) : (
                        <div className="search-empty">
                          No se encontraron dispositivos
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <button
                className="link"
                type="button"
                onClick={() => navigate('/dispositivos')}
              >
                Registrar un dispositivo nuevo
              </button>

              <div className="grid2">
                <label className="f">
                  Fecha de ingreso

                  <input
                    type="date"
                    value={fechaIngreso}
                    onChange={event =>
                      setFechaIngreso(event.target.value)
                    }
                    required
                    disabled={guardando}
                  />
                </label>

                <label className="f">
                  Fecha estimada de entrega

                  <input
                    type="date"
                    min={fechaIngreso}
                    value={fechaEntregaEstimada}
                    onChange={event =>
                      setFechaEntregaEstimada(event.target.value)
                    }
                    required
                    disabled={guardando}
                  />
                </label>
              </div>

              <label className="f">
                Fecha de entrega real

                <input
                  type="date"
                  min={fechaIngreso}
                  value={fechaEntregaReal}
                  onChange={event =>
                    setFechaEntregaReal(event.target.value)
                  }
                  disabled={guardando}
                />

                <small>
                  Se completa cuando el dispositivo se entrega al cliente.
                </small>
              </label>

              <label className="f">
                Empleado responsable

                <select
                  value={empleadoId}
                  onChange={event =>
                    setEmpleadoId(event.target.value)
                  }
                  required
                  disabled={guardando}
                >
                  <option value="">
                    Seleccioná un empleado
                  </option>

                  {empleados.map(empleado => (
                    <option
                      key={empleado.id_empleado}
                      value={empleado.id_empleado}
                    >
                      {[
                        empleado.nombre,
                        empleado.apellido
                      ].filter(Boolean).join(' ') ||
                        `Empleado #${empleado.id_empleado}`}
                    </option>
                  ))}
                </select>

                {empleados.length === 0 && (
                  <small>No hay empleados disponibles.</small>
                )}
              </label>
            </section>

            {/* INFORMACIÓN DE LA ORDEN */}
            <section className="panel">
              <h2>Información del ingreso</h2>

              <label className="f">
                Observaciones del cliente

                <textarea
                  rows="3"
                  placeholder="Comentarios que realiza el cliente al dejar el dispositivo"
                  value={observacionesIngreso}
                  onChange={event =>
                    setObservacionesIngreso(event.target.value)
                  }
                  disabled={guardando}
                />
              </label>

              <label className="f">
                Falla reportada

                <textarea
                  rows="3"
                  placeholder="Ej.: no enciende, la pantalla quedó con una raya"
                  value={fallaReportada}
                  onChange={event =>
                    setFallaReportada(event.target.value)
                  }
                  disabled={guardando}
                />
              </label>

              <label className="f">
                Estado inicial

                <select
                  value={estado}
                  onChange={event => setEstado(event.target.value)}
                  disabled={guardando}
                >
                  {ESTADOS_ORDEN.map(nombreEstado => (
                    <option
                      key={nombreEstado}
                      value={nombreEstado}
                    >
                      {nombreEstado}
                    </option>
                  ))}
                </select>
              </label>

              <label className="f">
                Diagnóstico técnico / Solución

                <textarea
                  rows="4"
                  placeholder="Qué se encontró al revisar el equipo y cómo se solucionó"
                  value={diagnosticoTecnico}
                  onChange={event =>
                    setDiagnosticoTecnico(event.target.value)
                  }
                  disabled={guardando}
                />
              </label>

              <h2 style={{ marginTop: 18 }}>
                Costos
              </h2>

              <div className="grid2">
                <label className="f">
                  Costo de mano de obra

                  <input
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="Todavía sin definir"
                    value={costoManoObra}
                    onChange={event =>
                      setCostoManoObra(event.target.value)
                    }
                    disabled={guardando}
                  />
                </label>

                <label className="f">
                  Costo de repuestos

                  <input
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="Todavía sin definir"
                    value={costoRespuesto}
                    onChange={event =>
                      setCostoRespuesto(event.target.value)
                    }
                    disabled={guardando}
                  />
                </label>
              </div>

              <label className="f">
                Total

                <input
                  type="number"
                  value={totalVisual}
                  readOnly
                  placeholder="Se calcula cuando estén definidos ambos costos"
                />
                </label>
            </section>
          </div>

          <div className="foot">
            <button
              className="btn sec"
              type="button"
              onClick={() => navigate('/ordenes')}
              disabled={guardando}
            >
              Cancelar
            </button>

            <button
              className="btn"
              type="submit"
              disabled={guardando || Boolean(successMessage)}
            >
              {guardando ? 'Creando orden...' : 'Crear orden'}
            </button>
          </div>
        </form>
      )}
    </>
  )
}

export default OrdenNueva
