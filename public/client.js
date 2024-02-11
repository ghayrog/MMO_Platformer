var scene, squareSprites, duckSprites, crabSprites, bulletSprite, grenadeSprite, goreSprite, lehaSprite, healSprite, explodeSprite, boxSprite;
var globalTimer = Date.now();
var socketDeltaTime = 0;
var PvE = 0;
var PvP = 0;
var deaths = 0;
var health = 0;
var grenades = 0;
var players = 0;

const music = new Audio("./sound/Dark Atmosphere Loop 02.wav");
music.readyToPlay = false;

function prepareClient() {
    scene = new ClientScene("game-canvas", 0, 0, 60);
    squareSprites = new SpriteSheet("./sprites/blocks.png", 1, 10, 240);
    duckSprites = new SpriteSheet("./sprites/duck.png", 14, 12, 240);
    crabSprites = new SpriteSheet("./sprites/crab.png", 14, 12, 240);
    bulletSprite = new SpriteSheet("./sprites/projectile.png", 1, 1, 240);
    grenadeSprite = new SpriteSheet("./sprites/grenade.png", 1, 1, 240);
    explodeSprite = new SpriteSheet("./sprites/explode.png", 1, 8, 240);
    goreSprite = new SpriteSheet("./sprites/gore.png", 1, 16, 240);
    lehaSprite = new SpriteSheet("./sprites/leha.png", 1, 1, 180);
    healSprite = new SpriteSheet("./sprites/heal.png", 2, 6, 240);
    boxSprite = new SpriteSheet("./sprites/box.png", 2, 6, 240);
    //console.log(socket);
    socket.on('update scene', scene.onUpdateScene.bind(scene));
    socket.on('pvp update', (data)=>{
        PvP = data;
        //console.log("Player kills: "+PvP);
    });
    socket.on('pve update', (data)=>{
        PvE = data;
        //console.log("Duck kills: " + PvE);
    });
    socket.on('deaths update', (data)=>{
        deaths = data;
        //console.log("Deaths: " + deaths);
    });
    socket.on('health update', (data)=>{
        health = data;
        //console.log("Deaths: " + deaths);
    });
    socket.on('grenade update', (data)=>{
        grenades = data;
        //console.log("Deaths: " + deaths);
    });
    music.addEventListener("canplaythrough", (event) => {
        music.volume = 0.25;
        music.loop = true;
        music.readyToPlay = true;
    });   
    AudioManager.initialize();
    AudioManager.addSound('gore1', './sound/Head exploding 2.wav'); 
    AudioManager.addSound('gore2', './sound/Insect Crush 1_2.wav'); 
    AudioManager.addSound('gore3', './sound/Ripping guts out of body 1.wav'); 
    AudioManager.addSound('gore4', './sound/Ripping guts out of body 3.wav'); 
    AudioManager.addSound('scream', './sound/Scream.mp3'); 
    AudioManager.addSound('toasty', './sound/toasty_tfCWsU6.mp3'); 
    AudioManager.addSound('shoot', './sound/Sci Fi Sniper 1.wav'); 
    AudioManager.addSound('shoot npc', './sound/Sci Fi Pistol 1.wav'); 
    AudioManager.addSound('hurt', './sound/Bloody punches 5.wav'); 
    AudioManager.addSound('heal', './sound/Health Pickup 4.wav'); 
    AudioManager.addSound('grenade', './sound/Sci Fi Grenade Launcher 4.wav'); 
    AudioManager.addSound('explode', './sound/Sci Fi Grenade 5.wav'); 
    AudioManager.addSound('blip', './sound/Blip_C_04_8-Bit_11025Hz.wav'); 
}

function spriteSheetByTag(tag) {
    switch (tag) {
        case 'squareBrick':
            return squareSprites;
            break;
        case 'squareGlass':
            return squareSprites;
            break;
        case 'squareCoverwall':
            return squareSprites;
            break;
        case 'duck':
            return duckSprites;
            break;
        case 'crab':
            return crabSprites;
            break;
        case 'bullet':
            return bulletSprite;
            break;
        case 'grenade':
            return grenadeSprite;
            break;
        case 'explode':
            return explodeSprite;
            break;
        case 'gore':
            return goreSprite;
            break;
        case 'toasty':
            return lehaSprite;
            break;
        case 'heal':
            return healSprite;
            break;
        case 'box':
            return boxSprite;
            break;
        default:
            return null;
    }
}

