const engine = require('./engine.js');
const path = require('path');

class GorePrefab extends engine.GameObject {
    selfDestruct = true;
    selfDestructTime = 1.34;

    update() {
        super.update();
        if (this.selfDestruct) {
            setTimeout(this.destroy.bind(this), this.selfDestructTime*1000);
            this.selfDestruct = false;
        }
    }
}

class ToastyPrefab extends engine.GameObject {
    selfDestruct = true;
    selfDestructTime = 2;
    targetObject = null;

    update() {
        super.update();
        if (this.selfDestruct) {
            setTimeout(this.destroy.bind(this), this.selfDestructTime*1000);
            this.selfDestruct = false;
        }
        if (this.targetObject) {
            this.xPosition = this.targetObject.xPosition;
            this.yPosition = this.targetObject.yPosition;
        } else {
            this.destroy();
        }
    }

}

class HealPrefab extends engine.GameObject {
    heal = 50;
    enabled = true;
    timeout = 45;
    spriteSheetTag = 'heal';

    enable() {
        this.enabled = true;
        this.animationState = "enabled";
    }

    onTrigger(collision) {
        super.onTrigger(collision);
        //console.log(collision);
        if (this.enabled && collision.health && collision.health < 100) {
            console.log("Healer collided with "+collision.name);
            collision.health = Math.min(100, collision.health+this.heal);
            this.enabled = false;
            this.animationState = "disabled";
            engine.AudioManager.PlaySound(this.scene, this.xPosition, this.yPosition, 'heal', 5, 1);
            setTimeout(this.enable.bind(this), this.timeout*1000);
            if (collision.player) {
                collision.player.socket.emit('health update', collision.health);
            }
        }
    }

    clone(name, x, y) {
        let newObject = super.clone(name, x, y);
        newObject.heal = this.heal;
        newObject.enabled = this.enabled;
        newObject.timeout = this.timeout;
        newObject.enable = this.enable;
        newObject.onTrigger = this.onTrigger;
        return newObject;
    }
}

class BoxPrefab extends engine.GameObject {
    grenades = 5;
    enabled = true;
    timeout = 45;
    spriteSheetTag = 'box';

    enable() {
        this.enabled = true;
        this.animationState = "enabled";
    }

    onTrigger(collision) {
        super.onTrigger(collision);
        //console.log(collision);
        if (this.enabled && collision.player && collision.grenadesCount<10) {
            console.log("Box collided with "+collision.name);
            collision.grenadesCount = Math.min(10, collision.grenadesCount + this.grenades);
            this.enabled = false;
            this.animationState = "disabled";
            engine.AudioManager.PlaySound(this.scene, this.xPosition, this.yPosition, 'heal', 5, 1);
            setTimeout(this.enable.bind(this), this.timeout*1000);
            if (collision.player) {
                collision.player.socket.emit('grenade update', collision.grenadesCount);
            }
        }
    }

    clone(name, x, y) {
        let newObject = super.clone(name, x, y);
        newObject.grenades = this.grenades;
        newObject.enabled = this.enabled;
        newObject.timeout = this.timeout;
        newObject.enable = this.enable;
        newObject.onTrigger = this.onTrigger;
        return newObject;
    }
}

class CoverPrefab extends engine.GameObject {
    onTrigger(collision) {
        super.onTrigger(collision);
        //console.log("Cover activated")
        if (collision.player) {
            collision.isVisible = false;
        }
    }

    clone(name, x, y) {
        let newObject = super.clone(name, x, y);
        newObject.onTrigger = this.onTrigger;
        return newObject;
    }
}

class CharacterObject extends engine.GameObject {
    speed = 4;
    g = 40;
    jumpVelocity = 16;
    playerGroundCheck = null;
    playerLeftCheck = null;
    playerRightCheck = null;
    playerOrientation = "Right"; //left;
    animationState = "IdleRight";
    previousAnimationState = "IdleRight";
    destructable = true;
    health = 999;
    isDead = false;

