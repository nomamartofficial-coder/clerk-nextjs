"use client";

import { SignIn } from "@clerk/nextjs";
import { SignedIn, SignedOut } from "@/components/ClerkComponents";
import StoreLayout from "@/components/store/StoreLayout";

export default function StoreAuthGate({ children }) {
    return (
        <>
            <SignedIn>
                <StoreLayout>{children}</StoreLayout>
            </SignedIn>
            <SignedOut>
                <div className="min-h-screen flex items-center justify-center">
                    <SignIn fallbackRedirectUrl="/store" routing="hash" />
                </div>
            </SignedOut>
        </>
    );
}