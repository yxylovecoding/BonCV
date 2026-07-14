'use client';

import {
  Archive, ArrowDown, ArrowUp, BookOpen, Check, ChevronRight, CircleAlert, Copy, Download,
  FileCode2, FileText, KeyRound, Link2, LoaderCircle, LogOut, Plus, RefreshCw, Save,
  Settings2, ShieldCheck, Sparkles, Trash2, UserRound,
} from 'lucide-react';
import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  AdminState, CvEntry, CvSection, ProfileField, ResumePreset, SectionKind,
} from '@/lib/types';

type Tab = 'content' | 'presets' | 'builds' | 'keys';
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const profileFieldLabels: Record<ProfileField, string> = {
  headline: '求职状态', phone: '手机', email: '邮箱', politicalStatus: '政治面貌', origin: '籍贯', photo: '照片',
};

const sectionKindLabels: Record<SectionKind, string> = {
  education: '教育', research: '科研', competition: '竞赛', experience: '经历', skills: '技能', custom: '自定义',
};

const navItems: Array<{ id: Tab; label: string; icon: typeof UserRound }> = [
  { id: 'content', label: '内容', icon: BookOpen },
  { id: 'presets', label: '方案', icon: Settings2 },
  { id: 'builds', label: '生成', icon: FileText },
  { id: 'keys', label: '连接', icon: Link2 },
];

const tabMeta: Record<Tab, { eyebrow: string; title: string; description: string }> = {
  content: { eyebrow: 'CONTENT LIBRARY', title: '内容库', description: '维护基本信息与经历，修改后自动保存。' },
  presets: { eyebrow: 'RESUME PRESETS', title: '简历方案', description: '选择字段与经历，调整输出顺序。' },
  builds: { eyebrow: 'EXPORT HISTORY', title: '生成记录', description: '下载已生成的 TeX 与 PDF 文件。' },
  keys: { eyebrow: 'INTEGRATIONS', title: '连接密钥', description: '管理 BonBills FIRE 的只读连接。' },
};