    dealDamage(damage, origin) {
        this.health -= damage;
        engine.AudioManager.PlaySound(this.scene, this.xPosition, this.yPosition, 'hurt', 7, 0.5);
        if (this.player) {
            this.player.socket.emit('health update', this.health);
        }
        if (this.health <= 0 ) {
            this.health = 0;
            if (!this.isDead) {
                let soundVariation = 1 + Math.floor(Math.random()*4);
                engine.AudioManager.PlaySound(this.scene, this.xPosition, this.yPosition, 'gore'+soundVariation, 10, 1);
                if (Math.random()>0.8) {
                    engine.AudioManager.PlaySound(this.scene, this.xPosition, this.yPosition, 'scream', 10, 0.75);                    
                }
                console.log(origin.id + " killed " + this.id + " to death.");
                if (origin.player) {
                    if (this.player) {
                        //player killed player
                        origin.player.PvP += 1;
                        origin.player.socket.emit('pvp update', origin.player.PvP);
                        this.player.deaths += 1;
                        this.player.socket.emit('death update', this.player.deaths);
                        if (damage == 25) {
                            engine.AudioManager.PlaySound(this.scene, (this.xPosition+origin.xPosition)/2, (this.yPosition+origin.yPosition)/2, 'toasty', 10, 1);                    
                            let toasty = new ToastyPrefab("Toasty", this.scene, origin.xPosition, origin.yPosition, 0, 0, 1, 1, 0, false);
                            toasty.targetObject = origin;
                            toasty.spriteSheetTag = 'toasty';                            
                        }
                            } else {
                        //player killed bot
                        origin.player.PvE += 1;
                        origin.player.socket.emit('pve update', origin.player.PvE);
                    }                    
                }
                else {
                    if (this.player) {
                        //bot killed player
                        this.player.deaths += 1;
                        this.player.socket.emit('deaths update', this.player.deaths);
                    } else {
                        //bot killed bot
                    }                    
                }
                setTimeout(this.destroy.bind(this), 1000);
                this.colliders.splice(0, this.colliders.length);
                this.playerGroundCheck.isJumpKillAllowed = false;
                //this.playerGroundCheck.destroy();
                this.playerLeftCheck.destroy();
                this.playerRightCheck.destroy();   
                let gore = new GorePrefab("Gore", this.scene, this.xPosition, this.yPosition, 0, 0, 1, 1, 0, false);
                gore.spriteSheetTag = 'gore';
                //gore.setSprite(0, 0);
                //gore.setAnimation(12,0,0,15,false);
                gore = null;
            }
            this.isDead = true;
        }
        //console.log(origin.id + " attacked " + this.id + " with " + damage + " damage, current health: "+ this.health);
    }

    destroy() {
        super.destroy();
        this.playerGroundCheck.destroy();
    }

    update() {
        super.update();
        this.yVelocity += this.g * this.scene.deltaTime;

        this.processInput();

        this.playerGroundCheck.xPosition = this.xPosition;
        this.playerGroundCheck.yPosition = this.yPosition + 0.5 + 0.01;
        this.playerLeftCheck.xPosition = this.xPosition - 0.333 - 0.01;
        this.playerLeftCheck.yPosition = this.yPosition;
        this.playerRightCheck.xPosition = this.xPosition + 0.333 + 0.01;
        this.playerRightCheck.yPosition = this.yPosition;
        if (this.playerGroundCheck.isGrounded && this.yVelocity > 0) {
            this.yVelocity = 0;
            //console.log("Velocity Defaulted");
        }
        this.playerGroundCheck.isGrounded = false;
        this.playerLeftCheck.isTouchingLeft = false;
        this.playerRightCheck.isTouchingRight = false;
        if (this.health == 999) {
            this.health = 100;
            if (this.player) {
                this.player.socket.emit('health update', this.health);
            }        
        }
    }

    lateUpdate() {

        this.playerGroundCheck.xPosition = this.xPosition;
        this.playerGroundCheck.yPosition = this.yPosition + 0.5 + 0.01;
        this.playerLeftCheck.xPosition = this.xPosition - 0.333 - 0.01;
        this.playerLeftCheck.yPosition = this.yPosition;
        this.playerRightCheck.xPosition = this.xPosition + 0.333 + 0.01;
        this.playerRightCheck.yPosition = this.yPosition;
    }

    processInput() {
    }

    onCollision(collision) {
    }

}

