const express = require("express");
const fs = require("fs");
const cors = require("cors");

let waypoints = []

waypoints = JSON.parse(fs.readFileSync('waypoints.json'));
console.log(waypoints.length);

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
    var now = new Date();
    console.log(now.toLocaleTimeString(), req.query.id);
    const waypoint = waypoints[req.query.id];
    if(waypoint){
        res.end(`${waypoint.x},${waypoint.y}`);
    }else{ 
        res.end('404');
    }
});

app.post('/', function(req, res){
    waypoints.length = 0;
    console.log(req.body);
    waypoints = req.body.waypoints  
    console.log(`${waypoints.length} Waypoints loaded`);  
    res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}.`);
});