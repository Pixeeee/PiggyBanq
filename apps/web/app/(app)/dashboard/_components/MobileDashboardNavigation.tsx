'use client';
import { useEffect, useRef, type ReactNode } from 'react';

export function MobileDashboardNavigation({children, moreLinks, moreIcon}:{children:ReactNode;moreLinks:ReactNode;moreIcon:ReactNode}) {
  const nav=useRef<HTMLElement>(null),dialog=useRef<HTMLDialogElement>(null),opener=useRef<HTMLButtonElement>(null);
  useEffect(()=>{
    const element=nav.current,shell=element?.closest<HTMLElement>('.savings-dashboard-shell');
    if(!element||!shell)return;
    const measure=()=>shell.style.setProperty('--dashboard-nav-height',`${element.getBoundingClientRect().height}px`);
    const observer=new ResizeObserver(measure);observer.observe(element);measure();
    return()=>{observer.disconnect();shell.style.removeProperty('--dashboard-nav-height');};
  },[]);
  return <><nav ref={nav} className="banking-bottom-nav" aria-label="Mobile primary navigation">
    {children}<button ref={opener} type="button" onClick={()=>dialog.current?.showModal()} aria-label="More dashboard pages">{moreIcon}<span>More</span></button>
  </nav><dialog ref={dialog} className="banking-receive banking-mobile-menu" aria-labelledby="dashboard-more-title" onClose={()=>opener.current?.focus()} onClick={event=>{if(event.target===event.currentTarget)dialog.current?.close();}}><section><header><h2 id="dashboard-more-title">More wallet tools</h2><button type="button" className="banking-icon-button" aria-label="Close dashboard pages" onClick={()=>dialog.current?.close()}>×</button></header><nav aria-label="More dashboard pages" onClick={event=>{if(event.target instanceof Element && event.target.closest('a'))dialog.current?.close();}}>{moreLinks}</nav></section></dialog></>;
}
