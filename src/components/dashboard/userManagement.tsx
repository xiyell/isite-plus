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
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <Input
                            type="text"
                            placeholder="Search by Name or Email..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                            className="w-full bg-white/5 border-white/10 rounded-xl text-white pl-11 h-11 focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-zinc-600"
                        />
                    </div>
                    <div className="grid grid-cols-2 sm:flex gap-3">
                        <Select value={roleFilter} onValueChange={(val: any) => { setRoleFilter(val); setCurrentPage(1); }}>
                            <SelectTrigger className="w-full sm:w-[150px] bg-white/5 border-white/10 text-white rounded-xl h-11 font-medium">
                                <SelectValue placeholder="Role" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-100 z-[200]">
                                <SelectItem value="all">All Roles</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="moderator">Moderator</SelectItem>
                                <SelectItem value="user">User</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={statusFilter} onValueChange={(val: any) => { setStatusFilter(val); setCurrentPage(1); }}>
                            <SelectTrigger className="w-full sm:w-[150px] bg-white/5 border-white/10 text-white rounded-xl h-11 font-medium">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-100 z-[200]">
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="restricted">Restricted</SelectItem>
                                <SelectItem value="suspended">Suspended</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* DESKTOP VIEW */}
                <div className="hidden lg:block border border-white/10 rounded-2xl bg-black/40 overflow-hidden shadow-inner font-outfit">
                    <Table>
                        <TableHeader className="bg-white/5">
                            <TableRow className="border-b border-white/10 hover:bg-transparent">
                                <TableHead
                                    className="cursor-pointer hover:text-white text-zinc-400 font-bold uppercase tracking-widest text-[10px] py-5 pl-6"
                                    onClick={() => handleSort('name')}
                                >
                                    <div className="flex items-center gap-2">Name <SortIcon keyName="name" /></div>
                                </TableHead>
                                <TableHead
                                    className="cursor-pointer hover:text-white text-zinc-400 font-bold uppercase tracking-widest text-[10px] py-5"
                                    onClick={() => handleSort('email')}
                                >
                                    <div className="flex items-center gap-2">Email <SortIcon keyName="email" /></div>
                                </TableHead>
                                <TableHead
                                    className="cursor-pointer hover:text-white text-zinc-400 font-bold uppercase tracking-widest text-[10px] py-5"
                                    onClick={() => handleSort('role')}
                                >
                                    <div className="flex items-center gap-2">Role <SortIcon keyName="role" /></div>
                                </TableHead>
                                <TableHead className="text-center text-zinc-400 font-bold uppercase tracking-widest text-[10px] py-5">Status</TableHead>
                                <TableHead className="text-right text-zinc-400 font-bold uppercase tracking-widest text-[10px] py-5 pr-6">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedUsers.map((user) => (
                                <TableRow
                                    key={user.id}
                                    className="group hover:bg-white/5 transition-all duration-200 border-b border-white/5 last:border-0 h-16"
                                >
                                    <TableCell className="pl-6 font-bold text-white/90 text-[11px] whitespace-nowrap">{user.name}</TableCell>
                                    <TableCell className="text-zinc-400 text-[11px] font-medium">{user.email}</TableCell>
                                    <TableCell>
                                        <Badge
                                            className={`${getRoleVariant(user.role)} rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase shadow-lg shadow-black/40 border-0`}
                                        >
                                            {user.role}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex justify-center">
                                            {user.active ? (
                                                <div className="h-5 w-5 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20">
                                                    <CheckCircle size={12} className="text-green-500" />
                                                </div>
                                            ) : (
                                                <div className="h-5 w-5 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
                                                    <XCircle size={12} className="text-red-500" />
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="pr-6 text-right whitespace-nowrap">
                                        <div className="flex justify-end gap-1.5">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 rounded-lg bg-yellow-500/5 text-yellow-500 hover:bg-yellow-500/10 border border-yellow-500/10"
                                                onClick={() => setPasswordTarget(user)}
                                            >
                                                <KeyRound size={14} />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 rounded-lg bg-indigo-500/5 text-indigo-400 hover:bg-indigo-500/10 border border-indigo-500/10"
                                                onClick={() => handleEditUser(user)}
                                            >
                                                <Edit size={14} />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 rounded-lg bg-red-500/5 text-red-500 hover:bg-red-500/10 border border-red-500/10"
                                                onClick={() => handleDeleteUser(user.id, user.name)}
                                            >
                                                <Trash2 size={14} />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {filteredAndSortedUsers.length === 0 && (
                                <TableRow className="hover:bg-transparent">
                                    <TableCell colSpan={5} className="text-center text-zinc-500 py-16">
                                        <Search className="mx-auto h-8 w-8 mb-3 opacity-10" />
                                        No users matching your criteria.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* MOBILE VIEW */}
                <div className="lg:hidden space-y-4">
                    {paginatedUsers.map((user) => (
                        <div key={user.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4 transition-all hover:border-indigo-500/30">
                            <div className="flex justify-between items-start gap-4">
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/10 shrink-0">
                                        <UserPlus className="h-4 w-4 text-indigo-400" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1 break-words">{user.role}</p>
                                        <h4 className="text-xs font-bold text-white break-words">{user.name}</h4>
                                    </div>
                                </div>
                                <div className={`h-6 w-6 rounded-full flex items-center justify-center border shrink-0 ${
                                    user.active ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-red-500/10 border-red-500/20 text-red-500'
                                }`}>
                                    {user.active ? <CheckCircle size={14} /> : <XCircle size={14} />}
                                </div>
                            </div>

                            <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                                <p className="text-[10px] text-zinc-500 font-mono truncate">{user.email}</p>
                            </div>

                            <div className="flex justify-between items-center pt-3 border-t border-white/5">
                                <div className="flex flex-col">
                                    <span className="text-[8px] text-zinc-500 uppercase font-black tracking-tighter mb-0.5">Status</span>
                                    <span className={`text-[9px] font-bold ${user.active ? 'text-green-400' : 'text-zinc-500'}`}>
                                        {user.active ? 'ACTIVE ACCOUNT' : 'INACTIVE'}
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-9 w-9 bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 border border-yellow-500/10 rounded-xl"
                                        onClick={() => setPasswordTarget(user)}
                                    >
                                        <KeyRound size={16} />
                                    </Button>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-9 w-9 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/10 rounded-xl"
                                        onClick={() => handleEditUser(user)}
                                    >
                                        <Edit size={16} />
                                    </Button>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-9 w-9 bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/10 rounded-xl"
                                        onClick={() => handleDeleteUser(user.id, user.name)}
                                    >
                                        <Trash2 size={16} />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex justify-center pt-8">
                        <Pagination>
                            <PaginationContent className="flex-wrap justify-center gap-2">
                                <PaginationItem>
                                    <PaginationPrevious
                                        href="#"
                                        onClick={(e) => { e.preventDefault(); if(currentPage > 1) setCurrentPage(p => p - 1); }}
                                        className={currentPage === 1 ? "pointer-events-none opacity-40" : "text-zinc-400 hover:text-white transition-colors cursor-pointer"}
                                    />
                                </PaginationItem>
                                
                                {Array.from({ length: totalPages }).map((_, i) => (
                                    <PaginationItem key={i}>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className={`h-8 w-8 p-0 rounded-lg text-xs font-bold transition-all ${
                                                currentPage === i + 1 ? 'bg-indigo-600 text-white scale-110 shadow-lg shadow-indigo-600/20' : 'text-zinc-500 hover:text-white'
                                            }`}
                                            onClick={() => setCurrentPage(i + 1)}
                                        >
                                            {i + 1}
                                        </Button>
                                    </PaginationItem>
                                ))}

                                <PaginationItem>
                                    <PaginationNext
                                        href="#"
                                        onClick={(e) => { e.preventDefault(); if(currentPage < totalPages) setCurrentPage(p => p + 1); }}
                                        className={currentPage === totalPages ? "pointer-events-none opacity-40" : "text-zinc-400 hover:text-white transition-colors cursor-pointer"}
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