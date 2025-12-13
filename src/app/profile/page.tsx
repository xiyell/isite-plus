'use client';

import { useEffect, useState, useCallback, useMemo } from "react";
// --- Firebase Imports ---
import { auth, db } from "@/services/firebase"; 
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, getDocs, collection, query, where, DocumentReference, Timestamp, setDoc } from 'firebase/firestore'; 
// --- UI Imports ---
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Separator } from "@/components/ui/separator";
import { CalendarIcon, MessageCircle, ThumbsUp, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";


// ====================================================================
// --- 1. TYPE DEFINITIONS & UTILITIES ---
// ====================================================================

type ThemeColor = "cyan" | "purple" | "green";
type YearLevelOption = '1st Year' | '2nd Year' | '3rd Year' | '4th Year';
type SectionOption = '1' | '2' | '3' | '4'; // Allow dynamic sections

interface UserProfile {
    username: string;
    bio: string;
    yearLevel: YearLevelOption | string;
    section: SectionOption;
    theme: ThemeColor;
    showOnlineStatus: boolean;
}

interface FirestoreProfile {
    bio?: string;
    createdAt?: Timestamp;
    email: string;
    name: string;
    photoURL?: string;
    role?: string;
    section?: string;
    studentId?: string;
    uid: string;
    yearLevel?: string;
    wallpaper?: string;
    karma?: number; 
    theme?: string;
    showOnlineStatus?: boolean;
}

interface PostData {
    id: string;
    title: string;
    description: string;
    likesCount: number;
    dislikesCount: number;
    createdAt: Timestamp; 
}

interface CommentData {
    id: string;
    text: string;
    createdAt: Timestamp;
}


const THEME_STYLES: Record<ThemeColor, { bg: string, shadow: string, switch: string }> = {
    cyan: { bg: "bg-cyan-500", shadow: "shadow-cyan-500/30", switch: "data-[state=checked]:bg-cyan-500" },
    purple: { bg: "bg-purple-500", shadow: "shadow-purple-500/30", switch: "data-[state=checked]:bg-purple-500" },
    green: { bg: "bg-green-500", shadow: "shadow-green-500/30", switch: "data-[state=checked]:bg-green-500" },
};

// ====================================================================
// --- 2. REUSABLE COMPONENTS (For Customizer) ---
// ====================================================================

const SectionSelector = ({ value, onChange, activeTheme }: { value: SectionOption, onChange: (v: SectionOption) => void, activeTheme: ThemeColor }) => {
    const defaultSections: SectionOption[] = ["1", "2", "3", "4"];
    // Ensure the current value is in the list if it's new
    const sections = Array.from(new Set([...defaultSections, value])).filter(Boolean);
    const themeStyles = THEME_STYLES[activeTheme];

    return (
        <div className="flex space-x-2 mt-1 p-1 rounded-xl bg-white/5 border border-white/10">
            {sections.map((sec) => (
                <button
                    key={sec}
                    onClick={() => onChange(sec)}
                    className={`
                        flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200
                        ${value === sec
                            ? `${themeStyles.bg} text-white ${themeStyles.shadow}`
                            : "bg-transparent text-gray-300 hover:bg-white/10"
                        }
                    `}
                >
                    {sec}
                </button>
            ))}
        </div>
    );
};

const GlassCard = ({ children }: { children: React.ReactNode }) => (
    <Card className="bg-white/5 border border-white/10 backdrop-blur-md shadow-lg shadow-black/30 rounded-xl">
        {children}
    </Card>
);

// ====================================================================
// --- 3. CUSTOMIZE PROFILE COMPONENT (WITH FIREBASE SAVE) ---
// ====================================================================

function CustomizeProfile({ initialData, onClose }: { initialData: FirestoreProfile | null, onClose: () => void }) {
    const uid = auth.currentUser?.uid; 

    const initialProfile: UserProfile = useMemo(() => ({
        username: initialData?.name || "New User",
        bio: initialData?.bio || "Set your bio here.",
        yearLevel: initialData?.yearLevel || "4th Year",
        section: initialData?.section || "1",
        theme: (initialData?.theme as ThemeColor) || "cyan",
        showOnlineStatus: initialData?.showOnlineStatus ?? true,
    }), [initialData]);

    const [profile, setProfile] = useState<UserProfile>(initialProfile);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
    const activeThemeStyles = THEME_STYLES[profile.theme];


    useEffect(() => {
        setProfile(initialProfile);
    }, [initialProfile]);

    const handleChange = (field: keyof UserProfile, value: UserProfile[keyof UserProfile]) => {
        setProfile(prev => ({ ...prev, [field]: value }));
        if (saveStatus !== "idle") setSaveStatus("idle");
    };

    const handleSave = async () => {
        if (!uid) {
            setSaveStatus("error");
            console.error("UID missing. User must be logged in.");
            return;
        }

        setIsSaving(true);
        setSaveStatus("idle");

        try {
            const userRef = doc(db, "users", uid);
            
            // Prepare data for Firestore update
            const dataToSave = {
                name: profile.username, // Using 'name' for username in Firestore
                bio: profile.bio,
                yearLevel: profile.yearLevel,
                section: profile.section,
                theme: profile.theme,
                showOnlineStatus: profile.showOnlineStatus,
                updatedAt: Timestamp.now(),
            };

            await setDoc(userRef, dataToSave, { merge: true }); 

            setIsSaving(false);
            setSaveStatus("success");

            // Manually update the parent component's data or rely on a global listener
            // For simplicity here, we rely on the main profile component refreshing.
            
            setTimeout(() => {
                setSaveStatus("idle");
                onClose(); // Close the modal upon successful save
            }, 1000);
            
        } catch (error) {
            console.error("Save failed:", error);
            setIsSaving(false);
            setSaveStatus("error");
            setTimeout(() => setSaveStatus("idle"), 3000);
        }
    };

    const getButtonText = () => {
        if (isSaving) return "Saving...";
        if (saveStatus === "success") return "Saved! ✅";
        if (saveStatus === "error") return "Save Failed ❌";
        return "Save Changes";
    };

    return (
        <div className="p-4 space-y-8 max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-6">Profile Customization ✨</h2>

            {/* General Info */}
            <GlassCard>
                <CardHeader>
                    <CardTitle className="text-white">General Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label className="text-sm text-gray-300">Display Name</Label>
                        <Input
                            className="bg-white/10 border-white/20 text-white mt-1"
                            value={profile.username}
                            onChange={(e) => handleChange("username", e.target.value)}
                        />
                    </div>
                    <div>
                        <Label className="text-sm text-gray-300">Bio</Label>
                        <Textarea
                            className="bg-white/10 border-white/20 text-white mt-1"
                            rows={4}
                            value={profile.bio}
                            onChange={(e) => handleChange("bio", e.target.value)}
                        />
                    </div>
                </CardContent>
            </GlassCard>

            <Separator className="bg-white/10" />

            {/* ACADEMIC INFO */}
            <GlassCard>
                <CardHeader>
                    <CardTitle className="text-white">Academic Status</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label className="text-sm text-gray-300">Year Level</Label>
                        <Select value={profile.yearLevel} onValueChange={(v) => handleChange("yearLevel", v as YearLevelOption)}>
                            <SelectTrigger className="bg-white/10 border-white/20 text-white mt-1">
                                <SelectValue placeholder="Select Year Level" />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-800 border-gray-700 text-white">
                                <SelectItem value="1">1st Year</SelectItem>
                                <SelectItem value="2">2nd Year</SelectItem>
                                <SelectItem value="3">3rd Year</SelectItem>
                                <SelectItem value="4">4th Year</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label className="text-sm text-gray-300">Section</Label>
                        <SectionSelector
                            value={profile.section}
                            onChange={(v) => handleChange("section", v as SectionOption)}
                            activeTheme={profile.theme}
                        />
                    </div>
                </CardContent>
            </GlassCard>

            <Separator className="bg-white/10" />

            {/* APPEARANCE */}
            <GlassCard>
                <CardHeader>
                    <CardTitle className="text-white">Appearance & Privacy</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Theme Buttons */}
                    <div>
                        <Label className="text-sm text-gray-300">Accent Theme</Label>
                        <div className="flex space-x-4 mt-2">
                            {["cyan", "purple", "green"].map((color) => {
                                const styles = THEME_STYLES[color as ThemeColor];
                                return (
                                    <button
                                        key={color}
                                        onClick={() => handleChange("theme", color as UserProfile['theme'])}
                                        className={`w-10 h-10 rounded-full transition-all ${styles.bg} ${profile.theme === color
                                            ? "ring-4 ring-white/70"
                                            : "hover:opacity-70"
                                            }`}
                                    />
                                );
                            })}
                        </div>
                    </div>

                    <Separator className="bg-white/10" />

                    {/* Online Status */}
                    <div className="flex items-center justify-between">
                        <div>
                            <Label className="text-base text-gray-300">Show Online Status</Label>
                            <CardDescription className="text-xs text-gray-500">
                                Shows a green dot beside your name when active.
                            </CardDescription>
                        </div>
                        <Switch
                            checked={profile.showOnlineStatus}
                            onCheckedChange={(checked) => handleChange("showOnlineStatus", checked)}
                            className={activeThemeStyles.switch}
                        />
                    </div>
                </CardContent>
            </GlassCard>

            <Separator className="bg-white/10" />

            {/* SAVE BUTTON */}
            <div className="sticky bottom-0 bg-gray-900/70 p-4 rounded-t-xl backdrop-blur-sm -mx-4 sm:-mx-6 transition-all max-w-3xl mx-auto">
                <button
                    onClick={handleSave}
                    disabled={isSaving || saveStatus === "success"}
                    className={`w-full text-white py-2 px-4 rounded-lg font-medium transition-all duration-300
                        ${isSaving
                            ? "bg-gray-600 cursor-not-allowed"
                            : saveStatus === "success"
                                ? "bg-green-600"
                                : saveStatus === "error"
                                    ? "bg-red-600"
                                    : `${activeThemeStyles.bg} shadow-lg ${activeThemeStyles.shadow} hover:brightness-110` 
                        }`}
                >
                    {getButtonText()}
                </button>
            </div>
        </div>
    );
}

