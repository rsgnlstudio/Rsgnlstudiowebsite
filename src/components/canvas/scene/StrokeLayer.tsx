"use client";

import { useEffect, useMemo } from "react";
import type { BufferGeometry } from "three";
import { createStrokeMaterial, type StrokeMaterialOptions } from "../painterly/strokes";

/**
 * Draws one layer of brushstrokes in its two passes: the solid paint (opaque,
 * writing depth), then the translucent paint at the strokes' edges and tails,
 * blended over what's behind. `options` is read once.
 */
export function StrokeLayer({
  name,
  geometry,
  options,
}: {
  name: string;
  geometry: BufferGeometry;
  options: StrokeMaterialOptions;
}) {
  const [core, fringe] = useMemo(
    () => [createStrokeMaterial(options, "core"), createStrokeMaterial(options, "fringe")],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- options are static per layer
    [],
  );
  useEffect(
    () => () => {
      core.dispose();
      fringe.dispose();
    },
    [core, fringe],
  );

  return (
    <group name={name}>
      <mesh geometry={geometry} material={core} frustumCulled={false} />
      <mesh geometry={geometry} material={fringe} frustumCulled={false} />
    </group>
  );
}
