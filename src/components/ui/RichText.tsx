import { Fragment } from "react";

const EMAIL = /([\w.+-]+@[\w-]+(?:\.[\w-]+)+)/;

/**
 * A long text from the content, inline (inside a `<p>` or `<address>`):
 * line breaks become `<br>`, e-mail addresses links. The one place that
 * turns content text into markup, so it can render Portable Text later.
 */
export function RichText({ text }: { text: string }) {
  return text.split("\n").map((line, i) => (
    <Fragment key={i}>
      {i > 0 && <br />}
      {line.split(EMAIL).map((part, j) =>
        j % 2 === 1 ? (
          <a key={j} href={`mailto:${part}`} className="underline underline-offset-4">
            {part}
          </a>
        ) : (
          part
        ),
      )}
    </Fragment>
  ));
}
