/**
 * CV content, keyed by the `id` of each point of interest in general-district.zones.json.
 * Edit ONLY this file to change what the player reads — the map never needs touching.
 * Each string in `lines` renders as one bullet in the panel.
 */
export interface CvEntry {
  title: string;
  subtitle?: string;
  lines: string[];
  links?: { label: string; url: string }[];
}

export const CV: Record<string, CvEntry> = {
  // Home
  'about-me': {
  title: 'Sajad Mashood A',
  subtitle: 'Software Engineer · Thalassery, Kerala',
  lines: [
    'I am a software engineer who enjoys building things across the stack — from interfaces people interact with to the backend systems that keep them running.',

    'Currently, I work as a Lead Software Engineer at Psyra, building production applications with Next.js, React, TypeScript, NestJS, and MongoDB. My work spans authentication, scheduling systems, payment integrations, configurable assessment engines, and production infrastructure.',

    'I enjoy taking a feature from an idea to a working product, whether that means designing an API, shaping the user experience, or figuring out why something broke in production.',

    'Outside of work, I build independent projects exploring computer vision, machine learning, and software architecture. I am also continuing to deepen my understanding of cybersecurity and systems.',

    'This city is a small representation of what I build, what I learn, and the directions I want to explore next.',
  ],
  links: [
    { label: 'Download full CV (PDF)', url: '/cv.pdf' },
    { label: 'GitHub', url: 'https://github.com/sj-ms-sudo' },
    { label: 'LinkedIn', url: 'https://linkedin.com/in/sajadmashood' },
  ],
},

  
  // Library
  education: {
    title: 'Education',
    subtitle: 'College of Engineering Munnar · 2020 – 2024',
    lines: [
      'B.Tech in Computer Science and Engineering.',
      'Built a foundation in software engineering, computer science, and problem-solving.',
    ],
  },

  // Office A
  'job-1': {
    title: 'Psyra',
    subtitle: 'Lead Software Engineer · 2026 – Present · Kerala, India',
    lines: [
      'Build and maintain production web applications across frontend, backend, and product engineering using Next.js, React, TypeScript, NestJS, and MongoDB.',

      'Designed and implemented a configurable mental-health assessment engine supporting 9+ assessment types, dynamic question banks, weighted scoring, severity bands, and personalized result experiences.',

      'Built the psychologist portal scheduling system with email OTP authentication, JWT access and refresh tokens, and a real-time, conflict-safe availability and booking workflow.',

      'Integrated Razorpay payment workflows with order creation, webhook signature verification, rate limiting, and payment-linked slot confirmation.',

      'Contributed to the Psyra mobile application backend, supporting OTP-based authentication and JWT session management for end users.',

      'Integrated Meta Conversions API event tracking into payment workflows and migrated the production backend infrastructure to DigitalOcean.',
    ],
  },

  // Office B
  'job-2': {
    title: 'Private Client Engagements',
    subtitle: 'Full Stack Developer · 2026 · Remote',
    lines: [
      'Built and contributed to production-ready web experiences for international clients, including BuildOn Trading LLC (UAE) and IndoLettings (UK), using React, Next.js, TypeScript, and Tailwind CSS.',

      'Developed reusable UI components, responsive layouts, searchable and filterable interfaces, data-driven content systems, and SEO-focused landing pages.',

      'Worked across the stack to translate business requirements into maintainable web applications and client-facing digital experiences.',
    ],
  },

  // Office C
  'job-3': {
    title: 'Leading Interns & Client Delivery',
    subtitle: 'Psyra · 2026',
    lines: [
      'Provided technical direction, mentoring, and code review for intern contributors working on client and venture engagements sourced through Psyra’s founders.',

      'Onverse Digital Academy: directed intern contributions while owning the SEO architecture, including metadata, sitemap, structured data, and the broader application delivery.',

      'Sahal & Co: defined the component and data architecture, reviewed implementation, and guided the intern team through frontend development and delivery.',

      'Helped translate design requirements into implementation tasks, resolve development blockers, and maintain consistency across the delivered projects.',
    ],
  },

  // Training Center
  certs: {
    title: 'Certifications & Achievements',
    lines: [
      'ISC2 Certified in Cybersecurity (CC).',
      'Google Cybersecurity Professional Certificate.',
      'IEEE Xtreme 17.0 — Global Top 1000.',
      'HackerRank Software Engineer.',
      'HackerRank Python (Basic).',
      'HackerRank Problem Solving (Basic).',
    ],
  },

  // Café
  sharpening: {
    title: 'Currently Sharpening',
    lines: [
      'Building a raw packet sniffer in C/C++ to deepen my understanding of low-level networking, packet processing, and systems programming.',

      'Exploring security engineering through Burp Suite, CTF challenges, and hands-on web security practice.',

      'Strengthening data structures and algorithms through structured problem-solving and implementation practice.',
    ],
  },

  // Workshop
  projects: {
    title: 'Projects',
    lines: [
      'FaceCluster — AI-powered face detection, recognition & clustering platform. React, FastAPI, SQLite, FAISS, InsightFace, Tauri. Built a local-first application that detects faces, generates 512-dimensional embeddings, indexes them for similarity search, and clusters identities using DBSCAN. Includes asynchronous processing pipelines, progress tracking, and desktop packaging.',

      'Psychologist Booking Portal — NestJS, MongoDB, Next.js, Razorpay. Designed and built a scheduling and availability system for Psyra, featuring OTP/JWT authentication, real-time slot management, and payment-linked booking workflows with webhook verification and duplicate-event protection.',

      'Onverse Digital Academy — Next.js, Framer Motion, Tailwind CSS. Built a marketing and admissions platform with a scored AI Readiness Quiz, lead-capture flow, reusable content architecture, and SEO/analytics integration. Delivered the project while directing intern contributors.',

      'Sahal & Co — Next.js, Framer Motion, Tailwind CSS. Directed the frontend delivery of a creative and performance marketing agency website, including animated portfolio browsing, synchronized project previews, and scroll-driven case-study navigation.',

      'IndoLettings — Next.js, TypeScript, Framer Motion. Built a property management and lettings platform with slug-driven content routing, reusable components, property search, and interactive mortgage and rental-yield calculators. Developed independently.',
    ],
    links: [{ label: 'GitHub', url: 'https://github.com/sj-ms-sudo' }],
  },

  // Notice board
  skills: {
    title: 'Technical Skills',
    lines: [
      'Languages: Python, JavaScript, TypeScript, C/C++, SQL.',
      'Frontend: React, Next.js, Vite, Tailwind CSS, Flutter, Responsive UI.',
      'Backend: NestJS, FastAPI, Node.js, Express.js, REST APIs, JWT Authentication, RBAC.',
      'Databases: MongoDB, PostgreSQL, SQLite, MySQL.',
      'AI/ML: FAISS, InsightFace, OpenCV, scikit-learn, NumPy, DBSCAN.',
      'Security: Burp Suite, packet analysis, OWASP fundamentals.',
      'Tools & Deployment: Git, GitHub, Linux, Vercel, Render, DigitalOcean.',
    ],
  },

  // Post Office
  contact: {
    title: 'Contact',
    subtitle: 'Thalassery, Kerala',
    lines: [
      'Email: mashoodsajad@gmail.com',
      // 'Phone: 8590642470',   // uncomment if you want your number public on the site
    ],
    links: [
      { label: 'Email me', url: 'mailto:mashoodsajad@gmail.com' },
      { label: 'LinkedIn', url: 'https://linkedin.com/in/sajad-mashood-a' },
      { label: 'GitHub', url: 'https://github.com/sj-ms-sudo' },
    ],
  },

  // Fountain
  'cv-download': {
  title: 'Full CV',

  lines: [
    'I am Sajad Mashood A, a software engineer focused on building full-stack web applications, backend systems, and interactive digital experiences.',

    'My work spans frontend development, backend architecture, API design, authentication, scheduling systems, and cloud deployment.',

    'Currently, I work as a Lead Software Engineer at Psyra, contributing to product engineering across frontend, backend, and infrastructure.',

    'At Psyra, I build production features using Next.js, React, TypeScript, NestJS, and MongoDB. My work includes scheduling systems, authentication, payment integrations, and a configurable mental-health assessment engine.',

    'I also build independent projects, including FaceCluster, a computer vision platform for face detection, embedding, similarity search, and clustering.',

    'My interests extend from frontend experiences to backend architecture, infrastructure, and applied AI/ML.',

    'Explore my projects, visit my LinkedIn profile, or download the complete CV to learn more.'
  ],

  links: [
    {
      label: 'Download CV (PDF)',
      url: '/cv.pdf'
    },
    {
      label: 'LinkedIn',
      url: 'https://linkedin.com/in/sajadmashood'
    },
    {
      label: 'GitHub',
      url: 'https://github.com/sj-ms-sudo'
    }
  ]
},
};