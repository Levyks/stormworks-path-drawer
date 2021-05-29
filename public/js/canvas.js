//CONSTS

const wpRectSize=16
const firstWpColor =  "green";
const middleWpColor = "red";
const lastWpColor = "blue";

const arrowLength = 15;
const arrowWidth = 15;
const arrowColor = "yellow";

//-------

let lastDrawedWaypoint;


function getDistance(pt1,pt2){
    return Math.hypot(pt1.x-pt2.x, pt1.y-pt2.y);
}

function drawWp(pt, first=false){
    console.log(first);
    const color = first ? firstWpColor : lastWpColor;

    var wpRect = new Konva.Rect({
        x: pt.x-wpRectSize/2,
        y: pt.y-wpRectSize/2,
        width: wpRectSize,
        height: wpRectSize,
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

function drawArrow(pt1, pt2){
    const distance = getDistance(pt1,pt2)
    const ratio = (distance+arrowLength)/(2*distance);
    var arrow = new Konva.Arrow({
        x: pt1.x,
        y: pt1.y,
        points: [0, 0, (pt2.x-pt1.x)*ratio, (pt2.y-pt1.y)*ratio],
        pointerLength: arrowLength,
        pointerWidth: arrowWidth,
        fill: arrowColor,
    });

    waypointsLayer.add(arrow);
}

function drawAllWps(wpArray){
    waypointsLayer.clear();
    let count = 0
    wpArray.forEach(wp => {
        drawWp(wp, count == 0);
        count+=1;
    });
}



let mapLayer = new Konva.Layer();
let waypointsLayer = new Konva.Layer();
let markersLayer = new Konva.Layer();

let waypointsLine = new Konva.Line({
    stroke: 'black',
    strokeWidth: 5,
    points: [],
});

waypointsLayer.add(waypointsLine);


$(function(){


    const cvWrapper = $("#canvasWrapper");

    var stage = new Konva.Stage({
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

    var mapImg = new Image();
    mapImg.src = "img/bigMap.png";
    mapImg.onload = ()=>{
        var mapKvImg = new Konva.Image({
            x: 0,
            y: 0,
            image: mapImg,
            width: mapImg.width,
            height: mapImg.height,
            });

            const scale = Math.min(stage.width()/mapKvImg.width(), stage.height()/mapKvImg.height());
            stage.scale({x:scale, y:scale});

            const xPos = (stage.width()-(mapKvImg.width()*scale))/2;
            const yPos = (stage.height()-(mapKvImg.height()*scale))/2;
            stage.position({x:xPos, y:yPos});

            mapLayer.add(mapKvImg);
    };

    let scaleBy = 1.1;
    stage.on('wheel', (e) => {
        e.evt.preventDefault();
        let oldScale = stage.scaleX();

        let pointer = stage.getPointerPosition();

        let mousePointTo = {
        x: (pointer.x - stage.x()) / oldScale,
        y: (pointer.y - stage.y()) / oldScale,
        };

        let newScale =
        e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;

        stage.scale({ x: newScale, y: newScale });

        let newPos = {
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
        };
        stage.position(newPos);
    });

    let isDragging=false;

    stage.on('mousedown', function (e) {
        if(allowMove) return;
        isDragging=true;
        const pos = stage.getRelativePointerPosition();
        addWaypoint(pos);
      });

    stage.on('mouseup', function () {
        isDragging=false;
    });

    stage.on('dragmove', function () {
        if(allowMove || !isDragging) return;
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