import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { token } = req.body;

    if (!token) return res.status(400).json({ message: "No token provided" });

    res.setHeader(
        "Set-Cookie",
        `token=${token}; HttpOnly; Path=/; Max-Age=3600; SameSite=Strict; Secure`
    );
    res.status(200).json({ message: "Token set" });
}
