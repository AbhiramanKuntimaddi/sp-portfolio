import { Fragment } from "react";

/**
 * Renders copy with its key phrase emphasised: text written between
 * *asterisks* in content.ts comes out in the brass accent, a touch heavier.
 * Everything else is plain text.
 */
export default function Emphasis({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*[^*]+\*)/g).map((part, i) =>
        part.startsWith("*") && part.endsWith("*") ? (
          <span key={i} className="font-semibold text-accent">
            {part.slice(1, -1)}
          </span>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}
