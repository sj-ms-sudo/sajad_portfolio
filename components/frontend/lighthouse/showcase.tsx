'use client';
import { useState, type ReactNode } from 'react';
import Image from 'next/image';

export interface ShowcaseItem {
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

export const SHOWCASE: ShowcaseItem[] = [
  {
  id: 'psyra-why-choose',
  title: 'Why Choose Psyra',
  blurb: 'A stats section with a heading, intro text, a "Book a session" CTA and a staggered grid of rounded cards (3000+ sessions, 15+ psychologists, 100% confidential, 4+ languages, 24x7 support) with soft butterfly illustrations.',
  tags: ['React', 'CSS', 'Landing Page'],
  href : "https://psyra.in",
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
      <source src="/videos/psyra-why-choose.mp4" type="video/mp4" />
      {/* <source src="/videos/psyra-why-choose.webm" type="video/webm" /> */}
      Your browser does not support the video tag.
    </video>
  ),
},
  {
  id: 'psyra-therapy-journey',
  title: 'Your Journey to Therapy',
  blurb: 'A four-step accordion (Find the Right Psychologist, Book Your Slot, Confirm Your Session, Attend Therapy Session) beside a teal illustration of a person on a laptop, with a "Choose Your Psychologist" CTA.',
  tags: ['React', 'CSS', 'Landing Page'],
  href : "https://psyra.in",
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
      <source src="/videos/psyra-therapy-journey.mp4" type="video/mp4" />
      Your browser does not support the video tag.
    </video>
  ),
},
{
  id: 'psyra-reviews',
  title: 'Psyra Reviews',
  blurb: 'A testimonials section featuring Google reviews, a 4.9 out of 5 rating, five-star review cards, reviewer details, and a "See more reviews" CTA.',
  tags: ['React', 'CSS', 'Testimonials'],
  href: 'https://psyra.in',
  demo: () => (
    <Image
      src="/videos/psyra_review.png"
      alt="Psyra Reviews section"
      width={900}
      height={500}
      style={{
        width: '100%',
        maxWidth: 900,
        borderRadius: 16,
        display: 'block',
      }}
    />
  ),
},
];