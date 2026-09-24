import type { Metadata } from "next";
import PhaserGameLoader from "@/components/PhaserGameLoader";
import { SITE } from "@/lib/site";

// _____________________meta descriptions
export const metadata: Metadata = {
  alternates: { canonical: SITE.homePath },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: SITE.author,
  jobTitle: SITE.jobTitle,
  url: `${SITE.url}${SITE.homePath}`,
  sameAs: [SITE.github, SITE.linkedin],
  address: {
    "@type": "PostalAddress",
    addressLocality: "Thalassery",
    addressRegion: "Kerala",
    addressCountry: "IN",
  },
};

export default function GeneralDistrictPage() {
  return (
    <main className="fixed inset-0 bg-[#0a0a0c]">

      <h1 className="sr-only">
        {SITE.name}: the interactive portfolio of {SITE.author}, {SITE.jobTitle}
      </h1>
      <p className="sr-only">{SITE.description}</p>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <PhaserGameLoader />
      <noscript>
        <p className="p-6 font-mono text-sm text-[#ff8fe8]">
          {SITE.name} is an interactive game and needs JavaScript. You can find {SITE.author} on{" "}
          <a className="underline" href={SITE.github}>GitHub</a> and{" "}
          <a className="underline" href={SITE.linkedin}>LinkedIn</a>.
        </p>
      </noscript>
    </main>
  );
}
