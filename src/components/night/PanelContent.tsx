"use client";

import { ChevronDown } from "lucide-react";
import { type NightPanel, PATHS, ROADS, type ServiceId, CITY_LIGHTS } from "@/config/nightMap";
import { useContent } from "@/content/ContentProvider";
import {
  ABOUT,
  BAFA_TEXT,
  CHALLENGES,
  CONTACT,
  FAQ,
  FAQ_BAFA_NOTE,
  PROCESS,
  RESULTS,
  ROAD_TEXTS,
  SERVICES,
  TESTIMONIALS,
  UI,
} from "@/content/consulting";
import { useSceneStore } from "@/store/scene";
import { Block, Category, Heading, Highlight, Intro, PanelEnd, PanelLink } from "./PanelParts";
import { PathStory } from "./PathStory";

/** The paths that run through a service. */
const pathsThrough = (id: ServiceId) =>
  PATHS.filter((p) => (p.services as readonly ServiceId[] | null)?.includes(id));

function ServicePanel({ id }: { id: ServiceId }) {
  const s = SERVICES[id];
  const roads = ROADS.filter((r) => (r.services as readonly string[]).includes(id));
  return (
    <>
      <Category>{UI.categories.service}</Category>
      <Heading>{s.title}</Heading>
      <Intro detail={s.preview.detail}>{s.preview.line}</Intro>
      <Block title={UI.blocks.about}>{s.about}</Block>
      {s.extra?.map((block) =>
        block.collapsible ? (
          <details key={block.title} className="group/details mt-10 max-w-prose">
            <summary className="cursor-pointer text-body opacity-60 transition-opacity duration-700 ease-smooth hover:opacity-90">
              {block.title}
            </summary>
            <ul className="mt-3 grid gap-3 text-body">
              {block.points?.map((p) => (
                <li key={p.title}>
                  <strong className="font-normal italic">{p.title}</strong> <span className="opacity-85">{p.text}</span>
                </li>
              ))}
            </ul>
            {block.source && <p className="mt-3 text-caption opacity-55">
                {UI.path.sources}: {block.source}
              </p>}
          </details>
        ) : (
          <Block key={block.title} title={block.title}>
            {block.text}
          </Block>
        ),
      )}
      {s.forWhom && <Block title={UI.blocks.forWhom}>{s.forWhom}</Block>}
      {s.benefit && <Block title={UI.blocks.benefit}>{s.benefit}</Block>}
      {s.highlight && <Highlight title={s.highlight.title}>{s.highlight.text}</Highlight>}
      <Block title={s.bookTitle ?? UI.blocks.book}>{s.book}</Block>
      {s.methods && <Block title={UI.blocks.methods}>{s.methods}</Block>}
      <Block title={UI.path.roads}>
        <ul className="grid gap-3">
          {roads.map((r) => (
            <li key={r.id}>
              <strong className="font-normal">{ROAD_TEXTS[r.id].link}</strong>{" "}
              <span className="opacity-70">{ROAD_TEXTS[r.id].why}</span>
            </li>
          ))}
        </ul>
      </Block>
      <PanelEnd
        related={pathsThrough(id)
          .slice(0, 2)
          .map((p) => ({ to: { kind: "path" as const, id: p.id }, label: CHALLENGES[p.id].line }))}
      />
    </>
  );
}

