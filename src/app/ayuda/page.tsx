import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
export const metadata = { title: 'Preguntas frecuentes' };
const faq = [
  [
    '¿Qué es Élite Atelier?',
    'Una propuesta de marca de moda basada en identidad, co-creación y comunidad. La plataforma actual presenta una colección conceptual y permite probar el recorrido completo sin cobros.',
  ],
  [
    '¿Ya puedo comprar prendas reales?',
    'El modo de vista previa permite crear pedidos de prueba. No se realiza ningún cobro ni envío. La venta real se activará cuando el catálogo, inventario, producción y condiciones comerciales estén aprobados.',
  ],
  [
    '¿En qué moneda están los precios?',
    'Todos los precios se muestran en pesos colombianos (COP). Son referencias conceptuales, no una oferta comercial definitiva.',
  ],
  [
    '¿Cómo elijo mi talla?',
    'Consulta la guía orientativa de tallas. Las medidas específicas de cada prenda deberán verificarse con muestras reales antes de la venta.',
  ],
  [
    '¿Cómo funciona la co-creación?',
    'Elige una silueta, material, color, detalle y talla. Con una cuenta puedes guardar tu propuesta en privado o enviarla a moderación para compartirla. Guardar una propuesta no implica que pueda fabricarse ni que su producción esté confirmada.',
  ],
  [
    '¿Qué hace el test de identidad?',
    'Cuatro preguntas sencillas generan una recomendación de estilo mediante reglas reproducibles. No hacemos análisis psicológico ni exigimos registro para ver el resultado.',
  ],
  [
    '¿Puedo compartir mi estilo con la comunidad?',
    'Sí. Crea una cuenta y envía una historia. Las publicaciones y los comentarios se revisan antes de aparecer públicamente. Puedes votar propuestas publicadas y guardar piezas favoritas.',
  ],
  [
    '¿Cómo consulto un pedido?',
    'Usa el enlace de confirmación o entra a tu cuenta si realizaste el pedido con sesión iniciada. La plataforma no marca un pedido como pagado hasta recibir una confirmación verificada de la pasarela.',
  ],
  [
    '¿Puedo cancelar un pedido de prueba?',
    'El equipo puede cancelarlo desde el panel de gestión. Un pedido de prueba no crea compromisos de compra ni requiere un reembolso.',
  ],
  [
    '¿Cómo dejo de recibir novedades?',
    'La baja está disponible en el enlace de los mensajes comerciales. También puedes solicitarla mediante el formulario de contacto, seleccionando privacidad y datos personales.',
  ],
  [
    '¿Hay prueba virtual con inteligencia artificial?',
    'No. La prueba virtual con fotos está contemplada como investigación futura; no se presenta como una función disponible ni como garantía de talla o ajuste.',
  ],
];
export default function Help() {
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">A TU LADO, EN CADA PASO</span>
        <h1>
          La claridad también
          <br />
          es <em>parte del diseño.</em>
        </h1>
      </div>
      <div className="prose">
        <div className="accordion" style={{ marginTop: 0 }}>
          {faq.map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
        <h2>¿Seguimos conversando?</h2>
        <p>Si tu pregunta no está aquí, nos encantará escucharla.</p>
        <Link href="/contacto" className="btn">
          CONTACTAR AL ATELIER <ArrowUpRight size={15} />
        </Link>
      </div>
    </>
  );
}