// ====================================================================
// --- 4. MAIN PROFILE PAGE (FETCHER & RENDERER) ---
// ====================================================================

// --- Placeholder/UI Components (Unchanged from original structure) ---
const PostItemDisplay = ({ title, karma, date }: { title: string, karma: number, date: string }) => (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-3 border-b border-white/10 last:border-b-0">
        <div className="mb-2 sm:mb-0">
            <h3 className="text-lg font-medium text-white hover:text-cyan-400 cursor-pointer">{title}</h3>
            <p className="text-sm text-gray-400">Submitted on {date}</p>
        </div>
        <p className="text-base font-bold text-green-400">{karma} Points</p>
    </div>
);

const CommentsContentDisplay = ({ comments }: { comments: CommentData[] }) => (
    <div className="space-y-4">
        {comments.length > 0 ? (
            comments.map((comment) => (
                <div key={comment.id} className="text-gray-300 border-l-4 border-white/50 pl-4 py-2 bg-white/5 rounded-r-md">
                    &quot;{comment.text}&quot;
                    <span className="block text-xs text-gray-500 mt-1">— {comment.createdAt?.toDate ? comment.createdAt.toDate().toLocaleString() : 'N/A'}</span>
                </div>
            ))
        ) : (
            <p className="text-gray-400 py-4">No recent comments found.</p>
        )}
    </div>
);


