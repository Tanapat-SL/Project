import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowDown, ArrowLeft, ArrowRight, Check, ChevronDown, Gamepad2, Globe2, Headphones, Languages, LockKeyhole, MessageCircle, Search, ShieldCheck, Sparkles, Swords, Users, Zap } from 'lucide-react';
import { socket } from '../api/socket';

export type Language = 'th' | 'en';
type LanguageProps = { language: Language; onLanguageChange: (language: Language) => void };

const copy = {
  th: {
    navGames: 'เกม', navFeatures: 'ฟีเจอร์', navAbout: 'เกี่ยวกับเรา', login: 'เข้าสู่ระบบ',
    eyebrow: 'เพื่อนร่วมทีมที่ใช่ อยู่ใกล้กว่าที่คิด', titleOne: 'หาเพื่อนเล่น', titleTwo: 'แล้วไปให้สุด',
    intro: 'MATCHFOUND ช่วยให้คุณเจอทีมที่เข้ากันได้ นัดเล่นง่ายขึ้น และสนุกกับทุกเกมไปด้วยกัน',
    play: 'เริ่มค้นหาทีม', learn: 'รู้จัก MATCHFOUND', online: 'ผู้ใช้ออนไลน์ตอนนี้', onlineConnecting: 'กำลังตรวจสอบสถานะออนไลน์...',
    featureTitle: 'เล่นด้วยกัน เก่งขึ้นด้วยกัน', featureIntro: 'ทุกเครื่องมือที่ช่วยให้การหาเพื่อนเล่นเป็นเรื่องง่าย ตั้งแต่ค้นหาทีมไปจนถึงเริ่มเกม',
    findTitle: 'หาเพื่อนที่ใช่', findText: 'เลือกเกม แรงก์ และสไตล์การเล่น แล้วเจอทีมที่เข้ากับคุณ',
    teamTitle: 'ตั้งทีมได้ในไม่กี่คลิก', teamText: 'โพสต์หาทีมของคุณ จัดการสมาชิก และพร้อมลุยไปด้วยกัน',
    chatTitle: 'คุยกันก่อนลงสนาม', chatText: 'ทำความรู้จักและวางแผนกับเพื่อนร่วมทีมได้ในที่เดียว',
    footer: 'หาเพื่อนเล่นเกมที่ใช่ แล้วสร้างโมเมนต์ดี ๆ ไปด้วยกัน',
    back: 'กลับหน้าหลัก', loginTitle: 'ยินดีต้อนรับกลับมา', loginSubtitle: 'ล็อกอินเพื่อค้นหาทีมและเริ่มเล่นด้วยกัน',
    discord: 'เข้าสู่ระบบด้วย Discord', secure: 'ล็อกอินอย่างปลอดภัยผ่านบัญชี Discord ของคุณ',
    noAccount: 'ยังไม่มีบัญชีใช่ไหม?', create: 'สร้างบัญชีได้เลย',
    terms: 'การเข้าสู่ระบบแสดงว่าคุณยอมรับข้อกำหนดการใช้งานและนโยบายความเป็นส่วนตัว',
    authError: 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองอีกครั้ง', loginSideTitle: 'ทีมที่ใช่ เปลี่ยนทุกเกมให้สนุกกว่าเดิม',
    discordNotConfigured: 'ระบบเข้าสู่ระบบ Discord ยังตั้งค่าไม่ครบ กรุณาให้ผู้ดูแลตั้งค่า DISCORD_CLIENT_ID และ DISCORD_CLIENT_SECRET ในไฟล์ .env แล้วเริ่มเซิร์ฟเวอร์ใหม่',
    accountInfo: 'ยังไม่มีบัญชีใช่ไหม? เข้าสู่ระบบด้วย Discord ครั้งแรก ระบบจะสร้างบัญชีให้โดยอัตโนมัติ',
    loginSideText: 'พบผู้เล่นที่มีสไตล์และเป้าหมายเหมือนกัน พร้อมเริ่มเกมเมื่อคุณพร้อม',
    verified: 'ชุมชนเกมเมอร์ที่ปลอดภัย',
  },
  en: {
    navGames: 'Games', navFeatures: 'Features', navAbout: 'About', login: 'Log in',
    eyebrow: 'Your next great teammate is closer than you think', titleOne: 'Find your', titleTwo: 'next squad',
    intro: 'MATCHFOUND makes it easy to meet your people, build a squad, and enjoy every game together.',
    play: 'Find your squad', learn: 'Discover MATCHFOUND', online: 'users online now', onlineConnecting: 'Connecting to live status...',
    featureTitle: 'Better together. Stronger together.', featureIntro: 'Everything you need to find your people, build a team, and get into the game.',
    findTitle: 'Meet your people', findText: 'Pick a game, rank, and play style to find teammates who fit.',
    teamTitle: 'Build a team in minutes', teamText: 'Post your party, manage members, and get ready to play.',
    chatTitle: 'Make a plan before the match', chatText: 'Meet your teammates and coordinate in one place.',
    footer: 'Find your people. Make every game count.',
    back: 'Back to home', loginTitle: 'Welcome back', loginSubtitle: 'Sign in to find your squad and start playing together.',
    discord: 'Continue with Discord', secure: 'Secure sign-in with your Discord account',
    noAccount: 'New to MATCHFOUND?', create: 'Create an account',
    terms: 'By continuing, you agree to our Terms of Service and Privacy Policy.',
    authError: 'Sign-in failed. Please try again.', loginSideTitle: 'The right squad makes every game better',
    discordNotConfigured: 'Discord sign-in is not configured yet. Ask the site administrator to set DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET in .env, then restart the server.',
    accountInfo: 'New to MATCHFOUND? Your account will be created automatically the first time you continue with Discord.',
    loginSideText: 'Meet players who share your style and goals, and play when you are ready.',
    verified: 'A safer community for gamers',
  },
} as const;

