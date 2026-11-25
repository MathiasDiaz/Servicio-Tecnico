import { Head, Search, Chip, ESTADOS, Drop, Thumbs } from './shared'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom'

export function Ordenes({ go }) {
const [ordenes, setOrdenes] = useState([])
const [empleados, setEmpleados] = useState([])
const [loading, setLoading] = useState(false)
const [errorMessage, setErrorMessage] = useState('')

const [busqueda, setBusqueda] = useState('')
const [filtroEstado, setFiltroEstado] = useState('')
const [filtroEmpleado, setFiltroEmpleado] = useState('')
const [fechaDesde, setFechaDesde] = useState('')
const [fechaHasta, setFechaHasta] = useState('')

const navigate = useNavigate()

const todosOrdenes = async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      let { data: ordenesData, error: ordError } = await supabase
        .from('vista_ordenes')
        .select('*')  
        ;
        
      if (ordError) throw ordError
      
      setOrdenes(ordenesData || []);

      } catch (error) {
      console.error("Error al obtener las órdenes:", error.message);
      setErrorMessage('Error al conectar con la base de datos.');
    } finally {
      setLoading(false);
    }
  };

  const ordenesFiltradas = ordenes.filter(r => {
  const texto = busqueda.toLowerCase().trim();
  const nroOrden = String(r.id_orden || '').toLowerCase();
  const cliente = `${r.nombre || ''} ${r.apellido || ''}`.toLowerCase();
  const dispositivo = `${r.marca || ''} ${r.modelo || ''}`.toLowerCase();
  
  const cumpleTexto = !texto || nroOrden.includes(texto) || cliente.includes(texto) || dispositivo.includes(texto);

  const cumpleEstado = !filtroEstado || filtroEstado === 'Todos los estados' || r.estado === filtroEstado;

  const empleadoCompleto = `${r.Encargado || ''} ${r.Encargado2 || ''}`.trim();
  const cumpleEmpleado = !filtroEmpleado || filtroEmpleado === 'Todos los empleados' || empleadoCompleto === filtroEmpleado;

  const fechaIngreso = r.fecha_ingreso ? new Date(r.fecha_ingreso) : null;
  const cumpleDesde = !fechaDesde || (fechaIngreso && fechaIngreso >= new Date(fechaDesde));
  const cumpleHasta = !fechaHasta || (fechaIngreso && fechaIngreso <= new Date(fechaHasta));

  return cumpleTexto && cumpleEstado && cumpleEmpleado && cumpleDesde && cumpleHasta;
});

  const todosEmpleados = async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      let { data: empleadosData, error: empError } = await supabase
        .from('empleados')
        .select('*');
        
      if (empError) throw empError

      setEmpleados(empleadosData || []);

      } catch (error) {
      console.error("Error al obtener los clientes:", error.message);
      setErrorMessage('Error al conectar con la base de datos.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    todosOrdenes();
    todosEmpleados();
  }, []);
  return (<>
    <Head title="Órdenes de servicio" sub="Consultá y filtrá todas las órdenes">
      <button className="btn" onClick={() => go('nueva')}>Nueva orden</button>
    </Head>

    <input  type="text" className="search-input" placeholder="Buscar por n.º de orden, cliente o dispositivo" value={busqueda}  onChange={(e) => setBusqueda(e.target.value)} />
    <div className="filters">
      <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
        <option value="">Todos los estados</option>
        {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
      </select>

      <select value={filtroEmpleado} onChange={(e) => setFiltroEmpleado(e.target.value)}>
        <option value="">Todos los empleados</option>
        {empleados.map((emp) => (
          <option key={emp.id} value={emp.id}>
            {emp.nombre} {emp.apellido}
          </option>
        ))}
      </select>

      <label>Desde<input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} /></label>
      <label>Hasta<input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} /></label>
    </div>

    <section className="panel">
      <table>
        <thead>
          <tr>
            <th>Orden</th>
            <th>Ingreso</th>
            <th>Cliente</th>
            <th>Dispositivo</th>
            <th>Responsable</th>
            <th>Estimada</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>

          {ordenesFiltradas.map(r => (
            <tr key={r.id_orden}>
              <td>{r.id_orden}</td>
              <td>{r.fecha_ingreso}</td>
              <td>{r.nombre} {r.apellido}</td>
              <td>{r.modelo} {r.marca}</td>
              <td>{r.Encargado} {r.Encargado2}</td>
              <td>{r.fecha_entrega_estimada}</td>
              <td><Chip n={r.estado} /></td>
              <td className="acts"><button className="btn sec sm" onClick={() => navigate(`/detalle/${r.id_orden}`)}>Abrir</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  </>)
}



export default Ordenes;