import { ArrowDown, ArrowUpRight, Asterisk, X } from 'lucide-react';
import { useState } from 'react';
import { assetUrl, categories, type BrandAsset, type CaseStudy } from '../../shared/content';
import { useResource } from '../api';
import { CopyWorkLink, Overlay, ProjectCredit, ResourceState, scrollToSection } from '../components';
import { PortfolioDetails, PortfolioHeader, PortfolioTop, WorkCredits } from '../PortfolioProfile';
import { profiles } from '../portfolioProfiles';
import { useWorkDialog } from '../useWorkDialog';
import styles from './GraphicPortfolio.module.css';

const filters = ['Semua', ...categories] as const;

function getCover(project: CaseStudy) {
  return project.assets.find(({ kind }) => kind === 'Sampul') ?? project.assets[0];
}

function BrandGuide({ project }: { project: CaseStudy }) {
  const [mode, setMode] = useState<'Warna' | 'Monokrom'>('Warna');
  if (!project.wordmark && !project.typeface) return null;
  const mark = project.wordmark || project.name;
  return (
    <section className={styles.temuGuide} aria-labelledby="brand-guide">
      <div className={styles.guideHeader}>
        <h3 id="brand-guide">Panduan identitas {project.name}</h3>
        <div className={styles.filters} role="group" aria-label="Mode wordmark">
          {(['Warna', 'Monokrom'] as const).map((option) => <button key={option} type="button" aria-pressed={mode === option} onClick={() => setMode(option)}>{option}</button>)}
        </div>
      </div>
      <div className={styles.temuViews}>
        <figure>
          <div className={styles.guideMark} data-mode={mode} role="img" aria-label={'Wordmark ' + mode.toLowerCase()}
            style={mode === 'Warna' ? { background: project.palette[1] ?? '#e9f376', color: project.palette[0] ?? '#2e37b4' } : undefined}>
            <strong>{mark}</strong>{project.slug === 'temu' && <span aria-hidden="true" />}
          </div>
          <figcaption>{mode === 'Warna' ? 'Wordmark dengan warna identitas.' : 'Versi satu tinta untuk penggunaan monokrom.'}</figcaption>
        </figure>
        {project.typeface && (
          <div className={styles.typeSpec}>
            <h4>Hierarki tipografi</h4>
            <div><strong>{mark}</strong><small>Wordmark · {project.typeface}</small></div>
            {project.variants[0] && <div><strong>{project.variants[0].name}</strong><small>Nama varian</small></div>}
            <div><span>{project.category}</span><small>Informasi produk</small></div>
          </div>
        )}
      </div>
    </section>
  );
}

function AssetFigure({ asset }: { asset: BrandAsset }) {
  return (
    <figure>
      <a href={assetUrl(asset.id, { full: true })} target="_blank" rel="noopener" aria-label={'Buka gambar ' + asset.title}>
        <img src={assetUrl(asset.id)} alt={asset.alt} loading="lazy" />
      </a>
      <figcaption>{asset.title}{asset.credit ? ' · ' + asset.credit : ''}</figcaption>
    </figure>
  );
}

function CaseDetail({ project, onClose }: { project?: CaseStudy; onClose: () => void }) {
  const cover = project && getCover(project);
  const regular = project?.assets.filter(({ id, kind }) => id !== cover?.id && kind !== 'Perbandingan varian') ?? [];
  const comparisons = project?.assets.filter(({ id, kind }) => id !== cover?.id && kind === 'Perbandingan varian') ?? [];
  return (
    <Overlay label={project?.name ?? 'Studi kasus'} className={styles.dialog} onClose={onClose}>
      <article className={styles.detail}>
        <button type="button" className={styles.close} aria-label="Tutup detail karya" onClick={onClose} autoFocus><X size={22} aria-hidden="true" /></button>
        {!project ? <p className={styles.unavailable} role="alert">Studi kasus tidak tersedia.</p> : (
          <>
            {cover && <img src={assetUrl(cover.id, { full: true })} alt={cover.alt} />}
            <div className={styles.detailBody}>
              <div>
                <p className={styles.kicker}>{project.category}</p>
                <h2>{project.name}</h2>
                <p className={styles.caseBrief}>{project.brief}</p>
                <WorkCredits entries={[
                  ['Kredit & peran', project.credit],
                  ['Hasil', project.deliverable],
                  ...(cover?.credit ? [['Sampul', cover.credit]] as const : []),
                ]} />
                <CopyWorkLink label="Salin tautan karya" />
              </div>
              {project.palette.length > 0 && <div className={styles.palette}>
                <strong>Palet warna</strong>
                {project.palette.map((color, index) => <span key={color + index}><i style={{ background: color }} aria-hidden="true" />{color}</span>)}
              </div>}
            </div>
            <div className={styles.temuStudy}>
              {regular.length > 0 && <section aria-labelledby="brand-assets">
                <h3 id="brand-assets">Aset merek</h3>
                <div className={styles.assetGrid}>{regular.map((asset) => <AssetFigure key={asset.id} asset={asset} />)}</div>
              </section>}
              <BrandGuide project={project} />
              {(project.variants.length > 0 || comparisons.length > 0) && <section className={styles.variantSection} aria-labelledby="case-variants">
                <h3 id="case-variants">Varian karya</h3>
                {comparisons.map((asset) => <div className={styles.variants} key={asset.id}><AssetFigure asset={asset} /></div>)}
                <div className={styles.assetGrid}>
                  {project.variants.map((variant) => {
                    const asset = project.assets.find(({ id }) => id === variant.assetId);
                    return (
                      <article className={styles.variantCard} key={variant.id}>
                        {asset && <AssetFigure asset={asset} />}
                        <h4>{variant.name}</h4>
                        {variant.color && <span className={styles.variantColor}><i style={{ background: variant.color }} aria-hidden="true" />{variant.color}</span>}
                        {variant.description && <p>{variant.description}</p>}
                      </article>
                    );
                  })}
                </div>
              </section>}
            </div>
          </>
        )}
      </article>
    </Overlay>
  );
}

