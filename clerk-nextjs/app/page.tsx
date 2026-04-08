import BestSelling from "@wave/components/BestSelling";
import Hero from "@wave/components/Hero";
import LatestProducts from "@wave/components/LatestProducts";
import Newsletter from "@wave/components/Newsletter";
import OurSpecs from "@wave/components/OurSpec";

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
