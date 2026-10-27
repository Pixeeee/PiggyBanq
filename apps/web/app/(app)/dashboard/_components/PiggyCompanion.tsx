'use client';

import { useEffect, useState } from 'react';

const tips = ['Small steps. Big dreams.', 'Give every goal a little love.', 'Your next milestone starts today.'];

export function PiggyCompanion() {
  const [reaction, setReaction] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(true);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    update(); media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return <section className="banking-piggy" aria-label="Your savings sidekick">
    <div><span className="banking-eyebrow">Your savings sidekick</span><h2 aria-live="polite">{tips[reaction % tips.length]}</h2><p>Tap to say hello</p></div>
    <button type="button" aria-label="Play with Piggy" onClick={() => setReaction(value => value + 1)}>
      <img key={reaction} className={reaction && !reducedMotion ? 'is-playing' : undefined} src={reducedMotion ? '/media/piggy-landscape.webp' : '/piggy.gif'} alt="" />
    </button>
  </section>;
}
