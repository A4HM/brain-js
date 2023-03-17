"use strict"
var object;
var a;
var overlayResultMatrix;
var overlayModelMatrix;
var camPosVector;
var distance;
fetch('http://127.0.0.1:5500/brain.json')
  .then((response) => response.json())
  .then((data) => initWebgl(data));



var boneData;

function inspect(data) {
    boneData = data;
    
    var vertices = [];
    for (let i = 0; i < boneData.meshes.length; i++) {
        for (let j = 0; j < boneData.meshes[i].vertices.length; j++) {
            vertices.push(boneData.meshes[i].vertices[j]);
        }
    }
}

var objectVertexShaderSource = [
    '#version 300 es',

    'in vec3 aPos;',
    'in vec2 aTex;',
    'in vec3 aNormal;',
    
    'out vec2 fragTex;',
    'out vec3 fragPosition;',
    'out vec3 Normal;',
    
    'uniform mat4 model;',
    'uniform mat4 view;',
    'uniform mat4 projection;',
    
    
    'void main() {',
    //'  fragColor = aColor;',
    '  fragPosition = vec3(model * vec4(aPos, 1.0));',
    '  Normal = mat3(model) * aNormal;',
    '  fragTex = aTex;',
    
    '  gl_Position = projection * view * model * vec4(aPos, 1.0);',
    '}'
].join('\n');
    
    
var objectFragmentShaderSource = [
    '#version 300 es',
    'precision mediump float;',
        
    'in vec2 fragTex;',
    'in vec3 fragPosition;',
    'in vec3 Normal;',
       
    'out vec4 fragColor;',

    'uniform vec3 lightPos;',
    'uniform sampler2D sampler;',
    
    'void main() {',
    '  vec3 ambient = vec3(0.0);',
    
    '  vec3 norm = normalize(Normal);',
    '  vec3 lightDir = normalize(lightPos - fragPosition);',
    '  float diff = max(dot(norm, lightDir), 0.0);',
    '  vec3 diffuse = diff * vec3(1.0);',
    
    '  vec3 result = (ambient + diffuse) * texture(sampler, fragTex).rgb;',
    '  fragColor = texture(sampler, fragTex);',
    '}'
].join('\n');

var overlayVertexShaderSource = [
'#version 300 es',

'in vec3 vPos;',
'in vec2 vTexCoord;',

'out vec2 fragTexCoord;',
'flat out int onLeft;',

'uniform mat4 model;',
'uniform mat4 view;',
'uniform mat4 projection;',
'uniform vec3 worldPos;',
'uniform float aspect;',
'uniform int queryState;',

'void main() {',
'  fragTexCoord = vTexCoord;',
'  vec3 vertexPosition = worldPos;',

'  gl_Position = projection * view * model * vec4(vertexPosition, 1.0);',
'  gl_Position /= gl_Position.w;',
'  gl_Position.z = 0.0;',
'  if(queryState == 0) {',
'    if(gl_Position.x >= 0.0) {gl_Position.xy += vPos.xy * vec2(0.1*aspect, 0.2) + vec2((0.05 - 0.0015)*aspect, 0.1 - 0.015);}',
'    else if(gl_Position.x < 0.0){gl_Position.xy += vPos.xy * vec2(0.1*aspect, 0.2) +  vec2((-0.05 + 0.0015)*aspect, 0.1 - 0.015); onLeft = 1;}',
'  } else if(queryState == 1) {',
'    gl_Position = projection * view * model * vec4(vertexPosition, 1.0);',
'    gl_Position /= gl_Position.w;',
'    gl_Position.xy += vPos.xy * vec2(0.005*5.0, 0.01*5.0);',
'  }',
'}'
].join('\n');

var overlayFragmentShaderSource = [
'#version 300 es',
'precision highp float;',

'in vec2 fragTexCoord;',
'flat in int onLeft;',
'out vec4 fragColor;',

'uniform sampler2D sampler1;',
'uniform sampler2D sampler2;',
'uniform float id;',
'uniform int state;',

'void main() {',
'  if(state == 0) {',
'    if(onLeft == 0){',
'      vec4 color = texture(sampler1, fragTexCoord);',
'      if(color.a < 0.8) { discard; } else { fragColor = color; }',
'    } else if(onLeft == 1){',
'        vec4 color = texture(sampler2, fragTexCoord);',
'        if(color.a < 0.8) { discard; } else { fragColor = color; }',
'      }',
'  }',
'  else if(state == 1) {',
'    fragColor = vec4(id, 0.0, 0.0, 1.0);',
'  }',
'}'
].join('\n');

