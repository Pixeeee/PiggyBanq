import type { Metadata } from 'next';
import { SunnyLanding } from './components/landing/SunnyLanding';
import './sunny-landing.css';

export const metadata:Metadata={title:'PiggyBanq — Small steps. Big dreams.',description:'A self-custodial wallet for your next chapter. Explore savings pockets, local signing and Stellar Testnet with PiggyBanq.'};

export default function LandingPage() {
  return <SunnyLanding/>;
}
