"use client";

import { motion } from "framer-motion";
import { 
  Users, Code, Rocket, Sparkles, Bot, User, 
  Globe, Database, Zap, Palette, Layers, Cpu, ShieldCheck 
} from "lucide-react"; 

// Custom Placeholder Avatar Component
const DeveloperAvatar = ({ name, imageSrc }: { name: string, imageSrc?: string }) => {
  // Generates initials from the name
  const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  if (imageSrc) {
    return (
      // In a real app, use next/image here
      <img
        src={imageSrc}
        alt={name}
        className="w-16 h-16 rounded-full object-cover border-2 border-purple-400/50 mb-3 mx-auto"
      />
    );
  }

  // Placeholder using User icon and initials
  return (
    <div className="w-16 h-16 rounded-full bg-purple-700/50 border-2 border-purple-400/70 mb-3 mx-auto flex items-center justify-center text-xl font-bold text-white shadow-inner">
      {initials || <User className="w-8 h-8 text-purple-300" />}
    </div>
  );
};


import { useEffect, useState } from "react";
import { getContributorImages } from "@/actions/about";

export default function AboutPage() {

  const [contributors, setContributors] = useState([
    { name: "Luis Gabriel Suarez", role: "Quality Assurance", imageSrc: "/images/contributors/gabriel.jpg" },
    { name: "Ciel Angelo Mendoza", role: "Backend Developer", imageSrc: "/images/contributors/ciel.jpg" },
    { name: "Carl Andrei Espino", role: "Backend Developer", imageSrc: "" },
    { name: "Joshua Aniban", role: "Frontend Developer", imageSrc: "" },
    { name: "Levie Jean Panesa", role: "Frontend Developer", imageSrc: "/images/contributors/levie.jpg" },
  ]);

  useEffect(() => {
    const fetchContributorProfiles = async () => {
      try {
        // Fetch using lookupName if available, else standard name
        const names = contributors.map(c => (c as any).lookupName || c.name);
        const fetchedData = await getContributorImages(names);

        setContributors(prev => prev.map(c => {
          const searchKey = (c as any).lookupName || c.name;
          return {
            ...c,
            imageSrc: fetchedData[searchKey] || c.imageSrc 
          };
        }));
      } catch (error) {
        console.error("Failed to fetch contributor profiles:", error);
      }
    };

    fetchContributorProfiles();
  }, []);


  return (
    <div className="w-full min-h-screen flex flex-col items-center text-white px-6 py-20 ">

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-3xl mb-16"
      >
        <h1 className="text-6xl font-extrabold mb-6 tracking-tight bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 text-transparent bg-clip-text">
          About iSITE+
        </h1>
        <p className="text-white/80 text-lg leading-relaxed">
          Building a community where creativity, collaboration, and innovation come together — driven by IT students, for IT students.
        </p>
      </motion.div>

      <motion.section
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-5xl mb-20"
      >
        <div className="rounded-3xl border border-purple-500/20 bg-gradient-to-br from-white/10 via-purple-500/5 to-transparent backdrop-blur-xl p-10 shadow-[0_8px_40px_rgba(155,0,255,0.15)]">
          <h2 className="text-4xl font-bold text-center mb-6 text-purple-300">Why iSITE+</h2>
          <p className="text-white/85 text-center text-lg leading-relaxed mb-4">
            iSITE+ is inspired by the success of UP’s Y4T, which began as a student initiative and grew into a national platform.
            Similarly, iSITE+ aims to become Bulacan’s flagship IT event — bridging academic learning and industry innovation.
          </p>
          <div className="text-center text-white/80 mt-6 leading-relaxed">
            <p className="font-semibold text-lg mb-3 text-purple-200">Key Values</p>
            <ul className="space-y-2 text-white/70">
              <li> Expands SITE from a student org into an event brand</li>
              <li> Creates opportunities for networking, exposure, and recognition</li>
              <li> Strengthens iSITE’s relevance in its 20th year</li>
            </ul>
          </div>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-6xl mb-20 grid grid-cols-1 md:grid-cols-3 gap-8"
      >
        {[
          {
            icon: <Rocket className="text-pink-400" />,
            title: "Mission",
            bg: "from-pink-500/10 to-transparent",
            border: "border-pink-500/30",
            text: "To empower IT students by providing opportunities for learning, competition, and collaboration through a district-wide academic and industry-aligned platform.",
          },
          {
            icon: <Sparkles className="text-yellow-300" />,
            title: "Objectives",
            bg: "from-yellow-500/10 to-transparent",
            border: "border-yellow-400/30",
            text: (
              <ul className="space-y-2">
                <li> Promote inter-school collaboration starting in District 6</li>
                <li> Provide exposure to emerging technologies through seminars</li>
                <li> Organize signature events positioning PUP Santa Maria as a hub for IT education</li>
              </ul>
            ),
          },
          {
            icon: <Rocket className="text-blue-400" />,
            title: "The Vision",
            bg: "from-blue-500/10 to-transparent",
            border: "border-blue-400/30",
            text: (
              <>
                <p>
                  iSITE envisions a stronger impact beyond the walls of PUP Santa Maria.
                  With iSITE+, it expands into a district-wide, and eventually provincial, platform connecting students and industry.
                </p>
                <ul className="space-y-1 mt-3">
                  <li> Inspire innovation</li>
                  <li> Connect schools and student leaders</li>
                </ul>
              </>
            ),
          },
        ].map((section, i) => (
          <motion.div
            key={i}
            whileHover={{ scale: 1.03 }}
            transition={{ type: "spring", stiffness: 200 }}
            className={`rounded-2xl border ${section.border} bg-gradient-to-br ${section.bg} backdrop-blur-xl p-8 shadow-[0_8px_32px_rgba(255,255,255,0.1)]`}
          >
            <h2 className="text-2xl font-bold mb-3 flex items-center gap-2 text-white">
              {section.icon} {section.title}
            </h2>
            <div className="text-white/85 text-sm leading-relaxed">{section.text}</div>
          </motion.div>
        ))}
      </motion.section>

      {/* ABOUT iSITE */}
      <motion.section
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-4xl mb-20"
      >
        <div className="rounded-3xl border border-fuchsia-500/20 bg-gradient-to-br from-fuchsia-500/10 via-purple-500/5 to-transparent backdrop-blur-xl p-10 text-center shadow-[0_8px_40px_rgba(255,0,255,0.1)]">
          <h2 className="text-4xl font-bold mb-8 text-fuchsia-300">About iSITE</h2>
          <p className="text-white/80 text-lg leading-relaxed mb-6">
            For two decades, iSITE has been the home of IT students at PUP Santa Maria. It has served
            as a platform for learning, collaboration, and innovation — empowering students through
            training, competitions, and community-driven events.
          </p>
          <ul className="text-white/80 space-y-2">
            <li> 20 years of student leadership and innovation</li>
            <li> Recognized campus-based IT organization</li>
            <li> Nurtured hundreds of aspiring IT professionals</li>
          </ul>
        </div>
      </motion.section>

      {/* CONTRIBUTORS - MODIFIED SECTION */}
      <motion.section
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-6xl mb-20"
      >
        <h2 className="text-3xl font-bold mb-10 flex items-center gap-2 text-blue-300">
          <Users className="text-blue-400" /> Project Contributors
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {contributors.map((p, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -6 }}
              transition={{ type: "spring", stiffness: 200, damping: 18 }}
              className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 via-purple-500/5 to-transparent backdrop-blur-xl p-6 text-center shadow-[0_8px_32px_rgba(255,255,255,0.08)]"
            >
              <DeveloperAvatar name={p.name} imageSrc={p.imageSrc} />

              <h3 className="text-xl font-semibold text-white mt-1">{p.name}</h3>
              <p className="text-sm text-purple-300 font-medium">{p.role}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* TECH STACK */}
      <motion.section
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="w-full max-w-5xl text-center"
      >
        <div className="relative mb-12">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-white/10"></div>
          </div>
          <div className="relative flex justify-center">
            <h2 className="bg-black/20 backdrop-blur-xl px-6 py-2 text-3xl font-bold flex items-center gap-2 text-green-300 border border-white/10 rounded-full">
              <Code className="text-green-400" /> Powered By
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[
            { name: "Next.js 15", icon: <Globe size={18} />, color: "text-white" },
            { name: "React 19", icon: <Layers size={18} />, color: "text-blue-400" },
            { name: "TypeScript", icon: <Code size={18} />, color: "text-blue-500" },
            { name: "Tailwind 4", icon: <Palette size={18} />, color: "text-cyan-400" },
            { name: "Firebase", icon: <Database size={18} />, color: "text-yellow-500" },
            { name: "Gemini AI", icon: <Sparkles size={18} />, color: "text-purple-400" },
            { name: "Framer", icon: <Zap size={18} />, color: "text-pink-500" },
            { name: "Shadcn UI", icon: <Layers size={18} />, color: "text-slate-300" },
            { name: "Lucide", icon: <Zap size={18} />, color: "text-orange-400" },
            { name: "Security", icon: <ShieldCheck size={18} />, color: "text-green-400" },
          ].map((tech, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -5, scale: 1.05 }}
              className="group relative flex flex-col items-center justify-center border border-white/10 bg-white/5 p-4 rounded-xl backdrop-blur-md transition-all hover:bg-white/10 hover:border-white/20 hover:shadow-[0_0_20px_rgba(255,255,255,0.05)]"
            >
              <div className={`${tech.color} mb-2 group-hover:scale-110 transition-transform`}>
                {tech.icon}
              </div>
              <span className="text-white/80 text-xs font-medium group-hover:text-white transition-colors">
                {tech.name}
              </span>
            </motion.div>
          ))}
        </div>

        {/* BOT CTA */}
        <div className="flex justify-center mt-16">
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: "0 0 25px rgba(168, 85, 247, 0.4)" }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
            onClick={() => window.dispatchEvent(new CustomEvent('open-ichat'))}
            className="group relative flex items-center gap-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-8 py-4 rounded-full font-bold shadow-xl overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            <Bot className="w-6 h-6 animate-bounce" />
            <span className="text-lg">Talk to iSITE+ Assistant</span>
          </motion.button>
        </div>
      </motion.section>
    </div>
  );
}