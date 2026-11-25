import { Head, Search, Modal, Thumbs } from './shared'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase';


export default function Dispositivos() {
  
const [loading, setLoading] = useState(false)
const [errorMessage, setErrorMessage] = useState('')
const [dispositivos, setDispositivos] = useState([])
const [fotoEntrada, setFotoEntrada] = useState(null);
const [guardando, setGuardando] = useState(false)
const [busqueda, setBusqueda] = useState('')

const [dniCliente, setDniCliente] = useState('')
const [tipo, setTipo] = useState('')
const [marca, setMarca] = useState('')
const [modelo, setModelo] = useState('')
const [observaciones, setObservaciones] = useState('')

const [modificar, setModificar] = useState(false)
const [dispositivoModificando, setDispositivoModificando] = useState(null);

const todosDispotivos = async () => {
  setLoading(true);
  setErrorMessage('');

  try {
    let { data: dispotivoData, error: disError } = await supabase
      .from('dispositivos')
      .select(`
        id_dispositivo,
        tipo,
        marca,
        modelo,
        observaciones,
        img_entrada,
        clientes (
          nombre,
          apellido
        )
      `);
            
    if (disError) throw disError

    const dispositivosTodos = (dispotivoData || []).map(item => ({
      id_dispositivo: item.id_dispositivo,
      tipo: item.tipo,
      marca: item.marca,
      modelo: item.modelo,
      observaciones: item.observaciones,
      img_entrada: item.img_entrada,
      nombre: item.clientes?.nombre || '',
      apellido: item.clientes?.apellido || ''
    }));

    setDispositivos(dispositivosTodos);

    } catch (error) {
    console.error("Error al obtener los dispositivos:", error.message);
    setErrorMessage('Error al conectar con la base de datos.');
  } finally {
    setLoading(false);
  }
};

const clienteID = async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      let { data: clienteData, error: cliError } = await supabase
        .from('clientes')
        .select('id_cliente')
        .eq('DNI', dniCliente)
        .single();
        
      if (cliError) throw cliError;
      return clienteData?.id_cliente || null;
    } catch (error) {
      console.error("Error al buscar cliente por DNI:", error.message);
      return null;
    }
  };

