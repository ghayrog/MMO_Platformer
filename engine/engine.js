const Loop = require('accurate-game-loop');
const fs = require('fs');

//-----------------------------------------------------------------------------SCENE---------------------------------------------------------
exports.Scene = class Scene {
    constructor(io, cameraX, cameraY, cameraScale, playerAvatarCreatorFunc) {
        this.cameraX = cameraX;
        this.cameraY = cameraY;
        this.cameraScale = cameraScale; //pixels per unit

        this.targetTimesPerSecond = 60;
        this.loop = new Loop(this.gameLoop.bind(this), this.targetTimesPerSecond).start();

        this.previousTimeStamp = 0;
        this.deltaTime = 0;
        this.fps = 0;
        this.gameObjects = [];
        this.players = [];

        this.playerAvatarCreatorFunc = playerAvatarCreatorFunc;
        io.on('connection', this.onConnect.bind(this));
        this.frameSkip = 0;
    }

    onConnect(socket) {
        console.log('A user connected to Scene');
        let player = new Player(socket, "Player", this, 0,0,12,7);
        player.name = "Player " + player.id;
        player.avatar.label = player.name;
        //socket.on('disconnect', this.onDisconnect.bind(this));
    }

    /*
    onDisconnect(socket) {
        console.log("Disconnect socket ID: " + socket.id);
        for (let i = 0; i < this.players.length; i++) {
            //console.log(this.players[i].socket);
            if (this.players[i].socket.id === socket.id) {
                console.log('User disconnected from Scene: ' + this.players.length);
                this.players[i].destroy();
            }
        }        
    }
    */

    getObjectById(id) {
        for (let i = 0; i < this.gameObjects.length; i++) {
            if (this.gameObjects[i].id === id) {
                return this.gameObjects[i];
            }
        }
        return undefined;
    }

    gameLoop() {
        this.frameSkip++;
        if (this.frameSkip >= 2) this.frameSkip = 0;
        let timeStamp = Date.now();
        this.deltaTime = (timeStamp - this.previousTimeStamp) / 1000;
        this.previousTimeStamp = timeStamp;
        this.deltaTime = Math.min(this.deltaTime, 0.2);
        this.fps = Math.round(1 / this.deltaTime);


        for (let i = 0; i < this.players.length; i++) {
            if (Date.now() - this.players[i].lastUpdateTime > 5000) {
                this.players[i].socket.disconnect();
                this.players[i].destroy();
            }
        }
        


        for (let i = 0; i < this.players.length; i++) {
            this.players[i].transferDataToAvatar();
        }
        for (let i = 0; i < this.gameObjects.length; i++) {
            this.gameObjects[i].xPositionOld = this.gameObjects[i].xPosition;
            this.gameObjects[i].yPositionOld = this.gameObjects[i].yPosition;
            this.gameObjects[i].firstUpdate();
        }
        for (let i = 0; i < this.gameObjects.length; i++) {
           this.gameObjects[i].update();
        }
        
        this.detectCollisions();

        for (let i = 0; i < this.gameObjects.length; i++) {
            this.gameObjects[i].translate(this.gameObjects[i].dXcollision, this.gameObjects[i].dYcollision);
            this.gameObjects[i].dXcollision = 0;
            this.gameObjects[i].dYcollision = 0;
        }

        for (let i = 0; i < this.gameObjects.length; i++) {
            this.gameObjects[i].xApparentVelocity = (this.gameObjects[i].xPosition - this.gameObjects[i].xPositionOld) / this.deltaTime;
            this.gameObjects[i].yApparentVelocity = (this.gameObjects[i].yPosition - this.gameObjects[i].yPositionOld) / this.deltaTime;
            this.gameObjects[i].lateUpdate();
        }

        //this.gameObjects.sort(function(a,b){return (a.order - b.order);});
        if (this.frameSkip == 0) {
            for (let i = 0; i < this.players.length; i++) {
                this.players[i].getDataFromAvatar();
                this.players[i].updateClient();
            }    
        }
    }    
    

    detectCollisions() {
        let colliders = [];
        for (let i = 0; i < this.gameObjects.length; i++) { 
            for (let j = 0; j < this.gameObjects[i].colliders.length; j++) {
                colliders.push(this.gameObjects[i].colliders[j]);
            }
        }

        for (let i = 0; i < colliders.length - 1; i++) {
            for (let j = i + 1; j < colliders.length; j++) {
                let collider1 = colliders[i];
                let collider2 = colliders[j];
                let object1 = collider1.parent;
                let object2 = collider2.parent;
                if (object1!=object2 && collider1.checkBoxCollision(collider2)) {
                    let push1 = true;
                    let push2 = true;
                    if (collider1.isTrigger) {
                        collider1.parent.onTrigger(collider2.parent);
                        push1 = false;
                        push2 = false;
                    }
                    else if (collider1.parent.isStatic) {
                        collider1.parent.onCollision(collider2.parent);
                        push1 = false;
                    }
                    else {
                        collider1.parent.onCollision(collider2.parent);
                    }
                    if (collider2.isTrigger) {
                        collider2.parent.onTrigger(collider1.parent);
                        push2 = false;
                        push1 = false;
                    }
                    else if (collider2.parent.isStatic) {
                        collider2.parent.onCollision(collider1.parent);
                        push2 = false;
                    }
                    else {
                        collider2.parent.onCollision(collider1.parent);
                    }

                    if (push1 || push2) {
                        let xmin1 = collider1.parent.xPosition + collider1.dX - collider1.xSize/2;
                        let xmax1 = collider1.parent.xPosition + collider1.dX + collider1.xSize/2;
                        let ymin1 = collider1.parent.yPosition + collider1.dY - collider1.ySize/2;
                        let ymax1 = collider1.parent.yPosition + collider1.dY + collider1.ySize/2;
                
                        let xmin2 = collider2.parent.xPosition + collider2.dX - collider2.xSize/2;
                        let xmax2 = collider2.parent.xPosition + collider2.dX + collider2.xSize/2;
                        let ymin2 = collider2.parent.yPosition + collider2.dY - collider2.ySize/2;
                        let ymax2 = collider2.parent.yPosition + collider2.dY + collider2.ySize/2;

                        let xPushAvailable = true;
                        let yPushAvailable = true;
                        let xPushDirection1, xPushDirection2, yPushDirection1, yPushDirection2;
                        let cx = Math.min(xmax1, xmax2) - Math.max(xmin1, xmin2);
                        let cy = Math.min(ymax1, ymax2) - Math.max(ymin1, ymin2);                            
                        if (xmin1 <= xmin2)
                        {
                        //first object is left
                            if (xmax1 > xmax2) {
                            //second object is inside first
                                xPushAvailable = false;
                                let xFrom1To2 = collider2.parent.xPosition + collider2.dX - collider1.parent.xPosition - collider1.dX;
                                if (xFrom1To2 > 0) {
                                    xPushDirection1 = -1;
                                    xPushDirection2 = 1;
                                }
                                else {
                                    xPushDirection1 = 1;
                                    xPushDirection2 = -1;
                                }
                            }
                            else {
                            //second object is to the right
                                xPushDirection1 = -1;
                                xPushDirection2 = 1;
                            }
                        } 
                        else {
                        //second object is left
                            if (xmax1 < xmax2) {
                            //first object is inside second
                                xPushAvailable = false;
                                let xFrom1To2 = collider2.parent.xPosition + collider2.dX - collider1.parent.xPosition - collider1.dX;
                                if (xFrom1To2 > 0) {
                                    xPushDirection1 = -1;
                                    xPushDirection2 = 1;
                                }
                                else {
                                    xPushDirection1 = 1;
                                    xPushDirection2 = -1;
                                }
                            }
                            else {
                            //first object is to the right
                                xPushDirection1 = 1;
                                xPushDirection2 = -1;
                            }
                        }
                        if (ymin1 <= ymin2)
                        {
                        //first object is left
                            if (ymax1 > ymax2) {
                            //second object is inside first
                                yPushAvailable = false;
                                let yFrom1To2 = collider2.parent.yPosition + collider2.dY - collider1.parent.yPosition - collider1.dY;
                                if (yFrom1To2 > 0) {
                                    yPushDirection1 = -1;
                                    yPushDirection2 = 1;
                                }
                                else {
                                    yPushDirection1 = 1;
                                    yPushDirection2 = -1;
                                }
                            }
                            else {
                            //second object is to the right
                                yPushDirection1 = -1;
                                yPushDirection2 = 1;
                            }
                        } 
                        else {
                        //second object is left
                            if (ymax1 < ymax2) {
                            //first object is inside second
                                yPushAvailable = false;
                                let yFrom1To2 = collider2.parent.yPosition + collider2.dY - collider1.parent.yPosition - collider1.dY;
                                if (yFrom1To2 > 0) {
                                    yPushDirection1 = -1;
                                    yPushDirection2 = 1;
                                }
                                else {
                                    yPushDirection1 = 1;
                                    yPushDirection2 = -1;
                                }
                            }
                            else {
                            //first object is to the right
                                yPushDirection1 = 1;
                                yPushDirection2 = -1;
                            }
                        }

                        let push1x, push1y;
                        let push2x, push2y;

                        if (!xPushAvailable && !yPushAvailable) {
                        //one object is inside another in both axes
                            push2x = cx * xPushDirection2;
                            push2y = cy * yPushDirection2;
                        }
                        else if (!xPushAvailable) {
                        //x axis is not good, only Y is left
                            push2x = 0;
                            push2y = cy * yPushDirection2;
                        } 
                        else if (!yPushAvailable) {
                        //y axis is not good, only X is left
                            push2x = cx * xPushDirection2;
                            push2y = 0;
                        }
                        else {
                        //both axes are fine
                            if (cx<cy) {
                                push2x = cx * xPushDirection2;
                                push2y = 0;    
                            }
                            else {
                                push2x = 0;
                                push2y = cy * yPushDirection2;    
                            }
                        }

                        if (!push1) {
                            if (Math.abs(push2x)>0) {
                                object2.xVelocity = 0;
                            }
                            if (Math.abs(push2y)>0) {
                                object2.yVelocity = 0;
                            }
                            //object2.translate(push2x,push2y);
                            //console.log(object1.name + " " + object2.name + "dXcollision set");
                            object2.dXcollision += push2x;
                            object2.dYcollision += push2y;
                        }
                        else if (!push2) {
                            push1x = -push2x;
                            push1y = -push2y;
                            if (Math.abs(push1x)>0) {
                                object1.xVelocity = 0;
                            }
                            if (Math.abs(push1y)>0) {
                                object1.yVelocity = 0;
                            }
                            //object1.translate(push1x, push1y);
                            //console.log(object1.name + " " + object2.name + "dXcollision set");
                            object1.dXcollision += push1x;
                            object1.dYcollision += push1y;
                        }
                        else {
                            push2x /= 2;
                            push2y /= 2;
                            push1x = -push2x;
                            push1y = -push2y;
                            if (Math.abs(push2x)>0) {
                                object2.xVelocity = 0;
                            }
                            if (Math.abs(push2y)>0) {
                                object2.yVelocity = 0;
                            }
                            if (Math.abs(push1x)>0) {
                                object1.xVelocity = 0;
                            }
                            if (Math.abs(push1y)>0) {
                                object1.yVelocity = 0;
                            }
                            //object1.translate(push1x, push1y);
                            //object2.translate(push2x,push2y);
                            //console.log(object1.name + " " + object2.name + "dXcollision set");
                            object1.dXcollision += push1x;
                            object1.dYcollision += push1y;
                            object2.dXcollision += push2x;
                            object2.dYcollision += push2y;
                        }
                    }                      
                }                
            }
        }
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

    addPlayer(player) {
        this.players.push(player);
    }
}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max-min) + min);
}

