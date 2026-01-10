
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Trash2, Plus, Upload, X, Save, AlertCircle, FileText } from 'lucide-react';
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

interface AllowedIDsProps {
    onBack: () => void;
}

export const AllowedIDs: React.FC<AllowedIDsProps> = ({ onBack }) => {
    const { toast } = useToast();
    const [ids, setIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [bulkInput, setBulkInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    useEffect(() => {
        fetchIds();
    }, []);

    const fetchIds = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/whitelist');
            const data = await res.json();
            if (data.ids) {
                setIds(data.ids);
            }
        } catch (error) {
            console.error("Failed to fetch whitelist", error);
            toast({
                title: "Error",
                description: "Failed to load whitelisted IDs.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleAddIds = async () => {
        if (!bulkInput.trim()) return;

        setIsSubmitting(true);
        // Split by newline, comma, or space and filter empty
        const newIds = bulkInput
            .split(/[\n,\s]+/)
            .map(id => id.trim())
            .filter(id => id.length > 0);

        // Simple format validation could go here, but we'll trust the admin for now or rely on the backend/logic
        // Regex for standard format: ^\d{4}-\d{5}-SM-\d$

        try {
            const res = await fetch('/api/whitelist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ studentIds: newIds }),
            });

            if (res.ok) {
                toast({
                    title: "Success",
                    description: `Added ${newIds.length} IDs to the whitelist.`,
                });
                setBulkInput('');
                setIsAddDialogOpen(false);
                fetchIds();
            } else {
                throw new Error("Failed to add IDs");
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to add IDs. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (idToDelete: string) => {
        // Optimistic update
        const originalIds = [...ids];
        setIds(ids.filter(id => id !== idToDelete));

        try {
            const res = await fetch('/api/whitelist', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ studentIds: [idToDelete] }),
            });

            if (!res.ok) {
                throw new Error("Failed to delete");
            }

            toast({
                title: "Deleted",
                description: `ID ${idToDelete} removed from whitelist.`,
            });
        } catch (error) {
            setIds(originalIds); // Revert
            toast({
                title: "Error",
                description: "Failed to delete ID.",
                variant: "destructive",
            });
        }
    };

    // Filter & Sort
    const filteredIds = ids.filter(id => id.toLowerCase().includes(search.toLowerCase())).sort();

    // Pagination Logic
    const totalPages = Math.ceil(filteredIds.length / itemsPerPage);
    const paginatedIds = filteredIds.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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
                                {ids.length} Allowed
                            </Badge>
                        </CardTitle>
                        <CardDescription className="text-gray-400 mt-1">
                            Manage Student IDs allowed to register.
                        </CardDescription>
                    </div>
                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                                <Plus size={18} className="mr-2" /> Add IDs
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-slate-900 border-white/10 text-white sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Add Allowed Student IDs</DialogTitle>
                                <DialogDescription className="text-gray-400">
                                    Paste a list of Student IDs here. Separated by newlines, commas, or spaces.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <Textarea
                                    placeholder="2023-00001-SM-0&#10;2023-00002-SM-0"
                                    className="bg-black/20 border-white/10 text-white min-h-[200px] font-mono"
                                    value={bulkInput}
                                    onChange={(e) => setBulkInput(e.target.value)}
                                />
                                <div className="text-xs text-gray-500 flex items-center gap-2">
                                    <AlertCircle size={14} />
                                    <span>Duplicates will be handled automatically by the database.</span>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="ghost" onClick={() => setIsAddDialogOpen(false)} className="text-gray-400 hover:text-white">Cancel</Button>
                                <Button onClick={handleAddIds} disabled={isSubmitting || !bulkInput.trim()} className="bg-indigo-600 hover:bg-indigo-700">
                                    {isSubmitting ? "Adding..." : "Add IDs"}
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
                        placeholder="Search Student ID..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                        className="w-full bg-white/5 border-white/20 text-white font-mono"
                    />
                </div>

                {/* List */}
                <div className="rounded-md border border-white/10 overflow-hidden">
                    <Table>
                        <TableHeader className="bg-black/20">
                            <TableRow className="border-white/10 hover:bg-transparent">
                                <TableHead className="text-gray-400">Student ID</TableHead>
                                <TableHead className="text-right text-gray-400">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={2} className="text-center py-8 text-gray-500">
                                        Loading whitelist...
                                    </TableCell>
                                </TableRow>
                            ) : paginatedIds.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={2} className="text-center py-8 text-gray-500">
                                        {search ? "No IDs match your search." : "No allowed IDs found. Add some to get started."}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                <AnimatePresence>
                                    {paginatedIds.map((id) => (
                                        <motion.tr
                                            key={id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="border-white/10 hover:bg-white/5 group"
                                        >
                                            <TableCell className="font-mono text-gray-300">{id}</TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDelete(id)}
                                                    className="h-8 w-8 text-gray-500 hover:text-red-400 hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    title="Remove ID"
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

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="mt-4">
                        <Pagination>
                            <PaginationContent>
                                <PaginationItem>
                                    <PaginationPrevious
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                    />
                                </PaginationItem>
                                <span className="text-sm text-gray-500 mx-2 flex items-center">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <PaginationItem>
                                    <PaginationNext
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
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