function setReady() {
    this.readyToPlay = true;
}

export class AudioManager {
    static soundBank = {};
    static addSound(tag, url) {
        let sound = new Audio(url);
        sound.readyToPlay = false;
        sound.addEventListener("canplaythrough", setReady.bind(sound));
        this.soundBank[tag] = sound;
    }

    static initialize() {
        socket.on('play sound', this.playSoundByTag.bind(this));
    }
    static playSoundByTag(soundData) {
        const tag = soundData.soundTag;
        if (this.soundBank[tag] && this.soundBank[tag].readyToPlay) {
            this.soundBank[tag].volume = soundData.volume;
            this.soundBank[tag].play();
        }
    }
}

//-----------------------------------------------------------------------------SCENE---------------------------------------------------------
export class ClientScene {
    constructor(canvasId, cameraX, cameraY, cameraScale) {
        this.xCameraScope = 12;
        this.yCameraScope = 7;
        this.canvasId = canvasId;
        this.cameraX = cameraX;
        this.cameraY = cameraY;
        this.xVelocityCamera = 0;
        this.yVelocityCamera = 0;
        this.cameraScale = cameraScale; //pixels per unit
        window.addEventListener('load', this.initializeCanvas.bind(this));
        //window.onload = this.initializeCanvas;
        this.previousTimeStamp = 0;
        this.deltaTime = 0;
        this.fps = 0;
        this.gameObjects = [];
        document.addEventListener('keydown', Input.updateDownKeyStates.bind(Input));
        document.addEventListener('keyup', Input.updateUpKeyStates.bind(Input));
        document.addEventListener('keypress', Input.updatePressKeyStates.bind(Input));       
        this.xAxis = Input.xAxis;
        this.yAxis = Input.yAxis;
        this.jump = Input.jump;
        this.jumpDown = Input.jumpDown;
        this.jumpUp = Input.jumpUp;    
        this.buttonA = Input.buttonA;
        this.buttonADown = Input.buttonADown;
        this.buttonAUp = Input.buttonAUp;
        this.buttonB = Input.buttonB;
        this.buttonBDown = Input.buttonBDown;
        this.buttonBUp = Input.buttonBUp;        
    }

