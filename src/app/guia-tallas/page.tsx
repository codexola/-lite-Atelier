import Link from 'next/link';
export const metadata = { title: 'Guía de tallas' };
export default function Sizes() {
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">ENCUENTRA TU PROPORCIÓN</span>
        <h1>
          El estilo es libre.
          <br />
          <em>El ajuste importa.</em>
        </h1>
        <p>
          Una guía orientativa para explorar nuestras siluetas conceptuales.
        </p>
      </div>
      <div className="prose">
        <div className="preview-note">
          Medidas de referencia en centímetros. No son medidas verificadas de
          prendas reales. El tallaje comercial se validará con prototipos y
          fichas técnicas.
        </div>
        <h2>Medidas corporales orientativas.</h2>
        <div className="table-scroll">
          <table className="size-table">
            <thead>
              <tr>
                <th>TALLA</th>
                <th>PECHO</th>
                <th>CINTURA</th>
                <th>CADERA</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['XS', '80–84', '60–64', '86–90'],
                ['S', '84–88', '64–68', '90–94'],
                ['M', '88–94', '68–74', '94–100'],
                ['L', '94–100', '74–80', '100–106'],
                ['XL', '100–106', '80–86', '106–112'],
              ].map((row) => (
                <tr key={row[0]}>
                  {row.map((cell) => (
                    <td key={cell}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h2>Cómo tomar tus medidas.</h2>
        <h3>Pecho</h3>
        <p>
          Rodea la parte más amplia del pecho con una cinta flexible,
          manteniéndola horizontal y sin apretar.
        </p>
        <h3>Cintura</h3>
        <p>
          Mide alrededor de tu cintura natural, donde el cuerpo se flexiona al
          inclinarte a un lado.
        </p>
        <h3>Cadera</h3>
        <p>
          Con los pies juntos, mide la parte más amplia de la cadera. Mantén la
          cinta paralela al suelo.
        </p>
        <h3>Entre dos tallas</h3>
        <p>
          El ajuste también depende del diseño. Las siluetas relajadas y
          estructuradas pueden sentirse diferentes aun con la misma talla. Antes
          de una compra real, consulta la ficha técnica de la pieza y el soporte
          del atelier.
        </p>
        <Link href="/colecciones" className="text-link">
          Volver a las piezas
        </Link>
      </div>
    </>
  );
}
