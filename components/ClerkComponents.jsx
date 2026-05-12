"use client";

import { useAuth } from "@clerk/nextjs";

export function SignedIn({ children }) {
    const { isLoaded, userId } = useAuth();

    if (!isLoaded) {
        return null;
    }

    if (!userId) {
        return null;
    }

    return children;
}

export function SignedOut({ children }) {
    const { isLoaded, userId } = useAuth();

    if (!isLoaded) {
        return null;
    }

    if (userId) {
        return null;
    }

    return children;
}
