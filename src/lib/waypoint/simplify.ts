/**
 * Douglas–Peucker line simplification for route overviews. A full OSRM route
 * has thousands of points (tens to hundreds of kB); a map showing every trip
 * at country zoom needs a fraction of them. `tolerance` is in degrees
 * (0.0005° ≈ 50 m), far below what's visible on an overview map.
 */
export function simplifyLine(line: GeoJSON.LineString, tolerance = 0.0005): GeoJSON.LineString {
  const points = line.coordinates;
  if (points.length <= 2) return line;

  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const sqTolerance = tolerance * tolerance;

  // Iterative, so a long route can't overflow the stack.
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop()!;
    let maxSq = 0;
    let index = -1;
    for (let i = first + 1; i < last; i++) {
      const sq = sqSegmentDistance(points[i], points[first], points[last]);
      if (sq > maxSq) {
        maxSq = sq;
        index = i;
      }
    }
    if (index !== -1 && maxSq > sqTolerance) {
      keep[index] = 1;
      stack.push([first, index], [index, last]);
    }
  }

  return { type: "LineString", coordinates: points.filter((_, i) => keep[i]) };
}

/** Squared distance from point p to segment a–b (planar; fine at these scales). */
function sqSegmentDistance(p: GeoJSON.Position, a: GeoJSON.Position, b: GeoJSON.Position): number {
  let [x, y] = a;
  let dx = b[0] - x;
  let dy = b[1] - y;
  if (dx !== 0 || dy !== 0) {
    const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) {
      x = b[0];
      y = b[1];
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }
  dx = p[0] - x;
  dy = p[1] - y;
  return dx * dx + dy * dy;
}
