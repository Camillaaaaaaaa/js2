const model = bodySegmentation.SupportedModels.MediaPipeSelfieSegmentation;
const segmenterConfig = {
    runtime: 'tfjs',
    modelType: 'general'
};
const segmenter = await bodySegmentation.createSegmenter(model, segmenterConfig);


// get camera image 
// https://medium.com/@arpit23sh/capturing-webcam-images-using-html-and-javascript-9b8896ef1705 
let videoElement = document.getElementById('videoElement');

let stream;
async function startWebcam() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: false,
            video: {
              height: 180,
              width: 240,
              facingMode: 'user',
            } });
        videoElement.width = 240;
        videoElement.height = 180;
        videoElement.srcObject = stream;
        //https://github.com/tensorflow/tfjs/issues/322
        videoElement = await new Promise((resolve, reject) => {
            videoElement.onloadedmetadata = () => resolve(videoElement);
        });
        videoElement.play();
        analyseImage(videoElement);
        
    } catch (error) {
        console.error('Error accessing webcam:', error);
    }
}
startWebcam();

async function analyseImage(image) {
    const people = await segmenter.segmentPeople(image);

    //console.log(people);
/*
    const foregroundColor = {r: 255, g: 255, b: 255, a: 255};
    const backgroundColor = {r: 0, g: 0, b: 0, a: 255};
    const drawContour = false;
    const foregroundThreshold = 0.6;

    const backgroundDarkeningMask = await bodySegmentation.toBinaryMask(people, foregroundColor, backgroundColor, drawContour, foregroundThreshold);

    //console.log(backgroundDarkeningMask);

    const opacity = 1;
    const maskBlurAmount = 0; // Number of pixels to blur by.
    const canvas = document.getElementById('myCanvas');

    const mask = await bodySegmentation.drawMask(canvas, image, backgroundDarkeningMask, opacity, maskBlurAmount);
    //console.log(canvas.innerHTML);*/




    
    const coloredPartImage = await bodySegmentation.toBinaryMask(people);
    const opacity = 1;
    const flipHorizontal = false;
    const maskBlurAmount = 0;
    const pixelCellWidth = 20.0;
    const canvas = document.getElementById('myCanvas');
    // Draw the pixelated colored part image on top of the original image onto a
    // canvas.  Each pixel cell's width will be set to 10 px. The pixelated colored
    // part image will be drawn semi-transparent, with an opacity of 0.7, allowing
    // for the original image to be visible under.
    const mask = await bodySegmentation.drawPixelatedMask(
        canvas, image, coloredPartImage, opacity, maskBlurAmount,
        flipHorizontal, pixelCellWidth);
        
    var ctx=canvas.getContext("2d");
    canvas.style.display = "none";
    videoElement.style.display = "none";

    for(let x=0; x<canvas.width/pixelCellWidth;x++){
        for(let y=0; y<canvas.height/pixelCellWidth;y++){
            let pixel_val=ctx.getImageData(x*pixelCellWidth, y*pixelCellWidth, 1, 1).data[3]/255;
            pixel_val= (1-Math.floor(pixel_val));
            myp5.tile_p[y][canvas.width/pixelCellWidth-1-x]=pixel_val;
        }
    }
    analyseImage(videoElement);
}

async function object_detection(img){
    //const img = document.getElementById("linz");
    //img.style.display="none";
    img.width = screen.width;
    img.height = screen.height;

    //https://github.com/tensorflow/tfjs-models/tree/master/coco-ssd
    //object detection
    // Load the model.
    cocoSsd.load().then(model => {
        // detect objects in the image.
        model.detect(img).then(predictions => {
        console.log('Predictions: ', predictions);

        //console.log(predictions[0].bbox[0]);
        //mirror
        console.log(img.width);
        for (let i = 0; i < predictions.length; i++) {
            //predictions[i].bbox[0]= img.width-predictions[i].bbox[0]-predictions[i].bbox[2];
            //predictions[i].bbox[1]= img.height-predictions[i].bbox[1]-predictions[i].bbox[3];
        }
        myp5.detections=predictions;
        });
    });
}




