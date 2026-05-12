import StoreLayout from "@/components/store/StoreLayout";
import {SignedIn, SignedOut, SignIn} from "@clerk/nextjs"; 

export const metadata = {
    title: "noma. - Store Dashboard",
    description: "noma. - Store Dashboard",
};

export default function RootAdminLayout({ children }) {

    return (
        <>
        <SignedIn>
            <StoreLayout>
                {children}
            </StoreLayout>
        </SignedIn>
        <SignedIn>
            <div className="min-h-screen flex items-center justify-center">
                <SignIn fallbackRedirectUrl="/store" routing="hash"/>
            </div>
        </SignedIn>
        </>
    );
}
