# Night map: the consulting landing page

Source: "Briefing Designer – Landingpage rsgnl consulting" (13.10.2026) plus
three sketches. The night world becomes Simone's consulting site.

## Decisions (agreed in chat)

- **Path A:** the day -> night switch is the intro. The intro lines appear
  during the flight, then the hint "Such dir eine Lichtung aus". Navigation
  and brand swap with the switch.
- **Two interaction patterns instead of nine:**
  1. **The path is told by scrolling.** A click on a clearing opens one
     panel that reads as a story: challenge -> connection (the road) ->
     service A -> service B -> result (mountains) -> contact. Scrolling the
     panel moves the light (the nightingale) and the camera along the path.
     Roads, mountains and the steps of a path have no interaction of their own.
  2. **Everything else is a light.** City lights, meadow, fireflies,
     lantern, goal: hover/focus shows a one-to-two-line preview, click opens
     the panel.
- Dropped from the map: the free road (Innovation + Business Development,
  now a paragraph in the service panels) and the three stations of the
  process path (now in the "Vorgehen" panel, reachable from the nav).

## Layout (top view; x right, d = -z up the screen)

The map frame is x -75..75, d -5..95; the night camera fits it to any
landscape aspect.

- **Woods (left):** a new share of the conifer layout (`scatterConifers`),
  appended with its own RNG so the day composition doesn't move, left of
  the stream from the bottom edge to the back forest edge. Seven clearings
  are left open in it: two each for "Du und dein Team" (top), "Dein Betrieb"
  (middle) and "Dein Markt" (bottom), and one at the forest edge by the
  stream ("Irgendwas stimmt nicht").
- **Meadow (bottom centre):** the day meadow with the flower beds, where the
  nightingale lives by day. "Über mich".
- **City (right):** six lights (four big, two small) joined by six roads,
  plus a faint street grid. Night-only light, like the fireflies.
- **Mountains (top):** contour lines across the top edge (night-only map
  drawing) with the summit (the result).
- **Goal (top right, at the edge):** pulsing, brightest light.
- **Lantern:** shown only on eligible paths, just before the path's first
  service (BAFA, removable by one flag).
- **Testimonials:** up to three special fireflies that wander slowly.

## Architecture

- `src/config/nightMap.ts`: place positions, city lights, roads, paths
  (clearing, stations, waypoints), mountains, goal, map frame, BAFA flag.
- `src/content/consulting.ts`: all copy (German, "du"), keyed by the same ids.
- `painterly/nightMap.ts`: shared geometry (path polylines, sampled points,
  `pathPoint(path, station)`), used by the map layers, the nightingale and
  the camera.
- Canvas (night only, inside `DustWorld`): `MapLines` (one points draw call:
  roads, paths, street grid, contours, trails, dotted like the dust),
  `MapLights` (one instanced draw call for every place's glow) and
  `MapProjector` (projects the places to screen every frame into a buffer in
  the store; the DOM reads it with `getState()` in its own frame loop).
- DOM: `MapPlaces` (one real `<button>` per place over the map: tab, enter,
  hover and focus preview, tap-to-preview then tap-to-open on touch),
  `NightPanel` (the side panel; half the screen, dark, the map stays on the
  left), `NightIntro` (intro lines, the matter-of-fact statement, the hint),
  the night variant of `TopNav` and a small footer.
- The day overlay and the night panel share one dialog shell (`SlidePanel`).
- Store: `panel` (what the night panel shows), `activePath` (stays lit after
  closing), `pathStation` (fractional step along the active path, from the
  panel's scroll), `hoveredPlace`, `placeScreen` (the projection buffer).
- `CameraRig` frames the map at night; while the panel is open it follows the
  focus (the open place, or the point on the path) at a closer zoom.
- `Nightingale` takes the light to the focus while the panel is open.

## Not in this round

- The narrow-screen list fallback (places stacked for scrolling): on portrait
  the map is shown wider; all content stays reachable from the navigation.
- Calendar tool, contact form, privacy page, final claims, photo: open points
  in the briefing; placeholders where needed.