class PlayerGroundCheck extends engine.GameObject {
    isJumpKillAllowed = true;
    isGrounded = false;
    jumpKillDelay = 1;
    jumpKillDamage = 25;
    onTrigger(collision) {
        switch(collision.layer)
        {
            case "solid":
                this.isGrounded = true;
                break;
            default:
        }
        if (collision.destructable && this.isJumpKillAllowed) {
            this.isJumpKillAllowed = false;
            collision.dealDamage(this.jumpKillDamage, this.origin);
            setTimeout(this.allowJumpKill.bind(this), this.jumpKillDelay*1000);
            //console.log(this.name + " jump attacked" + collision.name);
        }
        //console.log("Jump damage dY:" + (collision.yPosition - this.yPosition));
        //console.log("Is grounded");
    }

    allowJumpKill() {
        this.isJumpKillAllowed = true;
    }
}
class PlayerLeftCheck extends engine.GameObject {
    isTouchingLeft = false;
    onTrigger(collision) {
        switch(collision.layer)
        {
            case "solid":
                this.isTouchingLeft = true;
                break;
            default:
        }

        //console.log("Is grounded");
    }
}
class PlayerRightCheck extends engine.GameObject {
    isTouchingRight = false;
    onTrigger(collision) {
        switch(collision.layer)
        {
            case "solid":
                this.isTouchingRight = true;
                break;
            default:
        }
        //console.log("Is grounded");
    }
}

class NPCObject extends CharacterObject {
    xAxis = 1;
    yAxis = 0;
    reverseTime = 0;
    reverseTimer = 3;
    jumpDown = false;
    buttonADown = false;
    shootTime = 0;
    shootTimer = 1;

    processInput() {
        this.reverseTime += this.scene.deltaTime;
        if (this.reverseTime >= this.reverseTimer) {
            this.xAxis = -this.xAxis;
            this.reverseTime = 0;
        }

        this.shootTime += this.scene.deltaTime;
        if (this.shootTime >= this.shootTimer) {
            this.buttonADown = true;
            this.shootTime = 0;
        }

        let playerLook = "";

        if (this.yAxis < 0) {
            playerLook = "Upwards";
        }
        if (this.yAxis > 0) {
            playerLook = "Downwards";
        }
        if (this.isDead) {
            //console.log("Character is dead");
            if (this.playerOrientation == "Right") this.animationState = "DeathRight"
            else this.animationState = "DeathLeft";            
        }
        else {
            if (this.xAxis > 0) {
                this.playerOrientation = "Right";
            }
    
            if (this.xAxis < 0) {
                this.playerOrientation = "Left";
            }
            if (this.playerGroundCheck.isGrounded) {
                if (this.xAxis > 0) {
                    this.animationState = "RunRight" + playerLook;
                }
                else if (this.xAxis < 0) {
                    this.animationState = "RunLeft" + playerLook;
                }
                else {
                    if (this.playerOrientation == "Right") {
                        this.animationState = "IdleRight" + playerLook;
                    } else {
                        this.animationState = "IdleLeft" + playerLook;
                    }
                }
            } else {
                if (this.xAxis > 0) {
                    this.animationState = "JumpRight" + playerLook;
                }
                else if (this.xAxis < 0) {
                    this.animationState = "JumpLeft" + playerLook;
                }
                else {
                    if (this.playerOrientation == "Right") {
                        this.animationState = "JumpRight" + playerLook;
                    } else {
                        this.animationState = "JumpLeft" + playerLook;
                    }
                }
            }
    
            if ((this.xAxis > 0 && !this.playerRightCheck.isTouchingRight) || (this.xAxis < 0 && !this.playerLeftCheck.isTouchingLeft)) this.translate(this.xAxis * this.scene.deltaTime * this.speed, 0);
    
            if (this.jumpDown && this.playerGroundCheck.isGrounded) {
                //console.log("Before Jump:" + this.yVelocity);
                this.yVelocity -= this.jumpVelocity;
                //console.log("After Jump:" + this.yVelocity);
            }
    
            if (this.buttonADown) {
                this.buttonADown = false;
                let deltaX = 0;
                let direction = 0;
                if (this.playerOrientation == "Right") {
                    deltaX = 0.4;
                    direction = 1;
                }
                else {
                    deltaX = -0.4;  
                    direction = -1;
                }
                let deltaY = 0.26;
                let xSpeed = 1;
                let ySpeed = 0;
                if (this.yAxis < 0) {
                    xSpeed = 0.866;
                    ySpeed = -0.5;
                    deltaY += -0.2;
                }
                if (this.yAxis > 0) {
                    xSpeed = 0.866;
                    ySpeed = 0.5;
                    deltaY += 0.1;
                }
                let newBullet = new Bullet("Bullet", this.scene, this.xPosition + deltaX, this.yPosition + deltaY, 0, 0, 1, 1, 0, false);
                engine.AudioManager.PlaySound(this.scene, this.xPosition, this.yPosition, 'shoot npc', 10, 0.7);
                newBullet.xVelocity = newBullet.speed * direction * xSpeed;
                newBullet.yVelocity = newBullet.speed * ySpeed;
                newBullet.addBoxCollider(0, 0, 0.08 , 0.08, true);
                newBullet.spriteSheetTag = 'bullet';
                newBullet.origin = this;                
                newBullet = null;
            }
        }
    }
}

