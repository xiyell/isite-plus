"use client";

import { useState, useEffect, useCallback } from "react";
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from "@/services/firebase";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
	Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious,
} from "@/components/ui/pagination";

import {
	Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

import ActivityLogsContent from "@/components/dashboard/activityLogs";
import AttendanceContent from "@/components/dashboard/attendance";
import IBotContent from "@/components/dashboard/ibot";
import IEvaluationContent from "@/components/dashboard/ievaluation";
import TrashbinContent from "@/components/dashboard/trashbin";
import { UserManagementContent } from "./userManagement";

import {
	collection, onSnapshot, doc, updateDoc, serverTimestamp, query, where
} from "firebase/firestore";

import { motion, AnimatePresence } from "framer-motion";
import {
	Upload, Send, AlertTriangle, Users, Activity, Calendar, Bot,
	ChevronDown, ChevronUp, Recycle, FileText, Trash2, Edit, KeyRound
} from "lucide-react";

import AdminPostModerationPage from "@/components/dashboard/pendingpost";
import { createAnnouncement, getAnnouncements, deleteAnnouncement } from "@/actions/announcements";
import OverviewContent from "@/components/dashboard/overview";
import { addLog } from "@/actions/logs";
import { moveUserToRecycleBin, updateUserPassword } from "@/actions/userManagement";
import { useSearchParams, useRouter } from 'next/navigation';
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type SeverityLevel = "low" | "medium" | "high";
type Announcement = { id?: string; title: string; description: string; image: string | null; platforms?: { websitePost: boolean; facebook: boolean; instagram: boolean; twitter: boolean; }; createdAt?: string; updatedAt?: string; };
interface UserData { id: string; name: string; email: string; role: 'admin' | 'moderator' | 'user'; status: string; lastLogin: string; active: boolean; }

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

export default function DashboardContent() {
    const router = useRouter();
	const searchParams = useSearchParams();

	const initialTab = searchParams.get('tab') || "overview";
	const [activeTab, setActiveTab] = useState(initialTab);

	// Sync activeTab with URL params changes
	useEffect(() => {
		const tab = searchParams.get('tab');
		if (tab) setActiveTab(tab);
	}, [searchParams]);

	// State for the mobile dropdown menu
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const [messageState, setMessageState] = useState<{ message: string, type: 'success' | 'error' | 'warning' } | null>(null);
	const { toast } = useToast();

	//  Bridge: Convert legacy messageState to Toast
	useEffect(() => {
		if (messageState) {
			toast({
				title: messageState.type === 'error' ? 'Error' : messageState.type === 'success' ? 'Success' : 'Notification',
				description: messageState.message,
				variant: messageState.type === 'error' ? 'destructive' : 'default',
				className: messageState.type === 'success' ? 'border-green-500/50 bg-green-900/20 text-green-100' : ''
			});
			setMessageState(null);
		}
	}, [messageState, toast]);

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const [announcements, setAnnouncements] = useState<Announcement[]>([]);
	const [announcementPage, setAnnouncementPage] = useState(1);
	const ITEMS_PER_PAGE = 5;

	const [users, setUsers] = useState<UserData[]>([]);
	const [editingUser, setEditingUser] = useState<UserData | null>(null);
	const [passwordTarget, setPasswordTarget] = useState<UserData | null>(null);
	const [search, setSearch] = useState("");

	const [confirmState, setConfirmState] = useState<{
		isOpen: boolean;
		type: 'announcement' | 'user' | null;
		id: string | null;
		title?: string;
	}>({ isOpen: false, type: null, id: null });

	const [authReady, setAuthReady] = useState(false);
	const [announcement, setAnnouncement] = useState<Announcement>({
		title: "", description: "", image: null,
		platforms: { websitePost: false, facebook: false, instagram: false, twitter: false },
	});


	// --- Navigation Structure ---
	const tabGroups = [
		{
			title: "Menu",
			items: [
				{ id: "overview", name: "Overview", icon: Activity },
			]
		},
		{
			title: "Management",
			items: [
				{ id: "usersManagement", name: "Users", icon: Users },
				{ id: "attendance", name: "Attendance", icon: Calendar },
				{ id: "evaluations", name: "Evaluations", icon: FileText },
			]
		},
		{
			title: "Content",
			items: [
				{ id: "pendings", name: "Pending Posts", icon: Upload },
				{ id: "announcement", name: "Announcement", icon: Send },
				{ id: "ibot", name: "iBot", icon: Bot },
			]
		},
		{
			title: "System",
			items: [
				{ id: "activity", name: "Activity Logs", icon: AlertTriangle },
				{ id: "trash", name: "Trash Bin", icon: Recycle },
			]
		}
	];

	const allTabs = tabGroups.flatMap(g => g.items);

	// --- Role-Based Access Logic ---
	const [userRole, setUserRole] = useState<'admin' | 'moderator' | 'user' | null>(null);

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			if (user) {
				const docRef = doc(db, "users", user.uid);
				// Listen to role changes in real-time
				const unsubUser = onSnapshot(docRef, (snap) => {
					if (snap.exists()) {
						const data = snap.data() as UserData;
						const normalizedRole = (data.role || 'user').toLowerCase() as 'admin' | 'moderator' | 'user';
						setUserRole(normalizedRole);
                        
                        // RESTRICTION: Redirect normal users
                        if (normalizedRole === 'user') {
                             router.push('/');
                             return;
                        }

						setAuthReady(true);
					}
				});
				return () => unsubUser();
			} else {
                // Not logged in? Redirect or handle as needed
                // router.push('/login'); // Optional: force login
				setAuthReady(true);
			}
		});
		return () => unsubscribe();
	}, [router]);

	// Define Access Rules returning GROUPS
	const visibleGroups = (() => {
		if (!userRole) return [];

		// Filter helper
		const filterGroups = (allowedIds: string[]) => {
			return tabGroups.map(group => ({
				...group,
				items: group.items.filter(item => allowedIds.includes(item.id))
			})).filter(group => group.items.length > 0);
		};

		if (userRole === 'admin') return tabGroups;

		if (userRole === 'moderator') {
			// Explicitly allowing "pendings" and other core tabs
			const allowed = ["overview", "activity", "attendance", "announcement", "pendings", "evaluations"];
			return filterGroups(allowed);
		}

		if (userRole === 'user') {
			const allowed = ["overview", "announcement", "evaluations"];
			return filterGroups(allowed);
		}

		return [];
	})();

	const flattenedVisibleTabs = visibleGroups.flatMap(g => g.items);

	// Fallback if active tab is not in visible tabs
	useEffect(() => {
		if (authReady && flattenedVisibleTabs.length > 0) {
			const isAllowed = flattenedVisibleTabs.find(t => t.id === activeTab);
			if (!isAllowed) {
				setActiveTab(flattenedVisibleTabs[0].id);
			}
		}
	}, [activeTab, flattenedVisibleTabs, authReady]);

	// ----------------------------------------------------------------------------------
	useEffect(() => {
		const unsub = onSnapshot(collection(db, "users"), (snapshot) => {
			const data = snapshot.docs
				.map((doc) => ({ id: doc.id, ...doc.data() })) as UserData[];
			// Filter out soft-deleted users
			const activeUsers = data.filter(u => u.status !== 'deleted' && !(u as any).isDeleted);
			setUsers(activeUsers);
		}, (error) => {
			console.error("Error watching users:", error);
		});
		return () => unsub();
	}, []);

	useEffect(() => {
		const q = query(
			collection(db, "announcements"),
			where("status", "!=", "deleted")
		);

		const unsub = onSnapshot(q, (snapshot) => {
			const data = snapshot.docs.map(doc => ({
				id: doc.id,
				...doc.data()
			})) as Announcement[];
			setAnnouncements(data);
		}, (err) => {
			console.error("Announcement watch error:", err);
		});
		return () => unsub();
	}, []);

	// Pagination Reset
	useEffect(() => {
		const maxPage = Math.ceil(announcements.length / ITEMS_PER_PAGE) || 1;
		if (announcementPage > maxPage) {
			setAnnouncementPage(maxPage);
		}
	}, [announcements, announcementPage]);

	// --- Announcement ---
	const handlePostAnnouncement = async () => {
		if (!announcement.title || !announcement.description) {
			setMessageState({ message: "Title and Content are required.", type: 'warning' });
			return;
		}

		try {
			setMessageState({ message: "Posting announcement...", type: 'warning' });
			const dataToPost = {
				title: announcement.title,
				description: announcement.description,
				platforms: announcement.platforms,
				image: announcement.image || "",
				updatedAt: new Date().toISOString(),
			};
			await createAnnouncement(dataToPost);
			setAnnouncement({
				title: "", description: "", image: "",
				platforms: { websitePost: false, facebook: false, instagram: false, twitter: false },
			});
			setMessageState({ message: "Announcement posted successfully!", type: 'success' });
		} catch (error) {
			console.error("Error posting announcement:", error);
			setMessageState({ message: "Failed to post announcement.", type: 'error' });
		}
	};


	// -- ACTIONS --
	const handleDeleteAnnouncement = async () => {
		if (confirmState.type === 'announcement' && confirmState.id) {
			try {
				await deleteAnnouncement(confirmState.id);
				
				setMessageState({ message: "Announcement moved to trash bin", type: 'success' });
				await addLog({
					category: "system",
					action: "Announcement Deleted",
					severity: "medium",
					message: `Announcement "${confirmState.title || 'Unknown'}" was moved to trash.`
				});
			} catch (error) {
				console.error(error);
				setMessageState({ message: "Failed to delete announcement", type: 'error' });
			} finally {
				setConfirmState({ ...confirmState, isOpen: false });
			}
		}
	};
	
	const handleEditUser = (user: UserData) => setEditingUser(user);
	const handleSaveUser = async (updatedData: UserData) => {
		if (!updatedData || !updatedData.id) {
			setMessageState({ message: "Error: Invalid user data or missing ID.", type: "error" });
			return;
		}
		try {
			const userRef = doc(db, "users", updatedData.id);
			await updateDoc(userRef, {
				name: updatedData.name,
				email: updatedData.email,
				role: updatedData.role,
				status: updatedData.status,
				active: updatedData.status === 'active',
			});
			setMessageState({ message: `${updatedData.name}'s details updated successfully.`, type: "success" });
			setEditingUser(null); 
		} catch (error) {
			console.error("Error updating user:", error);
			setMessageState({ message: "Failed to update user. Check console for details.", type: "error" });
		}
	};

	const handlePasswordChange = async (newPass: string, uid: string) => {
		try {
			const result = await updateUserPassword(uid, newPass, auth.currentUser?.uid || "system");
			if (result.success) {
				setMessageState({ message: "Password updated successfully", type: 'success' });
			} else {
				throw new Error(result.message);
			}
		} catch (e: any) {
			setMessageState({ message: e.message || "Failed to update password", type: 'error' });
		}
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

	const executeDeleteUser = async () => {
		if (!confirmState.id) return;
		try {
			await moveUserToRecycleBin(confirmState.id, auth.currentUser?.uid || "system");
			setMessageState({ message: `User ${confirmState.title || 'User'} moved to trash`, type: "success" });
		} catch (error) {
			console.error("Error deleting user:", error);
			setMessageState({ message: "Failed to delete user", type: "error" });
		} finally {
			setConfirmState({ ...confirmState, isOpen: false });
		}
	};

	const handleDeleteUser = (id: string, name: string) => {
		setConfirmState({
			isOpen: true,
			type: 'user',
			id,
			title: name
		});
	};

	const filteredUsers = users
		.filter(u => u.status !== 'deleted') 
		.filter(u =>
			u.name.toLowerCase().includes(search.toLowerCase()) ||
			u.email.toLowerCase().includes(search.toLowerCase())
		);

	const activeTabInfo = allTabs.find(t => t.id === activeTab);
	const activeTabName = activeTabInfo?.name || "Dashboard Content";
	const ActiveTabIcon = activeTabInfo?.icon || Activity;

	const handleTabChange = (tabId: string) => { setActiveTab(tabId); setIsDropdownOpen(false); setMessageState(null); };

	// --- Inline Modals ---
		const EditUserModal = () => {
			const [formData, setFormData] = useState({ name: '', role: 'user' as 'admin'|'moderator'|'user', status: 'active' });

			useEffect(() => {
				if (editingUser) {
					setFormData({
						name: editingUser.name,
						role: editingUser.role, 
						status: editingUser.status
					});
				}
			}, [editingUser]);

			const handleSubmit = (e: React.FormEvent) => {
				e.preventDefault();
				if (!editingUser) return;
				handleSaveUser({
					...editingUser,
					...formData
				});
			};

			return (
				<Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
					<DialogContent className="pt-4 bg-black/80 backdrop-blur-xl border border-white/20 text-white w-11/12 max-w-md p-6">
						<DialogHeader>
							<DialogTitle className="text-xl font-semibold text-purple-300">Edit User</DialogTitle>
							<DialogDescription className="text-gray-400">Update user details and permissions for {editingUser?.name}.</DialogDescription>
						</DialogHeader>

						<form onSubmit={handleSubmit} className="space-y-4 pt-4">
							<div className="space-y-2">
								<Label htmlFor="name" className="text-gray-300">Name</Label>
								<Input
									id="name"
									value={formData.name}
									onChange={(e) => setFormData({ ...formData, name: e.target.value })}
									className="bg-white/10 border-white/20 text-white"
								/>
							</div>
							
							<div className="space-y-2">
								<Label htmlFor="role" className="text-gray-300">Role</Label>
								<Select 
									value={formData.role} 
									onValueChange={(val: any) => setFormData({ ...formData, role: val })}
								>
									<SelectTrigger className="bg-white/10 border-white/20 text-white">
										<SelectValue placeholder="Select Role" />
									</SelectTrigger>
									<SelectContent className="bg-gray-800 border-gray-700 text-white z-[200]">
										<SelectItem value="user">User</SelectItem>
										<SelectItem value="moderator">Moderator</SelectItem>
										<SelectItem value="admin">Admin</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<Label htmlFor="status" className="text-gray-300">Status</Label>
								<Select 
									value={formData.status} 
									onValueChange={(val) => setFormData({ ...formData, status: val })}
								>
									<SelectTrigger className="bg-white/10 border-white/20 text-white">
										<SelectValue placeholder="Select Status" />
									</SelectTrigger>
									<SelectContent className="bg-gray-800 border-gray-700 text-white z-[200]">
										<SelectItem value="active">Active</SelectItem>
										<SelectItem value="restricted">Restricted</SelectItem>
										<SelectItem value="suspended">Suspended</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<DialogFooter className="pt-4">
								<Button type="button" variant="ghost" onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-white">
									Cancel
								</Button>
								<Button className="bg-purple-600 hover:bg-purple-700 text-white" type="submit">
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
				if (passwordTarget) {
					handlePasswordChange(newPass, passwordTarget.id);
					setPasswordTarget(null);
					setNewPass('');
					setConfirmPass('');
				}
			};

			return (
				<Dialog open={!!passwordTarget} onOpenChange={() => setPasswordTarget(null)}>
					<DialogContent className="pt-4 bg-black/80 backdrop-blur-xl border border-white/20 text-white w-11/12 max-w-md p-6">
						<DialogHeader>
							<DialogTitle className="text-xl font-semibold text-yellow-400">
								🔑 Change Password — {passwordTarget?.name}
							</DialogTitle>
							<DialogDescription className="text-gray-400">
								Update credentials for this account.
							</DialogDescription>
						</DialogHeader>

						<form onSubmit={handleSubmit} className="space-y-4 pt-4">
							<div className="space-y-2">
								<Label className="text-gray-300">New Password</Label>
								<Input
									placeholder="New Password"
									type="password"
									value={newPass}
									onChange={(e) => setNewPass(e.target.value)}
									className="bg-white/10 border-white/20 text-white"
								/>
							</div>
							<div className="space-y-2">
								<Label className="text-gray-300">Confirm Password</Label>
								<Input
									placeholder="Confirm Password"
									type="password"
									value={confirmPass}
									onChange={(e) => setConfirmPass(e.target.value)}
									className="bg-white/10 border-white/20 text-white"
								/>
							</div>
							<DialogFooter className="pt-4">
								<Button type="button" variant="ghost" onClick={() => setPasswordTarget(null)} className="text-gray-400 hover:text-white">
									Cancel
								</Button>
								<Button className="bg-yellow-600 hover:bg-yellow-700 text-white" type="submit">
									Change Password
								</Button>
							</DialogFooter>
						</form>
					</DialogContent>
				</Dialog>
			);
		};

	return (
		<div className="w-full min-h-screen text-white bg-transparent font-sans pt-24 px-6 pb-6 md:pt-28 md:px-10 md:pb-10">
			<motion.div animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto flex flex-col md:flex-row gap-8" initial={{ opacity: 0, y: 10 }} transition={{ duration: 0.4 }}>

				{/* 1. Sidebar (Desktop Only) */}
				<div className="pt-4 hidden md:block md:w-64 bg-white/5 backdrop-blur-xl border border-white/10 p-4 rounded-2xl h-fit shadow-lg shadow-black/20 sticky top-28">
					<h2 className="text-2xl font-semibold mb-5 text-gray-200 pl-2">Dev Control</h2>
					<ScrollArea className="h-[calc(100vh-12rem)]">
						<div className="flex flex-col gap-6">
							{visibleGroups.map((group, groupIndex) => (
								<div key={groupIndex} className="flex flex-col gap-2">
									{group.title && (
										<h3 className="text-xs uppercase tracking-wider text-gray-500 font-bold px-3 mb-1">
											{group.title}
										</h3>
									)}
									{group.items.map(tab => (
										<SidebarButton
											key={tab.id}
											isActive={activeTab === tab.id}
											onPress={() => handleTabChange(tab.id)}
											icon={tab.icon}
											className="capitalize font-medium tracking-wide"
										>
											{tab.name}
										</SidebarButton>
									))}
								</div>
							))}
						</div>
					</ScrollArea>
				</div>

				{/* 2. Main Content Area */}
				<div className="flex-grow">
					<div className="mb-6 pb-2 border-b border-white/10 flex flex-col sm:flex-row sm:justify-between sm:items-center relative gap-4 sm:gap-0">
						<h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-gray-100">{activeTabName}</h1>

						{/* Mobile Tab Dropdown FIX */}
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
											{visibleGroups.map((group, groupIndex) => (
												<div key={groupIndex} className="flex flex-col space-y-1 mb-2 last:mb-0">
													{group.title && (
														<span className="px-3 py-1 text-[10px] uppercase font-bold text-gray-500 tracking-wider block">
															{group.title}
														</span>
													)}
													{group.items.map(tab => (
														<SidebarButton
															key={`mobile-${tab.id}`}
															isActive={activeTab === tab.id}
															onPress={() => handleTabChange(tab.id)}
															icon={tab.icon}
															className="capitalize font-medium tracking-wide !w-full justify-start"
														>
															{tab.name}
														</SidebarButton>
													))}
												</div>
											))}
										</div>
									</motion.div>
								)}
							</AnimatePresence>
						</div>
					</div>

					<AnimatePresence mode="wait">
						{activeTab === "overview" && ( <OverviewContent /> )}
						{activeTab === "activity" && ( <motion.div key="activity" animate={{ opacity: 1 }} exit={{ opacity: 0 }}> <ActivityLogsContent /> </motion.div> )}
						{activeTab === "attendance" && ( <motion.div key="attendance" animate={{ opacity: 1 }} exit={{ opacity: 0 }}> <AttendanceContent /> </motion.div> )}
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
												id="imageUrl" type="text" placeholder="Enter image URL (e.g., https://example.com/image.jpg)" value={announcement.image || ''}
												onChange={e => setAnnouncement({ ...announcement, image: e.target.value })}
												className="bg-white/5 text-gray-300 border-white/20 placeholder:text-gray-500 focus-visible:ring-indigo-500 focus-visible:ring-2"
											/>
										</div>
										<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
											<div className="flex items-center space-x-2 bg-white/5 p-3 rounded-lg border border-white/10"><Checkbox id="website" checked={announcement.platforms?.websitePost} onCheckedChange={(checked) => setAnnouncement({ ...announcement, platforms: { ...announcement.platforms!, websitePost: !!checked } })} /><Label htmlFor="website" className="cursor-pointer">Website</Label></div>
											<div className="flex items-center space-x-2 bg-white/5 p-3 rounded-lg border border-white/10"><Checkbox id="facebook" checked={announcement.platforms?.facebook} onCheckedChange={(checked) => setAnnouncement({ ...announcement, platforms: { ...announcement.platforms!, facebook: !!checked } })} /><Label htmlFor="facebook" className="cursor-pointer text-gray-400">Facebook</Label></div>
											<div className="flex items-center space-x-2 bg-white/5 p-3 rounded-lg border border-white/10"><Checkbox id="instagram" checked={announcement.platforms?.instagram} onCheckedChange={(checked) => setAnnouncement({ ...announcement, platforms: { ...announcement.platforms!, instagram: !!checked } })} /><Label htmlFor="instagram" className="cursor-pointer text-gray-400">Instagram</Label></div>
											<div className="flex items-center space-x-2 bg-white/5 p-3 rounded-lg border border-white/10"><Checkbox id="twitter" checked={announcement.platforms?.twitter} onCheckedChange={(checked) => setAnnouncement({ ...announcement, platforms: { ...announcement.platforms!, twitter: !!checked } })} /><Label htmlFor="twitter" className="cursor-pointer text-gray-400">X (Twitter)</Label></div>
										</div>
									</CardContent>
									<CardContent>
										<Button onClick={handlePostAnnouncement} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-6 text-lg shadow-lg shadow-indigo-500/20 transition-all duration-300 transform hover:translate-y-[-2px]">
											<Send className="mr-2 h-5 w-5" /> Post Announcement
										</Button>
									</CardContent>
								</Card>
								<div className="mt-8">
									<h2 className="text-xl font-bold mb-4 text-gray-200 flex items-center gap-2"><Activity className="text-indigo-400" /> Recent Announcements</h2>
									<div className="grid gap-4">
										{announcements.slice((announcementPage - 1) * ITEMS_PER_PAGE, announcementPage * ITEMS_PER_PAGE).map((ann) => (
											<Card key={ann.id} className="bg-black/20 backdrop-blur-lg border-white/10 hover:bg-black/30 transition-colors">
												<CardHeader className="pb-2">
													<div className="flex justify-between items-start">
														<div>
															<CardTitle className="text-lg text-white">{ann.title}</CardTitle>
															<CardDescription className="text-gray-400 text-xs mt-1">
																Posted on {ann.createdAt ? new Date(ann.createdAt).toLocaleDateString() : 'Unknown Date'}
															</CardDescription>
														</div>
														<Button
															variant="ghost" size="icon" className="text-gray-400 hover:text-red-400 hover:bg-red-900/20"
															onClick={() => setConfirmState({ isOpen: true, type: 'announcement', id: ann.id!, title: ann.title })}
														>
															<Trash2 size={18} />
														</Button>
													</div>
												</CardHeader>
												<CardContent>
													<p className="text-gray-300 text-sm line-clamp-2">{ann.description}</p>
													<div className="flex gap-2 mt-3">
														{ann.platforms?.websitePost && <Badge variant="secondary" className="bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30">Website</Badge>}
														{ann.platforms?.facebook && <Badge variant="secondary" className="bg-blue-500/20 text-blue-300 hover:bg-blue-500/30">Facebook</Badge>}
													</div>
												</CardContent>
											</Card>
										))}
									</div>
									<div className="mt-4">
										<Pagination>
											<PaginationContent>
												<PaginationItem>
													<PaginationPrevious onClick={() => setAnnouncementPage(p => Math.max(1, p - 1))} className={announcementPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'} />
												</PaginationItem>
												<PaginationItem>
													<span className="px-4 text-sm text-gray-400">Page {announcementPage}</span>
												</PaginationItem>
												<PaginationItem>
													<PaginationNext onClick={() => setAnnouncementPage(p => Math.min(Math.ceil(announcements.length / ITEMS_PER_PAGE), p + 1))} className={announcementPage >= Math.ceil(announcements.length / ITEMS_PER_PAGE) ? 'pointer-events-none opacity-50' : 'cursor-pointer'} />
												</PaginationItem>
											</PaginationContent>
										</Pagination>
									</div>
								</div>
							</motion.div>
						)}

						{/* 5. Users Management */}
						{activeTab === "usersManagement" && (
							<motion.div key="users" animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
								<UserManagementContent
									users={users}
									search={search}
									setSearch={setSearch}
									handleEditUser={handleEditUser}
									setPasswordTarget={setPasswordTarget}
									handleRoleChange={handleRoleChange}
									handleDeleteUser={handleDeleteUser}
								/>
							</motion.div>
						)}

						{/* 6. Pending Posts */}
						{activeTab === "pendings" && ( <motion.div key="pendings" animate={{ opacity: 1 }} exit={{ opacity: 0 }}> <AdminPostModerationPage /> </motion.div> )}

						{/* 7. iBot */}
						{activeTab === "ibot" && ( <motion.div key="ibot" animate={{ opacity: 1 }} exit={{ opacity: 0 }}> <IBotContent /> </motion.div> )}

						{/* 8. Evaluations */}
						{activeTab === "evaluations" && ( <motion.div key="evaluations" animate={{ opacity: 1 }} exit={{ opacity: 0 }}> <IEvaluationContent /> </motion.div> )}

						{/* 9. Trash Bin */}
						{activeTab === "trash" && ( <motion.div key="trash" animate={{ opacity: 1 }} exit={{ opacity: 0 }}> <TrashbinContent /> </motion.div> )}

					</AnimatePresence>
				</div>
			</motion.div>

			<EditUserModal />
			<PasswordModal />

			<ConfirmDialog
				isOpen={confirmState.isOpen}
				onClose={() => setConfirmState({ ...confirmState, isOpen: false })}
				onConfirm={confirmState.type === 'announcement' ? handleDeleteAnnouncement : executeDeleteUser}
				title={confirmState.type === 'announcement' ? "Delete Announcement?" : "Delete User?"}
				description={confirmState.type === 'announcement'
					? `Are you sure you want to delete "${confirmState.title}"? This cannot be undone.`
					: `Are you sure you want to move "${confirmState.title}" to the trash? They can be restored later.`
				}
				confirmText="Delete"
				cancelText="Cancel"
				variant="destructive"
			/>
		</div>
	);
}