//-----------------------------------------------------------------------------COLLIDERS---------------------------------------------------------
class BoxCollider {
    constructor(parent, dX, dY, xSize, ySize, isTrigger) {
        this.parent = parent;
        this.dX = dX;
        this.dY = dY;
        this.xSize = xSize;
        this.ySize = ySize;
        this.safeDistance = Math.sqrt((xSize * xSize + ySize * ySize) / 4);
        this.isTrigger = isTrigger;
    }

    checkPointCollision(X,Y) {
        //console.log(this.parent.name + " " + X + " " + Y);
        if (X > this.parent.xPosition + this.dX + this.xSize/2) return false;
        if (X < this.parent.xPosition + this.dX - this.xSize/2) return false;
        if (Y > this.parent.yPosition + this.dY + this.ySize/2) return false;
        if (Y < this.parent.yPosition + this.dY - this.ySize/2) return false;
        return true;
    }

    findClosestPointTo(X,Y) {
        let x1 = this.parent.xPosition + this.dX - this.xSize/2;
        let x2 = this.parent.xPosition + this.dX + this.xSize/2;
        let y1 = this.parent.yPosition + this.dY - this.ySize/2;
        let y2 = this.parent.yPosition + this.dY + this.ySize/2;

        let closestX = X;
        let closestY = Y;
        if (X < x1) closestX = x1;
        if (X > x2) closestX = x2;
        if (Y < y1) closestY = y1;
        if (Y > y2) closestY = y2;
        return [closestX, closestY];
    }

