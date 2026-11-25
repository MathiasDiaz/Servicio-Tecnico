import { useState, useEffect } from 'react'
import { Head, Search, Modal } from './shared'
import { supabase } from '../supabase';

export default function Clientes() {
  const [registrar, setRegistrar] = useState(false)
  const [modificar, setModificar] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const [clientes, setClientes]=useState([])

  const [busqueda, setBusqueda] = useState('')
  const [paginaActual, setPaginaActual] = useState(1)
  const clientesPorPagina = 10
  const [clienteModificando, setClienteModificando] = useState(null);
  const [nuevoCliente, setNuevoCliente] = useState({
    nombre: '',
    apellido: '',
    DNI: '',
    telefono: '',
    email: '',
    direccion: ''
  });

  

  const todosClientes = async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      let { data: clienteData, error: cliError } = await supabase
        .from('clientes_dispositivos')
        .select('*')
        .order('fecha_registro', { ascending: false });
        
      if (cliError) throw cliError
      
      setClientes(clienteData || []);

      } catch (error) {
      console.error("Error al obtener los clientes:", error.message);
      setErrorMessage('Error al conectar con la base de datos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    todosClientes();
  }, []);

  const clientesFiltrados = clientes.filter(cliente => {
    const texto = busqueda.toLowerCase().trim();
    if (!texto) return true;

    const nombreCompleto = `${cliente.nombre || ''} ${cliente.apellido || ''}`.toLowerCase();
    const dni = String(cliente.dni || cliente.DNI || '').toLowerCase();
    const telefono = String(cliente.telefono || '').toLowerCase();

    return (
      nombreCompleto.includes(texto) ||
      dni.includes(texto) ||
      telefono.includes(texto)
    );
  });

  const totalPaginas = Math.ceil(clientesFiltrados.length / clientesPorPagina) || 1;
  const paginaSegura = Math.min(paginaActual, totalPaginas);
  const indiceUltimoCliente = paginaSegura * clientesPorPagina;
  const indicePrimerCliente = indiceUltimoCliente - clientesPorPagina;
  const clientesVisibles = clientesFiltrados.slice(indicePrimerCliente, indiceUltimoCliente);

  const siguientePagina = () => {
    if (paginaActual < totalPaginas) setPaginaActual(paginaActual + 1);
  };

  const anteriorPagina = () => {
    if (paginaActual > 1) setPaginaActual(paginaActual - 1);
  };

  const registrarCliente = async () => {
  try {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const fechaLocal = `${year}-${month}-${day}`;
    const { data, error } = await supabase
      .from('clientes') 
      .insert([
        { 
          nombre: nuevoCliente.nombre, 
          apellido: nuevoCliente.apellido, 
          telefono: nuevoCliente.telefono,
          fecha_registro: fechaLocal,
          DNI: nuevoCliente.dni
        }
      ])
      .select();

    if (error) throw error;

    console.log("Cliente registrado con éxito:", data);
    
    todosClientes(); 
    setNuevoCliente({
        nombre: '',
        apellido: '',
        DNI: '',
        telefono: '',
        email: '',
        direccion: ''
    });
    setRegistrar(false);

  } catch (error) {
    console.error("Error al registrar el cliente:", error.message);
  }
};

