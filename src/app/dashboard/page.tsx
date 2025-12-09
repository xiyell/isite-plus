'use client';

import { useState, useEffect, useCallback } from "react";
import { signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { db, auth, analyticsPromise } from "@/services/firebase";

// ----------------------------------------------------------------------------------
// ✅ SHADCN IMPORTS (ALL CORRECTED CASE)
// ----------------------------------------------------------------------------------
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
} from "@/components/ui/dialog"; // Added Dialog components for inline modals

// --- Imports for your dedicated components (ASSUMED PATHS) ---
import ActivityLogsContent from "@/components/dashboard/activityLogs";
import AttendanceContent from "@/components/dashboard/attendance";
import IBotContent from "@/components/dashboard/ibot";
import NotificationsContent from "@/components/dashboard/notifications";
import PendingPostsContent from "@/components/dashboard/pendingpost";
import TrashbinContent, { TrashedItem } from "@/components/dashboard/trashbin";
import users from "@/components/dashboard/userManagement";


// --- Firebase (User Management specific imports) ---
import {
	collection,
	onSnapshot,
	doc,
	updateDoc,
	deleteDoc,
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


// --- Types ---
type SeverityLevel = "low" | "medium" | "high";
const severityColor: Record<SeverityLevel, string> = {
	low: "text-green-400 bg-green-400/10 border-green-400/20",
	medium: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
	high: "text-red-400 bg-red-400/10 border-red-400/20",
};

type LogEntry = { id: string; category: "posts" | "users" | "system"; action: string; severity: SeverityLevel; message: string; time: string; timestamp: number; };
type Announcement = { id?: string; title: string; content: string; image: File | null; platforms?: { websitePost: boolean; facebook: boolean; instagram: boolean; twitter: boolean; }; createdAt?: string; };
interface UserData { id: string; name: string; email: string; role: 'admin' | 'moderator' | 'user'; status: string; lastLogin: string; active: boolean; }


// ----------------------------------------------------------------------------------
// Helper Components (RETAINED)
// ----------------------------------------------------------------------------------

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


// --- Dev Dashboard Component ---
export default function DevDashboard() {
	const [activeTab, setActiveTab] = useState("overview");
	const [filter, setFilter] = useState("all");
	const [sortOrder, setSortOrder] = useState("newest");
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const [messageState, setMessageState] = useState<{ message: string, type: 'success' | 'error' | 'warning' } | null>(null);

	const [logs, setLogs] = useState<LogEntry[]>([]);
	const [notifications, setNotifications] = useState<any[]>([]);
	const [announcements, setAnnouncements] = useState<Announcement[]>([]);

	// --- User Management State ---
	const [users, setUsers] = useState<UserData[]>([]);
	const [editingUser, setEditingUser] = useState<UserData | null>(null);
	const [passwordTarget, setPasswordTarget] = useState<UserData | null>(null);
	const [search, setSearch] = useState("");
	// -----------------------------

	const [authReady, setAuthReady] = useState(false);
	const [announcement, setAnnouncement] = useState<Announcement>({
		title: "", content: "", image: null,
		platforms: { websitePost: false, facebook: false, instagram: false, twitter: false },
	});
	const [pendingPosts, setPendingPosts] = useState<any[]>([]);

	const [trashItems, setTrashItems] = useState<TrashedItem[]>([
		{ id: 't001', type: 'post', title: 'Controversial Post about AI', deletedBy: 'Admin Beta', deletedAt: '2025-12-05 10:00', },
		{ id: 't002', type: 'announcement', title: 'Old System Downtime Notice', deletedBy: 'Super Admin', deletedAt: '2025-12-04 15:30', },
		{ id: 't003', type: 'user', title: 'Inactive User (user@example.com)', deletedBy: 'Mod Alpha', deletedAt: '2025-12-03 08:15', },
	]);

	const allTabs = [
		{ id: "overview", name: "Overview", icon: Activity },
		{ id: "notifications", name: "Notifications", icon: Bell },
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

	// ----------------------------------------------------------------------------------
	// 🔥 DATA & AUTH HANDLERS (Simplified for integration)
	// ----------------------------------------------------------------------------------

	useEffect(() => { /* Auth Logic */ }, []);
	useEffect(() => {
		fetch("/api/logs").then(res => res.json()).then(setLogs).catch(console.error);
		// 🔥 USER MANAGEMENT: Real-time Firestore listener for users
		const unsub = onSnapshot(collection(db, "users"), (snapshot) => {
			const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as UserData[];
			setUsers(data);
		});
		return () => unsub();
	}, []);
	useEffect(() => { fetch("/api/notifications").then(res => res.json()).then(setNotifications).catch(console.error); }, []);
	const fetchAnnouncements = () => fetch("/api/announcements").then(r => r.json()).then(setAnnouncements).catch(console.error);
	useEffect(() => { fetchAnnouncements(); }, []);
	useEffect(() => { fetch("/api/community?status=pending").then(res => res.json()).then(setPendingPosts).catch(console.error); }, []);

	// --- Announcement ---
	const handlePostAnnouncement = async () => { /* ... logic ... */ };

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

	const handleSaveUser = async () => {
		if (!editingUser) return;
		try {
			const userRef = doc(db, "users", editingUser.id);
			await updateDoc(userRef, {
				name: editingUser.name,
				email: editingUser.email,
				role: editingUser.role,
			});
			setMessageState({ message: "User updated successfully", type: "success" });
			setEditingUser(null);
		} catch (error) {
			console.error("Error updating user:", error);
			setMessageState({ message: "Failed to update user", type: "error" });
		}
	};

	const handlePasswordChange = async (newPass: string, userId: string) => {
		// Placeholder: This typically requires an API call to a backend using Firebase Admin SDK
		console.log("Password change requested for", userId);
		setMessageState({ message: "Password update requires Admin API integration", type: "warning" });
	};

	const handleRoleChange = async (id: string, newRole: string) => { /* ... logic ... */ };
	const handleApprovePost = async (id: string) => { /* ... logic ... */ };
	const handleRejectPost = async (id: string) => { /* ... logic ... */ };

	const filteredLogs = logs.filter(log => filter === "all" || log.category === filter).sort((a, b) => sortOrder === "newest" ? b.timestamp - a.timestamp : a.timestamp - b.timestamp);
	const filteredUsers = users.filter((u) => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));


	const activeTabInfo = allTabs.find(t => t.id === activeTab);
	const activeTabName = activeTabInfo?.name || "Dashboard Content";
	const ActiveTabIcon = activeTabInfo?.icon || Activity;

	const handleTabChange = (tabId: string) => { setActiveTab(tabId); setIsDropdownOpen(false); setMessageState(null); };

	// --- Inline Modals ---

	const EditUserModal = () => {
		const user = editingUser;
		if (!user) return null;

		// Ensure data integrity before opening
		const currentSelectedUser = users.find(u => u.id === user.id) || user;

		return (
			<Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
				<DialogContent className="bg-black/80 backdrop-blur-xl border border-white/20 text-white w-11/12 max-w-md p-6">
					<DialogHeader>
						<DialogTitle className="text-xl font-semibold text-purple-400">
							✏️ Edit User — {user.name}
						</DialogTitle>
						<DialogDescription className="text-gray-400">
							Update the user's basic information and role.
						</DialogDescription>
					</DialogHeader>

					<form onSubmit={(e) => { e.preventDefault(); handleSaveUser(); }} className="space-y-4">

						<Label htmlFor="name" className="block text-sm text-gray-300 mb-1">Full Name</Label>
						<Input
							id="name"
							className="w-full bg-white/10 border border-white/20 focus-visible:ring-purple-500 text-white placeholder-gray-400"
							value={currentSelectedUser.name}
							onChange={(e) => setEditingUser({ ...currentSelectedUser, name: e.target.value })}
						/>

						<Label htmlFor="email" className="block text-sm text-gray-300 mb-1">Email</Label>
						<Input
							id="email"
							className="w-full bg-white/10 border border-white/20 focus-visible:ring-purple-500 text-white placeholder-gray-400"
							type="email"
							value={currentSelectedUser.email}
							onChange={(e) => setEditingUser({ ...currentSelectedUser, email: e.target.value })}
						/>

						<Label htmlFor="role" className="block text-sm text-gray-300 mb-1">Role</Label>
						<Select
							value={currentSelectedUser.role || "user"}
							onValueChange={(value: 'admin' | 'moderator' | 'user') => setEditingUser({ ...currentSelectedUser, role: value })}
						>
							<SelectTrigger className="w-full bg-white/10 border border-white/20 text-white focus-visible:ring-purple-500">
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
								className="bg-purple-600 hover:bg-purple-700 text-white"
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
				<DialogContent className="bg-black/80 backdrop-blur-xl border border-white/20 text-white w-11/12 max-w-md p-6">
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
				{/* Sidebar */}
				<div className="hidden md:block md:w-64 bg-white/5 backdrop-blur-xl border border-white/10 p-4 rounded-2xl h-fit shadow-lg shadow-black/20">
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

				{/* Main Content Area */}
				<div className="flex-grow">
					<div className="mb-6 pb-2 border-b border-white/10 flex flex-col sm:flex-row sm:justify-between sm:items-center relative">
						<h1 className="text-4xl font-bold tracking-tight text-gray-100">{activeTabName}</h1>
						{/* Mobile Tab Dropdown (omitted for brevity) */}
					</div>

					{/* Global Message (Toast) */}
					<AnimatePresence>{messageState && <div className="mb-6"><MessageBar message={messageState.message} type={messageState.type} /></div>}</AnimatePresence>

					{/* Active Tab Content */}
					<AnimatePresence mode="wait">

						{/* 1. Overview (RETAINED INLINE) */}
						{activeTab === "overview" && (
							<motion.div key="overview" animate={{ opacity: 1, y: 0 }} className="space-y-8" exit={{ opacity: 0, y: -15 }} initial={{ opacity: 0, y: 15 }} transition={{ duration: 0.4 }}>
								{/* Stats Cards (omitted for brevity) */}
								<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
									{[
										{ title: "Active Users", stat: "1,254", desc: "+5% this week" },
										{ title: "Total Posts", stat: "412", desc: "15 drafts pending" },
										{ title: "Server Uptime", stat: "99.9%", desc: "Last reboot: 6d ago" },
									].map((card, i) => (
										<Card key={i} className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all shadow-black/20" asChild>
											<motion.div whileHover={{ scale: 1.02 }}>
												<CardTitle className="text-xl font-semibold text-gray-200">{card.title}</CardTitle>
												<p className="text-5xl font-extrabold mt-2 text-indigo-300">{card.stat}</p>
												<p className="text-sm text-gray-400 mt-1">{card.desc}</p>
											</motion.div>
										</Card>
									))}
								</div>
								{/* Charts (omitted for brevity) */}
							</motion.div>
						)}

						{/* 2. Activity Logs (USES EXTERNAL COMPONENT) */}
						{activeTab === "activity" && (
							<motion.div key="activity" animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
								<ActivityLogsContent logs={filteredLogs} filter={filter} setFilter={setFilter} sortOrder={sortOrder} setSortOrder={setSortOrder} />
							</motion.div>
						)}

						{/* 3. Attendance (USES EXTERNAL COMPONENT) */}
						{activeTab === "attendance" && (
							<motion.div key="attendance" animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
								<AttendanceContent />
							</motion.div>
						)}

						{/* 4. Announcement (RETAINED INLINE) */}
						{activeTab === "announcement" && (
							<motion.div key="announcement" animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
								<Card className="bg-black/10 backdrop-blur-xl border border-white/10 shadow-lg">
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

										<Label htmlFor="content" className="text-white font-semibold">Content</Label>
										<Textarea
											id="content" placeholder="Details about the announcement..." value={announcement.content}
											onChange={e => setAnnouncement({ ...announcement, content: e.target.value })}
											className="bg-white/5 text-white border-white/20 h-32 placeholder:text-gray-500 focus-visible:ring-indigo-500 focus-visible:ring-2"
										/>

										<div className="flex flex-col gap-2">
											<Label className="text-white font-semibold">Image Upload (Optional)</Label>
											<Input
												type="file" onChange={e => setAnnouncement({ ...announcement, image: e.target.files ? e.target.files[0] : null })}
												className="bg-white/5 text-gray-300 border-white/20 file:text-white file:bg-indigo-600/50 file:border-none file:hover:bg-indigo-600/70"
											/>
										</div>

										<div className="space-y-3">
											<Label className="text-white font-semibold flex items-center gap-2">
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

						{/* 5. Notifications (USES EXTERNAL COMPONENT) */}
						{activeTab === "notifications" && (
							<motion.div key="notifications" animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
								<NotificationsContent />
							</motion.div>
						)}

						{/* 6. Users (INLINE IMPLEMENTATION of User Management) */}
						{activeTab === "users" && (
							<motion.div key="users" animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
								<TrashbinContent
									trashItems={trashItems}
									onRestore={handleRestore}
									onPermanentDelete={handlePermanentDelete}
								/>
							</motion.div>
						)}

						{/* 7. Trash Bin (USES EXTERNAL COMPONENT) */}
						{activeTab === "trash" && (
							<motion.div key="trash" animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
								<TrashbinContent
									trashItems={trashItems}
									onRestore={handleRestore}
									onPermanentDelete={handlePermanentDelete}
								/>
							</motion.div>
						)}

						{/* 8. Pending Posts (USES EXTERNAL COMPONENT) */}
						{activeTab === "pendings" && (
							<motion.div key="pendings" animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
								<PendingPostsContent posts={pendingPosts} onApprove={handleApprovePost} onReject={handleRejectPost} />
							</motion.div>
						)}

						{/* 9. iBot (USES EXTERNAL COMPONENT) */}
						{activeTab === "ibot" && (
							<motion.div key="ibot" animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
								<IBotContent />
							</motion.div>
						)}

					</AnimatePresence>
				</div>
			</motion.div>

			{/* --- Modals --- */}
			<EditUserModal />
			<PasswordModal />
		</div>
	);
}