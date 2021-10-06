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
	//Size of section (Game over when = 30.0)
	var sectionSize = 0.0;
	//Initializing previous time
	var last = 0.0;
	//Rate that sectionSize grows at
	const SECTIONSIZE_PER_SECOND = 1.0;

	var circleVertices = [];
	var vertCount = 5;
	var n = 0;

	//Number of bacteria that starts
	var numBacteria = Math.round(Math.random() * 10);

	//The random angle that the bacteria starts at
	var angleStart = new Array(numBacteria);
	//The random color of the bacteria
	var colorStart = new Array(numBacteria);

	generateBacteria(numBacteria);

	//////////////////////////////////
	//       initialize WebGL       //
	//////////////////////////////////
	console.log('this is working');

	var canvas = document.getElementById('game-surface');
	var gl = canvas.getContext('webgl');

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
	function createCircle(sSize, startAngle, sign, pieceSize, circleSize, circleColor) {
		circleVertices = [];
		for (var i = 0.0; i <= sSize; i += 1) {
			//Compute the angle in radians for each triangle in the circle
			var theta = startAngle + (sign * i * Math.PI / pieceSize);
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
			colorStart[i] = [0.1+Math.random(),0.1+Math.random(),0.1+Math.random()];
		}
	}

	function drawCircles(vertices, length) {
		//All arrays in JS is Float64 by default
		var circleVertexBufferObject = gl.createBuffer();
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

	//Updates the section size per second
	function updateSectionSize(sectionSize) {
		var now = Date.now();

		var time = now - last;
		last = now;

		return (sectionSize + (SECTIONSIZE_PER_SECOND * time) / 200.0) % 360;
	}

	var tick = function() {
		if (sectionSize < 30.0) {
			sectionSize = updateSectionSize(sectionSize);
		} else if (sectionSize >= 31.0) {
			sectionSize = 0.0;
		}
		//Clear canvas to black
		gl.clearColor(0.0,0.0,0.0,1.0);
		//Clear previous rendered colors
		gl.clear(gl.COLOR_BUFFER_BIT);

		for (i = 0; i <= numBacteria; i++) {

			//Create growing bacteria
			createCircle(sectionSize,angleStart[i],1,360,0.9,colorStart[i]);	
			drawCircles(circleVertices,n);
			createCircle(sectionSize,angleStart[i],-1,360,0.9,colorStart[i]);	
			drawCircles(circleVertices,n);

			//Create white center circle
			createCircle(360.0,0.0,1,180,0.8,[1,1,1]);	
			drawCircles(circleVertices,n);
		}

		//Repeat animation
		requestAnimationFrame(tick);
	};
	tick();
	
	var read = function(){
			canvas.addEventListener('click', (e) => {
			const rect = canvas.getBoundingClientRect();
			// Detect if mouse is clicked in canvas
			mouseX = e.clientX - rect.left;
			mouseY = e.clientY - rect.top;
			
			
			
			var pixelX= mouseX * gl.canvas.width / gl.canvas.clientWidth;
			
			var pixelY = gl.canvas.height - mouseY * gl.canvas.height / gl.canvas.clientHeight - 1;
			
			var data = new Uint8Array(4);
			
			gl.readPixels(pixelX,pixelY,1,1,gl.RGBA,gl.UNSIGNED_BYTE,data);
			
			
			
			
			const id = data[0] + (data[1] << 8) + (data[2] << 16) + (data[3] << 24);
			console.log(data);
			
		});
	}
	read();
};