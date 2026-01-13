"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "@/services/firebase";
import { useParams } from "next/navigation";
import {
    doc,
    onSnapshot,
    Timestamp
} from "firebase/firestore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Edit2, Loader2, Calendar, GraduationCap, Trophy, MessageSquare, FileText, UserCircle } from "lucide-react";
import { EditProfileModal, ProfileData, ThemeColor } from "@/components/profile/EditProfileModal";

// --- Types ---
interface PostData {
    id: string;
    title: string;
    description: string;
    createdAt: Timestamp;
}

interface CommentData {
    id: string;
    text: string;
    createdAt: Timestamp;
}

// --- Theme helpers ---
const THEME_STYLES: Record<ThemeColor, { gradient: string, text: string, border: string, bg: string }> = {
    cyan: { gradient: "from-cyan-500 to-blue-600", text: "text-cyan-400", border: "border-cyan-500/50", bg: "bg-cyan-500/10" },
    purple: { gradient: "from-purple-500 to-indigo-600", text: "text-purple-400", border: "border-purple-500/50", bg: "bg-purple-500/10" },
    green: { gradient: "from-emerald-500 to-teal-600", text: "text-emerald-400", border: "border-emerald-500/50", bg: "bg-emerald-500/10" },
    orange: { gradient: "from-orange-500 to-red-600", text: "text-orange-400", border: "border-orange-500/50", bg: "bg-orange-500/10" },
    pink: { gradient: "from-pink-500 to-rose-600", text: "text-pink-400", border: "border-pink-500/50", bg: "bg-pink-500/10" },
};

