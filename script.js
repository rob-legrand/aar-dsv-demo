/*jslint browser: true, vars: true, plusplus: true, indent: 3 */

var runDemo = function () {
   'use strict';

   var votespaceCanvas = document.getElementById('votespace');
   var votespaceContext = votespaceCanvas.getContext && votespaceCanvas.getContext('2d');
   if (!votespaceContext) {
      document.getElementById('instructions').innerHTML = 'Your browser does not seem to support the <code>&lt;canvas&gt;</code> element correctly.&nbsp; Please use a recent version of a standards-compliant browser such as <a href="http://www.opera.com/">Opera</a>, <a href="http://www.google.com/chrome/">Chrome</a> or <a href="http://www.getfirefox.com/">Firefox</a>.';
      window.alert('Your browser does not seem to support the <canvas> element correctly.\nPlease use a recent version of a standards-compliant browser such as Opera, Chrome or Firefox.');
      return;
   }

   var maxNumVoters = 9;
   var hypercubeBottomY = 570;
   var hypercubeLeftX = 70;
   var hypercubeRightX = 570;
   var hypercubeTopY = 70;
   var lineSegmentLeftX = hypercubeLeftX;
   var lineSegmentRightX = hypercubeRightX;
   var lineSegmentY = (hypercubeBottomY + hypercubeTopY) / 2;
   var simplexBottomY = 620;
   var simplexLeftX = 20;
   var simplexRightX = 540;
   var simplexTopY = 20;
   var simplexMiddleY = (simplexBottomY + simplexTopY) / 2;
   var selectNElement = document.getElementById('select-n');
   var numVoters = parseInt(selectNElement.options[selectNElement.selectedIndex].value, 10);
   var lineSegmentRadio = document.getElementById('use-line-segment');
   var hypercubeRadio = document.getElementById('use-hypercube');
   var simplexRadio = document.getElementById('use-simplex');
   var drawGridLinesCheckbox = document.getElementById('draw-grid-lines');
   var numDims;
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
   var animationStartSincereRadio = document.getElementById('start-sincere');
   var animationStartRandomRadio = document.getElementById('start-random');
   var animationStartSameCornerRadio = document.getElementById('start-in-zero-corner');
   var animationStartNearCornerRadio = document.getElementById('start-in-nearest-corner');

   var lockVotesCheckbox = document.getElementById('lock-votes');
   lockVotesCheckbox.checked = false;
   var moveStrategicCheckbox = document.getElementById('move-strategic');
   moveStrategicCheckbox.checked = false;
   var automaticStrategyCheckbox = document.getElementById('automatic-strategy');
   var showStrategicOutcomesCheckbox = document.getElementById('show-strategic-outcomes');
   var showOutcomeBorderCheckbox = document.getElementById('show-outcome-border');
   var resetStrategicButton = document.getElementById('reset-strategic-points');
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

   var strategySystemOptions = document.getElementsByName('strategy-system-options');

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
   var updateVotepointsButton = document.getElementById('update-votepoints');

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
            votePointCells[whichDim][whichRow].style.display = whichDim < numDims ? 'table-cell' : 'none';
         }
      }
   };
   fixNumDims();

   // the voters' voted points
   var votePoints = []; // each votePoints[whichPoint][whichDimension] must be between 0 and 1

   // points used to run demo
   var strategicPoints = [];
   var animatedVote, animate, animationInProgress = false, animatedMovementLimit, animatedMovementLimitBase = 0.01, timeIncrementBase = 50, votesLocked = false;
   var targetVote, targetVoteLast;
   var updateInProgress, updateRow;

   timeIntervalTextbox.value = timeIncrementBase;
   velocityLimitTextbox.value = animatedMovementLimitBase;

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
         return {x: simplexRightX * (vote[0] + vote[1]) + simplexLeftX * vote[2],
                 y: simplexBottomY * vote[0] + simplexTopY * vote[1] + simplexMiddleY * vote[2]};
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
         return [((screen.x - simplexLeftX) / (simplexRightX - simplexLeftX) + (screen.y - simplexMiddleY) / (simplexBottomY - simplexMiddleY)) / 2,
                 ((screen.x - simplexLeftX) / (simplexRightX - simplexLeftX) + (simplexMiddleY - screen.y) / (simplexMiddleY - simplexTopY)) / 2,
                 (simplexRightX - screen.x) / (simplexRightX - simplexLeftX)];
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

   var projectVotePointToLargerSpace = function (point, spaceSize) {
      var surplus;
      if (!point || !point.length) {
         return null;
      if (typeof spaceSize !== 'number' || spaceSize < 0) {
         spaceSize = 0;
      }
      } else if (point.length === 1) {
         return [Math.min(Math.max(point[0], -spaceSize), spaceSize + 1)];
      } else if (point.length === 2) {
         return [Math.min(Math.max(point[0], -spaceSize), spaceSize + 1), Math.min(Math.max(point[1], -spaceSize), spaceSize + 1)];
      } else if (point.length === 3) {
         if (spaceSize < 1) {
            return projectVotePointToSpace(point);
         }
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
         if (numDims <= 2) {
            for (whichDim = 0; whichDim < numDims; ++whichDim) {
               votePoints[whichPoint].push(Math.floor(Math.random() * 100001) / 100000);
            }
            votePoints[whichPoint] = projectVotePointToSpace(votePoints[whichPoint]);
         } else if (numDims === 3) {
            do {
               votePoints[whichPoint][0] = 1;
               for (whichDim = 1; whichDim < numDims; ++whichDim) {
                  votePoints[whichPoint][whichDim] = Math.floor(Math.random() * 100001) / 100000;
                  votePoints[whichPoint][0] -= votePoints[whichPoint][whichDim];
               }
            } while (votePoints[whichPoint][0] < 0);
         }
      }
      while (votePoints.length > numVoters) {
         votePoints.pop();
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
      if (numDims !== 3) {
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

   // find AAR DSV outcome of input points with larger internal votespace
   var calcAarDsvGiveMeAName = function (points, votespaceSize) {
      var numPoints = points.length;
      var outcome = [];
      var newStrategicPoint, somethingChanged, sortedPoints, strategicPoints, whichDim, whichPoint, whichOtherPoint;
      if (numDims !== 3) {
         // internal votespace is -votespaceSize <= x <= votespaceSize + 1 in each dimension
         for (whichDim = 0; whichDim < numDims; ++whichDim) {
            sortedPoints = [];
            for (whichPoint = 0; whichPoint < numPoints; ++whichPoint) {
               sortedPoints.push(points[whichPoint][whichDim]);
            }
            for (whichPoint = 1; whichPoint < numPoints; ++whichPoint) {
               sortedPoints.push(whichPoint * (2 * votespaceSize + 1) / numPoints - votespaceSize);
            }
            sortedPoints.sort(smallestToLargest);
            outcome.push(sortedPoints[numPoints - 1]);
         }
         return projectVotePointToSpace(outcome);
      } else {
         // if votespaceSize < 1, internal votespace is x >= 0, y >= 0, z >= 0
         // if votespaceSize >= 1, internal votespace is x <= votespaceSize, y <= votespaceSize, z <= votespaceSize
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
               newStrategicPoint = projectVotePointToLargerSpace(newStrategicPoint, votespaceSize);
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

   // add references to associated functions and colors to each strategy system option
   strategySystemOptions[0].func = calcPerDimMidrange;
   strategySystemOptions[0].color = '#ff5555';
   strategySystemOptions[1].func = calcAverage;
   strategySystemOptions[1].color = '#ffaa00';
   strategySystemOptions[2].func = calcAarDsv;
   strategySystemOptions[2].color = '#ffff00';
   strategySystemOptions[3].func = calcFermatWeber;
   strategySystemOptions[3].color = '#aaff00';
   strategySystemOptions[4].func = calcPerDimMedian;
   strategySystemOptions[4].color = '#55ff55';

   // calculate strategicPoints at Average equilibrium
   var dsvAverage = function (onWhich) {
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
            if (whichPoint !== onWhich) {
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

   var findLimits = function (votePoints, outcomeFunction, focus) {
      var whichPoint, whichDim, copyArray = [], points = [], simplexIncrement = 0.02, hypercubeIncrement = 0.05;
      if (!focus) {
         focus = 0;
      }
      for (whichPoint = 0; whichPoint < numVoters; ++whichPoint) {
         copyArray.push([]);
         for (whichDim = 0; whichDim < numDims; ++whichDim) {
            if (whichPoint === focus) {
               copyArray[whichPoint].push(0);
            } else {
               copyArray[whichPoint].push(votePoints[whichPoint][whichDim]);
            }
         }
      }

      if (simplexRadio.checked) {
         for (copyArray[focus][0] = 1; copyArray[focus][0] > 0; copyArray[focus][0] -= simplexIncrement, copyArray[focus][2] += simplexIncrement) {
            points.push(outcomeFunction(copyArray));
         }
         copyArray[focus][0] = 0;
         copyArray[focus][2] = 0;
         for (copyArray[focus][2] = 1; copyArray[focus][2] > 0; copyArray[focus][2] -= simplexIncrement, copyArray[focus][1] += simplexIncrement) {
            points.push(outcomeFunction(copyArray));
         }
         copyArray[focus][1] = 0;
         copyArray[focus][2] = 0;
         for (copyArray[focus][1] = 1; copyArray[focus][1] > 0; copyArray[focus][1] -= simplexIncrement, copyArray[focus][0] += simplexIncrement) {
            points.push(outcomeFunction(copyArray));
         }
      } else {
         points.push(outcomeFunction(copyArray));
         for (whichDim = 0; whichDim < numDims; ++whichDim) {
            for (copyArray[focus][whichDim] = 0; copyArray[focus][whichDim] < 1; copyArray[focus][whichDim] += hypercubeIncrement) {
               points.push(outcomeFunction(copyArray));
            }
            copyArray[focus] = projectVotePointToSpace(copyArray[focus]);
         }
         for (whichDim = 0; whichDim < numDims; ++whichDim) {
            for (copyArray[focus][whichDim] = 1; copyArray[focus][whichDim] > 0; copyArray[focus][whichDim] -= hypercubeIncrement) {
               points.push(outcomeFunction(copyArray));
            }
            copyArray[focus] = projectVotePointToSpace(copyArray[focus]);
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

   var isOutcomeCloserByDim = function (idealPoint, newOutcome, oldOutcome) {
      var whichDim, differenceNew, differenceOld, closer = [];

      for (whichDim = 0; whichDim < numDims; ++whichDim) {
         differenceNew = idealPoint[whichDim] - newOutcome[whichDim];
         differenceOld = idealPoint[whichDim] - oldOutcome[whichDim];

         if (differenceNew === differenceOld) {
            closer.push(0);
         } else if (differenceNew > 0 && differenceOld > 0) {
            if (differenceNew < differenceOld) {
               closer.push(1);
            } else {
               closer.push(-1);
            }
         } else if (differenceNew < 0 && differenceOld < 0) {
            if (differenceNew > differenceOld) {
               closer.push(1);
            } else {
               closer.push(-1);
            }
         } else {
            closer.push(NaN);
         }
      }
      return closer;
   };

   var isOutcomeCloserByMetric = function (idealPoint, newOutcome, oldOutcome, metric) {
      // metric === 1: Manhattan distance
      // metric === 2: Euclidean distance
      // metric === Number.POSITIVE_INFINITY: Chebyshev distance
      // returns 1 if newOutcome is closer to idealPoint than oldOutcome
      var whichDim, differenceNew, differenceOld;

      if (isFinite(metric)) {
         differenceNew = 0;
         differenceOld = 0;
         for (whichDim = 0; whichDim < numDims; ++whichDim) {
            differenceNew += Math.pow(Math.abs(newOutcome[whichDim] - idealPoint[whichDim]), metric);
            differenceOld += Math.pow(Math.abs(oldOutcome[whichDim] - idealPoint[whichDim]), metric);
         }
         differenceNew = Math.pow(differenceNew, 1 / metric);
         differenceOld = Math.pow(differenceOld, 1 / metric);
         if (differenceNew < differenceOld) {
            return 1;
         } else if (differenceNew === differenceOld) {
            return 0;
         } else {
            return -1;
         }
      } else {
         differenceNew = 0;
         differenceOld = 0;
         for (whichDim = 0; whichDim < numDims; ++whichDim) {
            differenceNew = Math.max(Math.abs(newOutcome[whichDim] - idealPoint[whichDim]), differenceNew);
            differenceOld = Math.max(Math.abs(oldOutcome[whichDim] - idealPoint[whichDim]), differenceOld);
         }
         if (differenceNew < differenceOld) {
            return 1;
         } else if (differenceNew === differenceOld) {
            return 0;
         } else {
            return -1;
         }
      }
   };

   var clearSpace = function () {
      var point, whichVoter;
      var gridLineColor = '#eeeeee';

      // fill canvas background to match page background
      votespaceContext.fillStyle = '#ddeeff';
      votespaceContext.fillRect(0, 0, votespaceCanvas.width, votespaceCanvas.height);

      // draw votespace interior, grid lines, boundary
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
         if (drawGridLinesCheckbox.checked) {
            for (whichVoter = 0; whichVoter < numVoters; ++whichVoter) {
               votespaceContext.beginPath();
               point = toScreenCoords([votePoints[whichVoter][0], 0]);
               votespaceContext.moveTo(point.x + 0.5, point.y + 0.5);
               point = toScreenCoords([votePoints[whichVoter][0], 1]);
               votespaceContext.lineTo(point.x + 0.5, point.y + 0.5);
               votespaceContext.strokeStyle = gridLineColor;
               votespaceContext.stroke();
               votespaceContext.beginPath();
               point = toScreenCoords([0, votePoints[whichVoter][1]]);
               votespaceContext.moveTo(point.x + 0.5, point.y + 0.5);
               point = toScreenCoords([1, votePoints[whichVoter][1]]);
               votespaceContext.lineTo(point.x + 0.5, point.y + 0.5);
               votespaceContext.strokeStyle = gridLineColor;
               votespaceContext.stroke();
            }
            for (whichVoter = 1; whichVoter < numVoters; ++whichVoter) {
               votespaceContext.beginPath();
               point = toScreenCoords([whichVoter / numVoters, 0]);
               votespaceContext.moveTo(point.x + 0.5, point.y + 0.5);
               point = toScreenCoords([whichVoter / numVoters, 1]);
               votespaceContext.lineTo(point.x + 0.5, point.y + 0.5);
               votespaceContext.strokeStyle = gridLineColor;
               votespaceContext.stroke();
               votespaceContext.beginPath();
               point = toScreenCoords([0, whichVoter / numVoters]);
               votespaceContext.moveTo(point.x + 0.5, point.y + 0.5);
               point = toScreenCoords([1, whichVoter / numVoters]);
               votespaceContext.lineTo(point.x + 0.5, point.y + 0.5);
               votespaceContext.strokeStyle = gridLineColor;
               votespaceContext.stroke();
            }
         }
         votespaceContext.beginPath();
         votespaceContext.moveTo(hypercubeLeftX + 0.5, hypercubeTopY + 0.5);
         votespaceContext.lineTo(hypercubeRightX + 0.5, hypercubeTopY + 0.5);
         votespaceContext.lineTo(hypercubeRightX + 0.5, hypercubeBottomY + 0.5);
         votespaceContext.lineTo(hypercubeLeftX + 0.5, hypercubeBottomY + 0.5);
         votespaceContext.lineTo(hypercubeLeftX + 0.5, hypercubeTopY + 0.5);
         votespaceContext.strokeStyle = '#000000';
         votespaceContext.stroke();
      } else if (simplexRadio.checked) {
         votespaceContext.beginPath();
         votespaceContext.moveTo(simplexLeftX + 0.5, simplexMiddleY + 0.5);
         votespaceContext.lineTo(simplexRightX + 0.5, simplexTopY + 0.5);
         votespaceContext.lineTo(simplexRightX + 0.5, simplexBottomY + 0.5);
         votespaceContext.lineTo(simplexLeftX + 0.5, simplexMiddleY + 0.5);
         votespaceContext.fillStyle = '#ffffff';
         votespaceContext.fill();
         if (drawGridLinesCheckbox.checked) {
            for (whichVoter = 0; whichVoter < numVoters; ++whichVoter) {
               votespaceContext.beginPath();
               point = toScreenCoords(votePoints[whichVoter]);
               votespaceContext.moveTo(point.x + 0.5, point.y + 0.5);
               point = toScreenCoords(votePoints[whichVoter][0] > votePoints[whichVoter][1] ? [votePoints[whichVoter][0] - votePoints[whichVoter][1], 0, votePoints[whichVoter][2] + 2 * votePoints[whichVoter][1]] : [0, votePoints[whichVoter][1] - votePoints[whichVoter][0], votePoints[whichVoter][2] + 2 * votePoints[whichVoter][0]]);
               votespaceContext.lineTo(point.x + 0.5, point.y + 0.5);
               votespaceContext.strokeStyle = gridLineColor;
               votespaceContext.stroke();
               votespaceContext.beginPath();
               point = toScreenCoords(votePoints[whichVoter]);
               votespaceContext.moveTo(point.x + 0.5, point.y + 0.5);
               point = toScreenCoords(votePoints[whichVoter][0] > votePoints[whichVoter][2] ? [votePoints[whichVoter][0] - votePoints[whichVoter][2], votePoints[whichVoter][1] + 2 * votePoints[whichVoter][2], 0] : [0, votePoints[whichVoter][1] + 2 * votePoints[whichVoter][0], votePoints[whichVoter][2] - votePoints[whichVoter][0]]);
               votespaceContext.lineTo(point.x + 0.5, point.y + 0.5);
               votespaceContext.strokeStyle = gridLineColor;
               votespaceContext.stroke();
               votespaceContext.beginPath();
               point = toScreenCoords(votePoints[whichVoter]);
               votespaceContext.moveTo(point.x + 0.5, point.y + 0.5);
               point = toScreenCoords(votePoints[whichVoter][1] > votePoints[whichVoter][2] ? [votePoints[whichVoter][0] + 2 * votePoints[whichVoter][2], votePoints[whichVoter][1] - votePoints[whichVoter][2], 0] : [votePoints[whichVoter][0] + 2 * votePoints[whichVoter][1], 0, votePoints[whichVoter][2] - votePoints[whichVoter][1]]);
               votespaceContext.lineTo(point.x + 0.5, point.y + 0.5);
               votespaceContext.strokeStyle = gridLineColor;
               votespaceContext.stroke();
            }
            for (whichVoter = 1; whichVoter < numVoters; ++whichVoter) {
               votespaceContext.beginPath();
               point = toScreenCoords([whichVoter / numVoters, 1 - whichVoter / numVoters, 0]);
               votespaceContext.moveTo(point.x + 0.5, point.y + 0.5);
               point = toScreenCoords([whichVoter / numVoters, 0, 1 - whichVoter / numVoters]);
               votespaceContext.lineTo(point.x + 0.5, point.y + 0.5);
               votespaceContext.strokeStyle = gridLineColor;
               votespaceContext.stroke();
               votespaceContext.beginPath();
               point = toScreenCoords([1 - whichVoter / numVoters, whichVoter / numVoters, 0]);
               votespaceContext.moveTo(point.x + 0.5, point.y + 0.5);
               point = toScreenCoords([0, whichVoter / numVoters, 1 - whichVoter / numVoters]);
               votespaceContext.lineTo(point.x + 0.5, point.y + 0.5);
               votespaceContext.strokeStyle = gridLineColor;
               votespaceContext.stroke();
               votespaceContext.beginPath();
               point = toScreenCoords([1 - whichVoter / numVoters, 0, whichVoter / numVoters]);
               votespaceContext.moveTo(point.x + 0.5, point.y + 0.5);
               point = toScreenCoords([0, 1 - whichVoter / numVoters, whichVoter / numVoters]);
               votespaceContext.lineTo(point.x + 0.5, point.y + 0.5);
               votespaceContext.strokeStyle = gridLineColor;
               votespaceContext.stroke();
            }
         }
         votespaceContext.beginPath();
         votespaceContext.moveTo(simplexLeftX + 0.5, simplexMiddleY + 0.5);
         votespaceContext.lineTo(simplexRightX + 0.5, simplexTopY + 0.5);
         votespaceContext.lineTo(simplexRightX + 0.5, simplexBottomY + 0.5);
         votespaceContext.lineTo(simplexLeftX + 0.5, simplexMiddleY + 0.5);
         votespaceContext.strokeStyle = '#000000';
         votespaceContext.stroke();
      } else {
         return false;
      }
      return true;
   };

   var redrawSpace = function (pointBeingDragged) {
      var whichDim, whichPoint, limitPoints, outcomeFunction, outcomeBorderColor;
      var nonFocusColor = '#6699cc';
      var focusColor = '#9966cc';
      var nonFocusStrategicVoteColor = '#000000';
      var focusStrategicVoteColor = '#000000';
      resetAnimation();

      if (!clearSpace()) {
         return;
      }
      if (lockVotesCheckbox.checked) {
         nonFocusStrategicVoteColor = '#aaaaaa';
         nonFocusColor = '#aaaaaa';
         if (moveStrategicCheckbox.checked) {
            focusStrategicVoteColor = focusColor;
            focusColor = '#6699cc';
         }
      }

      // draw limits of manipulation for voter 1 (i.e. votePoints[0]);
      // now uses radio buttons for selection instead of checkboxes
      if (showOutcomeBorderCheckbox.checked) {
         for (whichPoint = 0; whichPoint < strategySystemOptions.length; ++whichPoint) {
            if (strategySystemOptions[whichPoint].checked) {
               outcomeFunction = strategySystemOptions[whichPoint].func;
               outcomeBorderColor = strategySystemOptions[whichPoint].color;
            }
         }
         limitPoints = findLimits(votePoints, outcomeFunction);
         drawLimits(limitPoints, outcomeBorderColor);
      }

      // draw lines from sincere points to strategic votes
      if (automaticStrategyCheckbox.checked || moveStrategicCheckbox.checked || showStrategicOutcomesCheckbox.checked) {
         if (moveStrategicCheckbox.checked && lockVotesCheckbox.checked && automaticStrategyCheckbox.checked) {
            dsvAverage(0);
         } else if (!moveStrategicCheckbox.checked && automaticStrategyCheckbox.checked) {
            dsvAverage();
         }

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
         drawVotePoint(votePoints[whichPoint], pointBeingDragged === whichPoint ? focusColor : nonFocusColor, 6);
         votePointRows[whichPoint].style.display = 'table-row';
         // don't update textboxes while update is pending
         if (whichPoint !== updateInProgress) {
            for (whichDim = 0; whichDim < numDims; ++whichDim) {
               votePointTextboxes[whichPoint][whichDim].value = votePoints[whichPoint][whichDim].toFixed(5);
            }
         }
      }
      for (whichPoint = numVoters; whichPoint < maxNumVoters; ++whichPoint) {
         votePointRows[whichPoint].style.display = 'none';
      }
      // make sure focus vote is visible
      if (lockVotesCheckbox.checked) {
         drawVotePoint(votePoints[0], focusColor, 6);
      }

      // draw outcome points
      var avgOutcome, dsvOutcome, ferOutcome, medOutcome, midOutcome;
      if (displayPerDimMidrangeCheckbox.checked) {
         midOutcome = calcPerDimMidrange(votePoints);
         drawVotePoint(midOutcome, '#000000', 7);
      }
      if (displayPerDimMedianCheckbox.checked) {
         medOutcome = calcPerDimMedian(votePoints);
         drawVotePoint(medOutcome, '#000000', 7);
      }
      if (displayFermatWeberCheckbox.checked) {
         ferOutcome = calcFermatWeber(votePoints);
         drawVotePoint(ferOutcome, '#000000', 7);
      }
      if (displayAverageCheckbox.checked) {
         avgOutcome = calcAverage(votePoints);
         drawVotePoint(avgOutcome, '#000000', 7);
      }
      if (displayAarDsvCheckbox.checked) {
         dsvOutcome = calcAarDsv(votePoints);
         drawVotePoint(dsvOutcome, '#000000', 7);
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
      if (displayPerDimMidrangeCheckbox.checked) {
         drawVotePoint(midOutcome, '#000000', 1);
      }
      if (displayPerDimMedianCheckbox.checked) {
         drawVotePoint(medOutcome, '#000000', 1);
      }
      if (displayFermatWeberCheckbox.checked) {
         drawVotePoint(ferOutcome, '#000000', 1);
      }
      if (displayAverageCheckbox.checked) {
         drawVotePoint(avgOutcome, '#000000', 1);
      }
      if (displayAarDsvCheckbox.checked) {
         drawVotePoint(dsvOutcome, '#000000', 1);
      }

      // draw strategic votes and equilibrium Average outcome
      if (automaticStrategyCheckbox.checked || moveStrategicCheckbox.checked || showStrategicOutcomesCheckbox.checked) {
         for (whichPoint = 1; whichPoint < numVoters; ++whichPoint) {
            drawVotePoint(strategicPoints[whichPoint], nonFocusStrategicVoteColor , 4);
         }
         drawVotePoint(strategicPoints[0], focusStrategicVoteColor, 4);
         if (showStrategicOutcomesCheckbox.checked) {
            if (typeof pointBeingDragged === 'number' && pointBeingDragged >= 0 && outcomeFunction && moveStrategicCheckbox.checked) {
               var focalSincerePoints = [];
               for (whichPoint = 0; whichPoint < numVoters; ++whichPoint) {
                  focalSincerePoints.push([]);
                  for (whichDim = 0; whichDim < numDims; ++whichDim) {
                     if (whichPoint === pointBeingDragged) {
                        focalSincerePoints[whichPoint].push(votePoints[whichPoint][whichDim]);
                     } else {
                        focalSincerePoints[whichPoint].push(strategicPoints[whichPoint][whichDim]);
                     }
                  }
               }
               if (showOutcomeBorderCheckbox.checked) {
                  limitPoints = findLimits(focalSincerePoints, outcomeFunction, pointBeingDragged);
                  drawLimits(limitPoints, '#aaaaaa');
               }
               drawVotePoint(outcomeFunction(focalSincerePoints), '#aaaaaa', 6);
               var closerByDim = isOutcomeCloserByDim(votePoints[pointBeingDragged], outcomeFunction(strategicPoints), outcomeFunction(focalSincerePoints));
               for (whichDim = 0; whichDim < numDims; ++whichDim) {
                  if (closerByDim[whichDim] === 0) {
                     closerByDim[whichDim] = 'No change';
                  } else if (closerByDim[whichDim] === 1) {
                     closerByDim[whichDim] = 'Closer to ideal';
                  } else if (closerByDim[whichDim] === -1) {
                     closerByDim[whichDim] = 'Further from ideal';
                  } else {
                     closerByDim[whichDim] = 'Overshot ideal';
                  }
               }
               document.getElementById('aar-dsv-output').innerHTML = 'x: ' + closerByDim[0];
               if (numDims > 1) {
                  document.getElementById('aar-dsv-output').innerHTML += ', y: ' + closerByDim[1];
                  if (numDims > 2) {
                     document.getElementById('aar-dsv-output').innerHTML += ', z: ' + closerByDim[2];
                  }
               }
               var closerByEuclidean = isOutcomeCloserByMetric(votePoints[pointBeingDragged], outcomeFunction(strategicPoints), outcomeFunction(focalSincerePoints), 2);
               if (closerByEuclidean === 0) {
                  document.getElementById('aar-dsv-output').innerHTML += '; by Euclidean distance: ' + 'No change';
               } else if (closerByEuclidean === 1) {
                  document.getElementById('aar-dsv-output').innerHTML += '; by Euclidean distance: ' + 'Closer to ideal';
               } else if (closerByEuclidean === -1) {
                  document.getElementById('aar-dsv-output').innerHTML += '; by Euclidean distance: ' + 'Further from ideal';
               }
            }
            if (displayPerDimMidrangeCheckbox.checked) {
               midOutcome = calcPerDimMidrange(strategicPoints);
               drawVotePoint(midOutcome, '#000000', 4);
            }
            if (displayPerDimMedianCheckbox.checked) {
               medOutcome = calcPerDimMedian(strategicPoints);
               drawVotePoint(medOutcome, '#000000', 4);
            }
            if (displayFermatWeberCheckbox.checked) {
               ferOutcome = calcFermatWeber(strategicPoints);
               drawVotePoint(ferOutcome, '#000000', 4);
            }
            if (displayAverageCheckbox.checked) {
               avgOutcome = calcAverage(strategicPoints);
               drawVotePoint(avgOutcome, '#000000', 4);
            }
            if (displayAarDsvCheckbox.checked) {
               dsvOutcome = calcAarDsv(strategicPoints);
               drawVotePoint(dsvOutcome, '#000000', 4);
            }
            if (displayPerDimMidrangeCheckbox.checked) {
               drawVotePoint(midOutcome, '#ff5555', 3.5);
            }
            if (displayPerDimMedianCheckbox.checked) {
               drawVotePoint(medOutcome, '#55ff55', 3.5);
            }
            if (displayFermatWeberCheckbox.checked) {
               drawVotePoint(ferOutcome, '#aaff00', 3.5);
            }
            if (displayAverageCheckbox.checked) {
               drawVotePoint(avgOutcome, '#ffaa00', 3.5);
            }
            if (displayAarDsvCheckbox.checked) {
               drawVotePoint(dsvOutcome, '#ffff00', 3.5);
            }
         }
      }
   };

   // reset strategic to sincere points
   var resetStrategic = function () {
      var whichPoint, whichDim;
      strategicPoints = [];
      for (whichPoint = 0; whichPoint < numVoters; ++whichPoint) {
         strategicPoints.push([]);
         for (whichDim = 0; whichDim < numDims; ++whichDim) {
            strategicPoints[whichPoint].push(votePoints[whichPoint][whichDim]);
         }
      }
   };

   resetStrategicButton.addEventListener('click', function () {
      resetStrategic();
      redrawSpace();
   }, false);

   // updates point using all data in its table row; called whenever a table row registers a change
   var getPointFromTextboxes = function (num) {
      var input, whichDim;
      for (whichDim = 0; whichDim < numDims; ++whichDim) {
         input = parseFloat(votePointTextboxes[num][whichDim].value, 10);
         if (!isNaN(input)) {
            votePoints[num][whichDim] = input;
         }
      }
      votePoints[num] = projectVotePointToSpace(votePoints[num]);
      updateInProgress = null;
      redrawSpace();
   };

   var focusOn = function (which) {
      drawVotePoint(votePoints[which], '#9966cc', 6);
      if (updateInProgress === which) {
         window.clearTimeout(updateRow);
      }
   };

   var focusOff = function (which) {
      // really hacky, but makes sure pending updates take place when they should;
      // pending updates would otherwise not take place when moving between entries in a row where
      // the last entry moved to was not changed
      if (updateInProgress === which) {
         window.clearTimeout(updateRow);
         updateRow = window.setTimeout(function () {
            getPointFromTextboxes(updateInProgress);
         }, 50);
      }
      if (!animationInProgress) {
         redrawSpace();
      }
   };

   // anonymous function to add focus handlers for textboxes
   (function () {
      var num, num2;
      for (num = 0; num < votePointTextboxes.length; ++num) {
         for (num2 = 0; num2 < votePointTextboxes[num].length; ++num2) {
            votePointTextboxes[num][num2].addEventListener('focus', function () {
               focusOn(Number(this.id[9]));
            }, false);
            votePointTextboxes[num][num2].addEventListener('blur', function () {
               focusOff(Number(this.id[9]));
            }, false);
            votePointTextboxes[num][num2].disabled = false;
         }
      }
   }());

   (function () {
      var num;
      for (num = 0; num < votePointRows.length; ++num) {
         // highlight point corresponding to row clicked on
         votePointRows[num].addEventListener('mousedown', function () {
            // make sure not to interfere with focus and blur handlers
            if (document.activeElement.id.substring(0, 9) !== 'votepoint') {
               drawVotePoint(votePoints[this.id[9]],'#9966cc', 6);
            }
         } , false);
         votePointRows[num].addEventListener('mouseup', function () {
            if (document.activeElement.id.substring(0, 9) !== 'votepoint' && !animationInProgress) {
               setTimeout(function () {
                  redrawSpace();
               }, 200);
            }
         }, false);
         // update points based on user input
         votePointRows[num].addEventListener('change', function () {
            // updateInProgress used globally to tell which row has a change pending
            updateInProgress = Number(this.id[9]);
            // updateRow used globally to clear timeout when needed; reset if element in same row gains focus (see function focusOn)
            updateRow = window.setTimeout(function () {
               getPointFromTextboxes(updateInProgress);
            }, 50);
         }, false);
      }
   }());

   moveStrategicCheckbox.addEventListener('change', function () {
      var whichPoint, whichDim;
      if (strategicPoints.length !== numVoters || !automaticStrategyCheckbox.checked && !showStrategicOutcomesCheckbox.checked) {
         resetStrategic();
      }
      redrawSpace();
   }, false);

   lockVotesCheckbox.addEventListener('change', function () {
      var num, num2;
      if (this.checked) {
         for (num = 1; num < votePointTextboxes.length; ++num) {
            for (num2 = 0; num2 < votePointTextboxes[num].length; ++num2) {
               votePointTextboxes[num][num2].disabled = true;
            }
         }
         votesLocked = true;
         redrawSpace();
      } else {
         for (num = 1; num < votePointTextboxes.length; ++num) {
            for (num2 = 0; num2 < votePointTextboxes[num].length; ++num2) {
               votePointTextboxes[num][num2].disabled = false;
            }
         }
         votesLocked = false;
         redrawSpace();
      }
   }, false);

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

   automaticStrategyCheckbox.onchange = function () {
      redrawSpace();
   };

   drawGridLinesCheckbox.onchange = function () {
      redrawSpace();
   };

   document.getElementById('strategy-system-options-radio').onchange = redrawSpace;
   displayAarDsvCheckbox.onchange = redrawSpace;
   displayAverageCheckbox.onchange = redrawSpace;
   displayFermatWeberCheckbox.onchange = redrawSpace;
   displayPerDimMedianCheckbox.onchange = redrawSpace;
   displayPerDimMidrangeCheckbox.onchange = redrawSpace;
   showOutcomeBorderCheckbox.addEventListener('change', redrawSpace, false);
   showStrategicOutcomesCheckbox.addEventListener('change', redrawSpace, false);

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
            if (votesLocked && whichPoint > 0) {
               return closestPoint;
            }
            screen = toScreenCoords(moveStrategicCheckbox.checked ? strategicPoints[whichPoint] : votePoints[whichPoint]);
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
            var whichDim, vote;
            if (moveStrategicCheckbox.checked) {
               strategicPoints[whichPoint] = projectVotePointToSpace(toVoteDims(getMouse(ev)));
            } else {
               votePoints[whichPoint] = projectVotePointToSpace(toVoteDims(getMouse(ev)));
            }
            for (whichDim = 0; whichDim < numDims; ++whichDim) {
               votePointTextboxes[whichPoint][whichDim].value = votePoints[whichPoint][whichDim].toFixed(5);
            }
            document.getElementById('click-output').innerHTML = 'x = ' + votePoints[whichPoint][0].toFixed(5);
            if (numDims > 1) {
               document.getElementById('click-output').innerHTML += ', y = ' + votePoints[whichPoint][1].toFixed(5);
               if (numDims > 2) {
                  document.getElementById('click-output').innerHTML += ', z = ' + votePoints[whichPoint][2].toFixed(5);
               }
            }
            redrawSpace(whichPoint);
         };
         document.onmousemove(ev); // immediately show that the point has been selected
         document.onmouseup = function (ev) {
            document.onmousemove = null; // stop moving point around
            document.onmouseup = function (ev) {
               document.onmousemove = null; // stop moving point around (in case it gets sticky)
            };
            redrawSpace();
         };
      } else {
         var testResult = testInequalities(projectVotePointToSpace(toVoteDims(getMouse(ev))));
         document.getElementById('click-output').innerHTML = testResult.dimSize[0] < 0 ? 'x too small' : testResult.dimSize[0] > 0 ? 'x too big' : 'x just right';
         if (numDims > 1) {
            document.getElementById('click-output').innerHTML += '; ' + (testResult.dimSize[1] < 0 ? 'y too small' : testResult.dimSize[1] > 0 ? 'y too big' : 'y just right');
            if (numDims > 2) {
               document.getElementById('click-output').innerHTML += '; ' + (testResult.dimSize[2] < 0 ? 'z too small' : testResult.dimSize[2] > 0 ? 'z too big' : 'z just right');
            }
         }
      }
      return true; // allow the default event handler to be called
   };

   document.getElementById('randomize-points').onclick = function () {
      votePoints = [];
      strategicPoints = [];
      addOrRemoveVotePoints();
      redrawSpace();
      return false; // don't do anything else because of the click
   };

   // makes changes to global targetVote array; used for voter-by-voter modes in animateElection
   var strategizeIndividual = function (onWhich, checked) {
      if (onWhich > numVoters || targetVote.length !== numVoters) {
         return;
      }

      var outcomeFunction = strategySystemOptions[checked].func;
      var outcome = outcomeFunction(targetVote);
      var whichPoint, whichDim, calculatedTotal, tempPoint, newOutcome, copy = [];
      if (checked === 1) {
         for (whichDim = 0; whichDim < numDims; ++whichDim) {
            if (votePoints[onWhich][whichDim] !== outcome[whichDim]) {
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
      } else {
         // look at points along edges
         var simplexIncrement = 0.02, hypercubeIncrement = 0.05;
         for (whichPoint = 0; whichPoint < numVoters; ++whichPoint) {
            copy.push([]);
            for (whichDim = 0; whichDim < numDims; ++whichDim) {
               if (whichPoint === onWhich) {
                  copy[whichPoint].push(0);
               } else {
                  copy[whichPoint].push(targetVote[whichPoint][whichDim]);
               }
            }
         }

         if (simplexRadio.checked) {
            for (copy[onWhich][0] = 1; copy[onWhich][0] > 0; copy[onWhich][0] -= simplexIncrement, copy[onWhich][2] += simplexIncrement) {
               newOutcome = outcomeFunction(copy);
               if (isOutcomeCloserByMetric(votePoints[onWhich], newOutcome, outcome, 2) === 1) {
                  outcome = newOutcome;
                  targetVote[onWhich] = projectVotePointToSpace(copy[onWhich]);
               }
            }
            copy[onWhich][0] = 0;
            copy[onWhich][2] = 0;
            for (copy[onWhich][2] = 1; copy[onWhich][2] > 0; copy[onWhich][2] -= simplexIncrement, copy[onWhich][1] += simplexIncrement) {
               newOutcome = outcomeFunction(copy);
               if (isOutcomeCloserByMetric(votePoints[onWhich], newOutcome, outcome, 2) === 1) {
                  outcome = newOutcome;
                  targetVote[onWhich] = projectVotePointToSpace(copy[onWhich]);
               }
            }
            copy[onWhich][1] = 0;
            copy[onWhich][2] = 0;
            for (copy[onWhich][1] = 1; copy[onWhich][1] > 0; copy[onWhich][1] -= simplexIncrement, copy[onWhich][0] += simplexIncrement) {
               newOutcome = outcomeFunction(copy);
               if (isOutcomeCloserByMetric(votePoints[onWhich], newOutcome, outcome, 2) === 1) {
                  outcome = newOutcome;
                  targetVote[onWhich] = projectVotePointToSpace(copy[onWhich]);
               }
            }
         } else {
            for (whichDim = 0; whichDim < numDims; ++whichDim) {
               for (copy[onWhich][whichDim] = 0; copy[onWhich][whichDim] < 1; copy[onWhich][whichDim] += hypercubeIncrement) {
                  newOutcome = outcomeFunction(copy);
                  if (isOutcomeCloserByMetric(votePoints[onWhich], newOutcome, outcome, 2) === 1) {
                     outcome = newOutcome;
                     targetVote[onWhich] = projectVotePointToSpace(copy[onWhich]);
                  }
               }
               copy[onWhich] = projectVotePointToSpace(copy[onWhich]);
            }
            for (whichDim = 0; whichDim < numDims; ++whichDim) {
               for (copy[onWhich][whichDim] = 1; copy[onWhich][whichDim] > 0; copy[onWhich][whichDim] -= hypercubeIncrement) {
                  newOutcome = outcomeFunction(copy);
                  if (isOutcomeCloserByMetric(votePoints[onWhich], newOutcome, outcome, 2) === 1) {
                     outcome = newOutcome;
                     targetVote[onWhich] = projectVotePointToSpace(copy[onWhich]);
                  }
               }
               copy[onWhich] = projectVotePointToSpace(copy[onWhich]);
            }
         }
      }
   };

   // makes changes to global targetVote array; used for batchMode by animateElection
   var strategizeAll = function (onWhich, checked) {
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

   // for sorting arrays of objects or arrays by their first value (assuming numerical)
   var sortOrder = function (a, b) {
      return a[0] - b[0];
   };

   /* strategize, batchMode, and withLimits are all assumed to be boolean variables. Strategize determines whether an update function is
    * called (when it's true) or whether to animate directly to the values in strategicPoints. It's true for all user selected modes.
    * batchMode should be exactly what is sounds like. withLimits is the velocity limits toggle.
    * updateFunction specifies a function to be used for updating targetVote. onWhich keeps track of which voter is currently being
    * strategized for in voter-by-voter mode. (i.e. when batchMode is false.)  timeIncrement is used to set the setInterval time delay.
    * order is assumed to be an array of objects, and is used to randomize the ordering of voters in voter-by-voter modes. The array is
    * created within the function, so it's best not to pass anything to order.
    */
   var animateElection = function (strategize, batchMode, withLimits, updateFunction, onWhich, timeIncrement, order, checked) {
      var whichPoint, whichDim, voteScreen, demoScreen, moved = false, active = [];
      if (!animationInProgress || targetVote.length !== numVoters) {
         resetAnimation();
         return;
      }
      if (checked === undefined || checked > 4) {
         checked = 1;
      }
      if (!order) {
         order = [];
         for (whichPoint = 0; whichPoint < numVoters; ++whichPoint) {
            order.push([Math.random(), whichPoint]);
         }
         order.sort(sortOrder);
      }
      if (!animatedVote) {
         animatedVote = [];
         for (whichPoint = 0; whichPoint < numVoters; ++whichPoint) {
            animatedVote.push([]);
            for (whichDim = 0; whichDim < numDims; ++whichDim) {
               animatedVote[whichPoint].push(targetVote[whichPoint][whichDim]);
            }
         }
         if (updateFunction) {
            updateFunction(order[onWhich][1], checked);
         } else if (batchMode) {
            for (whichPoint = 0; whichPoint < numVoters; ++whichPoint) {
               for (whichDim = 0; whichDim < numDims; ++whichDim) {
                  targetVote[whichPoint][whichDim] = strategicPoints[whichPoint][whichDim];
               }
            }
         } else {
            if (strategicPoints.length !== numVoters) {
               dsvAverage();
            }
            for (whichDim = 0; whichDim < numDims; ++whichDim) {
               targetVote[onWhich][whichDim] = strategicPoints[onWhich][whichDim];
            }
         }
      }

      for (whichPoint = 0; whichPoint < numVoters; ++whichPoint) {
         active.push(false);
         for (whichDim = 0; whichDim < numDims; ++whichDim) {
            if (animatedVote[whichPoint][whichDim] < 1.0e-10) {
               animatedVote[whichPoint][whichDim] = 0;
            }
            if (targetVote[whichPoint][whichDim] < 1.0e-10) {
               targetVote[whichPoint][whichDim] = 0;
            }

            if (animatedVote[whichPoint][whichDim] < (targetVote[whichPoint][whichDim] - 0.0000001)) {
               moved = true;
               if (!batchMode && !withLimits) {
                  active[whichPoint] = true;
               }
               animatedVote[whichPoint][whichDim] += animatedMovementLimit;
               if (animatedVote[whichPoint][whichDim] > targetVote[whichPoint][whichDim]) {
                  animatedVote[whichPoint][whichDim] = targetVote[whichPoint][whichDim];
               }
            } else if (animatedVote[whichPoint][whichDim] > (targetVote[whichPoint][whichDim] + 0.000001)) {
               moved = true;
               if (!batchMode && !withLimits) {
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
      }
      for (whichPoint = 0; whichPoint < numVoters; ++whichPoint) {
         drawVotePoint(votePoints[whichPoint], active[whichPoint] ? '#9966cc' : '#6699cc', 6);
         drawVotePoint(animatedVote[whichPoint], '#C0C0C0', 4);
         drawVotePoint(targetVote[whichPoint], '#000000', 4);
      }

      // draw overall outcomes
      var avgOutcome, dsvOutcome, ferOutcome, medOutcome, midOutcome;
      if (displayPerDimMidrangeCheckbox.checked) {
         midOutcome = calcPerDimMidrange(votePoints);
         drawVotePoint(midOutcome, '#000000', 7);
      }
      if (displayPerDimMedianCheckbox.checked) {
         medOutcome = calcPerDimMedian(votePoints);
         drawVotePoint(medOutcome, '#000000', 7);
      }
      if (displayFermatWeberCheckbox.checked) {
         ferOutcome = calcFermatWeber(votePoints);
         drawVotePoint(ferOutcome, '#000000', 7);
      }
      if (displayAverageCheckbox.checked) {
         avgOutcome = calcAverage(votePoints);
         drawVotePoint(avgOutcome, '#000000', 7);
      }
      if (displayAarDsvCheckbox.checked) {
         dsvOutcome = calcAarDsv(votePoints);
         drawVotePoint(dsvOutcome, '#000000', 7);
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

      // draw current average outcome
      drawVotePoint(calcAverage(animatedVote), '#ffaa00', 3.5);

      if (showStrategicOutcomesCheckbox.checked) {
         if (displayPerDimMidrangeCheckbox.checked) {
            midOutcome = calcPerDimMidrange(animatedVote);
            drawVotePoint(midOutcome, '#000000', 4);
         }
         if (displayPerDimMedianCheckbox.checked) {
            medOutcome = calcPerDimMedian(animatedVote);
            drawVotePoint(medOutcome, '#000000', 4);
         }
         if (displayFermatWeberCheckbox.checked) {
            ferOutcome = calcFermatWeber(animatedVote);
            drawVotePoint(ferOutcome, '#000000', 4);
         }
         if (displayAverageCheckbox.checked) {
            avgOutcome = calcAverage(animatedVote);
            drawVotePoint(avgOutcome, '#000000', 4);
         }
         if (displayAarDsvCheckbox.checked) {
            dsvOutcome = calcAarDsv(animatedVote);
            drawVotePoint(dsvOutcome, '#000000', 4);
         }
         if (displayPerDimMidrangeCheckbox.checked) {
            drawVotePoint(midOutcome, '#ff5555', 3.5);
         }
         if (displayPerDimMedianCheckbox.checked) {
            drawVotePoint(medOutcome, '#55ff55', 3.5);
         }
         if (displayFermatWeberCheckbox.checked) {
            drawVotePoint(ferOutcome, '#aaff00', 3.5);
         }
         if (displayAverageCheckbox.checked) {
            drawVotePoint(avgOutcome, '#ffaa00', 3.5);
         }
         if (displayAarDsvCheckbox.checked) {
            drawVotePoint(dsvOutcome, '#ffff00', 3.5);
         }
      }

      // speeds up animation over time; only has an effect on default voter-by-voter mode
      animatedMovementLimit *= 1.1;

      if (!moved) {
         resetAnimation();
         if (batchMode || onWhich + 1 === numVoters) {
            var updated = false;
            for (whichPoint = 0; whichPoint < numVoters && !updated; ++whichPoint) {
               for (whichDim = 0; whichDim < targetVote[whichPoint].length; ++whichDim) {
                  if (Math.abs(targetVote[whichPoint][whichDim] - targetVoteLast[whichPoint][whichDim]) > 0.0001) {
                     updated = true;
                  }
               }
            }

            // finish animation if no point has moved since last round
            if (!updated) {
               animatedVote = null;
               for (whichPoint = 0; whichPoint < numVoters; ++whichPoint) {
                  for (whichDim = 0; whichDim < numDims; ++whichDim) {
                     strategicPoints[whichPoint][whichDim] = targetVote[whichPoint][whichDim];
                  }
               }
               return;
               // otherwise, store old targets for comparison next round
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
         // housekeeping for various modes
         if (!batchMode) {
            ++onWhich;
            if (onWhich >= numVoters) {
               onWhich = 0;
               for (whichPoint = 0; whichPoint < numVoters; ++whichPoint) {
                  order[whichPoint][0] = Math.random();
               }
               order.sort(sortOrder);
            }
            if (!strategize) {
               animatedVote = null;
            }
         }
         if (updateFunction) {
            updateFunction(order[onWhich][1], checked);
         }

         animationInProgress = true;
         animate = window.setInterval(function () {
            animateElection(strategize, batchMode, withLimits, updateFunction, onWhich, timeIncrement, order, checked);
         }, timeIncrement);
      }
   };

   stopAnimationButton.onclick = function () {
      redrawSpace();
   };

   startAnimationButton.onclick = function () {
      var whichVoter, whichDim, userInput, updateFunction, timeIncrement, batchMode = false, strategize = true, velocityLimits = false, largestVal = 0, largestAt, checked;
      redrawSpace();

      userInput = Number(velocityLimitTextbox.value);
      if (!isNaN(userInput)) {
         animatedMovementLimitBase = userInput > 0 ? userInput : animatedMovementLimitBase;
      }
      userInput = Number(timeIntervalTextbox.value);
      if (!isNaN(userInput)) {
         timeIncrementBase = userInput > 1 ? userInput : 1;
      }
      timeIntervalTextbox.value = timeIncrementBase;
      velocityLimitTextbox.value = animatedMovementLimitBase;
      animatedMovementLimit = animatedMovementLimitBase;
      timeIncrement = timeIncrementBase;

      for (whichVoter = 0; whichVoter < strategySystemOptions.length; ++whichVoter) {
         if (strategySystemOptions[whichVoter].checked) {
            checked = whichVoter;
         }
      }

      animatedVote = null;
      targetVote = [];
      targetVoteLast = [];
      // initialize starting points depending on which option was selected
      if (animationStartSincereRadio.checked) {
         for (whichVoter = 0; whichVoter < numVoters; ++whichVoter) {
            targetVote.push([]);
            targetVoteLast.push([]);
            for (whichDim = 0; whichDim < numDims; ++whichDim) {
               targetVote[whichVoter].push(votePoints[whichVoter][whichDim]);
               targetVoteLast[whichVoter].push(votePoints[whichVoter][whichDim]);
            }
         }
      } else if (animationStartRandomRadio.checked) {
         for (whichVoter = 0; whichVoter < numVoters; ++whichVoter) {
            targetVote.push([]);
            targetVoteLast.push([]);
            if (numDims <= 2) {
               for (whichDim = 0; whichDim < numDims; ++whichDim) {
                  targetVote[whichVoter].push(Math.floor(Math.random() * 100001) / 100000);
               }
               targetVote[whichVoter] = projectVotePointToSpace(targetVote[whichVoter]);
            } else if (numDims === 3) {
               do {
                  targetVote[whichVoter][0] = 1;
                  for (whichDim = 1; whichDim < numDims; ++whichDim) {
                     targetVote[whichVoter][whichDim] = Math.floor(Math.random() * 100001) / 100000;
                     targetVote[whichVoter][0] -= targetVote[whichVoter][whichDim];
                  }
               } while (targetVote[whichVoter][0] < 0);
            }
            for (whichDim = 0; whichDim < numDims; ++whichDim) {
               targetVoteLast[whichVoter].push(targetVote[whichVoter][whichDim]);
            }
         }
      } else if (animationStartSameCornerRadio.checked) {
         for (whichVoter = 0; whichVoter < numVoters; ++whichVoter) {
            targetVote.push([]);
            targetVoteLast.push([]);
            for (whichDim = 0; whichDim < numDims; ++whichDim) {
               if (whichDim === 2) {
                  targetVote[whichVoter].push(1);
                  targetVoteLast[whichVoter].push(1);
               } else {
                  targetVote[whichVoter].push(0);
                  targetVoteLast[whichVoter].push(0);
               }
            }
         }
      } else if (animationStartNearCornerRadio.checked) {
         for (whichVoter = 0; whichVoter < numVoters; ++whichVoter) {
            targetVote.push([]);
            targetVoteLast.push([]);
            if (numDims < 3) {
               for (whichDim = 0; whichDim < numDims; ++whichDim) {
                  if (votePoints[whichVoter][whichDim] < 0.5) {
                     targetVote[whichVoter].push(0);
                     targetVoteLast[whichVoter].push(0);
                  } else {
                     targetVote[whichVoter].push(1);
                     targetVoteLast[whichVoter].push(1);
                  }
               }
            } else if (numDims === 3) {
               largestVal = 0;
               for (whichDim = 0; whichDim < numDims; ++whichDim) {
                  targetVote[whichVoter].push(0);
                  targetVoteLast[whichVoter].push(0);
                  if (votePoints[whichVoter][whichDim] > largestVal) {
                     largestVal = votePoints[whichVoter][whichDim];
                     largestAt = whichDim;
                  }
               }
               targetVote[whichVoter][largestAt] = 1;
               targetVoteLast[whichVoter][largestAt] = 1;
            }
         }
      }

      animationInProgress = true;

      if (animationModeOrderedVLRadio.checked) {
         velocityLimits = true;
         timeIncrement = timeIncrementBase / numVoters;
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
         animateElection(strategize, batchMode, velocityLimits, updateFunction, 0, timeIncrement, false, checked);
      }, timeIncrement);
   };

   redrawSpace(); // show initial points
};
