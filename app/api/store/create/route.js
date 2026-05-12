import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
    databaseUnavailableResponse,
    isDatabaseConnectivityError,
    logDatabaseConnectivityError,
} from "@/lib/db-errors";
import imagekit, { imageKitUrlEndpoint } from "@/configs/imageKit";
import {
    imageKitUnavailableResponse,
    isImageKitConnectivityError,
    logImageKitConnectivityError,
} from "@/lib/imagekit-errors";
import prisma from "@/lib/prisma";
import { toFile } from "@imagekit/nodejs";

// create the store
export async function POST(request) {
    console.log("DATABASE_URL =", process.env.DATABASE_URL)

    try {
        const { userId } = getAuth(request);

        if (!userId) {
            return NextResponse.json({ error: "not authorized" }, { status: 401 })
        }

        // Get the data from the form
        const formdata = await request.formData();
        console.log("form keys:", [...formdata.keys()]);

        const name = formdata.get("name");
        const username = formdata.get("username");
        const description = formdata.get("description");
        const email = formdata.get("email");
        const contact = formdata.get("contact");
        const address = formdata.get("address");
        const image = formdata.get("image");

        if (!name || !username || !description || !email || !contact || !address) {
            return NextResponse.json({ error: "missing store info" }, { status: 400 });
        }

        if (!(image instanceof File) || image.size === 0) {
            return NextResponse.json({ error: "invalid image file" }, { status: 400 });
        }

        // check if user have already registered a store
        const store = await prisma.store.findFirst({
            where: { userId: userId }
        });

        // if store is already registered then send status of store
        if (store) {
            return NextResponse.json({status: store.status});
        }
        
        // check if username is already taken
        const isUsernameTaken = await prisma.store.findFirst({
            where: { username: username.toLowerCase() }
        });

        if (isUsernameTaken) {
            return NextResponse.json({error: "username already taken"}, {status: 400});
        }

            // upload the image to imagekit
        const buffer = Buffer.from(await image.arrayBuffer());
        const fileForUpload = await toFile(buffer, image.name || "store-logo");

        if (!buffer.length) {
            return NextResponse.json({ error: "empty image buffer" }, { status: 400 });
        }

        console.log("imagekit keys:", Object.keys(imagekit || {}));
        console.log("imagekit.files keys:", Object.keys(imagekit?.files || {}));

        
        const response = await imagekit.files.upload({
            file: fileForUpload,
            fileName: image.name || "store-logo",
            folder: "/logos",
        },
        {
            timeout: 120000,
            maxRetries: 0,
        }
    );

            const optimizedImage = imagekit.helper.buildSrc({
                urlEndpoint: imageKitUrlEndpoint,
                src: response.filePath,
                transformation: [
                    {
                        quality: '80',
                        format: "webp" ,
                        width: "512" 
                    },
                ],
            });

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
            });

            // link the store to the user
            await prisma.user.update({
                where: { id: userId },
                data: { store: {connect:{ id: newStore.id }}}
            });

            return NextResponse.json({message: "applied, waiting for approval"});

    } catch (error) {
        if (isDatabaseConnectivityError(error)) {
            logDatabaseConnectivityError("/api/store/create POST", error);
            return databaseUnavailableResponse();
        }

        if (isImageKitConnectivityError(error)) {
            logImageKitConnectivityError("/api/store/create POST", error);
            return imageKitUnavailableResponse();
        }

        console.error(error);
        return NextResponse.json({error: "internal server error" }, {status: 500});
    } 
}

// check if the user have already registered a store if yes then send the status of the store

export async function GET(request) {
    console.log("DATABASE_URL =", process.env.DATABASE_URL)

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
            logDatabaseConnectivityError("/api/store/create GET", error);
            return databaseUnavailableResponse();
        }

        console.error(error);
        return NextResponse.json({error: "internal server error" }, {status: 500})
    }
}