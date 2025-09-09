/*jslint browser: true, vars: true, indent: 3 */

document.addEventListener('DOMContentLoaded', function () {
   'use strict';
   let animateIntervalId;
   let animatedMovementLimit;
   let animatedMovementLimitBase;
   let animatedVote;
   let animationInProgress;
   let numDims;
   let numVoters;
   let strategicPoints; // points used to run demo
   let timeIncrementBase;
   let updateInProgress; // used to keep track of votepoint updates from textboxes
   let updateRow; // used to keep track of votepoint updates from textboxes
   let votePoints; // the voters' voted points
   let votesLocked;

   const votespaceCanvas = document.querySelector('#votespace');
   const votespaceContext = votespaceCanvas.getContext('2d');

   const maxNumVoters = 9;
   const dimNames = [...'xyz'];
   const hypercubeBottomY = 570;
   const hypercubeLeftX = 70;
   const hypercubeRightX = 570;
   const hypercubeTopY = 70;
   const lineSegmentLeftX = hypercubeLeftX;
   const lineSegmentRightX = hypercubeRightX;
   const lineSegmentY = (hypercubeBottomY + hypercubeTopY) / 2;
   const simplexBottomY = 620;
   const simplexLeftX = 20;
   const simplexRightX = 540;
   const simplexTopY = 20;
   const simplexMiddleY = (simplexBottomY + simplexTopY) / 2;
   const truncatedSimplexBottomY = 610;
   const truncatedSimplexLeftX = 70;
   const truncatedSimplexRightX = 570;
   const truncatedSimplexTopY = 30;
   const truncatedSimplexMiddleX = (truncatedSimplexLeftX + truncatedSimplexRightX) / 2;
   const truncatedSimplexNearBottomY = (3 * truncatedSimplexBottomY + truncatedSimplexTopY) / 4;
   const truncatedSimplexNearTopY = (truncatedSimplexBottomY + 3 * truncatedSimplexTopY) / 4;
   const orthogonalSimplexBottomY = 570;
   const orthogonalSimplexLeftX = 70;
   const orthogonalSimplexRightX = 570;
   const orthogonalSimplexTopY = 70;

   const selectNElement = document.querySelector('#select-n');
   numVoters = parseInt(selectNElement.options[selectNElement.selectedIndex].value, 10);
   const lineSegmentRadio = document.querySelector('#use-line-segment');
   const hypercubeRadio = document.querySelector('#use-hypercube');
   const simplexRadio = document.querySelector('#use-simplex');
   const truncatedSimplexRadio = document.querySelector('#use-truncated-simplex');
   const orthogonalSimplexRadio = document.querySelector('#use-orthogonal-simplex');
   const drawGridLinesCheckbox = document.querySelector('#draw-grid-lines');
   const startAnimationButton = document.querySelector('#start-animation');
   const stopAnimationButton = document.querySelector('#stop-animation');
   const displayAarDsvCheckbox = document.querySelector('#display-aar-dsv');
   const displayAverageCheckbox = document.querySelector('#display-average');
   const displayFermatWeberCheckbox = document.querySelector('#display-fermat-weber');
   const displayPerDimMedianCheckbox = document.querySelector('#display-per-dim-median');
   const displayPerDimMidrangeCheckbox = document.querySelector('#display-per-dim-midrange');

   const animationModeDefaultRadio = document.querySelector('#ordered-mode-default');
   const animationModeOrderedVLRadio = document.querySelector('#ordered-mode-with-vl');
   const animationModeBatchVLRadio = document.querySelector('#batch-mode-with-vl');
   const timeIntervalTextbox = document.querySelector('#time-interval');
   const velocityLimitTextbox = document.querySelector('#velocity-limit');
   const animationStartSincereRadio = document.querySelector('#start-sincere');
   const animationStartRandomRadio = document.querySelector('#start-random');
   const animationStartSameCornerRadio = document.querySelector('#start-in-zero-corner');
   const animationStartNearCornerRadio = document.querySelector('#start-in-nearest-corner');
   const animationStartStrategicRadio = document.querySelector('#start-strategic');

   const lockVotesCheckbox = document.querySelector('#lock-votes');
   lockVotesCheckbox.checked = false;
   const moveStrategicCheckbox = document.querySelector('#move-strategic');
   moveStrategicCheckbox.checked = false;
   const automaticStrategyCheckbox = document.querySelector('#automatic-strategy');
   const showStrategicOutcomesCheckbox = document.querySelector('#show-strategic-outcomes');
   const showOutcomeBorderCheckbox = document.querySelector('#show-outcome-border');
   const resetStrategicButton = document.querySelector('#reset-strategic-points');
   const votePointTable = document.querySelector('#votepoints');

   const votePointRows = [
      ...votePointTable.querySelectorAll('tr')
   ].filter(
      (row) => row.id?.indexOf?.('votepoint') === 0
   );

   const votePointCells = dimNames.map(
      (dimName) => votePointTable.querySelectorAll(
         '.' + dimName + '-dim'
      )
   );

   const strategySystemOptions = [...document.querySelectorAll('[name=strategy-system-options]')];

   const votePointTextboxes = votePointRows.map(
      (row, whichRow) => [...row.querySelectorAll('input')]
   );

   const aarDsvOutput = document.querySelector('#aar-dsv-output');
   const clickOutput = document.querySelector('#click-output');

   const fixNumDims = function () {
      numDims = (
         lineSegmentRadio.checked
         ? 1
         : (hypercubeRadio.checked || orthogonalSimplexRadio.checked)
         ? 2
         : 3
      );
      votePointCells.forEach(function (dim, whichDim) {
         dim.forEach(function (row) {
            row.style.display = (
               whichDim < numDims
               ? ''
               : 'none'
            );
         });
      });
   };
   fixNumDims();

   votePoints = []; // each votePoints[whichPoint][whichDimension] must be between 0 and 1
   strategicPoints = [];

   animationInProgress = false;
   animatedMovementLimitBase = 0.0005;
   timeIncrementBase = 0;
   votesLocked = false;

   timeIntervalTextbox.value = timeIncrementBase.toString();
   velocityLimitTextbox.value = animatedMovementLimitBase.toString();

   var resetAnimation = function () {
      var whichPoint, whichDim;
      window.clearTimeout(animateIntervalId);
      animatedMovementLimit = animatedMovementLimitBase;
      // if animation is interrupted early, make sure strategicPoints has been updated
      if (animationInProgress) {
         animationInProgress = false;
         if (animatedVote) {
            for (whichPoint = 0; whichPoint < numVoters; whichPoint += 1) {
               for (whichDim = 0; whichDim < numDims; whichDim += 1) {
                  strategicPoints[whichPoint][whichDim] = animatedVote[whichPoint][whichDim];
               }
            }
         }
      }
   };

   var toScreenCoords = function (vote) {
      if (!vote || vote.length !== numDims) {
         return null;
      } else if (lineSegmentRadio.checked) {
         return {x: lineSegmentLeftX + (lineSegmentRightX - lineSegmentLeftX) * vote[0], y: lineSegmentY};
      } else if (hypercubeRadio.checked) {
         return {x: hypercubeLeftX + (hypercubeRightX - hypercubeLeftX) * vote[0],
                 y: hypercubeBottomY - (hypercubeBottomY - hypercubeTopY) * vote[1]};
      } else if (simplexRadio.checked) {
         return {x: simplexRightX * (vote[0] + vote[1]) + simplexLeftX * vote[2],
                 y: simplexBottomY * vote[0] + simplexTopY * vote[1] + simplexMiddleY * vote[2]};
      } else if (truncatedSimplexRadio.checked) {
         var tSimplexRightX = truncatedSimplexRightX;
         var tSimplexLeftX = (3 * truncatedSimplexLeftX - truncatedSimplexRightX) / 2;
         var tSimplexBottomY = 2 * truncatedSimplexNearBottomY - truncatedSimplexNearTopY;
         var tSimplexTopY = 2 * truncatedSimplexNearTopY - truncatedSimplexNearBottomY;
         var tSimplexMiddleY = (truncatedSimplexBottomY + truncatedSimplexTopY) / 2;
         return {x: (tSimplexRightX * (vote[0] + vote[1]) + tSimplexLeftX * vote[2]) / 1.5,
                 y: (tSimplexBottomY * vote[0] + tSimplexTopY * vote[1] + tSimplexMiddleY * vote[2]) / 1.5};
      } else if (orthogonalSimplexRadio.checked) {
         return {x: orthogonalSimplexLeftX + (orthogonalSimplexRightX - orthogonalSimplexLeftX) * vote[0],
                 y: orthogonalSimplexBottomY - (orthogonalSimplexBottomY - orthogonalSimplexTopY) * vote[1]};
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
      } else if (truncatedSimplexRadio.checked) {
         var tSimplexRightX = truncatedSimplexRightX;
         var tSimplexLeftX = (3 * truncatedSimplexLeftX - truncatedSimplexRightX) / 2;
         var tSimplexBottomY = 2 * truncatedSimplexNearBottomY - truncatedSimplexNearTopY;
         var tSimplexTopY = 2 * truncatedSimplexNearTopY - truncatedSimplexNearBottomY;
         var tSimplexMiddleY = (truncatedSimplexBottomY + truncatedSimplexTopY) / 2;
         return [((screen.x - tSimplexLeftX) / (tSimplexRightX - tSimplexLeftX) + (screen.y - tSimplexMiddleY) / (tSimplexBottomY - tSimplexMiddleY)) / 2 * 1.5,
                 ((screen.x - tSimplexLeftX) / (tSimplexRightX - tSimplexLeftX) + (tSimplexMiddleY - screen.y) / (tSimplexMiddleY - tSimplexTopY)) / 2 * 1.5,
                 (tSimplexRightX - screen.x) / (tSimplexRightX - tSimplexLeftX) * 1.5];
      } else if (orthogonalSimplexRadio.checked) {
         return [(screen.x - orthogonalSimplexLeftX) / (orthogonalSimplexRightX - orthogonalSimplexLeftX),
                 (orthogonalSimplexBottomY - screen.y) / (orthogonalSimplexBottomY - orthogonalSimplexTopY)];
      } else {
         return null;
      }
   };

   var projectVotePointToSpace = function (point) {
      var surplus;
      if (!point || point.length !== numDims) {
         return null;
      } else if (lineSegmentRadio.checked) {
         return [Math.min(Math.max(point[0], 0), 1)];
      } else if (hypercubeRadio.checked) {
         return [Math.min(Math.max(point[0], 0), 1), Math.min(Math.max(point[1], 0), 1)];
      } else if (simplexRadio.checked) {
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
      } else if (truncatedSimplexRadio.checked) {
         if (point[0] + point[1] + point[2] !== 1.5) {
            surplus = (point[0] + point[1] + point[2] - 1.5) / 3;
            point[0] -= surplus;
            point[1] -= surplus;
            point[2] = 1.5 - point[0] - point[1];
         }
         if (point[0] >= point[1] + 1 / 2 && point[1] >= point[2] + 1 / 2) {
            return [1, 1 / 2, 0];
         } else if (point[0] >= point[2] + 1 / 2 && point[2] >= point[1] + 1 / 2) {
            return [1, 0, 1 / 2];
         } else if (point[1] >= point[0] + 1 / 2 && point[0] >= point[2] + 1 / 2) {
            return [1 / 2, 1, 0];
         } else if (point[2] >= point[0] + 1 / 2 && point[0] >= point[1] + 1 / 2) {
            return [1 / 2, 0, 1];
         } else if (point[1] >= point[2] + 1 / 2 && point[2] >= point[0] + 1 / 2) {
            return [0, 1, 1 / 2];
         } else if (point[2] >= point[1] + 1 / 2 && point[1] >= point[0] + 1 / 2) {
            return [0, 1 / 2, 1];
         } else if (point[2] < 0 && point[0] < point[1] + 1 / 2 && point[1] < point[0] + 1 / 2) {
            return [point[0] + point[2] / 2, 1.5 - (point[0] + point[2] / 2), 0];
         } else if (point[1] < 0 && point[0] < point[2] + 1 / 2 && point[2] < point[0] + 1 / 2) {
            return [point[0] + point[1] / 2, 0, 1.5 - (point[0] + point[1] / 2)];
         } else if (point[0] < 0 && point[1] < point[2] + 1 / 2 && point[2] < point[1] + 1 / 2) {
            return [0, point[1] + point[0] / 2, 1.5 - (point[1] + point[0] / 2)];
         } else if (point[0] > 1 && point[1] < point[2] + 1 / 2 && point[2] < point[1] + 1 / 2) {
            return [1, point[1] + (point[0] - 1) / 2, 1 / 2 - (point[1] + (point[0] - 1) / 2)];
         } else if (point[1] > 1 && point[0] < point[2] + 1 / 2 && point[2] < point[0] + 1 / 2) {
            return [point[0] + (point[1] - 1) / 2, 1, 1 / 2 - (point[0] + (point[1] - 1) / 2)];
         } else if (point[2] > 1 && point[0] < point[1] + 1 / 2 && point[1] < point[0] + 1 / 2) {
            return [point[0] + (point[2] - 1) / 2, 1 / 2 - (point[0] + (point[2] - 1) / 2), 1];
         } else {
            return [point[0], point[1], point[2]];
         }
      } else if (orthogonalSimplexRadio.checked) {
         if (point[0] < 0) {
            point[0] = 0;
         }
         if (point[1] < 0) {
            point[1] = 0;
         }
         if (point[0] + point[1] > 1) {
            surplus = (point[0] + point[1] - 1) / 2;
            point[0] -= surplus;
            point[1] = 1 - point[0];
         }
         if (point[0] < 0) {
            return [0, 1];
         } else if (point[1] < 0) {
            return [1, 0];
         } else {
            return [point[0], point[1]];
         }
      } else {
         return null;
      }
   };

   var projectVotePointToSpaceObliquely = function (point) {
      var dimensionsAdded, ratio, q1, q2, differenceItShouldBe, difference, dimension;
      var upperLim, lowerLim, upperSumLimit, lowerSumLimit;
      if (!point || point.length !== numDims) {
         return null;
      } else if (lineSegmentRadio.checked) {
         return [Math.min(Math.max(point[0], 0), 1)];
      } else if (hypercubeRadio.checked) {
         return [Math.min(Math.max(point[0], 0), 1), Math.min(Math.max(point[1], 0), 1)];
      } else if (simplexRadio.checked) {
         upperLim = 1;
         lowerLim = 0;
         upperSumLimit = 1;
         lowerSumLimit = 1;
      } else if (truncatedSimplexRadio.checked) {
         upperLim = 1;
         lowerLim = 0;
         upperSumLimit = 1.5;
         lowerSumLimit = 1.5;
      } else if (orthogonalSimplexRadio.checked) {
         upperLim = 1;
         lowerLim = 0;
         upperSumLimit = 1;
         lowerSumLimit = 0;
      }
      dimensionsAdded = 0;
      for (dimension = 0; dimension < numDims; dimension += 1) {
         if (point[dimension] > upperLim) {
            point[dimension] = upperLim;
         } else if (point[dimension] < lowerLim) {
            point[dimension] = lowerLim;
         }
         dimensionsAdded += point[dimension];
      }
      if (dimensionsAdded > upperSumLimit) {
         difference = 0;
         for (dimension = 0; dimension < numDims; dimension += 1) {
            difference += (point[dimension] - lowerLim);
         }
         q1 = upperSumLimit / numDims;
         q2 = q1 - lowerLim;
         differenceItShouldBe = q2 * numDims;
         ratio = differenceItShouldBe / difference;
         for (dimension = 0; dimension < numDims; dimension += 1) {
            point[dimension] = lowerLim + (ratio * (point[dimension] - lowerLim));
         }
      } else if (dimensionsAdded < lowerSumLimit) {
         difference = 0;
         for (dimension = 0; dimension < numDims; dimension += 1) {
            difference += upperLim - point[dimension];
         }
         q1 = lowerSumLimit / numDims;
         q2 = upperLim - q1;
         differenceItShouldBe = q2 * numDims;
         ratio = differenceItShouldBe / difference;
         for (dimension = 0; dimension < numDims; dimension += 1) {
            point[dimension] = upperLim - (ratio * (upperLim - point[dimension]));
         }
      }
      if (numDims === 2) {
         return [point[0], point[1]];
      } else if (numDims === 3) {
         return [point[0], point[1], point[2]];
      } else {
         return null;
      }
   };

   var projectVotePointToLargerSpace = function (point, spaceSize) {
      var surplus;
      if (typeof spaceSize !== 'number' || spaceSize < 0) {
         spaceSize = 0;
      }
      if (!point || !point.length) {
         return null;
      } else if (point.length === 1) {
         return [Math.min(Math.max(point[0], -spaceSize), spaceSize + 1)];
      } else if (point.length === 2) {
         return [Math.min(Math.max(point[0], -spaceSize), spaceSize + 1), Math.min(Math.max(point[1], -spaceSize), spaceSize + 1)];
      } else if (point.length === 3) {
         if (spaceSize < 1) {
            return projectVotePointToSpace(point);
         }
         // project to x <= spaceSize, y <= spaceSize, z <= spaceSize
         if (point[0] + point[1] + point[2] !== 1) {
            surplus = (point[0] + point[1] + point[2] - 1) / 3;
            point[0] -= surplus;
            point[1] -= surplus;
            point[2] = 1 - point[0] - point[1];
         }
         if (point[2] <= point[0] - 3 * spaceSize + 1 && point[2] <= point[1] - 3 * spaceSize + 1) {
            return [spaceSize, spaceSize, 1 - 2 * spaceSize];
         } else if (point[1] <= point[0] - 3 * spaceSize + 1 && point[1] <= point[2] - 3 * spaceSize + 1) {
            return [spaceSize, 1 - 2 * spaceSize, spaceSize];
         } else if (point[0] <= point[1] - 3 * spaceSize + 1 && point[0] <= point[2] - 3 * spaceSize + 1) {
            return [1 - 2 * spaceSize, spaceSize, spaceSize];
         } else if (point[0] > spaceSize) {
            return [spaceSize, point[1] + (point[0] - spaceSize) / 2, 1 - point[1] - (point[0] + spaceSize) / 2];
         } else if (point[1] > spaceSize) {
            return [point[0] + (point[1] - spaceSize) / 2, spaceSize, 1 - point[0] - (point[1] + spaceSize) / 2];
         } else if (point[2] > spaceSize) {
            return [point[0] + (point[2] - spaceSize) / 2, 1 - point[0] - (point[2] + spaceSize) / 2, spaceSize];
         } else {
            return [point[0], point[1], point[2]];
         }
      } else {
         return null;
      }
   };

   var drawVotePoint = function (point, color, size, isHollow) {
      var screen = toScreenCoords(point);
      votespaceContext.beginPath();
      votespaceContext.arc(screen.x + 0.5, screen.y + 0.5, size, 0, 2 * Math.PI, false);
      if (isHollow) {
         votespaceContext.arc(screen.x + 0.5, screen.y + 0.5, size - 1, 0, 2 * Math.PI, false);
         votespaceContext.strokeStyle = color;
         votespaceContext.stroke();
      } else {
         votespaceContext.fillStyle = color;
         votespaceContext.fill();
      }
   };

   var addOrRemoveVotePoints = function () {
      var whichDim, whichPoint;
      for (whichPoint = votePoints.length; whichPoint < numVoters; whichPoint += 1) {
         votePoints[whichPoint] = [];
         if (lineSegmentRadio.checked || hypercubeRadio.checked) {
            for (whichDim = 0; whichDim < numDims; whichDim += 1) {
               votePoints[whichPoint].push(Math.floor(Math.random() * 100001) / 100000);
            }
         } else if (simplexRadio.checked) {
            do {
               votePoints[whichPoint][0] = 1;
               for (whichDim = 1; whichDim < numDims; whichDim += 1) {
                  votePoints[whichPoint][whichDim] = Math.floor(Math.random() * 100001) / 100000;
                  votePoints[whichPoint][0] -= votePoints[whichPoint][whichDim];
               }
            } while (votePoints[whichPoint][0] < 0);
         } else if (truncatedSimplexRadio.checked) {
            do {
               votePoints[whichPoint][0] = 1.5;
               for (whichDim = 1; whichDim < numDims; whichDim += 1) {
                  votePoints[whichPoint][whichDim] = Math.floor(Math.random() * 100001) / 100000;
                  votePoints[whichPoint][0] -= votePoints[whichPoint][whichDim];
               }
            } while (votePoints[whichPoint][0] < 0 || votePoints[whichPoint][0] > 1);
         } else if (orthogonalSimplexRadio.checked) {
            do {
               for (whichDim = 0; whichDim < numDims; whichDim += 1) {
                  votePoints[whichPoint][whichDim] = Math.floor(Math.random() * 100001) / 100000;
               }
            } while (votePoints[whichPoint][0] + votePoints[whichPoint][1] > 1);
         }
         votePoints[whichPoint] = projectVotePointToSpace(votePoints[whichPoint]);
      }
      while (votePoints.length > numVoters) {
         votePoints.pop();
      }
      for (whichPoint = strategicPoints.length; whichPoint < numVoters; whichPoint += 1) {
         strategicPoints.push([]);
         for (whichDim = 0; whichDim < votePoints[whichPoint].length; whichDim += 1) {
            strategicPoints[whichPoint].push(votePoints[whichPoint][whichDim]);
         }
      }
      while (strategicPoints.length > numVoters) {
         strategicPoints.pop();
      }
   };
   addOrRemoveVotePoints();

   // test AAR DSV inequalities given pointToTest and points
   // return object that tells whether all are satisfied and whether each dimension of pointToTest is too big, too small or just right
   // -1 means too small, 0 means just right, +1 means too big
   var testInequalities = function (pointToTest, points) {
      var isGreaterThan, numGreaterThan;
      var whichDim, whichOtherDim, whichPoint;
      var returnValue = {
         obeysAll: true,
         dimSize: []
      };
      if (!points) {
         points = votePoints;
      }
      if (lineSegmentRadio.checked || hypercubeRadio.checked) {
         for (whichDim = 0; whichDim < numDims; whichDim += 1) {
            returnValue.dimSize[whichDim] = 0;
            numGreaterThan = 0;
            for (whichPoint = 0; whichPoint < numVoters; whichPoint += 1) {
               if (points[whichPoint][whichDim] > pointToTest[whichDim] + 0.0000001) {
                  numGreaterThan += 1;
               }
            }
            if (numGreaterThan > pointToTest[whichDim] * numVoters + 0.0000001) {
               returnValue.obeysAll = false;
               returnValue.dimSize[whichDim] = -1;
            }
            numGreaterThan = 0;
            for (whichPoint = 0; whichPoint < numVoters; whichPoint += 1) {
               if (points[whichPoint][whichDim] + 0.0000001 >= pointToTest[whichDim]) {
                  numGreaterThan += 1;
               }
            }
            if (numGreaterThan + 0.0000001 < pointToTest[whichDim] * numVoters) {
               returnValue.obeysAll = false;
               returnValue.dimSize[whichDim] = 1;
            }
         }
         return returnValue;
      } else if (simplexRadio.checked) {
         for (whichDim = 0; whichDim < numDims; whichDim += 1) {
            returnValue.dimSize[whichDim] = 0;
            numGreaterThan = 0;
            for (whichPoint = 0; whichPoint < numVoters; whichPoint += 1) {
               isGreaterThan = true;
               for (whichOtherDim = 0; whichOtherDim < numDims; whichOtherDim += 1) {
                  if (whichOtherDim !== whichDim && points[whichPoint][whichDim] - points[whichPoint][whichOtherDim] <= pointToTest[whichDim] - pointToTest[whichOtherDim] + 0.0000001) {
                     isGreaterThan = false;
                  }
               }
               if (isGreaterThan) {
                  numGreaterThan += 1;
               }
            }
            if (numGreaterThan > pointToTest[whichDim] * numVoters + 0.0000001) {
               returnValue.obeysAll = false;
               returnValue.dimSize[whichDim] = -1;
            }
            numGreaterThan = 0;
            for (whichPoint = 0; whichPoint < numVoters; whichPoint += 1) {
               isGreaterThan = true;
               for (whichOtherDim = 0; whichOtherDim < numDims; whichOtherDim += 1) {
                  if (whichOtherDim !== whichDim && points[whichPoint][whichDim] - points[whichPoint][whichOtherDim] + 0.0000001 < pointToTest[whichDim] - pointToTest[whichOtherDim]) {
                     isGreaterThan = false;
                  }
               }
               if (isGreaterThan) {
                  numGreaterThan += 1;
               }
            }
            if (numGreaterThan + 0.0000001 < pointToTest[whichDim] * numVoters) {
               returnValue.obeysAll = false;
               returnValue.dimSize[whichDim] = 1;
            }
         }
         return returnValue;
      } else if (truncatedSimplexRadio.checked) {
         window.alert('FIXME testInequalities');
         return {
            obeysAll: false,
            dimSize: null
         };
      } else if (orthogonalSimplexRadio.checked) {
         window.alert('FIXME testInequalities');
         return {
            obeysAll: false,
            dimSize: null
         };
      } else {
         return {
            obeysAll: false,
            dimSize: null
         };
      }
   };

   // used to sort arrays
   const smallestToLargest = (a, b) => a - b;

   // find Average outcome of input points
   var calcAverage = function (points) {
      var numPoints = points.length;
      var outcome = [];
      var whichDim, whichPoint;
      for (whichDim = 0; whichDim < numDims; whichDim += 1) {
         outcome[whichDim] = 0;
         for (whichPoint = 0; whichPoint < numPoints; whichPoint += 1) {
            outcome[whichDim] += points[whichPoint][whichDim];
         }
         outcome[whichDim] /= numPoints;
      }
      return projectVotePointToSpace(outcome);
   };

   // find AAR DSV outcome of input points
   var calcAarDsv = function (points) {
      // x and y are each assumed to be pairs of points in the same plane
      var findIntersection = function (x, y) {
         var crossMultiply = function (x, y) {
            var result = [x[1] * y[2] - x[2] * y[1], x[2] * y[0] - x[0] * y[2], x[0] * y[1] - x[1] * y[0]];
            return result;
         };
         var dotProduct = function (x, y) {
            var num = x[0] * y[0] + x[1] * y[1] + x[2] * y[2];
            return num;
         };
         var a = [], b, c, aXb, normaXbsquared, cXb, cXbDaXb, s, intersection;
         a = [(x[1][0] - x[0][0]), (x[1][1] - x[0][1]), (x[1][2] - x[0][2])];
         b = [y[1][0] - y[0][0], y[1][1] - y[0][1], y[1][2] - y[0][2]];
         c = [y[0][0] - x[0][0], y[0][1] - x[0][1], y[0][2] - x[0][2]];
         aXb = crossMultiply(a, b);
         normaXbsquared = dotProduct(aXb, aXb);
         if (normaXbsquared < 0.00001) {
            return null;
         }
         cXb = crossMultiply(c, b);
         cXbDaXb = dotProduct(cXb, aXb);
         s = cXbDaXb / normaXbsquared;
         a[0] *= s;
         a[1] *= s;
         a[2] *= s;
         intersection = [x[0][0] + a[0], x[0][1] + a[1], x[0][2] + a[2]];
         return intersection;
      };
      // points should all be in the plane, so x + y + z is assumed (approximately) to equal 1
      var isPointInSpace = function (x) {
         var whichDim;
         for (whichDim = 0; whichDim < numDims; whichDim += 1) {
            if (x[whichDim] > 1 || x[whichDim] < 0) {
               return false;
            }
         }
         return true;
      };

      var numPoints = points.length;
      var outcome = [];
      var newStrategicPoint, somethingChanged, sortedPoints, strategicPoints, whichDim, whichPoint, whichOtherPoint;
      var largestVal, largestAt;
      if (lineSegmentRadio.checked || hypercubeRadio.checked) {
         for (whichDim = 0; whichDim < numDims; whichDim += 1) {
            sortedPoints = [];
            for (whichPoint = 0; whichPoint < numPoints; whichPoint += 1) {
               sortedPoints.push(points[whichPoint][whichDim]);
            }
            for (whichPoint = 1; whichPoint < numPoints; whichPoint += 1) {
               sortedPoints.push(whichPoint / numPoints);
            }
            sortedPoints.sort(smallestToLargest);
            outcome.push(sortedPoints[numPoints - 1]);
         }
         return projectVotePointToSpace(outcome);
      } else if (simplexRadio.checked || truncatedSimplexRadio.checked || orthogonalSimplexRadio.checked) {
         strategicPoints = [];
         for (whichPoint = 0; whichPoint < numPoints; whichPoint += 1) {
            if (simplexRadio.checked) {
               strategicPoints.push([1 / 3, 1 / 3, 1 / 3]);
            } else if (truncatedSimplexRadio.checked) {
               strategicPoints.push([1 / 2, 1 / 2, 1 / 2]);
            } else if (orthogonalSimplexRadio.checked) {
               strategicPoints.push([1 / 3, 1 / 3]);
            }
         }
         do {
            somethingChanged = false;
            for (whichPoint = 0; whichPoint < numPoints; whichPoint += 1) {
               newStrategicPoint = [];
               for (whichDim = 0; whichDim < numDims; whichDim += 1) {
                  newStrategicPoint.push(points[whichPoint][whichDim] * numVoters);
                  for (whichOtherPoint = 0; whichOtherPoint < numPoints; whichOtherPoint += 1) {
                     if (whichOtherPoint !== whichPoint) {
                        newStrategicPoint[whichDim] -= strategicPoints[whichOtherPoint][whichDim];
                     }
                  }
               }
               newStrategicPoint = projectVotePointToSpace(newStrategicPoint);
               for (whichDim = 0; whichDim < numDims; whichDim += 1) {
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

   // find AAR DSV outcome of input points with oblique projection
   var calcAarDsvOblique = function (points) {
      var numPoints = points.length;
      var outcome = [];
      var newStrategicPoint, somethingChanged, sortedPoints, strategicPoints, whichDim, whichPoint, whichOtherPoint;
      var largestVal, largestAt;
      strategicPoints = [];
      for (whichPoint = 0; whichPoint < numPoints; whichPoint += 1) {
         if (lineSegmentRadio.checked) {
            strategicPoints.push([1 / 2]);
         } else if (hypercubeRadio.checked) {
            strategicPoints.push([1 / 2, 1 / 2]);
         } else if (simplexRadio.checked) {
            strategicPoints.push([1 / 3, 1 / 3, 1 / 3]);
         } else if (truncatedSimplexRadio.checked) {
            strategicPoints.push([1 / 2, 1 / 2, 1 / 2]);
         } else if (orthogonalSimplexRadio.checked) {
            strategicPoints.push([1 / 3, 1 / 3]);
         }
      }
      do {
         somethingChanged = false;
         for (whichPoint = 0; whichPoint < numPoints; whichPoint += 1) {
            newStrategicPoint = [];
            for (whichDim = 0; whichDim < numDims; whichDim += 1) {
               newStrategicPoint.push(points[whichPoint][whichDim] * numVoters);
               for (whichOtherPoint = 0; whichOtherPoint < numPoints; whichOtherPoint += 1) {
                  if (whichOtherPoint !== whichPoint) {
                     newStrategicPoint[whichDim] -= strategicPoints[whichOtherPoint][whichDim];
                  }
               }
            }
            newStrategicPoint = projectVotePointToSpaceObliquely(newStrategicPoint);
            for (whichDim = 0; whichDim < numDims; whichDim += 1) {
               if (Math.abs(newStrategicPoint[whichDim] - strategicPoints[whichPoint][whichDim]) > 0.00000001) {
                  somethingChanged = true;
               }
               strategicPoints[whichPoint][whichDim] = newStrategicPoint[whichDim];
            }
         }
      } while (somethingChanged);
      return calcAverage(strategicPoints);
   };

   // find AAR DSV outcome of input points with larger internal votespace
   var calcAarDsvLargerSpace = function (points, votespaceSize) {
      var numPoints = points.length;
      var outcome = [];
      var newStrategicPoint, somethingChanged, sortedPoints, strategicPoints, whichDim, whichPoint, whichOtherPoint;
      if (lineSegmentRadio.checked || hypercubeRadio.checked) {
         // internal votespace is -votespaceSize <= x <= votespaceSize + 1 in each dimension
         for (whichDim = 0; whichDim < numDims; whichDim += 1) {
            sortedPoints = [];
            for (whichPoint = 0; whichPoint < numPoints; whichPoint += 1) {
               sortedPoints.push(points[whichPoint][whichDim]);
            }
            for (whichPoint = 1; whichPoint < numPoints; whichPoint += 1) {
               sortedPoints.push(whichPoint * (2 * votespaceSize + 1) / numPoints - votespaceSize);
            }
            sortedPoints.sort(smallestToLargest);
            outcome.push(sortedPoints[numPoints - 1]);
         }
         return projectVotePointToSpace(outcome);
      } else if (simplexRadio.checked) {
         // if votespaceSize < 1, internal votespace is x >= 0, y >= 0, z >= 0
         // if votespaceSize >= 1, internal votespace is x <= votespaceSize, y <= votespaceSize, z <= votespaceSize
         strategicPoints = [];
         for (whichPoint = 0; whichPoint < numPoints; whichPoint += 1) {
            strategicPoints.push([0, 0, 0]);
         }
         do {
            somethingChanged = false;
            for (whichPoint = 0; whichPoint < numPoints; whichPoint += 1) {
               newStrategicPoint = [];
               for (whichDim = 0; whichDim < numDims; whichDim += 1) {
                  newStrategicPoint.push(points[whichPoint][whichDim] * numVoters);
                  for (whichOtherPoint = 0; whichOtherPoint < numPoints; whichOtherPoint += 1) {
                     if (whichOtherPoint !== whichPoint) {
                        newStrategicPoint[whichDim] -= strategicPoints[whichOtherPoint][whichDim];
                     }
                  }
               }
               newStrategicPoint = projectVotePointToLargerSpace(newStrategicPoint, votespaceSize);
               for (whichDim = 0; whichDim < numDims; whichDim += 1) {
                  if (Math.abs(newStrategicPoint[whichDim] - strategicPoints[whichPoint][whichDim]) > 0.00000001) {
                     somethingChanged = true;
                  }
                  strategicPoints[whichPoint][whichDim] = newStrategicPoint[whichDim];
               }
            }
         } while (somethingChanged);
         return calcAverage(strategicPoints);
      } else if (truncatedSimplexRadio.checked) {
         window.alert('FIXME calcAarDsvLargerSpace');
         return null;
      } else if (orthogonalSimplexRadio.checked) {
         window.alert('FIXME calcAarDsvLargerSpace');
         return null;
      } else {
         return null;
      }
   };

   // find Fermat-Weber outcome of input points with Weiszfeld's algorithm
   var calcFermatWeber = function (points) {
      var numer, denom, dist, lastFWPoint, notCloseEnough;
      var numPoints = points.length;
      var outcome = [];
      var sumSqDiff, whichDim, whichPoint;
      for (whichDim = 0; whichDim < numDims; whichDim += 1) {
         outcome.push(0.5); // start outcome at the center of the votespace
      }
      outcome = projectVotePointToSpace(outcome);
      numer = [];
      do {
         for (whichDim = 0; whichDim < numDims; whichDim += 1) {
            numer[whichDim] = 0;
         }
         denom = 0;
         for (whichPoint = 0; whichPoint < numPoints; whichPoint += 1) {
            sumSqDiff = 0;
            for (whichDim = 0; whichDim < numDims; whichDim += 1) {
               sumSqDiff += (points[whichPoint][whichDim] - outcome[whichDim]) * (points[whichPoint][whichDim] - outcome[whichDim]);
            }
            if (sumSqDiff) {
               dist = Math.sqrt(sumSqDiff);
               for (whichDim = 0; whichDim < numDims; whichDim += 1) {
                  numer[whichDim] += points[whichPoint][whichDim] / dist;
               }
               denom += 1 / dist;
            }
         }
         notCloseEnough = false;
         for (whichDim = 0; whichDim < numDims; whichDim += 1) {
            lastFWPoint = outcome[whichDim];
            outcome[whichDim] = numer[whichDim] / denom;
            if (outcome[whichDim] > lastFWPoint + 0.00001 || outcome[whichDim] + 0.00001 < lastFWPoint) {
               notCloseEnough = true;
            }
         }
      } while (notCloseEnough);
      return projectVotePointToSpace(outcome);
   };

   // find Median outcome of input points without projecting to votespace
   var calcPerDimMedianUnprojected = function (points) {
      var numPoints = points.length;
      var outcome = [];
      var sortedPoints, whichDim, whichPoint;
      for (whichDim = 0; whichDim < numDims; whichDim += 1) {
         sortedPoints = [];
         for (whichPoint = 0; whichPoint < numPoints; whichPoint += 1) {
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

   // find Median outcome of input points
   const calcPerDimMedian = function (points) {
      return projectVotePointToSpace(calcPerDimMedianUnprojected(points));
   };

   // find moving-phamtom-median outcome of input points
   const calcMovingPhantomMedian = function (points) {
      let highPhantomFactor;
      let lowPhantomFactor;
      let outcome;
      const numPhantoms = points.length + 1;
      const minOutcomeTotal = (
         simplexRadio.checked
         ? 1
         : truncatedSimplexRadio.checked
         ? 1.5
         : 0
      );
      const maxOutcomeTotal = (
         hypercubeRadio.checked
         ? 2
         : truncatedSimplexRadio.checked
         ? 1.5
         : 1
      );
      lowPhantomFactor = 0;
      highPhantomFactor = 2;
      do {
         const newPhantomFactor = (lowPhantomFactor + highPhantomFactor) / 2;
         const allPoints = [
            ...points,
            ...Array.from(
               {length: numPhantoms},
               (ignore, index) => Array.from(
                  {length: numDims},
                  () => index * newPhantomFactor / points.length
               )
            )
         ];
         outcome = calcPerDimMedianUnprojected(allPoints);
         const outcomeTotal = outcome.reduce(
            (x, y) => x + y,
            0
         );
         if (outcomeTotal < minOutcomeTotal) {
            lowPhantomFactor = newPhantomFactor;
         } else if (outcomeTotal > maxOutcomeTotal) {
            highPhantomFactor = newPhantomFactor;
         } else {
            return outcome;
         }
      } while (lowPhantomFactor + 1.0e-10 <= highPhantomFactor);
      return outcome;
   };

   // find Midrange outcome of input points
   var calcPerDimMidrange = function (points) {
      var numPoints = points.length;
      var outcome = [];
      var sortedPoints, whichDim, whichPoint;
      for (whichDim = 0; whichDim < numDims; whichDim += 1) {
         sortedPoints = [];
         for (whichPoint = 0; whichPoint < numPoints; whichPoint += 1) {
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

      for (whichPoint = strategicPoints.length; whichPoint < numVoters; whichPoint += 1) {
         strategicPoints.push([]);
         for (whichDim = 0; whichDim < votePoints[whichPoint].length; whichDim += 1) {
            strategicPoints[whichPoint].push(votePoints[whichPoint][whichDim]);
         }
      }
      while (strategicPoints.length > numVoters) {
         strategicPoints.pop();
      }

      do {
         strategicPointsLast = [];
         for (whichPoint = 0; whichPoint < numVoters; whichPoint += 1) {
            strategicPointsLast.push([]);
            for (whichDim = 0; whichDim < strategicPoints[whichPoint].length; whichDim += 1) {
               strategicPointsLast[whichPoint].push(strategicPoints[whichPoint][whichDim]);
            }
         }

         for (whichPoint = 0; whichPoint < numVoters; whichPoint += 1) {
            if (whichPoint !== onWhich) {
               for (whichDim = 0; whichDim < numDims; whichDim += 1) {
                  calculatedTotal = 0;
                  for (whichPoint2 = 0; whichPoint2 < numVoters; whichPoint2 += 1) {
                     if (whichPoint !== whichPoint2) {
                        calculatedTotal += strategicPoints[whichPoint2][whichDim];
                     }
                  }
                  strategicPoints[whichPoint][whichDim] = votePoints[whichPoint][whichDim] * numVoters - calculatedTotal;
               }
               strategicPoints[whichPoint] = projectVotePointToSpace(strategicPoints[whichPoint]);
            }
         }
         changed = false;
         for (whichPoint = 0; whichPoint < strategicPointsLast.length; whichPoint += 1) {
            for (whichDim = 0; whichDim < strategicPointsLast[whichPoint].length; whichDim += 1) {
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
      for (whichPoint = 0; whichPoint < numVoters; whichPoint += 1) {
         copyArray.push([]);
         for (whichDim = 0; whichDim < numDims; whichDim += 1) {
            if (whichPoint === focus) {
               copyArray[whichPoint].push(0);
            } else {
               copyArray[whichPoint].push(votePoints[whichPoint][whichDim]);
            }
         }
      }

      if (simplexRadio.checked) {
         for (copyArray[focus][0] = 1; copyArray[focus][0] > simplexIncrement; copyArray[focus][0] -= simplexIncrement, copyArray[focus][2] += simplexIncrement) {
            points.push(outcomeFunction(copyArray));
         }
         copyArray[focus][0] = 0;
         copyArray[focus][2] = 0;
         for (copyArray[focus][2] = 1; copyArray[focus][2] > simplexIncrement; copyArray[focus][2] -= simplexIncrement, copyArray[focus][1] += simplexIncrement) {
            points.push(outcomeFunction(copyArray));
         }
         copyArray[focus][1] = 0;
         copyArray[focus][2] = 0;
         for (copyArray[focus][1] = 1; copyArray[focus][1] > simplexIncrement; copyArray[focus][1] -= simplexIncrement, copyArray[focus][0] += simplexIncrement) {
            points.push(outcomeFunction(copyArray));
         }
      } else if (truncatedSimplexRadio.checked) {
         window.alert('FIXME findLimits');
      } else if (orthogonalSimplexRadio.checked) {
         window.alert('FIXME findLimits');
      } else {
         points.push(outcomeFunction(copyArray));
         for (whichDim = 0; whichDim < numDims; whichDim += 1) {
            for (copyArray[focus][whichDim] = 0; copyArray[focus][whichDim] < 1; copyArray[focus][whichDim] += hypercubeIncrement) {
               points.push(outcomeFunction(copyArray));
            }
            copyArray[focus] = projectVotePointToSpace(copyArray[focus]);
         }
         for (whichDim = 0; whichDim < numDims; whichDim += 1) {
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
      for (whichPoint = 0; whichPoint < points.length; whichPoint += 1) {
         voteScreen = toScreenCoords(points[whichPoint]);
         votespaceContext.lineTo(voteScreen.x, voteScreen.y);
      }
      votespaceContext.strokeStyle = color;
      votespaceContext.stroke();
      votespaceContext.closePath();
   };

   var isOutcomeCloserByDim = function (idealPoint, newOutcome, oldOutcome, significance) {
      var whichDim, differenceNew, differenceOld, closer = [];
      // significance: how large a difference must exist between two outcomes for them not to be considered the same
      if (!(significance >= 0)) {
         significance = 1.0e-6;
      }
      for (whichDim = 0; whichDim < numDims; whichDim += 1) {
         if (newOutcome[whichDim] <= oldOutcome[whichDim] + significance && oldOutcome[whichDim] <= newOutcome[whichDim] + significance) {
            closer.push(0);
         } else if (oldOutcome[whichDim] + significance < newOutcome[whichDim] && newOutcome[whichDim] <= idealPoint[whichDim] + significance || idealPoint[whichDim] <= newOutcome[whichDim] + significance && newOutcome[whichDim] + significance < oldOutcome[whichDim]) {
            closer.push(1);
         } else if (newOutcome[whichDim] + significance < oldOutcome[whichDim] && oldOutcome[whichDim] <= idealPoint[whichDim] + significance || idealPoint[whichDim] <= oldOutcome[whichDim] + significance && oldOutcome[whichDim] + significance < newOutcome[whichDim]) {
            closer.push(-1);
         } else {
            closer.push(NaN);
         }
      }
      return closer;
   };

   var isOutcomeDominatinglyCloser = function (idealPoint, newOutcome, oldOutcome, significance) {
      var closerByDim = isOutcomeCloserByDim(idealPoint, newOutcome, oldOutcome, significance);
      var whichDim, result = 0;
      for (whichDim = 0; whichDim < numDims; whichDim += 1) {
         if (isNaN(closerByDim[whichDim])) {
            return NaN;
         } else if (closerByDim[whichDim] < 0) {
            if (result > 0) {
               return NaN;
            }
            result = -1;
         } else if (closerByDim[whichDim] > 0) {
            if (result < 0) {
               return NaN;
            }
            result = 1;
         }
      }
      return result;
   };

   var isOutcomeCloserByMetric = function (idealPoint, newOutcome, oldOutcome, metric, significance) {
      // metric === 1: Manhattan distance
      // metric === 2: Euclidean distance
      // metric === Number.POSITIVE_INFINITY: Chebyshev distance
      // returns 1 if newOutcome is closer to idealPoint than oldOutcome, -1 if farther, 0 if (nearly) identical
      var whichDim, differenceNew, differenceOld;
      // significance: how large a difference must exist between two outcomes for them not to be considered the same
      if (!significance) {
         significance = 1.0e-6;
      }
      if (isFinite(metric)) {
         differenceNew = 0;
         differenceOld = 0;
         for (whichDim = 0; whichDim < numDims; whichDim += 1) {
            differenceNew += Math.pow(Math.abs(newOutcome[whichDim] - idealPoint[whichDim]), metric);
            differenceOld += Math.pow(Math.abs(oldOutcome[whichDim] - idealPoint[whichDim]), metric);
         }
         differenceNew = Math.pow(differenceNew, 1 / metric);
         differenceOld = Math.pow(differenceOld, 1 / metric);
         if (Math.abs(differenceNew - differenceOld) < significance) {
            return 0;
         } else if (differenceNew < differenceOld) {
            return 1;
         } else {
            return -1;
         }
      } else {
         differenceNew = 0;
         differenceOld = 0;
         for (whichDim = 0; whichDim < numDims; whichDim += 1) {
            differenceNew = Math.max(Math.abs(newOutcome[whichDim] - idealPoint[whichDim]), differenceNew);
            differenceOld = Math.max(Math.abs(oldOutcome[whichDim] - idealPoint[whichDim]), differenceOld);
         }
         if (Math.abs(differenceNew - differenceOld) < significance) {
            return 0;
         } else if (differenceNew < differenceOld) {
            return 1;
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
            for (whichVoter = 0; whichVoter < numVoters; whichVoter += 1) {
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
            for (whichVoter = 1; whichVoter < numVoters; whichVoter += 1) {
               votespaceContext.beginPath();
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
            for (whichVoter = 0; whichVoter < numVoters; whichVoter += 1) {
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
            for (whichVoter = 1; whichVoter < numVoters; whichVoter += 1) {
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
      } else if (truncatedSimplexRadio.checked) {
         votespaceContext.beginPath();
         votespaceContext.moveTo(truncatedSimplexLeftX + 0.5, truncatedSimplexNearTopY + 0.5);
         votespaceContext.lineTo(truncatedSimplexMiddleX + 0.5, truncatedSimplexTopY + 0.5);
         votespaceContext.lineTo(truncatedSimplexRightX + 0.5, truncatedSimplexNearTopY + 0.5);
         votespaceContext.lineTo(truncatedSimplexRightX + 0.5, truncatedSimplexNearBottomY + 0.5);
         votespaceContext.lineTo(truncatedSimplexMiddleX + 0.5, truncatedSimplexBottomY + 0.5);
         votespaceContext.lineTo(truncatedSimplexLeftX + 0.5, truncatedSimplexNearBottomY + 0.5);
         votespaceContext.lineTo(truncatedSimplexLeftX + 0.5, truncatedSimplexNearTopY + 0.5);
         votespaceContext.fillStyle = '#ffffff';
         votespaceContext.fill();
         votespaceContext.beginPath();
         votespaceContext.moveTo(truncatedSimplexLeftX + 0.5, truncatedSimplexNearTopY + 0.5);
         votespaceContext.lineTo(truncatedSimplexMiddleX + 0.5, truncatedSimplexTopY + 0.5);
         votespaceContext.lineTo(truncatedSimplexRightX + 0.5, truncatedSimplexNearTopY + 0.5);
         votespaceContext.lineTo(truncatedSimplexRightX + 0.5, truncatedSimplexNearBottomY + 0.5);
         votespaceContext.lineTo(truncatedSimplexMiddleX + 0.5, truncatedSimplexBottomY + 0.5);
         votespaceContext.lineTo(truncatedSimplexLeftX + 0.5, truncatedSimplexNearBottomY + 0.5);
         votespaceContext.lineTo(truncatedSimplexLeftX + 0.5, truncatedSimplexNearTopY + 0.5);
         votespaceContext.strokeStyle = '#000000';
         votespaceContext.stroke();
      } else if (orthogonalSimplexRadio.checked) {
         votespaceContext.beginPath();
         votespaceContext.moveTo(orthogonalSimplexLeftX + 0.5, orthogonalSimplexTopY + 0.5);
         votespaceContext.lineTo(orthogonalSimplexRightX + 0.5, orthogonalSimplexBottomY + 0.5);
         votespaceContext.lineTo(orthogonalSimplexLeftX + 0.5, orthogonalSimplexBottomY + 0.5);
         votespaceContext.lineTo(orthogonalSimplexLeftX + 0.5, orthogonalSimplexTopY + 0.5);
         votespaceContext.fillStyle = '#ffffff';
         votespaceContext.fill();
         votespaceContext.beginPath();
         votespaceContext.moveTo(orthogonalSimplexLeftX + 0.5, orthogonalSimplexTopY + 0.5);
         votespaceContext.lineTo(orthogonalSimplexRightX + 0.5, orthogonalSimplexBottomY + 0.5);
         votespaceContext.lineTo(orthogonalSimplexLeftX + 0.5, orthogonalSimplexBottomY + 0.5);
         votespaceContext.lineTo(orthogonalSimplexLeftX + 0.5, orthogonalSimplexTopY + 0.5);
         votespaceContext.strokeStyle = '#000000';
         votespaceContext.stroke();
      } else {
         return false;
      }
      return true;
   };

   // makes changes to global strategicPoints array;
   // whichDistanceFunction false => use by dimension function;
   // whichDistanceFunction true => use by metric function;
   // metric defaults to 2 (Euclidean);
   // returns true if a better point was found, false otherwise
   var strategizeOutcome = function (onWhich, outcomeFunction, batchMode, numToCheck, whichDistanceFunction, metric, tryCorners) {
      var outcome = outcomeFunction(strategicPoints);
      var currentVoter = onWhich, found, changed = false, whichPoint, whichDim, calculatedTotal, newOutcome, copy = [], distanceByDim, tempPoint = [];
      // used to determine whether two numbers are close enough to be considered the same; also passed to distance function
      var significance = 1.0e-5;
      // use direct calculations for average
      var specialAverageMode = true;
      // if votes are locked, don't strategize on behalf of the focal voter
      var startingPoint = votesLocked ? 1 : 0;
      if (whichDistanceFunction) {
         if (!metric) {
            metric = 2;
         }
      }
      if (strategicPoints.length !== numVoters) {
         return changed;
      }
      for (whichPoint = 0; whichPoint < numVoters; whichPoint += 1) {
         copy.push([]);
         for (whichDim = 0; whichDim < numDims; whichDim += 1) {
            copy[whichPoint].push(strategicPoints[whichPoint][whichDim]);
         }
      }
      if (outcomeFunction === calcAverage && specialAverageMode) {
         for (currentVoter = (batchMode ? startingPoint : onWhich); currentVoter < (batchMode ? numVoters : onWhich + 1); currentVoter += 1) {
            for (whichDim = 0; whichDim < numDims; whichDim += 1) {
               if (Math.abs(votePoints[currentVoter][whichDim] - outcome[whichDim]) > significance) {
                  calculatedTotal = 0;
                  for (whichPoint = 0; whichPoint < numVoters; whichPoint += 1) {
                     if (whichPoint !== currentVoter) {
                        calculatedTotal += copy[whichPoint][whichDim];
                     }
                  }
                  strategicPoints[currentVoter][whichDim] = votePoints[currentVoter][whichDim] * numVoters - calculatedTotal;
               }
            }
            strategicPoints[currentVoter] = projectVotePointToSpace(strategicPoints[currentVoter]);
            for (whichDim = 0; whichDim < numDims; whichDim += 1) {
               if (Math.abs(strategicPoints[currentVoter][whichDim] - copy[currentVoter][whichDim]) > significance) {
                  changed = true;
               }
            }
         }
      } else if (!tryCorners) {
         for (currentVoter = (batchMode ? startingPoint : onWhich); currentVoter < (batchMode ? numVoters : onWhich + 1); currentVoter += 1) {
            found = false;
            for (whichDim = 0; whichDim < numDims && batchMode; whichDim += 1) {
               tempPoint[whichDim] = copy[currentVoter][whichDim];
            }
            for (whichPoint = 0; whichPoint < numToCheck && !found; whichPoint += 1) {
               // generate random point
               if (lineSegmentRadio.checked || hypercubeRadio.checked) {
                  for (whichDim = 0; whichDim < numDims; whichDim += 1) {
                     copy[currentVoter][whichDim] = Math.floor(Math.random() * 100001) / 100000;
                  }
                  copy[currentVoter] = projectVotePointToSpace(copy[currentVoter]);
               } else if (simplexRadio.checked) {
                  do {
                     copy[currentVoter] = [];
                     copy[currentVoter].push(1);
                     for (whichDim = 1; whichDim < numDims; whichDim += 1) {
                        copy[currentVoter].push(Math.floor(Math.random() * 100001) / 100000);
                        copy[currentVoter][0] -= copy[currentVoter][whichDim];
                     }
                  } while (copy[currentVoter][0] < 0);
               } else if (truncatedSimplexRadio.checked) {
                  window.alert('FIXME strategizeOutcome');
                  do {
                     copy[currentVoter] = [];
                     copy[currentVoter].push(1);
                     for (whichDim = 1; whichDim < numDims; whichDim += 1) {
                        do {
                           copy[currentVoter][whichDim] = Math.floor(Math.random() * 100001) / 100000;
                        } while (copy[currentVoter][whichDim] > 2 / 3);
                        copy[currentVoter][0] -= copy[currentVoter][whichDim];
                     }
                  } while (copy[currentVoter][0] < 0);
               } else if (orthogonalSimplexRadio.checked) {
                  window.alert('FIXME strategizeOutcome');
               }
               newOutcome = outcomeFunction(copy);

               if (whichDistanceFunction) {
                  if (isOutcomeCloserByMetric(votePoints[currentVoter], newOutcome, outcome, metric, significance) === 1) {
                     found = true;
                     changed = true;
                     for (whichDim = 0; whichDim < numDims; whichDim += 1) {
                        strategicPoints[currentVoter][whichDim] = copy[currentVoter][whichDim];
                     }
                  }
               } else {
                  distanceByDim = isOutcomeCloserByDim(votePoints[currentVoter], newOutcome, outcome, significance);
                  for (whichDim = 0; whichDim < numDims; whichDim += 1) {
                     if (isNaN(distanceByDim[whichDim]) || distanceByDim[whichDim] === -1) {
                        found = true;
                     } else if (distanceByDim[whichDim] === 1) {
                        changed = true;
                     }
                  }
                  if (found) {
                     found = false;
                     changed = false;
                  } else if (changed) {
                     found = true;
                     changed = true;
                     for (whichDim = 0; whichDim < numDims; whichDim += 1) {
                        strategicPoints[currentVoter][whichDim] = copy[currentVoter][whichDim];
                     }
                  } else {
                     changed = false;
                  }
               }
            }
            // restore copy to original state for batch mode
            for (whichDim = 0; whichDim < numDims && batchMode; whichDim += 1) {
               copy[currentVoter][whichDim] = tempPoint[whichDim];
            }
         }
      } else { // try corners; still not done
         if (simplexRadio.checked) {
            for (currentVoter = (batchMode ? startingPoint : onWhich); currentVoter < (batchMode ? numVoters : onWhich + 1); currentVoter += 1) {
               found = false;
               for (whichPoint = 0; whichPoint < numVoters; whichPoint += 1) {
                  for (whichDim = 0; whichDim < numDims; whichDim += 1) {
                     copy[whichPoint][whichDim] = strategicPoints[whichPoint][whichDim];
                  }
               }
            }
         }
      }

      return changed;
   };

   var redrawSpace = function (pointBeingDragged) {
      var whichDim, whichPoint, limitPoints, outcomeFunction, outcomeBorderColor;
      var nonFocusColor = '#6699cc';
      var focusColor = '#9966cc';
      var nonFocusStrategicVoteColor = '#000000';
      var focusStrategicVoteColor = '#000000';

      if (animationInProgress) {
         resetAnimation();
      }

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
      for (whichPoint = 0; whichPoint < strategySystemOptions.length; whichPoint += 1) {
         if (strategySystemOptions[whichPoint].checked) {
            outcomeFunction = strategySystemOptions[whichPoint].func;
            outcomeBorderColor = strategySystemOptions[whichPoint].color;
         }
      }
      // draw limits of manipulation for voter 1 (i.e. votePoints[0]);
      // now uses radio buttons for selection instead of checkboxes
      if (showOutcomeBorderCheckbox.checked) {
         limitPoints = findLimits(votePoints, outcomeFunction, (typeof pointBeingDragged === 'number' ? pointBeingDragged : 0));
         drawLimits(limitPoints, outcomeBorderColor);
      }

      if (automaticStrategyCheckbox.checked || moveStrategicCheckbox.checked || showStrategicOutcomesCheckbox.checked) {
         // calculate new strategic votes if appropriate
         if (moveStrategicCheckbox.checked && lockVotesCheckbox.checked && automaticStrategyCheckbox.checked) {
            if (outcomeFunction === calcAverage) {
               dsvAverage(0);
            } else {
               strategizeOutcome(0, outcomeFunction, true, 20, 0);
            }
         } else if (!moveStrategicCheckbox.checked && automaticStrategyCheckbox.checked) {
            dsvAverage();
         }

         // draw "rubber bands": lines from sincere points to strategic votes
         for (whichPoint = 0; whichPoint < numVoters; whichPoint += 1) {
            var voteScreen = toScreenCoords(votePoints[whichPoint]);
            var strategicScreen = toScreenCoords(strategicPoints[whichPoint]);
            votespaceContext.beginPath();
            votespaceContext.moveTo(strategicScreen.x + 0.5, strategicScreen.y + 0.5);
            votespaceContext.lineTo(voteScreen.x + 0.5, voteScreen.y + 0.5);
            votespaceContext.strokeStyle = '#999999';
            if (moveStrategicCheckbox.checked) {
               // color rubber bands: green for successful manipulation, red for backfire
               var pointsIfSincere = [];
               var pointsIfStrategic = [];
               var outcomeIfSincere, outcomeIfStrategic;
               var whichOtherPoint, whichSystem;
               for (whichOtherPoint = 0; whichOtherPoint < numVoters; whichOtherPoint += 1) {
                  pointsIfSincere.push([]);
                  pointsIfStrategic.push([]);
                  for (whichDim = 0; whichDim < numDims; whichDim += 1) {
                     pointsIfSincere[whichOtherPoint].push(whichOtherPoint === whichPoint ? votePoints[whichOtherPoint][whichDim] : strategicPoints[whichOtherPoint][whichDim]);
                     pointsIfStrategic[whichOtherPoint].push(strategicPoints[whichOtherPoint][whichDim]);
                  }
               }
               for (whichSystem = 0; whichSystem < strategySystemOptions.length; whichSystem += 1) {
                  if (strategySystemOptions[whichSystem].checked) {
                     outcomeIfSincere = strategySystemOptions[whichSystem].func(pointsIfSincere);
                     outcomeIfStrategic = strategySystemOptions[whichSystem].func(pointsIfStrategic);
                  }
               }
               var betterOrWorse = isOutcomeDominatinglyCloser(votePoints[whichPoint], outcomeIfStrategic, outcomeIfSincere);
               if (betterOrWorse > 0) {
                  votespaceContext.strokeStyle = '#339966';
               } else if (betterOrWorse < 0) {
                  votespaceContext.strokeStyle = '#993366';
               } else if (betterOrWorse === 0) {
                  votespaceContext.strokeStyle = '#666666';
               }
            }
            votespaceContext.stroke();
         }
      }

      // draw vote points
      for (whichPoint = 0; whichPoint < numVoters; whichPoint += 1) {
         drawVotePoint(votePoints[whichPoint], pointBeingDragged === whichPoint ? focusColor : nonFocusColor, 6);
         votePointRows[whichPoint].style.display = '';
         // don't update textboxes while update is pending
         if (whichPoint !== updateInProgress) {
            for (whichDim = 0; whichDim < numDims; whichDim += 1) {
               votePointTextboxes[whichPoint][whichDim].value = votePoints[whichPoint][whichDim].toFixed(5);
            }
         }
      }
      for (whichPoint = numVoters; whichPoint < maxNumVoters; whichPoint += 1) {
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

      // draw strategic votes and equilibrium Average outcome
      if (automaticStrategyCheckbox.checked || moveStrategicCheckbox.checked || showStrategicOutcomesCheckbox.checked) {
         for (whichPoint = 1; whichPoint < numVoters; whichPoint += 1) {
            drawVotePoint(strategicPoints[whichPoint], nonFocusStrategicVoteColor, 4);
         }
         drawVotePoint(strategicPoints[0], focusStrategicVoteColor, 4);
         if (showStrategicOutcomesCheckbox.checked) {
            if (typeof pointBeingDragged === 'number' && pointBeingDragged >= 0 && outcomeFunction && moveStrategicCheckbox.checked) {
               var focalSincerePoints = [];
               for (whichPoint = 0; whichPoint < numVoters; whichPoint += 1) {
                  focalSincerePoints.push([]);
                  for (whichDim = 0; whichDim < numDims; whichDim += 1) {
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
                  drawVotePoint(outcomeFunction(focalSincerePoints), '#aaaaaa', 6);
               }
               const closerByDim = isOutcomeCloserByDim(
                  votePoints[pointBeingDragged],
                  outcomeFunction(strategicPoints),
                  outcomeFunction(focalSincerePoints)
               );
               const closerByEuclidean = isOutcomeCloserByMetric(
                  votePoints[pointBeingDragged],
                  outcomeFunction(strategicPoints),
                  outcomeFunction(focalSincerePoints),
                  2
               );
               aarDsvOutput.innerHTML = closerByDim.map(
                  (closerInDim, whichDim) => dimNames[whichDim] + ': ' + (
                     closerInDim === 0
                     ? 'no change'
                     : closerInDim > 0
                     ? 'closer to ideal'
                     : closerInDim < 0
                     ? 'farther from ideal'
                     : 'overshot ideal'
                  )
               ).join(', ') + '; by Euclidean distance: ' + (
                  closerByEuclidean === 0
                  ? 'no change'
                  : closerByEuclidean > 0
                  ? 'closer to ideal'
                  : closerByEuclidean < 0
                  ? 'farther from ideal'
                  : '?'
               );
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
   var resetStrategic = function (focal) {
      var whichPoint, whichDim;
      for (whichPoint = 0; whichPoint < numVoters; whichPoint += 1) {
         if (focal !== whichPoint) {
            for (whichDim = 0; whichDim < numDims; whichDim += 1) {
               strategicPoints[whichPoint][whichDim] = votePoints[whichPoint][whichDim];
            }
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
      for (whichDim = 0; whichDim < numDims; whichDim += 1) {
         input = parseFloat(votePointTextboxes[num][whichDim].value);
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
      for (num = 0; num < votePointTextboxes.length; num += 1) {
         for (num2 = 0; num2 < votePointTextboxes[num].length; num2 += 1) {
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
      for (num = 0; num < votePointRows.length; num += 1) {
         // highlight point corresponding to row clicked on
         votePointRows[num].addEventListener('mousedown', function () {
            // make sure not to interfere with focus and blur handlers
            if (document.activeElement.id.substring(0, 9) !== 'votepoint') {
               drawVotePoint(votePoints[this.id[9]], '#9966cc', 6);
            }
         }, false);
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

   lockVotesCheckbox.addEventListener('change', function () {
      votesLocked = lockVotesCheckbox.checked;
      votePointTextboxes.forEach(function (row, whichVoter) {
         row.forEach(function (votePointTextbox) {
            // don't lock focal voter
            votePointTextbox.disabled = whichVoter > 0 && votesLocked;
         });
      });
      redrawSpace();
   });

   selectNElement.addEventListener('change', function () {
      numVoters = parseInt(selectNElement.options[selectNElement.selectedIndex].value, 10);
      addOrRemoveVotePoints();
      redrawSpace();
   });

   const changeVotespace = function () {
      fixNumDims();
      votePoints = [];
      strategicPoints = [];
      addOrRemoveVotePoints();
      redrawSpace();
   };

   lineSegmentRadio.addEventListener('change', changeVotespace);
   hypercubeRadio.addEventListener('change', changeVotespace);
   simplexRadio.addEventListener('change', changeVotespace);
   truncatedSimplexRadio.addEventListener('change', changeVotespace);
   orthogonalSimplexRadio.addEventListener('change', changeVotespace);

   drawGridLinesCheckbox.addEventListener('change', redrawSpace);
   displayAarDsvCheckbox.addEventListener('change', redrawSpace);
   displayAverageCheckbox.addEventListener('change', redrawSpace);
   displayFermatWeberCheckbox.addEventListener('change', redrawSpace);
   displayPerDimMedianCheckbox.addEventListener('change', redrawSpace);
   displayPerDimMidrangeCheckbox.addEventListener('change', redrawSpace);
   showStrategicOutcomesCheckbox.addEventListener('change', redrawSpace);
   document.querySelector('#strategy-system-options-radio').addEventListener('change', redrawSpace);
   showOutcomeBorderCheckbox.addEventListener('change', redrawSpace);
   moveStrategicCheckbox.addEventListener('change', redrawSpace);
   automaticStrategyCheckbox.addEventListener('change', redrawSpace);

   // allow the user to drag a vote point around
   votespaceCanvas.onmousedown = function (ev) {
      if (animationInProgress && !votesLocked) {
         redrawSpace();
      }

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

         return {
            x: ev.clientX - getTrueOffsetLeft(votespaceCanvas) + window.pageXOffset - (votespaceCanvas.offsetWidth - votespaceCanvas.width) / 2,
            y: ev.clientY - getTrueOffsetTop(votespaceCanvas) + window.pageYOffset - (votespaceCanvas.offsetHeight - votespaceCanvas.height) / 2
         };
      };

      var whichPoint = (function () {
         var screen, sumSqDiff, whichPoint, xDiff, yDiff;
         var closestPoint = null; // return null if no point was selected
         var mouse = getMouse(ev);
         var smallestSumSqDiff = Number.POSITIVE_INFINITY;
         for (whichPoint = 0; whichPoint < numVoters; whichPoint += 1) {
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
            var whichDim;
            if (moveStrategicCheckbox.checked) {
               strategicPoints[whichPoint] = projectVotePointToSpace(toVoteDims(getMouse(ev)));
            } else {
               votePoints[whichPoint] = projectVotePointToSpace(toVoteDims(getMouse(ev)));
            }
            for (whichDim = 0; whichDim < numDims; whichDim += 1) {
               votePointTextboxes[whichPoint][whichDim].value = votePoints[whichPoint][whichDim].toFixed(5);
            }
            // highlight table row for selected point
            votePointRows[whichPoint].style.backgroundColor = '#ffff55';
            if (moveStrategicCheckbox.checked) {
               clickOutput.innerHTML = 'x = ' + strategicPoints[whichPoint][0].toFixed(5);
               if (numDims > 1) {
                  clickOutput.innerHTML += ', y = ' + strategicPoints[whichPoint][1].toFixed(5);
                  if (numDims > 2) {
                     clickOutput.innerHTML += ', z = ' + strategicPoints[whichPoint][2].toFixed(5);
                  }
               }
            } else {
               clickOutput.innerHTML = 'x = ' + votePoints[whichPoint][0].toFixed(5);
               if (numDims > 1) {
                  clickOutput.innerHTML += ', y = ' + votePoints[whichPoint][1].toFixed(5);
                  if (numDims > 2) {
                     clickOutput.innerHTML += ', z = ' + votePoints[whichPoint][2].toFixed(5);
                  }
               }
            }
            if (!(animationInProgress && votesLocked)) {
               redrawSpace(whichPoint);
            }
         };
         document.onmousemove(ev); // immediately show that the point has been selected
         document.onmouseup = function (ev) {
            var whichDim;
            // un-highlight table rows

            document.onmousemove = null; // stop moving point around
            if (!moveStrategicCheckbox.checked) {
               for (whichDim = 0; whichDim < numDims; whichDim += 1) {
                  strategicPoints[whichPoint][whichDim] = votePoints[whichPoint][whichDim];
               }
            }
            votePointRows[whichPoint].style.backgroundColor = '';
            document.onmouseup = function (ev) {
               document.onmousemove = null; // stop moving point around (in case it gets sticky)
            };
            if (!(animationInProgress && votesLocked)) {
               redrawSpace();
            }
         };
      } else { // give result of testing according to AAR DSV inequalities
         var clickedPoint = projectVotePointToSpace(toVoteDims(getMouse(ev)));
         var testResult = testInequalities(clickedPoint, votePoints);
         clickOutput.innerHTML = 'x = ' + clickedPoint[0].toFixed(5);
         if (numDims > 1) {
            clickOutput.innerHTML += ', y = ' + clickedPoint[1].toFixed(5);
            if (numDims > 2) {
               clickOutput.innerHTML += ', z = ' + clickedPoint[2].toFixed(5);
            }
         }
         clickOutput.innerHTML += '<br />by inequalities: ' + (testResult.dimSize[0] < 0 ? 'x too small' : testResult.dimSize[0] > 0 ? 'x too big' : 'x just right');
         if (numDims > 1) {
            clickOutput.innerHTML += '; ' + (testResult.dimSize[1] < 0 ? 'y too small' : testResult.dimSize[1] > 0 ? 'y too big' : 'y just right');
            if (numDims > 2) {
               clickOutput.innerHTML += '; ' + (testResult.dimSize[2] < 0 ? 'z too small' : testResult.dimSize[2] > 0 ? 'z too big' : 'z just right');
            }
         }
         var outcome = calcAarDsv(votePoints);
         clickOutput.innerHTML += '<br />by DSV outcome: ' + (clickedPoint[0] < outcome[0] ? 'x too small' : clickedPoint[0] > outcome[0] ? 'x too big' : 'x just right');
         if (numDims > 1) {
            clickOutput.innerHTML += '; ' + (clickedPoint[1] < outcome[1] ? 'y too small' : clickedPoint[1] > outcome[1] ? 'y too big' : 'y just right');
            if (numDims > 2) {
               clickOutput.innerHTML += '; ' + (clickedPoint[2] < outcome[2] ? 'z too small' : clickedPoint[2] > outcome[2] ? 'z too big' : 'z just right');
            }
         }
      }
      return true; // allow the default event handler to be called
   };

   document.querySelector('#randomize-points').onclick = function () {
      votePoints = [];
      strategicPoints = [];
      addOrRemoveVotePoints();
      redrawSpace();
      return false; // don't do anything else because of the click
   };

   // for sorting arrays of objects or arrays by their first value (assuming numerical)
   var sortOrder = function (a, b) {
      return a[0] - b[0];
   };

   /* strategize, batchMode, and withLimits are all assumed to be boolean variables. Strategize determines whether an update function is
    * called (when it's true) or whether to animate directly to the values in strategicPoints. It's true for all user selected modes.
    * batchMode should be exactly what is sounds like. withLimits is the velocity limits toggle.
    * updateFunction specifies a function to be used for updating strategicPoints. onWhich keeps track of which voter is currently being
    * strategized for in voter-by-voter mode. (i.e. when batchMode is false.)  timeIncrement is used to set the setInterval time delay.
    * order is assumed to be an array of objects, and is used to randomize the ordering of voters in voter-by-voter modes. The array is
    * created within the function, so it's best not to pass anything to order.
    * checked is which manipulation option was selected.
    */
   var animateElection = function animateElection(strategize, batchMode, withLimits, updateFunction, onWhich, timeIncrement, order, checked) {
      var whichPoint, whichDim, voteScreen, demoScreen, moved = false, active, maxRounds = 200, rounds = 0, randomVotesPerVoter = 1, copy = [], outcome, newOutcome, whichDistanceFunction = 1, metric = 2, distanceByDim, tempVote = [];

      // prevent from executing if called outside of animation or if strategicPoints isn't properly initialized
      if (!animationInProgress || strategicPoints.length !== numVoters) {
         resetAnimation();
         return;
      }
      // default to average
      if (checked === undefined || checked >= strategySystemOptions.length) {
         checked = 1;
      }
      // initialize random ordering of voters
      if (!order) {
         onWhich = 0;
         order = [];
         for (whichPoint = 0; whichPoint < numVoters; whichPoint += 1) {
            order.push([Math.random(), whichPoint]);
         }
         order.sort(sortOrder);
         if (votesLocked && order[onWhich][1] === 0) {
            onWhich += 1;
         }
      }
      // initialize animatedVote array
      if (!animatedVote) {
         animatedVote = [];
         for (whichPoint = 0; whichPoint < numVoters; whichPoint += 1) {
            animatedVote.push([]);
            for (whichDim = 0; whichDim < numDims; whichDim += 1) {
               animatedVote[whichPoint].push(strategicPoints[whichPoint][whichDim]);
            }
         }
         if (updateFunction) {
            updateFunction(order[onWhich][1], strategySystemOptions[checked].func, batchMode, randomVotesPerVoter, whichDistanceFunction, metric);
         }
      }

      for (whichPoint = 0; whichPoint < numVoters; whichPoint += 1) {
         copy.push([]);
         for (whichDim = 0; whichDim < numDims; whichDim += 1) {
            // precaution to prevent FP underflow
            if (animatedVote[whichPoint][whichDim] < 1.0e-10) {
               animatedVote[whichPoint][whichDim] = 0;
            }
            copy[whichPoint].push(animatedVote[whichPoint][whichDim]);
         }
      }
      outcome = strategySystemOptions[checked].func(animatedVote);
      for (whichPoint = 0; whichPoint < numVoters; whichPoint += 1) {
         for (whichDim = 0; whichDim < numDims; whichDim += 1) {
            if (batchMode) {
               tempVote[whichDim] = animatedVote[whichPoint][whichDim];
            }
            if (strategicPoints[whichPoint][whichDim] < 1.0e-10) {
               strategicPoints[whichPoint][whichDim] = 0;
            }

            if (animatedVote[whichPoint][whichDim] < (strategicPoints[whichPoint][whichDim] - 0.0000001)) {
               moved = true;
               if (!batchMode && !withLimits) {
                  active = whichPoint;
               }
               copy[whichPoint][whichDim] += animatedMovementLimit;
               if (copy[whichPoint][whichDim] > strategicPoints[whichPoint][whichDim]) {
                  copy[whichPoint][whichDim] = strategicPoints[whichPoint][whichDim];
               }
            } else if (animatedVote[whichPoint][whichDim] > (strategicPoints[whichPoint][whichDim] + 0.0000001)) {
               moved = true;
               if (!batchMode && !withLimits) {
                  active = whichPoint;
               }
               copy[whichPoint][whichDim] -= animatedMovementLimit;
               if (copy[whichPoint][whichDim] < strategicPoints[whichPoint][whichDim]) {
                  copy[whichPoint][whichDim] = strategicPoints[whichPoint][whichDim];
               }
            }
         }
         copy[whichPoint] = projectVotePointToSpace(copy[whichPoint]);
         if (withLimits && moved) {
            newOutcome = strategySystemOptions[checked].func(copy);
            if (whichDistanceFunction === 1) {
               if (isOutcomeCloserByMetric(votePoints[whichPoint], newOutcome, outcome, metric, 1.0e-6) < 0) {
                  for (whichDim = 0; whichDim < numDims; whichDim += 1) {
                     copy[whichPoint][whichDim] = animatedVote[whichPoint][whichDim];
                  }
               } else {
                  for (whichDim = 0; whichDim < numDims; whichDim += 1) {
                     animatedVote[whichPoint][whichDim] = copy[whichPoint][whichDim];
                  }
               }
            } else {
               distanceByDim = isOutcomeCloserByDim(votePoints[whichPoint], newOutcome, outcome, 1.0e-6);
               for (whichDim = 0; whichDim < numDims; whichDim += 1) {
                  if (isNaN(distanceByDim[whichDim]) ||  distanceByDim[whichDim] < 0) {
                     moved = false;
                  }
               }
               if (!moved) {
                  for (whichDim = 0; whichDim < numDims; whichDim += 1) {
                     copy[whichPoint][whichDim] = animatedVote[whichPoint][whichDim];
                  }
               } else {
                  for (whichDim = 0; whichDim < numDims; whichDim += 1) {
                     animatedVote[whichPoint][whichDim] = copy[whichPoint][whichDim];
                  }
               }
            }
         } else {
            for (whichDim = 0; whichDim < numDims; whichDim += 1) {
               animatedVote[whichPoint][whichDim] = copy[whichPoint][whichDim];
            }
         }
         // restore copy to original state to prevent "peeking" at results in batch mode
         if (batchMode) {
            for (whichDim = 0; whichDim < numDims; whichDim += 1) {
               copy[whichPoint][whichDim] = tempVote[whichDim];
            }
         }
      }
      // temp fix for moving focal point during animation
      if (votesLocked) {
         for (whichDim = 0; whichDim < numDims; whichDim += 1) {
            animatedVote[0][whichDim] = strategicPoints[0][whichDim];
         }
      }

      // enforce movement limit
      if (withLimits) {
         moved = false;
         for (whichPoint = 0; whichPoint < numVoters; whichPoint += 1) {
            for (whichDim = 0; whichDim < numDims; whichDim += 1) {
               strategicPoints[whichPoint][whichDim] = animatedVote[whichPoint][whichDim];
            }
         }
      }

      // draw points and lines
      clearSpace();
      for (whichPoint = 0; whichPoint < numVoters; whichPoint += 1) {
         voteScreen = toScreenCoords(votePoints[whichPoint]);
         demoScreen = toScreenCoords(animatedVote[whichPoint]);
         votespaceContext.beginPath();
         votespaceContext.moveTo(demoScreen.x + 0.5, demoScreen.y + 0.5);
         votespaceContext.lineTo(voteScreen.x + 0.5, voteScreen.y + 0.5);
         votespaceContext.strokeStyle = '#aaaaaa';
         votespaceContext.stroke();
         votespaceContext.closePath();
      }
      for (whichPoint = 0; whichPoint < numVoters; whichPoint += 1) {
         if (votesLocked && whichPoint === 0) {
            drawVotePoint(votePoints[whichPoint], '#6699cc', 6);
         } else {
            drawVotePoint(votePoints[whichPoint], active === whichPoint ? '#9966cc' : '#aaaaaa', 6);
         }
         drawVotePoint(animatedVote[whichPoint], '#c0c0c0', 4);
         drawVotePoint(strategicPoints[whichPoint], '#000000', 4);
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

      // draw outcome for selected system to manipulate
      drawVotePoint(strategySystemOptions[checked].func(animatedVote), strategySystemOptions[checked].color, 3.5);
      // draw selected strategic outcomes using animatedVote values
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
         // reset movement limit
         animatedMovementLimit = animatedMovementLimitBase;

         // housekeeping for various modes; increment which voter is being strategized for,
         // randomize order if a round has been completed
         if (!batchMode) {
            onWhich += 1;
            if (votesLocked && order[onWhich] && order[onWhich][1] === 0) {
               onWhich += 1;
            }
            if (onWhich >= numVoters) {
               onWhich = 0;
               for (whichPoint = 0; whichPoint < numVoters; whichPoint += 1) {
                  order[whichPoint][0] = Math.random();
               }
               order.sort(sortOrder);
               if (votesLocked && order[onWhich][1] === 0) {
                  onWhich += 1;
               }
            }
            if (!strategize) {
               animatedVote = null;
            }
         }
         if (updateFunction) {
            while (animationInProgress && rounds < maxRounds && !updateFunction(order[onWhich][1], strategySystemOptions[checked].func, batchMode, randomVotesPerVoter, whichDistanceFunction, metric)) {
               if (batchMode) {
                  rounds += 1;
               } else {
                  onWhich += 1;
                  if (votesLocked && order[onWhich] && order[onWhich][1] === 0) {
                     onWhich += 1;
                  }
                  if (onWhich >= numVoters) {
                     rounds += 1;
                     onWhich = 0;
                     for (whichPoint = 0; whichPoint < numVoters; whichPoint += 1) {
                        order[whichPoint][0] = Math.random();
                     }
                     order.sort(sortOrder);
                     if (votesLocked && order[onWhich][1] === 0) {
                        onWhich += 1;
                     }
                  }
               }
            }
            if (rounds >= maxRounds) {
               if (votesLocked) {
                  if (!animateElection.d) {
                     animateElection.d = new Date();
                  }
                  var c = new Date();
                  // if 30 seconds have passed without any changes, finish animation
                  if (c - animateElection.d > 30000) {
                     animatedVote = null;
                     animationInProgress = false;
                     redrawSpace();
                     return;
                  }
               } else {
                  animatedVote = null;
                  animationInProgress = false;
                  redrawSpace();
                  return;
               }
            } else {
               if (votesLocked) {
                  animateElection.d = null;
               }
            }
         }

         if (animationInProgress) {
            animateIntervalId = window.setTimeout(function () {
               animateElection(strategize, batchMode, withLimits, updateFunction, onWhich, timeIncrement, order, checked, rounds);
            }, timeIncrement);
         }
      } else if (animationInProgress) {
         animateIntervalId = window.setTimeout(function () {
            animateElection(strategize, batchMode, withLimits, updateFunction, onWhich, timeIncrement, order, checked, rounds);
         }, timeIncrement);
      }
   };

   stopAnimationButton.onclick = function () {
      redrawSpace();
   };

   startAnimationButton.onclick = function () {
      var whichVoter, whichDim, userInput, timeIncrement, batchMode = false, strategize = true, velocityLimits = false, largestVal = 0, largestAt, checked;
      if (animationInProgress) {
         resetAnimation();
      }
      // update movement limit and timeout length based on user input
      userInput = parseFloat(velocityLimitTextbox.value);
      if (!isNaN(userInput)) {
         animatedMovementLimitBase = userInput > 0 ? userInput : animatedMovementLimitBase;
      }
      userInput = parseFloat(timeIntervalTextbox.value);
      timeIncrementBase = (
         (Number.isFinite(userInput) && userInput > 0)
         ? userInput
         : 0
      );
      timeIntervalTextbox.value = timeIncrementBase.toString();
      velocityLimitTextbox.value = animatedMovementLimitBase.toString();
      animatedMovementLimit = animatedMovementLimitBase;
      timeIncrement = timeIncrementBase;

      // find selected system to manipulate
      for (whichVoter = 0; whichVoter < strategySystemOptions.length; whichVoter += 1) {
         if (strategySystemOptions[whichVoter].checked) {
            checked = whichVoter;
         }
      }

      animatedVote = null;

      // initialize starting points depending on which option was selected
      if (animationStartSincereRadio.checked) {
         resetStrategic(votesLocked ? 0 : null);
      } else if (animationStartRandomRadio.checked) {
         for (whichVoter = votesLocked ? 1 : 0; whichVoter < numVoters; whichVoter += 1) {
            if (lineSegmentRadio.checked || hypercubeRadio.checked) {
               for (whichDim = 0; whichDim < numDims; whichDim += 1) {
                  strategicPoints[whichVoter][whichDim] = Math.floor(Math.random() * 100001) / 100000;
               }
               strategicPoints[whichVoter] = projectVotePointToSpace(strategicPoints[whichVoter]);
            } else if (simplexRadio.checked) {
               do {
                  strategicPoints[whichVoter][0] = 1;
                  for (whichDim = 1; whichDim < numDims; whichDim += 1) {
                     strategicPoints[whichVoter][whichDim] = Math.floor(Math.random() * 100001) / 100000;
                     strategicPoints[whichVoter][0] -= strategicPoints[whichVoter][whichDim];
                  }
               } while (strategicPoints[whichVoter][0] < 0);
            } else if (truncatedSimplexRadio.checked) {
               window.alert('FIXME startAnimationButton.onclick 1');
            } else if (orthogonalSimplexRadio.checked) {
               window.alert('FIXME startAnimationButton.onclick 1');
            }
         }
      } else if (animationStartSameCornerRadio.checked) {
         for (whichVoter = votesLocked ? 1 : 0; whichVoter < numVoters; whichVoter += 1) {
            for (whichDim = 0; whichDim < numDims; whichDim += 1) {
               if (whichDim === 2) {
                  strategicPoints[whichVoter][whichDim] = 1;
               } else {
                  strategicPoints[whichVoter][whichDim] = 0;
               }
            }
         }
      } else if (animationStartNearCornerRadio.checked) {
         for (whichVoter = votesLocked ? 1 : 0; whichVoter < numVoters; whichVoter += 1) {
            if (lineSegmentRadio.checked || hypercubeRadio.checked) {
               for (whichDim = 0; whichDim < numDims; whichDim += 1) {
                  if (votePoints[whichVoter][whichDim] < 0.5) {
                     strategicPoints[whichVoter][whichDim] = 0;
                  } else {
                     strategicPoints[whichVoter][whichDim] = 1;
                  }
               }
            } else if (simplexRadio.checked) {
               largestVal = 0;
               for (whichDim = 0; whichDim < numDims; whichDim += 1) {
                  strategicPoints[whichVoter][whichDim] = 0;
                  if (votePoints[whichVoter][whichDim] > largestVal) {
                     largestVal = votePoints[whichVoter][whichDim];
                     largestAt = whichDim;
                  }
               }
               strategicPoints[whichVoter][largestAt] = 1;
            } else if (truncatedSimplexRadio.checked) {
               window.alert('FIXME startAnimationButton.onclick 2');
            } else if (orthogonalSimplexRadio.checked) {
               window.alert('FIXME startAnimationButton.onclick 2');
            }
         }
      }
      // set global animation flag
      animationInProgress = true;
      // flags for different modes
      if (animationModeOrderedVLRadio.checked) {
         velocityLimits = true;
      } else if (animationModeBatchVLRadio.checked) {
         velocityLimits = true;
         timeIncrement = timeIncrementBase * numVoters;
         batchMode = true;
      }
      // reset any timer that was active
      if (votesLocked) {
         animateElection.d = null;
      }
      animateElection(strategize, batchMode, velocityLimits, strategizeOutcome, 0, timeIncrement, false, checked, 0);
   };

   redrawSpace(); // show initial points
});
