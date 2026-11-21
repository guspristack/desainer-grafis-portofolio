import { useState, type FormEvent, type ReactNode } from 'react';
import { Trash2 } from 'lucide-react';
import { assetKinds, assetUrl, categories, maxUploadBytes, slugFromTitle, type BrandAsset, type CaseStudy, type Variant } from '../../shared/content';
import { ApiError, errorText } from '../api';
import styles from './Admin.module.css';

export type StudioRequest = <T>(path: string, options?: { method?: string; data?: unknown }) => Promise<T>;

function Form({ submitLabel, onSave, onDelete, deletePrompt = 'Hapus entri ini?', onClose, children }: {
  submitLabel: string; onSave: (form: FormData) => Promise<unknown>; onDelete?: () => Promise<unknown>;
  deletePrompt?: string; onClose?: () => void; children: ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function run(operation: () => Promise<unknown>) {
    setBusy(true);
    setError('');
    try { await operation(); }
    catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void run(() => onSave(form));
  }

  return (
    <form className={styles.editor} onSubmit={submit}>
      <fieldset className={styles.fields} disabled={busy}>
        {children}
        <div className={styles.actions}>
          <button className={styles.primary} type="submit">{busy ? 'Memproses…' : submitLabel}</button>
          {onClose && <button className={styles.secondary} type="button" onClick={onClose}>Batal</button>}
          {onDelete && <button className={styles.danger} type="button" onClick={() => {
            if (window.confirm(deletePrompt)) void run(onDelete);
          }}><Trash2 size={17} aria-hidden="true" /> Hapus</button>}
        </div>
      </fieldset>
      {error && <p className={styles.error} role="alert">{error}</p>}
    </form>
  );
}

const value = (form: FormData, name: string) => String(form.get(name) ?? '');
const positionOf = (form: FormData) => Number(value(form, 'position'));

function TextField({ name, label, initial, max, required, rows }: {
  name: string; label: string; initial?: string; max: number; required?: boolean; rows?: number;
}) {
  return (
    <label>{label}
      {rows ? <textarea name={name} defaultValue={initial} maxLength={max} required={required} rows={rows} />
        : <input name={name} defaultValue={initial} maxLength={max} required={required} />}
    </label>
  );
}

function Position({ initial }: { initial: number }) {
  return <label>Urutan tampil<input name="position" type="number" min={0} max={9999} defaultValue={initial} required /></label>;
}

export function CaseForm({ project, nextPosition, request, onSaved, onRemoved }: {
  project?: CaseStudy; nextPosition: number; request: StudioRequest;
  onSaved: (item: CaseStudy) => void; onRemoved: () => void;
}) {
  const [name, setName] = useState(project?.name ?? '');
  const [slugEdit, setSlugEdit] = useState<string>();
  const slug = project?.slug ?? slugEdit ?? slugFromTitle(name);

  async function save(form: FormData) {
    const palette = value(form, 'palette').split(/[\s,]+/).filter(Boolean);
    const input = {
      name, category: value(form, 'category'), description: value(form, 'description'), brief: value(form, 'brief'),
      credit: value(form, 'credit'), deliverable: value(form, 'deliverable'), palette,
      wordmark: value(form, 'wordmark'), typeface: value(form, 'typeface'), position: positionOf(form), published: form.has('published'),
    };
    const response = await request<CaseStudy>('/admin/cases' + (project ? '/' + project.id : ''), {
      method: project ? 'PUT' : 'POST', data: { ...input, ...(project ? { revision: project.revision } : { slug }) },
    });
    onSaved(response);
  }

  return (
    <Form submitLabel="Simpan studi kasus" onSave={save} deletePrompt="Hapus studi kasus beserta semua aset dan variannya?" onDelete={project && !project.published ? async () => {
      await request('/admin/cases/' + project.id, { method: 'DELETE', data: { revision: project.revision } });
      onRemoved();
    } : undefined}>
      <div className={styles.columns}>
        <label>Nama proyek<input name="name" value={name} onChange={(event) => setName(event.target.value)} maxLength={100} required /></label>
        <label>Alamat proyek<input name="slug" value={slug} onChange={(event) => setSlugEdit(event.target.value)} readOnly={!!project} minLength={2}
          maxLength={90} pattern="[a-z0-9]+(-[a-z0-9]+)*" required /></label>
        <label htmlFor="case-category">Kategori
          <select name="category" id="case-category" defaultValue={project?.category ?? categories[0]}>
            {categories.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <Position initial={project?.position ?? nextPosition} />
      </div>
      <TextField name="description" label="Ringkasan" initial={project?.description} max={350} rows={2} />
      <TextField name="brief" label="Cerita studi kasus" initial={project?.brief} max={4500} rows={6} />
      <div className={styles.columns}>
        <TextField name="credit" label="Kredit dan peran" initial={project?.credit} max={220} />
        <TextField name="deliverable" label="Hasil karya" initial={project?.deliverable} max={650} />
        <TextField name="wordmark" label="Wordmark" initial={project?.wordmark} max={32} />
        <TextField name="typeface" label="Tipografi" initial={project?.typeface} max={90} />
      </div>
      <label>Palet warna<input name="palette" defaultValue={project?.palette.join(', ')} placeholder="#2E37B4, #E9F376" maxLength={80} />
        <small className={styles.meta}>Maksimal delapan kode warna #RRGGBB.</small>
      </label>
      <label className={styles.checkbox}><input name="published" type="checkbox" defaultChecked={project?.published} /> Tampilkan studi kasus</label>
    </Form>
  );
}

export function AssetForm({ project, asset, request, onSaved, onRemoved, onClose }: {
  project: CaseStudy; asset?: BrandAsset; request: StudioRequest; onSaved: (asset: BrandAsset) => void;
  onRemoved: (id: number) => void; onClose: () => void;
}) {
  const path = '/admin/cases/' + project.id + '/assets' + (asset ? '/' + asset.id : '');

  async function save(form: FormData) {
    if (!asset) {
      const file = form.get('image');
      if (!(file instanceof File) || !file.size) throw new ApiError(400, 'Pilih satu file gambar.');
      if (file.size > maxUploadBytes) throw new ApiError(400, 'Ukuran aset melebihi 12 MB.');
    }
    const changed = await request<BrandAsset>(path, {
      method: asset ? 'PUT' : 'POST',
      data: asset ? {
        title: value(form, 'title'), kind: value(form, 'kind'), alt: value(form, 'alt'),
        credit: value(form, 'credit'), position: positionOf(form),
      } : form,
    });
    onSaved(changed);
  }

  return (
    <Form submitLabel={asset ? 'Simpan aset' : 'Unggah aset'} onSave={save} onClose={onClose} onDelete={asset ? async () => {
      await request(path, { method: 'DELETE' });
      onRemoved(asset.id);
    } : undefined}>
      {asset ? <figure className={styles.preview}><img src={assetUrl(asset.id, { admin: true })} alt={asset.alt} /><figcaption>{asset.width} × {asset.height} piksel</figcaption></figure>
        : <label>File aset<input name="image" type="file" accept="image/jpeg,image/png,image/webp" required />
          <small className={styles.meta}>JPEG, PNG, atau WebP · maksimal 12 MB</small>
        </label>}
      <div className={styles.columns}>
        <TextField name="title" label="Judul aset" initial={asset?.title} max={100} required />
        <label htmlFor="asset-kind">Jenis aset
          <select id="asset-kind" name="kind" defaultValue={asset?.kind ?? 'Mockup'}>
            {assetKinds.map((kind) => <option key={kind}>{kind}</option>)}
          </select>
        </label>
        <TextField name="alt" label="Teks alternatif" initial={asset?.alt} max={220} required />
        <TextField name="credit" label="Kredit aset" initial={asset?.credit} max={180} />
        <Position initial={asset?.position ?? Math.min(9999, (project.assets.at(-1)?.position ?? 0) + 10)} />
      </div>
    </Form>
  );
}

export function VariantForm({ project, variant, request, onSaved, onRemoved, onClose }: {
  project: CaseStudy; variant?: Variant; request: StudioRequest; onSaved: (variant: Variant) => void;
  onRemoved: (id: number) => void; onClose: () => void;
}) {
  const path = '/admin/cases/' + project.id + '/variants' + (variant ? '/' + variant.id : '');
  return (
    <Form submitLabel="Simpan varian" onClose={onClose} onSave={async (form) => {
      const asset = value(form, 'assetId');
      const changed = await request<Variant>(path, { method: variant ? 'PUT' : 'POST', data: {
        name: value(form, 'name'), description: value(form, 'description'), color: value(form, 'color'),
        assetId: asset ? Number(asset) : null, position: positionOf(form),
      } });
      onSaved(changed);
    }} onDelete={variant ? async () => {
      await request(path, { method: 'DELETE' });
      onRemoved(variant.id);
    } : undefined}>
      <div className={styles.columns}>
        <TextField name="name" label="Nama varian" initial={variant?.name} max={100} required />
        <TextField name="color" label="Warna varian" initial={variant?.color} max={7} />
        <label htmlFor="variant-asset">Gambar varian
          <select id="variant-asset" name="assetId" defaultValue={variant?.assetId ?? ''}>
            <option value="">Tanpa gambar</option>
            {project.assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.title}</option>)}
          </select>
        </label>
        <Position initial={variant?.position ?? Math.min(9999, (project.variants.at(-1)?.position ?? 0) + 10)} />
      </div>
      <TextField name="description" label="Deskripsi varian" initial={variant?.description} max={650} rows={3} />
    </Form>
  );
}