    onUpdateScene(data) {
        //let timeStart = Date.now();
        const scene = JSON.parse(data);
        this.serverFPS = scene.fps;
        this.cameraX = scene.cameraX;
        this.cameraY = scene.cameraY;
        this.xVelocityCamera = scene.xVelocityCamera;
        this.yVelocityCamera = scene.yVelocityCamera;
        //console.log(scene.xVelocityCamera);
        this.cameraScale = scene.cameraScale;
        //console.log(scene.players);
        players = scene.players;
        //console.log(scene.gameObjects.length);
        for (let i = 0; i < scene.gameObjects.length; i++) {
            scene.gameObjects[i] = JSON.parse(scene.gameObjects[i]);
        }
        for (let i = 0; i < scene.gameObjects.length; i++) {
            let objectFound = false;
            for (let j = 0; j < this.gameObjects.length; j++)
            {
                if (scene.gameObjects[i].id == this.gameObjects[j].id) {
                    objectFound = true;
                    //copy properties
                    let sObj = scene.gameObjects[i];
                    //console.log("Object updated: " + sObj.id);                
                    let newGameObject = this.gameObjects[j];
                    let sprSheet = spriteSheetByTag(sObj.spriteSheetTag);
                    if (sprSheet != newGameObject.spriteSheet) {
                        newGameObject.spriteSheet = sprSheet;
                        newGameObject.spriteRow = 0;
                        newGameObject.spriteColumn = 0;    
                    }
                    newGameObject.label = sObj.label;
                    newGameObject.xLabelOffset = sObj.xLabelOffset;
                    newGameObject.yLabelOffset = sObj.yLabelOffset;
                    newGameObject.xPosition = sObj.xPosition;
                    newGameObject.yPosition = sObj.yPosition;
                    newGameObject.xApparentVelocity = sObj.xApparentVelocity;
                    newGameObject.yApparentVelocity = sObj.yApparentVelocity;
                    newGameObject.xScale = sObj.xScale;
                    newGameObject.yScale = sObj.yScale;
                    newGameObject.rotation = sObj.rotation;
                    newGameObject.isStatic = sObj.isStatic;
                    newGameObject.previousAnimationState = newGameObject.animationState;
                    newGameObject.animationState = sObj.animationState;
                    newGameObject.changeAnimation = sObj.changeAnimation;
                    newGameObject.order = sObj.order;
                    newGameObject.layer = sObj.layer;
                    break;
                }
            }

            if (!objectFound) {
                //create new object
                let sObj = scene.gameObjects[i];
                let newGameObject = new GameObject(sObj.name, this, sObj.xPosition, sObj.yPosition, 0, 0, sObj.xScale, sObj.yScale, sObj.rotation, sObj.isStatic);
                newGameObject.id = sObj.id;
                //if (newGameObject.isStatic) {
                //    console.log(newGameObject.name + " is static");
                //}
                if (sObj.spriteSheetTag != '') {
                    newGameObject.spriteSheet = spriteSheetByTag(sObj.spriteSheetTag);
                    newGameObject.spriteRow = 0;
                    newGameObject.spriteColumn = 0;
                }
                if (sObj.spriteSheetTag == 'squareBrick') {
                    
                }
                if (sObj.spriteSheetTag == 'squareGlass') {
                    newGameObject.spriteColumn = 6;
                }
                if (sObj.spriteSheetTag == 'squareCoverwall') {
                    newGameObject.spriteColumn = 4;
                }
                if (sObj.spriteSheetTag == 'gore') {
                    newGameObject.setAnimation(12,0,0,15,false);                   
                }
                if (sObj.spriteSheetTag == 'heal') {
                    newGameObject.animationController = healAnimationController;                   
                }
                if (sObj.spriteSheetTag == 'box') {
                    newGameObject.animationController = healAnimationController;                   
                }
                if (sObj.spriteSheetTag == 'explode') {
                    newGameObject.animationController = explodeAnimationController;                   
                }
                if ((sObj.spriteSheetTag == 'crab') ||(sObj.spriteSheetTag == 'duck')) {
                    newGameObject.animationController = charAnimationController;
                }
                newGameObject.previousAnimationState = "";
                newGameObject.xApparentVelocity = sObj.xApparentVelocity;
                newGameObject.yApparentVelocity = sObj.yApparentVelocity;
                newGameObject.animationState = sObj.animationState;
                newGameObject.changeAnimation = sObj.changeAnimation;
                newGameObject.order = sObj.order;
                newGameObject.layer = sObj.layer;
                //console.log("Object created: " + sObj.id + " " + sObj.name + " " + newGameObject.spriteSheet);                
            }
        }
        
        for (let j = 0; j < this.gameObjects.length; j++) {
            if (!this.gameObjects[j].isStatic){
                let objectFound = false;
                for (let i = 0; i < scene.gameObjects.length; i++) {
                    if (scene.gameObjects[i].id == this.gameObjects[j].id) {
                        objectFound = true;
                        break;
                    }
                }
                if (!objectFound) this.gameObjects[j].destroy();    
            } else {
                //console.log("Skipping static object");
            }
        }
        
        socketDeltaTime = Date.now() - globalTimer;
        //console.log(socketDeltaTime);
        globalTimer = Date.now();
        socket.emit('client updated', 'DUMMY DATA');
    }

    initializeCanvas(event) {
        this.canvas = document.getElementById(this.canvasId);
        //console.log(this);
        this.context = this.canvas.getContext('2d');
        this.context.imageSmoothing = false;
        window.requestAnimationFrame(this.gameLoop.bind(this));
    }

