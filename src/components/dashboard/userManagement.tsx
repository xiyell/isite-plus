// This component should ideally be in "@/components/dashboard/UserManagementContent.tsx"
// But it is defined here for integration clarity.

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Edit, Trash2, KeyRound, UserPlus, ChevronUp, ChevronDown, CheckCircle, XCircle } from 'lucide-react';

// Assuming all these Shadcn components are available via imports in DevDashboard.tsx
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/Button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// --- Types (Re-defined for clarity) ---
interface UserData {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'moderator' | 'user';
    status: string;
    lastLogin: string;
    active: boolean;
}

// --- Props for UserManagementContent ---
interface UserManagementProps {
    users: UserData[];
    search: string;
    setSearch: (value: string) => void;
    handleEditUser: (user: UserData) => void;
    setPasswordTarget: (user: UserData | null) => void;
    handleRoleChange: (id: string, newRole: string) => void;

    handleDeleteUser: (id: string, name: string) => void;
}

// --- Component Definition ---

export const UserManagementContent: React.FC<UserManagementProps> = ({
    users,
    search,
    setSearch,
    handleEditUser,
    setPasswordTarget,
    handleRoleChange,
    handleDeleteUser,
}) => {
    const [sortKey, setSortKey] = useState<'name' | 'email' | 'role' | 'lastLogin'>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    const getRoleVariant = (role: string) => {
        switch (role) {
            case 'admin': return 'bg-purple-600 hover:bg-purple-700';
            case 'moderator': return 'bg-indigo-600 hover:bg-indigo-700';
            default: return 'bg-gray-500 hover:bg-gray-600';
        }
    };

    const handleSort = (key: 'name' | 'email' | 'role' | 'lastLogin') => {
        if (sortKey === key) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortOrder('asc');
        }
    };

    const sortedUsers = [...users].sort((a, b) => {
        const valA = a[sortKey].toString().toLowerCase();
        const valB = b[sortKey].toString().toLowerCase();

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    const SortIcon = ({ keyName }: { keyName: typeof sortKey }) => {
        if (sortKey !== keyName) return null;
        return (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />);
    };

    return (
        <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-lg">
            <CardHeader>
                <CardTitle className="text-white flex justify-between items-center">
                    User List ({users.length})
                    <Button variant="outline" className="bg-indigo-600/50 hover:bg-indigo-600/70 border-indigo-500 text-white">
                        <UserPlus size={18} className="mr-2" /> Add New User
                    </Button>
                </CardTitle>
                <CardDescription className="text-gray-400">Manage user roles, statuses, and access credentials.</CardDescription>
                <Separator className="my-4 bg-white/10" />
            </CardHeader>
            <CardContent className="space-y-6">

                {/* Search & Filter */}
                <div className="flex items-center gap-4">
                    <Search size={20} className="text-gray-400" />
                    <Input
                        type="text"
                        placeholder="Search by Name or Email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-white/5 border-white/20 text-white"
                    />
                </div>

                {/* User Table */}
                <div className="overflow-x-auto">
                    <Table className="min-w-full">
                        <TableHeader>
                            <TableRow className="bg-black/20 border-white/10 hover:bg-black/20 text-gray-400">
                                <TableHead
                                    className="cursor-pointer hover:text-white"
                                    onClick={() => handleSort('name')}
                                >
                                    Name <SortIcon keyName="name" />
                                </TableHead>
                                <TableHead
                                    className="cursor-pointer hover:text-white hidden sm:table-cell"
                                    onClick={() => handleSort('email')}
                                >
                                    Email <SortIcon keyName="email" />
                                </TableHead>
                                <TableHead
                                    className="cursor-pointer hover:text-white"
                                    onClick={() => handleSort('role')}
                                >
                                    Role <SortIcon keyName="role" />
                                </TableHead>
                                <TableHead className="text-center">Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <AnimatePresence initial={false}>
                                {sortedUsers.map((user) => (
                                    <motion.tr
                                        key={user.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="border-white/10 hover:bg-white/5 text-gray-200"
                                    >
                                        <TableCell className="font-medium text-white whitespace-nowrap">{user.name}</TableCell>
                                        <TableCell className="text-gray-300 hidden sm:table-cell">{user.email}</TableCell>
                                        <TableCell>
                                            <Badge
                                                className={getRoleVariant(user.role)}
                                            // Optional: Allow quick role switch (requires handleRoleChange implementation)
                                            // onClick={() => handleRoleChange(user.id, user.role === 'user' ? 'moderator' : 'user')} 
                                            >
                                                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {user.active ? (
                                                <span title="Active" className="flex justify-center">
                                                    <CheckCircle size={18} className="text-green-400" />
                                                </span>
                                            ) : (
                                                <span title="Inactive" className="flex justify-center">
                                                    <XCircle size={18} className="text-red-400" />
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right whitespace-nowrap">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="bg-yellow-600/30 hover:bg-yellow-600/50 border-yellow-500/50"
                                                    onClick={() => setPasswordTarget(user)}
                                                    title="Change Password"
                                                >
                                                    <KeyRound size={16} className="text-yellow-300" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="bg-purple-600/30 hover:bg-purple-600/50 border-purple-500/50"
                                                    onClick={() => handleEditUser(user)}
                                                    title="Edit User Info"
                                                >
                                                    <Edit size={16} className="text-purple-300" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="bg-red-600/30 hover:bg-red-600/50 border-red-500/50"
                                                    onClick={() => handleDeleteUser(user.id, user.name)}
                                                    title="Delete User"
                                                >
                                                    <Trash2 size={16} className="text-red-300" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                            {users.length === 0 && (
                                <TableRow className="border-white/10 hover:bg-transparent">
                                    <TableCell colSpan={5} className="text-center text-gray-500 py-6">No users found.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
};

// ... End of UserManagementContent definition ...