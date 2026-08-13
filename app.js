/* =========================================================
   CARD SCANNER
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
   OPENCV
========================================================= */

function checkOpenCV() {

  if (
    typeof cv !== "undefined" &&
    cv.Mat
  ) {

    opencvReady = true;

    console.log(
      "OpenCV ready"
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
   SCREEN
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
   CAMERA
========================================================= */

async function startCamera() {

  stopCamera();

  if (
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
  ) {

    alert(
      "Camera is not available.\n\n" +
      "Open this website using HTTPS."
    );

    return;
  }


  try {

    /*
     * Simple constraints.
     *
     * Rear camera is used by default.
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
     * Wait for video.
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
      "Position card inside the frame";


    console.log(
      "Camera opened successfully"
    );


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


  switch (
    error.name
  ) {

    case "NotAllowedError":

      message +=
        "Camera permission was denied.\n\n" +

        "Please allow camera access " +
        "in your browser settings.";

      break;


    case "NotFoundError":

      message +=
        "No camera was found.";

      break;


    case "NotReadableError":

      message +=
        "The camera is already being used " +
        "by another application.";

      break;


    case "OverconstrainedError":

      message +=
        "This camera does not support " +
        "the requested settings.";

      break;


    case "SecurityError":

      message +=
        "Camera access was blocked by " +
        "the browser.";

      break;


    default:

      message +=
        error.message ||
        "Unknown camera error.";

      break;
  }


  alert(message);
}


/* =========================================================
   STOP CAMERA
========================================================= */

function stopCamera() {

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
      "Place the entire card inside the frame";

  } else {

    sideLabel.textContent =
      "BACK";

    instructionTitle.textContent =
      "Scan Back";

    instructionText.textContent =
      "Place the entire card inside the frame";

  }
}


/* =========================================================
   CAPTURE
========================================================= */

captureBtn.addEventListener(
  "click",
  capturePhoto
);


async function capturePhoto() {

  if (
    !video.videoWidth ||
    !video.videoHeight
  ) {

    alert(
      "Camera is not ready yet."
    );

    return;
  }


  showProcessing(
    "Capturing..."
  );


  try {

    const image =
      await captureAndProcess();


    if (
      currentSide ===
      "front"
    ) {

      currentPage.front =
        image;

      currentSide =
        "back";


      hideProcessing();

      updateCameraUI();


      edgeStatus.textContent =
        "Now scan the Back";


      return;
    }


    currentPage.back =
      image;


    stopCamera();

    hideProcessing();

    showPreview();

  } catch (error) {

    console.error(error);

    hideProcessing();

    alert(
      "Could not capture the card."
    );
  }
}


/* =========================================================
   CAPTURE IMAGE
========================================================= */

async function captureAndProcess() {

  let width =
    video.videoWidth;

  let height =
    video.videoHeight;


  /*
   * Don't create extremely
   * large browser images.
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
   * Draw normally.
   */

  context.drawImage(
    video,
    0,
    0,
    width,
    height
  );


  const original =
    captureCanvas.toDataURL(
      "image/jpeg",
      0.95
    );


  /*
   * If OpenCV is unavailable,
   * use the normal image.
   */

  if (
    !opencvReady
  ) {

    return original;
  }


  processingText.textContent =
    "Detecting card edges...";


  const result =
    detectCard(
      captureCanvas
    );


  return (
    result ||
    original
  );
}


/* =========================================================
   DETECT CARD
========================================================= */

function detectCard(
  canvas
) {

  try {

    const src =
      cv.imread(
        canvas
      );


    if (
      !src ||
      src.empty()
    ) {

      return null;
    }


    /*
     * Resize for processing.
     */

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


    const small =
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


    /*
     * Gray
     */

    const gray =
      new cv.Mat();


    cv.cvtColor(
      small,
      gray,
      cv.COLOR_RGBA2GRAY
    );


    /*
     * Blur
     */

    const blurred =
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


    /*
     * Edge detection
     */

    const edges =
      new cv.Mat();


    cv.Canny(
      blurred,
      edges,
      60,
      180
    );


    /*
     * Find contours
     */

    const contours =
      new cv.MatVector();


    const hierarchy =
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


    let bestContour =
      null;

    let bestScore = 0;


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


      /*
       * Ignore small objects.
       */

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


        const ratioDifference =
          Math.abs(
            ratio -
            targetRatio
          );


        /*
         * Credit-card shape.
         */

        if (
          ratioDifference <
          0.50
        ) {

          const areaRatio =
            area /
            imageArea;


          const ratioScore =
            1 -
            (
              ratioDifference /
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
     * No suitable card.
     */

    if (
      !bestContour
    ) {

      cleanup(
        src,
        small,
        gray,
        blurred,
        edges,
        contours,
        hierarchy
      );


      documentGuide.classList.remove(
        "detected"
      );


      edgeStatus.textContent =
        "Manual capture";


      return null;
    }


    /*
     * Read points.
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


    bestContour.delete();


    if (
      points.length !== 4
    ) {

      cleanup(
        src,
        small,
        gray,
        blurred,
        edges,
        contours,
        hierarchy
      );

      return null;
    }


    /*
     * Convert to original coordinates.
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
     * Width.
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
     * Force credit-card ratio.
     */

    const outputHeight =
      Math.round(
        outputWidth /
        1.586
      );


    /*
     * Perspective transformation.
     */

    processingText.textContent =
      "Straightening card...";


    const sourcePoints =
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


    const destinationPoints =
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


    const transform =
      cv.getPerspectiveTransform(
        sourcePoints,
        destinationPoints
      );


    const result =
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
     * Display successful detection.
     */

    documentGuide.classList.add(
      "detected"
    );

    edgeStatus.textContent =
      "✓ Card detected";


    /*
     * Convert back to image.
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


    cleanup(
      src,
      small,
      gray,
      blurred,
      edges,
      contours,
      hierarchy,
      sourcePoints,
      destinationPoints,
      transform,
      result
    );


    return image;


  } catch (error) {

    console.error(
      "Detection error:",
      error
    );


    documentGuide.classList.remove(
      "detected"
    );

    edgeStatus.textContent =
      "Manual capture";


    return null;
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
   CLEANUP
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
   ADD PAGE
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
            data-action="front"
            data-index="${index}">
            Retake Front
          </button>

          <button
            data-action="back"
            data-index="${index}">
            Retake Back
          </button>

          <button
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
   ANOTHER CARD
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
   CLEAR
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
      pages.length
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
   PDF
========================================================= */

downloadPdfBtn.addEventListener(
  "click",
  generatePDF
);


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
     * Credit-card ratio.
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

        margin + 4
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

        pageHeight / 2 +
        gap / 2 +
        4
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


    pdf.save(
      `Card-Scan-${getDate()}.pdf`
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

  const d =
    new Date();


  return [

    d.getFullYear(),

    String(
      d.getMonth() + 1
    ).padStart(
      2,
      "0"
    ),

    String(
      d.getDate()
    ).padStart(
      2,
      "0"
    )

  ].join("-");
}


/* =========================================================
   PROCESSING
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
