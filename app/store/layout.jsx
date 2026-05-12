import StoreAuthGate from "@/components/store/StoreAuthGate";

export const metadata = {
    title: "noma. - Store Dashboard",
    description: "noma. - Store Dashboard",
};

export default function RootStoreLayout({ children }) {
    return <StoreAuthGate>{children}</StoreAuthGate>;
}