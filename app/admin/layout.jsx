import AdminLayout from "@/components/admin/AdminLayout";

export const metadata = {
    title: "noma. - Admin",
    description: "noma. - Admin",
};

export default function RootAdminLayout({ children }) {

    return (
        <>
            <AdminLayout>
                {children}
            </AdminLayout>
        </>
    );
}