class PlayerObject extends CharacterObject {
    xAxis = 1;
    yAxis = 0;
    jumpDown = false;
    buttonADown = false;
    weaponReloadTime = 0.25;
    weaponTimer = 0;
    grenadesCount = 999;
    grenadeReloadTime = 1;
    grenadeTimer = 0;

    update() {
        super.update();

        if (this.weaponTimer >= this.weaponReloadTime) {
            this.weaponTimer = this.weaponReloadTime;
        } else {
            this.weaponTimer += this.scene.deltaTime;
        }

        if (this.grenadeTimer >= this.grenadeReloadTime) {
            this.grenadeTimer = this.grenadeReloadTime;
        } else {
            this.grenadeTimer += this.scene.deltaTime;
        }

        if (this.grenadesCount == 999) {
            this.grenadesCount = 0;
            if (this.player) {
                this.player.socket.emit('grenade update', this.grenadesCount);
            }        
        }

    }

    processInput() {
        let playerLook = "";

        if (this.yAxis < 0) {
            playerLook = "Upwards";
        }
        if (this.yAxis > 0) {
            playerLook = "Downwards";
        }
        if (this.isDead) {
            //console.log("Character is dead");
            if (this.playerOrientation == "Right") this.animationState = "DeathRight"
            else this.animationState = "DeathLeft";            
        }
        else {
            if (this.xAxis > 0) {
                this.playerOrientation = "Right";
            }
    
            if (this.xAxis < 0) {
                this.playerOrientation = "Left";
            }
            if (this.playerGroundCheck.isGrounded) {
                if (this.xAxis > 0) {
                    this.animationState = "RunRight" + playerLook;
                }
                else if (this.xAxis < 0) {
                    this.animationState = "RunLeft" + playerLook;
                }
                else {
                    if (this.playerOrientation == "Right") {
                        this.animationState = "IdleRight" + playerLook;
                    } else {
                        this.animationState = "IdleLeft" + playerLook;
                    }
                }
            } else {
                if (this.xAxis > 0) {
                    this.animationState = "JumpRight" + playerLook;
                }
                else if (this.xAxis < 0) {
                    this.animationState = "JumpLeft" + playerLook;
                }
                else {
                    if (this.playerOrientation == "Right") {
                        this.animationState = "JumpRight" + playerLook;
                    } else {
                        this.animationState = "JumpLeft" + playerLook;
                    }
                }
            }
    
            if ((this.xAxis > 0 && !this.playerRightCheck.isTouchingRight) || (this.xAxis < 0 && !this.playerLeftCheck.isTouchingLeft)) this.translate(this.xAxis * this.scene.deltaTime * this.speed, 0);
    
            if (this.jumpDown && this.playerGroundCheck.isGrounded) {
                //console.log("Before Jump:" + this.yVelocity);
                this.yVelocity -= this.jumpVelocity;
                //console.log("After Jump:" + this.yVelocity);
            }
    
            if (this.buttonADown) {                
                //this.buttonADown = false;
                let deltaX = 0;
                let direction = 0;
                if (this.playerOrientation == "Right") {
                    deltaX = 0.4;
                    direction = 1;
                }
                else {
                    deltaX = -0.4;  
                    direction = -1;
                }
                let deltaY = 0.26;
                let xSpeed = 1;
                let ySpeed = 0;
                if (this.yAxis < 0) {
                    xSpeed = 0.866;
                    ySpeed = -0.5;
                    deltaY += -0.2;
                }
                if (this.yAxis > 0) {
                    xSpeed = 0.866;
                    ySpeed = 0.5;
                    deltaY += 0.1;
                }
                if (this.weaponTimer == this.weaponReloadTime) {
                    this.weaponTimer = 0;
                    let newBullet = new Bullet("Bullet", this.scene, this.xPosition + deltaX, this.yPosition + deltaY, 0, 0, 1, 1, 0, false);
                    engine.AudioManager.PlaySound(this.scene, this.xPosition, this.yPosition, 'shoot', 10, 1);
                    newBullet.xVelocity = newBullet.speed * direction * xSpeed;
                    newBullet.yVelocity = newBullet.speed * ySpeed;
                    newBullet.addBoxCollider(0, 0, 0.08 , 0.08, true);
                    newBullet.spriteSheetTag = 'bullet';
                    newBullet.origin = this;                
                    newBullet = null;
                }
            }
            if (this.buttonBDown) {
                let deltaX = 0;
                let direction = 0;
                if (this.playerOrientation == "Right") {
                    deltaX = -0.5;
                    direction = -1;
                }
                else {
                    deltaX = 0.5;  
                    direction = 1;
                }
                let deltaY = -0.2;
                let xSpeed = 0.5;
                let ySpeed = -0.866;
                if (this.grenadeTimer == this.grenadeReloadTime && this.grenadesCount) {
                    this.grenadeTimer = 0;
                    this.grenadesCount--;
                    this.player.socket.emit('grenade update', this.grenadesCount);
                    let newBullet = new Grenade("Grenade", this.scene, this.xPosition + deltaX, this.yPosition + deltaY, 0, 0, 1, 1, 0, false);
                    engine.AudioManager.PlaySound(this.scene, this.xPosition, this.yPosition, 'grenade', 10, 1);
                    newBullet.xVelocity = newBullet.speed * direction * xSpeed;
                    newBullet.yVelocity = newBullet.speed * ySpeed;
                    newBullet.addBoxCollider(0, 0, 0.16 , 0.16, false);
                    newBullet.addBoxCollider(0, 0, 0.3 , 0.3, true);
                    newBullet.spriteSheetTag = 'grenade';
                    newBullet.origin = this;                
                    newBullet = null;
                }

            }
        }
        if (this.ctrl) {
            this.playerCameraScale = 120;
        } else {
            this.playerCameraScale = 60;
        }
    }
}

