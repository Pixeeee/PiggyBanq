import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { requestTestnetXlm } from '@piggybanq/stellar-core/testnet-funding';
import { Body, Button, Card } from '../ui/banking';
import { useMobileTheme } from '../theme';

export function NativeTestnetFunding({ publicKey, onRefresh }: { publicKey: string; onRefresh: () => Promise<void> }) {
  const {palette}=useMobileTheme();
  const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const running=useRef(false),alive=useRef(true);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[publicKey]);
  async function requestFunds(){
    if(running.current)return;
    running.current=true;setBusy(true);setMessage('Requesting test XLM and checking Stellar Testnet…');
    try {
      const result=await requestTestnetXlm(publicKey);
      if(!alive.current)return;
      setMessage(result.status==='FUNDED'?'Test XLM received and verified on Stellar Testnet.':'Your wallet is already funded. Friendbot did not add more test XLM.');
      await onRefresh();
    } catch(error){if(alive.current)setMessage(error instanceof Error?error.message:'Request failed. Refresh your balance before trying again.');}
    finally{running.current=false;if(alive.current)setBusy(false);}
  }
  return <Card><View style={{gap:8}}><Text accessibilityRole="header" style={{color:palette.textDark,fontSize:18,fontWeight:'700'}}>Need test XLM?</Text><Body>Request from Stellar Friendbot for this wallet. Test tokens have no monetary value. Existing funded wallets may not qualify.</Body></View><Button label={busy?'Checking funding…':'Request test XLM'} disabled={busy} onPress={()=>void requestFunds()} icon="add-circle-outline"/><Text accessibilityLiveRegion="polite" style={{color:palette.textMid,fontSize:13,lineHeight:20}}>{message}</Text></Card>;
}
