//CONSTS

const wpRectSize = 16
const firstWpColor =  "green";
const middleWpColor = "red";
const lastWpColor = "blue";

const arrowLength = 16;
const arrowWidth = 16;
const arrowColor = "yellow";

const pathLineStrokeWidth = 4;

const markerCrossSize = 48;
const markerCrossLineWidth = 6;
const markerCrossColor = "black";
const markerLabelOffset = 16;
const markerLabelFontSize = 48;

const zoomScaleBy = 1.05;

//-------

let lastDrawedWaypoint;
let closeLoopArrow;
let stage;

function getDistance(pt1,pt2){
    return Math.hypot(pt1.x-pt2.x, pt1.y-pt2.y);
}

function drawWp(pt, lastWp, first=false){


    drawWpRect(pt, first);

    if(first){
        startWpLine(pt);
    }else{
        drawWpLineTo(pt);
        drawArrow(lastWp, pt);
    }


}

function drawWpRect(pt, first=false){
    const color = first ? firstWpColor : lastWpColor;

    var wpRect = new Konva.Rect({
        x: pt.x,
        y: pt.y,
        offset: {x: wpRectSize/2 , y: wpRectSize/2},
        width: wpRectSize,
        height: wpRectSize,
        scale: {x: Math.min(1,1/stage.getAbsoluteScale().x), y:Math.min(1,1/stage.getAbsoluteScale().y)},
        fill: color,
    });

    if(lastDrawedWaypoint && lastDrawedWaypoint.fill() != firstWpColor) lastDrawedWaypoint.fill(middleWpColor);

    waypointsLayer.add(wpRect);
  
    lastDrawedWaypoint = wpRect;  
}

function drawWpLineTo(pt){
    newPointsArray = waypointsLine.points().concat([pt.x, pt.y]);
    waypointsLine.points(newPointsArray);
}

function startWpLine(pt){
    waypointsLine = new Konva.Line({
        stroke: 'black',
        strokeWidth: Math.min(pathLineStrokeWidth, pathLineStrokeWidth/stage.getAbsoluteScale().x ),
        points: [pt.x, pt.y],
    });
    
    waypointsLayer.add(waypointsLine);
}

function drawArrow(pt1, pt2){
    console.log(pt1,pt2);
    var arrow = new Konva.Arrow({
        x: (pt1.x+pt2.x)/2,
        y: (pt1.y+pt2.y)/2,
        offsetX: -arrowLength/2,
        pointerLength: arrowLength,
        pointerWidth: arrowWidth,
        rotation: (180/Math.PI) * Math.atan2(pt2.y-pt1.y, pt2.x-pt1.x),
        scale: {x: Math.min(1,1/stage.getAbsoluteScale().x), y:Math.min(1,1/stage.getAbsoluteScale().y)},
        fill: arrowColor,
    });

    waypointsLayer.add(arrow);

    return arrow;
}

function drawCloseLoopArrow(wpArray) {
    clearCloseLoopArrow();
    closeLoopArrow = drawArrow(wpArray[wpArray.length-1], wpArray[0]);
}

function clearCloseLoopArrow() {
    if(closeLoopArrow) closeLoopArrow.destroy();
}

function setCanvasPathClosedState(newState, wpArray) {
    waypointsLine.closed(newState);
    if(newState){
        drawCloseLoopArrow(wpArray);
    }else{
        clearCloseLoopArrow();
    }
}

function clearAllWps(){
    waypointsLayer.destroyChildren();
    waypointsLayer.clear();
}

function drawAllWps(route){
    let count = 0
    let lastRedrawedWaypoint = {};
    route.waypoints.forEach(wp => {
        drawWp(wp, lastRedrawedWaypoint, count == 0);
        lastRedrawedWaypoint = wp;
        count+=1;
    });
}

function redrawAllWps(route){
    clearAllWps();
    drawAllWps(route);
}

