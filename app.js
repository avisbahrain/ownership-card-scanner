/* =========================================================
   ID CARD SCANNER
   =========================================================

   IMPORTANT BEHAVIOR:

   1. Camera opens.
   2. Card detection runs only as a visual guide.
   3. Detection NEVER automatically captures.
   4. User MUST press the Capture button.
   5. Capture ALWAYS works if the camera is ready.
   6. If edge detection succeeds:
        -> perspective correction is applied.
   7. If edge detection fails:
        -> original captured photo is used.
   8. Front -> Back -> Preview.
   9. Unlimited pages.
   10. Two images per PDF page.

========================================================= */


/* =========================================================
   STATE
========================================================= */

let pages = [];

let currentPage = {
  front: null,
  back: null
};

let currentSide = "front";

let cameraStream = null;

let usingFrontCamera = false;

let opencvReady = false;

let detectionTimer = null;


/* =========================================================
   ELEMENTS
========================================================= */

const startScreen =
  document.getElementById("startScreen");

const cameraScreen =
  document.getElementById("cameraScreen");

const previewScreen =
  document.getElementById("previewScreen");

const documentsScreen =
  document.getElementById("documentsScreen");


const startBtn =
  document.getElementById("startBtn");

const video =
  document.getElementById("video");

const captureBtn =
  document.getElementById("captureBtn");

const switchCameraBtn =
  document.getElementById("switchCameraBtn");

const cancelCameraBtn =
  document.getElementById("cancelCameraBtn");


const pageLabel =
  document.getElementById("pageLabel");

const sideLabel =
  document.getElementById("sideLabel");

const instructionTitle =
  document.getElementById("instructionTitle");

const instructionText =
  document.getElementById("instructionText");


const edgeStatus =
  document.getElementById("edgeStatus");

const documentGuide =
  document.getElementById("documentGuide");


const frontPreview =
  document.getElementById("frontPreview");

const backPreview =
  document.getElementById("backPreview");


const retakeFrontBtn =
  document.getElementById("retakeFrontBtn");

const retakeBackBtn =
  document.getElementById("retakeBackBtn");


const addPageBtn =
  document.getElementById("addPageBtn");

const finishBtn =
  document.getElementById("finishBtn");


const pagesList =
  document.getElementById("pagesList");

const pageCount =
  document.getElementById("pageCount");


const addAnotherBtn =
  document.getElementById("addAnotherBtn");

const downloadPdfBtn =
  document.getElementById("downloadPdfBtn");

const clearAllBtn =
  document.getElementById("clearAllBtn");


const captureCanvas =
  document.getElementById("captureCanvas");

const processingCanvas =
  document.getElementById("processingCanvas");


const processingModal =
  document.getElementById("processingModal");

const processingText =
  document.getElementById("processingText");


/* =========================================================
   OPENCV LOAD CHECK
========================================================= */

function checkOpenCV() {

  if (
    typeof cv !== "undefined" &&
    cv.Mat
  ) {

    opencvReady = true;

    console.log(
      "OpenCV is ready."
    );

    return;
  }

  setTimeout(
    checkOpenCV,
    500
  );
}

checkOpenCV();


/* =========================================================
   SCREEN CONTROL
========================================================= */

function showScreen(screen) {

  [
    startScreen,
    cameraScreen,
    previewScreen,
    documentsScreen

  ].forEach(
    element => {

      element.classList.remove(
        "active"
      );

    }
  );


  screen.classList.add(
    "active"
  );
}


/* =========================================================
   START
========================================================= */

startBtn.addEventListener(
  "click",
  async () => {

    pages = [];

    currentPage = {
      front: null,
      back: null
    };

    currentSide = "front";

    updateCameraUI();

    showScreen(
      cameraScreen
    );

    await startCamera();
  }
);


/* =========================================================
   START CAMERA
========================================================= */

