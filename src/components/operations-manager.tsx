'use client';
import { useState, useEffect } from 'react';
import { ArrowUpRight, Download, Package, Plus, Send } from 'lucide-react';
import { api, useAtelier } from './atelier-provider';
import { money } from '@/lib/catalog';
import { MediaUpload } from './catalog-manager';
const cop = (f: FormData, key: string) =>
  Math.round(Number(f.get(key) || 0) * 100);
const input = (
  name: string,
  label: string,
  type = 'text',
  required = true,
  value?: string | number,
) => (
  <label className="field" key={name}>
    <span>{label}</span>
    <input
      name={name}
      defaultValue={value}
      type={type}
      required={required}
      min={type === 'number' ? 0 : undefined}
    />
  </label>
);
function download(rows: any[], name: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers, ...rows.map((r) => headers.map((h) => r[h]))]
    .map((row) =>
      row
        .map((value) => {
          let text = String(
            typeof value === 'object' ? JSON.stringify(value) : (value ?? ''),
          );
          if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
          return '"' + text.replaceAll('"', '""') + '"';
        })
        .join(','),
    )
    .join('\r\n');
  const url = URL.createObjectURL(
    new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' }),
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = name + '.csv';
  a.click();
  URL.revokeObjectURL(url);
}
export function OperationsManager({
  section,
  data,
  base,
  refresh,
}: {
  section: string;
  data: any;
  base: any;
  refresh: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false),
    [customer, setCustomer] = useState<any>(null),
    [editing, setEditing] = useState<any>(null),
    [shipmentDraft, setShipmentDraft] = useState<any>(null);
  const { notify } = useAtelier();
  const [report, setReport] = useState<any>(null);
  useEffect(() => {
    if (section === 'reports')
      api('admin/report')
        .then(setReport)
        .catch((e) => notify(e.message, true));
  }, [section, notify]);
  async function save(key: string, value: unknown) {
    setBusy(true);
    try {
      const result = await api(key, value);
      await refresh();
      notify(
        result.remaining
          ? 'Lote enviado. Quedan ' +
              result.remaining +
              ' destinatarios; continúa el siguiente lote.'
          : result.unresolved
            ? 'Hay entregas pendientes de conciliación; revisa el proveedor antes de reenviar.'
            : result.emailSent === false
              ? 'Guardado. El email requiere configuración.'
              : 'Cambios guardados.',
      );
      return result;
    } catch (e) {
      notify((e as Error).message, true);
      return null;
    } finally {
      setBusy(false);
    }
  }
  const titles: Record<string, [string, string]> = {
    shipping: [
      'Logística, con claridad.',
      'Configura tarifas, registra transportadoras y comparte el seguimiento.',
    ],
    promotions: [
      'Una razón para volver.',
      'Códigos con vigencia, mínimos y límites de uso.',
    ],
    customers: [
      'Personas, no números.',
      'Historial de compra y direcciones con acceso restringido.',
    ],
    returns: [
      'Cada detalle cuenta.',
      'Solicitudes, recepción de prendas y conciliación de reembolsos.',
    ],
    marketing: [
      'Historias que conectan.',
      'Campañas para contactos con consentimiento vigente.',
    ],
    reports: [
      'La perspectiva completa.',
      'Ventas confirmadas, inventario y actividad consentida.',
    ],
    media: [
      'Tu archivo visual.',
      'Fotografía optimizada y persistente, sin editar código.',
    ],
    creation: [
      'De una idea a una pieza.',
      'Viabilidad, coste de producción y decisiones del atelier.',
    ],
    security: [
      'Un acceso de confianza.',
      'Credenciales y permisos exclusivos del equipo.',
    ],
  };
  const title = titles[section] || [
    'Gestión del atelier.',
    'Cada operación, en un mismo lugar.',
  ];
  const real = (data.orders || []).filter((o: any) =>
    ['paid', 'processing', 'shipped', 'delivered'].includes(o.status),
  );
  return (
    <section className="workspace-module">
      <div className="module-heading">
        <div>
          <span className="eyebrow">ÉLITE / OPERACIONES</span>
          <h2>{title[0]}</h2>
          <p>{title[1]}</p>
        </div>
      </div>
      {section === 'media' && (
        <>
          <MediaUpload onUpload={() => void refresh()} />
          <div className="media-grid">
            {data.media.map((m: any) => (
              <article key={m.id}>
                <img src={'/api/media/' + m.id} alt={m.name} />
                <h3>{m.name}</h3>
                <p>
                  {m.width} × {m.height}
                </p>
                <button
                  className="text-link"
                  onClick={() =>
                    void navigator.clipboard
                      .writeText('/api/media/' + m.id)
                      .then(() => notify('Referencia copiada.'))
                  }
                >
                  Copiar referencia
                </button>
              </article>
            ))}
          </div>
          {!data.media.length && (
            <div className="empty-state">
              <h3>Tu próxima campaña empieza aquí.</h3>
              <p>
                Sube fotografías y selecciónalas al editar productos o
                colecciones.
              </p>
            </div>
          )}
        </>
      )}
      {section === 'shipping' && (
        <>
          <div className="operational-grid">
            <div>
              <h3>Métodos de entrega</h3>
              {(data.shipping || []).map((m: any) => (
                <button
                  className="operation-row"
                  key={m.id}
                  onClick={() => setEditing(m)}
                >
                  <span>
                    {m.name}
                    <small>
                      {m.country} / {m.active ? 'Activo' : 'Archivado'}
                    </small>
                  </span>
                  <strong>{money(m.fee)}</strong>
                  <ArrowUpRight size={15} />
                </button>
              ))}
            </div>
            <form
              key={editing?.id || 'new'}
              className="inline-editor"
              onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                if (
                  await save('admin/shipping', {
                    id: editing?.id,
                    name: f.get('name'),
                    country: String(f.get('country')).toUpperCase(),
                    fee: cop(f, 'fee'),
                    freeAt: cop(f, 'freeAt'),
                    estimate: f.get('estimate'),
                    active: f.get('active') === 'on',
                  })
                )
                  setEditing(null);
              }}
            >
              <h3>{editing ? 'Editar método' : 'Nuevo método'}</h3>
              <div className="form-grid">
                {[
                  ['name', 'Nombre del método', editing?.name || ''],
                  [
                    'country',
                    'País (código de dos letras)',
                    editing?.country || 'CO',
                  ],
                  ['estimate', 'Plazo / condiciones', editing?.estimate || ''],
                ].map(([name, label, value]) => (
                  <label className="field" key={name}>
                    <span>{label}</span>
                    <input name={name} required defaultValue={value} />
                  </label>
                ))}
                {[
                  ['fee', 'Tarifa COP', editing?.fee || 0],
                  ['freeAt', 'Envío gratis desde COP', editing?.free_at || 0],
                ].map(([name, label, value]) => (
                  <label className="field" key={String(name)}>
                    <span>{label}</span>
                    <input
                      name={String(name)}
                      type="number"
                      min={0}
                      required
                      defaultValue={Number(value) / 100}
                    />
                  </label>
                ))}
              </div>
              <label className="checkbox-label">
                <input
                  name="active"
                  type="checkbox"
                  defaultChecked={editing?.active ?? true}
                />
                Método activo
              </label>
              <div className="editor-actions">
                <button className="btn" disabled={busy}>
                  Guardar método
                </button>
                <button
                  className="text-link"
                  type="button"
                  onClick={() => setEditing(null)}
                >
                  Nuevo método
                </button>
              </div>
            </form>
          </div>
          <div className="inline-editor">
            <h3>Preparar un envío</h3>
            <p>
              Las etiquetas se obtienen en el portal de tu transportadora.
              Registra aquí su referencia.
            </p>
            {real.length ? (
              <form
                key={shipmentDraft?.order_id || 'new-shipment'}
                onSubmit={async (e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  await save('admin/shipment', {
                    orderId: f.get('orderId'),
                    carrier: f.get('carrier'),
                    tracking: f.get('tracking'),
                    url: f.get('url') || '',
                    status: f.get('status'),
                    note: f.get('note') || '',
                  });
                }}
              >
                <div className="form-grid">
                  <label className="field full">
                    <span>Pedido pagado</span>
                    <select
                      name="orderId"
                      defaultValue={shipmentDraft?.order_id}
                      onChange={(e) =>
                        setShipmentDraft(
                          data.shipments.find(
                            (s: any) => s.order_id === e.target.value,
                          ) || { order_id: e.target.value },
                        )
                      }
                    >
                      {real.map((o: any) => (
                        <option key={o.id} value={o.id}>
                          {o.id.slice(0, 8)} / {o.name} / {o.status}
                        </option>
                      ))}
                    </select>
                  </label>
                  {input(
                    'carrier',
                    'Transportadora',
                    'text',
                    true,
                    shipmentDraft?.carrier,
                  )}
                  {input(
                    'tracking',
                    'Número de seguimiento',
                    'text',
                    true,
                    shipmentDraft?.tracking,
                  )}
                  {input(
                    'url',
                    'Enlace HTTPS de seguimiento',
                    'url',
                    false,
                    shipmentDraft?.url,
                  )}
                  <label className="field">
                    <span>Estado del envío</span>
                    <select
                      name="status"
                      defaultValue={shipmentDraft?.status || 'prepared'}
                    >
                      <option value="prepared">Preparado</option>
                      <option value="shipped">Despachado</option>
                      <option value="delivered">Entregado</option>
                    </select>
                  </label>
                  <label className="field full">
                    <span>Nota interna</span>
                    <textarea name="note" defaultValue={shipmentDraft?.note} />
                  </label>
                </div>
                <button className="btn" disabled={busy}>
                  Guardar envío <Package size={16} />
                </button>
              </form>
            ) : (
              <p className="empty-message">
                Los envíos estarán disponibles cuando exista un pedido pagado.
              </p>
            )}
          </div>
          <div className="table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>PEDIDO</th>
                  <th>TRANSPORTADORA</th>
                  <th>SEGUIMIENTO</th>
                  <th>ESTADO</th>
                </tr>
              </thead>
              <tbody>
                {(data.shipments || []).map((s: any) => (
                  <tr key={s.id}>
                    <td>{s.order_id.slice(0, 8)}</td>
                    <td>{s.carrier}</td>
                    <td>
                      {s.url ? (
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {s.tracking}
                        </a>
                      ) : (
                        s.tracking
                      )}
                    </td>
                    <td>
                      {s.status}{' '}
                      <button
                        type="button"
                        className="text-link"
                        onClick={() => {
                          setShipmentDraft(s);
                          document
                            .querySelector('select[name="orderId"]')
                            ?.scrollIntoView({
                              block: 'center',
                              behavior: 'smooth',
                            });
                        }}
                      >
                        Actualizar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {section === 'promotions' && (
        <>
          <div className="table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>CÓDIGO</th>
                  <th>DESCUENTO</th>
                  <th>USOS</th>
                  <th>VIGENCIA</th>
                  <th>ESTADO</th>
                </tr>
              </thead>
              <tbody>
                {(data.discounts || []).map((d: any) => (
                  <tr key={d.code}>
                    <td>
                      <button
                        className="text-link"
                        onClick={() => setEditing(d)}
                      >
                        {d.code}
                      </button>
                    </td>
                    <td>
                      {d.type === 'percent' ? d.value + '%' : money(d.value)}
                    </td>
                    <td>
                      {d.uses} / {d.maximum_uses}
                    </td>
                    <td>
                      {new Date(d.expires_at).toLocaleDateString('es-CO')}
                    </td>
                    <td>{d.active ? 'Activo' : 'Desactivado'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <form
            key={editing?.code || 'new'}
            className="inline-editor"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              if (
                await save('admin/discount', {
                  code: f.get('code'),
                  type: f.get('type'),
                  value:
                    f.get('type') === 'fixed'
                      ? cop(f, 'value')
                      : Number(f.get('value')),
                  minimum: cop(f, 'minimum'),
                  maximumUses: Number(f.get('maximumUses')),
                  expiresAt: new Date(String(f.get('expiresAt'))).toISOString(),
                  active: f.get('active') === 'on',
                })
              )
                setEditing(null);
            }}
          >
            <h3>{editing ? 'Editar promoción' : 'Nueva promoción'}</h3>
            <div className="form-grid">
              {input('code', 'Código promocional', 'text', true, editing?.code)}
              <label className="field">
                <span>Tipo de descuento</span>
                <select name="type" defaultValue={editing?.type || 'percent'}>
                  <option value="percent">Porcentaje</option>
                  <option value="fixed">Importe en COP</option>
                </select>
              </label>
              {input(
                'value',
                'Valor del descuento',
                'number',
                true,
                editing
                  ? editing.value / (editing.type === 'fixed' ? 100 : 1)
                  : undefined,
              )}
              {input(
                'minimum',
                'Compra mínima COP',
                'number',
                true,
                editing ? editing.minimum / 100 : 0,
              )}
              {input(
                'maximumUses',
                'Máximo de usos',
                'number',
                true,
                editing?.maximum_uses,
              )}
              {input(
                'expiresAt',
                'Vencimiento',
                'datetime-local',
                true,
                editing?.expires_at?.slice(0, 16),
              )}
            </div>
            <label className="checkbox-label">
              <input
                name="active"
                type="checkbox"
                defaultChecked={editing?.active ?? true}
              />
              Promoción activa
            </label>
            <button className="btn" disabled={busy}>
              Guardar promoción
            </button>
            <p className="muted small-text">
              Los códigos se validan en el servidor. Los pedidos de prueba no
              consumen sus usos comerciales.
            </p>
          </form>
        </>
      )}
      {section === 'customers' && (
        <>
          <button
            className="text-link"
            onClick={() => download(data.customers || [], 'elite-clientes')}
          >
            Exportar clientes <Download size={15} />
          </button>
          <div className="table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>CLIENTE</th>
                  <th>PEDIDOS</th>
                  <th>VENTAS CONFIRMADAS</th>
                  <th>HISTORIAL</th>
                </tr>
              </thead>
              <tbody>
                {(data.customers || []).map((c: any) => (
                  <tr key={c.id}>
                    <td>
                      {c.name}
                      <small className="muted">{c.email}</small>
                    </td>
                    <td>{c.orders}</td>
                    <td>{money(c.revenue)}</td>
                    <td>
                      <button
                        className="text-link"
                        onClick={async () => {
                          try {
                            setCustomer(await api('admin/customer?id=' + c.id));
                          } catch (e) {
                            notify((e as Error).message, true);
                          }
                        }}
                      >
                        Ver cliente
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {customer && (
            <div className="inline-editor">
              <h3>{customer.customer.name}</h3>
              <p>{customer.customer.email}</p>
              <h4>Historial de pedidos</h4>
              {customer.orders.map((o: any) => (
                <div className="operation-row" key={o.id}>
                  <span>
                    {o.id.slice(0, 8)} / {o.status}
                  </span>
                  <strong>{money(o.total)}</strong>
                </div>
              ))}
              <h4>Direcciones guardadas</h4>
              {customer.addresses.map((a: any) => (
                <p key={a.id}>
                  {a.label}: {a.address}, {a.city}, {a.country}
                </p>
              ))}
              <button className="text-link" onClick={() => setCustomer(null)}>
                Cerrar historial
              </button>
            </div>
          )}
        </>
      )}
      {section === 'returns' && (
        <>
          {!(data.returns || []).length && (
            <div className="empty-state">
              <h3>Todas las historias, en orden.</h3>
              <p>Las solicitudes de devolución aparecerán aquí.</p>
            </div>
          )}
          {(data.returns || []).map((r: any) => (
            <form
              key={r.id}
              className="inline-editor"
              onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                await save('admin/return', {
                  id: r.id,
                  status: f.get('status'),
                  note: f.get('note'),
                  amount: cop(f, 'amount'),
                  restock: f.get('restock') === 'on',
                });
              }}
            >
              <span className="eyebrow">
                {r.status} / {r.order_id.slice(0, 8)}
              </span>
              <h3>{r.reason}</h3>
              {r.provider_reference && (
                <p>Referencia de pasarela: {r.provider_reference}</p>
              )}
              <div className="form-grid">
                <label className="field">
                  <span>Siguiente decisión</span>
                  <select name="status">
                    <option value="approved">Aprobar recepción</option>
                    <option value="received">Prendas recibidas</option>
                    <option value="refund-requested">
                      Solicitar reembolso
                    </option>
                    <option value="rejected">Rechazar solicitud</option>
                  </select>
                </label>
                {input('amount', 'Importe de reembolso COP', 'number')}
                <label className="field full">
                  <span>Justificación y nota interna</span>
                  <textarea
                    name="note"
                    required
                    minLength={5}
                    defaultValue={r.note}
                  />
                </label>
              </div>
              <label className="checkbox-label">
                <input type="checkbox" name="restock" />
                Todas las prendas recibidas y aptas para reintegrar stock
              </label>
              <button
                className="btn"
                disabled={
                  busy ||
                  [
                    'refunded',
                    'rejected',
                    'refund-pending',
                    'refund-requested',
                  ].includes(r.status)
                }
              >
                Guardar decisión
              </button>
              {r.provider_reference?.startsWith('re_') && (
                <button
                  type="button"
                  className="btn btn-outline"
                  disabled={busy}
                  onClick={() => void save('admin/refund-sync', { id: r.id })}
                >
                  Consultar reembolso en Stripe
                </button>
              )}
              {r.status === 'refund-requested' &&
                !String(r.stripe_id || '').startsWith('cs_') &&
                !r.provider_reference?.startsWith('re_') && (
                  <fieldset className="inline-editor">
                    <legend>Conciliación manual</legend>
                    <p>
                      Primero confirma el reembolso en el portal de la pasarela.
                      Este registro es una declaración del operador.
                    </p>
                    {input(
                      'refundReference',
                      'Referencia de reembolso',
                      'text',
                      false,
                    )}
                    {input('refundNote', 'Nota de conciliación', 'text', false)}
                    <button
                      type="button"
                      className="btn btn-outline"
                      disabled={busy}
                      onClick={async (e) => {
                        const f = new FormData(e.currentTarget.form!);
                        if (
                          window.confirm(
                            '¿Confirmas haber verificado la devolución del dinero en la pasarela?',
                          )
                        )
                          await save('admin/refund-record', {
                            id: r.id,
                            reference: f.get('refundReference'),
                            note: f.get('refundNote'),
                            confirmed: true,
                          });
                      }}
                    >
                      Registrar dinero devuelto
                    </button>
                  </fieldset>
                )}
              <p className="muted small-text">
                Stripe usa su API de reembolso cuando está configurada. Otras
                pasarelas requieren gestionar y conciliar el reembolso en su
                portal; una solicitud no confirma la devolución del dinero.
              </p>
            </form>
          ))}
        </>
      )}
      {section === 'marketing' && (
        <>
          <div className="status-banner">
            <span>
              {data.emailReady
                ? 'Email configurado'
                : 'Email pendiente de configuración'}
            </span>
            <p>
              Solo destinatarios con consentimiento vigente. Revisa el contenido
              antes de enviar.
            </p>
          </div>
          {(data.campaigns || []).map((c: any) => (
            <article className="campaign-row" key={c.id}>
              <div>
                <span className="eyebrow">
                  {c.status} / {c.segment}
                </span>
                <h3>{c.title}</h3>
                <p>{c.subject}</p>
              </div>
              <button
                className="btn small"
                disabled={busy || !data.emailReady || c.status === 'sent'}
                onClick={async () => {
                  if (
                    window.confirm(
                      '¿Enviar esta campaña a contactos con consentimiento?',
                    )
                  )
                    await save('admin/campaign-send', {
                      id: c.id,
                      confirmed: true,
                    });
                }}
              >
                Enviar campaña <Send size={15} />
              </button>
            </article>
          ))}
          <form
            className="inline-editor"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const f = new FormData(form);
              if (
                await save('admin/campaign', {
                  title: f.get('title'),
                  subject: f.get('subject'),
                  body: f.get('body'),
                  segment: f.get('segment'),
                })
              )
                form.reset();
            }}
          >
            <h3>Crear una campaña</h3>
            <div className="form-grid">
              {input('title', 'Nombre interno de campaña')}
              {input('subject', 'Asunto de email')}
              <label className="field">
                <span>Audiencia con consentimiento</span>
                <select name="segment">
                  <option value="subscribers">Suscriptores</option>
                  <option value="customers">Clientes suscritos</option>
                </select>
              </label>
              <label className="field full">
                <span>Contenido del email</span>
                <textarea name="body" required minLength={10} rows={6} />
              </label>
            </div>
            <button className="btn" disabled={busy}>
              Guardar borrador
            </button>
          </form>
        </>
      )}
      {section === 'reports' && (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <span>Ingresos confirmados</span>
              <strong>{money(Number(report?.totals?.netRevenue || 0))}</strong>
            </div>
            <div className="stat-card">
              <span>Pedidos pagados</span>
              <strong>{report?.totals?.orders || 0}</strong>
            </div>
            <div className="stat-card">
              <span>Ticket promedio</span>
              <strong>
                {money(
                  Number(report?.totals?.orders)
                    ? Math.round(
                        Number(report.totals.netRevenue) /
                          Number(report.totals.orders),
                      )
                    : 0,
                )}
              </strong>
            </div>
            <div className="stat-card">
              <span>Clientes registrados</span>
              <strong>{report?.totals?.customers || 0}</strong>
            </div>
          </div>
          <h3>Exportaciones para tu operación</h3>
          <div className="report-actions">
            {[
              ['orders', 'Pedidos'],
              ['customers', 'Clientes'],
              ['discounts', 'Promociones'],
              ['shipments', 'Envíos'],
            ].map(([key, name]) => (
              <a
                key={key}
                className="btn btn-outline"
                href={'/api/admin/export?kind=' + key}
              >
                {name} <Download size={16} />
              </a>
            ))}
          </div>
          <h3>Actividad consentida</h3>
          <div className="stats-grid">
            {(base.events || []).map((e: any) => (
              <div className="stat-card" key={e.name}>
                <span>{e.name.replaceAll('_', ' ')}</span>
                <strong>{e.count}</strong>
              </div>
            ))}
          </div>
          <p className="muted">
            Los pedidos de vista previa se excluyen de ingresos y ventas
            confirmadas. Los indicadores y exportaciones incluyen el registro
            completo. Las listas de trabajo muestran hasta 500 pedidos
            recientes.
          </p>
        </>
      )}
      {section === 'creation' && (
        <>
          {!(base.designs || []).length && (
            <div className="empty-state">
              <h3>Las ideas encontrarán su lugar.</h3>
              <p>Las propuestas compartidas aparecen aquí para revisión.</p>
            </div>
          )}
          {(base.designs || []).map((d: any) => (
            <form
              className="inline-editor"
              key={d.id}
              onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                await save('admin/design-review', {
                  id: d.id,
                  status: f.get('status'),
                  feasibility: f.get('feasibility'),
                  cost: cop(f, 'cost'),
                  note: f.get('note') || '',
                });
              }}
            >
              <span className="eyebrow">
                {d.model} / {d.material} / {d.color} / {d.size}
              </span>
              <h3>{d.name}</h3>
              <p>{d.detail}</p>
              <div className="form-grid">
                <label className="field">
                  <span>Decisión de viabilidad</span>
                  <select name="status">
                    <option value="reviewing">En revisión</option>
                    <option value="feasible">Viable</option>
                    <option value="changes">Necesita cambios</option>
                    <option value="approved">Aprobada</option>
                    <option value="rejected">Rechazada</option>
                  </select>
                </label>
                {input('cost', 'Coste estimado de producción COP', 'number')}
                <label className="field full">
                  <span>Análisis de viabilidad</span>
                  <textarea
                    name="feasibility"
                    required
                    minLength={10}
                    defaultValue={
                      data.reviews.find((r: any) => r.design_id === d.id)
                        ?.feasibility || ''
                    }
                  />
                </label>
                <label className="field full">
                  <span>Notas para la propuesta</span>
                  <textarea name="note" defaultValue={shipmentDraft?.note} />
                </label>
              </div>
              <button className="btn" disabled={busy}>
                Guardar revisión
              </button>
              <p className="muted small-text">
                Una revisión aprobada no confirma fabricación ni derechos
                exclusivos.
              </p>
            </form>
          ))}
        </>
      )}
      {section === 'security' && (
        <>
          <form
            className="inline-editor"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              await save('staff/password', {
                currentPassword: f.get('currentPassword'),
                password: f.get('password'),
              });
            }}
          >
            <h3>Cambiar mi contraseña del equipo</h3>
            <div className="form-grid">
              {input(
                'currentPassword',
                'Contraseña actual del equipo',
                'password',
              )}
              {input('password', 'Nueva contraseña del equipo', 'password')}
            </div>
            <button className="btn" disabled={busy}>
              Actualizar contraseña
            </button>
          </form>
          {base.user.role === 'admin' && (
            <form
              className="inline-editor"
              onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                await save('admin/staff', {
                  email: f.get('email'),
                  name: f.get('name'),
                  password: f.get('password'),
                  role: f.get('role'),
                });
              }}
            >
              <h3>Añadir integrante del equipo</h3>
              <div className="form-grid">
                {input('name', 'Nombre del integrante')}
                {input('email', 'Correo del integrante', 'email')}
                {input(
                  'password',
                  'Contraseña inicial (mínimo 10 caracteres)',
                  'password',
                )}
                <label className="field">
                  <span>Responsabilidad</span>
                  <select name="role">
                    <option value="editor">
                      Editor · catálogo y contenido
                    </option>
                    <option value="operator">
                      Operador · pedidos y atención
                    </option>
                    <option value="admin">
                      Administrador · acceso completo
                    </option>
                  </select>
                </label>
              </div>
              <button className="btn" disabled={busy}>
                Crear acceso del equipo
              </button>
            </form>
          )}
        </>
      )}
    </section>
  );
}
