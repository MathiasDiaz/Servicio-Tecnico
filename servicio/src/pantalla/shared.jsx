export const ESTADOS = ['Pendiente', 'En diagnóstico', 'En reparación', 'Esperando repuestos', 'Reparado', 'Entregado']
export const Head = ({ title, sub, children }) => (
  
  <header className="head">
    <div><h1>{title}</h1>{sub && <p>{sub}</p>}</div>
    <div className="head-act">{children}</div>
  </header>
)
export const Search = ({ ph }) => (
  <div className="bar">
    <input className="grow" placeholder={ph} />
    <button className="btn sec">Buscar</button>
  </div>
)
export const Drop = ({ title }) => (
  <div className="drop">
    <strong>{title}</strong>
    <span>Arrastrá las fotos acá o</span>
    <button className="btn sec sm">Elegir archivos</button>
    <small>JPG, PNG o WEBP · máximo 10 MB por archivo</small>
  </div>
)
export const Thumbs = ({ n = 3 }) => (
  <div className="thumbs">
    {Array.from({ length: n }).map((_, i) => (
      <div className="thumb" key={i}><span>foto {i + 1}</span><button title="Quitar foto">×</button></div>
    ))}
  </div>
)
export const Modal = ({ title, children, foot }) => (
  <div className="modal-wrap"><div className="modal">
    <h3>{title}</h3>{children}<div className="modal-foot">{foot}</div>
  </div></div>
)

export function Chip({ n }) {
  const indice = ESTADOS.indexOf(n)

  return (
    <span className={`chip s${indice}`}>
      {n}
    </span>
  )
}

