const express = require("express");
const fs = require("fs");
const cors = require("cors");

const app = express();

app.use(
    cors({
        origin: 'https://lua.flaffipony.rocks',
        optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
    })
)

app.use(express.json());

app.use(express.static('public'));

let routeData = {};
let currentStep = 0;
let stepLooped = 0;
let currentWpOnStep = 0;

function resetRouteVars(){
    currentStep = 0;
    stepLooped = 0;
    currentWpOnStep = 0;
}

app.get("/get-directions/start", (req,res)=>{
    resetRouteVars();
    res.sendStatus(200);
});

app.get("/get-directions/next-waypoint", getNextWaypoint);

function getNextWaypoint(req, res){
    const step = routeData.route[currentStep];
    if(!step){
        if(routeData.loop){
            resetRouteVars();
            getNextWaypoint(req, res);
            return;
        }else{
            res.end("end");
            return;
        }
    }

    const waypoint = step.waypoints[currentWpOnStep];
    if(!waypoint){
        if(step.loop && step.loopQuantity == 0 || step.loopQuantity < stepLooped){
            currentWpOnStep = 0;
            stepLooped++;
            getNextWaypoint(req, res);
            return;
        }else{
            currentStep++;
            currentWpOnStep = 0;
            getNextWaypoint(req, res);
            return;
        }
    }

    res.end(`${waypoint.x},${waypoint.y}`);

    const now = new Date().toLocaleString();

    console.log({
        datetime: now,
        currentStep: currentStep,
        stepLooped: stepLooped,
        currentWpOnStep: currentWpOnStep,
        waypoint: waypoint
    });

    currentWpOnStep++;

    return
}

app.post('/', function(req, res){
    routeData = req.body
    console.log(routeData);
    res.sendStatus(200);
});






const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}.`);
});