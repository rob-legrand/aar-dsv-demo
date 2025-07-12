/*jslint browser: true, vars: true, plusplus: true, indent: 3 */

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
   var startAnimationButton = document.getElementById('start-animation');
   var stopAnimationButton = document.getElementById('stop-animation');
   var displayAarDsvCheckbox = document.getElementById('display-aar-dsv');
   var displayAverageCheckbox = document.getElementById('display-average');
   var displayFermatWeberCheckbox = document.getElementById('display-fermat-weber');
   var displayPerDimMedianCheckbox = document.getElementById('display-per-dim-median');
   var displayPerDimMidrangeCheckbox = document.getElementById('display-per-dim-midrange');

   var animationModeDefaultRadio = document.getElementById('ordered-mode-default');
   var animationModeOrderedVLRadio = document.getElementById('ordered-mode-with-vl');
   var animationModeBatchVLRadio = document.getElementById('batch-mode-with-vl');
   var timeIntervalTextbox = document.getElementById('time-interval');
   var velocityLimitTextbox = document.getElementById('velocity-limit');

   var votePointTable = document.getElementById('votepoints');
   var votePointRowCollection = votePointTable.getElementsByTagName('tr');
   var votePointRows = [];
   var rowId, whichRow;
   for (whichRow = 0; whichRow < votePointRowCollection.length; ++whichRow) {
      rowId = votePointRowCollection[whichRow].id;
      if (rowId && rowId.indexOf('votepoint') === 0) {
         votePointRows.push(votePointRowCollection[whichRow]);
      }
   }

   var votePointCells = [];
   votePointCells[0] = votePointTable.getElementsByClassName('x-dim');
   votePointCells[1] = votePointTable.getElementsByClassName('y-dim');
   votePointCells[2] = votePointTable.getElementsByClassName('z-dim');

   var votePointTextboxCollection = votePointTable.getElementsByTagName('input');
   var votePointTextboxes = [];
   var textboxId, whichTextbox, whichVoter;
   for (whichTextbox = 0; whichTextbox < votePointTextboxCollection.length; ++whichTextbox) {
      textboxId = votePointTextboxCollection[whichTextbox].id;
      if (textboxId && textboxId.indexOf('votepoint') === 0) {
         whichVoter = Number(textboxId[9]);
         if (!votePointTextboxes[whichVoter]) {
            votePointTextboxes[whichVoter] = [];
         }
         votePointTextboxes[whichVoter].push(votePointTextboxCollection[whichTextbox]);
      }
   }

   var fixNumDims = function () {
      var whichDim, whichRow;
      if (lineSegmentRadio.checked) {
         numDims = 1;
      } else if (hypercubeRadio.checked) {
         numDims = 2;
      } else if (simplexRadio.checked) {
         numDims = 3;
      }
      for (whichDim = 0; whichDim < 3; ++whichDim) {
         for (whichRow = 0; whichRow < votePointCells[whichDim].length; ++whichRow) {
            votePointCells[whichDim][whichRow].style.visibility = whichDim < numDims ? 'visible' : 'collapse';
         }
      }
   };
   fixNumDims();

   // the voters' voted points
   var votePoints = []; // each votePoints[whichPoint][whichDimension] must be between 0 and 1

   // points used to run demo
   var strategicPoints = [];
   var animatedVote, animate, animationInProgress = false, animatedMovementLimit, animatedMovementLimitBase = 0.05, timeIncrementBase = 50, activePoint;
   var targetVote = [], targetVoteLast = [];

   var resetAnimation = function () {
      window.clearInterval(animate);
      animatedMovementLimit = animatedMovementLimitBase;
      animationInProgress = false;
   };

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
         if (point[0] + point[1] + point[2] !== 1) {
            surplus = (point[0] + point[1] + point[2] - 1) / 3;
            point[0] -= surplus;
            point[1] -= surplus;
            point[2] = 1 - point[0] - point[1];
         }
         if (point[0] >= point[1] + 1 && point[0] >= point[2] + 1) {
            return [1, 0, 0];
         } else if (point[1] >= point[0] + 1 && point[1] >= point[2] + 1) {
            return [0, 1, 0];
         } else if (point[2] >= point[0] + 1 && point[2] >= point[1] + 1) {
            return [0, 0, 1];
         } else if (point[2] < 0) {
            return [point[0] + point[2] / 2, 1 - (point[0] + point[2] / 2), 0];
         } else if (point[1] < 0) {
            return [point[0] + point[1] / 2, 0, 1 - (point[0] + point[1] / 2)];
         } else if (point[0] < 0) {
            return [0, point[1] + point[0] / 2, 1 - (point[1] + point[0] / 2)];
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

   // test AAR DSV inequalities given point and votePoints
   // return object that tells whether all are satisfied and whether each dimension of point is too big, too small or just right
   // -1 means too small, 0 means just right, +1 means too big
   var testInequalities = function (point) {
      var isGreaterThan, numGreaterThan;
      var whichDim, whichOtherDim, whichPoint;
      var returnValue = {
         obeysAll: true,
         dimSize: []
      };
      if (numDims <= 2) {
         for (whichDim = 0; whichDim < numDims; ++whichDim) {
            returnValue.dimSize[whichDim] = 0;
            numGreaterThan = 0;
            for (whichPoint = 0; whichPoint < numVoters; ++whichPoint) {
               if (votePoints[whichPoint][whichDim] > point[whichDim] + 0.0000001) {
                  ++numGreaterThan;
               }
            }
            if (numGreaterThan > point[whichDim] * numVoters + 0.0000001) {
               returnValue.obeysAll = false;
               returnValue.dimSize[whichDim] = -1;
            }
            numGreaterThan = 0;
            for (whichPoint = 0; whichPoint < numVoters; ++whichPoint) {
               if (votePoints[whichPoint][whichDim] + 0.0000001 >= point[whichDim]) {
                  ++numGreaterThan;
               }
            }
            if (numGreaterThan + 0.0000001 < point[whichDim] * numVoters) {
               returnValue.obeysAll = false;
               returnValue.dimSize[whichDim] = 1;
            }
         }
         return returnValue;
      } else if (numDims === 3) {
         for (whichDim = 0; whichDim < numDims; ++whichDim) {
            returnValue.dimSize[whichDim] = 0;
            numGreaterThan = 0;
            for (whichPoint = 0; whichPoint < numVoters; ++whichPoint) {
               isGreaterThan = true;
               for (whichOtherDim = 0; whichOtherDim < numDims; ++whichOtherDim) {
                  if (whichOtherDim !== whichDim && votePoints[whichPoint][whichDim] - votePoints[whichPoint][whichOtherDim] <= point[whichDim] - point[whichOtherDim] + 0.0000001) {
                     isGreaterThan = false;
                  }
               }
               if (isGreaterThan) {
                  ++numGreaterThan;
               }
            }
            if (numGreaterThan > point[whichDim] * numVoters + 0.0000001) {
               returnValue.obeysAll = false;
               returnValue.dimSize[whichDim] = -1;
            }
            numGreaterThan = 0;
            for (whichPoint = 0; whichPoint < numVoters; ++whichPoint) {
               isGreaterThan = true;
               for (whichOtherDim = 0; whichOtherDim < numDims; ++whichOtherDim) {
                  if (whichOtherDim !== whichDim && votePoints[whichPoint][whichDim] - votePoints[whichPoint][whichOtherDim] + 0.0000001 < point[whichDim] - point[whichOtherDim]) {
                     isGreaterThan = false;
                  }
               }
               if (isGreaterThan) {
                  ++numGreaterThan;
               }
            }
            if (numGreaterThan + 0.0000001 < point[whichDim] * numVoters) {
               returnValue.obeysAll = false;
               returnValue.dimSize[whichDim] = 1;
            }
         }
         return returnValue;
      } else {
         return {
            obeysAll: false,
            dimSize: null
         };
      }
   };

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
                  if (Math.abs(newStrategicPoint[whichDim] - strategicPoints[whichPoint][whichDim]) > 0.00000001) {
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

   var findLimits = function (outcomeFunction) {
      var whichPoint, whichDim, snapshot = [], points = [], simplexIncrement = 0.02, hypercubeIncrement = 0.05;
      for (whichPoint = 0; whichPoint < numVoters; ++whichPoint) {
         snapshot.push([]);
         for (whichDim = 0; whichDim < numDims; ++whichDim) {
            if (whichPoint === 0) {
               snapshot[whichPoint].push(0);
            } else {
               snapshot[whichPoint].push(votePoints[whichPoint][whichDim]);
            }
         }
      }

      if (simplexRadio.checked) {
         for (snapshot[0][0] = 1; snapshot[0][0] > 0; snapshot[0][0] -= simplexIncrement, snapshot[0][2] += simplexIncrement) {
            points.push(outcomeFunction(snapshot));
         }
         snapshot[0][0] = 0;
         snapshot[0][2] = 0;
         for (snapshot[0][2] = 1; snapshot[0][2] > 0; snapshot[0][2] -= simplexIncrement, snapshot[0][1] += simplexIncrement) {
            points.push(outcomeFunction(snapshot));
         }
         snapshot[0][1] = 0;
         snapshot[0][2] = 0;
         for (snapshot[0][1] = 1; snapshot[0][1] > 0; snapshot[0][1] -= simplexIncrement, snapshot[0][0] += simplexIncrement) {
            points.push(outcomeFunction(snapshot));
         }
      } else {
         points.push(outcomeFunction(snapshot));
         for (whichDim = 0; whichDim < numDims; ++whichDim) {
            for (snapshot[0][whichDim] = 0; snapshot[0][whichDim] < 1; snapshot[0][whichDim] += hypercubeIncrement) {
               points.push(outcomeFunction(snapshot));
            }
            snapshot[0] = projectVotePointToSpace(snapshot[0]);
         }
         for (whichDim = 0; whichDim < numDims; ++whichDim) {
            for (snapshot[0][whichDim] = 1; snapshot[0][whichDim] > 0; snapshot[0][whichDim] -= hypercubeIncrement) {
               points.push(outcomeFunction(snapshot));
            }
            snapshot[0] = projectVotePointToSpace(snapshot[0]);
         }
      }
      return points;
   };

   var drawLimits = function (points, color) {
      var whichPoint, voteScreen;
      votespaceContext.beginPath();
      voteScreen = toScreenCoords(points[points.length - 1]);
      votespaceContext.moveTo(voteScreen.x, voteScreen.y);
      for (whichPoint = 0; whichPoint < points.length; ++whichPoint) {
         voteScreen = toScreenCoords(points[whichPoint]);
         votespaceContext.lineTo(voteScreen.x, voteScreen.y);
      }
      votespaceContext.strokeStyle = color;
      votespaceContext.stroke();
      votespaceContext.closePath();
   };

   var clearSpace = function () {
      votespaceContext.fillStyle = '#ddeeff';
      votespaceContext.fillRect(0, 0, votespaceCanvas.width, votespaceCanvas.height);

      // draw votespace boundary
      if (lineSegmentRadio.checked) {
         votespaceContext.beginPath();
         votespaceContext.moveTo(lineSegmentLeftX + 0.5, lineSegmentY + 0.5);
         votespaceContext.lineTo(lineSegmentRightX + 0.5, lineSegmentY + 0.5);
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
      var whichDim, whichPoint, limitPoints;
      resetAnimation();
      if (!clearSpace()) {
         return;
      }
      // for textbox focus
      if (activePoint || activePoint === 0) {
         pointBeingDragged = activePoint;
      }

      // draw limits of manipulation for voter 1
      if (displayPerDimMidrangeCheckbox.checked) {
         limitPoints = findLimits(calcPerDimMidrange);
         drawLimits(limitPoints, '#ff5555');
      } else if (displayPerDimMedianCheckbox.checked) {
         limitPoints = findLimits(calcPerDimMedian);
         drawLimits(limitPoints, '#55ff55');
      } else if (displayFermatWeberCheckbox.checked) {
         limitPoints = findLimits(calcFermatWeber);
         drawLimits(limitPoints, '#aaff00');
      } else if (displayAverageCheckbox.checked) {
         limitPoints = findLimits(calcAverage);
         drawLimits(limitPoints, '#ffaa00');
      } else if (displayAarDsvCheckbox.checked) {
         limitPoints = findLimits(calcAarDsv);
         drawLimits(limitPoints, '#ffff00');
      }

      // draw lines from sincere points to strategic votes
      if (automaticStrategyRadio.checked) {
         dsvAverage();
         for (whichPoint = 0; whichPoint < numVoters; ++whichPoint) {
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
         for (whichDim = 0; whichDim < numDims; ++whichDim) {
            votePointTextboxes[whichPoint][whichDim].value = votePoints[whichPoint][whichDim].toFixed(5);
         }
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
         if (!testInequalities(dsvOutcome).obeysAll) {
            window.alert('OH NO: ' + testInequalities(dsvOutcome).dimSize[0] + ':' + testInequalities(dsvOutcome).dimSize[1] + ':' + testInequalities(dsvOutcome).dimSize[2]);
         }
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
            drawVotePoint(strategicPoints[whichPoint], '#000000', 4);
         }
         drawVotePoint(calcAverage(strategicPoints), '#ffaa00', 4);
      }
   };

   var focusOn = function (which) {
      activePoint = which;
      redrawSpace();
   };

   var focusOff = function () {
      activePoint = null;
      redrawSpace();
   };

   // add focus handlers for textboxes
   (function () {
      var num, num2;
      for (num = 0; num < votePointTextboxes.length; ++num) {
         for (num2 = 0; num2 < votePointTextboxes[num].length; ++num2) {
            votePointTextboxes[num][num2].addEventListener('focus', function () {
               focusOn(Number(this.id[9]));
            }, true);
            votePointTextboxes[num][num2].addEventListener('blur', focusOff, true);
         }
      }
   }());

   selectNElement.onchange = function () {
      numVoters = parseInt(selectNElement.options[selectNElement.selectedIndex].value, 10);
      addOrRemoveVotePoints();
      redrawSpace();
   };

   lineSegmentRadio.onchange = function () {
      fixNumDims();
      votePoints = [];
      strategicPoints = [];
      addOrRemoveVotePoints();
      redrawSpace();
   };

   hypercubeRadio.onchange = function () {
      fixNumDims();
      votePoints = [];
      strategicPoints = [];
      addOrRemoveVotePoints();
      redrawSpace();
   };

   simplexRadio.onchange = function () {
      fixNumDims();
      votePoints = [];
      strategicPoints = [];
      addOrRemoveVotePoints();
      redrawSpace();
   };

   automaticStrategyRadio.onchange = function () {
      redrawSpace();
   };

   noAutomaticStrategyRadio.onchange = function () {
      redrawSpace();
   };

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
      for (whichDim = 0; whichDim < 3; ++whichDim) {
         votePointTextboxes[whichPoint][whichDim].onchange = makePointTextChangeFunc(whichPoint, whichDim);
      }
   }

   // allow the user to drag a vote point around
   votespaceCanvas.onmousedown = function (ev) {

      resetAnimation();

      // return the mouse location as an object that gives the (x, y) values inside the canvas
      // each dimension should range between 0 and (for example) 700, inclusive
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
            var whichDim;
            votePoints[whichPoint] = projectVotePointToSpace(toVoteDims(getMouse(ev)));
            for (whichDim = 0; whichDim < numDims; ++whichDim) {
               votePointTextboxes[whichPoint][whichDim].value = votePoints[whichPoint][whichDim].toFixed(5);
            }
            document.getElementById('click-output').innerHTML = 'x = ' + votePoints[whichPoint][0].toFixed(5) + ', y = ' + votePoints[whichPoint][1].toFixed(5);
            redrawSpace(whichPoint);
         };
         document.onmousemove(ev); // immediately show that the point has been selected
         document.onmouseup = function () {
            document.onmousemove = null; // stop moving point around
            redrawSpace();
         };
      } else {
         var testResult = testInequalities(projectVotePointToSpace(toVoteDims(getMouse(ev))));
         var str = testResult.dimSize[0] < 0 ? 'x too small' : testResult.dimSize[0] > 0 ? 'x too big' : 'x just right';
         if (numDims > 1) {
            str += '; ' + (testResult.dimSize[1] < 0 ? 'y too small' : testResult.dimSize[1] > 0 ? 'y too big' : 'y just right');
            if (numDims > 2) {
               str += '; ' + (testResult.dimSize[2] < 0 ? 'z too small' : testResult.dimSize[2] > 0 ? 'z too big' : 'z just right');
            }
         }
         document.getElementById('click-output').innerHTML = str;
      }
      return true; // allow the default event handler to be called
   };

   document.getElementById('randomize-points').onclick = function () {
      votePoints = [];
      addOrRemoveVotePoints();
      redrawSpace();
      return false; // don't do anything else because of the click
   };

   // makes changes to global targetVote array
   var strategizeIndividual = function (onWhich) {
      if (onWhich > numVoters || targetVote.length !== numVoters) {
         return;
      }
      onWhich = randomInt();
      var average = calcAverage(targetVote);
      var whichPoint, whichDim, calculatedTotal;
      for (whichDim = 0; whichDim < numDims; ++whichDim) {
         if (votePoints[onWhich][whichDim] !== average[whichDim]) {
            calculatedTotal = 0;
            for (whichPoint = 0; whichPoint < numVoters; ++whichPoint) {
               if (whichPoint !== onWhich) {
                  calculatedTotal += targetVote[whichPoint][whichDim];
               }
            }
            targetVote[onWhich][whichDim] = votePoints[onWhich][whichDim] * numVoters - calculatedTotal;
         }
      }
      targetVote[onWhich] = projectVotePointToSpace(targetVote[onWhich]);
   };

   // makes changes to global targetVote array
   var strategizeAll = function (onWhich) {
      var average = calcAverage(targetVote);
      var whichPoint, whichDim, calculatedTotal, copy = [];

      if (targetVote.length !== numVoters) {
         return;
      }
      for (whichPoint = 0; whichPoint < numVoters; ++whichPoint) {
         copy.push([]);
         for (whichDim = 0; whichDim < numDims; ++whichDim) {
            copy[whichPoint].push(targetVote[whichPoint][whichDim]);
         }
      }
      for (onWhich = 0; onWhich < numVoters; ++onWhich) {
         for (whichDim = 0; whichDim < numDims; ++whichDim) {
            if (Math.abs(votePoints[onWhich][whichDim] - average[whichDim]) > 0.000001) {
               calculatedTotal = 0;
               for (whichPoint = 0; whichPoint < numVoters; ++whichPoint) {
                  if (whichPoint !== onWhich) {
                     calculatedTotal += copy[whichPoint][whichDim];
                  }
               }
               targetVote[onWhich][whichDim] = votePoints[onWhich][whichDim] * numVoters - calculatedTotal;
            }
         }
         targetVote[onWhich] = projectVotePointToSpace(targetVote[onWhich]);
      }
   };

   var animateElection = function (iterative, allAtOnce, withLimits, updateFunction, onWhich, timeIncrement, order) {
      var whichPoint, whichDim, voteScreen, demoScreen, moved = false, active = [];

      if (!animationInProgress) {
         resetAnimation();
         return;
      }
      if (targetVote.length !== numVoters) {
         resetAnimation();
         return;
      }
      if (!order && !animatedVote) {
         animatedVote = [];
         for (whichPoint = 0; whichPoint < numVoters; ++whichPoint) {
            animatedVote.push([]);
            for (whichDim = 0; whichDim < numDims; ++whichDim) {
               animatedVote[whichPoint].push(targetVote[whichPoint][whichDim]);
            }
         }
         if (updateFunction) {
            updateFunction(onWhich);
         } else if (allAtOnce) {
            for (whichPoint = 0; whichPoint < numVoters; ++whichPoint) {
               for (whichDim = 0; whichDim < numDims; ++whichDim) {
                  targetVote[whichPoint][whichDim] = strategicPoints[whichPoint][whichDim];
               }
            }
         } else {
            for (whichDim = 0; whichDim < numDims; ++whichDim) {
               targetVote[onWhich][whichDim] = strategicPoints[onWhich][whichDim];
            }
         }
      }

      for (whichPoint = 0; whichPoint < numVoters; ++whichPoint) {
         active.push(false);
         for (whichDim = 0; whichDim < numDims; ++whichDim) {
            if (animatedVote[whichPoint][whichDim] < (targetVote[whichPoint][whichDim] - 0.0000001)) {
               moved = true;
               if (!allAtOnce && !withLimits) {
                  active[whichPoint] = true;
               }
               animatedVote[whichPoint][whichDim] += animatedMovementLimit;
               if (animatedVote[whichPoint][whichDim] > targetVote[whichPoint][whichDim]) {
                  animatedVote[whichPoint][whichDim] = targetVote[whichPoint][whichDim];
               }
            } else if (animatedVote[whichPoint][whichDim] > (targetVote[whichPoint][whichDim] + 0.000001)) {
               moved = true;
               if (!allAtOnce && !withLimits) {
                  active[whichPoint] = true;
               }
               animatedVote[whichPoint][whichDim] -= animatedMovementLimit;
               if (animatedVote[whichPoint][whichDim] < targetVote[whichPoint][whichDim]) {
                  animatedVote[whichPoint][whichDim] = targetVote[whichPoint][whichDim];
               }
            }
         }
         animatedVote[whichPoint] = projectVotePointToSpace(animatedVote[whichPoint]);
      }
      if (withLimits) {
          moved = false;
          for (whichPoint = 0; whichPoint < numVoters; ++whichPoint) {
             for (whichDim = 0; whichDim < numDims; ++whichDim) {
                targetVote[whichPoint][whichDim] = animatedVote[whichPoint][whichDim];
             }
          }
      }
      // draw points and lines
      clearSpace();
      for (whichPoint = 0; whichPoint < numVoters; ++whichPoint) {
         voteScreen = toScreenCoords(votePoints[whichPoint]);
         demoScreen = toScreenCoords(animatedVote[whichPoint]);
         votespaceContext.beginPath();
         votespaceContext.moveTo(demoScreen.x + 0.5, demoScreen.y + 0.5);
         votespaceContext.lineTo(voteScreen.x + 0.5, voteScreen.y + 0.5);
         votespaceContext.strokeStyle = '#aaaaaa';
         votespaceContext.stroke();
         votespaceContext.closePath();
         drawVotePoint(animatedVote[whichPoint], '#C0C0C0', 4);
         drawVotePoint(targetVote[whichPoint], '#000000', 4);
         drawVotePoint(votePoints[whichPoint], active[whichPoint] ? '#9966cc' : '#6699cc', 6);
      }
      // draw overall outcomes
      var avgOutcome, dsvOutcome, ferOutcome, medOutcome, midOutcome;
      if (displayPerDimMidrangeCheckbox.checked) {
         midOutcome = calcPerDimMidrange(votePoints);
         drawVotePoint(midOutcome, '#000000', 7.5);
         drawVotePoint(midOutcome, '#ff5555', 6);
      }
      if (displayPerDimMedianCheckbox.checked) {
         medOutcome = calcPerDimMedian(votePoints);
         drawVotePoint(medOutcome, '#000000', 7.5);
         drawVotePoint(medOutcome, '#55ff55', 6);
      }
      if (displayFermatWeberCheckbox.checked) {
         ferOutcome = calcFermatWeber(votePoints);
         drawVotePoint(ferOutcome, '#000000', 7.5);
         drawVotePoint(ferOutcome, '#aaff00', 6);
      }
      if (displayAverageCheckbox.checked) {
         avgOutcome = calcAverage(votePoints);
         drawVotePoint(avgOutcome, '#000000', 7.5);
         drawVotePoint(avgOutcome, '#ffaa00', 6);
      }
      if (displayAarDsvCheckbox.checked) {
         dsvOutcome = calcAarDsv(votePoints);
         drawVotePoint(dsvOutcome, '#000000', 7.5);
         drawVotePoint(dsvOutcome, '#ffff00', 6);
      }
      // draw current average outcome
      drawVotePoint(calcAverage(animatedVote), '#ffaa00', 4);

      animatedMovementLimit += 0.001;

      if (!moved) {
         resetAnimation();
         if (allAtOnce || onWhich + 1 === numVoters) {
            var updated = false;
            for (whichPoint = 0; whichPoint < numVoters && !updated; ++whichPoint) {
               for (whichDim = 0; whichDim < targetVote[whichPoint].length; ++whichDim) {
                  if (Math.abs(targetVote[whichPoint][whichDim] - targetVoteLast[whichPoint][whichDim]) > 0.0001) {
                     updated = true;
                  }
               }
            }

            if (!updated) {
               animatedVote = null;
               return;
            } else {
               targetVoteLast = [];
               for (whichPoint = 0; whichPoint < numVoters; ++whichPoint) {
                  targetVoteLast.push([]);
                  for (whichDim = 0; whichDim < targetVote[whichPoint].length; ++whichDim) {
                     targetVoteLast[whichPoint].push(targetVote[whichPoint][whichDim]);
                  }
               }
            }
         }
         if (!allAtOnce) {
            ++onWhich;
            if (onWhich >= numVoters) {
               onWhich = 0;
            }
            if (!iterative) {
               animatedVote = null;
            }
         }
         if (updateFunction) {
            updateFunction(onWhich);
         }
         animationInProgress = true;
         animate = window.setInterval(function () {
            animateElection(iterative, allAtOnce, withLimits, updateFunction, onWhich, timeIncrement);
         }, timeIncrement);
      }
   };

   stopAnimationButton.onclick = function () {
      redrawSpace();
   };

   startAnimationButton.onclick = function () {
      var whichVoter, whichDim, updateFunction, timeIncrement, batchMode = false, iterativeStrategy = true, velocityLimits = false;
      resetAnimation();

      var temp;
      temp = Number(velocityLimitTextbox.value);
      if (temp) {
         animatedMovementLimitBase = temp;
      }
      temp = Number(timeIntervalTextbox.value);
      if (temp) {
         timeIncrementBase = temp;
      }

      timeIncrement = timeIncrementBase;
      animatedVote = null;
      targetVote = [];
      targetVoteLast = [];
      for (whichVoter = 0; whichVoter < numVoters; ++whichVoter) {
         targetVote.push([]);
         targetVoteLast.push([]);
         for (whichDim = 0; whichDim < numDims; ++whichDim) {
            targetVote[whichVoter].push(votePoints[whichVoter][whichDim]);
            targetVoteLast[whichVoter].push(votePoints[whichVoter][whichDim]);
         }
      }
      animationInProgress = true;

      if (animationModeOrderedVLRadio.checked) {
         velocityLimits = true;
      } else if (animationModeBatchVLRadio.checked) {
         velocityLimits = true;
         batchMode = true;
      }

      if (batchMode) {
         updateFunction = strategizeAll;
      } else {
         updateFunction = strategizeIndividual;
      }

      animate = window.setInterval(function () {
         animateElection(iterativeStrategy, batchMode, velocityLimits, updateFunction, 0, timeIncrement);
      }, timeIncrement);
   };

   var randomInt = function () {
      var num = Math.random();
      num *= numVoters;
      num = Math.floor(num);
      return num;
   };

   redrawSpace(); // show initial points
};
