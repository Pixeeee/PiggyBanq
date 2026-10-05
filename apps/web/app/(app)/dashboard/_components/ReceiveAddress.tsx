'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from './DashboardShell';

export function ReceiveAddress({ publicKey, onClose }: { publicKey: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [status, setStatus] = useState('');
  useEffect(() => {
    const element = dialog.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    element?.showModal();
    return () => { element?.close(); document.body.style.overflow = overflow; };
  }, []);
  async function copy() {
    try { await navigator.clipboard.writeText(publicKey); setStatus('Public address copied.'); }
    catch { setStatus('Select the public address and copy it manually.'); }
  }
  return <dialog className="banking-receive" ref={dialog} aria-labelledby="receive-title" onClose={event => { if (!event.currentTarget.open) onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section><header><h2 id="receive-title">Receive on Testnet</h2><button className="banking-icon-button" type="button" aria-label="Close receive address" onClick={onClose} autoFocus><Icon name="close" /></button></header>
      <p>Share this public address to receive XLM. Your secret key is never needed to receive.</p>
      <div className="banking-address"><Icon name="receive" /><label>Your Stellar public address<textarea readOnly value={publicKey} rows={3} spellCheck={false} onFocus={event => event.currentTarget.select()} /></label><small>Stellar Testnet only</small></div>
      <button className="banking-primary-button" type="button" onClick={() => void copy()}>Copy public address</button>
      <p role="status">{status}</p><small>USDC needs an enabled trustline first. Use Enable USDC under More wallet tools.</small>
    </section>
  </dialog>;
}
