import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowUpRight, LockKeyhole, LogOut, Pencil, Plus } from 'lucide-react';
import { Link } from 'react-router';
import { assetUrl, type CaseStudy } from '../../shared/content';
import { api, ApiError, errorText } from '../api';
import { ProjectCredit, ResourceState } from '../components';
import { AssetForm, CaseForm, VariantForm, type StudioRequest } from './StudioForms';
import styles from './Admin.module.css';

type View = { step: 'loading' | 'login' } | { step: 'error'; message: string } | { step: 'ready'; projects: CaseStudy[] };
const tabs = ['Studi kasus', 'Aset merek', 'Varian karya'] as const;
const byPosition = (a: { position: number; id: number }, b: { position: number; id: number }) => a.position - b.position || a.id - b.id;

function Login({ onLogin }: { onLogin: (projects: CaseStudy[]) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true);
    setError('');
    try {
      await api('/admin/login', { method: 'POST', data });
      onLogin(await api<CaseStudy[]>('/admin/cases'));
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  }

  return (
    <div className={styles.page}>
      <main className={styles.loginShell}>
        <Link className={styles.back} to="/">Portofolio Sora <ArrowUpRight size={15} aria-hidden="true" /></Link>
        <section className={styles.login} aria-labelledby="login-heading">
          <span className={styles.loginIcon}><LockKeyhole size={21} aria-hidden="true" /></span>
          <h1 id="login-heading">Masuk ke studio</h1><p>Kelola studi kasus dan aset merek Sora.</p>
          <form onSubmit={submit}>
            <fieldset className={styles.fields} disabled={busy}>
              <label>Email admin<input name="email" type="email" autoComplete="username" maxLength={254} required /></label>
              <label>Kata sandi<input name="password" type="password" autoComplete="current-password" maxLength={256} required /></label>
              <button className={styles.primary} type="submit">{busy ? 'Memeriksa…' : 'Masuk'}</button>
            </fieldset>
            {error && <p className={styles.error} role="alert">{error}</p>}
          </form>
        </section>
        <footer className={styles.footer}><ProjectCredit /></footer>
      </main>
    </div>
  );
}

