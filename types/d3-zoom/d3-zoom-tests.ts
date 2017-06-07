/**
 * Typescript definition tests for d3/d3-zoom module
 *
 * Note: These tests are intended to test the definitions only
 * in the sense of typing and call signature consistency. They
 * are not intended as functional tests.
 */

import * as d3Zoom from 'd3-zoom';
import { ArrayLike, select, Selection, event } from 'd3-selection';
import { Transition } from 'd3-transition';
import { scaleLinear, ScaleLinear } from 'd3-scale';
import { interpolateZoom, interpolate, interpolateArray, ZoomInterpolator, ZoomView } from 'd3-interpolate';

// --------------------------------------------------------------------------
// Preparatory Steps
// --------------------------------------------------------------------------

const points: Array<[number, number]> = [
    [10, 10], [20, 20], [50, 50]
];

// Canvas Prep -------------------------------------------------------------

interface CanvasDatum {
    width: number;
    height: number;
    radius: number;
}

const canvas = select<HTMLCanvasElement, any>('canvas')
    .datum<CanvasDatum>({ width: 500, height: 400, radius: 2.5 })
    .attr('width', d => d.width)
    .attr('height', d => d.height);

const context = canvas.node()!.getContext('2d');

function drawPointsOnCanvas(radius: number) {
    if (context) {
        context.beginPath();
        points.forEach(drawPointOnCanvas(radius));
        context.fill();
    }
}

function drawPointOnCanvas(radius: number) {
    return (point: [number, number]) => {
        if (context) {
            context.moveTo(point[0] + radius, point[1]);
            context.arc(point[0], point[1], radius, 0, 2 * Math.PI);
        }
    };
}

// SVG Prep -------------------------------------------------------------------

interface SVGDatum {
    width: number;
    height: number;
    filterBrushEvent: boolean;
}

const svg = select<SVGSVGElement, undefined>('svg')
    .datum<SVGDatum>({ width: 500, height: 500, filterBrushEvent: true })
    .attr('width', d => d.width)
    .attr('height', d => d.height);

const g = svg.append<SVGGElement>('g');

g.selectAll()
    .data<[number, number]>(points)
    .enter().append<SVGCircleElement>('circle')
    .attr('cx', d => d[0])
    .attr('cy', d => d[1])
    .attr('r', 2.5);

// For test of using zoomBehavior to transform selections and transitions ----

interface GroupDatum {
    byX: number;
    byY: number;
    byK: number;
    toK: number;
}

// --------------------------------------------------------------------------
// Test Define ZoomBehaviour
// --------------------------------------------------------------------------

// Canvas Example -----------------------------------------------------------

function zoomedCanvas(this: HTMLCanvasElement, d: CanvasDatum) {
    // Cast d3 event to D3ZoomEvent to be used in zoom event handler
    const e = <d3Zoom.D3ZoomEvent<HTMLCanvasElement, any>> event;
    if (context) {
        context.save();
        context.clearRect(0, 0, this.width, this.height); // this element
        context.translate(e.transform.x, e.transform.y);
        context.scale(e.transform.k, e.transform.k);
        drawPointsOnCanvas(d.radius);
        context.restore();
    }
}

let canvasZoom: d3Zoom.ZoomBehavior<HTMLCanvasElement, CanvasDatum>;

canvasZoom = d3Zoom.zoom()
    .scaleExtent([1 / 2, 4])
    .on('zoom', zoomedCanvas);

// SVG Example --------------------------------------------------------------

function zoomedSVGOverlay(this: SVGRectElement) {
    // Cast d3 event to D3ZoomEvent to be used in zoom event handler
    const e = <d3Zoom.D3ZoomEvent<HTMLCanvasElement, any>> event;

    g.attr('transform', e.transform.toString());
}

let svgZoom: d3Zoom.ZoomBehavior<SVGRectElement, SVGDatum>;

svgZoom = d3Zoom.zoom<SVGRectElement, SVGDatum>();

// filter() ----------------------------------------------------------------