export default function StudentProfilePage() {
    const [customizeOpen, setCustomizeOpen] = useState(false);
    const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
    const [profileData, setProfileData] = useState<FirestoreProfile | null>(null);
    const [postsData, setPostsData] = useState<PostData[]>([]);
    const [commentsData, setCommentsData] = useState<CommentData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Helper functions (defined in section 1 of the file)
    const getAvatarUrl = useCallback((userData: any) => {
        const baseName = userData?.name?.replace(/\s+/g, "") || "User";
        const defaultAvatar = `https://eu.ui-avatars.com/api/?name=${encodeURIComponent(baseName)}&size=250`;
        return userData?.photoURL?.trim() || defaultAvatar;
    }, []);

    // 1. Core Data Fetching Function (Refreshes everything)
    const fetchProfileAndActivity = useCallback(async (uid: string) => {
        setLoading(true);
        setError(null);
        try {
            const userRef = doc(db, "users", uid);
            
            // --- Fetch Profile ---
            const profileSnap = await getDoc(userRef);
            if (!profileSnap.exists()) {
                // If profile doesn't exist, create a basic one (optional, but robust)
                // Skip for this implementation to keep it clean, but handle error.
                throw new Error("Profile document not found.");
            }
            const profile = { id: profileSnap.id, ...profileSnap.data() } as FirestoreProfile;
            setProfileData(profile);

            // --- Fetch Activity ---
            const userDocRef: DocumentReference = userRef; 
            const q = query(collection(db, "community"), where("postedBy", "==", userDocRef));
            const activitySnapshot = await getDocs(q);
            
            let fetchedPosts: PostData[] = [];
            let fetchedComments: CommentData[] = [];

            activitySnapshot.docs.forEach(doc => {
                const data = { id: doc.id, ...doc.data() };
                
                if (data.title) { 
                    fetchedPosts.push(data as PostData);
                } else if (data.text) { 
                    fetchedComments.push(data as CommentData);
                }
            });

            setPostsData(fetchedPosts);
            setCommentsData(fetchedComments);
            
        } catch (err: any) {
            console.error("Error fetching profile data:", err);
            setError(err.message || "Failed to load profile data.");
        } finally {
            setLoading(false);
        }
    }, []);

    // 2. Authentication Handler
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setFirebaseUser(user);
            if (user) {
                // Fetch data when authenticated
                fetchProfileAndActivity(user.uid);
            } else {
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, [fetchProfileAndActivity]);

    // 3. Close on Escape (Unchanged)
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setCustomizeOpen(false);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    // 4. Data Mapping for UI
    const studentData = useMemo(() => {
        const profile = profileData || {} as FirestoreProfile;
        const userName = profile.name || profile.email?.split('@')[0] || "Anonymous";
        
        return {
            studentId: profile.studentId || "N/A",
            yearLevel: profile.yearLevel || "N/A",
            section: profile.section || "N/A",
            karma: profile.karma || 0, 
            posts: postsData.length,
            comments: commentsData.length,
            username: userName,
            bio: profile.bio || "No bio yet.",
            photoURL: getAvatarUrl(profile),
            role: profile.role || 'User',
        };
    }, [profileData, postsData, commentsData, getAvatarUrl]);

    const handleCloseCustomize = () => {
        setCustomizeOpen(false);
        // Refresh data immediately after closing customization modal to see changes
        if (firebaseUser?.uid) {
            fetchProfileAndActivity(firebaseUser.uid);
        }
    };


    // --- Loading & Error State Rendering ---
    if (loading) {
        return (
            <div className="min-h-screen p-8 flex items-center justify-center text-white">
                <Loader2 className="h-6 w-6 mr-2 animate-spin text-cyan-400" /> Loading profile...
            </div>
        );
    }
    
    if (!firebaseUser) {
        return (
            <div className="min-h-screen p-8 flex items-center justify-center text-white">
                <p className="text-lg text-red-400">Please log in to view your profile.</p>
            </div>
        );
    }

    if (error) {
         return (
            <div className="min-h-screen p-8 flex items-center justify-center text-white">
                <p className="text-lg text-red-400">Error: {error}</p>
            </div>
        );
    }

    // --- Main Render ---
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
                            <AvatarImage src={studentData.photoURL} alt={`@${studentData.username}`} />
                            <AvatarFallback>{studentData.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        {/* Status dot is just decorative placeholder */}
                        <span className="absolute bottom-1 right-1 block h-4 w-4 rounded-full ring-2 ring-gray-900 bg-green-500"></span>
                    </div>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                        <h1 className="text-3xl sm:text-4xl font-extrabold truncate">
                            {studentData.username}
                        </h1>
                        <p className="text-md sm:text-lg text-gray-300 mt-1 line-clamp-2">
                            {studentData.bio}
                        </p>

                        <div className="flex flex-wrap gap-2 mt-3">
                            <Badge className="bg-cyan-500/30 text-cyan-200 border-cyan-500/50">
                                🎓 {studentData.role || 'Student'}
                            </Badge>
                            {studentData.studentId !== "N/A" && <Badge className="bg-amber-500/30 text-amber-200 border-amber-500/50">Verified</Badge>}
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
                        <TabsTrigger value="posts" className="data-[state=active]:bg-cyan-500/20 text-white/80">Posts ({studentData.posts})</TabsTrigger>
                        <TabsTrigger value="comments" className="data-[state=active]:bg-cyan-500/20 text-white/80">Comments ({studentData.comments})</TabsTrigger>
                    </TabsList>

                    <TabsContent value="posts" className="mt-6">
                        <Card className="bg-white/5 border-white/10 p-4">
                            <CardTitle className="text-2xl mb-4 text-white">Recent Submissions</CardTitle>
                            <div className="divide-y divide-white/10">
                                {postsData.length > 0 ? (
                                    postsData.map((post) => (
                                        <PostItemDisplay key={post.id} title={post.title} karma={0} date={post.createdAt?.toDate ? post.createdAt.toDate().toLocaleDateString() : 'N/A'} />
                                    ))
                                ) : (
                                    <p className="text-gray-400 py-4">No recent posts found.</p>
                                )}
                            </div>
                        </Card>
                    </TabsContent>

                    <TabsContent value="comments" className="mt-6">
                        <Card className="bg-white/5 border-white/10 p-4">
                            <CardTitle className="text-2xl mb-4 text-white">Recent Comments</CardTitle>
                            <CommentsContentDisplay comments={commentsData} />
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
                                        onClick={handleCloseCustomize}
                                    >
                                        Close
                                    </Button>
                                </div>
                            </div>

                            {/* Modal content: scrollable */}
                            <div className="p-4 md:p-6 overflow-y-auto" style={{ maxHeight: "calc(90vh - 88px)" }}>
                                {/* Pass fetched profile data and the close handler */}
                                <CustomizeProfile initialData={profileData} onClose={handleCloseCustomize} />
                            </div>
                        </div>
                    </div>

                    {/* small inline animation style */}
                    <style jsx global>{`
                        @keyframes fadeInScale {
                          from { opacity: 0; transform: translateY(6px) scale(.98); }
                          to   { opacity: 1; transform: translateY(0) scale(1); }
                        }
                    `}</style>
                </div>
            )}
        </div>
    );
}