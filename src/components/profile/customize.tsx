'use client';

import { useState } from "react";

// UI Components (Assuming these are available via your project configuration)
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

// ----------------------------
// TYPE DEFINITIONS
// ----------------------------
type ThemeColor = "cyan" | "purple" | "green";
type Section = "BSIT-4A" | "BSIT-4B" | "BSIT-4C";

interface UserProfile {
    username: string;
    bio: string;
    yearLevel: string;
    section: Section;
    theme: ThemeColor;
    showOnlineStatus: boolean;
}

const initialProfile: UserProfile = {
    username: "coder_glass_vibe",
    bio: "Building sleek UIs with React and a touch of Glassmorphism.",
    yearLevel: "4th Year",
    section: "BSIT-4A",
    theme: "cyan",
    showOnlineStatus: true,
};

// Map theme names to Tailwind utility classes for consistent styling
const THEME_STYLES: Record<ThemeColor, { bg: string, shadow: string, switch: string }> = {
    cyan: { bg: "bg-cyan-500", shadow: "shadow-cyan-500/30", switch: "data-[state=checked]:bg-cyan-500" },
    purple: { bg: "bg-purple-500", shadow: "shadow-purple-500/30", switch: "data-[state=checked]:bg-purple-500" },
    green: { bg: "bg-green-500", shadow: "shadow-green-500/30", switch: "data-[state=checked]:bg-green-500" },
};

// ----------------------------
// REUSABLE COMPONENTS
// ----------------------------

// Enhanced Section Selector (using dynamic theme color)
const SectionSelector = ({ value, onChange, activeTheme }: { value: Section, onChange: (v: Section) => void, activeTheme: ThemeColor }) => {
    const sections: Section[] = ["BSIT-4A", "BSIT-4B", "BSIT-4C"];
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

// ----------------------------
// PROFILE CUSTOMIZER
// ----------------------------
function CustomizeProfile() {
    const [profile, setProfile] = useState<UserProfile>(initialProfile);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
    const activeThemeStyles = THEME_STYLES[profile.theme];

    const handleChange = (field: keyof UserProfile, value: any) => {
        setProfile(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        setIsSaving(true);
        setSaveStatus("idle");

        setTimeout(() => {
            console.log("Profile saved:", profile);
            setIsSaving(false);
            setSaveStatus("success");

            setTimeout(() => setSaveStatus("idle"), 3000);
        }, 1500);
    };

    const getButtonText = () => {
        if (isSaving) return "Saving...";
        if (saveStatus === "success") return "Saved! ✅";
        return "Save Changes";
    };

    // Card wrapper for enhanced Glassmorphism
    const GlassCard = ({ children }: { children: React.ReactNode }) => (
        <Card className="bg-white/5 border border-white/10 backdrop-blur-md shadow-lg shadow-black/30 rounded-xl">
            {children}
        </Card>
    );

    return (
        // Changed padding from p-4 sm:p-6 to a consistent p-4
        <div className="p-4 space-y-8 max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-6">Profile Customization ✨</h2>

            {/* GENERAL INFO */}
            <GlassCard>
                <CardHeader>
                    <CardTitle className="text-white">General Information</CardTitle>
                    <CardDescription className="text-gray-400">
                        Edit your public display name and biography.
                    </CardDescription>
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
                    <CardDescription className="text-gray-400">
                        Update your year level & section.
                    </CardDescription>
                </CardHeader>

                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label className="text-sm text-gray-300">Year Level</Label>
                        <Select value={profile.yearLevel} onValueChange={(v) => handleChange("yearLevel", v)}>
                            <SelectTrigger className="bg-white/10 border-white/20 text-white mt-1">
                                <SelectValue placeholder="Select Year Level" />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-800 border-gray-700 text-white">
                                <SelectItem value="1st Year">1st Year</SelectItem>
                                <SelectItem value="2nd Year">2nd Year</SelectItem>
                                <SelectItem value="3rd Year">3rd Year</SelectItem>
                                <SelectItem value="4th Year">4th Year</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label className="text-sm text-gray-300">Section</Label>
                        <SectionSelector
                            value={profile.section}
                            onChange={(v) => handleChange("section", v)}
                            activeTheme={profile.theme} // Pass theme for dynamic coloring
                        />
                    </div>
                </CardContent>
            </GlassCard>

            <Separator className="bg-white/10" />

            {/* APPEARANCE */}
            <GlassCard>
                <CardHeader>
                    <CardTitle className="text-white">Appearance & Privacy</CardTitle>
                    <CardDescription className="text-gray-400">Theme & visibility options</CardDescription>
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

                        {/* Dynamically styled switch */}
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
            {/* Note: sticky footer padding remains, but the content is offset */}
            <div className="sticky bottom-0 bg-gray-900/70 p-4 rounded-t-xl backdrop-blur-sm -mx-4 sm:-mx-6 transition-all max-w-3xl mx-auto">
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className={`w-full text-white py-2 px-4 rounded-lg font-medium transition-all duration-300
                        ${isSaving
                            ? "bg-gray-600 cursor-not-allowed"
                            : saveStatus === "success"
                                ? "bg-green-600"
                                : `${activeThemeStyles.bg} shadow-lg ${activeThemeStyles.shadow} hover:brightness-110` // Dynamic theme color
                        }`}
                >
                    {getButtonText()}
                </button>
            </div>
        </div>
    );
}

// ----------------------------
// MAIN PAGE
// ----------------------------
export default function ProfilePage() {
    // Custom scrollbar style applied to the container
    return (
        // Adjusted padding to 'p-0' and added 'pt-[60px]' to offset a fixed navbar
        <div className="min-h-screen p-0 pt-[60px] max-h-screen overflow-y-auto" style={{
            /* Hide scrollbar for Chrome, Safari and Opera */
            msOverflowStyle: 'none',  /* IE and Edge */
            scrollbarWidth: 'none',   /* Firefox */
        }}>
            {/* Additional style to hide the scrollbar for webkit browsers (Chrome, Safari) */}
            <style jsx global>{`
                /* Ensure this selector matches the scrollable container */
                .max-h-screen::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
            <CustomizeProfile />
        </div>
    );
}