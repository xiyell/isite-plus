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

import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import { AllowedIDs } from './AllowedIDs';

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

export const UserManagementContent: React.FC<UserManagementProps> = ({
    users,
    search,
    setSearch,
    handleEditUser,
    setPasswordTarget,
    handleRoleChange,
    handleDeleteUser,
}) => {
    const [viewMode, setViewMode] = useState<'users' | 'whitelist'>('users');
    const [sortKey, setSortKey] = useState<'name' | 'email' | 'role' | 'lastLogin'>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'moderator' | 'user'>('all');

    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'restricted' | 'suspended'>('all');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    if (viewMode === 'whitelist') {
        return <AllowedIDs onBack={() => setViewMode('users')} />;
    }

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

    const filteredAndSortedUsers = users
        .filter(u => roleFilter === 'all' || u.role === roleFilter)
        .filter(u => statusFilter === 'all' || u.status === statusFilter)
        .filter(u => 
            search === '' || 
            u.name.toLowerCase().includes(search.toLowerCase()) || 
            u.email.toLowerCase().includes(search.toLowerCase())
        )
        .sort((a, b) => {
            const valA = a[sortKey].toString().toLowerCase();
            const valB = b[sortKey].toString().toLowerCase();

            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

    // Pagination Logic
    const totalPages = Math.ceil(filteredAndSortedUsers.length / itemsPerPage);
    const paginatedUsers = filteredAndSortedUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const SortIcon = ({ keyName }: { keyName: typeof sortKey }) => {
        if (sortKey !== keyName) return null;
        return (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />);
    };

    return (
        <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-lg">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle className="text-white">
                        User List ({users.length})
                    </CardTitle>
                    <div className="flex gap-2">
                         <Button 
                            variant="outline" 
                            className="bg-indigo-600/50 hover:bg-indigo-600/70 border-indigo-500 text-white"
                            onClick={() => setViewMode('whitelist')}
                        >
                            <KeyRound size={18} className="mr-2" /> Manage Whitelist
                        </Button>
                    </div>
                </div>
                <CardDescription className="text-gray-400">Manage user roles, statuses, and access credentials.</CardDescription>
                <Separator className="my-4 bg-white/10" />
            </CardHeader>
            <CardContent className="space-y-6">

                {/* Search & Filter */}
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <Input
                            type="text"
                            placeholder="Search by Name or Email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-white/5 border-white/20 text-white pl-10"
                        />
                    </div>
                    <Select value={roleFilter} onValueChange={(val: any) => setRoleFilter(val)}>
                        <SelectTrigger className="w-[180px] bg-white/10 border-white/20 text-white">
                            <SelectValue placeholder="Filter by Role" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700 text-white">
                            <SelectItem value="all">All Roles</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="moderator">Moderator</SelectItem>
                            <SelectItem value="user">User</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
                        <SelectTrigger className="w-[180px] bg-white/10 border-white/20 text-white">
                            <SelectValue placeholder="Filter by Status" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700 text-white">
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="restricted">Restricted</SelectItem>
                            <SelectItem value="suspended">Suspended</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* User Table - styled like ActivityLogs */}
                <div className="border border-white/20 rounded-none bg-black/20 overflow-hidden">
                    <Table className="border-collapse w-full">
                        <TableHeader className="bg-white/10">
                            <TableRow className="border-b border-white/20">
                                <TableHead
                                    className="cursor-pointer hover:text-white border-r border-white/10 text-white font-bold uppercase tracking-wider text-xs p-4"
                                    onClick={() => handleSort('name')}
                                >
                                    <div className="flex items-center gap-2">Name <SortIcon keyName="name" /></div>
                                </TableHead>
                                <TableHead
                                    className="cursor-pointer hover:text-white border-r border-white/10 text-white font-bold uppercase tracking-wider text-xs p-4 hidden sm:table-cell"
                                    onClick={() => handleSort('email')}
                                >
                                    <div className="flex items-center gap-2">Email <SortIcon keyName="email" /></div>
                                </TableHead>
                                <TableHead
                                    className="cursor-pointer hover:text-white border-r border-white/10 text-white font-bold uppercase tracking-wider text-xs p-4"
                                    onClick={() => handleSort('role')}
                                >
                                    <div className="flex items-center gap-2">Role <SortIcon keyName="role" /></div>
                                </TableHead>
                                <TableHead className="text-center border-r border-white/10 text-white font-bold uppercase tracking-wider text-xs p-4">Status</TableHead>
                                <TableHead className="text-right text-white font-bold uppercase tracking-wider text-xs p-4">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedUsers.map((user) => (
                                <TableRow
                                    key={user.id}
                                    className="hover:bg-white/5 transition-colors border-b border-white/10 text-gray-200"
                                >
                                    <TableCell className="border-r border-white/10 p-4 font-medium text-white whitespace-nowrap">{user.name}</TableCell>
                                    <TableCell className="border-r border-white/10 p-4 text-gray-300 hidden sm:table-cell">{user.email}</TableCell>
                                    <TableCell className="border-r border-white/10 p-4">
                                        <Badge
                                            className={getRoleVariant(user.role)}
                                        >
                                            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="border-r border-white/10 p-4 text-center">
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
                                    <TableCell className="p-4 text-right whitespace-nowrap">
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
                                </TableRow>
                            ))}
                            {filteredAndSortedUsers.length === 0 && (
                                <TableRow className="border-white/10 hover:bg-transparent">
                                    <TableCell colSpan={5} className="text-center text-gray-500 py-6">No users found.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="mt-4">
                        <Pagination>
                            <PaginationContent>
                                <PaginationItem>
                                    <PaginationPrevious
                                        href="#"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            if (currentPage > 1) setCurrentPage(p => p - 1);
                                        }}
                                        className={currentPage === 1 ? "pointer-events-none opacity-50 text-gray-500" : "text-gray-300 hover:text-white hover:bg-white/10"}
                                    />
                                </PaginationItem>
                                
                                {(() => {
                                    const max = 5;
                                    const pages: number[] = [];
                                    let start = Math.max(1, currentPage - Math.floor(max / 2));
                                    let end = Math.min(totalPages, start + max - 1);
                                    if (end - start + 1 < max) start = Math.max(1, end - max + 1);
                                    for (let i = start; i <= end; i++) if (i > 0) pages.push(i);
                                    
                                    return pages.map((page) => (
                                        <PaginationItem key={page}>
                                            <PaginationLink
                                                href="#"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    setCurrentPage(page);
                                                }}
                                                isActive={page === currentPage}
                                                className={page === currentPage
                                                    ? "bg-indigo-600 text-white border-indigo-500"
                                                    : "text-gray-400 hover:text-white hover:bg-white/10"
                                                }
                                            >
                                                {page}
                                            </PaginationLink>
                                        </PaginationItem>
                                    ));
                                })()}

                                <PaginationItem>
                                    <PaginationNext
                                        href="#"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            if (currentPage < totalPages) setCurrentPage(p => p + 1);
                                        }}
                                        className={currentPage === totalPages ? "pointer-events-none opacity-50 text-gray-500" : "text-gray-300 hover:text-white hover:bg-white/10"}
                                    />
                                </PaginationItem>
                            </PaginationContent>
                        </Pagination>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};