async function startCamera() {

  stopCamera();

  stopDetectionLoop();


  if (
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
  ) {

    alert(
      "Camera is not available.\n\n" +
      "Please open this website using HTTPS."
    );

    return;
  }


  try {

    /*
     * Rear camera by default.
     */

    const constraints = {

      audio: false,

      video: {

        facingMode:
          usingFrontCamera
            ? "user"
            : "environment",

        width: {
          ideal: 1920
        },

        height: {
          ideal: 1080
        },

        frameRate: {
          ideal: 30
        }

      }

    };


    cameraStream =
      await navigator.mediaDevices
        .getUserMedia(
          constraints
        );


    video.srcObject =
      cameraStream;


    video.muted = true;

    video.setAttribute(
      "playsinline",
      ""
    );


    /*
     * Wait for video metadata.
     */

    await new Promise(
      resolve => {

        if (
          video.readyState >= 2
        ) {

          resolve();

          return;
        }


        video.onloadedmetadata =
          () => {

            resolve();

          };

      }
    );


    await video.play();


    edgeStatus.textContent =
      "Align card inside the frame";


    /*
     * Detection starts only as
     * a visual guide.

     * It does NOT capture anything.
     */

    startDetectionLoop();


  } catch (error) {

    console.error(
      "Camera error:",
      error
    );


    handleCameraError(
      error
    );
  }
}


/* =========================================================
   CAMERA ERROR
========================================================= */

function handleCameraError(
  error
) {

  let message =
    "Unable to open camera.\n\n";


  if (
    error.name ===
    "NotAllowedError"
  ) {

    message +=
      "Camera permission was denied.\n\n" +

      "Please allow camera access " +
      "in your browser settings.";

  }

  else if (
    error.name ===
    "NotFoundError"
  ) {

    message +=
      "No camera was found.";

  }

  else if (
    error.name ===
    "NotReadableError"
  ) {

    message +=
      "The camera is already being used " +
      "by another application.";

  }

  else if (
    error.name ===
    "OverconstrainedError"
  ) {

    message +=
      "The selected camera does not support " +
      "the requested settings.";

  }

  else if (
    error.name ===
    "SecurityError"
  ) {

    message +=
      "Camera access was blocked by the browser.";

  }

  else {

    message +=
      error.message ||
      "Unknown camera error.";
  }


  alert(message);
}


/* =========================================================
   STOP CAMERA
========================================================= */

function stopCamera() {

  stopDetectionLoop();


  if (
    !cameraStream
  ) {

    return;
  }


  cameraStream
    .getTracks()
    .forEach(
      track => {

        track.stop();

      }
    );


  cameraStream = null;

  video.srcObject = null;
}


/* =========================================================
   SWITCH CAMERA
========================================================= */

switchCameraBtn.addEventListener(
  "click",
  async () => {

    usingFrontCamera =
      !usingFrontCamera;

    await startCamera();
  }
);


/* =========================================================
   CAMERA UI
========================================================= */

function updateCameraUI() {

  const number =
    pages.length + 1;


  pageLabel.textContent =
    `Page ${number}`;


  if (
    currentSide ===
    "front"
  ) {

    sideLabel.textContent =
      "FRONT";

    instructionTitle.textContent =
      "Scan Front";

    instructionText.textContent =
      "Position the card, then press Capture";

  } else {

    sideLabel.textContent =
      "BACK";

    instructionTitle.textContent =
      "Scan Back";

    instructionText.textContent =
      "Position the card, then press Capture";

  }
}


/* =========================================================
   DETECTION LOOP
========================================================= */

/*
   This function ONLY updates the green guide.

   It NEVER captures.
*/

function startDetectionLoop() {

  stopDetectionLoop();


  if (
    !opencvReady
  ) {

    edgeStatus.textContent =
      "Position card inside the frame";

    return;
  }


  detectionTimer =
    setInterval(
      () => {

        if (
          !video.videoWidth ||
          !video.videoHeight
        ) {

          return;
        }


        if (
          processingModal.classList.contains(
            "show"
          )
        ) {

          return;
        }


        detectGuideOnly();

      },

      500
    );
}


/* =========================================================
   STOP DETECTION LOOP
========================================================= */

function stopDetectionLoop() {

  if (
    detectionTimer
  ) {

    clearInterval(
      detectionTimer
    );

    detectionTimer = null;
  }
}


/* =========================================================
   GUIDE DETECTION
========================================================= */