    checkBoxCollision(collider) {
        let xDistance = this.parent.xPosition + this.dX - collider.parent.xPosition - collider.dX;
        let yDistance = this.parent.yPosition + this.dY - collider.parent.yPosition - collider.dY;
        let distance2 = xDistance * xDistance + yDistance * yDistance;
        let safeDistance = this.safeDistance + collider.safeDistance;

        if (distance2 > safeDistance * safeDistance) return false;

        let x1 = this.parent.xPosition + this.dX - this.xSize/2;
        let x2 = this.parent.xPosition + this.dX + this.xSize/2;
        let y1 = this.parent.yPosition + this.dY - this.ySize/2;
        let y2 = this.parent.yPosition + this.dY + this.ySize/2;

        let xc1 = collider.parent.xPosition + collider.dX - collider.xSize/2;
        let xc2 = collider.parent.xPosition + collider.dX + collider.xSize/2;
        let yc1 = collider.parent.yPosition + collider.dY - collider.ySize/2;
        let yc2 = collider.parent.yPosition + collider.dY + collider.ySize/2;

        if (x2 <= xc1 || x1 >= xc2 || y2 <= yc1 || y1 >= yc2) return false;
        return true;
    }

    returnColliderType() {
        return 0;
    }
}

//DOES NOT WORK:
/*
class CircleCollider {
    constructor(parent, dX, dY, radius, isTrigger) {
        this.parent = parent;
        this.dX = dX;
        this.dY = dY;
        this.radius = radius;
        this.safeDistance2 = radius * radius;
        this.isTrigger = isTrigger;
    }

    checkPointCollision(X,Y) {
        let dX = X - (this.parent.xPosition + this.dX);
        let dY = Y - (this.parent.yPosition + this.dY);
        if (dX * dX + dY * dY > this.radius * this.radius) return false;
        return true;
    }

    findClosestPointTo(X,Y) {
        let dX = X - (this.parent.xPosition + this.dX);
        let dY = Y - (this.parent.yPosition + this.dY);
        let norma2 = dX * dX + dY * dY;
        if (norma2 <= this.radius * this.radius) return [X, Y];

        let norma = Math.sqrt(norma2) / this.radius;
        let closestX = (this.parent.xPosition + this.dX) + dX / norma;
        let closestY = (this.parent.yPosition + this.dY) + dY / norma;
        return [closestX, closestY];
    } 
    
    returnColliderType() {
        return 1;
    }
}
*/
//-----------------------------------------------------------------------------PLAYER--------------------------------------------------------------
class Player {
    constructor(socket, name, scene, xPosition, yPosition, xScope, yScope) {
        this.xVelocityCamera = 0;
        this.yVelocityCamera = 0;
        this.justConnected = true;
        this.PvE = 0;
        this.PvP = 0;
        this.deaths = 0;
        this.lastUpdateTime = Date.now();
        this.socket = socket;
        this.id =  IDManager.createNewId();
        //IDManager.currentObjectId++;
        this.name = name;
        this.scene = scene;
        this.xPosition = xPosition;
        this.yPosition = yPosition;
        this.xScope = xScope;
        this.yScope = yScope;
        scene.addPlayer(this);
        this.awaitsFrame = true;
        console.log("Player added with socket: " + socket);
        socket.on('key state change', this.onKeyStateChange.bind(this));
        socket.on('client updated', this.onClientUpdated.bind(this));
        this.setAvatar();
    }

