function getDistance(pt1,pt2){
    return Math.hypot(pt1.x-pt2.x, pt1.y-pt2.y);
}

function drawWP(pt, first = false, color = defaultWaypointColor){
    const rectSize=16
    
    var wpRect = new Konva.Rect({
        x: pt.x,
        y: pt.y,
        width: rectSize,
        height: rectSize,
        fill: 'red'
    });

    waypointsLayer.add(wpRect);

    /*
    if(!first) {
        drawLine(lastDrawedWaypoint,pt);
        drawTriangleInTheMiddle(lastDrawedWaypoint,pt);
    } 
    */  
    lastDrawedWaypoint = pt;  
}

let mapLayer = new Konva.Layer();
let waypointsLayer = new Konva.Layer();
let markersLayer = new Konva.Layer();


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
        console.log(e.type)
        if(allowMove) return;
        isDragging=true;
        const pos = stage.getRelativePointerPosition();
        addWaypoint(pos);
      });

    stage.on('mouseup', function () {
        isDragging=false;
    });

    // and core function - drawing
    stage.on('dragmove', function () {
        if(allowMove || !isDragging) return;
        const pos = stage.getRelativePointerPosition();
        if(getDistance(pos, lastPlacedWaypoint)>50){
            addWaypoint(pos);
        }
    });

   drawWP({x:20, y: 20});
   drawWP({x:20, y: 1980});

    
    function resizeCanvas(){
        stage.width(cvWrapper.width());
        stage.height(cvWrapper.height());
    }

    $(window).resize(resizeCanvas);
});