import Imagekit from "imagekit";

var imagekit = new Imagekit({
    publickey : process.env.IMAGEKIT_PUBLIC_KEY,
    privatekey : process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint : process.env.IMAGEKIT_URL_ENDPOINT
});

export default imagekit;