    updateClient() {
        if (this.awaitsFrame) {
            this.lastUpdateTime = Date.now();
            this.awaitsFrame = false;
        }
        if (true) {
            //console.log("Frame is being sent");
            this.prepareScene();            
            let json = JSON.stringify(this.localScene, (key, value)=>{
                if (key == 'loop' || key == 'colliders') {
                    return undefined;
                }
                if (key == 'cameraX') {
                    return this.xPosition;
                }
                if (key == 'cameraY') {
                    return this.yPosition;
                }
                if (key == 'cameraScale') {
                    if (this.avatar) {
                        return this.avatar.playerCameraScale;
                    }
                    return this.scene.cameraScale;
                }
                return value;
            })
            //console.log(this.avatar.xApparentVelocity);
            this.socket.emit('update scene', json);
        }
        else {
            //console.log("Frame skipped");
        }
    }

    onClientUpdated(data) {
        this.awaitsFrame = true;
    }

    onKeyStateChange(data) {
        const input = JSON.parse(data);
        this.xAxis = input.xAxis;
        this.yAxis = input.yAxis;
        this.shift = input.shift;
        this.ctrl = input.ctrl;
        this.alt = input.alt;
            this.inputStateProcessed = false;
            this.jump = input.jump;
            if (input.jumpDown) this.jumpDown = input.jumpDown;
            if (input.jumpUp) this.jumpUp = input.jumpUp;
        
            this.buttonA = input.buttonA;
            if (input.buttonADown) this.buttonADown = input.buttonADown;
            if (input.buttonAUp) this.buttonAUp = input.buttonAUp;

            this.buttonB = input.buttonB;
            if (input.buttonBDown) this.buttonBDown = input.buttonBDown;
            if (input.buttonBUp) this.buttonBUp = input.buttonBUp;            

            this.buttonX = input.buttonX;
            if (input.buttonXDown) this.buttonXDown = input.buttonXDown;
            if (input.buttonXUp) this.buttonXUp = input.buttonXUp;

            this.buttonY = input.buttonY;
            if (input.buttonYDown) this.buttonYDown = input.buttonYDown;
            if (input.buttonYUp) this.buttonYUp = input.buttonYUp;            

            //console.log("Player "+ this.name + " " + this.id + "new axis state: " + this.xAxis+  " " + this.yAxis);
    }