function detectGuideOnly() {

  if (
    !opencvReady
  ) {

    return;
  }


  try {

    /*
     * Small temporary canvas.
     */

    const width =
      Math.min(
        video.videoWidth,
        900
      );


    const ratio =
      video.videoHeight /
      video.videoWidth;


    const height =
      Math.round(
        width * ratio
      );


    const canvas =
      document.createElement(
        "canvas"
      );


    canvas.width =
      width;

    canvas.height =
      height;


    const context =
      canvas.getContext(
        "2d"
      );


    context.drawImage(
      video,
      0,
      0,
      width,
      height
    );


    const detected =
      findCardCorners(
        canvas
      );


    if (
      detected
    ) {

      documentGuide.classList.add(
        "detected"
      );

      edgeStatus.textContent =
        "✓ Card detected — press Capture";

    } else {

      documentGuide.classList.remove(
        "detected"
      );

      edgeStatus.textContent =
        "Align card inside the frame";

    }

  } catch (error) {

    /*
     * Detection failure should NEVER
     * affect capture.
     */

    documentGuide.classList.remove(
      "detected"
    );

    edgeStatus.textContent =
      "Press Capture when ready";
  }
}


/* =========================================================
   CAPTURE BUTTON
========================================================= */

/*
   THIS IS THE IMPORTANT PART.

   Detection does NOT capture.

   The user MUST press this button.
*/

captureBtn.addEventListener(
  "click",
  capturePhoto
);


/* =========================================================
   CAPTURE PHOTO
========================================================= */

async function capturePhoto() {

  /*
   * Make absolutely sure
   * the camera is ready.
   */

  if (
    !video.videoWidth ||
    !video.videoHeight
  ) {

    alert(
      "Camera is not ready yet."
    );

    return;
  }


  /*
   * Stop guide detection
   * while capturing.
   */

  stopDetectionLoop();


  /*
   * Prevent double tapping.
   */

  captureBtn.disabled =
    true;


  showProcessing(
    "Capturing photo..."
  );


  try {

    /*
     * CAPTURE ALWAYS HAPPENS.
     */

    const image =
      await captureAndProcess();


    /*
     * FRONT
     */

    if (
      currentSide ===
      "front"
    ) {

      currentPage.front =
        image;


      currentSide =
        "back";


      hideProcessing();


      captureBtn.disabled =
        false;


      updateCameraUI();


      /*
       * Detection can run again
       * for the BACK.
       */

      startDetectionLoop();


      edgeStatus.textContent =
        "Now scan the Back";


      return;
    }


    /*
     * BACK
     */

    currentPage.back =
      image;


    stopCamera();


    captureBtn.disabled =
      false;


    hideProcessing();


    showPreview();


  } catch (error) {

    console.error(
      "Capture error:",
      error
    );


    captureBtn.disabled =
      false;


    hideProcessing();


    /*
     * Even if processing fails,
     * we do not silently fail.
     */

    alert(
      "Could not capture the card.\n\n" +
      "Please try again."
    );


    startDetectionLoop();
  }
}


/* =========================================================
   CAPTURE + OPTIONAL PROCESSING
========================================================= */

async function captureAndProcess() {

  let width =
    video.videoWidth;

  let height =
    video.videoHeight;


  /*
   * Limit maximum image size.
   */

  const maxWidth =
    2200;


  if (
    width >
    maxWidth
  ) {

    const ratio =
      maxWidth /
      width;


    width =
      maxWidth;


    height =
      Math.round(
        height * ratio
      );
  }


  captureCanvas.width =
    width;

  captureCanvas.height =
    height;


  const context =
    captureCanvas.getContext(
      "2d"
    );


  /*
   * Capture current camera frame.
   */

  context.drawImage(
    video,
    0,
    0,
    width,
    height
  );


  /*
   * THIS IMAGE IS ALWAYS AVAILABLE.
   */

  const original =
    captureCanvas.toDataURL(
      "image/jpeg",
      0.95
    );


  /*
   * Try edge detection.

   * It is optional.

   * If it fails,
   * original is returned.
   */

  if (
    !opencvReady
  ) {

    return original;
  }


  processingText.textContent =
    "Checking card edges...";


  try {

    const corrected =
      processCard(
        captureCanvas
      );


    /*
     * Detection successful.
     */

    if (
      corrected
    ) {

      return corrected;
    }


    /*
     * Detection failed.

     * IMPORTANT:
     * We STILL RETURN THE PHOTO.
     */

    return original;

  } catch (error) {

    console.error(
      "Processing error:",
      error
    );


    return original;
  }
}


