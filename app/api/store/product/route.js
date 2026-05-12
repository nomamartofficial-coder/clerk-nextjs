import imagekit, { imageKitUrlEndpoint } from "@/configs/imageKit";
import {
    databaseUnavailableResponse,
    isDatabaseConnectivityError,
    logDatabaseConnectivityError,
} from "@/lib/db-errors";
import {
    imageKitUnavailableResponse,
    isImageKitConnectivityError,
    logImageKitConnectivityError,
} from "@/lib/imagekit-errors";
import prisma from "@/lib/prisma";
import authSeller from "@/middleware/authSeller";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import path from "node:path";


// Add a new product
export async function POST(request) {
    try {
        const { userId } = getAuth(request);
        const storeId = await authSeller(userId)
        
        if (!storeId) {
            return NextResponse.json({error: "not authorized"}, {status: 401})
        }
        // Get the data from the form
        const formdata = await request.formData()
        const name = formdata.get("name")
        const description = formdata.get("description")
        const mrp = Number(formdata.get("mrp"))
        const price = Number(formdata.get("price"))
        const category = formdata.get("category")
        const images = formdata.getAll("images")

        if (!name || !description || !mrp || !price || !category || images.length < 1){
            return NextResponse.json({error: "missing product details"}, {status: 400})
        }

        if (images.some((image) => !(image instanceof File))) {
            return NextResponse.json({error: "invalid product image"}, {status: 400})
        }

        // Uplading the images to imagekit
        const imageUrl = await Promise.all(images.map(async (image) => {
            const buffer = Buffer.from(await image.arrayBuffer());
            const response = await imagekit.files.upload({
                file: buffer,
                fileName: image.name,
                folder: "products",
            })
            const url = imagekit.url({
                path: response.filePath,
                transformation: [
                    {quality: 'auto'},
                    { format: "webp" },
                    { width: "1024" }
                ]
            })
            return url
        }))

        await prisma.product.create({
            data: {
                name,
                description,
                mrp,
                price,
                category,
                images: imageUrl,
                storeId
            }
        })

        return NextResponse.json({message: "product added successfully"}, {status: 201})

    } catch (error) {
        if (isDatabaseConnectivityError(error)) {
            logDatabaseConnectivityError("/api/store/product POST", error);
            return databaseUnavailableResponse();
        }

        if (isImageKitConnectivityError(error)) {
            logImageKitConnectivityError("/api/store/product POST", error);
            return imageKitUnavailableResponse();
        }

        console.error(error);
        return NextResponse.json({error: "internal server error"}, {status: 500})
    }
}

// Get all products for a seller
export async function GET(request) {
    try {
        const { userId } = getAuth(request);
        const storeId = await authSeller(userId)

        if (!storeId) {
            return NextResponse.json({error: "not authorized"}, {status: 401})
        }
        const products = await prisma.product.findMany({where: { storeId }})
        
        return NextResponse.json({ products }, { status: 200 })
    } catch (error) {
        if (isDatabaseConnectivityError(error)) {
            logDatabaseConnectivityError("/api/store/product GET", error);
            return databaseUnavailableResponse();
        }

        console.error(error);
        return NextResponse.json({error: "internal server error"}, {status: 500})
    }
}
