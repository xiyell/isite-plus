"use client";

import { motion } from "framer-motion";
import { Users, Code, Rocket, Sparkles, Bot } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="w-full min-h-screen flex flex-col items-center text-white px-6 py-20 ">
      {/* HEADER */}
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

      {/* WHY ISITE+ */}
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

      {/* MISSION / OBJECTIVES / VISION */}
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

      {/* CONTRIBUTORS */}
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

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {[
            { name: "Gabriel Suarez", role: "Quality Assurance" },
            { name: "Ciel Angelo Mendoza", role: "Backend Developer" },
            { name: "Carl Andrei Espino", role: "Backend Developer" },
            { name: "Joshua Aniban", role: "Frontend Developer" },
            { name: "Levie Jeans Panese", role: "Frontend Developer" },
          ].map((p, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -6 }}
              transition={{ type: "spring", stiffness: 200, damping: 18 }}
              className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 via-purple-500/5 to-transparent backdrop-blur-xl p-6 text-center shadow-[0_8px_32px_rgba(255,255,255,0.08)]"
            >
              <h3 className="text-xl font-semibold text-white">{p.name}</h3>
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
        <h2 className="text-3xl font-bold mb-6 flex justify-center items-center gap-2 text-green-300">
          <Code className="text-green-400" /> Powered By
        </h2>
        <div className="flex flex-wrap justify-center gap-4 text-white/85 text-sm">
          {["Next.js 15", "React 19", "Tailwind CSS", "HeroUI", "Framer Motion"].map((tech, i) => (
            <span
              key={i}
              className="border border-white/10 bg-gradient-to-br from-white/10 to-transparent px-4 py-2 rounded-full backdrop-blur-md shadow-md"
            >
              {tech}
            </span>
          ))}
        </div>

        {/* BOT CTA */}
        <div className="flex justify-center mt-10">
          <motion.button
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="flex items-center gap-2 bg-gradient-to-r from-fuchsia-500/20 via-purple-600/20 to-blue-500/20 border border-white/20 text-white px-6 py-3 rounded-full hover:from-fuchsia-400/30 hover:to-blue-400/30 transition backdrop-blur-md shadow-lg"
          >
            <Bot className="w-5 h-5 text-purple-300" />
            <span>Meet the iSITE+ AI Assistant</span>
          </motion.button>
        </div>
      </motion.section>
    </div>
  );
}
