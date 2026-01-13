"use client";
import AnnouncementCarousel from "@/components/home/AnnouncementCarousel";
import FeatureSection from "@/components/home/FeatureSection";
import { Button as Button } from "@/components/ui/Button";
import Divider from "@/components/ui/Divider";
import { AnnouncementsFeed } from "@/components/announcements/AnnouncementFeeds";
import LoadingTransition from "@/components/ui/LoadingTransition";
import { useAuth } from "@/services/auth";



export default function Home() {
  const { user } = useAuth();

  const handleGetStarted = () => {
    // Dispatch a custom event to open the registration modal
    window.dispatchEvent(new Event('open-register-modal'));
  }

  return (
    <div className="flex flex-col min-h-screen w-full text-gray-100 bg-transparent overflow-x-hidde">
      <LoadingTransition />
      {/* 
        -----------------------------------------------------------------

          Landing Page

        -----------------------------------------------------------------
        */}
      <Divider />
      <section className="relative flex flex-col justify-center items-center min-h-[100vh] sm:min-h-screen text-center px-4 sm:px-8 py-16 sm:py-0 overflow-hidden">
        <div
          className="absolute inset-0 bg-center bg-no-repeat bg-cover opacity-25"
          style={{
            backgroundImage: "url('/assets/pupsmb-banner-logo.jpg')",
            filter: "brightness(250%) saturate(0%) contrast(130%)",
          }}
        >
        </div>
        <div className="absolute inset-0 bg-linear-to-b from-gray-900/80 via-transparent to-transparent" />

        <h1
          className="relative z-10 text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold mb-4 sm:mb-6 bg-linear-to-r from-fuchsia-400 to-indigo-400 bg-clip-text text-transparent">
          Welcome to iSITE+
        </h1>
        <p
          className="relative z-10 text-base sm:text-lg md:text-xl text-gray-300 max-w-lg sm:max-w-2xl mb-6 sm:mb-8 leading-relaxed"
        >
          A next-generation digital platform for PUP SMB-BSIT Students, Faculty,
          and the iSITE Organization. Seamless. Secure. Smart.
        </p>
        {!user && (
          <Button
            onClick={handleGetStarted}
            className="z-10 bg-fuchsia-500 text-white text-lg sm:text-xl px-6 sm:px-10 py-3 sm:py-5 rounded-3xl shadow-lg hover:bg-purple-700 hover:shadow-fuchsia-400/40 transition-all duration-300"
          >
            Get Started
          </Button>
        )}
      </section>
      {/* -----------------------------------------------------------------

        Announcements Section 

      -----------------------------------------------------------------
      */}
      <Divider />

      <section className="py-24 sm:py-32 flex flex-col gap-24 sm:gap-32">
        <AnnouncementCarousel />
        <div className="container mx-auto">
          <AnnouncementsFeed limit={3} />
        </div>
      </section>
      {/* -----------------------------------------------------------------

        Platform Features

      -----------------------------------------------------------------
      */}
      <Divider />
      <section id="features" className="py-16 sm:py-24 px-4 sm:px-8 flex flex-col items-center">
        <FeatureSection />

      </section>
    </div>
  );
}
