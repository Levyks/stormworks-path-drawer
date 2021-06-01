
let route = [
    {
        loop: false,
        loopQuantity: 0,
        waypoints: []
    },
];

let markers = {
    a: {
        placed: false,
        coords: {},
        inGameCoords: {},
        label: "A",
        canvasGroup: undefined,
    },
    b: {
        placed: false,
        coords: {},
        inGameCoords: {},
        label: "B",
        canvasGroup: undefined,
    },
    toPlace: false
};

let currentRouteStep = 0;
let viewCompleteRoute = false;
let loopRoute = false;

let lastPlacedWaypoint = {};

let choosenTool = 'pan';

function addWaypoint(pt){
    drawWp(pt, lastPlacedWaypoint, route[currentRouteStep].waypoints.length==0);
    
    route[currentRouteStep].waypoints.push(pt);

    lastPlacedWaypoint = pt;

    if(route[currentRouteStep].loop){
        drawCloseLoopArrow(route[currentRouteStep].waypoints);
    }
    
    updateWaypointDisplayLabel();
}

function updateWaypointDisplayLabel(){
    $("#waypoints-display").text(`Quantity: ${route[currentRouteStep].waypoints.length}`);
}

function placeMarker(markerId, pt){
    const marker = markers[markerId];
    marker.coords = pt;
    marker.placed = true;
    drawMarker(marker);
    resetPlaceMarkerButtons();
}

function resetPlaceMarkerButtons(){
    markers.toPlace = false;

    chooseTool("pan");

    $("#placemk-toolbar-radio").prop("disabled",true);  

    $(".place-marker").prop('checked', false);
    $(".place-marker-label").text("Place it");
}

function chooseTool(tool) {
    console.log(tool, "#"+tool.toLowerCase() + "-toolbar-radio")
    choosenTool = tool;

    $("#" + tool.toLowerCase() + "-toolbar-radio").prop("checked",true);
}


$(function(){
    $('input[type=radio][name=toolbar-radio]').change((e)=>{
        chooseTool(e.target.value);
    })

    $("#loop-step-cb").change((e)=>{
        route[currentRouteStep].loop = e.target.checked;
        setCanvasPathClosedState(e.target.checked, route[currentRouteStep].waypoints);
    })


    $(".place-marker").change((e) => {
        const checkState = e.target.checked;
        resetPlaceMarkerButtons();

        if(checkState){
            e.target.checked = checkState;

            var label = $("label[for='" + e.target.id    + "']");
    
            label.text(checkState ? "Click on it" : "Place it");

            markers.toPlace = e.target.getAttribute('key');

            chooseTool("placeMk");
            
            $("#placemk-toolbar-radio").prop("disabled",false);

            
            $(e.target).closest($(".modal-outside")).css("display","none");
        }
    })


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
            updateWaypointDisplayLabel();
            clearAllWps();
        }
    });

    $("#remove-first-btn").click(()=>{
        if(route[currentRouteStep].waypoints.length==0){
            alert("There is no waypoint to remove");
            return;
        }
        route[currentRouteStep].waypoints.shift();
        $("#waypoints-display").text(`Quantity: ${route[currentRouteStep].waypoints.length}`);
        redrawAllWps(route[currentRouteStep]);
    });

    $("#remove-last-btn").click(()=>{
        if(route[currentRouteStep].waypoints.length==0){
            alert("There is no waypoint to remove");
            return;
        }
        route[currentRouteStep].waypoints.pop();
        $("#waypoints-display").text(`Quantity: ${route[currentRouteStep].waypoints.length}`);
        redrawAllWps(route[currentRouteStep]);
    });

    $("#recenter-btn").click(()=>{
        recenterMap();
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

        $("#wp-distance-input").prop("disabled", false);
        $("#wp-distance-input").prop("title", "");

    }





/*
    function drawMarker(marker, pt = undefined){
        if(!pt){
            pt = marker.coords;
        }
        const baseSize = 8;
        const crossSize = (baseScize*3)-zoomBalance/4
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
    */

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

            $("#marker-a-x").val(markers.a.inGameCoords.x); 
            $("#marker-a-y").val(markers.a.inGameCoords.y);
            $("#marker-b-x").val(markers.b.inGameCoords.x);
            $("#marker-b-y").val(markers.b.inGameCoords.y);

            drawMarker(markers.a);
            drawMarker(markers.b);

            calibrate(); 

            $("#modal-out-calib").css("display","none");
        }
        reader.readAsText(e.target.files[0]);
    });

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
        $("#placewp-toolbar-radio").prop("disabled", to);
        if(to){
            chooseTool("pan");
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

    $("#zoom-in").click(()=>{
        zoomMap(3, false);
    });

    $("#zoom-out").click(()=>{
        zoomMap(-3, false);
    });

});