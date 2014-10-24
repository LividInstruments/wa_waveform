//by Peter Nyboer pete@lividinstruments.com
//this script can read in a local file and draw the waveform to a hidden canvas.

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
var sel_samps = [0,1000]; //selection in samples
var wavescale = 2; //scale the off-screen canvas for image quality. 2 seems the best
var wavethickness = 1; //width of pen drawing the waveform. adjust to taste
var wavecolor = '#F2E138';
var backcolor = '#343752';

//LOADER FUNCTION
function Loader(source, successcallback) {
    var that = this;
    that.source = source;
    that.isLoaded = false;
    this.buffer = null;
    var request = new XMLHttpRequest();
    request.open('GET', source, true);
    request.responseType = "arraybuffer";
    request.onload = function () {
      context.decodeAudioData(request.response, function (e) {
          console.log("LOADED "+e);
          that.buffer = e;
          that.isLoaded = true;
          successcallback();

      });
    };
    request.send();
}


//DRAW FUNCTION draws to hidden canvas where we copy the pixels to the interactive canvas. This speeds up drawing when using in/out visual selection handles.
function drawBuffer(width, height, canvasctx, buffer) {
    var data = buffer.getChannelData(0);
    var last = data.length-1;
    var width_scaled = width/wavescale; //the offscreen canvas is a different size from the canvas in the UI, so we adjust for that with wavescale
    var view = sel_samps[1]-sel_samps[0]; //# of samples in current zoom level
    var sampsPerPix = (view / width_scaled);
    //calculate view in and point points based on current visual selection:
    var in_ = sel_samps[0] + Math.floor(sel_pix[0] * sampsPerPix);
    var out_ = sel_samps[1] - Math.floor( (width_scaled - sel_pix[1]) * sampsPerPix );
    sel_samps = [in_,out_]; 
    
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
    //
    selectWave(); //in waveselection.js
}


//onload
window.onload = function(){

    //global variables from UI
    var mastergainamount = 1;
    var loopState = true;

    //getting canvas context
    var canvas = document.getElementById('canvaswave');
    var ctx = canvas.getContext('2d');
    canvas.width = wavescale*900;
    canvas.height = wavescale*100;
    
    //global variables
    var MainBuffer;
    //for polyphony
    var activeVoices = [];

    //buffer
    var file = new Loader('sound.wav', function () {
        sel_samps = [0,file.buffer.getChannelData(0).length];
        drawBuffer(canvas.width, canvas.height, ctx, file.buffer);
        MainBuffer = file.buffer;
    });

    $('#zoom').click(function(){
      drawBuffer(canvas.width, canvas.height, ctx, MainBuffer);
    });
    
    $('#full').click(function(){
      sel_pix = [0, (canvas.width/wavescale)];      
      sel_samps = [0, file.buffer.getChannelData(0).length];
      drawBuffer(canvas.width, canvas.height, ctx, MainBuffer);
    });

   
};

