'use client';

import { useEffect, useState } from "react";
import CustomizePage from '@/components/profile/customize';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardTitle } from "@/components/ui/Card";
import { Separator } from "@/components/ui/separator";

// --- Placeholder Components ---
const PostItem = ({ title, karma, date }: { title: string, karma: number, date: string }) => (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-3 border-b border-white/10 last:border-b-0">
        <div className="mb-2 sm:mb-0">
            <h3 className="text-lg font-medium text-white hover:text-cyan-400 cursor-pointer">{title}</h3>
            <p className="text-sm text-gray-400">Submitted on {date}</p>
        </div>
        <p className="text-base font-bold text-green-400">{karma} Points</p>
    </div>
);

const CommentsContent = () => (
    <div className="space-y-4">
        <p className="text-gray-300 border-l-4 border-white/50 pl-4 py-2 bg-white/5 rounded-r-md">
            "This is a sample comment on a recent discussion about React performance."
            <span className="block text-xs text-gray-500 mt-1">— 5h ago</span>
        </p>
        <p className="text-gray-300 border-l-4 border-white/50 pl-4 py-2 bg-white/5 rounded-r-md">
            "Agreed, the new Shadcn component library simplifies styling immensely!"
            <span className="block text-xs text-gray-500 mt-1">— 1d ago</span>
        </p>
    </div>
);

