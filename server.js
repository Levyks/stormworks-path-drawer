const express = require("express");
const fs = require("fs");
const cors = require("cors");

let route = {};


const app = express();

app.use(
    cors({
        origin: 'https://lua.flaffipony.rocks',
        optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
    })
)

app.use(express.json());

app.use(express.static('public'));

app.get("/waypoint", (req,res)=>{
    if(req.query.info !== undefined){
        res.end(`${route.loop ? 1 : 0},${route.waypoints.length}`)
        return;
    }
    
    var now = new Date();
    console.log(now.toLocaleTimeString(), req.query.get);
    const waypoint = route.waypoints[req.query.get];
    if(waypoint){
        res.end(`${waypoint.x},${waypoint.y}`);
    }else{ 
        res.end('404');
    }
});

app.post('/', function(req, res){
    route = req.body
    console.log(route);
    console.log(`${route.waypoints.length} Waypoints loaded`);  
    res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}.`);
});