'use client';
import { useEffect, useState } from 'react';
import { api, useAtelier } from './atelier-provider';
export function AddressBook() {
  const [addresses, setAddresses] = useState<any[]>([]),
    [editing, setEditing] = useState<any>(null),
    [busy, setBusy] = useState(false);
  const { notify } = useAtelier();
  async function load() {
    try {
      setAddresses((await api('addresses')).addresses);
    } catch {}
  }
  useEffect(() => {
    void load();
  }, []);
  return (
    <section className="address-book">
      <h2>Tus próximos destinos.</h2>
      <p>Guarda direcciones para utilizarlas al finalizar tu selección.</p>
      <div className="address-grid">
        {addresses.map((a) => (
          <article key={a.id}>
            <h3>{a.label}</h3>
            <p>
              {a.name}
              <br />
              {a.address}
              <br />
              {a.city}, {a.postal} / {a.country}
            </p>
            <button className="text-link" onClick={() => setEditing(a)}>
              Editar dirección
            </button>
            <button
              className="text-link"
              onClick={async () => {
                await api('addresses/delete', { id: a.id });
                await load();
              }}
            >
              Eliminar dirección
            </button>
          </article>
        ))}
      </div>
      <form
        className="inline-editor"
        key={editing?.id || 'new'}
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget),
            form = e.currentTarget;
          setBusy(true);
          try {
            await api('addresses', {
              id: editing?.id,
              label: f.get('label'),
              name: f.get('name'),
              address: f.get('address'),
              city: f.get('city'),
              postal: f.get('postal'),
              country: String(f.get('country')).toUpperCase(),
            });
            setEditing(null);
            form.reset();
            await load();
            notify('Dirección guardada.');
          } catch (err) {
            notify((err as Error).message, true);
          } finally {
            setBusy(false);
          }
        }}
      >
        <h3>{editing ? 'Editar destino' : 'Añadir una dirección'}</h3>
        <div className="form-grid">
          {[
            ['label', 'Nombre de la dirección'],
            ['name', 'Destinatario'],
            ['address', 'Dirección guardada'],
            ['city', 'Ciudad de la dirección'],
            ['postal', 'Código postal de la dirección'],
            ['country', 'País de la dirección (CO, US…)'],
          ].map(([key, label]) => (
            <label className="field" key={key}>
              <span>{label}</span>
              <input
                name={key}
                required
                defaultValue={editing?.[key] || (key === 'country' ? 'CO' : '')}
              />
            </label>
          ))}
        </div>
        <button className="btn" disabled={busy}>
          Guardar dirección
        </button>
      </form>
    </section>
  );
}
export function ReturnRequest({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false),
    [done, setDone] = useState(false),
    [busy, setBusy] = useState(false);
  const { notify } = useAtelier();
  if (done)
    return (
      <p className="return-confirmation">
        Tu solicitud está registrada. El equipo revisará el pedido antes de
        coordinar la devolución.
      </p>
    );
  return (
    <section className="customer-return">
      <button className="text-link" onClick={() => setOpen(!open)}>
        Solicitar devolución o cambio
      </button>
      {open && (
        <form
          className="inline-editor"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            setBusy(true);
            try {
              await api('return/request', { orderId, reason: f.get('reason') });
              setDone(true);
            } catch (err) {
              notify((err as Error).message, true);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="field">
            <span>Cuéntanos qué necesitas</span>
            <textarea name="reason" minLength={10} maxLength={1000} required />
          </label>
          <button className="btn" disabled={busy}>
            Enviar solicitud
          </button>
        </form>
      )}
    </section>
  );
}