function drawMarker(marker){
    if(marker.canvasGroup) marker.canvasGroup.destroy();

    const markerGroup = new Konva.Group({
        x: marker.coords.x,
        y: marker.coords.y,
        scale: {x: Math.min(1,1/stage.getAbsoluteScale().x), y:Math.min(1,1/stage.getAbsoluteScale().y)},
    });
    
    marker.canvasGroup = markerGroup;

    const horizLine = new Konva.Line({
        points: [-markerCrossSize/2, 0, markerCrossSize/2, 0],
        stroke: markerCrossColor,
        strokeWidth: markerCrossLineWidth,
    });
    markerGroup.add(horizLine);

    const vertLine = new Konva.Line({
        points: [0, -markerCrossSize/2, 0, +markerCrossSize/2],
        stroke: markerCrossColor,
        strokeWidth: markerCrossLineWidth,
    });
    markerGroup.add(vertLine);

    const markerLabel = new Konva.Text({
        x: markerLabelOffset,
        y: markerLabelOffset,
        text: marker.label,
        fontSize: markerLabelFontSize,
    });

    markerGroup.add(markerLabel);

    markersLayer.add(markerGroup);
}

function zoomMap(clicks, followMouse = true){

    let oldScale = stage.scaleX();
    let pointer = followMouse ? stage.getPointerPosition() : {x: stage.width()/2, y: stage.height()/2};
    let mousePointTo = {
        x: (pointer.x - stage.x()) / oldScale,
        y: (pointer.y - stage.y()) / oldScale,
    };

    let newScale = oldScale * (zoomScaleBy**clicks);

    stage.scale({ x: newScale, y: newScale });

    let newPos = {
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
    };
    
    stage.position(newPos);

    rescaleAllNodes(newScale);
}

function rescaleAllNodes(scale){
    waypointsLayer.getChildren().forEach(node => {
        if(node.getClassName() == "Line"){
            node.strokeWidth(Math.min(pathLineStrokeWidth, pathLineStrokeWidth/scale));
            return;   
        }
        node.scale({x: Math.min(1, 1/scale), y:Math.min(1, 1/scale)});
    });

    markersLayer.getChildren().forEach(markerGroup => {
        markerGroup.scale({x: Math.min(1, 1/scale), y:Math.min(1, 1/scale)});
    });
}

function recenterMap(){
    stage.scale({x: initialScale, y: initialScale});
    stage.position({x: initialXPos, y: initialYPos});
}

let mapLayer = new Konva.Layer();
let waypointsLayer = new Konva.Layer();
let markersLayer = new Konva.Layer();

let waypointsLine;

let initialScale;
let initialXPos;
let initialYPos;

const mapImg = new Image();
mapImg.src = "img/bigMap.png";
mapImg.onload = ()=>{
    const mapKvImg = new Konva.Image({
        x: 0,
        y: 0,
        image: mapImg,
        width: mapImg.width,
        height: mapImg.height,
    });

    initialScale = Math.min(stage.width()/mapKvImg.width(), stage.height()/mapKvImg.height());
    stage.scale({x: initialScale, y: initialScale});

    initialXPos = (stage.width()-(mapKvImg.width()*initialScale))/2;
    initialYPos = (stage.height()-(mapKvImg.height()*initialScale))/2;
    stage.position({x: initialXPos, y: initialYPos});

    mapLayer.add(mapKvImg);
};


$(function(){


    const cvWrapper = $("#canvasWrapper");

    stage = new Konva.Stage({
        container: 'canvasWrapper',
        width: cvWrapper.width(),
        height: cvWrapper.height(),
        draggable: true,
        dragBoundFunc: function (pos, e) {
            return allowMove ? pos : this.getAbsolutePosition();
        }
    });
    
    stage.add(mapLayer);
    stage.add(waypointsLayer);
    stage.add(markersLayer);

    stage.on('wheel', (e) => {
        const delta = e.evt.wheelDelta ? e.evt.wheelDelta/40 : e.evt.detail ? -e.evt.detail : 0;

        e.evt.preventDefault();

        zoomMap(delta);
    });

    let isDragging=false;

    stage.on('mousedown', function (e) {
        isDragging=true;
        if(allowMove || allowMkPlacing) return;
        const pos = stage.getRelativePointerPosition();
        addWaypoint(pos);
      });

    stage.on('mouseup', function () {
        isDragging=false;
        if(allowMove) return;
        if(allowMkPlacing && markers.toPlace){
            const pos = stage.getRelativePointerPosition();
            placeMarker(markers.toPlace, pos);
        }
    });

    stage.on('dragmove', function () {
        if(allowMove || allowMkPlacing) return;
        const pos = stage.getRelativePointerPosition();
        if(getDistance(pos, lastPlacedWaypoint)>50){
            addWaypoint(pos);
        }
    });
    
    function resizeCanvas(){
        stage.width(cvWrapper.width());
        stage.height(cvWrapper.height());
    }

    $(window).resize(resizeCanvas);
});