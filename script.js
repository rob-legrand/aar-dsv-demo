/*jslint white: true, browser: true, nomen: true, regexp: true, bitwise: true, newcap: true, indent: 3 */

var runDemo = function () {

   var getTrueOffsetLeft = function (ele) {
      var n = 0;
      while (ele !== null) {
         if (ele.offsetLeft !== null) {
            n += ele.offsetLeft;
         }
         ele = ele.offsetParent;
      }
      return n;
   };

   var getTrueOffsetTop = function (ele) {
      var n = 0;
      while (ele !== null) {
         if (ele.offsetTop !== null) {
            n += ele.offsetTop;
         }
         ele = ele.offsetParent;
      }
      return n;
   };

   var x, y;

   var votespaceCanvas = document.getElementById('votespace');
   if (!votespaceCanvas.getContext) {
      window.alert('Your browser does not support the canvas element correctly.\nPlease use a recent version of a browser such as Opera, Chrome or Firefox.');
      return;
   }

   var width = votespaceCanvas.width;
   var height = votespaceCanvas.height;
   var randomizePoints;
   var redrawSpace;

   var selectNElement = document.getElementById('select-n');
   var numVoters = parseInt(selectNElement.options[selectNElement.selectedIndex].value, 10);
   selectNElement.onchange = function () {
      numVoters = parseInt(selectNElement.options[selectNElement.selectedIndex].value, 10);
      randomizePoints();
      redrawSpace();
   };

   randomizePoints = function () {
      var i;
      x = [];
      y = [];
      for (i = 0; i < numVoters; ++i) {
         x[i] = (Math.random() - 0.5) * width;
         y[i] = (Math.random() - 0.5) * height;
      }
   };
   randomizePoints();

   var votespaceContext = votespaceCanvas.getContext('2d');
   votespaceContext.translate(width / 2, height / 2);

   var displayAarDsvCheckbox = document.getElementById('display-aar-dsv');
   var displayAverageCheckbox = document.getElementById('display-average');
   var displayFermatWeberCheckbox = document.getElementById('display-fermat-weber');
   var displayPerDimMedianCheckbox = document.getElementById('display-per-dim-median');
   var displayPerDimMidrangeCheckbox = document.getElementById('display-per-dim-midrange');

   redrawSpace = function (pointBeingDragged) {
      var i;
      votespaceContext.clearRect(-width / 2, -height / 2, width, height);

      // draw vote points
      for (i = 0; i < numVoters; ++i) {
         votespaceContext.beginPath();
         votespaceContext.fillStyle = pointBeingDragged === i ? '#9966cc' : '#6699cc';
         votespaceContext.moveTo(x[i], -y[i]);
         votespaceContext.arc(x[i], -y[i], 6, 0, Math.PI * 2, true);
         votespaceContext.fill();
      }

      var sortX, sortY;
      var avgX, avgY;
      var dsvX, dsvY;
      var medX, medY;
      var midX, midY;
      var ferX, ferY;

      if (displayAverageCheckbox.checked) {
         // find Average outcome of vote points
         avgX = 0;
         avgY = 0;
         for (i = 0; i < numVoters; ++i) {
            avgX += x[i];
            avgY += y[i];
         }
         avgX /= numVoters;
         avgY /= numVoters;
      }

      if (displayPerDimMedianCheckbox.checked) {
         // find Median outcome of vote points
         sortX = x.slice(0);
         sortY = y.slice(0);
         if (numVoters % 2 === 0) {
            sortX = sortX.concat(0);
            sortY = sortY.concat(0);
         }
         sortX.sort(function (a, b) {
            return a - b;
         });
         sortY.sort(function (a, b) {
            return a - b;
         });
         medX = sortX[Math.floor(numVoters / 2)];
         medY = sortY[Math.floor(numVoters / 2)];
      }

      if (displayAarDsvCheckbox.checked) {
         // find AAR DSV outcome of vote points
         sortX = x.slice(0);
         sortY = y.slice(0);
         for (i = 1; i < numVoters; ++i) {
            sortX = sortX.concat(-width / 2 + i * width / numVoters);
            sortY = sortY.concat(-height / 2 + i * height / numVoters);
         }
         sortX.sort(function (a, b) {
            return a - b;
         });
         sortY.sort(function (a, b) {
            return a - b;
         });
         dsvX = sortX[numVoters - 1];
         dsvY = sortY[numVoters - 1];
      }

      if (displayPerDimMidrangeCheckbox.checked) {
         // find Midrange outcome of vote points
         sortX = x.slice(0);
         sortY = y.slice(0);
         sortX.sort(function (a, b) {
            return a - b;
         });
         sortY.sort(function (a, b) {
            return a - b;
         });
         midX = (sortX[0] + sortX[numVoters - 1]) / 2;
         midY = (sortY[0] + sortY[numVoters - 1]) / 2;
      }

      if (displayFermatWeberCheckbox.checked) {
         // find Fermat-Weber outcome of vote points with Weiszfeld's algorithm
         ferX = (Math.random() - 0.5) * width;
         ferY = (Math.random() - 0.5) * height;
         var numerX, numerY, denom, oldFerX, oldFerY;
         do {
            numerX = 0;
            numerY = 0;
            denom = 0;
            for (i = 0; i < numVoters; ++i) {
               var sumSqDiff = (x[i] - ferX) * (x[i] - ferX) + (y[i] - ferY) * (y[i] - ferY);
               if (sumSqDiff > 0) {
                  var dist = Math.sqrt(sumSqDiff);
                  numerX += x[i] / dist;
                  numerY += y[i] / dist;
                  denom += 1 / dist;
               }
            }
            oldFerX = ferX;
            oldFerY = ferY;
            ferX = numerX / denom;
            ferY = numerY / denom;
         } while (ferX > oldFerX + 0.01 || ferX + 0.01 < oldFerX || ferY > oldFerY + 0.01 || ferY + 0.01 < oldFerY);
      }

      // draw outcome points
      if (displayPerDimMidrangeCheckbox.checked) {
         votespaceContext.beginPath();
         votespaceContext.fillStyle = '#000000';
         votespaceContext.moveTo(midX, -midY);
         votespaceContext.arc(midX, -midY, 8, 0, Math.PI * 2, true);
         votespaceContext.fill();
      }
      if (displayPerDimMedianCheckbox.checked) {
         votespaceContext.beginPath();
         votespaceContext.fillStyle = '#000000';
         votespaceContext.moveTo(medX, -medY);
         votespaceContext.arc(medX, -medY, 8, 0, Math.PI * 2, true);
         votespaceContext.fill();
      }
      if (displayFermatWeberCheckbox.checked) {
         votespaceContext.beginPath();
         votespaceContext.fillStyle = '#000000';
         votespaceContext.moveTo(ferX, -ferY);
         votespaceContext.arc(ferX, -ferY, 8, 0, Math.PI * 2, true);
         votespaceContext.fill();
      }
      if (displayAverageCheckbox.checked) {
         votespaceContext.beginPath();
         votespaceContext.fillStyle = '#000000';
         votespaceContext.moveTo(avgX, -avgY);
         votespaceContext.arc(avgX, -avgY, 8, 0, Math.PI * 2, true);
         votespaceContext.fill();
      }
      if (displayAarDsvCheckbox.checked) {
         votespaceContext.beginPath();
         votespaceContext.fillStyle = '#000000';
         votespaceContext.moveTo(dsvX, -dsvY);
         votespaceContext.arc(dsvX, -dsvY, 8, 0, Math.PI * 2, true);
         votespaceContext.fill();
      }
      if (displayPerDimMidrangeCheckbox.checked) {
         votespaceContext.beginPath();
         votespaceContext.fillStyle = '#ff5555';
         votespaceContext.moveTo(midX, -midY);
         votespaceContext.arc(midX, -midY, 6, 0, Math.PI * 2, true);
         votespaceContext.fill();
      }
      if (displayPerDimMedianCheckbox.checked) {
         votespaceContext.beginPath();
         votespaceContext.fillStyle = '#55ff55';
         votespaceContext.moveTo(medX, -medY);
         votespaceContext.arc(medX, -medY, 6, 0, Math.PI * 2, true);
         votespaceContext.fill();
      }
      if (displayFermatWeberCheckbox.checked) {
         votespaceContext.beginPath();
         votespaceContext.fillStyle = '#aaff00';
         votespaceContext.moveTo(ferX, -ferY);
         votespaceContext.arc(ferX, -ferY, 6, 0, Math.PI * 2, true);
         votespaceContext.fill();
      }
      if (displayAverageCheckbox.checked) {
         votespaceContext.beginPath();
         votespaceContext.fillStyle = '#ffaa00';
         votespaceContext.moveTo(avgX, -avgY);
         votespaceContext.arc(avgX, -avgY, 6, 0, Math.PI * 2, true);
         votespaceContext.fill();
      }
      if (displayAarDsvCheckbox.checked) {
         votespaceContext.beginPath();
         votespaceContext.fillStyle = '#ffff00';
         votespaceContext.moveTo(dsvX, -dsvY);
         votespaceContext.arc(dsvX, -dsvY, 6, 0, Math.PI * 2, true);
         votespaceContext.fill();
      }
   };

   displayAarDsvCheckbox.onchange = redrawSpace;
   displayAverageCheckbox.onchange = redrawSpace;
   displayFermatWeberCheckbox.onchange = redrawSpace;
   displayPerDimMedianCheckbox.onchange = redrawSpace;
   displayPerDimMidrangeCheckbox.onchange = redrawSpace;

   votespaceCanvas.onmousedown = function (ev) {
      // return the mouse location as a two-element array that gives the relative (x, y) values
      var getMouse = function (ev) {
         var x = ev.clientX - getTrueOffsetLeft(votespaceCanvas) + window.pageXOffset;
         var y = ev.clientY - getTrueOffsetTop(votespaceCanvas) + window.pageYOffset;
         return {x: Math.min(Math.max(x, 0), width), y: Math.min(Math.max(y, 0), height)};
      };

      var mouse, whichPoint;
      mouse = getMouse(ev);
      whichPoint = function () {
         var i, xDiff, yDiff;
         for (i = 0; i < numVoters; ++i) {
            xDiff = mouse.x - width / 2 - x[i];
            yDiff = height / 2 - mouse.y - y[i];
            // if the Euclidean distance between the mouse click and this point is less than 10 pixels
            if (xDiff * xDiff + yDiff * yDiff < 100) {
               return i; // found selected point
            }
         }
         return null; // no point was selected
      }(); // call anonymous function to find which point was selected
      if (typeof whichPoint === 'number') {
         document.onmousemove = function (ev) {
            var mouse = getMouse(ev);
            x[whichPoint] = mouse.x - width / 2 + whichPoint / numVoters;
            y[whichPoint] = height / 2 - mouse.y + whichPoint / numVoters;
            redrawSpace(whichPoint);
         };
         document.onmousemove(ev); // immediately show that point has been selected
         document.onmouseup = function () {
            document.onmousemove = null; // stop moving point around
            redrawSpace();
         };
      }
      return true; // allow the default event handler to be called
   };

   redrawSpace(); // show initial points
};
