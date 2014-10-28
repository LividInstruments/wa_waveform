//by Peter Nyboer pete@lividinstruments.com
//this script can read in a local file and draw the waveform to a hidden canvas.
//this sets up interactive handles for selecting portions of the waveform
//hit test and dragging modified from JavaScript HTML5 Canvas example by Dan Gries, rectangleworld.com.

/*
Parameters:
color of wave
color of background
color of handles
color grid
thickness of wave
style of wave
file name or buffer reference
show grid
grid time resolution
include sustain handles?
size
zero cross

need to get sample rate of buffer
need to give buffer to zoomed in view
need to set to selection when zoomed out

*/

console.log("MAIN JS ");  

//initialize audio context
var context;
if (typeof AudioContext !== "undefined") {
    context = new AudioContext();
} else if (typeof webkitAudioContext !== "undefined") {
    context = new webkitAudioContext();
} else {
    throw new Error('AudioContext not supported. :(');
}

var SamplerGain = context.createGain();
var MasterGain = context.createGain();

//connections
SamplerGain.connect(MasterGain);
MasterGain.connect(context.destination);

var sel_pix = [0,900]; //position of selection handles in UI
var view_samps = [0,900]; //selection in samples
var sampsPerPix = 1;
var wavescale = 2; //scale the off-screen canvas for image quality. 2 seems the best
var wavethickness = 1; //width of pen drawing the waveform. adjust to taste
var wavecolor = '#F2E138';
var backcolor = '#343752';
var gridcolor = '#CCCCCC';
var handlecolor = 'white';
var sr = 44.1; //so we can get length in ms 
var ms = 1000; //placeholder for length

//placeholders for canvas variables.
var wctx = "";
var ui_canvas = "";
var canvas = "";
var ctx = "";

var dragIndex, dragging, mouseX, mouseY, dragHoldX, dragHoldY;
var numHandles = 2;
var sign = [1,-1];
var shapes = [];

//create shapes objects that we can use to draw our handles
function makeHandles(count) {
  shapes = [];
  numHandles = count;
  var width = wctx.canvas.width;
  var height = wctx.canvas.height;
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

//LOADER FUNCTION
function Loader(source, successcallback) {
    var that = this;
    that.source = source;
    that.isLoaded = false;
    this.buffer = null;
    console.log("load "+source);
    var request = new XMLHttpRequest();
    request.open('GET', source, true);
    request.responseType = "arraybuffer";
    request.onload = function () {
      context.decodeAudioData(request.response, function (e) {
          that.buffer = e;
          that.isLoaded = true;
          successcallback();
          console.log("LOADED "+e);
      });
    };
    request.send();
}

//DRAW WAVE draws to hidden canvas where we copy the pixels to the interactive canvas. This speeds up drawing when using in/out visual selection handles.
function drawBuffer(width, height, canvasctx, buffer) {
    var data = buffer.getChannelData(0);
    var last = data.length-1;
    var width_scaled = width/wavescale; //the offscreen canvas is a different size from the canvas in the UI, so we adjust for that with wavescale
    var view = view_samps[1]-view_samps[0]; //# of samples in current zoom level
    sampsPerPix = (view / width_scaled);
    ms = data.length/sr;
    //calculate view in and point points based on current visual selection:
    var in_ = view_samps[0] + Math.floor(sel_pix[0] * sampsPerPix);
    var out_ = view_samps[1] - Math.floor( (width_scaled - sel_pix[1]) * sampsPerPix );
    view_samps = [in_,out_]; 
    //make a table of the visible samples:
    var showdata = [];
    for (i=0; i< (out_-in_);i++){
      showdata[i] = data[i + in_];
    }
    //number of samples per pixel for current view
    var binsize = Math.floor(showdata.length / width);
    var amp = height / 2;
    canvasctx.fillStyle = backcolor;
    canvasctx.fillRect(0, 0, width, height);
    var lim = (last<width) ? last:width; //clip for short samples, if there's fewer than # of pixels in width
    canvasctx.beginPath();
    canvasctx.lineWidth = wavethickness;
    canvasctx.moveTo(0, amp);
    //figure out what to draw in this pixel, based on all the samples in the bin:
    for (var i = 0; i < lim; i++) {
        var min = 1.0;
        var max = -1.0;
        var dodraw = true;
        //scan all samples that are in a 'pixel' to find the hi and low values in the bin:
        for (j = 0; j < binsize; j++) {
            var datum = showdata[(i * binsize) + j];
            if (datum < min) min = datum;
            if (datum > max) max = datum;
            if (datum === undefined) dodraw = false; //probably not needed
        }
        if(dodraw){
          var x = i;
          var y = (1 + min) * amp;
          var h = Math.max(1, (max - min) * amp);
          canvasctx.lineTo(x, y);
          canvasctx.lineTo(x, y+h);
        }
    }    
    canvasctx.strokeStyle = wavecolor;
    canvasctx.stroke();
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
		}
	}
	