/* =========================================================
   FIND CARD CORNERS
========================================================= */

function findCardCorners(
  canvas
) {

  let src = null;
  let small = null;
  let gray = null;
  let blurred = null;
  let edges = null;
  let contours = null;
  let hierarchy = null;
  let bestContour = null;


  try {

    src =
      cv.imread(
        canvas
      );


    if (
      !src ||
      src.empty()
    ) {

      return null;
    }


    const maxDimension =
      1000;


    let scale = 1;


    if (
      Math.max(
        src.cols,
        src.rows
      ) >
      maxDimension
    ) {

      scale =
        maxDimension /
        Math.max(
          src.cols,
          src.rows
        );
    }


    small =
      new cv.Mat();


    cv.resize(
      src,
      small,

      new cv.Size(
        Math.round(
          src.cols *
          scale
        ),

        Math.round(
          src.rows *
          scale
        )
      ),

      0,
      0,

      cv.INTER_AREA
    );


    gray =
      new cv.Mat();


    cv.cvtColor(
      small,
      gray,
      cv.COLOR_RGBA2GRAY
    );


    blurred =
      new cv.Mat();


    cv.GaussianBlur(
      gray,
      blurred,

      new cv.Size(
        5,
        5
      ),

      0
    );


    edges =
      new cv.Mat();


    cv.Canny(
      blurred,
      edges,
      60,
      180
    );


    contours =
      new cv.MatVector();


    hierarchy =
      new cv.Mat();


    cv.findContours(
      edges,
      contours,
      hierarchy,

      cv.RETR_LIST,

      cv.CHAIN_APPROX_SIMPLE
    );


    const imageArea =
      small.cols *
      small.rows;


    const targetRatio =
      1.586;


    let bestScore =
      0;


    for (
      let i = 0;
      i < contours.size();
      i++
    ) {

      const contour =
        contours.get(i);


      const area =
        cv.contourArea(
          contour
        );


      if (
        area <
        imageArea * 0.04
      ) {

        contour.delete();

        continue;
      }


      const perimeter =
        cv.arcLength(
          contour,
          true
        );


      const approx =
        new cv.Mat();


      cv.approxPolyDP(
        contour,
        approx,

        perimeter *
        0.025,

        true
      );


      if (
        approx.rows === 4
      ) {

        const rect =
          cv.boundingRect(
            approx
          );


        const ratio =
          Math.max(
            rect.width,
            rect.height
          ) /
          Math.min(
            rect.width,
            rect.height
          );


        const difference =
          Math.abs(
            ratio -
            targetRatio
          );


        if (
          difference <
          0.50
        ) {

          const areaRatio =
            area /
            imageArea;


          const ratioScore =
            1 -
            (
              difference /
              0.50
            );


          const score =
            areaRatio *
            0.65 +

            ratioScore *
            0.35;


          if (
            score >
            bestScore
          ) {

            if (
              bestContour
            ) {

              bestContour.delete();

            }


            bestContour =
              approx;

            bestScore =
              score;

          } else {

            approx.delete();

          }

        } else {

          approx.delete();

        }

      } else {

        approx.delete();

      }


      contour.delete();
    }


    if (
      !bestContour
    ) {

      return null;
    }


    const points =
      [];


    for (
      let i = 0;
      i < bestContour.rows;
      i++
    ) {

      points.push({

        x:
          bestContour.data32S[
            i * 2
          ],

        y:
          bestContour.data32S[
            i * 2 + 1
          ]

      });

    }


    if (
      points.length !== 4
    ) {

      return null;
    }


    return points;

  } catch (error) {

    console.error(
      "Find corners error:",
      error
    );


    return null;

  } finally {

    cleanup(
      src,
      small,
      gray,
      blurred,
      edges,
      contours,
      hierarchy,
      bestContour
    );
  }
}


/* =========================================================
   PROCESS CARD
========================================================= */