class Bullet extends engine.GameObject {
    damage = 10;
    speed = 10;
    existTime = 3;
    existanceTimer = 0;

    update() {
        super.update();
        this.existanceTimer += this.scene.deltaTime;
        //console.log(this.xVelocity);
        //console.log(this.existanceTimer);
        if (this.existanceTimer > this.existTime) {
            this.destroy();
        }
    }
    onTrigger(collision) {
        if (collision.destructable) {
            collision.dealDamage(this.damage, this.origin);
            this.destroy();
        }
        if (collision.layer == "solid") {
            this.destroy();
        }
        if (collision.layer == "fragile") {
            collision.destroy();
        }
    }
}

class Grenade extends engine.GameObject {
    damage = 1;
    speed = 6;
    existTime = 5;
    existanceTimer = 0;
    g = 40;
    explosionTimer = 0.15;
    alreadyExploded = false;
    activationTime = 0.5;

    update() {
        super.update();
        this.yVelocity += this.g * this.scene.deltaTime;
        this.existanceTimer += this.scene.deltaTime;
        //console.log(this.xVelocity);
        //console.log(this.existanceTimer);
        if (this.existanceTimer > this.existTime && !this.alreadyExploded) {
            this.alreadyExploded = true;
            this.explode();
        }
    }
    onTrigger(collision) {
        if (collision.destructable && !this.alreadyExploded && (this.existanceTimer >= this.activationTime)) {
            collision.dealDamage(this.damage, this.origin);
            if (!this.alreadyExploded) {
                this.explode();
                console.log("First trigger");
                this.alreadyExploded = true;
            } 
        }
        if (collision.damage && (this.existanceTimer >= this.activationTime)) {
            if (!this.alreadyExploded) {
                this.explode();
                console.log("Second Trigger: "+ collision.name);
                this.alreadyExploded = true;
            } 
        }

        if (collision.layer == "solid") {
            this.xVelocity = 0;
            this.yVelocity = 0;
        }
        if (collision.layer == "fragile") {
            collision.destroy();
        }
    }

