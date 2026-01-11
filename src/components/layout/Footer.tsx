'use client';

import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="w-full bg-black text-gray-200 border-t border-fuchsia-900/30">
      <div className="max-w-7xl mx-auto px-6 py-12">

        <div className="flex flex-col md:flex-row justify-between gap-12">

          <div className="flex flex-col md:w-1/3">
            <h2 className="text-3xl font-extrabold text-white tracking-tight">
              ISITE<span className="text-fuchsia-500">+</span>
            </h2>
            <p className="text-sm text-gray-400 mt-2 leading-relaxed max-w-xs">
              Integrated Student in Information Technology Education Plus
            </p>
          </div>


          <div className="grid grid-cols-2 sm:grid-cols-3 gap-10 md:w-2/3">
            {/* Menu */}
            <div>
              <h4 className="text-white font-semibold mb-3 text-sm tracking-wide uppercase">
                Menu
              </h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/" className="hover:text-fuchsia-400 transition">Home</Link></li>
                <li><Link href="/about" className="hover:text-fuchsia-400 transition">About</Link></li>
                <li><Link href="/community" className="hover:text-fuchsia-400 transition">Community</Link></li>
                <li><Link href="/iQr" className="hover:text-fuchsia-400 transition">QR Attendance</Link></li>
              </ul>
            </div>

            {/* About Us */}
            <div>
              <h4 className="text-white font-semibold mb-3 text-sm tracking-wide uppercase">
                About Us
              </h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/about" className="hover:text-fuchsia-400 transition">Vision</Link></li>
                <li><Link href="/about" className="hover:text-fuchsia-400 transition">Mission</Link></li>
                <li><Link href="/about" className="hover:text-fuchsia-400 transition">Core Values</Link></li>
                <li><Link href="/about" className="hover:text-fuchsia-400 transition">Goals</Link></li>
              </ul>
            </div>

            {/* Help & FAQ */}
            <div>
              <h4 className="text-white font-semibold mb-3 text-sm tracking-wide uppercase">
                Help & FAQ
              </h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/about" className="hover:text-fuchsia-400 transition">FAQ</Link></li>
                <li><Link href="#" className="hover:text-fuchsia-400 transition">What&apos;s New</Link></li>
                <li><Link href="/feedback" className="hover:text-fuchsia-400 transition">Request a Feature</Link></li>
                <li><Link href="/feedback" className="hover:text-fuchsia-400 transition">Supports</Link></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="mt-10 border-t border-fuchsia-900/30"></div>

        {/* Bottom Section */}
        <div className="text-center text-xs text-gray-500 mt-6">
          © {new Date().getFullYear()} <span className="font-semibold text-fuchsia-400"> VoltEdge™</span>. All Rights Reserved.
        </div>
      </div>
    </footer>
  );
}
