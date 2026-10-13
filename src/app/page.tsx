import { SoundToggle } from "@/components/nav/SoundToggle";
import { TopNav } from "@/components/nav/TopNav";
import { EntryScreen } from "@/components/sections/EntryScreen";
import { FlowerHoverLabel } from "@/components/sections/FlowerHoverLabel";
import { HeroHeadline } from "@/components/sections/HeroHeadline";
import { HomeScroll } from "@/components/sections/HomeScroll";
import { ProjectOverlay } from "@/components/sections/ProjectOverlay";
import { Section } from "@/components/sections/Section";
import { homeSections } from "@/config/sections";

export default function HomePage() {
  return (
    <>
      <HomeScroll />
      <TopNav />
      <SoundToggle />
      <HeroHeadline />
      <FlowerHoverLabel />
      <ProjectOverlay />
      <EntryScreen />
      {homeSections.map((section) => (
        <Section key={section.id} id={section.id} />
      ))}
    </>
  );
}