    explode() {
        engine.AudioManager.PlaySound(this.scene, this.xPosition, this.yPosition, 'blip', 5, 0.5);
        setTimeout(this.explosion.bind(this),this.explosionTimer * 1000);
    }

    explosion() {
        this.destroy();
        let newBullet = new Explosion("Explosion", this.scene, this.xPosition, this.yPosition, 0, 0, 1, 1, 0, false);
        newBullet.animationState = "just created";
        newBullet.origin = this.origin;
        engine.AudioManager.PlaySound(this.scene, this.xPosition, this.yPosition, 'explode', 10, 1);
        newBullet.order = -20;
        newBullet.addBoxCollider(0, 0, 1.5 , 1.5, true);
        newBullet.spriteSheetTag = 'explode';
        newBullet = null;
    }
}

class Explosion extends engine.GameObject {
    damage = 50;
    existTime = 0.3;
    existanceTimer = 0;
    alreadyHurtObjects = [];
    update() {
        super.update();
        if (this.existanceTimer>0) this.animationState = "exists";
        this.existanceTimer += this.scene.deltaTime;
        //console.log(this.xVelocity);
        //console.log(this.existanceTimer);
        if (this.existanceTimer > this.existTime) {
            this.destroy();
        }
    }
    onTrigger(collision) {
        let notHurt = true;
        for (let i = 0; i< this.alreadyHurtObjects.length; i++) {
            if (this.alreadyHurtObjects[i] == collision) notHurt = false;
        }
        if (collision.destructable && notHurt) {
            collision.dealDamage(this.damage, this.origin);
            this.alreadyHurtObjects.push(collision);
        }
    }    
}

function createPlayerAvatar(scene) {
    let xPos = (Math.random() - 0.5) * 20;
    let speed = 4;

    let NPCCrab = new PlayerObject("Crab" + Date.now().toString(), scene, xPos, 15, 0, 0, 1, 1, 0, false);
    
    NPCCrab.addBoxCollider(0, 0, 0.67 , 1, false);
    //NPCDuck.setSprite(duckSprites, 1, 0);
    NPCCrab.spriteSheetTag = 'crab';
    NPCCrab.speed = speed;

    let NPCCrabGC = new PlayerGroundCheck("Ground Check", scene, 0, 0, 0, 0, 0.5, 0.01, 0, false);
    NPCCrabGC.addBoxCollider(0, 0, 0.5, 0.01, true);
    NPCCrabGC.origin = NPCCrab;
    //PlayerGC.setSprite(squareSprites, 0, 1);
    NPCCrab.playerGroundCheck = NPCCrabGC;
    
    let NPCCrabLC = new PlayerLeftCheck("Left Check", scene, 0, 0, 0, 0, 0.01, 0.75, 0, false);
    NPCCrabLC.addBoxCollider(0, 0, 0.01, 0.75, true);
    //PlayerLC.setSprite(squareSprites, 0, 1);
    NPCCrab.playerLeftCheck = NPCCrabLC;
    
    let NPCCrabRC = new PlayerRightCheck("Right Check", scene, 0, 0, 0, 0, 0.01, 0.75, 0, false);
    NPCCrabRC.addBoxCollider(0, 0, 0.01, 0.75, true);
    //PlayerRC.setSprite(squareSprites, 0, 1);
    NPCCrab.playerRightCheck = NPCCrabRC;

    console.log("Spawned a crab: " + NPCCrab.id + " : " + NPCCrab.name);
    return NPCCrab;
}