// chainable
svgZoom = svgZoom.filter(function(d, i, group) {
    // Cast d3 event to D3ZoomEvent to be used in filter logic
    const e = <d3Zoom.D3ZoomEvent<SVGRectElement, SVGDatum>> event;

    console.log('Overlay Rectangle width: ', this.width.baseVal.value); // this typing is SVGRectElement
    return e.sourceEvent.type !== 'brush' || !d.filterBrushEvent; // datum type is SVGDatum (as propagated to SVGRectElement with zoom event attached)
});

let filterFn: (this: SVGRectElement, d: SVGDatum, index: number, group: SVGRectElement[]) => boolean;
filterFn = svgZoom.filter();

// wheelDelta() ----------------------------------------------------------------

// chainable
svgZoom = svgZoom.wheelDelta(function(d, i, group) {
    // Cast d3 event to D3ZoomEvent to be used in filter logic
    const e = <WheelEvent> event;
    const that: SVGRectElement = this;
    const datum: SVGDatum = d;
    const index: number = i;
    const g: SVGRectElement[] | ArrayLike<SVGRectElement> = group;

    return -e.deltaY * (e.deltaMode ? 100 : 1) / 600;
});

let wheelDeltaFn: (this: SVGRectElement, d: SVGDatum, index: number, group: SVGRectElement[]) => number;
wheelDeltaFn = svgZoom.wheelDelta();

// extent()  ---------------------------------------------------------------

let extentAccessor: (this: SVGRectElement, d: SVGDatum, index: number, group: SVGRectElement[]) => [[number, number], [number, number]];
extentAccessor = svgZoom.extent();

// chainable with array
svgZoom = svgZoom.extent([[0, 0], [200, 200]]);

// chainable with accessor function
svgZoom = svgZoom.extent(function(d, i, group) {
    console.log('Overlay Rectangle width: ', this.width.baseVal.value); // this typing is SVGRectElement
    return [[0, 0], [d.width, d.height]]; // datum type is SVGDatum
});

// scaleExtent()  ----------------------------------------------------------

// chainable
svgZoom = svgZoom.scaleExtent([0.5, 4]);

let scaleExtent: [number, number];
scaleExtent = svgZoom.scaleExtent();

// translationExtent()  ----------------------------------------------------

// chainable
svgZoom = svgZoom.translateExtent([[-500, -500], [500, 500]]);

let translateExtent: [[number, number], [number, number]];
translateExtent = svgZoom.translateExtent();

// clickDistance() ---------------------------------------------------------

svgZoom = svgZoom.clickDistance(5);

const distance: number = svgZoom.clickDistance();

// duration() --------------------------------------------------------------

// chainable
svgZoom = svgZoom.duration(500);

const duration: number = svgZoom.duration();

// interpolate() --------------------------------------------------------------

// chainable setter accepts interpoateZoom, interpolate and interpolateArray
svgZoom = svgZoom.interpolate(interpolateZoom);
svgZoom = svgZoom.interpolate(interpolate);
svgZoom = svgZoom.interpolate(interpolateArray);

// getter

let basicInterpolatorFactory: (a: ZoomView, b: ZoomView) => ((t: number) => ZoomView);
let zoomInterpolatorFactory: (a: ZoomView, b: ZoomView) => ZoomInterpolator;

// Basic case without casting
basicInterpolatorFactory = svgZoom.interpolate();

// Assuming it is know that a specialized interpolation factory was used. E.g. ZoomInterpolator also has a duration
// argument
zoomInterpolatorFactory = svgZoom.interpolate<(a: ZoomView, b: ZoomView) => ZoomInterpolator>();

// on() --------------------------------------------------------------------

// chainable
svgZoom = svgZoom.on('zoom', zoomedSVGOverlay);
// svgZoom = svgZoom.on('zoom', zoomedCanvas); // fails, zoom event handler has wrong this and datum type

let zoomHandler: ((this: SVGRectElement, datum: SVGDatum, index: number, group: SVGRectElement[] | ArrayLike<SVGRectElement>) => void) | undefined;
zoomHandler = svgZoom.on('zoom');

