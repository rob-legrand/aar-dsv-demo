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
   var hypercubeBottomY = 550;
   var hypercubeLeftX = 50;
   var hypercubeRightX = 550;
   var hypercubeTopY = 50;
   var simplexBottomY = 550;
   var simplexLeftX = 50;
   var simplexRightX = 550;
   var simplexTopY = 50;
   var selectNElement = document.getElementById('select-n');
   var numVoters = parseInt(selectNElement.options[selectNElement.selectedIndex].value, 10);
   var lineSegmentRadio = document.getElementById('use-line-segment');
   var hypercubeRadio = document.getElementById('use-hypercube');
   var simplexRadio = document.getElementById('use-simplex');
   var automaticStrategyRadio = document.getElementById('strategy-mode');
   var noAutomaticStrategyRadio = document.getElementById('regular-mode');
   var animateStrategyButton = document.getElementById('animate');
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
   var strategicPoints = [];
   var animatedVote, animate, animationComplete = [], animationInProgress = false, increment = 0.01;
   var originPoint = [0, 0];
   var animateWhich = 0;

   var toScreenCoords = function (vote) {
      if (vote.length === 2) {
         return {x: hypercubeLeftX + (hypercubeRightX - hypercubeLeftX) * vote[0], y: hypercubeBottomY - (hypercubeBottomY - hypercubeTopY) * vote[1]};
      } else {
         return null;
      }
   };

   var toVoteDims = function (screen) {
      if (typeof screen === 'object' && typeof screen.x === 'number' && typeof screen.y === 'number') {
         return [(screen.x - hypercubeLeftX) / (hypercubeRightX - hypercubeLeftX), (hypercubeBottomY - screen.y) / (hypercubeBottomY - hypercubeTopY)];
      } else {
         return null;
      }
   };

   var projectVotePointToSpace = function (point) {
      if (point.length === 1) {
         return [Math.min(Math.max(point[0], 0), 1)];
      } else if (point.length === 2) {
         return [Math.min(Math.max(point[0], 0), 1), Math.min(Math.max(point[1], 0), 1)];
      } else if (point.length === 3) {
         return null;
      } else {
         return null;
      }
   };

   var drawVotePoint = function (point, color, size) {
      var screen = toScreenCoords(point);
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

   var smallestToLargest = function (a, b) {
      return a - b;
   };

   // find AAR DSV outcome of input points
   var calcAarDsv = function (points) {
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

   // find Average outcome of input points
   var calcAverage = function (points) {
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

   // find Fermat-Weber outcome of input points with Weiszfeld's algorithm
   var calcFermatWeber = function (points) {
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

   // find Median outcome of input points
   var calcPerDimMedian = function (points) {
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

   // find Midrange outcome of input points
   var calcPerDimMidrange = function (points) {
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

   // calculate strategicPoints at Average equilibrium
   var dsvAverage = function () {
      var average, calculatedTotal, changed, difference, whichDim, whichPoint, whichPoint2;
      var strategicPointsLast = [];

      for (whichPoint = strategicPoints.length; whichPoint < numVoters; ++whichPoint) {
         strategicPoints.push([]);
         for (whichDim = 0; whichDim < votePoints[whichPoint].length; ++whichDim) {
            strategicPoints[whichPoint].push(votePoints[whichPoint][whichDim]);
         }
      }
      while (strategicPoints.length > numVoters) {
         strategicPoints.pop();
      }

      do {
         strategicPointsLast = [];
         for (whichPoint = 0; whichPoint < numVoters; ++whichPoint) {
            strategicPointsLast.push([]);
            for (whichDim = 0; whichDim < strategicPoints[whichPoint].length; ++whichDim) {
               strategicPointsLast[whichPoint].push(strategicPoints[whichPoint][whichDim]);
            }
         }

         for (whichPoint = 0; whichPoint < numVoters; ++whichPoint) {
            average = calcAverage(strategicPoints);
            if (votePoints[whichPoint][0] !== average[0]) {
               calculatedTotal = 0;
               for (whichPoint2 = 0; whichPoint2 < numVoters; ++whichPoint2) {
                  if (whichPoint !== whichPoint2) {
                     calculatedTotal += strategicPoints[whichPoint2][0];
                  }
               }
               difference = ((votePoints[whichPoint][0] * numVoters) - calculatedTotal);
               if (difference >= 0 && difference <= 1) {
                  strategicPoints[whichPoint][0] = difference;
               } else if (difference < 0) {
                  strategicPoints[whichPoint][0] = 0;
               } else {
                  strategicPoints[whichPoint][0] = 1;
               }
            }
            if (votePoints[whichPoint][1] !== average[1]) {
               calculatedTotal = 0;
               for (whichPoint2 = 0; whichPoint2 < numVoters; ++whichPoint2) {
                  if (whichPoint !== whichPoint2) {
                     calculatedTotal += strategicPoints[whichPoint2][1];
                  }
               }
               difference = ((votePoints[whichPoint][1] * numVoters) - calculatedTotal);
               if (difference >= 0 && difference <= 1) {
                  strategicPoints[whichPoint][1] = difference;
               } else if (difference < 0) {
                  strategicPoints[whichPoint][1] = 0;
               } else {
                  strategicPoints[whichPoint][1] = 1;
               }
            }
         }
         changed = false;
         for (whichPoint = 0; whichPoint < strategicPointsLast.length; ++whichPoint) {
            for (whichDim = 0; whichDim < strategicPointsLast[whichPoint].length; ++whichDim) {
               if (Math.abs(strategicPointsLast[whichPoint][whichDim] - strategicPoints[whichPoint][whichDim]) > 0) {
                  changed = true;
               }
            }
         }
      } while (changed);
   };

   var redrawSpace = function (pointBeingDragged) {
      var whichPoint;
      votespaceContext.clearRect(0, 0, votespaceCanvas.width, votespaceCanvas.height);

      // draw votespace boundary
      if (lineSegmentRadio.checked) {
         return;
      } else if (hypercubeRadio.checked) {
         votespaceContext.beginPath();
         votespaceContext.moveTo(hypercubeLeftX + 0.5, hypercubeTopY + 0.5);
         votespaceContext.lineTo(hypercubeRightX + 0.5, hypercubeTopY + 0.5);
         votespaceContext.lineTo(hypercubeRightX + 0.5, hypercubeBottomY + 0.5);
         votespaceContext.lineTo(hypercubeLeftX + 0.5, hypercubeBottomY + 0.5);
         votespaceContext.lineTo(hypercubeLeftX + 0.5, hypercubeTopY + 0.5);
         votespaceContext.strokeStyle = '#000000';
         votespaceContext.stroke();
      } else if (simplexRadio.checked) {
         // draw simplex border given 601x601 canvas
         votespaceContext.beginPath();
         votespaceContext.moveTo(0.5, 520.5);
         votespaceContext.lineTo(600.5, 520.5);
         votespaceContext.lineTo(300.5, 0.5);
         votespaceContext.lineTo(0.5, 520.5);
         votespaceContext.strokeStyle = '#000000';
         votespaceContext.stroke();
      } else {
         return;
      }

      // draw lines from sincere points to strategic votes
      if (automaticStrategyRadio.checked) {
         dsvAverage();
         for (whichPoint = 0; whichPoint < numVoters; ++whichPoint) {
            if (animationInProgress && !animationComplete[whichPoint]) {
               break;
            }
            var voteScreen = toScreenCoords(votePoints[whichPoint]);
            var strategicScreen = toScreenCoords(strategicPoints[whichPoint]);
            votespaceContext.beginPath();
            votespaceContext.moveTo(strategicScreen.x + 0.5, strategicScreen.y + 0.5);
            votespaceContext.lineTo(voteScreen.x + 0.5, voteScreen.y + 0.5);
            votespaceContext.strokeStyle = '#aaaaaa';
            votespaceContext.stroke();
         }
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

      // draw outcome points
      var avgOutcome, dsvOutcome, ferOutcome, medOutcome, midOutcome;
      if (displayPerDimMidrangeCheckbox.checked) {
         midOutcome = calcPerDimMidrange(votePoints);
         drawVotePoint(midOutcome, '#000000', 7.5);
      }
      if (displayPerDimMedianCheckbox.checked) {
         medOutcome = calcPerDimMedian(votePoints);
         drawVotePoint(medOutcome, '#000000', 7.5);
      }
      if (displayFermatWeberCheckbox.checked) {
         ferOutcome = calcFermatWeber(votePoints);
         drawVotePoint(ferOutcome, '#000000', 7.5);
      }
      if (displayAverageCheckbox.checked) {
         avgOutcome = calcAverage(votePoints);
         drawVotePoint(avgOutcome, '#000000', 7.5);
      }
      if (displayAarDsvCheckbox.checked) {
         dsvOutcome = calcAarDsv(votePoints);
         drawVotePoint(dsvOutcome, '#000000', 7.5);
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

      // draw strategic votes and equilibrium Average outcome
      if (automaticStrategyRadio.checked) {
         for (whichPoint = 0; whichPoint < numVoters; ++whichPoint) {
            if (animationInProgress && !animationComplete[whichPoint]) {
               break;
            }
            drawVotePoint(strategicPoints[whichPoint], '#000000', 4);
         }
         if (!animationInProgress) {
            drawVotePoint(calcAverage(strategicPoints), '#ffaa00', 4);
         } else {
            var temp = [];
            for (whichPoint = 0; whichPoint < numVoters; ++whichPoint) {
               temp.push([]);
               if (whichPoint === animateWhich) {
                  temp[whichPoint].push(animatedVote[0]);
                  temp[whichPoint].push(animatedVote[1]);
               } else if (animationComplete[whichPoint]) {
                  temp[whichPoint].push(strategicPoints[whichPoint][0]);
                  temp[whichPoint].push(strategicPoints[whichPoint][1]);
               } else if (!animationComplete[whichPoint]) {
                  temp[whichPoint].push(votePoints[whichPoint][0]);
                  temp[whichPoint].push(votePoints[whichPoint][0]);
               }
            }
            drawVotePoint(calcAverage(temp), '#ffaa00', 4);
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
            votePoints[whichPoint] = projectVotePointToSpace(votePoints[whichPoint]);
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

   var resetAnimation = function () {
      clearInterval(animate);
      increment = 0.01;
      animationInProgress = false;
   };

   // allow the user to drag a vote point around
   votespaceCanvas.onmousedown = function (ev) {

      resetAnimation();

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

         return {x: ev.clientX - getTrueOffsetLeft(votespaceCanvas) + window.pageXOffset - (votespaceCanvas.offsetWidth - votespaceCanvas.width) / 2,
                 y: ev.clientY - getTrueOffsetTop(votespaceCanvas) + window.pageYOffset - (votespaceCanvas.offsetHeight - votespaceCanvas.height) / 2};
      };

      var whichPoint = (function () {
         var screen, sumSqDiff, whichPoint, xDiff, yDiff;
         var closestPoint = null; // return null if no point was selected
         var mouse = getMouse(ev);
         var smallestSumSqDiff = Number.POSITIVE_INFINITY;
         for (whichPoint = 0; whichPoint < numVoters; ++whichPoint) {
            screen = toScreenCoords(votePoints[whichPoint]);
            xDiff = mouse.x - screen.x;
            yDiff = mouse.y - screen.y;
            sumSqDiff = xDiff * xDiff + yDiff * yDiff;
            // if the Euclidean distance between the mouse click and this point is less than 10 pixels and it's the closest so far
            if (sumSqDiff < 100 && sumSqDiff < smallestSumSqDiff) {
               closestPoint = whichPoint; // found selected point
               smallestSumSqDiff = sumSqDiff;
            }
         }
         return closestPoint;
      }()); // call anonymous function to find which point was selected

      if (typeof whichPoint === 'number') { // if a point was selected
         document.onmousemove = function (ev) {
            votePoints[whichPoint] = projectVotePointToSpace(toVoteDims(getMouse(ev)));
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

   var animatePoint = function (target, origin, loop) {

      if (!animationInProgress) {
         resetAnimation();
         return;
      }
      var changed = false;

      if (!origin) {
         origin = originPoint;
      } else if ((originPoint[1] !== origin[1]) || (originPoint[0] !== origin[0])) {
         originPoint[1] = origin[1];
         originPoint[0] = origin[0];
         changed = true;
      }
      if (!target || !target.length || target.length !== 2) {
         resetAnimation();
         return;
      }


      if (!animatedVote || changed) {
         animatedVote = [originPoint[0], originPoint[1]];
      }


      if (animatedVote[0] < target[0]) {
         animatedVote[0] += increment;

         // If switched, point has been passed. Go back to it.
         if (animatedVote[0] > target[0]) {
            animatedVote[0] = target[0];
         }

      } else if (animatedVote[0] > target[0]) {

         animatedVote[0] -= increment;

         if (animatedVote[0] < target[0]) {
            animatedVote[0] = target[0];
         }
      }

      if (animatedVote[1] < target[1]) {
         animatedVote[1] += increment;
      }

      if (animatedVote[1] > target[1]) {
         animatedVote[1] = target[1];
      } else if (animatedVote[1] > target[1]) {

         animatedVote[1] -= increment;

         if (animatedVote[1] < target[1]) {
            animatedVote[1] = target[1];
         }
      }

      // make sure point is in range
      animatedVote[0] = Math.max(animatedVote[0], 0);
      animatedVote[0] = Math.min(animatedVote[0], 1);
      animatedVote[1] = Math.max(animatedVote[1], 0);
      animatedVote[1] = Math.min(animatedVote[1], 1);

      redrawSpace();
      drawVotePoint(animatedVote, '#000000', 4);
      var voteScreen = toScreenCoords(origin);
      var demoScreen = toScreenCoords(animatedVote);
      votespaceContext.beginPath();
      votespaceContext.moveTo(demoScreen.x + 0.5, demoScreen.y + 0.5);
      votespaceContext.lineTo(voteScreen.x + 0.5, voteScreen.y + 0.5);
      votespaceContext.strokeStyle = '#aaaaaa';
      votespaceContext.stroke();

      increment += 0.001;
      // once at target, clear interval and reset increment
      if (animatedVote[0] === target[0] && animatedVote[1] === target[1]) {
         resetAnimation();
         if (loop && animateWhich < numVoters) {
            animationInProgress = true;
            animationComplete[animateWhich] = true;
            animateWhich++;
            animate = setInterval(function () {
               animatePoint(strategicPoints[animateWhich], votePoints[animateWhich], true);
            }, 50);
         }
      }
   };

   animateStrategyButton.onclick = function () {
      var whichVoter;
      animationComplete = [];
      for (whichVoter = 0; whichVoter < numVoters; whichVoter++) {
         animationComplete.push(false);
      }
      animateWhich = 0;

      if (automaticStrategyRadio.checked && strategicPoints.length > 0) {
         animationInProgress = true;
         animate = setInterval(function () {
            animatePoint(strategicPoints[animateWhich], votePoints[animateWhich], true);
         }, 50);
      }
   };

   redrawSpace(); // show initial points
};