function drawScreen() {
  //grab the waveform image from the hidden canvas:
  wctx.drawImage(canvas, 0, 0, ui_canvas.width, ui_canvas.height);
  //now draw the handles on top
  drawHandles();
  //finally, draw the grid:
  drawGrid();
}

function drawGrid() {
    var gridres = 200; //ms
    var ht = wctx.canvas.height;
    var wd = wctx.canvas.width;
    wctx.lineWidth = 0.4;
    wctx.strokeStyle = gridcolor;
    wctx.beginPath();
    // vertical
    var sampspergrid = sr*gridres;
    var samps = (view_samps[1]-view_samps[0]);
    var pixpersamp = samps / wd;
    
    //calculate pixel offset for grid when zoomed:
    var factor = Math.ceil(view_samps[0]/sampspergrid);
    var offset = (factor*sampspergrid - view_samps[0]) / pixpersamp;
    
    var time = samps / sr;
    var v_grid = Math.floor(time/gridres); //every 200 ms
    
    for (var i = 0; i < v_grid; i++) {
      var x = offset + (i * (wd / v_grid));
      wctx.moveTo(x, 0.0);
      wctx.lineTo(x, ht);
    }
    // horizontal
    var h_grid = 4;
    for (var i = 0; i < h_grid; i++) {
      var y = i * ht / h_grid;
      wctx.moveTo(0.0, y);
      wctx.lineTo(wd, y);
    }
    wctx.stroke();
    wctx.fillStyle = gridcolor;
    var fsize = Math.floor(0.12*ht);
    var psize = Math.floor(0.1*ht);
    var tdisplay = Math.round(ms * 100) / 100
    wctx.font=fsize+"px Courier";
    wctx.fillText(tdisplay+" ms",psize/2,psize);
    var ms_pix = ((view_samps[1] - view_samps[0])/sr) / wd;
    var offset_ms = [ view_samps[0]/sr , view_samps[1]/sr ]; 
    var sel_ms = [ sel_pix[0]*ms_pix , sel_pix[1]*ms_pix ];
    var sellen = Math.round( (sel_ms[1]-sel_ms[0]) * 100 ) / 100;
    var d_in = Math.round( (offset_ms[0]+sel_ms[0]) * 100) / 100;
    var d_out = Math.round( (d_in+sel_ms[1]) * 100) / 100;
    wctx.fillText( d_in + ", " + d_out + " ("+ sellen +")", psize/2, ht-psize);
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

//onload
window.onload = function(){

    //global variables from UI
    var mastergainamount = 1;
    var loopState = true;

    //getting canvas context
    canvas = document.getElementById('canvaswave');
    ctx = canvas.getContext('2d');
    canvas.width = wavescale*900;
    canvas.height = wavescale*100;
    
    ui_canvas = document.getElementById("canvas");
    wctx = ui_canvas.getContext("2d");
    ui_canvas.width = 900;
    ui_canvas.height = 100;
    ui_canvas.addEventListener("mousedown", mDown, false);
    //var source = document.getElementById("canvaswave");
    selection = [0,ui_canvas.width]; 
    
    //global variables
    var MainBuffer;
    //for polyphony
    var activeVoices = [];

    makeHandles(numHandles);
    console.log("handles made");
    //buffer
    var file = new Loader('./sound.wav', function () {
        view_samps = [0,file.buffer.getChannelData(0).length];
        MainBuffer = file.buffer;
        drawBuffer(canvas.width, canvas.height, ctx, MainBuffer);
        drawScreen();
    });
    
    
    $('#zoom').click(function(){
      drawBuffer(canvas.width, canvas.height, ctx, MainBuffer);      
      sel_pix = [0, (canvas.width/wavescale)]; 
      makeHandles(numHandles);
      drawScreen();
    });
    
    $('#full').click(function(){
      sel_pix = [0, (canvas.width/wavescale)];      
      view_samps = [0, file.buffer.getChannelData(0).length];
      drawBuffer(canvas.width, canvas.height, ctx, MainBuffer);
      drawScreen();
    });
};

