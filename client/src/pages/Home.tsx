import { useState } from "react";
import { Activity, ArrowUpRight, Check, Globe2, Loader2, Plus, Radar, ShieldCheck, Wifi } from "lucide-react";

const initialSites = [
  { domain: "sinyal.app", location: "İstanbul, TR", latency: "42 ms", status: "up" },
  { domain: "api.sinyal.app", location: "Frankfurt, DE", latency: "68 ms", status: "up" },
  { domain: "panel.sinyal.app", location: "Londra, UK", latency: "—", status: "checking" },
];

export default function Home() {
  const [domain, setDomain] = useState("");
  const [sites, setSites] = useState(initialSites);
  const [checking, setChecking] = useState(false);

  const addSite = () => {
    const clean = domain.trim().replace(/^https?:\/\//, "");
    if (!clean) return;
    setChecking(true);
    setTimeout(() => {
      setSites((current) => [{ domain: clean, location: "Yeni izleme noktası", latency: "51 ms", status: "up" }, ...current]);
      setDomain("");
      setChecking(false);
    }, 650);
  };

  return (
    <main className="min-h-screen bg-[#07100d] text-[#e9f3ed] selection:bg-[#8ef0b5] selection:text-[#07100d]">
      <div className="pointer-events-none fixed inset-0 opacity-30 [background-image:radial-gradient(#234438_1px,transparent_1px)] [background-size:28px_28px]" />
      <div className="relative mx-auto max-w-6xl px-5 pb-16 sm:px-8">
        <header className="flex items-center justify-between py-7">
          <div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-xl bg-[#8ef0b5] text-[#07100d]"><Radar size={19} /></div><span className="font-mono text-sm font-bold tracking-[0.24em]">SİNYAL<span className="text-[#8ef0b5]">_</span></span></div>
          <div className="hidden items-center gap-2 rounded-full border border-[#244436] bg-[#0d1a15]/80 px-3 py-2 text-xs text-[#9ab4a5] sm:flex"><span className="size-2 rounded-full bg-[#8ef0b5] shadow-[0_0_12px_#8ef0b5]" /> Sistemler normal</div>
        </header>

        <section className="grid gap-12 pb-16 pt-12 lg:grid-cols-[1.05fr_.95fr] lg:items-end lg:pt-20">
          <div><p className="mb-5 flex items-center gap-2 font-mono text-xs uppercase tracking-[.22em] text-[#8ef0b5]"><Activity size={14} /> Gerçek ağlardan canlı izleme</p><h1 className="max-w-3xl text-5xl font-semibold leading-[.98] tracking-[-.06em] sm:text-7xl">İnternetin<br /><span className="text-[#8ef0b5]">nabzını</span> tut.</h1><p className="mt-7 max-w-xl text-base leading-7 text-[#9ab4a5]">Alan adlarınızın erişilebilirliğini farklı şehirlerden kontrol edin. Kesintileri fark etmeden önce görün.</p></div>
          <div className="rounded-3xl border border-[#244436] bg-[#0d1a15]/90 p-5 shadow-2xl shadow-black/20 backdrop-blur sm:p-7"><div className="mb-5 flex items-center justify-between"><div><p className="font-mono text-xs uppercase tracking-widest text-[#718d7d]">Yeni izleme noktası</p><h2 className="mt-2 text-xl font-medium">Bir alan adı ekle</h2></div><Globe2 className="text-[#8ef0b5]" size={22} /></div><div className="flex gap-2"><input value={domain} onChange={(e) => setDomain(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addSite()} placeholder="ornek.com" className="min-w-0 flex-1 rounded-xl border border-[#315542] bg-[#07100d] px-4 py-3 text-sm outline-none transition placeholder:text-[#4e695a] focus:border-[#8ef0b5]" /><button onClick={addSite} disabled={checking} className="grid size-12 shrink-0 place-items-center rounded-xl bg-[#8ef0b5] text-[#07100d] transition hover:bg-[#b4ffcc] active:scale-95 disabled:opacity-60">{checking ? <Loader2 className="animate-spin" size={18} /> : <Plus size={20} />}</button></div><p className="mt-4 flex items-center gap-2 text-xs text-[#718d7d]"><ShieldCheck size={14} className="text-[#8ef0b5]" /> TLS, DNS ve HTTP kontrolleri otomatik yapılır</p></div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-[#244436] bg-[#0b1712]/90"><div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#244436] px-5 py-5 sm:px-7"><div><h2 className="text-lg font-medium">İzlenen alan adları</h2><p className="mt-1 text-sm text-[#718d7d]">Son kontrol: şimdi</p></div><div className="flex items-center gap-6 text-sm"><div><span className="font-mono text-xl text-[#8ef0b5]">{sites.filter((s) => s.status === "up").length}</span><span className="ml-2 text-[#718d7d]">erişilebilir</span></div><div><span className="font-mono text-xl text-[#f0c674]">{sites.filter((s) => s.status === "checking").length}</span><span className="ml-2 text-[#718d7d]">kontrol</span></div></div></div><div className="divide-y divide-[#1b3226]">{sites.map((site) => <div key={site.domain} className="group flex flex-wrap items-center gap-4 px-5 py-5 transition hover:bg-[#102019] sm:px-7"><div className={`grid size-10 place-items-center rounded-full ${site.status === "up" ? "bg-[#8ef0b5]/10 text-[#8ef0b5]" : "bg-[#f0c674]/10 text-[#f0c674]"}`}>{site.status === "up" ? <Check size={18} /> : <Loader2 className="animate-spin" size={18} />}</div><div className="min-w-[180px] flex-1"><p className="font-mono text-sm">{site.domain}</p><p className="mt-1 text-xs text-[#718d7d]">{site.location}</p></div><div className="hidden items-center gap-2 text-sm text-[#9ab4a5] sm:flex"><Wifi size={15} className="text-[#8ef0b5]" /> {site.latency}</div><span className={`rounded-full px-3 py-1 text-xs ${site.status === "up" ? "bg-[#8ef0b5]/10 text-[#8ef0b5]" : "bg-[#f0c674]/10 text-[#f0c674]"}`}>{site.status === "up" ? "Çalışıyor" : "Kontrol ediliyor"}</span><ArrowUpRight size={17} className="text-[#4e695a] transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#8ef0b5]" /></div>)}</div></section>
        <footer className="flex items-center justify-between pt-10 text-xs text-[#4e695a]"><span>SİNYAL / MONİTORING</span><span className="font-mono">v0.1 — Türkiye</span></footer>
      </div>
    </main>
  );
}
