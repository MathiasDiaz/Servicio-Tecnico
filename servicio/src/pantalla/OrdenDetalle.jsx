
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabase'
import { Head, ESTADOS } from './shared'

const formatoEmpleado = empleado =>
  `${empleado.nombre || ''} ${empleado.apellido || ''}`.trim()

const formatoPrecio = valor =>
  Number(valor || 0).toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })

export function OrdenDetalle() {
  const { id } = useParams()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const [orden, setOrden] = useState(null)
  const [dispositivo, setDispositivo] = useState(null)
  const [cliente, setCliente] = useState(null)
  const [empleados, setEmpleados] = useState([])
  const [repuestos, setRepuestos] = useState([])

  const [estado, setEstado] = useState('Pendiente')
  const [fechaIngreso, setFechaIngreso] = useState('')
  const [fechaEntrega, setFechaEntrega] = useState('')
  const [fechaEntregaReal, setFechaEntregaReal] = useState('')
  const [empleadoResponsable, setEmpleadoResponsable] = useState('')

  const [observacionesIngreso, setObservacionesIngreso] = useState('')
  const [fallaReportada, setFallaReportada] = useState('')
  const [diagnosticoTecnico, setDiagnosticoTecnico] = useState('')

  const [costoManoObra, setCostoManoObra] = useState('')

  const [repuestoId, setRepuestoId] = useState('')
  const [cantidadRepuesto, setCantidadRepuesto] = useState(1)
  const [utilizados, setUtilizados] = useState([])
  const [descuentosAplicados, setDescuentosAplicados] = useState({})

  const [fotoIngreso, setFotoIngreso] = useState(null)
  const [fotoSalida, setFotoSalida] = useState(null)
  const [fotoEntradaExistente, setFotoEntradaExistente] = useState('')
  const [fotoSalidaExistente, setFotoSalidaExistente] = useState('')

  useEffect(() => {
    let cancelado = false

    const cargar = async () => {
      setLoading(true)
      setErrorMessage('')

      try {
        let ordenQuery = supabase
          .from('ordenes')
          .select('*')

        if (id) {
          ordenQuery = ordenQuery.eq('id_orden', Number(id))
        } else {
          ordenQuery = ordenQuery
            .order('id_orden', { ascending: false })
            .limit(1)
        }

        const [ordenResult, empleadosResult, repuestosResult] =
          await Promise.all([
            ordenQuery,
            supabase.from('empleados').select('*').order('apellido'),
            supabase.from('repuestos').select('*').order('nombre')
          ])

        if (ordenResult.error) throw ordenResult.error
        if (empleadosResult.error) throw empleadosResult.error
        if (repuestosResult.error) throw repuestosResult.error

        const ordenData = ordenResult.data?.[0]

        if (!ordenData) {
          throw new Error('No se encontró la orden solicitada.')
        }

        const dispositivoResult = await supabase
          .from('dispositivos')
          .select('*')
          .eq('id_dispositivo', ordenData.id_dispositivo)
          .maybeSingle()

        if (dispositivoResult.error) throw dispositivoResult.error

        let clienteData = null

        if (dispositivoResult.data?.id_cliente) {
          const clienteResult = await supabase
            .from('clientes')
            .select('*')
            .eq('id_cliente', dispositivoResult.data.id_cliente)
            .maybeSingle()

          if (clienteResult.error) throw clienteResult.error
          clienteData = clienteResult.data
        }

        const relacionResult = await supabase
          .from('dispositivo_repuesto')
          .select('*')
          .eq('id_orden', ordenData.id_orden)

        if (relacionResult.error) throw relacionResult.error

        if (cancelado) return

        const empleadosData = empleadosResult.data || []
        const repuestosData = repuestosResult.data || []
        const relaciones = relacionResult.data || []

        setOrden(ordenData)
        setDispositivo(dispositivoResult.data)
        setCliente(clienteData)
        setEmpleados(empleadosData)
        setRepuestos(repuestosData)

        setEstado(
          ESTADOS.includes(ordenData.estado)
            ? ordenData.estado
            : ESTADOS[0]
        )

        setFechaIngreso(ordenData.fecha_ingreso || '')
        setFechaEntrega(ordenData.fecha_entrega_estimada || '')
        setFechaEntregaReal(ordenData.fecha_entrega_real || '')

        setEmpleadoResponsable(
          String(ordenData.id_empleado || '')
        )

        setObservacionesIngreso(
          ordenData.observaciones_ingreso || ''
        )

        setFallaReportada(
          ordenData.falla_reportada || ''
        )

        setDiagnosticoTecnico(
          ordenData.diagnostico_tecnico || ''
        )

        setCostoManoObra(
          ordenData.costo_mano_obra ?? ''
        )

        setFotoEntradaExistente(
          dispositivoResult.data?.img_entrada || ''
        )

        setFotoSalidaExistente(
          ordenData.img_salida || ''
        )

        const cantidadesAplicadas = {}

        const repuestosCargados = relaciones.map(relacion => {
          const repuesto = repuestosData.find(
            item => item.id_repuesto === relacion.id_repuesto
          )

          cantidadesAplicadas[relacion.id_repuesto] =
            Number(relacion.cantidad || 0)

          return {
            id_repuesto: relacion.id_repuesto,
            nombre: repuesto?.nombre || 'Repuesto',
            cantidad: Number(relacion.cantidad || 0),
            precio_unitario: Number(relacion.precio_unitario || 0)
          }
        })

        setUtilizados(repuestosCargados)
        setDescuentosAplicados(cantidadesAplicadas)

        setFotoIngreso(null)
        setFotoSalida(null)
      } catch (error) {
        if (!cancelado) {
          setErrorMessage(
            error.message || 'No se pudo cargar la orden.'
          )
        }
      } finally {
        if (!cancelado) setLoading(false)
      }
    }

    cargar()

    return () => {
      cancelado = true
    }
  }, [id])

  const subirImagen = async (file, carpeta) => {
    const fileExt = file.name.split('.').pop()

    const fileName =
      `${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`

    const filePath = `${carpeta}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('imagenes')
      .upload(filePath, file)

    if (uploadError) throw uploadError

    const { data } = supabase.storage
      .from('imagenes')
      .getPublicUrl(filePath)

    return data.publicUrl
  }

  const agregarRepuesto = () => {
    setMessage('')
    setErrorMessage('')

    if (!repuestoId) {
      setErrorMessage('Seleccioná un repuesto del stock.')
      return
    }

    const cantidad = Number(cantidadRepuesto)

    const repuesto = repuestos.find(
      item => String(item.id_repuesto) === repuestoId
    )

    if (!repuesto) return

    if (!Number.isInteger(cantidad) || cantidad < 1) {
      setErrorMessage(
        'La cantidad debe ser un número entero mayor que cero.'
      )
      return
    }

    const existente = utilizados.find(
      item => item.id_repuesto === repuesto.id_repuesto
    )

    const cantidadActual = existente?.cantidad || 0

    const aplicadoAntes = Number(
      descuentosAplicados[repuesto.id_repuesto] || 0
    )

    const stockDisponible =
      Number(repuesto.stock || 0) + aplicadoAntes

    if (cantidadActual + cantidad > stockDisponible) {
      setErrorMessage(
        `No hay suficiente stock de ${repuesto.nombre}.`
      )
      return
    }

    setUtilizados(items => {
      const yaExiste = items.find(
        item => item.id_repuesto === repuesto.id_repuesto
      )

      if (yaExiste) {
        return items.map(item =>
          item.id_repuesto === repuesto.id_repuesto
            ? { ...item, cantidad: item.cantidad + cantidad }
            : item
        )
      }

      return [
        ...items,
        {
          id_repuesto: repuesto.id_repuesto,
          nombre: repuesto.nombre,
          cantidad,
          precio_unitario: Number(repuesto.precio_costo || 0)
        }
      ]
    })

    setCantidadRepuesto(1)
    setRepuestoId('')
  }

  const quitarRepuesto = idRepuesto => {
    setUtilizados(items =>
      items.filter(item => item.id_repuesto !== idRepuesto)
    )
  }

  const seleccionarFoto = (event, tipo) => {
    const archivo = event.target.files?.[0] || null

    if (!archivo) return

    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(archivo.type)
    ) {
      setErrorMessage('El archivo debe ser JPG, PNG o WEBP.')
      event.target.value = ''
      return
    }

    if (archivo.size > 10 * 1024 * 1024) {
      setErrorMessage('La imagen no puede superar los 10 MB.')
      event.target.value = ''
      return
    }

    setErrorMessage('')

    if (tipo === 'ingreso') {
      setFotoIngreso(archivo)
    } else {
      setFotoSalida(archivo)
    }
  }

  const costoRepuestos = utilizados.reduce(
    (total, item) =>
      total + item.cantidad * item.precio_unitario,
    0
  )

  const manoObraNumero =
    costoManoObra === '' ? null : Number(costoManoObra)

  const total =
    manoObraNumero === null || Number.isNaN(manoObraNumero)
      ? null
      : manoObraNumero + costoRepuestos

  const guardarCambios = async () => {
    if (!orden) return

    setSaving(true)
    setMessage('')
    setErrorMessage('')

    try {
      if (!fechaIngreso) {
        throw new Error('Ingresá la fecha de ingreso.')
      }

      if (fechaEntrega && fechaEntrega < fechaIngreso) {
        throw new Error(
          'La fecha estimada no puede ser anterior a la fecha de ingreso.'
        )
      }

      if (
        fechaEntregaReal &&
        fechaEntregaReal < fechaIngreso
      ) {
        throw new Error(
          'La fecha real de entrega no puede ser anterior a la fecha de ingreso.'
        )
      }

      if (
        !empleados.some(
          item => String(item.id_empleado) === empleadoResponsable
        )
      ) {
        throw new Error('Seleccioná un empleado responsable.')
      }

      if (
        costoManoObra !== '' &&
        (!Number.isFinite(Number(costoManoObra)) ||
          Number(costoManoObra) < 0)
      ) {
        throw new Error(
          'El costo de mano de obra debe ser un número válido mayor o igual a cero.'
        )
      }

      const nuevosDescuentos = {}

      utilizados.forEach(item => {
        nuevosDescuentos[item.id_repuesto] = item.cantidad
      })

      // Comprobar que haya stock suficiente para los aumentos.
      for (const item of utilizados) {
        const repuesto = repuestos.find(
          r => r.id_repuesto === item.id_repuesto
        )

        if (!repuesto) {
          throw new Error(
            `No se encontró el repuesto ${item.nombre}.`
          )
        }

        const aplicadoAntes = Number(
          descuentosAplicados[item.id_repuesto] || 0
        )

        const diferencia = item.cantidad - aplicadoAntes

        if (
          diferencia > 0 &&
          Number(repuesto.stock || 0) < diferencia
        ) {
          throw new Error(
            `No hay suficiente stock de ${repuesto.nombre}.`
          )
        }
      }

      // Subir fotos.
      let nuevaFotoEntrada = null
      let nuevaFotoSalida = null

      if (fotoIngreso) {
        nuevaFotoEntrada = await subirImagen(
          fotoIngreso,
          'entradas'
        )
      }

      if (fotoSalida) {
        nuevaFotoSalida = await subirImagen(
          fotoSalida,
          'salida'
        )
      }

      const fechaReal =
        fechaEntregaReal ||
        (estado === 'Entregado'
          ? new Date().toISOString().slice(0, 10)
          : null)

      const updateOrden = {
        fecha_ingreso: fechaIngreso,
        fecha_entrega_estimada: fechaEntrega || null,
        fecha_entrega_real: fechaReal,
        id_empleado: Number(empleadoResponsable),

        observaciones_ingreso:
          observacionesIngreso.trim() || null,

        falla_reportada:
          fallaReportada.trim() || null,

        diagnostico_tecnico:
          diagnosticoTecnico.trim() || null,

        costo_mano_obra: manoObraNumero,
        costo_respuestos: costoRepuestos,
        total,
        estado
      }

      if (nuevaFotoSalida) {
        updateOrden.img_salida = nuevaFotoSalida
      }

      // Actualizar los datos de la orden.
      const { error: ordenError } = await supabase
        .from('ordenes')
        .update(updateOrden)
        .eq('id_orden', orden.id_orden)

      if (ordenError) throw ordenError

      // Guardar la foto de entrada en dispositivos.
      if (nuevaFotoEntrada && dispositivo?.id_dispositivo) {
        const { error: fotoError } = await supabase
          .from('dispositivos')
          .update({ img_entrada: nuevaFotoEntrada })
          .eq('id_dispositivo', dispositivo.id_dispositivo)

        if (fotoError) throw fotoError

        setFotoEntradaExistente(nuevaFotoEntrada)
      }

      // Guardar la foto de salida en ordenes.
      if (nuevaFotoSalida) {
        setFotoSalidaExistente(nuevaFotoSalida)
      }

      // Actualizar el stock según la diferencia.
      for (const idRepuesto of new Set([
        ...Object.keys(descuentosAplicados).map(Number),
        ...utilizados.map(item => item.id_repuesto)
      ])) {
        const repuesto = repuestos.find(
          item => item.id_repuesto === idRepuesto
        )

        if (!repuesto) continue

        const aplicadoAntes = Number(
          descuentosAplicados[idRepuesto] || 0
        )

        const aplicadoAhora = Number(
          nuevosDescuentos[idRepuesto] || 0
        )

        const diferencia = aplicadoAhora - aplicadoAntes

        const nuevoStock =
          Number(repuesto.stock || 0) - diferencia

        if (nuevoStock < 0) {
          throw new Error(
            `Stock insuficiente para ${repuesto.nombre}.`
          )
        }

        if (diferencia !== 0) {
          const { error: stockError } = await supabase
            .from('repuestos')
            .update({ stock: nuevoStock })
            .eq('id_repuesto', idRepuesto)

          if (stockError) throw stockError

          setRepuestos(items =>
            items.map(item =>
              item.id_repuesto === idRepuesto
                ? { ...item, stock: nuevoStock }
                : item
            )
          )
        }
      }

      // Reemplazar los repuestos vinculados a esta orden.
      const { error: borrarError } = await supabase
        .from('dispositivo_repuesto')
        .delete()
        .eq('id_orden', orden.id_orden)

      if (borrarError) throw borrarError

      if (utilizados.length > 0) {
        const registros = utilizados.map(item => ({
          id_orden: orden.id_orden,
          id_repuesto: item.id_repuesto,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario
        }))

        const { error: insertarError } = await supabase
          .from('dispositivo_repuesto')
          .insert(registros)

        if (insertarError) throw insertarError
      }

      setDescuentosAplicados(nuevosDescuentos)

      setOrden(actual => ({
        ...actual,
        ...updateOrden
      }))

      setFotoIngreso(null)
      setFotoSalida(null)

      setMessage(
        `Los cambios de la orden #${orden.id_orden} se guardaron correctamente.`
      )
    } catch (error) {
      setErrorMessage(
        error.message || 'No se pudieron guardar los cambios.'
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <section className="panel">
        <p>Cargando orden...</p>
      </section>
    )
  }

  if (!orden) {
    return (
      <section className="panel">
        <p>No se pudo cargar la orden.</p>
        {errorMessage && (
          <p style={{ color: '#c0392b' }}>{errorMessage}</p>
        )}
      </section>
    )
  }

  const estadoIndex = ESTADOS.indexOf(estado)

  const tituloDispositivo = dispositivo
    ? `${dispositivo.marca || ''} ${dispositivo.modelo || ''}`.trim()
    : 'Dispositivo sin identificar'

  const tituloCliente = cliente
    ? `${cliente.nombre || ''} ${cliente.apellido || ''}`.trim()
    : ''

  return (
    <>
      <Head
        title={`Orden #${orden.id_orden}`}
        sub={`${tituloDispositivo}${tituloCliente ? ` · ${tituloCliente}` : ''}`}
      >
        <button
          className="btn sec"
          type="button"
          onClick={() => window.print()}
        >
          Imprimir comprobante
        </button>

        <button
          className="btn"
          type="button"
          onClick={guardarCambios}
          disabled={saving}
        >
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </Head>

      {message && (
        <p style={{ color: '#087f5b' }}>{message}</p>
      )}

      {errorMessage && (
        <p style={{ color: '#c0392b' }}>{errorMessage}</p>
      )}

      <section className="steps">
        {ESTADOS.map((e, i) => (
          <button
            key={e}
            type="button"
            className={`step ${i < estadoIndex ? 'done' : ''} ${i === estadoIndex ? 'now' : ''}`}
            onClick={() => setEstado(e)}
          >
            {e}
          </button>
        ))}
      </section>

      <div className="cols">
        <section className="panel">
          <h2>Datos de la orden</h2>

          <div className="grid2">
            <label className="f">
              Fecha de ingreso
              <input
                type="date"
                value={fechaIngreso}
                onChange={e => setFechaIngreso(e.target.value)}
              />
            </label>

            <label className="f">
              Fecha estimada de entrega
              <input
                type="date"
                value={fechaEntrega}
                onChange={e => setFechaEntrega(e.target.value)}
              />
            </label>

            <label className="f">
              Fecha real de entrega
              <input
                type="date"
                value={fechaEntregaReal}
                onChange={e => setFechaEntregaReal(e.target.value)}
              />
            </label>

            <label className="f">
              Empleado responsable
              <select
                value={empleadoResponsable}
                onChange={e => setEmpleadoResponsable(e.target.value)}
              >
                <option value="">Seleccionar empleado</option>

                {empleados.map(empleado => (
                  <option
                    key={empleado.id_empleado}
                    value={empleado.id_empleado}
                  >
                    {formatoEmpleado(empleado)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="f">
            Observaciones de ingreso
            <textarea
              rows="3"
              value={observacionesIngreso}
              onChange={e => setObservacionesIngreso(e.target.value)}
              placeholder="Comentarios o indicaciones que realizó el cliente al ingresar el equipo"
            />
          </label>

          <label className="f">
            Falla reportada
            <textarea
              rows="3"
              value={fallaReportada}
              onChange={e => setFallaReportada(e.target.value)}
              placeholder="Problema que presenta el dispositivo"
            />
          </label>

          <label className="f">
            Diagnóstico técnico y solución aplicada
            <textarea
              rows="4"
              value={diagnosticoTecnico}
              onChange={e => setDiagnosticoTecnico(e.target.value)}
              placeholder="Qué se encontró y qué reparación se realizó"
            />
          </label>
        </section>

        <section className="panel">
          <h2>Repuestos utilizados</h2>

          <div className="bar">
            <select
              className="grow"
              value={repuestoId}
              onChange={e => setRepuestoId(e.target.value)}
            >
              <option value="">Elegir repuesto del stock</option>

              {repuestos.map(repuesto => (
                <option
                  key={repuesto.id_repuesto}
                  value={repuesto.id_repuesto}
                >
                  {repuesto.nombre} (stock: {repuesto.stock})
                </option>
              ))}
            </select>

            <input
              className="qty"
              type="number"
              min="1"
              step="1"
              value={cantidadRepuesto}
              onChange={e => setCantidadRepuesto(e.target.value)}
              aria-label="Cantidad"
            />

            <button
              className="btn sec"
              type="button"
              onClick={agregarRepuesto}
            >
              Agregar
            </button>
          </div>

          <table>
            <thead>
              <tr>
                <th>Repuesto</th>
                <th>Cant.</th>
                <th>Precio unitario</th>
                <th>Subtotal</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {utilizados.map(item => {
                const stockActual =
                  repuestos.find(
                    r => r.id_repuesto === item.id_repuesto
                  )?.stock ?? 0

                const aplicadoAntes = Number(
                  descuentosAplicados[item.id_repuesto] || 0
                )

                const stockLuego =
                  Number(stockActual) -
                  (item.cantidad - aplicadoAntes)

                return (
                  <tr key={item.id_repuesto}>
                    <td>{item.nombre}</td>
                    <td>{item.cantidad}</td>
                    <td>${formatoPrecio(item.precio_unitario)}</td>
                    <td>
                      ${formatoPrecio(
                        item.cantidad * item.precio_unitario
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn dang sm"
                        onClick={() => quitarRepuesto(item.id_repuesto)}
                      >
                        Quitar
                      </button>
                    </td>
                  </tr>
                )
              })}

              {utilizados.length === 0 && (
                <tr>
                  <td colSpan="5">
                    Todavía no agregaste repuestos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="grid2">
            <label className="f">
              Costo de mano de obra
              <input
                type="number"
                min="0"
                step="0.01"
                value={costoManoObra}
                onChange={e => setCostoManoObra(e.target.value)}
                placeholder="0.00"
              />
            </label>

            <label className="f">
              Costo de repuestos
              <input
                type="text"
                value={`$${formatoPrecio(costoRepuestos)}`}
                readOnly
              />
            </label>

            <label className="f">
              Total
              <input
                type="text"
                value={
                  total === null
                    ? 'Pendiente'
                    : `$${formatoPrecio(total)}`
                }
                readOnly
              />
            </label>
          </div>
        </section>
      </div>

      <div className="cols">
        <section className="panel">
          <h2>Foto de ingreso</h2>

          {fotoEntradaExistente && (
            <div className="thumbs">
              <img
                className="thumb"
                src={fotoEntradaExistente}
                alt="Foto de ingreso del dispositivo"
              />
            </div>
          )}

          {fotoIngreso && (
            <div className="thumbs">
              <img
                className="thumb"
                src={URL.createObjectURL(fotoIngreso)}
                alt="Nueva foto de ingreso"
              />
            </div>
          )}

          <div className="drop">
            <strong>Agregar foto de ingreso</strong>
            <span>Seleccioná una imagen del dispositivo</span>

            <label className="btn sec sm">
              Elegir archivo
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                onChange={e => seleccionarFoto(e, 'ingreso')}
              />
            </label>

            <small>JPG, PNG o WEBP · máximo 10 MB</small>
          </div>
        </section>

        <section className="panel">
          <h2>Foto de salida</h2>

          {fotoSalidaExistente && (
            <div className="thumbs">
              <img
                className="thumb"
                src={fotoSalidaExistente}
                alt="Foto de salida del dispositivo"
              />
            </div>
          )}

          {fotoSalida && (
            <div className="thumbs">
              <img
                className="thumb"
                src={URL.createObjectURL(fotoSalida)}
                alt="Nueva foto de salida"
              />
            </div>
          )}

          <div className="drop">
            <strong>Agregar foto de salida</strong>
            <span>Foto del equipo al finalizar la reparación</span>

            <label className="btn sec sm">
              Elegir archivo
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                onChange={e => seleccionarFoto(e, 'salida')}
              />
            </label>

            <small>JPG, PNG o WEBP · máximo 10 MB</small>
          </div>
        </section>
      </div>
    </>
  )
}

export default OrdenDetalle