const s = function(p) {
    p.tile_p=[];
    p.tile_size=10;
    p.tileShader;

    //https://editor.p5js.org/Jaesar/sketches/TGyEC6OYB
    p.video=p.createVideo('linz.mp4');

    p.video.loop();
    p.capture = p.video.get();

    p.tiles_dim = [12,9];
    p.dimension= [1080,720];
    p.color_per_tile=[];
    p.silhouette=[];


    p.detector;
    p.detections = [];

    p.preload= function(){
        p.tileShader = p.loadShader('shader.vert', 'shader.frag');
    }


//-----------------------------------------------------------
//                        SETUP
//-----------------------------------------------------------
  
    p.setup = function() {
        p.createCanvas(p.dimension[0],p.dimension[1]);
        p.offscreenCanvas = p.createGraphics(p.dimension[0],p.dimension[1],p.WEBGL);
        for(let x = 0; x<p.tiles_dim[1];x++){
            p.append(p.tile_p,[]);
            p.append(p.silhouette,[]);
            p.append(p.color_per_tile,[]);
            for(let y = 0; y<p.tiles_dim[0];y++){
                p.append(p.tile_p[x],0);
                p.append(p.silhouette[x],0);
                p.append(p.color_per_tile[x],p.float(p.int(1+p.random(7))));
            }
        }

    };
  
    p.draw = function() {
        p.capture = p.video.get();

        p.offscreenCanvas.shader(p.tileShader);
        p.tileShader.setUniform('tex0', p.capture);

        for(let x = 0; x<p.tiles_dim[1];x++){
            for(let y = 0; y<p.tiles_dim[0];y++){
                if(p.tile_p[x][y]){
                    p.silhouette[x][y]=p.color_per_tile[x][y];
                }else{
                    p.silhouette[x][y]=0;
                }
            }
        }
        p.tileShader.setUniform('colorM', p.silhouette.flat(Infinity));
        
        p.tileShader.setUniform('texSize', [p.capture.width,p.capture.width]);
        p.offscreenCanvas.rect(0,0,p.width, p.height);


        p.push();
        p.translate(p.width, 0);
        p.scale(-1, 1);
        p.image(p.offscreenCanvas, 0, 0);
        p.pop();

        p.stroke(0);
        p.strokeWeight(1);

        for(let i=1;i<p.tiles_dim[0];i++){
            p.line(p.width/p.tiles_dim[0]*i,0,p.width/p.tiles_dim[0]*i,p.height);
        }
        
        for(let i=1;i<p.tiles_dim[1];i++){
            p.line(0,p.height/p.tiles_dim[1]*i,p.width,p.height/p.tiles_dim[1]*i);
        }

        p.label_tiles(p.tiles_dim);
        //p.draw_outline();
    };

    //check if rectancles overlap
//https://www.educative.io/answers/how-to-check-if-two-rectangles-overlap-each-other

    p.check_rect_overlap= function(rect1,rect2){
        let widthIsPositive = Math.min(rect1[2], rect2[2]) > Math.max(rect1[0], rect2[0]);
        let heightIsPositive = Math.min(rect1[3], rect2[3]) > Math.max(rect1[1], rect2[1]);
        
        return ( widthIsPositive && heightIsPositive);
        
    }

    p.label_tiles= function(tiles_dim){
        for(let x = 0; x<tiles_dim[0];x++){
          for(let y = 0; y<tiles_dim[1];y++){
            if (p.silhouette[y][x]==7.){
              for (let i = 0; i < p.detections.length; i++) {
                let tile= [p.width/tiles_dim[0]*x, p.height/tiles_dim[1]*y, p.width/tiles_dim[0]*(x+1),p.height/tiles_dim[1]*(y+1)];
            
                let detected= [p.detections[i].bbox[0], p.detections[i].bbox[1], p.detections[i].bbox[0]+p.detections[i].bbox[2], p.detections[i].bbox[1]+p.detections[i].bbox[3]];

                if (p.check_rect_overlap(tile,detected)){
                    p.fill(255);
                    p.textSize(13);
                    p.noStroke();
                    p.text(p.round(p.detections[i].score,3)+ "% " + p.detections[i].class,tile[0]+5, tile[1]+13*(i+1));
                }else{
                    p.fill(255);
                    p.textSize(13);
                    p.noStroke();
                    p.text("no object found",tile[0]+5, tile[1]+13*(i+1));

                }
              }
            }
          }
        }
      }

     p.draw_outline= function (){
        for (let i = 0; i < p.detections.length; i++) {
          //let object = p.detections[i];
          //print(object.label);
          p.stroke(0, 255, 0);
          p.strokeWeight(4);
          p.noFill();
          p.rect(p.detections[i].bbox[0], p.detections[i].bbox[1], p.detections[i].bbox[2], p.detections[i].bbox[3]);
          p.noStroke();
          p.fill(255);
          p.textSize(24);
          //p.text(object.label, object.x + 10, object.y + 24);
        }
      }

      p.mousePressed= function () {
        if (p.mouseX > 0 && p.mouseX < p.width && p.mouseY > 0 && p.mouseY < p.height) {
          let fs = p.fullscreen();
          p.fullscreen(!fs);
        }
    }
  };
  
 var myp5 =  new p5(s); // invoke p5
 
myp5.dimension[0]=screen.width;
myp5.dimension[1]=screen.height;
//object_detection(myp5.capture);