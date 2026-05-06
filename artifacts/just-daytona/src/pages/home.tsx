import React, { useRef } from 'react';
import { motion, useScroll, useTransform, cubicBezier } from 'framer-motion';
import { Skull, Zap, Trophy, Users, ShieldAlert, Flag, Flame, Crosshair, Wrench, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

import heroBg from '@/assets/hero-bg.png';
import crashImg from '@/assets/crash.png';
import draftingImg from '@/assets/drafting.png';
import trackBankingImg from '@/assets/track-banking.png';
import tireMarksImg from '@/assets/tire-marks.png';
import garageImg from '@/assets/garage.png';

const customEase = cubicBezier(0.16, 1, 0.3, 1);

export default function Home() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const yHero = useTransform(scrollYProgress, [0, 0.2], ['0%', '50%']);
  const opacityHero = useTransform(scrollYProgress, [0, 0.1], [1, 0]);

  return (
    <div ref={containerRef} className="bg-background min-h-screen text-foreground selection:bg-primary selection:text-white">
      
      {/* 1. NAVIGATION / HEADER */}
      <header className="fixed top-0 w-full z-50 mix-blend-difference p-6 flex justify-between items-center pointer-events-none">
        <div className="font-display font-bold text-2xl tracking-widest text-white">
          DAYTOSPEED.
        </div>
        <div className="font-sans text-sm font-semibold tracking-widest text-white">
          BY @VOUTHIN
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative h-screen w-full overflow-hidden flex flex-col items-center justify-center">
        <motion.div 
          className="absolute inset-0 w-full h-full"
          style={{ y: yHero, opacity: opacityHero }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-background z-10" />
          <img 
            src={heroBg} 
            alt="Stock cars racing at Daytona" 
            className="w-full h-full object-cover object-center scale-105"
          />
        </motion.div>

        <div className="relative z-20 text-center flex flex-col items-center px-4 w-full max-w-6xl mx-auto mt-20">
          <motion.h1 
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 1, ease: customEase }}
            className="text-[12vw] leading-[0.85] font-display font-bold uppercase text-white m-0 p-0"
          >
            NO BRAKES.
          </motion.h1>
          <motion.h1 
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 1, ease: customEase, delay: 0.1 }}
            className="text-[12vw] leading-[0.85] font-display font-bold uppercase text-transparent text-stroke-primary m-0 p-0"
          >
            JUST SPEED.
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 1 }}
            className="mt-8 text-xl md:text-2xl text-gray-300 max-w-2xl font-medium"
          >
            The premier Roblox NASCAR crash simulator. Survive the big one or become part of the wreckage.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6, ease: customEase }}
            className="mt-12 flex flex-col sm:flex-row gap-4"
          >
            <Button size="lg" className="h-16 px-10 text-xl font-display tracking-widest bg-primary text-white hover:bg-white hover:text-primary transition-colors duration-300 rounded-none uppercase">
              Play on Roblox <Flag className="ml-2 w-6 h-6" />
            </Button>
          </motion.div>
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2"
        >
          <span className="text-xs uppercase tracking-[0.3em] text-gray-400 font-semibold">Start your engines</span>
          <div className="w-[1px] h-12 bg-gradient-to-b from-primary to-transparent animate-pulse" />
        </motion.div>
      </section>

      {/* 3. STATS & COMMUNITY SECTION */}
      <section className="py-24 border-y border-white/5 bg-black relative">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary via-transparent to-transparent" />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center divide-y md:divide-y-0 md:divide-x divide-white/10">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, ease: customEase }}
              className="flex flex-col items-center pt-8 md:pt-0"
            >
              <Users className="w-10 h-10 text-primary mb-4" />
              <div className="text-5xl md:text-7xl font-display font-bold text-white mb-2">149M+</div>
              <div className="text-gray-400 font-sans uppercase tracking-widest text-sm font-bold">Total Visits</div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, ease: customEase, delay: 0.1 }}
              className="flex flex-col items-center pt-8 md:pt-0"
            >
              <Trophy className="w-10 h-10 text-primary mb-4" />
              <div className="text-5xl md:text-7xl font-display font-bold text-white mb-2">264K+</div>
              <div className="text-gray-400 font-sans uppercase tracking-widest text-sm font-bold">Favorites</div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, ease: customEase, delay: 0.2 }}
              className="flex flex-col items-center pt-8 md:pt-0"
            >
              <Zap className="w-10 h-10 text-primary mb-4" />
              <div className="text-5xl md:text-7xl font-display font-bold text-white mb-2">200</div>
              <div className="text-gray-400 font-sans uppercase tracking-widest text-sm font-bold">MPH Top Speed</div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 4. THE CHAOS (CORE FEATURES) */}
      <section className="py-32 relative">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: customEase }}
            className="mb-20"
          >
            <h2 className="text-6xl md:text-8xl font-display font-bold text-white uppercase leading-none">
              The <span className="text-primary">Chaos</span>
            </h2>
            <p className="text-xl text-gray-400 mt-4 max-w-2xl">
              This isn't Sunday driving. This is bumper-to-bumper pack racing where one mistake sends twenty cars into the catchfence.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, ease: customEase }}
              className="relative aspect-video bg-muted border border-white/10 group overflow-hidden"
            >
              <img src={crashImg} alt="The Big One" className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
              <div className="absolute bottom-0 left-0 p-8 w-full">
                <div className="flex items-center gap-4 mb-3">
                  <Skull className="text-primary w-8 h-8" />
                  <div className="h-[1px] flex-1 bg-white/20" />
                </div>
                <h3 className="text-3xl font-display font-bold text-white uppercase">The Big One</h3>
                <p className="text-gray-300 mt-2">Physics-driven crashes that tear the field apart in seconds. Metal twists, sparks fly, and nobody leaves unscathed.</p>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, ease: customEase, delay: 0.2 }}
              className="relative aspect-video bg-muted border border-white/10 group overflow-hidden"
            >
              <img src={draftingImg} alt="Pack Racing" className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
              <div className="absolute bottom-0 left-0 p-8 w-full">
                <div className="flex items-center gap-4 mb-3">
                  <ShieldAlert className="text-primary w-8 h-8" />
                  <div className="h-[1px] flex-1 bg-white/20" />
                </div>
                <h3 className="text-3xl font-display font-bold text-white uppercase">Pack Racing</h3>
                <p className="text-gray-300 mt-2">Catch the draft, push your teammate, and hold your line at 200mph. Precision is the only thing keeping you alive.</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 5. THE TRACK / ATMOSPHERE */}
      <section className="py-32 bg-black relative border-y border-white/5 overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-30 pointer-events-none">
          <img src={tireMarksImg} alt="Tire Marks" className="object-cover w-full h-full mix-blend-screen" />
        </div>
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, rotate: -2 }}
                whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8, ease: customEase }}
                className="relative aspect-[4/3] border border-white/10 overflow-hidden"
              >
                <img src={trackBankingImg} alt="Track Banking" className="object-cover w-full h-full" />
                <div className="absolute inset-0 ring-1 ring-inset ring-white/10" />
              </motion.div>
            </div>
            
            <div className="order-1 lg:order-2 flex flex-col justify-center">
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8, ease: customEase }}
              >
                <Crosshair className="text-primary w-12 h-12 mb-6" />
                <h2 className="text-5xl md:text-7xl font-display font-bold text-white uppercase leading-none mb-6">
                  31 Degrees <br/>of <span className="text-primary">Terror</span>
                </h2>
                <p className="text-xl text-gray-400 mb-8">
                  The iconic superspeedway rebuilt with punishing accuracy. The high banks dare you to stay flat out. The tri-oval narrows the field. One flinch, and you're in the wall.
                </p>
                <ul className="space-y-4">
                  {[
                    "Authentic track geometry and banking",
                    "Dynamic lighting and day/night transitions",
                    "Pits, garage area, and massive grandstands",
                    "Seamless multiplayer replication"
                  ].map((item, i) => (
                    <motion.li 
                      key={i}
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.1 * i, duration: 0.5 }}
                      className="flex items-center text-gray-300 font-medium"
                    >
                      <Flame className="w-5 h-5 text-primary mr-3 flex-shrink-0" />
                      {item}
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. MECHANICS GRID */}
      <section className="py-32 relative">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: customEase }}
            className="text-center mb-20"
          >
            <h2 className="text-4xl md:text-6xl font-display font-bold text-white uppercase">
              Under The Hood
            </h2>
            <div className="w-24 h-1 bg-primary mx-auto mt-8" />
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Wrench, title: "Damage Model", desc: "Parts sheer off, panels crumple, and engines blow. Every hit leaves a permanent mark on your machine." },
              { icon: Zap, title: "Aerodynamics", desc: "Drafting isn't a suggestion, it's survival. Form lines to cut through the air and gain massive speed advantages." },
              { icon: Settings, title: "Setup Tuning", desc: "Wedge, tape, pressures. Tweak your setup in the garage to find that extra tenth of a second." }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, ease: customEase, delay: i * 0.1 }}
                className="bg-black/50 border border-white/10 p-8 hover:bg-white/5 hover:border-primary/50 transition-all duration-300 group"
              >
                <feature.icon className="w-10 h-10 text-primary mb-6 group-hover:scale-110 transition-transform" />
                <h3 className="text-2xl font-display font-bold text-white uppercase mb-3">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. MARQUEE / LOUD BANNER */}
      <section className="py-12 bg-primary overflow-hidden flex whitespace-nowrap border-y-4 border-white relative z-20">
        <motion.div 
          animate={{ x: ["0%", "-50%"] }}
          transition={{ repeat: Infinity, ease: "linear", duration: 15 }}
          className="flex font-display text-5xl md:text-7xl font-bold uppercase text-black"
        >
          {[...Array(2)].map((_, i) => (
            <React.Fragment key={i}>
              <span className="mx-8">RUBBING IS RACING •</span>
              <span className="mx-8 text-white">HOLD YOUR LINE •</span>
              <span className="mx-8">CHECKERS OR WRECKERS •</span>
              <span className="mx-8 text-white font-black">DAYTOSPEED •</span>
            </React.Fragment>
          ))}
        </motion.div>
      </section>

      {/* 8. FINAL CTA & FOOTER */}
      <section className="relative py-32 md:py-48 flex items-center justify-center text-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src={garageImg} alt="Garage" className="w-full h-full object-cover opacity-20 grayscale" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
        </div>
        
        <div className="relative z-10 max-w-4xl mx-auto px-6">
          <motion.h2 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: customEase }}
            className="text-6xl md:text-[8rem] leading-[0.85] font-display font-bold text-white uppercase mb-12"
          >
            Green Flag <br/>
            <span className="text-primary text-stroke-primary text-transparent">Drops Now.</span>
          </motion.h2>
          
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.8, ease: customEase }}
            className="flex flex-col items-center"
          >
            <Button size="lg" className="h-20 px-12 text-2xl font-display tracking-widest bg-white text-black hover:bg-primary hover:text-white transition-all duration-300 rounded-none uppercase group hover:scale-105">
              Join the Server 
              <Zap className="ml-3 w-8 h-8 group-hover:scale-125 transition-transform" />
            </Button>
            <p className="mt-8 text-gray-500 font-sans text-sm uppercase tracking-widest font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Available free on Roblox
            </p>
          </motion.div>
        </div>
      </section>
      
      <footer className="border-t border-white/10 py-12 bg-black text-center relative z-20">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="font-display font-bold text-xl tracking-widest text-white/50">
            DAYTOSPEED
          </div>
          <p className="text-gray-600 text-xs font-sans uppercase tracking-widest font-bold">
            © {new Date().getFullYear()} DaytoSpeed. Fan site. Not affiliated with Roblox Corporation.
          </p>
          <div className="text-gray-600 text-xs font-sans uppercase tracking-widest font-bold">
            Developed by @vouthin
          </div>
        </div>
      </footer>
    </div>
  );
}
