/*
 * Between the sand and the words, two plain layers of the background colour
 * (no texture — they only dim):
 *  - the reading veil, light where the sand is the point (Sa, Dha) and heavy
 *    where there's copy to read; its strength comes from the conductor (--veil);
 *  - a fixed fade that melts the plate into the edges and the top and bottom
 *    of the screen, so the sand gathers in the middle, away from the header,
 *    labels and footer row.
 */
export default function ReadingVeil() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[1]">
      <div className="reading-veil absolute inset-0" />
      <div className="plate-fade absolute inset-0" />
    </div>
  );
}
