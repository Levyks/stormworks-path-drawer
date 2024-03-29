$(function(){

    function SVGtoCommonObj(pt){
        return {
            x: pt.x,
            y: pt.y
        }
    }

    function drawLine(p1,p2){
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p1.x,p1.y);
        ctx.lineTo(p2.x,p2.y);
        ctx.stroke();
        ctx.closePath();
    }

    function drawTriangleInTheMiddle(pStart,pEnd){
        const distance = getDistance(pStart,pEnd);
        const triangleSize = 8-zoomBalance/6;

        const avgPt = {
            x: (pEnd.x+pStart.x)/2,
            y: (pEnd.y+pStart.y)/2
        }

        const deltaX = triangleSize * (pEnd.x-pStart.x) / distance;
        const deltaY = triangleSize * (pEnd.y-pStart.y) / distance;

        const p1 = {
            x: avgPt.x+deltaX,
            y: avgPt.y+deltaY
        }

        const p2 = {
            x: avgPt.x + (-(deltaX/2)-((Math.sqrt(3)/2)*deltaY)),
            y: avgPt.y + (((Math.sqrt(3)/2)*deltaX) - (deltaY/2))
        }

        const p3 = {
            x: avgPt.x + (-(deltaX/2)+((Math.sqrt(3)/2)*deltaY)),
            y: avgPt.y + (-((Math.sqrt(3)/2)*deltaX) - (deltaY/2))
        }
        
        ctx.moveTo(p1.x,p1.y);
        ctx.lineTo(p2.x,p2.y);
        ctx.lineTo(p3.x,p3.y);
        ctx.lineTo(p1.x,p1.y);

        ctx.fillStyle="yellow";
        ctx.fill()
    }

    function drawWP(pt, first = false, color = defaultWaypointColor){
        const rectSize=8-zoomBalance/6;
        ctx.fillStyle = color;
        ctx.fillRect(pt.x-(rectSize/2), pt.y-(rectSize/2), rectSize, rectSize);

        if(!first) {
            drawLine(lastDrawedWaypoint,pt);
            drawTriangleInTheMiddle(lastDrawedWaypoint,pt);
        }   
        lastDrawedWaypoint = pt;  
    }

    function closeLoop(step){
        drawLine(step.waypoints[step.waypoints.length-1],step.waypoints[0]);
        drawTriangleInTheMiddle(step.waypoints[step.waypoints.length-1],step.waypoints[0]);
    }
    
    function addWaypoint(pt){

        pt=SVGtoCommonObj(pt);

        route[currentRouteStep].waypoints.push(pt);

        lastPlacedWaypoint = pt;

        $("#waypoints-display").text(`Quantity: ${route[currentRouteStep].waypoints.length}`);

        redraw();
    }

    function drawAllWPs(){

        let count = 0

        if(route.length){
            if(!viewCompleteRoute){

                if(currentRouteStep){
                    const prevStepWPS = route[currentRouteStep-1].waypoints
                    const lastWaypointFromPrevStep = prevStepWPS[prevStepWPS.length-1];
                    if(lastWaypointFromPrevStep) drawWP(lastWaypointFromPrevStep, true, "orange");
                }

                route[currentRouteStep].waypoints.forEach(wp => {
                    let color;
                    switch (count){
                        case 0:
                            color = "green";
                            break; 
                        case route[currentRouteStep].waypoints.length-1:
                            color = "blue";
                            break;
                        default:
                            color = defaultWaypointColor;
                            break;
                    }
                            
                    drawWP(wp, !(count || currentRouteStep), color);
                    count+=1;

                });

                if(route[currentRouteStep].loop && route[currentRouteStep].waypoints.length>2) closeLoop(route[currentRouteStep]);

                if(currentRouteStep<route.length-1){
                    const nextStepWPS = route[currentRouteStep+1].waypoints
                    const firstWaypointFromPrevStep = nextStepWPS[0];
                    if(firstWaypointFromPrevStep) drawWP(firstWaypointFromPrevStep, false, "purple");  
                }
            }else{
                let drawingStep = 0;
                route.forEach((routeStep) => {
                    const lastStep = drawingStep == route.length-1;
                    let relativeCount = 0;
                    routeStep.waypoints.forEach(wp => {
                        let color;
                        if(relativeCount==0){
                            color = "green"; //FIRST WAYPOINT OF STEP
                        }else if(relativeCount == route[drawingStep].waypoints.length-1){
                            color="blue"; //LAST WAYPOINT OF STEP
                        }else{
                            color=defaultWaypointColor; //COMMON WAYPOINT
                        }
                        drawWP(wp, !count, color);
                        count+=1;
                        relativeCount+=1;
                    });
                    if(routeStep.loop && routeStep.waypoints.length>2) closeLoop(routeStep);
                    drawingStep += 1;
                });

            }
        }
    }

    const defaultWaypointColor = "red";

    function getDistance(pt1,pt2){
        return Math.hypot(pt1.x-pt2.x, pt1.y-pt2.y);
    }

    const cvWrapper = $("#canvasWrapper");
    const canvas = $("#mainCanvas");
    const canvasDOM = canvas[0]
    const ctx = canvas[0].getContext("2d");

    let dragged = false;

    var image = new Image();
    image.src = "img/bigMap.png";
    image.onload = ()=>{
        redraw();
    };

    let allowMove=true;
    $('input[type=radio][name=move-radio]').change((e)=>{
        allowMove = (e.target.value == "panNzoom");
    })

    $("#loop-step-cb").change((e)=>{
        route[currentRouteStep].loop = e.target.checked;
        redraw();
    })

    let markers = {
        a:{
            placed: false,
            coords: {},
            inGameCoords: {},
            label: "A"
        },
        b:{
            placed: false,
            coords: {},
            inGameCoords: {},
            label: "B"
        },
        toPlace: false
    }
    $(".place-marker").change((e) => {
        const checkState = e.target.checked;
        resetPlaceMarkerButtons();
        e.target.checked = checkState;

        var label = $("label[for='" + e.target.id    + "']");

        label.text(checkState ? "Click on it" : "Place it");

        if(checkState){
            markers.toPlace = e.target.getAttribute('key');
            $(e.target).closest($(".modal-outside")).css("display","none");
        }
    })

    function resetPlaceMarkerButtons(){
        markers.toPlace = false
        $(".place-marker").prop('checked', false);
        $(".place-marker-label").text("Place it");
    }

    $(".in-game-coords-input").change((e) => {
        const idSplitted = e.target.id.split('-');
        const marker = markers[idSplitted[1]];
        marker.inGameCoords[idSplitted[2]] = parseInt(e.target.value);
        setTimeout(() => {
            console.log(markers);
        }, 100);
        
    })

    

    $("#remove-all-btn").click(()=>{
        if(route[currentRouteStep].waypoints.length==0){
            alert("There is no waypoint to remove");
            return;
        }
        if(confirm("Remove all waypoints?")){
            route[currentRouteStep].waypoints.length=0;
            $("#waypoints-display").text(`Quantity: ${route[currentRouteStep].waypoints.length}`);
        }
        redraw();
    });

    $("#remove-first-btn").click(()=>{
        if(route[currentRouteStep].waypoints.length==0){
            alert("There is no waypoint to remove");
            return;
        }
        route[currentRouteStep].waypoints.shift();
        $("#waypoints-display").text(`Quantity: ${route[currentRouteStep].waypoints.length}`);
        redraw();
    });

    $("#remove-last-btn").click(()=>{
        if(route[currentRouteStep].waypoints.length==0){
            alert("There is no waypoint to remove");
            return;
        }
        route[currentRouteStep].waypoints.pop();
        $("#waypoints-display").text(`Quantity: ${route[currentRouteStep].waypoints.length}`);
        redraw();
    });

    $("#reset-btn").click(()=>{
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        zoomBalance = 0;
        redraw();
    });

    $("#revert-btn").click(()=>{
        route[currentRouteStep].waypoints.reverse();
        lastPlacedWaypoint = route[currentRouteStep].waypoints[route[currentRouteStep].waypoints.length-1];
        redraw();
    });


    function translateToGame(pt){
        return {
            x: (pt.x*calibration.ratioX)+calibration.constX,
            y: (pt.y*calibration.ratioY)+calibration.constY
        }
    }

    function translateToMap(pt){
        return {
            x: (pt.x-calibration.constX)/calibration.ratioX,
            y: (pt.y-calibration.constY)/calibration.ratioY
        }
    }

    const defaultDistanceBwWp = 10
    let distanceBetweenWPs = defaultDistanceBwWp;
    $("#wp-distance-input").change((e) => {
        if(jQuery.isEmptyObject(calibration)){
            alert("No calibration was done");
            distanceBetweenWPs = defaultDistanceBwWp;
            e.target.value=null;
            return;
        }
        const averageRatio = (Math.abs(calibration.ratioX) + Math.abs(calibration.ratioY))/2
        distanceBetweenWPs = e.target.value/averageRatio;
        console.log(distanceBetweenWPs);
    })

    let lastDrawedWaypoint = {};
    let lastPlacedWaypoint = {};

    /*-------------------------------------------------
     * MOUSE EVENTS HANDLERS */

    let dragStart;
    let lastX;
    let lastY;

    canvas.on("mousedown", (evt) => {
        document.body.style.mozUserSelect = document.body.style.webkitUserSelect = document.body.style.userSelect = 'none';
        lastX = evt.offsetX || (evt.pageX - canvas.offsetLeft);
        lastY = evt.offsetY || (evt.pageY - canvas.offsetTop);
        dragStart = ctx.transformedPoint(lastX,lastY);
        if(!allowMove && !markers.toPlace &&!viewCompleteRoute) addWaypoint(dragStart,route[currentRouteStep].waypoints.length);
        dragged = false;
    });

    canvas.on("mousemove", (evt) => {
        lastX = evt.offsetX || (evt.pageX - canvas.offsetLeft);
        lastY = evt.offsetY || (evt.pageY - canvas.offsetTop);
        dragged = true;
        if (dragStart){
            var pt = ctx.transformedPoint(lastX,lastY);
            if (allowMove){
                ctx.translate(pt.x-dragStart.x,pt.y-dragStart.y);
                redraw();
            }else{
                if(getDistance(pt,lastPlacedWaypoint) > distanceBetweenWPs && !viewCompleteRoute){
                    addWaypoint(pt);
                }
            }
        }
        
    });

    canvas.on("mouseup", (evt) => {
        dragStart = null;
		if (!dragged){
            if(markers.toPlace && !allowMove){
                lastX = evt.offsetX || (evt.pageX - canvas.offsetLeft);
                lastY = evt.offsetY || (evt.pageY - canvas.offsetTop); 
                var pt = ctx.transformedPoint(lastX,lastY);       
                let marker = markers[markers.toPlace];
                placeMarker(marker,pt);

            }else{
                zoom(evt.shiftKey ? -1 : 1 );
            } 
        } 
    });

    //-------------------------------------------------

    /*-------------------------------------------------
     * CALIBRATION AND MARKERS */

    $("#calibrate-btn").click(calibrate);

    let calibration = {}
    function calibrate(){
        const diffXinMap = markers.a.coords.x - markers.b.coords.x;
        const diffXinGame = markers.a.inGameCoords.x - markers.b.inGameCoords.x;
        calibration.ratioX = diffXinGame/diffXinMap;

        const diffYinMap = markers.a.coords.y - markers.b.coords.y;
        const diffYinGame = markers.a.inGameCoords.y - markers.b.inGameCoords.y;
        calibration.ratioY = diffYinGame/diffYinMap;

        calibration.constX = markers.a.inGameCoords.x - (markers.a.coords.x*calibration.ratioX);

        calibration.constY = markers.a.inGameCoords.y - (markers.a.coords.y*calibration.ratioY);

        console.log(calibration);
        
    }

    function placeMarker(marker, pt){
        marker.coords = SVGtoCommonObj(pt);
        marker.placed = true;
        resetPlaceMarkerButtons();
        redraw();
    }

    function drawMarker(marker, pt = undefined){
        if(!pt){
            pt = marker.coords;
        }
        const baseSize = 8;
        const crossSize = (baseSize*3)-zoomBalance/4
        ctx.lineWidth = 4 - zoomBalance/8;
        ctx.beginPath();
        ctx.moveTo(pt.x-(crossSize/2),pt.y);
        ctx.lineTo(pt.x+(crossSize/2),pt.y);
        ctx.moveTo(pt.x,pt.y-(crossSize/2));
        ctx.lineTo(pt.x,pt.y+(crossSize/2));
        ctx.stroke();
        ctx.font = `${(baseSize*4)-zoomBalance/2}px Arial`;
        ctx.fillStyle = "black";
        ctx.fillText(marker.label, pt.x+(crossSize/2), pt.y-(crossSize/2));
        ctx.closePath();
    }

    function drawAllMarkers(){
        if(markers.a.placed) drawMarker(markers.a);
        if(markers.b.placed) drawMarker(markers.b);
    }

    $("#calib-json-download-btn").click(()=>{
        if(jQuery.isEmptyObject(calibration)){
            alert("No calibration was done");
            return;
        }
        const dataToExport = {
            calibration: calibration,
            markers: markers
        }
        var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataToExport, null, 2));
        var dlAnchorElem = document.getElementById('calib-json-download-a');
        dlAnchorElem.setAttribute("href",     dataStr     );
        dlAnchorElem.setAttribute("download", "calibExport.json");
        dlAnchorElem.click();
    });

    $("#calib-json-input").change((e)=>{
        let reader = new FileReader();
        reader.onload = (data) => {
            const importedData = JSON.parse(data.target.result);        
            markers = importedData.markers;
            calibration = importedData.calibration
            $("#marker-a-x").val(markers.a.inGameCoords.x); 
            $("#marker-a-y").val(markers.a.inGameCoords.y);
            $("#marker-b-x").val(markers.b.inGameCoords.x);
            $("#marker-b-y").val(markers.b.inGameCoords.y);
            calibrate(); 
            redraw();
            $("#modal-out-calib").css("display","none");
        }
        reader.readAsText(e.target.files[0]);
    });

    //-------------------------------------------------


    /*-------------------------------------------------
     * ZOOM */

    const minZoom = -12;
    const maxZoom = 24;
    var scaleFactor = 1.1;
    var zoomBalance = 0;
    var zoom = function(clicks, followMouse = true){
        if(zoomBalance+clicks >= minZoom && zoomBalance+clicks <= maxZoom && allowMove){
            zoomBalance+=clicks;
            var pt={};
            if(followMouse){
                pt = ctx.transformedPoint(lastX,lastY);
            }else{
                pt.x = canvasDOM.width/2;
                pt.y = canvasDOM.height/2;
            }
            ctx.translate(pt.x,pt.y);
            var factor = Math.pow(scaleFactor,clicks);
            ctx.scale(factor,factor);
            ctx.translate(-pt.x,-pt.y);
            redraw();
        }
    }
   
    $("#zoom-in").click(()=>{
        zoom(3, false);
    });

    $("#zoom-out").click(()=>{
        zoom(-3, false);
    });

    var handleScroll = function(evt){
        var delta = evt.wheelDelta ? evt.wheelDelta/40 : evt.detail ? -evt.detail : 0;
        if (delta) zoom(delta);
        return evt.preventDefault() && false;
    };

    canvasDOM.addEventListener('DOMMouseScroll',handleScroll,false);
    canvasDOM.addEventListener('mousewheel',handleScroll,false);

    //-------------------------------------------------

    /*-------------------------------------------------
     * MODALS */

    $(".open-manage-modal-btn").click(updateManageTable);

    $(".open-modal-btn").click((e) => {
        $("#"+(e.target.getAttribute("modal"))).css("display","block");
    })

    $(".close-modal").click((e) => {
        $(e.target).closest($(".modal-outside")).css("display","none");
    })

    $(window).click((e) => {
        const target = $(e.target)
        if(target.hasClass("modal-outside")){
            target.css("display","none");
        }
    });

    //-------------------------------------------------

    /*-------------------------------------------------
     * ROUTE MANAGING */

    let currentRouteStep = 0;
    let viewCompleteRoute = false;
    let loopRoute = false;
    let route = [
        {
            loop: false,
            loopQuantity: 0,
            waypoints: []
        },
    ];
    
    function updateManageTable(){
        const tableBody = $("#route-table tbody");
        tableBody.empty();
        let count = 0;
        route.forEach((routeStep) => {
            const row = document.createElement('tr');
            row.innerHTML = `
            <th scope="row">${count+1}</th>
            <td>                                             
                <button class="btn route-table-btn move-route-btn" value="${count}" increment="-1"><i class="fa fa-arrow-up"></i></button>
                <button class="btn route-table-btn move-route-btn" value="${count}" increment="1"><i class="fa fa-arrow-down"></i></button> 
                <button class="btn route-table-btn delete-step-btn" value="${count}"><i class="fa fa-times text-danger"></i> </i></button>  
            </td>
            <td>${routeStep.waypoints.length}</td>
            <td>
                <input class="form-check-input" type="radio" name="current-route" value="${count}" ${currentRouteStep == count && !viewCompleteRoute ? "checked" : ""}>
            </td>
            <td>
                <div class="form-check">
                    <input class="form-check-input loop-step-table-cb" value="${count}" type="checkbox" ${route[count].loop ? "checked" : ""}>
                    <div class="form-group input-group-sm"> 
                        <input type="text" class="form-control input-sm loop-quantity-input" id="loop-quantity-input-${count}" step="${count}" ${routeStep.loop && !routeStep.loopQuantity ? 'value="&#8734"' : ''} ${routeStep.loop ? "" : "disabled"}>
                    </div>   
                </div>
            </td>
            `
            tableBody[0].appendChild(row);
            
            count++;
        });

        const radioInputs = $('input[type=radio][name=current-route]');
        radioInputs.off("change");
        radioInputs.on("change", function() {
            changeCurrentStep(($(this).val()));
        });

        const loopCbs = $('.loop-step-table-cb');
        loopCbs.off("change");
        loopCbs.on("change", function(e) {
            const stepClicked = parseInt(e.target.value);
            route[stepClicked].loop = e.target.checked;
            if(stepClicked == currentRouteStep){
                $("#loop-step-cb").prop("checked", e.target.checked);
            }
            const loopInput = $(`#loop-quantity-input-${stepClicked}`);
            loopInput.val(e.target.checked ? '∞' : '');
            loopInput.prop("disabled", !e.target.checked);
        });  

        const deleteBtns = $(".delete-step-btn");
        deleteBtns.off("click");
        deleteBtns.on("click", (e) => {
            const stepClicked = parseInt(e.currentTarget.value);
            route.splice(stepClicked, 1);
            if(stepClicked<=currentRouteStep && currentRouteStep!=0) currentRouteStep--;
            if(route.length==0) setViewCompleteRoute(true);
            redraw();
            updateManageTable();
        });

        const moveRouteBtns = $(".move-route-btn");
        moveRouteBtns.off("click");
        moveRouteBtns.on("click", (e) => {
            const stepClicked = parseInt(e.currentTarget.value);
            const increment = parseInt(e.currentTarget.getAttribute("increment"));
            if(stepClicked+increment >= 0 && stepClicked+increment < route.length){
                moveArrayElement(route, stepClicked, stepClicked+increment);
                changeCurrentStep(stepClicked+increment);
                updateManageTable();
                redraw();
            }
        });

        const loopQuantityInputs = $(".loop-quantity-input");
        loopQuantityInputs.off("change");
        loopQuantityInputs.off("focus");
        loopQuantityInputs.off("blur");
        loopQuantityInputs.on("change", (e) => {
            const stepChanged = parseInt(e.target.getAttribute("step"));
            route[stepChanged].loopQuantity = parseInt(e.target.value); 
        });
        
        loopQuantityInputs.on("focus", (e) => {
            e.target.type = "number";
        });
        loopQuantityInputs.on("blur", (e) => {
            if(e.target.value == 0 || isNaN(e.target.value)){
                e.target.type = "text";
                e.target.value = "∞";
            }
        });
    }

    function setViewCompleteRoute(to, update = true){
        viewCompleteRoute = to;
        if(update)$("#view-complete-radio").click();
        if(to){
            $("#waypoints-content").css("display","none");
            $("#waypoints-content-ro").css("display","block");
        }else{
            $("#waypoints-content-ro").css("display","none");
            $("#waypoints-content").css("display","block");
        }
        if(update)updateManageTable();
    }

    function changeCurrentStep(step){
        if(step!="all"){
            setViewCompleteRoute(false,false);
            currentRouteStep = parseInt(step);
            lastPlacedWaypoint = route[currentRouteStep].waypoints[route[currentRouteStep].length-1];
            $("#loop-step-cb").prop("checked", route[currentRouteStep].loop);
            $("#waypoints-display").text(`Quantity: ${route[currentRouteStep].waypoints.length}`);
        }else{
            setViewCompleteRoute(true,false);
        }
        
        redraw();
    }

    $("#new-step-btn").click((e) => {
        route.push({
            loop: false,
            loopQuantity: 0,
            waypoints: []
        });
        changeCurrentStep(route.length-1);
        updateManageTable();
    });


    $("#remove-all-steps-btn").click(()=>{
        if(route.length==0){
            alert("There is no waypoint to remove");
            return;
        }
        if(confirm("Remove all waypoints?")){
            route.length=0;
            setViewCompleteRoute(true);
            $("#waypoints-display").text(`Quantity: 0`);
        }
        redraw();
    });

    $("#revert-route-btn").click(() => {
        currentRouteStep = route.length-currentRouteStep-1;
        route.forEach((routeStep) => {
            routeStep.waypoints.reverse();
        });
        route.reverse();
        lastPlacedWaypoint = route[currentRouteStep].waypoints[route[currentRouteStep].waypoints.length-1];
        updateManageTable();
        redraw();
    });

    $("#clone-revert-route-btn").click(() => {
        route.slice().reverse().forEach((routeStep) => {
            route.push({
                loop: routeStep.loop,
                loopQuantity: routeStep.loopQuantity,
                waypoints: routeStep.waypoints.slice().reverse()
            });
        });;
        updateManageTable();
        redraw();
    });

    $("#loop-route-cb").change((e) => {
        loopRoute = e.target.checked;
    });

    function getExportableRoute(relativeTo = "game"){
        const output = {
            "relativeTo": relativeTo,
            "loop": loopRoute,
            "route":[]
        };
        if(relativeTo == "game"){
            route.forEach((routeStep) => {
                const stepToPush = {
                    loop: routeStep.loop,
                    loopQuantity: routeStep.loopQuantity,
                    waypoints: []
                }
                routeStep.waypoints.forEach((wp) => {
                    stepToPush.waypoints.push(translateToGame(wp));
                });
                output.route.push(stepToPush);
            });
        }else{
            output.route = route;
        }
        return output;
    }

    $("#export-form").submit((e)=>{
        e.preventDefault();
        const form = e.target;
        const relativeTo = form.elements['export-relative-to'].value;

        if(!route[currentRouteStep].waypoints.length){
            alert("There is no waypoint to export");
            return;
        }
        if(relativeTo=="game" && jQuery.isEmptyObject(calibration)){
            alert("No calibration was done");
            return;
        }
        let fileName = form.elements['export-filename'].value
        if(!fileName.endsWith(".json")) fileName+=".json";

        const dataToExport = getExportableRoute(relativeTo);
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataToExport, null, 2));
        const dlAnchorElem = $('#wps-json-download-a');
        dlAnchorElem.attr("href", dataStr);
        dlAnchorElem.attr("download", fileName);
        dlAnchorElem[0].click();

        form.reset();  
        $("#modal-out-export").css("display","none");
    })

    $("#import-form").submit((e)=>{
        e.preventDefault();
        if(!confirm("This will erase the current route, are you sure?")){
            return;
        }

        const form = e.target;
        const relativeTo = form.elements['import-relative-to'].value;
        if(relativeTo=="game" && jQuery.isEmptyObject(calibration)){
            alert("No calibration was done");
            return;
        }
        let reader = new FileReader();
        reader.onload = (data) => {
            const dataParsed = JSON.parse(data.target.result);

            if(dataParsed.relativeTo !== relativeTo){
                alert(`This json is relative to "${dataParsed.relativeTo}" and not "${relativeTo}", select the correct option and try again`);
                return;
            }

            if(relativeTo=="game" && jQuery.isEmptyObject(calibration)){
                alert("No calibration was done");
                return;
            }

            route.length = 0;

            if(relativeTo == "game"){
                dataParsed.route.forEach(routeStep => {
                    const stepToPush = {
                        loop: routeStep.loop,
                        loopQuantity: routeStep.loopQuantity,
                        waypoints: []
                    }
                    routeStep.waypoints.forEach(wp => {
                        stepToPush.waypoints.push(translateToMap(wp));
                    });
                    route.push(stepToPush);
                });
            }else{
                route = dataParsed.route;
            }

            loopRoute = dataParsed.loop;

            currentRouteStep = 0;
            updateManageTable();
            $("#loop-route-cb").prop("checked", loopRoute);
            $("#waypoints-display").text(`Quantity: ${route[currentRouteStep].waypoints.length}`);  
            $("#modal-out-import").css("display","none");
            
            form.reset();  
            redraw();
        }
        reader.readAsText(form.elements['file-to-import'].files[0]);
    });

    $("#send-btn").click(()=>{
        if(jQuery.isEmptyObject(calibration)){
            alert("No calibration was done");
            return;
        }
        $.ajax({
            url: '/',
            type: 'post',
            dataType: 'json',
            contentType: 'application/json',
            data: JSON.stringify(getExportableRoute())
        });
    });



    //-------------------------------------------------

    function moveArrayElement(array, oldIndex, newIndex){
        const carrier = array[oldIndex];
        array[oldIndex] = array[newIndex];
        array[newIndex] = carrier;
    }


    function redraw(){
        var p1 = ctx.transformedPoint(0,0);
        var p2 = ctx.transformedPoint(canvasDOM.width,canvasDOM.height);
        ctx.clearRect(p1.x,p1.y,p2.x-p1.x,p2.y-p1.y);

        ctx.drawImage(image, 0 , 0);

        drawAllWPs();
        drawAllMarkers();
    }
 
    function trackTransforms(ctx){
		var svg = document.createElementNS("http://www.w3.org/2000/svg",'svg');
		var xform = svg.createSVGMatrix();
		ctx.getTransform = function(){ return xform; };
		
		var savedTransforms = [];
		var save = ctx.save;
		ctx.save = function(){
			savedTransforms.push(xform.translate(0,0));
			return save.call(ctx);
		};
		var restore = ctx.restore;
		ctx.restore = function(){
			xform = savedTransforms.pop();
			return restore.call(ctx);
		};

		var scale = ctx.scale;
		ctx.scale = function(sx,sy){
			xform = xform.scaleNonUniform(sx,sy);
			return scale.call(ctx,sx,sy);
		};
		var rotate = ctx.rotate;
		ctx.rotate = function(radians){
			xform = xform.rotate(radians*180/Math.PI);
			return rotate.call(ctx,radians);
		};
		var translate = ctx.translate;
		ctx.translate = function(dx,dy){
			xform = xform.translate(dx,dy);
			return translate.call(ctx,dx,dy);
		};
		var transform = ctx.transform;
		ctx.transform = function(a,b,c,d,e,f){
			var m2 = svg.createSVGMatrix();
			m2.a=a; m2.b=b; m2.c=c; m2.d=d; m2.e=e; m2.f=f;
			xform = xform.multiply(m2);
			return transform.call(ctx,a,b,c,d,e,f);
		};
		var setTransform = ctx.setTransform;
		ctx.setTransform = function(a,b,c,d,e,f){
			xform.a = a;
			xform.b = b;
			xform.c = c;
			xform.d = d;
			xform.e = e;
			xform.f = f;
			return setTransform.call(ctx,a,b,c,d,e,f);
		};
		var pt  = svg.createSVGPoint();
		ctx.transformedPoint = function(x,y){
			pt.x=x; pt.y=y;
			return pt.matrixTransform(xform.inverse());
		}

        ctx.reverseTransformedPoint = function(x,y){
			pt.x=x; pt.y=y;
			return pt.matrixTransform(xform);
		}
	}
    trackTransforms(ctx); 
    
    function resizeCanvas(){
        canvasDOM.width = cvWrapper.width();
        canvasDOM.height = cvWrapper.height();

        redraw();
    }

    $(window).resize(resizeCanvas);
    
    resizeCanvas();

});