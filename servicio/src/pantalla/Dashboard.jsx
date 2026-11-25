
import { Head, Chip, ESTADOS } from './shared'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { useState, useEffect } from 'react'

export default function Dashboard() {
  const navigate = useNavigate()

  const [cantidades, setCantidades] = useState([])
  const [ordenes, setOrdenes] = useState([])
  const [respuestos, setRespuestos] = useState([])

  useEffect(() => {

    const fetchCounts = async () => {
      const { data, error } = await supabase
        .from('ordenes')
        .select('estado')

      if (error) {
        console.error(error)
        return
      }

      const counts = Object.values(
        data.reduce((acc, orden) => {
          const estado = orden.estado

          if (!acc[estado]) {
            acc[estado] = { estado, cantidad: 0 }
          }

          acc[estado].cantidad++

          return acc
        }, {})
      )

      setCantidades(counts)
    }

const hoy = new Date()
const fechaHoy = hoy.toLocaleDateString('en-CA')

const fechaLimite = new Date()
fechaLimite.setDate(fechaLimite.getDate() + 5)
const fechaMaxima = fechaLimite.toLocaleDateString('en-CA')

 const formatearFecha = (fecha) => {
      const anio = fecha.getFullYear()
      const mes = String(fecha.getMonth() + 1).padStart(2, '0')
      const dia = String(fecha.getDate()).padStart(2, '0')
      return `${anio}-${mes}-${dia}`
    }

   const proxOrdenes = async () => {
      const hoy = new Date()
      const fechaHoy = formatearFecha(hoy)

      const fechaLimite = new Date()
      // Cambiamos de 5 a 15 días (o el número que prefieras)
      fechaLimite.setDate(fechaLimite.getDate() + 5) 
      const fechaMaxima = formatearFecha(fechaLimite)

      const { data, error } = await supabase
        .from('ordenes')
        .select(`
          id_orden,
          fecha_entrega_estimada,
          estado,
          id_dispositivo,
          dispositivos:id_dispositivo (
            marca,
            modelo,
            id_cliente,
            clientes:id_cliente (
              nombre,
              apellido
            )
          )
        `)
        .gte('fecha_entrega_estimada', fechaHoy)
        .lte('fecha_entrega_estimada', fechaMaxima)
        .order('fecha_entrega_estimada', { ascending: true })

      if (error) {
        console.error('Error al cargar órdenes:', error)
        return
      }

      setOrdenes(data || [])
    }

    const stockPocos = async () => {
      const limite = 10

      const { data, error } = await supabase
        .from('repuestos') 
        .select('id_repuesto, nombre, descripcion, stock')
        .lte('stock', limite)
        .order('stock', { ascending: true })

      if (error) {
        console.error('Error al cargar repuestos:', error)
        return
      }

      setRespuestos(data || [])
    }

    fetchCounts()
    proxOrdenes()
    stockPocos()

  }, [])

  return (
    <>
      <Head
        title="Panel del taller"
        sub="Estado de las reparaciones al día de hoy"
      >
        <button className="btn" onClick={() => navigate('/nueva')}>
          Nueva orden
        </button>
      </Head>

      <section className="stages">
        {cantidades.map((e, i) => (
          <div className={`stage s${i}`} key={e.estado}>
            <b>{e.cantidad}</b>
            <span>{e.estado}</span>
          </div>
        ))}
      </section>

      <div className="cols">
        <section className="panel">
          <h2>Entregas próximas</h2>

          <table>
            <thead>
              <tr>
                <th>Orden</th>
                <th>Cliente</th>
                <th>Equipo</th>
                <th>Estimada</th>
                <th>Estado</th>
              </tr>
            </thead>

            <tbody>
                  {ordenes.map(o => (
                    <tr key={o.id_orden}>
                      <td>{o.id_orden}</td>
                      <td>
                        {o.dispositivos?.clientes?.nombre}{' '}
                        {o.dispositivos?.clientes?.apellido}
                      </td>
                      <td>{o.dispositivos?.marca} {o.dispositivos?.modelo}</td>
                      <td>{o.fecha_entrega_estimada}</td>
                      <td><Chip n={o.estado} /></td>
                    </tr>
                  ))}
          </tbody>
          </table>
        </section>

        <section className="panel">
          <h2>Repuestos con poco stock</h2>
          {respuestos.length > 0 ? (
            <ul className="plain">
              {respuestos.map((r) => (
                <li key={r.id_repuesto}>
                  <span>{r.nombre} {r.descripcion}</span>
                  <b className="warn">{r.stock} u.</b>
                </li>
              ))}
            </ul>
          ) : (
            <p>No hay repuestos con stock bajo.</p>
          )}
          <button className="btn sec" onClick={() => navigate('/stock')}>
            Ver stock
          </button>
        </section>
      </div>
    </>
  )
}