function createShaders(gl, type, shaderSource) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, shaderSource);
    gl.compileShader(shader);
    if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('ERROR::SHADER\n' + gl.getShaderInfoLog(shader));
    }
    return shader;
}

function createPorgram(gl ,vshader, fshader) {
    var program = gl.createProgram();
    gl.attachShader(program, vshader);
    gl.attachShader(program, fshader);
    gl.linkProgram(program);
    if(!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('ERROR::PROGRAM\n' + gl.getProgramInfoLog(program));
    }
    return program;
}

function initWebgl(data) {
    var canvas = document.getElementById('webgl-canvas');
    var gl = canvas.getContext('webgl2',);
    gl.viewport(0, 0, canvas.clientWidth, canvas.clientHeight);
    
    a = data;

    object = {
        vertices  : data.meshes[0].vertices,
        normals   : data.meshes[0].normals,
        texCoords : data.meshes[0].texturecoords[0],
        indices   : [].concat.apply([], data.meshes[0].faces)
    
    }
    
    var overlay = {
        vertices  : [
             0.5, -0.5, 0.0,
            -0.5, -0.5, 0.0,
            -0.5,  0.5, 0.0,
            -0.5,  0.5, 0.0,
             0.5,  0.5, 0.0, 
             0.5, -0.5, 0.0],
        texCoords : [
            1.0, 1.0,
            0.0, 1.0,
            0.0, 0.0,
            0.0, 0.0,
            1.0, 0.0,
            1.0, 1.0],

        pos       : [-3.25748, 17.9458 , 111.706],
        id        : [0.01]
    
    };
    
    var objectVertexShader = createShaders(gl, gl.VERTEX_SHADER, objectVertexShaderSource);
    var objectFragmentShader = createShaders(gl, gl.FRAGMENT_SHADER, objectFragmentShaderSource);
    var objectProgram = createPorgram(gl ,objectVertexShader, objectFragmentShader);
    
    
    var posAttribLoc = gl.getAttribLocation(objectProgram, 'aPos');
    var normAttribLoc = gl.getAttribLocation(objectProgram, 'aNormal');
    var texAttribLoc = gl.getAttribLocation(objectProgram, 'aTex');
    
    var objVAO, objVBO1, objVBO2, objVBO3, objEBO;

    //set OBJECT ttributes and buffers
    objVAO = gl.createVertexArray();
    gl.bindVertexArray(objVAO);

    objVBO1 = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, objVBO1);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(object.vertices), gl.STATIC_DRAW);
    gl.vertexAttribPointer(posAttribLoc, 3, gl.FLOAT, gl.FALSE, 3 * Float32Array.BYTES_PER_ELEMENT, 0);
    gl.enableVertexAttribArray(posAttribLoc);

    objVBO2 = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, objVBO2);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(object.normals), gl.STATIC_DRAW);
    gl.vertexAttribPointer(normAttribLoc, 3, gl.FLOAT, gl.FALSE, 3 * Float32Array.BYTES_PER_ELEMENT, 0);
    gl.enableVertexAttribArray(normAttribLoc);

    objVBO3 = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, objVBO3);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(object.texCoords), gl.STATIC_DRAW);
    gl.vertexAttribPointer(texAttribLoc, 2, gl.FLOAT, gl.TRUE, 2 * Float32Array.BYTES_PER_ELEMENT, 0);
    gl.enableVertexAttribArray(texAttribLoc);

    objEBO= gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, objEBO);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(object.indices), gl.STATIC_DRAW);

    var objmodel = new Float32Array(16);
    var view = new Float32Array(16);
    var objprojection = new Float32Array(16);
    glMatrix.mat4.identity(objmodel);
    glMatrix.mat4.identity(view);
    glMatrix.mat4.identity(objprojection);

    var upVector = glMatrix.vec3.fromValues(0, 1, 0);
    var centerVector = glMatrix.vec3.fromValues(0, 0, 0);
    camPosVector = new Float32Array([0, 0, 50]);
    
     //Camera Controls
     var cameraPos = glMatrix.vec3.fromValues(0, 0, 100);
     var focusPoint = glMatrix.vec3.fromValues(0, 0, 0);
     var camFocusVector = glMatrix.vec3.create();
     glMatrix.vec3.subtract(camFocusVector, cameraPos, focusPoint);
 
     var cameraDir = glMatrix.vec3.create();
     glMatrix.vec3.subtract(cameraDir, cameraPos, focusPoint);
     glMatrix.vec3.normalize(cameraDir, cameraDir);
 
     var worldUp = glMatrix.vec3.fromValues(0, 1, 0);
     var cameraRight = glMatrix.vec3.create();
     glMatrix.vec3.cross(cameraRight, cameraDir, worldUp);
     glMatrix.vec3.normalize(cameraRight, cameraRight);
     var cameraUp = glMatrix.vec3.create();
     glMatrix.vec3.cross(cameraUp, cameraRight, cameraDir);
     glMatrix.vec3.normalize(cameraUp, cameraUp);
 
     var yaw = 0;
     var pitch = 0;
 
     var rotMatrix1 = new Float32Array(16);
     glMatrix.mat4.identity(rotMatrix1);
     var rotMatrix2 = new Float32Array(16);
     glMatrix.mat4.identity(rotMatrix2);
 
     glMatrix.mat4.rotate(rotMatrix1, rotMatrix1, Math.PI/180 * yaw, cameraUp)
     glMatrix.mat4.rotate(rotMatrix2, rotMatrix2, Math.PI/180 * pitch, cameraRight)
 
    var rotationMatrix = new Float32Array(16);
    glMatrix.mat4.multiply(rotationMatrix, rotMatrix1, rotMatrix2);

     glMatrix.vec3.scale(camFocusVector, camFocusVector, 3);
     glMatrix.vec3.transformMat4(camFocusVector, camFocusVector, rotationMatrix);

    glMatrix.mat4.lookAt(view, camFocusVector, centerVector, upVector);
    glMatrix.mat4.perspective(objprojection, glMatrix.glMatrix.toRadian(45), canvas.clientWidth / canvas.clientHeight, 0.01, 1000);
    glMatrix.mat4.rotateX(objmodel, objmodel, -Math.PI/2);
    var objModelUniformLoc = gl.getUniformLocation(objectProgram, 'model');
    var viewUniformLoc = gl.getUniformLocation(objectProgram, 'view');
    var objProjectionUniformLoc = gl.getUniformLocation(objectProgram, 'projection');
    var lightUniformLoc = gl.getUniformLocation(objectProgram, 'lightPos');

    gl.useProgram(objectProgram);
    gl.uniform3fv(lightUniformLoc, camPosVector);

    gl.uniformMatrix4fv(objModelUniformLoc, gl.FALSE, objmodel);
    gl.uniformMatrix4fv(viewUniformLoc, gl.FALSE, view);
    gl.uniformMatrix4fv(objProjectionUniformLoc, gl.FALSE, objprojection);

    var objectTexture;

    var objTexImage = new Image();
    objTexImage.src = 'object-image.png';
    objTexImage.onload = function() {
        objectTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, objectTexture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, objTexImage);
    }


    //set OVERLAY attributes and buffers and program
    var overlayVertexShader = createShaders(gl, gl.VERTEX_SHADER, overlayVertexShaderSource);
    var overlayFragmentShader = createShaders(gl, gl.FRAGMENT_SHADER, overlayFragmentShaderSource);
    var overlayProgram = createPorgram(gl ,overlayVertexShader, overlayFragmentShader);

    var ovrPosAttribLoc = gl.getAttribLocation(overlayProgram, 'vPos');
    var ovrTexCoordAttribLoc = gl.getAttribLocation(overlayProgram, 'vTexCoord');
    
    var ovrVAO, ovrVBO1, ovrVBO2;

    ovrVAO = gl.createVertexArray();
    gl.bindVertexArray(ovrVAO);

    ovrVBO1 = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, ovrVBO1);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(overlay.vertices), gl.STATIC_DRAW);
    gl.vertexAttribPointer(ovrPosAttribLoc, 3, gl.FLOAT, gl.FALSE, 3 * Float32Array.BYTES_PER_ELEMENT, 0);
    gl.enableVertexAttribArray(ovrPosAttribLoc);

    ovrVBO2 = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, ovrVBO2);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(overlay.texCoords), gl.STATIC_DRAW);
    gl.vertexAttribPointer(ovrTexCoordAttribLoc, 2, gl.FLOAT, gl.TRUE, 2 * Float32Array.BYTES_PER_ELEMENT, 0);
    gl.enableVertexAttribArray(ovrTexCoordAttribLoc);

    // var ovrTex = gl.createTexture();
    // gl.bindTexture(gl.TEXTURE_2D, ovrTex);
    // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    // var ovrImage = new Image();
    // ovrImage.src = 'http://127.0.0.1:5500/Rounded-Rectangle.png'
    // ovrImage.onload = function() {
    //     gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, ovrImage);
    // }

    var ovrModelUniformLoc = gl.getUniformLocation(overlayProgram, 'model');
    var ovrViewUniformLoc = gl.getUniformLocation(overlayProgram, 'view');
    var ovrProjectionUniformLoc = gl.getUniformLocation(overlayProgram, 'projection');

    var ovrPosition = new Float32Array([0, 0, 0])

    function setOverlayUniforms() {
        var identity = new Float32Array(16);
        glMatrix.mat4.identity(identity);
        // if(click){
        // camPosVector[0] = Math.sin(performance.now()/10000) * 300;
        // camPosVector[1] = Math.sin(performance.now()/1000) * 300;
        // camPosVector[2] = Math.cos(performance.now()/10000) * 300;
        // }
        overlayModelMatrix = new Float32Array(16);
        glMatrix.mat4.identity(overlayModelMatrix);

        var overlayViewMatrix = new Float32Array(16);
        glMatrix.mat4.lookAt(overlayViewMatrix, camFocusVector, centerVector, upVector);

        var overlayProjectionMatrix = new Float32Array(16);
        glMatrix.mat4.perspective(overlayProjectionMatrix, glMatrix.glMatrix.toRadian(fov), canvas.clientWidth / canvas.clientHeight, 0.01, 1000);
        
        gl.uniformMatrix4fv(ovrModelUniformLoc, gl.FALSE, overlayModelMatrix);
        gl.uniformMatrix4fv(ovrViewUniformLoc, gl.FALSE, view);
        gl.uniformMatrix4fv(ovrProjectionUniformLoc, gl.FALSE, overlayProjectionMatrix);
    }
    gl.useProgram(overlayProgram);
    gl.uniform1f(gl.getUniformLocation(overlayProgram, 'id'), overlay.id);
    gl.uniform1i(gl.getUniformLocation(overlayProgram, 'state'), 1);
    
    var lastX = 0;
    var lastY = 0;
    var offsetX;
    var offsetY;
    var click;
    window.addEventListener('mousedown', function(){
        click = true;
        window.addEventListener('mousemove', function(e){
            if(click && !enterPressed){
            var rect = canvas.getBoundingClientRect();
            
            var x = (e.clientX - rect.left) / (rect.right - rect.left) * canvas.width;
            var y = 600 - (e.clientY - rect.top) / (rect.bottom - rect.top) * canvas.height;
            offsetX = x - lastX;
            offsetY = y - lastY; 
            //console.log('X:'+offsetX+', Y:'+offsetY); 
            lastX = x;
            lastY = y; 
            yaw-= offsetX;  
            pitch-= offsetY;  
            if(pitch > 89){pitch = 89;}
            if(pitch < -89){pitch = -89;}
            } 
        })
    }, false);
    
    window.addEventListener('mouseup', function(){click = false;})
    //SET LABEL POSITIONS IN WORLD SPACE AND URLS
    var labelPos =  [[-36.8460,  13.6515, -4.8844],
                     [-37.8800,  17.3037,  5.4268],
                     [-38.8600,  26.8430,  5.3458],
                     [-35.1159,  12.3407,  4.0088],
                     [-36.8267,  22.2048,  4.4208],
                     [-34.7577,  29.0574, 16.1641],
                     [-35.3192,  35.0022, 20.0389],
                     [-33.2552,  44.5577, 15.8480],
                     [-35.5326,  41.8507, 15.8480],
                     
                     [-25.6152,  41.5158, 43.0036],
                     [-21.6854,  47.9761, 39.5746],
                     [- 3.9100,  57.3835, 39.2626],
                     [0.113779,  54.6029, 41.9946]
                    ];
    var aspectRatio = [];
    var numOfLoadedImages = 0;
    var urls = [ 'Brain-Labels/Inferior temporal gyrus.png',
                 'Brain-Labels/Middle temporal gyrus.png',
                 'Brain-Labels/Superior temporal gyrus.png',
                 'Brain-Labels/Inferior temporal sulcus.png',
                 'Brain-Labels/Superior temporal sulcus.png',
                 'Brain-Labels/Lateral fissure.png',
                 'Brain-Labels/Central sulcus.png',
                 'Brain-Labels/Precentral gyrus.png',
                 'Brain-Labels/Postcentral gyrus.png',
                 'Brain-Labels/Inferior frontal gyrus.png',
                 'Brain-Labels/Middle frontal gyrus.png',
                 'Brain-Labels/Superior frontal gyrus.png',
                 'Brain-Labels/Median longitudinal fissure.png'
                ];

    var urls2 = ['Brain-Labels-Reversed/Inferior temporal gyrus_REVERSED.png',
                 'Brain-Labels-Reversed/Middle temporal gyrus_REVERSED.png',
                 'Brain-Labels-Reversed/Superior temporal gyrus_REVERSED.png',
                 'Brain-Labels-Reversed/Inferior temporal sulcus_REVERSED.png',
                 'Brain-Labels-Reversed/Superior temporal sulcus_REVERSED.png',
                 'Brain-Labels-Reversed/Lateral fissure_REVERSED.png',
                 'Brain-Labels-Reversed/Central sulcus_REVERSED.png',
                 'Brain-Labels-Reversed/Precentral gyrus_REVERSED.png',
                 'Brain-Labels-Reversed/Postcentral gyrus_REVERSED.png',
                 'Brain-Labels-Reversed/Inferior frontal gyrus_REVERSED.png',
                 'Brain-Labels-Reversed/Middle frontal gyrus_REVERSED.png',
                 'Brain-Labels-Reversed/Superior frontal gyrus_REVERSED.png',
                 'Brain-Labels-Reversed/Median longitudinal fissure_REVERSED.png'
                ];


    var circleImg = new Image();
    var circleTex;
    circleImg.src = 'circle.png';
    circleImg.onload = function() {
        circleTex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, circleTex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, circleImg);
    }

    var textures = [];
    var images = [];
    for (let i = 0; i < urls.length; i++) {
        let index = i;
        images[index] = new Image();
        images[index].src = urls[index];
        images[index].onload = function() {
            textures[index] = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, textures[index]);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, images[index]);
            numOfLoadedImages++;
        }        
    }

    var textures2 = [];
    var images2 = [];
    for (let i = 0; i < urls2.length; i++) {
        let index = i;
        images2[index] = new Image();
        images2[index].src = urls2[index];
        images2[index].onload = function() {
            textures2[index] = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, textures2[index]);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, images2[index]);
            //numOfLoadedImages++;
        }        
    }
    
    var querys = [];
    var draw = [];
    for (let i = 0; i < urls.length; i++) {
        querys[i] = null;
        draw[i] = true;
    }
    console.log(querys);


    var labelSampler1 = gl.getUniformLocation(overlayProgram, 'sampler1');
    var labelSampler2 = gl.getUniformLocation(overlayProgram, 'sampler2');
    gl.uniform1i(labelSampler1, 0);
    gl.uniform1i(labelSampler2, 1);
    


