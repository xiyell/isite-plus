"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  MessageSquare,
} from "lucide-react";

import { db } from "@/services/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";

import { useAuth } from "@/services/auth";

/* ───────────────────────────────────────────── */
/* TYPES                                        */
/* ───────────────────────────────────────────── */

interface PendingPost {
  id: string;
  authorId: string;
  authorUsername: string;
  title: string;
  contentSnippet: string;
  timestamp: string;
  category: string;
  status: "pending" | "approved" | "rejected";
}

/* ───────────────────────────────────────────── */
/* PAGE                                         */
/* ───────────────────────────────────────────── */

export default function AdminPostModerationPage() {
  const { user } = useAuth(); // must expose uid
  const [posts, setPosts] = useState<PendingPost[]>([]);
  const [loading, setLoading] = useState(true);

  /* ─────────── ADMIN CHECK ─────────── */

  async function assertAdmin(uid: string) {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists() || snap.data().role !== "admin") {
      throw new Error("Not authorized");
    }
  }

  /* ─────────── FETCH POSTS ─────────── */

  async function loadPendingPosts() {
    if (!user?.uid) return;

    setLoading(true);
    await assertAdmin(user.uid);

    const q = query(
      collection(db, "community"),
      where("status", "==", "pending")
    );

    const snap = await getDocs(q);
    const results: PendingPost[] = [];

    for (const d of snap.docs) {
      const data = d.data();
      const userSnap = await getDoc(data.postedBy);

      results.push({
        id: d.id,
        authorId: data.postedBy.id,
        authorUsername: userSnap.exists()
          ? userSnap.data().name
          : "Unknown",
        title: data.title,
        contentSnippet: data.description,
        timestamp: data.createdAt.toDate().toLocaleString(),
        category: data.category,
        status: data.status,
      });
    }

    setPosts(results);
    setLoading(false);
  }

  /* ─────────── UPDATE STATUS ─────────── */

  async function updateStatus(
    postId: string,
    status: "approved" | "rejected"
  ) {
    if (!user?.uid) return;

    await assertAdmin(user.uid);

    await updateDoc(doc(db, "community", postId), {
      status,
    });

    setPosts(prev => prev.filter(p => p.id !== postId));
  }

  /* ─────────── EFFECT ─────────── */

  useEffect(() => {
    loadPendingPosts();
  }, [user?.uid]);

  /* ───────────────────────────────────────────── */
  /* UI                                           */
  /* ───────────────────────────────────────────── */

  return (
    <div className="space-y-8 bg-transparent text-white">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <h1 className="text-4xl font-bold text-gray-100">
          Post Moderation Queue
        </h1>
        <Button
          variant="outline"
          className="text-gray-300 border-white/20 hover:bg-white/10"
        >
          <Clock className="h-4 w-4 mr-2" />
          View Rejected Archive
        </Button>
      </div>

      {/* Summary */}
      <Card className="bg-black/10 border-white/10 backdrop-blur-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-gray-300">
            Total Pending Posts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{posts.length}</div>
          <p className="text-xs text-gray-400">
            Oldest pending: {posts[0]?.timestamp ?? "N/A"}
          </p>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-black/10 border-white/10 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-gray-200">
            Moderation Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-black/30">
                <TableHead className="text-gray-300">
                  Author & Time
                </TableHead>
                <TableHead className="text-gray-300">
                  Post Details
                </TableHead>
                <TableHead className="text-right text-gray-300">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-10">
                    <Loader2 className="inline h-5 w-5 animate-spin mr-2" />
                    Loading posts...
                  </TableCell>
                </TableRow>
              )}

              {!loading &&
                posts.map(post => (
                  <TableRow
                    key={post.id}
                    className="hover:bg-white/10"
                  >
                    <TableCell>
                      <p className="font-medium">{post.authorUsername}</p>
                      <p className="text-xs text-gray-400">
                        {post.timestamp}
                      </p>
                    </TableCell>

                    <TableCell>
                      <div className="flex gap-2 mb-1">
                        <Badge className="bg-yellow-600/30 text-yellow-300">
                          {post.category}
                        </Badge>
                      </div>
                      <p className="text-white">{post.title}</p>
                      <p className="text-sm text-gray-400 truncate max-w-xl">
                        {post.contentSnippet}
                      </p>
                    </TableCell>

                    <TableCell className="text-right space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-indigo-400 border-indigo-400/50"
                        onClick={() =>
                          alert(`Reviewing post ${post.id}`)
                        }
                      >
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Review
                      </Button>

                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() =>
                          updateStatus(post.id, "rejected")
                        }
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>

                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() =>
                          updateStatus(post.id, "approved")
                        }
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}

              {!loading && posts.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-center text-gray-500 py-10"
                  >
                    Queue is empty 🎉
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
