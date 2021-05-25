distanceToAchieveWP=10
distanceToAccountForNextWP=50
radius = 13
brngRelNext = 0
straightSpeed = 25
cornerSpeed = 10
cornerAngle = math.pi/6 --30
allowChg=true

function navigate(curX,curY,dwpX,dwpY)
	brngAbs = math.pi/2 - math.atan(dwpY-curY, dwpX-curX)
	brngRel = math.fmod(brngAbs - cpsInRad, math.pi*2)
    if(brngRel>math.pi) then brngRel=brngRel-2*math.pi end
    if(brngRel<-math.pi) then brngRel=brngRel+2*math.pi end
    return getDistance(curX,curY,dwpX,dwpY), brngRel
end

function onTick()
	tX=input.getNumber(3)
	tY=input.getNumber(4)
	if input.getBool(1) then
		if allowChg and tX>40 and tX<60 and tY>40 and tY<60 then 
			async.httpGet(3000,'/get-directions/start')
			wpLoaded = false
			dataProcessed = false
			firstWp = true
			done=false
			wpX = 0
			wpY = 0
			nextWpX = 0
			nextWpY = 0
			nextWaypoint()
			nextWaypoint()
		end
		allowChg=false
	else 
		allowChg=true
	end
	if(wpLoaded) then
		compassIn = input.getNumber(5)
		gpsX = input.getNumber(6)
		gpsY = input.getNumber(7)
		
        cpsInRad = compassIn * -2 * math.pi

		distance, bearingRel = navigate(gpsX,gpsY,wpX,wpY)

		if(bearingRel>cornerAngle or bearingRel<-cornerAngle) then
			speedOut = cornerSpeed
		else
			speedOut = straightSpeed - ((straightSpeed-cornerSpeed) * (math.abs(bearingRel)/cornerAngle))          
		end

        if distance<distanceToAccountForNextWP and nextWpLoaded and not done then
            distanceNext, brngRelNext = navigate(gpsX,gpsY,nextWpX,nextWpY)
            if(brngRelNext>cornerAngle or brngRelNext<-cornerAngle) then
                speedOut = cornerSpeed
                if(brngRelNext>cornerAngle*2 or brngRelNext<-cornerAngle*2) then
                    speedOut = cornerSpeed/2
                end
            else
                speedOut = math.min(speedOut, straightSpeed - ((straightSpeed-cornerSpeed) * (math.abs(brngRelNext)/cornerAngle)))
            end
        end
		
		if(distance<distanceToAchieveWP and nextWpLoaded) then
			nextWaypoint()
		end
		
        steerOut=bearingRel/2
        if bearingRel>cornerAngle*2 or bearingRel<-cornerAngle*2 then
            steerOut=bearingRel
        end
        		
		if(done) then
			speedOut = 0
            steerOut = 0
        end
        
		dataProcessed = true

		output.setNumber(1,steerOut)
		output.setNumber(2,speedOut)

        output.setBool(1,done)

	end
end

function onDraw()
	if(allowChg) then screen.setColor(255,255,255) end
	if(dataProcessed) then
	    screen.drawText(1,1, string.format("D:%.1fm",distance))
	    screen.drawText(1,11,string.format("B : %.1f", math.deg(bearingRel)))
        screen.drawText(1,21,string.format("BN: %.1f", math.deg(brngRelNext)))
		screen.drawText(1,31,string.format("SPD:%.1f",speedOut))
	    drawCircleLinePoints(19,51,radius,bearingRel)
	end
	screen.drawRectF(40,40,20,20)
	screen.setColor(0,0,0)
	screen.drawTextBox(43,41,14,18,"RELOAD",0,0)
end

function httpReply(port, request_body, response_body)
	if(request_body ~= "/get-directions/start" and response_body ~= "connect(): Connection refused") then
	    if(response_body~='end') then
	    	x,y = response_body:match("([^,]+),([^,]+)")
	    	if(firstWp) then
		    	wpX = tonumber(x)
		    	wpY = tonumber(y)
		    	wpLoaded=true
		    	firstWp=false
		    else
		    	nextWpX = tonumber(x)
		    	nextWpY = tonumber(y)
		    	nextWpLoaded = true
		    end
	    else
	    	done=true
	    end
	end
end

function drawCircleLinePoints(cX,cY,R,angle) 
	screen.drawCircle(cX,cY,R)
	lineX = (math.sin(angle)*(R-1))+cX
	lineY = cY-(math.cos(angle)*(R-1))
	screen.setColor(255,0,0)
	screen.drawLine(cX, cY, lineX, lineY)
	screen.setColor(255,255,255)
end

function getDistance(x1,y1,x2,y2)
	return math.sqrt(((x1-x2)^2) + ((y1-y2)^2))	
end

function nextWaypoint()
	wpX = nextWpX
	wpY = nextWpY
	nextWpLoaded = false
	async.httpGet(3000,'/get-directions/next-waypoint')
end

