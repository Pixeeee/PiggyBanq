import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Image, Linking, Modal, Pressable, ScrollView, Text, View, findNodeHandle } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMobileSession } from '../auth/session';
import { useMobileTheme } from '../theme';
import { Icon } from './banking';
import { useReducedMotion } from './MotionView';

const SectionContext=createContext<{activeTab:string;setActiveTab:(tab:string)=>void}|null>(null);
export function useNativeSection() {const value=useContext(SectionContext);if(!value)throw new Error('Native navigation requires the app frame.');return value;}

export function NativeSiteNavigation({children}:{children:ReactNode}) {
  const {palette}=useMobileTheme(); const insets=useSafeAreaInsets(); const session=useMobileSession();
  const router=useRouter(); const path=usePathname(); const reduced=useReducedMotion();
  const [activeTab,setActiveTab]=useState('Home'); const [open,setOpen]=useState(false);
  const opener=useRef<View>(null); const closer=useRef<View>(null);
  const focus=(ref:View|null)=>{const node=ref&&findNodeHandle(ref);if(node)AccessibilityInfo.setAccessibilityFocus(node);};
  useEffect(()=>{setOpen(false);},[path]);
  useEffect(()=>{if(!session.walletReady){setOpen(false);setActiveTab('Home');}},[session.walletReady]);
  function close(){setOpen(false);requestAnimationFrame(()=>focus(opener.current));}
  function select(tab:string){close();session.setSecretVisible(false);setActiveTab(tab);if(path!=='/dashboard')router.replace('/(tabs)/dashboard');}
  const target=(session.walletReady?'/(tabs)/dashboard':session.hasStoredWallet?'/(auth)/unlock-wallet':'/(auth)/home') as '/(tabs)/dashboard'|'/(auth)/home'|'/(auth)/unlock-wallet';
  return <SectionContext.Provider value={{activeTab,setActiveTab}}><View style={{flex:1,paddingTop:insets.top,backgroundColor:palette.card}}>
    <View style={{height:60,paddingHorizontal:20,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:1,borderColor:palette.borderSoft,backgroundColor:palette.card}}>
      <Pressable accessibilityRole="button" accessibilityLabel="PiggyBanq home" onPress={()=>{if(session.walletReady)select('Home');else router.replace(target);}} style={{flexDirection:'row',alignItems:'center',gap:10,minHeight:44}}><Image source={require('../../assets/piggy_icon_square.png')} style={{width:30,height:36,resizeMode:'contain'}} /><Text style={{fontWeight:'700',fontSize:20,color:palette.textDark}}>PiggyBanq</Text></Pressable>
      <Pressable ref={opener} accessibilityRole="button" accessibilityLabel="Open navigation menu" accessibilityState={{expanded:open}} onPress={()=>setOpen(true)} style={{minWidth:48,minHeight:44,borderRadius:13,backgroundColor:palette.surfaceStrong,alignItems:'center',justifyContent:'center'}}><Icon name="menu-outline" color={palette.rose} /></Pressable>
    </View>
    <SafeAreaInsetsContext.Provider value={{...insets,top:0}}>{children}</SafeAreaInsetsContext.Provider>
    <Modal visible={open} transparent animationType={reduced?'none':'fade'} onRequestClose={close} onShow={()=>focus(closer.current)}>
      <View style={{flex:1,backgroundColor:'#29162299',paddingTop:insets.top+12,paddingHorizontal:16,paddingBottom:insets.bottom+16}}>
        <View accessibilityViewIsModal style={{flex:1,maxHeight:'92%',backgroundColor:palette.card,borderRadius:24,padding:22,gap:14}}>
          <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12}}><Text accessibilityRole="header" style={{fontSize:21,fontWeight:'700',color:palette.textDark}}>PiggyBanq</Text><Pressable ref={closer} accessibilityRole="button" accessibilityLabel="Close navigation menu" onPress={close} style={{minHeight:44,minWidth:44,justifyContent:'center',alignItems:'center'}}><Icon name="close" /></Pressable></View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{gap:6}}>
            {session.walletReady?['Home','Save','Send','Sync','You'].map(tab=><Pressable key={tab} accessibilityRole="button" accessibilityLabel={`Go to ${tab}`} onPress={()=>select(tab)} style={{minHeight:48,padding:14,borderRadius:12,backgroundColor:activeTab===tab?palette.surfaceStrong:palette.card}}><Text style={{color:palette.textDark,fontSize:16}}>{tab}</Text></Pressable>):<>
              <Pressable accessibilityRole="button" accessibilityLabel={session.hasStoredWallet?'Unlock saved wallet':'Get started'} onPress={()=>{close();router.replace(target);}} style={{minHeight:48,padding:14}}><Text style={{color:palette.textDark,fontSize:16}}>{session.hasStoredWallet?'Unlock saved wallet':'Get started'}</Text></Pressable>
              {!session.hasStoredWallet?<Pressable accessibilityRole="button" accessibilityLabel="Import existing wallet" onPress={()=>{close();router.push('/(auth)/import-wallet');}} style={{minHeight:48,padding:14}}><Text style={{color:palette.textDark,fontSize:16}}>Import existing wallet</Text></Pressable>:null}
            </>}
            <Pressable accessibilityRole="link" accessibilityLabel="Visit PiggyBanq website" onPress={()=>{close();void Linking.openURL('https://piggy-banq-web.vercel.app');}} style={{minHeight:48,padding:14}}><Text style={{color:palette.rose,fontSize:16}}>Visit website ↗</Text></Pressable>
          </ScrollView><Text style={{color:palette.textSoft,fontSize:11}}>Your keys stay on this device. · Stellar Testnet</Text>
        </View><Pressable accessible={false} onPress={close} style={{flex:1}} />
      </View>
    </Modal>
  </View></SectionContext.Provider>;
}
