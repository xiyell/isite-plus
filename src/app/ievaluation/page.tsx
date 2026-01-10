"use client";

import IEvaluationContent from "@/components/dashboard/ievaluation";
import { motion } from "framer-motion";

export default function IEvaluationPage() {
    return (
        <div className="min-h-screen w-full  text-white pt-24 px-4 md:px-8 lg:px-16 overflow-x-hidden">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="max-w-7xl mx-auto space-y-8"
            >
                <div>
                    <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                        Evaluations
                    </h1>
                    <p className="text-gray-400 mt-2 text-lg">
                        Participate in event evaluations and share your feedback.
                    </p>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl shadow-2xl">
                    <IEvaluationContent publicOnly={true} />
                </div>
            </motion.div>
        </div>
    );
}
