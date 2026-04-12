import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { databaseUnavailableResponse, isDatabaseConnectivityError } from "@/lib/db-errors";
import imagekit, { imageKitUrlEndpoint } from "@/configs/imageKit";
import prisma from "@/lib/prisma";

// create the store
export async function POST(request) {
    try {
        const { userId } = getAuth(request);

        if (!userId) {
            return NextResponse.json({ error: "not authorized" }, { status: 401 })
        }

        // Get the data from the form
        const formdata = await request.formData();

        const name = formdata.get("name");
        const username = formdata.get("username");
        const description = formdata.get("description");
        const email = formdata.get("email");
        const contact = formdata.get("contact");
        const address = formdata.get("address");
        const image = formdata.get("image");

        if (!name || !username || !description || !email || !contact || !address  || !image) {
            return NextResponse. json({error: "missing store info"}, {status: 400})
        }

        // check if user have already registered a store
        const store = await prisma.store.findFirst({
            where: { userId: userId }
        })

        // if store is already registered then send status of store
        if (store) {
            return NextResponse.json({status: store.status})
        }
        
        // check if username is already taken
        const isUsernameTaken = await prisma.store.findFirst({
            where: { username: username.toLowerCase() }
        })

        if (isUsernameTaken) {
            return NextResponse.json({error: "username already taken"}, {status: 400})
        }

            // upload the image to imagekit
            const buffer = Buffer.from(await image.arrayBuffer());
            const response = await imagekit.files.upload({
                file: buffer,
                fileName: image.name,
                folder: "logos"
            })

            const optimizedImage = imagekit.helper.buildSrc({
                urlEndpoint: imageKitUrlEndpoint,
                src: response.filePath,
                transformation: [
                    {quality: 'auto'},
                    { format: "webp" },
                    { width: "512" }
                ]
            })

            const newStore = await prisma.store.create({
                data: {
                    userId,
                    name,
                    description,
                    username: username.toLowerCase(),
                    email,
                    contact,
                    address,
                    logo: optimizedImage
                }
            })

            // link the store to the user
            await prisma.user.update({
                where: { id: userId },
                data: { store: {connect:{ id: newStore.id }}}
            })

            return NextResponse.json({message: "applied, waiting for approval"})

    } catch (error) {
        if (isDatabaseConnectivityError(error)) {
            console.error("Database connectivity error in /api/store/create POST:", error);
            return databaseUnavailableResponse();
        }

        console.error(error);
        return NextResponse.json({error: "internal server error" }, {status: 500})
    } 
}

// check if the user have already registered a store if yes then send the status of the store

export async function GET(request) {
    try {
        const { userId } = getAuth(request)

        if (!userId) {
            return NextResponse.json({ error: "not authorized" }, { status: 401 })
        }

         // check if user have already registered a store
        const store = await prisma.store.findFirst({
            where: { userId: userId }
        })

        // if store is already registered then send status of store
        if (store) {
            return NextResponse.json({status: store.status})
        }

        return NextResponse.json({status: "not registered"})
    } catch (error) {
        if (isDatabaseConnectivityError(error)) {
            console.error("Database connectivity error in /api/store/create GET:", error);
            return databaseUnavailableResponse();
        }

        console.error(error);
        return NextResponse.json({error: "internal server error" }, {status: 500})
    }
}