export default function ProfilePage() {
    const params = useParams();
    const targetUid = params?.uid as string; // Get UID from URL

    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEditOpen, setIsEditOpen] = useState(false);
    
    // Stats & Activity
    const [stats, setStats] = useState({ posts: 0, comments: 0, karma: 0 });
    const [recentPosts, setRecentPosts] = useState<PostData[]>([]);
    const [recentComments, setRecentComments] = useState<CommentData[]>([]);

    const isOwner = currentUser?.uid === targetUid;

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
        });
        return () => unsubscribeAuth();
    }, []);

    // Fetch Target Profile Realtime
    useEffect(() => {
        if (!targetUid) return;

        const unsubscribeSnapshot = onSnapshot(doc(db, "users", targetUid), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setProfile({
                    uid: targetUid,
                    name: data.name || "Anonymous",
                    bio: data.bio || "No bio yet.",
                    // Defaults if missing
                    yearLevel: data.yearLevel || "N/A",
                    section: data.section || "N/A",
                    theme: data.theme || "cyan",
                    photoURL: data.photoURL || "",
                    showOnlineStatus: data.showOnlineStatus ?? true,
                    studentId: data.studentId || "N/A",
                    role: data.role || "user",
                    createdAt: data.createdAt // New Field
                });
                
                setStats(prev => ({ ...prev, karma: data.karma || 0 }));
            } else {
                setProfile(null); // User not found
            }
            setLoading(false);
        });

        return () => unsubscribeSnapshot();
    }, [targetUid]);

    // Fetch Activity using Server Action (More robust for Reference handling)
    useEffect(() => {
        if (!targetUid) return;

        const fetchActivity = async () => {
            try {
                // Dynamically import to ensure server action is called correctly
                const { getUserActivity } = await import("@/actions/community");
                
                const { posts: fetchedPosts, comments: fetchedComments } = await getUserActivity(targetUid);

                // Helper to mimic Firestore Timestamp for UI consistency
                const toTimestamp = (iso?: string | null) => {
                    if (!iso) return null;
                    const date = new Date(iso);
                    return {
                        toDate: () => date,
                        seconds: Math.floor(date.getTime() / 1000)
                    } as unknown as Timestamp;
                };

                const posts: PostData[] = fetchedPosts.map(p => ({
                    id: p.id!,
                    title: p.title,
                    description: p.description,
                    createdAt: toTimestamp(p.createdAt) as Timestamp
                })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

                const comments: CommentData[] = fetchedComments.map(c => ({
                    id: c.id!,
                    text: c.text,
                    createdAt: toTimestamp(c.createdAt) as Timestamp
                })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

                setStats(prev => ({ ...prev, posts: posts.length, comments: comments.length }));
                setRecentPosts(posts.slice(0, 5));
                setRecentComments(comments.slice(0, 5));

            } catch (err) {
                console.error("Critical failure in fetchActivity:", err);
            }
        };

        fetchActivity();
    }, [targetUid]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-fuchsia-500" />
                    <p className="text-gray-400 font-medium">Loading Profile...</p>
                </div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="min-h-screen flex items-center justify-center text-white">
                <div className="text-center space-y-4">
                    <UserCircle className="w-16 h-16 mx-auto text-gray-600" />
                    <h2 className="text-xl font-bold">User Not Found</h2>
                    <p className="text-gray-400">The profile you are looking for does not exist.</p>
                </div>
            </div>
        );
    }

    const theme = THEME_STYLES[profile.theme] || THEME_STYLES.cyan;

    return (
        <div className="min-h-screen w-full bg-[#050505] text-white pt-24 pb-12 px-4 sm:px-6 relative overflow-hidden">
            {/* Background Ambience */}
            <div className={`absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b ${theme.gradient} opacity-10 blur-3xl pointer-events-none`} />

            <div className="max-w-5xl mx-auto relative z-10 space-y-8">
                
                {/* 1. HERO SECTION */}
                <div className="relative group">
                    <div className="absolute inset-0 bg-white/5 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-2xl" />
                    
                    <div className="relative p-6 sm:p-10 flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left">
                        {/* Avatar */}
                        <div className="relative shrink-0">
                            <div className={`w-32 h-32 sm:w-40 sm:h-40 rounded-full p-1 bg-gradient-to-br ${theme.gradient} shadow-lg shadow-black/50`}>
                                <Avatar className="w-full h-full border-4 border-[#0a0a0a] bg-[#1a1a1a]">
                                    <AvatarImage src={profile.photoURL} className="object-cover" />
                                    <AvatarFallback className="text-3xl font-bold text-gray-500">{profile.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                            </div>
                            {profile.showOnlineStatus && (
                                <div className="absolute bottom-3 right-3 w-6 h-6 bg-green-500 rounded-full border-4 border-[#0a0a0a] shadow-md" title="Online" />
                            )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 space-y-4 pt-2">
                            <div className="space-y-1">
                                <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                                    {profile.name}
                                </h1>
                                <p className="text-gray-400 text-lg sm:text-xl font-medium max-w-2xl mx-auto md:mx-0">
                                    {profile.bio}
                                </p>
                            </div>

                            {/* Tags */}
                            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                                <Badge variant="outline" className={`${theme.bg} ${theme.text} ${theme.border} px-3 py-1 text-sm border`}>
                                    <GraduationCap className="w-4 h-4 mr-1.5" />
                                    {profile.yearLevel}
                                </Badge>
                                {profile.section !== 'None' && (
                                    <Badge variant="outline" className="bg-white/5 border-white/10 text-gray-300 px-3 py-1 text-sm">
                                        Section {profile.section}
                                    </Badge>
                                )}
                                {profile.studentId && profile.studentId !== "N/A" && (
                                    <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 px-3 py-1 text-sm">
                                        ID: {profile.studentId}
                                    </Badge>
                                )}
                            </div>
                        </div>

                        {/* Edit Button - ONLY FOR OWNER */}
                        {isOwner && (
                            <Button 
                                onClick={() => setIsEditOpen(true)}
                                variant="secondary" 
                                className="bg-white/10 hover:bg-white/20 text-white border border-white/10 shrink-0"
                            >
                                <Edit2 className="w-4 h-4 mr-2" />
                                Customize
                            </Button>
                        )}
                    </div>
                </div>

                {/* 2. STATS GRID */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: "Karma Points", value: stats.karma, icon: Trophy, color: "text-amber-400" },
                        { label: "Total Posts", value: stats.posts, icon: FileText, color: "text-blue-400" },
                        { label: "Comments", value: stats.comments, icon: MessageSquare, color: "text-emerald-400" },
                        { 
                            label: "Joined", 
                            value: profile.createdAt ? new Date(profile.createdAt).getFullYear().toString() : "2026", 
                            icon: Calendar, 
                            color: "text-fuchsia-400" 
                        },
                    ].map((stat, i) => (
                        <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/[0.07] transition-colors flex flex-col items-center justify-center text-center gap-2">
                             <stat.icon className={`w-6 h-6 ${stat.color} mb-1 opacity-80`} />
                             <span className="text-3xl font-bold">{stat.value}</span>
                             <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold">{stat.label}</span>
                        </div>
                    ))}
                </div>

                {/* 3. ACTIVITY TABS */}
                <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden min-h-[400px]">
                    <Tabs defaultValue="posts" className="w-full">
                        <div className="border-b border-white/10 bg-black/20 px-6 pt-4">
                            <TabsList className="bg-transparent p-0 gap-6">
                                <TabsTrigger 
                                    value="posts" 
                                    className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-fuchsia-500 data-[state=active]:text-fuchsia-400 rounded-none pb-4 text-gray-400 hover:text-white transition-all text-base"
                                >
                                    Recent Posts
                                </TabsTrigger>
                                <TabsTrigger 
                                    value="comments" 
                                    className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-fuchsia-500 data-[state=active]:text-fuchsia-400 rounded-none pb-4 text-gray-400 hover:text-white transition-all text-base"
                                >
                                    Comment History
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <div className="p-6">
                            <TabsContent value="posts" className="mt-0 space-y-4">
                                {recentPosts.length > 0 ? (
                                    recentPosts.map(post => (
                                        <div key={post.id} className="group flex items-start justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/20 hover:bg-white/10 transition-all cursor-default">
                                            <div className="space-y-1">
                                                <h3 className="font-semibold text-lg text-gray-200 group-hover:text-white transition-colors">
                                                    {post.title}
                                                </h3>
                                                <p className="text-sm text-gray-400 line-clamp-1">
                                                    {post.description}
                                                </p>
                                            </div>
                                            <span className="text-xs font-mono text-gray-600 bg-black/30 px-2 py-1 rounded">
                                                {post.createdAt?.toDate ? post.createdAt.toDate().toLocaleDateString() : 'Unknown'}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-12 text-gray-500">
                                        <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                        <p>No recent posts found.</p>
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="comments" className="mt-0 space-y-4">
                                {recentComments.length > 0 ? (
                                    recentComments.map(comment => (
                                        <div key={comment.id} className="flex gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
                                            <MessageSquare className="w-5 h-5 text-gray-500 shrink-0 mt-1" />
                                            <div className="space-y-1">
                                                <p className="text-gray-300 italic">"{comment.text}"</p>
                                                <p className="text-xs text-gray-500">
                                                    Posted on {comment.createdAt?.toDate ? comment.createdAt.toDate().toLocaleDateString() : 'Unknown'}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-12 text-gray-500">
                                        <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                        <p>No comments yet.</p>
                                    </div>
                                )}
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>

            </div>

            {/* EDIT MODAL */}
            {profile && (
                <EditProfileModal 
                    isOpen={isEditOpen} 
                    onClose={() => setIsEditOpen(false)} 
                    currentData={profile} 
                />
            )}
        </div>
    );
}