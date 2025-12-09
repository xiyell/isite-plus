'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle, XCircle, Clock, Loader2, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// --- Data Structure (Matching a Post Submission) ---
export interface PendingPost {
    id: string;
    authorId: string;
    authorUsername: string;
    title: string;
    contentSnippet: string;
    timestamp: string;
    category: string;
    status: 'pending' | 'accepted' | 'rejected';
}

interface PendingPostsContentProps {
    // Allow null/undefined from parent state
    posts: PendingPost[] | null | undefined;
    onApprove: (id: string) => Promise<void> | void;
    onReject: (id: string) => Promise<void> | void;
    isLoading?: boolean;
}

// --- Main Dashboard Component ---

export default function PendingPostsDashboard({ posts, onApprove, onReject, isLoading = false }: PendingPostsContentProps) {

    // ✅ FIX: Use Array.isArray() to guarantee that postList is an iterable array before mapping.
    const postList = Array.isArray(posts) ? posts : [];

    // --- Helper Component for Table Rows (APPLIED GLASSY STYLES) ---
    const PostRow = ({ post }: { post: PendingPost }) => (
        // Glassy row hover effect
        <TableRow className="hover:bg-white/10 border-white/10 text-white">

            {/* Time & Author */}
            <TableCell className="w-[180px] whitespace-nowrap">
                <p className="font-medium text-sm text-white">{post.authorUsername}</p>
                <p className="text-xs text-gray-400">{post.timestamp}</p>
            </TableCell>

            {/* Title & Content Snippet */}
            <TableCell className="font-medium">
                <div className="flex items-center space-x-2 mb-1">
                    <Badge variant="secondary" className="bg-yellow-600/30 text-yellow-300 border-yellow-600/20">{post.category}</Badge>
                    {post.authorId === 'u123' && <Badge className="bg-blue-500/30 text-blue-300 border-blue-500/20">First Post</Badge>}
                </div>
                <p className="text-base text-white">{post.title}</p>
                <p className="text-sm text-gray-400 italic truncate w-full max-w-xl">
                    {post.contentSnippet}...
                </p>
            </TableCell>

            {/* Actions */}
            <TableCell className="text-right w-[200px] space-x-2 flex-shrink-0">
                <Button variant="outline" size="sm" onClick={() => alert(`Reviewing post ${post.id}`)} className="text-indigo-400 border-indigo-400/50 hover:bg-indigo-600/10">
                    <MessageSquare className="h-4 w-4 mr-2" /> Review
                </Button>
                <Button variant="destructive" size="sm" onClick={() => onReject(post.id)}>
                    <XCircle className="h-4 w-4" />
                </Button>
                <Button className="bg-green-600 hover:bg-green-700" size="sm" onClick={() => onApprove(post.id)}>
                    <CheckCircle className="h-4 w-4" />
                </Button>
            </TableCell>
        </TableRow>
    );

    return (
        // Glassy outer container
        <div className="space-y-8 bg-transparent text-white">

            {/* Dashboard Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-100">Post Moderation Queue</h1>
                <Button variant="outline" className="text-gray-300 border-white/20 hover:bg-white/10">
                    <Clock className="h-4 w-4 mr-2" /> View Rejected Archive
                </Button>
            </div>

            {/* Summary Card (APPLIED GLASSY STYLES) */}
            <Card className="border-l-4 border-l-yellow-500 bg-black/10 border-white/10 backdrop-blur-xl shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-200">
                        Total Pending Posts
                    </CardTitle>
                    <Clock className="h-4 w-4 text-gray-400" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-white">{postList.length}</div>
                    <p className="text-xs text-gray-400">
                        Items need review. Oldest pending item is from: {postList.length > 0 ? postList[0].timestamp : 'N/A'}
                    </p>
                </CardContent>
            </Card>

            {/* Pending Posts Table (APPLIED GLASSY STYLES) */}
            <Card className="bg-black/10 border-white/10 backdrop-blur-xl shadow-xl overflow-x-auto">
                <CardHeader>
                    <CardTitle className="text-gray-200">Moderation Queue ({postList.length} Items)</CardTitle>
                </CardHeader>
                <CardContent>
                    {/* Table Container */}
                    <Table className="min-w-full md:min-w-0">
                        <TableHeader>
                            <TableRow className="bg-black/30 border-white/20 hover:bg-black/30">
                                <TableHead className="w-[180px] text-gray-300">Author & Time</TableHead>
                                <TableHead className="text-gray-300">Post Details</TableHead>
                                <TableHead className="text-right w-[200px] text-gray-300">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow className="hover:bg-transparent">
                                    <TableCell colSpan={3} className="text-center text-gray-400 py-10">
                                        <Loader2 className="h-5 w-5 mr-2 animate-spin inline" /> Loading posts...
                                    </TableCell>
                                </TableRow>
                            ) : (
                                // This is now safe because postList is guaranteed to be an array
                                postList.map(post => (
                                    <PostRow key={post.id} post={post} />
                                ))
                            )}
                            {postList.length === 0 && !isLoading && (
                                <TableRow className="hover:bg-transparent">
                                    <TableCell colSpan={3} className="text-center text-gray-500 py-10">
                                        Queue is empty! All posts have been reviewed. 🥳
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}