exports.Game = class Game {
    constructor(io) {
        this.scene = new engine.Scene(io, 0, 0, 60, createPlayerAvatar);
        let scene = this.scene;
        this.tilemap = new engine.Tilemap(scene, path.join(__dirname, '..', 'assets', 'level.json'));
        let tilemap = this.tilemap;
        let BrickwallPrefab = new engine.GameObject("Brickwall", scene, -1000, 0, 0, 0, 1, 1, 0, true);
        BrickwallPrefab.order = -1;
        BrickwallPrefab.addBoxCollider(0, 0, 1, 1, false);
        //BrickwallPrefab.setSprite(squareSprites, 0, 0);
        BrickwallPrefab.spriteSheetTag = 'squareBrick';
        BrickwallPrefab.layer = "solid";
        
        let GlasswallPrefab = new engine.GameObject("Glasswall", scene, -1000, 1, 0, 0, 1, 1, 0, true);
        GlasswallPrefab.order = -10;
        //GlasswallPrefab.setSprite(squareSprites, 0, 6);
        GlasswallPrefab.spriteSheetTag = 'squareGlass';
        GlasswallPrefab.layer = "background";
        
        let CoverwallPrefab = new CoverPrefab("Coverwall", scene, -1000, 2, 0, 0, 1, 1, 0, true);
        CoverwallPrefab.order = 10;
        CoverwallPrefab.addBoxCollider(0, 0, 0.5, 0.5, true);
        //CoverwallPrefab.setSprite(squareSprites, 0, 4);
        CoverwallPrefab.spriteSheetTag = 'squareCoverwall';
        CoverwallPrefab.layer = "foreground";

        let HealBlock = new HealPrefab("Heal", scene, -1000, 4,0,0,1,1,0,false);
        HealBlock.animationState = 'enabled';
        HealBlock.addBoxCollider(0, 0, 0.9, 0.9, true);
        HealBlock.order = -10;

        let BoxBlock = new BoxPrefab("box", scene, -1000, 6,0,0,1,1,0,false);
        BoxBlock.animationState = 'enabled';
        BoxBlock.addBoxCollider(0, 0, 0.9, 0.9, true);
        BoxBlock.order = -10;        

        tilemap.addPrefabToPalette(1, BrickwallPrefab);
        tilemap.addPrefabToPalette(2, GlasswallPrefab);
        tilemap.addPrefabToPalette(3, CoverwallPrefab);
        tilemap.addPrefabToPalette(4, HealBlock);
        tilemap.addPrefabToPalette(5, BoxBlock);
        tilemap.buildTilemap();
        setInterval(this.spawnDuck.bind(this), 3000);        
    }

    spawnDuck() {
        let xPos = (Math.random() - 0.5) * 20;
        let speed = Math.random() * 4 + 2;
        let scene = this.scene;

        let NPCDuck = new NPCObject("Duck" + Date.now().toString(), scene, xPos, 15, 0, 0, 1, 1, 0, false);
        NPCDuck.addBoxCollider(0, 0, 0.67 , 1, false);
        //NPCDuck.setSprite(duckSprites, 1, 0);
        NPCDuck.spriteSheetTag = 'duck';
        NPCDuck.speed = speed;
        console.log("Spawned a duck: " + NPCDuck.id + " : " + NPCDuck.name);
        
        let NPCDuckGC = new PlayerGroundCheck("Ground Check", scene, 0, 0, 0, 0, 0.5, 0.01, 0, false);
        NPCDuckGC.addBoxCollider(0, 0, 0.5, 0.01, true);
        NPCDuckGC.origin = NPCDuck;
        //PlayerGC.setSprite(squareSprites, 0, 1);
        NPCDuck.playerGroundCheck = NPCDuckGC;
        
        let NPCDuckLC = new PlayerLeftCheck("Left Check", scene, 0, 0, 0, 0, 0.01, 0.75, 0, false);
        NPCDuckLC.addBoxCollider(0, 0, 0.01, 0.75, true);
        //PlayerLC.setSprite(squareSprites, 0, 1);
        NPCDuck.playerLeftCheck = NPCDuckLC;
        
        let NPCDuckRC = new PlayerRightCheck("Right Check", scene, 0, 0, 0, 0, 0.01, 0.75, 0, false);
        NPCDuckRC.addBoxCollider(0, 0, 0.01, 0.75, true);
        //PlayerRC.setSprite(squareSprites, 0, 1);
        NPCDuck.playerRightCheck = NPCDuckRC;
        
        NPCDuck = null;
        NPCDuckGC = null;
        NPCDuckLC = null;
        NPCDuckRC = null;
    }
    
}