    gameLoop(timeStamp) {
        //console.log(this);
        //globalTimer = Date.now();
        let canvas = this.canvas;
        let context = this.context;
        this.deltaTime = (timeStamp - this.previousTimeStamp) / 1000;
        this.previousTimeStamp = timeStamp;
        this.deltaTime = Math.min(this.deltaTime, 0.2);
        this.fps = Math.round(1 / this.deltaTime);

        let socketFPS = 0;
        if (socketDeltaTime>0){
            socketFPS = Math.round(1 / socketDeltaTime * 1000);
        }
    

        //TODO: convert object from server to local objects with sprites (add sprites to objects somehow)
        this.gameObjects.sort(function(a,b){return (a.order - b.order);});

        context.clearRect(0,0,canvas.clientWidth, canvas.clientHeight);

        //console.log(this.gameObjects[2].isStatic);
        for (let i = 0; i < this.gameObjects.length; i++) {
            let dx = Math.abs(this.gameObjects[i].xPosition - this.cameraX);
            let dy = Math.abs(this.gameObjects[i].yPosition - this.cameraY);
            if (dx<=this.xCameraScope && dy<=this.yCameraScope) this.gameObjects[i].draw();
        }

        DrawText(this.context, this.canvas.clientWidth / 10, 15, ("Players online: " + players), "12px serif", "#ffffff");
        DrawText(this.context, this.canvas.clientWidth / 10, 30, ("Server FPS: " + this.serverFPS), "12px serif", "#ffffff");
        DrawText(this.context, this.canvas.clientWidth / 10, 45, ("Client FPS: " + this.fps), "12px serif", "#ffffff");
        DrawText(this.context, this.canvas.clientWidth / 10, 60, ("Socket FPS: " + socketFPS), "12px serif", "#ffffff");
        DrawText(this.context, this.canvas.clientWidth / 2, 15, ("PvP points: " + PvP), "14px serif", "#ffffff");
        DrawText(this.context, this.canvas.clientWidth / 2, 30, ("PvE points: " + PvE), "14px serif", "#ffffff");
        DrawText(this.context, this.canvas.clientWidth / 2, 45, ("Killed: " + deaths), "14px serif", "#ff0000");
        DrawText(this.context, this.canvas.clientWidth / 2, this.canvas.clientHeight - 30, ("Health: " + health), "14px serif", "#00ff00");
        DrawText(this.context, this.canvas.clientWidth / 2, this.canvas.clientHeight - 15, ("Grenades: " + grenades), "14px serif", "#7777ff");

        for (let i = 0; i < this.gameObjects.length; i++) {
            if (!this.gameObjects[i].isStatic) this.gameObjects[i].translate(this.gameObjects[i].xApparentVelocity * this.deltaTime, this.gameObjects[i].yApparentVelocity * this.deltaTime);
        }
        this.cameraX += this.xVelocityCamera * this.deltaTime;
        this.cameraY += this.yVelocityCamera * this.deltaTime;
        //console.log(this.xVelocityCamera);
        let isKeyStateUnchanged = (this.xAxis === Input.xAxis);
        isKeyStateUnchanged = isKeyStateUnchanged && (this.yAxis === Input.yAxis);
        isKeyStateUnchanged = isKeyStateUnchanged && (this.jump === Input.jump);
        isKeyStateUnchanged = isKeyStateUnchanged && (this.jumpDown === Input.jumpDown);
        isKeyStateUnchanged = isKeyStateUnchanged && (this.jumpUp === Input.jumpUp);
        isKeyStateUnchanged = isKeyStateUnchanged && (this.buttonA === Input.buttonA);
        isKeyStateUnchanged = isKeyStateUnchanged && (this.buttonADown === Input.buttonADown);
        isKeyStateUnchanged = isKeyStateUnchanged && (this.buttonAUp === Input.buttonAUp);
        isKeyStateUnchanged = isKeyStateUnchanged && (this.buttonB === Input.buttonB);
        isKeyStateUnchanged = isKeyStateUnchanged && (this.buttonBDown === Input.buttonBDown);
        isKeyStateUnchanged = isKeyStateUnchanged && (this.buttonBUp === Input.buttonBUp);
        isKeyStateUnchanged = isKeyStateUnchanged && (this.buttonX === Input.buttonX);
        isKeyStateUnchanged = isKeyStateUnchanged && (this.buttonXDown === Input.buttonXDown);
        isKeyStateUnchanged = isKeyStateUnchanged && (this.buttonXUp === Input.buttonXUp);
        isKeyStateUnchanged = isKeyStateUnchanged && (this.buttonY === Input.buttonY);
        isKeyStateUnchanged = isKeyStateUnchanged && (this.buttonYDown === Input.buttonYDown);
        isKeyStateUnchanged = isKeyStateUnchanged && (this.buttonYUp === Input.buttonYUp);
        isKeyStateUnchanged = isKeyStateUnchanged && (this.shift === Input.shift);
        isKeyStateUnchanged = isKeyStateUnchanged && (this.ctrl === Input.ctrl);
        isKeyStateUnchanged = isKeyStateUnchanged && (this.alt === Input.alt);

        if (!isKeyStateUnchanged) {
            //emit socket event here
            if (music.readyToPlay) {
                music.play();
                music.readyToPlay = false;
            }
            const objectToSend = {};
            objectToSend.xAxis = Input.xAxis;
            objectToSend.yAxis = Input.yAxis;
            objectToSend.shift = Input.shift;
            objectToSend.ctrl = Input.ctrl;
            objectToSend.alt = Input.alt;
            objectToSend.jump = Input.jump;
            objectToSend.jumpDown = Input.jumpDown;
            objectToSend.jumpUp = Input.jumpUp;
        
            objectToSend.buttonA = Input.buttonA;
            objectToSend.buttonADown = Input.buttonADown;
            objectToSend.buttonAUp = Input.buttonAUp;
            objectToSend.buttonB = Input.buttonB;
            objectToSend.buttonBDown = Input.buttonBDown;
            objectToSend.buttonBUp = Input.buttonBUp;

            objectToSend.buttonX = Input.buttonX;
            objectToSend.buttonXDown = Input.buttonXDown;
            objectToSend.buttonXUp = Input.buttonXUp;
            objectToSend.buttonY = Input.buttonY;
            objectToSend.buttonYDown = Input.buttonYDown;
            objectToSend.buttonYUp = Input.buttonYUp;            
            //console.log(objectToSend.alt);
            socket.emit('key state change', JSON.stringify(objectToSend));
        }

        this.xAxis = Input.xAxis;
        this.yAxis = Input.yAxis;
        this.shift = Input.shift;
        this.ctrl = Input.ctrl;
        this.alt = Input.alt;
        this.jump = Input.jump;
        this.jumpDown = Input.jumpDown;
        this.jumpUp = Input.jumpUp;
    
        this.buttonA = Input.buttonA;
        this.buttonADown = Input.buttonADown;
        this.buttonAUp = Input.buttonAUp;
        this.buttonB = Input.buttonB;
        this.buttonBDown = Input.buttonBDown;
        this.buttonBUp = Input.buttonBUp;

        this.buttonX = Input.buttonX;
        this.buttonXDown = Input.buttonXDown;
        this.buttonXUp = Input.buttonXUp;
        this.buttonY = Input.buttonY;
        this.buttonYDown = Input.buttonYDown;
        this.buttonYUp = Input.buttonYUp;

        Input.updateVoid();

        window.requestAnimationFrame(this.gameLoop.bind(this));
        //let frameTime = Date.now() - globalTimer;
        //console.log(frameTime);
    } 
    
