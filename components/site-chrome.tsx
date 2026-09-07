import Link from "next/link";
import { ArrowUpRight, Scale } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [["Trial", "/trial"], ["Dockets", "/dockets"], ["Grants", "/grants"], ["Call", "/call"], ["Arena", "/arena"]] as const;

export function SiteHeader() {
  return (
    <header className="border-b ink-rule bg-background/95">
      <div className="mx-auto flex min-h-16 max-w-[1400px] items-center justify-between gap-5 px-4 sm:px-6 lg:px-10">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold tracking-[-0.03em]"><Scale aria-hidden="true" /><span className="text-lg">WITNESS</span></Link>
        <nav aria-label="Primary" className="hidden items-center gap-6 text-sm md:flex">
          {links.map(([label, href]) => <Link key={href} href={href} className="text-muted-foreground transition-colors hover:text-foreground">{label}</Link>)}
        </nav>
        <Link href="/trial" className={cn(buttonVariants({ size: "lg" }), "hidden sm:inline-flex")}>Open a trial <ArrowUpRight data-icon="inline-end" /></Link>
      </div>
      <nav aria-label="Mobile" className="flex overflow-x-auto border-t px-4 md:hidden">
        {links.map(([label, href]) => <Link key={href} href={href} className="shrink-0 px-3 py-2 text-xs font-medium">{label}</Link>)}
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t ink-rule">
      <div className="mx-auto grid max-w-[1400px] gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.5fr_1fr] lg:px-10">
        <div><p className="text-lg font-semibold">Before you buy the agent, put its claims on trial.</p><p className="mt-2 max-w-xl text-sm text-muted-foreground">Official SharedOS authorization locally. Ed25519 dockets. No accounts, no manual approval, no guessed verdicts.</p></div>
        <div className="font-mono text-xs text-muted-foreground md:text-right"><p>service:witness.trial</p><p className="mt-2">Typical response under 20 seconds</p></div>
      </div>
    </footer>
  );
}