// --- Main Profile Page ---
export default function StudentProfilePage() {
    const [customizeOpen, setCustomizeOpen] = useState(false);

    // Close on Escape
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setCustomizeOpen(false);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    const studentData = {
        studentId: "2023-10-0456",
        yearLevel: "4th Year",
        section: "BSIT-4A",
        karma: 1200,
        posts: 45,
        comments: 208,
        username: "coder_glass_vibe",
        bio: "Building sleek UIs with React and a touch of Glassmorphism. Dedicated to front-end development projects.",
    };

    return (
        <div className="min-h-screen p-4 sm:p-8 flex items-start justify-center">
            <div
                className="
          backdrop-blur-2xl bg-white/5 border border-white/10 
          shadow-2xl shadow-cyan-500/10 rounded-2xl 
          w-full max-w-4xl p-6 md:p-10 text-white
        "
            >
                {/* HEADER */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6 pb-6">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                        <Avatar className="h-24 w-24 sm:h-28 sm:w-28 border-4 border-cyan-400 shadow-lg">
                            <AvatarImage src="https://i.pravatar.cc/300" alt="@user" />
                            <AvatarFallback>CG</AvatarFallback>
                        </Avatar>
                        <span className="absolute bottom-1 right-1 block h-4 w-4 rounded-full ring-2 ring-gray-900 bg-green-500"></span>
                    </div>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                        <h1 className="text-3xl sm:text-4xl font-extrabold truncate">
                            {studentData.username}
                        </h1>
                        <p className="text-md sm:text-lg text-gray-300 mt-1">
                            {studentData.bio}
                        </p>

                        <div className="flex flex-wrap gap-2 mt-3">
                            <Badge className="bg-cyan-500/30 text-cyan-200 border-cyan-500/50">🎓 Student</Badge>
                            <Badge className="bg-amber-500/30 text-amber-200 border-amber-500/50">Verified</Badge>
                            <Badge className="bg-pink-500/30 text-pink-200 border-pink-500/50">3y Club</Badge>
                        </div>
                    </div>

                    {/* CUSTOMIZE BUTTON (opens modal popup) */}
                    <Button
                        variant="secondary"
                        className="w-full sm:w-auto bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-colors mt-4 sm:mt-0"
                        onClick={() => setCustomizeOpen(true)}
                    >
                        Customize Profile
                    </Button>
                </div>

                <Separator className="bg-white/10 my-6" />

                {/* STUDENT INFO CARDS */}
                <div className="flex flex-wrap justify-between py-4 mb-6 gap-y-4">
                    <div className="text-center w-1/2 sm:w-auto">
                        <p className="text-sm text-gray-400">Student ID</p>
                        <p className="text-lg font-bold text-cyan-300">{studentData.studentId}</p>
                    </div>

                    <div className="text-center w-1/2 sm:w-auto">
                        <p className="text-sm text-gray-400">Year Level</p>
                        <p className="text-lg font-bold text-cyan-300">{studentData.yearLevel}</p>
                    </div>

                    <div className="text-center w-1/2 sm:w-auto">
                        <p className="text-sm text-gray-400">Section</p>
                        <p className="text-lg font-bold text-cyan-300">{studentData.section}</p>
                    </div>

                    <div className="text-center w-1/2 sm:w-auto">
                        <p className="text-sm text-gray-400">Total Points</p>
                        <p className="text-2xl font-bold text-white">{studentData.karma}</p>
                    </div>

                    <div className="text-center w-1/2 sm:w-auto">
                        <p className="text-sm text-gray-400">Submitted Posts</p>
                        <p className="text-2xl font-bold text-white">{studentData.posts}</p>
                    </div>

                    <div className="text-center w-1/2 sm:w-auto">
                        <p className="text-sm text-gray-400">Total Comments</p>
                        <p className="text-2xl font-bold text-white">{studentData.comments}</p>
                    </div>
                </div>

                <Separator className="bg-white/10 my-6" />

                {/* Tabs (Posts + Comments) */}
                <Tabs defaultValue="posts">
                    <TabsList className="w-full bg-white/10 backdrop-blur-md p-1 rounded-lg grid grid-cols-2">
                        <TabsTrigger value="posts" className="data-[state=active]:bg-cyan-500/20 text-white/80">Posts</TabsTrigger>
                        <TabsTrigger value="comments" className="data-[state=active]:bg-cyan-500/20 text-white/80">Comments</TabsTrigger>
                    </TabsList>

                    <TabsContent value="posts" className="mt-6">
                        <Card className="bg-white/5 border-white/10 p-4">
                            <CardTitle className="text-2xl mb-4 text-white">Recent Submissions</CardTitle>
                            <PostItem title="Achieving Glassmorphism with Tailwind CSS in Next.js" karma={567} date="Oct 20, 2025" />
                            <PostItem title="Shadcn Tabs not respecting dark mode styles (Need help!)" karma={123} date="Oct 18, 2025" />
                            <PostItem title="Showcase: My new React profile page design" karma={420} date="Oct 15, 2025" />
                        </Card>
                    </TabsContent>

                    <TabsContent value="comments" className="mt-6">
                        <Card className="bg-white/5 border-white/10 p-4">
                            <CardTitle className="text-2xl mb-4 text-white">Recent Comments</CardTitle>
                            <CommentsContent />
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            {/* ----------------
          MODAL (POPUP)
         ---------------- */}
            {customizeOpen && (
                // Backdrop
                <div
                    aria-hidden={!customizeOpen}
                    className="fixed pt-20 inset-0 z-50 flex items-center justify-center"
                >
                    {/* semi-opaque blurred backdrop */}
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                        onClick={() => setCustomizeOpen(false)}
                    />

                    {/* Modal box */}
                    <div
                        role="dialog"
                        aria-modal="true"
                        className="relative z-10 w-full max-w-4xl mx-4 sm:mx-6 rounded-2xl shadow-2xl transform transition-all scale-100"
                        style={{ animation: 'fadeInScale .16s ease-out' }}
                    >
                        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden max-h-[90vh]">
                            {/* Modal header */}
                            <div className="flex items-center justify-between p-4 md:p-6 border-b border-white/5">
                                <h3 className="text-lg md:text-xl font-bold text-white">Customize Profile</h3>
                                <div className="flex items-center gap-2">
                                    <Button
                                        className="bg-white/10 border border-white/20 text-white hover:bg-white/20"
                                        onClick={() => setCustomizeOpen(false)}
                                    >
                                        Close
                                    </Button>
                                </div>
                            </div>

                            {/* Modal content: scrollable */}
                            <div className="p-4 md:p-6 overflow-y-auto" style={{ maxHeight: "calc(90vh - 88px)" }}>
                                <CustomizePage />
                            </div>
                        </div>
                    </div>

                    {/* small inline animation style */}
                    <style jsx>{`
            @keyframes fadeInScale {
              from { opacity: 0; transform: translateY(6px) scale(.98); }
              to   { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>
                </div>
            )}
        </div>
    );
}
