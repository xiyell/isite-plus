'use client';

// ... (existing imports - no changes needed here)
import { useState, useEffect, useCallback } from "react";
import { signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { db, auth, analyticsPromise } from "@/services/firebase";
import { UserManagementContent } from "@/components/dashboard/userManagement";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

import ActivityLogsContent from "@/components/dashboard/activityLogs";
import AttendanceContent from "@/components/dashboard/attendance";
import IBotContent from "@/components/dashboard/ibot";

import TrashbinContent, { TrashedItem } from "@/components/dashboard/trashbin";



// --- Firebase (User Management specific imports) ---
import {
	collection,
	onSnapshot,
	doc,
	updateDoc,
	deleteDoc,
	serverTimestamp,
} from "firebase/firestore";

// --- Third-Party Imports ---
import { motion, AnimatePresence } from "framer-motion";
import {
	Upload, Bell, Send, Facebook, Instagram, Twitter,
	XCircle, AlertTriangle, Users, Activity, Calendar, CheckCircle, Bot,
	ChevronDown, ChevronUp, Edit, Trash2, MessageSquare, Recycle, KeyRound, UserPlus
} from "lucide-react";
import {
	LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
	BarChart, Bar, PieChart, Pie, Cell, Legend
} from "recharts";
import AdminPostModerationPage from "@/components/dashboard/pendingpost";
import { createAnnouncement } from "@/actions/announcements";
import OverviewContent from "@/components/dashboard/overview";
import { addLog } from "@/actions/logs";
import { moveUserToRecycleBin, updateUserPassword } from "@/actions/userManagement";


// --- Types & Helper Components (RETAINED) ---
type SeverityLevel = "low" | "medium" | "high";
const severityColor: Record<SeverityLevel, string> = {
	low: "text-green-400 bg-green-400/10 border-green-400/20",
	medium: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
	high: "text-red-400 bg-red-400/10 border-red-400/20",
};

type LogEntry = { id: string; category: "posts" | "users" | "system"; action: string; severity: SeverityLevel; message: string; time: string; timestamp: number; };
type Announcement = { id?: string; title: string; description: string; image: string | null; platforms?: { websitePost: boolean; facebook: boolean; instagram: boolean; twitter: boolean; }; createdAt?: string; updatedAt?: string; };
interface UserData { id: string; name: string; email: string; role: 'admin' | 'moderator' | 'user'; status: string; lastLogin: string; active: boolean; }

const MessageBar = ({ message, type }: { message: string, type: 'success' | 'error' | 'warning' }) => {
	let variant: 'default' | 'destructive' = 'default';
	let icon = <AlertTriangle size={20} />;

	switch (type) {
		case 'success': variant = 'default'; icon = <CheckCircle size={20} className="text-green-400" />; break;
		case 'error': variant = 'destructive'; icon = <XCircle size={20} className="text-red-400" />; break;
		default: icon = <AlertTriangle size={20} className="text-yellow-400" />; break;
	}

	return (
		<motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
			<Alert
				variant={variant}
				className={`p-4 rounded-xl border border-white/20 bg-white/5 shadow-lg ${type === 'success' && 'border-green-400/50 bg-green-600/20'} ${type === 'error' && 'border-red-400/50 bg-red-600/20'} ${type === 'warning' && 'border-yellow-400/50 bg-yellow-600/20'}`}
			>
				{icon}
				<AlertTitle className={`font-medium ${type === 'success' ? 'text-green-400' : type === 'error' ? 'text-red-400' : 'text-yellow-400'}`}>
					{message}
				</AlertTitle>
			</Alert>
		</motion.div>
	);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SidebarButton = ({ children, className, disabled, onPress, icon: Icon, isActive, ...props }: any) => (
	<Button
		variant={isActive ? "secondary" : "ghost"}
		onClick={onPress} disabled={disabled}
		className={`w-full justify-start transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${isActive
			? "bg-white/10 text-gray-100 shadow-md shadow-black/20 hover:bg-white/15"
			: "bg-transparent hover:bg-white/5 text-gray-300"
			} ${className}`}
		{...props}
	>
		{Icon && <Icon size={20} className="mr-3" />}
		{children}
	</Button>
);
// --- End Helper Components ---


// --- Dev Dashboard Component ---
export default function DevDashboard() {
	const [activeTab, setActiveTab] = useState("overview");
	const [filter, setFilter] = useState("all");
	const [sortOrder, setSortOrder] = useState("newest");
	// State for the mobile dropdown menu
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const [messageState, setMessageState] = useState<{ message: string, type: 'success' | 'error' | 'warning' } | null>(null);

	const [logs, setLogs] = useState<LogEntry[]>([]);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const [announcements, setAnnouncements] = useState<Announcement[]>([]);

	// --- User Management State ---
	const [users, setUsers] = useState<UserData[]>([]);
	const [editingUser, setEditingUser] = useState<UserData | null>(null);
	const [passwordTarget, setPasswordTarget] = useState<UserData | null>(null);
	const [search, setSearch] = useState("");
	// -----------------------------

	const [authReady, setAuthReady] = useState(false);
	const [announcement, setAnnouncement] = useState<Announcement>({
		title: "", description: "", image: null,
		platforms: { websitePost: false, facebook: false, instagram: false, twitter: false },
	});
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const [pendingPosts, setPendingPosts] = useState<any[]>([]);

	const [trashItems, setTrashItems] = useState<TrashedItem[]>([
		{ id: 't001', type: 'post', title: 'Controversial Post about AI', deletedBy: 'Admin Beta', deletedAt: '2025-12-05 10:00', },
		{ id: 't002', type: 'announcement', title: 'Old System Downtime Notice', deletedBy: 'Super Admin', deletedAt: '2025-12-04 15:30', },
		{ id: 't003', type: 'user', title: 'Inactive User (user@example.com)', deletedBy: 'Mod Alpha', deletedAt: '2025-12-03 08:15', },
	]);

	const allTabs = [
		{ id: "overview", name: "Overview", icon: Activity },
		{ id: "activity", name: "Activity Logs", icon: AlertTriangle },
		{ id: "attendance", name: "Attendance", icon: Calendar },
		{ id: "announcement", name: "Announcement", icon: Send },
		{ id: "usersManagement", name: "Users", icon: Users },
		{ id: "pendings", name: "Pending Posts", icon: Upload },
		{ id: "ibot", name: "iBot", icon: Bot },
		{ id: "trash", name: "Trash Bin", icon: Recycle },
	];

	const postData = [
		{ month: "May", posts: 120, platform: 'Website' }, { month: "Jun", posts: 200, platform: 'Facebook' }, { month: "Jul", posts: 310, platform: 'Instagram' },
		{ month: "Aug", posts: 420, platform: 'Website' }, { month: "Sep", posts: 580, platform: 'Facebook' }, { month: "Oct", posts: 770, platform: 'Twitter' },
	];

	// Aggregated Data for Pie Chart
	const platformData = [
		{ name: 'Website', value: 540, color: '#8b5cf6' }, // Purple
		{ name: 'Facebook', value: 780, color: '#3b82f6' }, // Blue
		{ name: 'Instagram', value: 310, color: '#ec4899' }, // Pink
		{ name: 'Twitter', value: 770, color: '#06b6d4' }, // Cyan
	];

	// ----------------------------------------------------------------------------------
	//  DATA & AUTH HANDLERS (Simplified for integration)
	// ----------------------------------------------------------------------------------

	useEffect(() => { /* Auth Logic */ }, []);
	useEffect(() => {
		fetch("/api/logs").then(res => res.json()).then(setLogs).catch(console.error);
		const unsub = onSnapshot(collection(db, "users"), (snapshot) => {
			const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as UserData[];
			setUsers(data);
		});
		return () => unsub();
	}, []);
	const fetchAnnouncements = () => fetch("/api/announcements").then(r => r.json()).then(setAnnouncements).catch(console.error);
	useEffect(() => { fetchAnnouncements(); }, []);
	useEffect(() => { fetch("/api/community?status=pending").then(res => res.json()).then(setPendingPosts).catch(console.error); }, []);

	// --- Announcement ---
	const handlePostAnnouncement = async () => {
		if (!announcement.title || !announcement.description) {
			setMessageState({ message: "Title and Content are required.", type: 'warning' });
			return;
		}

		try {
			setMessageState({ message: "Posting announcement...", type: 'warning' });

			// Prepare data for server action
			const dataToPost = {
				title: announcement.title,
				description: announcement.description,
				platforms: announcement.platforms,
				image: announcement.image || "",
				updatedAt: new Date().toISOString(),
			};

			await createAnnouncement(dataToPost);

			// Reset form and display success
			setAnnouncement({
				title: "", description: "", image: "",
				platforms: { websitePost: false, facebook: false, instagram: false, twitter: false },
			});
			fetchAnnouncements(); // Refresh the list of announcements
			setMessageState({ message: "Announcement posted successfully!", type: 'success' });

		} catch (error) {
			console.error("Error posting announcement:", error);
			setMessageState({ message: "Failed to post announcement.", type: 'error' });
		}
	};

	// --- Trash Bin Handlers ---
	const handleRestore = async (id: string, type: string) => {
		setTrashItems(prev => prev.filter(item => item.id !== id));
		setMessageState({ message: `${type} restored successfully`, type: 'success' });
	};
	const handlePermanentDelete = async (id: string, type: string) => {
		setTrashItems(prev => prev.filter(item => item.id !== id));
		setMessageState({ message: `${type} permanently deleted`, type: 'error' });
	};


	const handleEditUser = (user: UserData) => setEditingUser(user);
	const handleSaveUser = async (updatedData: UserData) => {
		if (!updatedData || !updatedData.id) {
			setMessageState({ message: "Error: Invalid user data or missing ID.", type: "error" });
			return;
		}

		try {
			// Reference the Firestore document
			const userRef = doc(db, "users", updatedData.id);

			// Execute the update
			await updateDoc(userRef, {
				// IMPORTANT: Only update the fields that can be modified via the UI
				name: updatedData.name,
				email: updatedData.email,
				role: updatedData.role,
			});

			// If the update succeeds:
			setMessageState({ message: `${updatedData.name}'s details updated successfully.`, type: "success" });
			setEditingUser(null); // Close the modal upon success

			// Note: Since you use onSnapshot to fetch users, the table should update automatically
			// once Firestore confirms the write.

		} catch (error) {
			console.error("Error updating user:", error);
			setMessageState({ message: "Failed to update user. Check console for details.", type: "error" });
			// Do NOT close the modal on error, so the user can try again
		}
	};

	const handlePasswordChange = async (newPass: string, userId: string) => {
		updateUserPassword(userId, newPass, auth.currentUser?.uid || "system");
		console.log("Password change requested for", userId);
		setMessageState({ message: "Password update requires Admin API integration", type: "warning" });
	};

	const handleRoleChange = async (id: string, newRole: string) => {
		try {
			const userRef = doc(db, "users", id);
			await updateDoc(userRef, { role: newRole });
			setMessageState({ message: `Role for ${id} updated to ${newRole}`, type: "success" });
		} catch (error) {
			console.error("Error updating user role:", error);
			setMessageState({ message: "Failed to update user role", type: "error" });
		}
	};

	const handleDeleteUser = async (id: string, name: string) => {
		try {
			moveUserToRecycleBin(id, auth.currentUser?.uid || "system");
			setMessageState({ message: `User ${name} marked as deleted`, type: "success" });
		} catch (error) {
			console.error("Error deleting user:", error);
			setMessageState({ message: "Failed to delete user", type: "error" });
		}
	};
	const handleApprovePost = async (id: string) => { /* ... logic ... */ };
	const handleRejectPost = async (id: string) => { /* ... logic ... */ };

	const filteredLogs = logs.filter(log => filter === "all" || log.category === filter).sort((a, b) => sortOrder === "newest" ? b.timestamp - a.timestamp : a.timestamp - b.timestamp);
	const filteredUsers = users
		.filter(u => u.status !== 'deleted') // exclude deleted users
		.filter(u =>
			u.name.toLowerCase().includes(search.toLowerCase()) ||
			u.email.toLowerCase().includes(search.toLowerCase())
		);

	const activeTabInfo = allTabs.find(t => t.id === activeTab);
	const activeTabName = activeTabInfo?.name || "Dashboard Content";
	const ActiveTabIcon = activeTabInfo?.icon || Activity;

	const handleTabChange = (tabId: string) => { setActiveTab(tabId); setIsDropdownOpen(false); setMessageState(null); };

	// --- Inline Modals (RETAINED) ---
	const EditUserModal = () => {
		const user = editingUser;
		if (!user) return null;

		// FIX: Use a local state for the form data, initialized with the editingUser
		const [formData, setFormData] = useState(user);

		// Reset local state if editingUser changes (e.g., if we open a different user)
		useEffect(() => {
			setFormData(user);
		}, [user]);

		// Helper function to handle input changes locally
		const handleChange = (field: keyof UserData, value: string | 'admin' | 'moderator' | 'user') => {
			setFormData(prev => ({ ...prev, [field]: value }));
		};

		const handleFormSubmit = (e: React.FormEvent) => {
			e.preventDefault();
			// Call the parent save handler with the locally modified data
			handleSaveUser(formData);
		};

		// Ensure data integrity before rendering
		const currentSelectedUser = formData;

		return (
			<Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
				{/* STYLING REVERTED: Using general dark glassy styles */}
				<DialogContent className="pt-4 bg-black/80 backdrop-blur-xl border border-white/20 text-white w-11/12 max-w-md p-6">
					<DialogHeader>
						<DialogTitle className="text-xl font-semibold text-gray-200">
							✏️ Edit User — {currentSelectedUser.name}
						</DialogTitle>
						<DialogDescription className="text-gray-400">
							Update the user&apos;s basic information and role.
						</DialogDescription>
					</DialogHeader>

					<form onSubmit={handleFormSubmit} className="space-y-4">

						<Label htmlFor="name" className="block text-sm text-gray-300 mb-1">Full Name</Label>
						<Input
							id="name"
							className="w-full bg-white/10 border border-white/20 focus-visible:ring-indigo-500 text-white placeholder-gray-400"
							value={currentSelectedUser.name}
							onChange={(e) => handleChange('name', e.target.value)}
						/>

						<Label htmlFor="email" className="block text-sm text-gray-300 mb-1">Email</Label>
						<Input
							id="email"
							className="w-full bg-white/10 border border-white/20 focus-visible:ring-indigo-500 text-white placeholder-gray-400"
							type="email"
							value={currentSelectedUser.email}
							onChange={(e) => handleChange('email', e.target.value)}
						/>

						<Label htmlFor="role" className="block text-sm text-gray-300 mb-1">Role</Label>
						<Select
							value={currentSelectedUser.role || "user"}
							onValueChange={(value: 'admin' | 'moderator' | 'user') => handleChange('role', value)}
						>
							<SelectTrigger className="w-full bg-white/10 border border-white/20 text-white focus-visible:ring-indigo-500">
								<SelectValue placeholder="Select Role" />
							</SelectTrigger>
							<SelectContent className="bg-gray-800 text-white border-gray-700">
								<SelectItem value="admin">Admin</SelectItem>
								<SelectItem value="moderator">Moderator</SelectItem>
								<SelectItem value="user">User</SelectItem>
							</SelectContent>
						</Select>

						<DialogFooter className="mt-6 flex justify-end gap-3">
							<Button
								variant="secondary"
								onClick={() => setEditingUser(null)}
								className="bg-gray-500/20 hover:bg-gray-500/30 text-gray-200"
								type="button"
							>
								Cancel
							</Button>
							<Button
								className="bg-indigo-600 hover:bg-indigo-700 text-white"
								type="submit"
							>
								Save Changes
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		);
	};

	const PasswordModal = () => {
		const [newPass, setNewPass] = useState('');
		const [confirmPass, setConfirmPass] = useState('');

		const handleSubmit = (e: React.FormEvent) => {
			e.preventDefault();
			if (!newPass || !confirmPass) {
				return setMessageState({ message: "⚠️ Fill in both fields", type: 'warning' });
			}
			if (newPass !== confirmPass) {
				return setMessageState({ message: "⚠️ Passwords do not match", type: 'warning' });
			}

			handlePasswordChange(newPass, passwordTarget!.id);
			setPasswordTarget(null);
			setNewPass('');
			setConfirmPass('');
		};

		return (
			<Dialog open={!!passwordTarget} onOpenChange={() => setPasswordTarget(null)}>
				<DialogContent className="pt-4 bg-black/80 backdrop-blur-xl border border-white/20 text-white w-11/12 max-w-md p-6">
					<DialogHeader>
						<DialogTitle className="text-xl font-semibold text-yellow-400">
							🔑 Change Password — {passwordTarget?.name}
						</DialogTitle>
						<DialogDescription className="text-gray-400">
							Warning: This action requires Firebase Admin SDK.
						</DialogDescription>
					</DialogHeader>

					<form onSubmit={handleSubmit} className="space-y-4">
						<Input
							className="w-full bg-white/10 border border-white/20 focus-visible:ring-purple-500 text-white"
							name="newPassword"
							placeholder="New password"
							type="password"
							value={newPass}
							onChange={(e) => setNewPass(e.target.value)}
						/>
						<Input
							className="w-full bg-white/10 border border-white/20 focus-visible:ring-purple-500 text-white"
							name="confirmPassword"
							placeholder="Confirm password"
							type="password"
							value={confirmPass}
							onChange={(e) => setConfirmPass(e.target.value)}
						/>
						<DialogFooter className="mt-6 flex justify-end gap-3">
							<Button
								variant="secondary"
								onClick={() => setPasswordTarget(null)}
								className="bg-gray-500/20 hover:bg-gray-500/30 text-gray-200"
								type="button"
							>
								Cancel
							</Button>
							<Button
								className="bg-purple-600 hover:bg-purple-700 text-white"
								type="submit"
							>
								Update Password
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		);
	};

	// --- JSX RENDER ---

	return (
		<div className="w-full min-h-screen text-white bg-transparent font-sans p-6 md:p-10">
			<motion.div animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto flex flex-col md:flex-row gap-8" initial={{ opacity: 0, y: 10 }} transition={{ duration: 0.4 }}>

				{/* 1. Sidebar (Desktop Only) */}
				<div className="pt-4 hidden md:block md:w-64 bg-white/5 backdrop-blur-xl border border-white/10 p-4 rounded-2xl h-fit shadow-lg shadow-black/20">
					<h2 className="text-2xl font-semibold mb-5 text-gray-200">Dev Control</h2>
					<div className="flex flex-col gap-2">{allTabs.map(tab => (
						<SidebarButton
							key={tab.id}
							isActive={activeTab === tab.id}
							onPress={() => handleTabChange(tab.id)}
							icon={tab.icon}
							className="capitalize font-medium tracking-wide"
						>
							{tab.name}
						</SidebarButton>
					))}</div>
				</div>

				{/* 2. Main Content Area */}
				<div className="flex-grow">
					<div className="mb-6 pb-2 border-b border-white/10 flex flex-col sm:flex-row sm:justify-between sm:items-center relative">
						<h1 className="text-4xl font-bold tracking-tight text-gray-100">{activeTabName}</h1>

						{/* Mobile Tab Dropdown FIX: Visible on small screens, hidden on md and up */}
						<div className="pt-4 block md:hidden mt-4 sm:mt-0">
							<Button
								variant="secondary"
								onClick={() => setIsDropdownOpen(!isDropdownOpen)}
								className="w-full justify-between bg-white/10 text-gray-100 border-white/20 hover:bg-white/15"
							>
								<ActiveTabIcon size={20} className="mr-2" />
								{activeTabName}
								{isDropdownOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
							</Button>

							{/* Mobile Dropdown Menu */}
							<AnimatePresence>
								{isDropdownOpen && (
									<motion.div
										initial={{ opacity: 0, height: 0 }}
										animate={{ opacity: 1, height: "auto" }}
										exit={{ opacity: 0, height: 0 }}
										transition={{ duration: 0.3 }}
										className=" pt-4 absolute z-10 w-full mt-2 bg-black/80 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl overflow-hidden"
									>
										<div className="flex flex-col p-2 space-y-1">
											{allTabs.map(tab => (
												<SidebarButton
													key={`mobile-${tab.id}`}
													isActive={activeTab === tab.id}
													onPress={() => handleTabChange(tab.id)}
													icon={tab.icon}
													className="capitalize font-medium tracking-wide !w-full"
												>
													{tab.name}
												</SidebarButton>
											))}
										</div>
									</motion.div>
								)}
							</AnimatePresence>
						</div>
						{/* END Mobile Tab Dropdown */}

					</div>

					{/* Global Message (Toast) */}
					<AnimatePresence>{messageState && <div className="mb-6"><MessageBar message={messageState.message} type={messageState.type} /></div>}</AnimatePresence>

					{/* Active Tab Content (RETAINED) */}
					<AnimatePresence mode="wait">

						{/* 1. Overview */}
						{activeTab === "overview" && (
							<OverviewContent />
						)}

						{/* 2. Activity Logs */}
						{activeTab === "activity" && (
							<motion.div key="activity" animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
								<ActivityLogsContent />
							</motion.div>
						)}

						{/* 3. Attendance */}
						{activeTab === "attendance" && (
							<motion.div key="attendance" animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
								<AttendanceContent />
							</motion.div>
						)}

						{/* 4. Announcement */}
						{activeTab === "announcement" && (
							<motion.div key="announcement" animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
								<Card className="pt-4 bg-black/10 backdrop-blur-xl border border-white/10 shadow-lg">
									<CardHeader>
										<CardTitle className="text-white">Create New Announcement</CardTitle>
										<CardDescription className="text-gray-300">
											Post to the website and selected social media platforms simultaneously.
										</CardDescription>
									</CardHeader>
									<CardContent className="space-y-6">

										<Label htmlFor="title" className="text-white font-semibold">Title</Label>
										<Input
											id="title" type="text" placeholder="E.g., System Update Next Week" value={announcement.title}
											onChange={e => setAnnouncement({ ...announcement, title: e.target.value })}
											className="bg-white/5 text-white border-white/20 placeholder:text-gray-500 focus-visible:ring-indigo-500 focus-visible:ring-2"
										/>

										<Label htmlFor="description" className="text-white font-semibold">Content</Label>
										<Textarea
											id="description" placeholder="Details about the announcement..." value={announcement.description}
											onChange={e => setAnnouncement({ ...announcement, description: e.target.value })}
											className="bg-white/5 text-white border-white/20 h-32 placeholder:text-gray-500 focus-visible:ring-indigo-500 focus-visible:ring-2"
										/>

										<div className="flex flex-col gap-2">
											<Label className="text-white font-semibold" htmlFor="imageUrl">Image URL (Optional)</Label>
											<Input
												id="imageUrl"
												type="text"
												placeholder="Enter image URL (e.g., https://example.com/image.jpg)"
												value={announcement.image || ''}
												onChange={e => setAnnouncement({ ...announcement, image: e.target.value })}
												className="bg-white/5 text-gray-300 border-white/20 placeholder:text-gray-500 focus-visible:ring-indigo-500 focus-visible:ring-2"
											/>
										</div>

										<div className="space-y-3">
											<Label className="pt-4 text-white font-semibold flex items-center gap-2">
												<Send size={18} className="text-indigo-400" /> Publish to:
											</Label>
											<div className="flex gap-6 flex-wrap">
												{Object.keys(announcement.platforms || {}).map(platform => (
													<div key={platform} className="flex items-center space-x-2">
														<Checkbox
															id={platform} checked={announcement.platforms ? announcement.platforms[platform as keyof typeof announcement.platforms] : false}
															onCheckedChange={checked => setAnnouncement({ ...announcement, platforms: { ...announcement.platforms!, [platform as keyof NonNullable<Announcement['platforms']>]: checked as boolean } })}
															className="border-white/50 data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500 text-white"
														/>
														<Label htmlFor={platform} className="text-gray-300 capitalize flex items-center gap-1 text-sm cursor-pointer">
															{platform === 'facebook' && <Facebook size={16} className="text-blue-400" />}
															{platform === 'instagram' && <Instagram size={16} className="text-pink-400" />}
															{platform === 'twitter' && <Twitter size={16} className="text-blue-300" />}
															{platform === 'websitePost' && <Send size={16} className="text-indigo-400" />}
															{platform.replace(/Post/g, '').replace(/website/g, 'Website')}
														</Label>
													</div>
												))}
											</div>
										</div>

										<Button onClick={handlePostAnnouncement} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold w-full sm:w-auto mt-4">
											<Send size={18} className="mr-2" /> Post Announcement
										</Button>
									</CardContent>
								</Card>
							</motion.div>
						)}



						{/* 6. Users */}
						{activeTab === "usersManagement" && (
							<motion.div key="users" animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
								<UserManagementContent
									users={filteredUsers}
									search={search}
									setSearch={setSearch}
									handleEditUser={handleEditUser}
									setPasswordTarget={setPasswordTarget}
									handleRoleChange={handleRoleChange}
									handleDeleteUser={handleDeleteUser}
								/>
							</motion.div>
						)}

						{/* 7. Trash Bin */}
						{activeTab === "trash" && (
							<motion.div key="trash" animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
								<TrashbinContent />
							</motion.div>
						)}

						{/* 8. Pending Posts */}
						{activeTab === "pendings" && (
							<motion.div key="pendings" animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
								<AdminPostModerationPage />
							</motion.div>
						)}

						{/* 9. iBot */}
						{activeTab === "ibot" && (
							<motion.div key="ibot" animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
								<IBotContent />
							</motion.div>
						)}

					</AnimatePresence>
				</div>
			</motion.div>

			{/* --- Modals (RETAINED) --- */}
			<EditUserModal />
			<PasswordModal />
		</div>
	);
}