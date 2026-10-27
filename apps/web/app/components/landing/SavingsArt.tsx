import { useId } from 'react';

export function SavingsArt({chapter=0,percent=30}:{chapter?:number;percent?:number}) {
 const id=useId().replace(/:/g,'');
 return <svg className="savings-art" viewBox="0 0 520 400" fill="none" aria-hidden="true">
  <defs><linearGradient id={`${id}-jar`} x1="160" y1="100" x2="365" y2="350" gradientUnits="userSpaceOnUse"><stop stopColor="#fff8ed"/><stop offset="1" stopColor="#edb9cb"/></linearGradient><clipPath id={`${id}-clip`}><rect x="168" y="132" width="184" height="200" rx="48"/></clipPath></defs>
  <ellipse cx="260" cy="355" rx="174" ry="21" fill="#4b3d3d" opacity=".09"/>
  <circle cx="405" cy="80" r="29" fill="#f4d896"/><path d="M80 307c-13-40-42-45-42-45 0 28 14 54 43 60M80 326c1-55 24-76 24-76 12 39-4 64-24 76" fill="#9bb181"/>
  <path d="M146 173c0-29 23-53 52-53h124c29 0 52 24 52 53v130c0 33-27 60-60 60H206c-33 0-60-27-60-60V173Z" fill={`url(#${id}-jar)`} stroke="#c98da3" strokeWidth="3"/>
  <g clipPath={`url(#${id}-clip)`}><rect x="168" y={330-160*percent/100} width="184" height="200" fill={chapter===2?'#e4b860':chapter===3?'#94b8af':'#d98ba9'} opacity=".6"/>{Array.from({length:7},(_,i)=><g key={i} transform={`translate(${197+i%3*58} ${290-Math.floor(i/3)*38})`}><ellipse rx="25" ry="10" fill="#f1cf83" stroke="#d9ac52" strokeWidth="2"/><path d="M-24 0v9c0 13 48 13 48 0V0" fill="#e7b861"/><ellipse ry="9" rx="24" fill="#f8db98"/><path d="M-4-4v8m8-8v8" stroke="#d4a44b" strokeWidth="2"/></g>)}</g>
  <rect x="164" y="105" width="192" height="33" rx="13" fill="#bb718e"/><rect x="218" y="109" width="83" height="8" rx="4" fill="#8a4e69"/>
  <path className="art-sprout" d="M260 102V67m0 20c-34 1-51-20-45-41 25-2 45 15 45 41Zm0-3c0-30 19-43 42-41 4 23-14 42-42 41Z" fill="#9eb586" stroke="#6d8861" strokeWidth="3" strokeLinejoin="round"/>
  <path d="M188 170c-7 0-12 8-12 20v75" stroke="#fff" strokeWidth="7" strokeLinecap="round" opacity=".7"/>
  <g className="art-badge" transform="translate(355 235)"><circle r="53" fill="#fff7e9" stroke="#e6d4c8" strokeWidth="2"/>{chapter===3?<><path d="m0-29 23 10v20C23 17 0 30 0 30S-23 17-23 1v-20L0-29Z" fill="#b5cbc2"/><path d="m-11 1 8 8L13-9" stroke="#537f70" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/></>:chapter===2?<><path d="m-20 1 13 13 30-31" stroke="#b97993" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/></>:<><circle r="23" stroke="#c789a1" strokeWidth="5"/><circle r="11" fill="#e8b1c4"/><path d="M0-32v12M0 20v12M-32 0h12M20 0h12" stroke="#c789a1" strokeWidth="3"/></>}</g>
  <path d="m118 100 4 13 13 4-13 4-4 13-4-13-13-4 13-4 4-13Zm300 122 3 9 9 3-9 3-3 9-3-9-9-3 9-3 3-9Z" fill="#e9bb6e"/>
 </svg>;
}
