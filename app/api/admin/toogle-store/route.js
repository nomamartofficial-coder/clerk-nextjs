import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import authAdmin from "@/middleware/authAdmin";

// Toggle Store Active Status
export async function POST(request) {
    try {
        const { userId } = getAuth(request)
        const isAdmin = await authAdmin(userId)

        if (!isAdmin) {
            return NextResponse.json({ error: "not authorized" }, { status: 401 })
        }

        const {storeId} = await request.json()

        if (!storeId) {
            return NextResponse.json({ error: "storeId is required" }, { status: 400 });
        }

        // Find the store by ID
        const store = await prisma.store.findUnique({
            where: { id: storeId }
        });

        if (!store) {
            return NextResponse.json({ error: "Store not found" }, { status: 404 });
        }

        await prisma.store.update({
            where: { id: storeId },
            data: { isActive: !store.isActive }
        });

        return NextResponse.json({ message: "Store active status updated successfully" });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "internal server error" }, { status: 500 })
    }
}