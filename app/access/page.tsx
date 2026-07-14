'use client';

import { FormEvent, useEffect, useState } from 'react';
import { KeyRound } from 'lucide-react';

export default function AccessPage() {
  const [key, setKey] = useState('');
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    setInvalid(new URLSearchParams(window.location.search).get('error') === 'invalid');
  }, []);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (key.trim()) window.location.assign(`/?key=${encodeURIComponent(key.trim())}`);
  }

  return (
    <main className="access-page">
      <section className="access-card">
        <div className="brand-lock"><KeyRound size={22} /></div>
        <p className="eyebrow">BONCV PRIVATE WORKSPACE</p>
        <h1>打开你的职业档案</h1>
        <p className="access-copy">输入访问密钥。验证后密钥会立即从地址栏移除，仅保留安全会话。</p>
        <form onSubmit={submit}>
          <label htmlFor="access-key">访问密钥</label>
          <input id="access-key" type="password" value={key} onChange={(event) => setKey(event.target.value)} autoFocus autoComplete="current-password" placeholder="输入 key" />
          {invalid && <p className="form-error">密钥不正确，请重试。</p>}
          <button type="submit" className="primary-button">进入 BonCV</button>
        </form>
      </section>
    </main>
  );
}
