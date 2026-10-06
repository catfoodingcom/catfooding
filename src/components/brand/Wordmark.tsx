/** The Catfooding mark (a CoAgentic node feeding a cat) followed by the wordmark. */
export function Wordmark({ markHeight = 18 }: { markHeight?: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/catfooding-mark.png" alt="" style={{ height: markHeight, width: "auto" }} className="shrink-0" />
      <span>
        CAT<span className="text-acid">FOODING</span>
      </span>
    </span>
  );
}
