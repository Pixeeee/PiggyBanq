export const chapters=[
 {title:'Plant a goal.',short:'Plan',body:'A rainy-day cushion. A new laptop. A little adventure. Give every possibility a pocket of its own.',detail:'Name it. Set a target. Make it feel possible.',color:'#f0b9ca'},
 {title:'A little, often.',short:'Grow',body:'See how small, regular contributions add up. Build a plan that fits your life, without promises of interest or guaranteed returns.',detail:'Your pace is the right place to start.',color:'#c6d6a5'},
 {title:'Review every move.',short:'Review',body:'See the amount, destination and fee before you approve a payment. A helpful agent can prepare a request; you remain in control.',detail:'Nothing signs or spends without you.',color:'#f4d493'},
 {title:'Keep your keys.',short:'Protect',body:'Your wallet keys stay encrypted on your device. Save your recovery phrase somewhere safe—PiggyBanq cannot reset it for you.',detail:'Your future. Your responsibility. Your control.',color:'#bad7db'}
] as const;
export const goals=[
 {id:'rainy-day',name:'Rainy day',targetMinor:1000000,color:'#d47b99',symbol:'☂'},
 {id:'laptop',name:'New laptop',targetMinor:4000000,color:'#93a875',symbol:'⌘'},
 {id:'adventure',name:'Little adventure',targetMinor:2000000,color:'#e7ac59',symbol:'✳'}
] as const;
export type GoalId=typeof goals[number]['id'];
export type SceneMode='plan'|'grow'|'review';
export const capabilities=[
 {title:'Savings pockets',text:'Organize goals and planning records in one workspace. A planning record does not move funds.'},
 {title:'A clearer activity view',text:'See confirmed Stellar transactions and keep asset amounts separate. Test tokens have no monetary value.'},
 {title:'Testnet swaps',text:'Review a quote, its destination asset and slippage limits before signing a Stellar Testnet swap.'},
 {title:'Paid API requests',text:'Explore x402 on Stellar Testnet with local signing, user approval, spending limits and verified receipts.'},
 {title:'Local wallet protection',text:'A device password protects your wallet locally. Your recovery phrase is essential if you lose access.'},
 {title:'Shared planning data',text:'Connect a verified wallet account to sync planning records between web and native. Your private keys stay local.'}
] as const;
