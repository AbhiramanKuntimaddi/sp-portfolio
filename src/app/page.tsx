import Cymatics from "@/components/cymatics/Cymatics";
import Conductor from "@/components/Conductor";
import Header from "@/components/Header";
import HoverResonance from "@/components/HoverResonance";
import ReadingVeil from "@/components/ReadingVeil";
import Preloader from "@/components/Preloader";
import SwaraRail from "@/components/SwaraRail";
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
      <div data-gated="chrome">
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
    </>
  );
}
