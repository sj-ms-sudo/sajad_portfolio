import { redirect } from "next/navigation";
import { SITE } from "@/lib/site";

// Redirects to /general
export default function Home() {
  redirect(SITE.homePath);
}
