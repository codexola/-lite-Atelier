import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { ContactForm } from '@/components/contact-form';
import { getContent } from '@/lib/content';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Contacto' };
export default async function Contact() {
  const email = await getContent('contact_email', '');
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">ESTAMOS PARA ESCUCHARTE</span>
        <h1>
          Cada conexión empieza
          <br />
          con un <em>hola.</em>
        </h1>
      </div>
      <div className="page-container content-grid">
        <div className="contact-block">
          <span className="eyebrow">EL ATELIER · COLOMBIA</span>
          <h2 style={{ marginTop: 20 }}>
            Hablemos de
            <br />
            lo que te mueve.
          </h2>
          <p>
            Este es nuestro espacio para consultas, colaboraciones y
            conversaciones sobre identidad y diseño.
          </p>
          {email && (
            <div className="contact-detail">
              <span>CORREO DEL ATELIER</span>
              <a href={'mailto:' + email}>{email}</a>
            </div>
          )}
          <div className="contact-detail">
            <span>¿BUSCAS UNA RESPUESTA RÁPIDA?</span>
            <Link className="text-link" href="/ayuda">
              Preguntas frecuentes <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="contact-detail">
            <span>TU ESPACIO PERSONAL</span>
            <Link className="text-link" href="/cuenta">
              Consultar mis pedidos <ArrowUpRight size={14} />
            </Link>
          </div>
          <p className="form-note">
            La plataforma está en vista previa. Los canales y horarios
            comerciales definitivos se publicarán al aprobar el lanzamiento.
          </p>
        </div>
        <ContactForm />
      </div>
    </>
  );
}