export function GraphicPortfolio() {
  const [category, setCategory] = useState<(typeof filters)[number]>('Semua');
  const { params, openWork, closeWork } = useWorkDialog('proyek');
  const { data, error, retry } = useResource<CaseStudy[]>('/cases');
  if (!data) return <ResourceState loading="Memuat karya Sora…" error={error} retry={retry} />;
  const slug = params.get('proyek');
  const selected = data.find((project) => project.slug === slug);
  const visible = data.filter((project) => category === 'Semua' || project.category === category);
  const enabledFilters = filters.filter((item) => item === category || item === 'Semua' || data.some((project) => project.category === item));

  return (
    <div className={styles.page}>
      <PortfolioHeader profile={profiles.sora} work={{ title: 'Karya', target: 'sora-karya' }} className={styles.header} shell={styles.shell} galleryClass={styles.back}>
        <span className={styles.wordmark}>sora<span>.</span></span>
      </PortfolioHeader>
      <main className={styles.shell} tabIndex={-1}>
        <section className={styles.hero} aria-labelledby="sora-judul">
          <div>
            <p className={styles.kicker}>Sora Anindya · Desain grafis</p>
            <h1 id="sora-judul">Bentuk yang <em>berkarakter.</em></h1>
          </div>
          <div className={styles.intro}>
            <span className={styles.stamp} aria-hidden="true"><Asterisk /></span>
            <p>Identitas visual, kemasan, dan karya cetak dengan pendekatan yang berani dan terukur.</p>
            <button type="button" onClick={() => scrollToSection('sora-karya')}>Jelajahi karya <ArrowDown size={16} aria-hidden="true" /></button>
          </div>
        </section>
        <section className={styles.works} aria-labelledby="sora-karya">
          <div className={styles.worksHeader}>
            <h2 id="sora-karya" tabIndex={-1}>Karya pilihan</h2>
            <div className={styles.filters} role="group" aria-label="Saring karya berdasarkan kategori">
              {enabledFilters.map((item) => <button key={item} type="button" aria-pressed={item === category} onClick={() => setCategory(item)}>{item}</button>)}
            </div>
          </div>
          {!visible.length && <p role="status">Belum ada karya pada kategori ini.</p>}
          <div className={styles.grid}>
            {visible.map((project) => {
              const cover = getCover(project);
              return (
                <button key={project.id} className={styles.project} type="button" aria-label={project.name + ', ' + project.category} onClick={() => openWork({ proyek: project.slug })}>
                  <span className={styles.cover}>
                    {cover ? <img src={assetUrl(cover.id)} alt={cover.alt} loading="lazy" /> : <span className={styles.textCover}>{project.wordmark || project.name}</span>}
                    <span className={styles.open}><ArrowUpRight size={20} aria-hidden="true" /></span>
                  </span>
                  <span className={styles.cardTitle}><strong>{project.name}</strong><span>{project.category}</span></span>
                  <span className={styles.projectDescription}>{project.description}</span>
                </button>
              );
            })}
          </div>
        </section>
        <PortfolioDetails profile={profiles.sora} />
      </main>
      <footer className={styles.footer + ' ' + styles.shell}>
        <div><span>Portofolio desainer fiktif</span><ProjectCredit /></div><PortfolioTop profile={profiles.sora} />
      </footer>
      {slug && <CaseDetail key={slug} project={selected} onClose={closeWork} />}
    </div>
  );
}
