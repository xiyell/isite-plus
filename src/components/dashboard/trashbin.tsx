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

const getPageNumbers = (current: number, total: number, max = 5) => {
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
        <TableRow className="hover:bg-white/5 transition-colors border-b border-white/10">
            <TableCell className="border-r border-white/10 text-white p-4 text-center">
                <Badge className={typeConfig.color + " rounded-sm px-2 py-0.5 text-[10px] uppercase shadow-none border-0 inline-flex items-center"}>
                    {typeConfig.Icon && <typeConfig.Icon size={12} className="mr-1" />}
                    {item.type.toUpperCase()}
                </Badge>
                {item.status === 'disabled' && (
                    <Badge className="ml-2 bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 text-[10px] uppercase">
                        Disabled
                    </Badge>
                )}
            </TableCell>
            <TableCell className="border-r border-white/10 text-gray-200 p-4 font-medium truncate" title={item.title}>
                {item.title}
            </TableCell>
            <TableCell className="border-r border-white/10 text-gray-200 p-4 truncate hidden sm:table-cell text-center align-middle">
                {item.deletedBy}
            </TableCell>
            <TableCell className="border-r border-white/10 text-gray-200 p-4 whitespace-nowrap hidden md:table-cell text-center align-middle">
                {item.deletedAt === 'Unknown' || !item.deletedAt ? (
                    <span className="text-gray-500 text-xs">-</span>
                ) : (
                    <span className="font-mono text-xs text-gray-200">
                        {new Date(item.deletedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                )}
            </TableCell>
            <TableCell className="text-center p-4 align-middle">
                <div className="flex items-center justify-center gap-2">
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-green-400 hover:text-green-300 hover:bg-green-400/10"
                        onClick={() => onAction('restore', item)}
                        title="Restore"
                    >
                        <Undo2 size={16} />
                    </Button>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-400/10"
                        onClick={() => onAction('delete', item)}
                        title="Permanent Delete"
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
    const ITEMS_PER_PAGE = 5;

    useEffect(() => {
        const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE) || 1;
        if (page > totalPages) setPage(totalPages);
    }, [items.length, page]);

    const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
    const currentPage = Math.min(Math.max(1, page), Math.max(1, totalPages));
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedItems = items.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    return (
        <div className="space-y-4">
            {items.length > 0 && onEmpty && (
                <div className="flex justify-end">
                    <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={onEmpty}
                        disabled={disabled}
                        className="bg-red-600/20 text-white hover:bg-red-600/40 border border-red-500/30"
                    >
                        <Trash2 size={16} className="mr-2" />
                        Delete All
                    </Button>
                </div>
            )}
            <div className="border border-white/20 rounded-none bg-black/20 overflow-hidden">
                <Table className="border-collapse w-full table-fixed">
                    <TableHeader className="bg-white/10">
                        <TableRow className="border-b border-white/20">
                            <TableHead className="w-[140px] border-r border-white/10 text-white font-bold uppercase tracking-wider text-[10px] p-4 text-center align-middle">Type</TableHead>
                            <TableHead className="border-r border-white/10 text-white font-bold uppercase tracking-wider text-[10px] p-4 align-middle">Title / Identifier</TableHead>
                            <TableHead className="w-[180px] border-r border-white/10 text-white font-bold uppercase tracking-wider text-[10px] p-4 hidden sm:table-cell text-center align-middle">Deleted By</TableHead>
                            <TableHead className="w-[200px] border-r border-white/10 text-white font-bold uppercase tracking-wider text-[10px] p-4 hidden md:table-cell text-center align-middle">Deleted At</TableHead>
                            <TableHead className="w-[120px] text-white font-bold uppercase tracking-wider text-[10px] p-4 text-center align-middle">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.length === 0 ? (
                            <TableRow className="hover:bg-transparent">
                                <TableCell colSpan={5} className="text-center text-gray-500 py-10">
                                    The trash bin is empty for this category.
                                </TableCell>
                            </TableRow>
                        ) : (
                            <>
                                {paginatedItems.map(item => (
                                    <TrashRow key={item.id} item={item} onAction={onAction} />
                                ))}
                                {Array.from({ length: Math.max(0, ITEMS_PER_PAGE - paginatedItems.length) }).map((_, index) => (
                                    <TableRow key={`empty-${index}`} className="border-b border-white/10 pointer-events-none opacity-0">
                                        <TableCell className="border-r border-white/10 p-4">&nbsp;</TableCell>
                                        <TableCell className="border-r border-white/10 p-4">&nbsp;</TableCell>
                                        <TableCell className="border-r border-white/10 p-4 hidden sm:table-cell">&nbsp;</TableCell>
                                        <TableCell className="border-r border-white/10 p-4 hidden md:table-cell">&nbsp;</TableCell>
                                        <TableCell className="p-4">&nbsp;</TableCell>
                                    </TableRow>
                                ))}
                            </>
                        )}
                    </TableBody>
                </Table>
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
                            
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
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
        <div className="p-4 md:p-8 space-y-6 text-white min-h-[500px]">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-3 text-red-400">
                <Trash2 size={32} /> Trash Bin
            </h1>
            <CardDescription className="text-sm md:text-base text-gray-300">
                Items listed here have been soft-deleted and can be restored. Permanent deletion is final.
            </CardDescription>

            <Card className="bg-black/10 backdrop-blur-xl border border-white/10 shadow-2xl">
                <Tabs defaultValue="posts">
                    <CardHeader className="p-4 md:p-6 pb-0 overflow-x-auto">
                        <TabsList className="bg-white/10 backdrop-blur-sm border border-white/20 w-full justify-start md:justify-center">
                            <TabsTrigger value="posts" className="data-[state=active]:bg-indigo-600/30 data-[state=active]:text-white whitespace-nowrap">Posts ({posts.length})</TabsTrigger>
                            <TabsTrigger value="announcements" className="data-[state=active]:bg-green-600/30 data-[state=active]:text-white whitespace-nowrap">Announcements ({announcements.length})</TabsTrigger>
                            <TabsTrigger value="users" className="data-[state=active]:bg-red-600/30 data-[state=active]:text-white whitespace-nowrap">Users ({users.length})</TabsTrigger>
                            <TabsTrigger value="evaluations" className="data-[state=active]:bg-purple-600/30 data-[state=active]:text-white whitespace-nowrap">Evaluations ({evaluations.length})</TabsTrigger>
                            <TabsTrigger value="ibot" className="data-[state=active]:bg-blue-600/30 data-[state=active]:text-white whitespace-nowrap">iBot ({ibotItems.length})</TabsTrigger>
                        </TabsList>
                    </CardHeader>
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