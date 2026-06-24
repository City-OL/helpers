import type {
  OrienteeringControl,
  OrienteeringControlProperties,
} from "@city-ol/types";
import along from "@turf/along";
import bearing from "@turf/bearing";
import circle from "@turf/circle";
import destination from "@turf/destination";
import { featureCollection, lineString } from "@turf/helpers";
import { getCoord } from "@turf/invariant";
import type { Feature, GeoJsonProperties, Geometry } from "geojson";

export interface CourseFeatureCollectionOptions {
  circleRadius?: number;
  triangleSize?: number;
}

export function getCourseFeatureCollection(
  controls: OrienteeringControl<OrienteeringControlProperties>[],
  options?: CourseFeatureCollectionOptions,
) {
  const n = controls.length;
  const circleRadius = options?.circleRadius ?? 15 / 1000;
  const triangleSize = options?.triangleSize ?? 25 / 1000;

  const features: Feature<Geometry, GeoJsonProperties>[] = [];

  // last line
  if (n > 2) {
    features.push(
      lineString([
        getCoord(
          along(
            lineString([
              controls[n - 2]!.geometry.coordinates.slice(0, 2).toReversed(),
              controls[n - 1]!.geometry.coordinates.slice(0, 2).toReversed(),
            ]),
            circleRadius,
          ),
        ),
        getCoord(
          along(
            lineString([
              controls[n - 1]!.geometry.coordinates.slice(0, 2).toReversed(),
              controls[n - 2]!.geometry.coordinates.slice(0, 2).toReversed(),
            ]),
            circleRadius + 4 / 1000,
          ),
        ),
      ]),
    );
  }

  // end circle
  if (n > 1) {
    features.push(
      circle(
        controls[n - 1]!.geometry.coordinates.slice(0, 2).toReversed(),
        circleRadius - 4 / 1000,
        {
          steps: 64,
        },
      ),
      circle(
        controls[n - 1]!.geometry.coordinates.slice(0, 2).toReversed(),
        circleRadius + 4 / 1000,
        {
          steps: 64,
        },
      ),
    );
  }

  // first line
  if (n > 2) {
    features.push(
      lineString([
        getCoord(
          along(
            lineString([
              controls[0]!.geometry.coordinates.slice(0, 2).toReversed(),
              controls[1]!.geometry.coordinates.slice(0, 2).toReversed(),
            ]),
            triangleSize,
          ),
        ),
        getCoord(
          along(
            lineString([
              controls[1]!.geometry.coordinates.slice(0, 2).toReversed(),
              controls[0]!.geometry.coordinates.slice(0, 2).toReversed(),
            ]),
            circleRadius,
          ),
        ),
      ]),
    );
  }

  // line segments
  for (let i = 1; i < n - 2; ++i) {
    features.push(
      lineString([
        getCoord(
          along(
            lineString([
              controls[i]!.geometry.coordinates.slice(0, 2).toReversed(),
              controls[i + 1]!.geometry.coordinates.slice(0, 2).toReversed(),
            ]),
            circleRadius,
          ),
        ),
        getCoord(
          along(
            lineString([
              controls[i + 1]!.geometry.coordinates.slice(0, 2).toReversed(),
              controls[i]!.geometry.coordinates.slice(0, 2).toReversed(),
            ]),
            circleRadius,
          ),
        ),
      ]),
    );
  }

  // start triangle if only on control
  if (n === 1) {
    const pCenter = controls[0]!.geometry.coordinates.slice(0, 2).toReversed();
    features.push(
      lineString([
        pCenter,
        getCoord(destination(pCenter, triangleSize, 120)),
        getCoord(destination(pCenter, triangleSize, -120)),
        pCenter,
      ]),
    );
  }

  // circles
  features.push(
    ...controls.slice(1, -1).map(({ geometry }) =>
      circle(geometry.coordinates.slice(0, 2).toReversed(), circleRadius, {
        steps: 64,
      }),
    ),
  );

  // TODO: line from start triangle to end double circle
  if (n === 2) {
  }

  // start triangle
  if (n > 1) {
    const pCenter = controls[0]!.geometry.coordinates.slice(0, 2).toReversed();
    const pTarget = controls[1]!.geometry.coordinates.slice(0, 2).toReversed();
    let p0Bearing = (bearing(pCenter, pTarget) + 180) % 360;
    const p1Bearing = ((p0Bearing + 120) % 360) - 180;
    const p2Bearing = ((p0Bearing + 240) % 360) - 180;
    p0Bearing -= 180;

    features.push(
      lineString([
        getCoord(destination(pCenter, triangleSize, p0Bearing)),
        getCoord(destination(pCenter, triangleSize, p1Bearing)),
        getCoord(destination(pCenter, triangleSize, p2Bearing)),
        getCoord(destination(pCenter, triangleSize, p0Bearing)),
      ]),
    );
  }

  return featureCollection(features);
}

export function getCourseLablesFeatureCollection(
  controls: OrienteeringControl<OrienteeringControlProperties>[],
  options?: CourseFeatureCollectionOptions,
) {
  const labelFeatures: Feature<Geometry, GeoJsonProperties>[] = [];
  const circleRadius = options?.circleRadius ?? 15 / 1000;

  for (let i = 1; i + 1 < controls.length; ++i) {
    let previousControl = controls[i - 1]!.geometry.coordinates.slice(
      0,
      2,
    ).toReversed();
    let currentControl = controls[i]!.geometry.coordinates.slice(
      0,
      2,
    ).toReversed();
    let nextControl = controls[i + 1]!.geometry.coordinates.slice(
      0,
      2,
    ).toReversed();
    let angle1 = bearing(currentControl, previousControl);
    let angle2 = bearing(currentControl, nextControl);
    const angleMin = Math.min(angle1, angle2);
    const angleMax = Math.max(angle1, angle2);
    let alpha = (angleMin + angleMax) / 2;
    if (angleMax - angleMin < 180) alpha += 180;
    let feature = destination(currentControl, 2 * circleRadius, alpha, {
      properties: {
        label: `${i}-${controls[i]!.properties.node}`,
      },
    });
    labelFeatures.push(feature);
  }
  return featureCollection(labelFeatures);
}
