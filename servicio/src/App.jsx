import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from './supabase';

import Dashboard from './pantalla/Dashboard';
import Clientes from './pantalla/Clientes';
import Dispositivos from './pantalla/Dispositivos';
import Ordenes from './pantalla/Ordenes';
import OrdenNueva from './pantalla/OrdenNueva';
import OrdenDetalle from './pantalla/OrdenDetalle';
import Stock from './pantalla/Stock';
import Login from './pantalla/Login';
import { VerClientes } from './pantalla/VerClientes';

function RutaProtegida({ children }) {
    const usuarioId = localStorage.getItem('usuario_id');
    const usuarioTipo = localStorage.getItem('usuario_tipo');

    if (!usuarioId || !usuarioTipo) {
        return <Navigate to="/" replace />;
    }

    return children;
}

function PantallaPrincipal() {
    const navigate = useNavigate();
    const location = useLocation();

    // Recuperamos los datos seguros desde el almacenamiento del navegador
    const idUsuario = localStorage.getItem('usuario_id');
    const tipoUsuario = localStorage.getItem('usuario_tipo');
    const esCliente = tipoUsuario?.toLowerCase() === 'cliente';

    const esActivo = (ruta) => location.pathname === ruta;

    const cerrarSesion = () => {
        localStorage.removeItem('usuario_id');
        localStorage.removeItem('usuario_tipo');
        navigate('/');
    };

    return (
        <div className="shell">
            <aside className="side">
                <div className="brand">
                    <span className="brand-mark">ST</span>
                    Taller Central
                </div>

                <p style={{ padding: '10px', fontSize: '13px', color: '#888' }}>
                    {tipoUsuario ? `${tipoUsuario.toUpperCase()}: ID ${idUsuario}` : ''}
                </p>

                <nav>
                    {!esCliente && (
                        <>
                    <button className={esActivo('/dashboard') ? 'on' : ''} onClick={() => navigate('/dashboard')}>
                        Panel
                    </button>
                    <button className={esActivo('/clientes') ? 'on' : ''} onClick={() => navigate('/clientes')}>
                        Clientes
                    </button>
                    <button className={esActivo('/dispositivos') ? 'on' : ''} onClick={() => navigate('/dispositivos')}>
                        Dispositivos
                    </button>
                    <button className={esActivo('/ordenes') ? 'on' : ''} onClick={() => navigate('/ordenes')}>
                        Órdenes de servicio
                    </button>
                    <button className={esActivo('/nueva') ? 'on' : ''} onClick={() => navigate('/nueva')}>
                        Nueva orden
                    </button>
                    <button className={esActivo('/detalle') ? 'on' : ''} onClick={() => navigate('/detalle')}>
                        Detalle de orden
                    </button>
                    <button className={esActivo('/stock') ? 'on' : ''} onClick={() => navigate('/stock')}>
                        Repuestos y stock
                    </button>
                    </>)}
                    <button className={esActivo('/VerClientes') ? 'on' : ''} onClick={() => navigate('/VerClientes')}>
                        Ver Clientes
                    </button>
                </nav>

                <button 
                    className="ghost out" 
                    onClick={cerrarSesion}
                    style={{ textAlign: 'center' }}
                >
                    Cerrar sesión
                </button>
            </aside>

            <main className="main">
                <Routes>
                    {!esCliente && (
                        <>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/clientes" element={<Clientes />} />
                    <Route path="/dispositivos" element={<Dispositivos />} />
                    <Route path="/ordenes" element={<Ordenes />} />
                    <Route path="/nueva" element={<OrdenNueva />} />
                    <Route path="/detalle" element={<OrdenDetalle />} />
                    <Route path="/detalle/:id" element={<OrdenDetalle />} />
                    <Route path="/stock" element={<Stock />} />
                    </>)}

                    <Route path="/VerClientes" element={<VerClientes />} />
                    <Route path="*" element={<Navigate to={esCliente ? "/VerClientes" : "/dashboard"} replace />}/>
                </Routes>
            </main>
        </div>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Login />} />
                <Route 
                    path="/*" 
                    element={
                        <RutaProtegida>
                            <PantallaPrincipal />
                        </RutaProtegida>
                    } 
                />
            </Routes>
        </BrowserRouter>
    );
}