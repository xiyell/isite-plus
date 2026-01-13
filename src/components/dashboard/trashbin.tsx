"use client";

import { useEffect, useState } from "react";
import { getTrash, restoreItem, permanentlyDeleteItem, emptyTrash, TrashedItem, TrashType } from "@/actions/recyclebin";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Trash2, Undo2, XCircle, Users, Send, Loader2, Bot, AlertTriangle, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";

import { useToast } from "@/components/ui/use-toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useMemo } from "react";
import { Activity } from "lucide-react";

// ---------------- ICON HELPERS ----------------
const getIconConfig = (type: TrashedItem['type']) => {
    switch (type) {
        case 'post': return { Icon: Send, color: 'bg-indigo-600/30 text-indigo-300' };
        case 'announcement': return { Icon: Send, color: 'bg-green-600/30 text-green-300' };
        case 'user': return { Icon: Users, color: 'bg-red-600/30 text-red-300' };
        case 'evaluation': return { Icon: Send, color: 'bg-purple-600/30 text-purple-300' };
        case 'ibot': return { Icon: Bot, color: 'bg-blue-600/30 text-blue-300' };
        default: return { Icon: Send, color: 'bg-gray-600/30 text-gray-300' };
    }
};

const getPageNumbers = (current: number, total: number, max = 3) => {
    const pages: number[] = [];
    let start = Math.max(1, current - Math.floor(max / 2));
    let end = Math.min(total, start + max - 1);
    if (end - start + 1 < max) start = Math.max(1, end - max + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
};

// ---------------- SUB-COMPONENTS ----------------

interface TrashRowProps {
    item: TrashedItem;
    onAction: (action: 'restore' | 'delete', item: TrashedItem) => void;
}

const TrashRow = ({ item, onAction }: TrashRowProps) => {
    const typeConfig = getIconConfig(item.type);
    return (
        <TableRow className="group hover:bg-white/5 transition-all duration-200 border-b border-white/5 last:border-0 h-16">
            <TableCell className="pl-6 text-center">
                <Badge className={typeConfig.color + " rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase shadow-lg shadow-black/40 border-0 inline-flex items-center"}>
                    {typeConfig.Icon && <typeConfig.Icon size={10} className="mr-1" />}
                    {item.type}
                </Badge>
            </TableCell>
            <TableCell className="text-[11px] font-bold text-white/90 truncate pr-4" title={item.title}>
                {item.title}
            </TableCell>
            <TableCell className="text-center">
                <div className="flex flex-col items-center">
                    <span className="text-[11px] font-bold text-white/80">{item.deletedBy}</span>
                    <span className="text-[9px] font-black uppercase tracking-tighter text-indigo-400/60 leading-none">Admin</span>
                </div>
            </TableCell>
            <TableCell className="text-center font-mono text-[10px] text-zinc-400">
                {item.deletedAt === 'Unknown' || !item.deletedAt ? "-" : new Date(item.deletedAt).toLocaleString()}
            </TableCell>
            <TableCell className="pr-6 text-center">
                <div className="flex items-center justify-center gap-1.5">
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-green-400 hover:text-green-300 hover:bg-green-400/10 rounded-lg"
                        onClick={() => onAction('restore', item)}
                    >
                        <Undo2 size={16} />
                    </Button>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg"
                        onClick={() => onAction('delete', item)}
                    >
                        <XCircle size={16} />
                    </Button>
                </div>
            </TableCell>
        </TableRow>
    );
};

interface TrashTableProps {
    items: TrashedItem[];
    onAction: (action: 'restore' | 'delete', item: TrashedItem) => void;
    onEmpty?: () => void;
    disabled?: boolean;
}

const TrashTable = ({ items, onAction, onEmpty, disabled }: TrashTableProps) => {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const ITEMS_PER_PAGE = 5;

    const filteredItems = useMemo(() => {
        return items.filter(item => 
            item.title.toLowerCase().includes(search.toLowerCase()) ||
            item.deletedBy.toLowerCase().includes(search.toLowerCase())
        );
    }, [items, search]);

    useEffect(() => {
        const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE) || 1;
        if (page > totalPages) setPage(totalPages);
    }, [filteredItems.length, page]);

    const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
    const currentPage = Math.min(Math.max(1, page), Math.max(1, totalPages));
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedItems = filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="relative w-full md:max-w-xs">
                    <input
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        placeholder="Search deleted items..."
                        className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                </div>
                {items.length > 0 && onEmpty && (
                    <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={onEmpty}
                        disabled={disabled}
                        className="bg-red-600/20 text-white hover:bg-red-600/30 border border-red-500/30 rounded-xl"
                    >
                        <Trash2 size={16} className="mr-2" />
                        Empty Category
                    </Button>
                )}
            </div>

            {/* DESKTOP VIEW */}
            <div className="hidden lg:block border border-white/10 rounded-xl bg-black/40 overflow-hidden shadow-inner">
                <Table className="border-collapse w-full table-fixed">
                    <TableHeader className="bg-white/5">
                        <TableRow className="border-b border-white/10 hover:bg-transparent">
                            <TableHead className="w-[140px] text-zinc-400 font-bold uppercase tracking-widest text-[10px] py-4 pl-6 text-center">Type</TableHead>
                            <TableHead className="text-zinc-400 font-bold uppercase tracking-widest text-[10px] py-4">Title / Identifier</TableHead>
                            <TableHead className="w-[180px] text-zinc-400 font-bold uppercase tracking-widest text-[10px] py-4 text-center">Deleted By</TableHead>
                            <TableHead className="w-[200px] text-zinc-400 font-bold uppercase tracking-widest text-[10px] py-4 text-center">Deleted At</TableHead>
                            <TableHead className="w-[120px] text-zinc-400 font-bold uppercase tracking-widest text-[10px] py-4 pr-6 text-center">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredItems.length === 0 ? (
                            <TableRow className="hover:bg-transparent">
                                <TableCell colSpan={5} className="text-center text-gray-500 py-16">
                                    <Trash2 className="mx-auto h-8 w-8 mb-3 opacity-20" />
                                    No items found in this category.
                                </TableCell>
                            </TableRow>
                        ) : (
                            <>
                                {paginatedItems.map(item => (
                                    <TrashRow key={item.id} item={item} onAction={onAction} />
                                ))}
                            </>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* MOBILE VIEW */}
            <div className="lg:hidden space-y-4">
                {paginatedItems.map((item) => {
                    const config = getIconConfig(item.type);
                    return (
                        <div key={item.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4 transition-all hover:border-indigo-500/30">
                            <div className="flex justify-between items-start gap-4">
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className={`p-2.5 rounded-xl bg-white/5 border border-white/10 shrink-0`}>
                                        <config.Icon size={18} className={config.color.split(' ')[1]} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">{item.type}</p>
                                        <h4 className="text-xs font-bold text-white break-words">{item.title}</h4>
                                    </div>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-9 w-9 bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded-xl border border-green-500/20"
                                        onClick={() => onAction('restore', item)}
                                    >
                                        <Undo2 size={16} />
                                    </Button>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-9 w-9 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-xl border border-red-500/20"
                                        onClick={() => onAction('delete', item)}
                                    >
                                        <XCircle size={16} />
                                    </Button>
                                </div>
                            </div>
                            <div className="flex justify-between items-end pt-3 border-t border-white/5">
                                <div className="flex flex-col">
                                    <span className="text-[9px] text-zinc-500 uppercase font-black tracking-tighter mb-0.5">Deleted By</span>
                                    <span className="text-[11px] font-bold text-white/90">{item.deletedBy}</span>
                                </div>
                                <span className="text-[10px] font-mono text-zinc-500 italic">
                                    {item.deletedAt && item.deletedAt !== 'Unknown' ? new Date(item.deletedAt).toLocaleDateString() : 'N/A'}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>


            {/* Pagination */}
            {items.length > ITEMS_PER_PAGE && (
                <div className="flex justify-center pt-4">
                    <Pagination>
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious
                                    href="#"
                                    onClick={(e) => { e.preventDefault(); setPage(p => Math.max(1, p - 1)); }}
                                    className={page === 1 || disabled ? 'opacity-50 pointer-events-none text-gray-400' : 'cursor-pointer text-gray-300 hover:text-white'}
                                    aria-label="Previous page"
                                />
                            </PaginationItem>
                            
                            {getPageNumbers(page, totalPages).map((p) => (
                                <PaginationItem key={p}>
                                    <PaginationLink
                                        href="#"
                                        onClick={(e) => { e.preventDefault(); setPage(p); }}
                                        isActive={p === page}
                                        className={p === page
                                            ? "bg-indigo-600 text-white border-indigo-500 hover:bg-indigo-700 hover:text-white"
                                            : "text-gray-400 hover:text-white"
                                        }
                                    >
                                        {p}
                                    </PaginationLink>
                                </PaginationItem>
                            ))}

                            <PaginationItem>
                                <PaginationNext
                                    href="#"
                                    onClick={(e) => { e.preventDefault(); setPage(p => Math.min(totalPages, p + 1)); }}
                                    className={page >= totalPages || disabled ? 'opacity-50 pointer-events-none text-gray-400' : 'cursor-pointer text-gray-300 hover:text-white'}
                                    aria-label="Next page"
                                />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </div>
            )}
        </div>
    );
};

// ---------------- MAIN COMPONENT ----------------

export default function TrashBinDashboard() {
    const [trashItems, setTrashItems] = useState<TrashedItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const { toast } = useToast();

    const [confirmState, setConfirmState] = useState<{
        isOpen: boolean;
        action: 'restore' | 'delete' | 'empty' | null;
        id: string;
        type: string;
        title: string;
    }>({ isOpen: false, action: null, id: '', type: '', title: '' });

    // ---------------- FETCHING LOGIC ----------------
    const loadTrash = async () => {
        setLoading(true);
        try {
            console.log("Trashbin: Fetching deleted items via Server Action...");
            const items = await getTrash();
            console.log("Trashbin: Fetched items:", items);
            setTrashItems(items);
        } catch (error) {
            console.error("Trashbin: Error fetching trash:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to load trash bin (Server Error).",
            });
        } finally {
            setLoading(false);
        }
    };

    // Expose refresh function/effect
    useEffect(() => {
        loadTrash();
        
        // Optional: Poll every 30s to keep it fresh
        const interval = setInterval(loadTrash, 30000);
        return () => clearInterval(interval);
    }, []);

    // ---------------- ACTIONS ----------------
    const handleActionRequest = (action: 'restore' | 'delete', item: TrashedItem) => {
        setConfirmState({
            isOpen: true,
            action,
            id: item.id,
            type: item.type,
            title: item.title
        });
    };

    const handleEmptyRequest = (type: string) => {
        setConfirmState({
            isOpen: true,
            action: 'empty',
            id: '',
            type,
            title: `All ${type}s`
        });
    };

    const handleRestore = async (id: string, type: string) => {
        setIsProcessing(true);
        try {
            await restoreItem(id, type as TrashType);
            toast({ title: "Restored", description: type + " restored successfully.", variant: "success" });
            await loadTrash(); // refresh
        } catch (e) {
            console.error("Restore failed", e);
            toast({ variant: "destructive", title: "Restore failed", description: "Could not restore item." });
        } finally {
            setIsProcessing(false);
        }
    };

    const handlePermanentDelete = async (id: string, type: string) => {
        setIsProcessing(true);
        try {
            await permanentlyDeleteItem(id, type as TrashType);
            toast({ title: "Deleted", description: type + " permanently deleted.", variant: "default" });
            await loadTrash(); // refresh
        } catch (e) {
            console.error("Delete failed", e);
            toast({ variant: "destructive", title: "Delete failed", description: "Could not handle item." });
        } finally {
            setIsProcessing(false);
        }
    };

    // ---------------- STATE DERIVATION ----------------
    const posts = trashItems.filter(item => item.type === 'post');
    const announcements = trashItems.filter(item => item.type === 'announcement');
    const users = trashItems.filter(item => item.type === 'user');
    const evaluations = trashItems.filter(item => item.type === 'evaluation');
    const ibotItems = trashItems.filter(item => item.type === 'ibot');

    return (
        <div className="p-4 md:p-8 space-y-8 text-white min-h-[500px] font-outfit">
            <div className="flex flex-col gap-2">
                <h1 className="text-4xl font-extrabold tracking-tight flex items-center gap-3 text-red-500">
                    <Trash2 size={36} /> Trash Bin
                </h1>
                <p className="text-zinc-400 text-sm md:text-base font-medium">
                    Manage soft-deleted items across all platforms. You can restore them or delete them permanently.
                </p>
            </div>

            <Card className="bg-black/10 backdrop-blur-xl border border-white/10 shadow-2xl">
                <Tabs defaultValue="posts">
                    <div className="p-4 border-b border-white/5 bg-white/5 backdrop-blur-md rounded-t-2xl">
                        <div className="w-full overflow-x-auto pb-1 scrollbar-hide">
                            <TabsList className="bg-white/5 h-11 p-1 rounded-xl flex gap-1 w-max border border-white/10">
                                <TabsTrigger value="posts" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-[11px] font-bold uppercase tracking-wider px-6 rounded-lg transition-all">Posts ({posts.length})</TabsTrigger>
                                <TabsTrigger value="announcements" className="data-[state=active]:bg-green-600 data-[state=active]:text-white text-[11px] font-bold uppercase tracking-wider px-6 rounded-lg transition-all">Announcements ({announcements.length})</TabsTrigger>
                                <TabsTrigger value="users" className="data-[state=active]:bg-red-600 data-[state=active]:text-white text-[11px] font-bold uppercase tracking-wider px-6 rounded-lg transition-all">Users ({users.length})</TabsTrigger>
                                <TabsTrigger value="evaluations" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-[11px] font-bold uppercase tracking-wider px-6 rounded-lg transition-all">Evaluations ({evaluations.length})</TabsTrigger>
                                <TabsTrigger value="ibot" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-[11px] font-bold uppercase tracking-wider px-6 rounded-lg transition-all">iBot ({ibotItems.length})</TabsTrigger>
                            </TabsList>
                        </div>
                    </div>
                    <CardContent className="pt-6">
                        {loading ? (
                            <div className="flex justify-center items-center h-40 text-gray-400">
                                <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
                                <span className="ml-2">Loading trash bin...</span>
                            </div>
                        ) : (
                            <>
                                <TabsContent value="posts">
                                    <TrashTable items={posts} onAction={handleActionRequest} onEmpty={() => handleEmptyRequest('post')} disabled={isProcessing} />
                                </TabsContent>
                                <TabsContent value="announcements">
                                    <TrashTable items={announcements} onAction={handleActionRequest} onEmpty={() => handleEmptyRequest('announcement')} disabled={isProcessing} />
                                </TabsContent>
                                <TabsContent value="users">
                                    <TrashTable items={users} onAction={handleActionRequest} onEmpty={() => handleEmptyRequest('user')} disabled={isProcessing} />
                                </TabsContent>
                                <TabsContent value="evaluations">
                                    <TrashTable items={evaluations} onAction={handleActionRequest} onEmpty={() => handleEmptyRequest('evaluation')} disabled={isProcessing} />
                                </TabsContent>
                                <TabsContent value="ibot">
                                    <TrashTable items={ibotItems} onAction={handleActionRequest} onEmpty={() => handleEmptyRequest('ibot')} disabled={isProcessing} />
                                </TabsContent>
                            </>
                        )}
                    </CardContent>
                </Tabs>
            </Card>

            <ConfirmDialog
                isOpen={confirmState.isOpen}
                onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
                isLoading={isProcessing}
                onConfirm={async () => {
                    if (confirmState.action === 'restore') {
                        await handleRestore(confirmState.id, confirmState.type);
                    } else if (confirmState.action === 'delete') {
                        await handlePermanentDelete(confirmState.id, confirmState.type);
                    } else if (confirmState.action === 'empty') {
                         setIsProcessing(true);
                         try {
                            await emptyTrash(confirmState.type as TrashType);
                            toast({ title: "Trash Emptied", description: `All ${confirmState.type}s deleted.`, variant: "default" });
                            await loadTrash();
                         } catch(e) { 
                             console.error("Empty trash failed", e);
                             toast({ variant: "destructive", title: "Action Failed", description: "Could not empty trash." });
                         } finally { setIsProcessing(false); }
                    }
                    setConfirmState(prev => ({ ...prev, isOpen: false }));
                }}
                title={
                    confirmState.action === 'restore' ? "Restore Item?" : 
                    confirmState.action === 'empty' ? "Empty Trash?" : "Permanently Delete?"
                }
                description={
                    confirmState.action === 'restore'
                    ? `Are you sure you want to restore this ${confirmState.type}: "${confirmState.title}"?`
                    : confirmState.action === 'empty'
                    ? `Are you sure you want to PERMANENTLY delete ALL ${confirmState.type}s? This cannot be undone.`
                    : `PERMANENTLY delete ${confirmState.type}: "${confirmState.title}"? This action CANNOT be undone.`
                }
                confirmText={
                    confirmState.action === 'restore' ? "Yes, restore" : 
                    confirmState.action === 'empty' ? "Yes, Empty Trash" : "Yes, delete permanently"
                }
                variant={confirmState.action === 'restore' ? "default" : "destructive"}
            />
        </div>
    );
}