import React from "react";
import BlueprintGrid from "@/components/UI/BlueprintGrid";
import NavBar from "@/components/UI/NavBar";
import HeroSection from "@/components/UI/HeroSection";
import ProcessTimeline from "@/components/UI/ProcessTimeline";
import ViewsGrid from "@/components/UI/ViewsGrid";
import PricingPlans from "@/components/UI/PricingPlans";
import Footer from "@/components/UI/Footer";

export default function HomePage(): React.ReactElement {
  return (
    <>
      <BlueprintGrid />
      <NavBar />
      <main className="relative min-h-screen">
        <HeroSection />
        <ProcessTimeline />
        <ViewsGrid />
        <PricingPlans />
      </main>
      <Footer />
    </>
  );
}