function processCard(
  canvas
) {

  let src = null;
  let small = null;
  let gray = null;
  let blurred = null;
  let edges = null;
  let contours = null;
  let hierarchy = null;
  let bestContour = null;
  let sourcePoints = null;
  let destinationPoints = null;
  let transform = null;
  let result = null;


  try {

    src =
      cv.imread(
        canvas
      );


    if (
      !src ||
      src.empty()
    ) {

      return null;
    }


    const maxDimension =
      1400;


    let scale = 1;


    if (
      Math.max(
        src.cols,
        src.rows
      ) >
      maxDimension
    ) {

      scale =
        maxDimension /
        Math.max(
          src.cols,
          src.rows
        );
    }


    small =
      new cv.Mat();


    cv.resize(
      src,
      small,

      new cv.Size(
        Math.round(
          src.cols *
          scale
        ),

        Math.round(
          src.rows *
          scale
        )
      ),

      0,
      0,

      cv.INTER_AREA
    );


    gray =
      new cv.Mat();


    cv.cvtColor(
      small,
      gray,
      cv.COLOR_RGBA2GRAY
    );


    blurred =
      new cv.Mat();


    cv.GaussianBlur(
      gray,
      blurred,

      new cv.Size(
        5,
        5
      ),

      0
    );


    edges =
      new cv.Mat();


    cv.Canny(
      blurred,
      edges,
      60,
      180
    );


    contours =
      new cv.MatVector();


    hierarchy =
      new cv.Mat();


    cv.findContours(
      edges,
      contours,
      hierarchy,

      cv.RETR_LIST,

      cv.CHAIN_APPROX_SIMPLE
    );


    const imageArea =
      small.cols *
      small.rows;


    const targetRatio =
      1.586;


    let bestScore =
      0;


    /*
     * Find best quadrilateral.
     */

    for (
      let i = 0;
      i < contours.size();
      i++
    ) {

      const contour =
        contours.get(i);


      const area =
        cv.contourArea(
          contour
        );


      if (
        area <
        imageArea * 0.04
      ) {

        contour.delete();

        continue;
      }


      const perimeter =
        cv.arcLength(
          contour,
          true
        );


      const approx =
        new cv.Mat();


      cv.approxPolyDP(
        contour,
        approx,

        perimeter *
        0.025,

        true
      );


      if (
        approx.rows === 4
      ) {

        const rect =
          cv.boundingRect(
            approx
          );


        const ratio =
          Math.max(
            rect.width,
            rect.height
          ) /
          Math.min(
            rect.width,
            rect.height
          );


        const difference =
          Math.abs(
            ratio -
            targetRatio
          );


        if (
          difference <
          0.50
        ) {

          const areaRatio =
            area /
            imageArea;


          const ratioScore =
            1 -
            (
              difference /
              0.50
            );


          const score =
            areaRatio *
            0.65 +

            ratioScore *
            0.35;


          if (
            score >
            bestScore
          ) {

            if (
              bestContour
            ) {

              bestContour.delete();

            }


            bestContour =
              approx;

            bestScore =
              score;

          } else {

            approx.delete();

          }

        } else {

          approx.delete();

        }

      } else {

        approx.delete();

      }


      contour.delete();
    }


    /*
     * No edge detection.

     * Return null.

     * The caller will use
     * the original photo.
     */

    if (
      !bestContour
    ) {

      documentGuide.classList.remove(
        "detected"
      );

      edgeStatus.textContent =
        "Captured without edge correction";

      return null;
    }


    /*
     * Get corners.
     */

    const points =
      [];


    for (
      let i = 0;
      i < bestContour.rows;
      i++
    ) {

      points.push({

        x:
          bestContour.data32S[
            i * 2
          ],

        y:
          bestContour.data32S[
            i * 2 + 1
          ]

      });

    }


    if (
      points.length !== 4
    ) {

      return null;
    }


    /*
     * Convert coordinates
     * back to original image.
     */

    const originalPoints =
      points.map(
        point => ({

          x:
            point.x /
            scale,

          y:
            point.y /
            scale

        })
      );


    const ordered =
      orderPoints(
        originalPoints
      );


    /*
     * Calculate output width.
     */

    const widthTop =
      distance(
        ordered.tl,
        ordered.tr
      );


    const widthBottom =
      distance(
        ordered.bl,
        ordered.br
      );


    const outputWidth =
      Math.round(
        Math.max(
          widthTop,
          widthBottom
        )
      );


    /*
     * Force exact credit-card
     * aspect ratio.
     */

    const outputHeight =
      Math.round(
        outputWidth /
        1.586
      );


    processingText.textContent =
      "Straightening card...";


    /*
     * Source corners.
     */

    sourcePoints =
      cv.matFromArray(

        4,
        1,

        cv.CV_32FC2,

        [

          ordered.tl.x,
          ordered.tl.y,

          ordered.tr.x,
          ordered.tr.y,

          ordered.br.x,
          ordered.br.y,

          ordered.bl.x,
          ordered.bl.y

        ]

      );


    /*
     * Destination corners.
     */

    destinationPoints =
      cv.matFromArray(

        4,
        1,

        cv.CV_32FC2,

        [

          0,
          0,

          outputWidth - 1,
          0,

          outputWidth - 1,
          outputHeight - 1,

          0,
          outputHeight - 1

        ]

      );


    transform =
      cv.getPerspectiveTransform(
        sourcePoints,
        destinationPoints
      );


    result =
      new cv.Mat();


    cv.warpPerspective(

      src,

      result,

      transform,

      new cv.Size(
        outputWidth,
        outputHeight
      ),

      cv.INTER_LINEAR,

      cv.BORDER_CONSTANT,

      new cv.Scalar()

    );


    /*
     * Green indication.
     */

    documentGuide.classList.add(
      "detected"
    );


    edgeStatus.textContent =
      "✓ Card captured and corrected";


    /*
     * Convert to JPEG.
     */

    cv.imshow(
      processingCanvas,
      result
    );


    const image =
      processingCanvas.toDataURL(
        "image/jpeg",
        0.95
      );


    return image;

  } catch (error) {

    console.error(
      "Card processing error:",
      error
    );


    return null;

  } finally {

    cleanup(
      src,
      small,
      gray,
      blurred,
      edges,
      contours,
      hierarchy,
      bestContour,
      sourcePoints,
      destinationPoints,
      transform,
      result
    );
  }
}