function id(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function formatTime(value: string | null) {
  if (!value) return '从未';
  return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function TextField({ label, value, onChange, type = 'text', placeholder }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

function StatusPill({ state }: { state: SaveState }) {
  if (state === 'saving') return <span className="save-pill saving"><LoaderCircle size={13} className="spin" />正在保存</span>;
  if (state === 'saved') return <span className="save-pill saved"><Check size={13} />已保存</span>;
  if (state === 'error') return <span className="save-pill error"><CircleAlert size={13} />保存失败</span>;
  return <span className="save-pill"><Save size={13} />自动保存</span>;
}

export default function BonCvApp() {
  const [data, setData] = useState<AdminState | null>(null);
  const [tab, setTab] = useState<Tab>('content');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [dirtyVersion, setDirtyVersion] = useState(0);
  const dirtyRef = useRef(0);
  const [message, setMessage] = useState('');
  const [revealedKey, setRevealedKey] = useState('');
  const [keyLabel, setKeyLabel] = useState('BonBills FIRE');
  const [busyPreset, setBusyPreset] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch('/api/state', { cache: 'no-store' });
    if (!response.ok) throw new Error('加载失败');
    setData(await response.json() as AdminState);
  }, []);

  useEffect(() => {
    load().catch(() => setMessage('暂时无法加载内容，请刷新重试。'));
  }, [load]);

  const mutate = useCallback((action: (draft: AdminState) => void) => {
    setData((current) => {
      if (!current) return current;
      const draft = structuredClone(current);
      action(draft);
      return draft;
    });
    dirtyRef.current += 1;
    setDirtyVersion(dirtyRef.current);
    setSaveState('saving');
  }, []);

  useEffect(() => {
    if (!data || dirtyVersion === 0) return;
    const versionAtStart = dirtyVersion;
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch('/api/state', {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ expectedRevision: data.revision, profile: data.profile, sections: data.sections, presets: data.presets }),
        });
        const result = await response.json() as AdminState & { state?: AdminState };
        if (response.status === 409) {
          setData(result.state ?? null);
          setMessage('检测到另一个页面更新，已载入最新版本。');
          setSaveState('error');
          dirtyRef.current = 0;
          setDirtyVersion(0);
          return;
        }
        if (!response.ok) throw new Error('save failed');
        setData((current) => current ? { ...current, revision: result.revision, updatedAt: result.updatedAt } : result);
        if (dirtyRef.current === versionAtStart) {
          dirtyRef.current = 0;
          setDirtyVersion(0);
          setSaveState('saved');
          window.setTimeout(() => setSaveState('idle'), 1600);
        }
      } catch {
        setSaveState('error');
      }
    }, 800);
    return () => window.clearTimeout(timer);
  }, [data, dirtyVersion]);

  const allEntries = useMemo(() => data?.sections.flatMap((section) => section.entries) ?? [], [data]);

  if (!data) {
    return <main className="loading-page"><div className="brand-orb">B</div><LoaderCircle className="spin" /><p>正在打开职业档案</p></main>;
  }

  const navCounts: Record<Tab, number> = {
    content: allEntries.length,
    presets: data.presets.length,
    builds: data.builds.length,
    keys: data.integrationKeys.filter((key) => !key.revokedAt).length,
  };

  function updateProfile(field: keyof AdminState['profile'], value: string | string[] | null) {
    mutate((draft) => { (draft.profile[field] as typeof value) = value; });
  }

  function updateEntry(sectionId: string, entryId: string, action: (entry: CvEntry) => void) {
    mutate((draft) => {
      const entry = draft.sections.find((section) => section.id === sectionId)?.entries.find((item) => item.id === entryId);
      if (entry) action(entry);
    });
  }

  function addEntry(section: CvSection) {
    const entryId = id('entry');
    mutate((draft) => {
      draft.sections.find((item) => item.id === section.id)?.entries.push({
        id: entryId, sectionId: section.id, title: '新经历', organization: '', role: '', startDate: '', endDate: '', summary: '', highlights: [], meta: [],
      });
    });
  }

  function removeEntry(sectionId: string, entryId: string) {
    mutate((draft) => {
      const section = draft.sections.find((item) => item.id === sectionId);
      if (section) section.entries = section.entries.filter((entry) => entry.id !== entryId);
      draft.presets.forEach((preset) => {
        preset.selectedEntryIds = preset.selectedEntryIds.filter((idValue) => idValue !== entryId);
        preset.entryOrder = preset.entryOrder.filter((idValue) => idValue !== entryId);
      });
    });
  }

  function addSection() {
    const sectionId = id('section');
    mutate((draft) => draft.sections.push({ id: sectionId, kind: 'custom', title: '新章节', order: draft.sections.length, entries: [] }));
  }

  function createPreset() {
    const now = new Date().toISOString();
    mutate((draft) => draft.presets.push({
      id: id('preset'), name: `简历方案 ${draft.presets.length + 1}`,
      profileFields: ['headline', 'phone', 'email'], selectedEntryIds: allEntries.map((entry) => entry.id),
      sectionOrder: draft.sections.map((section) => section.id), entryOrder: allEntries.map((entry) => entry.id),
      includePhoto: false, createdAt: now, updatedAt: now,
    }));
  }

  function updatePreset(presetId: string, action: (preset: ResumePreset) => void) {
    mutate((draft) => {
      const preset = draft.presets.find((item) => item.id === presetId);
      if (preset) { action(preset); preset.updatedAt = new Date().toISOString(); }
    });
  }

  function movePresetEntry(preset: ResumePreset, entryId: string, direction: -1 | 1) {
    updatePreset(preset.id, (draft) => {
      const order = draft.entryOrder.filter((value) => draft.selectedEntryIds.includes(value));
      const current = order.indexOf(entryId);
      const target = current + direction;
      if (current < 0 || target < 0 || target >= order.length) return;
      [order[current], order[target]] = [order[target], order[current]];
      draft.entryOrder = [...order, ...draft.entryOrder.filter((value) => !order.includes(value))];
    });
  }

  function movePresetSection(preset: ResumePreset, sectionId: string, direction: -1 | 1) {
    updatePreset(preset.id, (draft) => {
      const order = [...draft.sectionOrder];
      const current = order.indexOf(sectionId);
      const target = current + direction;
      if (current < 0 || target < 0 || target >= order.length) return;
      [order[current], order[target]] = [order[target], order[current]];
      draft.sectionOrder = order;
    });
  }

  function removePreset(presetId: string) {
    mutate((draft) => { draft.presets = draft.presets.filter((item) => item.id !== presetId); });
  }

  async function buildPreset(presetId: string) {
    setBusyPreset(presetId);
    setMessage('');
    try {
      const response = await fetch(`/api/resumes/${presetId}/build`, { method: 'POST' });
      const result = await response.json() as { state?: AdminState; error?: string };
      if (!response.ok) throw new Error(result.error || '生成失败');
      if (result.state) setData(result.state);
      setTab('builds');
      setMessage('简历已生成，可以下载 TeX 和 PDF。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '生成失败');
    } finally {
      setBusyPreset(null);
    }
  }

  async function createKey() {
    const response = await fetch('/api/keys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ label: keyLabel }) });
    const result = await response.json() as { secret?: string; state?: AdminState };
    if (!response.ok || !result.secret || !result.state) return setMessage('创建密钥失败');
    setRevealedKey(result.secret);
    setData(result.state);
  }

  async function revokeKey(keyId: string) {
    const response = await fetch(`/api/keys/${keyId}`, { method: 'DELETE' });
    if (response.ok) setData(await response.json() as AdminState);
  }

  async function uploadPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const form = new FormData(); form.append('photo', file);
    const response = await fetch('/api/photo', { method: 'POST', body: form });
    const result = await response.json() as { photoUrl?: string };
    if (response.ok && result.photoUrl) updateProfile('photoUrl', result.photoUrl);
    else setMessage('照片上传失败');
  }

  async function logout() {
    try {
      await fetch('/api/logout', { method: 'POST' });
    } finally {
      window.location.assign('/access');
    }
  }

  return (
    <div className="app-shell">
      <aside className="desktop-sidebar">
        <div className="sidebar-brand">
          <div className="brand-orb small">B</div>
          <div><p className="eyebrow">YOUR CAREER, COMPOSED</p><h1>BonCV</h1></div>
        </div>
        <nav className="side-nav" aria-label="主要导航">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} className={tab === item.id ? 'active' : ''} aria-current={tab === item.id ? 'page' : undefined} onClick={() => setTab(item.id)}>
                <Icon size={18} />
                <span>{item.label}</span>
                <small>{navCounts[item.id]}</small>
              </button>
            );
          })}
        </nav>
        <div className="sidebar-summary">
          <p>职业内容库</p>
          <strong>{allEntries.length}</strong>
          <span>段经历可自由组合</span>
          <div><span><b>{data.presets.length}</b> 套方案</span><span><b>{data.builds.length}</b> 次生成</span></div>
        </div>
        <div className="sidebar-status"><StatusPill state={saveState} /><span>Revision {data.revision}</span></div>
      </aside>

      <div className="workspace-shell">
        <header className="topbar mobile-topbar">
          <div className="brand-row">
            <div className="brand-orb small">B</div>
            <div><p className="eyebrow">YOUR CAREER, COMPOSED</p><h1>BonCV</h1></div>
            <StatusPill state={saveState} />
            <button className="mobile-logout" aria-label="退出登录" title="退出安全会话" onClick={logout}><LogOut size={16} /></button>
          </div>
          <div className="hero-card">
            <div>
              <span className="hero-kicker">职业内容库</span>
              <strong>{allEntries.length}</strong>
              <span>段经历可自由组合</span>
            </div>
            <div className="hero-stat"><span>{data.presets.length}</span>套方案</div>
            <div className="hero-stat"><span>{data.builds.length}</span>次生成</div>
          </div>
        </header>

        <header className="workspace-header">
          <div>
            <p className="eyebrow">{tabMeta[tab].eyebrow}</p>
            <h2>{tabMeta[tab].title}</h2>
            <p>{tabMeta[tab].description}</p>
          </div>
          <div className="workspace-actions">
            <span className="session-label"><ShieldCheck size={15} />安全会话</span>
            <StatusPill state={saveState} />
            {tab === 'presets' && <button className="primary-button compact" onClick={createPreset}><Plus size={16} />新方案</button>}
            <button className="logout-button" onClick={logout}><LogOut size={15} />退出登录</button>
          </div>
        </header>

        {message && <div className="notice"><Sparkles size={16} /><span>{message}</span><button aria-label="关闭提示" onClick={() => setMessage('')}>×</button></div>}

        <main className="main-content">
        {tab === 'content' && (
          <div className="stack content-workspace">
            <section className="panel profile-panel">
              <div className="panel-heading"><div><p className="eyebrow">PROFILE</p><h2>基本信息</h2></div><UserRound size={21} /></div>
              <div className="photo-row">
                <div className="photo-placeholder">{data.profile.photoUrl ? <img src="/api/photo" alt="个人照片" /> : data.profile.name.slice(0, 1)}</div>
                <label className="soft-button">上传照片<input hidden type="file" accept="image/jpeg,image/png" onChange={uploadPhoto} /></label>
                {!data.profile.photoUrl && <span className="hint">当前为无照片版本</span>}
              </div>
              <div className="form-grid">
                <TextField label="姓名" value={data.profile.name} onChange={(value) => updateProfile('name', value)} />
                <TextField label="出生日期" type="date" value={data.profile.birthDate} onChange={(value) => updateProfile('birthDate', value)} />
                <TextField label="手机" value={data.profile.phone} onChange={(value) => updateProfile('phone', value)} />
                <TextField label="邮箱" type="email" value={data.profile.email} onChange={(value) => updateProfile('email', value)} />
                <TextField label="政治面貌" value={data.profile.politicalStatus} onChange={(value) => updateProfile('politicalStatus', value)} />
                <TextField label="籍贯" value={data.profile.origin} onChange={(value) => updateProfile('origin', value)} />
              </div>
              <label className="field"><span>求职状态（每行一条）</span><textarea value={data.profile.headline.join('\n')} onChange={(event) => updateProfile('headline', event.target.value.split('\n'))} /></label>
            </section>

            {[...data.sections].sort((a, b) => a.order - b.order).map((section) => (
              <section className="panel" key={section.id}>
                <div className="panel-heading">
                  <div className="section-title-edit">
                    <span className="section-index">{String(section.order + 1).padStart(2, '0')}</span>
                    <input aria-label="章节名称" value={section.title} onChange={(event) => mutate((draft) => { const item = draft.sections.find((value) => value.id === section.id); if (item) item.title = event.target.value; })} />
                  </div>
                  <span className="kind-pill">{sectionKindLabels[section.kind]}</span>
                </div>
                <div className="entry-list">
                  {section.entries.map((entry) => (
                    <details className="entry-editor" key={entry.id} open={section.entries.length <= 2}>
                      <summary><div><strong>{entry.title || '未命名经历'}</strong><span>{[entry.organization, entry.role].filter(Boolean).join(' · ') || '点击编辑内容'}</span></div><ChevronRight size={18} /></summary>
                      <div className="entry-body">
                        <div className="form-grid">
                          <TextField label="标题" value={entry.title} onChange={(value) => updateEntry(section.id, entry.id, (item) => { item.title = value; })} />
                          <TextField label="组织/学校" value={entry.organization} onChange={(value) => updateEntry(section.id, entry.id, (item) => { item.organization = value; })} />
                          <TextField label="角色/学位" value={entry.role} onChange={(value) => updateEntry(section.id, entry.id, (item) => { item.role = value; })} />
                          <TextField label="开始时间" value={entry.startDate} onChange={(value) => updateEntry(section.id, entry.id, (item) => { item.startDate = value; })} />
                          <TextField label="结束时间" value={entry.endDate} onChange={(value) => updateEntry(section.id, entry.id, (item) => { item.endDate = value; })} />
                          {section.kind === 'education' && <TextField label="毕业日期" type="date" value={entry.graduationDate ?? ''} onChange={(value) => updateEntry(section.id, entry.id, (item) => { item.graduationDate = value || null; })} />}
                        </div>
                        {section.kind === 'education' && (
                          <div className="form-grid">
                            <label className="field"><span>学历</span><select value={entry.educationLevel ?? 'none'} onChange={(event) => updateEntry(section.id, entry.id, (item) => { item.educationLevel = event.target.value as CvEntry['educationLevel']; })}><option value="none">无</option><option value="bachelor">本科</option><option value="master">硕士</option><option value="doctor">博士</option></select></label>
                            <label className="field"><span>状态</span><select value={entry.educationStatus ?? 'completed'} onChange={(event) => updateEntry(section.id, entry.id, (item) => { item.educationStatus = event.target.value as CvEntry['educationStatus']; })}><option value="completed">已毕业</option><option value="in_progress">在读</option></select></label>
                          </div>
                        )}
                        <label className="field"><span>简介</span><textarea value={entry.summary} onChange={(event) => updateEntry(section.id, entry.id, (item) => { item.summary = event.target.value; })} /></label>
                        <label className="field"><span>要点（每行一条）</span><textarea value={entry.highlights.join('\n')} onChange={(event) => updateEntry(section.id, entry.id, (item) => { item.highlights = event.target.value.split('\n').filter(Boolean); })} /></label>
                        <button className="danger-link" onClick={() => removeEntry(section.id, entry.id)}><Trash2 size={14} />删除这段经历</button>
                      </div>
                    </details>
                  ))}
                </div>
                <button className="add-row" onClick={() => addEntry(section)}><Plus size={16} />添加经历</button>
              </section>
            ))}
            <button className="outline-button" onClick={addSection}><Plus size={17} />添加自定义章节</button>
          </div>
        )}

        {tab === 'presets' && (
          <div className="stack presets-workspace">
            <div className="section-intro mobile-section-intro"><div><p className="eyebrow">COMPOSITIONS</p><h2>简历方案</h2><p>为不同岗位保留不同的内容组合。</p></div><button className="primary-button compact" onClick={createPreset}><Plus size={16} />新方案</button></div>
            {data.presets.map((preset) => (
              <section className="panel preset-card" key={preset.id}>
                <div className="panel-heading">
                  <input className="preset-name" value={preset.name} onChange={(event) => updatePreset(preset.id, (item) => { item.name = event.target.value; })} />
                  <button className="icon-danger" aria-label="删除方案" title="删除方案" onClick={() => removePreset(preset.id)}><Trash2 size={16} /></button>
                  <button className="generate-button" disabled={busyPreset === preset.id} onClick={() => buildPreset(preset.id)}>{busyPreset === preset.id ? <LoaderCircle size={16} className="spin" /> : <Sparkles size={16} />}生成</button>
                </div>
                <div className="subsection"><h3>基本字段</h3><div className="chip-grid">{(Object.keys(profileFieldLabels) as ProfileField[]).map((field) => {
                  const checked = preset.profileFields.includes(field);
                  return <label className={`choice-chip ${checked ? 'selected' : ''}`} key={field}><input type="checkbox" checked={checked} onChange={() => updatePreset(preset.id, (item) => { item.profileFields = checked ? item.profileFields.filter((value) => value !== field) : [...item.profileFields, field]; item.includePhoto = field === 'photo' ? !checked : item.includePhoto; })} />{checked && <Check size={13} />}{profileFieldLabels[field]}</label>;
                })}</div></div>
                <div className="subsection"><h3>章节顺序</h3><div className="selection-list">
                  {[...data.sections].sort((a, b) => (preset.sectionOrder.indexOf(a.id) < 0 ? 999 : preset.sectionOrder.indexOf(a.id)) - (preset.sectionOrder.indexOf(b.id) < 0 ? 999 : preset.sectionOrder.indexOf(b.id))).map((section) => (
                    <div className="selection-row" key={section.id}><span><strong>{section.title}</strong><small>{section.entries.length} 段经历</small></span><div className="order-buttons"><button aria-label="章节上移" onClick={() => movePresetSection(preset, section.id, -1)}><ArrowUp size={14} /></button><button aria-label="章节下移" onClick={() => movePresetSection(preset, section.id, 1)}><ArrowDown size={14} /></button></div></div>
                  ))}
                </div></div>
                <div className="subsection"><h3>经历与顺序 <span>{preset.selectedEntryIds.length}/{allEntries.length}</span></h3><div className="selection-list">
                  {[...allEntries].sort((a, b) => preset.entryOrder.indexOf(a.id) - preset.entryOrder.indexOf(b.id)).map((entry) => {
                    const checked = preset.selectedEntryIds.includes(entry.id);
                    return <div className={`selection-row ${checked ? '' : 'muted-row'}`} key={entry.id}><label><input type="checkbox" checked={checked} onChange={() => updatePreset(preset.id, (item) => { item.selectedEntryIds = checked ? item.selectedEntryIds.filter((value) => value !== entry.id) : [...item.selectedEntryIds, entry.id]; if (!item.entryOrder.includes(entry.id)) item.entryOrder.push(entry.id); })} /><span><strong>{entry.title}</strong><small>{data.sections.find((section) => section.id === entry.sectionId)?.title}</small></span></label>{checked && <div className="order-buttons"><button aria-label="上移" onClick={() => movePresetEntry(preset, entry.id, -1)}><ArrowUp size={14} /></button><button aria-label="下移" onClick={() => movePresetEntry(preset, entry.id, 1)}><ArrowDown size={14} /></button></div>}</div>;
                  })}
                </div></div>
              </section>
            ))}
          </div>
        )}

        {tab === 'builds' && (
          <div className="stack builds-workspace">
            <div className="section-intro mobile-section-intro"><div><p className="eyebrow">EXPORTS</p><h2>生成记录</h2><p>每个方案保留最近 20 次输出。</p></div><Archive size={24} /></div>
            {data.builds.length === 0 ? <div className="empty-state"><FileText size={34} /><h3>还没有生成记录</h3><p>前往“方案”，选择内容后生成第一份简历。</p><button className="soft-button" onClick={() => setTab('presets')}>选择方案</button></div> : data.builds.map((build) => (
              <article className="build-card" key={build.id}>
                <div className={`file-icon ${build.status}`}><FileText size={21} /></div>
                <div className="build-info"><strong>{build.presetName}</strong><span>{formatTime(build.createdAt)} · {build.status === 'ready' ? `${build.pageCount ?? '—'} 页 PDF` : 'TeX 已生成'}</span></div>
                <div className="download-group"><a href={`/api/files/${build.id}/tex`} title="下载 TeX"><FileCode2 size={17} /></a>{build.pdfPath && <a href={`/api/files/${build.id}/pdf`} title="下载 PDF"><Download size={17} /></a>}</div>
              </article>
            ))}
          </div>
        )}

        {tab === 'keys' && (
          <div className="stack keys-workspace">
            <div className="section-intro mobile-section-intro"><div><p className="eyebrow">CONNECTIONS</p><h2>连接密钥</h2><p>让 BonBills FIRE 只读最小必要字段。</p></div><KeyRound size={24} /></div>
            <section className="panel key-create">
              <div className="scope-note"><div className="scope-icon"><Check size={16} /></div><div><strong>fire:read</strong><span>仅包含出生日期、学历、毕业日期与数据版本</span></div></div>
              <TextField label="密钥名称" value={keyLabel} onChange={setKeyLabel} />
              <button className="primary-button" onClick={createKey}><Plus size={16} />创建只读密钥</button>
              {revealedKey && <div className="secret-reveal"><div><p>仅展示这一次</p><code>{revealedKey}</code></div><button onClick={() => navigator.clipboard.writeText(revealedKey)}><Copy size={16} />复制</button></div>}
            </section>
            <section className="panel"><div className="panel-heading"><div><p className="eyebrow">ACTIVE KEYS</p><h2>已创建密钥</h2></div><RefreshCw size={19} /></div>
              <div className="key-list">{data.integrationKeys.length === 0 ? <p className="hint">暂无连接密钥</p> : data.integrationKeys.map((key) => <div className={`key-row ${key.revokedAt ? 'revoked' : ''}`} key={key.id}><div><strong>{key.label}</strong><code>{key.prefix}••••••</code><span>最近使用：{formatTime(key.lastUsedAt)}</span></div>{key.revokedAt ? <span className="revoked-label">已撤销</span> : <button className="danger-link" onClick={() => revokeKey(key.id)}>撤销</button>}</div>)}</div>
            </section>
          </div>
        )}
        </main>
      </div>

      <nav className="bottom-nav" aria-label="主要导航">{navItems.map((item) => { const Icon = item.icon; return <button key={item.id} className={tab === item.id ? 'active' : ''} aria-current={tab === item.id ? 'page' : undefined} onClick={() => setTab(item.id)}><Icon size={20} /><span>{item.label}</span></button>; })}</nav>
    </div>
  );
}
