import { getAuth } from "@clerk/nextjs/server";
import { format } from "date-fns";
import { User } from "lucide-react";
import { NextResponse } from "next/server";

// create the store
export async function POST(request) {
    try {
        const { userId } = getAuth(request);
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
            const response = await imagekit.upload({
                file: buffer,
                fileName: image.name,
                folder: "logos"
            })

            const optimizedImage = imagekit.url({
                path: response.filePath,
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
        console.error(error);
        return NextResponse.json({error: error.code || error.message }, {status: 400})
    } 
}

// check if the user have already registered a store if yes then send the status of the store

export async function GET(request) {
    try {
        const { userId } = getAuth(request)

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
        console.error(error);
        return NextResponse.json({error: error.code || error.message }, {status: 400})
    }
}