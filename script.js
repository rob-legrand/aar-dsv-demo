/*jslint white: true, browser: true, nomen: true, regexp: true, bitwise: true, newcap: true, maxerr: 999, indent: 3 */

var runDemo = function () {
   'use strict';

   var votespaceCanvas = document.getElementById('votespace');
   if (!votespaceCanvas.getContext) {
      window.alert('Your browser does not support the canvas element correctly.\nPlease use a recent version of a browser such as Opera, Chrome or Firefox.');
      return;
   }

   var votespaceContext = votespaceCanvas.getContext('2d');
   votespaceContext.translate(votespaceCanvas.width / 2, votespaceCanvas.height / 2);

   var maxNumVoters = 9;
   var selectNElement = document.getElementById('select-n');
   var numVoters = parseInt(selectNElement.options[selectNElement.selectedIndex].value, 10);
   var displayAarDsvCheckbox = document.getElementById('display-aar-dsv');
   var displayAverageCheckbox = document.getElementById('display-average');
   var displayFermatWeberCheckbox = document.getElementById('display-fermat-weber');
   var displayPerDimMedianCheckbox = document.getElementById('display-per-dim-median');
   var displayPerDimMidrangeCheckbox = document.getElementById('display-per-dim-midrange');

   var votePointRow = [
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

   var votePointText = [
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
   var votePoint = []; // each votePoint[whichPoint][whichDimension] must be between 0 and 1

   var toScreenCoords = function (vote) {
      if (vote.length === 2) {
         return {x: votespaceCanvas.width * (vote[0] - 0.5), y: votespaceCanvas.height * (vote[1] - 0.5)};
      } else {
         alert('WHAT');
         return null;
      }
   };

   var toVoteDims = function (screen) {
      if (typeof screen === 'object' && typeof screen.x === 'number' && typeof screen.y === 'number') {
         return [screen.x / votespaceCanvas.width + 0.5, screen.y / votespaceCanvas.height + 0.5];
      } else {
         alert('WHOA');
         return null;
      }
   };

   var drawVotePoint = function (vote, color, size) {
      var screen = toScreenCoords(vote);
      votespaceContext.beginPath();
      votespaceContext.fillStyle = color;
      votespaceContext.moveTo(screen.x, -screen.y);
      votespaceContext.arc(screen.x, -screen.y, size, 0, Math.PI * 2, true);
      votespaceContext.fill();
   };

   var addOrRemoveVotePoints = function () {
      var whichPoint;
      for (whichPoint = votePoint.length; whichPoint < numVoters; ++whichPoint) {
         votePoint[whichPoint] = [];
         votePoint[whichPoint][0] = Math.random();
         votePoint[whichPoint][1] = Math.random();
      }
      while (votePoint.length > numVoters) {
         votePoint.pop();
      }
   };
   addOrRemoveVotePoints();

   var redrawSpace = function (pointBeingDragged) {
      var whichPoint;
      votespaceContext.clearRect(-votespaceCanvas.width / 2, -votespaceCanvas.height / 2, votespaceCanvas.width, votespaceCanvas.height);

      // draw vote points
      for (whichPoint = 0; whichPoint < numVoters; ++whichPoint) {
         drawVotePoint(votePoint[whichPoint], pointBeingDragged === whichPoint ? '#9966cc' : '#6699cc', 6);
         votePointRow[whichPoint].style.visibility = 'visible';
         votePointText[whichPoint][0].value = votePoint[whichPoint][0].toFixed(5);
         votePointText[whichPoint][1].value = votePoint[whichPoint][1].toFixed(5);
      }
      for (whichPoint = numVoters; whichPoint < maxNumVoters; ++whichPoint) {
         votePointRow[whichPoint].style.visibility = 'collapse';
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
            for (whichPoint = 1; whichPoint < numPoints; ++whichPoint) {
               sortPoint.push(whichPoint / numPoints);
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
               sortPoint.push(0.5);
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
         drawVotePoint(midOutcome, '#000000', 8);
      }
      if (displayPerDimMedianCheckbox.checked) {
         medOutcome = calcPerDimMedian(votePoint);
         drawVotePoint(medOutcome, '#000000', 8);
      }
      if (displayFermatWeberCheckbox.checked) {
         ferOutcome = calcFermatWeber(votePoint);
         drawVotePoint(ferOutcome, '#000000', 8);
      }
      if (displayAverageCheckbox.checked) {
         avgOutcome = calcAverage(votePoint);
         drawVotePoint(avgOutcome, '#000000', 8);
      }
      if (displayAarDsvCheckbox.checked) {
         dsvOutcome = calcAarDsv(votePoint);
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
   };

   selectNElement.onchange = function () {
      numVoters = parseInt(selectNElement.options[selectNElement.selectedIndex].value, 10);
      addOrRemoveVotePoints();
      redrawSpace();
   };

   displayAarDsvCheckbox.onchange = redrawSpace;
   displayAverageCheckbox.onchange = redrawSpace;
   displayFermatWeberCheckbox.onchange = redrawSpace;
   displayPerDimMedianCheckbox.onchange = redrawSpace;
   displayPerDimMidrangeCheckbox.onchange = redrawSpace;

   var makePointTextChangeFunc = function (whichPoint, whichDim) {
      return function () {
         var num = parseFloat(votePointText[whichPoint][whichDim].value, 10);
         if (typeof num === 'number') {
            votePoint[whichPoint][whichDim] = num;
            redrawSpace();
         }
      };
   };

   var whichDim, whichPoint;
   for (whichPoint = 0; whichPoint < maxNumVoters; ++whichPoint) {
      for (whichDim = 0; whichDim < 2; ++whichDim) {
         votePointText[whichPoint][whichDim].onchange = makePointTextChangeFunc(whichPoint, whichDim);
         votePointText[whichPoint][whichDim].onkeyup = makePointTextChangeFunc(whichPoint, whichDim);
      }
   }

   // allow the user to drag a vote point around
   votespaceCanvas.onmousedown = function (ev) {

      // return the mouse location as an object that gives the relative (x, y) values
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
         var x = ev.clientX - getTrueOffsetLeft(votespaceCanvas) + window.pageXOffset;

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
         var y = ev.clientY - getTrueOffsetTop(votespaceCanvas) + window.pageYOffset;

         return {x: Math.min(Math.max(x, 0), votespaceCanvas.width), y: Math.min(Math.max(y, 0), votespaceCanvas.height)};
      };

      var mouse = getMouse(ev);

      var whichPoint = (function () {
         var whichPoint, xDiff, yDiff;
         for (whichPoint = 0; whichPoint < numVoters; ++whichPoint) {
            var screen = toScreenCoords(votePoint[whichPoint]);
            xDiff = mouse.x - votespaceCanvas.width / 2 - screen.x;
            yDiff = votespaceCanvas.height / 2 - mouse.y - screen.y;
            // if the Euclidean distance between the mouse click and this point is less than 10 pixels
            if (xDiff * xDiff + yDiff * yDiff < 100) {
               return whichPoint; // found selected point
            }
         }
         return null; // no point was selected
      }()); // call anonymous function to find which point was selected

      if (typeof whichPoint === 'number') { // if a point was selected
         document.onmousemove = function (ev) {
            var mouse = getMouse(ev);
            votePoint[whichPoint] = toVoteDims({x: mouse.x - votespaceCanvas.width / 2, y: votespaceCanvas.height / 2 - mouse.y});
            votePointText[whichPoint][0].value = votePoint[whichPoint][0].toFixed(5);
            votePointText[whichPoint][1].value = votePoint[whichPoint][1].toFixed(5);
            document.getElementById('click-output').innerHTML = 'x = ' + votePoint[whichPoint][0].toFixed(5) + ', y = ' + votePoint[whichPoint][1].toFixed(5);
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
      votePoint = [];
      addOrRemoveVotePoints();
      redrawSpace();
      return false; // don't do anything else because of the click
   };

   redrawSpace(); // show initial points
};