// chainable remove handler
svgZoom = svgZoom.on('zoom', null);

// re-apply
if (zoomHandler) {
    svgZoom.on('zoom', zoomHandler);
}
// --------------------------------------------------------------------------
// Test Attach ZoomBehaviour
// --------------------------------------------------------------------------

// Canvas Example -----------------------------------------------------------

// attach the zoom behavior to the canvas element
canvas.call(canvasZoom);

// SVG Example --------------------------------------------------------------

// attach the zoom behavior to an overlay svg rectangle
const svgOverlay: Selection<SVGRectElement, SVGDatum, HTMLElement, any> = svg.append<SVGRectElement>('rect')
    .attr('width', d => d.width)
    .attr('height', d => d.height)
    .style('fill', 'none')
    .style('pointer-events', 'all')
    .call(svgZoom);

const svgOverlayTransition = svgOverlay.transition();

// --------------------------------------------------------------------------
// Test Use ZoomBehaviour
// --------------------------------------------------------------------------

// transform() -------------------------------------------------------------------------------------

// use on selection
svgZoom.transform(svgOverlay, d3Zoom.zoomIdentity);
// svgZoom.transform(groupsSelection, d3Zoom.zoomIdentity); // fails, as groupSelection mismachtes DOM Element type and datum type

svgZoom.transform(svgOverlay, function(datum, index, groups) {
    const that: SVGRectElement = this;
    const d: SVGDatum = datum;
    const i: number = index;
    const g: SVGRectElement[] | ArrayLike<SVGRectElement> = groups;
    console.log('Owner SVG Element of svg rect: ', this.ownerSVGElement); // this is of type SVGRectElement
    console.log('Filter Brush Event status as per datum: ', d.filterBrushEvent); // datum type is SVGDatum
    return d3Zoom.zoomIdentity;
});
// use on transition
svgOverlayTransition.call(svgZoom.transform, d3Zoom.zoomIdentity);
// svgZoom.transform(groupsTransition, d3Zoom.zoomIdentity); // fails, as groupTransition mismachtes DOM Element type and datum type

svgZoom.transform(svgOverlayTransition, d3Zoom.zoomIdentity);
svgZoom.transform(svgOverlayTransition, function(datum, index, groups) {
    const that: SVGRectElement = this;
    const d: SVGDatum = datum;
    const i: number = index;
    const g: SVGRectElement[] | ArrayLike<SVGRectElement> = groups;
    console.log('Owner SVG Element of svg rect: ', this.ownerSVGElement); // this is of type SVGRectElement
    console.log('Filter Brush Event status as per datum: ', d.filterBrushEvent); // datum type is SVGDatum
    return d3Zoom.zoomIdentity;
});

// translateBy() -------------------------------------------------------------------------------------

// use on selection
svgZoom.translateBy(svgOverlay, 20, 50);
// svgZoom.translateBy(groupsSelection, 20, 50); // fails, as groupSelection mismachtes DOM Element type and datum type

svgZoom.translateBy(
    svgOverlay,
    20,
    function(datum, index, groups) {
        const that: SVGRectElement = this;
        const d: SVGDatum = datum;
        const i: number = index;
        const g: SVGRectElement[] | ArrayLike<SVGRectElement> = groups;
        console.log('Owner SVG Element of svg rect: ', this.ownerSVGElement); // this is of type SVGRectElement
        console.log('Filter Brush Event status as per datum: ', d.filterBrushEvent); // datum type is SVGDatum
        return 30;
    });
svgZoom.translateBy(
    svgOverlay,
    function(datum, index, groups) {
        const that: SVGRectElement = this;
        const d: SVGDatum = datum;
        const i: number = index;
        const g: SVGRectElement[] | ArrayLike<SVGRectElement> = groups;
        console.log('Owner SVG Element of svg rect: ', this.ownerSVGElement); // this is of type SVGRectElement
        console.log('Filter Brush Event status as per datum: ', d.filterBrushEvent); // datum type is SVGDatum
        return 30;
    },
    50);