    moveCamera(newX, newY, newScale) {
        this.cameraX = newX;
        this.cameraY = newY;
        this.cameraScale = newScale;
    }

    translateCamera(dX, dY) {
        this.cameraX += dX;
        this.cameraY += dY;
    }

    addObject(gameObject) {
        this.gameObjects.push(gameObject);
    }
    

}

function healAnimationController(gameObject) {
    if (gameObject.animationState != gameObject.previousAnimationState) {
        switch (gameObject.animationState) {
            case "enabled":
                gameObject.setAnimation(12, 0, 0, 5, true);
                break;
            case "disabled":
                gameObject.setAnimation(12, 1, 0, 5, true);
                break;
            default:
                console.log(gameObject.name + ": Undefined animation state");                
        }
    }
}

function explodeAnimationController(gameObject) {
    if (gameObject.animationState != gameObject.previousAnimationState) {
        gameObject.setAnimation(26,0,0,7, true);
    }
}


function charAnimationController(gameObject) {
    if (gameObject.animationState != gameObject.previousAnimationState) {
        switch (gameObject.animationState) {
            case "RunRight":
                gameObject.setAnimation(12, 0, 0, 3, true);
                break;
            case "IdleRight":
                gameObject.setAnimation(12, 3, 0, 3, true);
                break;
            case "RunLeft":
                gameObject.setAnimation(12, 6, 0, 3, true);
                break;
            case "IdleLeft":
                gameObject.setAnimation(12, 9, 0, 3, true);
                break;
            case "JumpRight":
                gameObject.setAnimation(12, 0, 1, 1, true);
                break;
            case "JumpLeft":
                gameObject.setAnimation(12, 6, 1, 1, true);
                break;
            case "DeathRight":
                gameObject.setAnimation(12, 12, 0, 11, false);
                break;
            case "DeathLeft":
                gameObject.setAnimation(12, 13, 0, 11, false);
                break;
            case "RunRightDownwards":
                gameObject.setAnimation(12, 1, 0, 3, true);
                break;
            case "IdleRightDownwards":
                gameObject.setAnimation(12, 4, 0, 3, true);
                break;
            case "RunLeftDownwards":
                gameObject.setAnimation(12, 7, 0, 3, true);
                break;
            case "IdleLeftDownwards":
                gameObject.setAnimation(12, 10, 0, 3, true);
                break;
            case "JumpRightDownwards":
                gameObject.setAnimation(12, 1, 1, 1, true);
                break;
            case "JumpLeftDownwards":
                gameObject.setAnimation(12, 7, 1, 1, true);
                break;
            case "RunRightUpwards":
                gameObject.setAnimation(12, 2, 0, 3, true);
                break;
            case "IdleRightUpwards":
                gameObject.setAnimation(12, 5, 0, 3, true);
                break;
            case "RunLeftUpwards":
                gameObject.setAnimation(12, 8, 0, 3, true);
                break;
            case "IdleLeftUpwards":
                gameObject.setAnimation(12, 11, 0, 3, true);
                break;
            case "JumpRightUpwards":
                gameObject.setAnimation(12, 2, 1, 1, true);
                break;
            case "JumpLeftUpwards":
                gameObject.setAnimation(12, 8, 1, 1, true);
                break;
            default:
                console.log(gameObject.name + ": Undefined animation state");
        }
        //console.log(this.animationState);
    }
}

