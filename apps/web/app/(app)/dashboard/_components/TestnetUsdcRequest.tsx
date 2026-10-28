'use client';
import { useEffect, useRef, useState } from 'react';
import { TESTNET_USDC_FAUCET_URL, USDC_REQUEST_GUIDANCE, type TestnetUsdcStatus } from '@piggybanq/stellar-core/testnet-usdc';

type Props = { publicKey: string; disabled: boolean; canEnable: boolean; onEnable: () => void; onRefresh: () => Promise<void> };
export function TestnetUsdcRequest(props: Props) {
  const [open,setOpen]=useState(false);
  const opener=useRef<HTMLButtonElement>(null);
  function close(restoreFocus=true){setOpen(false);if(restoreFocus)requestAnimationFrame(()=>opener.current?.focus());}
  return <><button ref={opener} type="button" className="ui-button is-primary" disabled={props.disabled} onClick={()=>setOpen(true)}>Request test USDC</button>{open&&<RequestDialog {...props} onClose={close}/>}</>;
}
function RequestDialog({publicKey,canEnable,onEnable,onRefresh,onClose}:Props&{onClose:(restoreFocus?:boolean)=>void}) {
  const dialog=useRef<HTMLDialogElement>(null),alive=useRef(true),running=useRef(false);
  const [status,setStatus]=useState<TestnetUsdcStatus|null>(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  async function check(refresh=false){
    if(running.current)return;running.current=true;setBusy(true);setStatus(null);setMessage('Checking the official Testnet USDC trustline and balance…');
    try {
      const response=await fetch('/api/stellar/testnet-usdc',{cache:'no-store',credentials:'same-origin'});
      if(!response.ok||!response.headers.get('content-type')?.includes('application/json'))throw new Error('USDC status could not be checked. Sign in again or try later.');
      const data:TestnetUsdcStatus=await response.json();
      if(!Object.hasOwn(USDC_REQUEST_GUIDANCE,data.status))throw new Error('USDC status could not be verified.');
      if(!alive.current)return;setStatus(data);setMessage(data.status==='READY'?`Confirmed Testnet balance: ${data.balance} USDC. Opening the faucet does not confirm a deposit.`:USDC_REQUEST_GUIDANCE[data.status]);
      if(refresh)await onRefresh();
    }catch(error){if(alive.current){setStatus(null);setMessage(error instanceof Error?error.message:'USDC status is unavailable.');}}
    finally{running.current=false;if(alive.current)setBusy(false);}
  }
  useEffect(()=>{alive.current=true;dialog.current?.showModal();void check();return()=>{alive.current=false;};},[]);
  async function copy(){try{await navigator.clipboard.writeText(publicKey);setMessage('Public address copied. Select Stellar Testnet on Circle’s faucet.');}catch{setMessage('Could not copy. Select and copy the public address manually.');}}
  return <dialog className="banking-receive" ref={dialog} aria-labelledby="usdc-request-title" onClose={()=>onClose()} onClick={event=>{if(event.target===event.currentTarget)onClose();}}><section>
    <header><h2 id="usdc-request-title">Request test USDC</h2><button type="button" className="banking-icon-button" aria-label="Close USDC request" onClick={()=>onClose()} autoFocus>×</button></header>
    <p>Official Circle USDC on Stellar Testnet. Test tokens have no monetary value. Circle controls eligibility and limits; no private key or password is needed by its faucet.</p>
    {status&&<p>{USDC_REQUEST_GUIDANCE[status.status]}</p>}
    {status?.status==='TRUSTLINE_REQUIRED'&&<button type="button" className="banking-primary-button" disabled={!canEnable} onClick={()=>{onClose(false);onEnable();}}>Review USDC trustline</button>}
    {status?.status==='READY'&&<><label className="banking-address">Your public address<textarea readOnly value={publicKey} rows={3} spellCheck={false} onFocus={event=>event.currentTarget.select()}/></label><button type="button" className="stellar-secondary-action" onClick={()=>void copy()}>Copy public address for USDC</button><a className="banking-primary-button" href={TESTNET_USDC_FAUCET_URL} target="_blank" rel="noopener noreferrer">Open Circle USDC faucet ↗</a></>}
    <button type="button" className="stellar-secondary-action" disabled={busy} onClick={()=>void check(true)}>{busy?'Checking USDC…':'Check USDC balance'}</button>
    <p role="status" aria-live="polite">{message}</p>
  </section></dialog>;
}