    setAvatar() {
        let gameObject = this.scene.playerAvatarCreatorFunc(this.scene);
        gameObject.playerCameraScale = 60;
        gameObject.label = this.name;
        this.avatar = gameObject;
        this.avatar.player = this;   
        this.xPosition = this.avatar.xPosition;
        this.yPosition = this.avatar.yPosition;
        this.xVelocityCamera = this.avatar.xApparentVelocity;
        this.yVelocityCamera = this.avatar.yApparentVelocity;
    }

    transferDataToAvatar() {
        if (this.avatar) {
            this.avatar.xAxis = this.xAxis;
            this.avatar.yAxis = this.yAxis;
            this.avatar.shift = this.shift;
            this.avatar.ctrl = this.ctrl;
            this.avatar.alt = this.alt;

            this.avatar.jump = this.jump;
            this.avatar.jumpDown = this.jumpDown;
            this.jumpDown = false;
            this.avatar.jumpUp = this.jumpUp;
            this.jumpUp = false;

            this.avatar.buttonA = this.buttonA;
            this.avatar.buttonADown = this.buttonADown;
            this.buttonADown = false;
            this.avatar.buttonAUp = this.buttonAUp;
            this.buttonAUp = false;

            this.avatar.buttonB = this.buttonB;
            this.avatar.buttonBDown = this.buttonBDown;
            this.buttonBDown = false;
            this.avatar.buttonBUp = this.buttonBUp;        
            this.buttonBUp = false;

            this.avatar.buttonX = this.buttonX;
            this.avatar.buttonXDown = this.buttonXDown;
            this.buttonXDown = false;
            this.avatar.buttonXUp = this.buttonXUp;        
            this.buttonXUp = false;

            this.avatar.buttonY = this.buttonY;
            this.avatar.buttonYDown = this.buttonYDown;
            this.buttonYDown = false;
            this.avatar.buttonYUp = this.buttonYUp;        
            this.buttonYUp = false;

        }
    }

    getDataFromAvatar() {
        if (this.avatar) {
            //const cameraAcceleration = 1;
            //const maxVelocity = 5;
            //let xVelocity = (this.avatar.xPosition - this.xPosition) / this.avatar.scene.deltaTime;
            //let yVelocity = (this.avatar.yPosition - this.yPosition) / this.avatar.scene.deltaTime;
            //let norm2 = xVelocity * xVelocity + yVelocity * yVelocity;
            //if (norm2 > maxVelocity * maxVelocity) {
            //    const norm = Math.sqrt(norm2);
            //    xVelocity = xVelocity / norm * maxVelocity;
            //    yVelocity = yVelocity / norm * maxVelocity;
            //}
            //if (norm2 < 0.01) {
            //    xVelocity = 0;
            //    yVelocity = 0;
            //}
            //this.xPosition += xVelocity * this.avatar.scene.deltaTime;
            //this.yPosition += yVelocity * this.avatar.scene.deltaTime;
            this.xPosition = this.avatar.xPosition;
            this.yPosition = this.avatar.yPosition;
            this.xVelocityCamera = this.avatar.xApparentVelocity;
            this.yVelocityCamera = this.avatar.yApparentVelocity;
        }
    }

