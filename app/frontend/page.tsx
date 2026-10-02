import type { Metadata } from "next";
import FrontendPhaserGameLoader from "@/components/frontend/FrontendPhaserGameLoader";
import {SITE} from "@/lib/site";

export const metadata: Metadata={
    alternates:{canonical:SITE.frontendPath},
}

const jsonLd = {
    "@context":"https://schema.org",
    "@type":"Person",
    name:SITE.author,
    jobTitle:SITE.jobTitle,
    url:`${SITE.url}${SITE.frontendPath}`,
    sameAs:[SITE.github,SITE.linkedin],
    address:{
        "@type": "PostalAddress",
        addressLocality: "Thalassery",
        addressRegion: "Kerala",
        addressCountry: "IN",
    },
};

export default function GeneralDistrictPage(){
    return (
        <main className="fixed inset-0 bg-[#0a0a0c]">
            <h1 className="sr-only">
                {SITE.name}: the interactive portfolio of {SITE.author}, {SITE.jobTitle}
            </h1>
            <p className="sr-only">{SITE.description}</p>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{__html:JSON.stringify(jsonLd).replace(/</g,"\\u003c")}}
            />
            <FrontendPhaserGameLoader/>
            <noscript>
                <p className="p-6 font-mono text-sm text-[#ff9fe8]">
                    {SITE.name} is an interactive game and needs JavaScript. You can find {SITE.author} on {" "}
                    <a className="underline" href={SITE.github}>Github</a> and{" "}
                    <a className="underline" href={SITE.linkedin}>Linkedin</a>.
                </p>
            </noscript>
        </main>
    )
}