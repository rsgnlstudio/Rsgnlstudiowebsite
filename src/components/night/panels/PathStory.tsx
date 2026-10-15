"use client";

import type { ReactNode } from "react";
import { Block, Eyebrow, Heading, Highlight, Intro } from "@/components/ui/Typography";
import { type ChallengeId, PATHS, type RoadId, ROADS } from "@/config/nightMap";
import { useBafaActive, useContent } from "@/content/ContentProvider";
import { byId } from "@/content/selectors";
import { Cta, PANEL_TITLE_ID, PanelLink } from "./PanelEnd";

/** One step of the story; the panel follows its scroll through them (`data-step`). */
function Step({ index, label, children }: { index: number; label: string; children: ReactNode }) {
  return (
    <section data-step={index} className="pb-40 last:pb-0">
      <Eyebrow>{label}</Eyebrow>
      {children}
    </section>
  );
}

function StepHeading({ children }: { children: ReactNode }) {
  return (
    <Heading as="h3" size="heading" className="mt-3 max-w-[28ch]">
      {children}
    </Heading>
  );
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
  const c = useContent();
  const { ui } = c;
  const { bafa: bafaText, contact } = c.consulting;
  const challenge = byId(c.consulting.challenges, id);
  const path = PATHS.find((p) => p.id === id)!;
  const bafa = useBafaActive() && path.bafa;

  const challengeStep = (
    <Step index={0} label={ui.categories.challenge}>
      <Heading id={PANEL_TITLE_ID} size="panel" className="mt-3 max-w-[24ch]">
        {challenge.line}
      </Heading>
      <Intro detail={challenge.detail} />
      {challenge.noticed && <Block title={ui.blocks.noticed} text={challenge.noticed} />}
      {challenge.behind && <Block title={ui.blocks.behind} text={challenge.behind} />}
      {challenge.support && <Block title={ui.blocks.support} text={challenge.support} />}
      {bafa && (
        <Highlight title={bafaText.title}>
          {challenge.bafaNote ?? bafaText.pathNote}{" "}
          <PanelLink to={{ kind: "bafa" }}>{ui.path.bafaLink}</PanelLink>
        </Highlight>
      )}
    </Step>
  );

  const goalStep = (index: number) => (
    <Step index={index} label={ui.categories.contact}>
      <StepHeading>{contact.title}</StepHeading>
      <Intro text={path.services ? null : challenge.result.line} detail={contact.text} />
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
  const road = byId(c.consulting.roads, roadOf(a, b));
  const service = (index: number, which: 0 | 1) => {
    const s = byId(c.consulting.services, path.services[which]);
    const station = challenge.stations![which];
    return (
      <Step index={index} label={`${ui.path.station} ${which + 1} · ${ui.categories.service}`}>
        <StepHeading>{s.title}</StepHeading>
        <Intro text={station.line} detail={station.detail} />
        <p className="mt-6">
          <PanelLink to={{ kind: "service", id: path.services[which] }}>
            {ui.path.more} {s.title}
          </PanelLink>
        </p>
      </Step>
    );
  };

  return (
    <>
      {challengeStep}
      {service(1, 0)}
      <Step index={2} label={ui.categories.road}>
        <StepHeading>
          <strong className="font-normal">{road.link}</strong>
        </StepHeading>
        <Block title={ui.blocks.roadNoticed} text={road.noticed} />
        <Block title={ui.blocks.roadWhy} text={road.why} />
        <Block title={ui.blocks.roadSupport} text={road.support} />
      </Step>
      {service(3, 1)}
      <Step index={4} label={ui.categories.results}>
        <StepHeading>{challenge.result.line}</StepHeading>
        <Intro detail={challenge.result.detail} />
        <p className="mt-6">
          <PanelLink to={{ kind: "results" }}>{ui.path.results}</PanelLink>
        </p>
      </Step>
      {goalStep(5)}
    </>
  );
}
