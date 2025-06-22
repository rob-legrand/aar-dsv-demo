/*jslint white: true, browser: true, nomen: true, regexp: true, bitwise: true, newcap: true, indent: 3 */

var runDemo = function () {
   'use strict';

   var getTrueOffsetLeft = function (ele) {
      var trueOffsetLeft = 0;
      while (ele !== null) {
         if (ele.offsetLeft !== null) {
            trueOffsetLeft += ele.offsetLeft;
         }
         ele = ele.offsetParent;
      }
      return trueOffsetLeft;
   };

   var getTrueOffsetTop = function (ele) {
      var trueOffsetTop = 0;
      while (ele !== null) {
         if (ele.offsetTop !== null) {
            trueOffsetTop += ele.offsetTop;
         }
         ele = ele.offsetParent;
      }
      return trueOffsetTop;
   };

   // the voters' voted points
   var votePoint; // each votePoint[whichPoint][whichDimension] must be between 0 and 1

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
      votePoint = [];
      for (i = 0; i < numVoters; ++i) {
         votePoint[i] = [];
         votePoint[i][0] = (Math.random() - 0.5) * width;
         votePoint[i][1] = (Math.random() - 0.5) * height;
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
         votespaceContext.moveTo(votePoint[i][0], -votePoint[i][1]);
         votespaceContext.arc(votePoint[i][0], -votePoint[i][1], 6, 0, Math.PI * 2, true);
         votespaceContext.fill();
      }

      var smallestToLargest = function (a, b) {
         return a - b;
      };

      var calcAarDsv = function (point) {
         // find AAR DSV outcome of input points
         var numDims = point[0].length;
         var numPoints = point.length;
         var outcome = [];
         var sortPoint, whichDim, whichPoint;
         for (whichDim = 0; whichDim < numDims; ++whichDim) {
            sortPoint = [];
            for (whichPoint = 0; whichPoint < numPoints; ++whichPoint) {
               sortPoint.push(point[whichPoint][whichDim]);
            }
            var limit = whichDim === 0 ? width : height;
            for (whichPoint = 1; whichPoint < numPoints; ++whichPoint) {
               sortPoint.push(limit * whichPoint / numPoints - limit / 2);
            }
            sortPoint.sort(smallestToLargest);
            outcome.push(sortPoint[numPoints - 1]);
         }
         return outcome;
      };

      var calcAverage = function (point) {
         // find Average outcome of input points
         var numDims = point[0].length;
         var numPoints = point.length;
         var outcome = [];
         var whichDim, whichPoint;
         for (whichDim = 0; whichDim < numDims; ++whichDim) {
            outcome[whichDim] = 0;
            for (whichPoint = 0; whichPoint < numPoints; ++whichPoint) {
               outcome[whichDim] += point[whichPoint][whichDim];
            }
            outcome[whichDim] /= numPoints;
         }
         return outcome;
      };

      var calcFermatWeber = function (point) {
         // find Fermat-Weber outcome of input points with Weiszfeld's algorithm
         var numer, denom, dist, lastFWPoint, notCloseEnough;
         var numDims = point[0].length;
         var numPoints = point.length;
         var outcome = [];
         var sumSqDiff, whichDim, whichPoint;
         for (whichDim = 0; whichDim < numDims; ++whichDim) {
            var limit = whichDim === 0 ? width : height;
            outcome.push((Math.random() - 0.5) * limit);
         }
         numer = [];
         do {
            for (whichDim = 0; whichDim < numDims; ++whichDim) {
               numer[whichDim] = 0;
            }
            denom = 0;
            for (whichPoint = 0; whichPoint < numPoints; ++whichPoint) {
               sumSqDiff = 0;
               for (whichDim = 0; whichDim < numDims; ++whichDim) {
                  sumSqDiff += (point[whichPoint][whichDim] - outcome[whichDim]) * (point[whichPoint][whichDim] - outcome[whichDim]);
               }
               if (sumSqDiff) {
                  dist = Math.sqrt(sumSqDiff);
                  for (whichDim = 0; whichDim < numDims; ++whichDim) {
                     numer[whichDim] += point[whichPoint][whichDim] / dist;
                  }
                  denom += 1 / dist;
               }
            }
            notCloseEnough = false;
            for (whichDim = 0; whichDim < numDims; ++whichDim) {
               lastFWPoint = outcome[whichDim];
               outcome[whichDim] = numer[whichDim] / denom;
               if (outcome[whichDim] > lastFWPoint + 0.001 || outcome[whichDim] + 0.001 < lastFWPoint) {
                  notCloseEnough = true;
               }
            }
         } while (notCloseEnough);
         return outcome;
      };

      var calcPerDimMedian = function (point) {
         // find Median outcome of input points
         var numDims = point[0].length;
         var numPoints = point.length;
         var outcome = [];
         var sortPoint, whichDim, whichPoint;
         for (whichDim = 0; whichDim < numDims; ++whichDim) {
            sortPoint = [];
            for (whichPoint = 0; whichPoint < numPoints; ++whichPoint) {
               sortPoint.push(point[whichPoint][whichDim]);
            }
            if (numPoints % 2 === 0) {
               sortPoint[numPoints] = 0;
            }
            sortPoint.sort(smallestToLargest);
            outcome.push(sortPoint[Math.floor(numPoints / 2)]);
         }
         return outcome;
      };

      var calcPerDimMidrange = function (point) {
         // find Midrange outcome of input points
         var numDims = point[0].length;
         var numPoints = point.length;
         var outcome = [];
         var sortPoint, whichDim, whichPoint;
         for (whichDim = 0; whichDim < numDims; ++whichDim) {
            sortPoint = [];
            for (whichPoint = 0; whichPoint < numPoints; ++whichPoint) {
               sortPoint.push(point[whichPoint][whichDim]);
            }
            sortPoint.sort(smallestToLargest);
            outcome.push((sortPoint[0] + sortPoint[numPoints - 1]) / 2);
         }
         return outcome;
      };

      // draw outcome points
      var avgOutcome, dsvOutcome, ferOutcome, medOutcome, midOutcome;
      if (displayPerDimMidrangeCheckbox.checked) {
         midOutcome = calcPerDimMidrange(votePoint);
         votespaceContext.beginPath();
         votespaceContext.fillStyle = '#000000';
         votespaceContext.moveTo(midOutcome[0], -midOutcome[1]);
         votespaceContext.arc(midOutcome[0], -midOutcome[1], 8, 0, Math.PI * 2, true);
         votespaceContext.fill();
      }
      if (displayPerDimMedianCheckbox.checked) {
         medOutcome = calcPerDimMedian(votePoint);
         votespaceContext.beginPath();
         votespaceContext.fillStyle = '#000000';
         votespaceContext.moveTo(medOutcome[0], -medOutcome[1]);
         votespaceContext.arc(medOutcome[0], -medOutcome[1], 8, 0, Math.PI * 2, true);
         votespaceContext.fill();
      }
      if (displayFermatWeberCheckbox.checked) {
         ferOutcome = calcFermatWeber(votePoint);
         votespaceContext.beginPath();
         votespaceContext.fillStyle = '#000000';
         votespaceContext.moveTo(ferOutcome[0], -ferOutcome[1]);
         votespaceContext.arc(ferOutcome[0], -ferOutcome[1], 8, 0, Math.PI * 2, true);
         votespaceContext.fill();
      }
      if (displayAverageCheckbox.checked) {
         avgOutcome = calcAverage(votePoint);
         votespaceContext.beginPath();
         votespaceContext.fillStyle = '#000000';
         votespaceContext.moveTo(avgOutcome[0], -avgOutcome[1]);
         votespaceContext.arc(avgOutcome[0], -avgOutcome[1], 8, 0, Math.PI * 2, true);
         votespaceContext.fill();
      }
      if (displayAarDsvCheckbox.checked) {
         dsvOutcome = calcAarDsv(votePoint);
         votespaceContext.beginPath();
         votespaceContext.fillStyle = '#000000';
         votespaceContext.moveTo(dsvOutcome[0], -dsvOutcome[1]);
         votespaceContext.arc(dsvOutcome[0], -dsvOutcome[1], 8, 0, Math.PI * 2, true);
         votespaceContext.fill();
      }
      if (displayPerDimMidrangeCheckbox.checked) {
         votespaceContext.beginPath();
         votespaceContext.fillStyle = '#ff5555';
         votespaceContext.moveTo(midOutcome[0], -midOutcome[1]);
         votespaceContext.arc(midOutcome[0], -midOutcome[1], 6, 0, Math.PI * 2, true);
         votespaceContext.fill();
      }
      if (displayPerDimMedianCheckbox.checked) {
         votespaceContext.beginPath();
         votespaceContext.fillStyle = '#55ff55';
         votespaceContext.moveTo(medOutcome[0], -medOutcome[1]);
         votespaceContext.arc(medOutcome[0], -medOutcome[1], 6, 0, Math.PI * 2, true);
         votespaceContext.fill();
      }
      if (displayFermatWeberCheckbox.checked) {
         votespaceContext.beginPath();
         votespaceContext.fillStyle = '#aaff00';
         votespaceContext.moveTo(ferOutcome[0], -ferOutcome[1]);
         votespaceContext.arc(ferOutcome[0], -ferOutcome[1], 6, 0, Math.PI * 2, true);
         votespaceContext.fill();
      }
      if (displayAverageCheckbox.checked) {
         votespaceContext.beginPath();
         votespaceContext.fillStyle = '#ffaa00';
         votespaceContext.moveTo(avgOutcome[0], -avgOutcome[1]);
         votespaceContext.arc(avgOutcome[0], -avgOutcome[1], 6, 0, Math.PI * 2, true);
         votespaceContext.fill();
      }
      if (displayAarDsvCheckbox.checked) {
         votespaceContext.beginPath();
         votespaceContext.fillStyle = '#ffff00';
         votespaceContext.moveTo(dsvOutcome[0], -dsvOutcome[1]);
         votespaceContext.arc(dsvOutcome[0], -dsvOutcome[1], 6, 0, Math.PI * 2, true);
         votespaceContext.fill();
      }
   };

   displayAarDsvCheckbox.onchange = redrawSpace;
   displayAverageCheckbox.onchange = redrawSpace;
   displayFermatWeberCheckbox.onchange = redrawSpace;
   displayPerDimMedianCheckbox.onchange = redrawSpace;
   displayPerDimMidrangeCheckbox.onchange = redrawSpace;

   // allow the user to drag a vote point around
   votespaceCanvas.onmousedown = function (ev) {

      // return the mouse location as an object that gives the relative (x, y) values
      var getMouse = function (ev) {
         var x = ev.clientX - getTrueOffsetLeft(votespaceCanvas) + window.pageXOffset;
         var y = ev.clientY - getTrueOffsetTop(votespaceCanvas) + window.pageYOffset;
         return {x: Math.min(Math.max(x, 0), width), y: Math.min(Math.max(y, 0), height)};
      };

      var mouse = getMouse(ev);

      var whichPoint = (function () {
         var i, xDiff, yDiff;
         for (i = 0; i < numVoters; ++i) {
            xDiff = mouse.x - width / 2 - votePoint[i][0];
            yDiff = height / 2 - mouse.y - votePoint[i][1];
            // if the Euclidean distance between the mouse click and this point is less than 10 pixels
            if (xDiff * xDiff + yDiff * yDiff < 100) {
               return i; // found selected point
            }
         }
         return null; // no point was selected
      }()); // call anonymous function to find which point was selected

      if (typeof whichPoint === 'number') { // if a point was selected
         document.onmousemove = function (ev) {
            var mouse = getMouse(ev);
            votePoint[whichPoint][0] = mouse.x - width / 2 + whichPoint / numVoters;
            votePoint[whichPoint][1] = height / 2 - mouse.y + whichPoint / numVoters;
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
