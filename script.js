/*jslint browser: true, vars: true, plusplus: true, maxerr: 999, indent: 3 */

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
   var hypercubeBottomY = 600;
   var hypercubeLeftX = 100;
   var hypercubeRightX = 600;
   var hypercubeTopY = 100;
   var lineSegmentLeftX = hypercubeLeftX;
   var lineSegmentRightX = hypercubeRightX;
   var lineSegmentY = (hypercubeBottomY + hypercubeTopY) / 2;
   var simplexBottomY = 570;
   var simplexLeftX = 50;
   var simplexRightX = 650;
   var simplexMiddleX = (simplexLeftX + simplexRightX) / 2;
   var simplexTopY = 50;
   var selectNElement = document.getElementById('select-n');
   var numVoters = parseInt(selectNElement.options[selectNElement.selectedIndex].value, 10);
   var lineSegmentRadio = document.getElementById('use-line-segment');
   var hypercubeRadio = document.getElementById('use-hypercube');
   var simplexRadio = document.getElementById('use-simplex');
   var numDims;
   var automaticStrategyRadio = document.getElementById('strategy-mode');
   var noAutomaticStrategyRadio = document.getElementById('regular-mode');
   var animateStrategyButton = document.getElementById('animate');
   var displayAarDsvCheckbox = document.getElementById('display-aar-dsv');
   var displayAverageCheckbox = document.getElementById('display-average');
   var displayFermatWeberCheckbox = document.getElementById('display-fermat-weber');
   var displayPerDimMedianCheckbox = document.getElementById('display-per-dim-median');
   var displayPerDimMidrangeCheckbox = document.getElementById('display-per-dim-midrange');

   var fixNumDims = function () {
      if (lineSegmentRadio.checked) {
         numDims = 1;
      } else if (hypercubeRadio.checked) {
         numDims = 2;
      } else if (simplexRadio.checked) {
         numDims = 3;
      }
   };
   fixNumDims();

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
   var multiVote = [], multiVoteLast = [], iterationAnimation = true, allAtOnce = false;
   var switchedPoint = false, onWhich;

   var toScreenCoords = function (vote) {
      if (!vote || vote.length !== numDims) {
         return null;
      } else if (vote.length === 1) {
         return {x: lineSegmentLeftX + (lineSegmentRightX - lineSegmentLeftX) * vote[0], y: lineSegmentY};
      } else if (vote.length === 2) {
         return {x: hypercubeLeftX + (hypercubeRightX - hypercubeLeftX) * vote[0],
                 y: hypercubeBottomY - (hypercubeBottomY - hypercubeTopY) * vote[1]};
      } else if (vote.length === 3) {
         return {x: simplexLeftX * vote[0] + simplexRightX * vote[1] + simplexMiddleX * vote[2],
                 y: simplexBottomY * (vote[0] + vote[1]) + simplexTopY * vote[2]};
      } else {
         return null;
      }
   };

   var toVoteDims = function (screen) {
      if (typeof screen !== 'object' || typeof screen.x !== 'number' || typeof screen.y !== 'number') {
         return null;
      } else if (lineSegmentRadio.checked) {
         return [(screen.x - lineSegmentLeftX) / (lineSegmentRightX - lineSegmentLeftX)];
      } else if (hypercubeRadio.checked) {
         return [(screen.x - hypercubeLeftX) / (hypercubeRightX - hypercubeLeftX),
                 (hypercubeBottomY - screen.y) / (hypercubeBottomY - hypercubeTopY)];
      } else if (simplexRadio.checked) {
         return [((simplexMiddleX - screen.x) / (simplexMiddleX - simplexLeftX) + (screen.y - simplexTopY) / (simplexBottomY - simplexTopY)) / 2,
                 ((screen.x - simplexMiddleX) / (simplexRightX - simplexMiddleX) + (screen.y - simplexTopY) / (simplexBottomY - simplexTopY)) / 2,
                 (simplexBottomY - screen.y) / (simplexBottomY - simplexTopY)];
      } else {
         return null;
      }
   };

   var projectVotePointToSpace = function (point) {
      var surplus;
      if (!point || !point.length) {
         return null;
      } else if (point.length === 1) {
         return [Math.min(Math.max(point[0], 0), 1)];
      } else if (point.length === 2) {
         return [Math.min(Math.max(point[0], 0), 1), Math.min(Math.max(point[1], 0), 1)];
      } else if (point.length === 3) {
         surplus = (point[0] + point[1] + point[2] - 1) / 3;
         point[0] -= surplus;
         point[1] -= surplus;
         point[2] -= surplus;
         if (point[0] >= point[1] + 1 && point[0] >= point[2] + 1) {
            return [1, 0, 0];
         } else if (point[1] >= point[0] + 1 && point[1] >= point[2] + 1) {
            return [0, 1, 0];
         } else if (point[2] >= point[0] + 1 && point[2] >= point[1] + 1) {
            return [0, 0, 1];
         } else if (point[2] <= 0) {
            return [point[0] + point[2] / 2, point[1] + point[2] / 2, 0];
         } else if (point[1] <= 0) {
            return [point[0] + point[1] / 2, 0, point[2] + point[1] / 2];
         } else if (point[0] <= 0) {
            return [0, point[1] + point[0] / 2, point[2] + point[0] / 2];
         } else {
            return [point[0], point[1], point[2]];
         }
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
      var whichDim, whichPoint;
      for (whichPoint = votePoints.length; whichPoint < numVoters; ++whichPoint) {
         votePoints[whichPoint] = [];
         for (whichDim = 0; whichDim < numDims; ++whichDim) {
            votePoints[whichPoint].push(Math.random());
         }
         votePoints[whichPoint] = projectVotePointToSpace(votePoints[whichPoint]);
      }
      while (votePoints.length > numVoters) {
         votePoints.pop();
      }
   };
   addOrRemoveVotePoints();

   var smallestToLargest = function (a, b) {
      return a - b;
   };

   // find Average outcome of input points
   var calcAverage = function (points) {
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
      return projectVotePointToSpace(outcome);
   };

   // find AAR DSV outcome of input points
   var calcAarDsv = function (points) {
      var numPoints = points.length;
      var outcome = [];
      var newStrategicPoint, somethingChanged, sortedPoints, strategicPoints, whichDim, whichPoint, whichOtherPoint;
      if (numDims <= 2) {
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
         return projectVotePointToSpace(outcome);
      } else {
         strategicPoints = [];
         for (whichPoint = 0; whichPoint < numPoints; ++whichPoint) {
            strategicPoints.push([0, 0, 0]);
         }
         do {
            somethingChanged = false;
            for (whichPoint = 0; whichPoint < numPoints; ++whichPoint) {
               newStrategicPoint = [];
               for (whichDim = 0; whichDim < numDims; ++whichDim) {
                  newStrategicPoint.push(points[whichPoint][whichDim] * numVoters);
                  for (whichOtherPoint = 0; whichOtherPoint < numPoints; ++whichOtherPoint) {
                     if (whichOtherPoint !== whichPoint) {
                        newStrategicPoint[whichDim] -= strategicPoints[whichOtherPoint][whichDim];
                     }
                  }
               }
               newStrategicPoint = projectVotePointToSpace(newStrategicPoint);
               for (whichDim = 0; whichDim < numDims; ++whichDim) {
                  if (Math.abs(newStrategicPoint[whichDim] - strategicPoints[whichPoint][whichDim]) > 0.0000001) {
                     somethingChanged = true;
                  }
                  strategicPoints[whichPoint][whichDim] = newStrategicPoint[whichDim];
               }
            }
         } while (somethingChanged);
         return calcAverage(strategicPoints);
      }
   };

   // find Fermat-Weber outcome of input points with Weiszfeld's algorithm
   var calcFermatWeber = function (points) {
      var numer, denom, dist, lastFWPoint, notCloseEnough;
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
      return projectVotePointToSpace(outcome);
   };

   // find Median outcome of input points
   var calcPerDimMedian = function (points) {
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
      return projectVotePointToSpace(outcome);
   };

   // find Midrange outcome of input points
   var calcPerDimMidrange = function (points) {
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
      return projectVotePointToSpace(outcome);
   };

   // calculate strategicPoints at Average equilibrium
   var dsvAverage = function () {
      var average, calculatedTotal, changed, whichDim, whichPoint, whichPoint2;
      var strategicPointsLast = [];

      if (strategicPoints.length && strategicPoints[0].length !== numDims) {
         strategicPoints = [];
      }

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
            for (whichDim = 0; whichDim < numDims; ++whichDim) {
               if (votePoints[whichPoint][whichDim] !== average[whichDim]) {
                  calculatedTotal = 0;
                  for (whichPoint2 = 0; whichPoint2 < numVoters; ++whichPoint2) {
                     if (whichPoint !== whichPoint2) {
                        calculatedTotal += strategicPoints[whichPoint2][whichDim];
                     }
                  }
                  strategicPoints[whichPoint][whichDim] = ((votePoints[whichPoint][whichDim] * numVoters) - calculatedTotal);
               }
            }
            strategicPoints[whichPoint] = projectVotePointToSpace(strategicPoints[whichPoint]);
         }
         changed = false;
         for (whichPoint = 0; whichPoint < strategicPointsLast.length; ++whichPoint) {
            for (whichDim = 0; whichDim < strategicPointsLast[whichPoint].length; ++whichDim) {
               if (Math.abs(strategicPointsLast[whichPoint][whichDim] - strategicPoints[whichPoint][whichDim]) > 0.0001) {
                  changed = true;
               }
            }
         }
      } while (changed);
   };

   var clearSpace = function () {
      votespaceContext.fillStyle = '#ddeeff';
      votespaceContext.fillRect(0, 0, votespaceCanvas.width, votespaceCanvas.height);

      // draw votespace boundary
      if (lineSegmentRadio.checked) {
         votespaceContext.beginPath();
         votespaceContext.moveTo(lineSegmentLeftX + 0.5, lineSegmentY + 0.5);
         votespaceContext.lineTo(lineSegmentRightX + 0.5, lineSegmentY / 2 + 0.5);
         votespaceContext.strokeStyle = '#000000';
         votespaceContext.stroke();
      } else if (hypercubeRadio.checked) {
         votespaceContext.beginPath();
         votespaceContext.moveTo(hypercubeLeftX + 0.5, hypercubeTopY + 0.5);
         votespaceContext.lineTo(hypercubeRightX + 0.5, hypercubeTopY + 0.5);
         votespaceContext.lineTo(hypercubeRightX + 0.5, hypercubeBottomY + 0.5);
         votespaceContext.lineTo(hypercubeLeftX + 0.5, hypercubeBottomY + 0.5);
         votespaceContext.lineTo(hypercubeLeftX + 0.5, hypercubeTopY + 0.5);
         votespaceContext.fillStyle = '#ffffff';
         votespaceContext.fill();
         votespaceContext.strokeStyle = '#000000';
         votespaceContext.stroke();
      } else if (simplexRadio.checked) {
         votespaceContext.beginPath();
         votespaceContext.moveTo(simplexLeftX + 0.5, simplexBottomY + 0.5);
         votespaceContext.lineTo(simplexRightX + 0.5, simplexBottomY + 0.5);
         votespaceContext.lineTo((simplexLeftX + simplexRightX) / 2 + 0.5, simplexTopY + 0.5);
         votespaceContext.lineTo(simplexLeftX + 0.5, simplexBottomY + 0.5);
         votespaceContext.fillStyle = '#ffffff';
         votespaceContext.fill();
         votespaceContext.strokeStyle = '#000000';
         votespaceContext.stroke();
      } else {
         return false;
      }
      return true;
   };

   var redrawSpace = function (pointBeingDragged) {
      var temp, whichPoint;
      if (!clearSpace()) {
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
         } else if (!iterationAnimation) {
            temp = [];
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
                  temp[whichPoint].push(votePoints[whichPoint][1]);
               }
            }
            drawVotePoint(calcAverage(temp), '#ffaa00', 4);
         } else {
            temp = [];
            for (whichPoint = 0; whichPoint < numVoters; ++whichPoint) {
               temp.push([]);
               if (whichPoint === onWhich) {
                  temp[whichPoint].push(animatedVote[0]);
                  temp[whichPoint].push(animatedVote[1]);
               } else {
                  temp[whichPoint].push(multiVote[whichPoint][0]);
                  temp[whichPoint].push(multiVote[whichPoint][1]);
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

   lineSegmentRadio.onchange = function () {
      fixNumDims();
      votePoints = [];
      addOrRemoveVotePoints();
      redrawSpace();
   };

   hypercubeRadio.onchange = function () {
      fixNumDims();
      votePoints = [];
      addOrRemoveVotePoints();
      redrawSpace();
   };

   simplexRadio.onchange = function () {
      fixNumDims();
      votePoints = [];
      addOrRemoveVotePoints();
      redrawSpace();
   };

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
      }
   }

   var resetAnimation = function () {
      window.clearInterval(animate);
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
      resetAnimation();
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
      var changed = false, moved = false;

      if (!origin) {
         origin = [];
         origin.push(originPoint[0]);
         origin.push(originPoint[1]);
      } else if ((originPoint[1] !== origin[1]) || (originPoint[0] !== origin[0])) {
         originPoint[1] = origin[1];
         originPoint[0] = origin[0];
         changed = true;
      }
      if (!target || !target.length || target.length !== numDims) {
         resetAnimation();
         return;
      }

      if (!animatedVote || changed) {
         animatedVote = [originPoint[0], originPoint[1]];
      }

      if (animatedVote[0] < target[0]) {
         moved = true;
         animatedVote[0] += increment;

         // if switched, point has been passed; go back to it
         if (animatedVote[0] > target[0]) {
            animatedVote[0] = target[0];
         }

      } else if (animatedVote[0] > target[0]) {
         moved = true;
         animatedVote[0] -= increment;

         if (animatedVote[0] < target[0]) {
            animatedVote[0] = target[0];
         }
      }

      if (animatedVote[1] < target[1]) {
         moved = true;
         animatedVote[1] += increment;

         // if switched, point has been passed; go back to it
         if (animatedVote[1] > target[1]) {
            animatedVote[1] = target[1];
         }

      } else if (animatedVote[1] > target[1]) {
         moved = true;
         animatedVote[1] -= increment;

         if (animatedVote[1] < target[1]) {
            animatedVote[1] = target[1];
         }
      }

      // make sure point is in range
      animatedVote = projectVotePointToSpace(animatedVote);

      redrawSpace();
      var voteScreen = toScreenCoords(origin);
      var animatedScreen = toScreenCoords(animatedVote);
      votespaceContext.beginPath();
      votespaceContext.moveTo(animatedScreen.x + 0.5, animatedScreen.y + 0.5);
      votespaceContext.lineTo(voteScreen.x + 0.5, voteScreen.y + 0.5);
      votespaceContext.strokeStyle = '#aaaaaa';
      votespaceContext.stroke();
      drawVotePoint(animatedVote, '#000000', 4);
      drawVotePoint(origin, '#6699cc', 6);

      increment += 0.001;
      // once at target, clear interval and reset increment
      if (!moved) {
         resetAnimation();
         if (loop && animateWhich < numVoters) {
            animationInProgress = true;
            animationComplete[animateWhich] = true;
            ++animateWhich;
            animate = window.setInterval(function () {
               animatePoint(strategicPoints[animateWhich], votePoints[animateWhich], true);
            }, 50);
         }
      }
   };

   var strategizeIndividual = function (onWhich) {
      var average = calcAverage(multiVote);
      var whichPoint, whichCoord, calculatedTotal;

      if (onWhich > numVoters || multiVote.length !== numVoters) {
         return;
      }

      for (whichCoord = 0; whichCoord < numDims; ++whichCoord) {
         if (votePoints[onWhich][whichCoord] !== average[whichCoord]) {
            calculatedTotal = 0;
            for (whichPoint = 0; whichPoint < numVoters; ++whichPoint) {
               if (whichPoint !== onWhich) {
                  calculatedTotal += multiVote[whichPoint][whichCoord];
               }
            }
            multiVote[onWhich][whichCoord] = votePoints[onWhich][whichCoord] * numVoters - calculatedTotal;
         }
      }

      multiVote[onWhich] = projectVotePointToSpace(multiVote[onWhich]);
   };

   var strategizeAll = function () {
      var average = calcAverage(multiVote);
      var whichPoint, outerPoint, whichCoord, calculatedTotal, max = 0.01, ideal, difference;

      if (multiVote.length !== numVoters) {
         return;
      }
      for (outerPoint = 0; outerPoint < numVoters; ++outerPoint) {
         for (whichCoord = 0; whichCoord < numDims; ++whichCoord) {
            if (votePoints[outerPoint][whichCoord] !== average[whichCoord]) {
               calculatedTotal = 0;
               for (whichPoint = 0; whichPoint < numVoters; ++whichPoint) {
                  if (whichPoint !== outerPoint) {
                     calculatedTotal += multiVote[whichPoint][whichCoord];
                  }
               }
               ideal = votePoints[outerPoint][whichCoord] * numVoters - calculatedTotal;
               difference = multiVote[outerPoint][whichCoord] - ideal;
               if (Math.abs(difference) > max) {
                  multiVote[outerPoint][whichCoord] = (difference < 0 ? multiVote[outerPoint][whichCoord] + max : multiVote[outerPoint][whichCoord] - max);
               } else {
                  multiVote[outerPoint][whichCoord] = ideal;
               }
            }
         }
         multiVote[outerPoint] = projectVotePointToSpace(multiVote[outerPoint]);
      }
   };

   var animateElection = function () {
      var whichPoint, whichCoord, voteScreen, demoScreen, moved = false;

      if (!animationInProgress) {
         resetAnimation();
         return;
      }
      if (multiVote.length !== numVoters) {
         resetAnimation();
         return;
      }
      if (!animatedVote) {
         strategizeAll();
         animatedVote = [];
         for (whichPoint = 0; whichPoint < numVoters; ++whichPoint) {
            animatedVote.push([]);
            for (whichCoord = 0; whichCoord < numDims; ++whichCoord) {
               animatedVote[whichPoint].push(multiVote[whichPoint][whichCoord]);
            }
         }
      }

      for (whichPoint = 0; whichPoint < numVoters; ++whichPoint) {
         for (whichCoord = 0; whichCoord < numDims; ++whichCoord) {
            if (animatedVote[whichPoint][whichCoord] < multiVote[whichPoint][whichCoord]) {
               moved = true;
               animatedVote[whichPoint][whichCoord] += increment;
               if (animatedVote[whichPoint][whichCoord] > multiVote[whichPoint][whichCoord]) {
                  animatedVote[whichPoint][whichCoord] = multiVote[whichPoint][whichCoord];
               }
            } else if (animatedVote[whichPoint][whichCoord] > multiVote[whichPoint][whichCoord]) {
               moved = true;
               animatedVote[whichPoint][whichCoord] -= increment;
               if (animatedVote[whichPoint][whichCoord] < multiVote[whichPoint][whichCoord]) {
                  animatedVote[whichPoint][whichCoord] = multiVote[whichPoint][whichCoord];
               }
            }
         }
         animatedVote[whichPoint] = projectVotePointToSpace(animatedVote[whichPoint]);
      }

      clearSpace();

      for (whichPoint = 0; whichPoint < numVoters; ++whichPoint) {
         voteScreen = toScreenCoords(votePoints[whichPoint]);
         demoScreen = toScreenCoords(animatedVote[whichPoint]);
         votespaceContext.beginPath();
         votespaceContext.moveTo(demoScreen.x + 0.5, demoScreen.y + 0.5);
         votespaceContext.lineTo(voteScreen.x + 0.5, voteScreen.y + 0.5);
         votespaceContext.strokeStyle = '#aaaaaa';
         votespaceContext.stroke();
         drawVotePoint(votePoints[whichPoint], '#6699cc', 6);
         drawVotePoint(animatedVote[whichPoint], '#000000', 4);
      }

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

      drawVotePoint(calcAverage(animatedVote), '#ffaa00', 4);

      increment += 0.001;

      if (!moved) {
         resetAnimation();
         var updated = false;
         for (whichPoint = 0; whichPoint < numVoters && !updated; ++whichPoint) {
            for (whichCoord = 0; whichCoord < multiVote[whichPoint].length; ++whichCoord) {
               if (multiVote[whichPoint][whichCoord] !== multiVoteLast[whichPoint][whichCoord]) {
                  updated = true;
               }
            }
         }
         if (!updated) {
            animatedVote = null;
            return;
         } else {
            multiVoteLast = [];
            for (whichPoint = 0; whichPoint < numVoters; ++whichPoint) {
               multiVoteLast.push([]);
               for (whichCoord = 0; whichCoord < multiVote[whichPoint].length; ++whichCoord) {
                  multiVoteLast[whichPoint].push(multiVote[whichPoint][whichCoord]);
               }
            }
         }
         strategizeAll();
         animationInProgress = true;
         animate = window.setInterval(animateElection, 50);
      }
   };

   var animateElection2 = function () {
      var whichPoint, whichCoord, voteScreen, demoScreen, moved = false;

      if (!animationInProgress) {
         resetAnimation();
         return;
      }
      if (multiVote.length !== numVoters) {
         resetAnimation();
         return;
      }
      if (!animatedVote) {
         animatedVote = [];
         for (whichCoord = 0; whichCoord < numDims; ++whichCoord) {
            animatedVote.push(0);
         }
      }
      if (switchedPoint) {
         for (whichCoord = 0; whichCoord < numDims; ++whichCoord) {
            animatedVote[whichCoord] = multiVote[onWhich][whichCoord];
         }
         strategizeIndividual(onWhich);
         switchedPoint = false;
      }

      for (whichCoord = 0; whichCoord < numDims; ++whichCoord) {
         if (animatedVote[whichCoord] < multiVote[onWhich][whichCoord]) {
            animatedVote[whichCoord] += increment;
            moved = true;

            // if switched, point has been passed; go back to it
            if (animatedVote[whichCoord] > multiVote[onWhich][whichCoord]) {
               animatedVote[whichCoord] = multiVote[onWhich][whichCoord];
            }
         } else if (animatedVote[whichCoord] > multiVote[onWhich][whichCoord]) {
            animatedVote[whichCoord] -= increment;
            moved = true;
            if (animatedVote[whichCoord] < multiVote[onWhich][whichCoord]) {
               animatedVote[whichCoord] = multiVote[onWhich][whichCoord];
            }
         }
      }

      // make sure point is in range
      animatedVote = projectVotePointToSpace(animatedVote);

      clearSpace();

      for (whichPoint = 0; whichPoint < numVoters; ++whichPoint) {
         if (whichPoint === onWhich) {
            voteScreen = toScreenCoords(votePoints[onWhich]);
            demoScreen = toScreenCoords(animatedVote);
            votespaceContext.beginPath();
            votespaceContext.moveTo(demoScreen.x + 0.5, demoScreen.y + 0.5);
            votespaceContext.lineTo(voteScreen.x + 0.5, voteScreen.y + 0.5);
            votespaceContext.strokeStyle = '#aaaaaa';
            votespaceContext.stroke();
            drawVotePoint(animatedVote, '#000000', 4);
         } else {
            voteScreen = toScreenCoords(votePoints[whichPoint]);
            demoScreen = toScreenCoords(multiVote[whichPoint]);
            votespaceContext.beginPath();
            votespaceContext.moveTo(demoScreen.x + 0.5, demoScreen.y + 0.5);
            votespaceContext.lineTo(voteScreen.x + 0.5, voteScreen.y + 0.5);
            votespaceContext.strokeStyle = '#aaaaaa';
            votespaceContext.stroke();
            drawVotePoint(multiVote[whichPoint], '#000000', 4);
         }
         if (whichPoint === onWhich && moved) {
            drawVotePoint(votePoints[whichPoint], '#9966cc', 6);
         } else {
            drawVotePoint(votePoints[whichPoint], '#6699cc', 6);
         }
      }

      var avgOutcome, dsvOutcome, ferOutcome, medOutcome, midOutcome, temp = [];
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

      for (whichPoint = 0; whichPoint < numVoters; ++whichPoint) {
         temp.push([]);
         if (whichPoint === onWhich) {
            for (whichCoord = 0; whichCoord < numDims; ++whichCoord) {
               temp[whichPoint].push(animatedVote[whichCoord]);
            }
         } else {
            for (whichCoord = 0; whichCoord < numDims; ++whichCoord) {
               temp[whichPoint].push(multiVote[whichPoint][whichCoord]);
            }
         }
      }
      drawVotePoint(calcAverage(temp), '#ffaa00', 4);

      increment += 0.001;
      // once at target, clear interval and reset increment
      if (animatedVote[0] === multiVote[onWhich][0] && animatedVote[1] === multiVote[onWhich][1]) {
         resetAnimation();
         ++onWhich;
         if (onWhich >= numVoters) {
            var updated = false;
            for (whichPoint = 0; whichPoint < numVoters && !updated; ++whichPoint) {
               for (whichCoord = 0; whichCoord < multiVote[whichPoint].length; ++whichCoord) {
                  if (multiVote[whichPoint][whichCoord] !== multiVoteLast[whichPoint][whichCoord]) {
                     updated = true;
                  }
               }
            }

            if (!updated) {
               return;
            } else {
               multiVoteLast = [];
               for (whichPoint = 0; whichPoint < numVoters; ++whichPoint) {
                  multiVoteLast.push([]);
                  for (whichCoord = 0; whichCoord < multiVote[whichPoint].length; ++whichCoord) {
                     multiVoteLast[whichPoint].push(multiVote[whichPoint][whichCoord]);
                  }
               }
            }
            onWhich = 0;
         }
         animationInProgress = true;
         switchedPoint = true;
         animate = window.setInterval(animateElection2, 50);
      }
   };

   animateStrategyButton.onclick = function () {
      var whichVoter, whichCoord;
      resetAnimation();
      if (!iterationAnimation) {
         animationComplete = [];
         for (whichVoter = 0; whichVoter < numVoters; ++whichVoter) {
            animationComplete.push(false);
         }
         animateWhich = 0;

         if (automaticStrategyRadio.checked && strategicPoints.length > 0) {
            animationInProgress = true;
            animate = window.setInterval(function () {
               animatePoint(strategicPoints[animateWhich], votePoints[animateWhich], true);
            }, 50);
         }
      } else if (allAtOnce) {
         multiVote = [];
         multiVoteLast = [];
         for (whichVoter = 0; whichVoter < numVoters; ++whichVoter) {
            multiVote.push([]);
            multiVoteLast.push([]);
            for (whichCoord = 0; whichCoord < numDims; ++whichCoord) {
               multiVote[whichVoter].push(votePoints[whichVoter][whichCoord]);
               multiVoteLast[whichVoter].push(votePoints[whichVoter][whichCoord]);
            }
         }
         onWhich = 0;
         switchedPoint = true;
         animationInProgress = true;
         animate = window.setInterval(animateElection, 50);
      } else {
         multiVote = [];
         multiVoteLast = [];
         for (whichVoter = 0; whichVoter < numVoters; ++whichVoter) {
            multiVote.push([]);
            multiVoteLast.push([]);
            for (whichCoord = 0; whichCoord < numDims; ++whichCoord) {
               multiVote[whichVoter].push(votePoints[whichVoter][whichCoord]);
               multiVoteLast[whichVoter].push(votePoints[whichVoter][whichCoord]);
            }
         }
         onWhich = 0;
         switchedPoint = true;
         animationInProgress = true;
         animate = window.setInterval(animateElection2, 50);
      }
   };

   var drawLimits = function() {
      var whichPoint, whichCoord, voteScreen, demoScreen, snapshot = [];
      for (whichPoint = 0; whichPoint < numVoters; ++whichPoint) {
         snapshot.push([]);
         for (whichCoord = 0; whichCoord < numDims; ++whichCoord) {
            snapshot[whichPoint].push(votePoints[whichPoint][whichCoord]);
         }
      }

      var dsv = calcAarDsv(snapshot);
      voteScreen = toScreenCoords(dsv);
      demoScreen = toScreenCoords(animatedVote);
      votespaceContext.beginPath();
      votespaceContext.moveTo(demoScreen.x + 0.5, demoScreen.y + 0.5);
      votespaceContext.lineTo(voteScreen.x + 0.5, voteScreen.y + 0.5);
      votespaceContext.strokeStyle = '#ffff00';
      votespaceContext.stroke();
   };

   redrawSpace(); // show initial points
};