//-----------------------------------------------------------------------------GAME OBJECT---------------------------------------------------------
export class GameObject {
    constructor(name, scene, xPosition, yPosition, xVelocity, yVelocity, xScale, yScale, rotation, isStatic) {
        this.name = name;
        this.scene = scene;
        scene.addObject(this);
        this.xPosition = xPosition;
        this.yPosition = yPosition;
        this.xPositionOld = xPosition;
        this.yPositionOld = yPosition;
        this.xVelocity = xVelocity;
        this.yVelocity = yVelocity;
        this.xScale = xScale;
        this.yScale = yScale;
        this.rotation = rotation;
        this.isStatic = isStatic;
        this.spriteSheet = null;

        this.order = 0;
        this.layer = "default";
    }

    animationController(gameObject) {

    }

    draw() {
        this.animationController(this);
        this.xPositionOld = this.xPosition;
        this.yPositionOld = this.yPosition;
        let scene = this.scene;
        this.xCanvas = (this.xPosition - (scene.cameraX - (scene.canvas.clientWidth / (2 * scene.cameraScale)))) * scene.cameraScale;
        this.yCanvas = (this.yPosition - (scene.cameraY - (scene.canvas.clientHeight / (2 * scene.cameraScale)))) * scene.cameraScale;
        if (this.spriteSheet != null) {
            if (this.isStatic) {
                //console.log("Drawin static object in position " + this.xPosition + " : "+ this.yPosition);
            }
            this.spriteSheet.drawSprite(this.scene, this.spriteRow, this.spriteColumn, this.xCanvas, this.yCanvas, this.xScale, this.yScale);
            //console.log("Draw Sprite");
        }
        if (this.label) {
            const x = (this.xPosition + this.xLabelOffset - (scene.cameraX - (scene.canvas.clientWidth / (2 * scene.cameraScale)))) * scene.cameraScale;
            const y = (this.yPosition + this.yLabelOffset - (scene.cameraY - (scene.canvas.clientHeight / (2 * scene.cameraScale)))) * scene.cameraScale;
            DrawText(this.scene.context, x, y, this.label, "12px serif", "#ffffff");
            //console.log(this.label);
        }
    }

    move(newX, newY) {
        if (!this.isStatic) {
            this.xPosition = newX;
            this.yPosition = newY;    
        }
    }

    translate(dX, dY) {
        if (!this.isStatic) {
            this.xPosition += dX;
            this.yPosition += dY;
        }            
    }
    
    setSprite(spriteSheet, row, column) {
        this.spriteSheet = spriteSheet;
        this.spriteRow = row;
        this.spriteColumn = column;
    }

