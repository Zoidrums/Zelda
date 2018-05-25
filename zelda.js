var w = window;
var d = document;
var mapPiece = 12;
var nbSword = 0;

var XtoMap = null;
var YtoMap = null;


(function() {
  //Colors
  var darkGreen = '#003100';
  var lightGreen = '#003b00';
  var veryLightGreen = '#008500';
  var darkGray = '#151515';
  var link = '#202020';
  var mediumGray = '#5b5245';
  var lightGray = '#72685c';
  var veryLightGray = '#80766a';
  var brown = '#492200';
  var black = '#000';
  var white = '#fff';
  var yellow = '#ffcc00';
  var lightYellow = '#ffff8c';
  var orange = '#f86b0e';
  var red = '#ff0000';
  var lightRed = '#ffaaaa';
  var darkRed = '#a91000';
  var face = '#ffcc99';
  var shade = 'rgba(0,0,0,0.2)';
  var background = '#ffffda';
  var lightBlue = '#7a94c9';
  var veryLightBlue = '#11f4dc';
  var darkBlue = '#112a5e';
  var pageBackground = '#f6ddae';
  var bandana = red;
  var sandColor = '#ffffda';
  var greenTree = '#1bbd1a';
  var rock = '#9e4c01';
  var water = '#423ffd';
  var darkWater = '#7c4f4b';
  var bridge = '#9b4e00';
  var gemColor=lightBlue;
  var haveWon=false;

  var requestAnimationFrame = (function(){
    return window.requestAnimationFrame  || 
      window.webkitRequestAnimationFrame || 
      window.mozRequestAnimationFrame    || 
      window.oRequestAnimationFrame      || 
      window.msRequestAnimationFrame     || 
      function(callback){
        window.setTimeout(callback, 1000 / 60);
      };
  })();

  //Constants
  var width = 16;
  var height = 11;
  var Direction = {
    NORTH: 0,
    EAST:  1,
    SOUTH: 2,
    WEST:  3
  };
  var Mode = {
    SINGLE_PLAYER: 0,
    MULTI_VERSUS:  1,
    MULTI_COOP: 2
  };

  //Menu
  var selectorSword;
  var controlsDisplayed = false;

  //Globals
  var gameMode;
  var ctx;    
  var sprites;
  var enemies;
  var field = new Array(width);
  var players;
  var dead;
  var bombEnabled = false;
  var gpsEnabled = false;
  var inGrave = false;
  var shown = false;
  
  //Timing
  var lastUpdate = 0;
  var cleared;
  var quarter;

  //Pressed keys
  var keyListener;
  var keys = new Array(4);
  var keys2 = new Array(4);

  var lifeLevel=3;
  var nbGems=0;

  //Main game loop
  function step() {
    var now = Date.now();

    //Update timing
    lastUpdate = now;
    cleared = new Array();
    quarter = Math.floor((lastUpdate%1000)/250);
 
    //Draw sprites and players
    for(var i=0; i<sprites.length + enemies.length + players.length; i++) {
      var sprite;
      if(i < sprites.length) {
        sprite = sprites[i];
      } else if(i < sprites.length + enemies.length) {
        sprite = enemies[i - sprites.length];
      } else {
        sprite = players[i - sprites.length - enemies.length];
	      if(sprite == null) {
          continue;
        }
      }
      
      clearField(sprite.x, sprite.y);

      var diff = lastUpdate - sprite.lastMove;
      if(sprite.moving || (sprite.dead && sprite.wasMoving)) {
        var move = getOffsetForDirection(sprite.direction);
        //Once we are over halfway done move to the next field
        if(diff>sprite.moveTime/2 && !sprite.moved) {
          //In case of a moving piece reset the old field
          if(sprite instanceof Bomb || sprite instanceof Octorock) {
            field[sprite.x][sprite.y] = null;
          }

          sprite.x += move[0];
          sprite.y += move[1];
          sprite.moved = true;

          //In case of a moving bomb we move the field
          if(sprite instanceof Bomb || sprite instanceof Octorock) {
            field[sprite.x][sprite.y] = sprite.field;
          }
        }

        //Clear second tile if we are moving
        var moveX = move[0] * (sprite.moved ? -1 : 1);
        var moveY = move[1] * (sprite.moved ? -1 : 1);
        clearField(sprite.x + moveX, sprite.y + moveY);
      }

      if (sprite instanceof Sword) { 
        if (field[sprite.x][sprite.y] != null) {
          if (field[sprite.x][sprite.y].draw == drawRock ||
              field[sprite.x][sprite.y].draw == drawRockWall ||
              field[sprite.x][sprite.y].draw == drawBush ||
              field[sprite.x][sprite.y].draw == drawTree ||
              field[sprite.x][sprite.y].draw == drawGrave ||
              field[sprite.x][sprite.y].draw == drawHiddenGrave ||
              field[sprite.x][sprite.y].draw == drawBridge ||
              field[sprite.x][sprite.y].draw == drawStream ||
              field[sprite.x][sprite.y].draw == drawWater) {
            sprites.splice(i--, 1);
            sprites.push(new DisappearingSprite(sprite.x, sprite.y, drawOctoDead, false));
          } else if (field[sprite.x][sprite.y].sprite instanceof Octorock) {
            //alert('paf');
          }
        }
        for(var j=0; j<enemies.length; j++) {
          if (sprite.direction == Direction.NORTH) {
            if(enemies[j].x == sprite.x && enemies[j].y == sprite.y-1) {
              enemies[j].die();
              sprite.explode();
            }
          } else if (sprite.direction == Direction.SOUTH) {
            if(enemies[j].x == sprite.x && enemies[j].y == sprite.y+1) {
              enemies[j].die();
              sprite.explode();
            }
          } else if (sprite.direction == Direction.EAST) {
            if(enemies[j].x == sprite.x+1 && enemies[j].y == sprite.y) {
              enemies[j].die();
              sprite.explode();
            }
          } else if (sprite.direction == Direction.WEST) {
            if(enemies[j].x == sprite.x-1 && enemies[j].y == sprite.y) {
              enemies[j].die();
              sprite.explode();
            }
          }
        }
      }

      //Check for collision with player
      if(!(sprite instanceof Link)) {
        for(var j=0; j<players.length; j++) {
          var player = players[j];
          if(player == null) {
            continue;
          }
          if(player.x == sprite.x && player.y == sprite.y) {
            //If it is an explosion die
            if(sprite instanceof Enemy || sprite instanceof Explosion) {
              die(player);
            } else if(sprite.draw == drawBombUpgrade ||
                      sprite.draw == drawGem ||
                      sprite.draw == drawGems30 ||
                      sprite.draw == drawGems100) {
              handleUpgrade(sprite, player);
              if (inGrave) {
                field[sprite.x][sprite.y].draw = drawBlack;
                ground = "N";
              } else {
                field[sprite.x][sprite.y] = null;
                ground = "S";
              }
              levels["maps"][mapPiece].map[sprite.y] = levels["maps"][mapPiece].map[sprite.y].substr(0, sprite.x)+ground+levels["maps"][mapPiece].map[sprite.y].substr(sprite.x+1, width-sprite.x);
              sprites.splice(i--, 1);
            } else if (sprite.draw == drawGps) {
              handleUpgrade(sprite, player);
              if (gpsEnabled) {
                if (inGrave) {
                  field[sprite.x][sprite.y].draw = drawBlack;
                  ground = "N";
                } else {
                  field[sprite.x][sprite.y] = null;
                  ground = "S";
                }
                levels["maps"][mapPiece].map[sprite.y] = levels["maps"][mapPiece].map[sprite.y].substr(0, sprite.x)+ground+levels["maps"][mapPiece].map[sprite.y].substr(sprite.x+1, width-sprite.x);
                sprites.splice(i--, 1);
              }
            } else if (sprite.draw == drawText) {
              showText(levels["maps"][mapPiece].speech);
            }
          }
        }
      }

      //Check for collision between explosion and enemy or upgrade
      if(sprite instanceof Explosion) {
        for(var j=0; j<enemies.length; j++) {
          if(enemies[j].x == sprite.x 
               && enemies[j].y == sprite.y) {
            enemies[j].die();
          }
        }
        for(var j=0; j<sprites.length; j++) {
          if(sprites[j] instanceof Upgrade
               && sprites[j].x == sprite.x 
               && sprites[j].y == sprite.y) {
            sprites.splice(j, 1);
          }
        }
      }

      handleInput();

      //Translate canvas to sprite position
      ctx.save();
      ctx.translate(20 + sprite.x*40, 40 + sprite.y*40);

      //Draw sprite
      if(sprite.update()) {
        sprites.splice(i--, 1);
      }

      ctx.restore();
    }

    //Draw HUD
    ctx.textAlign = 'left';
    ctx.font = 'bold 12pt Arial Black';

    if(players[0] != null) {
      rect(50,0,50,40, darkGreen);
      rect(150,0,50,40, darkGreen);
      ctx.fillStyle = darkGreen;
      //ctx.fillText('x' + players[0].bombs, 50, 22);
      //ctx.fillText('x' + players[0].explosionSize, 150, 22);
    }

    //Draw border
    path([ [20,40], [20+width*40, 40], [20+width*40, 39+height*40], [20, 39+height*40], [20,40] ], darkGreen, true, 2);

    //Draw rounded corners
    drawCorner(20, 40, 0);
    drawCorner(620, 40, Math.PI*0.5);
    drawCorner(620, 440, Math.PI);
    drawCorner(20, 440, Math.PI*1.5);

    if(dead && lastUpdate - dead > 1000) {
      //Draw game over if we are dead after 1000 ms
      ctx.font = 'bold 60pt Arial Black';
      ctx.textAlign = 'center';
      ctx.fillStyle = darkRed;
      ctx.fillText('GAME OVER', 340, 240);
    }

    if(dead && lastUpdate - dead > 3000) {
      initBombJs();
    }
    rect(0, 0, 20, 12*40, darkGreen);
    rect(0, 0, 17*40, 40, darkGreen);
    rect(0, 12*40, 17*40, 40, darkGreen);
    requestAnimationFrame(step);
  }

  function drawCorner(x, y, angle) {
    ctx.save();
    ctx.translate(x, y);
    rotateBy(angle);
    var radius = 15;
    ctx.beginPath();
    ctx.moveTo(0, radius);
    ctx.arc(radius, radius, radius, Math.PI, Math.PI * 1.5, false);
    ctx.lineTo(0, 0);
    ctx.lineTo(0, radius);
    ctx.fillStyle = darkGreen;
    ctx.fill();
    ctx.closePath();
    ctx.restore();
  }

  function clearField(x, y) {
    var index = x*100 + y;
    if(cleared.indexOf(index)==-1) {
      //Translate canvas to sprite position
      ctx.save();
      ctx.translate(20 + x*40, 40 + y*40);

      //Clear canvas underneath sprite if not already cleared
      rect(0, 0, 40, 40, background);

      //Redraw field if there is anything
      if(field[x]!=null && field[x][y]!=null) {
       field[x][y].update();
      } 

      //Prevent clearing twice
      cleared.push(index);

      ctx.restore();
    }
  }

  function handleInput() {
    for(var i=0; i<players.length; i++) {
      //Check if and which direction key was pressed last
      var maxIndex = getMaxIndex(i == 0 ? keys : keys2);
      //If we are not moving and a key is pressed trigger a move
      if(maxIndex != -1 && !players[i].moving) {
        players[i].direction = maxIndex;
        movePlayer(players[i]);
      }
    }
  }

  function getMaxIndex(keys) {
    var maximum = 0;
    var maxIndex = -1;
    for(var i=0; i<4; i++) {
      if(keys[i]>maximum) {
        maximum = keys[i];
        maxIndex = i;
      }
    }
    return maxIndex;
  }

  function die(player) {
    //Kill player
    if(!player.dead) {
      player.dead = lastUpdate;
      player.moving = false;
      player.wasMoving = player.wasMoving;
    }

    //Check how many are still alive
    var alive = 0;
    for(var i=0; i<players.length; i++) {
      if(players[i] != null && !players[i].dead) {
        alive++;
      }
    }

    if(!dead && 
         ((gameMode == Mode.MULTI_VERSUS && alive == 1) || 
         (gameMode != Mode.MULTI_VERSUS && alive == 0))) {
      dead = lastUpdate;

      //Disable controls
      d.onkeydown = null;
      d.onkeyup = null;
      keys = new Array(4);
  
      initGame();
      w.setTimeout(initBombJs, 3000);
    }
  }

  function initGame() {
    nbSword = 0;
    nbGems = 0;
    bombEnabled = false;
    gpsEnabled = false;
    levels = JSON.parse(JSON.stringify(levelsSauv));
    mapPiece = 12;
    XtoMap = null;
    YtoMap = null;
  }

  /************************/
  /*       Sprites        */
  /************************/
  function Sprite(x, y, draw) {
    this.x = x;
    this.y = y;
    this.initialized = lastUpdate;
    this.draw = draw;
    this.offset = [0, 0];
  }
  Sprite.prototype.update = function() {
    return this.draw();
  }

  //Sprite which can move
  function MovingSprite(x, y, draw) {
    Sprite.call(this, x, y, draw);
    this.moveTime = 400;

    this.lastMove = 0;
    this.moving = false;
    this.moved = false;

    this.move = function() {
      this.lastMove = lastUpdate;         
      this.moving = true;
      this.moved = false;
    }
  }
  MovingSprite.prototype = new Sprite();

  //Sprite which blocks the field underneath it (e.g. Bomb or Upgrade)
  function SpriteField(x, y, sprite) {
    Sprite.call(this, x, y, function() { 
      /*if(sprite instanceof Bomb) {
       rect(0,0,40,40,darkGreen);
      } else if(sprite instanceof Upgrade) {
       rect(0,0,40,40,red); 
      } else {
       rect(0,0,40,40,yellow);
      }*/
    });
    this.sprite = sprite;
  }
  SpriteField.prototype = new Sprite();

  //Sprite which blocks the field underneath player
  function PlayerField(x, y, sprite) {
    this.sprite = sprite;
    Sprite.call(this, x, y, function() { 
    });
  }
  PlayerField.prototype = new SpriteField();

  function Upgrade(x, y, draw) {
    Sprite.call(this, x, y, draw);
  }
  Upgrade.prototype = new Sprite();

  function Sword(x, y, player) {
    MovingSprite.call(this, x, y);
    this.moveTime = 250;
    this.player = player;
    this.scale = 0;
    this.direction = player.direction;
    this.draw = function() {
      ctx.translate(2,2);

      if(this.moving) {
        //Update position of the field
        movingOffset(this);  
      }
      if(!this.moving) {
        //If move just stopped try scheduling another one
        moveSprite(this);
      }

      //Animate bomb scale
      this.scale++;
      var scaleFactor = 1.0 + (0.1 * this.scale/20);
      if(this.scale>20) {
        this.scale=0;
      }
      ctx.scale(scaleFactor, scaleFactor);

      //Animate spark with 0.25 sec between 2 keyframes
      drawSword(this.direction);
    }
    this.explode = function() {
      if (field[this.x][this.y] != null) {
        field[this.x][this.y].draw = null;
        field[this.x][this.y] = null;
      }
      sprites.push(new DisappearingSprite(this.x, this.y, drawOctoDead, false));
      disX = this.x;
      disY = this.y;
      switch (this.direction) {
        case Direction.NORTH :
          disY++;
          break;
        case Direction.SOUTH :
          disY--;
          break;
        case Direction.EAST :
          disX--;
          break;
        case Direction.WEST :
          disX++;
          break;
      }
      sprites.push(new DisappearingSprite(disX, disY, drawNull, false));
      //triggerExplosion(this);
      sprites.splice(sprites.indexOf(this), 1);
      clearField(this.x, this.y);
      nbSword=0;
      return true;
    }
  }
  Sword.prototype = new MovingSprite();

  function Bomb(x, y, player) {
    MovingSprite.call(this, x, y);
    this.moveTime = 250;
    this.player = player;
    this.scale = 0;
    this.draw = function() {
      ctx.translate(2,2);

      if(this.moving) {
        //Update position of the field
        movingOffset(this);
        if(!this.moving) {
          //If move just stopped try scheduling another one
          moveSprite(this);
        }
      }

      //Animate bomb scale
      this.scale++;
      var scaleFactor = 1.0 + (0.1 * this.scale/20);
      if(this.scale>20) {
        this.scale=0;
      }
      ctx.scale(scaleFactor, scaleFactor);

      //Animate spark with 0.25 sec between 2 keyframes
      drawBomb(quarter == 0 || quarter == 2);

      //Trigger explosion when countdown reaches 0
      if(!this.player.timer) {
        var diff = lastUpdate - this.initialized;
        if(diff > 3000) {
          this.explode();
        }
      }
    }
    this.explode = function() {
      this.player.plantedBombs--;
      field[this.x][this.y] = null;
      triggerExplosion(this);
      sprites.splice(sprites.indexOf(this), 1);
      return true;
    }
  }
  Bomb.prototype = new MovingSprite();

  function DisappearingSprite(x, y, draw, grave) {
    Sprite.call(this, x, y);
    this.draw = function() {
      if(this.clear) {
        ctx.save();
        ctx.translate(- (20 + this.x*40), - (40 + this.y*40));
        clearField(this.x + this.clear[0], this.y + this.clear[1]);
        ctx.restore();
      }
      if(lastUpdate - this.initialized > 750) { 
        //Remove sprite
        if (grave) {
          drawGrave();
        } else {
          clear();
        }
        return true;
      } else {
        ctx.translate(this.offset[0], this.offset[1]);        
        draw();
      }
    }    
  }
  DisappearingSprite.prototype = new Sprite();

  function Explosion(x, y, explosion, direction) {
    Sprite.call(this, x, y);
    this.direction = direction;
    this.draw = function() {
      rotateBy(Math.PI * 0.5 * this.direction);

      //Mirror horizontally for SOUTH and WEST pieces
      if(this.direction == Direction.SOUTH || this.direction == Direction.WEST) {
        mirrorHorizontally();
      }

      var diff = lastUpdate - this.initialized;
      if(diff < 450) {
        explosion(diff < 150 ? 0 : (diff < 300 ? 1 : 2));
      } else {
        //Remove explosion after 450ms expire
        clear();
        return true;
      }
    }    
  }
  Explosion.prototype = new Sprite();

  function Link(x, y) {
    MovingSprite.call(this, x, y);
    this.direction = Direction.SOUTH;
    this.life = 3;
    this.drawings = new Array();
    this.drawings[Direction.NORTH] = drawBackwardLink;
    this.drawings[Direction.EAST]  = drawHorizontalLinkEast;
    this.drawings[Direction.SOUTH] = drawForwardLink;
    this.drawings[Direction.WEST]  = drawHorizontalLinkWest;

    this.draw = function() {
      //Animate character with 250ms between keyframes
      var anim = (quarter==0 || quarter==2);

      //Mirror horizontally for WEST facing Link
      if(this.dead) {
        ctx.translate(this.offset[0], this.offset[1]);
        var diff = lastUpdate - this.dead;
        //Remove sprite after 3 sec
        if(diff > 3000) {
          clear();
          players[players.indexOf(this)] = null;
        } else {
          drawDeadLink(anim, !anim);
        }
      } else if(this.moving) {
        movingOffset(this);
        if(this.direction == Direction.WEST) {
          mirrorHorizontally();
        }

        this.drawings[this.direction](anim, !anim);
      } else {
        if(this.direction == Direction.WEST) {
          mirrorHorizontally();
        }
        this.drawings[this.direction](true, true);
      }
    }    
  }
  Link.prototype = new MovingSprite();

  function Enemy(x, y) {
    MovingSprite.call(this, x, y);
    this.direction = Direction.SOUTH;
    this.die = function() {
      var disappear = new DisappearingSprite(this.x, this.y, this.drawDead, false);
      disappear.offset = this.offset;
      sprites.push(disappear);
      //field[this.x][this.y] = new Sprite(this.x, this.y, drawGem);
      ctx.save();
      ctx.translate(20 + this.x*40, 40 + this.y*40);
      field[this.x][this.y].update();
      ctx.restore();
      var gem = new Sprite(this.x, this.y, drawGem);
      sprites.push(gem);
      levels["maps"][mapPiece].map[this.y] = levels["maps"][mapPiece].map[this.y].substr(0, this.x)+"Q"+levels["maps"][mapPiece].map[this.y].substr(this.x+1, width-this.x);

      enemies.splice(enemies.indexOf(this), 1);
      levels["maps"][mapPiece].foes = enemies.length;
      
      if(this.moving) {
        var move = getOffsetForDirection(this.direction);
        if(!this.moved) {
          field[this.x+move[0]][this.y+move[1]] = null;
          disappear.clear = [ move[0], move[1] ];
        } else {
          disappear.clear = [ -move[0], -move[1] ];
        }
      }
    }
  }
  Enemy.prototype = new MovingSprite();

  function Octorock(x, y) {
    Enemy.call(this, x, y);

    this.wait = 0;
    this.moveTime = 700;
    this.drawDead = drawOctoDead;

    this.drawings = new Array();
    this.drawings[Direction.NORTH] = drawBackwardOctorock;
    this.drawings[Direction.EAST]  = drawHorizontalOctorockEast;
    this.drawings[Direction.SOUTH] = drawForwardOctorock;
    this.drawings[Direction.WEST]  = drawHorizontalOctorockWest;

    this.draw = function() {
      //Mirror horizontally for WEST facing octorock
      if(this.moving) {
        movingOffset(this);
        if(this.direction == Direction.WEST) {
          mirrorHorizontally();
        }

        //Animate character with 250ms between keyframes
        var anim = (quarter==0 || quarter==2);
        if(anim) {
          rotateBy(0.1);
        } else {
          rotateBy(-0.1);
        }
        this.drawings[this.direction]();
      } else {
        if(this.direction == Direction.WEST) {
          mirrorHorizontally();
        }
        this.drawings[this.direction]();
      
        //Not moving decide if we should wait or move
        if(lastUpdate - this.wait > this.moveTime) {
          if(Math.random() < 0.3) {
            this.wait = lastUpdate;
          } else {
            //Find open directions and try moving
            var open = new Array();
            for(var i = 0; i < 4; i++) {
              var move = getOffsetForDirection(i);
              if(field[this.x+move[0]] != undefined
                   && (field[this.x+move[0]][this.y+move[1]] == null
	                   || field[this.x+move[0]][this.y+move[1]] instanceof PlayerField)) {
                open.push(i);
              }
            }
            if(open.length>0) {
              //Pick a random direction and go
              this.direction = open[Math.floor(Math.random()*open.length)];
              moveSprite(this);
            }
          }
        }
      }
    }    
  }
  Octorock.prototype = new Enemy();

  function movingOffset(sprite) {
    var diff = lastUpdate - sprite.lastMove;

    //Calculate offset
    var offset = 40 * diff/sprite.moveTime;
    offset = sprite.moved ? -40 + offset : offset; // 0->20 -20->0
    var translateX = sprite.direction == Direction.EAST ? offset : (sprite.direction == Direction.WEST ? -offset : 0);
    var translateY = sprite.direction == Direction.SOUTH ? offset : (sprite.direction == Direction.NORTH ? -offset : 0);
    ctx.translate(translateX, translateY);

    if(diff > sprite.moveTime) {
      sprite.moving = false;
    } else {
      sprite.offset = [ translateX, translateY ];
    }
  }

  /************************/
  /*  Drawing functions   */
  /************************/
  function circle(x, y, radius, fill) {
    arc(x, y, radius, 0, 2*Math.PI, fill);
  }

  function arc(x, y, radius, begin, end, fill, isStroke) {
    ctx.beginPath();
    ctx.arc(x, y, radius, begin, end, false);
    if(isStroke) {
      ctx.strokeStyle = fill;
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    ctx.closePath();
  }

  function rect(x, y, w, h, fill) {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
  }

  function ellipse(x, y, w, h, fill) {
    var kappa = .5522848;
    var ox = (w / 2) * kappa; // control point offset horizontal
    var oy = (h / 2) * kappa; // control point offset vertical
    var xe = x + w;           // x-end
    var ye = y + h;           // y-end
    var xm = x + w / 2;       // x-middle
    var ym = y + h / 2;       // y-middle

    ctx.beginPath();
    ctx.moveTo(x, ym);
    ctx.bezierCurveTo(x, ym - oy, xm - ox, y, xm, y);
    ctx.bezierCurveTo(xm + ox, y, xe, ym - oy, xe, ym);
    ctx.bezierCurveTo(xe, ym + oy, xm + ox, ye, xm, ye);
    ctx.bezierCurveTo(xm - ox, ye, x, ym + oy, x, ym);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.closePath();
  }

  function path(points, fill, isStroke, width) {
    width = width || 2;
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for(var i=1; i<points.length; i++) {
      ctx.lineTo(points[i][0], points[i][1]);
    }
    if(isStroke) {
      ctx.strokeStyle = fill;
      ctx.lineWidth = width;
      ctx.stroke();
    } else {
      ctx.lineTo(points[0][0], points[0][1]);
      ctx.fillStyle = fill;
      ctx.fill();
    }
    ctx.closePath();    
  }

  function roundedRect(x, y, w, h, r, fill) {
    ctx.beginPath();
    ctx.moveTo(x, y + r);
    ctx.arc(x + r, y + r, r, Math.PI, Math.PI*1.5);
    ctx.lineTo(x + w - 2*r, y);
    ctx.arc(x + w - r, y + r, r, Math.PI*1.5, Math.PI*2);
    ctx.lineTo(x + w, y + h - r);
    ctx.arc(x + w - r, y + h - r, r, 0, Math.PI*0.5);
    ctx.lineTo(x + r, y + h);
    ctx.arc(x + r, y + h - r, r, Math.PI*0.5, Math.PI);
    ctx.lineTo(x, y + r);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function showText(textTab) {
    if(!shown){
      shown = true;
      for (var i=0; i<textTab.length; i++) {
        ctx.font = '10pt Courier';
        ctx.textAlign = 'center';
        ctx.fillStyle = white;
        ctx.fillText(textTab[i], 350, 70+13*i);
      }
    }
  }

  /************************/
  /*    Sprite drawing    */
  /************************/
  function clear() {
    //Clear canvas underneath sprite
    rect(0, 0, 40, 40, background);
  }

  function drawBush() {
    //green parts
    rect(0, 0, 10, 8, greenTree);
    rect(2, 8, 8, 22, greenTree);
    rect(2, 30, 2, 2, greenTree);
    rect(0, 32, 2, 6, greenTree);
    rect(0, 14, 2, 14, greenTree);
    rect(6, 32, 14, 6, greenTree);
    rect(4, 36, 2, 4, greenTree);
    rect(8, 38, 8, 2, greenTree);
    rect(14, 10, 12, 22, greenTree);
    rect(16, 4, 22, 12, greenTree);
    rect(18, 0, 6, 4, greenTree);
    rect(36, 0, 4, 4, greenTree);
    rect(26, 16, 2, 2, greenTree);
    rect(28, 18, 10, 20, greenTree);
    //black parts
    rect(0, 38, 2, 2, black);
    rect(8, 0, 2, 2, black);
    rect(2, 32, 2, 4, black);
    rect(4, 28, 2, 4, black);
    rect(6, 22, 6, 8, black);
    rect(10, 2, 2, 28, black);
    rect(12, 0, 2, 10, black);
    rect(14, 0, 2, 4, black);
    rect(14, 28, 2, 4, black);
    rect(16, 30, 4, 2, black);
    rect(20, 32, 6, 6, black);
    rect(22, 34, 6, 6, black);
    rect(24, 28, 2, 4, black);
    rect(18, 34, 2, 2, black);
    rect(18, 38, 2, 2, black);
    rect(24, 0, 6, 2, black);
    rect(30, 2, 4, 2, black);
    rect(34, 0, 2, 10, black);
    rect(36, 4, 2, 2, black);
    rect(38, 6, 2, 10, black);
    rect(34, 16, 4, 2, black);
    rect(36, 18, 2, 2, black);
    rect(38, 20, 2, 10, black);
    rect(36, 28, 2, 8, black);
    rect(34, 36, 4, 4, black);
    rect(38, 36, 2, 2, black);    
  }

  function drawFallingWall() {
    //grey part
    rect(0, 0, 40, 40, veryLightGray);
    //black parts
    rect(8, 4, 2, 2, black);
    rect(32, 4, 2, 2, black);
    rect(20, 10, 2, 2, black);
    rect(6, 16, 2, 2, black);
    rect(34, 18, 2, 2, black);
    rect(16, 20, 2, 2, black);
    rect(4, 26, 2, 2, black);
    rect(20, 28, 2, 2, black);
    rect(30, 32, 2, 2, black);
    rect(10, 34, 2, 2, black);
  }

  function drawGrave() {
    //black part
    rect(0, 0, 40, 40, black);
  }

  function drawHiddenGrave () {
    //black part
    drawRockWall();
  }

  function drawBlack() {
    //inside grave
    rect(0, 0, 40, 40, black);
  }

  function drawSand() {
    //outside grave
    rect(0, 0, 40, 40, background);
  }

  function drawGem() {
    if (inGrave) {
      drawBlack();
    }
    //blue parts
    rect(12, 10, 16, 20, gemColor);
    rect(14, 8, 12, 2, gemColor);
    rect(16, 6, 8, 2, gemColor);
    rect(18, 4, 4, 2, gemColor);
    rect(14, 30, 12, 2, gemColor);
    rect(16, 32, 8, 2, gemColor);
    rect(18, 34, 4, 2, gemColor);
    //dark blue parts
    rect(20, 10, 2, 2, darkBlue);
    rect(24, 10, 2, 2, darkBlue);
    rect(22, 12, 2, 16, darkBlue);
    rect(20, 28, 2, 2, darkBlue);
    rect(24, 28, 2, 2, darkBlue);
    //white parts
    rect(18, 4, 2, 6, white);
    rect(16, 6, 2, 6, white);
    rect(14, 8, 2, 2, white);
    rect(12, 10, 2, 2, white);
    rect(12, 12, 4, 14, white);
    rect(12, 26, 2, 2, white);
    rect(16, 26, 2, 2, white);
    rect(18, 28, 2, 2, white);
  }

  function drawGems30() {
    drawBlack();
    gemColor=yellow;
    drawGem();
    gemColor=lightBlue;
  }

  function drawGems100() {
    gemColor=red;
    drawGem();
    gemColor=lightBlue;
  }

  function drawFire() {
    drawBlack();
    //red parts
    rect(8, 6, 2, 4, darkRed);
    rect(16, 6, 2, 2, darkRed);
    rect(24, 8, 2, 2, darkRed);
    rect(30, 10, 2, 4, darkRed);
    rect(4, 20, 2, 8, darkRed);
    rect(6, 16, 2, 4, darkRed);
    rect(8, 18, 24, 18, darkRed);
    rect(6, 24, 2, 8, darkRed);
    rect(12, 36, 14, 2, darkRed);
    rect(10, 14, 2, 4, darkRed);
    rect(12, 16, 2, 2, darkRed);
    rect(14, 10, 2, 6, darkRed);
    rect(16, 14, 12, 4, darkRed);
    rect(16, 12, 8, 2, darkRed);
    rect(18, 10, 4, 2, darkRed);
    rect(18, 8, 2, 2, darkRed);
    rect(26, 10, 2, 4, darkRed);
    rect(30, 16, 2, 2, darkRed);
    rect(32, 18, 2, 6, darkRed);
    rect(32, 26, 2, 8, darkRed);
    rect(34, 24, 2, 6, darkRed);
    //orange parts
    rect(16, 22, 2, 2, orange);
    rect(20, 20, 2, 4, orange);
    rect(12, 26, 14, 8, orange);
    rect(10, 28, 2, 4, orange);
    rect(16, 24, 12, 2, orange);
    rect(24, 18, 2, 6, orange);
    rect(26, 22, 2, 2, orange);
    rect(28, 26, 2, 4, orange);
    rect(26, 28, 2, 6, orange);
    //white parts
    rect(14, 30, 2, 2, white);
    rect(16, 30, 8, 4, white);
    rect(16, 28, 2, 2, white);
    rect(20, 26, 2, 4, white);
    rect(24, 28, 2, 2, white);
    //yellow parts
    rect(8, 12, 2, 2, yellow);
    rect(14, 18, 2, 2, yellow);
    rect(22, 16, 2, 2, yellow);
    rect(28, 8, 2, 2, yellow);
    rect(32, 16, 2, 2, yellow);
  }

  function drawGps() {
    drawBlack();
    //face parts
    rect(15, 10, 10, 24, face);
    rect(14, 11, 1, 23, face);
    rect(13, 12, 1, 22, face);
    rect(25, 10, 1, 23, face);
    rect(26, 10, 1, 22, face);
    rect(27, 10, 1, 2, face);
    rect(28, 10, 2, 4, face);
    rect(30, 11, 1, 2, face);
    rect(12, 32, 1, 2, face);
    rect(10, 30, 2, 4, face);
    rect(9, 31, 1, 2, face);
    //green parts
    rect(15, 12, 10, 20, veryLightGreen);
    //brown parts
    rect(15, 12, 1, 7, brown);
    rect(16, 13, 1, 5, brown);
    rect(17, 13, 1, 3, brown);
    rect(17, 17, 1, 1, brown);
    rect(18, 14, 1, 1, brown);
    //
    rect(15, 26, 2, 5, brown);
    rect(17, 27, 1, 3, brown);
    rect(18, 28, 1, 1, brown);
    //
    rect(22, 12, 3, 1, brown);
    rect(23, 13, 2, 1, brown);
    //
    rect(24, 15, 1, 9, brown);
    rect(23, 16, 1, 6, brown);
    rect(22, 17, 1, 4, brown);
    rect(21, 18, 1, 1, brown);
    //
    rect(23, 28, 2, 1, brown);
    rect(24, 29, 1, 3, brown);
    rect(23, 30, 2, 1, brown);
    rect(22, 31, 3, 1, brown);
    //
    rect(16, 20, 1, 1, red);
    rect(17, 21, 1, 1, red);
    rect(18, 22, 1, 1, red);
    rect(19, 23, 1, 1, red);
    rect(20, 24, 1, 1, red);
    rect(20, 20, 1, 1, red);
    rect(19, 21, 1, 1, red);
    rect(17, 23, 1, 1, red);
    rect(16, 24, 1, 1, red);
  }

  function drawOld() {
    drawBlack();
    //face parts
    rect(14, 4, 12, 10, face);
    rect(12, 8, 2, 4, face);
    rect(26, 8, 2, 4, face);
    rect(4, 20, 2, 4, face);
    rect(34, 20, 2, 4, face);
    rect(14, 34, 4, 2, face);
    rect(22, 34, 4, 2, face);
    //white parts
    rect(12, 6, 2, 2, white);
    rect(16, 6, 2, 2, white);
    rect(22, 6, 2, 2, white);
    rect(26, 6, 2, 2, white);
    rect(10, 18, 2, 4, white);
    rect(12, 14, 2, 6, white);
    rect(14, 12, 2, 6, white);
    rect(24, 12, 2, 6, white);
    rect(26, 14, 2, 6, white);
    rect(28, 18, 2, 4, white);
    rect(16, 14, 8, 10, white);
    rect(18, 24, 4, 2, white);
    //black parts
    rect(16, 8, 2, 4, black);
    rect(22, 8, 2, 4, black);
    rect(16, 16, 8, 2, black);
    //red parts
    rect(12, 12, 2, 2, red);
    rect(26, 12, 2, 2, red);
    rect(10, 14, 2, 4, red);
    rect(8, 16, 2, 16, red);
    rect(6, 18, 2, 12, red);
    rect(10, 22, 2, 8, red);
    rect(12, 20, 2, 4, red);
    rect(14, 18, 2, 16, red);
    rect(12, 30, 2, 6, red);
    rect(10, 34, 2, 2, red);
    rect(16, 24, 2, 2, red);
    rect(16, 26, 8, 8, red);
    rect(18, 34, 4, 2, red);
    rect(22, 24, 2, 2, red);
    rect(24, 18, 2, 16, red);
    rect(26, 12, 2, 2, red);
    rect(26, 20, 2, 4, red);
    rect(28, 34, 2, 2, red);
    rect(28, 22, 6, 8, red);
    rect(30, 30, 2, 2, red);
    rect(28, 14, 2, 4, red);
    rect(30, 16, 2, 6, red);
    rect(32, 18, 2, 4, red);
    rect(26, 30, 2, 6, red);
  }

  function drawText() {
    drawBlack();
  }

  function drawCache() {
    drawBlack();
    // brown parts
    rect(13, 21, 15, 1, brown);
    rect(12, 22, 17, 1, brown);
    rect(11, 23, 19, 2, brown);
    rect(11, 26, 19, 3, brown);
    rect(12, 29, 17, 3, brown);
    rect(13, 32, 15, 5, brown);
    //yellow parts
    rect(12, 25, 17, 1, lightYellow);
    rect(19, 28, 3, 1, lightYellow);
    rect(19, 29, 1, 3, lightYellow);
    rect(21, 29, 1, 3, lightYellow);
    rect(20, 31, 1, 2, lightYellow);
  }

  function drawWater () {
    //blue part
    rect(0, 0, 40, 40, water);
    //dark part
    rect(6, 6, 3, 3, darkWater);
    rect(26, 7, 3, 3, darkWater);
    rect(20, 12, 3, 3, darkWater);
    rect(0, 12, 3, 3, darkWater);
    rect(10, 22, 3, 3, darkWater);
    rect(30, 22, 3, 3, darkWater);
    rect(8, 32, 3, 3, darkWater);
    rect(28, 32, 3, 3, darkWater);
  }

  function drawBridge () {
    //wood part
    rect(0, 0, 40, 40, bridge);
    //black parts
    rect(4, 2, 2, 2, black);
    rect(36, 2, 2, 2, black);
    rect(4, 14, 2, 2, black);
    rect(36, 14, 2, 2, black);
    rect(4, 22, 2, 2, black);
    rect(36, 22, 2, 2, black);
    rect(4, 34, 2, 2, black);
    rect(36, 34, 2, 2, black);
    rect(0, 2, 2, 18, black);
    rect(2, 18, 36, 2, black);
    rect(0, 22, 2, 18, black);
    rect(2, 38, 36, 2, black);
    //blue parts
    rect(0, 0, 2, 2, water);
    rect(0, 20, 2, 2, water);
    rect(38, 18, 2, 2, water);
    rect(38, 38, 2, 2, water);
  }

  function drawRock () {
    //rock parts
    rect(16, 6, 16, 32, rock);
    rect(20, 4, 8, 2, rock);
    rect(32, 8, 4, 26, rock);
    rect(36, 16, 2, 4, rock);
    rect(14, 16, 2, 6, rock);
    rect(10, 22, 6, 16, rock);
    rect(2, 30, 8, 8, rock);
    rect(0, 26, 8, 8, rock);
    rect(2, 16, 8, 10, rock);
    rect(4, 10, 8, 6, rock);
    rect(0, 8, 2, 10, rock);
    rect(8, 6, 4, 4, rock);
    rect(4, 4, 6, 2, rock);
    rect(2, 6, 6, 2, rock);
    rect(2, 8, 2, 2, rock);
    //black part
    rect(12, 8, 4, 2, black);
    rect(12, 10, 2, 4, black);
    rect(10, 14, 2, 8, black);
    rect(8, 20, 2, 10, black);
    rect(20, 12, 2, 12, black);
    rect(22, 22, 2, 8, black);
    rect(34, 8, 2, 6, black);
    rect(36, 12, 2, 4, black);
    rect(38, 16, 2, 16, black);
    rect(36, 20, 2, 16, black);
    rect(32, 20, 4, 2, black);
    rect(32, 22, 2, 8, black);
    rect(34, 26, 2, 4, black);
    rect(26, 34, 10, 2, black);
    rect(30, 36, 10, 2, black);
    rect(0, 36, 4, 2, black);
    rect(10, 36, 4, 2, black);
    rect(2, 38, 34, 2, black);

  }

  function drawRockWall () {
    //rock part
    rect(0, 0, 10, 6, rock);
    rect(2, 6, 8, 6, rock);
    rect(0, 12, 10, 12, rock);
    rect(2, 24, 2, 6, rock);
    rect(0, 30, 2, 6, rock);
    rect(6, 30, 14, 8, rock);
    rect(4, 34, 2, 6, rock);
    rect(8, 38, 4, 2, rock);
    rect(14, 10, 10, 20, rock);
    rect(16, 4, 22, 12, rock);
    rect(24, 16, 2, 2, rock);
    rect(22, 2, 10, 2, rock);
    rect(24, 0, 4, 2, rock);
    rect(36, 0, 4, 4, rock);
    rect(26, 18, 12, 20, rock);
    //black part
    rect(8, 0, 2, 2, black);
    rect(12, 0, 10, 2, black);
    rect(28, 0, 4, 2, black);
    rect(34, 0, 2, 2, black);
    rect(10, 2, 6, 2, black);
    rect(32, 2, 4, 2, black);
    rect(32, 4, 6, 4, black);
    rect(34, 8, 2, 4, black);
    rect(10, 4, 4, 6, black);
    rect(10, 10, 2, 8, black);
    rect(6, 18, 6, 10, black);
    rect(4, 24, 2, 6, black);
    rect(2, 30, 2, 4, black);
    rect(0, 36, 2, 4, black);
    rect(14, 22, 2, 8, black);
    rect(16, 26, 2, 4, black);
    rect(18, 28, 2, 2, black);
    rect(14, 38, 2, 2, black);
    rect(22, 26, 2, 4, black);
    rect(20, 30, 4, 2, black);
    rect(18, 32, 6, 6, black);
    rect(16, 34, 2, 2, black);
    rect(20, 36, 6, 4, black);
    rect(38, 8, 2, 8, black);
    rect(32, 16, 6, 2, black);
    rect(36, 18, 2, 4, black);
    rect(38, 22, 2, 6, black);
    rect(36, 26, 2, 10, black);
    rect(34, 36, 6, 2, black);
    rect(32, 38, 6, 2, black);
  }

  function drawStream () {
    //blue part
    rect(4, 0, 32, 40, water);
    //black parts
    rect(2, 0, 2, 40, black);
    rect(38, 0, 2, 40, black);
  }

  function drawLife () {
    //red part
    rect(14, 10, 2, 2, red);
    rect(22, 10, 2, 2, red);
    rect(12, 12, 6, 2, red);
    rect(20, 12, 6, 2, red);
    rect(10, 14, 18, 6, red);
    rect(12, 20, 14, 4, red);
    rect(14, 24, 10, 4, red);
    rect(16, 28, 6, 4, red);
    rect(18, 32, 2, 4, red);
  }

  function drawBlackLife() {
    drawBlack();
    drawLife();
  }

  function drawTree() {    
    //green part
    rect(6, 10, 22, 20, greenTree);
    rect(6, 8, 2, 2, greenTree);
    rect(10, 8, 10, 2, greenTree);
    rect(10, 6, 2, 2, greenTree);
    rect(14, 6, 2, 2, greenTree);
    rect(4, 12, 2, 18, greenTree);
    rect(2, 16, 2, 4, greenTree);
    rect(2, 24, 2, 4, greenTree);
    rect(8, 30, 10, 2, greenTree);
    //dark side
    rect(16, 6, 6, 2, black);
    rect(20, 8, 8, 2, black);
    rect(22, 10, 4, 2, black);
    rect(28, 10, 2, 2, black);
    rect(24, 12, 2, 2, black);
    rect(26, 12, 4, 16, black);
    rect(22, 14, 2, 4, black);
    rect(24, 16, 2, 10, black);
    rect(20, 24, 4, 2, black);
    rect(22, 26, 2, 2, black);
    rect(16, 28, 12, 2, black);
    rect(18, 30, 4, 2, black);
    rect(30, 14, 2, 2, black);
    rect(30, 18, 2, 6, black);
    //green dot
    rect(28, 20, 2, 2, greenTree);
    //black dot
    rect(10, 10, 2, 2, black);
    rect(14, 14, 2, 2, black);
    rect(6, 18, 2, 2, black);
    rect(18, 20, 2, 2, black);
    rect(10, 22, 2, 2, black);
    rect(6, 26, 2, 2, black);
    //trunk
    rect(12, 32, 8, 2, brown);
    rect(10, 34, 12, 2, brown);
    //shadow
    rect(20, 32, 12, 2, shade);
    rect(22, 34, 4, 2, shade);
  }

  function drawOctorockBase() {
    //Circle shade at the bottom
    ellipse(7, 30, 26, 6, shade);
    //Base shape
    roundedRect(8, 5, 24, 28, 3, link);
  }

  function drawBackwardOctorock() {
    //red parts
    rect(12, 2, 16, 2, darkRed);
    rect(16, 4, 8, 8, darkRed);
    rect(10, 10, 4, 2, darkRed);
    rect(26, 10, 4, 2, darkRed);
    rect(10, 12, 6, 2, darkRed);
    rect(24, 12, 6, 2, darkRed);
    rect(10, 14, 2, 6, darkRed);
    rect(28, 14, 2, 6, darkRed);
    rect(16, 14, 2, 8, darkRed);
    rect(14, 16, 2, 8, darkRed);
    rect(22, 14, 2, 8, darkRed);
    rect(24, 16, 2, 8, darkRed);
    rect(6, 16, 2, 4, darkRed);
    rect(32, 16, 2, 4, darkRed);
    rect(8, 18, 2, 4, darkRed);
    rect(30, 18, 2, 4, darkRed);
    rect(6, 22, 4, 2, darkRed);
    rect(30, 22, 4, 2, darkRed);
    rect(4, 24, 8, 2, darkRed);
    rect(16, 24, 8, 2, darkRed);
    rect(28, 24, 8, 2, darkRed);
    rect(8, 26, 24, 2, darkRed);
    rect(6, 28, 28, 2, darkRed);
    rect(4, 30, 32, 2, darkRed);
    rect(10, 32, 20, 2, darkRed);
    rect(14, 34, 12, 2, darkRed);
    //white part
    rect(16, 12, 8, 2, white);
    rect(18, 14, 4, 8, white);
    rect(16, 22, 8, 2, white);
    rect(12, 14, 4, 2, white);
    rect(12, 16, 2, 8, white);
    rect(12, 24, 4, 2, white);
    rect(10, 20, 2, 4, white);
    rect(24, 14, 4, 2, white);
    rect(26, 16, 2, 8, white);
    rect(24, 24, 4, 2, white);
    rect(28, 20, 2, 4, white);
    //orange part
    rect(12, 26, 2, 2, orange);
    rect(26, 26, 2, 2, orange);
    rect(16, 28, 2, 2, orange);
    rect(22, 28, 2, 2, orange);
    rect(14, 32, 2, 2, orange);
    rect(24, 32, 2, 2, orange);
  }

  function drawForwardOctorock() {
    rotateBy(Math.PI);
    drawBackwardOctorock();
    rotateBy(-Math.PI);
  }

  function drawHorizontalOctorockEast() {
    rotateBy(Math.PI/2);
    drawBackwardOctorock();
    rotateBy(-Math.PI/2);
  }

  function drawHorizontalOctorockWest() {
    rotateBy(Math.PI/2);
    drawBackwardOctorock();
    rotateBy(-Math.PI/2);
  }

  function drawOctoDead() {
    for (var i=0; i<4; i++){
      //red parts
      rect(4, 2, 6, 2, darkRed);
      rect(2, 4, 10, 2, darkRed);
      rect(12, 6, 2, 2, darkRed);
      rect(2, 6, 4, 4, darkRed);
      rect(4, 10, 2, 2, darkRed);
      rect(6, 12, 2, 2, darkRed);
      rotateBy(Math.PI/2);
    }
    rotateBy(Math.PI/2);
  }

  function drawNull() {
    rect(0, 0, 40, 40, background)
  }

  function drawDeadOctorock() {
    drawOctorockBase();
    //Eyes
    circle(15, 14, 4, white);
    circle(15, 14, 2, black);
    circle(25, 14, 3, white);
    circle(25, 14, 1, black);
    //Mouth
    roundedRect(10, 23, 20, 8, 2, black);
    //Teeth
    path([ [12,23], [16,23], [14,26] ], white);
    ctx.translate(12,0);
    path([ [12,23], [16,23], [14,26] ], white);
    ctx.translate(-4, 14);
    mirrorVertically();
    path([ [12,23], [16,23], [14,26] ], white);
  }

  function drawSword(direction) {
    switch (direction) {
      case Direction.NORTH:
        rotateBy(-Math.PI/2);
        break;
      case Direction.SOUTH:
        rotateBy(Math.PI/2); 
        break;
      case Direction.WEST:
        mirrorHorizontally();
        break; 
    }
    //guard
    rect(4, 28, 4, 2, brown);
    rect(8, 26, 2, 6, brown);
    rect(10, 24, 2, 10, brown);
    //blade
    rect(12, 26, 14, 6, veryLightBlue);
    rect(26, 28, 6, 2, veryLightBlue);
  }

  function drawBomb(bigSpark) {
    //Circle shade at the bottom	
    ellipse(12, 26, 20, 8, shade);
    //Bomb body
    circle(18, 25, 9, black);
    //Highlight outline
    arc(18, 25, 7, Math.PI, Math.PI * 1.5, darkGray, true);
    //Fuse
    path([ [18,25], [27,16] ], black, true);
    //Spark
    circle(27, 16, bigSpark ? 3 : 2, orange);
    circle(27, 16, 1, yellow);
  }

  function drawUpgradeBase() {
    //Background
    rect(4, 4, 32, 32, darkBlue);
    rect(6, 6, 28, 28, lightBlue);
  }

  function drawBombUpgrade() {
    drawBlack();
    drawUpgradeBase();
    //Bomb
    ctx.save();
    ctx.translate(0,-3);
    drawBomb(true);
    ctx.restore();
  }

  function drawLinkBase() {
    //Circle shade at the bottom
    ellipse(5, 29, 22, 8, shade);
    //hat
    rect(8, 4, 16, 6, veryLightGreen);
    rect(10, 2, 12, 2, veryLightGreen);
    //vest
    rect(8, 16, 16, 14, veryLightGreen);
    rect(6, 16, 2, 6, veryLightGreen);
    rect(24, 16, 2, 6, veryLightGreen);
    //hair
    rect(8, 10, 16, 6, brown);
    rect(12, 16, 8, 2, brown);
    //belt
    rect(8, 24, 8, 2, brown);
    rect(18, 24, 6, 2, brown);
    //feet
    rect(8, 30, 6, 2, brown);
    rect(18, 30, 6, 2, brown);
    //left ear
    rect(4, 6, 2, 8, face);
    rect(6, 10, 2, 6, face);
    //right ear
    rect(26, 6, 2, 8, face);
    rect(24, 10, 2, 6, face);
  }

  function drawVerticalLink(leftArm, rightArm, leftLeg, rightLeg) {
    drawLinkBase();
    if(leftLeg) {
      rect(18, 32, 6, 2, brown);
    }
    if(rightLeg) {
      rect(8, 32, 6, 2, brown);
    }
  }

  function drawHorizontalLink(left, right) {
    //Circle shade at the bottom
    ellipse(3, 30, 22, 8, shade);
    //hat
    rect(10, 2, 8, 2, veryLightGreen);
    rect(6, 4, 10, 8, veryLightGreen);
    rect(4, 6, 2, 8, veryLightGreen);
    rect(2, 6, 2, 4, veryLightGreen);
    rect(0, 8, 2, 4, veryLightGreen);
    //face
    rect(8, 6, 2, 6, face);
    rect(10, 8, 2, 6, face);
    rect(12, 10, 12, 6, face);
    rect(14, 16, 10, 2, face);
    rect(16, 18, 8, 2, face);
    rect(24, 14, 2, 2, face);
    //hair
    rect(16, 4, 8, 6, brown);
    rect(14, 6, 2, 8, brown);
    rect(12, 8, 2, 2, brown);
    rect(24, 6, 2, 2, brown);
    rect(6, 12, 4, 4, brown);
    rect(10, 14, 2, 2, brown);
    //eye
    rect(20, 12, 2, 2, brown);
    //mouth
    rect(20, 16, 4, 2, brown);
    //vest
    rect(8, 16, 6, 16, veryLightGreen);
    rect(6, 18, 10, 12, veryLightGreen);
    rect(4, 22, 18, 8, veryLightGreen);
    rect(2, 30, 6, 2, veryLightGreen);
    rect(14, 30, 8, 2, veryLightGreen);
    rect(22, 28, 2, 2, veryLightGreen);
    rect(20, 26, 2, 4, brown);
    rect(14, 28, 6, 2, brown);
    //right hand
    rect(24, 22, 4, 4, face);
    //shield
    rect(28, 16, 4, 20, brown);
    rect(30, 18, 2, 16, face);
    
    if(left) {
      //pieds joints
      rect(8, 32, 8, 4, brown);
      rect(16, 34, 2, 2, brown);
    } else if(right) {
      //pieds disjoints
      rect(2, 28, 4, 4, brown);
      rect(4, 30, 6, 4, brown);
      rect(10, 32, 2, 2, brown);
      rect(20, 32, 6, 2, brown);
      rect(24, 30, 4, 2, brown);
    }
  }

  function drawHorizontalLinkEast(left, right) {
    drawHorizontalLink(left, right);
    drawRightSideLink();
  }

  function drawHorizontalLinkWest(left, right) {
    drawHorizontalLink(left, right);
    drawLeftSideLink();
  }


  function drawRightSideLink() {
    //right sleeve
    rect(14, 20, 10, 4, brown);
    rect(16, 24, 8, 2, brown);
    //belt
    rect(4, 24, 4, 2, brown);
    rect(8, 26, 4, 2, brown);
    rect(12, 28, 2, 2, brown);
  }
  
  function drawLeftSideLink() {
    //right sleeve
    rect(20, 20, 4, 2, brown);
    rect(22, 22, 2, 4, brown);
    //left sleeve
    rect(6, 20, 8, 6, brown);
    rect(6, 18, 4, 2, brown);
    rect(4, 20, 2, 4, brown);
    //left hand
    rect(14, 20, 4, 4, face);
    //sword
    rect(14, 18, 6, 2, brown);
    rect(16, 8, 2, 10, veryLightBlue);
  }

  function drawDeadLink(left, right) {
    drawLinkBase();
    //face
    rect(10, 10, 12, 8, white);
    rect(8, 14, 20, 2, white);
    rect(12, 18, 8, 2, white);
    //Eyes
    rect(12, 12, 1, 1, black);
    rect(13, 13, 1, 1, black);
    rect(14, 14, 1, 1, black);
    rect(12, 14, 1, 1, black);
    rect(14, 12, 1, 1, black);
    rect(17, 12, 1, 1, black);
    rect(18, 13, 1, 1, black);
    rect(19, 14, 1, 1, black);
    rect(17, 14, 1, 1, black);
    rect(19, 12, 1, 1, black);
    //arms
    rect(24, 18, 8, 4, face);
    rect(28, 16, 2, 2, face);
    rect(0, 18, 8, 4, face);
    rect(2, 16, 2, 2, face);
  }

  function drawForwardLink(left, right) {
    drawVerticalLink(left, right, right, left);	
    //Face
    rect(10, 10, 12, 8, face);
    rect(8, 14, 20, 2, face);
    rect(12, 18, 8, 2, face);
    //path([ [13,13], [15,9], [25,9], [27,13] ], face);
    //Eyes
    rect(12, 12, 2, 2, brown);
    rect(18, 12, 2, 2, brown);
    //mouth
    rect(14, 16, 4, 2, brown);
    //belt
    rect(18, 22, 2, 6, brown);
    rect(16, 22, 2, 2, brown);
    rect(16, 26, 2, 2, brown);
    //left hand
    rect(24, 22, 4, 4, face);
    rect(24, 20, 2, 2, face);
    rect(28, 24, 2, 2, face);
    //shield
    rect(0, 16, 16, 14, brown);
    rect(2, 30, 12, 2, brown);
    rect(4, 32, 8, 2, brown);
    rect(6, 18, 4, 14, face);
    rect(2, 22, 12, 4, face);
    //sword
    rect(26, 18, 2, 4, brown);
    rect(28, 18, 2, 6, brown);
    rect(24, 18, 2, 2, brown);
    rect(26, 8, 2, 10, veryLightBlue);
  }

  function drawBackwardLink(left, right) {
    drawVerticalLink(left, right, right, left);	
    //belt
    rect(16, 24, 2, 2, brown);
    //left hand
    rect(2, 22, 6, 4, face);
    rect(4, 20, 2, 2, face);
    //sword
    rect(4, 18, 2, 2, brown);
    rect(2, 18, 2, 4, brown);
    rect(4, 14, 2, 4, veryLightBlue);
    //shield
    rect(26, 16, 6, 6, brown);
    rect(24, 22, 8, 8, brown);
    rect(18, 30, 12, 2, brown);
    rect(20, 32, 8, 2, brown);
  }

  function drawExplosionArm(stage) {
    var inner = stage == 0 ? orange : yellow;
    var outer = stage == 0 ? darkRed : orange;
    if(stage != 0) {
      path([ [8,40], [12,31], [9,20], [13,10], [8,0], [28,0], [31,10], [27,20], [32,29], [28,40] ], darkRed);    
    }
    path([ [11,40], [14,29], [11,20], [15,11], [11,0], [25,0], [27,11], [24,21], [28,30], [25,40] ], outer);
    path([ [14,40], [18,30], [13,21], [17,10], [14,0], [22,0], [25,9], [21,21], [24,30], [22,40] ], inner);
    if(stage == 2) {
      path([ [16,40], [19,30], [17,21], [19,10], [16,0], [20,0], [22,9], [20,21], [21,30], [20,40] ], lightYellow);
    }
  }

  function drawExplosionCenter(stage) {
    var inner = stage == 0 ? orange : yellow;
    var outer = stage == 0 ? darkRed : orange;
    if(stage != 0) {
      path([ [8,40], [12,31], [9,20], [13,10], [8,0], [28,0], [31,10], [27,20], [32,29], [28,40] ], darkRed);    
      rotateBy(Math.PI/2);
      path([ [8,40], [12,31], [9,20], [13,10], [8,0], [28,0], [31,10], [27,20], [32,29], [28,40] ], darkRed);    
      rotateBy(-Math.PI/2);
    }
    path([ [11,40], [14,29], [11,20], [15,11], [11,0], [25,0], [27,11], [24,21], [28,30], [25,40] ], outer);
    rotateBy(Math.PI/2);
    path([ [11,40], [14,29], [11,20], [15,11], [11,0], [25,0], [27,11], [24,21], [28,30], [25,40] ], outer);
    rotateBy(-Math.PI/2);

    path([ [14,40], [18,30], [13,21], [17,10], [14,0], [22,0], [25,9], [21,21], [24,30], [22,40] ], inner);
    rotateBy(Math.PI/2);
    path([ [14,40], [18,30], [13,21], [17,10], [14,0], [22,0], [25,9], [21,21], [24,30], [22,40] ], inner);
    rotateBy(-Math.PI/2);

    if(stage == 2) {
      path([ [16,40], [19,30], [17,21], [19,10], [16,0], [20,0], [22,9], [20,21], [21,30], [20,40] ], lightYellow);
      rotateBy(Math.PI/2);
      path([ [16,40], [19,30], [17,21], [19,10], [16,0], [20,0], [22,9], [20,21], [21,30], [20,40] ], lightYellow);
    }
  }

  function drawExplosionEnd(stage) {
    var inner = stage == 0 ? orange : yellow;
    var outer = stage == 0 ? darkRed : orange;
    if(stage != 0) {
      path([ [8,40], [12,32], [9,18], [21,7], [27,19], [32,31], [28,40] ], darkRed);    
    }
    path([ [11,40], [14,29], [11,20], [21,10], [24,21], [28,30], [25,40] ], outer);
    path([ [14,40], [18,31], [13,22], [21,13], [21,22], [24,31], [22,40] ], inner);
    if(stage == 2) {
      path([ [16,40], [19,31], [17,23], [21,15], [20,23], [21,31], [20,40] ], lightYellow);
    }
  }

  function drawKey(x, y, label) {
    ctx.save();
    ctx.translate(x*40, y*40);

    // Create Linear Gradients
    var lingrad = ctx.createLinearGradient(0,0,38,0);
    lingrad.addColorStop(0, lightGray);
    lingrad.addColorStop(0.5, veryLightGray);
    lingrad.addColorStop(1, lightGray);

    //Background
    roundedRect(2,2,36,36,4,mediumGray);
    roundedRect(6,6,28,28,4,lingrad);

    //Draw text
    ctx.textAlign = 'center';
    ctx.font = 'bold 10pt Arial';
    ctx.fillStyle = darkGray;
    ctx.fillText(label, 19, 25);

    ctx.restore();
  }

  /************************/
  /*        Helper        */
  /************************/
  function getOffsetForDirection(direction) {
    var ret;
    switch(direction) {
      case Direction.NORTH: ret = [ 0, -1]; break;
      case Direction.EAST:  ret = [ 1,  0]; break;
      case Direction.SOUTH: ret = [ 0,  1]; break;
      case Direction.WEST:  ret = [-1,  0]; break;
    }
    return ret;
  }

  function rotateBy(angle) {
    ctx.translate(20,20);
    ctx.rotate(angle);
    ctx.translate(-20,-20);
  }

  function mirrorHorizontally() {
    ctx.translate(20,20);
    ctx.scale(-1,1);
    ctx.translate(-20,-20);
  }

  function mirrorVertically() {
    ctx.translate(20,20);
    ctx.scale(1,-1);
    ctx.translate(-20,-20);
  }

  function isNearCorner(i, j) {
    return (i==0 && j==0) || (i==0 && j==1) || (i==1 && j==0) //top left
      || (i==0 && j==height-1) || (i==0 && j==height-2) || (i==1 && j==height-1) //bottom left
      || (i==width-1 && j==0) || (i==width-1 && j==1) || (i==width-2 && j==0) //top right
      || (i==width-1 && j==height-1) || (i==width-1 && j==height-2) || (i==width-2 && j==height-1); //bottom right
  }

  /************************/
  /*      Game logic      */
  /************************/
  function triggerExplosion(bomb) {
    var x = bomb.x;
    var y = bomb.y;
    var explosionSize = bomb.player.explosionSize;
 
    //Active branches of the explosion
    var active = [ true, true, true, true ];

    //Other bombs to set off after all sprites of this explosion have been added
    var toExplode = new Array();


    for(var i=1; i<=explosionSize; i++) {
      for(var j=0; j<4; j++) {
        if(active[j]) {
          var move = getOffsetForDirection(j);
          var coordX = x+(move[0]*i);
          var coordY = y+(move[1]*i);
          //Check if coordinates are within bounds
          if(coordX >= 0 && coordX < width
               && coordY >= 0 && coordY < height) {
            //Check if we hit something
            if(field[coordX][coordY]!=null) {
              if(field[coordX][coordY].draw == drawHiddenGrave) {
                //If we hit a hidden grave destroy it
                field[coordX][coordY] = new Sprite(coordX, coordY, drawGrave);
                field[coordX][coordY].draw = drawGrave;
                sprites.push(new DisappearingSprite(coordX, coordY, drawFallingWall, true));
                //mise a jour JSON
                levels["maps"][mapPiece].map[coordY] = levels["maps"][mapPiece].map[coordY].substr(0, coordX)+"G"+levels["maps"][mapPiece].map[coordY].substr(coordX+1, width-coordX);
                active[j] = false;
              } else if(field[coordX][coordY].draw == drawTree ||
                        field[coordX][coordY].draw == drawBush ||
                        field[coordX][coordY].draw == drawGrave ||
                        field[coordX][coordY].draw == drawWater ||
                        field[coordX][coordY].draw == drawBridge ||
                        field[coordX][coordY].draw == drawRock ||
                        field[coordX][coordY].draw == drawRockWall ||
                        field[coordX][coordY].draw == drawStream ||
                        field[coordX][coordY].draw == drawLife) {
                //If we hit a stone stop this branch of the explosion
                active[j] = false;
              } else if(field[coordX][coordY] instanceof SpriteField) {
                var sprite = field[coordX][coordY].sprite;
                if(sprite instanceof Bomb) {
                  //If we hit a bomb explode it
                  toExplode.push(sprite);
                }/* else if(sprite instanceof Enemy) { check if this is really necessary
                  //If we hit an enemy burn him
                  sprite.die();
                }*/
              }  
            }
            //Add explosion sprite if we are still active
            if(active[j]) {
              sprites.push(new Explosion(coordX, coordY, i == explosionSize ? drawExplosionEnd : drawExplosionArm, j));
            }
          }
        }
      }
    }

    for(var i=0; i<toExplode.length; i++) {
      toExplode[i].explode();
    }

    //Add explosion center
    sprites.push(new Explosion(x, y, drawExplosionCenter, Direction.NORTH));
  }


  function getGps() {
    //check diamonds
    if (nbGems<200) {
      showText(["La carte coute 200 diamants.", "Tu n'en as que "+nbGems]);
    } else {
      showText(["La carte t'indique maintenant", "la position du tresor que tu cherches"]);
      gpsEnabled = true;
      nbGems = nbGems-200;
      rect(195, 545, 40, 23, darkGreen);
      ctx.font = '15pt Courier';
      ctx.textAlign = 'left';
      ctx.fillStyle = white;
      tot = '00'+nbGems;
      ctx.fillText(tot.slice(-3), 200, 560);
      rect(628, 577, 3, 3, greenTree);
    }
  }

  function handleUpgrade(sprite, player) {
    if (sprite.draw == drawGem) {
      nbGems++;
    } else if (sprite.draw == drawGems30) {
      nbGems+=30;
    } else if (sprite.draw == drawGems100) {
      nbGems+=100;
    }

    if(sprite.draw == drawBombUpgrade) {
      //Allow bomb capacity
      bombEnabled = true;
      ctx.save();
      ctx.translate(81, 533);
      drawBomb();
      ctx.restore();
    } else if(sprite.draw == drawGem ||
              sprite.draw == drawGems30 ||
              sprite.draw == drawGems100) {
      //maj display
      rect(195, 545, 40, 23, darkGreen);
      ctx.font = '15pt Courier';
      ctx.textAlign = 'left';
      ctx.fillStyle = white;
      tot = '00'+nbGems;
      ctx.fillText(tot.slice(-3), 200, 560);
    } else if(sprite.draw == drawGps) {
      //check diamonds
      if (nbGems<200) {
        showText(["Le GPS coute 200 diamants.", "Tu n'en as que "+nbGems]);
      } else {
        showText(["Le GPS indique maintenant sur ta carte", "la position de la cache que tu cherches"]);
        gpsEnabled = true;
        nbGems = nbGems-200;
        rect(195, 545, 40, 23, darkGreen);
        ctx.font = '15pt Courier';
        ctx.textAlign = 'left';
        ctx.fillStyle = white;
        tot = '00'+nbGems;
        ctx.fillText(tot.slice(-3), 200, 560);
        rect(628, 577, 3, 3, greenTree);
      }
    }
  }

  function plantBomb(player) {
    //If there is nothing at the field and we still have bombs left plant a bomb
    if((field[player.x][player.y] == null || field[player.x][player.y] instanceof PlayerField) && player.plantedBombs < player.bombs) {
      var bombSprite = new Bomb(player.x, player.y, player);
      sprites.push(bombSprite);
      var bombField = new SpriteField(player.x, player.y, bombSprite) ;
      bombSprite.field = bombField;
      field[player.x][player.y] = bombField;
      player.plantedBombs++;
    }
  }

  function launchSword(player) {
    if (nbSword == 0) {
      nbSword++;
      var swordSprite = new Sword(player.x, player.y, player);
      moveSprite(swordSprite);
      sprites.push(swordSprite);
    }
  }

  function triggerBombs(player) {
    if(player.timer) {
      //If we have the timer upgrade explode all bombs
      for(var i=0; i<sprites.length; i++) {
        if(sprites[i] instanceof Bomb && sprites[i].player == player) {
          sprites[i].explode();
        }
      }
    }
  }

  function moveSprite(sprite) {
    //Schedule a new move if we are not moving already
    var move = getOffsetForDirection(sprite.direction);
    var coordX = sprite.x+move[0];
    var coordY = sprite.y+move[1];

    if(coordX >= 0 && coordX<width
         && coordY >= 0 && coordY<height
         && !sprite.moving) {
      if(field[coordX][coordY] == null) {
        //Nothing there 
        sprite.move();
        //field[coordX][coordY] = new SpriteField(coordX,coordY);
      } else if(!(sprite instanceof Bomb) && field[coordX][coordY] instanceof PlayerField) { //or player and we are not a bomb
        sprite.move();
        return true;
      } else if (field[coordX][coordY] == null ||
                 (field[coordX][coordY].draw != drawTree &&
                  field[coordX][coordY].draw != drawGrave &&
                  field[coordX][coordY].draw != drawBridge &&
                  field[coordX][coordY].draw != drawStream &&
                  field[coordX][coordY].draw != drawRock &&
                  field[coordX][coordY].draw != drawRockWall &&
                  field[coordX][coordY].draw != drawBush &&
                  field[coordX][coordY].draw != drawHiddenGrave &&
                  field[coordX][coordY].draw != drawWater)
             && !(field[coordX][coordY] instanceof SpriteField)) { //no other enemy or bomb
        sprite.move();
      } else if (sprite instanceof Sword) {
        sprite.explode();
      }
    } else if (sprite instanceof Sword) {
      sprite.explode();
    }
    return false;
  }

  //Check if it's a legal move
  function movePlayer(player) {
    var move = getOffsetForDirection(player.direction);
    var coordX = player.x+move[0];
    var coordY = player.y+move[1];
    var shouldMove = false;
    var changeMap = false;

    if(coordX >= 0 && coordX<width
         && coordY >= 0 && coordY<height) {
      if(field[coordX][coordY]==null || 
         field[coordX][coordY].draw == drawBridge || 
         field[coordX][coordY].draw == drawGrave || 
         field[coordX][coordY].draw == drawStream ||
         field[coordX][coordY].draw == drawBlack ||
         field[coordX][coordY].draw == drawGps ||
         field[coordX][coordY].draw == drawCache ||
         field[coordX][coordY].draw == drawBombUpgrade ||
         field[coordX][coordY].draw == drawGem ||
         field[coordX][coordY].draw == drawGems30 ||
         field[coordX][coordY].draw == drawGems100 ||
         field[coordX][coordY].draw == drawText) { //Check if there is nothing in the way
        shouldMove = true;
      } else if(player.noCollision && field[coordX][coordY].draw != drawRock) { // or noCollision mode and no stone
        shouldMove = true;
        //Kicked a bomb
        if(player.kick && field[coordX][coordY].sprite instanceof Bomb && field[coordX][coordY].sprite.player == player) {
          var bomb = field[coordX][coordY].sprite;
          bomb.direction = player.direction;
          moveSprite(bomb);
        }
      } else if(field[coordX][coordY] instanceof SpriteField) {
        if(field[coordX][coordY].sprite instanceof Bomb && player.kick && field[coordX][coordY].sprite.player == player) { // or kick a bomb
          var bomb = field[coordX][coordY].sprite;
          bomb.direction = player.direction;
          if(moveSprite(bomb)) {
            //Only move if we successfully moved the bomb
            shouldMove = true;       
          }
        } else if(field[coordX][coordY].sprite instanceof Enemy) { // or enemy
          shouldMove = true;
        }
      }
    } else {
      if (coordX == -1) {
        coordX = 16;
        XtoMap = 15; 
        YtoMap = coordY;
        mapPiece--;
      } else if (coordX == 16) {
        coordX = -1;
        XtoMap = 0;
        YtoMap = coordY;
        mapPiece++;
      } else if (coordY == -1) {
        coordY = 11;
        XtoMap = coordX;
        YtoMap = 10;
        mapPiece = mapPiece-5;
      } else if (coordY == 11) {
        coordY = -1;
        XtoMap = coordX;
        YtoMap = 0;
        mapPiece = mapPiece+5;
      }
      player.x = coordX;
      player.y = coordY;
      shouldMove = true;
      changeMap=true;
    }

    if(shouldMove) {
      //If the old one was blocked unblock it
      if (player.x >= 0 && player.x <= 15 && player.y >= 0 && player.y <= 10) {
        if(field[player.x][player.y] instanceof PlayerField) {
          field[player.x][player.y] = null;
        }
      }
      player.move();
      //If there is nothing there block the field we are moving to
      if (coordX >= 0 && coordX <= 15 && coordY >= 0 && coordY <= 10) {
        if(field[coordX][coordY] == null) {
          field[coordX][coordY] = new PlayerField(coordX, coordY);
        }
      }
      if (field[coordX] != null && field[coordX][coordY] != null && field[coordX][coordY].draw == drawGrave) {
        if (inGrave) {
          XtoMap=levels["maps"][mapPiece].backTo[1];
          YtoMap=levels["maps"][mapPiece].backTo[2]-1;
          mapPiece=levels["maps"][mapPiece].backTo[0];
          changeMap=true;
          inGrave=false;
          player.x = XtoMap;
          player.y = YtoMap;
          clearField(player.x, player.y);
        } else {
          mapPiece=levels["maps"][mapPiece].grave;
          changeMap=true;
          XtoMap=7;
          YtoMap=10;
          inGrave=true;
          player.x = XtoMap;
          player.y = YtoMap;
          clearField(player.x, player.y);
        }
      }
      if (changeMap) {
        initBombJs();
      }
      //GPS
      if (field[coordX] != null && field[coordX][coordY] != null && field[coordX][coordY].draw == drawGps) {
        getGps();
        if (gpsEnabled) {
          if (inGrave) {
            field[coordX][coordY].draw = drawBlack;
            ground = "N";
          } else {
            field[coordX][coordY] = null;
            ground = "S";
          }
          levels["maps"][mapPiece].map[coordY] = levels["maps"][mapPiece].map[coordY].substr(0, coordX)+ground+levels["maps"][mapPiece].map[coordY].substr(coordX+1, width-coordX);
        }
      }
      //talk
      if (field[coordX] != null && field[coordX][coordY] != null && field[coordX][coordY].draw == drawText) {
        showText(levels["maps"][mapPiece].speech);
      }
      //Bomb upgrade
      if (field[coordX] != null && field[coordX][coordY] != null && field[coordX][coordY].draw == drawBombUpgrade) {
        bombEnabled = true;
        ctx.save();
        ctx.translate(81, 533);
        drawBomb();
        ctx.restore();
        if (inGrave) {
          field[coordX][coordY].draw = drawBlack;
          ground = "N";
        } else {
          field[coordX][coordY] = null;
          ground = "S";
        }
        levels["maps"][mapPiece].map[coordY] = levels["maps"][mapPiece].map[coordY].substr(0, coordX)+ground+levels["maps"][mapPiece].map[coordY].substr(coordX+1, width-coordX);
      }
      if (field[coordX] != null && field[coordX][coordY] != null && 
          (field[coordX][coordY].draw == drawGem || field[coordX][coordY].draw == drawGems30 || field[coordX][coordY].draw == drawGems100)) {
        if (field[coordX][coordY].draw == drawGem) {
          nbGems++;
        } else if (field[coordX][coordY].draw == drawGems30) {
          nbGems = nbGems+30;
        } else if (field[coordX][coordY].draw == drawGems100) {
          nbGems = nbGems+100
        }
        //maj display
        rect(195, 545, 40, 23, darkGreen);
        ctx.font = '15pt Courier';
        ctx.textAlign = 'left';
        ctx.fillStyle = white;
        tot = '00'+nbGems;
        ctx.fillText(tot.slice(-3), 200, 560);
        if (inGrave) {
          field[coordX][coordY].draw = drawBlack;
          ground = "N";
        } else {
          field[coordX][coordY] = null;
          ground = "S";
        }
        levels["maps"][mapPiece].map[coordY] = levels["maps"][mapPiece].map[coordY].substr(0, coordX)+ground+levels["maps"][mapPiece].map[coordY].substr(coordX+1, width-coordX);
      }
      //Cache
      if (field[coordX] != null && field[coordX][coordY] != null && field[coordX][coordY].draw == drawCache) {
        ctx.font = 'bold 60pt Arial Black';
        ctx.textAlign = 'center';
        ctx.fillStyle = darkBlue;
        ctx.fillText('YOU WIN', 340, 380);
        haveWon = true;
      }
      
    }  
  }

  /************************/
  /*    Initialization    */
  /************************/
  function initBombJs() {
    //reinit
    ctx.clearRect(0, 0, 660, 630);

    if (sprites!=null){
      if (inGrave) {
        color=black;
      } else {
        color=background;
      }
      for (var i=0; i<sprites.length; i++){
        xSprite=20+40*sprites[i].x;
        ySprite=40+40*sprites[i].y;
        rect(20+40*sprites[i].x, 40+40*sprites[i].y, 40, 40, color);
      }
    }
    if (enemies!=null){
      if (inGrave) {
        color=black;
      } else {
        color=background;
      }
      for (var i=0; i<enemies.length; i++){
        xSprite=20+40*enemies[i].x;
        ySprite=40+40*enemies[i].y;

        field[enemies[i].x][enemies[i].y].draw = drawSand;
        field[enemies[i].x][enemies[i].y].update();
      }
    }
    //Initialize globals
    sprites = new Array();
    enemies = new Array();
    dead = null;
    nbSword = 0;
    shown=false;

    if (XtoMap==null) {
      XtoMap=7;
    }
    if (YtoMap==null) {
      YtoMap=4;
    }    

    //Clear canvas
    rect(0, 0, 700, 540, darkGreen);
    rect(20, 40, 660, 440, background);

    //Set up field
    for (var j=0; j<levels["maps"][mapPiece].map.length; j++) {
      for (var i=0; i<levels["maps"][mapPiece].map[j].length; i++) {
        field[i] = new Array(levels["maps"][mapPiece].map[0].length);
      }
    }

    //RAZ
    for (var i=0; i<field.length; i++) {
      for (var j=0; j<field[i].length; j++) {
        clear();
      }
    }

    for (var j=0; j<levels["maps"][mapPiece].map.length; j++) {
      for (var i=0; i<levels["maps"][mapPiece].map[j].length; i++) {
        zone=levels["maps"][mapPiece].map[j].substr(i, 1);
          switch (zone) {
            case 'A':
              field[i][j] = new Sprite(i, j, drawTree);
              break;
            case 'B':
              field[i][j] = new Sprite(i, j, drawBush);
              break;
            case 'C':
              field[i][j] = new Sprite(i, j, drawCache);
              break;
            case 'D':
              field[i][j] = new Sprite(i, j, drawBombUpgrade);
              break;
            case 'E':
              field[i][j] = new Sprite(i, j, drawWater);
              break;
            case 'F':
              field[i][j] = new Sprite(i, j, drawFire);
              break;
            case 'G':
              field[i][j] = new Sprite(i, j, drawGrave);
              break;
            case 'H':
              field[i][j] = new Sprite(i, j, drawHiddenGrave);
              break;
            case 'I':
              field[i][j] = new Sprite(i, j, drawGps);
//              upgrade = new Upgrade(i, j, drawGps);
//              sprites.push(upgrade);
              break;
            case 'J':
              field[i][j] = new Sprite(i, j, drawGems30);
              /*upgrade = new Upgrade(i, j, drawGems30);
              sprites.push(upgrade);*/
              break;
            case 'K':
              field[i][j] = new Sprite(i, j, drawGems100);
              /*upgrade = new Upgrade(i, j, drawGems100);
              sprites.push(upgrade);*/
              break;
            case 'L':
              field[i][j] = new Sprite(i, j, drawLife);
              break;
            case 'M':
              field[i][j] = new Sprite(i, j, drawBlackLife);
              break;
            case 'N':
              field[i][j] = new Sprite(i, j, drawBlack);
              break;
            case 'O':
              field[i][j] = new Sprite(i, j, drawOld);
              break;
            case 'P':
              field[i][j] = new Sprite(i, j, drawBridge);
              break;
            case 'Q':
              field[i][j] = new Sprite(i, j, drawGem);
              /*upgrade = new Upgrade(i, j, drawGem);
              sprites.push(upgrade);*/
              break;  
            case 'R':
              field[i][j] = new Sprite(i, j, drawRock);
              break;
            case 'S':
              field[i][j] = null;
              break;
            case 'T':
              field[i][j] = new Sprite(i, j, drawText);
              /*upgrade = new Upgrade(i, j, drawText);
              sprites.push(upgrade);*/
              break;
            case 'U':
              field[i][j] = new Sprite(i, j, drawStream);
              break;
            case 'W':
              field[i][j] = new Sprite(i, j, drawRockWall);
              break;
            default:
              field[i][j] = null;
          }

          //Draw the field if it's not null
          if(field[i][j]!=null) {
            ctx.save();
            ctx.translate(20 + i*40, 40 + j*40);
            field[i][j].update();
            ctx.restore();
          }
      }
    }

    //interface
    rect(20, 525, 40, 55, lightGray);
    rect(80, 525, 40, 55, lightGray);
    path( [ [20, 525], [60, 525], [60, 580], [20, 580], [20, 525] ] , white, true, 2);
    path( [ [80, 525], [120, 525], [120, 580], [80, 580], [80, 525] ] , white, true, 2);
    // B
    ctx.font = '23pt Courier New';
    ctx.textAlign = 'left';
    ctx.fillStyle = white;
    ctx.fillText('B', 31, 610);
    // A
    ctx.font = '23pt Courier New';
    ctx.textAlign = 'left';
    ctx.fillStyle = white;
    ctx.fillText('A', 91, 610);
    //draw sword
    ctx.save();
    ctx.translate(11, 533);
    drawSword(Direction.NORTH);
    ctx.restore();
    //draw bomb if enabled
    if (bombEnabled) {
      ctx.save();
      ctx.translate(81, 533);
      drawBomb();
      ctx.restore();
    }
    // gems
    ctx.save();
    ctx.translate(161, 533);
    sauvGrave = inGrave;
    inGrave = false;
    drawGem();
    inGrave = sauvGrave;
    ctx.restore();
    rect(195, 545, 40, 23, darkGreen);
    ctx.font = '15pt Courier';
    ctx.textAlign = 'left';
    ctx.fillStyle = white;
    tot = '00'+nbGems;
    ctx.fillText(tot.slice(-3), 200, 560);
    // life level
    // maps
    ctx.font = '12pt Courier New';
    ctx.textAlign = 'left';
    ctx.fillStyle = white;
    ctx.fillText('Carte', 570, 530);
    rect(570, 535, 80, 50, lightGray);
    path( [ [570, 535], [650, 535], [650, 585], [570, 585], [570, 535] ] , white, true, 2);
    if (mapPiece<25){
      a=mapPiece % 5;
      b=Math.floor(mapPiece/5);

      path( [ [570+16*a,535+10*b], [570+16*(a+1),535+10*b], [570+16*(a+1),535+10*(b+1)], [570+16*(a),535+10*(b+1)], [570+16*a,535+10*b] ] , red, true, 2);
    }
    if (gpsEnabled) {
      rect(628, 577, 3, 3, greenTree);
    }

    if(gameMode != Mode.MULTI_VERSUS) {
      var ghosts = 0;
      //Spawn 13 enemies
      while(enemies.length < levels["maps"][mapPiece].foes) {
        var i = parseInt(Math.random() * width);
        var j = parseInt(Math.random() * height);
        if(field[i][j] != null || isNearCorner(i, j) || 
           (i<=XtoMap+2 && i>=XtoMap-2 && j<=YtoMap+2 && j>=YtoMap-2)) {
          continue;
        }
        if(Math.random() < 0.3) {
          var octorock = new Octorock(i, j);
          enemies.push(octorock);
          var octorockField = new SpriteField(octorock.x, octorock.y, octorock);
          field[i][j] = octorockField;
          octorock.field = octorockField;
        }
      }
    }

    //Draw HUD
    /*ctx.save();
    ctx.translate(20, 0);
    ctx.scale(0.7, 0.7);
    drawBomb(true);
    ctx.restore();

    ctx.save();
    ctx.translate(120, 5);
    ctx.scale(0.5, 0.5);
    drawExplosionCenter(2);
    ctx.restore();*/

    //Set up player
    players = new Array();
    var player = new Link(XtoMap, YtoMap);
    //field[XtoMap][YtoMap] = new PlayerField(XtoMap, YtoMap);
    player.bombs = 1;
    player.plantedBombs = 0;
    player.explosionSize = 1;   
    players.push(player);

    //Set up key listener
    keyListener = function(e) {
      var pressed = e.type == 'keydown';
      if (!haveWon) {
        switch(e.keyCode) {
          case 38: //up arrow
            keys[Direction.NORTH] = pressed ? e.timeStamp : 0;
            e.preventDefault(); 
            return false;
          case 39: //right arrow
            keys[Direction.EAST] = pressed ? e.timeStamp : 0;
            e.preventDefault(); 
            return false;
          case 40: //down arrow
            keys[Direction.SOUTH] = pressed ? e.timeStamp : 0;
            e.preventDefault(); 
            return false;
          case 37: //left arrow
            keys[Direction.WEST] = pressed ? e.timeStamp : 0;
            e.preventDefault(); 
            return false;
          case 66: //B
            if (!inGrave && !(field[player.x]==null || field[player.x][player.y]==null || field[player.x][player.y].draw==drawBridge)) {
              launchSword(players[0]);
            }
            e.preventDefault(); 
            return false;
          case 65: //A
            if(players[0]) {
              if (bombEnabled && !inGrave) {
                plantBomb(players[0]);
              }
            }
            e.preventDefault(); 
            return false;
        }
      }
    };
    d.onkeyup = keyListener;
    d.onkeydown = keyListener;

    //Set up game loop
    requestAnimationFrame(step);
  }

  function initMenu() {
    if(controlsDisplayed) {
      return;
    }

    ctx.save();

    //Clear canvas
    if(selectorSword != null) {
      rect(20, 40, 760, 440, background);
    }

    //Draw rounded corners
    drawCorner(20, 40, 0);
    drawCorner(620, 40, Math.PI*0.5);
    drawCorner(620, 440, Math.PI);
    drawCorner(20, 440, Math.PI*1.5);

    //Draw text
    ctx.textAlign = 'left';
    ctx.font = 'bold 12pt Arial Black';
    ctx.fillStyle = pageBackground;

    ctx.fillText('Jouer', 8*40, 5*40-13);
    ctx.fillText('Controles', 8*40, 6*40-13);

    ctx.fillText('Appuies sur ESPACE pour faire ton choix', 4.5*40, 11*40-13);

    //Draw selector bomb
    if(selectorSword != null) {
      ctx.translate(selectorSword.x*40, selectorSword.y*40-10);
      drawSword();
      ctx.restore();
      requestAnimationFrame(initMenu);
    }
  }

  function initControls() {
    ctx.save();

    //Clear canvas
    rect(20, 40, 760, 440, background);

    //Draw rounded corners
    drawCorner(20, 40, 0);
    drawCorner(620, 40, Math.PI*0.5);
    drawCorner(620, 440, Math.PI);
    drawCorner(20, 440, Math.PI*1.5);

    //Draw text
    ctx.textAlign = 'left';
    ctx.font = 'bold 12pt Arial Black';
    ctx.fillStyle = pageBackground;

    ctx.fillText('Déplacer Link', 1*40, 3*40-13);
    
    //Draw labels
    ctx.textAlign = 'center';
    ctx.font = '10pt Arial';

    ctx.fillText('Mouvements', 2*40 + 20, 7*40-20);

    ctx.textAlign = 'left';
    ctx.fillText('Lancer l épée', 6*40 + 5, 5*40-16);
    ctx.fillText('Poser une bombe (quand tu pourras)', 6*40 + 5, 6*40-16);

    drawKey(5,4,'B');
    drawKey(5,5,'A');

    drawKey(2,4,'↑');
    drawKey(1,5,'←');
    drawKey(2,5,'↓');
    drawKey(3,5,'→');

    //Draw labels
    ctx.textAlign = 'center';
    ctx.font = 'bold 14pt Arial Black';
    ctx.fillText('Appuie sur ESPACE pour revenir au menu', 350, 450);
  }

  function selectEntry() {
    if(controlsDisplayed) {
      controlsDisplayed = false;
      initMenu();
      return;
    }

    ctx.save();
    ctx.translate(selectorSword.x*40, selectorSword.y*40);
    //drawExplosionCenter(2);
    ctx.restore();

    if(selectorSword.y == 5) {
      controlsDisplayed = true;
        initControls();
    } else {
      if(selectorSword.y == 4) {
        gameMode = Mode.SINGLE_PLAYER;
      }
      w.removeEventListener('keyup', keyListener);
      selectorSword = null;
      w.setTimeout(initBombJs, 100);
    }
  }


  w.onload = function() {
    //Get context
    ctx = d.getElementById('c').getContext('2d');

    //Set up key listener
    keyListener = function(e) {
      switch(e.keyCode) {
        case 38: //up arrow
        case 87: //w
          selectorSword.y--;
          if(selectorSword.y < 4) { selectorSword.y = 5; }
          e.preventDefault(); 
          return false;
        case 40: //down arrow
        case 83: //s
          selectorSword.y++;
          if(selectorSword.y > 5) { selectorSword.y = 4; }
          e.preventDefault(); 
          return false;
        case 32: //space
          selectEntry();
          e.preventDefault(); 
          return false;
      }
    };
    d.onkeydown = keyListener;

    selectorSword = new Sprite(7, 4);
    initMenu();
  };
})();
