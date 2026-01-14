import { motion } from "framer-motion";
import { Card, CardContent } from "../ui/Card";
import { fadeIn } from "@/lib/utils";

const features = [
      {
        title: "Virtual Attendance",
        desc: "Easily check in to classes and events using your personalized QR code.",
        icon: "🎫",
      },
      {
        title: "QR Scanner",
        desc: "Scan and verify attendance directly within the platform.",
        icon: "📷",
      },
      {
        title: "2FA Authentication",
        desc: "Protect your account with secure two-factor authentication.",
        icon: "🔒",
      },
      {
        title: "Community Forum",
        desc: "Connect with BSIT students and faculty to share ideas.",
        icon: "💬",
      },
      {
        title: "Feedback Center",
        desc: "Send suggestions, report issues, or share your thoughts easily.",
        icon: "📝",
      },
      {
        title: "User Profiles",
        desc: "Customize your profile — details, avatar, and achievements.",
        icon: "👤",
      },
      {
        title: "User Points & Rewards",
        desc: "Earn recognition for your engagement across the platform.",
        icon: "⭐",
      },
      {
        title: "Announcements",
        desc: "Stay informed with the latest updates and campus events.",
        icon: "📢",
      },
    ];


export default function FeatureSection() { 
    return ( 
        <>
        <h2 className="text-3xl sm:text-5xl font-bold mb-10 sm:mb-16 text-center bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 text-transparent bg-clip-text">
          Platform Features
        </h2>
        <div className="flex flex-wrap justify-center gap-6 sm:gap-10 max-w-6xl w-full mx-auto">
          {features.map((feature, i) => {
            
            const colors = [
              "from-indigo-500/10 to-purple-500/10 border-indigo-400/20 shadow-indigo-500/20",
              "from-pink-500/10 to-fuchsia-500/10 border-pink-400/20 shadow-pink-500/20",
              "from-blue-500/10 to-cyan-500/10 border-blue-400/20 shadow-blue-500/20",
              "from-green-500/10 to-emerald-500/10 border-green-400/20 shadow-green-500/20",
              "from-yellow-500/10 to-amber-500/10 border-yellow-400/20 shadow-yellow-500/20",
              "from-purple-500/10 to-violet-500/10 border-purple-400/20 shadow-purple-500/20",
            ];
            const color = colors[i % colors.length];

            return (
              
              <motion.div
      key={i}
      {...fadeIn(i * 0.1)}
             
                 // Width calculations to mimic grid with gaps:
                 // SM (2 cols, gap-10=2.5rem): (100% - 2.5rem) / 2 = 50% - 1.25rem
                 // LG (3 cols, gap-10=5rem total): (100% - 5rem) / 3 = 33.33% - 1.67rem
                className="flex justify-center w-full sm:w-[calc(50%-1.25rem)] lg:w-[calc(33.33%-1.67rem)]"
              >
                
                <Card
                  className={`bg-gradient-to-br ${color} border backdrop-blur-lg rounded-3xl p-6 sm:p-10 text-center shadow-lg hover:shadow-2xl hover:scale-[1.03] transition-all duration-300 flex flex-col justify-between h-full`}
                >
                  <CardContent className="flex flex-col items-center justify-between gap-6 sm:gap-8 h-full">
                    <div className="text-5xl sm:text-7xl drop-shadow-lg flex justify-center items-center">
                      {feature.icon}
                    </div>
                    <div className="flex flex-col justify-between flex-1">
                      <h3 className="text-xl sm:text-2xl font-bold text-indigo-100 mb-3">
                        {feature.title}
                      </h3>
                      <p className="text-gray-300 text-sm sm:text-base leading-relaxed min-h-[4rem] flex items-center justify-center">
                        {feature.desc}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
        </>
    )
}