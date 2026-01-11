"use server";

import { google } from "googleapis";
import { getAdminDb } from "@/services/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

interface AttendanceRecord {
  id: string;
  name: string;
  idNumber: string;
  yearLevel: string;
  section: string;
  timestamp: string;
}

// Helper to check for admin/moderator roles in session
import { getSession } from "@/lib/session";

async function verifyStaff() {
    const session = await getSession();
    if (!session || (session.role !== 'admin' && session.role !== 'moderator')) {
        throw new Error("Unauthorized: Staff access required");
    }
}

export async function recordAttendance(data: { name: string, idNumber: string, yearLevel: string, section: string, sheetDate?: string }) {
  try {
    await verifyStaff();

    const { name, idNumber, yearLevel, section, sheetDate } = data;

    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (!spreadsheetId || !clientEmail || !privateKey) {
      throw new Error("Missing required environment variables");
    }

    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    const formattedDate = sheetDate
      ? sheetDate.replace(/-/g, "_")
      : new Date().toISOString().split("T")[0].replace(/-/g, "_");

    const finalSheetName = formattedDate;

    // Check if the sheet already exists
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const existingSheet = spreadsheet.data.sheets?.find(
      (s) => s.properties?.title === finalSheetName
    );

    if (!existingSheet) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{ addSheet: { properties: { title: finalSheetName } } }],
        },
      });

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${finalSheetName}!A1:E1`,
        valueInputOption: "RAW",
        requestBody: {
          values: [["Name", "ID Number", "Year Level", "Section", "Timestamp"]],
        },
      });
    }

    const timestamp = new Date().toLocaleString("en-PH", {
      timeZone: "Asia/Manila",
    });

    // Run both updates concurrently to speed up the response
    await Promise.all([
        sheets.spreadsheets.values.append({
            spreadsheetId,
            range: `${finalSheetName}!A:E`,
            valueInputOption: "RAW",
            requestBody: {
                values: [[name, idNumber, yearLevel, section, timestamp]],
            },
        }),
        // Real-time portal update
        (async () => {
            try {
                const adminDb = getAdminDb();
                const statsRef = adminDb.collection("attendance_stats").doc(finalSheetName);
                await statsRef.set({
                    count: FieldValue.increment(1),
                    lastUpdated: FieldValue.serverTimestamp(),
                    sheetName: finalSheetName
                }, { merge: true });
            } catch (firestoreErr) {
                console.error("Failed to update real-time attendance stats:", firestoreErr);
            }
        })()
    ]);

    return { success: true, sheet: finalSheetName };
  } catch (error: any) {
    console.error("❌ Error writing to Google Sheets:", error);
    throw new Error(error.message || "Failed to record attendance");
  }
}

export async function getAttendance(sheetDate: string) {
  try {
    await verifyStaff();

    if (!sheetDate) throw new Error("Missing sheetDate");

    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (!spreadsheetId || !clientEmail || !privateKey) {
      throw new Error("Missing required Google Sheet environment variables");
    }

    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });
    const finalSheetName = sheetDate.replace(/-/g, "_");
    const range = `${finalSheetName}!A:E`;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: range,
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) return [];

    const dataRows = rows.slice(1);
    const attendanceData: AttendanceRecord[] = dataRows.map((row, index) => ({
      id: `${finalSheetName}_${index + 2}`,
      name: row[0] || "N/A",
      idNumber: row[1] || "N/A",
      yearLevel: row[2] || "N/A",
      section: row[3] || "N/A",
      timestamp: row[4] || "N/A",
    }));

    return attendanceData;
  } catch (error: any) {
    console.error("❌ Error reading from Google Sheets:", error);
    if (error.code === 404) return [];
    throw new Error(error.message || "Failed to fetch attendance");
  }
}

export async function getAttendanceSheets() {
    try {
        await verifyStaff();

        const spreadsheetId = process.env.GOOGLE_SHEET_ID;
        const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
        const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

        if (!spreadsheetId || !clientEmail || !privateKey) {
            throw new Error("Missing environment variables");
        }

        const auth = new google.auth.JWT({
            email: clientEmail,
            key: privateKey,
            scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
        });

        const sheets = google.sheets({ version: "v4", auth });
        const res = await sheets.spreadsheets.get({ spreadsheetId });
        
        return res.data.sheets?.map(s => s.properties?.title || "").filter(Boolean) || [];
    } catch (error) {
        console.error("Error fetching attendance sheets:", error);
        return [];
    }
}