const subirImagen = async (file, carpeta) => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}_${Math.random()}.${fileExt}`
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

const guardarDispositivos = async () => {
  setGuardando(true)
  setErrorMessage('')

  try {

    let urlEntrada = null
    if (fotoEntrada) {
      urlEntrada = await subirImagen(fotoEntrada, 'entradas')
    }

    const idEncontrado = await clienteID();
    if (!idEncontrado) {
      setErrorMessage('No se encontró ningun cliente con ese DNI.');
      setGuardando(false);
      return;
    }

    const { error: insertError } = await supabase
      .from('dispositivos')
      .insert([
        {
          tipo,
          marca,
          modelo,
          observaciones,
          img_entrada: urlEntrada,
          id_cliente: idEncontrado
        }
      ])

    if (insertError) throw insertError

    setMarca('')
    setTipo('')
    setModelo('')
    setObservaciones('')
    setFotoEntrada(null)
    todosDispotivos()
    alert('¡Dispositivo registrado con éxito!')

  } catch (error) {
    console.error("Error al guardar:", error.message)
    setErrorMessage('Error al guardar el dispositivo o la imagen.')
  } finally {
    setGuardando(false)
  }
}


  const dispositivosFiltrados = dispositivos.filter(item => {
    const texto = busqueda.toLowerCase().trim();
    if (!texto) return true;

    const marca = (item.marca || '').toLowerCase();
    const modelo = (item.modelo || '').toLowerCase();
    const cliente = `${item.nombre || ''} ${item.apellido || ''}`.toLowerCase();

    return marca.includes(texto) || modelo.includes(texto) || cliente.includes(texto);
  });

  useEffect(() => {
    todosDispotivos();
  }, []);

  

  const actualizarDispositivo = async () => {
    const idReal = dispositivoModificando.id_dispositivo;

    if (!idReal) {
        alert("Error: No se encontró el ID del dispositivo para actualizar.");
        return;
      }

    try {
      const { error } = await supabase
        .from('dispositivos')
        .update({
          tipo: dispositivoModificando.tipo,
          marca: dispositivoModificando.marca,
          modelo: dispositivoModificando.modelo,
          observaciones: dispositivoModificando.observaciones
        })
        .eq('id_dispositivo', idReal);

      if (error) throw error;

      todosDispotivos();
      setModificar(false);
      setDispositivoModificando(null);
    } catch (error) {
      console.error("Error al actualizar:", error.message);
      alert("Error al actualizar: " + error.message);
    }
  };
  return (
  <>
    <Head title="Dispositivos" sub="Registrá equipos y asociarlos a un cliente">
    </Head>
    <div className="cols">

      <section className="panel">
        <h2>Registrar dispositivo</h2>
        <div className="device-top">
          <label className="f">Cliente
            <input placeholder="Buscar cliente por DNI" value={dniCliente} onChange={(e) => setDniCliente(e.target.value)} />
          </label>

            <label className="f">Tipo<select value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option>Celular</option>
            <option>Notebook</option>
            <option>Tablet</option>
            <option>PC</option>
            <option>All in one</option>
            <option>Componente Suelto</option>
            <option>Consola</option>
            <option>Mando</option>
            <option>Televisores</option>
            <option>Monitores</option>
            <option>Impresoras</option>
          </select>
          </label>
          </div>
        <div className="grid2">
          <label className="f">Marca<input placeholder="Samsung" value={marca} onChange={(e) => setMarca(e.target.value)} /></label>
          <label className="f">Modelo<input placeholder="Galaxy A07" value={modelo} onChange={(e) => setModelo(e.target.value)} /></label>
          <label className="f observaciones">Observaciones<input value={observaciones} onChange={(e) => setObservaciones(e.target.value)} /></label>
        </div>

        <div className="foto-campo" onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }} onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('drag-over'); }}
          onDrop={(e) => {
          e.preventDefault();
          e.currentTarget.classList.remove('drag-over');
          if (e.dataTransfer.files?.[0]) {
            setFotoEntrada(e.dataTransfer.files[0]);
          }
        }}
      >
  <span className="titulo-fotos">Foto de Entrada</span>
  
  <input id="fotoEntrada" type="file" accept="image/jpeg, image/png, image/webp" onChange={(e) => setFotoEntrada(e.target.files?.[0] || null)}/>

  {!fotoEntrada ? (
    <label htmlFor="fotoEntrada" className="label-subir-custom">
      📁 Arrastra la foto aquí o <b>haz clic</b>
    </label>
  ) : (
    <div className="preview-container">
      <img src={URL.createObjectURL(fotoEntrada)} alt="Vista previa entrada" className="preview-foto"/>
      <div className="preview-info">
        <span className="nombre-archivo">{fotoEntrada.name}</span>
        <button type="button" className="btn-quitar-foto" onClick={() => setFotoEntrada(null)}>
          ✕ Quitar foto
        </button>
      </div>
    </div>
  )}
      {fotoEntrada && (
        <img src={URL.createObjectURL(fotoEntrada)} alt="Vista previa entrada" className="preview-foto"/>
      )}
    </div>
      <div className="foot">
        <button className="btn sec">Cancelar</button>
        <button className="btn" type="submit" onClick={guardarDispositivos}>
          Guardar dispositivo
        </button>
      </div>
    </section>
      <section className="panel">
        {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}
        {loading && <p>Cargando clientes...</p>}  
        <h2>Dispositivos registrados</h2>
              <input 
        type="text" 
        className="search-input" 
        placeholder="Buscar por marca, modelo o cliente" 
        value={busqueda} 
        onChange={(e) => setBusqueda(e.target.value)} 
      /> <ul className="plain dev">
          {Array.isArray(dispositivosFiltrados) && dispositivosFiltrados.map(dispositivo => (
          <li key={dispositivo.id_dispositivo}>
            <img className="img_dispositivos" src={dispositivo.img_entrada} alt={dispositivo.id_dispositivo} />
            <div className="grow">
              <b>{dispositivo.marca} {dispositivo.modelo}</b>
              <br />
              <small>{dispositivo.nombre} {dispositivo.apellido}</small>
            </div>
            <button className="btn sec sm" onClick={() => {setDispositivoModificando(dispositivo);
              setModificar(true);
            }}>
              Editar
            </button>
          </li>
          ))}
          </ul> 
      </section>
    </div>

    {modificar && (
  <Modal title="Modificar Dispositivo" foot={<>
    <button className="btn sec" onClick={() => setModificar(false)}>Cancelar</button>
    <button className="btn" onClick={() => actualizarDispositivo()}>Modificar dispositivo</button>
  </>}>
    <div className="grid2">
      <label className="f">Marca
        <input type="text" value={dispositivoModificando?.marca || ""} onChange={(e) => setDispositivoModificando({...dispositivoModificando, marca: e.target.value})} />
      </label>
      <label className="f">Modelo
        <input type="text" value={dispositivoModificando?.modelo || ""} onChange={(e) => setDispositivoModificando({...dispositivoModificando, modelo: e.target.value})} />
      </label>
      <label className="f">Tipo
        <input type="text" value={dispositivoModificando?.tipo || ""} onChange={(e) => setDispositivoModificando({...dispositivoModificando, tipo: e.target.value})} />
      </label>
      <label className="f">Observaciones
        <input type="text" value={dispositivoModificando?.observaciones || ""} onChange={(e) => setDispositivoModificando({...dispositivoModificando, observaciones: e.target.value})} />
      </label>
    </div>
  </Modal>
    )}
  </>)
}