/* =========================================================
   ORDER CORNERS
========================================================= */

function orderPoints(
  points
) {

  let tl =
    points[0];

  let tr =
    points[0];

  let br =
    points[0];

  let bl =
    points[0];


  let minSum =
    Infinity;

  let maxSum =
    -Infinity;

  let minDiff =
    Infinity;

  let maxDiff =
    -Infinity;


  points.forEach(
    point => {

      const sum =
        point.x +
        point.y;


      const diff =
        point.x -
        point.y;


      if (
        sum <
        minSum
      ) {

        minSum =
          sum;

        tl =
          point;
      }


      if (
        sum >
        maxSum
      ) {

        maxSum =
          sum;

        br =
          point;
      }


      if (
        diff >
        maxDiff
      ) {

        maxDiff =
          diff;

        tr =
          point;
      }


      if (
        diff <
        minDiff
      ) {

        minDiff =
          diff;

        bl =
          point;
      }

    }
  );


  return {
    tl,
    tr,
    br,
    bl
  };
}


/* =========================================================
   DISTANCE
========================================================= */

function distance(
  a,
  b
) {

  return Math.sqrt(

    Math.pow(
      a.x - b.x,
      2
    )

    +

    Math.pow(
      a.y - b.y,
      2
    )

  );
}


/* =========================================================
   OPENCV CLEANUP
========================================================= */

function cleanup(
  ...objects
) {

  objects.forEach(
    object => {

      if (
        object &&
        typeof object.delete ===
          "function"
      ) {

        try {

          object.delete();

        } catch (_) {}

      }

    }
  );
}


/* =========================================================
   PREVIEW
========================================================= */

function showPreview() {

  const pageNumber =
    pages.length + 1;


  document.getElementById(
    "previewTitle"
  ).textContent =
    `Page ${pageNumber}`;


  frontPreview.src =
    currentPage.front;


  backPreview.src =
    currentPage.back;


  showScreen(
    previewScreen
  );
}


/* =========================================================
   RETAKE FRONT
========================================================= */

retakeFrontBtn.addEventListener(
  "click",
  async () => {

    currentSide =
      "front";


    updateCameraUI();


    showScreen(
      cameraScreen
    );


    await startCamera();
  }
);


