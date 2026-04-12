import { getAuth } from "@clerk/nextjs/server"
import authSeller from "@/middleware/authSeller"
import { databaseUnavailableResponse, isDatabaseConnectivityError } from "@/lib/db-errors";
import prisma from "@/lib/prisma"
import { NextResponse } from "next/server";


// toggle stock status for a product
export async function POST(request) {
    try {
        const { userId } = getAuth(request);
        const { productId } = await request.json();

        if (!productId) {
            return NextResponse.json({error: "missing details: productId"}, {status: 400})
        }

        const storeId = await authSeller(userId)

        if (!storeId) {
            return NextResponse.json({error: "not authorized"}, {status: 401})
        }

        // check if product exists
        const product = await prisma.product.findFirst({
            where: {id: productId, storeId}
        })
        
        if (!product) {
            return NextResponse.json({error: "product not found"}, {status: 404})
        }   
        
        await prisma.product.update({
            where: {id: productId},
            data: {inStock: !product.inStock}
        })

        return NextResponse.json({message: "Product stock status updated successfully"})
    } catch (error) {
        if (isDatabaseConnectivityError(error)) {
            console.error("Database connectivity error in /api/store/stock-toggle:", error);
            return databaseUnavailableResponse();
        }

        console.error("Error toggling stock status:", error);
        return NextResponse.json({error: "internal server error"}, {status: 500})
    }
}
