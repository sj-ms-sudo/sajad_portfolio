import { redirect } from "next/navigation";
import { SITE } from "@/lib/site";

// "/" has no content of its own: send everyone to the game.
export default function Home() {
  redirect(SITE.homePath);
}
