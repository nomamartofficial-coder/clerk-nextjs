import StoreLayout from "@/components/store/StoreLayout";

export const metadata = {
    title: "noma. - Store Dashboard",
    description: "noma. - Store Dashboard",
};

export default function RootAdminLayout({ children }) {

    return (
        <>
            <StoreLayout>
                {children}
            </StoreLayout>
        </>
    );
}
