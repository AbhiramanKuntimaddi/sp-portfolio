import Cymatics from "@/components/cymatics/Cymatics";
import Conductor from "@/components/motion/Conductor";
import Footer from "@/components/frame/Footer";
import Header from "@/components/frame/Header";
import HoverResonance from "@/components/motion/HoverResonance";
import ReadingVeil from "@/components/cymatics/ReadingVeil";
import Preloader from "@/components/entry/Preloader";
import SwaraRail from "@/components/frame/SwaraRail";
import Hero from "@/components/sections/Hero";
import Profile from "@/components/sections/Profile";
import Journey from "@/components/sections/Journey";
import Honours from "@/components/sections/Honours";
import GivingBack from "@/components/sections/GivingBack";
import Music from "@/components/sections/Music";
import WhatsNext from "@/components/sections/WhatsNext";
import Contact from "@/components/sections/Contact";

export default function Home() {
  return (
    <>
      <Cymatics spellFrom="[data-sand]" />
      <ReadingVeil />
      <Preloader />
      <div data-gated="frame">
        <Header />
        <SwaraRail />
      </div>
      <Conductor />
      <HoverResonance />
      <main className="relative" data-gated>
        <Hero />
        <Profile />
        <Journey />
        <Honours />
        <GivingBack />
        <Music />
        <WhatsNext />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