svgZoom.translateBy(
    svgOverlay,
    function(datum, index, groups) {
        const that: SVGRectElement = this;
        const d: SVGDatum = datum;
        const i: number = index;
        const g: SVGRectElement[] | ArrayLike<SVGRectElement> = groups;
        console.log('Owner SVG Element of svg rect: ', this.ownerSVGElement); // this is of type SVGRectElement
        console.log('Filter Brush Event status as per datum: ', d.filterBrushEvent); // datum type is SVGDatum
        return 30;
    },
    function(datum, index, groups) {
        const that: SVGRectElement = this;
        const d: SVGDatum = datum;
        const i: number = index;
        const g: SVGRectElement[] | ArrayLike<SVGRectElement> = groups;
        console.log('Owner SVG Element of svg rect: ', this.ownerSVGElement); // this is of type SVGRectElement
        console.log('Filter Brush Event status as per datum: ', d.filterBrushEvent); // datum type is SVGDatum
        return 30;
    });

// use on transition
svgZoom.translateBy(svgOverlayTransition, 20, 50);
// svgZoom.translateBy(groupsTransition, 20, 50); // fails, as groupTransition mismachtes DOM Element type and datum type

svgZoom.translateBy(
    svgOverlayTransition,
    20,
    function(datum, index, groups) {
        const that: SVGRectElement = this;
        const d: SVGDatum = datum;
        const i: number = index;
        const g: SVGRectElement[] | ArrayLike<SVGRectElement> = groups;
        console.log('Owner SVG Element of svg rect: ', this.ownerSVGElement); // this is of type SVGRectElement
        console.log('Filter Brush Event status as per datum: ', d.filterBrushEvent); // datum type is SVGDatum
        return 30;
    });
svgZoom.translateBy(
    svgOverlayTransition,
    function(datum, index, groups) {
        const that: SVGRectElement = this;
        const d: SVGDatum = datum;
        const i: number = index;
        const g: SVGRectElement[] | ArrayLike<SVGRectElement> = groups;
        console.log('Owner SVG Element of svg rect: ', this.ownerSVGElement); // this is of type SVGRectElement
        console.log('Filter Brush Event status as per datum: ', d.filterBrushEvent); // datum type is SVGDatum
        return 30;
    },
    50);
svgZoom.translateBy(
    svgOverlayTransition,
    function(datum, index, groups) {
        const that: SVGRectElement = this;
        const d: SVGDatum = datum;
        const i: number = index;
        const g: SVGRectElement[] | ArrayLike<SVGRectElement> = groups;
        console.log('Owner SVG Element of svg rect: ', this.ownerSVGElement); // this is of type SVGRectElement
        console.log('Filter Brush Event status as per datum: ', d.filterBrushEvent); // datum type is SVGDatum
        return 30;
    },
    function(datum, index, groups) {
        const that: SVGRectElement = this;
        const d: SVGDatum = datum;
        const i: number = index;
        const g: SVGRectElement[] | ArrayLike<SVGRectElement> = groups;
        console.log('Owner SVG Element of svg rect: ', this.ownerSVGElement); // this is of type SVGRectElement
        console.log('Filter Brush Event status as per datum: ', d.filterBrushEvent); // datum type is SVGDatum
        return 30;
    });

// scaleBy() -------------------------------------------------------------------------------------

// use on selection
svgZoom.scaleBy(svgOverlay, 3);
// svgZoom.scaleBy(groupsSelection, 3); // fails, as groupSelection mismachtes DOM Element type and datum type

svgZoom.scaleBy(svgOverlay, function(datum, index, groups) {
    const that: SVGRectElement = this;
    const d: SVGDatum = datum;
    const i: number = index;
    const g: SVGRectElement[] | ArrayLike<SVGRectElement> = groups;
    console.log('Owner SVG Element of svg rect: ', this.ownerSVGElement); // this is of type SVGRectElement
    console.log('Filter Brush Event status as per datum: ', d.filterBrushEvent); // datum type is SVGDatum
    return 3;
});
// use on transition
svgZoom.scaleBy(svgOverlayTransition, 3);
// svgZoom.scaleBy(groupsTransition, 3); // fails, as groupTransition mismachtes DOM Element type and datum type

