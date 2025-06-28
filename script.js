/*jslint white: true, browser: true, nomen: true, regexp: true, bitwise: true, newcap: true, maxerr: 999, indent: 3 */

var runDemo = function () {
   'use strict';

   var votespaceCanvas = document.getElementById('votespace');
   var votespaceContext = votespaceCanvas.getContext && votespaceCanvas.getContext('2d');
   if (!votespaceContext) {
      document.getElementById('instructions').innerHTML = 'Your browser does not seem to support the <code>&lt;canvas&gt;</code> element correctly.&nbsp; Please use a recent version of a browser such as <a href="http://www.opera.com/">Opera</a>, <a href="http://www.google.com/chrome/">Chrome</a> or <a href="http://www.getfirefox.com/">Firefox</a>.';
      window.alert('Your browser does not seem to support the <canvas> element correctly.\nPlease use a recent version of a browser such as Opera, Chrome or Firefox.');
      return;
   }

   var maxNumVoters = 9;
   var selectNElement = document.getElementById('select-n');
   var numVoters = parseInt(selectNElement.options[selectNElement.selectedIndex].value, 10);
   var lineSegmentRadio = document.getElementById('use-line-segment');
   var hypercubeRadio = document.getElementById('use-hypercube');
   var simplexRadio = document.getElementById('use-simplex');
   var automaticStrategyRadio = document.getElementById('strategy-mode');
   var noAutomaticStrategyRadio = document.getElementById('regular-mode');
   var displayAarDsvCheckbox = document.getElementById('display-aar-dsv');
   var displayAverageCheckbox = document.getElementById('display-average');
   var displayFermatWeberCheckbox = document.getElementById('display-fermat-weber');
   var displayPerDimMedianCheckbox = document.getElementById('display-per-dim-median');
   var displayPerDimMidrangeCheckbox = document.getElementById('display-per-dim-midrange');

   var votePointRows = [
      document.getElementById('votepoint0'),
      document.getElementById('votepoint1'),
      document.getElementById('votepoint2'),
      document.getElementById('votepoint3'),
      document.getElementById('votepoint4'),
      document.getElementById('votepoint5'),
      document.getElementById('votepoint6'),
      document.getElementById('votepoint7'),
      document.getElementById('votepoint8')
   ];

   var votePointTextboxes = [
      [document.getElementById('votepoint00-value'), document.getElementById('votepoint01-value')],
      [document.getElementById('votepoint10-value'), document.getElementById('votepoint11-value')],
      [document.getElementById('votepoint20-value'), document.getElementById('votepoint21-value')],
      [document.getElementById('votepoint30-value'), document.getElementById('votepoint31-value')],
      [document.getElementById('votepoint40-value'), document.getElementById('votepoint41-value')],
      [document.getElementById('votepoint50-value'), document.getElementById('votepoint51-value')],
      [document.getElementById('votepoint60-value'), document.getElementById('votepoint61-value')],
      [document.getElementById('votepoint70-value'), document.getElementById('votepoint71-value')],
      [document.getElementById('votepoint80-value'), document.getElementById('votepoint81-value')]
   ];

   // the voters' voted points
   var votePoints = []; // each votePoints[whichPoint][whichDimension] must be between 0 and 1

   // points used to run demo
   var demoPoints = [];

   var toScreenCoords = function (vote) {
      if (vote.length === 2) {
         return {x: (votespaceCanvas.width - 1) * vote[0], y: (votespaceCanvas.height - 1) * (1 - vote[1])};
      } else {
         return null;
      }
   };

   // votespaceCanvas.width and votespaceCanvas.height should be something like 501

   var toVoteDims = function (screen) {
      if (typeof screen === 'object' && typeof screen.x === 'number' && typeof screen.y === 'number') {
         return [screen.x / (votespaceCanvas.width - 1), 1 - screen.y / (votespaceCanvas.height - 1)];
      } else {
         return null;
      }
   };

   var drawVotePoint = function (vote, color, size) {
      var screen = toScreenCoords(vote);
      votespaceContext.beginPath();
      votespaceContext.fillStyle = color;
      votespaceContext.moveTo(screen.x + 0.5, screen.y + 0.5);
      votespaceContext.arc(screen.x + 0.5, screen.y + 0.5, size, 0, 2 * Math.PI, true);
      votespaceContext.fill();
   };

   var addOrRemoveVotePoints = function () {
      var whichPoint;
      for (whichPoint = votePoints.length; whichPoint < numVoters; ++whichPoint) {
         votePoints[whichPoint] = [];
         votePoints[whichPoint][0] = Math.random();
         votePoints[whichPoint][1] = Math.random();
      }
      while (votePoints.length > numVoters) {
         votePoints.pop();
      }
   };
   addOrRemoveVotePoints();

   var calcAverage = function (points) {
      // find Average outcome of input points
      var numDims = points[0].length;
      var numPoints = points.length;
      var outcome = [];
      var whichDim, whichPoint;
      for (whichDim = 0; whichDim < numDims; ++whichDim) {
         outcome[whichDim] = 0;
         for (whichPoint = 0; whichPoint < numPoints; ++whichPoint) {
            outcome[whichDim] += points[whichPoint][whichDim];
         }
         outcome[whichDim] /= numPoints;
      }
      return outcome;
   };

   // called in redrawSpace
   var dsvAverage = function () {
      var i, j;
      // demoPoints is a global variable
      demoPoints.splice(0);
      for (i = 0; i < votePoints.length; ++i) {
         demoPoints.push([]);
         for (j = 0; j < votePoints[i].length; ++j) {
            demoPoints[i].push(votePoints[i][j]);
         }
      }

      var average, calculatedTotal, difference, count;

      for (count = 0; count < 1000; ++count) {
         for (i = 0; i < votePoints.length; ++i) {
            average = calcAverage(demoPoints);
            if (votePoints[i][0] !== average[0]) {
               calculatedTotal = 0;
               for (j = 0; j < demoPoints.length; ++j) {
                  if (i !== j) {
                     calculatedTotal += demoPoints[j][0];
                  }
               }
               difference = ((votePoints[i][0] * votePoints.length) - calculatedTotal);
               if (difference >= 0 && difference <= 1) {
                  demoPoints[i][0] = difference;
               } else if (difference < 0) {
                  demoPoints[i][0] = 0;
               } else {
                  demoPoints[i][0] = 1;
               }
            }
            if (votePoints[i][1] !== average[1]) {
               calculatedTotal = 0;
               for (j = 0; j < demoPoints.length; ++j) {
                  if (i !== j) {
                     calculatedTotal += demoPoints[j][1];
                  }
               }
               difference = ((votePoints[i][1] * votePoints.length) - calculatedTotal);
               if (difference >= 0 && difference <= 1) {
                  demoPoints[i][1] = difference;
               } else if (difference < 0) {
                  demoPoints[i][1] = 0;
               } else {
                  demoPoints[i][1] = 1;
               }
            }
         }
      }
   };

   var redrawSpace = function (pointBeingDragged) {
      var whichPoint;
      votespaceContext.clearRect(0, 0, votespaceCanvas.width, votespaceCanvas.height);

      if (simplexRadio.checked) {
         // draw simplex border given 601x601 canvas
         votespaceContext.beginPath();
         votespaceContext.moveTo(0.5, 520.5);
         votespaceContext.lineTo(600.5, 520.5);
         votespaceContext.lineTo(300.5, 0.5);
         votespaceContext.lineTo(0.5, 520.5);
         votespaceContext.strokeStyle = '#000000';
         votespaceContext.stroke();
         return;
      }

      // draw vote points
      for (whichPoint = 0; whichPoint < numVoters; ++whichPoint) {
         drawVotePoint(votePoints[whichPoint], pointBeingDragged === whichPoint ? '#9966cc' : '#6699cc', 6);
         votePointRows[whichPoint].style.visibility = 'visible';
         votePointTextboxes[whichPoint][0].value = votePoints[whichPoint][0].toFixed(5);
         votePointTextboxes[whichPoint][1].value = votePoints[whichPoint][1].toFixed(5);
      }
      for (whichPoint = numVoters; whichPoint < maxNumVoters; ++whichPoint) {
         votePointRows[whichPoint].style.visibility = 'collapse';
      }

      var smallestToLargest = function (a, b) {
         return a - b;
      };

      var calcAarDsv = function (points) {
         // find AAR DSV outcome of input points
         var numDims = points[0].length;
         var numPoints = points.length;
         var outcome = [];
         var sortedPoints, whichDim, whichPoint;
         for (whichDim = 0; whichDim < numDims; ++whichDim) {
            sortedPoints = [];
            for (whichPoint = 0; whichPoint < numPoints; ++whichPoint) {
               sortedPoints.push(points[whichPoint][whichDim]);
            }
            for (whichPoint = 1; whichPoint < numPoints; ++whichPoint) {
               sortedPoints.push(whichPoint / numPoints);
            }
            sortedPoints.sort(smallestToLargest);
            outcome.push(sortedPoints[numPoints - 1]);
         }
         return outcome;
      };

      var calcFermatWeber = function (points) {
         // find Fermat-Weber outcome of input points with Weiszfeld's algorithm
         var numer, denom, dist, lastFWPoint, notCloseEnough;
         var numDims = points[0].length;
         var numPoints = points.length;
         var outcome = [];
         var sumSqDiff, whichDim, whichPoint;
         for (whichDim = 0; whichDim < numDims; ++whichDim) {
            outcome.push(Math.random());
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
                  sumSqDiff += (points[whichPoint][whichDim] - outcome[whichDim]) * (points[whichPoint][whichDim] - outcome[whichDim]);
               }
               if (sumSqDiff) {
                  dist = Math.sqrt(sumSqDiff);
                  for (whichDim = 0; whichDim < numDims; ++whichDim) {
                     numer[whichDim] += points[whichPoint][whichDim] / dist;
                  }
                  denom += 1 / dist;
               }
            }
            notCloseEnough = false;
            for (whichDim = 0; whichDim < numDims; ++whichDim) {
               lastFWPoint = outcome[whichDim];
               outcome[whichDim] = numer[whichDim] / denom;
               if (outcome[whichDim] > lastFWPoint + 0.00001 || outcome[whichDim] + 0.00001 < lastFWPoint) {
                  notCloseEnough = true;
               }
            }
         } while (notCloseEnough);
         return outcome;
      };

      var calcPerDimMedian = function (points) {
         // find Median outcome of input points
         var numDims = points[0].length;
         var numPoints = points.length;
         var outcome = [];
         var sortedPoints, whichDim, whichPoint;
         for (whichDim = 0; whichDim < numDims; ++whichDim) {
            sortedPoints = [];
            for (whichPoint = 0; whichPoint < numPoints; ++whichPoint) {
               sortedPoints.push(points[whichPoint][whichDim]);
            }
            if (numPoints % 2 === 0) {
               sortedPoints.push(0.5);
            }
            sortedPoints.sort(smallestToLargest);
            outcome.push(sortedPoints[Math.floor(numPoints / 2)]);
         }
         return outcome;
      };

      var calcPerDimMidrange = function (points) {
         // find Midrange outcome of input points
         var numDims = points[0].length;
         var numPoints = points.length;
         var outcome = [];
         var sortedPoints, whichDim, whichPoint;
         for (whichDim = 0; whichDim < numDims; ++whichDim) {
            sortedPoints = [];
            for (whichPoint = 0; whichPoint < numPoints; ++whichPoint) {
               sortedPoints.push(points[whichPoint][whichDim]);
            }
            sortedPoints.sort(smallestToLargest);
            outcome.push((sortedPoints[0] + sortedPoints[numPoints - 1]) / 2);
         }
         return outcome;
      };

      // draw outcome points
      var avgOutcome, dsvOutcome, ferOutcome, medOutcome, midOutcome;
      if (displayPerDimMidrangeCheckbox.checked) {
         midOutcome = calcPerDimMidrange(votePoints);
         drawVotePoint(midOutcome, '#000000', 8);
      }
      if (displayPerDimMedianCheckbox.checked) {
         medOutcome = calcPerDimMedian(votePoints);
         drawVotePoint(medOutcome, '#000000', 8);
      }
      if (displayFermatWeberCheckbox.checked) {
         ferOutcome = calcFermatWeber(votePoints);
         drawVotePoint(ferOutcome, '#000000', 8);
      }
      if (displayAverageCheckbox.checked) {
         avgOutcome = calcAverage(votePoints);
         drawVotePoint(avgOutcome, '#000000', 8);
      }
      if (displayAarDsvCheckbox.checked) {
         dsvOutcome = calcAarDsv(votePoints);
         drawVotePoint(dsvOutcome, '#000000', 8);
         document.getElementById('aar-dsv-output').innerHTML = 'x = ' + dsvOutcome[0].toFixed(5) + ', y = ' + dsvOutcome[1].toFixed(5);
      }
      if (displayPerDimMidrangeCheckbox.checked) {
         drawVotePoint(midOutcome, '#ff5555', 6);
      }
      if (displayPerDimMedianCheckbox.checked) {
         drawVotePoint(medOutcome, '#55ff55', 6);
      }
      if (displayFermatWeberCheckbox.checked) {
         drawVotePoint(ferOutcome, '#aaff00', 6);
      }
      if (displayAverageCheckbox.checked) {
         drawVotePoint(avgOutcome, '#ffaa00', 6);
      }
      if (displayAarDsvCheckbox.checked) {
         drawVotePoint(dsvOutcome, '#ffff00', 6);
      }

      if (automaticStrategyRadio.checked) {
         dsvAverage();
         for (whichPoint = 0; whichPoint < demoPoints.length; ++whichPoint) {
            drawVotePoint(demoPoints[whichPoint], '#000000', 4);
         }
         if (demoPoints.length > 0) {
            drawVotePoint(calcAverage(demoPoints), '#ffaa00', 4);
         }
      }
   };

   selectNElement.onchange = function () {
      numVoters = parseInt(selectNElement.options[selectNElement.selectedIndex].value, 10);
      addOrRemoveVotePoints();
      redrawSpace();
   };

   lineSegmentRadio.onchange = redrawSpace;
   hypercubeRadio.onchange = redrawSpace;
   simplexRadio.onchange = redrawSpace;
   automaticStrategyRadio.onchange = redrawSpace;
   noAutomaticStrategyRadio.onchange = redrawSpace;
   displayAarDsvCheckbox.onchange = redrawSpace;
   displayAverageCheckbox.onchange = redrawSpace;
   displayFermatWeberCheckbox.onchange = redrawSpace;
   displayPerDimMedianCheckbox.onchange = redrawSpace;
   displayPerDimMidrangeCheckbox.onchange = redrawSpace;

   var makePointTextChangeFunc = function (whichPoint, whichDim) {
      return function () {
         var num = parseFloat(votePointTextboxes[whichPoint][whichDim].value, 10);
         if (!isNaN(num)) {
            votePoints[whichPoint][whichDim] = num;
            redrawSpace();
         }
      };
   };

   var whichDim, whichPoint;
   for (whichPoint = 0; whichPoint < maxNumVoters; ++whichPoint) {
      for (whichDim = 0; whichDim < 2; ++whichDim) {
         votePointTextboxes[whichPoint][whichDim].onchange = makePointTextChangeFunc(whichPoint, whichDim);
         votePointTextboxes[whichPoint][whichDim].onkeyup = makePointTextChangeFunc(whichPoint, whichDim);
      }
   }

   // allow the user to drag a vote point around
   votespaceCanvas.onmousedown = function (ev) {

      // return the mouse location as an object that gives the (x, y) values inside the canvas
      // each dimension should range between 0 and (for example) 500, inclusive
      // (0, 0) is the pixel in the upper left corner
      var getMouse = function (ev) {

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
         var x = ev.clientX - getTrueOffsetLeft(votespaceCanvas) + window.pageXOffset - (votespaceCanvas.offsetWidth - votespaceCanvas.width) / 2;

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
         var y = ev.clientY - getTrueOffsetTop(votespaceCanvas) + window.pageYOffset - (votespaceCanvas.offsetHeight - votespaceCanvas.height) / 2;

         return {x: Math.min(Math.max(x, 0), votespaceCanvas.width - 1), y: Math.min(Math.max(y, 0), votespaceCanvas.height - 1)};
      };

      var whichPoint = (function () {
         var mouse = getMouse(ev);
         var screen, whichPoint, xDiff, yDiff;
         for (whichPoint = 0; whichPoint < numVoters; ++whichPoint) {
            screen = toScreenCoords(votePoints[whichPoint]);
            xDiff = mouse.x - screen.x;
            yDiff = mouse.y - screen.y;
            // if the Euclidean distance between the mouse click and this point is less than 10 pixels
            if (xDiff * xDiff + yDiff * yDiff < 100) {
               return whichPoint; // found selected point
            }
         }
         return null; // no point was selected
      }()); // call anonymous function to find which point was selected

      if (typeof whichPoint === 'number') { // if a point was selected
         document.onmousemove = function (ev) {
            votePoints[whichPoint] = toVoteDims(getMouse(ev));
            votePointTextboxes[whichPoint][0].value = votePoints[whichPoint][0].toFixed(5);
            votePointTextboxes[whichPoint][1].value = votePoints[whichPoint][1].toFixed(5);
            document.getElementById('click-output').innerHTML = 'x = ' + votePoints[whichPoint][0].toFixed(5) + ', y = ' + votePoints[whichPoint][1].toFixed(5);
            redrawSpace(whichPoint);
         };
         document.onmousemove(ev); // immediately show that the point has been selected
         document.onmouseup = function () {
            document.onmousemove = null; // stop moving point around
            redrawSpace();
         };
      }
      return true; // allow the default event handler to be called
   };

   document.getElementById('randomize-points').onclick = function () {
      votePoints = [];
      addOrRemoveVotePoints();
      redrawSpace();
      return false; // don't do anything else because of the click
   };

   redrawSpace(); // show initial points
};
