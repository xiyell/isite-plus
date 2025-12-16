'use client';

import { useEffect, useState } from "react";
import { collection, getDocs, query, where, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "@/services/firebase";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Trash2, Undo2, XCircle, Users, Send, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// ---------------- TYPES ----------------
export interface TrashedItem {
    id: string;
    type: 'post' | 'announcement' | 'user';
    title: string;
    deletedBy: string;
    deletedAt: string;
}

export default function TrashBinDashboard() {
    const [trashItems, setTrashItems] = useState<TrashedItem[]>([]);
    const [loading, setLoading] = useState(true);

    // ---------------- FETCH SOFT-DELETED ITEMS ----------------
    const fetchTrash = async () => {
        setLoading(true);
        const items: TrashedItem[] = [];

        // 1️⃣ Community Posts
        const postsSnap = await getDocs(
            query(collection(db, "community"), where("status", "==", "deleted"))
        );
        postsSnap.forEach(docSnap => {
            const data = docSnap.data();
            items.push({
                id: docSnap.id,
                type: "post",
                title: data.title || "Untitled Post",
                deletedBy: data.deletedBy?.path || "Unknown",
                deletedAt: data.deletedAt?.toDate().toLocaleString() || "Unknown",
            });
        });

        // 2️⃣ Announcements
        const annSnap = await getDocs(
            query(collection(db, "announcements"), where("status", "==", "deleted"))
        );
        annSnap.forEach(docSnap => {
            const data = docSnap.data();
            items.push({
                id: docSnap.id,
                type: "announcement",
                title: data.title || "Untitled Announcement",
                deletedBy: data.deletedBy?.path || "Unknown",
                deletedAt: data.deletedAt?.toDate().toLocaleString() || "Unknown",
            });
        });

        // 3️⃣ Users
        const usersSnap = await getDocs(
            query(collection(db, "users"), where("status", "==", "deleted"))
        );
        usersSnap.forEach(docSnap => {
            const data = docSnap.data();
            items.push({
                id: docSnap.id,
                type: "user",
                title: data.name || data.email || "Unknown User",
                deletedBy: data.deletedBy?.path || "Unknown",
                deletedAt: data.deletedAt?.toDate().toLocaleString() || "Unknown",
            });
        });

        setTrashItems(items);
        setLoading(false);
    };

    useEffect(() => {
        fetchTrash();
    }, []);

    // ---------------- RESTORE ----------------
    const handleRestore = async (id: string, type: string) => {
        let collectionName = type === "post" ? "community" : type === "announcement" ? "announcements" : "users";
        const docRef = doc(db, collectionName, id);
        
        await updateDoc(docRef, { status: "approved", deletedBy: null, deletedAt: null });
        fetchTrash(); // refresh
    };

    // ---------------- PERMANENT DELETE ----------------
    const handlePermanentDelete = async (id: string, type: string) => {
        let collectionName = type === "post" ? "community" : type === "announcement" ? "announcements" : "users";
        const docRef = doc(db, collectionName, id);
        await deleteDoc(docRef);
        fetchTrash(); // refresh
    };

    // ---------------- ICON HELPERS ----------------
    const getIconConfig = (type: TrashedItem['type']) => {
        switch (type) {
            case 'post': return { Icon: Send, color: 'bg-indigo-600/30 text-indigo-300' };
            case 'announcement': return { Icon: Send, color: 'bg-green-600/30 text-green-300' };
            case 'user': return { Icon: Users, color: 'bg-red-600/30 text-red-300' };
        }
    };

    // ---------------- TRASH ROW ----------------
    const TrashRow = ({ item }: { item: TrashedItem }) => {
        const typeConfig = getIconConfig(item.type);
        return (
            <TableRow className="border-white/10 hover:bg-white/10 text-gray-200">
                <TableCell className="w-[100px] sm:w-[120px] whitespace-nowrap">
                    <Badge className={typeConfig.color}>
                        {typeConfig.Icon && <typeConfig.Icon size={14} className="mr-1" />}
                        {item.type.toUpperCase()}
                    </Badge>
                </TableCell>
                <TableCell className="font-medium text-white max-w-xs truncate">{item.title}</TableCell>
                <TableCell className="text-gray-400 hidden sm:table-cell">{item.deletedBy}</TableCell>
                <TableCell className="text-gray-400 hidden md:table-cell whitespace-nowrap">{item.deletedAt}</TableCell>
                <TableCell className="text-right w-[100px] sm:w-[180px]">
                    <div className="flex flex-col sm:flex-row justify-end gap-1">
                        <Button size="icon" variant="outline" className="text-green-500 border-green-500/50 hover:bg-green-500/10 w-full sm:w-8" onClick={() => handleRestore(item.id, item.type)} title="Restore">
                            <Undo2 size={16} />
                        </Button>
                        <Button size="icon" variant="destructive" className="w-full sm:w-8" onClick={() => {
                            if (window.confirm(`PERMANENTLY delete ${item.type}: "${item.title}"?`)) handlePermanentDelete(item.id, item.type);
                        }} title="Permanent Delete">
                            <XCircle size={16} />
                        </Button>
                    </div>
                </TableCell>
            </TableRow>
        );
    };

    // ---------------- TABLE ----------------
    const TrashTable = ({ items }: { items: TrashedItem[] }) => (
        <div className="overflow-x-auto border border-white/10 rounded-lg">
            <Table className="min-w-[600px] md:min-w-full">
                <TableHeader className="bg-black/20">
                    <TableRow className="hover:bg-transparent border-white/10">
                        <TableHead className="w-[100px] sm:w-[120px] text-gray-300 whitespace-nowrap">Type</TableHead>
                        <TableHead className="text-gray-300 whitespace-nowrap">Title / Identifier</TableHead>
                        <TableHead className="text-gray-300 hidden sm:table-cell whitespace-nowrap">Deleted By</TableHead>
                        <TableHead className="text-gray-300 hidden md:table-cell whitespace-nowrap">Deleted At</TableHead>
                        <TableHead className="text-right w-[100px] sm:w-[180px] text-gray-300 whitespace-nowrap">Actions</TableHead>
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
                        items.map(item => <TrashRow key={item.id} item={item} />)
                    )}
                </TableBody>
            </Table>
        </div>
    );

    // ---------------- GROUPED ITEMS ----------------
    const posts = trashItems.filter(item => item.type === 'post');
    const announcements = trashItems.filter(item => item.type === 'announcement');
    const users = trashItems.filter(item => item.type === 'user');

    return (
        <div className="p-4 md:p-8 space-y-6 text-white">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-3 text-red-400">
                <Trash2 size={28} className="md:size-32" /> Trash Bin
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
                                <TabsContent value="posts"><TrashTable items={posts} /></TabsContent>
                                <TabsContent value="announcements"><TrashTable items={announcements} /></TabsContent>
                                <TabsContent value="users"><TrashTable items={users} /></TabsContent>
                            </>
                        )}
                    </CardContent>
                </Tabs>
            </Card>
        </div>
    );
}