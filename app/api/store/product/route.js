import imagekit, { imageKitUrlEndpoint } from "@/configs/imageKit";
import prisma from "@/lib/prisma";
import authSeller from "@/middleware/authSeller";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";


// Add a new product
export async function POST(request) {
    try {
        const { userId } = getAuth(request);
        const storeId = await authSeller(userId)
        
        if (!storeId) {
            return NextResponse.json({error: "not authorized"}, {status: 401})
        }
        // Get the data from the form
        const formdata = await request.formData();
        const name = formdata.get("name");
        const description = formdata.get("description");
        const mrp = Number(formdata.get("mrp"))
        const price = Number(formdata.get("price"));
        const category = formdata.get("category");
        const images = formdata.getAll("images");

        if (!name || !description || !mrp || !price || !category || images.length < 1){
            return NextResponse.json({error: "missing product details"}, {status: 400})
        }

        // Uplading the images to imagekit
        const imageUrls = await Promise.all(images.map(async (image) => {
            const buffer = Buffer.from(await image.arrayBuffer());
            const response = await imagekit.files.upload({
                file: buffer,
                fileName: image.name,
                folder: "products",
            })
            const url = imagekit.helper.buildSrc({
                urlEndpoint: imageKitUrlEndpoint,
                src: response.filePath,
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
                images: imageUrls,
                storeId
            }
                    })

        return NextResponse.json({message: "product added successfully"}, {status: 201})

    } catch (error) {
        console.error(error);
        return NextResponse.json({error: "internal server error"}, {status: 400})
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
        console.error(error);
        return NextResponse.json({error: "internal server error"}, {status: 400})
    }
}
