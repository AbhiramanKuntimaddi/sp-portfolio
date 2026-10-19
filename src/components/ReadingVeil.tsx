/*
 * A plain veil of the background colour between the sand and the words: nearly
 * clear where the sand is the point (Sa, Dha), about half where there's copy to
 * read. No texture — it only dims. Its strength comes from the conductor (--veil).
 */
export default function ReadingVeil() {
  return <div aria-hidden="true" className="reading-veil pointer-events-none fixed inset-0 z-[1]" />;
}