function ResultsPanel() {
  const activePath = useSceneStore((s) => s.activePath);
  const result = activePath ? CHALLENGES[activePath].result : null;
  return (
    <>
      <Category>{UI.categories.results}</Category>
      <Heading>{RESULTS.title}</Heading>
      <Intro detail={RESULTS.emphasis}>{RESULTS.intro}</Intro>
      {result && (
        <Highlight title={result.line}>
          <span className="italic opacity-80">{result.detail}</span>
        </Highlight>
      )}
      <ul className="mt-10 grid max-w-prose gap-3 text-body">
        {RESULTS.points.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
      <PanelEnd related={[{ to: { kind: "process" }, label: PROCESS.title }]} />
    </>
  );
}

function ProcessPanel() {
  const { bafaActive } = useContent();
  return (
    <>
      <Category>{UI.categories.process}</Category>
      <Heading>{PROCESS.title}</Heading>
      <Intro>{PROCESS.intro}</Intro>
      <Block title={UI.blocks.steps}>
        <ol className="grid gap-5">
          {PROCESS.steps.map((step, i) => (
            <li key={step.detail} className="flex gap-4">
              <span className="w-4 shrink-0 font-display tabular-nums opacity-55">{i + 1}</span>
              <span>
                {step.line}
                <span className="block italic opacity-55">{step.detail}</span>
              </span>
            </li>
          ))}
        </ol>
      </Block>
      <Block title={UI.blocks.formats}>
        <ul className="grid gap-5">
          {PROCESS.formats.map((f) => (
            <li key={f.title}>
              <span className={`font-display italic ${"highlight" in f ? "text-city-light" : ""}`}>{f.title}</span>
              <span className="block opacity-85">{f.text}</span>
              {"note" in f && <span className="block italic opacity-60">{f.note}</span>}
            </li>
          ))}
        </ul>
      </Block>
      <Block title={UI.blocks.costs}>{PROCESS.costs}</Block>
      {bafaActive && (
        <Highlight title={BAFA_TEXT.title}>
          <PanelLink to={{ kind: "bafa" }}>{UI.path.bafaLink}</PanelLink>
        </Highlight>
      )}
      <PanelEnd related={[{ to: { kind: "faq" }, label: UI.categories.faq }]} />
    </>
  );
}

function AboutPanel() {
  return (
    <>
      <Category>{UI.categories.about}</Category>
      <Heading>{ABOUT.name}</Heading>
      <Intro detail={ABOUT.role} />
      {/* Placeholder until the photo exists (the face should be easy to see). */}
      <div aria-hidden className="mt-10 aspect-4/5 w-full max-w-xs rounded-2xl bg-current/5" />
      <p className="mt-10 max-w-prose text-body">{ABOUT.intro}</p>
      <Block title={UI.blocks.approach}>
        {ABOUT.approach} <span className="italic opacity-70">{ABOUT.approachTags}</span>
      </Block>
      <Block title={UI.blocks.stations}>
        <ol className="grid gap-4 border-l border-current/15 pl-5">
          {ABOUT.stations.map((s) => (
            <li key={s.years}>
              <span className="text-caption tabular-nums opacity-60">{s.years}</span>
              <span className="block">{s.text}</span>
            </li>
          ))}
        </ol>
      </Block>
      <Block title={UI.blocks.education}>{ABOUT.education}</Block>
      <Block title={UI.blocks.more}>{ABOUT.more}</Block>
      <PanelEnd
        related={[
          { to: { kind: "process" }, label: PROCESS.title },
          ...(TESTIMONIALS.length ? [{ to: { kind: "testimonial" as const, index: 0 }, label: UI.categories.testimonial }] : []),
        ]}
      />
    </>
  );
}

function TestimonialPanel({ index }: { index: number }) {
  const t = TESTIMONIALS[index];
  if (!t) return null;
  return (
    <>
      <Category>{UI.categories.testimonial}</Category>
      <figure className="mt-3">
        <blockquote id="night-panel-title" className="max-w-prose font-display text-heading">
          „{t.quote}“
        </blockquote>
        <figcaption className="mt-6 text-body">
          {t.name}
          <span className="block italic opacity-60">
            {t.role}, {t.company}
          </span>
        </figcaption>
      </figure>
      <PanelEnd related={[{ to: { kind: "about" }, label: ABOUT.name }]} />
    </>
  );
}

function BafaPanel() {
  return (
    <>
      <Category>{UI.categories.bafa}</Category>
      <Heading>{BAFA_TEXT.title}</Heading>
      <Intro>{BAFA_TEXT.text}</Intro>
      <PanelEnd related={[{ to: { kind: "process" }, label: PROCESS.title }]} />
    </>
  );
}

function FaqPanel() {
  const { bafaActive } = useContent();
  return (
    <>
      <Category>{UI.categories.faq}</Category>
      <Heading>{UI.categories.faq}</Heading>
      <div className="mt-10 grid max-w-prose gap-2">
        {FAQ.map((item) => (
          <details key={item.question} className="group/faq faq-item border-b border-current/10 pb-3">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-2 text-body transition-opacity duration-700 ease-smooth hover:opacity-80 focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-current [&::-webkit-details-marker]:hidden">
              {item.question}
              {/* A chevron that turns up while the answer is open (a named group: the dialog around the panel is a `group` and open too). */}
              <ChevronDown
                aria-hidden
                className="mt-[0.2em] size-[1.125rem] shrink-0 opacity-70 transition-transform duration-700 ease-reveal group-open/faq:rotate-180"
                strokeWidth={1.5}
              />
            </summary>
            <p className="pr-12 pb-2 text-body opacity-80">
              {item.answer}
              {item.bafa && bafaActive && ` ${FAQ_BAFA_NOTE}`}
            </p>
          </details>
        ))}
      </div>
      <PanelEnd related={[{ to: { kind: "process" }, label: PROCESS.title }]} />
    </>
  );
}

function ContactPanel() {
  const activePath = useSceneStore((s) => s.activePath);
  const challenge = activePath ? CHALLENGES[activePath].line : undefined;
  return (
    <>
      <Category>{UI.categories.contact}</Category>
      <Heading>{CONTACT.title}</Heading>
      <Intro>{CONTACT.text}</Intro>
      {challenge && (
        <Highlight title={UI.path.yourClearing}>
          <span className="italic opacity-85">{challenge}</span>
        </Highlight>
      )}
      <PanelEnd book challenge={challenge} />
      <ul className="mt-10 grid gap-1 text-body">
        <li>
          <a className="underline decoration-current/30 underline-offset-4 hover:decoration-current" href={`mailto:${CONTACT.email}`}>
            {CONTACT.email}
          </a>
        </li>
        <li>
          <a className="underline decoration-current/30 underline-offset-4 hover:decoration-current" href={`tel:${CONTACT.phone.replace(/\s/g, "")}`}>
            {CONTACT.phone}
          </a>
        </li>
      </ul>
      <p className="mt-10 text-caption opacity-55">{CONTACT.newsletter}</p>
    </>
  );
}

function ServicesPanel() {
  return (
    <>
      <Category>{UI.categories.services}</Category>
      <Heading>{UI.categories.services}</Heading>
      <Intro>{UI.servicesIntro}</Intro>
      <ul className="mt-10 grid max-w-prose gap-8">
        {CITY_LIGHTS.map((light) => {
          const s = SERVICES[light.id];
          return (
            <li key={light.id}>
              <PanelLink to={{ kind: "service", id: light.id }}>
                <span className="font-display text-heading no-underline">{s.title}</span>
              </PanelLink>
              <p className="mt-1 text-body opacity-85">{s.preview.line}</p>
              <p className="text-body italic opacity-55">{s.preview.detail}</p>
            </li>
          );
        })}
      </ul>
      <PanelEnd related={[{ to: { kind: "process" }, label: PROCESS.title }]} />
    </>
  );
}

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
