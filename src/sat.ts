export class Vector {
  public x: number;
  public y: number;

  constructor(x: number = 0, y?: number) {
    this.x = x;
    this.y = y ?? x;
  }

  copy(other: Vector) {
    this.x = other.x;
    this.y = other.y;
    return this;
  }

  perp() {
    const x = this.x;
    this.x = this.y;
    this.y = -x;
    return this;
  }

  reverse() {
    this.x = -this.x;
    this.y = -this.y;
    return this;
  }

  normalize() {
    let len = this.len();
    if (len > 0) {
      this.x = this.x / len;
      this.y = this.y / len;
    }
    return this;
  }

  add(other: Vector) {
    this.x += other.x;
    this.y += other.y;
    return this;
  }

  sub(other: Vector) {
    this.x -= other.x;
    this.y -= other.y;
    return this;
  }

  scale(x: number, y?: number) {
    this.x *= x;
    this.y *= y || x;
    return this;
  }

  project(other: Vector) {
    let amt = this.dot(other) / other.len2();
    this.x = amt * other.x;
    this.y = amt * other.y;
    return this;
  }

  projectN(other: Vector) {
    let amt = this.dot(other);
    this.x = amt * other.x;
    this.y = amt * other.y;
    return this;
  }

  reflect(axis: Vector) {
    let x = this.x;
    let y = this.y;

    this.project(axis).scale(2);
    this.x -= x;
    this.y -= y;
    return this;
  }

  reflectN(axis: Vector) {
    let x = this.x;
    let y = this.y;

    this.projectN(axis).scale(2);
    this.x -= x;
    this.y -= y;
    return this;
  }

  dot(other: Vector) {
    return this.x * other.x + this.y * other.y;
  }

  len2() {
    return this.dot(this);
  }

  len() {
    return Math.sqrt(this.len2());
  }
}

export class Polygon {
  public points: Vector[];
  public pos: Vector;
  public edges: Vector[];
  public normals: Vector[];

  constructor(points: Vector[]) {
    this.pos = new Vector(); // where the shape origin lies, defaults to 0, 0
    this.points = points || [];
    this.recalc();
  }

  recalc() {
    let points = this.points;
    let len = points.length;
    this.edges = [];
    this.normals = [];
    for (let i = 0; i < len; i++) {
      let p1 = points[i];
      let p2 = i < len - 1 ? points[i + 1] : points[0];
      let e = new Vector().copy(p2).sub(p1);
      let n = new Vector().copy(e).perp().normalize();
      this.edges.push(e);
      this.normals.push(n);
    }
  }

  collidesWith(polygon: Polygon, response?: Response) {
    return testPolygonCollision(this, polygon, response);
  }
}

class Response {
  public a: null | Polygon;
  public b: null | Polygon;
  public overlap: number;
  public overlapN: Vector;
  public overlapV: Vector;
  public aInB: boolean;
  public bInA: boolean;

  constructor() {
    this.a = null;
    this.b = null;
    this.overlapN = new Vector(); // Unit vector in the direction of overlap
    this.overlapV = new Vector(); // Subtract this from a's position to extract it from b
    this.clear();
  }

  clear() {
    this.aInB = true; // Is a fully inside b?
    this.bInA = true; // Is b fully inside a?
    this.overlap = Number.MAX_VALUE; // Amount of overlap (magnitude of overlapV). Can be 0 (if a and b are touching)
    return this;
  }
}

const flattenPointsOn = function (
  points: Vector[],
  normal: Vector,
  result: number[]
) {
  let min = Number.MAX_SAFE_INTEGER;
  let max = -Number.MAX_SAFE_INTEGER;
  let i = points.length;
  while (i--) {
    // Get the magnitude of the projection of the point onto the normal
    let dot = points[i].dot(normal);
    if (dot < min) min = dot;
    if (dot > max) max = dot;
  }

  result[0] = min;
  result[1] = max;
};

/**
 * Pool of Vectors used in calculations.
 *
 * @type {Array}
 */
let T_VECTORS: Vector[] = [];
for (let i = 0; i < 10; i++) {
  T_VECTORS.push(new Vector());
}

