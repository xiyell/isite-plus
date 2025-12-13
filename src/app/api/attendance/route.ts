import { NextResponse } from "next/server";
import { google } from "googleapis";

interface AttendanceRecord {
  id: string;
  name: string;
  idNumber: string;
  yearLevel: string;
  section: string;
  timestamp: string;
}

export async function POST(req: Request) {
  try {
    const { name, idNumber, yearLevel, section, sheetDate } = await req.json();

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

    // ✅ Use date as sheet name (formatted like 2025_10_20)
    const formattedDate = sheetDate
      ? sheetDate.replace(/-/g, "_")
      : new Date().toISOString().split("T")[0].replace(/-/g, "_");

    const finalSheetName = formattedDate;
    console.log("📄 Writing to sheet:", finalSheetName);

    // Check if the sheet already exists
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const existingSheet = spreadsheet.data.sheets?.find(
      (s) => s.properties?.title === finalSheetName
    );

    // Create sheet if it doesn’t exist
    if (!existingSheet) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{ addSheet: { properties: { title: finalSheetName } } }],
        },
      });

      // Add headers
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

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${finalSheetName}!A:E`,
      valueInputOption: "RAW",
      requestBody: {
        values: [[name, idNumber, yearLevel, section, timestamp]],
      },
    });

    return NextResponse.json({ success: true, sheet: finalSheetName });
  } catch (error: any) {
    console.error("❌ Error writing to Google Sheets:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const sheetDate = url.searchParams.get("sheetDate");

        if (!sheetDate) {
            return NextResponse.json({ error: "Missing sheetDate query parameter" }, { status: 400 });
        }

        const spreadsheetId = process.env.GOOGLE_SHEET_ID;
        const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
        const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

        if (!spreadsheetId || !clientEmail || !privateKey) {
            throw new Error("Missing required Google Sheet environment variables");
        }

        // 1. Authenticate with Google Sheets
        const auth = new google.auth.JWT({
            email: clientEmail,
            key: privateKey,
            scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"], // Read-only scope is sufficient
        });

        const sheets = google.sheets({ version: "v4", auth });

        // 2. Format date to match the Sheet Tab name (e.g., 2025-12-14 -> 2025_12_14)
        const finalSheetName = sheetDate.replace(/-/g, "_");
        
        // Use a wide range to fetch all data, assuming attendance is recorded row-by-row
        const range = `${finalSheetName}!A:E`; 

        console.log("🔍 Reading from sheet:", finalSheetName);

        // 3. Read data from the Google Sheet
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: range,
        });

        const rows = response.data.values;

        if (!rows || rows.length <= 1) {
            // No data found, or only headers exist
            return NextResponse.json([]);
        }

        // The first row is the header, which we skip
        // Headers: ["Name", "ID Number", "Year Level", "Section", "Timestamp"]
        const dataRows = rows.slice(1); 

        // 4. Process and Map the data to AttendanceRecord[] format
        const attendanceData: AttendanceRecord[] = dataRows.map((row, index) => ({
            // Use the row index + 2 (1 for header, 1 for 0-based index) as a simple unique ID
            id: `${finalSheetName}_${index + 2}`, 
            name: row[0] || "N/A",
            idNumber: row[1] || "N/A",
            yearLevel: row[2] || "N/A",
            section: row[3] || "N/A",
            timestamp: row[4] || "N/A", // This should be a valid date string
        }));
        
        // 5. Return the JSON data
        return NextResponse.json(attendanceData);

    } catch (error: any) {
        console.error("❌ Error reading from Google Sheets:", error);
        // Specifically catch a 404 error if the sheet doesn't exist
        if (error.code === 404) {
             return NextResponse.json({ error: `Attendance sheet not found for date` }, { status: 404 });
        }
        return NextResponse.json({ error: `Internal Server Error: ${error.message}` }, { status: 500 });
    }
}