function LanguagePicker({ language, onLanguageChange, dark = false }: LanguageProps & { dark?: boolean }) {
  return (
    <label className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition-colors ${dark ? 'border-white/10 bg-white/[0.05] text-white hover:bg-white/10' : 'border-black/10 bg-white/60 text-[#191919] hover:bg-white'}`}>
      <Languages className="h-4 w-4" aria-hidden="true" />
      <span className="sr-only">Choose language</span>
      <select aria-label="Choose language" value={language} onChange={(event) => onLanguageChange(event.target.value as Language)} className="cursor-pointer appearance-none bg-transparent font-semibold outline-none">
        <option className="text-black" value="th">ไทย</option>
        <option className="text-black" value="en">English</option>
      </select>
      <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
    </label>
  );
}

function Brand({ light = false }: { light?: boolean }) {
  return <Link to="/" aria-label="MATCHFOUND home" className={`inline-flex items-center gap-2 text-lg font-black tracking-[0.18em] ${light ? 'text-white' : 'text-[#161616]'}`}><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#dc2626] text-white"><Gamepad2 className="h-5 w-5" /></span>MATCH<span className="text-[#dc2626]">FOUND</span></Link>;
}

export function LandingPage({ language, onLanguageChange }: LanguageProps) {
  const t = copy[language];
  const navigate = useNavigate();
  const [onlineCount, setOnlineCount] = useState<number | null>(null);

  useEffect(() => {
    const updateCount = (count: number) => setOnlineCount(count);
    const requestCount = () => socket.emit('request_online_count');
    const clearCount = () => setOnlineCount(null);

    socket.on('online_count', updateCount);
    socket.on('connect', requestCount);
    socket.on('disconnect', clearCount);
    if (socket.connected) requestCount();

    return () => {
      socket.off('online_count', updateCount);
      socket.off('connect', requestCount);
      socket.off('disconnect', clearCount);
    };
  }, []);

  return (
    <div className="landing-page min-h-screen overflow-hidden bg-[#e8e8e6] text-[#111112]">
      <header className="relative z-10 flex h-[76px] items-center justify-between border-b border-black/10 px-5 sm:px-8 lg:px-12">
        <Brand />
        <nav className="hidden items-center gap-8 text-sm font-semibold md:flex">
          <a className="transition hover:text-[#dc2626]" href="#games">{t.navGames}</a>
          <a className="transition hover:text-[#dc2626]" href="#features">{t.navFeatures}</a>
          <a className="transition hover:text-[#dc2626]" href="#about">{t.navAbout}</a>
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <LanguagePicker language={language} onLanguageChange={onLanguageChange} />
          <button onClick={() => navigate('/login')} className="rounded-md bg-[#dc2626] px-4 py-2.5 text-xs font-black uppercase tracking-wide text-white transition hover:bg-[#b91c1c] sm:px-6">{t.login}</button>
        </div>
      </header>

      <main>
        <section id="games" className="relative mx-auto grid min-h-[620px] max-w-[1440px] items-center gap-8 px-6 py-16 sm:px-10 lg:min-h-[690px] lg:grid-cols-[0.92fr_1.08fr] lg:px-16 lg:py-20">
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            <div className="absolute -right-20 top-0 h-full w-[40%] -skew-x-[28deg] bg-white/35" />
            <div className="absolute right-[29%] top-0 h-[55%] w-[13%] -skew-x-[28deg] bg-black/[0.035]" />
            <div className="absolute bottom-[-20%] right-[8%] h-[60%] w-[12%] -skew-x-[28deg] bg-white/35" />
            <div className="absolute -left-20 bottom-0 h-[34%] w-[32%] -skew-x-[28deg] bg-white/20" />
          </div>
          <div className="relative z-[1] max-w-xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/55 px-3.5 py-2 text-xs font-bold tracking-wide text-black/70"><Sparkles className="h-4 w-4 text-[#dc2626]" />{t.eyebrow}</div>
            <h1 className="text-[clamp(3.2rem,7vw,6.6rem)] font-black uppercase leading-[0.88] tracking-[-0.065em]">{t.titleOne}<br /><span className="text-[#dc2626]">{t.titleTwo}</span></h1>
            <p className="mt-7 max-w-[450px] text-base leading-7 text-black/65 sm:text-lg">{t.intro}</p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button onClick={() => navigate('/login')} className="group inline-flex items-center gap-3 rounded-md bg-[#dc2626] px-6 py-4 text-sm font-black uppercase tracking-wide text-white shadow-lg shadow-red-900/10 transition hover:-translate-y-0.5 hover:bg-[#b91c1c]">{t.play}<ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></button>
              <a href="#features" className="inline-flex items-center gap-2 px-2 py-3 text-sm font-bold transition hover:text-[#dc2626]">{t.learn}<ArrowDown className="h-4 w-4" /></a>
            </div>
            <div className="mt-9 flex items-center gap-2 text-sm text-black/65"><span className={`h-2.5 w-2.5 rounded-full ${onlineCount === null ? 'bg-gray-400' : 'bg-[#21a65b] shadow-[0_0_0_4px_rgba(33,166,91,0.12)]'}`} /><strong className="text-black">{onlineCount === null ? '—' : onlineCount.toLocaleString(language === 'th' ? 'th-TH' : 'en-US')}</strong>{onlineCount === null ? t.onlineConnecting : t.online}</div>
          </div>

          <div className="relative z-[1] mx-auto flex h-[360px] w-full max-w-[620px] items-center justify-center sm:h-[440px] lg:h-[500px]" aria-label="Find gaming teammates">
            <div className="absolute left-[3%] top-[20%] h-[250px] w-[175px] -rotate-[8deg] rounded-2xl border border-white/60 bg-[#07181d] p-2 shadow-2xl transition duration-500 hover:-translate-y-2 sm:h-[300px] sm:w-[205px]">
              <div className="relative h-full overflow-hidden rounded-xl bg-[radial-gradient(ellipse_at_35%_18%,#05d2e8_0%,transparent_32%),radial-gradient(ellipse_at_70%_75%,#144663_0%,transparent_50%),linear-gradient(145deg,#07141c,#051015_65%,#0b383e)]">
                <div className="absolute -left-8 top-12 h-32 w-32 rotate-45 border-[18px] border-cyan-400/40" /><div className="absolute -right-8 bottom-12 h-32 w-32 -rotate-12 border-[18px] border-blue-500/30" />
                <div className="absolute inset-x-0 bottom-5 text-center text-white"><div className="mx-auto mb-2 grid h-[70px] w-[70px] place-items-center rounded-full border-4 border-white/70 bg-gradient-to-br from-sky-300 via-blue-600 to-slate-950 text-3xl shadow-lg">✦</div><div className="font-black">NovaKite <span className="text-red-400">✦</span></div><div className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-100/70">VALORANT · DIAMOND</div></div>
              </div>
            </div>
            <div className="relative z-10 flex h-[285px] w-[190px] flex-col items-center justify-center rounded-2xl border border-white/20 bg-gradient-to-b from-[#202020] to-[#080808] shadow-2xl sm:h-[340px] sm:w-[225px]">
              <div className="mb-4 grid h-24 w-24 place-items-center rounded-full border border-white/10 bg-white/[0.07]"><Users className="h-11 w-11 text-white/60" /></div><div className="text-lg font-black text-white">YOU</div><div className="mt-2 text-xs text-white/45">YOUR NEXT TEAM STARTS HERE</div>
              <div className="absolute -bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full border border-white/10 bg-[#181818] px-3 py-2 text-[10px] font-bold text-white/70"><span className="h-1.5 w-1.5 rounded-full bg-green-400" />MATCHING PLAYERS</div>
            </div>
            <div className="absolute right-[2%] top-[20%] h-[250px] w-[175px] rotate-[8deg] rounded-2xl border border-white/60 bg-[#11130a] p-2 shadow-2xl transition duration-500 hover:-translate-y-2 sm:h-[300px] sm:w-[205px]">
              <div className="relative h-full overflow-hidden rounded-xl bg-[radial-gradient(ellipse_at_50%_20%,#c2ff00_0%,transparent_24%),radial-gradient(ellipse_at_75%_70%,#667e08_0%,transparent_42%),linear-gradient(145deg,#20210c,#080a05_60%,#303608)]">
                <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(#d5ff00 1px, transparent 1px)', backgroundSize: '13px 13px' }} />
                <div className="absolute inset-x-0 bottom-5 text-center text-white"><div className="mx-auto mb-2 grid h-[70px] w-[70px] place-items-center rounded-full border-4 border-white/70 bg-gradient-to-br from-amber-100 via-stone-700 to-black text-3xl shadow-lg">◉</div><div className="font-black">Zywoo <span className="text-red-400">✦</span></div><div className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-lime-100/70">CS2 · FACEIT LVL 9</div></div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="relative bg-[#111112] px-6 py-20 text-white sm:px-10 lg:px-16 lg:py-24">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-2xl"><p className="mb-3 text-xs font-black uppercase tracking-[0.24em] text-[#dc2626]">MATCHFOUND FOR GAMERS</p><h2 className="text-3xl font-black tracking-tight sm:text-5xl">{t.featureTitle}</h2><p className="mt-4 leading-7 text-white/55">{t.featureIntro}</p></div>
            <div className="mt-12 grid gap-4 md:grid-cols-3">
              <Feature icon={<Search />} title={t.findTitle} text={t.findText} />
              <Feature icon={<Users />} title={t.teamTitle} text={t.teamText} />
              <Feature icon={<MessageCircle />} title={t.chatTitle} text={t.chatText} />
            </div>
            <div id="about" className="mt-16 flex flex-col justify-between gap-6 border-t border-white/10 pt-7 sm:flex-row sm:items-center"><Brand light /><p className="text-sm text-white/45">{t.footer}</p></div>
          </div>
        </section>
      </main>
    </div>
  );
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <article className="group rounded-2xl border border-white/10 bg-white/[0.035] p-6 transition hover:-translate-y-1 hover:border-[#dc2626]/50 hover:bg-white/[0.06]"><div className="mb-7 grid h-12 w-12 place-items-center rounded-xl bg-[#dc2626]/15 text-[#dc2626]">{React.cloneElement(icon as React.ReactElement, { className: 'h-5 w-5' })}</div><h3 className="text-lg font-extrabold">{title}</h3><p className="mt-2 text-sm leading-6 text-white/55">{text}</p></article>;
}

export function LoginPage({ language, onLanguageChange }: LanguageProps) {
  const t = copy[language];
  const navigate = useNavigate();
  const authError = new URLSearchParams(window.location.search).get('error');
  return (
    <main className="login-page relative flex min-h-screen items-center justify-center overflow-hidden bg-[#090909] px-4 py-10 text-white sm:px-8">
      <div className="pointer-events-none absolute inset-0 opacity-40" aria-hidden="true"><div className="absolute -left-32 top-0 h-[80vh] w-[45vw] -skew-x-[28deg] bg-[linear-gradient(135deg,rgba(220,38,38,.2),transparent_65%)]" /><div className="absolute -right-40 bottom-[-30%] h-[80vh] w-[45vw] -skew-x-[28deg] bg-[linear-gradient(135deg,rgba(255,255,255,.09),transparent_65%)]" /></div>
      <div className="relative z-10 grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-[#111112] shadow-[0_32px_120px_rgba(0,0,0,.55)] lg:min-h-[630px] lg:grid-cols-[1fr_0.86fr]">
        <section className="relative hidden overflow-hidden bg-[#171817] p-10 lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 opacity-80" aria-hidden="true"><div className="absolute -right-20 top-16 h-80 w-80 rotate-45 border-[34px] border-[#dc2626]/15" /><div className="absolute -bottom-16 -left-16 h-80 w-80 -rotate-12 border-[34px] border-white/[0.04]" /><div className="absolute inset-0 bg-[radial-gradient(ellipse_at_28%_74%,rgba(220,38,38,.16),transparent_50%)]" /></div>
          <div className="relative"><Brand light /></div>
          <div className="relative max-w-md"><div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs font-semibold text-white/65"><Zap className="h-4 w-4 text-[#dc2626]" />{t.verified}</div><h1 className="text-5xl font-black leading-[1.05] tracking-tight">{t.loginSideTitle}</h1><p className="mt-5 max-w-sm leading-7 text-white/55">{t.loginSideText}</p>
            <div className="mt-8 flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-4"><div className="flex -space-x-3"><span className="grid h-10 w-10 place-items-center rounded-full border-2 border-[#171817] bg-cyan-900"><Gamepad2 className="h-5 w-5" /></span><span className="grid h-10 w-10 place-items-center rounded-full border-2 border-[#171817] bg-red-800"><Swords className="h-5 w-5" /></span><span className="grid h-10 w-10 place-items-center rounded-full border-2 border-[#171817] bg-purple-900"><Headphones className="h-5 w-5" /></span></div><div><div className="text-sm font-bold">Squad up, play more</div><div className="text-xs text-white/45">Your next game starts here</div></div><Check className="ml-auto h-5 w-5 text-green-400" /></div>
          </div>
          <div className="relative flex items-center gap-2 text-xs text-white/40"><ShieldCheck className="h-4 w-4" />{t.verified}</div>
        </section>

        <section className="flex flex-col justify-center p-6 sm:p-10 lg:px-12">
          <div className="mb-9 flex items-center justify-between lg:justify-end"><button onClick={() => navigate('/')} className="inline-flex items-center gap-2 text-sm text-white/55 transition hover:text-white lg:hidden"><ArrowLeft className="h-4 w-4" />{t.back}</button><LanguagePicker language={language} onLanguageChange={onLanguageChange} dark /></div>
          <div className="mx-auto w-full max-w-sm">
            <div className="mb-8 text-center lg:text-left"><div className="mb-6 flex justify-center lg:hidden"><Brand light /></div><h2 className="text-3xl font-black tracking-tight">{t.loginTitle}</h2><p className="mt-2 text-sm leading-6 text-white/50">{t.loginSubtitle}</p></div>
            {authError && <p role="alert" className="mb-5 rounded-lg border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-300">{authError === 'discord_not_configured' ? t.discordNotConfigured : authError === 'discord_cancelled' ? (language === 'th' ? 'ยกเลิกการเข้าสู่ระบบ Discord แล้ว หากต้องการเข้าใช้งาน กรุณาลองอีกครั้ง' : 'Discord sign-in was cancelled. Try again whenever you are ready.') : t.authError}</p>}
            <a href="/api/auth/discord" className="flex w-full items-center justify-center gap-3 rounded-lg bg-[#5865F2] px-5 py-4 font-extrabold text-white shadow-lg shadow-indigo-950/30 transition hover:bg-[#4752c4] focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-2 focus:ring-offset-[#111112]">
              <DiscordMark />{t.discord}
            </a>
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-white/40"><LockKeyhole className="h-3.5 w-3.5" />{t.secure}</div>
            <div className="my-8 flex items-center gap-4 text-[10px] font-bold uppercase tracking-[0.2em] text-white/25"><span className="h-px flex-1 bg-white/10" />MATCHFOUND<span className="h-px flex-1 bg-white/10" /></div>
            <p className="text-center text-sm leading-6 text-white/50">{t.accountInfo}</p>
            <p className="mx-auto mt-8 max-w-xs text-center text-[11px] leading-5 text-white/30">{t.terms}</p>
          </div>
          <div className="mt-10 text-center"><button onClick={() => navigate('/')} className="hidden items-center gap-2 text-xs text-white/35 transition hover:text-white/70 lg:inline-flex"><Globe2 className="h-3.5 w-3.5" />{t.back}</button></div>
        </section>
      </div>
    </main>
  );
}

function DiscordMark() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M19.73 5.12A18.2 18.2 0 0 0 15.26 3.7l-.22.45a16.7 16.7 0 0 0-5.08 0l-.23-.45a18.1 18.1 0 0 0-4.47 1.43C2.43 9.3 1.67 13.38 2.05 17.4a18 18 0 0 0 5.48 2.78l1.18-1.9a11.7 11.7 0 0 1-1.86-.9l.46-.36a12.9 12.9 0 0 0 11.38 0l.46.36c-.6.36-1.22.66-1.87.9l1.18 1.9a18 18 0 0 0 5.48-2.78c.45-4.66-.77-8.7-3.71-12.28ZM8.73 14.9c-1.1 0-2-1.02-2-2.27s.88-2.28 2-2.28 2.02 1.03 2 2.28c0 1.25-.88 2.27-2 2.27Zm6.55 0c-1.1 0-2-1.02-2-2.27s.88-2.28 2-2.28 2.02 1.03 2 2.28c0 1.25-.87 2.27-2 2.27Z" /></svg>;
}