/* =========================================================
   RETAKE BACK
========================================================= */

retakeBackBtn.addEventListener(
  "click",
  async () => {

    currentSide =
      "back";


    updateCameraUI();


    showScreen(
      cameraScreen
    );


    await startCamera();
  }
);


/* =========================================================
   ADD NEXT PAGE
========================================================= */

addPageBtn.addEventListener(
  "click",
  async () => {

    if (
      !currentPage.front ||
      !currentPage.back
    ) {

      alert(
        "Both Front and Back are required."
      );

      return;
    }


    pages.push({

      front:
        currentPage.front,

      back:
        currentPage.back

    });


    currentPage = {

      front: null,

      back: null

    };


    currentSide =
      "front";


    updateCameraUI();


    showScreen(
      cameraScreen
    );


    await startCamera();
  }
);


/* =========================================================
   FINISH
========================================================= */

finishBtn.addEventListener(
  "click",
  () => {

    if (
      !currentPage.front ||
      !currentPage.back
    ) {

      alert(
        "Both Front and Back are required."
      );

      return;
    }


    pages.push({

      front:
        currentPage.front,

      back:
        currentPage.back

    });


    currentPage = {

      front: null,

      back: null

    };


    renderPages();


    showScreen(
      documentsScreen
    );
  }
);


/* =========================================================
   RENDER PAGES
========================================================= */

function renderPages() {

  pagesList.innerHTML = "";


  pageCount.textContent =
    `${pages.length} ${
      pages.length === 1
        ? "page"
        : "pages"
    }`;


  pages.forEach(
    (page, index) => {

      const item =
        document.createElement(
          "div"
        );


      item.className =
        "page-item";


      item.innerHTML = `

        <div class="page-item-header">

          <span>
            Page ${index + 1}
          </span>

          <span>
            Front + Back
          </span>

        </div>


        <div class="page-images">

          <img
            src="${page.front}"
            alt="Front"
          >

          <img
            src="${page.back}"
            alt="Back"
          >

        </div>


        <div class="page-actions">

          <button
            type="button"
            data-action="front"
            data-index="${index}">
            Retake Front
          </button>

          <button
            type="button"
            data-action="back"
            data-index="${index}">
            Retake Back
          </button>

          <button
            type="button"
            data-action="delete"
            data-index="${index}">
            Delete
          </button>

        </div>

      `;


      pagesList.appendChild(
        item
      );

    }
  );
}


/* =========================================================
   PAGE ACTIONS
========================================================= */

pagesList.addEventListener(
  "click",
  async event => {

    const button =
      event.target.closest(
        "button"
      );


    if (!button) {
      return;
    }


    const index =
      Number(
        button.dataset.index
      );


    const action =
      button.dataset.action;


    /*
     * DELETE
     */

    if (
      action ===
      "delete"
    ) {

      pages.splice(
        index,
        1
      );


      renderPages();

      return;
    }


    /*
     * RETAKE FRONT
     */

    if (
      action ===
      "front"
    ) {

      currentPage = {

        front:
          pages[index].front,

        back:
          pages[index].back

      };


      pages.splice(
        index,
        1
      );


      currentSide =
        "front";


      updateCameraUI();


      showScreen(
        cameraScreen
      );


      await startCamera();


      return;
    }


    /*
     * RETAKE BACK
     */

    if (
      action ===
      "back"
    ) {

      currentPage = {

        front:
          pages[index].front,

        back:
          pages[index].back

      };


      pages.splice(
        index,
        1
      );


      currentSide =
        "back";


      updateCameraUI();


      showScreen(
        cameraScreen
      );


      await startCamera();

    }

  }
);


/* =========================================================
   SCAN ANOTHER CARD
========================================================= */

addAnotherBtn.addEventListener(
  "click",
  async () => {

    currentPage = {

      front: null,

      back: null

    };


    currentSide =
      "front";


    updateCameraUI();


    showScreen(
      cameraScreen
    );


    await startCamera();
  }
);


/* =========================================================
   CLEAR ALL
========================================================= */

clearAllBtn.addEventListener(
  "click",
  () => {

    if (
      !confirm(
        "Delete all scanned pages?"
      )
    ) {

      return;
    }


    pages = [];


    currentPage = {

      front: null,

      back: null

    };


    renderPages();


    showScreen(
      startScreen
    );
  }
);


