import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Get store info & store products



export async function GET(request) {
    try {
        // Get store username from query params
        const { searchParams } = new URL(request.url);
        const username = searchParams.get("username").toLocaleLowerCase();

        if (!username) {
            return NextResponse.json({error: "missing details: username"}, {status: 400})
        }

        // Get store info and inStock products with ratings
        const storeInfo = await prisma.store.findUnique({
            where: {username, isActive: true},
            include: {Product: {include: {rating: true}}}
        })

        if(!store){
            return NextResponse.json({error: "store not found"}, {status: 400})
        }

        return NextResponse.json({store})
    } catch (error) {
        console.error(error);
        return NextResponse.json({error: "internal server error"}, {status: 400})
    }
}