    prepareScene() {
        let localScene = {cameraX: this.xPosition, cameraY: this.yPosition, cameraScale: this.scene.cameraScale};
        localScene.fps = this.scene.fps;
        localScene.xVelocityCamera = this.xVelocityCamera;
        localScene.yVelocityCamera = this.yVelocityCamera;
        localScene.players = this.scene.players.length;
        localScene.gameObjects = [];
        if (this.justConnected)
        {
            this.justConnected = false;
            for (let i = 0; i < this.scene.gameObjects.length; i++) {
                let curObj = this.scene.gameObjects[i];
                if (curObj.isVisible) {
                    if (curObj.isStatic)
                    {
                        localScene.gameObjects.push(curObj);
                    } else {
                        let xInScope = (curObj.xPosition >= this.xPosition - this.xScope) && (curObj.xPosition <= this.xPosition + this.xScope);
                        let yInScope = (curObj.yPosition >= this.yPosition - this.yScope) && (curObj.yPosition <= this.yPosition + this.yScope);
                        if (xInScope && yInScope) {
                            localScene.gameObjects.push(curObj);
                        }                        
                    }
                }
            }
        }
        else {
            for (let i = 0; i < this.scene.gameObjects.length; i++) {
                let curObj = this.scene.gameObjects[i];
                if (curObj.isVisible) {
                    if (curObj.isStatic)
                    {
                        //localScene.gameObjects.push(curObj);
                    } else {
                        let xInScope = (curObj.xPosition >= this.xPosition - this.xScope) && (curObj.xPosition <= this.xPosition + this.xScope);
                        let yInScope = (curObj.yPosition >= this.yPosition - this.yScope) && (curObj.yPosition <= this.yPosition + this.yScope);
                        if (xInScope && yInScope) {
                            localScene.gameObjects.push(curObj);
                        }                        
                    }
                }
            }

        }

        this.localScene = localScene;
    }

    destroy() {
        let i = 0;
        while (i < this.scene.players.length) {
            if (this.scene.players[i].id === this.id) {
                this.scene.players.splice(i,1);
                console.log("Player destroyed: " + this.id + " : " + this.name);
                if (this.avatar) this.avatar.destroy();
                break;
            }
            else {
                i++;
            }
        }
    }
    
    respawn() {
        this.setAvatar();
    }

}

