import { AlertTriangle, ArrowLeft, Bot, CheckCircle2, Database, ExternalLink, Gauge, MessageCircle, Server, ShieldAlert } from "lucide-react";

const checks = [
  { title: "WebDev ön yüzü", detail: "Vite geliştirme sunucusu çalışıyor", state: "ok", icon: Server },
  { title: "Admin paneli", detail: "Panel erişilebilir; kimlik doğrulama henüz eklenmedi", state: "warn", icon: ShieldAlert },
  { title: "Telegram botu", detail: "TELEGRAM_BOT_TOKEN ve TELEGRAM_CHAT_ID bulunamadı", state: "off", icon: MessageCircle },
  { title: "ChatGPT / OpenAI", detail: "ChatGPT API bağlantısı veya sunucu anahtarı yapılandırılmadı", state: "off", icon: Bot },
  { title: "BTK gerçek sorgu", detail: "Statik ön yüzde /api sunucusu yok; CAPTCHA akışı bağlı değil", state: "off", icon: Database },
];

const style = {
  ok: { label: "Çalışıyor", dot: "bg-[#8ef0b5]", text: "text-[#8ef0b5]" },
  warn: { label: "Eksik yapılandırma", dot: "bg-[#f0c674]", text: "text-[#f0c674]" },
  off: { label: "Bağlı değil", dot: "bg-[#ff8c8c]", text: "text-[#ff8c8c]" },
} as const;

export default function Admin() {
  return (
    <main className="min-h-screen bg-[#07100d] text-[#e9f3ed]">
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
        <a href="/" className="mb-12 inline-flex items-center gap-2 text-sm text-[#9ab4a5] transition hover:text-[#8ef0b5]"><ArrowLeft size={16} /> Ana panele dön</a>
        <div className="mb-10 flex flex-wrap items-end justify-between gap-5"><div><p className="mb-3 font-mono text-xs uppercase tracking-[.2em] text-[#8ef0b5]">SİNYAL / ADMIN</p><h1 className="text-4xl font-semibold tracking-[-.04em] sm:text-5xl">Sistem durumu</h1><p className="mt-4 max-w-2xl text-[#9ab4a5]">Entegrasyonların ve çalışma ortamının mevcut bağlantı durumunu buradan kontrol edin.</p></div><div className="flex items-center gap-2 rounded-full border border-[#244436] bg-[#0d1a15] px-3 py-2 text-xs text-[#9ab4a5]"><Gauge size={14} className="text-[#8ef0b5]" /> Son kontrol: şimdi</div></div>
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{checks.map(({ title, detail, state, icon: Icon }) => { const current = style[state as keyof typeof style]; return <article key={title} className="rounded-2xl border border-[#244436] bg-[#0d1a15]/90 p-5"><div className="mb-7 flex items-start justify-between"><div className="grid size-10 place-items-center rounded-xl bg-[#07100d] text-[#8ef0b5]"><Icon size={19} /></div><span className={`flex items-center gap-2 text-xs ${current.text}`}><span className={`size-2 rounded-full ${current.dot}`} />{current.label}</span></div><h2 className="font-medium">{title}</h2><p className="mt-2 min-h-10 text-sm leading-5 text-[#718d7d]">{detail}</p></article>; })}</section>
        <section className="mt-6 rounded-2xl border border-[#5f4b27] bg-[#201b0e] p-5 sm:p-6"><div className="flex gap-4"><AlertTriangle className="mt-0.5 shrink-0 text-[#f0c674]" size={20} /><div><h2 className="font-medium text-[#f0c674]">Gerçek iletişim için gerekenler</h2><p className="mt-2 text-sm leading-6 text-[#c8b989]">Telegram ile CAPTCHA gönderimi ve ChatGPT yanıtları güvenli sunucu tarafı değişkenleri gerektirir. Bu statik sürümde anahtarları tarayıcıya koymak güvenli değildir; önce sunucu/API katmanı açılmalıdır.</p><div className="mt-4 flex flex-wrap gap-3 text-xs text-[#f0c674]"><span className="rounded-lg border border-[#5f4b27] px-3 py-2">TELEGRAM_BOT_TOKEN</span><span className="rounded-lg border border-[#5f4b27] px-3 py-2">TELEGRAM_CHAT_ID</span><span className="rounded-lg border border-[#5f4b27] px-3 py-2">OPENAI_API_KEY</span></div></div></div></section>
        <div className="mt-8 flex flex-wrap gap-3"><a href="/" className="inline-flex items-center gap-2 rounded-xl bg-[#8ef0b5] px-4 py-3 text-sm font-medium text-[#07100d] transition hover:bg-[#b4ffcc]"><CheckCircle2 size={16} /> Ön yüzü aç</a><a href="https://help.manus.im" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-[#315542] px-4 py-3 text-sm text-[#9ab4a5] transition hover:border-[#8ef0b5] hover:text-[#8ef0b5]"><ExternalLink size={15} /> Yardım merkezi</a></div>
      </div>
    </main>
  );
}
