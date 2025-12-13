// src/app/api/events/route.ts

import { NextResponse } from "next/server";
import { google } from "googleapis";

export async function GET(req: Request) {
    try {
        const spreadsheetId = process.env.GOOGLE_SHEET_ID;
        const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
        const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

        if (!spreadsheetId || !clientEmail || !privateKey) {
            throw new Error("Missing required Google Sheet environment variables");
        }

        // 1. Authenticate
        const auth = new google.auth.JWT({
            email: clientEmail,
            key: privateKey,
            scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
        });

        const sheets = google.sheets({ version: "v4", auth });

        // 2. Fetch Spreadsheet Metadata
        const response = await sheets.spreadsheets.get({ 
            spreadsheetId, 
            fields: 'sheets.properties.title' // Request only the sheet titles
        });

        const sheetTitles = response.data.sheets
            ?.map(s => s.properties?.title)
            .filter((title): title is string => !!title) || [];
            
        // 3. Filter out the default sheet (often "Sheet1" or similar, though yours might vary)
        // You might need to adjust this filter based on your setup.
        const eventSheets = sheetTitles.filter(title => 
            // We assume a sheet name representing an event follows the YYYY_MM_DD format
            /^\d{4}_\d{2}_\d{2}$/.test(title)
        );

        // 4. Return the list of sheet titles
        return NextResponse.json(eventSheets);

    } catch (error: any) {
        console.error("❌ Error reading Google Sheet tabs:", error);
        return NextResponse.json({ error: `Internal Server Error: ${error.message}` }, { status: 500 });
    }
}