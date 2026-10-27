'use client';
import { useSyncExternalStore } from 'react';
const subscribe=(update:()=>void)=>{const query=matchMedia('(prefers-reduced-motion: reduce)');query.addEventListener('change',update);return()=>query.removeEventListener('change',update);};
export function useMotionPreference(){return useSyncExternalStore(subscribe,()=>matchMedia('(prefers-reduced-motion: reduce)').matches,()=>true);}
