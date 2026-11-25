import { useEffect, useState } from 'react'
import { Head, Modal } from './shared'
import { supabase } from '../supabase'

const REPUESTO_VACIO = {
  nombre: '',
  marca: '',
  descripcion: '',
  stock: 0,
  precio_costo: '',
  fecha_pedido: '',
}

export default function Stock() {
  const [repuestos, setRepuestos] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [busquedaAplicada, setBusquedaAplicada] = useState('')
  const [loading, setLoading] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [agregar, setAgregar] = useState(false)
  const [editar, setEditar] = useState(false)
  const [nuevoRepuesto, setNuevoRepuesto] = useState(REPUESTO_VACIO)
  const [repuestoEditando, setRepuestoEditando] = useState(null)
  const [repuestoIngreso, setRepuestoIngreso] = useState('')
  const [cantidadIngreso, setCantidadIngreso] = useState('')

  const cargarRepuestos = async () => {
    setLoading(true)
    setMensaje('')

    const { data, error } = await supabase
      .from('repuestos')
      .select('id_repuesto,nombre,marca,descripcion,stock,precio_costo,fecha_pedido')
      .order('id_repuesto', { ascending: true })

    if (error) {
      console.error('Error al cargar repuestos:', error)
      setMensaje('No se pudieron cargar los repuestos.')
    } else {
      setRepuestos(data || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    cargarRepuestos()
  }, [])

  const repuestosFiltrados = repuestos.filter((repuesto) => {
    const texto = busquedaAplicada.toLowerCase().trim()
    if (!texto) return true

    const codigo = `R-${String(repuesto.id_repuesto).padStart(3, '0')}`
    return `${repuesto.nombre || ''} ${repuesto.marca || ''} ${repuesto.descripcion || ''} ${codigo}`
      .toLowerCase()
      .includes(texto)
  })

  const buscar = () => {
    setBusquedaAplicada(busqueda)
  }

  const registrarRepuesto = async () => {
    if (!nuevoRepuesto.nombre.trim()) {
      setMensaje('Ingresá el nombre del repuesto.')
      return
    }

    const stockInicial = Number(nuevoRepuesto.stock)
    if (!Number.isInteger(stockInicial) || stockInicial < 0) {
      setMensaje('El stock inicial debe ser un número entero igual o mayor que cero.')
      return
    }

    const precioCosto = Number(nuevoRepuesto.precio_costo)
    if (nuevoRepuesto.precio_costo !== '' && (!Number.isFinite(precioCosto) || precioCosto < 0)) {
      setMensaje('El precio de costo debe ser igual o mayor que cero.')
      return
    }

    setLoading(true)
    setMensaje('')

    const { error } = await supabase
      .from('repuestos')
      .insert([{
        nombre: nuevoRepuesto.nombre.trim(),
        marca: nuevoRepuesto.marca.trim() || null,
        descripcion: nuevoRepuesto.descripcion.trim() || null,
        stock: stockInicial,
        precio_costo: nuevoRepuesto.precio_costo === '' ? null : precioCosto,
        fecha_pedido: nuevoRepuesto.fecha_pedido || null,
      }])

    if (error) {
      console.error('Error al agregar repuesto:', error)
      setMensaje('No se pudo agregar el repuesto.')
    } else {
      setNuevoRepuesto(REPUESTO_VACIO)
      setAgregar(false)
      await cargarRepuestos()
    }

    setLoading(false)
  }

  const abrirEditar = (repuesto) => {
    setRepuestoEditando({
      ...repuesto,
      nombre: repuesto.nombre || '',
      marca: repuesto.marca || '',
      descripcion: repuesto.descripcion || '',
      precio_costo: repuesto.precio_costo ?? '',
      fecha_pedido: repuesto.fecha_pedido || '',
    })
    setEditar(true)
  }

  const actualizarRepuesto = async () => {
    if (!repuestoEditando?.nombre.trim()) {
      setMensaje('Ingresá el nombre del repuesto.')
      return
    }

    const precioCosto = Number(repuestoEditando.precio_costo)
    if (repuestoEditando.precio_costo !== '' && (!Number.isFinite(precioCosto) || precioCosto < 0)) {
      setMensaje('El precio de costo debe ser igual o mayor que cero.')
      return
    }

    setLoading(true)
    setMensaje('')

    const { error } = await supabase
      .from('repuestos')
      .update({
        nombre: repuestoEditando.nombre.trim(),
        marca: repuestoEditando.marca.trim() || null,
        descripcion: repuestoEditando.descripcion.trim() || null,
        precio_costo: repuestoEditando.precio_costo === '' ? null : precioCosto,
        fecha_pedido: repuestoEditando.fecha_pedido || null,
      })
      .eq('id_repuesto', repuestoEditando.id_repuesto)

    if (error) {
      console.error('Error al editar repuesto:', error)
      setMensaje('No se pudo actualizar el repuesto.')
    } else {
      setEditar(false)
      setRepuestoEditando(null)
      await cargarRepuestos()
    }

    setLoading(false)
  }

  const seleccionarIngreso = (repuesto) => {
    setRepuestoIngreso(String(repuesto.id_repuesto))
    setCantidadIngreso('')
    
    setFechaCompra('')
  }

  const registrarIngreso = async () => {
    if (!repuestoIngreso) {
      setMensaje('Seleccioná un repuesto.')
      return
    }

    const cantidad = Number(cantidadIngreso)
    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      setMensaje('La cantidad recibida debe ser un número entero mayor que cero.')
      return
    }

    const repuesto = repuestos.find((item) => String(item.id_repuesto) === repuestoIngreso)
    if (!repuesto) {
      setMensaje('El repuesto seleccionado no existe.')
      return
    }

    setLoading(true)
    setMensaje('')

    const { error } = await supabase
      .from('repuestos')
      .update({ stock: Number(repuesto.stock || 0) + cantidad })
      .eq('id_repuesto', repuesto.id_repuesto)

    if (error) {
      console.error('Error al registrar ingreso:', error)
      setMensaje('No se pudo registrar el ingreso de stock.')
    } else {
      setRepuestoIngreso('')
      setCantidadIngreso('')

      setFechaCompra('')
      await cargarRepuestos()
      setMensaje('Ingreso de stock registrado.')
    }

    setLoading(false)
  }

  return (<>
    <Head title="Repuestos y stock" sub="Controlá cantidades disponibles">
      <button className="btn" onClick={() => setAgregar(true)}>Agregar repuesto</button>
    </Head>
    <div className="bar">
      <input
        className="grow"
        value={busqueda}
        placeholder="Buscar por nombre, código o marca"
        onChange={(event) => setBusqueda(event.target.value)}
        onKeyDown={(event) => event.key === 'Enter' && buscar()}
      />
      <button className="btn sec" onClick={buscar}>Buscar</button>
    </div>
    <div className="cols">
      <section className="panel wide">
        {mensaje && <p className={mensaje.includes('registrado') ? '' : 'warn'}>{mensaje}</p>}
        {loading && <p>Cargando stock...</p>}
        <table>
          <thead><tr><th>Código</th><th>Repuesto</th><th>Descripción</th><th>Stock</th><th>Precio costo</th><th>Fecha pedido</th><th></th></tr></thead>
          <tbody>
            {repuestosFiltrados.map((repuesto) => {
              const codigo = `R-${String(repuesto.id_repuesto).padStart(3, '0')}`
              return (
                <tr key={repuesto.id_repuesto}>
                  <td>{codigo}</td>
                  <td>{repuesto.nombre}</td>
                  <td>{repuesto.descripcion || '-'}</td>
                  <td><b>{repuesto.stock}</b></td>
                  <td>{repuesto.precio_costo != null ? `$ ${Number(repuesto.precio_costo).toLocaleString('es-AR', { minimumFractionDigits: 2 })}` : '-'}</td>
                  <td>{repuesto.fecha_pedido || '-'}</td>
                  <td className="acts">
                    <button className="btn sec sm" onClick={() => seleccionarIngreso(repuesto)}>Ingresar stock</button>
                    <button className="btn sec sm" onClick={() => abrirEditar(repuesto)}>Editar</button>
                  </td>
                </tr>
              )
            })}
            {!loading && repuestosFiltrados.length === 0 && (
              <tr><td colSpan="7">No se encontraron repuestos.</td></tr>
            )}
          </tbody>
        </table>
      </section>
      <section className="panel">
        <h2>Ingreso de stock</h2>
        <label className="f">Repuesto
          <select value={repuestoIngreso} onChange={(event) => setRepuestoIngreso(event.target.value)}>
            <option value="">Elegir repuesto</option>
            {repuestos.map((repuesto) => (
              <option key={repuesto.id_repuesto} value={repuesto.id_repuesto}>
                R-{String(repuesto.id_repuesto).padStart(3, '0')} - {repuesto.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="f">Cantidad recibida
          <input type="number" min="1" step="1" value={cantidadIngreso} onChange={(event) => setCantidadIngreso(event.target.value)} />
        </label>      
        <button className="btn" onClick={registrarIngreso} disabled={loading}>Registrar ingreso</button>
      </section>
    </div>

    {agregar && <Modal title="Agregar repuesto" foot={<>
      <button className="btn sec" onClick={() => setAgregar(false)}>Cancelar</button>
      <button className="btn" onClick={registrarRepuesto} disabled={loading}>Guardar repuesto</button>
    </>}>
      <div className="grid2">
        <label className="f">Nombre
          <input value={nuevoRepuesto.nombre} onChange={(event) => setNuevoRepuesto({ ...nuevoRepuesto, nombre: event.target.value })} />
        </label>
        <label className="f">Marca
          <input value={nuevoRepuesto.marca} onChange={(event) => setNuevoRepuesto({ ...nuevoRepuesto, marca: event.target.value })} />
        </label>
      </div>
      <label className="f">Descripción
        <input value={nuevoRepuesto.descripcion} onChange={(event) => setNuevoRepuesto({ ...nuevoRepuesto, descripcion: event.target.value })} />
      </label>
      <div className="grid2">
        <label className="f">Stock inicial
          <input type="number" min="0" step="1" value={nuevoRepuesto.stock} onChange={(event) => setNuevoRepuesto({ ...nuevoRepuesto, stock: event.target.value })} />
        </label>
        <label className="f">Precio costo
          <input type="number" min="0" step="0.01" value={nuevoRepuesto.precio_costo} onChange={(event) => setNuevoRepuesto({ ...nuevoRepuesto, precio_costo: event.target.value })} />
        </label>
      </div>
      <label className="f">Fecha pedido
        <input type="date" value={nuevoRepuesto.fecha_pedido} onChange={(event) => setNuevoRepuesto({ ...nuevoRepuesto, fecha_pedido: event.target.value })} />
      </label>
    </Modal>}

    {editar && repuestoEditando && <Modal title="Editar repuesto" foot={<>
      <button className="btn sec" onClick={() => setEditar(false)}>Cancelar</button>
      <button className="btn" onClick={actualizarRepuesto} disabled={loading}>Guardar cambios</button>
    </>}>
      <div className="grid2">
        <label className="f">Nombre
          <input value={repuestoEditando.nombre} onChange={(event) => setRepuestoEditando({ ...repuestoEditando, nombre: event.target.value })} />
        </label>
        <label className="f">Marca
          <input value={repuestoEditando.marca} onChange={(event) => setRepuestoEditando({ ...repuestoEditando, marca: event.target.value })} />
        </label>
      </div>
      <label className="f">Descripción
        <input value={repuestoEditando.descripcion} onChange={(event) => setRepuestoEditando({ ...repuestoEditando, descripcion: event.target.value })} />
      </label>
      <div className="grid2">
        <label className="f">Precio costo
          <input type="number" min="0" step="0.01" value={repuestoEditando.precio_costo} onChange={(event) => setRepuestoEditando({ ...repuestoEditando, precio_costo: event.target.value })} />
        </label>
        <label className="f">Fecha pedido
          <input type="date" value={repuestoEditando.fecha_pedido} onChange={(event) => setRepuestoEditando({ ...repuestoEditando, fecha_pedido: event.target.value })} />
        </label>
      </div>
    </Modal>}
  </>)
}