document.onkeydown = checkKey;

var enterPressed = false;
function checkKey(e) {

    e = e || window.event;

    if (e.keyCode == '49') {
        // up arrow
        fov+=0.2;if(fov > 45){fov = 45;}
    }
    else if (e.keyCode == '50') {
        // down arrow
        fov-=0.2;if(fov < 5){fov = 5;}
    }
    else if (e.keyCode == '13') {
       if(enterPressed){enterPressed = false;}
       else{enterPressed = true;}
    }
    else if (e.keyCode == '39') {
       // right arrow
    }

}


    var fov = 15;
    var yaw = 0;
    var pitch = 0;
    gl.enable(gl.DEPTH_TEST);
    function renderLoop() {
        
        
        var cameraPos = glMatrix.vec3.fromValues(0, 0, 100);
     var focusPoint = glMatrix.vec3.fromValues(0, 0, 0);
     var camFocusVector = glMatrix.vec3.create();
     glMatrix.vec3.subtract(camFocusVector, cameraPos, focusPoint);
 
     var cameraDir = glMatrix.vec3.create();
     glMatrix.vec3.subtract(cameraDir, cameraPos, focusPoint);
     glMatrix.vec3.normalize(cameraDir, cameraDir);
 
     var worldUp = glMatrix.vec3.fromValues(0, 1, 0);
     var cameraRight = glMatrix.vec3.create();
     glMatrix.vec3.cross(cameraRight, cameraDir, worldUp);
     glMatrix.vec3.normalize(cameraRight, cameraRight);
     var cameraUp = glMatrix.vec3.create();
     glMatrix.vec3.cross(cameraUp, cameraRight, cameraDir);
     glMatrix.vec3.normalize(cameraUp, cameraUp);
 
 
     var rotMatrix1 = new Float32Array(16);
     glMatrix.mat4.identity(rotMatrix1);
     var rotMatrix2 = new Float32Array(16);
     glMatrix.mat4.identity(rotMatrix2);
 
     glMatrix.mat4.rotate(rotMatrix1, rotMatrix1, Math.PI/180 * yaw, cameraUp)
     glMatrix.mat4.rotate(rotMatrix2, rotMatrix2, Math.PI/180 * pitch, cameraRight)
 
    var rotationMatrix = new Float32Array(16);
    glMatrix.mat4.multiply(rotationMatrix, rotMatrix1, rotMatrix2);

     glMatrix.vec3.scale(camFocusVector, camFocusVector, 3);
     glMatrix.vec3.transformMat4(camFocusVector, camFocusVector, rotationMatrix);
     
        
        
        
        
        if(numOfLoadedImages == images.length){
            for (let i = 0; i < images.length; i++) {
                let aspect = images[i].width / images[i].height;
                aspectRatio.push(aspect);
            }
            console.log(aspectRatio);
            numOfLoadedImages = 0;
        }
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        //Draw the Bone --------------------------------------------------------------------------------------------
        gl.useProgram(objectProgram);
        glMatrix.mat4.lookAt(view, camFocusVector, centerVector, upVector);
        glMatrix.mat4.perspective(objprojection, glMatrix.glMatrix.toRadian(fov), canvas.clientWidth / canvas.clientHeight, 0.01, 1000);

        gl.uniform3fv(lightUniformLoc, camPosVector);
        gl.uniformMatrix4fv(viewUniformLoc, gl.FALSE, view);
        gl.uniformMatrix4fv(objProjectionUniformLoc, gl.FALSE, objprojection);

        gl.bindVertexArray(objVAO);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, objEBO);
        
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, objectTexture);

        gl.drawElements(gl.TRIANGLES, object.indices.length, gl.UNSIGNED_SHORT, 0);
        //----------------------------------------------------------------------------------------------------------

        //Draw Labels ----------------------------------------------------------------------------------------------
        gl.useProgram(overlayProgram);
        gl.bindVertexArray(ovrVAO);
        setOverlayUniforms();

        gl.uniform1i(gl.getUniformLocation(overlayProgram, 'state'), 0);

        //Check if any Queries has finished and delete them accordingly
        for (let i = 0; i < querys.length; i++) {
            if(gl.isQuery(querys[i]) && gl.getQueryParameter(querys[i], gl.QUERY_RESULT_AVAILABLE)) {
                if(gl.getQueryParameter(querys[i], gl.QUERY_RESULT) == 0) {
                    draw[i] = false;
                }
                else {draw[i] = true};
                gl.deleteQuery(querys[i]);
                querys[i] = null;
            }
        }

        
        //Update the Queries
        gl.colorMask(false, false, false, false);
        gl.uniform1i(gl.getUniformLocation(overlayProgram, 'queryState'), 1);
        for (let i = 0; i < urls.length; i++) {
            if(querys[i] === null) {
                querys[i] = gl.createQuery();
                gl.beginQuery(gl.ANY_SAMPLES_PASSED, querys[i]);

                gl.uniform3fv(gl.getUniformLocation(overlayProgram, 'worldPos'), labelPos[i]);
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, circleTex)
                gl.drawArrays(gl.TRIANGLES, 0, 6)

                gl.endQuery(gl.ANY_SAMPLES_PASSED);
            }
        }
        gl.colorMask(true, true, true, true);
        gl.uniform1i(gl.getUniformLocation(overlayProgram, 'queryState'), 0);


        for (let i = 0; i < querys.length; i++) {
            if(draw[i] == true && fov < 20){
                gl.uniform3fv(gl.getUniformLocation(overlayProgram, 'worldPos'), labelPos[i])
                gl.uniform1f(gl.getUniformLocation(overlayProgram, 'aspect'), aspectRatio[i]);
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, textures[i])
                gl.activeTexture(gl.TEXTURE1);
                gl.bindTexture(gl.TEXTURE_2D, textures2[i])
                gl.drawArrays(gl.TRIANGLES, 0, 6)
            }
        }
        requestAnimationFrame(renderLoop);
    }
    renderLoop();

}