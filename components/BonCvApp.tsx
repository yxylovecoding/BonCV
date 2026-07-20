'use client';

import {
  Archive, BookOpen, Check, ChevronRight, CircleAlert, Copy, Download, ExternalLink, Eye,
  FileCode2, FileText, GripVertical, KeyRound, Layers, Link2, LoaderCircle, LogOut, Plus,
  RefreshCw, RotateCcw, Save, Settings2, ShieldCheck, Sparkles, Trash2, UserRound, X,
} from 'lucide-react';
import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { groupBuildsByPreset } from '@/lib/builds';
import { compactHighlights, highlightsFromTextarea } from '@/lib/highlights';
import { completeOrder, reorderById } from '@/lib/order';
import type {
  AdminState, CvEntry, CvSection, ProfileField, ResumeEntryOverride, ResumePreset, SectionKind,
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
  { id: 'presets', label: '方向', icon: Settings2 },
  { id: 'builds', label: '生成', icon: FileText },
  { id: 'keys', label: '连接', icon: Link2 },
];

const tabMeta: Record<Tab, { eyebrow: string; title: string; description: string }> = {
  content: { eyebrow: 'CONTENT LIBRARY', title: '内容库', description: '维护基本信息与经历，修改后自动保存。' },
  presets: { eyebrow: 'JD DIRECTIONS', title: 'JD 方向', description: '复用通用内容，并为不同岗位定制项目表达。' },
  builds: { eyebrow: 'ITERATION HISTORY', title: '生成记录', description: '按 JD 方向查看和迭代已生成的简历。' },
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

interface SortableListProps<T> {
  items: T[];
  getId: (item: T) => string;
  label: string;
  className: string;
  onMove: (activeId: string, overId: string) => void;
  renderItem: (item: T, index: number, handle: ReactNode) => ReactNode;
}

function SortableList<T>({ items, getId, label, className, onMove, renderItem }: SortableListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeIdRef = useRef<string | null>(null);
  const lastOverIdRef = useRef<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  function finishDrag(event: React.PointerEvent<HTMLButtonElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    activeIdRef.current = null;
    lastOverIdRef.current = null;
    setDraggingId(null);
  }

  return (
    <div ref={containerRef} className={className} role="list" aria-label={`${label}排序列表`}>
      {items.map((item, index) => {
        const itemId = getId(item);
        const handle = (
          <button
            type="button"
            className="drag-handle"
            aria-label={`拖动调整${label}顺序`}
            title="拖动调整顺序"
            onPointerDown={(event) => {
              if (event.button !== 0) return;
              event.preventDefault();
              event.currentTarget.setPointerCapture(event.pointerId);
              activeIdRef.current = itemId;
              lastOverIdRef.current = itemId;
              setDraggingId(itemId);
            }}
            onPointerMove={(event) => {
              const activeId = activeIdRef.current;
              if (!activeId) return;
              const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-sortable-id]');
              if (!target || !containerRef.current?.contains(target)) return;
              const overId = target.dataset.sortableId;
              if (!overId || overId === lastOverIdRef.current) return;
              lastOverIdRef.current = overId;
              if (overId !== activeId) onMove(activeId, overId);
            }}
            onPointerUp={finishDrag}
            onPointerCancel={finishDrag}
            onKeyDown={(event) => {
              if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
              event.preventDefault();
              const targetIndex = index + (event.key === 'ArrowUp' ? -1 : 1);
              if (targetIndex >= 0 && targetIndex < items.length) onMove(itemId, getId(items[targetIndex]));
            }}
          >
            <GripVertical size={17} />
          </button>
        );
        return <div className={`sortable-item ${draggingId === itemId ? 'is-dragging' : ''}`} data-sortable-id={itemId} role="listitem" key={itemId}>{renderItem(item, index, handle)}</div>;
      })}
    </div>
  );
}

interface HeadlineItem {
  id: string;
  index: number;
  value: string;
}

function headlineItems(values: string[], stableIds: string[]): HeadlineItem[] {
  return values.map((value, index) => ({ id: stableIds[index], index, value }));
}

