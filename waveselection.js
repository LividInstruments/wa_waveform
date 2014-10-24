
//modified from JavaScript HTML5 Canvas example by Dan Gries, rectangleworld.com.

console.log("DRAG CANVAS JS")

function selectWave() {

	var numHandles, shapes, dragIndex, dragging, mouseX, mouseY, dragHoldX, dragHoldY;
  var sign = [1,-1];
	var ui_canvas = document.getElementById("canvas");
	ui_canvas.width = 900;
	ui_canvas.height = 100;
	var source = document.getElementById("canvaswave");
	var wctx = ui_canvas.getContext("2d");
  selection = [0,ui_canvas.width]; //declared in main.js
  
  var handlecolor = 'white';
	
	init();
	
	
	function init() {
		numHandles = 2;
		shapes = [];
		makeHandles();
		drawScreen();
		ui_canvas.addEventListener("mousedown", mDown, false);
	}
	
	//create shapes objects that we can use to draw our handles
	function makeHandles() {
	  var width = ui_canvas.width;
	  var height = ui_canvas.height;
		var i, indX, indY, indHeight, indColor, handleX, handleY;
		var handleRad = 10;
		var indWidth = 2;
		var pad = 1;
		for (i=0; i < numHandles; i++) {
			tempX = i*(width-pad);
			tempY = pad;
			tempHeight = height-(2*pad);
			tempWidth = indWidth;
			tempColor = handlecolor;
			handleX = tempX+( sign[i] * (handleRad) );
			handleY = height-(handleRad);
			tempShape = {x:tempX, y:tempY, h:tempHeight, w:tempWidth, h_x:handleX, h_y:handleY, r:handleRad, color:tempColor};
			shapes.push(tempShape);
		}
	}

  //on mouse down
	function mDown(evt) {
		var i;
		//We are going to pay attention to the layering order of the objects so that if a mouse down occurs over more than object,
		//only the topmost one will be dragged.
		var highestIndex = -1;
		
		//getting mouse position correctly, being mindful of resizing that may have occured in the browser:
		var bRect = ui_canvas.getBoundingClientRect();
		mouseX = (evt.clientX - bRect.left)*(ui_canvas.width/bRect.width);
		mouseY = (evt.clientY - bRect.top)*(ui_canvas.height/bRect.height);
				
		//find which shape was clicked
		for (i=0; i < numHandles; i++) {
			if	(hitTest(shapes[i], mouseX, mouseY)) {
				dragging = true;
				if (i > highestIndex) {
					//We will pay attention to the point on the object where the mouse is "holding" the object:
					dragHoldX = mouseX - shapes[i].x;
					dragHoldY = mouseY - shapes[i].y;
					highestIndex = i;
					dragIndex = i;
				}
			}
		}
		
		if (dragging) {
			window.addEventListener("mousemove", mMove, false);
		}
		ui_canvas.removeEventListener("mousedown", mDown, false);
		window.addEventListener("mouseup", mUp, false);
		
		//code below prevents the mouse down from having an effect on the main browser window:
		if (evt.preventDefault) {
			evt.preventDefault();
		} //standard
		else if (evt.returnValue) {
			evt.returnValue = false;
		} //older IE
		return false;
	}
	
	//on mouse up:
	function mUp(evt) {
		ui_canvas.addEventListener("mousedown", mDown, false);
		window.removeEventListener("mouseup", mUp, false);
		if (dragging) {
			dragging = false;
			window.removeEventListener("mousemove", mMove, false);
		}
	}

  //the dragging
	function mMove(evt) {
		var posX, posY;
		//var bounds = shapes[dragIndex].r;
		var bounds = 0;
		var minX = bounds;
		var maxX = ui_canvas.width - bounds;
		var minY = bounds;
		var maxY = ui_canvas.height - bounds;
		//getting mouse position correctly 
		var bRect = ui_canvas.getBoundingClientRect();
		mouseX = (evt.clientX - bRect.left)*(ui_canvas.width/bRect.width);
		mouseY = (evt.clientY - bRect.top)*(ui_canvas.height/bRect.height);
		//console.log("clamp "+minX+" "+minY);
		//clamp x and y positions to prevent object from dragging outside of canvas
		posX = mouseX - dragHoldX;
		posX = (posX < minX) ? minX : ((posX > maxX) ? maxX : posX);
		posY = mouseY - dragHoldY;
		posY = (posY < minY) ? minY : ((posY > maxY) ? maxY : posY);
		
		//update handles:
		shapes[dragIndex].x = posX;
		shapes[dragIndex].y = 0;
		shapes[dragIndex].h_x = posX+( sign[dragIndex] * (shapes[dragIndex].r) );
		shapes[dragIndex].h_y = ui_canvas.height-shapes[dragIndex].r;
		//update selection array:
		sel_pix[dragIndex] = posX;
		//console.log("sel "+sel_pix);
		drawScreen();
	}
	
	//test hit on handles. treat them as circle to make things less complicated:
	function hitTest(shape,mx,my) {
		var dx, dy;
		dx = mx - shape.h_x;
		dy = my - shape.h_y;
    var test = dx*dx + dy*dy < shape.r*shape.r;
		//a "hit" will be registered if the distance away from the center is less than the radius of the circular object		
		return (test);
	}
	
	//use objects created in makeHandles to draw them:
	function drawHandles() {
		var i;
		for (i=0; i < numHandles; i++) {
		  //indicators
			wctx.fillStyle = shapes[i].color;
			wctx.fillRect(shapes[i].x, shapes[i].y, shapes[i].w, shapes[i].h);
			//handle
			wctx.fillRect(shapes[i].h_x-shapes[i].r, shapes[i].h_y-shapes[i].r, 2*shapes[i].r, 2*shapes[i].r);
			wctx.fillStyle = shapes[i].color;
			//could draw a circle...
			//wctx.beginPath();
			//wctx.arc(shapes[i].h_x, shapes[i].h_y, shapes[i].r, 0, 2*Math.PI, false);
			//wctx.closePath();
			//wctx.fill();
		}
	}
	
	function drawScreen() {
	  //grab the waveform image from the hidden canvas:
	  wctx.drawImage(source, 0, 0, ui_canvas.width, ui_canvas.height);
	  //now draw the handles on top
		drawHandles();		
	}
	
}
