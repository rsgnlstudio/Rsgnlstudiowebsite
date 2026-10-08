import { DayNightSwitch } from "@/components/nav/DayNightSwitch";
import { HomeScroll } from "@/components/sections/HomeScroll";
import { Section } from "@/components/sections/Section";
import { homeSections } from "@/config/sections";

export default function HomePage() {
  return (
    <>
      <HomeScroll />
      <DayNightSwitch />
      {homeSections.map((section) => (
        <Section key={section.id} id={section.id} />
      ))}
    </>
  );
}
