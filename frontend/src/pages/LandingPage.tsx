import { useNavigate } from 'react-router-dom';
import { Zap, Trophy, Globe, Play, Layers, Users, Sparkles } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  const handleJoinSession = () => {
    const code = prompt('Enter Playroom Code (6 digits):');
    if (code) {
      alert(`Connecting to Live Session: [${code.toUpperCase()}]`);
    }
  };

  return (
    <div className="bg-surface font-body-md text-on-surface min-h-screen flex flex-col selection:bg-primary-fixed selection:text-on-primary-fixed">
      {/* Header */}
      <header className="w-full sticky top-0 z-50 bg-white/70 backdrop-blur-md border-b border-outline-variant shadow-sm">
        <div className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-extrabold text-primary tracking-tight">Aero MAGE</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-on-surface-variant hover:text-primary transition font-semibold text-sm">Features</a>
            <a href="#discover" className="text-on-surface-variant hover:text-primary transition font-semibold text-sm">Discover</a>
            <a href="#playrooms" className="text-on-surface-variant hover:text-primary transition font-semibold text-sm">Playrooms</a>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/login')} 
              className="text-primary hover:text-primary/80 transition font-semibold text-sm px-4 py-2"
            >
              Log In
            </button>
            <button 
              onClick={() => navigate('/register')} 
              className="bg-primary text-on-primary px-5 py-2.5 rounded-full font-semibold text-sm hover:bg-primary/95 transition shadow-sm"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 px-6 max-w-7xl mx-auto w-full text-center flex flex-col items-center">
        <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-full px-4 py-1.5 text-indigo-700 font-semibold text-xs mb-8">
          <Sparkles className="w-3.5 h-3.5" />
          Next Gen Real-Time Quizzing Platform
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 max-w-4xl leading-tight mb-6">
          Where Learning Meets <span className="text-primary bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Interactive Play</span>
        </h1>
        <p className="text-lg text-slate-500 max-w-2xl mb-10 leading-relaxed">
          Create live multiplayer rooms, test concepts, share quiz decks, earn XP achievements, and engage participants globally with 22+ custom question types.
        </p>

        {/* CTA Lobbies */}
        <div className="flex flex-col sm:flex-row gap-4 mb-16 w-full max-w-md justify-center">
          <button 
            onClick={() => navigate('/register')} 
            className="bg-primary text-on-primary px-8 py-4 rounded-xl font-bold hover:bg-primary/95 transition shadow-md active:scale-95 flex items-center justify-center gap-2"
          >
            <Play className="w-5 h-5 fill-current" />
            Host Playroom
          </button>
          <button 
            onClick={handleJoinSession} 
            className="bg-white text-slate-700 border border-slate-200 px-8 py-4 rounded-xl font-bold hover:bg-slate-50 transition shadow-sm active:scale-95 flex items-center justify-center gap-2"
          >
            <Users className="w-5 h-5" />
            Join Session
          </button>
        </div>

        {/* Hero Interactive Screen Preview */}
        <div className="w-full max-w-5xl rounded-2xl overflow-hidden shadow-2xl border border-slate-150 relative bg-white p-2">
          <div className="bg-slate-950 rounded-xl aspect-[16/9] w-full p-8 flex flex-col justify-between text-white relative">
            {/* Playroom simulator UI layout */}
            <div className="flex justify-between items-center text-xs font-semibold text-slate-400">
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>ROOM CODE: <strong className="text-white">A3F2K1</strong></span>
              </div>
              <div className="flex items-center gap-4">
                <span>QUESTION 14 OF 20</span>
                <span className="bg-amber-500 text-slate-950 px-2.5 py-0.5 rounded-md font-extrabold text-[10px]">10s LEFT</span>
              </div>
            </div>

            <div className="max-w-2xl mx-auto my-auto text-center">
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-4">
                What does the term "Quantum Entanglement" refer to?
              </h2>
              <p className="text-sm text-slate-400">Select the correct option to claim maximum points.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto w-full">
              <div className="bg-slate-900 hover:bg-slate-850 border border-slate-800 p-4 rounded-xl text-left cursor-pointer flex items-center gap-3 transition">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold">A</div>
                <span className="text-sm font-semibold">Instant particle connection across space</span>
              </div>
              <div className="bg-slate-900 hover:bg-slate-850 border border-emerald-600/50 p-4 rounded-xl text-left cursor-pointer flex items-center gap-3 transition ring-2 ring-emerald-500/25">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-bold">B</div>
                <span className="text-sm font-semibold flex-grow">Particles spinning in same magnetic vectors</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              </div>
              <div className="bg-slate-900 hover:bg-slate-850 border border-slate-800 p-4 rounded-xl text-left cursor-pointer flex items-center gap-3 transition">
                <div className="w-8 h-8 rounded-lg bg-amber-600 flex items-center justify-center font-bold">C</div>
                <span className="text-sm font-semibold">Gravitational pull inside cosmic holes</span>
              </div>
              <div className="bg-slate-900 hover:bg-slate-850 border border-slate-800 p-4 rounded-xl text-left cursor-pointer flex items-center gap-3 transition">
                <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center font-bold">D</div>
                <span className="text-sm font-semibold">Light reflection off space debris</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="w-full bg-slate-50 border-t border-b border-slate-100 py-24 px-6">
        <div className="max-w-7xl mx-auto w-full text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">
            Engineered For Modern Interactive Engagement
          </h2>
          <p className="text-slate-500 max-w-xl mx-auto mb-16">
            Everything you need to host, publish, play, and track learning metrics out of the box.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm text-left hover:-translate-y-1 transition duration-300">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-primary flex items-center justify-center mb-6">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Real-Time Sync Lobbies</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Supercharged by Socket.IO to support thousands of active concurrent users with sub-100ms response updates.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm text-left hover:-translate-y-1 transition duration-300">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-6">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">22+ Question Types</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Add matching panels, fill blanks, ordering, coding snippets, drawing pads, and formula builders directly to quizzes.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm text-left hover:-translate-y-1 transition duration-300">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-6">
                <Globe className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Public Marketplace</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Publish creations, rate content, bookmark decks, and clone decks instantly into private collections.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm text-left hover:-translate-y-1 transition duration-300">
              <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-6">
                <Trophy className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">XP Gamification</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Climb monthly seasons, earn rarity badges (epic, legendary), and maintain daily login streaks.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Discover Curriculum Decks */}
      <section id="discover" className="py-24 px-6 max-w-7xl mx-auto w-full text-center">
        <h2 className="text-3xl font-extrabold text-slate-900 mb-4">Curated Playroom Collections</h2>
        <p className="text-slate-500 max-w-md mx-auto mb-16">
          Explore decks curated by educators and community leaders.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="rounded-2xl border border-slate-150 overflow-hidden bg-white text-left shadow-sm hover:shadow-md transition">
            <div className="aspect-[4/3] bg-slate-100 relative">
              <img className="w-full h-full object-cover" alt="Art Collection" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCR8B1496eMC_obWq34vgX9TfZ0HtSORlaDdvJrtGQixQs1xNyUb4layVzIt1GBJv1VZBjIIJoaUjMqsD7bNRJqUwKpha9eLo1zHbPtnDJRTc4cRtd631s_s833UWeCgnE_B2FWLuntCn9y5YXrBVxIv06JEU37qFPvv7Yjl1E4GSFVM9cZgaxALY_apjlulCNnmlXm1PZy8YCIzRML0urF_pOmCuvuervz9g029_5NNI-mtHaLr9Kj6CN0CDZFDGP5Ze4FFFqy1nM"/>
            </div>
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-2">Art &amp; Culture</h3>
              <p className="text-sm text-slate-500 mb-4">Explore 150+ quizzes from around the globe mapping visual history.</p>
              <button onClick={() => navigate('/login')} className="text-primary font-bold text-sm hover:underline flex items-center gap-1">
                Explore Collection <Sparkles className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-150 overflow-hidden bg-white text-left shadow-sm hover:shadow-md transition">
            <div className="aspect-[4/3] bg-slate-100 relative">
              <img className="w-full h-full object-cover" alt="Nature Collection" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBsqXfzdJZoE58hxpXbL382t__VowdzJxavHyUz4y-5QZp-y51lNnTcU9sapRONTsb2MM2JNPDFWhNO0bgjXH0TfG9Aa_pRDt1VmzwUYOI-eFNVMWxgruPdb6oJhcIZq0cb8pU330dmc94t_r6kHgO2t9HDW-FIvr1TwsjAsNREuMi03slKEXJLqDNiLqr-fU7X6qZPFnxHsstpVehceyoaMpL1W5XLXzR6OYWhvlf5bC3ySgBC6ZG6ZMUoqQXoy7-Ve9Qpt943TAo"/>
            </div>
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-2">Nature &amp; Environment</h3>
              <p className="text-sm text-slate-500 mb-4">Global ecologies, climates, biology, and environment preservation.</p>
              <button onClick={() => navigate('/login')} className="text-primary font-bold text-sm hover:underline flex items-center gap-1">
                Explore Collection <Sparkles className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-150 overflow-hidden bg-white text-left shadow-sm hover:shadow-md transition">
            <div className="aspect-[4/3] bg-slate-100 relative">
              <img className="w-full h-full object-cover" alt="Design Collection" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAlh78UEFhd9Na9LlNhgU3ibCSIBQMOgsSUGo_4o0Luq0jOWsy6XGVh6ZVlSRMbp93J8H5ALYKbtEvJ7Tk13MFxd-k02_HLPaAKv__Sb5tn3hbYDCd78OlhwxzwRwj599TV_aZrC7OhHZq8bAaoK_p6gGy6zFbqwW89-5yq1oNJ4Nbx3DQwqOGyL88JG_9cnLeZ0pOtKfm0kzwObl5Iwol7-HZH7zqAYfONsINiXnTl9s8M3hsEqPzufU9-GZG-xU-Ejq-YWK5KkGc"/>
            </div>
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-2">Architecture &amp; Design</h3>
              <p className="text-sm text-slate-500 mb-4">Curating structures, urban design blueprints, and visual layout histories.</p>
              <button onClick={() => navigate('/login')} className="text-primary font-bold text-sm hover:underline flex items-center gap-1">
                Explore Collection <Sparkles className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full bg-slate-900 text-slate-400 py-12 px-6 border-t border-slate-800 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 w-full text-center md:text-left">
          <div>
            <span className="text-white text-lg font-extrabold tracking-tight mb-2 block">Aero MAGE</span>
            <p className="text-xs text-slate-500">© 2026 Aero MAGE Inc. All rights reserved.</p>
          </div>
          <div className="flex gap-6 text-xs">
            <a href="#about" className="hover:text-white transition">About</a>
            <a href="#privacy" className="hover:text-white transition">Privacy</a>
            <a href="#terms" className="hover:text-white transition">Terms</a>
            <a href="#help" className="hover:text-white transition">Help Center</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