svgZoom.scaleBy(svgOverlayTransition, function(datum, index, groups) {
    const that: SVGRectElement = this;
    const d: SVGDatum = datum;
    const i: number = index;
    const g: SVGRectElement[] | ArrayLike<SVGRectElement> = groups;
    console.log('Owner SVG Element of svg rect: ', this.ownerSVGElement); // this is of type SVGRectElement
    console.log('Filter Brush Event status as per datum: ', d.filterBrushEvent); // datum type is SVGDatum
    return 3;
});

// scaleTo() -------------------------------------------------------------------------------------

// use on selection
svgZoom.scaleTo(svgOverlay, 3);
// svgZoom.scaleBy(groupsSelection, 3); // fails, as groupSelection mismachtes DOM Element type and datum type

svgZoom.scaleTo(svgOverlay, function(datum, index, groups) {
    const that: SVGRectElement = this;
    const d: SVGDatum = datum;
    const i: number = index;
    const g: SVGRectElement[] | ArrayLike<SVGRectElement> = groups;
    console.log('Owner SVG Element of svg rect: ', this.ownerSVGElement); // this is of type SVGRectElement
    console.log('Filter Brush Event status as per datum: ', d.filterBrushEvent); // datum type is SVGDatum
    return 3;
});
// use on transition
svgZoom.scaleTo(svgOverlayTransition, 3);
// svgZoom.scaleBy(groupsTransition, 3); // fails, as groupTransition mismachtes DOM Element type and datum type

svgZoom.scaleTo(svgOverlayTransition, function(datum, index, groups) {
    const that: SVGRectElement = this;
    const d: SVGDatum = datum;
    const i: number = index;
    const g: SVGRectElement[] | ArrayLike<SVGRectElement> = groups;
    console.log('Owner SVG Element of svg rect: ', this.ownerSVGElement); // this is of type SVGRectElement
    console.log('Filter Brush Event status as per datum: ', d.filterBrushEvent); // datum type is SVGDatum
    return 30;
});

// --------------------------------------------------------------------------
// Test Zoom Event Interface
// --------------------------------------------------------------------------

const e: d3Zoom.D3ZoomEvent<SVGRectElement, SVGDatum> = event; // mock assignment

const target: d3Zoom.ZoomBehavior<SVGRectElement, SVGDatum> = e.target;
const type: 'start' | 'zoom' | 'end' | string = e.type;
const zoomTransform: d3Zoom.ZoomTransform = e.transform;
const sourceEvent: any = e.sourceEvent;

// --------------------------------------------------------------------------
// Test Zoom Transforms
// --------------------------------------------------------------------------

// Test zoomTransform(...) --------------------------------------------------

let zTransform: d3Zoom.ZoomTransform;

zTransform = d3Zoom.zoomTransform(canvas.node()!);

// Test ZoomTransform -------------------------------------------------------

const x: number = zTransform.x;
const y: number = zTransform.y;
const k: number = zTransform.k;

const transformedPoint: [number, number] = zTransform.apply([15, 20]);
const transformedX: number = zTransform.applyX(15);
const transformedY: number = zTransform.applyY(20);

const invertedPoint: [number, number] = zTransform.invert([150, 240]);
const invertedX: number = zTransform.invertX(150);
const invertedY: number = zTransform.invertY(240);

// TODO: reScaleX, reScaleY

let linearScale: ScaleLinear<number, number> = scaleLinear();

linearScale = zTransform.rescaleX(linearScale);
linearScale = zTransform.rescaleY(linearScale);

const transformation: string = zTransform.toString();

zTransform = zTransform.translate(50, 40);

// zoomIdentity -------------------------------------------------------------

const z: d3Zoom.ZoomTransform = d3Zoom.zoomIdentity;
