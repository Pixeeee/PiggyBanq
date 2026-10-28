'use client';
import { TestnetUsdcRequest } from './TestnetUsdcRequest';
import { useEffect, useRef, useState } from 'react';

export function TestnetFunding({ disabled, onRefresh, publicKey, canEnableUsdc, onEnableUsdc }: { disabled: boolean; onRefresh: () => Promise<void>; publicKey: string; canEnableUsdc: boolean; onEnableUsdc: () => void }) {
  const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const running=useRef(false),alive=useRef(true);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  async function requestFunds(){
    if(disabled||running.current)return;
    running.current=true;setBusy(true);setMessage('Requesting test XLM and checking Stellar Testnet…');
    try {
      const response=await fetch('/api/stellar/testnet-funds',{method:'POST',credentials:'same-origin',headers:{Accept:'application/json'}});
      if(!response.headers.get('content-type')?.includes('application/json'))throw new Error('Funding could not be confirmed. Sign in again or refresh your balance.');
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||'Friendbot is unavailable. Try again later.');
      if(result.status!=='FUNDED'&&result.status!=='ALREADY_FUNDED')throw new Error('Funding could not be confirmed. Refresh your balance.');
      if(!alive.current)return;
      setMessage(result.status==='FUNDED'?'Test XLM received and verified on Stellar Testnet.':'Your wallet is already funded. Friendbot did not add more test XLM.');
      await onRefresh();
    } catch(error){if(alive.current)setMessage(error instanceof Error?error.message:'Request failed. Refresh your balance before trying again.');}
    finally{running.current=false;if(alive.current)setBusy(false);}
  }
  return <section className="testnet-funding" aria-label="Free Stellar Testnet XLM">
    <div><strong>Need test tokens?</strong><p>Request XLM from Friendbot, or use Circle’s official USDC faucet. Test tokens have no monetary value. Friendbot may decline already-funded wallets.</p></div>
    <button type="button" className="ui-button is-primary" disabled={disabled||busy} onClick={()=>void requestFunds()}>{busy?'Checking funding…':'Request test XLM'}</button>
    <TestnetUsdcRequest publicKey={publicKey} disabled={disabled} canEnable={canEnableUsdc} onEnable={onEnableUsdc} onRefresh={onRefresh}/>
    <p role="status" aria-live="polite">{message}</p>
  </section>;
}
