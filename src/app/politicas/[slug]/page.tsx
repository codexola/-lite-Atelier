import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getContent } from '@/lib/content';
export const dynamic = 'force-dynamic';
const policies: Record<
  string,
  { title: string; key: string; intro: string; sections: [string, string][] }
> = {
  envios: {
    title: 'Envíos & devoluciones',
    key: 'shipping_policy',
    intro: 'Información clara para que sepas qué esperar en cada etapa.',
    sections: [
      [
        'Estado actual',
        'La plataforma está en vista previa. No se realizan envíos ni cobros y no hay plazos de fabricación confirmados. Los pedidos de prueba no representan una compra.',
      ],
      [
        'Cobertura y cálculo orientativo',
        'El flujo está preparado para direcciones en Colombia. En vista previa, el envío de referencia es de COP 25.000, o sin costo a partir de COP 1.200.000. Este cálculo sirve para probar la experiencia; no constituye una tarifa comercial aprobada.',
      ],
      [
        'Antes de activar ventas',
        'La marca deberá publicar cobertura por municipio, operador logístico, tarifas verificadas, plazos, seguimiento y reglas para novedades. También deberá validar impuestos y el precio final que paga el consumidor.',
      ],
      [
        'Devoluciones y retracto',
        'En la vista previa no hay mercancía que devolver ni pagos que reembolsar. Para ventas reales, la política deberá recoger los derechos aplicables en Colombia, incluidos retracto, reversión de pago y garantía conforme al Estatuto del Consumidor, con excepciones de personalización revisadas jurídicamente.',
      ],
    ],
  },
  privacidad: {
    title: 'Tu privacidad',
    key: 'privacy_policy',
    intro: 'Tu identidad te pertenece. Tus datos también merecen cuidado.',
    sections: [
      [
        'Alcance y estado del documento',
        'Esta es una política informativa para la vista previa. La identidad y canales del responsable del tratamiento, tiempos de conservación y proveedores definitivos deberán completarse antes del lanzamiento público comercial.',
      ],
      [
        'Qué datos se utilizan',
        'Una cuenta guarda nombre, correo y una contraseña protegida mediante hash con sal. Los pedidos guardan contacto, dirección, variantes y estado. Los formularios guardan mensajes y consentimiento. Las publicaciones y propuestas se relacionan con tu cuenta. No almacenamos datos de tarjetas.',
      ],
      [
        'Finalidades y consentimiento',
        'Los datos de cuenta permiten autenticar y gestionar tus piezas y propuestas. La suscripción a novedades requiere una autorización independiente. Las métricas opcionales solo se registran después de tu aceptación; no se envían a herramientas publicitarias externas.',
      ],
      [
        'Almacenamiento esencial',
        'El carrito y las preferencias de privacidad se guardan en tu navegador. La sesión se guarda en una cookie HttpOnly. Puedes elegir solo el almacenamiento esencial y seguir utilizando la plataforma.',
      ],
      [
        'Tus derechos en Colombia',
        'Puedes solicitar conocer, actualizar, rectificar, suprimir datos o revocar autorizaciones cuando proceda, de acuerdo con la Ley 1581 de 2012 y sus normas reglamentarias. Usa el formulario de contacto, seleccionando privacidad y datos personales. No compartas documentos de identidad o datos sensibles innecesarios en la vista previa.',
      ],
      [
        'Probador y cámara',
        'La cámara se activa únicamente con tu permiso. El seguimiento y la superposición local se procesan en tu dispositivo. La generación realista es una función separada: solo después de tu autorización explícita se envían la foto seleccionada y la referencia de prenda a FASHN. No guardamos las fotografías ni resultados en tu cuenta o biblioteca pública. El servidor conserva durante un máximo de una hora un identificador de trabajo, usuario, prenda y huella técnica de la solicitud para controlar acceso y evitar duplicados. Los resultados se solicitan en formato privado base64; el proveedor tiene sus propias condiciones de tratamiento y conservación. Borrar la experiencia elimina las vistas locales y el acceso del trabajo, pero no cancela una generación ya enviada al proveedor. Las imágenes generadas pueden variar detalles y no garantizan medidas o ajuste físico.',
      ],
      [
        'Proveedores y seguridad',
        'La versión desplegada requiere almacenamiento persistente y hosting configurados por el propietario. Los pagos y el email, al activarse, usarán proveedores externos. Sus condiciones y posibles transferencias internacionales deben revisarse y declararse antes del lanzamiento.',
      ],
    ],
  },
  terminos: {
    title: 'Términos de la experiencia',
    key: 'terms_policy',
    intro: 'Un espacio creativo con reglas claras.',
    sections: [
      [
        'Una plataforma en vista previa',
        'Las imágenes y el catálogo inicial son conceptuales y han sido generados para esta propuesta. No representan inventario aprobado, certificaciones de materiales ni una oferta de fabricación. Los precios son referencias orientativas en COP.',
      ],
      [
        'Pedidos de prueba',
        'En modo vista previa, confirmar un pedido no genera cargos, contratos de compraventa ni envíos. No debes introducir información sensible real para probarlo.',
      ],
      [
        'Cuentas y acceso',
        'Usa datos propios y protege tu contraseña. No intentes acceder a cuentas ajenas, alterar pagos ni evadir permisos. El acceso administrativo requiere un rol expresamente asignado.',
      ],
      [
        'Co-creación y comunidad',
        'Las propuestas son especificaciones conceptuales. No garantizan viabilidad de producción ni exclusividad. Comparte solo contenido propio o autorizado y evita datos personales de terceros. Los derechos de una colaboración o producción deberán acordarse por separado.',
      ],
      [
        'Lanzamiento comercial',
        'Antes de habilitar pagos reales se deberán publicar razón social, NIT, canales de atención, condiciones de venta, información de productos, entregas, garantías, retracto y devoluciones revisadas para Colombia. Este texto no sustituye esa revisión.',
      ],
    ],
  },
  comunidad: {
    title: 'Un espacio que cuidamos',
    key: 'community_policy',
    intro: 'Perspectivas propias. Respeto compartido.',
    sections: [
      [
        'Comparte con intención',
        'Las historias pueden hablar de estilo, identidad, procesos creativos e inspiración. Usa contenido propio o con autorización y deja espacio para perspectivas distintas.',
      ],
      [
        'Lo que no tiene lugar aquí',
        'No se permiten acoso, discriminación, amenazas, suplantación, datos personales de terceros, contenido sexual explícito, spam ni infracciones de propiedad intelectual.',
      ],
      [
        'Moderación',
        'Publicaciones, comentarios y diseños compartidos requieren revisión previa. El equipo puede rechazar contenido que incumpla estas normas. Los votos indican interés y no comprometen producción.',
      ],
      [
        'Reportar y conversar',
        'Cada publicación ofrece un enlace para contactar y reportar contenido. Incluye el identificador de la publicación y una explicación breve, sin difundir datos sensibles. El equipo gestionará la solicitud desde su panel.',
      ],
    ],
  },
};
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const p = policies[(await params).slug];
  return { title: p?.title || 'Políticas' };
}
export default async function Policy({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const p = policies[(await params).slug];
  if (!p) notFound();
  const custom =
    p.key === 'community_policy' ? '' : await getContent(p.key, '');
  const returns =
    (await params).slug === 'envios'
      ? await getContent('returns_policy', '')
      : '';
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">TRANSPARENCIA ÉLITE</span>
        <h1>{p.title}.</h1>
        <p>{p.intro}</p>
      </div>
      <div className="prose">
        <div className="legal-notice">
          Documento de vista previa · Debe completarse con datos del operador y
          revisión legal antes de activar ventas.
        </div>
        {custom ? (
          <p className="text-area-content">{custom}</p>
        ) : (
          p.sections.map(([title, text]) => (
            <section key={title}>
              <h2>{title}</h2>
              <p>{text}</p>
            </section>
          ))
        )}
        {returns && (
          <section>
            <h2>Devoluciones</h2>
            <p className="text-area-content">{returns}</p>
          </section>
        )}
        <h2>¿Tienes alguna pregunta?</h2>
        <p>
          Puedes <Link href="/contacto">contactar al atelier</Link> para
          consultas sobre estas condiciones.
        </p>
      </div>
    </>
  );
}
