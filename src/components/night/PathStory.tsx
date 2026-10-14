"use client";

import type { ReactNode } from "react";
import { type ChallengeId, PATHS, type RoadId, ROADS } from "@/config/nightMap";
import { useContent } from "@/content/ContentProvider";
import { BAFA_TEXT, CHALLENGES, CONTACT, ROAD_TEXTS, SERVICES, UI } from "@/content/consulting";
import { Block, Category, Cta, Heading, Highlight, Intro, PanelLink } from "./PanelParts";

/** One step of the story; the panel follows its scroll through them (`data-step`). */
function Step({ index, label, children }: { index: number; label: string; children: ReactNode }) {
  return (
    <section data-step={index} className="border-t border-current/10 pt-14 pb-24 first:border-t-0 first:pt-0">
      <Category>{label}</Category>
      {children}
    </section>
  );
}

function StepHeading({ children }: { children: ReactNode }) {
  return <h3 className="mt-3 max-w-[26ch] font-display text-heading">{children}</h3>;
}

const roadOf = (a: string, b: string) =>
  ROADS.find((r) => r.services[0] === a && r.services[1] === b)?.id as RoadId;

/**
 * A path, told as one story while the panel scrolls (src/config/nightMap.ts):
 * the challenge, its first service, the road (why both belong together),
 * the second service, the result up on the mountains, and the goal. Each
 * step is a section with `data-step`; as the panel scrolls through them,
 * the light and the camera follow along the path on the map (NightPanel
 * writes `pathStation`). The path from the forest edge goes straight from
 * the challenge to the goal.
 */
export function PathStory({ id }: { id: ChallengeId }) {
  const challenge = CHALLENGES[id];
  const path = PATHS.find((p) => p.id === id)!;
  const { bafaActive } = useContent();
  const bafa = bafaActive && path.bafa;

  const challengeStep = (
    <Step index={0} label={UI.categories.challenge}>
      <Heading>{challenge.line}</Heading>
      <Intro detail={challenge.detail} />
      {challenge.noticed && <Block title={UI.blocks.noticed}>{challenge.noticed}</Block>}
      {challenge.behind && <Block title={UI.blocks.behind}>{challenge.behind}</Block>}
      {challenge.support && <Block title={UI.blocks.support}>{challenge.support}</Block>}
      {bafa && (
        <Highlight title={BAFA_TEXT.title}>
          {challenge.bafaNote ?? UI.path.bafaDefault}{" "}
          <PanelLink to={{ kind: "bafa" }}>{UI.path.bafaLink}</PanelLink>
        </Highlight>
      )}
    </Step>
  );

  const goalStep = (index: number) => (
    <Step index={index} label={UI.categories.contact}>
      <StepHeading>{CONTACT.title}</StepHeading>
      <Intro detail={CONTACT.text}>{path.services ? null : challenge.result.line}</Intro>
      <div className="mt-10">
        <Cta book challenge={challenge.line} />
      </div>
    </Step>
  );

  if (!path.services || !challenge.stations) {
    return (
      <>
        {challengeStep}
        {goalStep(1)}
      </>
    );
  }

  const [a, b] = path.services;
  const road = ROAD_TEXTS[roadOf(a, b)];
  const service = (index: number, which: 0 | 1) => {
    const s = SERVICES[path.services[which]];
    const station = challenge.stations![which];
    return (
      <Step index={index} label={`${UI.path.station} ${which + 1} · ${UI.categories.service}`}>
        <StepHeading>{s.title}</StepHeading>
        <Intro detail={station.detail}>{station.line}</Intro>
        <p className="mt-6">
          <PanelLink to={{ kind: "service", id: path.services[which] }}>
            {UI.path.more} {s.title}
          </PanelLink>
        </p>
      </Step>
    );
  };

  return (
    <>
      {challengeStep}
      {service(1, 0)}
      <Step index={2} label={UI.categories.road}>
        <StepHeading>
          <strong className="font-normal">{road.link}</strong>
        </StepHeading>
        <Block title={UI.blocks.roadNoticed}>{road.noticed}</Block>
        <Block title={UI.blocks.roadWhy}>{road.why}</Block>
        <Block title={UI.blocks.roadSupport}>{road.support}</Block>
      </Step>
      {service(3, 1)}
      <Step index={4} label={UI.categories.results}>
        <StepHeading>{challenge.result.line}</StepHeading>
        <Intro detail={challenge.result.detail} />
        <p className="mt-6">
          <PanelLink to={{ kind: "results" }}>{UI.path.results}</PanelLink>
        </p>
      </Step>
      {goalStep(5)}
    </>
  );
}