/**
 * Pool of Arrays used in calculations.
 *
 * @type {Array}
 */
let T_ARRAYS: number[][] = [];
for (let i = 0; i < 5; i++) {
  T_ARRAYS.push([]);
}

export const isSeparatingAxis = function (
  aPos: Vector,
  bPos: Vector,
  aPoints: Vector[],
  bPoints: Vector[],
  axis: Vector,
  response?: Response
): boolean {
  let rangeA = T_ARRAYS.pop();
  let rangeB = T_ARRAYS.pop();

  // Get the magnitude of the offset between the two polygons
  let offsetV = T_VECTORS.pop()?.copy(bPos).sub(aPos);
  if (!offsetV || !rangeA || !rangeB) return false;

  let projectedOffset = offsetV.dot(axis);

  // Project the polygons onto the axis.
  flattenPointsOn(aPoints, axis, rangeA);
  flattenPointsOn(bPoints, axis, rangeB);

  // Move B's range to its position relative to A.
  rangeB[0] += projectedOffset;
  rangeB[1] += projectedOffset;

  // Check if there is a gap. If there is, this is a separating axis and we can stop
  if (rangeA[0] > rangeB[1] || rangeB[0] > rangeA[1]) {
    T_VECTORS.push(offsetV);
    T_ARRAYS.push(rangeA);
    T_ARRAYS.push(rangeB);
    return true;
  }

  // If we're calculating a response, calculate the overlap.
  if (response) {
    let overlap;
    // A starts further left than B
    if (rangeA[0] < rangeB[0]) {
      response.aInB = false;
      // A ends before B does. We have to pull A out of B
      if (rangeA[1] < rangeB[1]) {
        overlap = rangeA[1] - rangeB[0];
        response.bInA = false;
        // B is fully inside A.  Pick the shortest way out.
      } else {
        let option1 = rangeA[1] - rangeB[0];
        let option2 = rangeB[1] - rangeA[0];
        overlap = option1 < option2 ? option1 : -option2;
      }
      // B starts further left than A
    } else {
      response.bInA = false;
      // B ends before A ends. We have to push A out of B
      if (rangeA[1] > rangeB[1]) {
        overlap = rangeA[0] - rangeB[1];
        response.aInB = false;
        // A is fully inside B.  Pick the shortest way out.
      } else {
        let option1 = rangeA[1] - rangeB[0];
        let option2 = rangeB[1] - rangeA[0];
        overlap = option1 < option2 ? option1 : -option2;
      }
    }

    // If this is the smallest amount of overlap we've seen so far, set it as the minimum overlap.
    let absOverlap = Math.abs(overlap);
    if (absOverlap < response.overlap) {
      response.overlap = absOverlap;
      response.overlapN.copy(axis);
      if (overlap < 0) {
        response.overlapN.reverse();
      }
    }
  }

  T_VECTORS.push(offsetV);
  T_ARRAYS.push(rangeA);
  T_ARRAYS.push(rangeB);
  return false;
};

export const testPolygonCollision = function (
  a: Polygon,
  b: Polygon,
  response?: Response
) {
  let aPoints = a.points;
  let aLen = aPoints.length;
  let bPoints = b.points;
  let bLen = bPoints.length;

  // If any of the edge normals of A is a separating axis, no intersection.
  while (aLen--) {
    if (
      isSeparatingAxis(
        a.pos,
        b.pos,
        aPoints,
        bPoints,
        a.normals[aLen],
        response
      )
    )
      return false;
  }

  // If any of the edge normals of B is a separating axis, no intersection.
  while (bLen--) {
    if (
      isSeparatingAxis(
        a.pos,
        b.pos,
        aPoints,
        bPoints,
        b.normals[bLen],
        response
      )
    )
      return false;
  }

  // Since none of the edge normals of A or B are a separating axis, there is an intersection
  // and we've already calculated the smallest overlap (in isSeparatingAxis).  Calculate the
  // final overlap vector.
  if (response) {
    response.a = a;
    response.b = b;
    response.overlapV.copy(response.overlapN).scale(response.overlap);
  }
  return true;
};
