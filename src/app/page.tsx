import { DayNightSwitch } from "@/components/nav/DayNightSwitch";
import { SoundToggle } from "@/components/nav/SoundToggle";
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
      <DayNightSwitch />
      <SoundToggle />
      <HeroHeadline />
      <FlowerHoverLabel />
      <ProjectOverlay />
      {homeSections.map((section) => (
        <Section key={section.id} id={section.id} />
      ))}
    </>
  );
}
