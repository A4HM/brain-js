var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');

ctx.fillStyle = '#000000';
ctx.fillRect(0, 0, canvas.width, canvas.clientHeight)
ctx.lineWidth = 3;
ctx.lineCap = 'round'
ctx.lineJoin = 'round'
var paths = [];
var lastX;
var lastY;
var click;
let newPath;

window.addEventListener('mousedown', function(e){
    newPath = new Path2D();

    click = true;
    var rect = canvas.getBoundingClientRect();
    var x = (e.clientX - rect.left) / (rect.right - rect.left) * canvas.width;
    var y = (e.clientY - rect.top) / (rect.bottom - rect.top) * canvas.height;
    newPath.moveTo(x, y);
    window.addEventListener('mousemove', function(e){
        if(click && enterPressed){
            var rect = canvas.getBoundingClientRect();
        
            var x = (e.clientX - rect.left) / (rect.right - rect.left) * canvas.width;
            var y = (e.clientY - rect.top) / (rect.bottom - rect.top) * canvas.height; 
            newPath.lineTo(x, y); 
            ctx.stroke(newPath);
        }
    })
}, false);
window.addEventListener('mouseup', function(){click = false; paths.push(newPath);})

var enterPressed = false;
window.addEventListener('keydown', function(e){
    if(e.ctrlKey && enterPressed && e.key == 'z'){paths.pop();}
    else if(e.key == 'Enter'){if(!enterPressed){enterPressed = true;}else{enterPressed = false;}}
    else if(e.key == 'a'){
        ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
        for (let i = 0; i < paths.length; i++) {
            ctx.stroke(paths[i]);
        }
        canvas.toBlob(function(blob) {
            saveAs(blob, "pretty image.png");
        });
        ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight)

    }
})

function Update(){
  if(!click) {
        ctx.clearRect(5, 5, canvas.clientWidth-10, canvas.clientHeight-10);
        for (let i = 0; i < paths.length; i++) {
            ctx.stroke(paths[i]);
        }
    }
    requestAnimationFrame(Update);
}
Update();