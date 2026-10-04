'use client';
import { useState, type ReactNode } from 'react';

export interface WebsitesItem {
  id: string;
  title: string;
  blurb: string;
  tags: string[];
  href?: string;          // optional "OPEN" link (live demo / repo)
  demo: () => ReactNode;  // the real component, rendered live
}

const F = '"Silkscreen","Courier New",monospace';

function ToggleDemo() {
  const [on, setOn] = useState(false);
  return (
    <button onClick={() => setOn(!on)} aria-pressed={on}
      style={{ width: 96, height: 44, borderRadius: 22, border: '3px solid #8a0f6e', cursor: 'pointer',
        background: on ? '#ff8fe8' : '#2a2a3a', position: 'relative', transition: 'background .15s' }}>
      <span style={{ position: 'absolute', top: 4, left: on ? 52 : 4, width: 32, height: 32, borderRadius: '50%',
        background: '#fff0fb', transition: 'left .15s' }} />
    </button>
  );
}

export const WEBSITES: WebsitesItem[] = [
  {
  id: 'indolettings',
  title: 'IndoLettings — UK Real Estate Platform',
  blurb: 'Developed a modern property platform for property discovery, lettings, landlord services, valuations, property management, and related real-estate workflows.',
  tags: ['React', 'CSS', 'Landing Page'],
  href : "https://indolettings.co.uk",
  demo: () => (
    <video
      controls
      playsInline
      muted
      loop
      autoPlay
      preload="metadata"
      style={{ width: '100%', maxWidth: 900, borderRadius: 16, display: 'block' }}
    >
      <source src="/videos/indolettings.mp4" type="video/mp4" />
      {/* <source src="/videos/indolettings.webm" type="video/webm" /> */}
      Your browser does not support the video tag.
    </video>
  ),
},
  {
  id: 'onverse',
  title: 'ONVERSE Digital Academy — AI & Digital Marketing Education Platform',
  blurb: 'Developed a modern academy website showcasing AI-integrated digital marketing programs, curriculum modules, admissions, internship opportunities, placement assistance, and career-focused learning resources.',
  tags: ['React', 'CSS', 'Landing Page'],
  href : "https://onverse.in",
  demo: () => (
    <video
      controls
      playsInline
      muted
      autoPlay
      loop
      preload="metadata"
      style={{ width: '100%', maxWidth: 900, borderRadius: 16, display: 'block' }}
    >
      <source src="/videos/onverse.mp4" type="video/mp4" />
      Your browser does not support the video tag.
    </video>
  ),
},
];