    setAnimation(fps, row, column1, column2, isLooped) {
        if (this.animation != null) {
            clearTimeout(this.animation);
            //console.log("Cleared previous animation");
        }
        this.isAnimationLooped = isLooped;
        this.spriteRow = row;
        this.animation = setInterval(this.flipSprite.bind(this), 1/fps * 1000);
        //console.log(this.animation);
        this.animationStart = column1;
        this.spriteColumn = column1;
        this.animationEnd = column2;
    }

    flipSprite() {
        this.spriteColumn++;
        if (this.spriteColumn > this.animationEnd && this.isAnimationLooped) {
            this.spriteColumn = this.animationStart;
        }
        if (this.spriteColumn > this.animationEnd && !this.isAnimationLooped) {
            this.spriteColumn = this.animationEnd;
        }
    } 

    clone(name, x, y) {
        let newGameObject = new GameObject(name, this.scene, x, y, this.xVelocity, this.yVelocity, this.xScale, this.yScale, this.rotation, this.isStatic);
        if (this.spriteSheet) {
            newGameObject.spriteSheet = this.spriteSheet;
            newGameObject.spriteRow = this.spriteRow;
            newGameObject.spriteColumn = this.spriteColumn;
        }
        newGameObject.order = this.order;
        newGameObject.layer = this.layer;
        return newGameObject;
    }

    destroy() {
        //console.log(this.name + " colliders:" + this.colliders.length);
        for (let i = 0; i < this.scene.gameObjects.length; i++) {
            if (this.scene.gameObjects[i] === this) {
                this.scene.gameObjects.splice(i,1);
                break;
            }
        }
    }

}

function DrawText(context, xCanvas, yCanvas, text, font, fillStyle) {
    context.font = font;
    context.textAlign = "center";
    context.fillStyle = fillStyle;
    context.fillText(text, xCanvas, yCanvas);
}


//-----------------------------------------------------------------------------SPRITE SHEET---------------------------------------------------------
export class SpriteSheet {
    constructor(imageURL, numRows, numColumns, ppu) {
        this.image = new Image();
        this.isLoaded = false;
        this.image.onload = this.initializeSprite.bind(this);
        this.image.src = imageURL;
        this.numRows = numRows;
        this.numColums = numColumns;
        this.ppu = ppu; //Sprite pixels per unit (Not camera!)
    }

    initializeSprite() {
        this.isLoaded = true;
        //console.log("SpriteSheet loaded");
    }

    drawSprite(scene, row, column, xCanvas, yCanvas, xScale, yScale) {
        if (this.isLoaded) {
            let sx = column * this.image.naturalWidth / this.numColums;
            let sy = row * this.image.naturalHeight / this.numRows;
            let sWidth = this.image.naturalWidth / this.numColums;
            let sHeight = this.image.naturalHeight / this.numRows;
            let canvasWidth = sWidth / this.ppu * scene.cameraScale * xScale;
            let canvasHeight = sHeight / this.ppu * scene.cameraScale * yScale;
            scene.context.drawImage(this.image, sx, sy, sWidth, sHeight, xCanvas - (canvasWidth>>1), yCanvas - (canvasHeight>>1), canvasWidth, canvasHeight);
        }
    }
}

//-----------------------------------------------------------------------------INPUT---------------------------------------------------------
export class Input {
    static keyLeft = "KeyA";
    static keyRight = "KeyD";
    static keyUp = "KeyW";
    static keyDown = "KeyS";
    static keyJump = "Space";
    static keyButtonA = "KeyK";
    static keyButtonB = "KeyL";
    static keyButtonX = "KeyI";
    static keyButtonY = "KeyO";
    static keyShift = 16;
    static keyCtrl = 17;
    static keyAlt = 18;

    static xAxis = 0;
    static yAxis = 0;
    static shift = false;
    static ctrl = false;
    static alt = false;
    static jump = false;
    static jumpDown = false;
    static jumpUp = false;

    static buttonA = false;
    static buttonADown = false;
    static buttonAUp = false;

    static buttonB = false;
    static buttonBDown = false;
    static buttonBUp = false;

    static buttonX = false;
    static buttonXDown = false;
    static buttonXUp = false;

    static buttonY = false;
    static buttonYDown = false;
    static buttonYUp = false;

