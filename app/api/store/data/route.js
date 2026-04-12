import { NextResponse } from "next/server";
import { databaseUnavailableResponse, isDatabaseConnectivityError } from "@/lib/db-errors";
import prisma from "@/lib/prisma";

// Get store info & store products



export async function GET(request) {
    try {
        // Get store username from query params
        const { searchParams } = new URL(request.url);
        const usernameParam = searchParams.get("username");

        if (!usernameParam) {
            return NextResponse.json({error: "missing details: username"}, {status: 400})
        }

        const username = usernameParam.toLocaleLowerCase();

        // Get store info and inStock products with ratings
        const storeInfo = await prisma.store.findUnique({
            where: {username, isActive: true},
            include: {Product: {include: {rating: true}}}
        })

        if(!storeInfo){
            return NextResponse.json({error: "store not found"}, {status: 400})
        }

        return NextResponse.json({store: storeInfo})
    } catch (error) {
        if (isDatabaseConnectivityError(error)) {
            console.error("Database connectivity error in /api/store/data:", error);
            return databaseUnavailableResponse();
        }

        console.error(error);
        return NextResponse.json({error: "internal server error"}, {status: 500})
    }
}
