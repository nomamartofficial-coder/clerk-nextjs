import { getAuth } from "@clerk/nextjs/server";
import authSeller from "@/middleware/authSeller";
import { databaseUnavailableResponse, isDatabaseConnectivityError } from "@/lib/db-errors";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";


// Auth Seller
export async function GET(request) {
    try {
        const { userId } = getAuth(request)
        const isSeller = await authSeller(userId)

        if (!isSeller) {
            return NextResponse.json({ error: "not authorized" }, { status: 401 });
        }

        const storeInfo = await prisma.store.findUnique({where: {userId }})

        return NextResponse.json({isSeller, storeInfo})
    } catch (error) {
        if (isDatabaseConnectivityError(error)) {
            console.error("Database connectivity error in /api/store/is-seller:", error);
            return databaseUnavailableResponse();
        }

        console.error("Error checking seller status:", error);
        return NextResponse.json({error: "internal server error"}, {status: 500})
    }
}