//-----------------------------------------------------------------------------GAME OBJECT---------------------------------------------------------
exports.GameObject = class GameObject {
    constructor(name, scene, xPosition, yPosition, xVelocity, yVelocity, xScale, yScale, rotation, isStatic) {
        this.isVisible = true;
        this.player = null;
        this.label = '';
        this.xLabelOffset = 0;
        this.yLabelOffset = -0.75;
        this.id =  IDManager.createNewId();
        this.name = name;
        this.scene = scene;
        scene.addObject(this);
        this.xPosition = xPosition;
        this.yPosition = yPosition;
        this.xPositionOld = xPosition;
        this.yPositionOld = yPosition;
        this.xVelocity = xVelocity;
        this.yVelocity = yVelocity;
        this.xApparentVelocity = xVelocity;
        this.yApparentVelocity = yVelocity;
        this.xScale = xScale;
        this.yScale = yScale;
        this.rotation = rotation;
        this.isStatic = isStatic;
        this.spriteSheetTag = '';

        this.colliders = [];

        this.order = 0;
        this.layer = "default";
        this.dXcollision = 0;
        this.dYcollision = 0;
        this.animationState = "";
        this.previousAnimationState = "";
        this.changeAnimation = false;
    }

    toJSON () {
        const simpleObject = {id: this.id, name: this.name, xPosition: this.xPosition, yPosition: this.yPosition};
        simpleObject.isVisible = this.isVisible;
        simpleObject.label = this.label;
        simpleObject.xLabelOffset = this.xLabelOffset;
        simpleObject.yLabelOffset = this.yLabelOffset;
        simpleObject.xApparentVelocity = this.xApparentVelocity;
        simpleObject.yApparentVelocity = this.yApparentVelocity;
        simpleObject.xScale = this.xScale;
        simpleObject.yScale = this.yScale;
        simpleObject.rotation = this.rotation;
        simpleObject.isStatic = this.isStatic;
        simpleObject.spriteSheetTag = this.spriteSheetTag;
        simpleObject.order = this.order;
        simpleObject.layer = this.layer;
        simpleObject.animationState = this.animationState;
        simpleObject.changeAnimation = this.changeAnimation;
        return JSON.stringify(simpleObject);
    }

    firstUpdate() {

    }

    update() {
        if (!this.isStatic) {
            //console.log(this.scene.deltaTime);
            this.xPosition += this.xVelocity * this.scene.deltaTime;
            this.yPosition += this.yVelocity * this.scene.deltaTime;
        }
        this.isVisible = true;
    }

    lateUpdate() {
        if (this.animationState != this.previousAnimationState) {
            this.changeAnimation = true;   
        }
        else {
            this.changeAnimation = false;
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

    setSprite(spriteSheetTag) {
        this.spriteSheetTag = spriteSheetTag;
    }

    addBoxCollider(dX, dY, xSize, ySize, isTrigger) {
        let boxCollider = new BoxCollider(this, dX, dY, xSize, ySize, isTrigger);
        this.colliders.push(boxCollider);
    }

    /*
    addCircleCollider(dX, dY, radius, isTrigger) {
        let circleCollider = new CircleCollider(this, dX, dY, radius, isTrigger);
        this.colliders.push(circleCollider);
    }
    */

    onTrigger(collision) {
        //console.log("Object " + this.name + " was triggered by object " + collision.name);
    }

    onCollision(collision) {
        //console.log("Object " + this.name + " was collided by object " + collision.name);
    }

    clone(name, x, y) {
        let newGameObject = new GameObject(name, this.scene, x, y, this.xVelocity, this.yVelocity, this.xScale, this.yScale, this.rotation, this.isStatic);
        newGameObject.isVisible = this.isVisible;
        newGameObject.spriteSheetTag = this.spriteSheetTag;
        for (let i = 0; i < this.colliders.length; i++) {
            let collider = this.colliders[i];
            if (collider.returnColliderType() == 0 ) {
                newGameObject.addBoxCollider(collider.dX, collider.dY, collider.xSize, collider.ySize, collider.isTrigger);
            }
        }
        newGameObject.order = this.order;
        newGameObject.layer = this.layer;
        newGameObject.label = this.label;
        newGameObject.xLabelOffset = this.xLabelOffset;
        newGameObject.yLabelOffset = this.yLabelOffset;    
        newGameObject.animationState = this.animationState;    
        return newGameObject;
    }

    destroy() {
        this.player = null;
        this.colliders.splice(0, this.colliders.length);
        //console.log(this.name + " colliders:" + this.colliders.length);
        let i = 0;
        while (i < this.scene.gameObjects.length) {
            if (this.scene.gameObjects[i] === this) {
                this.scene.gameObjects.splice(i,1);
                break;
                //console.log("Destroying object");
            }
            else {
                i++;
            }
        }

        i = 0;
        while (i < this.scene.players.length) {
            if (this.scene.players[i].avatar === this) {
                this.scene.players[i].avatar = null;
                this.scene.players[i].respawn();
                break;
                //console.log("Destroying object");
            }
            i++;
        }
    }

}

//-----------------------------------------------------------------------------TILEMAP---------------------------------------------------------
exports.Tilemap = class Tilemap {
    constructor(scene, tilemapPath)
    {
        this.scene = scene;
        this.isLoaded = false;
        this.palette = [];
        //console.log(this);

        const json = JSON.parse(fs.readFileSync(tilemapPath, 'utf-8'));
        this.name = json.name;
        this.xPosition = json.xPosition;
        this.yPosition = json.yPosition;
        this.xGridSize = json.xGridSize;
        this.yGridSize = json.yGridSize;
        this.tilemap = json.tilemap;
        this.isLoaded = true;
        console.log("Tilemap Loaded");
    }

    addPrefabToPalette(id, gameObject) {
        let paletteItem = new PaletteItem(id, gameObject);
        this.palette.push(paletteItem);
    }

    buildTilemap() {
        this.buildInterval = setInterval(this.tryBuildTilemap.bind(this), 10);
    }

    tryBuildTilemap() {
        //console.log(this);
        if (this.isLoaded)
        {
            console.log(this.buildInterval);
            clearTimeout(this.buildInterval);
            console.log("Building tilemap...");
            for (let j = 0; j < this.tilemap.length; j++) {
                for (let i = 0; i< this.tilemap[j].length; i++) {
                    for (let idx = 0; idx < this.palette.length; idx++) {
                        if (this.palette[idx].id == this.tilemap[j][i]) {
                            let prefab = this.palette[idx].gameObject;
                            let x = this.xPosition + this.xGridSize * (i + 0.5);
                            let y = this.yPosition + this.yGridSize * (j + 0.5);
                            let newTile = prefab.clone(this.name+"-tile-"+i+"-"+j, x, y);                        
                        }
                    }
                }
            }    
            console.log("Finished building tilemap!");
        }
        else
        {
            console.log("Failed to build tilemap!");
        }
    }
}

exports.AudioManager = class AudioManager {
    static PlaySound(scene, x, y, soundTag, MaxDistance, MaxVolume) {
        for (let i = 0; i < scene.players.length; i++) {
            const distance2 = (scene.players[i].xPosition-x)*(scene.players[i].xPosition-x) + (scene.players[i].yPosition-y)*(scene.players[i].yPosition-y);
            if (distance2 < MaxDistance*MaxDistance) {
                const linear = Math.sqrt(distance2)/MaxDistance;
                const volume = (1 - linear) * MaxVolume;
                let soundData = { soundTag: soundTag, volume: volume}
                scene.players[i].socket.emit('play sound', soundData);
            }
        }
    }
}

//constructor(name, scene, xPosition, yPosition, xVelocity, yVelocity, xScale, yScale, rotation, isStatic) 

class PaletteItem {
    constructor(id, gameObject) {
        this.id = id;
        this.gameObject = gameObject;
    }
}

class IDManager {
    static #currentObjectId = 0;
    static createNewId() {
        this.#currentObjectId++;
        return this.#currentObjectId;
    }
}

//-------------------------------------------------------------------------QUADTREE--------------------------------------------------------------------------------
class Quadtree {
    static MAX_OBJECTS = 10;
    static MAX_LEVELS = 5;
    constructor(level, bounds) {
        this.level = level;
        this.colliders = [];
        this.bounds = bounds;
        this.nodes = [];
    }

    clear() {
        this.colliders = [];
        for (let i = 0; i < this.nodes.length; i++) {
            if (this.nodes[i] != null) {
                this.nodes[i].clear();
                this.nodes[i] = null;
            }
        }
    }

    split() {
        let subWidth = this.bounds.width / 2;
        let subHeight = this.bounds.height / 2;
        let x = this.bounds.x;
        let y = this.bounds.y;

        this.nodes[0] = Quadtree(this.level + 1, {
            x: x + subWidth,
            y: y,
            width: subWidth,
            height: subHeight
        });
        this.nodes[0] = Quadtree(this.level + 1, {
            x: x,
            y: y,
            width: subWidth,
            height: subHeight
        });
        this.nodes[0] = Quadtree(this.level + 1, {
            x: x,
            y: y + subHeight,
            width: subWidth,
            height: subHeight
        });
        this.nodes[0] = Quadtree(this.level + 1, {
            x: x + subWidth,
            y: y + subHeight,
            width: subWidth,
            height: subHeight
        });
    }

    getIndex(bounds) {
        let index = -1;
        let verticalMidpoint = this.bounds.x + this.bounds.width / 2;
        let horizontalMidpoint = this.bounds.y + this.bounds.height / 2;

        let isAtTop = bounds.y + bounds.height < horizontalMidpoint;
        let isAtBottom = bounds.y > horizontalMidpoint;
        let isAtLeft = bounds.x + bounds.width < verticalMidpoint;
        let isAtRight = bounds.x > verticalMidpoint;

        if (isAtLeft) {
            if (isAtTop) index = 1;
            if (isAtBottom) index = 2;
        }
        else if (isAtRight) {
            if (isAtTop) index = 0;
            if (isAtBottom) index = 3;
        }
        
        return index;
    }

    insert(bounds, collider) {
        if (this.nodes[0] != null) {
            let index = getIndex(bounds);
            if (index !=-1) {
                this.nodes[index].insert(bounds, collider);
                return;
            }
        }

        this.colliders.push(collider);

        if (this.colliders.length > this.MAX_OBJECTS && this.level < this.MAX_LEVELS) {
            if (this.nodes[0] == null) {
                this.split();
            }

            let i = 0;
            while (i < this.colliders.length) {
                let bounds = {
                    x: this.colliders[i].parent.xPosition + this.colliders[i].dX - this.colliders[i].xSize / 2,
                    y: this.colliders[i].parent.yPosition + this.colliders[i].dY - this.colliders[i].ySize / 2,
                    width: this.colliders[i].xSize,
                    hieght: this.colliders[i].ySize
                };
                let index = this.getIndex(bounds);
                if (index != -1) {
                    this.nodes[index].insert(bounds, this.colliders[i]);
                    this.colliders.splice(i,1);
                }
                else {
                    i++;
                }
            }
            //TODO
        }
    }

    retrieve(bounds) {
        let index = this.getIndex(bounds);
        let returnColliders = [];
        if (index != -1 && this.nodes[0] != null) {
            returnColliders = this.nodes[index].retrieve(bounds);
        }

        for (let i=0;i< this.colliders.length; i++) {
            returnColliders.push(this.colliders[i]);
        }

        return returnColliders;

    }

}