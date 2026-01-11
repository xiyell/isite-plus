
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Trash2, Edit2, Loader2, Download, AlertCircle, CheckCircle2, X, Pencil, Upload, Save, FileText, Edit } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import {
    getWhitelist,
    addWhitelistEntries,
    deleteWhitelistEntries,
    updateWhitelistEntry,
    WhitelistEntry
} from "@/actions/whitelist";
import { auth } from "@/services/firebase";

interface AllowedIDsProps {
    onBack: () => void;
}

const getPageNumbers = (current: number, total: number, max = 5) => {
    const pages: number[] = [];
    let start = Math.max(1, current - Math.floor(max / 2));
    let end = Math.min(total, start + max - 1);
    if (end - start + 1 < max) start = Math.max(1, end - max + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
};

export const AllowedIDs: React.FC<AllowedIDsProps> = ({ onBack }) => {
    const { toast } = useToast();
    const [entries, setEntries] = useState<WhitelistEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [bulkInput, setBulkInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Edit state
    const [editingEntry, setEditingEntry] = useState<WhitelistEntry | null>(null);
    const [editName, setEditName] = useState('');
    const [editId, setEditId] = useState('');
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    useEffect(() => {
        fetchIds();
    }, []);

    const fetchIds = async () => {
        setLoading(true);
        try {
            const data = await getWhitelist();
            if (data.entries) {
                setEntries(data.entries);
            }
        } catch (error) {
            console.error("Failed to fetch whitelist", error);
            toast({
                title: "Error",
                description: "Failed to load whitelisted entries.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleAddIds = async () => {
        if (!bulkInput.trim()) return;

        setIsSubmitting(true);
        // Split by newline and parse "ID, Name"
        const lines = bulkInput.split(/\n/).filter(line => line.trim().length > 0);
        
        const newEntries: WhitelistEntry[] = lines.map(line => {
            // Regex to match "ID, Name" or "ID Name"
            // Captures: Group 1 (ID), Group 2 (Name)
            // Supports Names with special chars, spaces, etc.
            const match = line.match(/^([^\s,]+)[\s,]+(.+)$/);
            
            if (match) {
                return {
                    id: match[1].trim(),
                    name: match[2].trim() // Captures "Peña", "O'Connor", etc.
                };
            }
            // Fallback if regex fails (e.g. only ID provided)
            return { 
                id: line.trim(), 
                name: "Unknown Name" 
            };
        });

        const actorName = auth.currentUser?.displayName || auth.currentUser?.email || "Admin";

        try {
            const res = await addWhitelistEntries(newEntries, actorName);
            if (res.success) {
                toast({
                    title: "Success",
                    description: res.message,
                });
                setIsAddDialogOpen(false);
                setBulkInput('');
                fetchIds();
            }
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to add entries.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateEntry = async () => {
        if (!editingEntry || !editName.trim() || !editId.trim()) return;

        setIsSubmitting(true);
        const actorName = auth.currentUser?.displayName || auth.currentUser?.email || "Admin";
        try {
            const res = await updateWhitelistEntry(
                editingEntry.id, 
                editId !== editingEntry.id ? editId : undefined,
                editName,
                actorName
            );

            if (res.success) {
                toast({
                    title: "Updated",
                    description: res.message,
                });
                setIsEditDialogOpen(false);
                setEditingEntry(null);
                fetchIds();
            }
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to update entry.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        const actorName = auth.currentUser?.displayName || auth.currentUser?.email || "Admin";
        try {
            const res = await deleteWhitelistEntries([id], actorName);
            if (res.success) {
                toast({
                    title: "Deleted",
                    description: res.message,
                });
                fetchIds();
            }
        } catch (error: any) {
            toast({
                title: "Error",
                description: "Failed to delete from whitelist.",
                variant: "destructive",
            });
        }
    };

    // Filter & Sort
    const filteredEntries = entries.filter(e => 
        e.id.toLowerCase().includes(search.toLowerCase()) || 
        e.name.toLowerCase().includes(search.toLowerCase())
    ).sort((a, b) => a.name.localeCompare(b.name));

    // Pagination Logic
    const totalPages = Math.ceil(filteredEntries.length / itemsPerPage);
    const paginatedEntries = filteredEntries.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-lg">
            <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <CardTitle className="text-white flex items-center gap-2">
                            <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 text-gray-400 hover:text-white -ml-2">
                                <X size={20} />
                            </Button>
                            Whitelist Management
                            <Badge variant="outline" className="ml-2 border-indigo-500 text-indigo-400">
                                {entries.length} Students
                            </Badge>
                        </CardTitle>
                        <CardDescription className="text-gray-400 mt-1">
                            Manage Student IDs and Names allowed to register.
                        </CardDescription>
                    </div>
                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                                <Plus size={18} className="mr-2" /> Add Students
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-slate-900 border-white/10 text-white sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Whilteliest Students</DialogTitle>
                                <DialogDescription className="text-gray-400">
                                    Format: <b>ID, Full Name</b> (one per line).<br/>
                                    Example: 2023-00001-SM-0, John Doe
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <Textarea
                                    placeholder="2023-00001-SM-0, John Doe&#10;2023-00002-SM-0, Jane Smith"
                                    className="bg-black/20 border-white/10 text-white min-h-[200px] font-mono"
                                    value={bulkInput}
                                    onChange={(e) => setBulkInput(e.target.value)}
                                />
                                <div className="text-xs text-gray-500 flex items-center gap-2">
                                    <AlertCircle size={14} />
                                    <span>IDs will be used as the unique key. Names will be used for verification.</span>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="ghost" onClick={() => setIsAddDialogOpen(false)} className="text-gray-400 hover:text-white">Cancel</Button>
                                <Button onClick={handleAddIds} disabled={isSubmitting || !bulkInput.trim()} className="bg-indigo-600 hover:bg-indigo-700">
                                    {isSubmitting ? "Processing..." : "Whiltelist"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
                <Separator className="my-4 bg-white/10" />
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Search */}
                <div className="flex items-center gap-4">
                    <Search size={20} className="text-gray-400" />
                    <Input
                        type="text"
                        placeholder="Search by ID or Name..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                        className="w-full bg-white/5 border-white/20 text-white"
                    />
                </div>

                {/* List */}
                <div className="rounded-md border border-white/10 overflow-hidden">
                    <Table>
                        <TableHeader className="bg-black/20">
                            <TableRow className="border-white/10 hover:bg-transparent">
                                <TableHead className="text-gray-400">Student ID</TableHead>
                                <TableHead className="text-gray-400">Full Name</TableHead>
                                <TableHead className="text-right text-gray-400">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                                        Loading whitelist...
                                    </TableCell>
                                </TableRow>
                            ) : paginatedEntries.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                                        {search ? "No matches found." : "Whitelist is empty."}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                <AnimatePresence>
                                    {paginatedEntries.map((entry) => (
                                        <motion.tr
                                            key={entry.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="border-white/10 hover:bg-white/5 group"
                                        >
                                            <TableCell className="font-mono text-gray-300">{entry.id}</TableCell>
                                            <TableCell className="text-white">{entry.name}</TableCell>
                                            <TableCell className="text-right flex items-center justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => {
                                                        setEditingEntry(entry);
                                                        setEditName(entry.name);
                                                        setEditId(entry.id);
                                                        setIsEditDialogOpen(true);
                                                    }}
                                                    className="h-8 w-8 text-gray-500 hover:text-indigo-400 hover:bg-indigo-900/20 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    title="Edit entry"
                                                >
                                                    <Pencil size={16} />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDelete(entry.id)}
                                                    className="h-8 w-8 text-gray-500 hover:text-red-400 hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    title="Remove from whitelist"
                                                >
                                                    <Trash2 size={16} />
                                                </Button>
                                            </TableCell>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Edit Dialog */}
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                    <DialogContent className="bg-slate-900 border-white/10 text-white sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Edit Whitelisted Student</DialogTitle>
                            <DialogDescription className="text-gray-400">
                                Update the student details below.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300">Student ID</label>
                                <Input
                                    value={editId}
                                    onChange={(e) => setEditId(e.target.value)}
                                    className="bg-black/20 border-white/10 text-white font-mono"
                                    placeholder="Enter Student ID"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300">Full Name</label>
                                <Input
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="bg-black/20 border-white/10 text-white"
                                    placeholder="Enter full name"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="ghost" onClick={() => setIsEditDialogOpen(false)} className="text-gray-400 hover:text-white">Cancel</Button>
                            <Button onClick={handleUpdateEntry} disabled={isSubmitting || !editName.trim() || !editId.trim()} className="bg-indigo-600 hover:bg-indigo-700">
                                {isSubmitting ? "Saving..." : "Save Changes"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="mt-4">
                        <Pagination>
                            <PaginationContent>
                                <PaginationItem>
                                    <PaginationPrevious
                                        href="#"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            if (currentPage > 1) setCurrentPage((p) => Math.max(1, p - 1));
                                        }}
                                        className={currentPage === 1 ? "pointer-events-none opacity-50 text-gray-400" : "text-gray-300 hover:text-white"}
                                    />
                                </PaginationItem>

                                {getPageNumbers(currentPage, totalPages).map((page) => (
                                    <PaginationItem key={page}>
                                        <PaginationLink
                                            href="#"
                                            isActive={page === currentPage}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                setCurrentPage(page);
                                            }}
                                            className={page === currentPage
                                                ? "bg-indigo-600 text-white border-indigo-500"
                                                : "text-gray-400 hover:text-white"
                                            }
                                        >
                                            {page}
                                        </PaginationLink>
                                    </PaginationItem>
                                ))}

                                <PaginationItem>
                                    <PaginationNext
                                        href="#"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            if (currentPage < totalPages) setCurrentPage((p) => Math.min(totalPages, p + 1));
                                        }}
                                        className={currentPage === totalPages ? "pointer-events-none opacity-50 text-gray-400" : "text-gray-300 hover:text-white"}
                                    />
                                </PaginationItem>
                            </PaginationContent>
                        </Pagination>
                    </div>
                )}            </CardContent>
        </Card>
    );
};
