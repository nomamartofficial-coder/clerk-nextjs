import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { databaseUnavailableResponse, isDatabaseConnectivityError } from "@/lib/db-errors";
import authSeller from "@/middleware/authSeller";
import prisma from "@/lib/prisma";


// Get Dashboard Data for Seller ( total orders, total earnings, total products)
export async function GET(request){
    try{
        const { userId } = getAuth(request)
        const storeId = await authSeller(userId)

        if (!storeId) {
            return NextResponse.json({ error: "not authorized" }, { status: 401 })
        }

        // Get all orders for seller's products
        const orders = await prisma.order.findMany({where: {storeId}})

        // Get all products with ratings for seller
        const products = await prisma.product.findMany({where: {storeId}})

            const ratings = await prisma.rating.findMany({
                where: {productId: {in: products.map(product => product.id)}},
                include: {user: true, product: true}
            })

            const dashboardData = {
                ratings,
                totalOrders: orders.length,
                totalEarnings: Math.round(orders.reduce((acc, order) => acc + order.totalAmount, 0)),
                totalProducts: products.length
            }

        return NextResponse.json({dashboardData});
        } catch (error) {
        if (isDatabaseConnectivityError(error)) {
        console.error("Database connectivity error in /api/store/dashboard:", error);
        return databaseUnavailableResponse();
    }

        console.error(error);
        return NextResponse.json({error: "internal server error"}, {status: 500})
    }
}
