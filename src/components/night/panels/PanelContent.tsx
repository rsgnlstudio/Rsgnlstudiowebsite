"use client";

import type { NightPanel } from "@/config/nightMap";
import { AboutPanel } from "./AboutPanel";
import { BafaPanel } from "./BafaPanel";
import { ContactPanel } from "./ContactPanel";
import { FaqPanel } from "./FaqPanel";
import { PathStory } from "./PathStory";
import { ProcessPanel } from "./ProcessPanel";
import { ResultsPanel } from "./ResultsPanel";
import { ServicePanel } from "./ServicePanel";
import { ServicesPanel } from "./ServicesPanel";
import { TestimonialPanel } from "./TestimonialPanel";

/** The content of the night panel for what it shows. */
export function PanelContent({ panel }: { panel: NightPanel }) {
  switch (panel.kind) {
    case "path":
      return <PathStory id={panel.id} />;
    case "service":
      return <ServicePanel id={panel.id} />;
    case "testimonial":
      return <TestimonialPanel index={panel.index} />;
    case "results":
      return <ResultsPanel />;
    case "process":
      return <ProcessPanel />;
    case "about":
      return <AboutPanel />;
    case "bafa":
      return <BafaPanel />;
    case "faq":
      return <FaqPanel />;
    case "contact":
      return <ContactPanel />;
    case "services":
      return <ServicesPanel />;
  }
}
