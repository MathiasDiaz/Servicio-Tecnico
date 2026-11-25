import { useState } from 'react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';

export default function Login({ onEnter }) {
  const [dni, setdni] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();
  
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      let { data: empleadoData, error: empError } = await supabase
        .from('empleados')
        .select('*')
        .eq('DNI', dni)
        .eq('contrasena', contrasena)
        .maybeSingle();

      if (empleadoData) {
        localStorage.setItem('usuario_id', empleadoData.id_empleado);
        localStorage.setItem('usuario_tipo', 'empleado');
        
        navigate('/dashboard');
        return;
      }
              
      let { data: clienteData, error: cliError } = await supabase
        .from('clientes')
        .select('*')
        .eq('DNI', dni)
        .eq('contrasena', contrasena)
        .maybeSingle();

      if (clienteData) {
        localStorage.setItem('usuario_id', clienteData.id_cliente);
        localStorage.setItem('usuario_tipo', 'cliente');
        
        navigate('/VerClientes');
      }
      setErrorMessage('Correo o contraseña incorrectos.');

    } catch (error) {
      console.error("Error al iniciar sesión:", error.message);
      setErrorMessage('Error al conectar con la base de datos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login">
      <div className="login-art">
        <h1>Cada equipo, de la recepción a la entrega.</h1>
        <p>Órdenes, repuestos y fotos del trabajo en un solo lugar.</p>
      </div>

      <div className="login-box">
        <h2>Ingresar al sistema</h2>
        {errorMessage && <p style={{ color: 'red', fontSize: '14px' }}>{errorMessage}</p>}

        <form onSubmit={handleLogin} style={{ display: 'contents' }}>
          <label className="f">
            DNI
            <input 
              type="text" 
              placeholder="DNI" 
              value={dni }
              onChange={(e) => setdni(e.target.value)}
              required
            />
          </label>

          <label className="f">
            Contraseña
            <input 
              type="password" 
              placeholder="••••••••" 
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              required
            />
          </label>

          <button className="btn" type="submit" disabled={loading}>
            {loading ? 'Verificando...' : 'Ingresar'}
          </button>
        </form>

        <button className="link" type="button">Olvidé mi contraseña</button>
      </div>
    </div>
  );
}