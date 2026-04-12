import ImageKit from "@imagekit/nodejs";

export const imageKitUrlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT?.trim();

const imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY?.trim(),
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY?.trim(),
    urlEndpoint: imageKitUrlEndpoint,
});

export default imagekit;
