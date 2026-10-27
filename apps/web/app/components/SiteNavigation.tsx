'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type MouseEvent } from 'react';

export function SiteNavigation() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const inWallet = pathname.startsWith('/dashboard');
  const links = inWallet ? [['Overview','/dashboard'],['Savings plans','/dashboard/goals'],['Send','/dashboard#send'],['Allocations','/dashboard/allocations'],['Swap','/dashboard/pockets#swap'],['Test API payments','/dashboard/agent'],['Profile & security','/dashboard/profile'],['Website','/']] : [['Home','/'],['How it works','/#how'],['Security','/#security'],['Stellar Testnet','/#network'],['Create wallet','/signup'],['Sign in','/login'],['Dashboard','/dashboard']];
  function close() { dialog.current?.close(); setOpen(false); }
  function navigate(event:MouseEvent<HTMLAnchorElement>,href:string) {
    if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    close();
    if(pathname==='/'&&href.startsWith('/#')) {
      event.preventDefault();
      const section=document.getElementById(href.slice(2));
      history.pushState(null,'',href);
      section?.scrollIntoView({block:'start'});
      section?.focus({preventScroll:true});
    }
  }
  useEffect(close, [pathname]);
  return <>
    <a className="site-skip-link" href="#site-content">Skip to main content</a>
    <header className="site-header">
      <Link className="site-wordmark" href={inWallet ? '/dashboard' : '/'} aria-label="PiggyBanq home"><img src="/media/piggy-mark.webp" width="27" height="40" alt="" /><strong>PiggyBanq</strong></Link>
      <nav className="site-desktop-links" aria-label="Quick navigation">{links.slice(0,3).map(([label,href])=><Link prefetch={false} key={href} href={href} onClick={event=>navigate(event,href)}>{label}</Link>)}</nav>
      <button ref={trigger} className="site-menu-toggle" aria-label="Open navigation menu" aria-expanded={open} aria-controls="site-menu" onClick={()=>{dialog.current?.showModal();setOpen(true);}}><span>Menu</span><svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg></button>
    </header>
    <dialog id="site-menu" ref={dialog} className="site-menu" aria-labelledby="site-menu-title" onClose={()=>{setOpen(false);trigger.current?.focus();}} onKeyDown={event=>{
      if(event.key!=='Tab')return;
      const items=Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button,a[href]'));
      const first=items[0],last=items.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
    }} onClick={event=>{if(event.target===event.currentTarget)close();}}>
      <div className="site-menu-heading"><h2 id="site-menu-title">Find your way</h2><button autoFocus className="site-menu-close" aria-label="Close navigation menu" onClick={close}>×</button></div>
      <nav aria-label="All pages">{links.map(([label,href])=><Link prefetch={false} onClick={event=>navigate(event,href)} key={href} href={href} aria-current={pathname===href?'page':undefined}>{label}<span aria-hidden="true">↗</span></Link>)}</nav>
      <p>Your keys. Your control. · Stellar Testnet</p>
    </dialog>
  </>;
}
