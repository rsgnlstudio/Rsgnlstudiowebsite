"use client";

import { Highlight, Intro } from "@/components/ui/Typography";
import { TextLink } from "@/components/ui/TextLink";
import { useContent } from "@/content/ContentProvider";
import { byId } from "@/content/selectors";
import { useSceneStore } from "@/store/scene";
import { PanelEnd, PanelTitle } from "./PanelEnd";

export function ContactPanel() {
  const c = useContent();
  const { ui } = c;
  const { contact } = c.consulting;
  const activePath = useSceneStore((s) => s.activePath);
  const challenge = activePath ? byId(c.consulting.challenges, activePath).line : undefined;
  return (
    <>
      <PanelTitle label={ui.categories.contact}>{contact.title}</PanelTitle>
      <Intro text={contact.text} />
      {challenge && (
        <Highlight title={ui.path.yourClearing}>
          <span className="opacity-85">{challenge}</span>
        </Highlight>
      )}
      <PanelEnd book challenge={challenge} />
      <ul className="mt-10 grid gap-1 text-base">
        <li>
          <TextLink href={`mailto:${contact.email}`}>{contact.email}</TextLink>
        </li>
        <li>
          <TextLink href={`tel:${contact.phone.replace(/\s/g, "")}`}>{contact.phone}</TextLink>
        </li>
      </ul>
      <p className="mt-10 text-sm opacity-55">{contact.newsletter}</p>
    </>
  );
}
