'use client';

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

// Third-party imports
import { motion, AnimatePresence } from "framer-motion";
import { Users, Search, Edit, Trash2, KeyRound, UserPlus } from "lucide-react";

// Firebase imports (already correct)
import {
    collection,
    onSnapshot,
    doc,
    updateDoc,
    deleteDoc,
} from "firebase/firestore";

// Assuming db is correctly imported from your firebase service file
// NOTE: I've corrected the import path based on the structure provided previously.
import { db } from "@/services/firebase";

// --- Types ---
interface UserData {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'moderator' | 'user';
    active: boolean; // Assuming 'status' means 'active'
}

// --- Main Component ---
export default function UserManagementTab() {
    const [users, setUsers] = useState<UserData[]>([]);
    const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
    const [passwordTarget, setPasswordTarget] = useState<UserData | null>(null);
    const [search, setSearch] = useState("");
    const [toast, setToast] = useState<string | null>(null);

    // 🧃 Toast helper
    const showToast = (message: string, duration = 3000) => {
        setToast(message);
        setTimeout(() => setToast(null), duration);
    };

    // 🔥 Real-time Firestore listener
    useEffect(() => {
        // NOTE: Corrected type casting for safety
        const unsub = onSnapshot(collection(db, "users"), (snapshot) => {
            const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as UserData[];
            setUsers(data);
        });
        return () => unsub();
    }, []);

    // ✏️ Update user details
    const handleSaveUser = async () => {
        if (!selectedUser) return;
        try {
            const ref = doc(db, "users", selectedUser.id);
            // Ensure only necessary fields are updated
            await updateDoc(ref, {
                name: selectedUser.name,
                email: selectedUser.email,
                role: selectedUser.role,
            });
            showToast("✅ User updated successfully!");
            setSelectedUser(null);
        } catch (err) {
            console.error(err);
            showToast("❌ Failed to update user.");
        }
    };

    // ❌ Delete user
    const handleDeleteUser = async (id: string) => {
        if (!confirm("Are you sure you want to delete this user? This action is permanent and cannot be undone.")) return;
        try {
            await deleteDoc(doc(db, "users", id));
            showToast("🗑️ User deleted successfully!");
        } catch (err) {
            console.error(err);
            showToast("❌ Failed to delete user.");
        }
    };

    // 🔑 Update password (placeholder for backend)
    const handlePasswordChange = async (newPass: string, uid: string) => {
        // ⚠️ Replace this with your Firebase Admin SDK API call later
        showToast(`✅ Password update request sent for UID: ${uid}`);
        setPasswordTarget(null);
    };

    const filteredUsers = users.filter((u) =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()),
    );

    // --- Modal Content Components ---

    const EditUserModal = () => (
        <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
            <DialogContent className="bg-black/80 backdrop-blur-xl border border-white/20 text-white w-11/12 max-w-md p-6">
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold text-purple-400">
                        ✏️ Edit User — {selectedUser?.name}
                    </DialogTitle>
                    <DialogDescription className="text-gray-400">
                        Update the user's basic information and role.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={(e) => { e.preventDefault(); handleSaveUser(); }} className="space-y-4">

                    <div>
                        <Label htmlFor="name" className="block text-sm text-gray-300 mb-1">Full Name</Label>
                        <Input
                            id="name"
                            className="w-full bg-white/10 border border-white/20 focus-visible:ring-purple-500 text-white placeholder-gray-400"
                            value={selectedUser?.name || ''}
                            onChange={(e) => setSelectedUser({ ...selectedUser!, name: e.target.value })}
                        />
                    </div>

                    <div>
                        <Label htmlFor="email" className="block text-sm text-gray-300 mb-1">Email</Label>
                        <Input
                            id="email"
                            className="w-full bg-white/10 border border-white/20 focus-visible:ring-purple-500 text-white placeholder-gray-400"
                            type="email"
                            value={selectedUser?.email || ''}
                            onChange={(e) => setSelectedUser({ ...selectedUser!, email: e.target.value })}
                        />
                    </div>

                    <div>
                        <Label htmlFor="role" className="block text-sm text-gray-300 mb-1">Role</Label>
                        <Select
                            value={selectedUser?.role || "user"}
                            onValueChange={(value: 'admin' | 'moderator' | 'user') =>
                                setSelectedUser({ ...selectedUser!, role: value })
                            }
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
                    </div>

                    <DialogFooter className="mt-6 flex justify-end gap-3">
                        <Button
                            variant="secondary"
                            onClick={() => setSelectedUser(null)}
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

    const PasswordModal = () => {
        const [newPass, setNewPass] = useState('');
        const [confirmPass, setConfirmPass] = useState('');

        const handleSubmit = (e: React.FormEvent) => {
            e.preventDefault();
            if (!newPass || !confirmPass) {
                return showToast("⚠️ Fill in both fields");
            }
            if (newPass !== confirmPass) {
                return showToast("⚠️ Passwords do not match");
            }
            handlePasswordChange(newPass, passwordTarget!.id);
            setPasswordTarget(null);
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
                            className="w-full bg-white/10 border border-white/20 focus-visible:ring-purple-500 text-white placeholder-gray-400"
                            name="newPassword"
                            placeholder="New password"
                            type="password"
                            value={newPass}
                            onChange={(e) => setNewPass(e.target.value)}
                        />
                        <Input
                            className="w-full bg-white/10 border border-white/20 focus-visible:ring-purple-500 text-white placeholder-gray-400"
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

    return (
        <motion.div
            key="users-tab"
            animate={{ opacity: 1, y: 0 }}
            className="relative space-y-8"
            exit={{ opacity: 0, y: -15 }}
            initial={{ opacity: 0, y: 15 }}
            transition={{ duration: 0.4 }}
        >
            <h3 className="text-4xl font-extrabold flex items-center gap-3 text-purple-400">
                <Users size={32} /> User Management
            </h3>

            {/* Main Content Card (Glassy) */}
            <Card className="bg-black/10 backdrop-blur-xl border border-white/10 p-4 md:p-6 rounded-2xl shadow-lg">

                {/* Search and Add */}
                <CardContent className="p-0 mb-6 space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="relative w-full md:w-1/3">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                className="w-full px-4 pl-10 py-2 bg-white/10 border border-white/20 focus-visible:ring-purple-500 text-white placeholder-gray-400"
                                placeholder="Search users..."
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <Button
                            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-4 py-2 rounded-lg flex items-center gap-2"
                            onClick={() => showToast("ℹ️ Add user functionality coming soon")}
                        >
                            <UserPlus size={18} /> Add User
                        </Button>
                    </div>
                </CardContent>

                {/* User Table (Shadcn Table) */}
                <div className="overflow-x-auto rounded-xl border border-white/20">
                    <Table className="min-w-full md:min-w-0">
                        <TableHeader>
                            <TableRow className="bg-white/10 border-white/20 text-gray-200 uppercase text-xs tracking-wider hover:bg-white/10">
                                <TableHead className="py-3 px-4 text-white">Name</TableHead>
                                <TableHead className="py-3 px-4 text-white">Email</TableHead>
                                <TableHead className="py-3 px-4 text-white">Role</TableHead>
                                <TableHead className="py-3 px-4 text-white">Status</TableHead>
                                <TableHead className="py-3 px-4 text-white text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredUsers.map((user) => (
                                <TableRow
                                    key={user.id}
                                    className="border-b border-white/10 hover:bg-white/10 transition"
                                >
                                    <TableCell className="py-3 px-4 text-white font-medium">
                                        {user.name}
                                    </TableCell>
                                    <TableCell className="py-3 px-4 text-gray-300">{user.email}</TableCell>
                                    <TableCell className="py-3 px-4 text-gray-300 capitalize">
                                        <Badge variant="secondary" className="bg-purple-500/20 text-purple-300 border-purple-500/20">
                                            {user.role || "user"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="py-3 px-4">
                                        <Badge
                                            className={`${user.active
                                                ? "bg-green-400/20 text-green-300 border-green-400/20"
                                                : "bg-red-400/20 text-red-300 border-red-400/20"
                                                }`}
                                        >
                                            {user.active ? "Active" : "Suspended"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="text-blue-400 border-blue-400/30 hover:bg-blue-500/10"
                                            onClick={() => setSelectedUser(user)}
                                        >
                                            <Edit size={16} />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="text-yellow-400 border-yellow-400/30 hover:bg-yellow-500/10"
                                            onClick={() => setPasswordTarget(user)}
                                        >
                                            <KeyRound size={16} />
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            size="icon"
                                            onClick={() => handleDeleteUser(user.id)}
                                        >
                                            <Trash2 size={16} />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </Card>

            {/* --- Toast message (animated) --- */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        key="toast"
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        className={`fixed bottom-10 left-1/2 -translate-x-1/2 px-4 py-2 text-sm font-semibold text-white rounded-xl shadow-md backdrop-blur-md z-50 pointer-events-none ${toast.startsWith("✅") || toast.startsWith("🗑️")
                            ? "bg-green-600/70 border border-green-400/40"
                            : toast.startsWith("ℹ️")
                                ? "bg-blue-600/70 border border-blue-400/40"
                                : "bg-red-600/70 border border-red-400/40"
                            }`}
                        exit={{ opacity: 0, y: -15, scale: 0.95 }}
                        initial={{ opacity: 0, y: -15, scale: 0.95 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                        {toast}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- Edit User Modal --- */}
            <EditUserModal />

            {/* --- Password Modal --- */}
            <PasswordModal />
        </motion.div>
    );
}