export default function Admin() {
  const [view, setView] = useState<View>({ step: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [active, setActive] = useState<number | 'new' | null>(null);
  const [tab, setTab] = useState<(typeof tabs)[number]>('Studi kasus');
  const [editing, setEditing] = useState<number | 'new' | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    api<CaseStudy[]>('/admin/cases', { signal: controller.signal }).then((projects) => {
      if (!controller.signal.aborted) setView({ step: 'ready', projects });
    }, (cause) => {
      if (!controller.signal.aborted) setView(cause instanceof ApiError && cause.status === 401 ? { step: 'login' } : { step: 'error', message: errorText(cause) });
    });
    return () => controller.abort();
  }, [attempt]);

  const request: StudioRequest = useCallback(async <T,>(path: string, options?: { method?: string; data?: unknown }) => {
    try { return await api<T>(path, options); }
    catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        setActive(null);
        setView({ step: 'login' });
      }
      throw cause;
    }
  }, []);

  function updateProject(id: number, update: (project: CaseStudy) => CaseStudy, message: string) {
    setView((previous) => previous.step === 'ready'
      ? { step: 'ready', projects: previous.projects.map((item) => item.id === id ? update(item) : item) }
      : previous);
    setEditing(null);
    setNote(message);
  }

  function open(id: number | 'new' | null) {
    setActive(id);
    setTab('Studi kasus');
    setEditing(null);
    setNote('');
    setError('');
  }

  async function logout() {
    setBusy(true);
    setError('');
    try {
      await request('/admin/logout', { method: 'POST' });
      open(null);
      setView({ step: 'login' });
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  }

  if (view.step === 'login') return <Login onLogin={(projects) => { open(null); setView({ step: 'ready', projects }); }} />;
  if (view.step !== 'ready') return <ResourceState loading="Memuat studio…" error={view.step === 'error' ? view.message : undefined}
    retry={() => { setView({ step: 'loading' }); setAttempt((count) => count + 1); }} />;
  const { projects } = view;
  const project = projects.find(({ id }) => id === active);
  const editingCase = !!project || active === 'new';

  return (
    <div className={styles.page}>
      <header className={styles.topBar}><div className={styles.shell}>
        <span className={styles.wordmark}>Studio Sora<span>.</span></span>
        <div className={styles.actions}>
          <Link className={styles.back} to="/" target={editingCase ? '_blank' : undefined} rel={editingCase ? 'noopener' : undefined}>Portofolio <ArrowUpRight size={15} aria-hidden="true" /></Link>
          {!editingCase && <button className={styles.secondary} type="button" onClick={logout} disabled={busy}><LogOut size={16} aria-hidden="true" /> Keluar</button>}
        </div>
      </div></header>
      <main className={styles.shell + ' ' + styles.dashboard}>
        {editingCase && <button className={styles.back} type="button" onClick={() => open(null)}><ArrowLeft size={16} aria-hidden="true" /> Daftar karya</button>}
        <div className={styles.dashboardHead}>
          <div><h1>{project?.name ?? (editingCase ? 'Studi kasus baru' : 'Karya Sora')}</h1>
            {project && <p className={styles.meta}>{project.category} · {project.published ? 'Tampil' : 'Draf'}</p>}</div>
          {!editingCase && <button className={styles.primary} type="button" onClick={() => open('new')}><Plus size={18} aria-hidden="true" /> Buat studi kasus</button>}
          {project?.published && <Link className={styles.secondary} to={'/?proyek=' + project.slug} target="_blank" rel="noopener">Lihat studi kasus <ArrowUpRight size={16} aria-hidden="true" /></Link>}
        </div>
        {project && <nav className={styles.tabs} aria-label="Bagian studi kasus">{tabs.map((item) => (
          <button key={item} type="button" aria-current={item === tab ? 'page' : undefined} onClick={() => { setTab(item); setEditing(null); setNote(''); }}>{item}</button>
        ))}</nav>}
        {note && <p className={styles.notice} role="status">{note}</p>}
        {error && <p className={styles.error} role="alert">{error}</p>}
        {!editingCase ? (
          projects.length ? <ul className={styles.series}>{projects.map((item) => (
            <li key={item.id}>
              <div><h2>{item.name}</h2><p className={styles.meta}>{item.category} · {item.published ? 'Tampil' : 'Draf'} · {item.assets.length} aset · {item.variants.length} varian</p></div>
              <button className={styles.secondary} type="button" aria-label={'Kelola ' + item.name} onClick={() => open(item.id)}><Pencil size={15} aria-hidden="true" /> Kelola</button>
            </li>
          ))}</ul> : <p className={styles.empty}>Belum ada studi kasus.</p>
        ) : tab === 'Studi kasus' ? (
          <CaseForm key={project ? project.id + ':' + project.revision : 'new'} project={project}
            nextPosition={Math.min(9999, (projects.at(-1)?.position ?? 0) + 10)} request={request}
            onSaved={(saved) => {
              setView({ step: 'ready', projects: [...projects.filter(({ id }) => id !== saved.id), saved].sort(byPosition) });
              setActive(saved.id);
              setNote('Studi kasus disimpan.');
            }}
            onRemoved={() => {
              setView({ step: 'ready', projects: projects.filter(({ id }) => id !== active) });
              open(null);
              setNote('Studi kasus dihapus.');
            }} />
        ) : project && tab === 'Aset merek' ? (
          editing ? <AssetForm key={editing} project={project} asset={project.assets.find(({ id }) => id === editing)}
            request={request} onClose={() => setEditing(null)}
            onSaved={(asset) => updateProject(project.id, (item) => ({
              ...item, assets: [...item.assets.filter(({ id }) => id !== asset.id), asset].sort(byPosition),
            }), editing === 'new' ? 'Aset diunggah.' : 'Detail aset disimpan.')}
            onRemoved={(id) => updateProject(project.id, (item) => ({
              ...item, assets: item.assets.filter((asset) => asset.id !== id),
              variants: item.variants.map((variant) => variant.assetId === id ? { ...variant, assetId: null } : variant),
            }), 'Aset dihapus.')} /> : (
            <>
              <button type="button" className={styles.primary} onClick={() => { setEditing('new'); setNote(''); }}><Plus size={17} aria-hidden="true" /> Tambah aset</button>
              {project.assets.length ? <ul className={styles.library}>{project.assets.map((asset) => (
                <li key={asset.id}>
                  <img src={assetUrl(asset.id, { admin: true })} alt={asset.alt} loading="lazy" />
                  <div><h2>{asset.title}</h2><p className={styles.meta}>{asset.kind} · {asset.position}</p>
                    <button className={styles.back} type="button" aria-label={'Sunting aset ' + asset.title} onClick={() => { setEditing(asset.id); setNote(''); }}>Sunting</button>
                  </div>
                </li>
              ))}</ul> : <p className={styles.empty}>Belum ada aset.</p>}
            </>
          )
        ) : project && (
          editing ? <VariantForm key={editing} project={project} variant={project.variants.find(({ id }) => id === editing)}
            request={request} onClose={() => setEditing(null)}
            onSaved={(variant) => updateProject(project.id, (item) => ({
              ...item, variants: [...item.variants.filter(({ id }) => id !== variant.id), variant].sort(byPosition),
            }), 'Varian disimpan.')}
            onRemoved={(id) => updateProject(project.id, (item) => ({
              ...item, variants: item.variants.filter((variant) => variant.id !== id),
            }), 'Varian dihapus.')} /> : (
            <>
              <button type="button" className={styles.primary} onClick={() => { setEditing('new'); setNote(''); }}><Plus size={17} aria-hidden="true" /> Tambah varian</button>
              {project.variants.length ? <ul className={styles.series}>{project.variants.map((variant) => (
                <li key={variant.id}>
                  <div><h2>{variant.name}</h2><p className={styles.meta}>{[variant.color, variant.description].filter(Boolean).join(' · ')}</p></div>
                  <button className={styles.secondary} type="button" aria-label={'Sunting varian ' + variant.name} onClick={() => { setEditing(variant.id); setNote(''); }}>Sunting</button>
                </li>
              ))}</ul> : <p className={styles.empty}>Belum ada varian.</p>}
            </>
          )
        )}
      </main>
      <footer className={styles.shell + ' ' + styles.footer}><ProjectCredit /></footer>
    </div>
  );
}