/* =========================================================
   CANCEL CAMERA
========================================================= */

cancelCameraBtn.addEventListener(
  "click",
  () => {

    stopCamera();


    if (
      pages.length > 0
    ) {

      renderPages();


      showScreen(
        documentsScreen
      );

    } else {

      showScreen(
        startScreen
      );

    }

  }
);


/* =========================================================
   DOWNLOAD PDF
========================================================= */

downloadPdfBtn.addEventListener(
  "click",
  generatePDF
);


/* =========================================================
   GENERATE PDF
========================================================= */

async function generatePDF() {

  if (
    pages.length === 0
  ) {

    alert(
      "No scanned pages."
    );

    return;
  }


  showProcessing(
    "Creating PDF..."
  );


  try {

    const {
      jsPDF
    } =
      window.jspdf;


    /*
     * A4 portrait.
     */

    const pdf =
      new jsPDF({

        orientation:
          "portrait",

        unit:
          "mm",

        format:
          "a4",

        compress:
          true

      });


    const pageWidth =
      pdf.internal.pageSize.getWidth();


    const pageHeight =
      pdf.internal.pageSize.getHeight();


    const margin =
      10;


    const gap =
      8;


    const labelHeight =
      7;


    /*
     * Two cards per PDF page.

     * Front on top.
     * Back underneath.
     */

    const availableWidth =
      pageWidth -
      margin * 2;


    const availableHeight =
      (
        pageHeight -
        margin * 2 -
        gap -
        labelHeight * 2
      ) / 2;


    /*
     * Credit card ratio.
     */

    const cardWidth =
      Math.min(

        availableWidth,

        availableHeight *
        1.586

      );


    const cardHeight =
      cardWidth /
      1.586;


    const x =
      (
        pageWidth -
        cardWidth
      ) / 2;


    for (
      let i = 0;
      i < pages.length;
      i++
    ) {

      processingText.textContent =
        `Creating PDF page ${
          i + 1
        } of ${
          pages.length
        }`;


      if (
        i > 0
      ) {

        pdf.addPage(
          "a4",
          "portrait"
        );
      }


      /*
       * FRONT
       */

      const frontLabelY =
        margin + 4;


      const frontY =
        margin +
        labelHeight;


      pdf.setFontSize(
        9
      );


      pdf.text(
        `Page ${
          i + 1
        } - FRONT`,

        margin,

        frontLabelY
      );


      pdf.addImage(

        pages[i].front,

        "JPEG",

        x,

        frontY,

        cardWidth,

        cardHeight,

        undefined,

        "FAST"

      );


      /*
       * BACK
       */

      const backLabelY =
        pageHeight / 2 +
        gap / 2 +
        4;


      const backY =
        pageHeight / 2 +
        gap / 2 +
        labelHeight;


      pdf.setFontSize(
        9
      );


      pdf.text(
        `Page ${
          i + 1
        } - BACK`,

        margin,

        backLabelY
      );


      pdf.addImage(

        pages[i].back,

        "JPEG",

        x,

        backY,

        cardWidth,

        cardHeight,

        undefined,

        "FAST"

      );

    }


    /*
     * Download.
     */

    pdf.save(
      `ID-Card-Scan-${getDate()}.pdf`
    );


    hideProcessing();

  } catch (error) {

    console.error(
      "PDF error:",
      error
    );


    hideProcessing();


    alert(
      "Could not create PDF."
    );
  }
}


/* =========================================================
   DATE
========================================================= */

function getDate() {

  const date =
    new Date();


  return [

    date.getFullYear(),

    String(
      date.getMonth() + 1
    ).padStart(
      2,
      "0"
    ),

    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    )

  ].join("-");
}


/* =========================================================
   PROCESSING MODAL
========================================================= */

function showProcessing(
  text
) {

  processingText.textContent =
    text;


  processingModal.classList.add(
    "show"
  );
}


function hideProcessing() {

  processingModal.classList.remove(
    "show"
  );
}


/* =========================================================
   PAGE CLEANUP
========================================================= */

window.addEventListener(
  "beforeunload",
  () => {

    stopCamera();

  }
);
