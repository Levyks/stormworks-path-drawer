async.httpGet(3000,'/waypoint?id=0')
async.httpGet(3000,'/waypoint?id=1')
wpLoaded = false --true
dataProcessed = false
firstWp = true
nextWpLoaded = false
done=false
currWp = 0
wpX = 0
wpY = 0
nextWpX = 0
nextWpY = 0
distanceToAchieveWP=20
radius = 20

straightSpeed = 20
cornerSpeed = 10
cornerAngle = math.pi/6 --30


function onTick()
	if(wpLoaded) then
		compassIn = input.getNumber(1)
		gpsX = input.getNumber(2)
		gpsY = input.getNumber(3)
		
		distance = getDistance(gpsX,gpsY,wpX,wpY)
		cpsInRad = compassIn * -2 * math.pi
		bearingAbs = math.pi/2 - math.atan(wpY-gpsY, wpX-gpsX)
		bearingRel = math.fmod(bearingAbs - cpsInRad, math.pi*2)

		if(bearingRel>math.pi) then bearingRel=bearingRel-2*math.pi end
		if(bearingRel<-math.pi) then bearingRel=bearingRel+2*math.pi end
		
		if(distance<distanceToAchieveWP and nextWaypointLoaded) then
			nextWaypoint()
		end
		
		dataProcessed = true

		steerOut=bearingRel/2
		
		if(done) then
			speedOut = 0
		elseif(bearingRel>cornerAngle or bearingRel<-cornerAngle) then
			speedOut = cornerSpeed
		else
			speedOut = straightSpeed - ((straightSpeed-cornerSpeed) * (math.abs(bearingRel)/cornerAngle))
		end

		output.setNumber(1,steerOut)
		output.setBool(1,done)
		output.setNumber(2,speedOut)

	end
		
end

function onDraw()
	if(dataProcessed) then
		
	    screen.drawText(1,1, "Distance: " .. distance) 
	    screen.drawText(1,11,"X = " .. wpX)
	    screen.drawText(1,21,"Y = " .. wpY)
	    screen.drawText(1,31,"B(deg) = " .. math.deg(bearingRel))
		screen.drawText(1,41,"SPD = " .. speedOut)
	    
	    drawCircleLinePoints(26,71,radius,bearingAbs)
	    drawCircleLinePoints(71,71,radius,bearingRel)
	    drawCircleLinePoints(116,71,radius,cpsInRad)

	end
end

function httpReply(port, request_body, response_body)
    if(response_body~='404') then
    	x,y = response_body:match("([^,]+),([^,]+)")
    	if(firstWp) then
	    	wpX = tonumber(x)
	    	wpY = tonumber(y)
	    	wpLoaded=true
	    	firstWp=false
	    else
	    	nextWpX = tonumber(x)
	    	nextWpY = tonumber(y)
	    	nextWaypointLoaded = true
	    end
    else
		currWp = 0
		async.httpGet(3000,'/waypoint?id=0')
    end

end

function drawCircleLinePoints(cX,cY,R,angle) 
	screen.drawCircle(cX,cY,radius)
	lineX = (math.sin(angle)*R)+cX
	lineY = cY-(math.cos(angle)*R)
	screen.setColor(255,0,0)
	screen.drawLine(cX, cY, lineX, lineY)
	screen.setColor(255,255,255)
end

function getDistance(x1,y1,x2,y2)
	return math.sqrt(((x1-x2)^2) + ((y1-y2)^2))	
end

function nextWaypoint()
	currWp = currWp+1
	wpX = nextWpX
	wpY = nextWpY
	nextWaypointLoaded = false
	async.httpGet(3000,'/waypoint?id='..currWp+1)
end