function orderedItems<T extends { id: string }>(items: T[], order: string[]) {
  const byId = new Map(items.map((item) => [item.id, item]));
  return completeOrder(items.map((item) => item.id), order).map((id) => byId.get(id)).filter((item): item is T => Boolean(item));
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
  const [previewBuildId, setPreviewBuildId] = useState<string | null>(null);
  const [expandedOverrideKey, setExpandedOverrideKey] = useState<string | null>(null);
  const headlineIdsRef = useRef<string[]>([]);

  const load = useCallback(async () => {
    const response = await fetch('/api/state', { cache: 'no-store' });
    if (!response.ok) throw new Error('加载失败');
    setData(await response.json() as AdminState);
  }, []);

  useEffect(() => {
    load().catch(() => setMessage('暂时无法加载内容，请刷新重试。'));
  }, [load]);

  useEffect(() => {
    if (!previewBuildId) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPreviewBuildId(null);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [previewBuildId]);

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
  const allSectionIds = useMemo(() => data?.sections.map((section) => section.id) ?? [], [data]);
  const headlineValues = data?.profile.headline ?? [];
  if (headlineIdsRef.current.length > headlineValues.length) headlineIdsRef.current = headlineIdsRef.current.slice(0, headlineValues.length);
  while (headlineIdsRef.current.length < headlineValues.length) headlineIdsRef.current.push(id('headline'));
  const profileHeadlineItems = useMemo(() => headlineItems(headlineValues, headlineIdsRef.current), [headlineValues]);
  const buildGroups = useMemo(() => groupBuildsByPreset(data?.builds ?? []), [data?.builds]);
  const previewBuild = data?.builds.find((build) => build.id === previewBuildId && build.pdfPath) ?? null;

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

  function moveHeadline(activeId: string, overId: string) {
    const reorderedIds = reorderById(profileHeadlineItems.map((item) => item.id), activeId, overId);
    const byId = new Map(profileHeadlineItems.map((item) => [item.id, item.value]));
    headlineIdsRef.current = reorderedIds;
    updateProfile('headline', reorderedIds.map((itemId) => byId.get(itemId) ?? ''));
  }

  function updateHeadline(index: number, value: string) {
    mutate((draft) => { draft.profile.headline[index] = value; });
  }

  function removeHeadline(index: number) {
    headlineIdsRef.current = headlineIdsRef.current.filter((_, itemIndex) => itemIndex !== index);
    mutate((draft) => { draft.profile.headline = draft.profile.headline.filter((_, itemIndex) => itemIndex !== index); });
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
        delete preset.entryOverrides[entryId];
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
      id: id('preset'), name: `JD 方向 ${draft.presets.length + 1}`,
      profileFields: ['headline', 'phone', 'email'], selectedEntryIds: allEntries.map((entry) => entry.id),
      sectionOrder: draft.sections.map((section) => section.id), entryOrder: allEntries.map((entry) => entry.id),
      entryOverrides: {},
      includePhoto: false, createdAt: now, updatedAt: now,
    }));
  }

  function updatePreset(presetId: string, action: (preset: ResumePreset) => void) {
    mutate((draft) => {
      const preset = draft.presets.find((item) => item.id === presetId);
      if (preset) { action(preset); preset.updatedAt = new Date().toISOString(); }
    });
  }

  function enableEntryOverride(preset: ResumePreset, entry: CvEntry) {
    updatePreset(preset.id, (draft) => {
      draft.entryOverrides[entry.id] = {
        title: entry.title,
        role: entry.role,
        summary: entry.summary,
        highlights: [...entry.highlights],
      };
    });
    setExpandedOverrideKey(`${preset.id}:${entry.id}`);
  }

  function updateEntryOverride(presetId: string, entryId: string, action: (override: ResumeEntryOverride) => void) {
    updatePreset(presetId, (draft) => {
      const override = draft.entryOverrides[entryId];
      if (override) action(override);
    });
  }

  function resetEntryOverride(presetId: string, entryId: string) {
    updatePreset(presetId, (draft) => { delete draft.entryOverrides[entryId]; });
    setExpandedOverrideKey((current) => current === `${presetId}:${entryId}` ? null : current);
  }

  function movePresetEntry(preset: ResumePreset, activeId: string, overId: string) {
    updatePreset(preset.id, (draft) => {
      const selected = new Set(draft.selectedEntryIds);
      const fullOrder = completeOrder(allEntries.map((entry) => entry.id), draft.entryOrder);
      const selectedOrder = fullOrder.filter((entryId) => selected.has(entryId));
      const reordered = reorderById(selectedOrder, activeId, overId);
      draft.entryOrder = [...reordered, ...fullOrder.filter((entryId) => !selected.has(entryId))];
    });
  }

  function movePresetSection(preset: ResumePreset, activeId: string, overId: string) {
    updatePreset(preset.id, (draft) => {
      const sectionIds = completeOrder(allSectionIds, draft.sectionOrder);
      draft.sectionOrder = reorderById(sectionIds, activeId, overId);
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
      setMessage('简历已生成，可以预览或下载 TeX 和 PDF。');
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
          <div><span><b>{data.presets.length}</b> 个方向</span><span><b>{data.builds.length}</b> 次迭代</span></div>
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
            <div className="hero-stat"><span>{data.presets.length}</span>个方向</div>
            <div className="hero-stat"><span>{data.builds.length}</span>次迭代</div>
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
            {tab === 'presets' && <button className="primary-button compact" onClick={createPreset}><Plus size={16} />新方向</button>}
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
              <div className="field headline-field">
                <span>求职状态</span>
                <SortableList
                  items={profileHeadlineItems}
                  getId={(item) => item.id}
                  label="求职状态"
                  className="headline-list"
                  onMove={moveHeadline}
                  renderItem={(item, index, handle) => (
                    <div className="headline-row">
                      {handle}
                      <input aria-label={`求职状态 ${index + 1}`} value={item.value} onChange={(event) => updateHeadline(item.index, event.target.value)} />
                      <button type="button" className="remove-headline" aria-label={`删除求职状态 ${index + 1}`} title="删除" onClick={() => removeHeadline(item.index)}><Trash2 size={14} /></button>
                    </div>
                  )}
                />
                <button type="button" className="headline-add" disabled={data.profile.headline.length >= 12} onClick={() => updateProfile('headline', [...data.profile.headline, ''])}><Plus size={14} />添加一条求职状态</button>
              </div>
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
                        <label className="field">
                          <span>要点（每行一条）</span>
                          <textarea
                            value={entry.highlights.join('\n')}
                            onChange={(event) => updateEntry(section.id, entry.id, (item) => { item.highlights = highlightsFromTextarea(event.target.value); })}
                            onBlur={() => {
                              if (entry.highlights.some((item) => !item)) updateEntry(section.id, entry.id, (item) => { item.highlights = compactHighlights(item.highlights); });
                            }}
                          />
                        </label>
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
            <div className="section-intro mobile-section-intro"><div><p className="eyebrow">JD DIRECTIONS</p><h2>JD 方向</h2><p>通用内容只维护一次，项目表达可按岗位定制。</p></div><button className="primary-button compact" onClick={createPreset}><Plus size={16} />新方向</button></div>
            {data.presets.map((preset) => (
              <section className="panel preset-card" key={preset.id}>
                <div className="panel-heading">
                  <input className="preset-name" value={preset.name} onChange={(event) => updatePreset(preset.id, (item) => { item.name = event.target.value; })} />
                  <button className="icon-danger" aria-label="删除方向" title="删除方向" onClick={() => removePreset(preset.id)}><Trash2 size={16} /></button>
                  <button className="generate-button" disabled={busyPreset === preset.id} onClick={() => buildPreset(preset.id)}>{busyPreset === preset.id ? <LoaderCircle size={16} className="spin" /> : <Sparkles size={16} />}生成</button>
                </div>
                <div className="subsection"><h3>基本字段</h3><div className="chip-grid">{(Object.keys(profileFieldLabels) as ProfileField[]).map((field) => {
                  const checked = preset.profileFields.includes(field);
                  return <label className={`choice-chip ${checked ? 'selected' : ''}`} key={field}><input type="checkbox" checked={checked} onChange={() => updatePreset(preset.id, (item) => { item.profileFields = checked ? item.profileFields.filter((value) => value !== field) : [...item.profileFields, field]; item.includePhoto = field === 'photo' ? !checked : item.includePhoto; })} />{checked && <Check size={13} />}{profileFieldLabels[field]}</label>;
                })}</div></div>
                <div className="subsection"><h3>章节顺序</h3>
                  <SortableList
                    items={orderedItems(data.sections, preset.sectionOrder)}
                    getId={(section) => section.id}
                    label="章节"
                    className="selection-list"
                    onMove={(activeId, overId) => movePresetSection(preset, activeId, overId)}
                    renderItem={(section, _index, handle) => (
                      <div className="selection-row"><span><strong>{section.title}</strong><small>{section.entries.length} 段经历</small></span>{handle}</div>
                    )}
                  />
                </div>
                <div className="subsection"><h3>经历与顺序 <span>{preset.selectedEntryIds.length}/{allEntries.length}</span></h3>
                  <SortableList
                    items={orderedItems(allEntries, preset.entryOrder)}
                    getId={(entry) => entry.id}
                    label="经历"
                    className="selection-list"
                    onMove={(activeId, overId) => {
                      if (preset.selectedEntryIds.includes(activeId) && preset.selectedEntryIds.includes(overId)) movePresetEntry(preset, activeId, overId);
                    }}
                    renderItem={(entry, _index, handle) => {
                      const checked = preset.selectedEntryIds.includes(entry.id);
                      const override = preset.entryOverrides[entry.id];
                      const overrideKey = `${preset.id}:${entry.id}`;
                      const expanded = expandedOverrideKey === overrideKey;
                      return (
                        <div className="entry-version-block">
                          <div className={`selection-row entry-selection-row ${checked ? '' : 'muted-row'}`}>
                            <label><input type="checkbox" checked={checked} onChange={() => updatePreset(preset.id, (item) => { item.selectedEntryIds = checked ? item.selectedEntryIds.filter((value) => value !== entry.id) : [...item.selectedEntryIds, entry.id]; if (!item.entryOrder.includes(entry.id)) item.entryOrder.push(entry.id); })} /><span><strong>{entry.title}</strong><small>{data.sections.find((section) => section.id === entry.sectionId)?.title}</small></span></label>
                            {checked && <button type="button" className={`entry-version-button ${override ? 'customized' : ''}`} aria-expanded={override ? expanded : undefined} onClick={() => override ? setExpandedOverrideKey(expanded ? null : overrideKey) : enableEntryOverride(preset, entry)}>{override ? <Sparkles size={12} /> : <Layers size={12} />}{override ? 'JD 专属' : '通用'}</button>}
                            {checked && handle}
                          </div>
                          {checked && override && expanded && (
                            <div className="entry-override-editor">
                              <div className="override-heading"><div><strong>{preset.name} · 专属版本</strong><span>组织、时间等信息继续继承内容库。</span></div><button type="button" onClick={() => resetEntryOverride(preset.id, entry.id)}><RotateCcw size={13} />恢复通用</button></div>
                              <div className="override-grid">
                                <label className="field"><span>JD 专属标题</span><input value={override.title ?? entry.title} onChange={(event) => updateEntryOverride(preset.id, entry.id, (item) => { item.title = event.target.value; })} /></label>
                                <label className="field"><span>JD 专属角色/定位</span><input value={override.role ?? entry.role} onChange={(event) => updateEntryOverride(preset.id, entry.id, (item) => { item.role = event.target.value; })} /></label>
                              </div>
                              <label className="field"><span>JD 专属简介</span><textarea value={override.summary ?? entry.summary} onChange={(event) => updateEntryOverride(preset.id, entry.id, (item) => { item.summary = event.target.value; })} /></label>
                              <label className="field">
                                <span>JD 专属要点（每行一条）</span>
                                <textarea
                                  value={(override.highlights ?? entry.highlights).join('\n')}
                                  onChange={(event) => updateEntryOverride(preset.id, entry.id, (item) => { item.highlights = highlightsFromTextarea(event.target.value); })}
                                  onBlur={() => {
                                    if (override.highlights?.some((item) => !item)) updateEntryOverride(preset.id, entry.id, (item) => { item.highlights = compactHighlights(item.highlights ?? []); });
                                  }}
                                />
                              </label>
                            </div>
                          )}
                        </div>
                      );
                    }}
                  />
                </div>
              </section>
            ))}
          </div>
        )}

        {tab === 'builds' && (
          <div className="stack builds-workspace">
            <div className="section-intro mobile-section-intro"><div><p className="eyebrow">ITERATIONS</p><h2>生成记录</h2><p>按 JD 方向归档，每个方向保留最近 20 次迭代。</p></div><Archive size={24} /></div>
            {data.builds.length === 0 ? <div className="empty-state"><FileText size={34} /><h3>还没有生成记录</h3><p>先创建一个 JD 方向，选择内容并生成第一版简历。</p><button className="soft-button" onClick={() => setTab('presets')}>选择 JD 方向</button></div> : buildGroups.map((group) => {
              const directionName = data.presets.find((preset) => preset.id === group.presetId)?.name ?? group.presetName;
              return (
                <section className="build-group" key={group.presetId}>
                  <header className="build-group-heading"><div><span className="build-direction-icon"><Layers size={17} /></span><div><p className="eyebrow">JD DIRECTION</p><h3>{directionName}</h3></div></div><span>{group.builds.length} 次迭代</span></header>
                  <div className="build-iterations">
                    {group.builds.map((build) => (
                      <article className="build-card" key={build.id}>
                        <div className={`file-icon ${build.status}`}><FileText size={21} /></div>
                        <div className="build-info"><strong>第 {build.iteration} 版</strong><span>{formatTime(build.createdAt)} · {build.status === 'ready' ? `${build.pageCount ?? '—'} 页 PDF` : 'TeX 已生成'}</span></div>
                        <div className="download-group">
                          <a href={`/api/files/${build.id}/tex`} aria-label={`下载 ${directionName} 第 ${build.iteration} 版 TeX`} title="下载 TeX"><FileCode2 size={17} /></a>
                          {build.pdfPath && <button type="button" aria-label={`预览 ${directionName} 第 ${build.iteration} 版 PDF`} title="预览 PDF" onClick={() => setPreviewBuildId(build.id)}><Eye size={17} /></button>}
                          {build.pdfPath && <a href={`/api/files/${build.id}/pdf`} aria-label={`下载 ${directionName} 第 ${build.iteration} 版 PDF`} title="下载 PDF"><Download size={17} /></a>}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              );
            })}
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

      {previewBuild && (
        <div className="pdf-preview-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPreviewBuildId(null); }}>
          <section className="pdf-preview-dialog" role="dialog" aria-modal="true" aria-labelledby="pdf-preview-title">
            <header className="pdf-preview-header">
              <div><p className="eyebrow">PDF PREVIEW</p><h2 id="pdf-preview-title">{previewBuild.presetName}</h2></div>
              <div className="pdf-preview-actions">
                <a href={`/api/files/${previewBuild.id}/pdf?preview=1`} target="_blank" rel="noreferrer" title="在新窗口打开"><ExternalLink size={17} /><span>新窗口</span></a>
                <a href={`/api/files/${previewBuild.id}/pdf`} title="下载 PDF"><Download size={17} /><span>下载</span></a>
                <button type="button" onClick={() => setPreviewBuildId(null)} aria-label="关闭 PDF 预览" title="关闭"><X size={19} /></button>
              </div>
            </header>
            <iframe src={`/api/files/${previewBuild.id}/pdf?preview=1`} title={`${previewBuild.presetName} PDF 预览`} />
          </section>
        </div>
      )}
    </div>
  );
}