    static updateVoid() {
        this.jumpUp = false;
        this.jumpDown = false;
        this.buttonAUp = false;
        this.buttonADown = false;
        this.buttonBUp = false;
        this.buttonBDown = false;
        this.buttonXUp = false;
        this.buttonXDown = false;
        this.buttonYUp = false;
        this.buttonYDown = false;
    }

    static updateDownKeyStates(event) {
        switch (event.code) {
            case this.keyLeft:
                event.preventDefault();
                this.xAxis = -1;
                break;
            case this.keyRight:
                event.preventDefault();
                this.xAxis = 1;
                break;
            case this.keyUp:
                event.preventDefault();
                this.yAxis = -1;
                break;
            case this.keyDown:
                event.preventDefault();
                this.yAxis = 1;
                break;
            case this.keyJump:
                event.preventDefault();
                if (!this.jump) this.jumpDown = true;
                break;
            case this.keyButtonA:
                event.preventDefault();
                if (!this.buttonA) this.buttonADown = true;
                break;
            case this.keyButtonB:
                event.preventDefault();
                if (!this.buttonB) this.buttonBDown = true;
                break;
            case this.keyButtonX:
                event.preventDefault();
                if (!this.buttonX) this.buttonXDown = true;
                break;
            case this.keyButtonY:
                event.preventDefault();
                if (!this.buttonY) this.buttonYDown = true;
                break;
            default:
        }
        switch (event.keyCode) {
            case this.keyShift:
                event.preventDefault();
                this.shift = true;
                break;
            case this.keyCtrl:
                event.preventDefault();
                this.ctrl = true;
                break;
            case this.keyAlt:
                event.preventDefault();
                this.alt = true;
                break;
            default:
        }
    }

    static updateUpKeyStates(event) {
        switch (event.code) {
            case this.keyLeft:
                event.preventDefault();
                if (this.xAxis<0) this.xAxis = 0;
                break;
            case this.keyRight:
                event.preventDefault();
                if (this.xAxis>0) this.xAxis = 0;
                break;
            case this.keyUp:
                event.preventDefault();
                if (this.yAxis<0) this.yAxis = 0;
                break;
            case this.keyDown:
                event.preventDefault();
                if (this.yAxis>0) this.yAxis = 0;
                break;
            case this.keyJump:
                event.preventDefault();
                this.jumpUp = true;
                this.jump = false;
                break;
            case this.keyButtonA:
                event.preventDefault();
                this.buttonAUp = true;
                this.buttonA = false;
                break;
            case this.keyButtonB:
                event.preventDefault();
                this.buttonBUp = true;
                this.buttonB = false;
                break;
            case this.keyButtonX:
                event.preventDefault();
                this.buttonXUp = true;
                this.buttonX = false;
                break;
            case this.keyButtonY:
                event.preventDefault();
                this.buttonYUp = true;
                this.buttonY = false;
                break;
            default:
        }
        switch (event.keyCode) {
            case this.keyShift:
                event.preventDefault();
                this.shift = false;
                break;
            case this.keyCtrl:
                event.preventDefault();
                this.ctrl = false;
                break;
            case this.keyAlt:
                event.preventDefault();
                this.alt = false;
                break;
            default:
        }        
    }

    static updatePressKeyStates(event) {
        switch (event.code) {
            case this.keyLeft:
                event.preventDefault();
                this.xAxis = -1;
                break;
            case this.keyRight:
                event.preventDefault();
                this.xAxis = 1;
                break;
            case this.keyUp:
                event.preventDefault();
                this.yAxis = -1;
                break;
            case this.keyDown:
                event.preventDefault();
                this.yAxis = 1;
                break; 
            case this.keyJump:
                event.preventDefault();
                this.jump = true;
                break;
            case this.keyButtonA:
                event.preventDefault();
                this.buttonA = true;
                break;
            case this.keyButtonB:
                event.preventDefault();
                this.buttonB = true;
                break;
            case this.keyButtonX:
                event.preventDefault();
                this.buttonX = true;
                break;
            case this.keyButtonY:
                event.preventDefault();
                this.buttonY = true;
                break;
            default:
        }
        switch (event.keyCode) {
            case this.keyShift:
                event.preventDefault();
                this.shift = true;
                break;
            case this.keyCtrl:
                event.preventDefault();
                this.ctrl = true;
                break;
            case this.keyAlt:
                event.preventDefault();
                this.alt = true;
                break;
            default:
        }

    }    
}

prepareClient();