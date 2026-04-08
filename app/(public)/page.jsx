import BestSelling from "@/components/BestSelling";
import Hero from "@/components/Hero";
import LatestProducts from "@/components/LatestProducts";
import Newsletter from "@/components/Newsletter";
import OurSpecs from "@/components/OurSpec";

export default function Home() {
    return (
        <>
            <Hero />
            <BestSelling />
            <LatestProducts />
            <OurSpecs />
            <Newsletter />
        </>
    );
}