const abrirModalModificar = (cliente) => {
    setClienteModificando(cliente);
    setModificar(true);
  };

  const actualizarCliente = async () => {
    const idReal = clienteModificando.id_cliente || clienteModificando.id;

    if (!idReal) {
        alert("Error: No se encontró el ID del cliente para actualizar.");
        return;
      }

    try {
      const { error } = await supabase
        .from('clientes')
        .update({
          nombre: clienteModificando.nombre,
          apellido: clienteModificando.apellido,
          DNI: clienteModificando.dni || clienteModificando.DNI,
          telefono: clienteModificando.telefono
        })
        .eq('id_cliente', idReal);

      if (error) throw error;

      todosClientes();
      setModificar(false);
      setClienteModificando(null);
    } catch (error) {
      console.error("Error al actualizar:", error.message);
      alert("Error al actualizar: " + error.message);
    }
  };
  return (
  <>
    <Head title="Clientes" sub="Registrá, modificá, eliminá y consultá clientes">
      <button className="btn" onClick={() => setRegistrar(true)}>Registrar cliente</button>
    </Head>
    <input 
      type="text" 
      value={busqueda}
      placeholder="Buscar por nombre, DNI o teléfono..."
      onChange={(e) => {
        setBusqueda(e.target.value);
        setPaginaActual(1); 
      }}
      style={{ width: '100%', padding: '10px', margin: '15px 0', borderRadius: '6px', border: '1px solid #ccc' }}
    />
    <section className="panel">

      {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}
      {loading && <p>Cargando clientes...</p>}
      <table>
        <thead><tr><th>Nombre y Apellido</th><th>DNI</th><th>Teléfono</th><th>Fecha Registro</th><th>Dispositivos</th><th></th></tr></thead>
        <tbody>
          {clientesVisibles.map(cliente => (
            <tr key={cliente.id_cliente || cliente.dni}>
              <td>{cliente.nombre} {cliente.apellido}</td>
              <td>{cliente.dni || cliente.DNI}</td>
              <td>{cliente.telefono}</td>
              <td>{cliente.fecha_registro}</td>
              <td>{cliente.contadordedispositivos}</td>
              <td className="acts">
                <button className="btn sec sm" onClick={() => abrirModalModificar(cliente)}>
                  Modificar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pager">
        <span>
          Mostrando {clientesVisibles.length > 0 ? indicePrimerCliente + 1 : 0} a {Math.min(indiceUltimoCliente, clientesFiltrados.length)} de {clientesFiltrados.length} clientes (Página {paginaSegura} de {totalPaginas})
        </span>
      <div>
        <button className="btn sec sm" onClick={anteriorPagina} disabled={paginaActual === 1}>Anterior</button>
        <button className="btn sec sm" onClick={siguientePagina} disabled={paginaActual >= totalPaginas}>Siguiente</button>
      </div>
      </div>
    </section>



    {registrar && <Modal title="Registrar Cliente" foot={<>
      <button className="btn sec" onClick={() => setRegistrar(false)}>Cancelar</button>
      <button className="btn" onClick={registrarCliente}>Guardar cliente</button></>}>
      <div className="grid2">
        <label className="f">Nombre<input 
          type="text" 
          value={nuevoCliente.nombre}
          onChange={(e) => setNuevoCliente({...nuevoCliente, nombre: e.target.value})}/>
        </label>
        <label className="f">Apellido<input 
          type="text" 
          value={nuevoCliente.apellido}
          onChange={(e) => setNuevoCliente({...nuevoCliente, apellido: e.target.value})}/>
        </label>
        <label className="f">DNI<input 
          type="text" 
          value={nuevoCliente.dni}
          onChange={(e) => setNuevoCliente({...nuevoCliente, dni: e.target.value})}/>
        </label>
        <label className="f">Teléfono (opcional)<input 
          type="text" 
          value={nuevoCliente.telefono}
          onChange={(e) => setNuevoCliente({...nuevoCliente, telefono: e.target.value})}/>
        </label>
      </div>
    </Modal>}


    {modificar && <Modal title="Modificar cliente" foot={<>
      <button className="btn sec" onClick={() => setModificar(false)}>Cancelar</button>
      <button className="btn" onClick={() => actualizarCliente()}>Modificar cliente</button></>}>
      <div className="grid2">
        <label className="f">Nombre<input 
          type="text" 
          value={clienteModificando?.nombre}
          onChange={(e) => setClienteModificando({...clienteModificando, nombre: e.target.value})}/>
        </label>
        <label className="f">Apellido<input 
          type="text" 
          value={clienteModificando?.apellido}
          onChange={(e) => setClienteModificando({...clienteModificando, apellido: e.target.value})}/>
        </label>
        <label className="f">DNI<input 
          type="text" 
          value={clienteModificando?.dni || clienteModificando?.DNI}
          onChange={(e) => setClienteModificando({...clienteModificando, dni: e.target.value})}/>
        </label>
        <label className="f">Teléfono<input 
          type="text" 
          value={clienteModificando?.telefono}
          onChange={(e) => setClienteModificando({...clienteModificando, telefono: e.target.value})}/>
        </label>
      </div>
    </Modal>}

  </>)
}