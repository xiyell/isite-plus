"use client";

import { useState, useEffect } from "react";
import { doc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "@/services/firebase";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Loader2, Palette, User, Shield, CheckCircle2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export type ThemeColor = "cyan" | "purple" | "green" | "orange" | "pink";
export type SectionOption = '1' | '2' | '3' | '4' | 'None';

export interface ProfileData {
    uid: string;
    name: string;
    bio: string;
    yearLevel: string;
    section: string;
    theme: ThemeColor;
    showOnlineStatus: boolean;
    photoURL: string;
    studentId?: string;
    role?: string;
}

const THEMES: Record<ThemeColor, { label: string; class: string; hex: string }> = {
    cyan: { label: "Cyan", class: "bg-cyan-500", hex: "#06b6d4" },
    purple: { label: "Purple", class: "bg-purple-500", hex: "#a855f7" },
    green: { label: "Green", class: "bg-green-500", hex: "#22c55e" },
    orange: { label: "Orange", class: "bg-orange-500", hex: "#f97316" },
    pink: { label: "Pink", class: "bg-pink-500", hex: "#ec4899" },
};

interface EditProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentData: ProfileData;
}

export function EditProfileModal({ isOpen, onClose, currentData }: EditProfileModalProps) {
    const [formData, setFormData] = useState<ProfileData>(currentData);
    const [isSaving, setIsSaving] = useState(false);

    // Sync state when opening with different data
    useEffect(() => {
        // Normalize data for the form (handle legacy formats)
        const normalizedData = { ...currentData };

        // Fix Section: "Section 1" -> "1"
        if (normalizedData.section && normalizedData.section.startsWith("Section ")) {
            normalizedData.section = normalizedData.section.replace("Section ", "");
        }
        // Fix Section: "N/A" or missing -> "None" (so it shows in Select if specific option exists, otherwise handle appropriately)
        // Note: Our select has "None" as an option.
        if (normalizedData.section === "N/A") {
             normalizedData.section = "None";
        }

        setFormData(normalizedData);
    }, [currentData, isOpen]);

    const handleChange = (field: keyof ProfileData, value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        if (!formData.name || formData.name.trim() === "") {
            toast({ title: "Error", description: "Display Name cannot be empty.", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        try {
            const userRef = doc(db, "users", formData.uid);
            
            await updateDoc(userRef, {
                name: formData.name,
                bio: formData.bio,
                yearLevel: formData.yearLevel,
                section: formData.section,
                theme: formData.theme,
                showOnlineStatus: formData.showOnlineStatus,
                photoURL: formData.photoURL,
                studentId: formData.studentId, // Allow updating student ID if needed, or remove this line
                updatedAt: Timestamp.now(),
            });

            toast({ title: "Success", description: "Profile updated successfully!", className: "bg-green-500/10 text-green-400 border-green-500/20" });
            onClose();
        } catch (error) {
            console.error("Failed to update profile", error);
            toast({ title: "Error", description: "Failed to save changes. Please try again.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[600px] bg-black/80 backdrop-blur-2xl border-white/10 text-white max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                        <User className="w-6 h-6 text-indigo-400" />
                        Edit Profile
                    </DialogTitle>
                    <DialogDescription className="text-gray-400">
                        Customize how you appear to others in the community.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* AVATAR & BASIC INFO */}
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                            <div className="relative group shrink-0 w-24 h-24 rounded-full overflow-hidden border-2 border-white/20 bg-white/5 mx-auto sm:mx-0">
                                <img 
                                    src={formData.photoURL || `https://ui-avatars.com/api/?name=${formData.name}`} 
                                    alt="Avatar" 
                                    onError={(e) => {
                                        e.currentTarget.src = `https://ui-avatars.com/api/?name=${formData.name}`;
                                    }}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="w-full space-y-2">
                                <Label htmlFor="photoURL" className="text-xs uppercase font-semibold text-gray-500/70">Profile Picture URL</Label>
                                <Input
                                    id="photoURL"
                                    value={formData.photoURL}
                                    onChange={(e) => handleChange("photoURL", e.target.value)}
                                    className="bg-white/5 border-white/10 focus-visible:ring-indigo-500"
                                    placeholder="https://i.imgur.com/..."
                                />
                                <p className="text-[10px] text-gray-400">
                                    Paste a direct link to your image (ending in .jpg, .png). <br/>
                                    You can upload images on <a href="https://imgur.com/upload" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">Imgur</a> or similar sites.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-xs uppercase font-semibold text-gray-500/70">
                                    Display Name
                                </Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => handleChange("name", e.target.value)}
                                    className="bg-white/5 border-white/10 focus-visible:ring-indigo-500"
                                    placeholder="Your Name"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="studentId" className="text-xs uppercase font-semibold text-gray-500/70">Student ID</Label>
                                <Input
                                    id="studentId"
                                    value={formData.studentId || ''}
                                    onChange={(e) => handleChange("studentId", e.target.value)}
                                    className="bg-white/5 border-white/10 focus-visible:ring-indigo-500 opacity-50 cursor-not-allowed"
                                    placeholder="N/A"
                                    disabled
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="bio" className="text-xs uppercase font-semibold text-gray-500/70">Bio</Label>
                            <Textarea
                                id="bio"
                                value={formData.bio}
                                onChange={(e) => handleChange("bio", e.target.value)}
                                className="bg-white/5 border-white/10 focus-visible:ring-indigo-500 min-h-[80px]"
                                placeholder="Tell us about yourself..."
                            />
                        </div>
                    </div>

                    <Separator className="bg-white/10" />

                    {/* ACADEMIC INFO */}
                    <div className="space-y-4">
                        <div className="mb-4">
                            <div className="flex items-center gap-2 mb-1">
                                <Shield className="w-4 h-4 text-emerald-400" />
                                <h4 className="text-sm font-bold text-gray-300">Academic Info</h4>
                            </div>
                            <p className="text-[10px] text-gray-500 italic">
                                Please ensure your Year Level and Section are updated every academic year.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs text-gray-500">Year Level</Label>
                                <Select value={formData.yearLevel} onValueChange={(val) => handleChange("yearLevel", val)}>
                                    <SelectTrigger className="bg-white/5 border-white/10">
                                        <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1st Year">1st Year</SelectItem>
                                        <SelectItem value="2nd Year">2nd Year</SelectItem>
                                        <SelectItem value="3rd Year">3rd Year</SelectItem>
                                        <SelectItem value="4th Year">4th Year</SelectItem>
                                        <SelectItem value="Alumni">Alumni</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs text-gray-500">Section</Label>
                                <Select value={formData.section} onValueChange={(val) => handleChange("section", val)}>
                                    <SelectTrigger className="bg-white/5 border-white/10">
                                        <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">Section 1</SelectItem>
                                        <SelectItem value="2">Section 2</SelectItem>
                                        <SelectItem value="3">Section 3</SelectItem>
                                        <SelectItem value="4">Section 4</SelectItem>
                                        <SelectItem value="None">None</SelectItem>
                                        <SelectItem value="Irregular">Irregular</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <Separator className="bg-white/10" />

                    {/* APPEARANCE */}
                    <div className="space-y-4">
                        
                        <div className="flex items-center justify-between">
                             <div className="flex items-center gap-2">
                                <Palette className="w-4 h-4 text-pink-400" />
                                <h4 className="text-sm font-bold text-gray-300">Appearance</h4>
                             </div>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-xs text-gray-500">Accent Theme</Label>
                            <div className="flex flex-wrap gap-3">
                                {Object.entries(THEMES).map(([key, { label, class: bgClass }]) => {
                                    const isSelected = formData.theme === key;
                                    return (
                                        <button
                                            key={key}
                                            onClick={() => handleChange("theme", key)}
                                            className={`
                                                relative w-10 h-10 rounded-full transition-all duration-300 
                                                ${bgClass} 
                                                ${isSelected ? "ring-2 ring-white ring-offset-2 ring-offset-black scale-110" : "hover:scale-105 opacity-70 hover:opacity-100"}
                                            `}
                                            title={label}
                                        >
                                            {isSelected && (
                                                <CheckCircle2 className="w-5 h-5 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 drop-shadow-md" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/5">
                            <div className="space-y-0.5">
                                <Label className="text-white">Show Online Status</Label>
                                <p className="text-xs text-gray-500">Others will see when you are active.</p>
                            </div>
                            <Switch
                                checked={formData.showOnlineStatus}
                                onCheckedChange={(checked) => handleChange("showOnlineStatus", checked)}
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={onClose} disabled={isSaving} className="hover:bg-white/10 text-gray-300">
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[100px]">
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
