import { Text } from '../ui/Typography';
import { useEffect, useRef, useState } from 'react';
import { Linking } from 'react-native';
import { TESTNET_USDC_FAUCET_URL, USDC_REQUEST_GUIDANCE, getTestnetUsdcStatus, type TestnetUsdcStatus } from '@piggybanq/stellar-core/testnet-usdc';
import { Body, Button, Sheet } from '../ui/banking';
import { useMobileTheme } from '../theme';

export function NativeTestnetUsdcRequest({publicKey,onRefresh,onEnable}:{publicKey:string;onRefresh:()=>Promise<void>;onEnable:()=>void}) {
  const {palette}=useMobileTheme();
  const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[status,setStatus]=useState<TestnetUsdcStatus|null>(null),[message,setMessage]=useState('');
  const alive=useRef(true),running=useRef(false);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  async function check(refresh=false){
    if(running.current)return;running.current=true;setBusy(true);setStatus(null);setMessage('Checking the official Testnet USDC trustline and balance…');
    try{const result=await getTestnetUsdcStatus(publicKey);if(!alive.current)return;setStatus(result);setMessage(result.status==='READY'?`Confirmed Testnet balance: ${result.balance} USDC. Opening the faucet does not confirm a deposit.`:USDC_REQUEST_GUIDANCE[result.status]);if(refresh)await onRefresh();}
    catch{if(alive.current)setMessage('Stellar Testnet USDC status is unavailable. Try again later.');}
    finally{running.current=false;if(alive.current)setBusy(false);}
  }
  return <><Button label="Request test USDC" secondary onPress={()=>{setOpen(true);void check();}}/><Sheet title="Request test USDC" visible={open} onClose={()=>setOpen(false)}>
    <Body>Official Circle USDC on Stellar Testnet. Test tokens have no monetary value. Circle controls eligibility and limits; never give its faucet a private key or password.</Body>
    {status&&<Body>{USDC_REQUEST_GUIDANCE[status.status]}</Body>}
    {status?.status==='TRUSTLINE_REQUIRED'&&<Button label="Go to USDC trustline setup" onPress={()=>{setOpen(false);onEnable();}}/>}
    {status?.status==='READY'&&<><Body>Hold your public address to copy it. On Circle’s faucet, select Stellar Testnet and USDC, then paste this address.</Body><Text selectable accessibilityLabel="USDC faucet public address" style={{color:palette.textDark,fontSize:14,lineHeight:22}}>{publicKey}</Text><Button label="Open Circle USDC faucet" onPress={()=>{void Linking.openURL(TESTNET_USDC_FAUCET_URL).catch(()=>{if(alive.current)setMessage('The browser could not open Circle’s faucet. Try again later.');});}}/></>}
    <Button label={busy?'Checking USDC…':'Check USDC balance'} secondary disabled={busy} onPress={()=>void check(true)}/><Text accessibilityLiveRegion="polite" style={{color:palette.textMid,fontSize:13,lineHeight:20}}>{message}</Text>
  </Sheet></>;
}
