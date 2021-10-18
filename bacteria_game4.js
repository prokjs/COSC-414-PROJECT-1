//Initializes vertices position and color
var vertexShaderText = [
'precision mediump float;',

'attribute vec2 vertPosition;',
'attribute vec3 vertColor;',

'varying vec3 fragColor;',

'void main()',
'{',
'	fragColor = vertColor;',
'	gl_Position = vec4(vertPosition,0.0,1.0);',
'}'
].join('\n');

//Initializes fragment color
var fragmentShaderText =
[
'precision mediump float;',

'varying vec3 fragColor;',

'void main()',
'{',
	
'	gl_FragColor = vec4(fragColor,1.0);',
'}',
].join('\n')


var InitDemo = function() {
	//Rate that sectionSize grows at
	const SECTIONSIZE_PER_SECOND = 1.0;
	var circleVertexBufferObject;
	
	var circleVertices = [];
	var vertCount = 5;
	var n = 0;
	//Game over = false;
	var gameState = true;
	//Counts have many triangles have reached max size.
	var maxSizeReached = 0;
	//Score of the game
	var totalScore = 0;
	//Timer for the game to count the delays between clicks
	var scoretimer = Date.now();
	//Number of bacteria that starts
	var numBacteria = Math.round(Math.random() * 10);
	//Stores data of colours clicked on
	var data = new Uint8Array(4);
	//Initializing previous time
	var last = new Array(numBacteria);
	//Size of section (Game over when = 30.0)
	var sectionSize = new Array(numBacteria);
	//The random angle that the bacteria starts at
	var angleStart = new Array(numBacteria);
	//The random color of the bacteria
	var colorStart = new Array(numBacteria);

	//Measures the current maximum number of bacteria that are present
	var currentBacteriaNumber = 0;
	//Array of delay between bacteria spawn
	var delayPerBacteria = new Array(numBacteria);
	
	var tempClickConfirm;

	var finalScore = 0;

	var deleteCount = 0;

	var currentTime = Date.now();
	//Time of start of game
	var spawnTime = Date.now();

	//Keeps track of outer angle of bacteria
	var leftAngle = new Array(numBacteria);
	var rightAngle = new Array(numBacteria);

	var isDead = new Array(numBacteria);
	var isMaxSize = new Array(numBacteria);


	generateBacteria(numBacteria);
	bacteriaDelay(numBacteria);

	//Generate random number of time for delay between bacteria spawn
	function bacteriaDelay(numBacteria) {
		for (i = 0; i <= numBacteria; i++) {
			delayPerBacteria[i] = Math.random() * 3.0 * 1000;
		}
	}

	//////////////////////////////////
	//       initialize WebGL       //
	//////////////////////////////////
	console.log('this is working');

	var canvas = document.getElementById('game-surface');
	var gl = canvas.getContext('webgl', {preserveDrawingBuffer: true} );

	if (!gl){
		console.log('webgl not supported, falling back on experimental-webgl');
		gl = canvas.getContext('experimental-webgl');
	}
	if (!gl){
		alert('your browser does not support webgl');
	}

	canvas.width = 600;
	canvas.height = 600;
	gl.viewport(0,0,canvas.width,canvas.height);

	

	//////////////////////////////////
	// create/compile/link shaders  //
	//////////////////////////////////
	var vertexShader = gl.createShader(gl.VERTEX_SHADER);
	var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);

	gl.shaderSource(vertexShader,vertexShaderText);
	gl.shaderSource(fragmentShader,fragmentShaderText);

	gl.compileShader(vertexShader);
	if(!gl.getShaderParameter(vertexShader,gl.COMPILE_STATUS)){
		console.error('Error compiling vertex shader!', gl.getShaderInfoLog(vertexShader))
		return;
	}
	gl.compileShader(fragmentShader);
		if(!gl.getShaderParameter(fragmentShader,gl.COMPILE_STATUS)){
		console.error('Error compiling vertex shader!', gl.getShaderInfoLog(fragmentShader))
		return;
	}

	var program = gl.createProgram();
	gl.attachShader(program,vertexShader);
	gl.attachShader(program,fragmentShader);

	gl.linkProgram(program);
	if(!gl.getProgramParameter(program,gl.LINK_STATUS)){
		console.error('Error linking program!', gl.getProgramInfo(program));
		return;
	}

	//////////////////////////////////
	//    create white circle buffer    //
	//////////////////////////////////

	//all arrays in JS is Float64 by default
	function createCircle(sSize, startAngle, sign, pieceSize, circleSize, circleColor, k) {
		circleVertices = [];
		for (var i = 0.0; i <= sSize; i += 1) {
			//Compute the angle in radians for each triangle in the circle
			var theta = startAngle + (sign * i * Math.PI / pieceSize);

			//Store the outer angles of bacteria in degrees
			if (sign == -1) {
				leftAngle[k] = Math.round(theta * 180 / Math.PI);
			} else {
				rightAngle[k] = Math.round(theta * 180 / Math.PI);
			}

			//Compute vertices of each triangle
			var vert1 = [
				Math.sin(theta) * circleSize,
				Math.cos(theta) * circleSize,
			]
			var vert2 = [
				0,
				0,
			]
			circleVertices = circleVertices.concat(vert1);
			circleVertices = circleVertices.concat(circleColor);
			circleVertices = circleVertices.concat(vert2);
			circleVertices = circleVertices.concat(circleColor);
		}
		n = circleVertices.length / vertCount;
		
		
	}

	//Changes angle and color of certain bacteria
	function generateBacteria(numBacteria) {
		for (i = 0; i <= numBacteria; i++) {
			//The random angle that the bacteria starts at
			angleStart[i] = Math.round(Math.random() * 2 * 3.1419592 * 100) / 100;
			//The random color of the bacteria
			colorStart[i] = [(0.1+Math.random()).toFixed(2),(0.1+Math.random()).toFixed(2),(0.1+Math.random()).toFixed(2)];
			//Initializing last recorded time of section size change per bacteria
			last[i] = 0.0;
			//Initializing section size of bacteria
			sectionSize[i] = 0.0;
			leftAngle[i] = angleStart[i];
			rightAngle[i] = angleStart[i];
			isDead[i] = false;
			isMaxSize[i] = false;

		}
	}

	function drawCircles(vertices, length) {
		//All arrays in JS is Float64 by default
		circleVertexBufferObject = gl.createBuffer();
		//Set the active buffer to the triangle buffer
		gl.bindBuffer(gl.ARRAY_BUFFER, circleVertexBufferObject);
		//gl expecting Float32 Array not Float64
		//gl.STATIC_DRAW means we send the data only once (the triangle vertex position
		//will not change over time)
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices),gl.STATIC_DRAW);

		var positionAttribLocation = gl.getAttribLocation(program,'vertPosition');
		var colorAttribLocation = gl.getAttribLocation(program,'vertColor');
		gl.vertexAttribPointer(
			positionAttribLocation, //Attribute location
			2, //Number of elements per attribute
			gl.FLOAT, 
			gl.FALSE,
			5*Float32Array.BYTES_PER_ELEMENT,//Size of an individual vertex
			0*Float32Array.BYTES_PER_ELEMENT//Offset from the beginning of a single vertex to this attribute
			);
		gl.vertexAttribPointer(
			colorAttribLocation, //Attribute location
			3, //Number of elements per attribute
			gl.FLOAT, 
			gl.FALSE,
			5*Float32Array.BYTES_PER_ELEMENT,//Size of an individual vertex
			2*Float32Array.BYTES_PER_ELEMENT//Offset from the beginning of a single vertex to this attribute
			);
		gl.enableVertexAttribArray(positionAttribLocation);
		gl.enableVertexAttribArray(colorAttribLocation);

		gl.useProgram(program);
		gl.drawArrays(gl.TRIANGLE_STRIP,0,length);
	}

	//Updates the section size per second of a single bacteria
	function updateSectionSize(sSize, j) {
		if(gameState == true){
			var now = Date.now();

			var time = now - last[j];
			last[j] = now;
			return (sSize + (SECTIONSIZE_PER_SECOND * time) / 100.0);
		}
	}

	//Check if the delay time has been met so that another bacteria can spawn
	function checkDelay(time, dPBacteria, cBNumber) {
		if (time - spawnTime >= dPBacteria[cBNumber]) {
			currentBacteriaNumber++;
			spawnTime = time;
		}
	}

	var tick = function() {
		
		winCondition();
		//Update sectionSize of each bacteria (based on maximum number of bacteria allowed to spawn)
		for (i = 0; i <= currentBacteriaNumber; i++) {

			if (sectionSize[i] < 30.0 && !isDead[i]) {
				sectionSize[i] = updateSectionSize(sectionSize[i], i);
			} else if (sectionSize[i] >= 30.0 && !isDead[i]){
				sizeReached(i);	
			}
			if (sectionSize[i] >= 31.0) {
				sectionSize[i] = 0.0;
			}
			
		}

		//Clear canvas to black
		gl.clearColor(0.0,0.0,0.0,1.0);
		//Clear previous rendered colors
		gl.clear(gl.COLOR_BUFFER_BIT);

		for (i = 0; i <= currentBacteriaNumber; i++) {

			//Create growing bacteria
			createCircle(sectionSize[i],angleStart[i],1,360,0.9,colorStart[i],i);	
			drawCircles(circleVertices,n);
			createCircle(sectionSize[i],angleStart[i],-1,360,0.9,colorStart[i],i);	
			drawCircles(circleVertices,n);

			//Create white center circle
			createCircle(360.0,0.0,1,180,0.8,[1,1,1]);	
			drawCircles(circleVertices,n);
		}
	
		currentTime = Date.now();
		checkDelay(currentTime, delayPerBacteria, currentBacteriaNumber);
		checkSameAngle(currentBacteriaNumber);
		//Repeat animation
		requestAnimationFrame(tick);
	};
	
	tick();
	function detect(){
			for(j = 0; j < colorStart.length; j++){
				tempData = [(data[0]/255).toFixed(2),(data[1]/255).toFixed(2),(data[2]/255).toFixed(2)]
				if((data[0]/255).toFixed(2) <= colorStart[j][0] + 0.1 & (data[0]/255).toFixed(2) >= colorStart[j][0] - 0.1
				& (data[1]/255).toFixed(2) <= colorStart[j][1] + 0.1 & (data[1]/255).toFixed(2) >= colorStart[j][1] - 0.1 
				& (data[2]/255).toFixed(2) <= colorStart[j][2] + 0.1 & (data[2]/255).toFixed(2) >= colorStart[j][2] - 0.1){
					isDead[j] = true;
					tempClickConfirm = true;
					score();
					sectionSize[j] = 0;
				}
			}
		
	}
	
	var read = function(){
			canvas.addEventListener('click', (e) => {
			const rect = canvas.getBoundingClientRect();
			// Detect if mouse is clicked in canvas
			mouseX = e.clientX - rect.left;
			mouseY = e.clientY - rect.top;
			
			
			
			var pixelX= mouseX * gl.canvas.width / gl.canvas.clientWidth;
			
			var pixelY = gl.canvas.height - mouseY * gl.canvas.height / gl.canvas.clientHeight - 1;
			
			
			
			gl.readPixels(pixelX,pixelY,1,1,gl.RGBA,gl.UNSIGNED_BYTE,data);
			
			
			
			
			const id = data[0] + (data[1] << 8) + (data[2] << 16) + (data[3] << 24);
			
			detect();
			console.log(data[0], data[1], data[2]);
			
			
		});
	}
	
	
	
	read();
	//Click increases score depending on the timing between clicks and the size of the triangle.
    //placeholder variable: tempClickConfirm, tempTriangleSectionSize
	//tempClickConfirm: It confirms the user's click, if the click was on a color matching one of the triangle's color, return true.
	//tempTriangleSectionSize: It holds the value of the size of the triangle the user clicked.
    function score(){
		// if the click was done correctly
		if(tempClickConfirm == true){
			
			//The score is higher the smaller the triangle is on click.
			tempScore = 30 - sectionSize[j];
			totalScore += tempScore;
			//Resetting scoretimer and tempClickConfirm for the next click.
			tempClickConfirm = false;
			//print
			finalScore = totalScore / numBacteria;
			document.getElementById('curScore').innerHTML = finalScore.toFixed(2);
		}
    }

	function winCondition(){
		if(maxSizeReached == 2){
			gameState = false;
			finalScore = 0;
			console.log("Game Over");
		}
	}

	//Checks if bacteria overlaps
	//If bacteria overlap, the latest spawned bacteria dies
	function checkSameAngle(cBacteriaNumber) {
		for (i = 0; i <= cBacteriaNumber; i++) {
			for (j = 0; j <= cBacteriaNumber; j++) {
				//Check if Bacteria i is within Bacteria j
				if (((leftAngle[i] >= leftAngle[j] && leftAngle[i] <= rightAngle[j]) || 
					(rightAngle[i] >= leftAngle[j] && rightAngle[i] <= rightAngle[j])) 
					&& i != j) {
					if (i < j) {
						//Code to remove j
						isDead[j] = true;
						sectionSize[j] = 0;
						leftAngle[j] = -1;
						rightAngle[j] = -1;
						console.log("Bacteria "+j+" is consumed by Bacteria "+i);
					} else {
						//Code to remove i
						isDead[i] = true;
						sectionSize[i] = 0;
						leftAngle[i] = -1;
						rightAngle[i] = -1;
						console.log("Bacteria "+i+" is consumed by Bacteria "+j);
					}
				}
			}
		}
	}

	function sizeReached(index) {
		if (!isMaxSize[index]) {
			maxSizeReached++;
			isMaxSize[index] = true;
		}
	}

};