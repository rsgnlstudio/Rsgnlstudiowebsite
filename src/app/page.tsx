import { DayHint } from "@/components/day/DayHint";
import { FlowerHoverLabel } from "@/components/day/FlowerHoverLabel";
import { HomeScroll } from "@/components/day/HomeScroll";
import { ProjectOverlay } from "@/components/day/ProjectOverlay";
import { Section } from "@/components/day/Section";
import { MobileMenu } from "@/components/nav/MobileMenu";
import { SoundToggle } from "@/components/nav/SoundToggle";
import { TopNav } from "@/components/nav/TopNav";
import { MapPlaces } from "@/components/night/MapPlaces";
import { NightIntro } from "@/components/night/NightIntro";
import { NightPanel } from "@/components/night/NightPanel";
import { EntryScreen } from "@/components/overlay/EntryScreen";
import { homeSections } from "@/config/sections";

export default function HomePage() {
  return (
    <>
      <HomeScroll />
      <TopNav />
      <MobileMenu />
      <SoundToggle />
      <FlowerHoverLabel />
      <DayHint />
      <ProjectOverlay />
      {/* The night: the consulting site over the night map. */}
      <NightIntro />
      <MapPlaces />
      <NightPanel />
      <EntryScreen />
      {homeSections.map((section) => (
        <Section key={section.id} id={section.id} />
      ))}
    </>
  );
}
